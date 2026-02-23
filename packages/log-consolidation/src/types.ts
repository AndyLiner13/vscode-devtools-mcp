/**
 * Shared types for the log compression engine.
 *
 * Used by both the VS Code extension (LM tools) and the MCP server.
 * All types mirror logpare's API where applicable, with extensions
 * for the progressive depth traversal and composable filter system.
 */

import type { CompressionResult, Severity, Template } from 'logpare';

// Re-export logpare types consumers need
export type { CompressionResult, Severity, Template };

/** Output format for compressed logs. */
export type LogFormat = 'detailed' | 'json' | 'summary';

/** Options for the core compression engine. */
export interface CompressionRequest {
  /** Output format. Default: 'summary'. */
  format?: LogFormat;
  /** Label for the output header. Default: 'Log'. */
  label?: string;
  /** Lines to compress. Mutually exclusive with `text`. */
  lines?: string[];
  /** Max templates to include in output. Default: 50. */
  maxTemplates?: number;
  /** Raw text to compress. Mutually exclusive with `lines`. */
  text?: string;
  /** Max output tokens. Default: 3000. */
  tokenLimit?: number;
}

/** Statistics about a compression operation. */
export interface CompressionStats {
  compressionRatio: number;
  estimatedTokenReduction: number;
  inputLines: number;
  processingTimeMs?: number;
  uniqueTemplates: number;
}

/** Result of a compression operation. */
export interface ConsolidationResult {
  /** Formatted output string. */
  formatted: string;
  /** True if meaningful compression was achieved. */
  hasCompression: boolean;
  /** The raw logpare CompressionResult for advanced consumers. */
  raw: CompressionResult;
  /** Compression statistics. */
  stats: CompressionStats;
}

/**
 * Composable filter options for drill-down navigation.
 * All filters combine with AND logic.
 */
export interface FilterOptions {
  /** Trace a specific request by UUID. */
  correlationId?: string;
  /** Show/hide stack frame templates. Default: true. */
  includeStackFrames?: boolean;
  /** Show templates with durations ≥ threshold: '1s', '500ms', '100ms'. */
  minDuration?: string;
  /** Regex filter on raw line content (existing param). */
  pattern?: string;
  /** Filter by severity level. */
  severity?: Severity;
  /** Show raw lines matching this template ID from the overview. */
  templateId?: string;
  /** Time window: 'HH:MM-HH:MM' or 'HH:MM:SS-HH:MM:SS'. */
  timeRange?: string;
}

/** A detected log entry boundary (multi-line grouping). */
export interface LogEntry {
  /** Continuation lines that belong to this entry. */
  continuationLines: string[];
  /** The flattened single-line representation for logpare. */
  flattened: string;
  /** The header line (first line with a timestamp/severity prefix). */
  header: string;
  /** Original line index of the header in the source. */
  sourceLineIndex: number;
}

/** Result of boundary detection on raw log lines. */
export interface BoundaryResult {
  /** Grouped logical entries from the raw lines. */
  entries: LogEntry[];
  /** Number of continuation lines that were grouped. */
  groupedLineCount: number;
  /** True if multi-line grouping was applied. */
  hasMultiLineEntries: boolean;
}

/**
 * File extensions that should receive automatic log compression
 * instead of symbolic compression when read via file_read.
 */
export const /**
 *
 */
LOG_FILE_EXTENSIONS = new Set([
  // Standard log files
  '.log', '.out', '.err', '.trace', '.syslog', '.access', '.audit',
  // Structured log formats
  '.jsonl', '.ndjson',
  // Diagnostic files
  '.dump', '.diag', '.debug',
]);

/**
 * Experimental file extensions: logpare decides if compressible
 * based on the minimum compression ratio threshold.
 */
export const /**
 *
 */
EXPERIMENTAL_LOG_EXTENSIONS = new Set([
  '.txt', '.csv',
]);

/** Chars per token estimate used for token limit calculations. */
export const /**
 *
 */
CHARS_PER_TOKEN = 4;

/** Default max output tokens for compressed log output. */
export const /**
 *
 */
DEFAULT_TOKEN_LIMIT = 3000;

/** Default max output characters (derived from token limit). */
export const /**
 *
 */
DEFAULT_CHAR_LIMIT = DEFAULT_TOKEN_LIMIT * CHARS_PER_TOKEN;

/** Minimum lines required before attempting compression. */
export const /**
 *
 */
MIN_LINES_FOR_COMPRESSION = 5;

/** Minimum compression ratio to consider compression meaningful. */
export const /**
 *
 */
MIN_COMPRESSION_RATIO = 0.1;
