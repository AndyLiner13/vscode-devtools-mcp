// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Wraps the existing ts-morph file-structure-extractor in the LanguageService interface.

import type { ExtractedSymbol, ExtractedSymbolRange } from '../file-structure-extractor';
import type { LanguageService } from '../language-service-registry';
import type { FileStructure, FileSymbol, FileSymbolRange, OrphanedCategory, OrphanedItem } from '../types';
import type { SymbolNode } from '../types';

import { extractFileStructure as extractTsMorphStructure } from '../file-structure-extractor';

const TS_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs'] as const;

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

function convertOrphaned(node: SymbolNode, category: OrphanedCategory): OrphanedItem {
	return {
		category,
		children: node.children?.map((c) => convertOrphaned(c, category)),
		detail: node.detail,
		kind: node.kind,
		name: node.name,
		range: { end: node.range.end, start: node.range.start }
	};
}

export class TypeScriptLanguageService implements LanguageService {
	readonly id = 'typescript';
	readonly name = 'TypeScript / JavaScript';
	readonly extensions = TS_EXTENSIONS;

	async extractStructure(filePath: string): Promise<FileStructure> {
		const result = extractTsMorphStructure(filePath);

		const orphanedItems: OrphanedItem[] = [
			...result.imports.map((n) => convertOrphaned(n, 'import')),
			...result.exports.map((n) => convertOrphaned(n, 'export')),
			...result.orphanComments.map((n) => convertOrphaned(n, 'comment')),
			...result.directives.map((n) => convertOrphaned(n, 'directive'))
		];

		return {
			content: result.content,
			fileType: 'typescript',
			gaps: result.gaps,
			orphaned: { items: orphanedItems },
			stats: {
				coveragePercent: result.stats.coveragePercent,
				totalBlankLines: result.stats.totalBlankLines,
				totalOrphaned: orphanedItems.length,
				totalSymbols: countSymbols(result.symbols)
			},
			symbols: result.symbols.map(convertSymbol),
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
