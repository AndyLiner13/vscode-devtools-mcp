/**
 * Phase 3, Item 6 — Cross-file reference resolver.
 *
 * Resolves reference count and per-file reference locations for any named symbol.
 * Excludes the definition itself; includes same-file usages.
 */
import { Node } from 'ts-morph';
import { toRelativePosixPath } from './paths.js';

import type { References, FileReference } from './types.js';
import type { SymbolTarget } from '../shared/types.js';

export type { References, FileReference } from './types.js';

/**
 * Resolve cross-file references for a symbol.
 *
 * @param target        - Pre-located SymbolTarget from the node locator.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns References with totalCount, fileCount, and per-file breakdown.
 */
export function resolveReferences(
	target: SymbolTarget,
	workspaceRoot: string,
): References {
	const definitionLine = target.startLine;
	const definitionFile = target.sourceFile.getFilePath();

	const refNodes = target.node.findReferencesAsNodes();
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
		const relativePath = toRelativePosixPath(workspaceRoot, absolutePath);
		const sortedLines = [...lines].sort((a, b) => a - b);
		files.push({ filePath: relativePath, lines: sortedLines });
		totalCount += sortedLines.length;
	}

	return {
		totalCount,
		fileCount: files.length,
		files,
	};
}
