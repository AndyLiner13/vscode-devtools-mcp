/**
 * Phase 3, Item 20 — Module-Level Side Effects resolver.
 *
 * Detects code that executes when a module loads:
 * - IIFEs (immediately invoked function expressions)
 * - Top-level function/method calls
 * - Side-effect imports (import 'polyfill')
 * - Top-level await expressions
 * - Top-level assignments (process.env.X = 'y')
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type { SourceFile, Statement, Expression } from 'ts-morph';
import { toRelativePosixPath } from './paths.js';

import type {
	SideEffectKind,
	SideEffectEntry,
	SideEffectAnalysis,
} from './types.js';

export type {
	SideEffectKind,
	SideEffectEntry,
	SideEffectAnalysis,
} from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve module-level side effects for a source file.
 *
 * Scans top-level statements for code that executes at module load time.
 *
 * @param project       - ts-morph Project.
 * @param filePath      - Absolute path of the file to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 */
export function resolveSideEffects(
	project: Project,
	filePath: string,
	workspaceRoot: string,
): SideEffectAnalysis {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const relativePath = toRelativePosixPath(workspaceRoot, filePath);

	const effects: SideEffectEntry[] = [];

	for (const stmt of sourceFile.getStatements()) {
		collectFromStatement(stmt, effects, false);
	}

	return { filePath: relativePath, effects };
}

// ---------------------------------------------------------------------------
// Statement-level side-effect collection
// ---------------------------------------------------------------------------

function collectFromStatement(
	stmt: Statement,
	effects: SideEffectEntry[],
	isConditional: boolean,
): void {
	const kind = stmt.getKind();

	// Side-effect import: import 'polyfill'
	if (Node.isImportDeclaration(stmt)) {
		if (isSideEffectImport(stmt)) {
			const moduleSpecifier = stmt.getModuleSpecifierValue();
			effects.push({
				kind: 'side-effect-import',
				text: stmt.getText().trim(),
				line: stmt.getStartLineNumber(),
				targetName: moduleSpecifier,
				isConditional,
			});
		}
		return;
	}

	// Skip declarations that are NOT side effects
	if (isDeclarationOnly(stmt)) return;

	// Variable statement with await initializer: const x = await fetch(...)
	if (Node.isVariableStatement(stmt)) {
		for (const decl of stmt.getDeclarations()) {
			const init = decl.getInitializer();
			if (init && Node.isAwaitExpression(init)) {
				const awaited = init.getExpression();
				let targetName: string | undefined;
				if (Node.isCallExpression(awaited)) {
					targetName = extractCallName(awaited);
				}
				effects.push({
					kind: 'top-level-await',
					text: stmt.getText().trim(),
					line: stmt.getStartLineNumber(),
					targetName,
					isConditional,
				});
			}
		}
		return;
	}

	// Expression statement: calls, IIFE, assignments, top-level await
	if (Node.isExpressionStatement(stmt)) {
		const expr = stmt.getExpression();
		collectFromExpression(expr, stmt, effects, isConditional);
		return;
	}

	// Top-level if/try/switch/for/while — recurse with isConditional = true
	if (Node.isIfStatement(stmt)) {
		const thenStmt = stmt.getThenStatement();
		collectFromBlock(thenStmt, effects, true);
		const elseStmt = stmt.getElseStatement();
		if (elseStmt) {
			collectFromBlock(elseStmt, effects, true);
		}
		return;
	}

	if (Node.isTryStatement(stmt)) {
		const tryBlock = stmt.getTryBlock();
		if (tryBlock) {
			for (const s of tryBlock.getStatements()) {
				collectFromStatement(s, effects, true);
			}
		}
		const catchClause = stmt.getCatchClause();
		if (catchClause) {
			for (const s of catchClause.getBlock().getStatements()) {
				collectFromStatement(s, effects, true);
			}
		}
		const finallyBlock = stmt.getFinallyBlock();
		if (finallyBlock) {
			for (const s of finallyBlock.getStatements()) {
				collectFromStatement(s, effects, true);
			}
		}
		return;
	}

	if (Node.isForStatement(stmt) || Node.isForInStatement(stmt) || Node.isForOfStatement(stmt)) {
		const body = stmt.getStatement();
		if (body) {
			collectFromBlock(body, effects, true);
		}
		return;
	}

	if (Node.isWhileStatement(stmt) || Node.isDoStatement(stmt)) {
		const body = stmt.getStatement();
		if (body) {
			collectFromBlock(body, effects, true);
		}
		return;
	}

	if (Node.isSwitchStatement(stmt)) {
		for (const clause of stmt.getClauses()) {
			for (const s of clause.getStatements()) {
				collectFromStatement(s, effects, true);
			}
		}
		return;
	}
}

function collectFromBlock(
	node: Statement | Node,
	effects: SideEffectEntry[],
	isConditional: boolean,
): void {
	if (Node.isBlock(node)) {
		for (const s of node.getStatements()) {
			collectFromStatement(s, effects, isConditional);
		}
	} else if (Node.isStatement(node)) {
		collectFromStatement(node, effects, isConditional);
	}
}

// ---------------------------------------------------------------------------
// Expression-level side-effect detection
// ---------------------------------------------------------------------------

function collectFromExpression(
	expr: Expression,
	stmt: Statement,
	effects: SideEffectEntry[],
	isConditional: boolean,
): void {
	// Top-level await
	if (Node.isAwaitExpression(expr)) {
		const awaited = expr.getExpression();
		let targetName: string | undefined;
		if (Node.isCallExpression(awaited)) {
			targetName = extractCallName(awaited);
		}
		effects.push({
			kind: 'top-level-await',
			text: stmt.getText().trim(),
			line: stmt.getStartLineNumber(),
			targetName,
			isConditional,
		});
		return;
	}

	// IIFE: (function() {})() or (() => {})()
	if (Node.isCallExpression(expr)) {
		const callee = expr.getExpression();

		if (isIIFE(callee)) {
			effects.push({
				kind: 'iife',
				text: truncateText(stmt.getText().trim()),
				line: stmt.getStartLineNumber(),
				isConditional,
			});
			return;
		}

		// Regular top-level call
		const targetName = extractCallName(expr);
		effects.push({
			kind: 'call',
			text: stmt.getText().trim(),
			line: stmt.getStartLineNumber(),
			targetName,
			isConditional,
		});
		return;
	}

	// Assignment: process.env.X = 'y', globalThis.foo = bar
	if (Node.isBinaryExpression(expr)) {
		const operatorToken = expr.getOperatorToken();
		const opKind = operatorToken.getKind();
		if (isAssignmentOperator(opKind)) {
			const targetName = expr.getLeft().getText().trim();
			effects.push({
				kind: 'assignment',
				text: stmt.getText().trim(),
				line: stmt.getStartLineNumber(),
				targetName,
				isConditional,
			});
			return;
		}
	}

	// Comma expressions — check each operand
	if (Node.isCommaListExpression?.(expr)) {
		for (const element of expr.getElements()) {
			collectFromExpression(element, stmt, effects, isConditional);
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSideEffectImport(importDecl: Node): boolean {
	if (!Node.isImportDeclaration(importDecl)) return false;
	const importClause = importDecl.getImportClause();
	return !importClause;
}

function isIIFE(callee: Expression): boolean {
	// Direct: (function() {})()
	if (Node.isFunctionExpression(callee)) return true;
	// Direct: (() => {})()
	if (Node.isArrowFunction(callee)) return true;
	// Parenthesized: (function() {})() or (()=>{})()
	if (Node.isParenthesizedExpression(callee)) {
		const inner = callee.getExpression();
		return Node.isFunctionExpression(inner) || Node.isArrowFunction(inner);
	}
	return false;
}

function extractCallName(callExpr: Node): string | undefined {
	if (!Node.isCallExpression(callExpr)) return undefined;
	const expr = callExpr.getExpression();

	// Simple identifier: foo()
	if (Node.isIdentifier(expr)) return expr.getText();

	// Property access: foo.bar() or foo.bar.baz()
	if (Node.isPropertyAccessExpression(expr)) return expr.getText();

	// Element access: foo['bar']()
	if (Node.isElementAccessExpression(expr)) return expr.getText();

	return undefined;
}

function isDeclarationOnly(stmt: Statement): boolean {
	const kind = stmt.getKind();
	return (
		kind === SyntaxKind.FunctionDeclaration ||
		kind === SyntaxKind.ClassDeclaration ||
		kind === SyntaxKind.InterfaceDeclaration ||
		kind === SyntaxKind.TypeAliasDeclaration ||
		kind === SyntaxKind.EnumDeclaration ||
		kind === SyntaxKind.ModuleDeclaration ||
		kind === SyntaxKind.ExportDeclaration ||
		kind === SyntaxKind.ExportAssignment
	);
}

function isAssignmentOperator(kind: SyntaxKind): boolean {
	return (
		kind === SyntaxKind.EqualsToken ||
		kind === SyntaxKind.PlusEqualsToken ||
		kind === SyntaxKind.MinusEqualsToken ||
		kind === SyntaxKind.AsteriskEqualsToken ||
		kind === SyntaxKind.SlashEqualsToken ||
		kind === SyntaxKind.PercentEqualsToken ||
		kind === SyntaxKind.AmpersandEqualsToken ||
		kind === SyntaxKind.BarEqualsToken ||
		kind === SyntaxKind.CaretEqualsToken ||
		kind === SyntaxKind.LessThanLessThanEqualsToken ||
		kind === SyntaxKind.GreaterThanGreaterThanEqualsToken ||
		kind === SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
		kind === SyntaxKind.AsteriskAsteriskEqualsToken ||
		kind === SyntaxKind.BarBarEqualsToken ||
		kind === SyntaxKind.AmpersandAmpersandEqualsToken ||
		kind === SyntaxKind.QuestionQuestionEqualsToken
	);
}

function truncateText(text: string, maxLength = 200): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}
