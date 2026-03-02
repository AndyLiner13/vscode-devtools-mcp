/**
 * Phase 3, Items 4+5 — Type hierarchy resolver.
 *
 * Item 4: Resolves extends, implements, and subtypes for classes and interfaces.
 * Item 5: isAbstract detection, isAbstract on SymbolRef, rich generics (name+constraint+default).
 */
import { Project, Node } from 'ts-morph';
import type {
	ClassDeclaration,
	InterfaceDeclaration,
	ExpressionWithTypeArguments,
} from 'ts-morph';

import type { SymbolRef, TypeHierarchy, TypeParameter } from './types.js';

export type { TypeHierarchy, TypeParameter } from './types.js';

/** Class or interface — valid as type hierarchy target. */
type TypeDeclaration = ClassDeclaration | InterfaceDeclaration;

/**
 * Resolve type hierarchy for a class or interface.
 *
 * @param node - The ts-morph AST node (must be class or interface).
 * @returns TypeHierarchy with extends, implements, and subtypes. All file paths are absolute.
 */
export function resolveTypeHierarchy(node: Node): TypeHierarchy {
	if (!Node.isClassDeclaration(node) && !Node.isInterfaceDeclaration(node)) {
		throw new Error(
			`Node is not a class or interface (kind: ${node.getKindName()})`,
		);
	}

	const project = node.getSourceFile().getProject();
	return buildTypeHierarchy(node, project);
}

// ---------------------------------------------------------------------------
// Hierarchy building
// ---------------------------------------------------------------------------

function buildTypeHierarchy(
	declaration: TypeDeclaration,
	project: Project,
): TypeHierarchy {
	if (Node.isClassDeclaration(declaration)) {
		return buildClassHierarchy(declaration, project);
	}
	return buildInterfaceHierarchy(declaration, project);
}

function buildClassHierarchy(
	cls: ClassDeclaration,
	project: Project,
): TypeHierarchy {
	const extendsClause = cls.getExtends();
	const extendsRef = extendsClause
		? resolveHeritageRef(extendsClause)
		: undefined;

	const implementsRefs: SymbolRef[] = [];
	for (const impl of cls.getImplements()) {
		const ref = resolveHeritageRef(impl);
		if (ref) implementsRefs.push(ref);
	}

	const subtypes = findSubtypes(cls, project);
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
): TypeHierarchy {
	const implementsRefs: SymbolRef[] = [];
	for (const ext of iface.getExtends()) {
		const ref = resolveHeritageRef(ext);
		if (ref) implementsRefs.push(ref);
	}

	const subtypes = findSubtypes(iface, project);
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
): SymbolRef | undefined {
	const exprNode = expr.getExpression();
	if (!Node.isIdentifier(exprNode)) return undefined;

	const defNodes = exprNode.getDefinitionNodes();
	for (const defNode of defNodes) {
		if (Node.isClassDeclaration(defNode) || Node.isInterfaceDeclaration(defNode)) {
			return buildTypeSymbolRef(defNode);
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
				const ref = buildTypeSymbolRef(cls);
				subtypes.push(ref);
			}
		}

		for (const iface of sourceFile.getInterfaces()) {
			if (isSubtypeOf(iface, targetName, targetFile, targetLine)) {
				const ref = buildTypeSymbolRef(iface);
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
): SymbolRef {
	const name = declaration.getName() ?? '<anonymous>';

	const ref: SymbolRef = {
		name,
		filePath: declaration.getSourceFile().getFilePath(),
		line: declaration.getStartLineNumber(),
	};

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
