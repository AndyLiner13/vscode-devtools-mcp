/**
 * Phase 3, Item 7 — Type flow resolver.
 *
 * Extracts parameter and return type provenance for functions, methods,
 * and constructors. Recursively unwraps generic type arguments, union/
 * intersection members, tuple elements, and function-typed parameters
 * to discover all user-defined types referenced. Cycle-safe via visited set.
 */
import { Node, SyntaxKind, Type } from 'ts-morph';
import type {
	FunctionDeclaration,
	MethodDeclaration,
	ConstructorDeclaration,
	TypeNode,
	Symbol as TsMorphSymbol,
	ImportSpecifier,
} from 'ts-morph';
import { toRelativePosixPath } from './paths.js';

import type { SymbolRef, TypeFlow, TypeFlowParam, TypeFlowType } from './types.js';
import type { SymbolTarget } from '../shared/types.js';

export type { TypeFlow, TypeFlowParam, TypeFlowType } from './types.js';

type CallableNode = FunctionDeclaration | MethodDeclaration | ConstructorDeclaration;

// Primitives and built-in types that have no meaningful origin file.
const BUILTIN_NAMES = new Set([
	'string', 'number', 'boolean', 'bigint', 'symbol',
	'undefined', 'null', 'void', 'never', 'unknown', 'any', 'object',
	'String', 'Number', 'Boolean', 'BigInt', 'Symbol', 'Object',
	'Promise', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef',
	'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit',
	'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters',
	'ConstructorParameters', 'InstanceType', 'ThisParameterType',
	'OmitThisParameter', 'Uppercase', 'Lowercase', 'Capitalize',
	'Uncapitalize', 'Awaited',
	'ReadonlyArray', 'ReadonlyMap', 'ReadonlySet',
	'IterableIterator', 'AsyncIterableIterator', 'Generator',
	'AsyncGenerator', 'Iterable', 'AsyncIterable',
	'ArrayLike', 'PromiseLike',
	'Date', 'RegExp', 'Error', 'TypeError', 'RangeError',
	'Function',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve type flows for a function, method, or constructor.
 *
 * @param target        - Pre-located SymbolTarget (must be callable kind).
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns TypeFlow with parameter/return type provenance and deduplicated referencedTypes.
 */
export function resolveTypeFlows(
	target: SymbolTarget,
	workspaceRoot: string,
): TypeFlow {
	const node = target.node;

	if (
		!Node.isFunctionDeclaration(node)
		&& !Node.isMethodDeclaration(node)
		&& !Node.isConstructorDeclaration(node)
	) {
		throw new Error(
			`Symbol "${target.name}" is not callable (kind: ${target.kind})`,
		);
	}

	const declaration = node;
	const symbol = buildSymbolRef(declaration, target.name, workspaceRoot);
	const parameters = resolveParameters(declaration, workspaceRoot);
	const returnType = resolveReturnType(declaration, workspaceRoot);
	const referencedTypes = deduplicateTypes(parameters, returnType);

	return { symbol, parameters, returnType, referencedTypes };
}

// ---------------------------------------------------------------------------
// SymbolRef builder
// ---------------------------------------------------------------------------

function buildSymbolRef(
	declaration: CallableNode,
	symbolName: string,
	workspaceRoot: string,
): SymbolRef {
	const absPath = declaration.getSourceFile().getFilePath();
	const relativePath = toRelativePosixPath(workspaceRoot, absPath);
	return {
		name: symbolName,
		filePath: relativePath,
		line: declaration.getStartLineNumber(),
	};
}

// ---------------------------------------------------------------------------
// Parameter resolution
// ---------------------------------------------------------------------------

function resolveParameters(
	declaration: CallableNode,
	workspaceRoot: string,
): TypeFlowParam[] {
	const params: TypeFlowParam[] = [];

	for (const param of declaration.getParameters()) {
		const typeNode = param.getTypeNode();
		const typeText = typeNode ? typeNode.getText() : param.getType().getText();
		const visited = new Set<string>();
		const resolvedTypes: TypeFlowType[] = [];

		// TypeNode-based resolution catches type aliases the checker expands
		if (typeNode) {
			extractImmediateTypeNames(typeNode, workspaceRoot, visited, resolvedTypes);
		}

		// Type-based deep traversal (unions, intersections, generics, etc.)
		extractTypesFromType(param.getType(), workspaceRoot, visited, resolvedTypes);

		params.push({
			name: param.getName(),
			type: typeText,
			resolvedTypes,
		});
	}

	return params;
}

// ---------------------------------------------------------------------------
// Return type resolution
// ---------------------------------------------------------------------------

function resolveReturnType(
	declaration: CallableNode,
	workspaceRoot: string,
): TypeFlowParam | undefined {
	if (Node.isConstructorDeclaration(declaration)) {
		return undefined;
	}

	const typeNode = declaration.getReturnTypeNode();
	const returnType = declaration.getReturnType();
	const typeText = typeNode ? typeNode.getText() : returnType.getText();

	if (typeText === 'void' && !typeNode) {
		return undefined;
	}

	const visited = new Set<string>();
	const resolvedTypes: TypeFlowType[] = [];

	if (typeNode) {
		extractImmediateTypeNames(typeNode, workspaceRoot, visited, resolvedTypes);
	}
	extractTypesFromType(returnType, workspaceRoot, visited, resolvedTypes);

	return {
		name: 'return',
		type: typeText,
		resolvedTypes,
	};
}

// ---------------------------------------------------------------------------
// TypeNode-based immediate resolution — catches type aliases & enum names
// that the TypeChecker expands away (UserId → number, Status → union).
// Only resolves names visible in the source annotation; deep traversal is
// handled by extractTypesFromType.
// ---------------------------------------------------------------------------

function extractImmediateTypeNames(
	typeNode: TypeNode,
	workspaceRoot: string,
	visited: Set<string>,
	results: TypeFlowType[],
): void {
	for (const descendant of typeNode.getDescendantsOfKind(SyntaxKind.Identifier)) {
		const parent = descendant.getParent();
		if (!parent || parent.getKind() !== SyntaxKind.TypeReference) continue;

		const name = descendant.getText();
		if (BUILTIN_NAMES.has(name)) continue;

		const symbol = descendant.getSymbol();
		if (!symbol) continue;

		const declarations = symbol.getDeclarations();
		if (declarations.length === 0) continue;

		let decl = declarations[0];
		if (!decl) continue;

		// Follow through import specifiers to the original declaration
		if (Node.isImportSpecifier(decl)) {
			const original = resolveImportedDeclaration(decl, name);
			if (original) {
				decl = original;
			} else {
				continue;
			}
		}

		const declFile = decl.getSourceFile().getFilePath();
		if (declFile.endsWith('.d.ts') || declFile.includes('node_modules')) continue;

		const declLine = decl.getStartLineNumber();
		const visitKey = `${declFile}:${declLine}`;
		if (visited.has(visitKey)) continue;
		visited.add(visitKey);

		const relativePath = toRelativePosixPath(workspaceRoot, declFile);
		results.push({ name, filePath: relativePath, line: declLine });
	}
}

// ---------------------------------------------------------------------------
// Import specifier resolution — follows barrel re-export chains
// (`export * from`, `export { name } from`) to find the original declaration.
// ---------------------------------------------------------------------------

function resolveImportedDeclaration(
	importSpec: ImportSpecifier,
	name: string,
): Node | undefined {
	const moduleFile = importSpec.getImportDeclaration().getModuleSpecifierSourceFile();
	if (!moduleFile) return undefined;
	return findInFileRecursive(moduleFile, name, new Set());
}

function findInFileRecursive(
	file: SourceFile,
	name: string,
	visited: Set<string>,
): Node | undefined {
	const filePath = file.getFilePath();
	if (visited.has(filePath)) return undefined;
	visited.add(filePath);

	const direct = file.getInterface(name)
		?? file.getClass(name)
		?? file.getTypeAlias(name)
		?? file.getEnum(name)
		?? file.getFunction(name)
		?? file.getVariableDeclaration(name);
	if (direct) return direct;

	for (const exportDecl of file.getExportDeclarations()) {
		const targetFile = exportDecl.getModuleSpecifierSourceFile();
		if (!targetFile) continue;

		const namedExports = exportDecl.getNamedExports();
		if (namedExports.length === 0) {
			// export * from './module' — follow through
			const found = findInFileRecursive(targetFile, name, visited);
			if (found) return found;
		} else {
			const matchingExport = namedExports.find(
				e => (e.getAliasNode()?.getText() ?? e.getName()) === name,
			);
			if (matchingExport) {
				const originalName = matchingExport.getName();
				const found = findInFileRecursive(targetFile, originalName, visited);
				if (found) return found;
			}
		}
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Type extraction — uses TypeChecker's semantic Type objects for reliable
// unwrapping of unions, intersections, tuples, arrays, generics, and
// function signatures. Cycle-safe via visited set.
// ---------------------------------------------------------------------------

function extractTypesFromType(
	type: Type,
	workspaceRoot: string,
	visited: Set<string>,
	results: TypeFlowType[],
): void {
	// Enum literal: Status.Active → resolve to parent enum Status
	if (type.isEnumLiteral()) {
		const symbol = type.getSymbol();
		const parent = symbol?.getDeclarations()[0]?.getParent();
		if (parent && Node.isEnumDeclaration(parent)) {
			const enumName = parent.getName();
			if (enumName && !BUILTIN_NAMES.has(enumName)) {
				const declFile = parent.getSourceFile().getFilePath();
				if (!declFile.endsWith('.d.ts') && !declFile.includes('node_modules')) {
					const declLine = parent.getStartLineNumber();
					const visitKey = `${declFile}:${declLine}`;
					if (!visited.has(visitKey)) {
						visited.add(visitKey);
						const relativePath = toRelativePosixPath(workspaceRoot, declFile);
						results.push({ name: enumName, filePath: relativePath, line: declLine });
					}
				}
			}
		}
		return;
	}

	// Union types: string | User → extract User
	if (type.isUnion()) {
		for (const member of type.getUnionTypes()) {
			extractTypesFromType(member, workspaceRoot, visited, results);
		}
		return;
	}

	// Intersection types: A & B → extract both
	if (type.isIntersection()) {
		for (const member of type.getIntersectionTypes()) {
			extractTypesFromType(member, workspaceRoot, visited, results);
		}
		return;
	}

	// Tuple types: [User, Token] → extract each element
	if (type.isTuple()) {
		for (const element of type.getTupleElements()) {
			extractTypesFromType(element, workspaceRoot, visited, results);
		}
		return;
	}

	// Array types: User[] → extract element type
	if (type.isArray()) {
		const elementType = type.getArrayElementType();
		if (elementType) {
			extractTypesFromType(elementType, workspaceRoot, visited, results);
		}
		return;
	}

	// Check alias symbol first (handles type aliases like UserId = number)
	const aliasSymbol = type.getAliasSymbol();
	if (aliasSymbol) {
		const aliasName = aliasSymbol.getName();
		if (!BUILTIN_NAMES.has(aliasName)) {
			tryResolveSymbolFromType(aliasSymbol, aliasName, workspaceRoot, visited, results);
		}
		for (const arg of type.getAliasTypeArguments()) {
			extractTypesFromType(arg, workspaceRoot, visited, results);
		}
		return;
	}

	// Generic type arguments: Promise<User> → extract User
	const typeArgs = type.getTypeArguments();
	const symbol = type.getSymbol();
	const symbolName = symbol?.getName();

	// Skip anonymous types (__type) from intersection with object literals
	if (symbolName && symbolName !== '__type' && !BUILTIN_NAMES.has(symbolName)) {
		tryResolveSymbolFromType(symbol, symbolName, workspaceRoot, visited, results);
	}

	for (const arg of typeArgs) {
		extractTypesFromType(arg, workspaceRoot, visited, results);
	}

	// Function types: (entry: AuditEntry) => Token → extract from call signatures
	const callSignatures = type.getCallSignatures();
	for (const sig of callSignatures) {
		for (const param of sig.getParameters()) {
			const decls = param.getDeclarations();
			if (decls.length > 0) {
				const paramDecl = decls[0];
				if (paramDecl) {
					extractTypesFromType(paramDecl.getType(), workspaceRoot, visited, results);
				}
			}
		}
		const returnType = sig.getReturnType();
		extractTypesFromType(returnType, workspaceRoot, visited, results);
	}
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

function tryResolveSymbolFromType(
	symbol: TsMorphSymbol | undefined,
	symbolName: string,
	workspaceRoot: string,
	visited: Set<string>,
	results: TypeFlowType[],
): void {
	if (!symbol) return;
	if (BUILTIN_NAMES.has(symbolName)) return;

	const declarations = symbol.getDeclarations();
	if (declarations.length === 0) return;

	const decl = declarations[0];
	if (!decl) return;

	const declFile = decl.getSourceFile().getFilePath();
	if (declFile.endsWith('.d.ts') || declFile.includes('node_modules')) return;

	const declLine = decl.getStartLineNumber();
	const visitKey = `${declFile}:${declLine}`;
	if (visited.has(visitKey)) return;
	visited.add(visitKey);

	const relativePath = toRelativePosixPath(workspaceRoot, declFile);
	results.push({ name: symbolName, filePath: relativePath, line: declLine });
}

// ---------------------------------------------------------------------------
// Deduplication helpers
// ---------------------------------------------------------------------------

/** Deduplicate a flat array of TypeFlowType by filePath:line. */
function deduplicateTypeFlowTypes(types: TypeFlowType[]): TypeFlowType[] {
	const seen = new Map<string, TypeFlowType>();
	for (const t of types) {
		const key = `${t.filePath}:${t.line}`;
		if (!seen.has(key)) {
			seen.set(key, t);
		}
	}
	return [...seen.values()];
}

/** Merge all types from params + return into a unique, sorted set. */
function deduplicateTypes(
	parameters: TypeFlowParam[],
	returnType: TypeFlowParam | undefined,
): TypeFlowType[] {
	const seen = new Map<string, TypeFlowType>();

	for (const param of parameters) {
		for (const t of param.resolvedTypes) {
			const key = `${t.filePath}:${t.line}`;
			if (!seen.has(key)) {
				seen.set(key, t);
			}
		}
	}

	if (returnType) {
		for (const t of returnType.resolvedTypes) {
			const key = `${t.filePath}:${t.line}`;
			if (!seen.has(key)) {
				seen.set(key, t);
			}
		}
	}

	return [...seen.values()].sort((a, b) => {
		const fileCmp = a.filePath.localeCompare(b.filePath);
		if (fileCmp !== 0) return fileCmp;
		return a.line - b.line;
	});
}
