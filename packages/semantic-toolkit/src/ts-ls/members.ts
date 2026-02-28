/**
 * Phase 3, Item 8 — Member resolver.
 *
 * Extracts all members (methods, properties, accessors, constructors,
 * index/call/construct signatures) from a class or interface declaration.
 * Returns an ordered list with kind, modifiers, type text, and line numbers.
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type {
	ClassDeclaration,
	InterfaceDeclaration,
	MethodDeclaration,
	PropertyDeclaration,
	GetAccessorDeclaration,
	SetAccessorDeclaration,
	ConstructorDeclaration,
	IndexSignatureDeclaration,
	CallSignatureDeclaration,
	ConstructSignatureDeclaration,
	MethodSignature,
	PropertySignature,
} from 'ts-morph';

import type { MemberInfo, MemberKind } from './types';

export type { MemberInfo, MemberKind } from './types';

// Modifiers we track on member declarations.
const TRACKED_MODIFIERS = new Set([
	'public', 'private', 'protected',
	'static', 'abstract', 'readonly',
	'async', 'override',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve all members for a class or interface by name.
 *
 * @param project    - ts-morph Project with all relevant source files added.
 * @param filePath   - Absolute path of the file containing the target symbol.
 * @param symbolName - Name of the class or interface.
 * @returns Array of MemberInfo, ordered by source position. Empty if symbol not found or has no members.
 */
export function resolveMembers(
	project: Project,
	filePath: string,
	symbolName: string,
): MemberInfo[] {
	const sourceFile = project.getSourceFileOrThrow(filePath);

	const cls = sourceFile.getClass(symbolName);
	if (cls) return resolveClassMembers(cls);

	const iface = sourceFile.getInterface(symbolName);
	if (iface) return resolveInterfaceMembers(iface);

	throw new Error(
		`Class or interface "${symbolName}" not found in ${filePath}`,
	);
}

// ---------------------------------------------------------------------------
// Class members
// ---------------------------------------------------------------------------

function resolveClassMembers(cls: ClassDeclaration): MemberInfo[] {
	const members: MemberInfo[] = [];

	for (const ctor of cls.getConstructors()) {
		members.push(resolveConstructor(ctor));
	}

	for (const prop of cls.getProperties()) {
		members.push(resolveClassProperty(prop));
	}

	for (const method of cls.getMethods()) {
		members.push(resolveClassMethod(method));
	}

	for (const getter of cls.getGetAccessors()) {
		members.push(resolveGetAccessor(getter));
	}

	for (const setter of cls.getSetAccessors()) {
		members.push(resolveSetAccessor(setter));
	}

	for (const idx of cls.getChildrenOfKind(SyntaxKind.IndexSignature)) {
		members.push(resolveIndexSignature(idx));
	}

	return members.sort((a, b) => a.line - b.line);
}

// ---------------------------------------------------------------------------
// Interface members
// ---------------------------------------------------------------------------

function resolveInterfaceMembers(iface: InterfaceDeclaration): MemberInfo[] {
	const members: MemberInfo[] = [];

	for (const prop of iface.getProperties()) {
		members.push(resolveInterfaceProperty(prop));
	}

	for (const method of iface.getMethods()) {
		members.push(resolveInterfaceMethod(method));
	}

	for (const idx of iface.getIndexSignatures()) {
		members.push(resolveIndexSignature(idx));
	}

	for (const cs of iface.getCallSignatures()) {
		members.push(resolveCallSignature(cs));
	}

	for (const cts of iface.getConstructSignatures()) {
		members.push(resolveConstructSignature(cts));
	}

	return members.sort((a, b) => a.line - b.line);
}

// ---------------------------------------------------------------------------
// Individual member resolvers
// ---------------------------------------------------------------------------

function resolveConstructor(ctor: ConstructorDeclaration): MemberInfo {
	const params = ctor.getParameters()
		.map(p => {
			const typeText = p.getTypeNode()?.getText() ?? p.getType().getText();
			return `${p.getName()}: ${typeText}`;
		})
		.join(', ');

	return {
		name: 'constructor',
		kind: 'constructor',
		line: ctor.getStartLineNumber(),
		type: `(${params})`,
		modifiers: extractModifiers(ctor),
	};
}

function resolveClassProperty(prop: PropertyDeclaration): MemberInfo {
	const typeNode = prop.getTypeNode();
	const typeText = typeNode ? typeNode.getText() : prop.getType().getText();

	return {
		name: prop.getName(),
		kind: 'property',
		line: prop.getStartLineNumber(),
		type: typeText,
		modifiers: extractModifiers(prop),
	};
}

function resolveClassMethod(method: MethodDeclaration): MemberInfo {
	const returnNode = method.getReturnTypeNode();
	const returnText = returnNode ? returnNode.getText() : method.getReturnType().getText();

	return {
		name: method.getName(),
		kind: 'method',
		line: method.getStartLineNumber(),
		type: returnText,
		modifiers: extractModifiers(method),
	};
}

function resolveGetAccessor(getter: GetAccessorDeclaration): MemberInfo {
	const returnNode = getter.getReturnTypeNode();
	const returnText = returnNode ? returnNode.getText() : getter.getReturnType().getText();

	return {
		name: getter.getName(),
		kind: 'getter',
		line: getter.getStartLineNumber(),
		type: returnText,
		modifiers: extractModifiers(getter),
	};
}

function resolveSetAccessor(setter: SetAccessorDeclaration): MemberInfo {
	const param = setter.getParameters()[0];
	const typeText = param
		? (param.getTypeNode()?.getText() ?? param.getType().getText())
		: undefined;

	return {
		name: setter.getName(),
		kind: 'setter',
		line: setter.getStartLineNumber(),
		type: typeText,
		modifiers: extractModifiers(setter),
	};
}

function resolveIndexSignature(idx: IndexSignatureDeclaration): MemberInfo {
	return {
		name: '',
		kind: 'indexSignature',
		line: idx.getStartLineNumber(),
		type: idx.getText().replace(/;$/, '').trim(),
		modifiers: extractModifiers(idx),
	};
}

function resolveCallSignature(cs: CallSignatureDeclaration): MemberInfo {
	return {
		name: '',
		kind: 'callSignature',
		line: cs.getStartLineNumber(),
		type: cs.getText().replace(/;$/, '').trim(),
		modifiers: [],
	};
}

function resolveConstructSignature(cts: ConstructSignatureDeclaration): MemberInfo {
	return {
		name: '',
		kind: 'constructSignature',
		line: cts.getStartLineNumber(),
		type: cts.getText().replace(/;$/, '').trim(),
		modifiers: [],
	};
}

// ---------------------------------------------------------------------------
// Interface member resolvers
// ---------------------------------------------------------------------------

function resolveInterfaceProperty(prop: PropertySignature): MemberInfo {
	const typeNode = prop.getTypeNode();
	const typeText = typeNode ? typeNode.getText() : prop.getType().getText();
	const modifiers: string[] = [];
	if (prop.isReadonly()) modifiers.push('readonly');

	return {
		name: prop.getName(),
		kind: 'property',
		line: prop.getStartLineNumber(),
		type: typeText,
		modifiers,
	};
}

function resolveInterfaceMethod(method: MethodSignature): MemberInfo {
	const returnNode = method.getReturnTypeNode();
	const returnText = returnNode ? returnNode.getText() : method.getReturnType().getText();

	return {
		name: method.getName(),
		kind: 'method',
		line: method.getStartLineNumber(),
		type: returnText,
		modifiers: [],
	};
}

// ---------------------------------------------------------------------------
// Modifier extraction
// ---------------------------------------------------------------------------

function extractModifiers(
	node: ConstructorDeclaration | PropertyDeclaration | MethodDeclaration |
		GetAccessorDeclaration | SetAccessorDeclaration | IndexSignatureDeclaration,
): string[] {
	const modifiers: string[] = [];

	for (const mod of node.getModifiers()) {
		const text = mod.getText();
		if (TRACKED_MODIFIERS.has(text)) {
			modifiers.push(text);
		}
	}

	return modifiers;
}
