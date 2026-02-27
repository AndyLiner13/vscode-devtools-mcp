import type { ParsedSymbol } from './types';

import { Node } from 'ts-morph';
import type {
	ClassDeclaration,
	EnumDeclaration,
	FunctionDeclaration,
	InterfaceDeclaration,
	ModuleDeclaration,
	SourceFile,
	VariableStatement,
} from 'ts-morph';

import {
	collectAccessorModifiers,
	collectClassModifiers,
	collectConstructorModifiers,
	collectFunctionModifiers,
	collectPropertyModifiers,
	collectPropertySignatureModifiers,
	extractJsDoc,
	getBodyBlock,
	getRange,
	truncate,
} from './helpers';
import { extractSignature } from './signatures';

/**
 * Extract all symbols from a SourceFile's top-level statements.
 * Returns a tree of ParsedSymbol nodes.
 */
export function extractFileSymbols(sourceFile: SourceFile): ParsedSymbol[] {
	const symbols = extractStatements(sourceFile.getStatements(), sourceFile, null, 0);

	// CJS patterns (module.exports = ..., exports.foo = ...)
	const cjsSymbols = extractCjsPatterns(sourceFile.getStatements(), 0);
	symbols.push(...cjsSymbols);

	symbols.sort((a, b) => a.range.startLine - b.range.startLine);
	return symbols;
}

/**
 * Extract symbols from a list of statements (works for file root, function body, etc.)
 */
function extractStatements(
	statements: readonly Node[],
	sourceFile: SourceFile,
	parentName: string | null,
	depth: number,
): ParsedSymbol[] {
	const symbols: ParsedSymbol[] = [];

	for (const stmt of statements) {
		if (Node.isFunctionDeclaration(stmt)) {
			if (stmt.getName() || stmt.isDefaultExport()) {
				symbols.push(extractFunction(stmt, parentName, depth));
			}
		} else if (Node.isClassDeclaration(stmt)) {
			symbols.push(extractClass(stmt, sourceFile, parentName, depth));
		} else if (Node.isInterfaceDeclaration(stmt)) {
			symbols.push(extractInterface(stmt, parentName, depth));
		} else if (Node.isTypeAliasDeclaration(stmt)) {
			symbols.push(extractTypeAlias(stmt, parentName, depth));
		} else if (Node.isEnumDeclaration(stmt)) {
			symbols.push(extractEnum(stmt, parentName, depth));
		} else if (Node.isVariableStatement(stmt)) {
			symbols.push(...extractVariableStatement(stmt, sourceFile, parentName, depth));
		} else if (Node.isModuleDeclaration(stmt)) {
			symbols.push(extractModule(stmt, sourceFile, parentName, depth));
		} else if (Node.isExportAssignment(stmt)) {
			symbols.push(extractExportAssignment(stmt, parentName, depth));
		}
	}

	return symbols;
}

// ── Function ──

function extractFunction(
	node: FunctionDeclaration,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	const name = node.getName() ?? (node.isDefaultExport() ? '(default)' : '(anonymous)');
	const mods = collectFunctionModifiers(node);
	const children = extractBodyChildren(node, name, depth + 1);

	return {
		name,
		kind: 'function',
		depth,
		parentName,
		range: getRange(node),
		signature: extractSignature(node),
		modifiers: mods,
		jsdoc: extractJsDoc(node),
		exported: node.isExported(),
		children,
	};
}

// ── Class ──

function extractClass(
	node: ClassDeclaration,
	sourceFile: SourceFile,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	const name = node.getName() ?? (node.isDefaultExport() ? '(default)' : '(anonymous)');
	const mods = collectClassModifiers(node);
	const children = extractClassChildren(node, sourceFile, name, depth + 1);

	return {
		name,
		kind: 'class',
		depth,
		parentName,
		range: getRange(node),
		signature: extractSignature(node),
		modifiers: mods,
		jsdoc: extractJsDoc(node),
		exported: node.isExported(),
		children,
	};
}

function extractClassChildren(
	node: ClassDeclaration,
	sourceFile: SourceFile,
	className: string,
	childDepth: number,
): ParsedSymbol[] {
	const children: ParsedSymbol[] = [];

	for (const ctor of node.getConstructors()) {
		const ctorMods = collectConstructorModifiers(ctor);
		const bodyChildren = extractBodyChildren(ctor, 'constructor', childDepth + 1);
		children.push({
			name: 'constructor',
			kind: 'constructor',
			depth: childDepth,
			parentName: className,
			range: getRange(ctor),
			signature: extractSignature(ctor),
			modifiers: ctorMods,
			jsdoc: extractJsDoc(ctor),
			exported: false,
			children: bodyChildren,
		});
	}

	for (const method of node.getMethods()) {
		const mods = collectFunctionModifiers(method);
		const methodName = method.getName() || '(anonymous)';
		const bodyChildren = extractBodyChildren(method, methodName, childDepth + 1);
		children.push({
			name: methodName,
			kind: 'method',
			depth: childDepth,
			parentName: className,
			range: getRange(method),
			signature: extractSignature(method),
			modifiers: mods,
			jsdoc: extractJsDoc(method),
			exported: false,
			children: bodyChildren,
		});
	}

	for (const prop of node.getProperties()) {
		const mods = collectPropertyModifiers(prop);
		children.push({
			name: prop.getName() || '(anonymous)',
			kind: 'property',
			depth: childDepth,
			parentName: className,
			range: getRange(prop),
			signature: extractSignature(prop),
			modifiers: mods,
			jsdoc: extractJsDoc(prop),
			exported: false,
			children: [],
		});
	}

	for (const getter of node.getGetAccessors()) {
		const mods = collectAccessorModifiers(getter);
		children.push({
			name: getter.getName() || '(anonymous)',
			kind: 'getter',
			depth: childDepth,
			parentName: className,
			range: getRange(getter),
			signature: extractSignature(getter),
			modifiers: mods,
			jsdoc: extractJsDoc(getter),
			exported: false,
			children: [],
		});
	}

	for (const setter of node.getSetAccessors()) {
		const mods = collectAccessorModifiers(setter);
		children.push({
			name: setter.getName() || '(anonymous)',
			kind: 'setter',
			depth: childDepth,
			parentName: className,
			range: getRange(setter),
			signature: extractSignature(setter),
			modifiers: mods,
			jsdoc: extractJsDoc(setter),
			exported: false,
			children: [],
		});
	}

	children.sort((a, b) => a.range.startLine - b.range.startLine);
	return children;
}

// ── Interface ──

function extractInterface(
	node: InterfaceDeclaration,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	const children = extractInterfaceChildren(node, node.getName(), depth + 1);
	return {
		name: node.getName(),
		kind: 'interface',
		depth,
		parentName,
		range: getRange(node),
		signature: extractSignature(node),
		modifiers: node.isExported() ? ['exported'] : [],
		jsdoc: extractJsDoc(node),
		exported: node.isExported(),
		children,
	};
}

function extractInterfaceChildren(
	node: InterfaceDeclaration,
	interfaceName: string,
	childDepth: number,
): ParsedSymbol[] {
	const children: ParsedSymbol[] = [];

	for (const prop of node.getProperties()) {
		const mods = collectPropertySignatureModifiers(prop);
		children.push({
			name: prop.getName() || '(anonymous)',
			kind: 'property',
			depth: childDepth,
			parentName: interfaceName,
			range: getRange(prop),
			signature: extractSignature(prop),
			modifiers: mods,
			jsdoc: extractJsDoc(prop),
			exported: false,
			children: [],
		});
	}

	for (const method of node.getMethods()) {
		children.push({
			name: method.getName() || '(anonymous)',
			kind: 'method',
			depth: childDepth,
			parentName: interfaceName,
			range: getRange(method),
			signature: extractSignature(method),
			modifiers: [],
			jsdoc: extractJsDoc(method),
			exported: false,
			children: [],
		});
	}

	let callSigIndex = 0;
	for (const sig of node.getCallSignatures()) {
		children.push({
			name: `(call-signature-${callSigIndex++})`,
			kind: 'method',
			depth: childDepth,
			parentName: interfaceName,
			range: getRange(sig),
			signature: sig.getText(),
			modifiers: [],
			jsdoc: null,
			exported: false,
			children: [],
		});
	}

	let ctorSigIndex = 0;
	for (const sig of node.getConstructSignatures()) {
		children.push({
			name: `(construct-signature-${ctorSigIndex++})`,
			kind: 'constructor',
			depth: childDepth,
			parentName: interfaceName,
			range: getRange(sig),
			signature: sig.getText(),
			modifiers: [],
			jsdoc: null,
			exported: false,
			children: [],
		});
	}

	let indexSigIndex = 0;
	for (const sig of node.getIndexSignatures()) {
		children.push({
			name: `(index-signature-${indexSigIndex++})`,
			kind: 'property',
			depth: childDepth,
			parentName: interfaceName,
			range: getRange(sig),
			signature: sig.getText(),
			modifiers: [],
			jsdoc: null,
			exported: false,
			children: [],
		});
	}

	children.sort((a, b) => a.range.startLine - b.range.startLine);
	return children;
}

// ── Type Alias ──

function extractTypeAlias(
	node: import('ts-morph').TypeAliasDeclaration,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	return {
		name: node.getName(),
		kind: 'type',
		depth,
		parentName,
		range: getRange(node),
		signature: extractSignature(node),
		modifiers: node.isExported() ? ['exported'] : [],
		jsdoc: extractJsDoc(node),
		exported: node.isExported(),
		children: [],
	};
}

// ── Enum ──

function extractEnum(
	node: EnumDeclaration,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	const members: ParsedSymbol[] = [];
	for (const member of node.getMembers()) {
		members.push({
			name: member.getName(),
			kind: 'enumMember',
			depth: depth + 1,
			parentName: node.getName(),
			range: getRange(member),
			signature: member.getText(),
			modifiers: [],
			jsdoc: extractJsDoc(member),
			exported: false,
			children: [],
		});
	}

	return {
		name: node.getName(),
		kind: 'enum',
		depth,
		parentName,
		range: getRange(node),
		signature: extractSignature(node),
		modifiers: node.isExported() ? ['exported'] : [],
		jsdoc: extractJsDoc(node),
		exported: node.isExported(),
		children: members,
	};
}

// ── Variable Statement ──

function extractVariableStatement(
	node: VariableStatement,
	sourceFile: SourceFile,
	parentName: string | null,
	depth: number,
): ParsedSymbol[] {
	const symbols: ParsedSymbol[] = [];
	const isExported = node.isExported();
	const declKind = node.getDeclarationKind();
	const kind = declKind === 'const' ? 'const' as const : 'variable' as const;
	const declarations = node.getDeclarations();
	const isSingleDecl = declarations.length === 1;
	const stmtRange = getRange(node);
	const stmtMods = isExported ? ['exported'] : [];

	for (const decl of declarations) {
		const nameNode = decl.getNameNode();

		// Destructured declarations
		if (Node.isArrayBindingPattern(nameNode) || Node.isObjectBindingPattern(nameNode)) {
			symbols.push({
				name: nameNode.getText(),
				kind,
				depth,
				parentName,
				range: isSingleDecl ? stmtRange : getRange(decl),
				signature: extractSignature(node),
				modifiers: stmtMods,
				jsdoc: extractJsDoc(node),
				exported: isExported,
				children: [],
			});
			continue;
		}

		const name = decl.getName() || '(anonymous)';
		const initializer = decl.getInitializer();
		let children: ParsedSymbol[] = [];

		if (initializer) {
			if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
				children = extractBodyChildren(initializer, name, depth + 1);
			} else if (Node.isObjectLiteralExpression(initializer)) {
				children = extractObjectLiteralChildren(initializer, name, depth + 1);
			}
		}

		symbols.push({
			name,
			kind,
			depth,
			parentName,
			range: isSingleDecl ? stmtRange : getRange(decl),
			signature: extractSignature(isSingleDecl ? node : decl),
			modifiers: stmtMods,
			jsdoc: isSingleDecl ? extractJsDoc(node) : null,
			exported: isExported,
			children,
		});
	}

	return symbols;
}

// ── Module / Namespace ──

function extractModule(
	node: ModuleDeclaration,
	sourceFile: SourceFile,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	const name = node.getName();
	const body = node.getBody();
	let children: ParsedSymbol[] = [];

	if (body) {
		if (Node.isModuleBlock(body)) {
			children = extractStatements(body.getStatements(), sourceFile, name, depth + 1);
		} else if (Node.isModuleDeclaration(body)) {
			children = [extractModule(body, sourceFile, name, depth + 1)];
		}
	}

	return {
		name,
		kind: node.hasNamespaceKeyword() ? 'namespace' : 'module',
		depth,
		parentName,
		range: getRange(node),
		signature: extractSignature(node),
		modifiers: node.isExported() ? ['exported'] : [],
		jsdoc: extractJsDoc(node),
		exported: node.isExported(),
		children,
	};
}

// ── Export Assignment ──

function extractExportAssignment(
	node: import('ts-morph').ExportAssignment,
	parentName: string | null,
	depth: number,
): ParsedSymbol {
	const expr = node.getExpression();
	let children: ParsedSymbol[] = [];
	if (Node.isObjectLiteralExpression(expr)) {
		children = extractObjectLiteralChildren(expr, '(default)', depth + 1);
	}

	return {
		name: '(default)',
		kind: 'variable',
		depth,
		parentName,
		range: getRange(node),
		signature: `export default ${truncate(expr.getText(), 80)}`,
		modifiers: ['exported', 'default'],
		jsdoc: extractJsDoc(node),
		exported: true,
		children,
	};
}

// ── Body Children (for functions/methods) ──

function extractBodyChildren(
	node: Node,
	parentName: string,
	childDepth: number,
): ParsedSymbol[] {
	const body = getBodyBlock(node);
	if (!body) return [];

	const sourceFile = node.getSourceFile();
	const children = extractStatements(body.getStatements(), sourceFile, parentName, childDepth);
	children.sort((a, b) => a.range.startLine - b.range.startLine);
	return children;
}

// ── Object Literal Children ──

function extractObjectLiteralChildren(
	node: import('ts-morph').ObjectLiteralExpression,
	parentName: string,
	childDepth: number,
): ParsedSymbol[] {
	const children: ParsedSymbol[] = [];

	for (const prop of node.getProperties()) {
		if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
			children.push({
				name: prop.getName() || '(anonymous)',
				kind: 'property',
				depth: childDepth,
				parentName,
				range: getRange(prop),
				signature: prop.getText().split('\n')[0],
				modifiers: [],
				jsdoc: null,
				exported: false,
				children: [],
			});
		} else if (Node.isMethodDeclaration(prop)) {
			const bodyChildren = extractBodyChildren(prop, prop.getName(), childDepth + 1);
			children.push({
				name: prop.getName() || '(anonymous)',
				kind: 'method',
				depth: childDepth,
				parentName,
				range: getRange(prop),
				signature: extractSignature(prop),
				modifiers: [],
				jsdoc: extractJsDoc(prop),
				exported: false,
				children: bodyChildren,
			});
		} else if (Node.isGetAccessorDeclaration(prop)) {
			children.push({
				name: prop.getName() || '(anonymous)',
				kind: 'getter',
				depth: childDepth,
				parentName,
				range: getRange(prop),
				signature: extractSignature(prop),
				modifiers: [],
				jsdoc: null,
				exported: false,
				children: [],
			});
		} else if (Node.isSetAccessorDeclaration(prop)) {
			children.push({
				name: prop.getName() || '(anonymous)',
				kind: 'setter',
				depth: childDepth,
				parentName,
				range: getRange(prop),
				signature: extractSignature(prop),
				modifiers: [],
				jsdoc: null,
				exported: false,
				children: [],
			});
		}
	}

	return children;
}

// ── CJS Patterns ──

function extractCjsPatterns(
	statements: readonly Node[],
	depth: number,
): ParsedSymbol[] {
	const symbols: ParsedSymbol[] = [];

	for (const stmt of statements) {
		if (!Node.isExpressionStatement(stmt)) continue;
		const expr = stmt.getExpression();
		if (!Node.isBinaryExpression(expr)) continue;

		const left = expr.getLeft();
		const right = expr.getRight();

		if (!Node.isPropertyAccessExpression(left)) continue;
		const obj = left.getExpression();
		const prop = left.getName();

		// module.exports = ...
		if (Node.isIdentifier(obj) && obj.getText() === 'module' && prop === 'exports') {
			let children: ParsedSymbol[] = [];
			if (Node.isObjectLiteralExpression(right)) {
				children = extractObjectLiteralChildren(right, 'module.exports', depth + 1);
			}
			symbols.push({
				name: 'module.exports',
				kind: 'variable',
				depth,
				parentName: null,
				range: getRange(stmt),
				signature: `module.exports = ${truncate(right.getText(), 80)}`,
				modifiers: ['exported'],
				jsdoc: extractJsDoc(stmt),
				exported: true,
				children,
			});
			continue;
		}

		// module.exports.foo = ...
		if (Node.isPropertyAccessExpression(obj)) {
			const outerObj = obj.getExpression();
			const outerProp = obj.getName();
			if (Node.isIdentifier(outerObj) && outerObj.getText() === 'module' && outerProp === 'exports') {
				symbols.push({
					name: prop || '(anonymous)',
					kind: 'variable',
					depth,
					parentName: null,
					range: getRange(stmt),
					signature: `module.exports.${prop} = ${truncate(right.getText(), 80)}`,
					modifiers: ['exported'],
					jsdoc: extractJsDoc(stmt),
					exported: true,
					children: [],
				});
				continue;
			}
		}

		// exports.foo = ...
		if (Node.isIdentifier(obj) && obj.getText() === 'exports') {
			symbols.push({
				name: prop || '(anonymous)',
				kind: 'variable',
				depth,
				parentName: null,
				range: getRange(stmt),
				signature: `exports.${prop} = ${truncate(right.getText(), 80)}`,
				modifiers: ['exported'],
				jsdoc: extractJsDoc(stmt),
				exported: true,
				children: [],
			});
		}
	}

	return symbols;
}
