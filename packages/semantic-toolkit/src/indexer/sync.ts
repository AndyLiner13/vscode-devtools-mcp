/**
 * Phase 7 — Sync orchestrator.
 *
 * Top-level function called before each `codebase_search` tool call.
 * Ties together: scan → parse → chunk → diff → store.
 *
 * Creates one fresh ts-morph Project per sync run, adds all dirty files,
 * chunks them, discards the Project when sync completes.
 */

import { Project } from 'ts-morph';
import { chunkFile } from '../chunker/index.js';
import { loadIgnoreRules } from '../ignore/index.js';
import {
	openDatabase,
	upsertFileMetadata,
	deleteFileMetadata,
	getChunksByFile,
	deleteChunksByFile,
	upsertChunks,
	deleteChunks,
	updateChunkPositions,
	type DbHandle,
} from './db.js';
import { scanFiles } from './scan.js';
import { diffChunks } from './diff.js';
import type { SyncResult, IndexedChunk } from './types.js';

const TOOL_SCOPE = 'codebase_search';

/**
 * Return type of sync(): stats + a live DB handle for querying indexed chunks.
 * The caller MUST call db.connection.close() (or closeDatabase(db)) when done.
 */
export interface SyncHandle {
	stats: SyncResult;
	db: DbHandle;
}

/**
 * Run a full incremental sync of the workspace index.
 * Ensures the LanceDB index is up-to-date before search.
 */
export async function sync(workspaceRoot: string): Promise<SyncHandle> {
	const startTime = performance.now();

	const db = await openDatabase(workspaceRoot);
	const ignoreConfig = loadIgnoreRules(workspaceRoot);
	const classifications = await scanFiles(workspaceRoot, db, ignoreConfig, TOOL_SCOPE);

	const result: SyncResult = {
		filesScanned: classifications.length,
		filesSkipped: 0,
		filesMtimeOnly: 0,
		filesReindexed: 0,
		filesRemoved: 0,
		chunksAdded: 0,
		chunksUpdated: 0,
		chunksPositionOnly: 0,
		chunksRemoved: 0,
		chunksUnchanged: 0,
		durationMs: 0,
	};

	// Collect files that need (re-)parsing
	const filesToParse: Array<{ filePath: string; mtime: number; contentHash: string }> = [];

	for (const classification of classifications) {
		switch (classification.status) {
			case 'unchanged':
				result.filesSkipped++;
				break;

			case 'mtime-only':
				result.filesMtimeOnly++;
				// Update lastModified in file_metadata, skip re-parsing
				if (classification.contentHash) {
					await upsertFileMetadata(db, {
						filePath: classification.filePath.replaceAll('\\', '/'),
						contentHash: classification.contentHash,
						lastModified: classification.mtime,
					});
				}
				break;

			case 'new-file':
			case 'content-changed':
				if (classification.contentHash) {
					filesToParse.push({
						filePath: classification.filePath,
						mtime: classification.mtime,
						contentHash: classification.contentHash,
					});
				}
				break;

			case 'removed':
				result.filesRemoved++;
				await handleRemovedFile(db, classification.filePath.replaceAll('\\', '/'));
				break;
		}
	}

	// Parse and diff all dirty files using a single fresh ts-morph Project
	if (filesToParse.length > 0) {
		const project = new Project({ skipAddingFilesFromTsConfig: true });

		for (const { filePath, mtime, contentHash } of filesToParse) {
			result.filesReindexed++;

			const sourceFile = project.addSourceFileAtPath(filePath);
			const chunkedFile = chunkFile(sourceFile);

			// ts-morph normalizes paths to forward slashes — align stored paths
			const normalizedPath = filePath.replaceAll('\\', '/');
			const oldChunks = await getChunksByFile(db, normalizedPath);
			const diff = diffChunks(chunkedFile.chunks, oldChunks);

			// Apply diff to DB
			await applyDiff(db, normalizedPath, diff);

			// Update file metadata (use normalized path for consistency)
			await upsertFileMetadata(db, { filePath: normalizedPath, contentHash, lastModified: mtime });

			// Accumulate stats
			result.chunksAdded += diff.added.length;
			result.chunksUpdated += diff.updated.length;
			result.chunksPositionOnly += diff.positionOnly.length;
			result.chunksRemoved += diff.removed.length;
			result.chunksUnchanged += diff.unchanged;
		}
	}

	result.durationMs = Math.round(performance.now() - startTime);

	return { stats: result, db };
}

/** Handle a removed file: delete chunks + file metadata. */
async function handleRemovedFile(db: DbHandle, filePath: string): Promise<void> {
	await deleteChunksByFile(db, filePath);
	await deleteFileMetadata(db, filePath);
}

/** Apply a ChunkDiff to the database for a single file. */
async function applyDiff(
	db: DbHandle,
	filePath: string,
	diff: ReturnType<typeof diffChunks>,
): Promise<void> {
	// Remove deleted chunks
	if (diff.removed.length > 0) {
		await deleteChunks(db, filePath, diff.removed);
	}

	// Insert added chunks
	if (diff.added.length > 0) {
		await upsertChunks(db, diff.added);
	}

	// Update content-changed chunks (delete old + insert new)
	if (diff.updated.length > 0) {
		// Delete old versions
		const updatedPaths = diff.updated.map(c => c.symbolPath);
		await deleteChunks(db, filePath, updatedPaths);
		// Insert updated versions
		await upsertChunks(db, diff.updated);
	}

	// Position-only updates
	if (diff.positionOnly.length > 0) {
		await updateChunkPositions(
			db,
			filePath,
			diff.positionOnly.map(c => ({
				symbolPath: c.symbolPath,
				startLine: c.startLine,
				endLine: c.endLine,
			})),
		);
	}
}

/**
 * Format sync result as a debug string for MCP output.
 */
export function formatSyncStats(result: SyncResult): string {
	return [
		'--- Sync Stats (debug) ---',
		`Files: ${result.filesScanned} scanned, ${result.filesSkipped} skipped, ${result.filesMtimeOnly} mtime-only, ${result.filesReindexed} reindexed, ${result.filesRemoved} removed`,
		`Chunks: ${result.chunksAdded} added, ${result.chunksUpdated} updated, ${result.chunksPositionOnly} position-only, ${result.chunksRemoved} removed, ${result.chunksUnchanged} unchanged`,
		`Duration: ${result.durationMs}ms`,
	].join('\n');
}
