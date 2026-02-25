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

// ── Output Compression Constants ─────────────────────────
// Same 3,000 token budget used by codebase_map and codebase_trace
const OUTPUT_TOKEN_LIMIT = 3_000;
const CHARS_PER_TOKEN = 4;
const OUTPUT_CHAR_LIMIT = OUTPUT_TOKEN_LIMIT * CHARS_PER_TOKEN;

// Container kinds are valid symbol targets even when childless
const CONTAINER_KINDS = new Set(['imports', 'exports', 'comment', 'jsdoc', 'tsdoc', 'directives']);

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
 * Format a single line with an optional line-number prefix.
 */
function formatLine(lineNum: number, content: string, lineNumbers: boolean): string {
	return lineNumbers ? `[${lineNum}] ${content}` : content;
}

/**
 * Prefix each line in a content string with its 1-indexed line number.
 * When lineNumbers is false, returns content unchanged.
 */
function addLineNumbers(content: string, startLine1: number, lineNumbers: boolean): string {
	if (!lineNumbers) return content;
	return content
		.split('\n')
		.map((line, i) => `[${startLine1 + i}] ${line}`)
		.join('\n');
}

function formatSkeletonEntry(symbol: SymbolLike, indent = '', maxNesting = 0, currentDepth = 0): string[] {
	const lines: string[] = [];
	const { startLine, endLine } = symbol.range;
	const range = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;

	lines.push(`${indent}[${range}] ${formatSymbolLabel(symbol)}`);

	if (currentDepth < maxNesting && symbol.children && symbol.children.length > 0) {
		for (const child of symbol.children) {
			lines.push(...formatSkeletonEntry(child, `${indent}  `, maxNesting, currentDepth + 1));
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

interface SkeletonPiece {
	category: 'raw' | 'symbol';
	endLine: number;
	startLine: number;
	symbol?: FileSymbol;
}

/**
 * Build source-ordered skeleton pieces from a structure.
 * Container symbols (imports, exports, etc.) are regular symbols in the tree.
 */
function buildSkeletonPieces(structure: FileStructure): SkeletonPiece[] {
	const pieces: SkeletonPiece[] = [];

	for (const sym of structure.symbols) {
		pieces.push({ category: 'symbol', endLine: sym.range.endLine, startLine: sym.range.startLine, symbol: sym });
	}
	for (const gap of structure.gaps) {
		if (gap.type === 'unknown') {
			pieces.push({ category: 'raw', endLine: gap.end, startLine: gap.start });
		}
	}

	pieces.sort((a, b) => a.startLine - b.startLine);
	return pieces;
}

/**
 * Build source-ordered pieces for content rendering.
 * Container symbols (imports, comments, jsdoc, tsdoc, etc.) are "exploded":
 * their children are promoted to root-level pieces so each import/comment
 * is a leaf symbol rendered as raw content. Non-container symbols stay as-is.
 */
function buildContentPieces(structure: FileStructure): SkeletonPiece[] {
	const pieces: SkeletonPiece[] = [];

	for (const sym of structure.symbols) {
		if (CONTAINER_KINDS.has(sym.kind) && sym.children && sym.children.length > 0) {
			// Promote children to root-level pieces
			for (const child of sym.children) {
				pieces.push({ category: 'symbol', endLine: child.range.endLine, startLine: child.range.startLine, symbol: child });
			}
			// Any lines in the container range not covered by children become raw pieces
			const childLines = new Set<number>();
			for (const child of sym.children) {
				for (let l = child.range.startLine; l <= child.range.endLine; l++) {
					childLines.add(l);
				}
			}
			let rawStart: number | null = null;
			for (let l = sym.range.startLine; l <= sym.range.endLine; l++) {
				if (!childLines.has(l)) {
					if (rawStart === null) rawStart = l;
				} else if (rawStart !== null) {
					pieces.push({ category: 'raw', endLine: l - 1, startLine: rawStart });
					rawStart = null;
				}
			}
			if (rawStart !== null) {
				pieces.push({ category: 'raw', endLine: sym.range.endLine, startLine: rawStart });
			}
		} else {
			pieces.push({ category: 'symbol', endLine: sym.range.endLine, startLine: sym.range.startLine, symbol: sym });
		}
	}
	for (const gap of structure.gaps) {
		if (gap.type === 'unknown') {
			pieces.push({ category: 'raw', endLine: gap.end, startLine: gap.start });
		}
	}

	pieces.sort((a, b) => a.startLine - b.startLine);
	return pieces;
}

/**
 * Render skeleton output at a given compression level.
 */
function renderSkeletonAtLevel(pieces: SkeletonPiece[], allLines: string[], maxNesting: number, lineNumbers: boolean): string {
	const result: string[] = [];

	for (const piece of pieces) {
		if (piece.category === 'raw') {
			for (let l = piece.startLine; l <= piece.endLine; l++) {
				result.push(formatLine(l, allLines[l - 1] ?? '', lineNumbers));
			}
		} else if (piece.symbol) {
			const entries = formatSkeletonEntry(piece.symbol, '', maxNesting);
			for (const entry of entries) result.push(entry);
		}
	}

	return result.join('\n');
}

/**
 * Render target-symbol skeleton at a given nesting level.
 */
function renderTargetSkeletonAtLevel(symbol: FileSymbol, maxNesting: number): string {
	return formatSkeletonEntry(symbol, '', maxNesting).join('\n');
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
 * Compute collapsed (symbol stubs) and source (raw/gap) ranges from skeleton pieces.
 * Symbols shown as stubs → collapsed; raw gaps → source.
 */
function computeSkeletonRanges(pieces: SkeletonPiece[], maxNesting: number): { collapsedRanges: LineRange[]; sourceRanges: LineRange[] } {
	const collapsedRanges: LineRange[] = [];
	const sourceRanges: LineRange[] = [];

	for (const piece of pieces) {
		if (piece.category === 'raw') {
			sourceRanges.push({ endLine: piece.endLine, startLine: piece.startLine });
		} else if (piece.symbol) {
			collectSymbolRanges(piece.symbol, 0, maxNesting, collapsedRanges, sourceRanges);
		}
	}

	return { collapsedRanges, sourceRanges };
}

/**
 * Recursively collect ranges for a symbol tree at a given nesting level.
 * Symbols beyond the nesting limit are collapsed; expanded symbols contribute
 * their gap lines as source and recurse into children.
 */
function collectSymbolRanges(
	symbol: SymbolLike,
	currentDepth: number,
	maxNesting: number,
	collapsedRanges: LineRange[],
	sourceRanges: LineRange[]
): void {
	// At or beyond nesting limit: entire symbol is a collapsed stub
	if (currentDepth >= maxNesting || !symbol.children || symbol.children.length === 0) {
		collapsedRanges.push({ endLine: symbol.range.endLine, startLine: symbol.range.startLine });
		return;
	}

	// Symbol is expanded — its children may be collapsed or further expanded
	for (const child of symbol.children) {
		collectSymbolRanges(child, currentDepth + 1, maxNesting, collapsedRanges, sourceRanges);
	}
}

/**
 * Incrementally compress skeleton output using the same root-first approach
 * as codebase_map. Builds from least detail (nesting=0) upward, stopping
 * at the deepest level that fits within the token budget.
 *
 * If nesting=0 still exceeds the limit, it's returned anyway
 * as the guaranteed minimum (Copilot must be able to read at least the root structure).
 */
function compressSkeletonOutput(structure: FileStructure, allLines: string[], requestedMaxNesting: number, lineNumbers: boolean): CompressionResult {
	const pieces = buildSkeletonPieces(structure);
	const maxNesting = Math.min(requestedMaxNesting, getMaxSymbolNesting(structure.symbols));
	const trace: string[] = [];

	// Quick check: does the full output fit?
	const fullOutput = renderSkeletonAtLevel(pieces, allLines, maxNesting, lineNumbers);
	trace.push(`skeleton(${maxNesting})=${fullOutput.length}`);
	if (fullOutput.length <= OUTPUT_CHAR_LIMIT) {
		const ranges = computeSkeletonRanges(pieces, maxNesting);
		return { ...ranges, compressed: false, label: null, output: fullOutput, trace };
	}

	// Compression needed — incrementally build up from nesting=0
	let bestOutput = '';
	let bestNesting = 0;

	for (let nesting = 0; nesting <= maxNesting; nesting++) {
		const candidate = renderSkeletonAtLevel(pieces, allLines, nesting, lineNumbers);
		trace.push(`skeleton(${nesting})=${candidate.length}`);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (nesting === 0) {
				trace.push(`← selected (exceeds limit, minimum)`);
				const ranges = computeSkeletonRanges(pieces, 0);
				return {
					...ranges,
					compressed: true,
					label: `top-level skeleton only (${structure.symbols.length} symbols)`,
					output: candidate,
					trace
				};
			}
			break;
		}
		bestOutput = candidate;
		bestNesting = nesting;
	}

	trace.push(`← skeleton(${bestNesting}) selected`);
	const label = bestNesting < maxNesting ? `symbol depth ${bestNesting} of ${maxNesting}` : null;
	const ranges = computeSkeletonRanges(pieces, bestNesting);

	return {
		...ranges,
		compressed: true,
		label,
		output: bestOutput,
		trace
	};
}

/**
 * Compress a target symbol's skeleton output using incremental nesting expansion.
 */
function computeTargetRanges(symbol: SymbolLike, maxNesting: number): { collapsedRanges: LineRange[]; sourceRanges: LineRange[] } {
	const collapsedRanges: LineRange[] = [];
	const sourceRanges: LineRange[] = [];
	collectSymbolRanges(symbol, 0, maxNesting, collapsedRanges, sourceRanges);
	return { collapsedRanges, sourceRanges };
}

function compressTargetSkeleton(symbol: FileSymbol, requestedMaxNesting: number): CompressionResult {
	const maxNesting = Math.min(requestedMaxNesting, getSymbolTreeDepth(symbol));
	const trace: string[] = [];

	const fullOutput = renderTargetSkeletonAtLevel(symbol, maxNesting);
	trace.push(`skeleton(${maxNesting})=${fullOutput.length}`);
	if (fullOutput.length <= OUTPUT_CHAR_LIMIT) {
		const ranges = computeTargetRanges(symbol, maxNesting);
		return { ...ranges, compressed: false, label: null, output: fullOutput, trace };
	}

	let bestOutput = '';
	let bestNesting = 0;

	for (let nesting = 0; nesting <= maxNesting; nesting++) {
		const candidate = renderTargetSkeletonAtLevel(symbol, nesting);
		trace.push(`skeleton(${nesting})=${candidate.length}`);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (nesting === 0) {
				trace.push(`← selected (exceeds limit, minimum)`);
				const ranges = computeTargetRanges(symbol, 0);
				return {
					...ranges,
					compressed: true,
					label: `top-level only (${symbol.children?.length ?? 0} children)`,
					output: candidate,
					trace
				};
			}
			break;
		}
		bestOutput = candidate;
		bestNesting = nesting;
	}

	trace.push(`← skeleton(${bestNesting}) selected`);
	const ranges = computeTargetRanges(symbol, bestNesting);

	return {
		...ranges,
		compressed: true,
		label: `symbol depth ${bestNesting} of ${maxNesting}`,
		output: bestOutput,
		trace
	};
}

/**
 * Compress target content output using bottom-up incremental expansion,
 * following the same approach as codebase_map.
 *
 * Detail levels (least → most):
 *   Phase 1: Skeleton nesting expansion (0 → max)
 *   Phase 2: Content nesting expansion (0 → contentMaxNesting)
 *           recursive=true  → contentMaxNesting = max symbol nesting
 *           recursive=false → contentMaxNesting = 0 (children as stubs)
 */
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

function compressTargetContent(symbol: FileSymbol, allLines: string[], structure: FileStructure, recursive: boolean, lineNumbers: boolean): CompressionResult {
	const { startLine } = symbol.range;
	const { endLine } = symbol.range;
	const hasChildren = symbol.children && symbol.children.length > 0;
	// Container symbols: either kind === name (e.g. "imports") or known
	// container kinds whose name was overridden (e.g. comments with TF-IDF slugs)
	const isContainer = symbol.kind === symbol.name || CONTAINER_KINDS.has(symbol.kind);
	const expandChildren = hasChildren && !isContainer;
	const maxNesting = getSymbolTreeDepth(symbol);
	const contentMaxNesting = recursive ? maxNesting : 0;
	const headerLabel = formatSymbolLabel(symbol);
	// Containers (imports, exports, etc.) don't need the header when showing raw source —
	// the content is self-evident. The header only appears when compressed to a stub.
	const header = isContainer ? '' : `[${startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`}] ${headerLabel}\n`;
	const trace: string[] = [];

	// Quick check: does the maximum-detail output fit?
	const maxContent = expandChildren ? formatContentAtNesting(allLines, symbol, startLine, endLine, contentMaxNesting, 0, lineNumbers) : addLineNumbers(getContentSlice(allLines, startLine, endLine), startLine, lineNumbers);
	const maxOutput = header + maxContent;
	trace.push(`full-content=${maxOutput.length}`);
	if (maxOutput.length <= OUTPUT_CHAR_LIMIT) {
		// Full content fits — no collapsing needed
		const noCollapsing = expandChildren ? computeContentRanges(symbol, contentMaxNesting) : { collapsedRanges: [], sourceRanges: [] };
		return { ...noCollapsing, compressed: false, label: null, output: maxOutput, trace };
	}

	// Compression needed — bottom-up incremental expansion
	let bestOutput = '';
	let compressionLabel = '';
	let bestNesting = 0;
	let phase: 'content' | 'skeleton' = 'skeleton';

	// Phase 1: Skeleton nesting expansion (nesting 0 → max)
	for (let n = 0; n <= maxNesting; n++) {
		const candidate = renderTargetSkeletonAtLevel(symbol, n);
		trace.push(`skeleton(${n})=${candidate.length}`);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (n === 0) {
				trace.push(`← selected (exceeds limit, minimum)`);
				const ranges = computeTargetRanges(symbol, 0);
				return {
					...ranges,
					compressed: true,
					label: `top-level only (${symbol.children?.length ?? 0} children)`,
					output: candidate,
					trace
				};
			}
			compressionLabel = `symbol depth ${n - 1} of ${maxNesting}`;
			bestNesting = n - 1;
			break;
		}
		bestOutput = candidate;
		bestNesting = n;
	}

	// Phase 2: Content nesting expansion (nesting 0 → contentMaxNesting)
	if (!compressionLabel && expandChildren) {
		phase = 'content';
		for (let n = 0; n <= contentMaxNesting; n++) {
			const content = formatContentAtNesting(allLines, symbol, startLine, endLine, n, 0, lineNumbers);
			const candidate = header + content;
			trace.push(`content(${n})=${candidate.length}`);
			if (candidate.length > OUTPUT_CHAR_LIMIT) {
				if (n === 0) {
					compressionLabel = 'auto-skeleton';
					bestNesting = maxNesting;
					phase = 'skeleton';
					trace.push(`← fell back to skeleton(${maxNesting})`);
				} else {
					compressionLabel = `content depth ${n - 1} of ${contentMaxNesting}`;
					bestNesting = n - 1;
				}
				break;
			}
			bestOutput = candidate;
			bestNesting = n;
		}
	}

	// No children and nothing collapsible — return full content (a stub is useless here)
	if (!compressionLabel && !expandChildren) {
		return { collapsedRanges: [], compressed: false, label: null, output: maxOutput, sourceRanges: [], trace };
	}

	trace.push(`← ${phase}(${bestNesting}) selected`);

	// Compute ranges based on which phase won
	const ranges = phase === 'skeleton'
		? computeTargetRanges(symbol, bestNesting)
		: computeContentRanges(symbol, bestNesting);

	return {
		...ranges,
		compressed: !!compressionLabel,
		label: compressionLabel || null,
		output: bestOutput,
		trace
	};
}

/**
 * Recursively render a single symbol based on expansion state.
 * - Expanded symbol with children: show body source, recurse into children
 * - Expanded leaf symbol: show full raw content
 * - Not expanded: skeleton stub with children shown up to skeletonNesting depth
 */
function renderSymbolProgressive(
	symbol: FileSymbol,
	allLines: string[],
	expandedSet: ReadonlySet<FileSymbol>,
	skeletonNesting: number,
	lineNumbers: boolean
): string {
	if (!expandedSet.has(symbol)) {
		return formatSkeletonEntry(symbol, '', skeletonNesting).join('\n');
	}

	if (symbol.children.length === 0) {
		return addLineNumbers(getContentSlice(allLines, symbol.range.startLine, symbol.range.endLine), symbol.range.startLine, lineNumbers);
	}

	// Expanded parent: show raw source for gaps between children, recurse into each child
	const result: string[] = [];
	let currentLine = symbol.range.startLine;

	const sortedChildren = [...symbol.children].sort((a, b) => a.range.startLine - b.range.startLine);
	for (const child of sortedChildren) {
		if (child.range.startLine > currentLine) {
			result.push(addLineNumbers(getContentSlice(allLines, currentLine, child.range.startLine - 1), currentLine, lineNumbers));
		}
		result.push(renderSymbolProgressive(child, allLines, expandedSet, skeletonNesting, lineNumbers));
		currentLine = child.range.endLine + 1;
	}

	if (currentLine <= symbol.range.endLine) {
		result.push(addLineNumbers(getContentSlice(allLines, currentLine, symbol.range.endLine), currentLine, lineNumbers));
	}

	return result.join('\n');
}

/**
 * Render the file with multi-depth progressive expansion.
 * `expandedSet` tracks which FileSymbols (at any depth) are expanded to raw content.
 * Unexpanded symbols show as skeleton stubs with children up to `skeletonNesting` depth.
 */
function renderProgressiveContent(
	pieces: SkeletonPiece[],
	allLines: string[],
	expandedSet: ReadonlySet<FileSymbol>,
	skeletonNesting: number,
	lineNumbers: boolean
): string {
	const result: string[] = [];

	for (const piece of pieces) {
		if (piece.category === 'raw') {
			for (let l = piece.startLine; l <= piece.endLine; l++) {
				result.push(formatLine(l, allLines[l - 1] ?? '', lineNumbers));
			}
		} else if (piece.symbol) {
			result.push(renderSymbolProgressive(piece.symbol, allLines, expandedSet, skeletonNesting, lineNumbers));
		}
	}

	return result.join('\n');
}

/**
 * Recursively compute line ranges for a symbol based on expansion state.
 */
function collectSymbolRangesProgressive(
	symbol: FileSymbol,
	expandedSet: ReadonlySet<FileSymbol>,
	sourceRanges: LineRange[],
	collapsedRanges: LineRange[]
): void {
	if (!expandedSet.has(symbol)) {
		collapsedRanges.push({ endLine: symbol.range.endLine, startLine: symbol.range.startLine });
		return;
	}

	if (symbol.children.length === 0) {
		sourceRanges.push({ endLine: symbol.range.endLine, startLine: symbol.range.startLine });
		return;
	}

	// Parent is expanded — its own range is source, recurse children
	sourceRanges.push({ endLine: symbol.range.endLine, startLine: symbol.range.startLine });
	for (const child of symbol.children) {
		collectSymbolRangesProgressive(child, expandedSet, sourceRanges, collapsedRanges);
	}
}

/**
 * Compute line ranges for progressive content mode (multi-depth).
 */
function computeProgressiveContentRanges(
	pieces: SkeletonPiece[],
	expandedSet: ReadonlySet<FileSymbol>
): { collapsedRanges: LineRange[]; sourceRanges: LineRange[] } {
	const collapsedRanges: LineRange[] = [];
	const sourceRanges: LineRange[] = [];

	for (const piece of pieces) {
		if (piece.category === 'raw') {
			sourceRanges.push({ endLine: piece.endLine, startLine: piece.startLine });
		} else if (piece.symbol) {
			collectSymbolRangesProgressive(piece.symbol, expandedSet, sourceRanges, collapsedRanges);
		}
	}

	return { collapsedRanges, sourceRanges };
}

/**
 * Collect all symbols at every depth, grouped by depth level.
 * Returns array where index = depth. Each entry is sorted by line count ascending.
 * Also builds a parentMap so we can skip children whose parent isn't expanded.
 */
function collectSymbolsByDepth(rootSymbols: FileSymbol[]): { byDepth: FileSymbol[][]; parentMap: Map<FileSymbol, FileSymbol | null> } {
	const byDepth: FileSymbol[][] = [];
	const parentMap = new Map<FileSymbol, FileSymbol | null>();

	function walk(symbols: FileSymbol[], depth: number, parent: FileSymbol | null): void {
		if (!byDepth[depth]) byDepth[depth] = [];
		for (const sym of symbols) {
			byDepth[depth].push(sym);
			parentMap.set(sym, parent);
			if (sym.children.length > 0) {
				walk(sym.children, depth + 1, sym);
			}
		}
	}

	walk(rootSymbols, 0, null);

	for (const depthGroup of byDepth) {
		depthGroup.sort((a, b) => {
			const aLines = a.range.endLine - a.range.startLine;
			const bLines = b.range.endLine - b.range.startLine;
			return aLines - bLines;
		});
	}

	return { byDepth, parentMap };
}

/**
 * Symbol kinds that represent body-bearing constructs (functions, classes, etc.).
 * In file-overview mode these always stay as skeleton stubs — Copilot must request
 * them by name via the `symbol` parameter to see their raw body.
 */
const BODY_BEARING_KINDS = new Set([
	'function', 'method', 'constructor', 'getter', 'setter',
	'class', 'interface', 'enum',
]);

/**
 * Compress full-file output using incremental skeleton→progressive expansion approach.
 * Phase 1: Skeleton nesting (0 → max) — build up the full skeleton including all children.
 * Phase 2: Only after the full skeleton fits, progressively expand expandable symbols
 *          to raw content. Body-bearing symbols (functions, classes, etc.) always stay
 *          as skeleton stubs so Copilot can only edit lines that are actually visible.
 */
function compressFullFileOutput(rawContent: string, structure: FileStructure | undefined, allLines: string[], startLine1: number, lineNumbers: boolean): CompressionResult {
	const trace: string[] = [];

	const numbered = addLineNumbers(rawContent, startLine1, lineNumbers);
	trace.push(`raw=${numbered.length}`);

	// No structure available — return raw (can't collapse parent symbols without structure)
	if (!structure) {
		if (numbered.length <= OUTPUT_CHAR_LIMIT) {
			return { collapsedRanges: [], compressed: false, label: null, output: numbered, sourceRanges: [], trace };
		}
		trace.push(`no structure available, returning raw`);
		return {
			collapsedRanges: [],
			compressed: true,
			label: 'file too large for token budget. Use startLine/endLine to read specific ranges',
			output: numbered,
			sourceRanges: [],
			trace
		};
	}

	// Check if any symbol is body-bearing (function, class, etc.)
	const hasBodyBearingSymbols = structure.symbols.some(function isBodyBearing(s: FileSymbol): boolean {
		return BODY_BEARING_KINDS.has(s.kind) || s.children.some(isBodyBearing);
	});

	// No body-bearing symbols and raw content fits → return raw as-is
	if (!hasBodyBearingSymbols && numbered.length <= OUTPUT_CHAR_LIMIT) {
		return { collapsedRanges: [], compressed: false, label: null, output: numbered, sourceRanges: [], trace };
	}

	const skeletonPieces = buildSkeletonPieces(structure);
	const contentPieces = buildContentPieces(structure);
	const maxSkeletonNesting = getMaxSymbolNesting(structure.symbols);

	trace.push(`limit=${OUTPUT_CHAR_LIMIT}, skeletonPieces=${skeletonPieces.length}, contentPieces=${contentPieces.length}, maxSkeletonNesting=${maxSkeletonNesting}`);

	let bestOutput = '';
	let bestLabel: string | null = null;
	let bestPhase: 'content' | 'none' | 'skeleton' = 'none';
	let bestRanges: { collapsedRanges: LineRange[]; sourceRanges: LineRange[] } = { collapsedRanges: [], sourceRanges: [] };
	let bestSkeletonNesting = -1;

	// Phase 1: Skeleton nesting (0 → max)
	// Start from least detail and build up until the full skeleton is shown
	for (let nesting = 0; nesting <= maxSkeletonNesting; nesting++) {
		const candidate = renderSkeletonAtLevel(skeletonPieces, allLines, nesting, lineNumbers);
		trace.push(`skeleton(${nesting})=${candidate.length}`);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (nesting === 0) {
				// Even top-level skeleton exceeds limit — return it anyway as minimum
				trace.push(`← selected (exceeds limit, minimum)`);
				const ranges = computeSkeletonRanges(skeletonPieces, 0);
				return {
					...ranges,
					compressed: true,
					label: `top-level skeleton only (${structure.symbols.length} symbols)`,
					output: candidate,
					trace
				};
			}
			// Previous level was the best we can do in skeleton phase
			break;
		}
		bestOutput = candidate;
		bestPhase = 'skeleton';
		bestLabel = `skeleton depth ${nesting} of ${maxSkeletonNesting}`;
		bestRanges = computeSkeletonRanges(skeletonPieces, nesting);
		bestSkeletonNesting = nesting;
	}

	// Phase 2: Multi-depth progressive expansion (expandable symbols only).
	// Only proceeds if the full skeleton (all nesting levels) fits within the budget.
	// Body-bearing symbols (functions, methods, classes, interfaces, enums, etc.) always
	// remain as skeleton stubs. Only non-body-bearing symbols (variables, properties,
	// type aliases, imports, comments, etc.) are expanded to raw content.
	// Copilot must request body-bearing symbols by name to see their raw body.
	if (bestSkeletonNesting === maxSkeletonNesting) {
		const rootSymbols = contentPieces.flatMap((p) => p.symbol ? [p.symbol] : []);
		const { byDepth, parentMap } = collectSymbolsByDepth(rootSymbols);

		const expandedSet = new Set<FileSymbol>();
		let stoppedAtName: string | undefined;
		let stoppedAtSize = 0;
		let stoppedAtLength = 0;
		let stoppedAtDepth = 0;

		// Only expand non-body-bearing symbols in file-overview mode.
		// Body-bearing symbols (functions, methods, classes, etc.) stay as
		// skeleton stubs regardless of whether they have children.
		const expandable = byDepth.map((group) => group.filter((s) => !BODY_BEARING_KINDS.has(s.kind)));
		const totalExpandable = expandable.reduce((sum, group) => sum + group.length, 0);

		outer:
		for (let depth = 0; depth < expandable.length; depth++) {
			for (const sym of expandable[depth]) {
				// Skip if parent isn't expanded — this symbol is invisible
				const parent = parentMap.get(sym);
				if (parent && !expandedSet.has(parent)) continue;

				expandedSet.add(sym);
				const candidate = renderProgressiveContent(contentPieces, allLines, expandedSet, maxSkeletonNesting, lineNumbers);
				if (candidate.length > OUTPUT_CHAR_LIMIT) {
					stoppedAtName = sym.name;
					stoppedAtSize = sym.range.endLine - sym.range.startLine + 1;
					stoppedAtLength = candidate.length;
					stoppedAtDepth = depth;
					expandedSet.delete(sym);
					break outer;
				}
				bestOutput = candidate;
				bestPhase = 'content';
				bestLabel = `progressive: ${expandedSet.size}/${totalExpandable} expandable symbols shown (depth ${depth}/${expandable.length - 1})`;
				bestRanges = computeProgressiveContentRanges(contentPieces, expandedSet);
			}
		}

		if (stoppedAtName) {
			trace.push(`progressive(${expandedSet.size}/${totalExpandable}): stopped at depth ${stoppedAtDepth} '${stoppedAtName}' (${stoppedAtSize} lines, would be ${stoppedAtLength} chars)`);
		} else {
			trace.push(`progressive(${expandedSet.size}/${totalExpandable}): all expandable symbols shown`);
		}
	}

	// If we reached full content without exceeding limit, it's not compressed
	const isCompressed = bestOutput !== numbered;

	if (isCompressed) {
		trace.push(`← ${bestPhase}(best) selected`);
	}

	return {
		...bestRanges,
		compressed: isCompressed,
		label: isCompressed ? bestLabel : null,
		output: bestOutput,
		trace
	};
}

/**
 * Compress structured range output.
 * Symbols are always collapsed to stubs, gaps show raw source.
 */
function compressStructuredRangeOutput(
	structure: FileStructure,
	allLines: string[],
	reqStart: number,
	reqEnd: number,
	lineNumbers: boolean
): CompressionResult & {
	actualStart: number;
	actualEnd: number;
	collapsedRanges: Array<{ startLine: number; endLine: number }>;
	sourceRanges: Array<{ startLine: number; endLine: number }>;
} {
	const result = renderStructuredRange(structure, allLines, reqStart, reqEnd, lineNumbers);
	if (result.output.length <= OUTPUT_CHAR_LIMIT) {
		return { ...result, compressed: false, label: null, trace: [`structured-range=${result.output.length}`] };
	}

	// Already at minimum detail — return as-is (guaranteed minimum)
	return { ...result, compressed: true, label: 'structured range (exceeds budget)', trace: [`structured-range=${result.output.length}`, `← exceeds limit=${OUTPUT_CHAR_LIMIT}`] };
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
					const childRange = child.range.startLine === child.range.endLine ? `${child.range.startLine}` : `${child.range.startLine}-${child.range.endLine}`;
					const childLabel = formatSymbolLabel(child);
					result.push(`[${childRange}] ${childLabel}`);
				}
			}
		} else {
			result.push(formatLine(lineNum, allLines[lineNum - 1] ?? '', lineNumbers));
		}
	}

	return result.join('\n');
}

// ── Structured Line-Range Infrastructure ──────────────────

interface NonSymbolBlock {
	endLine: number; // 1-indexed
	startLine: number; // 1-indexed
	type: 'gap';
}

type LineOwner = { type: 'block'; block: NonSymbolBlock } | { type: 'symbol'; symbol: FileSymbol };

/**
 * Build gap blocks from uncovered lines.
 * Container symbols (imports, exports, etc.) are now regular symbols
 * and handled by the symbol walker, so only true gaps remain here.
 */
function buildNonSymbolBlocks(structure: FileStructure): NonSymbolBlock[] {
	const symbolLines = new Set<number>();
	for (const sym of structure.symbols) {
		for (let l = sym.range.startLine; l <= sym.range.endLine; l++) {
			symbolLines.add(l);
		}
	}

	const tagged: Array<{ line: number }> = [];

	for (const gap of structure.gaps) {
		for (let line = gap.start; line <= gap.end; line++) {
			if (!symbolLines.has(line)) tagged.push({ line });
		}
	}

	tagged.sort((a, b) => a.line - b.line);

	const blocks: NonSymbolBlock[] = [];
	let current: NonSymbolBlock | undefined;

	for (const entry of tagged) {
		if (current && entry.line === current.endLine + 1) {
			current.endLine = entry.line;
		} else {
			if (current) blocks.push(current);
			current = { endLine: entry.line, startLine: entry.line, type: 'gap' };
		}
	}
	if (current) blocks.push(current);

	return blocks;
}

/**
 * Build a map from line number → owning entity (symbol or non-symbol block).
 * Only covers lines within the requested range for efficiency.
 */
function classifyLines(structure: FileStructure, blocks: NonSymbolBlock[], startLine: number, endLine: number): Map<number, LineOwner> {
	const owners = new Map<number, LineOwner>();

	// Walk the symbol tree recursively to find the most specific (deepest) child
	// that owns each line. This ensures that for Markdown heading-dominance
	// (where H1 spans the whole file), we classify lines by their immediate
	// child sections rather than the all-encompassing parent.
	const walkSymbols = (symbols: FileSymbol[]): void => {
		for (const sym of symbols) {
			const symStart = sym.range.startLine;
			const symEnd = sym.range.endLine;
			if (symEnd < startLine || symStart > endLine) continue;

			if (sym.children.length > 0) {
				// Recurse into children first — deeper symbols override parent
				walkSymbols(sym.children);
			}

			// Only claim lines not already claimed by a deeper child
			const from = Math.max(symStart, startLine);
			const to = Math.min(symEnd, endLine);
			const owner: LineOwner = { symbol: sym, type: 'symbol' };
			for (let line = from; line <= to; line++) {
				if (!owners.has(line)) {
					owners.set(line, owner);
				}
			}
		}
	};
	walkSymbols(structure.symbols);

	for (const block of blocks) {
		if (block.endLine < startLine || block.startLine > endLine) continue;
		const from = Math.max(block.startLine, startLine);
		const to = Math.min(block.endLine, endLine);
		const owner: LineOwner = { block, type: 'block' };
		for (let line = from; line <= to; line++) {
			if (!owners.has(line)) owners.set(line, owner);
		}
	}

	return owners;
}

/**
 * Expand the requested range so that any partially-touched non-symbol block
 * is fully included. Symbols are NOT expanded (they become stubs).
 */
function expandToBlockBoundaries(requestedStart: number, requestedEnd: number, blocks: NonSymbolBlock[]): { expandedStart: number; expandedEnd: number } {
	let expandedStart = requestedStart;
	let expandedEnd = requestedEnd;

	for (const block of blocks) {
		if (block.startLine <= requestedStart && block.endLine >= requestedStart) {
			expandedStart = Math.min(expandedStart, block.startLine);
		}
		if (block.startLine <= requestedEnd && block.endLine >= requestedEnd) {
			expandedEnd = Math.max(expandedEnd, block.endLine);
		}
	}

	return { expandedEnd, expandedStart };
}

/**
 * Render a structured line range: raw source for gaps, collapsed stubs for symbols.
 * Returns the actual source-line range that the output covers (for highlighting).
 */
function renderStructuredRange(
	structure: FileStructure,
	allLines: string[],
	requestedStart: number,
	requestedEnd: number,
	lineNumbers: boolean
): {
	output: string;
	actualStart: number;
	actualEnd: number;
	collapsedRanges: Array<{ startLine: number; endLine: number }>;
	sourceRanges: Array<{ startLine: number; endLine: number }>;
} {
	const blocks = buildNonSymbolBlocks(structure);
	const { expandedEnd, expandedStart } = expandToBlockBoundaries(requestedStart, requestedEnd, blocks);
	const owners = classifyLines(structure, blocks, expandedStart, expandedEnd);

	const result: string[] = [];
	const emittedSymbols = new Set<FileSymbol>();
	const emittedBlocks = new Set<NonSymbolBlock>();

	// Track the actual source-line range that the output covers
	let actualStart = expandedEnd;
	let actualEnd = expandedStart;

	const collapsedRanges: Array<{ startLine: number; endLine: number }> = [];
	const sourceRanges: Array<{ startLine: number; endLine: number }> = [];
	let srcRangeStart: number | undefined;
	let srcRangeEnd: number | undefined;

	const flushSourceRange = () => {
		if (srcRangeStart !== undefined && srcRangeEnd !== undefined) {
			sourceRanges.push({ endLine: srcRangeEnd, startLine: srcRangeStart });
			srcRangeStart = undefined;
			srcRangeEnd = undefined;
		}
	};

	const trackSourceLine = (l: number) => {
		if (srcRangeStart === undefined) {
			srcRangeStart = l;
			srcRangeEnd = l;
		} else {
			srcRangeEnd = l;
		}
	};

	let line = expandedStart;
	while (line <= expandedEnd) {
		const owner = owners.get(line);

		if (!owner) {
			// Unclassified line (shouldn't happen with complete coverage, but safe)
			result.push(formatLine(line, allLines[line - 1] ?? '', lineNumbers));
			trackSourceLine(line);
			actualStart = Math.min(actualStart, line);
			actualEnd = Math.max(actualEnd, line);
			line++;
			continue;
		}

		if (owner.type === 'symbol') {
			const sym = owner.symbol;
			if (!emittedSymbols.has(sym)) {
				emittedSymbols.add(sym);
				const symRange = sym.range.startLine === sym.range.endLine ? `${sym.range.startLine}` : `${sym.range.startLine}-${sym.range.endLine}`;
				const symLabel = formatSymbolLabel(sym);
				result.push(`[${symRange}] ${symLabel}`);
			}
			// Track all lines of this symbol within the range
			const symEndInRange = Math.min(sym.range.endLine, expandedEnd);
			const symStartInRange = Math.max(sym.range.startLine, expandedStart);
			actualStart = Math.min(actualStart, symStartInRange);
			actualEnd = Math.max(actualEnd, symEndInRange);
			flushSourceRange();
			collapsedRanges.push({ endLine: sym.range.endLine, startLine: sym.range.startLine });
			line = symEndInRange + 1;
			continue;
		}

		// Non-symbol block (gap) — always emit raw source
		const { block } = owner;
		if (!emittedBlocks.has(block)) {
			emittedBlocks.add(block);

			const blockStart = Math.max(block.startLine, expandedStart);
			const blockEnd = Math.min(block.endLine, expandedEnd);
			actualStart = Math.min(actualStart, blockStart);
			actualEnd = Math.max(actualEnd, blockEnd);

			for (let l = blockStart; l <= blockEnd; l++) {
				trackSourceLine(l);
				result.push(formatLine(l, allLines[l - 1] ?? '', lineNumbers));
			}
		}
		// Skip all lines of this block
		const skipTo = Math.min(block.endLine, expandedEnd);
		line = skipTo + 1;
	}

	flushSourceRange();

	return {
		actualEnd,
		actualStart,
		collapsedRanges,
		output: result.join('\n'),
		sourceRanges
	};
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
			'Read file content with flexible targeting and output modes. Line numbers are always included.\n\n' +
			'**Parameters:**\n' +
			'- `file` (required) — Path to file (relative or absolute)\n' +
			'- `rawContent` (required) — true = source code, false = skeleton (names + line ranges)\n' +
			'- `symbol` — Symbol to read by name (dot notation for nesting, e.g. "UserService.findById"). ' +
			'Container symbols like "imports", "exports", "comments", "directives" target those groups.\n' +
			'- `startLine` / `endLine` — Read a structured range (1-indexed). ' +
			'Shows raw source for gaps, collapsed stubs for symbols. ' +
			'Cannot be used with `symbol`.\n\n' +
			'**Structured Range Mode (startLine/endLine):**\n' +
			'For supported file types (TS/JS, Markdown, JSON/JSONC), shows gap content as raw source ' +
			'and collapses symbols into stubs. Use `symbol` to read a specific symbol.\n\n' +
			'Children are always expanded when possible, with automatic compression to stay within token budget.\n\n' +
			'**EXAMPLES:**\n' +
			'- File skeleton: `{ file: "src/service.ts", rawContent: false }`\n' +
			'- Read a function: `{ file: "src/utils.ts", rawContent: true, symbol: "calculateTotal" }`\n' +
			'- Read imports: `{ file: "src/service.ts", rawContent: true, symbol: "imports" }`\n' +
			'- Structured range: `{ file: "src/service.ts", rawContent: true, startLine: 1, endLine: 50 }`\n' +
			'- Compact range: `{ file: "src/service.ts", rawContent: false, startLine: 1, endLine: 50 }`\n\n' +
			'**Log Files:**\n' +
			'Log file extensions (.log, .out, .err, .trace, .jsonl, etc.) must be read with `logFile_read` instead. ' +
			'This tool will show a redirect notice for those file types.',
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

			// ── Validate required parameters ──────────────────────────
			if (params.rawContent === undefined) {
				response.appendResponseLine(
					'**Error:** `rawContent` is a required parameter.\n\n' +
						'- `rawContent: true` — Returns source code content\n' +
						'- `rawContent: false` — Returns skeleton (symbol names + line ranges)\n\n' +
						'Example: `{ file: "src/service.ts", rawContent: true }`'
				);
				return;
			}

			const rawContent = params.rawContent;
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

			const relativePath = path.relative(getClientWorkspace(), filePath).replaceAll('\\', '/');

			// ── Mutual exclusivity: symbol + startLine/endLine ────────
			// Treat 0 as "not specified" since lines are 1-indexed
			const hasLineRange = (params.startLine !== undefined && params.startLine !== 0) || (params.endLine !== undefined && params.endLine !== 0);
			if (hasTarget && hasLineRange) {
				response.appendResponseLine('**Error:** `symbol` and `startLine`/`endLine` cannot be used together. ' + 'Use `symbol` to read specific content, or `startLine`/`endLine` to read a structured range.');
				return;
			}

			// Check if this is a TS/JS file that supports structured extraction
			// Get file structure via registry (supports any registered language)
			let structure: FileStructure | undefined;
			let allLines: string[] = [];
			structure = await fileExtractStructure(filePath);
			if (structure) {
				allLines = structure.content.split('\n');
			}

			// ── Structured line-range mode ────────────────────────────
			if (hasLineRange && !hasTarget) {
				const totalLines = structure ? structure.totalLines : allLines.length;

				// For non-structured files, fall back to raw content
				if (!structure) {
					const rawStart = params.startLine !== undefined ? params.startLine - 1 : undefined;
					const rawEnd = params.endLine !== undefined ? params.endLine - 1 : undefined;
					const content = await fileReadContent(filePath, rawStart, rawEnd);
					fileHighlightReadRange(filePath, content.startLine, content.endLine);

					// Report line corrections when requested values were out of range
					if (params.startLine !== undefined && content.startLine + 1 !== params.startLine) {
						response.appendResponseLine(`ℹ️ startLine was adjusted from ${params.startLine} to ${content.startLine + 1} (file has ${totalLines} lines)`);
					}
					if (params.endLine !== undefined && content.endLine + 1 !== params.endLine) {
						response.appendResponseLine(`ℹ️ endLine was adjusted from ${params.endLine} to ${content.endLine + 1} (file has ${totalLines} lines)`);
					}

					const numbered = addLineNumbers(content.content, content.startLine + 1, lineNumbers);
					if (numbered.length > OUTPUT_CHAR_LIMIT) {
						response.appendResponseLine(`Output compressed: file too large for token budget. Use startLine/endLine to read specific ranges.`);
					}
					response.appendResponseLine(numbered);
					return;
				}

				// Structured file: symbols become stubs, non-symbols show raw content
				const reqStart = Math.max(1, params.startLine ?? 1);
				const reqEnd = Math.min(structure.totalLines, params.endLine ?? structure.totalLines);

				// Report line corrections when requested values were out of range
				if (params.startLine !== undefined && reqStart !== params.startLine) {
					response.appendResponseLine(`ℹ️ startLine was adjusted from ${params.startLine} to ${reqStart} (file has ${totalLines} lines)`);
				}
				if (params.endLine !== undefined && reqEnd !== params.endLine) {
					response.appendResponseLine(`ℹ️ endLine was adjusted from ${params.endLine} to ${reqEnd} (file has ${totalLines} lines)`);
				}

				if (reqStart > reqEnd) {
					response.appendResponseLine(`**Error:** startLine (${reqStart}) is greater than endLine (${reqEnd}).`);
					return;
				}
				if (reqStart > structure.totalLines) {
					response.appendResponseLine(`**Error:** startLine (${reqStart}) exceeds total lines (${structure.totalLines}).`);
					return;
				}

				const compressed = compressStructuredRangeOutput(structure, allLines, reqStart, reqEnd, lineNumbers);

				// Highlight source (yellow) and collapsed (grey + fold) ranges
				fileHighlightReadRange(filePath, compressed.actualStart - 1, compressed.actualEnd - 1, compressed.collapsedRanges, compressed.sourceRanges);

				const header = formatCompressionHeader(compressed);
				if (header) response.appendResponseLine(header);
				response.appendResponseLine(compressed.output);
				return;
			}

			// ── Skeleton mode (no targets, no line range) ─────────────
			if (!hasTarget && !rawContent) {
				if (!structure) {
					response.appendResponseLine(`This file type does not support structured reading (skeleton mode). ` + `Use \`startLine\`/\`endLine\` for line-range reading, or set \`rawContent: true\` to read the full file.`);
					return;
				}

				const maxNesting = recursive ? getMaxSymbolNesting(structure.symbols) : 0;
				const result = compressSkeletonOutput(structure, allLines, maxNesting, lineNumbers);

				fileHighlightReadRange(filePath, 0, structure.totalLines - 1, result.collapsedRanges, result.sourceRanges);

				const header = formatCompressionHeader(result);
				if (header) response.appendResponseLine(header);
				response.appendResponseLine(result.output);
				return;
			}

			// ── Full file mode (no targets, rawContent, no line range) ──
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
				response.appendResponseLine(`This file type does not support structured reading (target mode). ` + `Use \`startLine\`/\`endLine\` for line-range reading, or omit all parameters to read the full file.`);
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

			// Only parent symbols (with children) or container kinds are valid targets.
			// Leaf symbols of other kinds should be read via startLine/endLine.
			const isValidTarget = (s: FileSymbol): boolean =>
				(s.children && s.children.length > 0) || CONTAINER_KINDS.has(s.kind);
			const targetableSymbols = structure.symbols.filter(isValidTarget);

			if (match && !isValidTarget(match.symbol)) {
				const { startLine: sLine, endLine: eLine } = match.symbol.range;
				const available = targetableSymbols.map((s) => formatSymbolLabel(s)).join(', ');
				response.appendResponseLine(`"${symbolTarget}" is a leaf symbol (no children). Use \`startLine: ${sLine}\` / \`endLine: ${eLine}\` to read it directly.`);
				response.appendResponseLine(`Available parent symbols: ${available || 'none'}`);
				return;
			}

			if (!match) {
				// Normalize plural category selectors to singular kinds
				const normalizedTarget = PLURAL_TO_KIND[symbolTarget.toLowerCase()] ?? symbolTarget;

				// Expand meta-categories (e.g. "comment" → comment + jsdoc + tsdoc)
				const expandedKinds = KIND_GROUPS[normalizedTarget] ?? [normalizedTarget];

				// Fall back to kind-based filtering: "interface" → all interfaces
				const kindMatches = expandedKinds
					.flatMap((k) => findSymbolsByKind(structure.symbols, k))
					.filter(isValidTarget)
					.sort((a, b) => a.range.startLine - b.range.startLine);
				if (kindMatches.length > 0) {
					const lines: string[] = [];
					for (const sym of kindMatches) {
						const maxNesting = recursive ? getSymbolTreeDepth(sym) : 0;
						lines.push(...formatSkeletonEntry(sym, '', maxNesting));
					}
					let output = lines.join('\n');
					if (output.length > OUTPUT_CHAR_LIMIT) {
						// Re-render at nesting=0 if too large
						const compact: string[] = [];
						for (const sym of kindMatches) {
							compact.push(...formatSkeletonEntry(sym, '', 0));
						}
						output = compact.join('\n');
						response.appendResponseLine(`Output compressed: top-level only.\n`);
					}
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

				// Leaf symbols (no children) have no structure to show —
				// auto-promote to raw content so the output is useful.
				const isLeaf = !symbol.children || symbol.children.length === 0;

				if (!rawContent && !isLeaf) {
					const maxNesting = recursive ? getSymbolTreeDepth(symbol) : 0;
					const result = compressTargetSkeleton(symbol, maxNesting);

					fileHighlightReadRange(filePath, startLine - 1, endLine - 1, result.collapsedRanges, result.sourceRanges);

					const header = formatCompressionHeader(result);
					if (header) response.appendResponseLine(header);
					response.appendResponseLine(result.output);
				} else {
					const result = compressTargetContent(symbol, allLines, structure, recursive, lineNumbers);

					fileHighlightReadRange(filePath, startLine - 1, endLine - 1, result.collapsedRanges, result.sourceRanges);

					const header = formatCompressionHeader(result);
					if (header) response.appendResponseLine(header);
					response.appendResponseLine(result.output);
				}
			}
		},
		name: 'file_read',
		schema: {
			file: zod.string().describe('Path to file (relative to workspace root or absolute).'),
			rawContent: zod.boolean().describe('true = source code content, false = skeleton (names + line ranges). REQUIRED.'),
			symbol: zod
				.string()
				.optional()
				.describe('Parent symbol to read (must have children/nested content). Use dot notation for nested symbols (e.g. "UserService.findById"), or a kind to list all of that type (e.g. "interface", "class"). Container symbols: "imports", "exports", "comments", "directives". Leaf symbols without children must be read via startLine/endLine.'),
			endLine: zod.number().int().optional().describe('End line (1-indexed) for structured range reading. If omitted with startLine, reads to end of file.'),
			startLine: zod
				.number()
				.int()
				.optional()
				.describe('Start line (1-indexed) for structured range reading. Shows raw source for gaps, ' + 'collapsed stubs for symbols. Cannot be used with symbol.')
		}
	});
