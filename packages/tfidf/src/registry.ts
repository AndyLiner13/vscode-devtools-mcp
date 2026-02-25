import crypto from 'node:crypto';

import type { CommentNode, RegistryEntry, TfIdfConfig, TfIdfIdentifier } from './types.js';

import { generateIdentifiers } from './tfidf-service.js';

interface CacheEntry {
	fileHash: string;
	identifiers: TfIdfIdentifier[];
}

const cache = new Map<string, CacheEntry>();

function hashContent(text: string): string {
	return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Get TF-IDF identifiers for comment nodes in a file.
 * Returns cached results when file content hasn't changed,
 * otherwise recomputes and caches.
 */
export function getIdentifiers(
	filePath: string,
	fileContent: string,
	comments: readonly CommentNode[],
	config?: TfIdfConfig
): TfIdfIdentifier[] {
	const fileHash = hashContent(fileContent);
	const cached = cache.get(filePath);

	if (cached && cached.fileHash === fileHash) {
		return cached.identifiers;
	}

	const identifiers = generateIdentifiers(comments, config);

	cache.set(filePath, { fileHash, identifiers });

	return identifiers;
}

/**
 * Build a registry snapshot for external consumers.
 */
export function buildRegistryEntries(identifiers: readonly TfIdfIdentifier[]): RegistryEntry[] {
	return identifiers.map((id) => ({
		contentHash: hashContent(id.source.text),
		identifier: id.slug,
		range: id.source.range
	}));
}

/** Invalidate cache for a specific file. */
export function invalidate(filePath: string): void {
	cache.delete(filePath);
}

/** Invalidate all cached entries. */
export function invalidateAll(): void {
	cache.clear();
}
