// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Shared utility for populating referenceCount/implementationCount on symbols
// using the workspace TypeScript project's language service.

import type { Node, SourceFile } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';

import type { ExtractedSymbol } from './file-structure-extractor';
import type { SymbolNode } from './types';

/**
 * Build a Map from "name:line" → identifier Node for efficient symbol matching.
 * Reused by both overview-service (SymbolNode) and file-structure-extractor (ExtractedSymbol).
 */
export function buildIdentifierMap(sourceFile: SourceFile): Map<string, Node> {
	const map = new Map<string, Node>();
	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	for (const ident of identifiers) {
		const key = `${ident.getText()}:${ident.getStartLineNumber()}`;
		if (!map.has(key)) {
			map.set(key, ident);
		}
	}
	return map;
}

/**
 * Populate referenceCount/implementationCount on SymbolNode trees.
 * Used by overview-service for codebase_map.
 */
export function populateSymbolNodeRefs(
	symbols: SymbolNode[],
	sourceFile: SourceFile,
	identMap: Map<string, Node>,
	langSvc: ReturnType<SourceFile['getProject']>['getLanguageService'] extends () => infer R ? R : never
): void {
	for (const sym of symbols) {
		if (sym.name !== 'constructor' && !sym.name.startsWith('<')) {
			try {
				const key = `${sym.name}:${sym.range.start}`;
				const identNode = identMap.get(key);
				if (identNode) {
					const refs = langSvc.findReferencesAsNodes(identNode);
					sym.referenceCount = Math.max(0, refs.length - 1);

					const impls = langSvc.compilerObject.getImplementationAtPosition(
						sourceFile.getFilePath(), identNode.getStart()
					);
					sym.implementationCount = impls ? impls.length : 0;
				}
			} catch {
				// Skip symbols that can't be resolved
			}
		}

		if (sym.children) {
			populateSymbolNodeRefs(sym.children, sourceFile, identMap, langSvc);
		}
	}
}

/**
 * Populate referenceCount/implementationCount on ExtractedSymbol trees.
 * Used by file-structure-extractor for file_read.
 */
export function populateExtractedSymbolRefs(
	symbols: ExtractedSymbol[],
	sourceFile: SourceFile,
	identMap: Map<string, Node>,
	langSvc: ReturnType<SourceFile['getProject']>['getLanguageService'] extends () => infer R ? R : never
): void {
	for (const sym of symbols) {
		if (sym.name !== 'constructor' && !sym.name.startsWith('<')) {
			try {
				const key = `${sym.name}:${sym.range.startLine}`;
				const identNode = identMap.get(key);
				if (identNode) {
					const refs = langSvc.findReferencesAsNodes(identNode);
					sym.referenceCount = Math.max(0, refs.length - 1);

					const impls = langSvc.compilerObject.getImplementationAtPosition(
						sourceFile.getFilePath(), identNode.getStart()
					);
					sym.implementationCount = impls ? impls.length : 0;
				}
			} catch {
				// Skip symbols that can't be resolved
			}
		}

		if (sym.children.length > 0) {
			populateExtractedSymbolRefs(sym.children, sourceFile, identMap, langSvc);
		}
	}
}
