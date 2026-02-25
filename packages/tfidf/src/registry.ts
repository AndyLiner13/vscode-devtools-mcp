import crypto from 'node:crypto';

import type { CommentNode, RegistryEntry, TfIdfConfig, TfIdfIdentifier } from './types.js';

import { generateIdentifiers } from './tfidf-service.js';

function hashContent(text: string): string {
	return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Get TF-IDF identifiers for comment nodes in a file.
 * Recomputes on every call — each comment category (jsdoc, tsdoc, comment)
 * needs its own corpus, so per-file caching would return wrong results.
 */
export function getIdentifiers(
	_filePath: string,
	_fileContent: string,
	comments: readonly CommentNode[],
	config?: TfIdfConfig
): TfIdfIdentifier[] {
	return generateIdentifiers(comments, config);
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


