/**
 * Phase 5 — Call tree topology analyzer.
 *
 * Walks the outgoing call trees from each result symbol, builds a topology
 * of nodes and edges, and assigns ★ (in-result) and ◆ (shared dependency)
 * markers. Produces ordered graph lines for rendering.
 */

import type { OutgoingCall, SymbolRef } from '../ts-ls/types';
import type {
	GraphResultEntry,
	TopologyNode,
	TopologyEdge,
	TopologyResult,
	GraphLine,
} from './types';

/**
 * Build a unique key for a symbol (name + filePath).
 * Used for deduplication across call trees.
 */
function symbolKey(name: string, filePath: string): string {
	return `${filePath}::${name}`;
}

function symbolKeyFromRef(ref: SymbolRef): string {
	return symbolKey(ref.name, ref.filePath);
}

/**
 * Analyze the call tree topology for all result symbols.
 *
 * Walks each result's `outgoingCalls` tree recursively, collecting nodes
 * and edges. Assigns ★ to nodes in the result set and ◆ to nodes
 * referenced by 2+ results that are NOT in the result set.
 *
 * @param results - Ordered result entries with metadata.
 * @returns Topology analysis with nodes, edges, and pre-formatted graph lines.
 */
export function analyzeTopology(results: GraphResultEntry[]): TopologyResult {
	const nodes = new Map<string, TopologyNode>();
	const edges: TopologyEdge[] = [];

	// Build the result set index: symbolKey → 1-based index
	const resultIndex = new Map<string, number>();
	for (let i = 0; i < results.length; i++) {
		const entry = results[i];
		const key = symbolKey(
			entry.metadata.symbol.name,
			entry.metadata.symbol.filePath,
		);
		resultIndex.set(key, i + 1);

		// Register result nodes
		nodes.set(key, {
			name: entry.metadata.symbol.name,
			filePath: entry.metadata.symbol.filePath,
			isResult: true,
			isSharedDep: false,
			resultIndex: i + 1,
		});
	}

	// Track which results reference each non-result symbol (for ◆ detection)
	const nonResultUsage = new Map<string, Set<number>>();

	// Walk each result's outgoing call tree
	for (let i = 0; i < results.length; i++) {
		const entry = results[i];
		const rootKey = symbolKey(
			entry.metadata.symbol.name,
			entry.metadata.symbol.filePath,
		);

		walkOutgoingCalls(
			entry.metadata.outgoingCalls,
			rootKey,
			i + 1,
			resultIndex,
			nodes,
			edges,
			nonResultUsage,
			new Set<string>(),
		);
	}

	// Mark shared dependencies (referenced by 2+ results, not in result set)
	for (const [key, usedByResults] of nonResultUsage) {
		if (usedByResults.size >= 2) {
			const existing = nodes.get(key);
			if (existing && !existing.isResult) {
				existing.isSharedDep = true;
			}
		}
	}

	// Build ordered graph lines
	const graphLines = buildGraphLines(results, resultIndex, nodes);

	return { nodes, edges, graphLines };
}

/**
 * Recursively walk an outgoing call tree, collecting nodes and edges.
 */
function walkOutgoingCalls(
	calls: OutgoingCall[],
	parentKey: string,
	resultIdx: number,
	resultIndex: Map<string, number>,
	nodes: Map<string, TopologyNode>,
	edges: TopologyEdge[],
	nonResultUsage: Map<string, Set<number>>,
	visited: Set<string>,
): void {
	for (const call of calls) {
		const callKey = symbolKeyFromRef(call.target);

		// Register edge
		edges.push({
			from: parentKey,
			to: callKey,
			isCyclic: call.cyclic === true,
			isDepthLimited: call.depthLimited === true,
		});

		// Register node if not already known
		if (!nodes.has(callKey)) {
			const isResult = resultIndex.has(callKey);
			nodes.set(callKey, {
				name: call.target.name,
				filePath: call.target.filePath,
				isResult,
				isSharedDep: false,
				resultIndex: isResult ? resultIndex.get(callKey) : undefined,
			});
		}

		// Track non-result usage for ◆ detection
		if (!resultIndex.has(callKey)) {
			const existing = nonResultUsage.get(callKey);
			if (existing) {
				existing.add(resultIdx);
			} else {
				nonResultUsage.set(callKey, new Set([resultIdx]));
			}
		}

		// Recurse into deeper calls (avoid infinite loops on cycles)
		if (!call.cyclic && !call.depthLimited && !visited.has(callKey)) {
			visited.add(callKey);
			walkOutgoingCalls(
				call.outgoingCalls,
				callKey,
				resultIdx,
				resultIndex,
				nodes,
				edges,
				nonResultUsage,
				visited,
			);
		}
	}
}

/**
 * Build the ordered graph lines for the Graph section.
 *
 * For each result, render its outgoing call tree as indented lines.
 * Results that are only callees (not roots) are skipped as top-level entries
 * if they already appear as children of another result's tree.
 */
function buildGraphLines(
	results: GraphResultEntry[],
	resultIndex: Map<string, number>,
	nodes: Map<string, TopologyNode>,
): GraphLine[] {
	const lines: GraphLine[] = [];

	// Determine which results have outgoing calls (they're "roots" in the graph)
	// Results with no outgoing calls but that are callees of other results
	// should still appear if they have standalone content
	const renderedAsChild = new Set<string>();

	// First pass: determine which results appear as children of other results
	for (const entry of results) {
		collectChildResults(entry.metadata.outgoingCalls, resultIndex, renderedAsChild);
	}

	// Second pass: render each result and its call tree
	for (let i = 0; i < results.length; i++) {
		const entry = results[i];
		const key = symbolKey(
			entry.metadata.symbol.name,
			entry.metadata.symbol.filePath,
		);

		// Skip results that have no outgoing calls and will appear as children
		// of another result's tree. But always include results that have their own
		// outgoing calls or that are standalone.
		if (
			renderedAsChild.has(key)
			&& entry.metadata.outgoingCalls.length === 0
		) {
			continue;
		}

		// Root line for this result
		const node = nodes.get(key);
		lines.push({
			depth: 0,
			resultIndex: i + 1,
			name: entry.metadata.symbol.name,
			filePath: entry.metadata.symbol.filePath,
			isResult: true,
			isSharedDep: false,
			isCyclic: false,
			isDepthLimited: false,
		});

		// Render the outgoing call tree
		renderCallTree(
			entry.metadata.outgoingCalls,
			1,
			resultIndex,
			nodes,
			lines,
			new Set<string>(),
		);
	}

	return lines;
}

/**
 * Collect which result keys appear as children in another result's call tree.
 */
function collectChildResults(
	calls: OutgoingCall[],
	resultIndex: Map<string, number>,
	renderedAsChild: Set<string>,
): void {
	for (const call of calls) {
		const key = symbolKeyFromRef(call.target);
		if (resultIndex.has(key)) {
			renderedAsChild.add(key);
		}
		if (!call.cyclic && !call.depthLimited) {
			collectChildResults(call.outgoingCalls, resultIndex, renderedAsChild);
		}
	}
}

/**
 * Recursively render an outgoing call tree into graph lines.
 */
function renderCallTree(
	calls: OutgoingCall[],
	depth: number,
	resultIndex: Map<string, number>,
	nodes: Map<string, TopologyNode>,
	lines: GraphLine[],
	visited: Set<string>,
): void {
	for (const call of calls) {
		const key = symbolKeyFromRef(call.target);
		const node = nodes.get(key);

		lines.push({
			depth,
			resultIndex: node?.resultIndex,
			name: call.target.name,
			filePath: call.target.filePath,
			isResult: node?.isResult ?? false,
			isSharedDep: node?.isSharedDep ?? false,
			isCyclic: call.cyclic === true,
			isDepthLimited: call.depthLimited === true,
		});

		// Recurse (avoid cycles and depth limits)
		if (!call.cyclic && !call.depthLimited && !visited.has(key)) {
			visited.add(key);
			renderCallTree(
				call.outgoingCalls,
				depth + 1,
				resultIndex,
				nodes,
				lines,
				visited,
			);
		}
	}
}
