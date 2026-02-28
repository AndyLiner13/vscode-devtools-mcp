/**
 * Phase 4 — Identifier resolution engine.
 *
 * Given target symbol line ranges in a source file, resolves all identifiers
 * within those symbols to their declarations. If a declaration lives in the
 * same file, it's collected as a dependency. Resolution is recursive (full
 * transitive): dependencies of dependencies are resolved until fixpoint.
 */
import {
	Project,
	SyntaxKind,
	Node,
	type SourceFile,
	type Identifier,
	type ImportDeclaration,
} from 'ts-morph';

import type { CodeChunk } from '../chunker/types.js';
import type { ResolvedDependency, ResolutionResult, DependencyKind } from './types.js';

/**
 * Resolve all same-file dependencies for a set of target chunks.
 *
 * Uses the TypeScript compiler to walk every identifier in each target's AST,
 * resolve it to its declaration, and collect same-file declarations. Then
 * recursively resolves identifiers in those collected declarations until no
 * new declarations are discovered (fixpoint).
 *
 * @param project   - ts-morph Project with the file added.
 * @param filePath  - Absolute path of the file containing the targets.
 * @param targets   - CodeChunks representing the target symbols.
 * @returns Resolution result with deduplicated dependencies and target ranges.
 */
export function resolveIdentifiers(
	project: Project,
	filePath: string,
	targets: CodeChunk[],
): ResolutionResult {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const fileText = sourceFile.getFullText();
	const fileLines = fileText.split('\n');

	const targetRanges = targets.map(t => ({
		startLine: t.startLine,
		endLine: t.endLine,
	}));

	// Track collected declarations by their start line to deduplicate
	const collectedByLine = new Map<number, ResolvedDependency>();

	// Lines that belong to target symbols — never collect these as dependencies
	const targetLineSet = new Set<number>();
	for (const range of targetRanges) {
		for (let line = range.startLine; line <= range.endLine; line++) {
			targetLineSet.add(line);
		}
	}

	// Seed: resolve identifiers in each target's line range
	const pendingRanges: Array<{ startLine: number; endLine: number }> = [...targetRanges];
	const visitedRanges = new Set<string>();

	// Mark target ranges as visited so they're never re-resolved
	for (const range of targetRanges) {
		visitedRanges.add(`${range.startLine}:${range.endLine}`);
	}

	// Fixpoint loop: resolve identifiers in pending ranges until stable
	while (pendingRanges.length > 0) {
		const range = pendingRanges.pop()!;
		const newDeps = resolveIdentifiersInRange(
			sourceFile,
			fileLines,
			range.startLine,
			range.endLine,
			targetLineSet,
			collectedByLine,
		);

		// Queue newly discovered dependencies for recursive resolution
		for (const dep of newDeps) {
			const key = `${dep.startLine}:${dep.endLine}`;
			if (!visitedRanges.has(key)) {
				visitedRanges.add(key);
				pendingRanges.push({ startLine: dep.startLine, endLine: dep.endLine });
			}
		}
	}

	// Also resolve the class/interface wrapper if targets are class members
	resolveParentWrappers(sourceFile, fileLines, targets, targetLineSet, collectedByLine);

	const dependencies = [...collectedByLine.values()];
	dependencies.sort((a, b) => a.startLine - b.startLine);

	return { dependencies, targetRanges };
}

/**
 * Walk all identifiers in a line range and collect same-file declarations.
 * Returns only NEW dependencies (not previously collected).
 */
function resolveIdentifiersInRange(
	sourceFile: SourceFile,
	fileLines: string[],
	startLine: number,
	endLine: number,
	targetLineSet: Set<number>,
	collectedByLine: Map<number, ResolvedDependency>,
): ResolvedDependency[] {
	const newDeps: ResolvedDependency[] = [];

	const identifiers = collectIdentifiersInRange(sourceFile, startLine, endLine);

	for (const identifier of identifiers) {
		const declarations = resolveToDeclarations(identifier);

		for (const decl of declarations) {
			const declFile = decl.getSourceFile();
			if (declFile !== sourceFile) continue;

			const declStartLine = decl.getStartLineNumber();

			// Skip if this declaration is inside a target symbol
			if (targetLineSet.has(declStartLine)) continue;

			// Skip if already collected
			if (collectedByLine.has(declStartLine)) continue;

			const dep = buildDependency(decl, fileLines);
			if (dep) {
				collectedByLine.set(declStartLine, dep);
				newDeps.push(dep);
			}
		}
	}

	return newDeps;
}

/**
 * Collect all Identifier nodes within a specific line range of a source file.
 */
function collectIdentifiersInRange(
	sourceFile: SourceFile,
	startLine: number,
	endLine: number,
): Identifier[] {
	const identifiers: Identifier[] = [];

	sourceFile.forEachDescendant((node) => {
		if (!Node.isIdentifier(node)) return;

		const line = node.getStartLineNumber();
		if (line >= startLine && line <= endLine) {
			identifiers.push(node);
		}
	});

	return identifiers;
}

/**
 * Resolve an identifier to its declaration node(s).
 * Handles property accesses, type references, and import specifiers.
 */
function resolveToDeclarations(identifier: Identifier): Node[] {
	const declarations: Node[] = [];

	try {
		const symbol = identifier.getSymbol();
		if (symbol) {
			for (const decl of symbol.getDeclarations()) {
				declarations.push(decl);
			}
		}
	} catch {
		// Some identifiers can't be resolved (e.g., in broken code)
	}

	// If the identifier is part of a property access on `this`, climb to
	// the property access expression and resolve that
	if (declarations.length === 0) {
		try {
			const parent = identifier.getParent();
			if (parent && Node.isPropertyAccessExpression(parent)) {
				const nameNode = parent.getNameNode();
				if (nameNode) {
					const sym = nameNode.getSymbol();
					if (sym) {
						for (const decl of sym.getDeclarations()) {
							declarations.push(decl);
						}
					}
				}
			}
		} catch {
			// Ignore resolution failures
		}
	}

	return declarations;
}

/**
 * Build a ResolvedDependency from a declaration node.
 * Returns null for declarations that shouldn't be included (e.g., parameters).
 */
function buildDependency(
	decl: Node,
	fileLines: string[],
): ResolvedDependency | null {
	// Walk up to the meaningful declaration level
	const topLevel = findTopLevelDeclaration(decl);
	if (!topLevel) return null;

	const startLine = topLevel.getStartLineNumber();
	const endLine = topLevel.getEndLineNumber();
	const sourceText = fileLines.slice(startLine - 1, endLine).join('\n');
	const kind = classifyDeclaration(topLevel);

	return { startLine, endLine, kind, sourceText };
}

/**
 * Walk up from a declaration node to the top-level declaration.
 * For import specifiers → the full ImportDeclaration.
 * For class properties → the PropertyDeclaration.
 * For variable declarators → the VariableStatement.
 * Returns null for parameter declarations and other non-includable nodes.
 */
function findTopLevelDeclaration(node: Node): Node | null {
	// Import specifier → import declaration  
	if (Node.isImportSpecifier(node) || Node.isImportClause(node) || Node.isNamespaceImport(node)) {
		const importDecl = node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
		return importDecl ?? null;
	}

	// Import declaration itself
	if (Node.isImportDeclaration(node)) {
		return node;
	}

	// Variable declarator → variable statement
	if (Node.isVariableDeclaration(node)) {
		const statement = node.getFirstAncestorByKind(SyntaxKind.VariableStatement);
		return statement ?? node;
	}

	// Parameter declaration — never include as a dependency
	if (Node.isParameterDeclaration(node)) {
		return null;
	}

	// Binding elements (destructuring) — walk up to variable statement
	if (Node.isBindingElement(node)) {
		const statement = node.getFirstAncestorByKind(SyntaxKind.VariableStatement);
		return statement ?? null;
	}

	// Type alias, interface, enum, class, function — already at the right level
	if (
		Node.isTypeAliasDeclaration(node)
		|| Node.isInterfaceDeclaration(node)
		|| Node.isEnumDeclaration(node)
		|| Node.isClassDeclaration(node)
		|| Node.isFunctionDeclaration(node)
	) {
		return node;
	}

	// Property declarations (class members)
	if (Node.isPropertyDeclaration(node) || Node.isPropertySignature(node)) {
		return node;
	}

	// Method/accessor/constructor — include the declaration itself
	if (
		Node.isMethodDeclaration(node)
		|| Node.isGetAccessorDeclaration(node)
		|| Node.isSetAccessorDeclaration(node)
		|| Node.isConstructorDeclaration(node)
	) {
		return node;
	}

	// Enum member — include the whole enum
	if (Node.isEnumMember(node)) {
		const enumDecl = node.getFirstAncestorByKind(SyntaxKind.EnumDeclaration);
		return enumDecl ?? node;
	}

	// Shorthand property assignment, spread, etc. — skip
	return null;
}

/**
 * Classify a declaration node into a DependencyKind.
 */
function classifyDeclaration(node: Node): DependencyKind {
	if (Node.isImportDeclaration(node)) {
		const text = node.getText();
		return text.includes('import type') ? 'type-import' : 'import';
	}

	if (Node.isTypeAliasDeclaration(node)) return 'type-alias';
	if (Node.isInterfaceDeclaration(node)) return 'interface';
	if (Node.isEnumDeclaration(node)) return 'enum';
	if (Node.isClassDeclaration(node)) return 'class-declaration';
	if (Node.isFunctionDeclaration(node)) return 'function';
	if (Node.isPropertyDeclaration(node) || Node.isPropertySignature(node)) return 'class-property';

	if (Node.isVariableStatement(node)) {
		const text = node.getText();
		return text.trimStart().startsWith('const') ? 'constant' : 'variable';
	}

	return 'other';
}

/**
 * If target chunks are class/interface members, include the class/interface
 * declaration wrapper (just the declaration line, not the entire body).
 */
function resolveParentWrappers(
	sourceFile: SourceFile,
	fileLines: string[],
	targets: CodeChunk[],
	targetLineSet: Set<number>,
	collectedByLine: Map<number, ResolvedDependency>,
): void {
	for (const target of targets) {
		if (target.parentName === null) continue;

		// Find the parent class/interface declaration
		const parentNode = findParentDeclaration(sourceFile, target.parentName);
		if (!parentNode) continue;

		const parentStartLine = parentNode.getStartLineNumber();

		// Skip if already collected or is a target itself
		if (collectedByLine.has(parentStartLine) || targetLineSet.has(parentStartLine)) continue;

		// We only need the class declaration wrapper — not its full body.
		// This is handled in the snapshot renderer: the class-declaration
		// dependency tells it to emit the class wrapper around members.
		const dep: ResolvedDependency = {
			startLine: parentStartLine,
			endLine: parentNode.getEndLineNumber(),
			kind: 'class-declaration',
			sourceText: parentNode.getText(),
		};
		collectedByLine.set(parentStartLine, dep);
	}
}

/**
 * Find a class or interface declaration by name in the source file.
 */
function findParentDeclaration(sourceFile: SourceFile, name: string): Node | null {
	for (const cls of sourceFile.getClasses()) {
		if (cls.getName() === name) return cls;
	}
	for (const iface of sourceFile.getInterfaces()) {
		if (iface.getName() === name) return iface;
	}
	return null;
}
