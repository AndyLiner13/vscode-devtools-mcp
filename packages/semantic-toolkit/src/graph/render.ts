/**
 * Phase 5 — Connection graph renderer.
 *
 * Renders the connection graph as plain text in the blueprint format.
 * Two rendering modes:
 * - Single-result: compact inline format with Calls/Called by
 * - Multi-result: Summary → Graph → Patterns → Details
 */

import type { SymbolMetadata, OutgoingCall, IncomingCaller } from '../ts-ls/types.js';
import type {
	GraphResultEntry,
	GraphLine,
	TopologyResult,
	PatternsResult,
	ConnectionGraphResult,
} from './types.js';

/** Estimate token count from character count. */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Render the connection graph for a single result.
 * Uses the compact inline format from the blueprint.
 */
export function renderSingleResult(
	query: string,
	entry: GraphResultEntry,
	tokenBudget: number,
): ConnectionGraphResult {
	const lines: string[] = [];
	const meta = entry.metadata;
	const sym = meta.symbol;

	// Summary line
	const resultText = buildSingleResultBody(entry);
	const tokenCount = estimateTokens(resultText);
	lines.push(`Search: "${query}" | 1 result | ${formatTokenCount(tokenCount)}/${formatTokenCount(tokenBudget)} tokens`);
	lines.push('');

	lines.push(resultText);

	const text = lines.join('\n');

	return {
		text,
		resultCount: 1,
		fileCount: 1,
		tokenCount: estimateTokens(text),
	};
}

/**
 * Build the body text for a single-result connection graph.
 */
function buildSingleResultBody(entry: GraphResultEntry): string {
	const lines: string[] = [];
	const meta = entry.metadata;
	const sym = meta.symbol;

	// Header: name — file
	lines.push(`${sym.name} — ${sym.filePath}`);

	// Kind + modifiers + refs
	const kindLine = buildKindLine(meta);
	if (kindLine) {
		lines.push(`    ${kindLine}`);
	}

	// Signature
	if (meta.signature) {
		lines.push(`    Signature: ${meta.signature}`);
	}

	// Extends
	if (meta.typeHierarchy?.extends) {
		const ext = meta.typeHierarchy.extends;
		lines.push(`    Extends: ${ext.name} (${ext.filePath})`);
	}

	// Implements
	if (meta.typeHierarchy && meta.typeHierarchy.implements.length > 0) {
		const impls = meta.typeHierarchy.implements
			.map(i => `${i.name} (${i.filePath})`)
			.join(', ');
		lines.push(`    Implements: ${impls}`);
	}

	// Calls (outgoing)
	if (meta.outgoingCalls.length > 0) {
		const callNames = meta.outgoingCalls
			.map(c => {
				const suffix = c.target.filePath !== sym.filePath
					? ` (${c.target.filePath})`
					: '';
				return `${c.target.name}${suffix}`;
			})
			.join(', ');
		lines.push(`    Calls: ${callNames}`);
	}

	// Called by (incoming)
	if (meta.incomingCallers.length > 0) {
		const callerNames = meta.incomingCallers
			.map(c => {
				const suffix = c.source.filePath !== sym.filePath
					? ` (${c.source.filePath})`
					: '';
				return `${c.source.name}${suffix}`;
			})
			.join(', ');
		lines.push(`    Called by: ${callerNames}`);
	}

	// Members
	if (meta.members && meta.members.length > 0) {
		const memberNames = meta.members
			.map(m => m.name ? `${m.name}()` : m.kind)
			.join(', ');
		lines.push(`    Members: ${memberNames}`);
	}

	// Types in/out
	const typesLine = buildTypesLine(meta);
	if (typesLine) {
		lines.push(`    ${typesLine}`);
	}

	return lines.join('\n');
}

/**
 * Render the connection graph for multiple results.
 * Uses the full format: Summary → Graph → Patterns → Details.
 */
export function renderMultiResult(
	query: string,
	results: GraphResultEntry[],
	topology: TopologyResult,
	patterns: PatternsResult,
	tokenBudget: number,
): ConnectionGraphResult {
	const fileCount = new Set(results.map(r => r.metadata.symbol.filePath)).size;
	const lines: string[] = [];

	// Build body first to compute accurate token count
	const bodyLines: string[] = [];

	// Graph section
	if (topology.graphLines.length > 0) {
		bodyLines.push('Graph:');
		for (const gl of topology.graphLines) {
			bodyLines.push(formatGraphLine(gl));
		}
	}

	// Patterns section
	const patternLines = renderPatterns(patterns, results);
	if (patternLines.length > 0) {
		bodyLines.push('');
		bodyLines.push('Patterns:');
		for (const pl of patternLines) {
			bodyLines.push(`  ${pl}`);
		}
	}

	// Details section
	bodyLines.push('');
	for (let i = 0; i < results.length; i++) {
		if (i > 0) bodyLines.push('');
		const detail = renderResultDetail(i + 1, results[i]);
		bodyLines.push(detail);
	}

	const bodyText = bodyLines.join('\n');
	const tokenCount = estimateTokens(bodyText);

	// Summary line (needs token count from body)
	lines.push(`Search: "${query}" | ${results.length} results across ${fileCount} files | ${formatTokenCount(tokenCount)}/${formatTokenCount(tokenBudget)} tokens`);
	lines.push('');
	lines.push(bodyText);

	const text = lines.join('\n');

	return {
		text,
		resultCount: results.length,
		fileCount,
		tokenCount: estimateTokens(text),
	};
}

/**
 * Format a graph line with proper indentation and markers.
 *
 * Blueprint format:
 *   [2] AuthMiddleware.verify → [1] TokenService.validateToken → [4] AuthConfig.getSecret
 * Or with tree indentation:
 *   [1] processRequest (service.ts)
 *     → validate (validator.ts) ★
 *       → sanitize (helper.ts) ◆
 */
function formatGraphLine(gl: GraphLine): string {
	const indent = '  ' + '  '.repeat(gl.depth);
	const arrow = gl.depth > 0 ? '→ ' : '';
	const indexPrefix = gl.resultIndex !== undefined ? `[${gl.resultIndex}] ` : '';
	const marker = gl.isResult && gl.depth > 0 ? ' ★' : gl.isSharedDep ? ' ◆' : '';
	const suffix = gl.isCyclic ? ' [cycle]' : gl.isDepthLimited ? ' [depth limit]' : '';

	return `${indent}${arrow}${indexPrefix}${gl.name} (${gl.filePath})${marker}${suffix}`;
}

/**
 * Render the Patterns section lines.
 */
function renderPatterns(patterns: PatternsResult, results: GraphResultEntry[]): string[] {
	const lines: string[] = [];

	for (const hub of patterns.hubs) {
		const calledByStr = hub.calledBy.map(i => `[${i}]`).join(', ');
		lines.push(`Hub: [${hub.resultIndex}] ${hub.name} — called by ${calledByStr}`);
	}

	for (const dep of patterns.sharedDeps) {
		const usedByStr = dep.usedBy.map(i => `[${i}]`).join(', ');
		lines.push(`Shared dep: ${dep.name} (${dep.filePath}) — used by ${usedByStr}`);
	}

	for (const st of patterns.sharedTypes) {
		lines.push(`Shared type: ${st.name} (${st.filePath}) — used by ${st.usageCount}/${st.totalResults} results`);
	}

	for (const diamond of patterns.diamonds) {
		lines.push(`Diamond: [${diamond.results[0]}], [${diamond.results[1]}] → ${diamond.sharedSymbol}`);
	}

	return lines;
}

/**
 * Render the detail block for a single result in the Details section.
 *
 * Blueprint format:
 * [1] TokenService.validateToken — src/auth/tokenService.ts
 *     async method | exported | refs: 8 files
 *     Signature: async validateToken(token: string): Promise<JwtPayload | null>
 *     Extends: BaseValidator (src/base.ts)
 *     Types in: token (string) | Types out: JwtPayload (src/models/auth.ts)
 */
function renderResultDetail(index: number, entry: GraphResultEntry): string {
	const lines: string[] = [];
	const meta = entry.metadata;
	const sym = meta.symbol;

	// Header
	lines.push(`[${index}] ${sym.name} — ${sym.filePath}`);

	// Kind + modifiers + refs
	const kindLine = buildKindLine(meta);
	if (kindLine) {
		lines.push(`    ${kindLine}`);
	}

	// Signature
	if (meta.signature) {
		lines.push(`    Signature: ${meta.signature}`);
	}

	// Extends
	if (meta.typeHierarchy?.extends) {
		const ext = meta.typeHierarchy.extends;
		lines.push(`    Extends: ${ext.name} (${ext.filePath})`);
	}

	// Implements
	if (meta.typeHierarchy && meta.typeHierarchy.implements.length > 0) {
		const impls = meta.typeHierarchy.implements
			.map(i => `${i.name} (${i.filePath})`)
			.join(', ');
		lines.push(`    Implements: ${impls}`);
	}

	// Members (for class results)
	if (meta.members && meta.members.length > 0) {
		const memberNames = meta.members
			.map(m => m.name ? `${m.name}()` : m.kind)
			.join(', ');
		lines.push(`    Members: ${memberNames}`);
	}

	// Types in/out
	const typesLine = buildTypesLine(meta);
	if (typesLine) {
		lines.push(`    ${typesLine}`);
	}

	return lines.join('\n');
}

/**
 * Build the kind/modifiers/refs line.
 * E.g.: "async method | exported | refs: 8 files"
 */
function buildKindLine(meta: SymbolMetadata): string | null {
	const parts: string[] = [];

	// Modifiers + kind (modifiers come first in the blueprint format)
	if (meta.modifiers && meta.modifiers.length > 0) {
		parts.push(meta.modifiers.join(' '));
	}

	// Reference count
	if (meta.references) {
		parts.push(`refs: ${meta.references.fileCount} files`);
	}

	return parts.length > 0 ? parts.join(' | ') : null;
}

/**
 * Build the Types in/out line from typeFlows.
 * E.g.: "Types in: token (string) | Types out: JwtPayload (src/models/auth.ts)"
 */
function buildTypesLine(meta: SymbolMetadata): string | null {
	if (!meta.typeFlows) return null;

	const parts: string[] = [];

	// Types in (parameters)
	if (meta.typeFlows.parameters.length > 0) {
		const params = meta.typeFlows.parameters
			.map(p => `${p.name} (${p.type})`)
			.join(', ');
		parts.push(`Types in: ${params}`);
	}

	// Types out (return)
	if (meta.typeFlows.returnType) {
		const ret = meta.typeFlows.returnType;
		if (ret.resolvedTypes.length > 0) {
			const types = ret.resolvedTypes
				.map(t => `${t.name} (${t.filePath})`)
				.join(', ');
			parts.push(`Types out: ${types}`);
		} else {
			parts.push(`Types out: ${ret.type}`);
		}
	}

	return parts.length > 0 ? parts.join(' | ') : null;
}

/**
 * Format a token count with comma separators.
 */
function formatTokenCount(count: number): string {
	return count.toLocaleString('en-US');
}
