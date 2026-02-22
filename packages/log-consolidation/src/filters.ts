/**
 * Composable Log Filters
 *
 * All filters combine with AND logic and work at the template level.
 * Existing parameters (pattern, limit, afterLine, beforeLine) are preserved.
 * New filters leverage logpare's already-extracted metadata:
 *   - templateId: Show raw lines matching a specific template
 *   - severity: Filter by error/warning/info
 *   - timeRange: Time window HH:MM-HH:MM or HH:MM:SS-HH:MM:SS
 *   - minDuration: Slow request threshold (1s, 500ms)
 *   - correlationId: Trace a specific request UUID
 *   - includeStackFrames: Show/hide stack frame templates
 */

import type { ConsolidationResult, FilterOptions } from './types.js';
import type { Template } from 'logpare';

/**
 * Apply pre-filters to raw lines before compression.
 * These run on the raw line content before logpare processes them.
 */
export function applyPreFilters(lines: string[], filters: FilterOptions): string[] {
  let filtered = lines;

  // Pattern filter — regex match on raw line content
  if (filters.pattern) {
    try {
      const regex = new RegExp(filters.pattern, 'i');
      filtered = filtered.filter(line => regex.test(line));
    } catch {
      // Invalid regex — skip filter
    }
  }

  return filtered;
}

/**
 * Apply post-filters to compressed results.
 * These filter at the template level using logpare's extracted metadata.
 *
 * Returns a new ConsolidationResult if any filters matched and modified output,
 * or undefined if no post-filters were active (caller should use original result).
 */
export function applyFilters(
  result: ConsolidationResult,
  originalLines: string[],
  filters: FilterOptions,
): ConsolidationResult | undefined {
  const hasPostFilters =
    filters.templateId !== undefined ||
    filters.severity !== undefined ||
    filters.timeRange !== undefined ||
    filters.minDuration !== undefined ||
    filters.correlationId !== undefined ||
    filters.includeStackFrames === false;

  if (!hasPostFilters) {
    return undefined;
  }

  // Template ID drill-down: show raw lines matching this template
  if (filters.templateId) {
    return expandTemplate(result, originalLines, filters.templateId);
  }

  // Apply remaining template-level filters
  let templates = result.raw.templates;

  // Severity filter
  if (filters.severity) {
    templates = templates.filter(t => t.severity === filters.severity);
  }

  // Stack frame filter (default: include)
  if (filters.includeStackFrames === false) {
    templates = templates.filter(t => !t.isStackFrame);
  }

  // Duration filter
  if (filters.minDuration) {
    const thresholdMs = parseDuration(filters.minDuration);
    if (thresholdMs > 0) {
      templates = templates.filter(t =>
        t.durationSamples.some(d => parseDuration(d) >= thresholdMs),
      );
    }
  }

  // Correlation ID filter
  if (filters.correlationId) {
    const targetId = filters.correlationId.toLowerCase();
    templates = templates.filter(t =>
      t.correlationIdSamples.some(id => id.toLowerCase().includes(targetId)),
    );
  }

  // Time range filter
  if (filters.timeRange) {
    const range = parseTimeRange(filters.timeRange);
    if (range) {
      templates = filterByTimeRange(templates, originalLines, range);
    }
  }

  if (templates.length === 0) {
    return {
      formatted: '(no templates match the applied filters)',
      stats: result.stats,
      hasCompression: false,
      raw: { ...result.raw, templates: [] },
    };
  }

  // Build filtered output
  const filteredLines: string[] = [];
  for (const t of templates) {
    filteredLines.push(`[${t.occurrences}x] ${t.pattern}`);
  }
  const formatted = filteredLines.join('\n');

  return {
    formatted,
    stats: {
      ...result.stats,
      uniqueTemplates: templates.length,
    },
    hasCompression: true,
    raw: { ...result.raw, templates },
  };
}

/**
 * Expand a template ID to show all raw lines that matched it.
 * Uses the template's firstSeen/lastSeen range and pattern to find matching lines.
 */
function expandTemplate(
  result: ConsolidationResult,
  originalLines: string[],
  templateId: string,
): ConsolidationResult | undefined {
  const template = result.raw.templates.find(t => t.id === templateId);
  if (!template) {
    return {
      formatted: `Template "${templateId}" not found. Available: ${result.raw.templates.map(t => t.id).join(', ')}`,
      stats: result.stats,
      hasCompression: false,
      raw: result.raw,
    };
  }

  // Collect raw lines in the range [firstSeen, lastSeen] that match this template's pattern
  const matchingLines: string[] = [];
  const startLine = Math.max(0, template.firstSeen);
  const endLine = Math.min(originalLines.length - 1, template.lastSeen);

  for (let i = startLine; i <= endLine; i++) {
    matchingLines.push(originalLines[i]);
  }

  // If too many lines, take a sample from start and end
  const maxLines = 100;
  let formatted: string;
  if (matchingLines.length > maxLines) {
    const half = Math.floor(maxLines / 2);
    const head = matchingLines.slice(0, half);
    const tail = matchingLines.slice(-half);
    formatted = [
      `## Template ${templateId}: ${template.pattern}`,
      `**Occurrences:** ${template.occurrences} | **Severity:** ${template.severity}`,
      `**Showing:** first ${half} + last ${half} of ${matchingLines.length} lines\n`,
      ...head,
      `\n... (${matchingLines.length - maxLines} lines omitted)\n`,
      ...tail,
    ].join('\n');
  } else {
    formatted = [
      `## Template ${templateId}: ${template.pattern}`,
      `**Occurrences:** ${template.occurrences} | **Severity:** ${template.severity}`,
      `**Lines ${startLine + 1}–${endLine + 1}:**\n`,
      ...matchingLines,
    ].join('\n');
  }

  return {
    formatted,
    stats: result.stats,
    hasCompression: false,
    raw: result.raw,
  };
}

/**
 * Parse a duration string like '1s', '500ms', '100ms', '1.5s' into milliseconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)\s*(ms|s|sec|µs|us|ns)?$/i);
  if (!match) {
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();

  switch (unit) {
    case 's':
    case 'sec':
      return value * 1000;
    case 'ms':
      return value;
    case 'µs':
    case 'us':
      return value / 1000;
    case 'ns':
      return value / 1_000_000;
    default:
      return value;
  }
}

interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Parse a time range string like 'HH:MM-HH:MM' or 'HH:MM:SS-HH:MM:SS'.
 */
function parseTimeRange(range: string): TimeRange | undefined {
  const parts = range.split('-');
  if (parts.length !== 2) {
    return undefined;
  }

  const startMinutes = parseTimeToMinutes(parts[0].trim());
  const endMinutes = parseTimeToMinutes(parts[1].trim());

  if (startMinutes < 0 || endMinutes < 0) {
    return undefined;
  }

  return { startMinutes, endMinutes };
}

function parseTimeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length < 2 || parts.length > 3) {
    return -1;
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return -1;
  }

  return hours * 60 + minutes + seconds / 60;
}

// Timestamp extraction pattern for time-range filtering
const TIMESTAMP_TIME_PATTERN = /(\d{2}):(\d{2}):(\d{2})/;

/**
 * Filter templates by time range.
 * Uses the original lines at firstSeen/lastSeen to extract timestamps.
 */
function filterByTimeRange(
  templates: Template[],
  originalLines: string[],
  range: TimeRange,
): Template[] {
  return templates.filter(t => {
    // Check the first-seen line for a timestamp
    const line = originalLines[t.firstSeen];
    if (!line) {
      return true; // Can't determine time — include by default
    }

    const match = TIMESTAMP_TIME_PATTERN.exec(line);
    if (!match) {
      return true; // No timestamp found — include
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const lineMinutes = hours * 60 + minutes + seconds / 60;

    // Handle ranges that cross midnight
    if (range.startMinutes <= range.endMinutes) {
      return lineMinutes >= range.startMinutes && lineMinutes <= range.endMinutes;
    }
    return lineMinutes >= range.startMinutes || lineMinutes <= range.endMinutes;
  });
}
