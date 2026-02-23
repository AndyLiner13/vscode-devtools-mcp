/**
 * Log Consolidation Package — Public API
 *
 * Shared log compression engine used by both the VS Code extension (LM tools)
 * and the MCP server. Powered by logpare's Drain algorithm with extensions
 * for VS Code log patterns, multi-line boundary detection, composable filters,
 * and progressive depth traversal with token limit enforcement.
 *
 * Primary entry points:
 *   - compressLogs(): Full pipeline — boundary detection, compression, filters, token limit
 *   - consolidateLines(): Simple array-of-lines compression (backward compatible)
 *   - consolidateText(): Simple text compression (backward compatible)
 *
 * For drill-down navigation, pass FilterOptions to compressLogs().
 */

// Boundary detection
export { detectBoundaries, flattenEntries } from './boundary.js';

// Core engine
export { compressLogs, consolidateLines, consolidateText, toConsolidatedJson } from './engine.js';

// Composable filters
export { applyFilters, applyPreFilters } from './filters.js';

// Output formatting
export { formatOverview } from './format.js';

// Custom strategy
export { VS_CODE_PATTERNS, vsCodeStrategy } from './strategy.js';

// Types
export type { BoundaryResult, CompressionRequest, CompressionResult, CompressionStats, ConsolidationResult, FilterOptions, LogEntry, LogFormat, Severity, Template } from './types.js';

// Constants
export { CHARS_PER_TOKEN, DEFAULT_CHAR_LIMIT, DEFAULT_TOKEN_LIMIT, EXPERIMENTAL_LOG_EXTENSIONS, LOG_FILE_EXTENSIONS, MIN_COMPRESSION_RATIO, MIN_LINES_FOR_COMPRESSION } from './types.js';
