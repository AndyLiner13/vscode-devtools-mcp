/**
 * Phase 3, Items 4+5 — Type hierarchy resolver.
 *
 * Item 4: Resolves extends, implements, and subtypes for classes and interfaces.
 * Item 5: isAbstract detection, isAbstract on SymbolRef, rich generics (name+constraint+default).
 */
import { Project, Node } from 'ts-morph';
import type {
	SourceFile,
	ClassDeclaration,
	InterfaceDeclaration,
	ExpressionWithTypeArguments,
} from 'ts-morph';
import * as path from 'node:path';

import type { SymbolRef, TypeHierarchy, TypeParameter } from './types';

export type { TypeHierarchy, TypeParameter } from './types';

/** Class or interface — valid as type hierarchy target. */
type TypeDeclaration = ClassDeclaration | InterfaceDeclaration;

/**
 * Resolve type hierarchy for a named class or interface in a ts-morph project.
 *
 * @param project       - ts-morph Project with all relevant source files added.
 * @param filePath      - Absolute path of the file containing the target symbol.
 * @param symbolName    - Name of the class or interface to resolve.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns TypeHierarchy with extends, implements, and subtypes.
 */
export function resolveTypeHierarchy(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
): TypeHierarchy {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const declaration = findTypeDeclaration(sourceFile, symbolName);

	if (!declaration) {
		throw new Error(
			`Symbol "${symbolName}" not found as a class or interface in ${filePath}`,
		);
	}

	return buildTypeHierarchy(declaration, project, workspaceRoot);
}

// ---------------------------------------------------------------------------
// Symbol lookup
// ---------------------------------------------------------------------------

function findTypeDeclaration(
	sourceFile: SourceFile,
	name: string,
): TypeDeclaration | undefined {
	const cls = sourceFile.getClass(name);
	if (cls) return cls;

	const iface = sourceFile.getInterface(name);
	if (iface) return iface;

	return undefined;
}

// ---------------------------------------------------------------------------
// Hierarchy building
// ---------------------------------------------------------------------------

function buildTypeHierarchy(
	declaration: TypeDeclaration,
	project: Project,
	workspaceRoot: string,
): TypeHierarchy {
	if (Node.isClassDeclaration(declaration)) {
		return buildClassHierarchy(declaration, project, workspaceRoot);
	}
	return buildInterfaceHierarchy(declaration, project, workspaceRoot);
}

function buildClassHierarchy(
	cls: ClassDeclaration,
	project: Project,
	workspaceRoot: string,
): TypeHierarchy {
	const extendsClause = cls.getExtends();
	const extendsRef = extendsClause
		? resolveHeritageRef(extendsClause, workspaceRoot)
		: undefined;

	const implementsRefs: SymbolRef[] = [];
	for (const impl of cls.getImplements()) {
		const ref = resolveHeritageRef(impl, workspaceRoot);
		if (ref) implementsRefs.push(ref);
	}

	const subtypes = findSubtypes(cls, project, workspaceRoot);
	const isAbstract = cls.isAbstract() || undefined;
	const typeParameters = extractTypeParameters(cls);

	return {
		extends: extendsRef,
		implements: implementsRefs,
		subtypes,
		isAbstract,
		typeParameters,
	};
}

function buildInterfaceHierarchy(
	iface: InterfaceDeclaration,
	project: Project,
	workspaceRoot: string,
): TypeHierarchy {
	const implementsRefs: SymbolRef[] = [];
	for (const ext of iface.getExtends()) {
		const ref = resolveHeritageRef(ext, workspaceRoot);
		if (ref) implementsRefs.push(ref);
	}

	const subtypes = findSubtypes(iface, project, workspaceRoot);
	const typeParameters = extractTypeParameters(iface);

	return {
		implements: implementsRefs,
		subtypes,
		typeParameters,
	};
}

// ---------------------------------------------------------------------------
// Heritage clause resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a heritage clause expression (e.g. `extends Base` or `implements IFoo`)
 * to a SymbolRef pointing at the declaration.
 */
function resolveHeritageRef(
	expr: ExpressionWithTypeArguments,
	workspaceRoot: string,
): SymbolRef | undefined {
	const exprNode = expr.getExpression();
	if (!Node.isIdentifier(exprNode)) return undefined;

	const defNodes = exprNode.getDefinitionNodes();
	for (const defNode of defNodes) {
		if (Node.isClassDeclaration(defNode) || Node.isInterfaceDeclaration(defNode)) {
			return buildTypeSymbolRef(defNode, workspaceRoot);
		}
	}

	return undefined;
}

// ---------------------------------------------------------------------------
// Subtype resolution
// ---------------------------------------------------------------------------

/**
 * Find all classes and interfaces in the project that extend or implement
 * the given declaration.
 */
function findSubtypes(
	declaration: TypeDeclaration,
	project: Project,
	workspaceRoot: string,
): SymbolRef[] {
	const subtypes: SymbolRef[] = [];
	const targetName = declaration.getName();
	if (!targetName) return subtypes;

	const targetFile = declaration.getSourceFile().getFilePath();
	const targetLine = declaration.getStartLineNumber();

	for (const sourceFile of project.getSourceFiles()) {
		const sfPath = sourceFile.getFilePath();
		if (sfPath.endsWith('.d.ts') || sfPath.includes('node_modules')) continue;

		for (const cls of sourceFile.getClasses()) {
			if (isSubtypeOf(cls, targetName, targetFile, targetLine)) {
				const ref = buildTypeSymbolRef(cls, workspaceRoot);
				subtypes.push(ref);
			}
		}

		for (const iface of sourceFile.getInterfaces()) {
			if (isSubtypeOf(iface, targetName, targetFile, targetLine)) {
				const ref = buildTypeSymbolRef(iface, workspaceRoot);
				subtypes.push(ref);
			}
		}
	}

	return subtypes;
}

/**
 * Check if a declaration's extends/implements clauses reference the target.
 * Verifies by resolving the heritage expression back to the declaration
 * to avoid same-name collisions across files.
 */
function isSubtypeOf(
	declaration: TypeDeclaration,
	targetName: string,
	targetFile: string,
	targetLine: number,
): boolean {
	const heritageClauses = getHeritageClauses(declaration);

	for (const expr of heritageClauses) {
		const exprNode = expr.getExpression();
		if (!Node.isIdentifier(exprNode)) continue;
		if (exprNode.getText() !== targetName) continue;

		const defNodes = exprNode.getDefinitionNodes();
		for (const defNode of defNodes) {
			if (
				(Node.isClassDeclaration(defNode) || Node.isInterfaceDeclaration(defNode))
				&& defNode.getSourceFile().getFilePath() === targetFile
				&& defNode.getStartLineNumber() === targetLine
			) {
				return true;
			}
		}
	}

	return false;
}

/** Get all heritage clause expressions (extends + implements) for any type declaration. */
function getHeritageClauses(declaration: TypeDeclaration): ExpressionWithTypeArguments[] {
	if (Node.isClassDeclaration(declaration)) {
		const ext = declaration.getExtends();
		const impls = declaration.getImplements();
		return ext ? [ext, ...impls] : [...impls];
	}
	return [...declaration.getExtends()];
}

// ---------------------------------------------------------------------------
// SymbolRef building
// ---------------------------------------------------------------------------

function buildTypeSymbolRef(
	declaration: ClassDeclaration | InterfaceDeclaration,
	workspaceRoot: string,
): SymbolRef {
	const sourceFile = declaration.getSourceFile();
	const absolutePath = sourceFile.getFilePath();
	const relativePath = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
	const name = declaration.getName() ?? '<anonymous>';

	const ref: SymbolRef = { name, filePath: relativePath, line: declaration.getStartLineNumber() };

	if (Node.isClassDeclaration(declaration) && declaration.isAbstract()) {
		ref.isAbstract = true;
	}

	return ref;
}

// ---------------------------------------------------------------------------
// Generic type parameter extraction
// ---------------------------------------------------------------------------

/**
 * Extract type parameters with optional constraint and default from a
 * class or interface declaration.
 */
function extractTypeParameters(declaration: TypeDeclaration): TypeParameter[] {
	const params = declaration.getTypeParameters();
	const result: TypeParameter[] = [];

	for (const param of params) {
		const tp: TypeParameter = { name: param.getName() };

		const constraint = param.getConstraint();
		if (constraint) tp.constraint = constraint.getText();

		const defaultType = param.getDefault();
		if (defaultType) tp.default = defaultType.getText();

		result.push(tp);
	}

	return result;
}
