/**
 * Phase 3, Item 9 — Signature and modifier resolver.
 *
 * Extracts the complete type signature and modifier list for any named
 * symbol: functions, methods, classes, interfaces, type aliases, enums,
 * variables, properties, getters/setters.
 */
import { Node, SyntaxKind } from 'ts-morph';
import type {
	SourceFile,
	FunctionDeclaration,
	MethodDeclaration,
	MethodSignature,
	ClassDeclaration,
	InterfaceDeclaration,
	TypeAliasDeclaration,
	EnumDeclaration,
	VariableDeclaration,
	PropertyDeclaration,
	PropertySignature,
	GetAccessorDeclaration,
	SetAccessorDeclaration,
	ParameterDeclaration,
} from 'ts-morph';
import type { SymbolTarget } from '../shared/types.js';

// Map from SyntaxKind to output label for tracked modifiers.
const TRACKED_MODIFIER_KINDS = new Map<SyntaxKind, string>([
	[SyntaxKind.PublicKeyword, 'public'],
	[SyntaxKind.PrivateKeyword, 'private'],
	[SyntaxKind.ProtectedKeyword, 'protected'],
	[SyntaxKind.StaticKeyword, 'static'],
	[SyntaxKind.AbstractKeyword, 'abstract'],
	[SyntaxKind.ReadonlyKeyword, 'readonly'],
	[SyntaxKind.AsyncKeyword, 'async'],
	[SyntaxKind.OverrideKeyword, 'override'],
	[SyntaxKind.DeclareKeyword, 'declare'],
	[SyntaxKind.DefaultKeyword, 'default'],
]);

/** Result of resolving a symbol's signature and modifiers. */
export interface SignatureInfo {
	/** Complete type signature text. */
	signature: string;

	/** Modifiers list (e.g. ['async', 'exported', 'static']). */
	modifiers: string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the type signature and modifiers for a symbol.
 *
 * @param target - Pre-located SymbolTarget from the node locator.
 * @returns SignatureInfo with signature text and modifiers array.
 */
export function resolveSignature(target: SymbolTarget): SignatureInfo {
	return {
		signature: buildSignature(target.node, target.name),
		modifiers: buildModifiers(target.node, target.sourceFile),
	};
}

// ---------------------------------------------------------------------------
// Signature building
// ---------------------------------------------------------------------------

function buildSignature(node: Node, symbolName: string): string {
	if (Node.isFunctionDeclaration(node)) {
		return buildFunctionSignature(node);
	}

	if (Node.isMethodDeclaration(node)) {
		return buildMethodSignature(node);
	}

	if (Node.isMethodSignature(node)) {
		return buildMethodSignatureNode(node);
	}

	if (Node.isClassDeclaration(node)) {
		return buildClassSignature(node);
	}

	if (Node.isInterfaceDeclaration(node)) {
		return buildInterfaceSignature(node);
	}

	if (Node.isTypeAliasDeclaration(node)) {
		return buildTypeAliasSignature(node);
	}

	if (Node.isEnumDeclaration(node)) {
		return buildEnumSignature(node);
	}

	if (Node.isVariableDeclaration(node)) {
		return buildVariableSignature(node);
	}

	if (Node.isPropertyDeclaration(node) || Node.isPropertySignature(node)) {
		return buildPropertySignature(node);
	}

	if (Node.isGetAccessorDeclaration(node)) {
		return buildGetAccessorSignature(node);
	}

	if (Node.isSetAccessorDeclaration(node)) {
		return buildSetAccessorSignature(node);
	}

	return symbolName;
}

function buildFunctionSignature(fn: FunctionDeclaration): string {
	const name = fn.getName() ?? '(anonymous)';
	const typeParams = buildTypeParamText(fn.getTypeParameters());
	const params = buildParamList(fn.getParameters());
	const returnType = fn.getReturnTypeNode()?.getText() ?? fn.getReturnType().getText();
	return `${name}${typeParams}(${params}): ${returnType}`;
}

function buildMethodSignature(method: MethodDeclaration): string {
	const name = method.getName();
	const typeParams = buildTypeParamText(method.getTypeParameters());
	const params = buildParamList(method.getParameters());
	const returnType = method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText();
	return `${name}${typeParams}(${params}): ${returnType}`;
}

function buildMethodSignatureNode(method: MethodSignature): string {
	const name = method.getName();
	const typeParams = buildTypeParamText(method.getTypeParameters());
	const params = buildParamList(method.getParameters());
	const returnType = method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText();
	return `${name}${typeParams}(${params}): ${returnType}`;
}

function buildClassSignature(cls: ClassDeclaration): string {
	const name = cls.getName() ?? '(anonymous)';
	const typeParams = buildTypeParamText(cls.getTypeParameters());
	const extendsClause = cls.getExtends()?.getText();
	const implementsClause = cls.getImplements().map(i => i.getText());

	let sig = `class ${name}${typeParams}`;
	if (extendsClause) sig += ` extends ${extendsClause}`;
	if (implementsClause.length > 0) sig += ` implements ${implementsClause.join(', ')}`;
	return sig;
}

function buildInterfaceSignature(iface: InterfaceDeclaration): string {
	const name = iface.getName();
	const typeParams = buildTypeParamText(iface.getTypeParameters());
	const extendsClause = iface.getExtends().map(e => e.getText());

	let sig = `interface ${name}${typeParams}`;
	if (extendsClause.length > 0) sig += ` extends ${extendsClause.join(', ')}`;
	return sig;
}

function buildTypeAliasSignature(alias: TypeAliasDeclaration): string {
	const name = alias.getName();
	const typeParams = buildTypeParamText(alias.getTypeParameters());
	const typeNode = alias.getTypeNode();
	const typeText = typeNode ? typeNode.getText() : alias.getType().getText();
	return `type ${name}${typeParams} = ${typeText}`;
}

function buildEnumSignature(enumDecl: EnumDeclaration): string {
	const isConst = enumDecl.isConstEnum();
	const name = enumDecl.getName();
	return isConst ? `const enum ${name}` : `enum ${name}`;
}

function buildVariableSignature(varDecl: VariableDeclaration): string {
	const name = varDecl.getName();
	const keyword = getVariableKeyword(varDecl);
	const typeNode = varDecl.getTypeNode();
	const typeText = typeNode ? typeNode.getText() : varDecl.getType().getText();
	return `${keyword} ${name}: ${typeText}`;
}

function buildPropertySignature(
	prop: PropertyDeclaration | PropertySignature,
): string {
	const name = prop.getName();
	const typeNode = prop.getTypeNode();
	const typeText = typeNode ? typeNode.getText() : prop.getType().getText();
	return `${name}: ${typeText}`;
}

function buildGetAccessorSignature(getter: GetAccessorDeclaration): string {
	const name = getter.getName();
	const returnType = getter.getReturnTypeNode()?.getText() ?? getter.getReturnType().getText();
	return `get ${name}(): ${returnType}`;
}

function buildSetAccessorSignature(setter: SetAccessorDeclaration): string {
	const name = setter.getName();
	const param = setter.getParameters()[0];
	const typeText = param
		? (param.getTypeNode()?.getText() ?? param.getType().getText())
		: 'unknown';
	return `set ${name}(value: ${typeText})`;
}

// ---------------------------------------------------------------------------
// Modifier building
// ---------------------------------------------------------------------------

function buildModifiers(node: Node, sourceFile: SourceFile): string[] {
	const modifiers: string[] = [];

	// Extract keyword modifiers from the node
	if ('getModifiers' in node && typeof node.getModifiers === 'function') {
		for (const mod of node.getModifiers()) {
			const label = TRACKED_MODIFIER_KINDS.get(mod.getKind());
			if (label) {
				modifiers.push(label);
			}
		}
	}

	// Check for 'exported' — not a keyword modifier but semantically important
	if (isExported(node, sourceFile)) {
		modifiers.push('exported');
	}

	return modifiers;
}

function isExported(node: DeclarationNode, sourceFile: SourceFile): boolean {
	// Variable declarations need special handling — check the parent statement
	if (Node.isVariableDeclaration(node)) {
		const statement = node.getVariableStatement();
		if (statement) {
			return statement.isExported();
		}
		return false;
	}

	// All other declarations have isExported
	if ('isExported' in node && typeof node.isExported === 'function') {
		return node.isExported();
	}

	return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTypeParamText(
	typeParams: ReturnType<FunctionDeclaration['getTypeParameters']>,
): string {
	if (typeParams.length === 0) return '';

	const parts = typeParams.map(tp => {
		let text = tp.getName();
		const constraint = tp.getConstraint();
		if (constraint) text += ` extends ${constraint.getText()}`;
		const defaultType = tp.getDefault();
		if (defaultType) text += ` = ${defaultType.getText()}`;
		return text;
	});

	return `<${parts.join(', ')}>`;
}

function buildParamList(params: ParameterDeclaration[]): string {
	return params.map(p => {
		const name = p.getName();
		const optional = p.isOptional() && !p.isRestParameter() ? '?' : '';
		const rest = p.isRestParameter() ? '...' : '';
		const typeNode = p.getTypeNode();
		const typeText = typeNode ? typeNode.getText() : p.getType().getText();
		return `${rest}${name}${optional}: ${typeText}`;
	}).join(', ');
}

function getVariableKeyword(varDecl: VariableDeclaration): string {
	const statement = varDecl.getVariableStatement();
	if (!statement) return 'const';

	const declarationKind = statement.getDeclarationKind();
	return declarationKind.toString();
}
