/**
 * Phase 3 — Call hierarchy resolver with multi-hop traversal.
 *
 * Item 1: Core resolution (outgoing/incoming) for single hop.
 * Item 2: Multi-hop recursive tree, cycle detection, depth limits,
 *         constructor call resolution, same-name collision fix.
 */
import { SyntaxKind, Node } from 'ts-morph';
import type {
	FunctionDeclaration,
	MethodDeclaration,
	ConstructorDeclaration,
	CallExpression,
	NewExpression,
	Identifier,
} from 'ts-morph';
import { toRelativePosixPath } from './paths.js';

import type {
	TsLsConfig,
	SymbolRef,
	OutgoingCall,
	IncomingCaller,
	SymbolMetadata,
} from './types.js';
import { DEFAULT_TS_LS_CONFIG } from './types.js';
import type { SymbolTarget } from '../shared/types.js';

export type { TsLsConfig, SymbolRef, OutgoingCall, IncomingCaller, SymbolMetadata } from './types.js';
export { DEFAULT_TS_LS_CONFIG } from './types.js';

/** Function or method — valid as top-level query target. */
type CallableDeclaration = FunctionDeclaration | MethodDeclaration;

/** Any callable target including constructors (resolved from call/new expressions). */
type ResolvableDeclaration = FunctionDeclaration | MethodDeclaration | ConstructorDeclaration;

/** Internal: a resolved call target paired with its declaration node. */
interface ResolvedTarget {
	ref: SymbolRef;
	declaration: ResolvableDeclaration | undefined;
	callLine: number;
}

/** Internal: a resolved incoming caller paired with its declaration node. */
interface ResolvedCaller {
	source: SymbolRef;
	declaration: ResolvableDeclaration | undefined;
	lines: number[];
}

/** Unique key for a symbol based on file path and declaration line. */
function symbolKey(ref: SymbolRef): string {
	return `${ref.filePath}:${ref.line}`;
}

/** Check if a node comes from user source (not .d.ts or node_modules). */
function isUserDeclaration(node: Node): boolean {
	const filePath = node.getSourceFile().getFilePath();
	if (filePath.endsWith('.d.ts')) return false;
	if (filePath.includes('node_modules')) return false;
	return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve call hierarchy metadata for a function or method.
 *
 * @param target        - Pre-located SymbolTarget (must be callable kind).
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @param config        - Optional configuration (callDepth, etc.).
 */
export function resolveCallHierarchy(
	target: SymbolTarget,
	workspaceRoot: string,
	config: Partial<TsLsConfig> = {},
): SymbolMetadata {
	const merged: TsLsConfig = { ...DEFAULT_TS_LS_CONFIG, ...config };

	if (!Node.isFunctionDeclaration(target.node) && !Node.isMethodDeclaration(target.node)) {
		throw new Error(
			`Symbol "${target.name}" is not a function or method (kind: ${target.kind})`,
		);
	}

	const declaration = target.node;
	const ref = buildSymbolRef(declaration, workspaceRoot);
	const rootKey = symbolKey(ref);

	const outgoingCalls = resolveOutgoingCallsRecursive(
		declaration, workspaceRoot, 1, merged.callDepth, new Set([rootKey]),
	);
	const incomingCallers = resolveIncomingCallersRecursive(
		declaration, workspaceRoot, 1, merged.callDepth, new Set([rootKey]),
	);

	return { symbol: ref, outgoingCalls, incomingCallers };
}

// ---------------------------------------------------------------------------
// Symbol lookup
// ---------------------------------------------------------------------------
// SymbolRef building
// ---------------------------------------------------------------------------

/** Build a SymbolRef from any resolvable declaration. */
function buildSymbolRef(declaration: ResolvableDeclaration, workspaceRoot: string): SymbolRef {
	const sourceFile = declaration.getSourceFile();
	const absolutePath = sourceFile.getFilePath();
	const relativePath = toRelativePosixPath(workspaceRoot, absolutePath);

	let name: string;
	if (Node.isConstructorDeclaration(declaration)) {
		const parent = declaration.getParent();
		name = (Node.isClassDeclaration(parent) ? parent.getName() : undefined) ?? '<constructor>';
	} else {
		name = declaration.getName() ?? '<anonymous>';
	}

	return { name, filePath: relativePath, line: declaration.getStartLineNumber() };
}

// ---------------------------------------------------------------------------
// Outgoing call resolution (recursive)
// ---------------------------------------------------------------------------

/**
 * Recursively resolve outgoing calls from a declaration body.
 *
 * @param declaration  - The current function/method/constructor being analyzed.
 * @param workspaceRoot - Workspace root for relative paths.
 * @param currentDepth - Current hop depth (starts at 1).
 * @param maxDepth     - Maximum hop depth (-1 for unlimited).
 * @param ancestors    - Set of symbolKeys for ancestors in the current call chain (cycle detection).
 */
function resolveOutgoingCallsRecursive(
	declaration: ResolvableDeclaration,
	workspaceRoot: string,
	currentDepth: number,
	maxDepth: number,
	ancestors: Set<string>,
): OutgoingCall[] {
	const body = declaration.getBody();
	if (!body) return [];

	const targets = collectCallTargets(body, workspaceRoot);
	const grouped = groupCallTargets(targets);
	const result: OutgoingCall[] = [];

	for (const { ref, declaration: targetDecl, lines } of grouped.values()) {
		const targetKey = symbolKey(ref);
		const sortedLines = lines.sort((a, b) => a - b);

		if (ancestors.has(targetKey)) {
			result.push({
				target: ref,
				callSiteLines: sortedLines,
				outgoingCalls: [],
				cyclic: true,
			});
			continue;
		}

		if (maxDepth !== -1 && currentDepth >= maxDepth) {
			const hasMore = targetDecl ? hasResolvableOutgoingCalls(targetDecl, workspaceRoot) : false;
			result.push({
				target: ref,
				callSiteLines: sortedLines,
				outgoingCalls: [],
				depthLimited: hasMore || undefined,
			});
			continue;
		}

		if (!targetDecl) {
			result.push({
				target: ref,
				callSiteLines: sortedLines,
				outgoingCalls: [],
			});
			continue;
		}

		ancestors.add(targetKey);
		const children = resolveOutgoingCallsRecursive(
			targetDecl, workspaceRoot, currentDepth + 1, maxDepth, ancestors,
		);
		ancestors.delete(targetKey);

		result.push({
			target: ref,
			callSiteLines: sortedLines,
			outgoingCalls: children,
		});
	}

	return result;
}

/**
 * Collect all call targets (regular calls + constructor calls) from a body node.
 */
function collectCallTargets(body: Node, workspaceRoot: string): ResolvedTarget[] {
	const targets: ResolvedTarget[] = [];

	for (const callExpr of body.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const decl = resolveCallExpressionTarget(callExpr);
		if (!decl) continue;
		if (!isUserDeclaration(decl)) continue;

		const ref = buildSymbolRef(decl, workspaceRoot);
		targets.push({ ref, declaration: decl, callLine: callExpr.getStartLineNumber() });
	}

	for (const newExpr of body.getDescendantsOfKind(SyntaxKind.NewExpression)) {
		const decl = resolveNewExpressionTarget(newExpr);
		if (!decl) continue;
		if (!isUserDeclaration(decl)) continue;

		const ref = buildSymbolRef(decl, workspaceRoot);
		targets.push({ ref, declaration: decl, callLine: newExpr.getStartLineNumber() });
	}

	return targets;
}

/**
 * Group call targets by unique symbol (filePath:name:line) to merge call sites.
 */
function groupCallTargets(
	targets: ResolvedTarget[],
): Map<string, { ref: SymbolRef; declaration: ResolvableDeclaration | undefined; lines: number[] }> {
	const map = new Map<string, { ref: SymbolRef; declaration: ResolvableDeclaration | undefined; lines: number[] }>();

	for (const { ref, declaration, callLine } of targets) {
		const key = `${ref.filePath}:${ref.name}:${ref.line}`;
		const existing = map.get(key);
		if (existing) {
			if (!existing.lines.includes(callLine)) {
				existing.lines.push(callLine);
			}
		} else {
			map.set(key, { ref, declaration, lines: [callLine] });
		}
	}

	return map;
}

/**
 * Resolve the declaration that a CallExpression targets.
 * Handles direct calls `foo()` and property access `obj.method()`.
 */
function resolveCallExpressionTarget(callExpr: CallExpression): ResolvableDeclaration | undefined {
	const expression = callExpr.getExpression();

	let identifier: Identifier | undefined;

	if (Node.isIdentifier(expression)) {
		identifier = expression;
	} else if (Node.isPropertyAccessExpression(expression)) {
		const nameNode = expression.getNameNode();
		if (Node.isIdentifier(nameNode)) {
			identifier = nameNode;
		}
	}

	if (!identifier) return undefined;

	const definitionNodes = identifier.getDefinitionNodes();
	for (const defNode of definitionNodes) {
		if (Node.isFunctionDeclaration(defNode) || Node.isMethodDeclaration(defNode)) {
			return defNode;
		}
	}

	return undefined;
}

/**
 * Resolve the constructor declaration that a NewExpression targets.
 * For `new Foo()`, resolves to Foo's explicit constructor if it exists.
 */
function resolveNewExpressionTarget(newExpr: NewExpression): ConstructorDeclaration | undefined {
	const expression = newExpr.getExpression();
	if (!Node.isIdentifier(expression)) return undefined;

	const definitionNodes = expression.getDefinitionNodes();
	for (const defNode of definitionNodes) {
		if (Node.isClassDeclaration(defNode)) {
			const constructors = defNode.getConstructors();
			if (constructors.length > 0) {
				return constructors[0];
			}
		}
	}

	return undefined;
}

/** Check if a declaration has any resolvable outgoing calls to user code. */
function hasResolvableOutgoingCalls(declaration: ResolvableDeclaration, workspaceRoot: string): boolean {
	const body = declaration.getBody();
	if (!body) return false;
	return collectCallTargets(body, workspaceRoot).length > 0;
}

// ---------------------------------------------------------------------------
// Incoming caller resolution (recursive)
// ---------------------------------------------------------------------------

/**
 * Recursively resolve incoming callers of a declaration.
 *
 * @param declaration   - The current function/method/constructor being analyzed.
 * @param workspaceRoot - Workspace root for relative paths.
 * @param currentDepth  - Current hop depth (starts at 1).
 * @param maxDepth      - Maximum hop depth (-1 for unlimited).
 * @param descendants   - Set of symbolKeys for descendants in the current caller chain (cycle detection).
 */
function resolveIncomingCallersRecursive(
	declaration: ResolvableDeclaration,
	workspaceRoot: string,
	currentDepth: number,
	maxDepth: number,
	descendants: Set<string>,
): IncomingCaller[] {
	const directCallers = resolveDirectIncomingCallers(declaration, workspaceRoot);
	const result: IncomingCaller[] = [];

	for (const { source, declaration: callerDecl, lines } of directCallers) {
		const callerKey = symbolKey(source);

		if (descendants.has(callerKey)) {
			result.push({
				source,
				callSiteLines: lines,
				incomingCallers: [],
				cyclic: true,
			});
			continue;
		}

		if (maxDepth !== -1 && currentDepth >= maxDepth) {
			const hasMore = callerDecl ? hasCallReferences(callerDecl) : false;
			result.push({
				source,
				callSiteLines: lines,
				incomingCallers: [],
				depthLimited: hasMore || undefined,
			});
			continue;
		}

		if (!callerDecl) {
			result.push({
				source,
				callSiteLines: lines,
				incomingCallers: [],
			});
			continue;
		}

		descendants.add(callerKey);
		const parentCallers = resolveIncomingCallersRecursive(
			callerDecl, workspaceRoot, currentDepth + 1, maxDepth, descendants,
		);
		descendants.delete(callerKey);

		result.push({
			source,
			callSiteLines: lines,
			incomingCallers: parentCallers,
		});
	}

	return result;
}

/**
 * Resolve direct incoming callers (1-hop) of a declaration.
 * Uses ts-morph's findReferencesAsNodes() and filters for call-site references.
 */
function resolveDirectIncomingCallers(
	declaration: ResolvableDeclaration,
	workspaceRoot: string,
): ResolvedCaller[] {
	const nameNode = Node.isConstructorDeclaration(declaration)
		? undefined
		: declaration.getNameNode();

	const referenceNodes = declaration.findReferencesAsNodes();
	const callerMap = new Map<string, ResolvedCaller>();

	for (const refNode of referenceNodes) {
		if (nameNode && refNode === nameNode) continue;

		const callExpr = refNode.getFirstAncestorByKind(SyntaxKind.CallExpression)
			?? refNode.getFirstAncestorByKind(SyntaxKind.NewExpression);
		if (!callExpr) continue;

		const calledExpr = callExpr.getExpression();
		if (!isNodeWithinExpression(refNode, calledExpr)) continue;

		const containingDecl = findContainingResolvable(refNode);
		if (!containingDecl) continue;
		if (!isUserDeclaration(containingDecl)) continue;

		const source = buildSymbolRef(containingDecl, workspaceRoot);
		const key = `${source.filePath}:${source.name}:${source.line}`;
		const callLine = callExpr.getStartLineNumber();
		const existing = callerMap.get(key);

		if (existing) {
			if (!existing.lines.includes(callLine)) {
				existing.lines.push(callLine);
			}
		} else {
			callerMap.set(key, {
				source,
				declaration: containingDecl,
				lines: [callLine],
			});
		}
	}

	return [...callerMap.values()].map(c => ({
		...c,
		lines: c.lines.sort((a, b) => a - b),
	}));
}

/** Check if a declaration is referenced as a call target by any other symbol. */
function hasCallReferences(declaration: ResolvableDeclaration): boolean {
	const nameNode = Node.isConstructorDeclaration(declaration)
		? undefined
		: declaration.getNameNode();

	const refNodes = declaration.findReferencesAsNodes();
	for (const refNode of refNodes) {
		if (nameNode && refNode === nameNode) continue;

		const callExpr = refNode.getFirstAncestorByKind(SyntaxKind.CallExpression)
			?? refNode.getFirstAncestorByKind(SyntaxKind.NewExpression);
		if (callExpr) return true;
	}
	return false;
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Check if a node is the called expression (or part of it) in a CallExpression. */
function isNodeWithinExpression(node: Node, expression: Node): boolean {
	if (node === expression) return true;

	let current: Node | undefined = node;
	while (current) {
		if (current === expression) return true;
		current = current.getParent();
	}
	return false;
}

/**
 * Find the nearest containing function, method, or constructor for a node.
 * Walks up the AST until it finds a resolvable declaration.
 */
function findContainingResolvable(node: Node): ResolvableDeclaration | undefined {
	let current: Node | undefined = node.getParent();
	while (current) {
		if (
			Node.isFunctionDeclaration(current)
			|| Node.isMethodDeclaration(current)
			|| Node.isConstructorDeclaration(current)
		) {
			return current;
		}
		current = current.getParent();
	}
	return undefined;
}
