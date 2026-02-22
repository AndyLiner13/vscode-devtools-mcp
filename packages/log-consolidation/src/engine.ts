/**
 * Core Log Compression Engine
 *
 * Wraps logpare's Drain algorithm with progressive depth traversal,
 * token limit enforcement, and integration with boundary detection,
 * custom strategy, and composable filters.
 *
 * This is the single entry point for all log compression in the codebase.
 * Both the VS Code extension (LM tools) and the MCP server import from here.
 */

import type {
  CompressionRequest,
  ConsolidationResult,
  FilterOptions,
  LogFormat,
} from './types.js';
import type { CompressOptions, CompressionResult as LogpareResult } from 'logpare';

import { compress, compressText } from 'logpare';

import { detectBoundaries, flattenEntries } from './boundary.js';
import { applyFilters, applyPreFilters } from './filters.js';
import { formatOverview } from './format.js';
import { vsCodeStrategy } from './strategy.js';

function buildLogpareOptions(format: LogFormat, maxTemplates: number): CompressOptions {
  return {
    format: format === 'json' ? 'json' : format,
    maxTemplates,
    drain: {
      preprocessing: vsCodeStrategy,
    },
  };
}

function wrapResult(
  result: LogpareResult,
  inputLines: number,
): ConsolidationResult {
  const hasCompression =
    result.stats.compressionRatio >= 0.1 &&
    result.stats.uniqueTemplates < inputLines;

  return {
    formatted: result.formatted,
    stats: {
      inputLines: result.stats.inputLines,
      uniqueTemplates: result.stats.uniqueTemplates,
      compressionRatio: result.stats.compressionRatio,
      estimatedTokenReduction: result.stats.estimatedTokenReduction,
      processingTimeMs: result.stats.processingTimeMs,
    },
    hasCompression,
    raw: result,
  };
}

function noCompression(text: string, lineCount: number): ConsolidationResult {
  const emptyResult: LogpareResult = {
    templates: [],
    stats: {
      inputLines: lineCount,
      uniqueTemplates: lineCount,
      compressionRatio: 0,
      estimatedTokenReduction: 0,
    },
    formatted: text,
  };

  return {
    formatted: text,
    stats: {
      inputLines: lineCount,
      uniqueTemplates: lineCount,
      compressionRatio: 0,
      estimatedTokenReduction: 0,
    },
    hasCompression: false,
    raw: emptyResult,
  };
}

/**
 * Compress an array of log lines.
 * Returns logpare's compressed format when meaningful compression is achievable.
 */
export function consolidateLines(
  lines: string[],
  options?: { format?: LogFormat; label?: string; maxTemplates?: number },
): ConsolidationResult {
  const format = options?.format ?? 'summary';
  const maxTemplates = options?.maxTemplates ?? 50;

  if (lines.length < 5) {
    return noCompression(lines.join('\n'), lines.length);
  }

  const result = compress(lines, buildLogpareOptions(format, maxTemplates));
  return wrapResult(result, lines.length);
}

/**
 * Compress raw text (splits on newlines internally).
 * Returns logpare's compressed format when meaningful compression is achievable.
 */
export function consolidateText(
  text: string,
  options?: { format?: LogFormat; label?: string; maxTemplates?: number },
): ConsolidationResult {
  const format = options?.format ?? 'summary';
  const maxTemplates = options?.maxTemplates ?? 50;

  const lineCount = text.split('\n').length;
  if (lineCount < 5) {
    return noCompression(text, lineCount);
  }

  const result = compressText(text, buildLogpareOptions(format, maxTemplates));
  return wrapResult(result, lineCount);
}

/**
 * Full compression pipeline with boundary detection, filters, and token limit enforcement.
 *
 * This is the primary entry point for all log-producing tools.
 * It runs the complete pipeline:
 *   1. Pre-filter (pattern match on raw lines)
 *   2. Boundary detection (group multi-line entries)
 *   3. Logpare compression (with custom VS Code strategy)
 *   4. Post-filters (severity, minDuration, correlationId, stackFrames)
 *   5. Template expansion (if templateId specified)
 *   6. Token limit enforcement (recursive compression if needed)
 *   7. Format as overview output
 */
export function compressLogs(request: CompressionRequest, filters?: FilterOptions): ConsolidationResult {
  const charLimit = (request.tokenLimit ?? 3000) * 4;
  const format = request.format ?? 'summary';
  const maxTemplates = request.maxTemplates ?? 50;
  const label = request.label ?? 'Log';

  // Resolve input to lines
  let lines: string[];
  if (request.lines) {
    lines = request.lines;
  } else if (request.text) {
    lines = request.text.split('\n');
  } else {
    return noCompression('', 0);
  }

  const totalInputLines = lines.length;

  if (lines.length < 5) {
    return noCompression(lines.join('\n'), lines.length);
  }

  // Step 1: Pre-filter (pattern match on raw lines)
  if (filters?.pattern) {
    lines = applyPreFilters(lines, filters);
    if (lines.length < 5) {
      return noCompression(lines.join('\n'), lines.length);
    }
  }

  // Step 2: Boundary detection — group multi-line entries
  const boundaries = detectBoundaries(lines);
  const flatLines = boundaries.hasMultiLineEntries
    ? flattenEntries(boundaries.entries)
    : lines;

  // Step 3: Run logpare compression with custom strategy
  const result = compress(flatLines, buildLogpareOptions(format, maxTemplates));
  const consolidated = wrapResult(result, totalInputLines);

  if (!consolidated.hasCompression) {
    const raw = lines.join('\n');
    if (raw.length <= charLimit) {
      return noCompression(raw, totalInputLines);
    }
    const truncated = raw.slice(0, charLimit) + `\n\n... (truncated — ${totalInputLines} total lines)`;
    return noCompression(truncated, totalInputLines);
  }

  // Step 4: Apply post-filters and handle drill-down
  if (filters) {
    const filterResult = applyFilters(consolidated, lines, filters);
    if (filterResult) {
      if (filterResult.formatted.length <= charLimit) {
        return filterResult;
      }
      // Re-compress the drill-down result if it exceeds the limit
      const recompressed = consolidateText(filterResult.formatted, {
        format, label, maxTemplates,
      });
      if (recompressed.hasCompression && recompressed.formatted.length <= charLimit) {
        return recompressed;
      }
      const truncated = filterResult.formatted.slice(0, charLimit)
        + `\n\n... (truncated drill-down — use more specific filters)`;
      return { ...filterResult, formatted: truncated };
    }
  }

  // Step 5: Format overview and check token limit
  const overview = formatOverview(consolidated, label);
  if (overview.length <= charLimit) {
    return { ...consolidated, formatted: overview };
  }

  // Overview exceeds limit — reduce templates and retry
  const reducedResult = compress(flatLines, buildLogpareOptions(format, Math.min(maxTemplates, 20)));
  const reducedConsolidated = wrapResult(reducedResult, totalInputLines);
  const reducedOverview = formatOverview(reducedConsolidated, label);

  if (reducedOverview.length <= charLimit) {
    return { ...reducedConsolidated, formatted: reducedOverview };
  }

  const truncatedOverview = reducedOverview.slice(0, charLimit)
    + `\n\n... (truncated overview — ${totalInputLines} total lines)`;
  return { ...reducedConsolidated, formatted: truncatedOverview };
}

/**
 * Convert a ConsolidationResult to a JSON-safe object for API responses.
 */
export function toConsolidatedJson(
  result: ConsolidationResult,
): Record<string, unknown> {
  return {
    compression: {
      inputLines: result.stats.inputLines,
      uniqueTemplates: result.stats.uniqueTemplates,
      compressionRatio: Math.round(result.stats.compressionRatio * 100),
      estimatedTokenReduction: Math.round(result.stats.estimatedTokenReduction * 100),
      processingTimeMs: result.stats.processingTimeMs,
    },
    templates: result.raw.templates.map(t => ({
      id: t.id,
      pattern: t.pattern,
      occurrences: t.occurrences,
      severity: t.severity,
      firstSeen: t.firstSeen,
      lastSeen: t.lastSeen,
      isStackFrame: t.isStackFrame,
      ...(t.sampleVariables.length > 0 ? { sampleVariables: t.sampleVariables } : {}),
      ...(t.urlSamples.length > 0 ? { urls: t.urlSamples } : {}),
      ...(t.statusCodeSamples.length > 0 ? { statusCodes: t.statusCodeSamples } : {}),
      ...(t.correlationIdSamples.length > 0 ? { correlationIds: t.correlationIdSamples } : {}),
      ...(t.durationSamples.length > 0 ? { durations: t.durationSamples } : {}),
    })),
  };
}
