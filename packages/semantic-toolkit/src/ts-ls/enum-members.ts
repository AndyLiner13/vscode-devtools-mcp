/**
 * Phase 3, Item 18 — Enum Members resolver.
 *
 * Extracts enum member names, values, computed status, and
 * const/declare flags from enum declarations.
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type { SourceFile, EnumDeclaration, EnumMember } from 'ts-morph';
import * as path from 'node:path';

import type {
	SymbolRef,
	EnumMemberEntry,
	EnumAnalysis,
} from './types';

export type {
	EnumMemberEntry,
	EnumAnalysis,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve enum member structure for an enum declaration.
 *
 * @param project       - ts-morph Project.
 * @param filePath      - Absolute path of the file containing the enum.
 * @param enumName      - Name of the enum to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 */
export function resolveEnumMembers(
	project: Project,
	filePath: string,
	enumName: string,
	workspaceRoot: string,
): EnumAnalysis {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const enumDecl = findEnum(sourceFile, enumName);

	if (!enumDecl) {
		throw new Error(
			`Enum "${enumName}" not found in ${filePath}`,
		);
	}

	const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
	const symbol: SymbolRef = {
		name: enumName,
		filePath: relativePath,
		line: enumDecl.getStartLineNumber(),
	};

	const isConst = enumDecl.isConstEnum();

	const modifiers = enumDecl.getModifiers().map(m => m.getText().trim());
	const isDeclare = modifiers.includes('declare');

	const members = extractMembers(enumDecl);

	return { symbol, isConst, isDeclare, members };
}

// ---------------------------------------------------------------------------
// Enum lookup
// ---------------------------------------------------------------------------

function findEnum(
	sourceFile: SourceFile,
	name: string,
): EnumDeclaration | undefined {
	return sourceFile.getEnum(name);
}

// ---------------------------------------------------------------------------
// Member extraction
// ---------------------------------------------------------------------------

function extractMembers(enumDecl: EnumDeclaration): EnumMemberEntry[] {
	const members: EnumMemberEntry[] = [];
	let autoValue = 0;

	for (const member of enumDecl.getMembers()) {
		const name = member.getName();
		const line = member.getStartLineNumber();
		const initializer = member.getInitializer();

		if (initializer) {
			const valueText = initializer.getText().trim();
			const isComputed = !isSimpleLiteral(initializer);
			members.push({ name, value: valueText, isComputed, line });

			// Update auto-increment tracking for numeric literals
			if (Node.isNumericLiteral(initializer)) {
				autoValue = Number(initializer.getLiteralValue()) + 1;
			} else {
				// After a non-numeric initializer, auto-increment is undefined
				// unless the next member has its own initializer
				autoValue = NaN;
			}
		} else {
			// No initializer — auto-increment from last known numeric value
			const value = isNaN(autoValue) ? String(autoValue) : String(autoValue);
			members.push({ name, value, isComputed: false, line });
			autoValue++;
		}
	}

	return members;
}

/**
 * Check if an initializer node is a simple literal (numeric or string).
 * Everything else (binary expressions, property accesses, computed) is considered computed.
 */
function isSimpleLiteral(node: Node): boolean {
	if (Node.isNumericLiteral(node)) return true;
	if (Node.isStringLiteral(node)) return true;

	// Negative numeric literal: -1 is a PrefixUnaryExpression with NumericLiteral
	if (Node.isPrefixUnaryExpression(node)) {
		const operand = node.getOperand();
		return Node.isNumericLiteral(operand);
	}

	// Template literal with no interpolations (NoSubstitutionTemplateLiteral)
	if (node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) return true;

	return false;
}
