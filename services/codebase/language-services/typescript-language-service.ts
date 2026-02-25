// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Wraps the existing ts-morph file-structure-extractor in the LanguageService interface.

import type { ExtractedSymbol, ExtractedSymbolRange } from '../file-structure-extractor';
import type { LanguageService } from '../language-service-registry';
import type { FileStructure, FileSymbol, FileSymbolRange } from '../types';
import type { SymbolNode } from '../types';
import type { CommentNode } from '@packages/tfidf';

import { getIdentifiers } from '@packages/tfidf';
import { extractFileStructure as extractTsMorphStructure } from '../file-structure-extractor';

const TS_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs'] as const;

/**
 * Extract raw text from file content by 1-indexed line range.
 */
function extractTextFromRange(content: string, startLine: number, endLine: number): string {
	const lines = content.split('\n');
	return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Convert FileSymbol containers into CommentNode inputs for TF-IDF scoring.
 */
function toCommentNodes(containers: FileSymbol[], content: string): CommentNode[] {
	return containers.map((c) => ({
		kind: c.kind,
		range: { startLine: c.range.startLine, endLine: c.range.endLine },
		text: extractTextFromRange(content, c.range.startLine, c.range.endLine)
	}));
}

function convertRange(range: ExtractedSymbolRange): FileSymbolRange {
	return {
		endChar: range.endChar,
		endLine: range.endLine,
		startChar: range.startChar,
		startLine: range.startLine
	};
}

function convertSymbol(sym: ExtractedSymbol): FileSymbol {
	return {
		children: sym.children.map(convertSymbol),
		detail: sym.detail,
		exported: sym.exported,
		kind: sym.kind,
		modifiers: sym.modifiers,
		name: sym.name,
		range: convertRange(sym.range)
	};
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Build multiple leaf container symbols by splitting nodes into contiguous groups.
 * Nodes on consecutive lines belong to the same group; any gap starts a new container.
 * Containers are childless stubs — use startLine/endLine to read the actual content.
 */
function buildContainerGroups(containerName: string, containerKind: string, nodes: SymbolNode[]): FileSymbol[] {
	if (nodes.length === 0) return [];

	const groups: SymbolNode[][] = [];
	let current: SymbolNode[] = [nodes[0]];

	for (let i = 1; i < nodes.length; i++) {
		const prev = current[current.length - 1];
		if (nodes[i].range.start <= prev.range.end + 1) {
			current.push(nodes[i]);
		} else {
			groups.push(current);
			current = [nodes[i]];
		}
	}
	groups.push(current);

	return groups.map((group) => ({
		children: [],
		kind: containerKind,
		name: slugify(group[0].name || containerName),
		range: {
			endLine: group[group.length - 1].range.end,
			startLine: group[0].range.start
		}
	}));
}

export class TypeScriptLanguageService implements LanguageService {
	readonly id = 'typescript';
	readonly name = 'TypeScript / JavaScript';
	readonly extensions = TS_EXTENSIONS;

	async extractStructure(filePath: string): Promise<FileStructure> {
		const result = extractTsMorphStructure(filePath);

		const containerSymbols: FileSymbol[] = [];

		// Build collapsed import groups with TF-IDF semantic identifiers
		const importContainers = buildContainerGroups('imports', 'imports', result.imports);
		if (importContainers.length > 0) {
			const importNodes = toCommentNodes(importContainers, result.content);
			const importIds = getIdentifiers(filePath, result.content, importNodes);
			for (let i = 0; i < importContainers.length; i++) {
				if (importIds[i]?.slug) {
					importContainers[i] = { ...importContainers[i], name: importIds[i].slug };
				}
			}
		}
		containerSymbols.push(...importContainers);

		// Filter out inline exports — they duplicate symbols that already have exported=true.
		// An export is "inline" if its line range overlaps with any code symbol's range
		// (e.g. "export function activate" is both an export and a function symbol).
		// Keep only standalone exports (re-export, named-export, export default expr, etc.)
		// that don't overlap with any symbol.
		const symbolRangeSet = new Set<number>();
		for (const sym of result.symbols) {
			for (let line = sym.range.startLine; line <= sym.range.endLine; line++) {
				symbolRangeSet.add(line);
			}
		}
		const standaloneExports = result.exports.filter((e) => !symbolRangeSet.has(e.range.start));
		const exportContainers = buildContainerGroups('exports', 'exports', standaloneExports);
		if (exportContainers.length > 0) {
			const exportNodes = toCommentNodes(exportContainers, result.content);
			const exportIds = getIdentifiers(filePath, result.content, exportNodes);
			for (let i = 0; i < exportContainers.length; i++) {
				if (exportIds[i]?.slug) {
					exportContainers[i] = { ...exportContainers[i], name: exportIds[i].slug };
				}
			}
		}
		containerSymbols.push(...exportContainers);

		// Split orphan comments into jsdoc, tsdoc, and generic comments
		const jsdocNodes = result.orphanComments.filter((c) => c.kind === 'jsdoc');
		const tsdocNodes = result.orphanComments.filter((c) => c.kind === 'tsdoc');
		const genericCommentNodes = result.orphanComments.filter((c) => c.kind !== 'jsdoc' && c.kind !== 'tsdoc');

		// Build container groups for each comment category and assign TF-IDF identifiers
		const commentCategories: Array<{ kind: string; nodes: SymbolNode[] }> = [
			{ kind: 'jsdoc', nodes: jsdocNodes },
			{ kind: 'tsdoc', nodes: tsdocNodes },
			{ kind: 'comment', nodes: genericCommentNodes },
		];

		for (const { kind, nodes } of commentCategories) {
			const containers = buildContainerGroups(kind, kind, nodes);
			if (containers.length > 0) {
				const commentNodes = toCommentNodes(containers, result.content);
				const identifiers = getIdentifiers(filePath, result.content, commentNodes);
				for (let i = 0; i < containers.length; i++) {
					if (identifiers[i]?.slug) {
						containers[i] = { ...containers[i], name: identifiers[i].slug };
					}
				}
			}
			containerSymbols.push(...containers);
		}

		const directiveContainers = buildContainerGroups('directives', 'directives', result.directives);
		if (directiveContainers.length > 0) {
			const directiveNodes = toCommentNodes(directiveContainers, result.content);
			const directiveIds = getIdentifiers(filePath, result.content, directiveNodes);
			for (let i = 0; i < directiveContainers.length; i++) {
				if (directiveIds[i]?.slug) {
					directiveContainers[i] = { ...directiveContainers[i], name: directiveIds[i].slug };
				}
			}
		}
		containerSymbols.push(...directiveContainers);

		const codeSymbols = result.symbols.map(convertSymbol);

		// Merge container symbols into the symbol list, sorted by source position
		const allSymbols = [...containerSymbols, ...codeSymbols];
		allSymbols.sort((a, b) => a.range.startLine - b.range.startLine);

		return {
			content: result.content,
			fileType: 'typescript',
			gaps: result.gaps,
			stats: {
				coveragePercent: result.stats.coveragePercent,
				totalBlankLines: result.stats.totalBlankLines,
				totalSymbols: countSymbols(result.symbols) + containerSymbols.length
			},
			symbols: allSymbols,
			totalLines: result.totalLines
		};
	}
}

function countSymbols(symbols: ExtractedSymbol[]): number {
	let count = 0;
	for (const sym of symbols) {
		count += 1;
		if (sym.children.length > 0) {
			count += countSymbols(sym.children);
		}
	}
	return count;
}
