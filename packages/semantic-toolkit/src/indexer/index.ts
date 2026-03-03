/**
 * Phase 7 — Indexer public API.
 *
 * Re-exports sync(), SyncResult, DbHandle, and DB query functions for external consumers.
 */

export { sync, formatSyncStats } from './sync.js';
export type { SyncHandle } from './sync.js';
export type { SyncResult, FileClassification, ChunkDiff, IndexedChunk, FileMetadata } from './types.js';
export { PARSEABLE_EXTENSIONS } from './types.js';
export {
	openDatabase,
	closeDatabase,
	getChunksByFile,
	queryChunksByFileSubstring,
	queryAllChunks,
	type DbHandle,
} from './db.js';
export {
	parseName,
	parseKind,
	parseCleanPath,
	parseParentPath,
	parseDepth,
	buildSymbolPath,
	buildSymbolPathFromParts,
} from './symbol-path.js';
