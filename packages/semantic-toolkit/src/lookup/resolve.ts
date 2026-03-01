/**
 * Phase 6 — Symbol Lookup: Symbol Resolver.
 *
 * Walks parsed symbol trees and chunked files to find exact matches
 * for a parsed symbol path. Implements the strict-with-helpful-fallback
 * pattern:
 *   1. Exact case-sensitive name + exact path match
 *   2. On failure: case-insensitive fallback → helpful hints
 *   3. On path failure: partial path fallback → path suggestions
 *
 * TODO(Phase 7): Replace fresh parsing with indexed chunk retrieval.
 * Once the LanceDB index exists, the resolve step should query the index
 * instead of iterating over freshly parsed ChunkedFile[].
 */

import * as path from 'node:path';

import type { CodeChunk, ChunkedFile } from '../chunker/types.js';
import type { ParsedSymbolPath, ResolvedMatch, NearMatch, ResolutionResult } from './types.js';

/**
 * Resolve a parsed symbol path against a set of chunked files.
 *
 * @param symbolPath - The parsed symbol path from the query.
 * @param chunkedFiles - All chunked files in the workspace.
 * @returns Resolution result with matches and/or near-match hints.
 */
export function resolveSymbol(
	symbolPath: ParsedSymbolPath,
	chunkedFiles: ChunkedFile[],
): ResolutionResult {
	// Step 1: Scope to relevant files
	const scopedFiles = scopeToFiles(symbolPath.filePath, chunkedFiles);

	// If file path was specified but no files matched, try partial fallback
	if (symbolPath.filePath !== null && scopedFiles.exact.length === 0) {
		return buildPathHintResult(symbolPath.filePath, chunkedFiles);
	}

	const filesToSearch = scopedFiles.exact;

	// Step 2: Exact case-sensitive match
	let exactMatches = findSymbolMatches(
		symbolPath.symbolName,
		symbolPath.parentName,
		filesToSearch,
		true,
	);

	// Step 2b: Apply kind filter if specified
	if (exactMatches.length > 0 && symbolPath.symbolKind !== null) {
		exactMatches = exactMatches.filter(
			m => m.chunk.nodeKind.toLowerCase() === symbolPath.symbolKind,
		);
	}

	if (exactMatches.length > 0) {
		return {
			matches: exactMatches,
			nearMatches: [],
			hasCaseHints: false,
			hasPathHints: false,
		};
	}

	// Step 3: Case-insensitive fallback for hints
	const caseInsensitiveMatches = findSymbolMatches(
		symbolPath.symbolName,
		symbolPath.parentName,
		filesToSearch,
		false,
	);

	if (caseInsensitiveMatches.length > 0) {
		const nearMatches: NearMatch[] = caseInsensitiveMatches.map(m => ({
			value: m.chunk.name,
			location: `${m.relativePath}:${m.chunk.startLine}`,
			kind: 'case-mismatch' as const,
		}));

		return {
			matches: [],
			nearMatches,
			hasCaseHints: true,
			hasPathHints: false,
		};
	}

	// Step 4: Nothing found at all
	return {
		matches: [],
		nearMatches: [],
		hasCaseHints: false,
		hasPathHints: false,
	};
}

// ─── File Scoping ───────────────────────────────────────────────

interface ScopedFiles {
	exact: ChunkedFile[];
}

/**
 * Scope chunked files to those matching the optional file path filter.
 * If filePath is null, all files are returned.
 */
function scopeToFiles(
	filePath: string | null,
	chunkedFiles: ChunkedFile[],
): ScopedFiles {
	if (filePath === null) {
		return { exact: chunkedFiles };
	}

	// Normalize to forward slashes for comparison
	const normalizedTarget = filePath.replace(/\\/g, '/');

	const exact = chunkedFiles.filter(cf => {
		const cfRelative = cf.parsedFile.relativePath.replace(/\\/g, '/');
		return cfRelative === normalizedTarget;
	});

	return { exact };
}

/**
 * Build a path hint result when exact file path matching fails.
 * Searches for partial matches (basename or suffix) and returns hints.
 */
function buildPathHintResult(
	requestedPath: string,
	chunkedFiles: ChunkedFile[],
): ResolutionResult {
	const normalized = requestedPath.replace(/\\/g, '/');
	const basename = path.basename(normalized);

	const nearMatches: NearMatch[] = [];

	for (const cf of chunkedFiles) {
		const cfRelative = cf.parsedFile.relativePath.replace(/\\/g, '/');

		// Basename match: "tokenService.ts" matches "src/auth/tokenService.ts"
		if (path.basename(cfRelative) === basename) {
			nearMatches.push({
				value: cfRelative,
				location: cfRelative,
				kind: 'partial-path',
			});
			continue;
		}

		// Suffix match: "auth/tokenService.ts" matches "src/auth/tokenService.ts"
		if (cfRelative.endsWith(normalized) || cfRelative.endsWith(`/${normalized}`)) {
			nearMatches.push({
				value: cfRelative,
				location: cfRelative,
				kind: 'partial-path',
			});
		}
	}

	return {
		matches: [],
		nearMatches,
		hasCaseHints: false,
		hasPathHints: nearMatches.length > 0,
	};
}

// ─── Symbol Matching ────────────────────────────────────────────

/**
 * Find chunks matching a symbol name and optional parent name.
 *
 * @param symbolName - The symbol name to match.
 * @param parentName - Optional parent name constraint (e.g., "TokenService").
 * @param files - The chunked files to search.
 * @param caseSensitive - Whether matching is case-sensitive.
 * @returns Array of resolved matches.
 */
function findSymbolMatches(
	symbolName: string,
	parentName: string | null,
	files: ChunkedFile[],
	caseSensitive: boolean,
): ResolvedMatch[] {
	const matches: ResolvedMatch[] = [];
	const compare = caseSensitive ? strictCompare : caseInsensitiveCompare;

	for (const cf of files) {
		for (const chunk of cf.chunks) {
			if (!compare(chunk.name, symbolName)) {
				continue;
			}

			// If parent name is specified, verify the parent chain
			if (parentName !== null) {
				if (!matchesParent(chunk, parentName, caseSensitive)) {
					continue;
				}
			}

			matches.push({
				chunk,
				relativePath: cf.parsedFile.relativePath,
			});
		}
	}

	return matches;
}

/**
 * Check if a chunk's parent matches the required parent name.
 * Supports dot-separated parent chains (e.g., "Outer.Inner").
 */
function matchesParent(
	chunk: CodeChunk,
	requiredParent: string,
	caseSensitive: boolean,
): boolean {
	const compare = caseSensitive ? strictCompare : caseInsensitiveCompare;

	// Direct parent name match
	if (chunk.parentName !== null && compare(chunk.parentName, requiredParent)) {
		return true;
	}

	// Check breadcrumb for nested parent chains (e.g., "file > Outer > Inner > method")
	// The requiredParent might be "Outer.Inner" for deeply nested symbols
	if (requiredParent.includes('.')) {
		const parentChain = requiredParent.split('.');
		return matchesBreadcrumbParentChain(chunk.breadcrumb, parentChain, caseSensitive);
	}

	return false;
}

/**
 * Match a dot-separated parent chain against a breadcrumb string.
 * Breadcrumb format: "file > Parent > Child > symbol"
 * Parent chain: ["Parent", "Child"]
 */
function matchesBreadcrumbParentChain(
	breadcrumb: string,
	parentChain: string[],
	caseSensitive: boolean,
): boolean {
	const compare = caseSensitive ? strictCompare : caseInsensitiveCompare;
	const breadcrumbSegments = breadcrumb.split(' > ').map(s => s.trim());

	// The parent chain should appear as consecutive segments in the breadcrumb,
	// immediately before the symbol name (last breadcrumb segment).
	// Example: breadcrumb = "file > Outer > Inner > method"
	//          parentChain = ["Outer", "Inner"]
	//          → match at indices 1,2 (just before index 3 "method")
	if (breadcrumbSegments.length < parentChain.length + 1) {
		return false;
	}

	// Check from the end (just before the last segment which is the symbol itself)
	const startIdx = breadcrumbSegments.length - 1 - parentChain.length;
	for (let i = 0; i < parentChain.length; i++) {
		if (!compare(breadcrumbSegments[startIdx + i], parentChain[i])) {
			return false;
		}
	}

	return true;
}

// ─── Comparison Helpers ─────────────────────────────────────────

function strictCompare(a: string, b: string): boolean {
	return a === b;
}

function caseInsensitiveCompare(a: string, b: string): boolean {
	return a.toLowerCase() === b.toLowerCase();
}

// ─── Hint Formatting ────────────────────────────────────────────

/**
 * Format a hint message for case-mismatch near-matches.
 *
 * @param requestedName - The name the user typed.
 * @param nearMatches - Near-matches found case-insensitively.
 * @returns Formatted hint string.
 */
export function formatCaseHint(requestedName: string, nearMatches: NearMatch[]): string {
	if (nearMatches.length === 0) {
		return `No symbol "${requestedName}" found.`;
	}

	if (nearMatches.length === 1) {
		const m = nearMatches[0];
		return `No symbol "${requestedName}" found. Did you mean "${m.value}" (${m.location})?`;
	}

	const suggestions = nearMatches
		.slice(0, 5)
		.map(m => `  - "${m.value}" (${m.location})`)
		.join('\n');
	const suffix = nearMatches.length > 5 ? `\n  ... and ${nearMatches.length - 5} more` : '';

	return `No symbol "${requestedName}" found. Did you mean one of:\n${suggestions}${suffix}`;
}

/**
 * Format a hint message for partial-path near-matches.
 *
 * @param requestedPath - The path the user typed.
 * @param nearMatches - Near-matches found via partial path matching.
 * @returns Formatted hint string.
 */
export function formatPathHint(requestedPath: string, nearMatches: NearMatch[]): string {
	if (nearMatches.length === 0) {
		return `No file "${requestedPath}" found.`;
	}

	if (nearMatches.length === 1) {
		return `No file "${requestedPath}" found. Similar path: ${nearMatches[0].value}`;
	}

	const suggestions = nearMatches
		.slice(0, 5)
		.map(m => `  - ${m.value}`)
		.join('\n');
	const suffix = nearMatches.length > 5 ? `\n  ... and ${nearMatches.length - 5} more` : '';

	return `No file "${requestedPath}" found. Similar paths:\n${suggestions}${suffix}`;
}

/**
 * Format a hint message for ambiguous symbol matches (same name, different kinds).
 * Shows the user exact queries they can use with the `kind` flag to disambiguate.
 *
 * @param symbolName - The symbol name the user queried.
 * @param parentName - Optional parent name from the query.
 * @param matches - The ambiguous matches (all same name, different kinds).
 * @returns Formatted hint string with suggested queries.
 */
export function formatAmbiguityHint(
	symbolName: string,
	parentName: string | null,
	matches: ResolvedMatch[],
): string {
	const symbolPath = parentName
		? `${parentName} > ${symbolName}`
		: symbolName;

	const header = `Multiple symbols named "${symbolName}" found. ` +
		`Add a "kind" flag to disambiguate:`;

	const suggestions = matches
		.map(m => {
			const kind = m.chunk.nodeKind.toLowerCase();
			const location = `${m.relativePath}:${m.chunk.startLine}`;
			return `  - symbol = ${symbolPath}, kind = ${kind}  (${kind} at ${location})`;
		})
		.join('\n');

	return `${header}\n${suggestions}`;
}
