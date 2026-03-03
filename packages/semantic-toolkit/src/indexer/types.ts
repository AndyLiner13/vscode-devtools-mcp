/**
 * Phase 7 — Indexing types.
 *
 * Two-table schema: file_metadata (per-file) + code_chunks (per-chunk).
 * Per-file metadata (contentHash, lastModified) stored once, not duplicated per chunk.
 */

/** Per-file metadata stored in the `file_metadata` LanceDB table. */
export interface FileMetadata {
	filePath: string;
	contentHash: string;
	lastModified: number;
}

/** Per-chunk data stored in the `code_chunks` LanceDB table. */
export interface IndexedChunk {
	filePath: string;
	symbolPath: string;
	startLine: number;
	endLine: number;
	chunkContent: string;
	stale: boolean;
}

/** Classification of a file during the scan phase. */
export type FileStatus = 'new-file' | 'unchanged' | 'mtime-only' | 'content-changed' | 'removed';

export interface FileClassification {
	filePath: string;
	status: FileStatus;
	mtime: number;
	contentHash?: string;
}

/** Diff result for a single file's chunks. */
export interface ChunkDiff {
	added: IndexedChunk[];
	updated: IndexedChunk[];
	positionOnly: IndexedChunk[];
	removed: string[];
	unchanged: number;
}

/** Aggregate sync statistics returned after a full sync run. */
export interface SyncResult {
	filesScanned: number;
	filesSkipped: number;
	filesMtimeOnly: number;
	filesReindexed: number;
	filesRemoved: number;
	chunksAdded: number;
	chunksUpdated: number;
	chunksPositionOnly: number;
	chunksRemoved: number;
	chunksUnchanged: number;
	durationMs: number;
}

/** Supported file extensions for TypeScript/JavaScript analysis. */
export const PARSEABLE_EXTENSIONS = new Set([
	'ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs',
]);
