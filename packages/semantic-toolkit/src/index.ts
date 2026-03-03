export { chunkFile } from './chunker/index.js';

export type { CodeChunk, ChunkedFile } from './chunker/types.js';

export { lookupSymbol } from './lookup/index.js';
export { lookupFromIndex } from './lookup/indexed-lookup.js';

export type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
	OutputSections,
} from './lookup/types.js';

export type { TsLsConfig } from './ts-ls/types.js';
export { DEFAULT_TS_LS_CONFIG } from './ts-ls/types.js';

// Phase 7 — Indexer
export { sync, formatSyncStats, PARSEABLE_EXTENSIONS } from './indexer/index.js';
export {
	openDatabase,
	closeDatabase,
	getChunksByFile,
	queryChunksByFileSubstring,
	queryAllChunks,
} from './indexer/index.js';
export type { SyncResult, SyncHandle, IndexedChunk, FileMetadata, DbHandle } from './indexer/index.js';

// Phase 7 — Ignore system
export { loadIgnoreRules, isIgnored, filterIgnored } from './ignore/index.js';
export type { IgnoreConfig } from './ignore/types.js';
