/**
 * Phase 3, Item 14 — Type guard / narrowing resolver.
 *
 * Analyzes a function or method body for type narrowing constructs:
 * user-defined type guards (x is T), assertion functions (asserts x is T),
 * typeof, instanceof, in-operator, discriminated unions, nullish checks,
 * equality, Array.isArray, early-return guard clauses, exhaustiveness checks,
 * and compound guards.
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type {
	SourceFile,
	FunctionDeclaration,
	MethodDeclaration,
	IfStatement,
	BinaryExpression,
	TypeOfExpression,
	CallExpression,
	PrefixUnaryExpression,
	ReturnStatement,
	VariableDeclaration,
	Expression,
} from 'ts-morph';
import * as path from 'node:path';

import type { SymbolRef, TypeGuardEntry, TypeGuardAnalysis, TypeGuardKind } from './types';

export type { TypeGuardEntry, TypeGuardAnalysis, TypeGuardKind } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve type guards and narrowing constructs in a function/method body.
 *
 * @param project       - ts-morph Project with all relevant source files added.
 * @param filePath      - Absolute path of the file containing the target symbol.
 * @param symbolName    - Name of the function or method to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns TypeGuardAnalysis with all discovered narrowing constructs.
 */
export function resolveTypeGuards(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
): TypeGuardAnalysis {
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

	const guards: TypeGuardEntry[] = [];

	// Check return type for user-defined type guards / assertion functions
	collectReturnTypeGuards(declaration, guards);

	// Walk the body for narrowing constructs
	const body = declaration.getBody?.();
	if (body) {
		walkForGuards(body, guards);
	}

	// Sort by line
	guards.sort((a, b) => a.line - b.line);

	return { symbol, guards };
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
// Return type guard detection (x is T / asserts x is T)
// ---------------------------------------------------------------------------

function collectReturnTypeGuards(
	declaration: CallableNode,
	guards: TypeGuardEntry[],
): void {
	const returnTypeNode = declaration.getReturnTypeNode();
	if (!returnTypeNode) return;

	const returnText = returnTypeNode.getText().trim();
	const line = returnTypeNode.getStartLineNumber();

	// "x is Type" pattern
	const isMatch = returnText.match(/^(\w+)\s+is\s+(.+)$/);
	if (isMatch) {
		guards.push({
			kind: 'user-defined',
			line,
			guardText: returnText,
			narrowedName: isMatch[1],
			narrowedTo: isMatch[2].trim(),
			isReturnTypeGuard: true,
		});
		return;
	}

	// "asserts x is Type" or "asserts x" pattern
	const assertsIsMatch = returnText.match(/^asserts\s+(\w+)\s+is\s+(.+)$/);
	if (assertsIsMatch) {
		guards.push({
			kind: 'assertion',
			line,
			guardText: returnText,
			narrowedName: assertsIsMatch[1],
			narrowedTo: assertsIsMatch[2].trim(),
			isReturnTypeGuard: true,
		});
		return;
	}

	const assertsMatch = returnText.match(/^asserts\s+(\w+)$/);
	if (assertsMatch) {
		guards.push({
			kind: 'assertion',
			line,
			guardText: returnText,
			narrowedName: assertsMatch[1],
			isReturnTypeGuard: true,
		});
	}
}

// ---------------------------------------------------------------------------
// AST walk — identify narrowing constructs in function body
// ---------------------------------------------------------------------------

function walkForGuards(node: Node, guards: TypeGuardEntry[]): void {
	// If statements — primary source of guards
	if (Node.isIfStatement(node)) {
		collectIfStatementGuards(node, guards);
	}

	// Switch statements — discriminated unions
	if (Node.isSwitchStatement(node)) {
		collectSwitchGuards(node, guards);
	}

	// Variable declarations — exhaustiveness checks
	if (Node.isVariableDeclaration(node)) {
		collectExhaustivenessCheck(node, guards);
	}

	for (const child of node.getChildren()) {
		walkForGuards(child, guards);
	}
}

function collectIfStatementGuards(
	ifStmt: IfStatement,
	guards: TypeGuardEntry[],
): void {
	const condition = ifStmt.getExpression();
	const thenBlock = ifStmt.getThenStatement();

	// Check for early-return guard clauses: if (!x) return;
	if (isEarlyReturnGuard(condition, thenBlock)) {
		const negated = extractNegatedName(condition);
		if (negated) {
			guards.push({
				kind: 'early-return',
				line: ifStmt.getStartLineNumber(),
				guardText: condition.getText().trim(),
				narrowedName: negated,
			});
			return;
		}
	}

	// Collect guards from the condition expression
	collectExpressionGuards(condition, guards);
}

// ---------------------------------------------------------------------------
// Expression-level guard detection
// ---------------------------------------------------------------------------

function collectExpressionGuards(
	expr: Expression,
	guards: TypeGuardEntry[],
): void {
	// Binary expressions: typeof x === 'string', x instanceof Y, 'key' in x, x.kind === 'circle', x === 'foo', x != null
	if (Node.isBinaryExpression(expr)) {
		collectBinaryGuards(expr, guards);
		return;
	}

	// Prefix unary: !x (truthiness in if conditions) — but we handle this via early-return
	// typeof expression standalone — unlikely in condition position, skip

	// Call expression: Array.isArray(x)
	if (Node.isCallExpression(expr)) {
		collectCallGuards(expr, guards);
		return;
	}

	// Parenthesized: unwrap
	if (Node.isParenthesizedExpression(expr)) {
		collectExpressionGuards(expr.getExpression(), guards);
		return;
	}
}

function collectBinaryGuards(
	expr: BinaryExpression,
	guards: TypeGuardEntry[],
): void {
	const op = expr.getOperatorToken().getText();
	const left = expr.getLeft();
	const right = expr.getRight();
	const line = expr.getStartLineNumber();
	const guardText = expr.getText().trim();

	// Compound guards: left || right, left && right with both sides being guards
	if (op === '||' || op === '&&') {
		const leftGuards: TypeGuardEntry[] = [];
		const rightGuards: TypeGuardEntry[] = [];

		collectExpressionGuards(left, leftGuards);
		collectExpressionGuards(right, rightGuards);

		if (leftGuards.length > 0 && rightGuards.length > 0) {
			// Compound guard — extract narrowed names from sub-guards
			const names = new Set<string>();
			for (const g of [...leftGuards, ...rightGuards]) {
				names.add(g.narrowedName);
			}
			const narrowedTo = [...leftGuards, ...rightGuards]
				.map(g => g.narrowedTo)
				.filter((t): t is string => t !== undefined)
				.join(' | ');

			guards.push({
				kind: 'compound',
				line,
				guardText,
				narrowedName: [...names].join(', '),
				narrowedTo: narrowedTo || undefined,
			});
		} else {
			// Only one side is a guard — add them individually
			guards.push(...leftGuards, ...rightGuards);
		}
		return;
	}

	// typeof x === 'type'  /  'type' === typeof x
	if (op === '===' || op === '==' || op === '!==' || op === '!=') {
		const typeofResult = extractTypeofGuard(left, right, op);
		if (typeofResult) {
			guards.push({
				kind: 'typeof',
				line,
				guardText,
				narrowedName: typeofResult.name,
				narrowedTo: typeofResult.type,
			});
			return;
		}

		// x != null / x !== null / x != undefined / x !== undefined — nullish
		const nullishResult = extractNullishGuard(left, right, op);
		if (nullishResult) {
			guards.push({
				kind: 'nullish',
				line,
				guardText,
				narrowedName: nullishResult,
			});
			return;
		}

		// x.kind === 'circle' — discriminant
		const discriminantResult = extractDiscriminantGuard(left, right, op);
		if (discriminantResult) {
			guards.push({
				kind: 'discriminant',
				line,
				guardText,
				narrowedName: discriminantResult.name,
				narrowedTo: discriminantResult.value,
			});
			return;
		}

		// x === 'literal' — equality narrowing
		const equalityResult = extractEqualityGuard(left, right, op);
		if (equalityResult) {
			guards.push({
				kind: 'equality',
				line,
				guardText,
				narrowedName: equalityResult.name,
				narrowedTo: equalityResult.value,
			});
			return;
		}
	}

	// x instanceof Y
	if (op === 'instanceof') {
		const name = extractIdentifierName(left);
		const typeName = extractIdentifierName(right);
		if (name && typeName) {
			guards.push({
				kind: 'instanceof',
				line,
				guardText,
				narrowedName: name,
				narrowedTo: typeName,
			});
		}
		return;
	}

	// 'key' in obj
	if (op === 'in') {
		const objName = extractIdentifierName(right);
		const key = extractStringLiteralValue(left);
		if (objName && key) {
			guards.push({
				kind: 'in-operator',
				line,
				guardText,
				narrowedName: objName,
				narrowedTo: key,
			});
		}
		return;
	}
}

function collectCallGuards(expr: CallExpression, guards: TypeGuardEntry[]): void {
	const callText = expr.getExpression().getText().trim();
	const line = expr.getStartLineNumber();

	// Array.isArray(x)
	if (callText === 'Array.isArray') {
		const args = expr.getArguments();
		if (args.length > 0) {
			const argName = extractIdentifierName(args[0]);
			if (argName) {
				guards.push({
					kind: 'array-isarray',
					line,
					guardText: expr.getText().trim(),
					narrowedName: argName,
					narrowedTo: 'Array',
				});
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Switch statement — discriminated union detection
// ---------------------------------------------------------------------------

function collectSwitchGuards(node: Node, guards: TypeGuardEntry[]): void {
	if (!Node.isSwitchStatement(node)) return;

	const switchExpr = node.getExpression();
	const switchText = switchExpr.getText().trim();

	// Only treat as discriminant if switching on x.kind, x.type, etc. (property access)
	if (!Node.isPropertyAccessExpression(switchExpr)) return;

	const objExpr = switchExpr.getExpression();
	const objName = extractIdentifierName(objExpr);
	if (!objName) return;

	for (const clause of node.getClauses()) {
		if (Node.isCaseClause(clause)) {
			const caseExpr = clause.getExpression();
			const caseValue = extractLiteralValue(caseExpr);
			if (caseValue !== undefined) {
				guards.push({
					kind: 'discriminant',
					line: clause.getStartLineNumber(),
					guardText: `${switchText} === ${caseExpr.getText().trim()}`,
					narrowedName: objName,
					narrowedTo: String(caseValue),
				});
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Exhaustiveness check detection
// ---------------------------------------------------------------------------

function collectExhaustivenessCheck(
	varDecl: VariableDeclaration,
	guards: TypeGuardEntry[],
): void {
	const typeNode = varDecl.getTypeNode();
	if (!typeNode) return;

	const typeText = typeNode.getText().trim();
	if (typeText !== 'never') return;

	const initializer = varDecl.getInitializer();
	if (!initializer) return;

	const initName = extractIdentifierName(initializer);
	if (!initName) return;

	guards.push({
		kind: 'exhaustive',
		line: varDecl.getStartLineNumber(),
		guardText: `${varDecl.getName()}: never = ${initName}`,
		narrowedName: initName,
		narrowedTo: 'never',
	});
}

// ---------------------------------------------------------------------------
// Early-return guard detection
// ---------------------------------------------------------------------------

function isEarlyReturnGuard(condition: Expression, thenBlock: Node): boolean {
	// Check if the then-block is or contains a return/throw statement
	if (Node.isReturnStatement(thenBlock) || Node.isThrowStatement(thenBlock)) return true;
	if (Node.isBlock(thenBlock)) {
		const stmts = thenBlock.getStatements();
		if (stmts.length > 0) {
			const last = stmts[stmts.length - 1];
			if (Node.isReturnStatement(last) || Node.isThrowStatement(last)) return true;
		}
	}
	return false;
}

function extractNegatedName(expr: Expression): string | undefined {
	// !x
	if (Node.isPrefixUnaryExpression(expr)) {
		const operand = expr.getOperand();
		if (expr.getOperatorToken() === SyntaxKind.ExclamationToken) {
			return extractIdentifierName(operand);
		}
	}

	// x == null, x === null, x == undefined, x === undefined
	// Only EQUALITY checks — these represent "if bad, bail" guard clauses.
	// x != null / x !== null are POSITIVE checks (happy path) and should not
	// be treated as early-return guard clauses.
	if (Node.isBinaryExpression(expr)) {
		const op = expr.getOperatorToken().getText();
		if (op === '==' || op === '===') {
			const left = expr.getLeft();
			const right = expr.getRight();
			const nullish = isNullishLiteral(left) ? right : isNullishLiteral(right) ? left : undefined;
			if (nullish) {
				return extractIdentifierName(nullish);
			}
		}
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Guard extraction helpers
// ---------------------------------------------------------------------------

function extractTypeofGuard(
	left: Expression,
	right: Expression,
	_op: string,
): { name: string; type: string } | undefined {
	// typeof x === 'string'
	if (Node.isTypeOfExpression(left) && Node.isStringLiteral(right)) {
		const name = extractIdentifierName(left.getExpression());
		if (name) return { name, type: right.getLiteralValue() };
	}

	// 'string' === typeof x
	if (Node.isStringLiteral(left) && Node.isTypeOfExpression(right)) {
		const name = extractIdentifierName(right.getExpression());
		if (name) return { name, type: left.getLiteralValue() };
	}

	return undefined;
}

function extractNullishGuard(
	left: Expression,
	right: Expression,
	op: string,
): string | undefined {
	// x != null, x !== null, x !== undefined
	if ((op === '!=' || op === '!==') && isNullishLiteral(right)) {
		return extractIdentifierName(left);
	}
	if ((op === '!=' || op === '!==') && isNullishLiteral(left)) {
		return extractIdentifierName(right);
	}
	// x == null, x === null (truthy check for nullish — still a nullish guard)
	if ((op === '==' || op === '===') && isNullishLiteral(right)) {
		return extractIdentifierName(left);
	}
	if ((op === '==' || op === '===') && isNullishLiteral(left)) {
		return extractIdentifierName(right);
	}
	return undefined;
}

function extractDiscriminantGuard(
	left: Expression,
	right: Expression,
	op: string,
): { name: string; value: string } | undefined {
	if (op !== '===' && op !== '==') return undefined;

	// x.kind === 'circle'
	if (Node.isPropertyAccessExpression(left)) {
		const value = extractLiteralValue(right);
		if (value !== undefined) {
			const objName = extractIdentifierName(left.getExpression());
			if (objName) return { name: objName, value: String(value) };
		}
	}

	// 'circle' === x.kind
	if (Node.isPropertyAccessExpression(right)) {
		const value = extractLiteralValue(left);
		if (value !== undefined) {
			const objName = extractIdentifierName(right.getExpression());
			if (objName) return { name: objName, value: String(value) };
		}
	}

	return undefined;
}

function extractEqualityGuard(
	left: Expression,
	right: Expression,
	op: string,
): { name: string; value: string } | undefined {
	if (op !== '===' && op !== '==') return undefined;

	// x === 'literal'
	if (Node.isIdentifier(left)) {
		const value = extractLiteralValue(right);
		if (value !== undefined) return { name: left.getText(), value: String(value) };
	}

	// 'literal' === x
	if (Node.isIdentifier(right)) {
		const value = extractLiteralValue(left);
		if (value !== undefined) return { name: right.getText(), value: String(value) };
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function extractIdentifierName(expr: Node): string | undefined {
	if (Node.isIdentifier(expr)) return expr.getText();
	if (Node.isParenthesizedExpression(expr)) return extractIdentifierName(expr.getExpression());
	return undefined;
}

function extractStringLiteralValue(expr: Node): string | undefined {
	if (Node.isStringLiteral(expr)) return expr.getLiteralValue();
	return undefined;
}

function extractLiteralValue(expr: Node): string | number | boolean | undefined {
	if (Node.isStringLiteral(expr)) return expr.getLiteralValue();
	if (Node.isNumericLiteral(expr)) return expr.getLiteralValue();
	if (expr.getKind() === SyntaxKind.TrueKeyword) return true;
	if (expr.getKind() === SyntaxKind.FalseKeyword) return false;
	return undefined;
}

function isNullishLiteral(expr: Node): boolean {
	if (Node.isNullLiteral(expr)) return true;
	if (Node.isIdentifier(expr) && expr.getText() === 'undefined') return true;
	return false;
}
