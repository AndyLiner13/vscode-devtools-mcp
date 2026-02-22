/**
 * Output Formatting for Log Compression Results
 *
 * Formats compressed log data into readable overviews and detail views.
 * The overview format is designed to always fit within the 3000 token budget
 * even for very large log files (10K+ lines).
 */

import type { ConsolidationResult } from './types.js';

/**
 * Format a compression result as a readable overview.
 *
 * Example output:
 *
 *   ## Log Overview (3,420 lines → 12 unique patterns)
 *   **Severity:** 3 errors, 7 warnings, 3,410 info
 *   **Compression:** 97.2% token reduction
 *
 *   | ID | Pattern | Count | Severity |
 *   |----|---------|-------|----------|
 *   | t1 | [client-pipe] <*> → <*> | 847 | info |
 *   | t2 | [host-pipe] checkForChanges → <*> | 423 | info |
 *   ...
 *
 *   **Drill-down:** Use `templateId`, `severity`, `minDuration`, etc.
 */
export function formatOverview(result: ConsolidationResult, label: string): string {
  const { stats, raw } = result;
  const templates = raw.templates;

  if (templates.length === 0) {
    return result.formatted;
  }

  // Count severities
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const t of templates) {
    switch (t.severity) {
      case 'error':
        errorCount += t.occurrences;
        break;
      case 'warning':
        warningCount += t.occurrences;
        break;
      default:
        infoCount += t.occurrences;
    }
  }

  const lines: string[] = [];

  // Header
  lines.push(`## ${label} Overview (${formatNumber(stats.inputLines)} lines → ${formatNumber(stats.uniqueTemplates)} unique patterns)`);
  lines.push('');

  // Severity summary
  const severityParts: string[] = [];
  if (errorCount > 0) {
    severityParts.push(`${formatNumber(errorCount)} errors`);
  }
  if (warningCount > 0) {
    severityParts.push(`${formatNumber(warningCount)} warnings`);
  }
  if (infoCount > 0) {
    severityParts.push(`${formatNumber(infoCount)} info`);
  }
  if (severityParts.length > 0) {
    lines.push(`**Severity:** ${severityParts.join(', ')}`);
  }

  // Compression ratio
  const compressionPct = Math.round(stats.compressionRatio * 100);
  lines.push(`**Compression:** ${compressionPct}% token reduction`);

  if (stats.processingTimeMs !== undefined) {
    lines.push(`**Processing time:** ${stats.processingTimeMs.toFixed(1)}ms`);
  }

  lines.push('');

  // Template table
  lines.push('| ID | Pattern | Count | Severity |');
  lines.push('|----|---------|-------|----------|');

  // Sort by occurrences (most frequent first), with errors promoted
  const sorted = [...templates].sort((a, b) => {
    const severityOrder = severityWeight(a.severity) - severityWeight(b.severity);
    if (severityOrder !== 0) {
      return severityOrder;
    }
    return b.occurrences - a.occurrences;
  });

  for (const t of sorted) {
    // Truncate very long patterns for the table
    const pattern = t.pattern.length > 120
      ? t.pattern.slice(0, 117) + '...'
      : t.pattern;
    const escaped = pattern.replace(/\|/g, '\\|');
    lines.push(`| ${t.id} | ${escaped} | ${formatNumber(t.occurrences)} | ${t.severity} |`);
  }

  lines.push('');
  lines.push('**Drill-down:** Use `templateId`, `severity`, `minDuration`, `correlationId`, `includeStackFrames`, `timeRange`, or `pattern` to explore.');

  return lines.join('\n');
}

function severityWeight(severity: string): number {
  switch (severity) {
    case 'error': return 0;
    case 'warning': return 1;
    default: return 2;
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
