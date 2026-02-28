/**
 * Phase 5 — Connection Graph types.
 *
 * Defines input/output interfaces for the connection graph module.
 * The connection graph is a structural overview of search results,
 * showing call chain topology, structural patterns, and per-symbol details.
 */

import type { CodeChunk } from '../chunker/types';
import type { SymbolMetadata, SymbolRef, OutgoingCall, IncomingCaller } from '../ts-ls/types';

// ─── Input ───────────────────────────────────────────────────────

/** A search result paired with its TS LS metadata. */
export interface GraphResultEntry {
	/** The code chunk for this result. */
	chunk: CodeChunk;

	/** Structural metadata from Phase 3 TS LS analysis. */
	metadata: SymbolMetadata;
}

/** Input for connection graph generation. */
export interface ConnectionGraphInput {
	/** The original search query string. */
	query: string;

	/** Ordered result entries (by score descending). */
	results: GraphResultEntry[];

	/** Maximum token budget for the full MCP response. */
	tokenBudget: number;
}

// ─── Topology analysis ──────────────────────────────────────────

/** A node in the call topology graph. */
export interface TopologyNode {
	/** Symbol name (e.g. "TokenService.validateToken"). */
	name: string;

	/** Workspace-relative file path. */
	filePath: string;

	/** True if this symbol is in the result set — renders with ★. */
	isResult: boolean;

	/** True if this symbol is referenced by 2+ results but NOT in the result set — renders with ◆. */
	isSharedDep: boolean;

	/** Result index (1-based) if this is a result symbol. Undefined otherwise. */
	resultIndex?: number;
}

/** An edge in the call topology: caller → callee. */
export interface TopologyEdge {
	/** The calling symbol (qualified name). */
	from: string;

	/** The called symbol (qualified name). */
	to: string;

	/** True if this edge creates a cycle (back-edge). */
	isCyclic: boolean;

	/** True if the target was depth-limited (not expanded further). */
	isDepthLimited: boolean;
}

/** Full topology analysis result. */
export interface TopologyResult {
	/** All nodes discovered in the call trees. */
	nodes: Map<string, TopologyNode>;

	/** All edges in the call trees. */
	edges: TopologyEdge[];

	/** Ordered call tree lines for the Graph section rendering. */
	graphLines: GraphLine[];
}

/** A single rendered line in the Graph section (pre-formatting). */
export interface GraphLine {
	/** Indentation depth (0 = root result). */
	depth: number;

	/** The result index (1-based) if this is a result symbol. */
	resultIndex?: number;

	/** Display name of the symbol. */
	name: string;

	/** File path (short) for display. */
	filePath: string;

	/** ★ if in result set. */
	isResult: boolean;

	/** ◆ if shared dependency. */
	isSharedDep: boolean;

	/** True if this is a cycle back-edge. */
	isCyclic: boolean;

	/** True if this node was depth-limited. */
	isDepthLimited: boolean;
}

// ─── Patterns ───────────────────────────────────────────────────

/** A hub: a result symbol called by 2+ other results. */
export interface HubPattern {
	/** The hub result index (1-based). */
	resultIndex: number;

	/** Display name of the hub symbol. */
	name: string;

	/** Result indices that call this hub. */
	calledBy: number[];
}

/** A shared dependency: a non-result symbol used by 2+ results. */
export interface SharedDepPattern {
	/** Display name of the shared symbol. */
	name: string;

	/** File path of the shared symbol. */
	filePath: string;

	/** Result indices that reference this symbol. */
	usedBy: number[];
}

/** A shared type: a type used by multiple results (from typeFlows). */
export interface SharedTypePattern {
	/** Type name. */
	name: string;

	/** File path where the type is defined. */
	filePath: string;

	/** Number of results that reference this type. */
	usageCount: number;

	/** Total number of results. */
	totalResults: number;
}

/** A diamond: two results that share both a caller and a callee. */
export interface DiamondPattern {
	/** The two result indices forming the diamond. */
	results: [number, number];

	/** The shared caller or callee name. */
	sharedSymbol: string;

	/** The relationship direction. */
	direction: 'caller' | 'callee';
}

/** All detected structural patterns. */
export interface PatternsResult {
	hubs: HubPattern[];
	sharedDeps: SharedDepPattern[];
	sharedTypes: SharedTypePattern[];
	diamonds: DiamondPattern[];
}

// ─── Output ─────────────────────────────────────────────────────

/** The final connection graph output. */
export interface ConnectionGraphResult {
	/** The rendered connection graph text. */
	text: string;

	/** Number of result symbols. */
	resultCount: number;

	/** Number of distinct files across results. */
	fileCount: number;

	/** Estimated token count of the rendered text. */
	tokenCount: number;
}
