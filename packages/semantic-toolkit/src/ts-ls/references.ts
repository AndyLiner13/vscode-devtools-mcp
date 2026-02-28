/**
 * Phase 3, Item 6 — Cross-file reference resolver.
 *
 * Resolves reference count and per-file reference locations for any named symbol.
 * Excludes the definition itself; includes same-file usages.
 */
import { Project, Node } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import * as path from 'node:path';

import type { References, FileReference } from './types';

export type { References, FileReference } from './types';

/**
 * Resolve cross-file references for a named symbol.
 *
 * Works for any named symbol: functions, classes, interfaces, methods,
 * type aliases, variables, enum members, etc.
 *
 * @param project       - ts-morph Project with all relevant source files added.
 * @param filePath      - Absolute path of the file containing the target symbol.
 * @param symbolName    - Name of the symbol to find references for.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns References with totalCount, fileCount, and per-file breakdown.
 */
export function resolveReferences(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
): References {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const declaration = findNamedDeclaration(sourceFile, symbolName);

	if (!declaration) {
		throw new Error(
			`Symbol "${symbolName}" not found in ${filePath}`,
		);
	}

	const definitionLine = declaration.getStartLineNumber();
	const definitionFile = declaration.getSourceFile().getFilePath();

	const refNodes = declaration.findReferencesAsNodes();
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
		const relativePath = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
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

// ---------------------------------------------------------------------------
// Symbol lookup — works for any named declaration
// ---------------------------------------------------------------------------

type NamedDeclarationNode = Node & { findReferencesAsNodes(): Node[] };

/**
 * Find any named declaration in a source file.
 * Searches: functions, classes, interfaces, type aliases, enums,
 * variable declarations, and class members (methods, properties).
 */
function findNamedDeclaration(
	sourceFile: SourceFile,
	name: string,
): NamedDeclarationNode | undefined {
	const fn = sourceFile.getFunction(name);
	if (fn) return fn;

	const cls = sourceFile.getClass(name);
	if (cls) return cls;

	const iface = sourceFile.getInterface(name);
	if (iface) return iface;

	const typeAlias = sourceFile.getTypeAlias(name);
	if (typeAlias) return typeAlias;

	const enumDecl = sourceFile.getEnum(name);
	if (enumDecl) return enumDecl;

	const varDecl = sourceFile.getVariableDeclaration(name);
	if (varDecl) return varDecl;

	for (const cls of sourceFile.getClasses()) {
		const method = cls.getMethod(name);
		if (method) return method;

		const prop = cls.getProperty(name);
		if (prop) return prop;
	}

	return undefined;
}
