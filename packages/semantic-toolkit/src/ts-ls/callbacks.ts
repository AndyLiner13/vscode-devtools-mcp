/**
 * Phase 3, Item 15 — Callback / Higher-Order Function resolver.
 *
 * Analyzes how functions are passed as arguments (callbacks) and detects
 * higher-order function patterns. Uses project-wide reference search to
 * find all sites where a function is used as a callback. Unwraps .bind()
 * wrappers to detect bound method references.
 */
import { Project, Node, SyntaxKind, Type } from 'ts-morph';
import type {
	SourceFile,
	FunctionDeclaration,
	MethodDeclaration,
	ParameterDeclaration,
	CallExpression,
} from 'ts-morph';
import { toRelativePosixPath } from './paths';

import type {
	SymbolRef,
	CallbackUsage,
	CallbackParameter,
	CallbackAnalysis,
} from './types';

export type { CallbackUsage, CallbackParameter, CallbackAnalysis } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve callback analysis for a named function or method.
 *
 * Discovers:
 * 1. Where this function is passed as a callback argument (project-wide).
 * 2. Whether this function is a HOF (has callback-typed parameters).
 * 3. Whether this function returns a function type.
 *
 * @param project       - ts-morph Project with all relevant source files added.
 * @param filePath      - Absolute path of the file containing the target symbol.
 * @param symbolName    - Name of the function or method to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns CallbackAnalysis with usedAsCallbackIn, callbackParameters, returnsFunction.
 */
export function resolveCallbacks(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
): CallbackAnalysis {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const declaration = findCallable(sourceFile, symbolName);

	if (!declaration) {
		throw new Error(
			`Callable symbol "${symbolName}" not found in ${filePath}`,
		);
	}

	const relativePath = toRelativePosixPath(workspaceRoot, filePath);
	const symbol: SymbolRef = {
		name: symbolName,
		filePath: relativePath,
		line: declaration.getStartLineNumber(),
	};

	const usedAsCallbackIn = findCallbackUsages(declaration, symbolName, workspaceRoot);
	const callbackParameters = findCallbackParameters(declaration);
	const { returnsFunction, returnFunctionType } = analyzeReturnType(declaration);

	return {
		symbol,
		usedAsCallbackIn,
		callbackParameters,
		returnsFunction,
		returnFunctionType,
	};
}

// ---------------------------------------------------------------------------
// Declaration lookup
// ---------------------------------------------------------------------------

type CallableNode = FunctionDeclaration | MethodDeclaration;

function findCallable(
	sourceFile: SourceFile,
	name: string,
): CallableNode | undefined {
	const fn = sourceFile.getFunction(name);
	if (fn) return fn;

	for (const cls of sourceFile.getClasses()) {
		const method = cls.getMethod(name);
		if (method) return method;
	}

	for (const ns of sourceFile.getModules()) {
		const fn = ns.getFunction(name);
		if (fn) return fn;
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Callback usage detection (project-wide)
// ---------------------------------------------------------------------------

function findCallbackUsages(
	declaration: CallableNode,
	symbolName: string,
	workspaceRoot: string,
): CallbackUsage[] {
	const usages: CallbackUsage[] = [];
	const definitionLine = declaration.getStartLineNumber();
	const definitionFile = declaration.getSourceFile().getFilePath();

	const refNodes = declaration.findReferencesAsNodes();

	for (const refNode of refNodes) {
		const refFile = refNode.getSourceFile();
		const refPath = refFile.getFilePath();

		if (refPath.endsWith('.d.ts') || refPath.includes('node_modules')) continue;

		const refLine = refNode.getStartLineNumber();
		if (refPath === definitionFile && refLine === definitionLine) continue;

		// Check if this reference is used as a callback argument
		const usage = classifyAsCallback(refNode, symbolName, refPath, workspaceRoot);
		if (usage) {
			usages.push(usage);
		}
	}

	usages.sort((a, b) => {
		const fileCmp = a.filePath.localeCompare(b.filePath);
		if (fileCmp !== 0) return fileCmp;
		return a.line - b.line;
	});

	return usages;
}

/**
 * Check if a reference node is being used as a callback argument.
 *
 * Handles:
 * - Direct argument: `arr.map(myFunc)` or `retry(myFunc, 3)`
 * - Through type casts: `retry(myFunc as unknown as T, 3)`
 * - Bind wrapper: `nums.forEach(this.myFunc.bind(this))`
 * - Property access: `this.method` used as argument
 */
function classifyAsCallback(
	refNode: Node,
	symbolName: string,
	refFilePath: string,
	workspaceRoot: string,
): CallbackUsage | undefined {
	let current: Node = refNode;
	let isBound = false;

	// Unwrap PropertyAccessExpression: this.format → use the parent PAE
	const refParent = current.getParent();
	if (refParent && Node.isPropertyAccessExpression(refParent) && refParent.getName() === symbolName) {
		current = refParent;
	}

	// Check for .bind() wrapper: current → PAE(.bind) → CallExpression(.bind(...))
	const bindParent = current.getParent();
	if (bindParent && Node.isPropertyAccessExpression(bindParent) && bindParent.getName() === 'bind') {
		const bindCall = bindParent.getParent();
		if (bindCall && Node.isCallExpression(bindCall)) {
			current = bindCall;
			isBound = true;
		}
	}

	// Unwrap type assertions: `fn as unknown as T` → AsExpression chain
	current = unwrapExpressionWrappers(current);

	// Now check if `current` is a direct argument to a call
	const directResult = findCallExpressionParent(current);
	if (directResult) {
		const relativePath = toRelativePosixPath(workspaceRoot, refFilePath);
		return {
			callbackName: symbolName,
			calledBy: directResult.calledBy,
			filePath: relativePath,
			line: refNode.getStartLineNumber(),
			parameterIndex: directResult.parameterIndex,
			boundWithBind: isBound || undefined,
		};
	}

	return undefined;
}

/**
 * Walk up through AsExpression, ParenthesizedExpression, and similar
 * wrapper nodes that don't change the identity of the expression.
 */
function unwrapExpressionWrappers(node: Node): Node {
	let current = node;
	for (;;) {
		const parent = current.getParent();
		if (!parent) return current;

		if (Node.isAsExpression(parent) || Node.isParenthesizedExpression(parent)) {
			current = parent;
			continue;
		}

		// TypeScript 'satisfies' expression
		if (parent.getKind() === SyntaxKind.SatisfiesExpression) {
			current = parent;
			continue;
		}

		return current;
	}
}

/**
 * Find if a node is a direct argument of a CallExpression.
 * Returns the receiving function name and parameter index.
 */
function findCallExpressionParent(
	node: Node,
): { calledBy: string; parameterIndex: number } | undefined {
	const parent = node.getParent();
	if (!parent || !Node.isCallExpression(parent)) return undefined;

	// Make sure our node is an argument, not the expression being called
	const args = parent.getArguments();
	const parameterIndex = args.indexOf(node);
	if (parameterIndex === -1) return undefined;

	// Extract the name of the function being called
	const callExpr = parent.getExpression();
	const calledBy = extractCallName(callExpr);
	if (!calledBy) return undefined;

	return { calledBy, parameterIndex };
}

function extractCallName(expr: Node): string | undefined {
	// Simple identifier: retry(fn)
	if (Node.isIdentifier(expr)) return expr.getText();

	// Property access: arr.map(fn), this.setup(fn), emitter.on(fn)
	if (Node.isPropertyAccessExpression(expr)) return expr.getName();

	return undefined;
}

// ---------------------------------------------------------------------------
// Callback parameter detection (HOF analysis)
// ---------------------------------------------------------------------------

function findCallbackParameters(declaration: CallableNode): CallbackParameter[] {
	const params: CallbackParameter[] = [];
	const parameters = declaration.getParameters();

	for (let i = 0; i < parameters.length; i++) {
		const param = parameters[i];
		const type = param.getType();

		if (isFunctionType(type)) {
			const typeText = getCleanTypeText(param);
			params.push({
				name: param.getName(),
				parameterIndex: i,
				type: typeText,
			});
		}
	}

	return params;
}

function isFunctionType(type: Type): boolean {
	// Check if the type has call signatures (i.e., it's callable)
	const callSignatures = type.getCallSignatures();
	if (callSignatures.length > 0) return true;

	// Check union types — any member being a function counts
	if (type.isUnion()) {
		return type.getUnionTypes().some(t => isFunctionType(t));
	}

	return false;
}

function getCleanTypeText(param: ParameterDeclaration): string {
	const typeNode = param.getTypeNode();
	if (typeNode) return typeNode.getText().trim();

	// Fall back to inferred type text
	return param.getType().getText(param).trim();
}

// ---------------------------------------------------------------------------
// Return type analysis
// ---------------------------------------------------------------------------

function analyzeReturnType(declaration: CallableNode): {
	returnsFunction: boolean;
	returnFunctionType?: string;
} {
	const returnTypeNode = declaration.getReturnTypeNode();
	if (returnTypeNode) {
		const text = returnTypeNode.getText().trim();
		// Check if the return type node text looks like a function type
		const returnType = declaration.getReturnType();
		if (isFunctionType(returnType)) {
			return { returnsFunction: true, returnFunctionType: text };
		}
		return { returnsFunction: false };
	}

	// Try inferred return type
	const returnType = declaration.getReturnType();
	if (isFunctionType(returnType)) {
		const text = returnType.getText(declaration).trim();
		return { returnsFunction: true, returnFunctionType: text };
	}

	return { returnsFunction: false };
}
