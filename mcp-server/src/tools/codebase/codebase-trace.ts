/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z as zod } from 'zod';

import { codebaseTraceSymbol, type CodebaseTraceSymbolResult, type TraceCallNode, type TraceCalls, type TraceDefinition, type TraceReferences, type TraceTypes } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';
import { buildIgnoreContextJson } from './ignore-context.js';

// ── Adaptive Token Budget ────────────────────────────────

const OUTPUT_CHAR_LIMIT = 12_000;
const CHARS_PER_TOKEN = 4;

function estimateChars(text: string): number {
	return text.length;
}

// ── YAML Formatter ───────────────────────────────────────

function yamlLine(indent: number, key: string, value?: string): string {
	const prefix = '  '.repeat(indent);
	return value !== undefined ? `${prefix}${key}: ${value}` : `${prefix}${key}:`;
}

function yamlInlineArray(items: string[]): string {
	return `[${items.join(', ')}]`;
}

function formatDefinition(def: TraceDefinition): string {
	const lines: string[] = [];
	lines.push('definition:');
	lines.push(yamlLine(1, 'symbol', def.symbol));
	lines.push(yamlLine(1, 'kind', def.kind));
	lines.push(yamlLine(1, 'file', def.file));
	lines.push(yamlLine(1, 'exported', String(def.exported)));

	if (def.modifiers && def.modifiers.length > 0) {
		lines.push(yamlLine(1, 'modifiers', yamlInlineArray(def.modifiers)));
	}

	lines.push(yamlLine(1, 'signature', `"${def.signature.replaceAll('"', '\\"')}"`));

	if (def.generics) {
		lines.push(yamlLine(1, 'generics', `"${def.generics}"`));
	}

	if (def.jsdoc) {
		lines.push(yamlLine(1, 'jsdoc', `"${def.jsdoc.replaceAll('"', '\\"')}"`));
	}

	if (def.parameters && def.parameters.length > 0) {
		lines.push(yamlLine(1, 'parameters'));
		for (const p of def.parameters) {
			const defaultSuffix = p.defaultValue ? ` = ${p.defaultValue}` : '';
			lines.push(`    - ${p.name}: ${p.type}${defaultSuffix}`);
		}
	}

	if (def.returns) {
		lines.push(yamlLine(1, 'returns', def.returns));
	}

	if (def.overloads && def.overloads.length > 0) {
		lines.push(yamlLine(1, 'overloads'));
		for (const o of def.overloads) {
			lines.push(`    - "${o.replaceAll('"', '\\"')}"`);
		}
	}

	if (def.resolvedFrom && def.resolvedFrom.length > 0) {
		lines.push(yamlLine(1, 'resolvedFrom'));
		for (const step of def.resolvedFrom) {
			lines.push(`    - ${step.file} → ${step.action}`);
		}
	}

	if (def.members && def.members.length > 0) {
		lines.push(yamlLine(1, 'members'));
		for (const m of def.members) {
			const typeStr = m.type ? `: ${m.type}` : '';
			lines.push(`    - ${m.name}${typeStr} (${m.kind})`);
		}
	}

	return lines.join('\n');
}

function formatReferences(refs: TraceReferences): string {
	const lines: string[] = [];
	lines.push('references:');
	lines.push(yamlLine(1, 'total', String(refs.total)));
	lines.push(yamlLine(1, 'files', String(refs.files)));

	if (refs.byFile.length > 0) {
		lines.push(yamlLine(1, 'byFile'));
		for (const entry of refs.byFile) {
			lines.push(`    - file: ${entry.file}`);
			if (entry.test) {
				lines.push('      test: true');
			}
			lines.push(`      usages: ${yamlInlineArray(entry.usages)}`);
		}
	}

	if (refs.reExports.length > 0) {
		lines.push(yamlLine(1, 'reExports'));
		for (const re of refs.reExports) {
			lines.push(`    - file: ${re.file}`);
			lines.push(`      exportedAs: ${re.exportedAs}`);
			lines.push(`      from: ${re.from}`);
		}
	}

	return lines.join('\n');
}

function formatCallTree(nodes: TraceCallNode[], indent: number): string[] {
	const lines: string[] = [];
	const prefix = '  '.repeat(indent);
	for (const node of nodes) {
		lines.push(`${prefix}- ${node.symbol} (${node.file})`);
		if (node.children && node.children.length > 0) {
			lines.push(...formatCallTree(node.children, indent + 1));
		}
	}
	return lines;
}

function formatCalls(calls: TraceCalls): string {
	const lines: string[] = [];
	lines.push('calls:');

	lines.push(yamlLine(1, 'incoming'));
	if (calls.incoming.length > 0) {
		lines.push(...formatCallTree(calls.incoming, 2));
	}

	lines.push(yamlLine(1, 'outgoing'));
	if (calls.outgoing.length > 0) {
		lines.push(...formatCallTree(calls.outgoing, 2));
	}

	return lines.join('\n');
}

function formatTypes(types: TraceTypes): string {
	const lines: string[] = [];
	lines.push('types:');

	if (types.hierarchy) {
		lines.push(yamlLine(1, 'hierarchy'));
		if (types.hierarchy.extends) {
			lines.push(yamlLine(2, 'extends', types.hierarchy.extends));
		}
		if (types.hierarchy.implements && types.hierarchy.implements.length > 0) {
			lines.push(yamlLine(2, 'implements', yamlInlineArray(types.hierarchy.implements)));
		}
		if (types.hierarchy.subtypes && types.hierarchy.subtypes.length > 0) {
			lines.push(yamlLine(2, 'subtypes'));
			for (const s of types.hierarchy.subtypes) {
				lines.push(`      - ${s}`);
			}
		}
	}

	if (types.flows) {
		lines.push(yamlLine(1, 'flows'));
		if (types.flows.parameters && types.flows.parameters.length > 0) {
			lines.push(yamlLine(2, 'parameters'));
			for (const p of types.flows.parameters) {
				const fileSuffix = p.file ? ` (${p.file})` : '';
				lines.push(`      - ${p.name} → ${p.type}${fileSuffix}`);
			}
		}
		if (types.flows.returns) {
			lines.push(yamlLine(2, 'returns', types.flows.returns));
		}
		if (types.flows.properties && types.flows.properties.length > 0) {
			lines.push(yamlLine(2, 'properties'));
			for (const p of types.flows.properties) {
				const fileSuffix = p.file ? ` (${p.file})` : '';
				lines.push(`      - ${p.name} → ${p.type}${fileSuffix}`);
			}
		}
	}

	if (types.typeGuard) {
		lines.push(yamlLine(1, 'typeGuard', types.typeGuard));
	}

	if (types.mergedDeclarations && types.mergedDeclarations.length > 0) {
		lines.push(yamlLine(1, 'mergedDeclarations'));
		for (const d of types.mergedDeclarations) {
			lines.push(`    - ${d}`);
		}
	}

	return lines.join('\n');
}

function formatResult(result: CodebaseTraceSymbolResult): string {
	const sections: string[] = [];

	if (result.definition) {
		sections.push(formatDefinition(result.definition));
	}

	if (result.references) {
		sections.push(formatReferences(result.references));
	}

	if (result.calls) {
		sections.push(formatCalls(result.calls));
	}

	if (result.types) {
		sections.push(formatTypes(result.types));
	}

	if (result.diagnostics && result.diagnostics.length > 0) {
		const diag = ['diagnostics:'];
		for (const d of result.diagnostics) {
			diag.push(`  - ${d}`);
		}
		sections.push(diag.join('\n'));
	}

	if (result.partial) {
		sections.push(`partial: true\npartialReason: ${result.partialReason ?? 'unknown'}`);
	}

	return sections.join('\n\n');
}

// ── Progressive Reduction (adaptive token budget) ────────

function stripDtsFromReferences(result: CodebaseTraceSymbolResult): boolean {
	if (!result.references) return false;
	const before = result.references.byFile.length;
	result.references.byFile = result.references.byFile.filter((r) => !r.file.endsWith('.d.ts') && !r.file.includes('node_modules'));
	result.references.reExports = result.references.reExports.filter((r) => !r.file.endsWith('.d.ts') && !r.file.includes('node_modules'));
	const after = result.references.byFile.length;
	if (before !== after) {
		result.references.total = result.references.byFile.reduce((sum, f) => sum + f.usages.length, 0);
		result.references.files = result.references.byFile.length;
		return true;
	}
	return false;
}

function collapseOutgoingCalls(result: CodebaseTraceSymbolResult): boolean {
	if (!result.calls || result.calls.outgoing.length === 0) return false;
	const count = result.calls.outgoing.length;
	result.calls.outgoing = [{ file: '', symbol: `(${count} outgoing calls collapsed)` }];
	return true;
}

function collapseTypeFlows(result: CodebaseTraceSymbolResult): boolean {
	if (!result.types?.flows) return false;
	delete result.types.flows;
	return true;
}

function applyProgressiveReduction(result: CodebaseTraceSymbolResult): string[] {
	const reductions: string[] = [];
	let output = formatResult(result);

	if (estimateChars(output) <= OUTPUT_CHAR_LIMIT) return reductions;

	if (stripDtsFromReferences(result)) {
		reductions.push('Stripped .d.ts and node_modules references');
		output = formatResult(result);
		if (estimateChars(output) <= OUTPUT_CHAR_LIMIT) return reductions;
	}

	if (collapseOutgoingCalls(result)) {
		reductions.push('Collapsed outgoing calls to count');
		output = formatResult(result);
		if (estimateChars(output) <= OUTPUT_CHAR_LIMIT) return reductions;
	}

	if (collapseTypeFlows(result)) {
		reductions.push('Removed type flows to save space');
		output = formatResult(result);
	}

	return reductions;
}

// ── Tool Definition ──────────────────────────────────────

export const trace = defineTool({
	annotations: {
		category: ToolCategory.CODEBASE_ANALYSIS,
		conditions: ['client-pipe', 'codebase-sequential'],
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
		readOnlyHint: true,
		title: 'Codebase Trace'
	},
	description:
		'Trace a symbol through the codebase to understand its full semantic lifecycle.\n\n' +
		'Returns the symbol definition (always), plus optional sections enabled by boolean flags:\n' +
		'- `references`: All reference sites grouped by file, plus re-export chains\n' +
		'- `calls`: Hierarchical incoming/outgoing call chains at full depth\n' +
		'- `types`: Type hierarchy, type flows, type guards, declaration merging\n\n' +
		'Definition is always returned. Without any flags, you get a rich definition including\n' +
		'signature, modifiers, generics, JSDoc, parameters with defaults, overloads,\n' +
		'import resolution chain, and class/interface members.\n\n' +
		'Output is YAML-structured text. No line numbers — navigate by symbol name.\n\n' +
		'**EXAMPLES:**\n' +
		'- What is this symbol? `{ symbol: "TraceSymbolParams" }`\n' +
		'- Where is it used? `{ symbol: "traceSymbol", references: true }`\n' +
		'- Show call chain: `{ symbol: "traceSymbol", calls: true }`\n' +
		'- Full picture: `{ symbol: "traceSymbol", references: true, calls: true, types: true }`\n' +
		'- Resolve an import: `{ symbol: "codebaseTraceSymbol", file: "client-handlers.ts" }`',
	handler: async (request, response) => {
		const { symbol, file, references, calls, types } = request.params;

		if (!symbol || symbol.trim() === '') {
			response.setSkipLedger();
			response.appendResponseLine('error: symbol parameter is required');
			return;
		}

		const rootDir = getClientWorkspace();

		const result = await codebaseTraceSymbol(
			symbol,
			rootDir,
			file,
			references,
			calls,
			types
		);

		response.setSkipLedger();

		if (result.errorMessage) {
			const lines = [`error: ${result.errorMessage}`];
			if (result.notFoundReason) {
				lines.push(`reason: ${result.notFoundReason}`);
			}
			if (result.resolvedRootDir) {
				const ignoredBy = buildIgnoreContextJson(result.resolvedRootDir);
				if (ignoredBy) {
					lines.push(`ignoredBy: ${JSON.stringify(ignoredBy)}`);
				}
			}
			response.appendResponseLine(lines.join('\n'));
			return;
		}

		const reductions = applyProgressiveReduction(result);

		let output = formatResult(result);

		if (reductions.length > 0) {
			output += '\n\n# Adaptive reductions applied:\n';
			for (const r of reductions) {
				output += `#   - ${r}\n`;
			}
		}

		if (result.elapsedMs !== undefined) {
			output += `\n# elapsed: ${result.elapsedMs}ms`;
		}
		if (result.sourceFileCount !== undefined) {
			output += `\n# sourceFiles: ${result.sourceFileCount}`;
		}

		response.appendResponseLine(output);
	},
	name: 'codebase_trace',
	schema: {
		calls: zod
			.boolean()
			.optional()
			.default(false)
			.describe('Include hierarchical incoming/outgoing call chains. Full depth with adaptive budget.'),
		file: zod
			.string()
			.optional()
			.describe('File where the symbol was encountered. Helps disambiguate and enables import resolution.'),
		references: zod
			.boolean()
			.optional()
			.default(false)
			.describe('Include all reference sites grouped by file, plus re-export chains.'),
		symbol: zod.string().describe('Name of the symbol to trace (function, class, interface, type, variable, etc.).'),
		types: zod
			.boolean()
			.optional()
			.default(false)
			.describe('Include type hierarchy, type flows, type guards, and declaration merging.')
	}
});
