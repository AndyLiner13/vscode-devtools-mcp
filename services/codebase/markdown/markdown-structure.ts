// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure Node.js — orchestrates markdown parsing into FileStructure.

import type { FileStructure, FileSymbol } from '../types';

import { readFileText } from '../file-utils';
import { parseMarkdown } from './markdown-parser';
import { MD_KINDS } from './markdown-types';

// ── Internal Types ───────────────────────────────────────

interface DetectedItem {
	kind: string;
	name: string;
	range: { start: number; end: number };
}

// ── Public API ───────────────────────────────────────────

/**
 * Extract a full FileStructure from a Markdown file.
 * Produces symbols (including container symbols for comments, footnotes, linkdefs), gaps, and stats.
 */
export function extractMarkdownStructure(filePath: string): FileStructure {
	const { text } = readFileText(filePath);
	return extractMarkdownStructureFromText(text);
}

/**
 * Extract FileStructure from Markdown text (for testing or in-memory usage).
 */
function extractMarkdownStructureFromText(text: string): FileStructure {
	const allSymbols = parseMarkdown(text);
	const lines = text.split('\n');
	const totalLines = lines.length;

	// Separate root-level HTML comments from structural symbols
	const { commentItems, symbols } = extractRootHtmlComments(allSymbols);

	// Detect footnotes and linkdefs in uncovered lines
	const extraItems = detectExtraContent(symbols, commentItems, lines, totalLines);

	// Group detected items into container symbols
	const containerSymbols = buildContainerSymbols([...commentItems, ...extraItems]);

	// Merge container symbols into symbol list, sorted by source position
	const allMerged = [...containerSymbols, ...symbols];
	allMerged.sort((a, b) => a.range.startLine - b.range.startLine);

	const gaps = computeGaps(allMerged, totalLines);
	const stats = computeStats(allMerged, lines);

	return {
		content: text,
		fileType: 'markdown',
		gaps,
		stats,
		symbols: allMerged,
		totalLines
	};
}

// ── Content Detection ────────────────────────────────────

/**
 * Extract root-level HTML comments from the symbol list.
 * These become children of a "comments" container symbol.
 */
function extractRootHtmlComments(allSymbols: FileSymbol[]): {
	symbols: FileSymbol[];
	commentItems: DetectedItem[];
} {
	const symbols: FileSymbol[] = [];
	const commentItems: DetectedItem[] = [];

	for (const sym of allSymbols) {
		if (sym.kind === MD_KINDS.html && sym.name === 'comment') {
			commentItems.push({
				kind: 'comment',
				name: sym.name,
				range: { end: sym.range.endLine, start: sym.range.startLine }
			});
		} else {
			symbols.push(sym);
		}
	}

	return { commentItems, symbols };
}

function detectExtraContent(symbols: FileSymbol[], existingItems: DetectedItem[], lines: string[], totalLines: number): DetectedItem[] {
	const detected: DetectedItem[] = [];

	const coveredLines = new Set<number>();
	for (const sym of symbols) {
		for (let i = sym.range.startLine; i <= sym.range.endLine; i++) {
			coveredLines.add(i);
		}
	}
	for (const item of existingItems) {
		for (let i = item.range.start; i <= item.range.end; i++) {
			coveredLines.add(i);
		}
	}

	let i = 1;
	while (i <= totalLines) {
		if (coveredLines.has(i)) {
			i++;
			continue;
		}

		const line = lines[i - 1];

		const footnoteMatch = /^\[\^([^\]]+)\]:\s*(.*)/.exec(line);
		if (footnoteMatch) {
			detected.push({
				kind: 'footnote',
				name: `[^${footnoteMatch[1]}]`,
				range: { end: i, start: i }
			});
			i++;
			continue;
		}

		const linkDefMatch = /^\[([^\]^][^\]]*)\]:\s+\S+/.exec(line);
		if (linkDefMatch) {
			detected.push({
				kind: 'linkdef',
				name: `[${linkDefMatch[1]}]`,
				range: { end: i, start: i }
			});
			i++;
			continue;
		}

		i++;
	}

	return detected;
}

// ── Container Symbol Builder ─────────────────────────────

/**
 * Group detected items by kind into container FileSymbol nodes.
 * Each container (e.g. "comments", "footnotes") spans from its first to last child.
 */
function buildContainerSymbols(items: DetectedItem[]): FileSymbol[] {
	const byKind = new Map<string, DetectedItem[]>();
	for (const item of items) {
		const group = byKind.get(item.kind) ?? [];
		group.push(item);
		byKind.set(item.kind, group);
	}

	// Map individual kinds to container names (plural)
	const kindToContainer: Record<string, string> = {
		comment: 'comments',
		footnote: 'footnotes',
		linkdef: 'linkdefs'
	};

	const containers: FileSymbol[] = [];
	for (const [kind, group] of byKind) {
		if (group.length === 0) continue;

		const containerName = kindToContainer[kind] ?? `${kind}s`;
		const children: FileSymbol[] = group.map((g) => ({
			children: [],
			kind: g.kind,
			name: g.name,
			range: { endLine: g.range.end, startLine: g.range.start }
		}));

		containers.push({
			children,
			kind: containerName,
			name: containerName,
			range: {
				endLine: group[group.length - 1].range.end,
				startLine: group[0].range.start
			}
		});
	}

	return containers;
}

// ── Gap Computation ──────────────────────────────────────

function computeGaps(symbols: FileSymbol[], totalLines: number): Array<{ start: number; end: number; type: 'blank' | 'unknown' }> {
	const covered = new Set<number>();

	const markSymbol = (sym: FileSymbol): void => {
		for (let i = sym.range.startLine; i <= sym.range.endLine; i++) {
			covered.add(i);
		}
		for (const child of sym.children) {
			markSymbol(child);
		}
	};
	for (const sym of symbols) markSymbol(sym);

	const gaps: Array<{ start: number; end: number; type: 'blank' | 'unknown' }> = [];
	let gapStart: number | undefined;

	for (let line = 1; line <= totalLines; line++) {
		if (!covered.has(line)) {
			if (gapStart === undefined) gapStart = line;
		} else {
			if (gapStart !== undefined) {
				gaps.push({ end: line - 1, start: gapStart, type: 'blank' });
				gapStart = undefined;
			}
		}
	}
	if (gapStart !== undefined) {
		gaps.push({ end: totalLines, start: gapStart, type: 'blank' });
	}

	return gaps;
}

// ── Stats ────────────────────────────────────────────────

function computeStats(symbols: FileSymbol[], lines: string[]): { totalSymbols: number; totalBlankLines: number; coveragePercent: number } {
	const totalLines = lines.length;
	let totalSymbols = 0;

	const countSymbols = (syms: FileSymbol[]): void => {
		for (const sym of syms) {
			totalSymbols++;
			countSymbols(sym.children);
		}
	};
	countSymbols(symbols);

	let blankLines = 0;
	for (const line of lines) {
		if (line.trim() === '') blankLines++;
	}

	const covered = new Set<number>();
	const markSymbol = (sym: FileSymbol): void => {
		for (let i = sym.range.startLine; i <= sym.range.endLine; i++) {
			covered.add(i);
		}
		for (const child of sym.children) {
			markSymbol(child);
		}
	};
	for (const sym of symbols) markSymbol(sym);

	const coveragePercent = totalLines > 0 ? Math.round((covered.size / totalLines) * 100) : 100;

	return {
		coveragePercent,
		totalBlankLines: blankLines,
		totalSymbols
	};
}
