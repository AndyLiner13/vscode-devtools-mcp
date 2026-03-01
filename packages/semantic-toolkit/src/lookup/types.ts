/**
 * Phase 6 — Symbol Lookup types.
 *
 * Defines input/output interfaces for the direct symbol lookup module.
 * Symbol lookup bypasses vector search entirely, resolving symbols by
 * exact name/path matching through parsed symbol trees.
 */

import type { CodeChunk } from '../chunker/types.js';
import type { ConnectionGraphResult, GraphResultEntry } from '../graph/types.js';
import type { SnapshotResult } from '../snapshot/types.js';
import type { NodeKind, RelativePath } from '../shared/types.js';

// ─── Query Parsing ──────────────────────────────────────────────

/** A parsed symbol lookup path extracted from a `symbol = ...` query. */
export interface ParsedSymbolPath {
	/** Optional file path segment (e.g., "src/auth/tokenService.ts"). */
	filePath: string | null;

	/** Optional parent symbol name (e.g., "TokenService"). */
	parentName: string | null;

	/** Required symbol name (e.g., "validateToken"). */
	symbolName: string;

	/**
	 * Optional symbol kind filter (e.g., "class", "interface", "function").
	 * Parsed from `, kind = interface` suffix in the query.
	 * Only required when multiple symbols share the same name and hierarchy.
	 */
	symbolKind: NodeKind | null;
}

/** Result of parsing a query string for symbol lookup prefix detection. */
export interface QueryParseResult {
	/** True if the query has a `symbol = ` prefix → this is a symbol lookup. */
	isSymbolLookup: boolean;

	/** The parsed symbol path, or null if not a symbol lookup. */
	path: ParsedSymbolPath | null;
}

// ─── Resolution ─────────────────────────────────────────────────

/** A single resolved match from the symbol lookup. */
export interface ResolvedMatch {
	/** The matched CodeChunk. */
	chunk: CodeChunk;

	/** Workspace-relative file path where this match was found. */
	relativePath: RelativePath;
}

/** A near-match found during case-insensitive or partial-path fallback. */
export interface NearMatch {
	/** The name or path that nearly matched. */
	value: string;

	/** Location info (file path, line number). */
	location: string;

	/** Which kind of fallback found this. */
	kind: 'case-mismatch' | 'partial-path';
}

/** Result of the symbol resolution step. */
export interface ResolutionResult {
	/** Exact matches found (empty if none). */
	matches: ResolvedMatch[];

	/** Near-matches found during fallback (for hint messages). */
	nearMatches: NearMatch[];

	/** True if results came from case-insensitive fallback (hints only, not auto-resolved). */
	hasCaseHints: boolean;

	/** True if results came from partial path fallback (hints only, not auto-resolved). */
	hasPathHints: boolean;
}

// ─── Output ─────────────────────────────────────────────────────

/**
 * The final symbol lookup result.
 * Same output format as the full search pipeline.
 */
export interface SymbolLookupResult {
	/** True if the query was detected as a symbol lookup. */
	isSymbolLookup: true;

	/** True if exact matches were found. */
	found: boolean;

	/**
	 * Structured output sections for multi-panel rendering.
	 * [0] = debug metadata (search summary + match/file/token counts)
	 * [1] = connection graph (symbol card with calls/refs)
	 * [2] = code (raw snapshot content)
	 * When found is false, contains a single-element tuple with the error/hint message.
	 */
	outputSections: [debugMeta: string, graph: string, code: string] | [message: string];

	/** Number of matched symbols. */
	matchCount: number;

	/** Number of distinct files with matches. */
	fileCount: number;

	/** Estimated token count of the output. */
	tokenCount: number;

	/**
	 * Hint message when no exact match is found but near-matches exist.
	 * Null if exact matches were found or no hints are available.
	 */
	hint: string | null;
}

/**
 * Returned when the query is not a symbol lookup (no `symbol = ` prefix).
 * Signals the caller should proceed with the full search pipeline.
 */
export interface NotALookupResult {
	/** False — this query is not a symbol lookup. */
	isSymbolLookup: false;
}

/** Union type returned by the lookup entry point. */
export type LookupResult = SymbolLookupResult | NotALookupResult;
