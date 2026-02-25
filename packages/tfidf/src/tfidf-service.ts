import natural from 'natural';

import type { CommentNode, TfIdfConfig, TfIdfIdentifier } from './types.js';

const DEFAULT_TOP_TERMS = 3;

// Only the literal JSDoc/TSDoc syntax keywords that appear in virtually
// every doc comment. Everything else is situational and valuable as an identifier.
const COMMENT_STOP_WORDS = new Set([
	'comment', 'comments',
	'param', 'returns', 'return', 'throws', 'type',
]);

/**
 * Strip comment delimiters and decorative characters from raw comment text.
 * Handles //, /*, *\/, /**, and leading * in JSDoc-style comments.
 */
function stripCommentDelimiters(text: string): string {
	return text
		.replace(/^\/\*\*?/gm, '')   // opening /* or /**
		.replace(/\*\/$/gm, '')       // closing */
		.replace(/^\s*\*\s?/gm, '')   // leading * in block/JSDoc comments
		.replace(/^\/\/\s?/gm, '')    // line comment //
		.replace(/[─━═]+/g, '')       // decorative section header characters
		.trim();
}

/**
 * Generate TF-IDF-based semantic identifiers for a set of comment nodes.
 *
 * Each comment becomes a "document" in the corpus. Terms that are frequent
 * within a specific comment but rare across all comments in the file
 * score highest — producing distinctive identifiers.
 */
export function generateIdentifiers(
	comments: readonly CommentNode[],
	config?: TfIdfConfig
): TfIdfIdentifier[] {
	if (comments.length === 0) return [];

	const topN = config?.topTerms ?? DEFAULT_TOP_TERMS;
	const tfidf = new natural.TfIdf();

	// Stage 1: Build corpus — each comment is a document
	for (const comment of comments) {
		const cleaned = stripCommentDelimiters(comment.text);
		tfidf.addDocument(cleaned);
	}

	// Stage 2: Score terms and generate identifiers
	const results: TfIdfIdentifier[] = [];
	const usedSlugs = new Map<string, number>();

	for (let i = 0; i < comments.length; i++) {
		const rankedTerms = tfidf.listTerms(i) as Array<{ term: string; tfidf: number }>;

		const topTerms = rankedTerms
			.filter((t) => !COMMENT_STOP_WORDS.has(t.term))
			.slice(0, topN)
			.map((t) => ({ term: t.term, score: t.tfidf }));

		// Build slug from top terms; fall back to line number if no terms surface
		const baseSlug = topTerms.length > 0
			? topTerms.map((t) => t.term).join('-')
			: `line-${comments[i].range.startLine}`;

		// Stage 3: Collision resolution with numeric suffix
		const count = usedSlugs.get(baseSlug) ?? 0;
		const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
		usedSlugs.set(baseSlug, count + 1);

		results.push({ slug, terms: topTerms, source: comments[i] });
	}

	return results;
}
