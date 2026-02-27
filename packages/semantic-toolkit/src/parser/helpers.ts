import type { SymbolRange } from './types';

import { Node, Scope, SyntaxKind } from 'ts-morph';
import type {
	ClassDeclaration,
	ConstructorDeclaration,
	FunctionDeclaration,
	GetAccessorDeclaration,
	MethodDeclaration,
	PropertyDeclaration,
	PropertySignature,
	SetAccessorDeclaration,
	SourceFile,
	VariableStatement,
} from 'ts-morph';

// SyntaxKind values for function-like nodes that may have Block bodies
export const FUNCTION_LIKE_KINDS: ReadonlySet<SyntaxKind> = new Set([
	SyntaxKind.FunctionDeclaration,
	SyntaxKind.MethodDeclaration,
	SyntaxKind.Constructor,
	SyntaxKind.GetAccessor,
	SyntaxKind.SetAccessor,
	SyntaxKind.ArrowFunction,
	SyntaxKind.FunctionExpression,
]);

/**
 * Get the 1-indexed line range of a node, extending to include leading JSDoc comments.
 */
export function getRange(node: Node): SymbolRange {
	const sf = node.getSourceFile();
	const fileEnd = sf.getEnd();
	let startPos = Math.max(0, Math.min(node.getStart(), fileEnd));
	const endPos = Math.max(startPos, Math.min(node.getEnd(), fileEnd));

	// Extend start to include leading JSDoc (/** ... */) if present
	for (const comment of node.getLeadingCommentRanges()) {
		if (comment.getText().startsWith('/**')) {
			startPos = Math.max(0, Math.min(comment.getPos(), startPos));
			break;
		}
	}

	const startLc = sf.compilerNode.getLineAndCharacterOfPosition(startPos);
	const endLc = sf.compilerNode.getLineAndCharacterOfPosition(endPos);
	return {
		startLine: startLc.line + 1,
		endLine: endLc.line + 1,
	};
}

/**
 * Extract the JSDoc comment text from a node's leading comments.
 * Returns null if no JSDoc is found.
 */
export function extractJsDoc(node: Node): string | null {
	for (const comment of node.getLeadingCommentRanges()) {
		const text = comment.getText();
		if (text.startsWith('/**')) {
			// Strip delimiters and leading asterisks
			return text
				.replace(/^\/\*\*\s*/, '')
				.replace(/\s*\*\/$/, '')
				.split('\n')
				.map(line => line.replace(/^\s*\*\s?/, ''))
				.join('\n')
				.trim();
		}
	}
	return null;
}

/**
 * Check if a node is exported from its module.
 */
export function isNodeExported(node: Node): boolean {
	if (
		Node.isFunctionDeclaration(node) ||
		Node.isClassDeclaration(node) ||
		Node.isInterfaceDeclaration(node) ||
		Node.isTypeAliasDeclaration(node) ||
		Node.isEnumDeclaration(node) ||
		Node.isModuleDeclaration(node)
	) {
		return node.isExported();
	}
	if (Node.isVariableStatement(node)) {
		return node.isExported();
	}
	return false;
}

/**
 * Collect modifiers for a function or method declaration.
 */
export function collectFunctionModifiers(node: FunctionDeclaration | MethodDeclaration): string[] {
	const mods: string[] = [];
	if (node.isAsync()) mods.push('async');

	if (Node.isMethodDeclaration(node)) {
		if (node.isAbstract()) mods.push('abstract');
		if (node.isStatic()) mods.push('static');
		const scope = node.getScope();
		if (scope === Scope.Private) mods.push('private');
		if (scope === Scope.Protected) mods.push('protected');
	}

	if (node.isGenerator()) mods.push('generator');

	if (Node.isFunctionDeclaration(node)) {
		if (node.isExported()) mods.push('exported');
		if (node.isDefaultExport()) mods.push('default');
	}

	return mods;
}

/**
 * Collect modifiers for a class declaration.
 */
export function collectClassModifiers(node: ClassDeclaration): string[] {
	const mods: string[] = [];
	if (node.isAbstract()) mods.push('abstract');
	if (node.isExported()) mods.push('exported');
	if (node.isDefaultExport()) mods.push('default');
	return mods;
}

/**
 * Collect modifiers for a property declaration.
 */
export function collectPropertyModifiers(node: PropertyDeclaration): string[] {
	const mods: string[] = [];
	if (node.isStatic()) mods.push('static');
	if (node.isReadonly()) mods.push('readonly');
	if (node.isAbstract()) mods.push('abstract');
	const scope = node.getScope();
	if (scope === Scope.Private) mods.push('private');
	if (scope === Scope.Protected) mods.push('protected');
	return mods;
}

/**
 * Collect modifiers for a property signature (interface member).
 */
export function collectPropertySignatureModifiers(node: PropertySignature): string[] {
	const mods: string[] = [];
	if (node.isReadonly()) mods.push('readonly');
	if (node.hasQuestionToken()) mods.push('optional');
	return mods;
}

/**
 * Collect modifiers for a constructor declaration.
 */
export function collectConstructorModifiers(node: ConstructorDeclaration): string[] {
	const mods: string[] = [];
	const scope = node.getScope();
	if (scope === Scope.Private) mods.push('private');
	if (scope === Scope.Protected) mods.push('protected');
	return mods;
}

/**
 * Collect modifiers for a getter or setter declaration.
 */
export function collectAccessorModifiers(node: GetAccessorDeclaration | SetAccessorDeclaration): string[] {
	const mods: string[] = [];
	if (node.isStatic()) mods.push('static');
	if (node.isAbstract()) mods.push('abstract');
	const scope = node.getScope();
	if (scope === Scope.Private) mods.push('private');
	if (scope === Scope.Protected) mods.push('protected');
	return mods;
}

/**
 * Collect modifiers for a variable statement.
 */
export function collectVariableStatementModifiers(node: VariableStatement): string[] {
	const mods: string[] = [];
	if (node.isExported()) mods.push('exported');
	if (node.isDefaultExport()) mods.push('default');
	return mods;
}

/**
 * Get the Block body from a function-like node, if it has one.
 */
export function getBodyBlock(node: Node): import('ts-morph').Block | undefined {
	if (!FUNCTION_LIKE_KINDS.has(node.getKind())) return undefined;

	let block: import('ts-morph').Block | undefined;
	node.forEachChild(child => {
		if (!block && Node.isBlock(child)) {
			block = child;
		}
	});
	return block;
}

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated.
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + '...';
}
