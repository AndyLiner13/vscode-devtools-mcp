// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// This module extracts symbols from TypeScript/JavaScript files using ts-morph.
// It has ZERO VS Code API dependencies and is fully testable with Vitest.

import type { SymbolNode } from './types';
import type {
	ClassDeclaration,
	ConstructorDeclaration,
	EnumDeclaration,
	FunctionDeclaration,
	GetAccessorDeclaration,
	InterfaceDeclaration,
	MethodDeclaration,
	ModuleDeclaration,
	PropertyDeclaration,
	PropertySignature,
	SetAccessorDeclaration,
	SourceFile,
	TypeAliasDeclaration,
	VariableStatement
} from 'ts-morph';

import * as path from 'node:path';
import { Node, Scope, SyntaxKind } from 'ts-morph';

import { extractOrphanedContent, findProjectRoot } from './orphaned-content';
import { buildIdentifierMap, populateExtractedSymbolRefs } from './reference-counting';
import { getWorkspaceProject } from './ts-project';
import { TS_PARSEABLE_EXTS } from './types';

// ── Types (compatible with FileSymbol in mcp-server/src/client-pipe.ts) ──

export interface ExtractedSymbolRange {
	endChar: number; // 0-indexed (column)
	endLine: number; // 1-indexed
	startChar: number; // 0-indexed (column)
	startLine: number; // 1-indexed
}

export interface ExtractedSymbol {
	children: ExtractedSymbol[];
	detail?: string;
	exported?: boolean;
	implementationCount?: number;
	kind: string;
	modifiers?: string[];
	name: string;
	range: ExtractedSymbolRange;
	referenceCount?: number;
}

// ── Range Helper ──

function getRange(node: Node): ExtractedSymbolRange {
	const sf = node.getSourceFile();
	const fileEnd = sf.getEnd();
	let startPos = Math.max(0, Math.min(node.getStart(), fileEnd));
	const endPos = Math.max(startPos, Math.min(node.getEnd(), fileEnd));

	// Extend start to include leading JSDoc/TSDoc (/** ... */) if present.
	// Regular // and /* */ comments are intentionally left as orphaned content.
	for (const comment of node.getLeadingCommentRanges()) {
		if (comment.getText().startsWith('/**')) {
			startPos = Math.max(0, Math.min(comment.getPos(), startPos));
			break;
		}
	}

	const startLc = sf.compilerNode.getLineAndCharacterOfPosition(startPos);
	const endLc = sf.compilerNode.getLineAndCharacterOfPosition(endPos);
	return {
		endChar: endLc.character,
		endLine: endLc.line + 1,
		startChar: startLc.character,
		startLine: startLc.line + 1
	};
}

// ── Modifier Extraction ──

function collectFunctionModifiers(node: FunctionDeclaration | MethodDeclaration): string[] {
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
	return mods;
}

function collectClassModifiers(node: ClassDeclaration): string[] {
	const mods: string[] = [];
	if (node.isAbstract()) mods.push('abstract');
	return mods;
}

function collectPropertyModifiers(node: PropertyDeclaration): string[] {
	const mods: string[] = [];
	if (node.isStatic()) mods.push('static');
	if (node.isReadonly()) mods.push('readonly');
	if (node.isAbstract()) mods.push('abstract');
	const scope = node.getScope();
	if (scope === Scope.Private) mods.push('private');
	if (scope === Scope.Protected) mods.push('protected');
	return mods;
}

function collectAccessorModifiers(node: GetAccessorDeclaration | SetAccessorDeclaration): string[] {
	const mods: string[] = [];
	if (node.isStatic()) mods.push('static');
	if (node.isAbstract()) mods.push('abstract');
	const scope = node.getScope();
	if (scope === Scope.Private) mods.push('private');
	if (scope === Scope.Protected) mods.push('protected');
	return mods;
}

function collectConstructorModifiers(node: ConstructorDeclaration): string[] {
	const mods: string[] = [];
	const scope = node.getScope();
	if (scope === Scope.Private) mods.push('private');
	if (scope === Scope.Protected) mods.push('protected');
	return mods;
}

function collectPropertySignatureModifiers(node: PropertySignature): string[] {
	const mods: string[] = [];
	if (node.isReadonly()) mods.push('readonly');
	return mods;
}

// ── Exported Check ──

function isNodeExported(node: Node): boolean {
	// Check for export keyword on the node itself
	if (Node.isFunctionDeclaration(node) || Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node) || Node.isTypeAliasDeclaration(node) || Node.isEnumDeclaration(node) || Node.isModuleDeclaration(node)) {
		return node.isExported();
	}

	if (Node.isVariableStatement(node)) {
		return node.isExported();
	}

	return false;
}

// ── Control Flow Dispatch ──

// Maps SyntaxKind to skeleton kind for structural control flow nodes.
// Any statement whose kind appears here is treated as a control flow container
// with children extracted generically via forEachChild.
const CONTROL_FLOW_KINDS = new Map<SyntaxKind, string>([
	[SyntaxKind.TryStatement, 'try-catch'],
	[SyntaxKind.IfStatement, 'if'],
	[SyntaxKind.ForStatement, 'for'],
	[SyntaxKind.ForInStatement, 'for-in'],
	[SyntaxKind.ForOfStatement, 'for-of'],
	[SyntaxKind.WhileStatement, 'while'],
	[SyntaxKind.DoStatement, 'do-while'],
	[SyntaxKind.SwitchStatement, 'switch'],
]);

// SyntaxKind values for all function-like nodes that may contain a Block body
const FUNCTION_LIKE_KINDS: ReadonlySet<SyntaxKind> = new Set([
	SyntaxKind.FunctionDeclaration,
	SyntaxKind.MethodDeclaration,
	SyntaxKind.Constructor,
	SyntaxKind.GetAccessor,
	SyntaxKind.SetAccessor,
	SyntaxKind.ArrowFunction,
	SyntaxKind.FunctionExpression,
]);

// ── Individual Extractors ──

/**
 * Extract inner declarations AND control flow structure from a function/method body.
 * Uses forEachChild on the body block to discover children generically.
 */
function extractBodyChildren(node: Node): ExtractedSymbol[] {
	const body = getBodyBlock(node);
	if (!body) return [];

	const children = extractBodyStatements(body.getStatements(), node.getSourceFile());
	children.sort((a, b) => a.range.startLine - b.range.startLine);
	return children;
}

/**
 * Extract named declarations and structural control flow from a statement list.
 * Declarations use type-specific extractors; control flow is dispatched through
 * the CONTROL_FLOW_KINDS map and extracted with a generic forEachChild walker.
 */
function extractBodyStatements(statements: readonly Node[], sf: SourceFile): ExtractedSymbol[] {
	const out: ExtractedSymbol[] = [];

	for (const stmt of statements) {
		// Named declarations — type-specific extractors
		if (Node.isVariableStatement(stmt)) {
			out.push(...extractVariableStatement(stmt));
		} else if (Node.isFunctionDeclaration(stmt)) {
			if (stmt.getName() || stmt.isDefaultExport()) {
				out.push(extractFunction(stmt));
			}
		} else if (Node.isClassDeclaration(stmt)) {
			out.push(extractClass(stmt));
		} else if (Node.isInterfaceDeclaration(stmt)) {
			out.push(extractInterface(stmt));
		} else if (Node.isTypeAliasDeclaration(stmt)) {
			out.push(extractTypeAlias(stmt));
		} else if (Node.isEnumDeclaration(stmt)) {
			out.push(extractEnum(stmt));
		} else if (Node.isModuleDeclaration(stmt)) {
			out.push(extractModule(stmt, sf));
		} else {
			// Control flow — dispatch via SyntaxKind map
			const controlKind = CONTROL_FLOW_KINDS.get(stmt.getKind());
			if (controlKind) {
				out.push(extractControlFlowNode(stmt, controlKind, sf));
			}
		}
	}

	return out;
}

// ── Generic Control Flow Extraction ──

/**
 * Wrap expression text in parens for display.
 */
function parenWrap(text: string): string {
	return `(${text})`;
}

/**
 * Derive a display label from a control flow node's expression or initializer.
 * Uses ts-morph's typed accessors to extract the relevant expression text.
 */
function deriveControlFlowName(node: Node, kind: string): string {
	if (Node.isIfStatement(node) || Node.isWhileStatement(node) || Node.isDoStatement(node) || Node.isSwitchStatement(node)) {
		return parenWrap(node.getExpression().getText());
	}
	if (Node.isForInStatement(node)) {
		return `(${node.getInitializer().getText()} in ...)`;
	}
	if (Node.isForOfStatement(node)) {
		return `(${node.getInitializer().getText()} of ...)`;
	}
	return kind;
}

/**
 * Extract children from any control flow node using forEachChild.
 * Discovers Block, CatchClause, CaseBlock, and nested IfStatement children
 * generically instead of calling type-specific getters for each node kind.
 *
 * Special labeling:
 * - TryStatement blocks → "try" / "finally" sub-containers
 * - IfStatement else blocks → "else" container; else-if → recursive
 * - CatchClause → "catch" container with variable name
 * - CaseBlock clauses → "case" / "default" containers
 * - All other blocks → children promoted directly
 */
function extractControlFlowChildren(node: Node, sf: SourceFile): ExtractedSymbol[] {
	const children: ExtractedSymbol[] = [];

	node.forEachChild(child => {
		if (Node.isBlock(child)) {
			const stmts = extractBodyStatements(child.getStatements(), sf);

			if (Node.isTryStatement(node)) {
				// Distinguish try block from finally block by position
				const isTryBlock = child.getStart() === node.getTryBlock().getStart();
				const label = isTryBlock ? 'try' : 'finally';
				children.push({ children: stmts, kind: label, name: label, range: getRange(child) });
			} else if (Node.isIfStatement(node) && child.getStart() !== node.getThenStatement().getStart()) {
				// Else block (not the then-branch)
				children.push({ children: stmts, kind: 'else', name: 'else', range: getRange(child) });
			} else {
				// Then-branch, loop body, or any other block: promote children directly
				children.push(...stmts);
			}
		} else if (Node.isCatchClause(child)) {
			const varDecl = child.getVariableDeclaration();
			children.push({
				children: extractBodyStatements(child.getBlock().getStatements(), sf),
				kind: 'catch',
				name: varDecl ? `(${varDecl.getName()})` : 'catch',
				range: getRange(child)
			});
		} else if (Node.isCaseBlock(child)) {
			for (const clause of child.getClauses()) {
				const clauseStmts = extractBodyStatements(clause.getStatements(), sf);
				if (Node.isCaseClause(clause)) {
					children.push({
						children: clauseStmts,
						kind: 'case',
						name: parenWrap(clause.getExpression().getText()),
						range: getRange(clause)
					});
				} else {
					children.push({ children: clauseStmts, kind: 'default', name: 'default', range: getRange(clause) });
				}
			}
		} else if (Node.isIfStatement(child)) {
			// Else-if branch — recurse with 'else-if' kind
			children.push(extractControlFlowNode(child, 'else-if', sf));
		}
	});

	return children;
}

/**
 * Extract a control flow node as a skeleton entry.
 * Uses the CONTROL_FLOW_KINDS map for the kind and forEachChild for children.
 */
function extractControlFlowNode(node: Node, kind: string, sf: SourceFile): ExtractedSymbol {
	return {
		children: extractControlFlowChildren(node, sf),
		kind,
		name: deriveControlFlowName(node, kind),
		range: getRange(node)
	};
}

/**
 * Get the Block body from a function-like node, if it has one.
 * Uses FUNCTION_LIKE_KINDS set and forEachChild to discover the block
 * generically, without calling type-specific getBody() for each kind.
 */
function getBodyBlock(node: Node): import('ts-morph').Block | undefined {
	if (!FUNCTION_LIKE_KINDS.has(node.getKind())) return undefined;

	let block: import('ts-morph').Block | undefined;
	node.forEachChild(child => {
		if (!block && Node.isBlock(child)) {
			block = child;
		}
	});
	return block;
}

function extractFunction(node: FunctionDeclaration): ExtractedSymbol {
	const name = node.getName() ?? '(anonymous)';
	const mods = collectFunctionModifiers(node);
	const isDefault = node.isDefaultExport();

	return {
		children: extractBodyChildren(node),
		exported: node.isExported() || undefined,
		kind: 'function',
		modifiers: mods.length > 0 ? mods : undefined,
		name: isDefault && name === '(anonymous)' ? '(default)' : name,
		range: getRange(node)
	};
}

function extractClassChildren(node: ClassDeclaration): ExtractedSymbol[] {
	const children: ExtractedSymbol[] = [];

	for (const ctor of node.getConstructors()) {
		const ctorMods = collectConstructorModifiers(ctor);
		children.push({
			children: extractBodyChildren(ctor),
			kind: 'constructor',
			modifiers: ctorMods.length > 0 ? ctorMods : undefined,
			name: 'constructor',
			range: getRange(ctor)
		});
	}

	for (const method of node.getMethods()) {
		const mods = collectFunctionModifiers(method);
		children.push({
			children: extractBodyChildren(method),
			kind: 'method',
			modifiers: mods.length > 0 ? mods : undefined,
			name: method.getName() || '(anonymous)',
			range: getRange(method)
		});
	}

	for (const prop of node.getProperties()) {
		const mods = collectPropertyModifiers(prop);
		children.push({
			children: [],
			kind: 'property',
			modifiers: mods.length > 0 ? mods : undefined,
			name: prop.getName() || '(anonymous)',
			range: getRange(prop)
		});
	}

	for (const getter of node.getGetAccessors()) {
		const mods = collectAccessorModifiers(getter);
		children.push({
			children: [],
			kind: 'getter',
			modifiers: mods.length > 0 ? mods : undefined,
			name: getter.getName() || '(anonymous)',
			range: getRange(getter)
		});
	}

	for (const setter of node.getSetAccessors()) {
		const mods = collectAccessorModifiers(setter);
		children.push({
			children: [],
			kind: 'setter',
			modifiers: mods.length > 0 ? mods : undefined,
			name: setter.getName() || '(anonymous)',
			range: getRange(setter)
		});
	}

	// Sort children by start line
	children.sort((a, b) => a.range.startLine - b.range.startLine);
	return children;
}

function extractClass(node: ClassDeclaration): ExtractedSymbol {
	const name = node.getName() ?? '(anonymous)';
	const mods = collectClassModifiers(node);
	const isDefault = node.isDefaultExport();

	return {
		children: extractClassChildren(node),
		exported: node.isExported() || undefined,
		kind: 'class',
		modifiers: mods.length > 0 ? mods : undefined,
		name: isDefault && name === '(anonymous)' ? '(default)' : name,
		range: getRange(node)
	};
}

function extractInterfaceChildren(node: InterfaceDeclaration): ExtractedSymbol[] {
	const children: ExtractedSymbol[] = [];

	for (const prop of node.getProperties()) {
		const mods = collectPropertySignatureModifiers(prop);
		children.push({
			children: [],
			kind: 'property',
			modifiers: mods.length > 0 ? mods : undefined,
			name: prop.getName() || '(anonymous)',
			range: getRange(prop)
		});
	}

	for (const method of node.getMethods()) {
		children.push({
			children: [],
			kind: 'method',
			name: method.getName() || '(anonymous)',
			range: getRange(method)
		});
	}

	// Call signatures: unnamed, use index as identifier
	let callSigIndex = 0;
	for (const sig of node.getCallSignatures()) {
		children.push({
			children: [],
			kind: 'method',
			name: `(call-signature-${callSigIndex++})`,
			range: getRange(sig)
		});
	}

	// Construct signatures
	let ctorSigIndex = 0;
	for (const sig of node.getConstructSignatures()) {
		children.push({
			children: [],
			kind: 'constructor',
			name: `(construct-signature-${ctorSigIndex++})`,
			range: getRange(sig)
		});
	}

	// Index signatures
	let indexSigIndex = 0;
	for (const sig of node.getIndexSignatures()) {
		children.push({
			children: [],
			kind: 'property',
			name: `(index-signature-${indexSigIndex++})`,
			range: getRange(sig)
		});
	}

	children.sort((a, b) => a.range.startLine - b.range.startLine);
	return children;
}

function extractInterface(node: InterfaceDeclaration): ExtractedSymbol {
	return {
		children: extractInterfaceChildren(node),
		exported: node.isExported() || undefined,
		kind: 'interface',
		name: node.getName() || '(anonymous)',
		range: getRange(node)
	};
}

function extractTypeAlias(node: TypeAliasDeclaration): ExtractedSymbol {
	return {
		children: [],
		exported: node.isExported() || undefined,
		kind: 'type',
		name: node.getName() || '(anonymous)',
		range: getRange(node)
	};
}

function extractEnumChildren(node: EnumDeclaration): ExtractedSymbol[] {
	const children: ExtractedSymbol[] = [];
	for (const member of node.getMembers()) {
		children.push({
			children: [],
			kind: 'enumMember',
			name: member.getName() || '(anonymous)',
			range: getRange(member)
		});
	}
	return children;
}

function extractEnum(node: EnumDeclaration): ExtractedSymbol {
	return {
		children: extractEnumChildren(node),
		exported: node.isExported() || undefined,
		kind: 'enum',
		name: node.getName() || '(anonymous)',
		range: getRange(node)
	};
}

function extractObjectLiteralChildren(node: Node): ExtractedSymbol[] {
	if (!Node.isObjectLiteralExpression(node)) return [];

	const children: ExtractedSymbol[] = [];
	for (const prop of node.getProperties()) {
		if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
			children.push({
				children: [],
				kind: 'property',
				name: prop.getName() || '(anonymous)',
				range: getRange(prop)
			});
		} else if (Node.isMethodDeclaration(prop)) {
			children.push({
				children: [],
				kind: 'method',
				name: prop.getName() || '(anonymous)',
				range: getRange(prop)
			});
		} else if (Node.isGetAccessorDeclaration(prop)) {
			children.push({
				children: [],
				kind: 'getter',
				name: prop.getName() || '(anonymous)',
				range: getRange(prop)
			});
		} else if (Node.isSetAccessorDeclaration(prop)) {
			children.push({
				children: [],
				kind: 'setter',
				name: prop.getName() || '(anonymous)',
				range: getRange(prop)
			});
		}
	}
	return children;
}

function extractVariableStatement(node: VariableStatement): ExtractedSymbol[] {
	const symbols: ExtractedSymbol[] = [];
	const isExported = node.isExported();
	const declKind = node.getDeclarationKind();
	const kind = declKind === 'const' ? 'constant' : 'variable';
	const declarations = node.getDeclarations();
	const isSingleDecl = declarations.length === 1;
	// For single declarations, use the full statement range (includes const/let/var keyword)
	const stmtRange = getRange(node);

	for (const decl of declarations) {
		// Handle destructured declarations (binding patterns)
		const nameNode = decl.getNameNode();
		if (Node.isArrayBindingPattern(nameNode) || Node.isObjectBindingPattern(nameNode)) {
			const patternText = nameNode.getText();
			symbols.push({
				children: [],
				exported: isExported || undefined,
				kind,
				name: patternText,
				range: isSingleDecl ? stmtRange : getRange(decl)
			});
			continue;
		}

		const name = decl.getName() || '(anonymous)';
		const initializer = decl.getInitializer();

		// For arrow/function expressions, extract inner body children
		let children: ExtractedSymbol[] = [];
		if (initializer) {
			if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
				children = extractBodyChildren(initializer);
			} else {
				children = extractObjectLiteralChildren(initializer);
			}
		}

		symbols.push({
			children,
			exported: isExported || undefined,
			kind,
			name,
			range: isSingleDecl ? stmtRange : getRange(decl)
		});
	}

	return symbols;
}

function extractModuleChildren(node: ModuleDeclaration, sourceFile: SourceFile): ExtractedSymbol[] {
	const body = node.getBody();
	if (!body) return [];

	// Module body can be a ModuleBlock (has statements) or another ModuleDeclaration (nested)
	if (Node.isModuleBlock(body)) {
		return extractStatementsAsSymbols(body.getStatements(), sourceFile);
	}
	if (Node.isModuleDeclaration(body)) {
		return [extractModule(body, sourceFile)];
	}
	return [];
}

function extractModule(node: ModuleDeclaration, sourceFile: SourceFile): ExtractedSymbol {
	const name = node.getName() || '(anonymous)';
	// Determine if it's a namespace or module keyword
	const isNamespace = node.hasNamespaceKeyword();

	return {
		children: extractModuleChildren(node, sourceFile),
		exported: node.isExported() || undefined,
		kind: isNamespace ? 'namespace' : 'module',
		name,
		range: getRange(node)
	};
}

// ── CJS Pattern Detection ──

function extractCjsPatterns(statements: readonly Node[]): ExtractedSymbol[] {
	const symbols: ExtractedSymbol[] = [];

	for (const stmt of statements) {
		if (!Node.isExpressionStatement(stmt)) continue;

		const expr = stmt.getExpression();
		if (!Node.isBinaryExpression(expr)) continue;

		const left = expr.getLeft();
		const right = expr.getRight();

		// module.exports = ...
		if (Node.isPropertyAccessExpression(left)) {
			const obj = left.getExpression();
			const prop = left.getName();

			if (Node.isIdentifier(obj) && obj.getText() === 'module' && prop === 'exports') {
				// module.exports = { ... } or module.exports = value
				const children: ExtractedSymbol[] = [];

				if (Node.isObjectLiteralExpression(right)) {
					for (const p of right.getProperties()) {
						if (Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p)) {
							children.push({
								children: [],
								kind: 'property',
								name: p.getName() || '(anonymous)',
								range: getRange(p)
							});
						} else if (Node.isMethodDeclaration(p)) {
							children.push({
								children: [],
								kind: 'method',
								name: p.getName() || '(anonymous)',
								range: getRange(p)
							});
						}
					}
				}

				symbols.push({
					children,
					exported: true,
					kind: 'variable',
					name: 'module.exports',
					range: getRange(stmt)
				});
				continue;
			}

			// module.exports.foo = ... or exports.foo = ...
			if (Node.isPropertyAccessExpression(obj)) {
				const outerObj = obj.getExpression();
				const outerProp = obj.getName();
				if (Node.isIdentifier(outerObj) && outerObj.getText() === 'module' && outerProp === 'exports') {
					symbols.push({
						children: [],
						exported: true,
						kind: 'variable',
						name: prop || '(anonymous)',
						range: getRange(stmt)
					});
					continue;
				}
			}

			// exports.foo = ...
			if (Node.isIdentifier(obj) && obj.getText() === 'exports') {
				symbols.push({
					children: [],
					exported: true,
					kind: 'variable',
					name: prop || '(anonymous)',
					range: getRange(stmt)
				});
				continue;
			}
		}
	}

	return symbols;
}

// ── Statement-Level Extraction ──

function extractStatementsAsSymbols(statements: readonly Node[], sourceFile: SourceFile): ExtractedSymbol[] {
	const symbols: ExtractedSymbol[] = [];

	for (const stmt of statements) {
		if (Node.isFunctionDeclaration(stmt)) {
			// Skip unnamed non-default functions (forward declarations without implementation)
			if (stmt.getName() || stmt.isDefaultExport()) {
				symbols.push(extractFunction(stmt));
			}
		} else if (Node.isClassDeclaration(stmt)) {
			symbols.push(extractClass(stmt));
		} else if (Node.isInterfaceDeclaration(stmt)) {
			symbols.push(extractInterface(stmt));
		} else if (Node.isTypeAliasDeclaration(stmt)) {
			symbols.push(extractTypeAlias(stmt));
		} else if (Node.isEnumDeclaration(stmt)) {
			symbols.push(extractEnum(stmt));
		} else if (Node.isVariableStatement(stmt)) {
			symbols.push(...extractVariableStatement(stmt));
		} else if (Node.isModuleDeclaration(stmt)) {
			symbols.push(extractModule(stmt, sourceFile));
		} else if (Node.isExportAssignment(stmt)) {
			// export default <expression> or export = <expression>
			const expr = stmt.getExpression();
			const children = extractObjectLiteralChildren(expr);
			symbols.push({
				children,
				exported: true,
				kind: 'variable',
				name: '(default)',
				range: getRange(stmt)
			});
		}
	}

	// CJS patterns (module.exports = ..., exports.foo = ...)
	const cjsSymbols = extractCjsPatterns(statements);
	symbols.push(...cjsSymbols);

	// Sort all symbols by start line to maintain source order
	symbols.sort((a, b) => a.range.startLine - b.range.startLine);

	return symbols;
}

// ── Main Public API ──

/**
 * Extract all symbols from a ts-morph SourceFile.
 * Returns a tree of ExtractedSymbol nodes with 1-indexed line numbers.
 * This function has ZERO VS Code API dependencies.
 */
function extractSymbols(sourceFile: SourceFile): ExtractedSymbol[] {
	return extractStatementsAsSymbols(sourceFile.getStatements(), sourceFile);
}

// ── Unified File Structure ──

export interface UnifiedFileResult {
	content: string;
	directives: SymbolNode[];
	exports: SymbolNode[];
	gaps: Array<{ start: number; end: number; type: 'blank' | 'unknown' }>;
	hasSyntaxErrors: boolean;
	imports: SymbolNode[];
	orphanComments: SymbolNode[];
	stats: {
		totalImports: number;
		totalExports: number;
		totalOrphanComments: number;
		totalDirectives: number;
		totalBlankLines: number;
		coveragePercent: number;
	};
	symbols: ExtractedSymbol[];
	totalLines: number;
}

/**
 * Flatten the symbol tree into a flat list of { start, end } ranges (1-indexed).
 * Used as input for orphaned content detection and gap computation.
 */
function flattenSymbolRanges(symbols: ExtractedSymbol[]): Array<{ start: number; end: number }> {
	const ranges: Array<{ start: number; end: number }> = [];
	for (const sym of symbols) {
		ranges.push({ end: sym.range.endLine, start: sym.range.startLine });
		if (sym.children.length > 0) {
			ranges.push(...flattenSymbolRanges(sym.children));
		}
	}
	return ranges;
}

/**
 * Extract the complete file structure in a single call using ts-morph.
 * Combines symbol extraction + orphaned content analysis.
 * Returns symbols, content, imports, exports, comments, directives, gaps, and stats.
 *
 * Only supports TS/JS family files (.ts, .tsx, .js, .jsx, .mts, .mjs, .cts, .cjs).
 * Returns an empty result for unsupported file types.
 */
export function extractFileStructure(filePath: string): UnifiedFileResult {
	const ext = path.extname(filePath).slice(1).toLowerCase();

	if (!TS_PARSEABLE_EXTS.has(ext)) {
		return emptyUnifiedResult();
	}

	try {
		const rootDir = findProjectRoot(filePath);
		const project = getWorkspaceProject(rootDir);
		let sourceFile = project.getSourceFile(filePath);

		if (!sourceFile) {
			sourceFile = project.addSourceFileAtPath(filePath);
		} else {
			// Re-read from disk to pick up any external modifications (e.g., file_edit)
			sourceFile.refreshFromFileSystemSync();
		}

		if (!sourceFile) {
			return emptyUnifiedResult();
		}

		// Extract symbols using our ts-morph extractor
		const symbols = extractSymbols(sourceFile);

		// Populate reference/implementation counts using workspace project
		try {
			const langSvc = project.getLanguageService();
			const identMap = buildIdentifierMap(sourceFile);
			populateExtractedSymbolRefs(symbols, sourceFile, identMap, langSvc);
		} catch {
			// Reference counting is best-effort — continue without ref data
		}

		// Convert symbol ranges to flat list for orphaned content detection
		const symbolRanges = flattenSymbolRanges(symbols);

		// Extract orphaned content (imports, exports, comments, directives, gaps)
		const orphaned = extractOrphanedContent(filePath, symbolRanges);

		// Get file content and total lines (use same line-counting method as getRange for consistency)
		const content = sourceFile.getFullText();
		const totalLines = sourceFile.compilerNode.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;

		// Detect parse-level syntax errors (not type errors) for downstream consumers
		const parseDiags = Reflect.get(sourceFile.compilerNode, 'parseDiagnostics');
		const hasSyntaxErrors = Array.isArray(parseDiags) && parseDiags.length > 0;

		return {
			content,
			directives: orphaned.directives,
			exports: orphaned.exports,
			gaps: orphaned.gaps,
			hasSyntaxErrors,
			imports: orphaned.imports,
			orphanComments: orphaned.orphanComments,
			stats: orphaned.stats,
			symbols,
			totalLines
		};
	} catch {
		return emptyUnifiedResult();
	}
}

function emptyUnifiedResult(): UnifiedFileResult {
	return {
		content: '',
		directives: [],
		exports: [],
		gaps: [],
		hasSyntaxErrors: false,
		imports: [],
		orphanComments: [],
		stats: {
			coveragePercent: 0,
			totalBlankLines: 0,
			totalDirectives: 0,
			totalExports: 0,
			totalImports: 0,
			totalOrphanComments: 0
		},
		symbols: [],
		totalLines: 0
	};
}
