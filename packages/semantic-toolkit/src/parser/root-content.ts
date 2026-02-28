import type { ParsedSymbol } from './types';

import { Node } from 'ts-morph';
import type { SourceFile } from 'ts-morph';

import { getRange, truncate } from './helpers';

/**
 * Extract root-level non-declaration content from a source file.
 * This covers imports, re-exports, bare expressions, and standalone comments
 * that don't belong to any symbol extractor.
 */
export function extractRootContent(sourceFile: SourceFile): ParsedSymbol[] {
	const symbols: ParsedSymbol[] = [];

	for (const stmt of sourceFile.getStatements()) {
		if (Node.isImportDeclaration(stmt)) {
			symbols.push(extractImport(stmt));
		} else if (Node.isExportDeclaration(stmt)) {
			symbols.push(extractReExport(stmt));
		} else if (Node.isExpressionStatement(stmt)) {
			// Skip CJS patterns (handled by extractors)
			if (isCjsPattern(stmt)) continue;
			symbols.push(extractExpression(stmt));
		}
	}

	// Extract standalone comment nodes not attached to any statement
	symbols.push(...extractStandaloneComments(sourceFile));

	return symbols;
}

// ── Import Declaration ──

function extractImport(node: import('ts-morph').ImportDeclaration): ParsedSymbol {
	const moduleSpecifier = node.getModuleSpecifierValue();
	const namedImports = node.getNamedImports();
	const defaultImport = node.getDefaultImport();
	const namespaceImport = node.getNamespaceImport();

	let importedNames: string;
	if (namespaceImport) {
		importedNames = `* as ${namespaceImport.getText()}`;
	} else if (defaultImport && namedImports.length > 0) {
		const named = namedImports.map(n => n.getText()).join(', ');
		importedNames = `${defaultImport.getText()}, { ${named} }`;
	} else if (defaultImport) {
		importedNames = defaultImport.getText();
	} else if (namedImports.length > 0) {
		importedNames = `{ ${namedImports.map(n => n.getText()).join(', ')} }`;
	} else {
		importedNames = '';
	}

	const isTypeOnly = node.isTypeOnly();
	const prefix = isTypeOnly ? 'import type' : 'import';
	const signature = importedNames
		? `${prefix} ${importedNames} from '${moduleSpecifier}'`
		: `${prefix} '${moduleSpecifier}'`;

	return {
		name: `import:${moduleSpecifier}`,
		kind: 'import',
		depth: 0,
		parentName: null,
		range: getRange(node),
		signature,
		modifiers: isTypeOnly ? ['type-only'] : [],
		jsdoc: null,
		exported: false,
		children: [],
	};
}

// ── Re-export Declaration ──

function extractReExport(node: import('ts-morph').ExportDeclaration): ParsedSymbol {
	const moduleSpecifier = node.getModuleSpecifierValue();
	const namedExports = node.getNamedExports();
	const namespaceExport = node.getNamespaceExport();
	const isTypeOnly = node.isTypeOnly();

	let exportedNames: string;
	if (namespaceExport) {
		exportedNames = `* as ${namespaceExport.getName()}`;
	} else if (namedExports.length > 0) {
		exportedNames = `{ ${namedExports.map(n => n.getText()).join(', ')} }`;
	} else {
		exportedNames = '*';
	}

	const prefix = isTypeOnly ? 'export type' : 'export';
	const from = moduleSpecifier ? ` from '${moduleSpecifier}'` : '';
	const signature = `${prefix} ${exportedNames}${from}`;

	return {
		name: moduleSpecifier ? `re-export:${moduleSpecifier}` : `re-export:local`,
		kind: 're-export',
		depth: 0,
		parentName: null,
		range: getRange(node),
		signature,
		modifiers: isTypeOnly ? ['type-only', 'exported'] : ['exported'],
		jsdoc: null,
		exported: true,
		children: [],
	};
}

// ── Top-level Expression ──

function extractExpression(node: import('ts-morph').ExpressionStatement): ParsedSymbol {
	const text = node.getText();
	return {
		name: `expr:${truncate(text, 60)}`,
		kind: 'expression',
		depth: 0,
		parentName: null,
		range: getRange(node),
		signature: truncate(text, 120),
		modifiers: [],
		jsdoc: null,
		exported: false,
		children: [],
	};
}

// ── Standalone Comments ──

/**
 * Extract standalone comment nodes at file root.
 * Uses ts-morph's getStatementsWithComments() to find comment nodes
 * that are not attached to any AST statement.
 */
function extractStandaloneComments(sourceFile: SourceFile): ParsedSymbol[] {
	const comments: ParsedSymbol[] = [];

	// Lines already covered by regular statements
	const statementLines = new Set<number>();
	for (const stmt of sourceFile.getStatements()) {
		const startLine = stmt.getStartLineNumber();
		const endLine = stmt.getEndLineNumber();
		for (let i = startLine; i <= endLine; i++) {
			statementLines.add(i);
		}
	}

	for (const node of sourceFile.getStatementsWithComments()) {
		if (!Node.isCommentNode(node)) continue;

		const startLine = node.getStartLineNumber();
		const endLine = node.getEndLineNumber();

		// Skip comments already covered by a statement's range (leading/trailing)
		let alreadyCovered = false;
		for (let i = startLine; i <= endLine; i++) {
			if (statementLines.has(i)) {
				alreadyCovered = true;
				break;
			}
		}
		if (alreadyCovered) continue;

		const text = node.getText();
		comments.push({
			name: `comment:${truncate(text.replace(/\n/g, ' '), 60)}`,
			kind: 'comment',
			depth: 0,
			parentName: null,
			range: { startLine, endLine },
			signature: truncate(text.replace(/\n/g, ' '), 120),
			modifiers: [],
			jsdoc: null,
			exported: false,
			children: [],
		});
	}

	return comments;
}

// ── CJS Pattern Detection ──

function isCjsPattern(node: import('ts-morph').ExpressionStatement): boolean {
	const expr = node.getExpression();
	if (!Node.isBinaryExpression(expr)) return false;

	const left = expr.getLeft();
	if (!Node.isPropertyAccessExpression(left)) return false;

	const obj = left.getExpression();
	const prop = left.getName();

	// module.exports = ...
	if (Node.isIdentifier(obj) && obj.getText() === 'module' && prop === 'exports') {
		return true;
	}

	// module.exports.foo = ...
	if (Node.isPropertyAccessExpression(obj)) {
		const outerObj = obj.getExpression();
		const outerProp = obj.getName();
		if (Node.isIdentifier(outerObj) && outerObj.getText() === 'module' && outerProp === 'exports') {
			return true;
		}
	}

	// exports.foo = ...
	if (Node.isIdentifier(obj) && obj.getText() === 'exports') {
		return true;
	}

	return false;
}
