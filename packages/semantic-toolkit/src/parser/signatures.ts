import { Node, SyntaxKind } from 'ts-morph';
import type {
	ClassDeclaration,
	ConstructorDeclaration,
	EnumDeclaration,
	FunctionDeclaration,
	GetAccessorDeclaration,
	InterfaceDeclaration,
	MethodDeclaration,
	ModuleDeclaration,
	SetAccessorDeclaration,
	TypeAliasDeclaration,
	VariableDeclaration,
	VariableStatement,
} from 'ts-morph';

/**
 * Extract a human-readable type signature for any symbol node.
 * Returns the declaration line(s) without the body.
 */
export function extractSignature(node: Node): string {
	if (Node.isFunctionDeclaration(node)) return functionSignature(node);
	if (Node.isMethodDeclaration(node)) return methodSignature(node);
	if (Node.isConstructorDeclaration(node)) return constructorSignature(node);
	if (Node.isGetAccessorDeclaration(node)) return getterSignature(node);
	if (Node.isSetAccessorDeclaration(node)) return setterSignature(node);
	if (Node.isClassDeclaration(node)) return classSignature(node);
	if (Node.isInterfaceDeclaration(node)) return interfaceSignature(node);
	if (Node.isTypeAliasDeclaration(node)) return typeAliasSignature(node);
	if (Node.isEnumDeclaration(node)) return enumSignature(node);
	if (Node.isVariableStatement(node)) return variableStatementSignature(node);
	if (Node.isVariableDeclaration(node)) return variableDeclarationSignature(node);
	if (Node.isModuleDeclaration(node)) return moduleSignature(node);
	if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) return arrowOrExpressionSignature(node);
	if (Node.isPropertyDeclaration(node)) return propertyDeclarationSignature(node);
	if (Node.isPropertySignature(node)) return propertySignatureText(node);

	// Fallback: first line of the node text
	const text = node.getText();
	const firstLine = text.split('\n')[0];
	return firstLine.length > 200 ? firstLine.slice(0, 197) + '...' : firstLine;
}

function functionSignature(node: FunctionDeclaration): string {
	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	if (node.isDefaultExport()) parts.push('default');
	if (node.isAsync()) parts.push('async');
	parts.push('function');
	if (node.isGenerator()) parts[parts.length - 1] = 'function*';

	const name = node.getName() ?? '';
	const typeParams = node.getTypeParameters().map(tp => tp.getText()).join(', ');
	const params = node.getParameters().map(p => p.getText()).join(', ');
	const returnType = node.getReturnTypeNode()?.getText();

	let sig = `${parts.join(' ')} ${name}`;
	if (typeParams) sig += `<${typeParams}>`;
	sig += `(${params})`;
	if (returnType) sig += `: ${returnType}`;
	return sig.trim();
}

function methodSignature(node: MethodDeclaration): string {
	const parts: string[] = [];
	if (node.isAbstract()) parts.push('abstract');
	if (node.isStatic()) parts.push('static');
	if (node.isAsync()) parts.push('async');

	const name = node.getName();
	const typeParams = node.getTypeParameters().map(tp => tp.getText()).join(', ');
	const params = node.getParameters().map(p => p.getText()).join(', ');
	const returnType = node.getReturnTypeNode()?.getText();

	let sig = parts.length > 0 ? `${parts.join(' ')} ${name}` : name;
	if (node.isGenerator()) sig = parts.length > 0 ? `${parts.join(' ')} *${name}` : `*${name}`;
	if (typeParams) sig += `<${typeParams}>`;
	sig += `(${params})`;
	if (returnType) sig += `: ${returnType}`;
	return sig;
}

function constructorSignature(node: ConstructorDeclaration): string {
	const params = node.getParameters().map(p => p.getText()).join(', ');
	return `constructor(${params})`;
}

function getterSignature(node: GetAccessorDeclaration): string {
	const parts: string[] = [];
	if (node.isStatic()) parts.push('static');
	const returnType = node.getReturnTypeNode()?.getText();
	let sig = `${parts.length > 0 ? parts.join(' ') + ' ' : ''}get ${node.getName()}()`;
	if (returnType) sig += `: ${returnType}`;
	return sig;
}

function setterSignature(node: SetAccessorDeclaration): string {
	const parts: string[] = [];
	if (node.isStatic()) parts.push('static');
	const params = node.getParameters().map(p => p.getText()).join(', ');
	return `${parts.length > 0 ? parts.join(' ') + ' ' : ''}set ${node.getName()}(${params})`;
}

function classSignature(node: ClassDeclaration): string {
	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	if (node.isDefaultExport()) parts.push('default');
	if (node.isAbstract()) parts.push('abstract');
	parts.push('class');

	const name = node.getName() ?? '';
	const typeParams = node.getTypeParameters().map(tp => tp.getText()).join(', ');
	let sig = `${parts.join(' ')} ${name}`;
	if (typeParams) sig += `<${typeParams}>`;

	const ext = node.getExtends();
	if (ext) sig += ` extends ${ext.getText()}`;

	const impls = node.getImplements();
	if (impls.length > 0) sig += ` implements ${impls.map(i => i.getText()).join(', ')}`;

	return sig.trim();
}

function interfaceSignature(node: InterfaceDeclaration): string {
	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	parts.push('interface');

	const name = node.getName();
	const typeParams = node.getTypeParameters().map(tp => tp.getText()).join(', ');
	let sig = `${parts.join(' ')} ${name}`;
	if (typeParams) sig += `<${typeParams}>`;

	const ext = node.getExtends();
	if (ext.length > 0) sig += ` extends ${ext.map(e => e.getText()).join(', ')}`;

	return sig.trim();
}

function typeAliasSignature(node: TypeAliasDeclaration): string {
	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	parts.push('type');

	const name = node.getName();
	const typeParams = node.getTypeParameters().map(tp => tp.getText()).join(', ');
	let sig = `${parts.join(' ')} ${name}`;
	if (typeParams) sig += `<${typeParams}>`;

	// Include the type value for simple/short types
	const typeText = node.getTypeNode()?.getText() ?? '';
	if (typeText.length <= 100) {
		sig += ` = ${typeText}`;
	}

	return sig.trim();
}

function enumSignature(node: EnumDeclaration): string {
	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	if (node.isConstEnum()) parts.push('const');
	parts.push('enum');
	parts.push(node.getName());
	return parts.join(' ');
}

function variableStatementSignature(node: VariableStatement): string {
	const decls = node.getDeclarations();
	if (decls.length === 0) return node.getText().split('\n')[0];

	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	parts.push(node.getDeclarationKind());

	const declTexts = decls.map(d => {
		const name = d.getName();
		const typeNode = d.getTypeNode();
		if (typeNode) return `${name}: ${typeNode.getText()}`;
		return name;
	});

	return `${parts.join(' ')} ${declTexts.join(', ')}`;
}

function variableDeclarationSignature(node: VariableDeclaration): string {
	const name = node.getName();
	const typeNode = node.getTypeNode();
	if (typeNode) return `${name}: ${typeNode.getText()}`;

	// For arrow functions / function expressions, show their signature
	const init = node.getInitializer();
	if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
		return `${name} = ${arrowOrExpressionSignature(init)}`;
	}

	return name;
}

function arrowOrExpressionSignature(node: Node): string {
	if (Node.isArrowFunction(node)) {
		const params = node.getParameters().map(p => p.getText()).join(', ');
		const typeParams = node.getTypeParameters().map(tp => tp.getText()).join(', ');
		const returnType = node.getReturnTypeNode()?.getText();

		let sig = '';
		if (node.isAsync()) sig += 'async ';
		if (typeParams) sig += `<${typeParams}>`;
		sig += `(${params})`;
		if (returnType) sig += `: ${returnType}`;
		sig += ' => ...';
		return sig;
	}

	if (Node.isFunctionExpression(node)) {
		const params = node.getParameters().map(p => p.getText()).join(', ');
		const returnType = node.getReturnTypeNode()?.getText();
		let sig = '';
		if (node.isAsync()) sig += 'async ';
		sig += `function`;
		if (node.isGenerator()) sig += '*';
		const name = node.getName();
		if (name) sig += ` ${name}`;
		sig += `(${params})`;
		if (returnType) sig += `: ${returnType}`;
		return sig;
	}

	return node.getText().split('\n')[0];
}

function propertyDeclarationSignature(node: import('ts-morph').PropertyDeclaration): string {
	const parts: string[] = [];
	if (node.isStatic()) parts.push('static');
	if (node.isReadonly()) parts.push('readonly');

	const name = node.getName();
	const typeNode = node.getTypeNode();
	const typePart = typeNode ? `: ${typeNode.getText()}` : '';

	return `${parts.length > 0 ? parts.join(' ') + ' ' : ''}${name}${typePart}`;
}

function propertySignatureText(node: import('ts-morph').PropertySignature): string {
	const parts: string[] = [];
	if (node.isReadonly()) parts.push('readonly');

	const name = node.getName();
	const typeNode = node.getTypeNode();
	const optional = node.hasQuestionToken() ? '?' : '';
	const typePart = typeNode ? `: ${typeNode.getText()}` : '';

	return `${parts.length > 0 ? parts.join(' ') + ' ' : ''}${name}${optional}${typePart}`;
}

function moduleSignature(node: ModuleDeclaration): string {
	const parts: string[] = [];
	if (node.isExported()) parts.push('export');
	if (node.hasDeclareKeyword()) parts.push('declare');
	parts.push(node.hasNamespaceKeyword() ? 'namespace' : 'module');
	parts.push(node.getName());
	return parts.join(' ');
}
