/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SymbolLike } from './symbol-resolver.js';

import fs from 'node:fs';
import path from 'node:path';
import { z as zod } from 'zod';

import { formatSymbolLabel } from './symbol-resolver.js';

import { fileExtractStructure, fileHighlightReadRange, fileReadContent, type FileStructure, type FileSymbol } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';
import { isStrictLogFile } from './logFile-read.js';
import { collectSymbolKinds, findQualifiedPaths, findSymbolsByKind, resolveByKindAndName, resolveSymbolTarget } from './symbol-resolver.js';

// Container kinds are valid symbol targets even when childless
const CONTAINER_KINDS = new Set(['comment', 'jsdoc', 'tsdoc']);

// Kinds that are never collapsed — always shown as raw source code
const RAW_CODE_KINDS = new Set(['imports']);

function resolveFilePath(file: string): string {
	if (path.isAbsolute(file)) return file;
	return path.resolve(getClientWorkspace(), file);
}

/**
 * Extract lines from full content by 1-indexed line range.
 */
function getContentSlice(allLines: string[], startLine: number, endLine: number): string {
	return allLines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Format a single line. Line-number prefixes are no longer emitted;
 * collapsed symbols use metadata tags instead.
 */
function formatLine(_lineNum: number, content: string, _lineNumbers: boolean): string {
	return content;
}

/**
 * Previously prefixed each line with its 1-indexed line number.
 * Line numbers are no longer emitted; returns content unchanged.
 */
function addLineNumbers(content: string, _startLine1: number, _lineNumbers: boolean): string {
	return content;
}

/** Whether a symbol is standalone/collapsible: must span multiple lines. */
function isStandaloneSymbol(symbol: SymbolLike): boolean {
	if (CONTROL_FLOW_KINDS.has(symbol.kind)) return false;
	if (RAW_CODE_KINDS.has(symbol.kind)) return false;
	return symbol.range.endLine > symbol.range.startLine;
}

/**
 * Whether a symbol should be visible in the skeleton hierarchy.
 * Body-bearing kinds are always visible (even single-line, e.g. interface methods).
 * Container kinds and multi-line symbols are also visible.
 */
function isVisibleInSkeleton(symbol: SymbolLike): boolean {
	if (CONTROL_FLOW_KINDS.has(symbol.kind)) return false;
	if (RAW_CODE_KINDS.has(symbol.kind)) return false;
	if (BODY_BEARING_KINDS.has(symbol.kind)) return true;
	if (CONTAINER_KINDS.has(symbol.kind)) return true;
	return symbol.range.endLine > symbol.range.startLine;
}

/** Count skeleton-visible symbols in a tree. */
function countVisibleSymbolsDeep(children: readonly SymbolLike[]): number {
	let count = 0;
	for (const c of children) {
		if (isVisibleInSkeleton(c)) count++;
		if (c.children && c.children.length > 0) count += countVisibleSymbolsDeep(c.children);
	}
	return count;
}

/** Abbreviated kind labels for the file map routing table. */
const KIND_ABBREV: Record<string, string> = {
	'function': 'fn',
	'method': 'method',
	'constructor': 'ctor',
	'getter': 'getter',
	'setter': 'setter',
	'class': 'class',
	'interface': 'iface',
	'enum': 'enum',
	'namespace': 'ns',
	'module': 'mod',
	'constant': 'const',
	'variable': 'var',
	'type': 'type',
	'property': 'prop',
	'comment': 'comment',
	'jsdoc': 'jsdoc',
	'tsdoc': 'tsdoc',
};

/** Build compact metadata tag: [30L|5S|fn] — includes kind abbreviation. */
function buildSymbolMeta(symbol: SymbolLike): string {
	const lineCount = symbol.range.endLine - symbol.range.startLine + 1;
	const kind = KIND_ABBREV[symbol.kind] ?? symbol.kind;

	const parts: string[] = [];
	if (lineCount > 1) parts.push(`${lineCount}L`);
	const symCount = symbol.children ? countVisibleSymbolsDeep(symbol.children) : 0;
	if (symCount > 0) parts.push(`${symCount}S`);
	parts.push(kind);
	return `[${parts.join('|')}]`;
}

function formatSkeletonEntry(symbol: SymbolLike, indent = '', maxNesting = 0, currentDepth = 0, collapseKinds?: ReadonlySet<string>): string[] {
	// Hide control flow constructs entirely — they add noise to the skeleton
	if (CONTROL_FLOW_KINDS.has(symbol.kind)) return [];

	// Non-visible in skeleton: show as structural labels only if they have
	// visible descendants (preserves hierarchy for dot-notation paths).
	// Otherwise hide them entirely.
	if (!isVisibleInSkeleton(symbol)) {
		const visibleDescendants = symbol.children ? countVisibleSymbolsDeep(symbol.children) : 0;
		if (visibleDescendants === 0) return [];

		const lines: string[] = [];
		lines.push(`${indent}${symbol.name}`);
		if (symbol.children && currentDepth < maxNesting) {
			for (const child of symbol.children) {
				lines.push(...formatSkeletonEntry(child, `${indent}  `, maxNesting, currentDepth + 1, collapseKinds));
			}
		}
		return lines;
	}

	const lines: string[] = [];

	const meta = buildSymbolMeta(symbol);
	lines.push(`${indent}${meta} ${symbol.name}`);

	// When collapseKinds is provided, body-bearing symbols are fully collapsed
	// (no children shown). Copilot must request them by name to see internals.
	const forceCollapse = collapseKinds?.has(symbol.kind) ?? false;
	if (!forceCollapse && currentDepth < maxNesting && symbol.children && symbol.children.length > 0) {
		for (const child of symbol.children) {
			lines.push(...formatSkeletonEntry(child, `${indent}  `, maxNesting, currentDepth + 1, collapseKinds));
		}
	}

	return lines;
}

// ── Auto-Context-Optimization Infrastructure ─────────────

/** Compute the maximum nesting depth in a symbol tree. */
function getMaxSymbolNesting(symbols: readonly SymbolLike[], current = 0): number {
	let max = current;
	for (const s of symbols) {
		if (s.children && s.children.length > 0) {
			max = Math.max(max, getMaxSymbolNesting(s.children, current + 1));
		}
	}
	return max;
}

/** Rendering depth of a symbol's subtree (0 = leaf, 1 = has children, etc). */
function getSymbolTreeDepth(symbol: SymbolLike): number {
	if (!symbol.children || symbol.children.length === 0) {
		return 0;
	}
	return getMaxSymbolNesting([symbol]);
}

interface LineRange {
	endLine: number;
	startLine: number;
}

/** Slug-to-range mapping for TF-IDF regions. */
interface SlugMapping {
	endLine: number;
	slug: string;
	startLine: number;
}

interface CompressionResult {
	collapsedRanges: LineRange[];
	compressed: boolean;
	label: null | string;
	output: string;
	slugMappings: SlugMapping[];
	sourceRanges: LineRange[];
	trace: string[];
}

/** Format a compression header with debug trace for output. */
function formatCompressionHeader(result: { compressed: boolean; label: null | string; trace: string[] }): string {
	if (!result.compressed || !result.label) return '';
	const traceStr = result.trace.length > 0
		? `\nCompression trace: ${result.trace.join(', ')}`
		: '';
	return `Output compressed: ${result.label}.${traceStr}\n`;
}

/**
 * Compute ranges for target-content mode at a specific content nesting level.
 * Children beyond the nesting limit are collapsed stubs; their ranges are collapsed.
 * Raw lines between children are source ranges.
 */
function computeContentRanges(symbol: SymbolLike, contentNesting: number): { collapsedRanges: LineRange[]; sourceRanges: LineRange[] } {
	const collapsedRanges: LineRange[] = [];
	const sourceRanges: LineRange[] = [];

	const walk = (sym: SymbolLike, depth: number): void => {
		if (!sym.children || sym.children.length === 0) {
			// Leaf: all content is source
			sourceRanges.push({ endLine: sym.range.endLine, startLine: sym.range.startLine });
			return;
		}

		// Track gap lines (lines not covered by any child)
		const childLines = new Set<number>();
		for (const child of sym.children) {
			for (let l = child.range.startLine; l <= child.range.endLine; l++) {
				childLines.add(l);
			}
		}

		// Gap lines within this symbol are source
		let gapStart: number | undefined;
		for (let l = sym.range.startLine; l <= sym.range.endLine; l++) {
			if (!childLines.has(l)) {
				if (gapStart === undefined) gapStart = l;
			} else {
				if (gapStart !== undefined) {
					sourceRanges.push({ endLine: l - 1, startLine: gapStart });
					gapStart = undefined;
				}
			}
		}
		if (gapStart !== undefined) {
			sourceRanges.push({ endLine: sym.range.endLine, startLine: gapStart });
		}

		// Children: collapsed or expanded based on nesting
		for (const child of sym.children) {
			if (depth < contentNesting) {
				walk(child, depth + 1);
			} else {
				collapsedRanges.push({ endLine: child.range.endLine, startLine: child.range.startLine });
			}
		}
	};

	walk(symbol, 0);
	return { collapsedRanges, sourceRanges };
}

/**
 * Check whether a symbol is a deepest leaf — has no children at all.
 * Deepest leaves are always shown in full because there's nothing deeper to drill into.
 */
function isDeepestLeaf(sym: SymbolLike): boolean {
	return !sym.children || sym.children.length === 0;
}

/**
 * Render symbol content with body-bearing children stubbed as skeleton entries.
 * Gap lines (code between children) are always shown as raw source.
 * Deepest-leaf children are always shown in full (no stub available to drill into).
 * Non-body-bearing children (variables, types, properties) are shown as raw source.
 */
function formatContentWithBodyStubs(allLines: string[], symbol: SymbolLike, startLine: number, endLine: number, lineNumbers: boolean): string {
	if (!symbol.children || symbol.children.length === 0) {
		return addLineNumbers(getContentSlice(allLines, startLine, endLine), startLine, lineNumbers);
	}

	const childMap = new Map<number, SymbolLike>();
	for (const child of symbol.children) {
		for (let l = child.range.startLine; l <= child.range.endLine; l++) {
			childMap.set(l, child);
		}
	}

	const emitted = new Set<SymbolLike>();
	const result: string[] = [];

	for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
		const child = childMap.get(lineNum);
		if (child) {
			if (!emitted.has(child)) {
				emitted.add(child);
				const shouldStub = BODY_BEARING_KINDS.has(child.kind) && !isDeepestLeaf(child);
				if (shouldStub) {
					result.push(`${buildSymbolMeta(child)} ${formatSymbolLabel(child)}`);
				} else {
					// Non-body-bearing or deepest leaf — show full raw content
					result.push(addLineNumbers(getContentSlice(allLines, child.range.startLine, child.range.endLine), child.range.startLine, lineNumbers));
				}
			}
		} else {
			result.push(formatLine(lineNum, allLines[lineNum - 1] ?? '', lineNumbers));
		}
	}

	return result.join('\n');
}

/**
 * Compute collapsed/source ranges for body-stub mode.
 * Body-bearing children (with grandchildren) → collapsed; everything else → source.
 */
function computeBodyStubRanges(symbol: SymbolLike): { collapsedRanges: LineRange[]; sourceRanges: LineRange[] } {
	const collapsedRanges: LineRange[] = [];
	const sourceRanges: LineRange[] = [];

	if (!symbol.children || symbol.children.length === 0) {
		sourceRanges.push({ endLine: symbol.range.endLine, startLine: symbol.range.startLine });
		return { collapsedRanges, sourceRanges };
	}

	const childLines = new Set<number>();
	for (const child of symbol.children) {
		for (let l = child.range.startLine; l <= child.range.endLine; l++) {
			childLines.add(l);
		}
	}

	// Gap lines are source
	let gapStart: number | undefined;
	for (let l = symbol.range.startLine; l <= symbol.range.endLine; l++) {
		if (!childLines.has(l)) {
			if (gapStart === undefined) gapStart = l;
		} else {
			if (gapStart !== undefined) {
				sourceRanges.push({ endLine: l - 1, startLine: gapStart });
				gapStart = undefined;
			}
		}
	}
	if (gapStart !== undefined) {
		sourceRanges.push({ endLine: symbol.range.endLine, startLine: gapStart });
	}

	// Children: body-bearing with grandchildren → collapsed, everything else → source
	for (const child of symbol.children) {
		const shouldStub = BODY_BEARING_KINDS.has(child.kind) && !isDeepestLeaf(child);
		if (shouldStub) {
			collapsedRanges.push({ endLine: child.range.endLine, startLine: child.range.startLine });
		} else {
			sourceRanges.push({ endLine: child.range.endLine, startLine: child.range.startLine });
		}
	}

	return { collapsedRanges, sourceRanges };
}

function compressTargetContent(symbol: FileSymbol, allLines: string[], structure: FileStructure, recursive: boolean, lineNumbers: boolean): CompressionResult {
	const { startLine } = symbol.range;
	const { endLine } = symbol.range;
	const hasChildren = symbol.children && symbol.children.length > 0;
	const isContainer = symbol.kind === symbol.name || CONTAINER_KINDS.has(symbol.kind);
	const expandChildren = hasChildren && !isContainer;

	// Deepest leaf or nothing to expand — return full content
	if (isDeepestLeaf(symbol) || !expandChildren) {
		const fullContent = addLineNumbers(getContentSlice(allLines, startLine, endLine), startLine, lineNumbers);
		return { collapsedRanges: [], compressed: false, label: null, output: fullContent, slugMappings: [], sourceRanges: [], trace: [] };
	}

	// Stub body-bearing children that have grandchildren
	const hasBodyBearingChildren = symbol.children.some(
		(c: FileSymbol) => BODY_BEARING_KINDS.has(c.kind) && !isDeepestLeaf(c)
	);
	if (hasBodyBearingChildren) {
		const stubbedContent = formatContentWithBodyStubs(allLines, symbol, startLine, endLine, lineNumbers);
		const stubbedRanges = computeBodyStubRanges(symbol);
		const stubbedCount = symbol.children.filter(
			(c: FileSymbol) => BODY_BEARING_KINDS.has(c.kind) && !isDeepestLeaf(c)
		).length;
		return {
			...stubbedRanges,
			compressed: true,
			label: `${stubbedCount} body-bearing children collapsed — request each by name to expand`,
			output: stubbedContent,
			slugMappings: [],
			trace: []
		};
	}

	// No body-bearing children — return full content at maximum nesting
	const maxNesting = getSymbolTreeDepth(symbol);
	const contentMaxNesting = recursive ? maxNesting : 0;
	const maxContent = formatContentAtNesting(allLines, symbol, startLine, endLine, contentMaxNesting, 0, lineNumbers);
	const ranges = computeContentRanges(symbol, contentMaxNesting);
	return { ...ranges, compressed: false, label: null, output: maxContent, slugMappings: [], trace: [] };
}

/**
 * Symbol kinds that represent body-bearing constructs (functions, classes, etc.).
 * In symbol-target mode, body-bearing children with grandchildren are collapsed
 * to stubs — Copilot must request them by name to see their raw body.
 * Canonical source: services/codebase/types.ts → BODY_BEARING_KINDS
 */
const BODY_BEARING_KINDS: ReadonlySet<string> = new Set([
	'function', 'method', 'constructor', 'getter', 'setter',
	'class', 'interface', 'enum',
]);

/**
 * Control flow constructs are hidden entirely from the skeleton overview.
 * They add noise without helping Copilot navigate the file structure.
 */
const CONTROL_FLOW_KINDS: ReadonlySet<string> = new Set([
	'if', 'else', 'for', 'for-in', 'for-of', 'while', 'do-while',
	'switch', 'case', 'default', 'try', 'try-catch', 'catch', 'finally',
]);

/**
 * Compress full-file output into a file map with body-bearing symbols as stubs
 * and consecutive non-body-bearing content grouped into TF-IDF-named regions.
 *
 * Body-bearing symbols with bodies (multi-line) → collapsed skeleton stubs
 * Container symbols (imports, comments, jsdoc, tsdoc) → collapsed skeleton stubs
 * Everything else (type aliases, variables, overload signatures, gaps) → raw source code
 */
function compressFullFileOutput(_rawContent: string, structure: FileStructure | undefined, allLines: string[], _startLine1: number, _lineNumbers: boolean): CompressionResult {
	if (!structure) {
		const numbered = addLineNumbers(_rawContent, _startLine1, _lineNumbers);
		return { collapsedRanges: [], compressed: false, label: null, output: numbered, slugMappings: [], sourceRanges: [], trace: [] };
	}

	// Standalone symbols: multi-line or containers (collapsible stubs)
	const standaloneSymbols: FileSymbol[] = [];
	for (const sym of structure.symbols) {
		if (isStandaloneSymbol(sym)) {
			standaloneSymbols.push(sym);
		}
	}
	standaloneSymbols.sort((a, b) => a.range.startLine - b.range.startLine);

	const outputLines: string[] = [];
	const collapsedRanges: LineRange[] = [];
	const maxNesting = getMaxSymbolNesting(structure.symbols);
	let nextRawStart = 1;

	for (const sym of standaloneSymbols) {
		// Raw source for lines between previous standalone and this one
		if (sym.range.startLine > nextRawStart) {
			const rawLines = allLines.slice(nextRawStart - 1, sym.range.startLine - 1);
			if (rawLines.length > 0) {
				outputLines.push(...rawLines);
			}
		}

		// Skeleton stub for this standalone symbol
		outputLines.push(...formatSkeletonEntry(sym, '', maxNesting));
		collapsedRanges.push({ startLine: sym.range.startLine, endLine: sym.range.endLine });
		nextRawStart = sym.range.endLine + 1;
	}

	// Raw source for remaining lines after last standalone symbol
	if (nextRawStart <= allLines.length) {
		const rawLines = allLines.slice(nextRawStart - 1);
		if (rawLines.length > 0) {
			outputLines.push(...rawLines);
		}
	}

	return {
		collapsedRanges,
		compressed: true,
		label: null,
		output: outputLines.join('\n'),
		slugMappings: [],
		sourceRanges: [],
		trace: []
	};
}

/**
 * Format symbol content with nesting-controlled child expansion.
 * Raw code between children is always shown. Children at depths beyond
 * maxChildNesting are collapsed to skeleton stubs.
 * All line ranges are 1-indexed.
 *
 * @param maxChildNesting 0=all children as stubs, 1=children expanded/grandchildren stubs, etc.
 */
function formatContentAtNesting(allLines: string[], symbol: SymbolLike, startLine: number, endLine: number, maxChildNesting: number, currentDepth = 0, lineNumbers = true): string {
	if (!symbol.children || symbol.children.length === 0) {
		return addLineNumbers(getContentSlice(allLines, startLine, endLine), startLine, lineNumbers);
	}

	const childMap = new Map<number, SymbolLike>();
	for (const child of symbol.children) {
		for (let l = child.range.startLine; l <= child.range.endLine; l++) {
			childMap.set(l, child);
		}
	}

	const emitted = new Set<SymbolLike>();
	const result: string[] = [];

	for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
		const child = childMap.get(lineNum);
		if (child) {
			if (!emitted.has(child)) {
				emitted.add(child);
				if (currentDepth < maxChildNesting) {
					result.push(formatContentAtNesting(allLines, child, child.range.startLine, child.range.endLine, maxChildNesting, currentDepth + 1, lineNumbers));
				} else {
					result.push(`${buildSymbolMeta(child)} ${formatSymbolLabel(child)}`);
				}
			}
		} else {
			result.push(formatLine(lineNum, allLines[lineNum - 1] ?? '', lineNumbers));
		}
	}

	return result.join('\n');
}

export const /**
	 *
	 */
	read = defineTool({
		annotations: {
			category: ToolCategory.CODEBASE_ANALYSIS,
			conditions: ['client-pipe'],
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
			readOnlyHint: true,
			title: 'File Read'
		},
		description:
			'Read file content using symbol-based navigation.\n\n' +
			'**Parameters:**\n' +
			'- `file` (required) — Path to file (relative or absolute)\n' +
			'- `symbol` (optional) — Symbol to drill into by name\n\n' +
			'**How it works:**\n' +
			'Without `symbol`: shows a file map with ALL symbols as collapsed metadata stubs ' +
			'and non-symbol content summarized via TF-IDF. No raw content is shown. ' +
			'Use this to discover available symbols before drilling in.\n\n' +
			'With `symbol`: shows that symbol\'s source code with its body-bearing children ' +
			'collapsed. Use dot notation for nested symbols (e.g. "UserService.findById"). ' +
			'Leaf symbols (no children) always return full content.\n\n' +
			'Container symbols: "imports", "comments".\n' +
			'Kind selectors: "interface", "class", "function", etc. to list all of that type.\n\n' +
			'**EXAMPLES:**\n' +
			'- File overview: `{ file: "src/service.ts" }`\n' +
			'- Read a class: `{ file: "src/service.ts", symbol: "UserService" }`\n' +
			'- Read a method: `{ file: "src/service.ts", symbol: "UserService.findById" }`\n' +
			'- Read imports: `{ file: "src/service.ts", symbol: "imports" }`\n\n' +
			'**Log Files:**\n' +
			'Log file extensions (.log, .out, .err, .trace, .jsonl, etc.) must be read with `logFile_read` instead.',
		handler: async (request, response) => {
			const { params } = request;
			const filePath = resolveFilePath(params.file);

			if (!fs.existsSync(filePath)) {
				response.appendResponseLine(`**Error:** File not found: \`${filePath}\``);
				if (!path.isAbsolute(params.file)) {
					response.appendResponseLine(`The relative path \`${params.file}\` was resolved against the workspace root. ` + 'Use an absolute path or a path relative to the workspace root.');
				}
				return;
			}

			// ── Log file redirect — strict log extensions use logFile_read ──────
			if (isStrictLogFile(filePath)) {
				const fileName = path.basename(filePath);
				const ext = path.extname(filePath).toLowerCase();
				response.appendResponseLine(
					`**Log file detected:** \`${fileName}\` (\`${ext}\`)\n\n` +
						'Use the **logFile_read** tool to read and analyze log files. ' +
						'It provides automatic pattern compression, severity filtering, and drill-down capabilities.\n\n' +
						'**Example:**\n' +
						'```json\n' +
						`{ "file": "${params.file}", "severity": "error" }\n` +
						'```\n\n' +
						'**Available parameters:** `templateId`, `severity`, `timeRange`, `pattern`, ' +
						'`minDuration`, `correlationId`, `includeStackFrames`'
				);
				return;
			}

			const lineNumbers = true;
			const recursive = true;

			const symbolTarget = params.symbol?.trim() || '';
			const hasTarget = symbolTarget.length > 0;

			// Plural category selectors map to singular kinds
			const PLURAL_TO_KIND: Record<string, string> = {
				comments: 'comment',
				jsdocs: 'jsdoc',
				tsdocs: 'tsdoc',
			};

			// Meta-categories that expand to multiple kinds
			const KIND_GROUPS: Record<string, string[]> = {
				comment: ['comment', 'jsdoc', 'tsdoc'],
			};

			// Get file structure via registry (supports any registered language)
			let structure: FileStructure | undefined;
			let allLines: string[] = [];
			structure = await fileExtractStructure(filePath);
			if (structure) {
				allLines = structure.content.split('\n');
			}

			// ── Root-level mode (no symbol target) ────────────────────
			if (!hasTarget) {
				const content = await fileReadContent(filePath);
				const result = compressFullFileOutput(content.content, structure, allLines, content.startLine + 1, lineNumbers);

				fileHighlightReadRange(filePath, content.startLine, content.endLine, result.collapsedRanges, result.sourceRanges);

				const header = formatCompressionHeader(result);
				if (header) response.appendResponseLine(header);
				response.appendResponseLine(result.output);
				return;
			}

			// ── Symbol target mode ────────────────────────────────

			// Symbol targeting requires structured extraction
			if (!structure) {
				response.appendResponseLine(`This file type does not support symbol-based reading. ` + `Omit the \`symbol\` parameter to read the full file.`);
				return;
			}

			// Normalize plural category in dot-paths: "comments.slug" → "comment.slug"
			const normalizedDotTarget = symbolTarget.includes('.')
				? (() => {
					const dot = symbolTarget.indexOf('.');
					const kindPart = symbolTarget.slice(0, dot).toLowerCase();
					const rest = symbolTarget.slice(dot);
					return (PLURAL_TO_KIND[kindPart] ?? kindPart) + rest;
				})()
				: symbolTarget;

			const match = resolveSymbolTarget(structure.symbols, symbolTarget)
				?? (resolveByKindAndName(structure.symbols, normalizedDotTarget)
					? { symbol: resolveByKindAndName(structure.symbols, normalizedDotTarget)!, parent: undefined, path: [symbolTarget] }
					: undefined);

			// Compute file map for error messages
			const content = await fileReadContent(filePath);
			const fileMap = compressFullFileOutput(content.content, structure, allLines, content.startLine + 1, lineNumbers);

			// ── Symbol match: check if navigable ──
			if (match) {
				const { symbol } = match;

				// Only skeleton-visible symbols are navigable
				if (!isVisibleInSkeleton(symbol)) {
					response.appendResponseLine(`"${symbolTarget}" is a single-line ${symbol.kind}, not a navigable symbol.\n`);
					response.appendResponseLine(`Only body-bearing symbols, containers, and multi-line declarations can be requested.\n`);
					response.appendResponseLine(`**File map:**\n${fileMap.output}`);
					return;
				}

				const { startLine } = symbol.range;
				const { endLine } = symbol.range;

				const result = compressTargetContent(symbol, allLines, structure, recursive, lineNumbers);

				fileHighlightReadRange(filePath, startLine - 1, endLine - 1, result.collapsedRanges, result.sourceRanges);

				const header = formatCompressionHeader(result);
				if (header) response.appendResponseLine(header);
				response.appendResponseLine(result.output);
				return;
			}

			// ── No match: try kind-based filtering or show error ──
			// Normalize plural category selectors to singular kinds
			const normalizedTarget = PLURAL_TO_KIND[symbolTarget.toLowerCase()] ?? symbolTarget;

			// Expand meta-categories (e.g. "comment" → comment + jsdoc + tsdoc)
			const expandedKinds = KIND_GROUPS[normalizedTarget] ?? [normalizedTarget];

			// Fall back to kind-based filtering: "interface" → all interfaces
			const kindMatches = expandedKinds
				.flatMap((k) => findSymbolsByKind(structure.symbols, k))
				.sort((a, b) => a.range.startLine - b.range.startLine);
			if (kindMatches.length > 0) {
				const lines: string[] = [];
				for (const sym of kindMatches) {
					const maxNesting = recursive ? getSymbolTreeDepth(sym) : 0;
					lines.push(...formatSkeletonEntry(sym, '', maxNesting));
				}
				const output = lines.join('\n');
				response.appendResponseLine(output);
			} else {
				response.appendResponseLine(`"${symbolTarget}": Not found.\n`);
				response.appendResponseLine(`**File map:**\n${fileMap.output}`);
			}
		},
		name: 'file_read',
		schema: {
			file: zod.string().describe('Path to file (relative to workspace root or absolute).'),
			symbol: zod
				.string()
				.describe('Symbol to read. Use empty string "" for file overview (body-bearing symbols as stubs, everything else as raw source). Use dot notation for nested symbols (e.g. "UserService.findById"), or a kind to list all of that type (e.g. "interface", "class"). Container symbols: "imports", "comments". Children are collapsed to metadata stubs — request each child by name to expand.')
		}
	});
