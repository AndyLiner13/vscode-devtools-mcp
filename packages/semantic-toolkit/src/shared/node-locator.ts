/**
 * Shared node locator for the semantic-toolkit.
 *
 * Provides a single `locateNode` function that finds a ts-morph AST node
 * given a source file, a 1-indexed start line, and a symbol name.
 *
 * This replaces the 10+ independent `findDeclaration` / inline lookup
 * functions that were scattered across each ts-ls resolver. Every resolver
 * now receives a pre-located `SymbolTarget` instead of doing its own search.
 */
import { Node, SyntaxKind, type SourceFile, type Project } from 'ts-morph';

import type { SymbolTarget, AbsolutePath, RelativePath, NodeKind } from './types.js';

/**
 * Locate the declaration AST node at a specific line.
 *
 * Starts from the deepest node at the line's position and walks up the
 * AST to find the nearest declaration. This is O(depth) — no full-tree scan.
 *
 * @param sourceFile - ts-morph SourceFile to search.
 * @param startLine  - 1-indexed line where the declaration begins.
 * @param name       - Expected symbol name (used for validation).
 * @returns The declaration Node, or undefined if not found.
 */
export function locateNode(
	sourceFile: SourceFile,
	startLine: number,
	name: string,
): Node | undefined {
	const lineStarts = sourceFile.compilerNode.getLineStarts();
	const lineIndex = startLine - 1;
	if (lineIndex < 0 || lineIndex >= lineStarts.length) return undefined;

	const lineStart = lineStarts[lineIndex];
	const candidate = sourceFile.getDescendantAtPos(lineStart);
	if (!candidate) return undefined;

	return walkUpToDeclaration(candidate, name);
}

/**
 * Create a SymbolTarget from a ts-morph Project and chunk metadata.
 *
 * This is the bridge between the chunker's output (CodeChunk) and the
 * ts-ls resolvers' input (SymbolTarget). Called once in enrichWithMetadata.
 *
 * @param project      - ts-morph Project with source files loaded.
 * @param filePath     - Absolute path of the file containing the symbol.
 * @param relativePath - Workspace-relative path.
 * @param name         - Symbol name from the chunk.
 * @param kind         - NodeKind from the chunk.
 * @param startLine    - 1-indexed start line from the chunk.
 * @returns SymbolTarget or null if the node cannot be located.
 */
export function createSymbolTarget(
	project: Project,
	filePath: AbsolutePath,
	relativePath: RelativePath,
	name: string,
	kind: NodeKind,
	startLine: number,
): SymbolTarget | null {
	const sourceFile = project.getSourceFile(filePath);
	if (!sourceFile) return null;

	const node = locateNode(sourceFile, startLine, name);
	if (!node) return null;

	return {
		sourceFile,
		node,
		name,
		kind,
		startLine,
		filePath,
		relativePath,
	};
}

// ---------------------------------------------------------------------------
// Internal: walk up to declaration
// ---------------------------------------------------------------------------

const DECLARATION_KINDS = new Set<SyntaxKind>([
	SyntaxKind.FunctionDeclaration,
	SyntaxKind.ClassDeclaration,
	SyntaxKind.InterfaceDeclaration,
	SyntaxKind.TypeAliasDeclaration,
	SyntaxKind.EnumDeclaration,
	SyntaxKind.VariableDeclaration,
	SyntaxKind.VariableStatement,
	SyntaxKind.MethodDeclaration,
	SyntaxKind.MethodSignature,
	SyntaxKind.PropertyDeclaration,
	SyntaxKind.PropertySignature,
	SyntaxKind.GetAccessor,
	SyntaxKind.SetAccessor,
	SyntaxKind.Constructor,
	SyntaxKind.ModuleDeclaration,
	SyntaxKind.EnumMember,
	SyntaxKind.ExpressionStatement,
	SyntaxKind.ImportDeclaration,
	SyntaxKind.ExportDeclaration,
]);

/**
 * Walk up from a node to find the nearest declaration ancestor.
 *
 * Prefers the first ancestor whose name matches (if applicable).
 * Falls back to the first declaration-kind ancestor if no name match.
 */
function walkUpToDeclaration(node: Node, name: string): Node | undefined {
	let current: Node | undefined = node;

	while (current) {
		if (DECLARATION_KINDS.has(current.getKind())) {
			if (hasMatchingName(current, name)) {
				return current;
			}
		}
		current = current.getParent();
	}

	// Fallback: re-walk and return first declaration ancestor
	current = node;
	while (current) {
		if (DECLARATION_KINDS.has(current.getKind())) {
			return current;
		}
		current = current.getParent();
	}

	return undefined;
}

/**
 * Check if a node has a `getName()` method and the name matches.
 *
 * Uses ts-morph's type-narrowing guards for named declarations.
 */
function hasMatchingName(node: Node, name: string): boolean {
	if (Node.isFunctionDeclaration(node)) return node.getName() === name;
	if (Node.isClassDeclaration(node)) return node.getName() === name;
	if (Node.isInterfaceDeclaration(node)) return node.getName() === name;
	if (Node.isTypeAliasDeclaration(node)) return node.getName() === name;
	if (Node.isEnumDeclaration(node)) return node.getName() === name;
	if (Node.isVariableDeclaration(node)) return node.getName() === name;
	if (Node.isMethodDeclaration(node)) return node.getName() === name;
	if (Node.isMethodSignature(node)) return node.getName() === name;
	if (Node.isPropertyDeclaration(node)) return node.getName() === name;
	if (Node.isPropertySignature(node)) return node.getName() === name;
	if (Node.isGetAccessorDeclaration(node)) return node.getName() === name;
	if (Node.isSetAccessorDeclaration(node)) return node.getName() === name;
	if (Node.isModuleDeclaration(node)) return node.getName() === name;
	if (Node.isEnumMember(node)) return node.getName() === name;
	return false;
}
