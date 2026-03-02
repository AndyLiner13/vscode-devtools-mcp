/**
 * Phase 3, Item 6 — Cross-file reference resolver.
 *
 * Resolves reference count and per-file reference locations for any named symbol.
 * Excludes the definition itself; includes same-file usages.
 */
import { Node } from 'ts-morph';

import type { References, FileReference } from './types.js';

export type { References, FileReference } from './types.js';

/**
 * Resolve cross-file references for a symbol.
 *
 * @param node - The ts-morph AST node for the declaration.
 * @returns References with totalCount, fileCount, and per-file breakdown (absolute paths).
 */
export function resolveReferences(node: Node): References {
	const definitionLine = node.getStartLineNumber();
	const definitionFile = node.getSourceFile().getFilePath();

	const refNodes = 'findReferencesAsNodes' in node
		? (node as unknown as { findReferencesAsNodes(): import('ts-morph').Node[] }).findReferencesAsNodes()
		: [];
	const fileMap = new Map<string, { absolutePath: string; lines: Set<number> }>();

	for (const refNode of refNodes) {
		const refFile = refNode.getSourceFile();
		const refPath = refFile.getFilePath();

		if (refPath.endsWith('.d.ts') || refPath.includes('node_modules')) continue;

		const refLine = refNode.getStartLineNumber();

		if (refPath === definitionFile && refLine === definitionLine) continue;

		const existing = fileMap.get(refPath);
		if (existing) {
			existing.lines.add(refLine);
		} else {
			fileMap.set(refPath, { absolutePath: refPath, lines: new Set([refLine]) });
		}
	}

	const files: FileReference[] = [];
	let totalCount = 0;

	const sortedEntries = [...fileMap.entries()].sort(([a], [b]) => a.localeCompare(b));

	for (const [, { absolutePath, lines }] of sortedEntries) {
		const sortedLines = [...lines].sort((a, b) => a - b);
		files.push({ filePath: absolutePath, lines: sortedLines });
		totalCount += sortedLines.length;
	}

	return {
		totalCount,
		fileCount: files.length,
		files,
	};
}
