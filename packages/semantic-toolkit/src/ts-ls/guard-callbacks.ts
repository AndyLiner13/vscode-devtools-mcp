/**
 * Phase 3, Item 16 — Guard Callback resolver.
 *
 * Combines type guard analysis (Item 14) with callback tracking (Item 15)
 * to detect when type guard functions (x is T, asserts x is T) are passed
 * as callbacks. Captures the narrowing relationship including input/output types.
 *
 * Also detects HOF parameters that accept type predicate functions.
 */
import { Project, Node, SyntaxKind, Type } from 'ts-morph';
import type {
	SourceFile,
	FunctionDeclaration,
	MethodDeclaration,
	CallExpression,
} from 'ts-morph';
import * as path from 'node:path';

import type {
	SymbolRef,
	GuardCallbackSite,
	GuardHofParameter,
	GuardCallbackAnalysis,
} from './types';

export type {
	GuardCallbackSite,
	GuardHofParameter,
	GuardCallbackAnalysis,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve guard-callback analysis for a named function or method.
 *
 * Discovers:
 * 1. Where this type guard function is used as a callback argument, with
 *    the narrowing info (predicate kind, target type, input/output types).
 * 2. Whether this function is a HOF with parameters accepting type predicates.
 *
 * @param project       - ts-morph Project.
 * @param filePath      - Absolute path of the file containing the target symbol.
 * @param symbolName    - Name of the function or method to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 */
export function resolveGuardCallbacks(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
): GuardCallbackAnalysis {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const declaration = findCallable(sourceFile, symbolName);

	if (!declaration) {
		throw new Error(
			`Callable symbol "${symbolName}" not found in ${filePath}`,
		);
	}

	const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
	const symbol: SymbolRef = {
		name: symbolName,
		filePath: relativePath,
		line: declaration.getStartLineNumber(),
	};

	const guardCallbackSites = findGuardCallbackSites(declaration, symbolName, workspaceRoot);
	const guardHofParameters = findGuardHofParameters(declaration);

	return { symbol, guardCallbackSites, guardHofParameters };
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
// Type predicate extraction from a function declaration
// ---------------------------------------------------------------------------

interface PredicateInfo {
	kind: 'is' | 'asserts';
	type: string;
}

function extractPredicate(declaration: CallableNode): PredicateInfo | undefined {
	const returnTypeNode = declaration.getReturnTypeNode();
	if (!returnTypeNode) return undefined;

	const text = returnTypeNode.getText().trim();

	// `asserts x is T`
	const assertsMatch = /^asserts\s+\w+\s+is\s+(.+)$/.exec(text);
	if (assertsMatch) {
		return { kind: 'asserts', type: assertsMatch[1].trim() };
	}

	// `asserts x` (without target type — still an asserts predicate)
	if (/^asserts\s+\w+$/.test(text)) {
		return { kind: 'asserts', type: 'unknown' };
	}

	// `x is T`
	const isMatch = /^\w+\s+is\s+(.+)$/.exec(text);
	if (isMatch) {
		return { kind: 'is', type: isMatch[1].trim() };
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Guard callback site detection (project-wide)
// ---------------------------------------------------------------------------

function findGuardCallbackSites(
	declaration: CallableNode,
	symbolName: string,
	workspaceRoot: string,
): GuardCallbackSite[] {
	const predicate = extractPredicate(declaration);
	if (!predicate) return [];

	const sites: GuardCallbackSite[] = [];
	const definitionLine = declaration.getStartLineNumber();
	const definitionFile = declaration.getSourceFile().getFilePath();

	const refNodes = declaration.findReferencesAsNodes();

	for (const refNode of refNodes) {
		const refFile = refNode.getSourceFile();
		const refPath = refFile.getFilePath();

		if (refPath.endsWith('.d.ts') || refPath.includes('node_modules')) continue;

		const refLine = refNode.getStartLineNumber();
		if (refPath === definitionFile && refLine === definitionLine) continue;

		const site = classifyAsGuardCallback(
			refNode, symbolName, refPath, workspaceRoot, predicate,
		);
		if (site) sites.push(site);
	}

	sites.sort((a, b) => {
		const fileCmp = a.filePath.localeCompare(b.filePath);
		if (fileCmp !== 0) return fileCmp;
		return a.line - b.line;
	});

	return sites;
}

function classifyAsGuardCallback(
	refNode: Node,
	symbolName: string,
	refFilePath: string,
	workspaceRoot: string,
	predicate: PredicateInfo,
): GuardCallbackSite | undefined {
	let current: Node = refNode;

	// Unwrap PropertyAccessExpression: this.guard → use the parent PAE
	const refParent = current.getParent();
	if (refParent && Node.isPropertyAccessExpression(refParent) && refParent.getName() === symbolName) {
		current = refParent;
	}

	// Unwrap type assertions (as unknown as ...)
	current = unwrapExpressionWrappers(current);

	// Check if `current` is a direct argument to a call
	const parent = current.getParent();
	if (!parent || !Node.isCallExpression(parent)) return undefined;

	const args = parent.getArguments();
	const parameterIndex = args.indexOf(current);
	if (parameterIndex === -1) return undefined;

	const callExpr = parent.getExpression();
	const calledBy = extractCallName(callExpr);
	if (!calledBy) return undefined;

	const relativePath = path.relative(workspaceRoot, refFilePath).replace(/\\/g, '/');

	// Determine input and narrowed output types
	const { inputType, narrowedOutputType } = resolveNarrowingTypes(parent, calledBy, predicate);

	return {
		guardName: symbolName,
		calledBy,
		filePath: relativePath,
		line: refNode.getStartLineNumber(),
		parameterIndex,
		predicateKind: predicate.kind,
		predicateType: predicate.type,
		inputType,
		narrowedOutputType,
	};
}

// ---------------------------------------------------------------------------
// Expression unwrapping helpers
// ---------------------------------------------------------------------------

function unwrapExpressionWrappers(node: Node): Node {
	let current = node;
	for (;;) {
		const parent = current.getParent();
		if (!parent) return current;

		if (Node.isAsExpression(parent) || Node.isParenthesizedExpression(parent)) {
			current = parent;
			continue;
		}

		if (parent.getKind() === SyntaxKind.SatisfiesExpression) {
			current = parent;
			continue;
		}

		return current;
	}
}

function extractCallName(expr: Node): string | undefined {
	if (Node.isIdentifier(expr)) return expr.getText();
	if (Node.isPropertyAccessExpression(expr)) return expr.getName();
	return undefined;
}

// ---------------------------------------------------------------------------
// Narrowing type resolution via TypeScript's type checker
// ---------------------------------------------------------------------------

/**
 * For calls like `.filter(isUser)`, resolve the input element type and
 * the narrowed output type.
 *
 * For `.filter()` on arrays, the result type is the array with narrowed elements.
 * For other methods, we attempt to get the return type of the call.
 */
function resolveNarrowingTypes(
	callExpression: CallExpression,
	calledBy: string,
	predicate: PredicateInfo,
): { inputType?: string; narrowedOutputType?: string } {
	try {
		// Get the result type of the entire call expression
		const resultType = callExpression.getType();
		const resultText = cleanTypeText(resultType.getText());

		// Try to get the input type — for method calls like arr.filter(guard),
		// the receiver (arr) has the input type
		const expr = callExpression.getExpression();
		let inputType: string | undefined;

		if (Node.isPropertyAccessExpression(expr)) {
			const receiver = expr.getExpression();
			const receiverType = receiver.getType();
			inputType = extractElementType(receiverType);
		}

		// For filter calls, the method return is the narrowed array type
		const narrowedOutputType = resultText;

		return { inputType, narrowedOutputType };
	} catch {
		return {};
	}
}

/**
 * Extract the element type from an array-like type.
 * e.g. `(User | Guest)[]` → `User | Guest`
 */
function extractElementType(type: Type): string | undefined {
	// Check array type argument
	const typeArgs = type.getTypeArguments();
	if (typeArgs.length > 0) {
		return cleanTypeText(typeArgs[0].getText());
	}

	// Check Array<T> pattern
	const text = type.getText();
	const arrayMatch = /^Array<(.+)>$/.exec(text);
	if (arrayMatch) return arrayMatch[1];

	// Check T[] pattern
	const bracketMatch = /^(.+)\[\]$/.exec(text);
	if (bracketMatch) return bracketMatch[1];

	return undefined;
}

function cleanTypeText(text: string): string {
	// Remove import("..."). prefixes that ts-morph adds for cross-file types
	return text.replace(/import\("[^"]*"\)\./g, '').trim();
}

// ---------------------------------------------------------------------------
// Guard HOF parameter detection
// ---------------------------------------------------------------------------

function findGuardHofParameters(declaration: CallableNode): GuardHofParameter[] {
	const params: GuardHofParameter[] = [];
	const parameters = declaration.getParameters();

	for (let i = 0; i < parameters.length; i++) {
		const param = parameters[i];
		const typeNode = param.getTypeNode();
		if (!typeNode) continue;

		const typeText = typeNode.getText().trim();
		const type = param.getType();

		// Check if any call signature has a type predicate return
		const callSigs = type.getCallSignatures();
		if (callSigs.length === 0) continue;

		let hasTypePredicate = false;
		let predicateType: string | undefined;

		for (const sig of callSigs) {
			const returnTypeText = sig.getReturnType().getText();
			// ts-morph reports type predicates in the return type text
			// Check the declaration's return type node for `is` predicate
			const sigDecl = sig.getDeclaration();
			if (sigDecl) {
				const retNode = 'getReturnTypeNode' in sigDecl
					? (sigDecl as { getReturnTypeNode: () => Node | undefined }).getReturnTypeNode()
					: undefined;
				if (retNode) {
					const retText = retNode.getText().trim();
					const isMatch = /^\w+\s+is\s+(.+)$/.exec(retText);
					if (isMatch) {
						hasTypePredicate = true;
						predicateType = isMatch[1].trim();
						break;
					}
				}
			}

			// Fallback: check if the type text contains `is ` pattern
			if (typeText.includes(' is ') && !typeText.startsWith('asserts')) {
				hasTypePredicate = true;
				const isMatch = /\)\s*=>\s*\w+\s+is\s+(\w+)/.exec(typeText);
				if (isMatch) {
					predicateType = isMatch[1];
				}
				break;
			}
		}

		// Only include if it's a callback parameter (has call signatures)
		params.push({
			name: param.getName(),
			parameterIndex: i,
			type: typeText,
			hasTypePredicate,
			predicateType,
		});
	}

	return params;
}
