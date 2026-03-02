/**
 * Phase 5 — Connection Graph.
 *
 * Main entry point for connection graph generation. Given search results
 * with their TS LS metadata, produces a plain text connection graph
 * in the blueprint's graph-first topology format.
 *
 * Usage:
 *   const result = generateConnectionGraph({ query, results });
 */

import type { ConnectionGraphInput, ConnectionGraphRawInput, ConnectionGraphResult, GraphResultEntry } from './types.js';
import { analyzeTopology } from './topology.js';
import { detectPatterns } from './patterns.js';
import { renderSingleResult, renderMultiResult } from './render.js';
import { enrichWithMetadata } from './enrich.js';

export type {
	ConnectionGraphInput,
	ConnectionGraphRawInput,
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
export { enrichWithMetadata } from './enrich.js';

/**
 * Generate a connection graph for a set of search results.
 *
 * This is the main API for Phase 5. It:
 * 1. Analyzes call tree topology (★/◆ markers, graph lines)
 * 2. Detects structural patterns (hubs, shared deps, shared types, diamonds)
 * 3. Renders the connection graph in the appropriate format
 *
 * @param input - Query, results with metadata.
 * @returns Connection graph text and metadata.
 * @throws If results array is empty.
 */
export function generateConnectionGraph(input: ConnectionGraphInput): ConnectionGraphResult {
	const { query, results } = input;

	if (results.length === 0) {
		throw new Error('At least one result is required to generate a connection graph');
	}

	// Single-result: use compact inline format
	if (results.length === 1) {
		return renderSingleResult(query, results[0]);
	}

	// Multi-result: full Graph → Patterns → Details format
	const topology = analyzeTopology(results);
	const patterns = detectPatterns(topology, results);

	return renderMultiResult(query, results, topology, patterns);
}

/**
 * Generate a connection graph from raw chunks, handling enrichment internally.
 *
 * This is the preferred API — callers pass chunks and a nodeMap, and the
 * graph module handles TS LS enrichment + topology + patterns + rendering.
 *
 * @param input - Raw chunks, nodeMap, query.
 * @returns Connection graph text and metadata.
 * @throws If chunks array is empty.
 */
export function generateConnectionGraphFromChunks(input: ConnectionGraphRawInput): ConnectionGraphResult {
	const { query, chunks, nodeMap, tsLsConfig } = input;

	if (chunks.length === 0) {
		throw new Error('At least one chunk is required to generate a connection graph');
	}

	const results: GraphResultEntry[] = [];
	for (const chunk of chunks) {
		const node = nodeMap.get(chunk.id);
		const metadata = enrichWithMetadata(node, chunk, tsLsConfig);
		results.push({ chunk, metadata });
	}

	return generateConnectionGraph({ query, results });
}
