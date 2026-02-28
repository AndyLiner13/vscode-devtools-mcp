/**
 * Phase 5 — Connection Graph.
 *
 * Main entry point for connection graph generation. Given search results
 * with their TS LS metadata, produces a plain text connection graph
 * in the blueprint's graph-first topology format.
 *
 * Usage:
 *   const result = generateConnectionGraph({ query, results, tokenBudget });
 */

import type { ConnectionGraphInput, ConnectionGraphResult, GraphResultEntry } from './types.js';
import { analyzeTopology } from './topology.js';
import { detectPatterns } from './patterns.js';
import { renderSingleResult, renderMultiResult } from './render.js';

export type {
	ConnectionGraphInput,
	ConnectionGraphResult,
	GraphResultEntry,
	TopologyNode,
	TopologyEdge,
	TopologyResult,
	GraphLine,
	HubPattern,
	SharedDepPattern,
	SharedTypePattern,
	DiamondPattern,
	PatternsResult,
} from './types.js';

export { analyzeTopology } from './topology.js';
export { detectPatterns } from './patterns.js';
export { renderSingleResult, renderMultiResult } from './render.js';

/**
 * Generate a connection graph for a set of search results.
 *
 * This is the main API for Phase 5. It:
 * 1. Analyzes call tree topology (★/◆ markers, graph lines)
 * 2. Detects structural patterns (hubs, shared deps, shared types, diamonds)
 * 3. Renders the connection graph in the appropriate format
 *
 * @param input - Query, results with metadata, and token budget.
 * @returns Connection graph text and metadata.
 * @throws If results array is empty.
 */
export function generateConnectionGraph(input: ConnectionGraphInput): ConnectionGraphResult {
	const { query, results, tokenBudget } = input;

	if (results.length === 0) {
		throw new Error('At least one result is required to generate a connection graph');
	}

	// Single-result: use compact inline format
	if (results.length === 1) {
		return renderSingleResult(query, results[0], tokenBudget);
	}

	// Multi-result: full Graph → Patterns → Details format
	const topology = analyzeTopology(results);
	const patterns = detectPatterns(topology, results);

	return renderMultiResult(query, results, topology, patterns, tokenBudget);
}
