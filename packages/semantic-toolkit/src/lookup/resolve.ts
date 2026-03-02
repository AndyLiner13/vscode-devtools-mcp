/**
 * Phase 6 — Symbol Lookup: Symbol Resolver.
 *
 * Walks chunked files to find exact matches for a parsed symbol path.
 * Implements the strict-with-helpful-fallback pattern:
 *   1. Exact case-sensitive name + exact path match
 *   2. On failure: case-insensitive fallback → helpful hints
 *   3. On path failure: partial path fallback → path suggestions
 *
 * Uses ts-morph SourceFile directly for local symbol hints instead of
 * walking parsed symbol trees.
 */

import * as path from 'node:path';
import type { SourceFile } from 'ts-morph';

import type { CodeChunk, ChunkedFile } from '../chunker/types.js';
import { hasBody } from '../chunker/collapse.js';
import type { ParsedSymbolPath, ResolvedMatch, NearMatch, ResolutionResult } from './types.js';

/**
 * Resolve a parsed symbol path against a set of chunked files.
 *
 * @param symbolPath - The parsed symbol path from the query.
 * @param chunkedFiles - All chunked files in the workspace.
 * @param workspaceRoot - Absolute workspace root for path matching.
 * @param sourceFiles - ts-morph SourceFiles for local symbol hint resolution.
 * @returns Resolution result with matches and/or near-match hints.
 */
export function resolveSymbol(
	symbolPath: ParsedSymbolPath,
	chunkedFiles: ChunkedFile[],
	workspaceRoot: string,
	sourceFiles?: Map<string, SourceFile>,
): ResolutionResult {
	// Step 1: Scope to relevant files
	const scopedFiles = scopeToFiles(symbolPath.filePath, chunkedFiles, workspaceRoot);

	// If file path was specified but no files matched, try partial fallback
	if (symbolPath.filePath !== null && scopedFiles.exact.length === 0) {
		return buildPathHintResult(symbolPath.filePath, chunkedFiles, workspaceRoot);
	}

	const filesToSearch = scopedFiles.exact;

	// Step 2: Exact case-sensitive match
	let exactMatches = findSymbolMatches(
		symbolPath.symbolName,
		symbolPath.parentName,
		filesToSearch,
		true,
		workspaceRoot,
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
			hasLocalHint: false,
		};
	}

	// Step 3: Case-insensitive fallback for hints
	const caseInsensitiveMatches = findSymbolMatches(
		symbolPath.symbolName,
		symbolPath.parentName,
		filesToSearch,
		false,
		workspaceRoot,
	);

	if (caseInsensitiveMatches.length > 0) {
		const nearMatches: NearMatch[] = caseInsensitiveMatches.map(m => ({
			value: m.chunk.name,
			location: `${toRelative(m.filePath, workspaceRoot)}:${m.chunk.startLine}`,
			kind: 'case-mismatch' as const,
		}));

		return {
			matches: [],
			nearMatches,
			hasCaseHints: true,
			hasPathHints: false,
			hasLocalHint: false,
		};
	}

	// Step 4: Check if the symbol exists as a local (non-body-bearing) declaration
	if (sourceFiles) {
	const localHits = findLocalSymbolInSourceFiles(symbolPath.symbolName, filesToSearch, sourceFiles, workspaceRoot);
	if (localHits.length > 0) {
		const nearMatches: NearMatch[] = localHits.map(h => ({
			value: h.parentName,
			location: `${h.relativePath}:${h.parentStartLine}`,
			kind: 'local-symbol' as const,
		}));

		return {
			matches: [],
			nearMatches,
			hasCaseHints: false,
			hasPathHints: false,
			hasLocalHint: true,
		};
	}
	}

	// Step 5: Nothing found at all
	return {
		matches: [],
		nearMatches: [],
		hasCaseHints: false,
		hasPathHints: false,
		hasLocalHint: false,
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
	workspaceRoot: string,
): ScopedFiles {
	if (filePath === null) {
		return { exact: chunkedFiles };
	}

	const normalizedTarget = filePath.replace(/\\/g, '/');

	const exact = chunkedFiles.filter(cf => {
		const cfRelative = toRelative(cf.filePath, workspaceRoot);
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
	workspaceRoot: string,
): ResolutionResult {
	const normalized = requestedPath.replace(/\\/g, '/');
	const basename = path.basename(normalized);

	const nearMatches: NearMatch[] = [];

	for (const cf of chunkedFiles) {
		const cfRelative = toRelative(cf.filePath, workspaceRoot);

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
		hasLocalHint: false,
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
	workspaceRoot: string,
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
				filePath: cf.filePath,
			});
		}
	}

	return matches;
}

/**
 * Check if a chunk's parent matches the required parent name.
 */
function matchesParent(
	chunk: CodeChunk,
	requiredParent: string,
	caseSensitive: boolean,
): boolean {
	const compare = caseSensitive ? strictCompare : caseInsensitiveCompare;

	if (chunk.parentName !== null && compare(chunk.parentName, requiredParent)) {
		return true;
	}

	return false;
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
	workspaceRoot: string,
): string {
	const symbolPath = parentName
		? `${parentName} > ${symbolName}`
		: symbolName;

	const header = `Multiple symbols named "${symbolName}" found. ` +
		`Add a "kind" flag to disambiguate:`;

	const suggestions = matches
		.map(m => {
			const kind = m.chunk.nodeKind.toLowerCase();
			const location = `${toRelative(m.filePath, workspaceRoot)}:${m.chunk.startLine}`;
			return `  - symbol = ${symbolPath}, kind = ${kind}  (${kind} at ${location})`;
		})
		.join('\n');

	return `${header}\n${suggestions}`;
}

// ─── Path Helpers ───────────────────────────────────────────────

function toRelative(absolutePath: string, workspaceRoot: string): string {
	return path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
}

// ─── Local Symbol Search ────────────────────────────────────────

interface LocalSymbolHit {
	parentName: string;
	parentKind: string;
	parentStartLine: number;
	relativePath: string;
	symbolKind: string;
}

/**
 * Search ts-morph source files for a name that exists as a local (non-body-bearing)
 * declaration inside a body-bearing parent. Uses ts-morph getLocals() directly.
 */
function findLocalSymbolInSourceFiles(
	symbolName: string,
	chunkedFiles: ChunkedFile[],
	sourceFiles: Map<string, SourceFile>,
	workspaceRoot: string,
): LocalSymbolHit[] {
	const hits: LocalSymbolHit[] = [];

	for (const cf of chunkedFiles) {
		const sf = sourceFiles.get(cf.filePath);
		if (!sf) continue;

		const relativePath = toRelative(cf.filePath, workspaceRoot);

		for (const sym of sf.getLocals()) {
			for (const decl of sym.getDeclarations()) {
				if (!('getMembers' in decl)) continue;

				const container = decl as unknown as { getMembers(): import('ts-morph').Node[] };
				for (const member of container.getMembers()) {
					if (!hasBody(member)) {
						const memberName = 'getName' in member
							&& typeof (member as Record<string, unknown>).getName === 'function'
							? (member as unknown as { getName(): string | undefined }).getName()
							: undefined;

						if (memberName === symbolName) {
							const parentName = 'getName' in decl
								&& typeof (decl as Record<string, unknown>).getName === 'function'
								? (decl as unknown as { getName(): string | undefined }).getName() ?? '<anonymous>'
								: '<anonymous>';

							hits.push({
								parentName,
								parentKind: decl.getKindName(),
								parentStartLine: decl.getStartLineNumber(),
								relativePath,
								symbolKind: member.getKindName(),
							});
						}
					}
				}
			}
		}
	}

	return hits;
}

/**
 * Format a hint message when a symbol is found as a local declaration
 * inside a parent symbol.
 *
 * @param requestedName - The name the user typed.
 * @param nearMatches - Local symbol matches found in the parsed tree.
 * @returns Formatted hint string.
 */
export function formatLocalHint(requestedName: string, nearMatches: NearMatch[]): string {
	if (nearMatches.length === 1) {
		const m = nearMatches[0];
		return (
			`"${requestedName}" is a local declaration inside ${m.value} (${m.location}). ` +
			`Try: symbol = ${m.value}`
		);
	}

	const suggestions = nearMatches
		.slice(0, 5)
		.map(m => `  - symbol = ${m.value}  (${m.location})`)
		.join('\n');
	const suffix = nearMatches.length > 5 ? `\n  ... and ${nearMatches.length - 5} more` : '';

	return `"${requestedName}" is a local declaration. Did you mean one of its parents?\n${suggestions}${suffix}`;
}
