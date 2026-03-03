/**
 * Phase 7 — File enumeration + change detection.
 *
 * Recursively enumerates workspace files matching PARSEABLE_EXTENSIONS,
 * applies .devtoolsignore rules, and classifies each file against stored
 * metadata using two-tier detection: mtime fast filter → contentHash accuracy check.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { DbHandle } from './db.js';
import { getAllFileMetadata } from './db.js';
import { PARSEABLE_EXTENSIONS, type FileClassification, type FileStatus } from './types.js';
import type { IgnoreConfig } from '../ignore/types.js';
import { isIgnored } from '../ignore/index.js';

/**
 * Recursively enumerate all files under `dir` matching PARSEABLE_EXTENSIONS.
 * Returns workspace-relative paths (forward-slash normalized).
 */
function enumerateFiles(rootDir: string, dir: string, ignoreConfig: IgnoreConfig, toolScope?: string): string[] {
	const results: string[] = [];

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return results;
	}

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relativePath = path.relative(rootDir, fullPath).replaceAll('\\', '/');

		if (entry.isDirectory()) {
			// Check if directory is ignored before recursing
			if (isIgnored(`${relativePath}/`, ignoreConfig, toolScope)) continue;
			results.push(...enumerateFiles(rootDir, fullPath, ignoreConfig, toolScope));
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).slice(1).toLowerCase();
			if (!PARSEABLE_EXTENSIONS.has(ext)) continue;
			if (isIgnored(relativePath, ignoreConfig, toolScope)) continue;
			results.push(relativePath);
		}
	}

	return results;
}

/** Compute SHA-256 hash of a file's contents. */
function computeContentHash(filePath: string): string {
	const content = fs.readFileSync(filePath);
	return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Enumerate workspace files and classify each against stored metadata.
 *
 * Classification:
 *   - `new-file`        — not in DB
 *   - `unchanged`       — same mtime (fast path)
 *   - `mtime-only`      — mtime changed but content hash matches (non-content change)
 *   - `content-changed` — mtime changed and content hash differs
 *   - `removed`         — in DB but not on disk
 */
export async function scanFiles(
	workspaceRoot: string,
	db: DbHandle,
	ignoreConfig: IgnoreConfig,
	toolScope?: string,
): Promise<FileClassification[]> {
	const allRelativePaths = enumerateFiles(workspaceRoot, workspaceRoot, ignoreConfig, toolScope);
	const storedMetadata = await getAllFileMetadata(db);
	const storedMap = new Map(storedMetadata.map(m => [m.filePath, m]));
	const classifications: FileClassification[] = [];
	const seenAbsolutePaths = new Set<string>();

	for (const relativePath of allRelativePaths) {
		const absolutePath = path.resolve(workspaceRoot, relativePath).replaceAll('\\', '/');
		seenAbsolutePaths.add(absolutePath);

		let stat: fs.Stats;
		try {
			stat = fs.statSync(absolutePath);
		} catch {
			continue;
		}

		const mtime = stat.mtimeMs;
		const stored = storedMap.get(absolutePath);

		if (!stored) {
			// New file — not in DB
			const contentHash = computeContentHash(absolutePath);
			classifications.push({
				filePath: absolutePath,
				status: 'new-file',
				mtime,
				contentHash,
			});
			continue;
		}

		if (stored.lastModified === mtime) {
			// Same mtime — unchanged (fast path)
			classifications.push({
				filePath: absolutePath,
				status: 'unchanged',
				mtime,
			});
			continue;
		}

		// mtime changed — compute content hash to check for actual content change
		const contentHash = computeContentHash(absolutePath);

		if (contentHash === stored.contentHash) {
			// Non-content change (git stage, permissions, etc.)
			classifications.push({
				filePath: absolutePath,
				status: 'mtime-only',
				mtime,
				contentHash,
			});
		} else {
			// Actual content change
			classifications.push({
				filePath: absolutePath,
				status: 'content-changed',
				mtime,
				contentHash,
			});
		}
	}

	// Files in DB but not on disk → removed
	for (const stored of storedMetadata) {
		if (!seenAbsolutePaths.has(stored.filePath)) {
			classifications.push({
				filePath: stored.filePath,
				status: 'removed',
				mtime: 0,
			});
		}
	}

	return classifications;
}
