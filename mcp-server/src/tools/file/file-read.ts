/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SymbolLike } from './symbol-resolver.js';

import fs from 'node:fs';
import path from 'node:path';
import { z as zod } from 'zod';

import { generateIdentifiers } from '@packages/tfidf';

import { formatSymbolLabel } from './symbol-resolver.js';

import { fileExtractStructure, fileHighlightReadRange, fileReadContent, type FileStructure, type FileSymbol } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';
import { isStrictLogFile } from './logFile-read.js';
import { collectSymbolKinds, findQualifiedPaths, findSymbolsByKind, resolveByKindAndName, resolveSymbolTarget } from './symbol-resolver.js';

// Container kinds are valid symbol targets even when childless
const CONTAINER_KINDS = new Set(['imports', 'comment', 'jsdoc', 'tsdoc']);

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

/** Count all symbols in a tree (the root plus all descendants). */
function countChildSymbolsDeep(children: readonly SymbolLike[]): number {
	let count = children.length;
	for (const c of children) {
		if (c.children && c.children.length > 0) count += countChildSymbolsDeep(c.children);
	}
	return count;
}

/** Build compact metadata tag matching codebase_map format: [30L|5S|3R|1I] */
function buildSymbolMeta(symbol: SymbolLike): string {
	const lineCount = symbol.range.endLine - symbol.range.startLine + 1;
	// Single-line symbols don't need metadata — the content is trivial
	if (lineCount === 1) return '';

	const parts: string[] = [];
	parts.push(`${lineCount}L`);
	const symCount = symbol.children ? countChildSymbolsDeep(symbol.children) : 0;
	if (symCount > 0) parts.push(`${symCount}S`);
	if ((symbol.referenceCount ?? 0) > 0) parts.push(`${symbol.referenceCount}R`);
	if ((symbol.implementationCount ?? 0) > 0) parts.push(`${symbol.implementationCount}I`);
	return `[${parts.join('|')}]`;
}

function formatSkeletonEntry(symbol: SymbolLike, indent = '', maxNesting = 0, currentDepth = 0, collapseKinds?: ReadonlySet<string>): string[] {
	const lines: string[] = [];

	const meta = buildSymbolMeta(symbol);
	const label = formatSymbolLabel(symbol);
	lines.push(meta ? `${indent}${meta} ${label}` : `${indent}${label}`);

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

interface CompressionResult {
	collapsedRanges: LineRange[];
	compressed: boolean;
	label: null | string;
	output: string;
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
		return { collapsedRanges: [], compressed: false, label: null, output: fullContent, sourceRanges: [], trace: [] };
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
			trace: []
		};
	}

	// No body-bearing children — return full content at maximum nesting
	const maxNesting = getSymbolTreeDepth(symbol);
	const contentMaxNesting = recursive ? maxNesting : 0;
	const maxContent = formatContentAtNesting(allLines, symbol, startLine, endLine, contentMaxNesting, 0, lineNumbers);
	const ranges = computeContentRanges(symbol, contentMaxNesting);
	return { ...ranges, compressed: false, label: null, output: maxContent, trace: [] };
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
 * Compress full-file output into a file map with body-bearing symbols as stubs
 * and consecutive non-body-bearing content grouped into TF-IDF-named regions.
 *
 * Body-bearing symbols (functions, classes, methods, etc.) → standalone stubs
 * Container symbols (imports, comments, jsdoc, tsdoc) → standalone stubs
 * Other non-body content (constants, variables, gaps) → grouped into single TF-IDF stubs
 */
function compressFullFileOutput(_rawContent: string, structure: FileStructure | undefined, allLines: string[], _startLine1: number, _lineNumbers: boolean): CompressionResult {
	// No structure available — return raw content as-is
	if (!structure) {
		const numbered = addLineNumbers(_rawContent, _startLine1, _lineNumbers);
		return { collapsedRanges: [], compressed: false, label: null, output: numbered, sourceRanges: [], trace: [] };
	}

	// Classify pieces: standalone (body-bearing or container) vs groupable (everything else)
	interface MapPiece {
		endLine: number;
		startLine: number;
		type: 'standalone' | 'groupable';
		symbol?: FileSymbol;
		text?: string;
	}

	const pieces: MapPiece[] = [];

	for (const sym of structure.symbols) {
		const isBodyBearing = BODY_BEARING_KINDS.has(sym.kind);
		const isContainer = CONTAINER_KINDS.has(sym.kind);
		const isStandalone = isBodyBearing || isContainer;
		pieces.push({
			type: isStandalone ? 'standalone' : 'groupable',
			startLine: sym.range.startLine,
			endLine: sym.range.endLine,
			symbol: sym,
			text: allLines.slice(sym.range.startLine - 1, sym.range.endLine).join('\n')
		});
	}

	for (const gap of structure.gaps) {
		if (gap.type === 'blank') continue;
		const text = allLines.slice(gap.start - 1, gap.end).join('\n').trim();
		if (text.length === 0) continue;
		pieces.push({ type: 'groupable', startLine: gap.start, endLine: gap.end, text });
	}

	pieces.sort((a, b) => a.startLine - b.startLine);

	// Group consecutive groupable pieces into regions
	interface Region {
		type: 'standalone' | 'grouped';
		startLine: number;
		endLine: number;
		symbol?: FileSymbol;
		combinedText?: string;
	}

	const regions: Region[] = [];
	let currentGroup: MapPiece[] = [];

	function flushGroup(): void {
		if (currentGroup.length === 0) return;
		const startLine = currentGroup[0].startLine;
		const endLine = currentGroup[currentGroup.length - 1].endLine;
		const combinedText = currentGroup.map((p) => p.text ?? '').join('\n');
		regions.push({ type: 'grouped', startLine, endLine, combinedText });
		currentGroup = [];
	}

	for (const piece of pieces) {
		if (piece.type === 'standalone') {
			flushGroup();
			regions.push({ type: 'standalone', startLine: piece.startLine, endLine: piece.endLine, symbol: piece.symbol });
		} else {
			currentGroup.push(piece);
		}
	}
	flushGroup();

	// Run TF-IDF on grouped regions to generate semantic identifiers
	const groupedRegions = regions.filter((r): r is Region & { combinedText: string } => r.type === 'grouped');
	const groupNodes = groupedRegions.map((g) => ({
		kind: 'region',
		range: { startLine: g.startLine, endLine: g.endLine },
		text: g.combinedText
	}));
	const groupIds = generateIdentifiers(groupNodes);
	const groupSlugMap = new Map<Region, string>();
	for (let i = 0; i < groupedRegions.length; i++) {
		groupSlugMap.set(groupedRegions[i], groupIds[i]?.slug ?? `region-${groupedRegions[i].startLine}`);
	}

	// Render the file map
	const collapsedRanges: LineRange[] = [];
	const outputLines: string[] = [];
	const maxNesting = getMaxSymbolNesting(structure.symbols);

	for (const region of regions) {
		if (region.type === 'standalone' && region.symbol) {
			outputLines.push(...formatSkeletonEntry(region.symbol, '', maxNesting));
			collapsedRanges.push({ startLine: region.startLine, endLine: region.endLine });
		} else if (region.type === 'grouped') {
			const lineCount = region.endLine - region.startLine + 1;
			const slug = groupSlugMap.get(region) ?? `region-${region.startLine}`;
			outputLines.push(`[${lineCount}L] ${slug}`);
			collapsedRanges.push({ startLine: region.startLine, endLine: region.endLine });
		}
	}

	return {
		collapsedRanges,
		compressed: true,
		label: null,
		output: outputLines.join('\n'),
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

			const targetableSymbols = structure.symbols;

			if (!match) {
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
					const available = targetableSymbols.map((s) => formatSymbolLabel(s)).join(', ');
					const availableKinds = collectSymbolKinds(targetableSymbols);
					response.appendResponseLine(`"${symbolTarget}": Not found. Available: ${available || 'none'}`);
					if (availableKinds.length > 0) {
						response.appendResponseLine(`Hint: You can also use a kind to list all symbols of that type: ${availableKinds.join(', ')}`);
					}

					const qualifiedPaths = findQualifiedPaths(structure.symbols, symbolTarget);
					if (qualifiedPaths.length > 0) {
						const suggestions = qualifiedPaths.map((p) => `"${p}"`).join(', ');
						response.appendResponseLine(`Hint: Did you mean ${suggestions}? Use the qualified dot-path to target nested symbols.`);
					}
				}
			} else {
				const { symbol } = match;
				const { startLine } = symbol.range;
				const { endLine } = symbol.range;

				const result = compressTargetContent(symbol, allLines, structure, recursive, lineNumbers);

				fileHighlightReadRange(filePath, startLine - 1, endLine - 1, result.collapsedRanges, result.sourceRanges);

				const header = formatCompressionHeader(result);
				if (header) response.appendResponseLine(header);
				response.appendResponseLine(result.output);
			}
		},
		name: 'file_read',
		schema: {
			file: zod.string().describe('Path to file (relative to workspace root or absolute).'),
			symbol: zod
				.string()
				.describe('Symbol to read. Use empty string "" for file overview (all symbols as stubs). Use dot notation for nested symbols (e.g. "UserService.findById"), or a kind to list all of that type (e.g. "interface", "class"). Container symbols: "imports", "comments". Children are collapsed to metadata stubs — request each child by name to expand.')
		}
	});
