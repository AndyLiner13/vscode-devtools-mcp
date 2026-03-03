/**
 * Phase 7 — Symbol-level chunk diffing.
 *
 * Compares new chunks (from re-parsing) against old chunks (from LanceDB)
 * and produces a minimal set of DB operations.
 *
 * Matching is by symbolPath (unique within a file). Content change detection
 * uses direct string comparison (short-circuits at first difference; more
 * efficient than hashing for one-time comparisons).
 */

import type { CodeChunk } from '../chunker/types.js';
import type { IndexedChunk, ChunkDiff } from './types.js';

/**
 * Diff new chunks against old chunks for a single file.
 *
 * @param newChunks  Fresh chunks from chunkFile()
 * @param oldChunks  Stored chunks from LanceDB (empty for new files)
 * @returns ChunkDiff describing the minimal set of DB operations
 */
export function diffChunks(newChunks: CodeChunk[], oldChunks: IndexedChunk[]): ChunkDiff {
	const oldMap = new Map<string, IndexedChunk>();
	for (const old of oldChunks) {
		oldMap.set(old.symbolPath, old);
	}

	const newMap = new Map<string, CodeChunk>();
	for (const chunk of newChunks) {
		newMap.set(chunk.symbolPath, chunk);
	}

	const added: IndexedChunk[] = [];
	const updated: IndexedChunk[] = [];
	const positionOnly: IndexedChunk[] = [];
	const removed: string[] = [];
	let unchanged = 0;

	for (const [symbolPath, newChunk] of newMap) {
		const oldChunk = oldMap.get(symbolPath);

		const indexedChunk: IndexedChunk = {
			filePath: newChunk.filePath,
			symbolPath: newChunk.symbolPath,
			startLine: newChunk.startLine,
			endLine: newChunk.endLine,
			chunkContent: newChunk.chunkContent,
			stale: true,
		};

		if (!oldChunk) {
			// Not in old map → added
			added.push(indexedChunk);
			continue;
		}

		// Content comparison: direct string compare (short-circuits at first difference)
		if (oldChunk.chunkContent === newChunk.chunkContent) {
			// Content unchanged — check if position shifted
			if (oldChunk.startLine !== newChunk.startLine || oldChunk.endLine !== newChunk.endLine) {
				// Position-only update: keep existing vector, stale stays false
				positionOnly.push({ ...indexedChunk, stale: oldChunk.stale });
			} else {
				unchanged++;
			}
		} else {
			// Content changed → mark stale for re-embedding
			updated.push(indexedChunk);
		}
	}

	// Entries in old map but not in new map → removed
	for (const symbolPath of oldMap.keys()) {
		if (!newMap.has(symbolPath)) {
			removed.push(symbolPath);
		}
	}

	return { added, updated, positionOnly, removed, unchanged };
}
