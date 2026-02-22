/**
 * Log Entry Boundary Detector
 *
 * Groups multi-line log entries into logical units before logpare processes them.
 *
 * Root cause of junk templates: logpare processes line-by-line. When logs contain
 * multi-line entries (JSON dumps, multi-line errors, formatted tables), each physical
 * line becomes an independent template, producing noise like `},`, `],`, `<*>,`.
 *
 * The fix: scan each line for a timestamp/severity header pattern.
 * Lines starting with a recognized header begin a new entry.
 * Lines without a header are "continuation lines" belonging to the preceding entry.
 */

import type { BoundaryResult, LogEntry } from './types.js';

/**
 * Patterns that identify the start of a new log entry.
 * Lines matching any of these patterns are "entry headers".
 * All other lines are "continuation lines" grouped with the preceding entry.
 */
const ENTRY_HEADER_PATTERNS: RegExp[] = [
  // ISO 8601 timestamps: 2026-02-22T05:47:04.194Z, 2026-02-22 05:47:04
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/,

  // Syslog-style timestamps: Feb 22 05:47:04, Jan  1 00:00:00
  /^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/,

  // Bracketed timestamps: [2026-02-22T05:47:04], [05:47:04]
  /^\[\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/,
  /^\[\d{2}:\d{2}:\d{2}/,

  // Bracketed severity levels: [info], [ERROR], [WARNING], [debug], [WARN]
  /^\[(info|INFO|error|ERROR|warn|WARN|warning|WARNING|debug|DEBUG|trace|TRACE|verbose|VERBOSE)\]/,

  // Severity prefixes without brackets: INFO:, ERROR:, WARNING:, DEBUG:
  /^(INFO|ERROR|WARN|WARNING|DEBUG|TRACE|VERBOSE)\s*[:\s]/,

  // Log level with timestamp: INFO 2026-02-22..., ERROR 05:47:04
  /^(INFO|ERROR|WARN|WARNING|DEBUG|TRACE|VERBOSE)\s+\d/,

  // Common log framework formats: 05:47:04.194 [main] INFO, 05:47:04 INFO
  /^\d{2}:\d{2}:\d{2}[.,]\d{1,3}\s+\[/,

  // VS Code extension host log: timestamps in square brackets
  /^\[?\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\]?\s/,

  // Numeric-prefixed lines (line numbers in some log formats)
  // Only match if followed by a timestamp or severity
  /^\d+\s+\d{4}-\d{2}-\d{2}/,
  /^\d+\s+(INFO|ERROR|WARN|DEBUG)/,
];

/**
 * Lines that look like structural JSON/YAML noise (standalone delimiters).
 * These are always continuation lines, never entry headers.
 */
const STRUCTURAL_NOISE_PATTERN = /^\s*[{}[\],]*\s*$/;

function isEntryHeader(line: string): boolean {
  if (!line || line.length === 0) {
    return false;
  }

  // Pure whitespace or structural JSON noise is always a continuation
  if (STRUCTURAL_NOISE_PATTERN.test(line)) {
    return false;
  }

  for (const pattern of ENTRY_HEADER_PATTERNS) {
    if (pattern.test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect log entry boundaries in an array of lines.
 * Groups continuation lines with their preceding header line.
 */
export function detectBoundaries(lines: string[]): BoundaryResult {
  if (lines.length === 0) {
    return { entries: [], hasMultiLineEntries: false, groupedLineCount: 0 };
  }

  const entries: LogEntry[] = [];
  let currentEntry: LogEntry | undefined;
  let groupedLineCount = 0;
  let hasMultiLineEntries = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isEntryHeader(line)) {
      // Finalize previous entry
      if (currentEntry) {
        entries.push(currentEntry);
      }
      // Start a new entry
      currentEntry = {
        header: line,
        continuationLines: [],
        flattened: line,
        sourceLineIndex: i,
      };
    } else if (currentEntry) {
      // Continuation line — belongs to current entry
      currentEntry.continuationLines.push(line);
      groupedLineCount++;
    } else {
      // No header seen yet — treat as a standalone entry
      currentEntry = {
        header: line,
        continuationLines: [],
        flattened: line,
        sourceLineIndex: i,
      };
    }
  }

  // Don't forget the last entry
  if (currentEntry) {
    entries.push(currentEntry);
  }

  // Finalize: build flattened representations for multi-line entries
  for (const entry of entries) {
    if (entry.continuationLines.length > 0) {
      hasMultiLineEntries = true;
      // Join continuation lines into the header, collapsing whitespace
      const continuationText = entry.continuationLines
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join(' ');

      if (continuationText.length > 0) {
        // Keep the flattened version concise: header + collapsed continuation
        if (continuationText.length > 200) {
          entry.flattened = `${entry.header} ${continuationText.slice(0, 200)} [+${entry.continuationLines.length} continuation lines]`;
        } else {
          entry.flattened = `${entry.header} ${continuationText}`;
        }
      }
    }
  }

  return { entries, hasMultiLineEntries, groupedLineCount };
}

/**
 * Convert boundary-detected entries back to an array of flattened lines
 * suitable for logpare processing.
 */
export function flattenEntries(entries: LogEntry[]): string[] {
  return entries.map(e => e.flattened);
}
