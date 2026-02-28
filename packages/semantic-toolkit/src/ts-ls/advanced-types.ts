/**
 * Phase 3, Item 17 — Advanced Types resolver.
 *
 * Analyzes type alias declarations to extract the internal structure
 * of conditional types, mapped types, template literal types, and
 * utility types. Supports configurable nesting depth via typeDepth.
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type { SourceFile, TypeAliasDeclaration } from 'ts-morph';
import { toPosixPath, toRelativePosixPath } from './paths.js';

import type {
	SymbolRef,
	AdvancedTypeKind,
	ConditionalTypeInfo,
	MappedTypeInfo,
	TemplateLiteralInfo,
	TemplateLiteralSpan,
	UtilityTypeInfo,
	AdvancedTypeEntry,
	AdvancedTypeAnalysis,
} from './types.js';

export type {
	AdvancedTypeKind,
	ConditionalTypeInfo,
	MappedTypeInfo,
	TemplateLiteralInfo,
	TemplateLiteralSpan,
	UtilityTypeInfo,
	AdvancedTypeEntry,
	AdvancedTypeAnalysis,
} from './types.js';

// ---------------------------------------------------------------------------
// Lib file detection for utility types
// ---------------------------------------------------------------------------

/**
 * Check if a file path belongs to TypeScript's lib declaration files.
 * These contain built-in utility types like Partial, Required, Pick, etc.
 * Matches paths like `.../typescript/lib/lib.es5.d.ts`.
 */
function isTypescriptLibFile(filePath: string): boolean {
	const normalized = toPosixPath(filePath);
	const segments = normalized.split('/');
	const fileName = segments[segments.length - 1] ?? '';
	if (!fileName.startsWith('lib.') || !fileName.endsWith('.d.ts')) return false;
	const libIndex = segments.lastIndexOf('lib');
	return libIndex > 0 && segments[libIndex - 1] === 'typescript';
}

/**
 * Check if a TypeReference node refers to a built-in utility type
 * by resolving its declaration to a TypeAliasDeclaration in lib.d.ts.
 */
function isBuiltInUtilityType(node: Node): boolean {
	const ident = node.getFirstChildByKind(SyntaxKind.Identifier);
	if (!ident) return false;

	const symbol = ident.getSymbol();
	if (!symbol) return false;

	for (const decl of symbol.getDeclarations()) {
		if (!Node.isTypeAliasDeclaration(decl)) continue;
		const sourceFilePath = decl.getSourceFile().getFilePath();
		if (isTypescriptLibFile(sourceFilePath)) return true;
	}

	return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve advanced type structure for a type alias declaration.
 *
 * @param project       - ts-morph Project.
 * @param filePath      - Absolute path of the file containing the type alias.
 * @param symbolName    - Name of the type alias to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @param typeDepth     - Maximum nesting depth for recursive extraction (default: 1).
 */
export function resolveAdvancedTypes(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
	typeDepth = 1,
): AdvancedTypeAnalysis {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const typeAlias = findTypeAlias(sourceFile, symbolName);

	if (!typeAlias) {
		throw new Error(
			`Type alias "${symbolName}" not found in ${filePath}`,
		);
	}

	const relativePath = toRelativePosixPath(workspaceRoot, filePath);
	const symbol: SymbolRef = {
		name: symbolName,
		filePath: relativePath,
		line: typeAlias.getStartLineNumber(),
	};

	const typeNode = typeAlias.getTypeNodeOrThrow();
	const typeText = typeNode.getText().trim();
	const structure = analyzeTypeNode(typeNode, typeDepth, 0);

	const typeParameters = typeAlias.getTypeParameters().map(tp => tp.getText().trim());

	return { symbol, typeText, structure, typeParameters };
}

// ---------------------------------------------------------------------------
// Declaration lookup
// ---------------------------------------------------------------------------

function findTypeAlias(
	sourceFile: SourceFile,
	name: string,
): TypeAliasDeclaration | undefined {
	return sourceFile.getTypeAlias(name);
}

// ---------------------------------------------------------------------------
// Core type node analysis
// ---------------------------------------------------------------------------

function analyzeTypeNode(node: Node, maxDepth: number, currentDepth: number): AdvancedTypeEntry {
	const text = node.getText().trim();

	// Conditional type: T extends U ? X : Y
	if (Node.isConditionalTypeNode(node)) {
		return analyzeConditional(node, text, maxDepth, currentDepth);
	}

	// Mapped type: { [K in Source]: V }
	if (Node.isMappedTypeNode(node)) {
		return analyzeMapped(node, text);
	}

	// Template literal type: `prefix${Type}suffix`
	if (Node.isTemplateLiteralTypeNode(node)) {
		return analyzeTemplateLiteral(node, text);
	}

	// Type reference — check for utility types
	if (Node.isTypeReference(node)) {
		return analyzeTypeReference(node, text, maxDepth, currentDepth);
	}

	// Union type: A | B
	if (Node.isUnionTypeNode(node)) {
		const children = maybeRecurseChildren(
			node.getTypeNodes(), maxDepth, currentDepth,
		);
		return { kind: 'union', text, children };
	}

	// Intersection type: A & B
	if (Node.isIntersectionTypeNode(node)) {
		const children = maybeRecurseChildren(
			node.getTypeNodes(), maxDepth, currentDepth,
		);
		return { kind: 'intersection', text, children };
	}

	// Indexed access type: T[K]
	if (node.getKind() === SyntaxKind.IndexedAccessType) {
		return { kind: 'indexed-access', text };
	}

	// keyof T, readonly T[], unique symbol
	if (node.getKind() === SyntaxKind.TypeOperator) {
		if (node.getFirstChildByKind(SyntaxKind.KeyOfKeyword)) {
			return { kind: 'keyof', text };
		}
		return { kind: 'simple', text };
	}

	// typeof expr (in type position)
	if (node.getKind() === SyntaxKind.TypeQuery) {
		return { kind: 'typeof', text };
	}

	// Infer type: infer R
	if (node.getKind() === SyntaxKind.InferType) {
		return { kind: 'infer', text };
	}

	// Parenthesized type: (T) — unwrap
	if (Node.isParenthesizedTypeNode(node)) {
		return analyzeTypeNode(node.getTypeNode(), maxDepth, currentDepth);
	}

	return { kind: 'simple', text };
}

// ---------------------------------------------------------------------------
// Conditional type analysis
// ---------------------------------------------------------------------------

function analyzeConditional(
	node: Node & { getCheckType(): Node; getExtendsType(): Node; getTrueType(): Node; getFalseType(): Node },
	text: string,
	maxDepth: number,
	currentDepth: number,
): AdvancedTypeEntry {
	const checkNode = node.getCheckType();
	const extendsNode = node.getExtendsType();
	const trueNode = node.getTrueType();
	const falseNode = node.getFalseType();

	const inferTypes = findInferTypes(extendsNode);

	const conditional: ConditionalTypeInfo = {
		checkType: checkNode.getText().trim(),
		extendsType: extendsNode.getText().trim(),
		trueType: trueNode.getText().trim(),
		falseType: falseNode.getText().trim(),
		inferTypes,
	};

	const children = maybeRecurseChildren(
		[checkNode, extendsNode, trueNode, falseNode],
		maxDepth,
		currentDepth,
	);

	return { kind: 'conditional', text, conditional, children };
}

function findInferTypes(node: Node): string[] {
	const infers: string[] = [];
	node.forEachDescendant(child => {
		if (child.getKind() === SyntaxKind.InferType) {
			infers.push(child.getText().trim());
		}
	});
	return infers;
}

// ---------------------------------------------------------------------------
// Mapped type analysis
// ---------------------------------------------------------------------------

function analyzeMapped(
	node: Node & {
		getTypeParameter(): Node;
		getTypeNode(): Node | undefined;
		getReadonlyToken(): Node | undefined;
		getQuestionToken(): Node | undefined;
		getNameTypeNode(): Node | undefined;
	},
	text: string,
): AdvancedTypeEntry {
	const typeParam = node.getTypeParameter();
	const keyName = typeParam.getChildAtIndex(0)?.getText().trim() ?? 'K';

	// Constraint is after 'in' keyword
	const constraintNode = typeParam.getChildAtIndex(2);
	const constraint = constraintNode?.getText().trim() ?? '';

	const valueNode = node.getTypeNode();
	const valueType = valueNode?.getText().trim() ?? '';

	const readonlyToken = node.getReadonlyToken();
	let readonlyModifier: '+readonly' | '-readonly' | undefined;
	if (readonlyToken) {
		const readonlyText = readonlyToken.getText().trim();
		readonlyModifier = readonlyText === '-' ? '-readonly' : '+readonly';
	}

	const questionToken = node.getQuestionToken();
	let optionalModifier: '+?' | '-?' | undefined;
	if (questionToken) {
		const questionText = questionToken.getText().trim();
		optionalModifier = questionText === '-' ? '-?' : '+?';
	}

	const nameTypeNode = node.getNameTypeNode();
	const nameType = nameTypeNode?.getText().trim();

	const mapped: MappedTypeInfo = {
		keyName,
		constraint,
		valueType,
		readonlyModifier,
		optionalModifier,
		nameType,
	};

	return { kind: 'mapped', text, mapped };
}

// ---------------------------------------------------------------------------
// Template literal type analysis
// ---------------------------------------------------------------------------

function analyzeTemplateLiteral(
	node: Node & { getHead(): Node; getTemplateSpans(): Node[] },
	text: string,
): AdvancedTypeEntry {
	const spans: TemplateLiteralSpan[] = [];

	const templateSpans = node.getTemplateSpans();
	for (const span of templateSpans) {
		const typeNode = span.getChildAtIndex(0);
		const literalNode = span.getChildAtIndex(1);
		spans.push({
			type: typeNode?.getText().trim() ?? '',
			literal: extractLiteralText(literalNode),
		});
	}

	const templateLiteral: TemplateLiteralInfo = {
		templateText: text,
		spans,
	};

	return { kind: 'template-literal', text, templateLiteral };
}

function extractLiteralText(node: Node | undefined): string {
	if (!node) return '';
	const text = node.getText();
	// Template middle/tail tokens include the surrounding backtick/brace chars
	// Strip them to get the pure literal text
	return text.replace(/^[}`]/, '').replace(/[$`{].*$/, '').replace(/\$\{$/, '');
}

// ---------------------------------------------------------------------------
// Type reference analysis (utility types)
// ---------------------------------------------------------------------------

function analyzeTypeReference(
	node: Node,
	text: string,
	maxDepth: number,
	currentDepth: number,
): AdvancedTypeEntry {
	const typeName = node.getChildAtIndex(0);
	const name = typeName?.getText().trim() ?? '';

	// Resolve via the TypeScript compiler to check if this is a lib.d.ts utility type
	if (isBuiltInUtilityType(node)) {
		const typeArgNodes = getTypeArguments(node);
		const typeArguments = typeArgNodes.map(a => a.getText().trim());

		const utility: UtilityTypeInfo = { name, typeArguments };

		const children = maybeRecurseChildren(typeArgNodes, maxDepth, currentDepth);
		return { kind: 'utility', text, utility, children };
	}

	return { kind: 'simple', text };
}

function getTypeArguments(node: Node): Node[] {
	// Use ts-morph's TypeReferenceNode API when available
	if (Node.isTypeReference(node)) {
		return [...node.getTypeArguments()];
	}

	// Fallback: walk children for SyntaxList containing type argument nodes
	const args: Node[] = [];
	for (const child of node.getChildren()) {
		if (child.getKind() === SyntaxKind.SyntaxList) {
			for (const typeArg of child.getChildren()) {
				if (typeArg.getKind() !== SyntaxKind.CommaToken &&
					typeArg.getKind() !== SyntaxKind.LessThanToken &&
					typeArg.getKind() !== SyntaxKind.GreaterThanToken) {
					args.push(typeArg);
				}
			}
		}
	}
	return args;
}

// ---------------------------------------------------------------------------
// Recursive child expansion
// ---------------------------------------------------------------------------

function maybeRecurseChildren(
	nodes: Node[],
	maxDepth: number,
	currentDepth: number,
): AdvancedTypeEntry[] | undefined {
	if (currentDepth + 1 >= maxDepth) return undefined;

	const children: AdvancedTypeEntry[] = [];
	for (const child of nodes) {
		children.push(analyzeTypeNode(child, maxDepth, currentDepth + 1));
	}
	return children.length > 0 ? children : undefined;
}
