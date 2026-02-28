/**
 * Phase 5 — Structural pattern detection.
 *
 * Analyzes topology and metadata to identify structural patterns:
 * - Hubs: result symbols called by 2+ other results
 * - Shared dependencies: non-result symbols used by 2+ results (◆)
 * - Shared types: types from typeFlows referenced by multiple results
 * - Diamonds: two results sharing a common callee through call trees
 */

import type { OutgoingCall, IncomingCaller, SymbolRef } from '../ts-ls/types.js';
import type {
	GraphResultEntry,
	TopologyNode,
	TopologyResult,
	HubPattern,
	SharedDepPattern,
	SharedTypePattern,
	DiamondPattern,
	PatternsResult,
} from './types.js';

/**
 * Build a unique key for a symbol.
 */
function symbolKey(name: string, filePath: string): string {
	return `${filePath}::${name}`;
}

/**
 * Detect all structural patterns from the topology and metadata.
 *
 * @param topology - The topology analysis result.
 * @param results  - The ordered result entries with metadata.
 * @returns All detected patterns.
 */
export function detectPatterns(
	topology: TopologyResult,
	results: GraphResultEntry[],
): PatternsResult {
	const hubs = detectHubs(results);
	const sharedDeps = detectSharedDeps(topology);
	const sharedTypes = detectSharedTypes(results);
	const diamonds = detectDiamonds(results);

	return { hubs, sharedDeps, sharedTypes, diamonds };
}

/**
 * Detect hub results: results called by 2+ other results.
 *
 * Uses incomingCallers from metadata. A result is a hub if 2+ other
 * results appear in its incoming caller tree.
 */
function detectHubs(results: GraphResultEntry[]): HubPattern[] {
	const hubs: HubPattern[] = [];

	// Build result set for quick lookup
	const resultKeys = new Map<string, number>();
	for (let i = 0; i < results.length; i++) {
		const sym = results[i].metadata.symbol;
		resultKeys.set(symbolKey(sym.name, sym.filePath), i + 1);
	}

	for (let i = 0; i < results.length; i++) {
		const entry = results[i];
		const selfKey = symbolKey(
			entry.metadata.symbol.name,
			entry.metadata.symbol.filePath,
		);

		// Check which other results call this one
		const callerResultIndices: number[] = [];
		collectResultCallersFromIncoming(
			entry.metadata.incomingCallers,
			selfKey,
			resultKeys,
			callerResultIndices,
			new Set<string>(),
		);

		// Also check outgoing calls of other results to see if they call this one
		for (let j = 0; j < results.length; j++) {
			if (i === j) continue;
			if (callerResultIndices.includes(j + 1)) continue;

			if (callTreeContains(results[j].metadata.outgoingCalls, selfKey, new Set<string>())) {
				callerResultIndices.push(j + 1);
			}
		}

		// Deduplicate
		const uniqueCallers = [...new Set(callerResultIndices)];

		if (uniqueCallers.length >= 2) {
			hubs.push({
				resultIndex: i + 1,
				name: entry.metadata.symbol.name,
				calledBy: uniqueCallers.sort((a, b) => a - b),
			});
		}
	}

	return hubs;
}

/**
 * Collect result indices that appear in an incoming caller tree.
 */
function collectResultCallersFromIncoming(
	callers: IncomingCaller[],
	selfKey: string,
	resultKeys: Map<string, number>,
	found: number[],
	visited: Set<string>,
): void {
	for (const caller of callers) {
		const key = symbolKey(caller.source.name, caller.source.filePath);
		if (visited.has(key)) continue;
		visited.add(key);

		const idx = resultKeys.get(key);
		if (idx !== undefined && key !== selfKey) {
			found.push(idx);
		}

		if (!caller.cyclic) {
			collectResultCallersFromIncoming(
				caller.incomingCallers,
				selfKey,
				resultKeys,
				found,
				visited,
			);
		}
	}
}

/**
 * Check if a call tree contains a specific symbol key.
 */
function callTreeContains(
	calls: OutgoingCall[],
	targetKey: string,
	visited: Set<string>,
): boolean {
	for (const call of calls) {
		const key = symbolKey(call.target.name, call.target.filePath);
		if (key === targetKey) return true;
		if (visited.has(key) || call.cyclic) continue;
		visited.add(key);

		if (callTreeContains(call.outgoingCalls, targetKey, visited)) {
			return true;
		}
	}
	return false;
}

/**
 * Detect shared dependencies from topology: non-result nodes referenced
 * by 2+ results (◆ markers).
 */
function detectSharedDeps(topology: TopologyResult): SharedDepPattern[] {
	const deps: SharedDepPattern[] = [];

	for (const [, node] of topology.nodes) {
		if (node.isSharedDep) {
			// Count which results reference this node
			const usedBy: number[] = [];
			for (const edge of topology.edges) {
				if (edge.to === symbolKey(node.name, node.filePath)) {
					// Find the root result for this edge chain
					const fromNode = topology.nodes.get(edge.from);
					if (fromNode?.resultIndex !== undefined) {
						usedBy.push(fromNode.resultIndex);
					}
				}
			}

			const uniqueUsedBy = [...new Set(usedBy)].sort((a, b) => a - b);
			if (uniqueUsedBy.length >= 2) {
				deps.push({
					name: node.name,
					filePath: node.filePath,
					usedBy: uniqueUsedBy,
				});
			}
		}
	}

	return deps;
}

/**
 * Detect shared types: types from typeFlows referenced by multiple results.
 */
function detectSharedTypes(results: GraphResultEntry[]): SharedTypePattern[] {
	if (results.length < 2) return [];

	// Collect all referenced types across results
	const typeUsage = new Map<string, { name: string; filePath: string; count: number }>();

	for (const entry of results) {
		const typeFlows = entry.metadata.typeFlows;
		if (!typeFlows) continue;

		// Deduplicate types within a single result
		const seenInResult = new Set<string>();

		for (const refType of typeFlows.referencedTypes) {
			const key = symbolKey(refType.name, refType.filePath);
			if (seenInResult.has(key)) continue;
			seenInResult.add(key);

			const existing = typeUsage.get(key);
			if (existing) {
				existing.count++;
			} else {
				typeUsage.set(key, {
					name: refType.name,
					filePath: refType.filePath,
					count: 1,
				});
			}
		}
	}

	// Filter to types used by 2+ results
	const shared: SharedTypePattern[] = [];
	for (const [, info] of typeUsage) {
		if (info.count >= 2) {
			shared.push({
				name: info.name,
				filePath: info.filePath,
				usageCount: info.count,
				totalResults: results.length,
			});
		}
	}

	return shared;
}

/**
 * Detect diamonds: pairs of results that share a common callee
 * in their outgoing call trees.
 */
function detectDiamonds(results: GraphResultEntry[]): DiamondPattern[] {
	if (results.length < 2) return [];

	const diamonds: DiamondPattern[] = [];
	const seen = new Set<string>();

	// For each result, collect all callees (full tree depth)
	const resultCallees: Map<number, Set<string>> = new Map();
	for (let i = 0; i < results.length; i++) {
		const callees = new Set<string>();
		collectAllCallees(results[i].metadata.outgoingCalls, callees, new Set<string>());
		resultCallees.set(i + 1, callees);
	}

	// Find pairs that share a callee
	for (let i = 0; i < results.length; i++) {
		for (let j = i + 1; j < results.length; j++) {
			const calleesI = resultCallees.get(i + 1)!;
			const calleesJ = resultCallees.get(j + 1)!;

			for (const callee of calleesI) {
				if (calleesJ.has(callee)) {
					const pairKey = `${i + 1}:${j + 1}:${callee}`;
					if (!seen.has(pairKey)) {
						seen.add(pairKey);
						// Extract the symbol name from the key
						const name = callee.split('::')[1] ?? callee;
						diamonds.push({
							results: [i + 1, j + 1],
							sharedSymbol: name,
							direction: 'callee',
						});
					}
				}
			}
		}
	}

	return diamonds;
}

/**
 * Recursively collect all callee keys from an outgoing call tree.
 */
function collectAllCallees(
	calls: OutgoingCall[],
	callees: Set<string>,
	visited: Set<string>,
): void {
	for (const call of calls) {
		const key = symbolKey(call.target.name, call.target.filePath);
		if (visited.has(key)) continue;
		visited.add(key);
		callees.add(key);

		if (!call.cyclic && !call.depthLimited) {
			collectAllCallees(call.outgoingCalls, callees, visited);
		}
	}
}
