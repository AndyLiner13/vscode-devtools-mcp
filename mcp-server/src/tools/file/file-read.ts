/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SymbolLike } from './symbol-resolver.js';

import fs from 'node:fs';
import path from 'node:path';
import { z as zod } from 'zod';

import { fileExtractStructure, fileHighlightReadRange, fileReadContent, type FileStructure, type FileSymbol, type OrphanedItem } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';
import { isStrictLogFile } from './logFile-read.js';
import { findQualifiedPaths, resolveSymbolTarget } from './symbol-resolver.js';

// ── Output Compression Constants ─────────────────────────
// Same 3,000 token budget used by codebase_map and codebase_trace
const OUTPUT_TOKEN_LIMIT = 3_000;
const CHARS_PER_TOKEN = 4;
const OUTPUT_CHAR_LIMIT = OUTPUT_TOKEN_LIMIT * CHARS_PER_TOKEN;

function resolveFilePath(file: string): string {
	if (path.isAbsolute(file)) return file;
	return path.resolve(getClientWorkspace(), file);
}

// Special target keywords for orphaned content
const SPECIAL_TARGETS = ['#imports', '#exports', '#comments'] as const;
type SpecialTarget = (typeof SPECIAL_TARGETS)[number];

function isSpecialTarget(target: string): target is SpecialTarget {
	return SPECIAL_TARGETS.includes(target as SpecialTarget);
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

function formatSkeletonEntry(symbol: OrphanedItem | SymbolLike, indent = '', maxNesting = 0, currentDepth = 0): string[] {
	const lines: string[] = [];
	// FileSymbol uses startLine/endLine, OrphanedItem uses start/end
	const startLine = 'startLine' in symbol.range ? symbol.range.startLine : symbol.range.start;
	const endLine = 'startLine' in symbol.range ? symbol.range.endLine : symbol.range.end;
	const range = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;

	lines.push(`${indent}[${range}] ${symbol.kind} ${symbol.name}`);

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
	category: 'comments' | 'directives' | 'exports' | 'imports' | 'raw' | 'symbol';
	endLine: number;
	startLine: number;
	symbol?: FileSymbol;
}

/**
 * Build and merge the source-ordered skeleton pieces from a structure.
 * This is the shared logic extracted from the handler's skeleton mode.
 */
function buildSkeletonPieces(structure: FileStructure): SkeletonPiece[] {
	const pieces: SkeletonPiece[] = [];

	for (const item of structure.orphaned.items) {
		const cat: SkeletonPiece['category'] = item.category === 'import' ? 'imports' : item.category === 'export' ? 'exports' : item.category === 'comment' ? 'comments' : item.category === 'directive' ? 'directives' : 'comments';
		pieces.push({ category: cat, endLine: item.range.end, startLine: item.range.start });
	}
	for (const sym of structure.symbols) {
		pieces.push({ category: 'symbol', endLine: sym.range.endLine, startLine: sym.range.startLine, symbol: sym });
	}
	for (const gap of structure.gaps) {
		if (gap.type === 'unknown') {
			pieces.push({ category: 'raw', endLine: gap.end, startLine: gap.start });
		}
	}

	pieces.sort((a, b) => a.startLine - b.startLine);

	// Merge adjacent same-category non-symbol/non-raw items
	const merged: SkeletonPiece[] = [];
	for (const piece of pieces) {
		const prev = merged[merged.length - 1];
		const canMerge = prev && piece.category !== 'symbol' && piece.category !== 'raw' && prev.category === piece.category && piece.startLine <= prev.endLine + 2;
		if (canMerge && prev) {
			prev.endLine = Math.max(prev.endLine, piece.endLine);
		} else {
			merged.push({ ...piece });
		}
	}

	return merged;
}

/**
 * Render skeleton output at a given compression level.
 * @param orphanMode 'full' = show single-line orphans as content, multi-line as stubs;
 *                   'stubs' = collapse all orphan blocks to category stubs
 */
function renderSkeletonAtLevel(pieces: SkeletonPiece[], allLines: string[], maxNesting: number, orphanMode: 'full' | 'stubs', lineNumbers: boolean): string {
	const result: string[] = [];

	for (const piece of pieces) {
		if (piece.category === 'raw') {
			for (let l = piece.startLine; l <= piece.endLine; l++) {
				result.push(formatLine(l, allLines[l - 1] ?? '', lineNumbers));
			}
		} else if (piece.symbol) {
			const entries = formatSkeletonEntry(piece.symbol, '', maxNesting);
			for (const entry of entries) result.push(entry);
		} else if (orphanMode === 'stubs') {
			const range = piece.startLine === piece.endLine ? `${piece.startLine}` : `${piece.startLine}-${piece.endLine}`;
			result.push(`[${range}] ${piece.category}`);
		} else if (piece.startLine === piece.endLine) {
			result.push(formatLine(piece.startLine, allLines[piece.startLine - 1] ?? '', lineNumbers));
		} else {
			result.push(`[${piece.startLine}-${piece.endLine}] ${piece.category}`);
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

interface CompressionResult {
	compressed: boolean;
	label: null | string;
	output: string;
}

/**
 * Incrementally compress skeleton output using the same root-first approach
 * as codebase_map. Builds from least detail (nesting=0) upward, stopping
 * at the deepest level that fits within the token budget.
 *
 * Expansion order (bottom-up):
 *   1. nesting=0  + orphans=stubs  (minimum detail)
 *   2. nesting=1  + orphans=stubs
 *   3. ...
 *   4. nesting=max + orphans=stubs
 *   5. nesting=max + orphans=full  (maximum detail — orphans expanded last)
 *
 * If nesting=0 + orphans=stubs still exceeds the limit, it's returned anyway
 * as the guaranteed minimum (Copilot must be able to read at least the root structure).
 */
function compressSkeletonOutput(structure: FileStructure, allLines: string[], requestedMaxNesting: number, lineNumbers: boolean): CompressionResult {
	const pieces = buildSkeletonPieces(structure);
	const maxNesting = Math.min(requestedMaxNesting, getMaxSymbolNesting(structure.symbols));

	// Quick check: does the full output fit?
	const fullOutput = renderSkeletonAtLevel(pieces, allLines, maxNesting, 'full', lineNumbers);
	if (fullOutput.length <= OUTPUT_CHAR_LIMIT) {
		return { compressed: false, label: null, output: fullOutput };
	}

	// Compression needed — incrementally build up from nesting=0, orphans=stubs
	let bestOutput = '';
	let bestNesting = 0;
	let orphansExpanded = false;

	// Phase 1: Expand nesting depth with collapsed orphans
	for (let nesting = 0; nesting <= maxNesting; nesting++) {
		const candidate = renderSkeletonAtLevel(pieces, allLines, nesting, 'stubs', lineNumbers);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (nesting === 0) {
				// Guaranteed minimum: return nesting=0 even if it exceeds
				return {
					compressed: true,
					label: `top-level skeleton only (${structure.symbols.length} symbols)`,
					output: candidate
				};
			}
			break;
		}
		bestOutput = candidate;
		bestNesting = nesting;
	}

	// Phase 2: Try expanding orphans at the current best nesting level
	if (bestNesting === maxNesting) {
		// Nesting is already at max; try adding full orphan content
		const withOrphans = renderSkeletonAtLevel(pieces, allLines, maxNesting, 'full', lineNumbers);
		if (withOrphans.length <= OUTPUT_CHAR_LIMIT) {
			return { compressed: false, label: null, output: withOrphans };
		}
		// Orphans don't fit — keep collapsed
	} else {
		// Check if the next nesting level fits with full orphans
		// (it won't since collapsed didn't fit, but try the current best with full orphans)
		const withOrphans = renderSkeletonAtLevel(pieces, allLines, bestNesting, 'full', lineNumbers);
		if (withOrphans.length <= OUTPUT_CHAR_LIMIT) {
			bestOutput = withOrphans;
			orphansExpanded = true;
		}
	}

	const parts: string[] = [];
	if (bestNesting < maxNesting) {
		parts.push(`symbol depth ${bestNesting} of ${maxNesting}`);
	}
	if (!orphansExpanded) {
		parts.push('collapsed orphaned items');
	}

	return {
		compressed: true,
		label: parts.length > 0 ? parts.join(', ') : null,
		output: bestOutput
	};
}

/**
 * Compress a target symbol's skeleton output using incremental nesting expansion.
 */
function compressTargetSkeleton(symbol: FileSymbol, requestedMaxNesting: number): CompressionResult {
	const maxNesting = Math.min(requestedMaxNesting, getSymbolTreeDepth(symbol));

	const fullOutput = renderTargetSkeletonAtLevel(symbol, maxNesting);
	if (fullOutput.length <= OUTPUT_CHAR_LIMIT) {
		return { compressed: false, label: null, output: fullOutput };
	}

	let bestOutput = '';
	let bestNesting = 0;

	for (let nesting = 0; nesting <= maxNesting; nesting++) {
		const candidate = renderTargetSkeletonAtLevel(symbol, nesting);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (nesting === 0) {
				return {
					compressed: true,
					label: `top-level only (${symbol.children?.length ?? 0} children)`,
					output: candidate
				};
			}
			break;
		}
		bestOutput = candidate;
		bestNesting = nesting;
	}

	return {
		compressed: true,
		label: `symbol depth ${bestNesting} of ${maxNesting}`,
		output: bestOutput
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
function compressTargetContent(symbol: FileSymbol, allLines: string[], structure: FileStructure, recursive: boolean, lineNumbers: boolean): CompressionResult {
	const { startLine } = symbol.range;
	const { endLine } = symbol.range;
	const hasChildren = symbol.children && symbol.children.length > 0;
	const maxNesting = getSymbolTreeDepth(symbol);
	const contentMaxNesting = recursive ? maxNesting : 0;
	const header = `[${startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`}] ${symbol.kind} ${symbol.name}\n`;

	// Quick check: does the maximum-detail output fit?
	const maxContent = hasChildren ? formatContentAtNesting(allLines, symbol, startLine, endLine, contentMaxNesting, 0, lineNumbers) : addLineNumbers(getContentSlice(allLines, startLine, endLine), startLine, lineNumbers);
	const maxOutput = header + maxContent;
	if (maxOutput.length <= OUTPUT_CHAR_LIMIT) {
		return { compressed: false, label: null, output: maxOutput };
	}

	// Compression needed — bottom-up incremental expansion
	let bestOutput = '';
	let compressionLabel = '';

	// Phase 1: Skeleton nesting expansion (nesting 0 → max)
	for (let n = 0; n <= maxNesting; n++) {
		const candidate = renderTargetSkeletonAtLevel(symbol, n);
		if (candidate.length > OUTPUT_CHAR_LIMIT) {
			if (n === 0) {
				return {
					compressed: true,
					label: `top-level only (${symbol.children?.length ?? 0} children)`,
					output: candidate
				};
			}
			compressionLabel = `symbol depth ${n - 1} of ${maxNesting}`;
			break;
		}
		bestOutput = candidate;
	}

	// Phase 2: Content nesting expansion (nesting 0 → contentMaxNesting)
	if (!compressionLabel && hasChildren) {
		for (let n = 0; n <= contentMaxNesting; n++) {
			const content = formatContentAtNesting(allLines, symbol, startLine, endLine, n, 0, lineNumbers);
			const candidate = header + content;
			if (candidate.length > OUTPUT_CHAR_LIMIT) {
				if (n === 0) {
					compressionLabel = 'auto-skeleton';
				} else {
					compressionLabel = `content depth ${n - 1} of ${contentMaxNesting}`;
				}
				break;
			}
			bestOutput = candidate;
		}
	}

	// No children and nothing collapsible — return full content (a stub is useless here)
	if (!compressionLabel && !hasChildren) {
		return { compressed: false, label: null, output: maxOutput };
	}

	return {
		compressed: !!compressionLabel,
		label: compressionLabel || null,
		output: bestOutput
	};
}

/**
 * Compress full-file output. Auto-switches to skeleton mode with incremental nesting.
 */
function compressFullFileOutput(rawContent: string, structure: FileStructure | undefined, allLines: string[], startLine1: number, lineNumbers: boolean): CompressionResult {
	// Try raw content first
	const numbered = addLineNumbers(rawContent, startLine1, lineNumbers);
	if (numbered.length <= OUTPUT_CHAR_LIMIT) {
		return { compressed: false, label: null, output: numbered };
	}

	// Auto-switch to skeleton if structure is available
	if (structure) {
		const maxNesting = getMaxSymbolNesting(structure.symbols);
		const result = compressSkeletonOutput(structure, allLines, maxNesting, lineNumbers);
		return {
			compressed: true,
			label: `auto-skeleton${result.label ? `, ${result.label}` : ''}`,
			output: result.output
		};
	}

	// No structure available — return raw with guidance
	// Still return the full content but with a compression notice
	return {
		compressed: true,
		label: 'file too large for token budget. Use startLine/endLine to read specific ranges',
		output: numbered
	};
}

/**
 * Compress structured range output. Tries with collapseSkeleton=false first,
 * then collapseSkeleton=true. Non-symbol content is always preserved.
 */
function compressStructuredRangeOutput(
	structure: FileStructure,
	allLines: string[],
	reqStart: number,
	reqEnd: number,
	skeleton: boolean,
	lineNumbers: boolean
): CompressionResult & {
	actualStart: number;
	actualEnd: number;
	collapsedRanges: Array<{ startLine: number; endLine: number }>;
	sourceRanges: Array<{ startLine: number; endLine: number }>;
} {
	// Level 1: Try with current skeleton setting
	const result = renderStructuredRange(structure, allLines, reqStart, reqEnd, skeleton, lineNumbers);
	if (result.output.length <= OUTPUT_CHAR_LIMIT) {
		return { ...result, compressed: false, label: null };
	}

	// Level 2: Try with collapseSkeleton=true (collapse import/export/comment blocks)
	if (!skeleton) {
		const collapsed = renderStructuredRange(structure, allLines, reqStart, reqEnd, true, lineNumbers);
		if (collapsed.output.length <= OUTPUT_CHAR_LIMIT) {
			return { ...collapsed, compressed: true, label: 'auto-skeleton range' };
		}
		// Still too large — return the collapsed version (non-symbols must be accessible)
		return { ...collapsed, compressed: true, label: 'auto-skeleton range (exceeds budget)' };
	}

	// Already skeleton and still exceeds — return as-is (guaranteed minimum)
	return { ...result, compressed: true, label: 'structured range (exceeds budget)' };
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
					result.push(`[${childRange}] ${child.kind} ${child.name}`);
				}
			}
		} else {
			result.push(formatLine(lineNum, allLines[lineNum - 1] ?? '', lineNumbers));
		}
	}

	return result.join('\n');
}

// ── Structured Line-Range Infrastructure ──────────────────

type NonSymbolType = 'comment' | 'directive' | 'export' | 'gap' | 'import';

interface NonSymbolBlock {
	endLine: number; // 1-indexed
	startLine: number; // 1-indexed
	type: NonSymbolType;
}

type LineOwner = { type: 'block'; block: NonSymbolBlock } | { type: 'symbol'; symbol: FileSymbol };

/**
 * Group consecutive non-symbol items of the same type into atomic blocks.
 * Each block represents a contiguous run of the same non-symbol category.
 * Lines within symbol ranges are excluded — only "between-symbol" content forms blocks.
 */
function buildNonSymbolBlocks(structure: FileStructure): NonSymbolBlock[] {
	// Build set of lines owned by symbols so we can exclude them
	const symbolLines = new Set<number>();
	for (const sym of structure.symbols) {
		for (let l = sym.range.startLine; l <= sym.range.endLine; l++) {
			symbolLines.add(l);
		}
	}

	const tagged: Array<{ line: number; type: NonSymbolType }> = [];

	for (const item of structure.orphaned.items) {
		const mappedType: NonSymbolType = item.category === 'import' ? 'import' : item.category === 'export' ? 'export' : item.category === 'comment' ? 'comment' : item.category === 'directive' ? 'directive' : 'comment'; // footnote/linkdef fall under comment for rendering

		for (let line = item.range.start; line <= item.range.end; line++) {
			if (!symbolLines.has(line)) tagged.push({ line, type: mappedType });
		}
	}

	for (const gap of structure.gaps) {
		for (let line = gap.start; line <= gap.end; line++) {
			if (!symbolLines.has(line)) tagged.push({ line, type: 'gap' });
		}
	}

	tagged.sort((a, b) => a.line - b.line);

	const blocks: NonSymbolBlock[] = [];
	let current: NonSymbolBlock | undefined;

	for (const entry of tagged) {
		if (current?.type === entry.type && entry.line === current.endLine + 1) {
			current.endLine = entry.line;
		} else {
			if (current) blocks.push(current);
			current = { endLine: entry.line, startLine: entry.line, type: entry.type };
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
 * Render a structured line range: raw source for non-symbols, collapsed stubs for symbols.
 * When collapseSkeleton is true, imports/exports/comments/directives also become stubs.
 * Returns the actual source-line range that the output covers (for highlighting).
 */
function renderStructuredRange(
	structure: FileStructure,
	allLines: string[],
	requestedStart: number,
	requestedEnd: number,
	collapseSkeleton: boolean,
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
				result.push(`[${symRange}] ${sym.kind} ${sym.name}`);
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

		// Non-symbol block
		const { block } = owner;
		if (!emittedBlocks.has(block)) {
			emittedBlocks.add(block);

			const blockStart = Math.max(block.startLine, expandedStart);
			const blockEnd = Math.min(block.endLine, expandedEnd);
			actualStart = Math.min(actualStart, blockStart);
			actualEnd = Math.max(actualEnd, blockEnd);

			if (collapseSkeleton && block.type !== 'gap') {
				// Collapse multi-line imports/exports/comments/directives to stubs
				// Single-line blocks show actual content
				if (block.startLine === block.endLine) {
					trackSourceLine(block.startLine);
					result.push(formatLine(block.startLine, allLines[block.startLine - 1] ?? '', lineNumbers));
				} else {
					flushSourceRange();
					collapsedRanges.push({ endLine: block.endLine, startLine: block.startLine });
					result.push(`[${block.startLine}-${block.endLine}] ${block.type}s`);
				}
			} else {
				// Emit raw source for the block
				for (let l = blockStart; l <= blockEnd; l++) {
					trackSourceLine(l);
					result.push(formatLine(l, allLines[l - 1] ?? '', lineNumbers));
				}
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
			'Read file content with flexible targeting and output modes.\n\n' +
			'**Two Required Choices:**\n' +
			'1. Do I want code or just structure? → `rawContent` (true = source code, false = skeleton)\n' +
			'2. Do I want line number prefixes? → `lineNumbers` (true = `[N]` prefix on each line, false = plain)\n\n' +
			'**Parameters:**\n' +
			'- `file` (required) — Path to file (relative or absolute)\n' +
			'- `rawContent` (required) — true = source code, false = skeleton (names + line ranges)\n' +
			'- `lineNumbers` (required) — true = prefix each line with `[N]`, false = plain content\n' +
			'- `target` — What to read: symbol names, or special keywords:\n' +
			'  - `"#imports"` — All import declarations\n' +
			'  - `"#exports"` — All export declarations\n' +
			'  - `"#comments"` — Orphan comments (section headers, annotations)\n' +
			'  - `"UserService"` — Symbol by name\n' +
			'  - `"UserService.findById"` — Nested symbol\n' +
			'  - Can be array: `["#imports", "UserService"]`\n' +
			'- `recursive` — true = expand children, false = placeholders (default)\n' +
			'- `startLine` / `endLine` — Read a structured range (1-indexed). ' +
			'Shows raw source for non-symbols, collapsed stubs for symbols. ' +
			'Cannot be used with `target`.\n\n' +
			'**Structured Range Mode (startLine/endLine):**\n' +
			'For supported file types (TS/JS, Markdown, JSON/JSONC), shows non-symbol content as raw source ' +
			'and collapses symbols into stubs. Use `target` to read a specific symbol. ' +
			'Non-symbol blocks are atomic: if the range touches any line of a block, the full block is included. ' +
			'Set `rawContent: false` to also collapse import/export/comment blocks into stubs.\n\n' +
			'**EXAMPLES:**\n' +
			'- File skeleton: `{ file: "src/service.ts", rawContent: false, lineNumbers: false }`\n' +
			'- Read a function with line numbers: `{ file: "src/utils.ts", rawContent: true, lineNumbers: true, target: "calculateTotal" }`\n' +
			'- Read plain content: `{ file: "src/utils.ts", rawContent: true, lineNumbers: false, target: "calculateTotal" }`\n' +
			'- Structured range: `{ file: "src/service.ts", rawContent: true, lineNumbers: true, startLine: 1, endLine: 50 }`\n' +
			'- Compact range: `{ file: "src/service.ts", rawContent: false, lineNumbers: false, startLine: 1, endLine: 50 }`\n' +
			'- Only imports: `{ file: "src/service.ts", rawContent: true, lineNumbers: true, target: "#imports" }`\n' +
			'- Import + symbol: `{ file: "src/service.ts", rawContent: true, lineNumbers: true, target: ["#imports", "UserService"] }`\n\n' +
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
						'Example: `{ file: "src/service.ts", rawContent: true, lineNumbers: true }`'
				);
				return;
			}
			if (params.lineNumbers === undefined) {
				response.appendResponseLine(
					'**Error:** `lineNumbers` is a required parameter.\n\n' +
						'- `lineNumbers: true` — Prefix each line with `[N]` (e.g. `[42] const x = 5`)\n' +
						'- `lineNumbers: false` — Plain content without line number prefixes\n\n' +
						'Example: `{ file: "src/service.ts", rawContent: true, lineNumbers: true }`'
				);
				return;
			}

			const rawContent = params.rawContent;
			const lineNumbers = params.lineNumbers;
			const recursive = params.recursive ?? false;

			// Normalize target to array
			let targets: string[] = [];
			if (params.target) {
				if (Array.isArray(params.target)) {
					targets = params.target as string[];
				} else if (typeof params.target === 'string' && params.target.startsWith('[')) {
					try {
						const parsed: unknown = JSON.parse(params.target);
						if (Array.isArray(parsed)) {
							targets = parsed.filter((item): item is string => typeof item === 'string');
						}
					} catch {
						targets = [params.target];
					}
				} else {
					targets = [params.target];
				}
			}

			const relativePath = path.relative(getClientWorkspace(), filePath).replaceAll('\\', '/');

			// ── Mutual exclusivity: target + startLine/endLine ─────
			// Treat 0 as "not specified" since lines are 1-indexed
			const hasLineRange = (params.startLine !== undefined && params.startLine !== 0) || (params.endLine !== undefined && params.endLine !== 0);
			if (targets.length > 0 && hasLineRange) {
				response.appendResponseLine('**Error:** `target` and `startLine`/`endLine` cannot be used together. ' + 'Use `target` to read specific symbols, or `startLine`/`endLine` to read a structured range.');
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
			if (hasLineRange && targets.length === 0) {
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

				const compressed = compressStructuredRangeOutput(structure, allLines, reqStart, reqEnd, !rawContent, lineNumbers);

				// Highlight source (yellow) and collapsed (grey + fold) ranges
				fileHighlightReadRange(filePath, compressed.actualStart - 1, compressed.actualEnd - 1, compressed.collapsedRanges, compressed.sourceRanges);

				if (compressed.compressed && compressed.label) {
					response.appendResponseLine(`Output compressed: ${compressed.label}.\n`);
				}
				response.appendResponseLine(compressed.output);
				return;
			}

			// ── Skeleton mode (no targets, no line range) ─────────────
			if (targets.length === 0 && !rawContent) {
				if (!structure) {
					response.appendResponseLine(`This file type does not support structured reading (skeleton mode). ` + `Use \`startLine\`/\`endLine\` for line-range reading, or set \`rawContent: true\` to read the full file.`);
					return;
				}

				// Focus the file in the client editor (full file range, 0-indexed)
				fileHighlightReadRange(filePath, 0, structure.totalLines - 1);

				const maxNesting = recursive ? getMaxSymbolNesting(structure.symbols) : 0;
				const result = compressSkeletonOutput(structure, allLines, maxNesting, lineNumbers);

				if (result.compressed && result.label) {
					response.appendResponseLine(`Output compressed: ${result.label}.\n`);
				}
				response.appendResponseLine(result.output);
				return;
			}

			// ── Full file mode (no targets, rawContent, no line range) ──
			if (targets.length === 0) {
				const content = await fileReadContent(filePath);
				fileHighlightReadRange(filePath, content.startLine, content.endLine);

				const result = compressFullFileOutput(content.content, structure, allLines, content.startLine + 1, lineNumbers);

				if (result.compressed && result.label) {
					response.appendResponseLine(`Output compressed: ${result.label}.\n`);
				}
				response.appendResponseLine(result.output);
				return;
			}

			// ── Targets mode ─────────────────────────────────────────

			// Targets require structured extraction
			if (!structure) {
				response.appendResponseLine(`This file type does not support structured reading (target mode). ` + `Use \`startLine\`/\`endLine\` for line-range reading, or omit all parameters to read the full file.`);
				return;
			}

			for (const target of targets) {
				if (isSpecialTarget(target)) {
					// Handle special keywords: #imports, #exports, #comments
					const categoryFilter = target === '#imports' ? 'import' : target === '#exports' ? 'export' : 'comment';
					const items = structure.orphaned.items.filter((i) => i.category === categoryFilter);

					// Focus the file in the client editor for special targets
					if (items.length > 0) {
						const firstStart = items[0].range.start - 1;
						const lastEnd = items[items.length - 1].range.end - 1;
						fileHighlightReadRange(filePath, firstStart, lastEnd);
					}

					if (!rawContent) {
						for (const item of items) {
							const entries = formatSkeletonEntry(item, '', 0);
							for (const entry of entries) response.appendResponseLine(entry);
						}
					} else {
						for (const item of items) {
							// For inline exports (export class/function/interface/etc.), only show the
							// declaration header line rather than dumping the entire body
							const isInlineExport = item.kind === 'inline-export';
							const displayEnd = isInlineExport ? item.range.start : item.range.end;
							const numbered = addLineNumbers(getContentSlice(allLines, item.range.start, displayEnd), item.range.start, lineNumbers);
							response.appendResponseLine(numbered);
						}
					}
				} else {
					// Symbol targeting (1-indexed ranges)
					const match = resolveSymbolTarget(structure.symbols, target);

					if (!match) {
						const available = structure.symbols.map((s) => `${s.kind} ${s.name}`).join(', ');
						response.appendResponseLine(`"${target}": Not found. Available: ${available || 'none'}`);

						// Check if the target exists as a nested child and suggest qualified path
						const qualifiedPaths = findQualifiedPaths(structure.symbols, target);
						if (qualifiedPaths.length > 0) {
							const suggestions = qualifiedPaths.map((p) => `"${p}"`).join(', ');
							response.appendResponseLine(`Hint: Did you mean ${suggestions}? Use the qualified dot-path to target nested symbols.`);
						}
						continue;
					}

					const { symbol } = match;
					const { startLine } = symbol.range;
					const { endLine } = symbol.range;

					if (!rawContent) {
						// Focus the symbol range in the client editor (convert 1-indexed to 0-indexed)
						fileHighlightReadRange(filePath, startLine - 1, endLine - 1);

						const maxNesting = recursive ? getSymbolTreeDepth(symbol) : 0;
						const result = compressTargetSkeleton(symbol, maxNesting);
						if (result.compressed && result.label) {
							response.appendResponseLine(`Output compressed: ${result.label}.\n`);
						}
						response.appendResponseLine(result.output);
					} else {
						// Highlight in editor (convert 1-indexed to 0-indexed for VS Code)
						fileHighlightReadRange(filePath, startLine - 1, endLine - 1);

						const result = compressTargetContent(symbol, allLines, structure, recursive, lineNumbers);
						if (result.compressed && result.label) {
							response.appendResponseLine(`Output compressed: ${result.label}.\n`);
						}
						response.appendResponseLine(result.output);
					}
				}
			}
		},
		name: 'file_read',
		schema: {
			file: zod.string().describe('Path to file (relative to workspace root or absolute).'),
			lineNumbers: zod.boolean().describe('true = prefix each content line with [N], false = plain content. REQUIRED.'),
			rawContent: zod.boolean().describe('true = source code content, false = skeleton (names + line ranges). REQUIRED.'),
			recursive: zod.boolean().optional().describe('true = expand children, false = show placeholders (default).'),
			target: zod
				.string()
				.optional()
				.describe('What to read. Can be symbol names ("UserService.findById"), special keywords ' + '("#imports", "#exports", "#comments"), or a JSON array of multiple targets ' + '(e.g. \'["#imports", "UserService"]\').'),
			// Structured range parameters (mutually exclusive with target)
			endLine: zod.number().int().optional().describe('End line (1-indexed) for structured range reading. If omitted with startLine, reads to end of file.'),
			startLine: zod
				.number()
				.int()
				.optional()
				.describe('Start line (1-indexed) for structured range reading. Shows raw source for non-symbols, ' + 'collapsed stubs for symbols. Cannot be used with target.')
		}
	});
