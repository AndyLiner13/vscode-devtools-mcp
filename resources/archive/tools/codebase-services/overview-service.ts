import type { OverviewParams, OverviewResult, SymbolNode, TreeNode } from './types';

// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure Node.js — no VS Code API dependency.
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	type ArrowFunction,
	type ClassDeclaration,
	type ConstructorDeclaration,
	type EnumDeclaration,
	type FunctionDeclaration,
	type FunctionExpression,
	type GetAccessorDeclaration,
	type InterfaceDeclaration,
	type MethodDeclaration,
	type Node,
	type SetAccessorDeclaration,
	type SourceFile,
	SyntaxKind
} from 'ts-morph';

import { discoverFiles, readFileText } from './file-utils';
import { applyIgnoreRules, parseIgnoreRules } from './ignore-rules';
import { getCustomParser } from './parsers';
import { getTsProject, getWorkspaceProject } from './ts-project';
import { TS_PARSEABLE_EXTS } from './types';

// ── Public API ─────────────────────────────────────────

export function getOverview(params: OverviewParams): OverviewResult {
	const { dir, metadata, recursive, rootDir, symbols, toolScope } = params;

	// Resolve dir against rootDir
	const resolvedFolder = path.isAbsolute(dir) ? dir : path.resolve(rootDir, dir);

	// maxDepth: undefined = unlimited (recursive), 0 = immediate files only
	const maxDepth = recursive ? undefined : 0;

	const fileMap = discoverFiles({
		ignoreRulesRoot: rootDir,
		maxDepth,
		maxResults: 5000,
		rootDir: resolvedFolder,
		toolScope
	});

	const tree = buildTree(fileMap, resolvedFolder, recursive);

	// Inject ignored entries so they appear in the tree as [Ignored] placeholders
	const ignoreRules = parseIgnoreRules(rootDir);
	injectIgnoredEntries(tree, resolvedFolder, resolvedFolder, ignoreRules, recursive, toolScope);

	let totalSymbols = 0;
	if (symbols) {
		totalSymbols = populateSymbols(tree, '', fileMap, true);
		// Populate reference/implementation counts using workspace project
		try {
			populateReferenceCounts(tree, resolvedFolder, rootDir);
		} catch {
			// Reference counting is best-effort — continue without ref data
		}
	} else if (metadata) {
		// Populate line counts AND symbol counts for file metadata
		populateFileMetadata(tree, '', fileMap);
	}

	// Non-recursive: populate directory stub metadata from filesystem
	if (!recursive && metadata) {
		populateDirectoryStubMeta(tree, resolvedFolder);
	}

	return {
		projectRoot: resolvedFolder,
		summary: {
			totalDirectories: countDirectories(tree),
			totalFiles: fileMap.size,
			totalSymbols
		},
		tree
	};
}

// ── Tree Builder ─────────────────────────────────────

function buildTree(fileMap: Map<string, string>, scanRoot: string, recursive: boolean): TreeNode[] {
	const dirChildren = new Map<string, Map<string, TreeNode>>();

	const getOrCreateDir = (parentKey: string, name: string): void => {
		if (!dirChildren.has(parentKey)) {
			dirChildren.set(parentKey, new Map());
		}
		const parent = dirChildren.get(parentKey)!;
		if (!parent.has(name)) {
			const node: TreeNode = { children: [], name, type: 'directory' };
			parent.set(name, node);
		}
	};

	for (const relativePath of fileMap.keys()) {
		const parts = relativePath.split('/');
		let currentKey = '';

		for (let i = 0; i < parts.length - 1; i++) {
			const dirName = parts[i];
			getOrCreateDir(currentKey, dirName);
			currentKey = currentKey ? `${currentKey}/${dirName}` : dirName;
		}

		const fileName = parts[parts.length - 1];
		if (!dirChildren.has(currentKey)) {
			dirChildren.set(currentKey, new Map());
		}
		dirChildren.get(currentKey)!.set(fileName, { name: fileName, type: 'file' });
	}

	// Non-recursive mode: add subdirectory stubs from the scan root
	if (!recursive) {
		try {
			const entries = fs.readdirSync(scanRoot, { withFileTypes: true });
			if (!dirChildren.has('')) {
				dirChildren.set('', new Map());
			}
			const rootMap = dirChildren.get('')!;
			for (const entry of entries) {
				if (entry.isDirectory() && !rootMap.has(entry.name)) {
					rootMap.set(entry.name, { name: entry.name, type: 'directory' });
				}
			}
		} catch {
			// Directory listing failed — just use what we have from fileMap
		}
	}

	const assemble = (key: string): TreeNode[] => {
		const children = dirChildren.get(key);
		if (!children) return [];

		const nodes = [...children.values()];
		for (const node of nodes) {
			if (node.type === 'directory') {
				const childKey = key ? `${key}/${node.name}` : node.name;
				node.children = assemble(childKey);
			}
		}
		return sortNodes(nodes);
	};

	return assemble('');
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
	return nodes.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

/**
 * Walk the filesystem alongside the built tree and add ignored entries as placeholders.
 * Only items excluded by .devtoolsignore rules are injected (not fileType-filtered items).
 */
function injectIgnoredEntries(tree: TreeNode[], dirPath: string, scanRoot: string, ignoreRules: ReturnType<typeof parseIgnoreRules>, recursive: boolean, toolScope?: string): void {
	if (ignoreRules.length === 0) return;

	const existingNames = new Set(tree.map((n) => n.name));
	const normalizedScanRoot = scanRoot.replaceAll('\\', '/').replace(/\/+$/, '');

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dirPath, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (!entry.isFile() && !entry.isDirectory()) continue;

		const fullPath = path.join(dirPath, entry.name).replaceAll('\\', '/');
		const relative = fullPath.startsWith(`${normalizedScanRoot}/`) ? fullPath.slice(normalizedScanRoot.length + 1) : fullPath;

		const isIgnored = applyIgnoreRules(relative, ignoreRules, toolScope);

		if (existingNames.has(entry.name)) {
			// Entry was already added (e.g. as a directory stub) — mark it ignored if applicable
			if (isIgnored) {
				const existing = tree.find((n) => n.name === entry.name);
				if (existing && !existing.ignored) {
					existing.ignored = true;
					existing.children = undefined;
					existing.symbols = undefined;
				}
			}
			continue;
		}

		if (isIgnored) {
			tree.push({
				ignored: true,
				name: entry.name,
				type: entry.isDirectory() ? 'directory' : 'file'
			});
		}
	}

	if (recursive) {
		for (const node of tree) {
			if (node.type === 'directory' && !node.ignored && node.children) {
				injectIgnoredEntries(node.children, path.join(dirPath, node.name), scanRoot, ignoreRules, recursive, toolScope);
			}
		}
	}

	sortNodes(tree);
}

// ── TypeScript Symbol Extraction (ts-morph) ──────────

export function getTypeScriptSymbols(text: string, fileName: string): SymbolNode[] {
	const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
	if (!TS_PARSEABLE_EXTS.has(ext)) return [];

	const project = getTsProject();
	const tempName = `__overview_${Date.now()}.${ext}`;
	let sourceFile: SourceFile;
	try {
		sourceFile = project.createSourceFile(tempName, text, { overwrite: true });
	} catch {
		return [];
	}

	const symbols: SymbolNode[] = [];

	try {
		for (const fn of sourceFile.getFunctions()) {
			const name = fn.getName() ?? '<anonymous>';
			const node: SymbolNode = {
				kind: 'function',
				name,
				range: { end: fn.getEndLineNumber(), start: fn.getStartLineNumber() }
			};
			const bodyChildren = extractBodyDeclarations(fn);
			if (bodyChildren.length > 0) node.children = bodyChildren;
			symbols.push(node);
		}

		for (const cls of sourceFile.getClasses()) {
			const name = cls.getName() ?? '<anonymous>';
			const node: SymbolNode = {
				children: getClassMembers(cls),
				kind: 'class',
				name,
				range: { end: cls.getEndLineNumber(), start: cls.getStartLineNumber() }
			};
			symbols.push(node);
		}

		for (const iface of sourceFile.getInterfaces()) {
			const node: SymbolNode = {
				children: getInterfaceMembers(iface),
				kind: 'interface',
				name: iface.getName(),
				range: { end: iface.getEndLineNumber(), start: iface.getStartLineNumber() }
			};
			symbols.push(node);
		}

		for (const alias of sourceFile.getTypeAliases()) {
			symbols.push({
				kind: 'type',
				name: alias.getName(),
				range: { end: alias.getEndLineNumber(), start: alias.getStartLineNumber() }
			});
		}

		for (const en of sourceFile.getEnums()) {
			const node: SymbolNode = {
				children: getEnumMembers(en),
				kind: 'enum',
				name: en.getName(),
				range: { end: en.getEndLineNumber(), start: en.getStartLineNumber() }
			};
			symbols.push(node);
		}

		for (const stmt of sourceFile.getVariableStatements()) {
			const isConst = stmt.getDeclarationKind().toString() === 'const';
			for (const decl of stmt.getDeclarations()) {
				const varNode: SymbolNode = {
					kind: isConst ? 'constant' : 'variable',
					name: decl.getName(),
					range: { end: decl.getEndLineNumber(), start: decl.getStartLineNumber() }
				};
				// Check if the initializer is an arrow function or function expression
				const init = decl.getInitializer();
				if (init) {
					const fnNode = extractFunctionFromExpression(init);
					if (fnNode) {
						const bodyChildren = extractBodyDeclarations(fnNode);
						if (bodyChildren.length > 0) varNode.children = bodyChildren;
					}
				}
				symbols.push(varNode);
			}
		}

		for (const mod of sourceFile.getModules()) {
			symbols.push({
				kind: 'namespace',
				name: mod.getName(),
				range: { end: mod.getEndLineNumber(), start: mod.getStartLineNumber() }
			});
		}
	} finally {
		project.removeSourceFile(sourceFile);
	}

	symbols.sort((a, b) => a.range.start - b.range.start);
	return symbols;
}

function getClassMembers(cls: ClassDeclaration): SymbolNode[] {
	const members: SymbolNode[] = [];

	for (const ctor of cls.getConstructors()) {
		const ctorNode: SymbolNode = {
			kind: 'constructor',
			name: 'constructor',
			range: { end: ctor.getEndLineNumber(), start: ctor.getStartLineNumber() }
		};
		const bodyChildren = extractBodyDeclarations(ctor);
		if (bodyChildren.length > 0) ctorNode.children = bodyChildren;
		members.push(ctorNode);
	}

	for (const method of cls.getMethods()) {
		const methodNode: SymbolNode = {
			kind: 'method',
			name: method.getName(),
			range: { end: method.getEndLineNumber(), start: method.getStartLineNumber() }
		};
		const bodyChildren = extractBodyDeclarations(method);
		if (bodyChildren.length > 0) methodNode.children = bodyChildren;
		members.push(methodNode);
	}

	for (const prop of cls.getProperties()) {
		const propNode: SymbolNode = {
			kind: 'property',
			name: prop.getName(),
			range: { end: prop.getEndLineNumber(), start: prop.getStartLineNumber() }
		};
		// Check for arrow function / function expression initializers
		const init = prop.getInitializer();
		if (init) {
			const fnNode = extractFunctionFromExpression(init);
			if (fnNode) {
				const bodyChildren = extractBodyDeclarations(fnNode);
				if (bodyChildren.length > 0) propNode.children = bodyChildren;
			}
		}
		members.push(propNode);
	}

	for (const getter of cls.getGetAccessors()) {
		const getterNode: SymbolNode = {
			kind: 'getter',
			name: getter.getName(),
			range: { end: getter.getEndLineNumber(), start: getter.getStartLineNumber() }
		};
		const bodyChildren = extractBodyDeclarations(getter);
		if (bodyChildren.length > 0) getterNode.children = bodyChildren;
		members.push(getterNode);
	}

	for (const setter of cls.getSetAccessors()) {
		const setterNode: SymbolNode = {
			kind: 'setter',
			name: setter.getName(),
			range: { end: setter.getEndLineNumber(), start: setter.getStartLineNumber() }
		};
		const bodyChildren = extractBodyDeclarations(setter);
		if (bodyChildren.length > 0) setterNode.children = bodyChildren;
		members.push(setterNode);
	}

	members.sort((a, b) => a.range.start - b.range.start);
	return members;
}

// ── Body Declaration Extraction ──────────────────────

type FunctionLikeNode = ArrowFunction | ConstructorDeclaration | FunctionDeclaration | FunctionExpression | GetAccessorDeclaration | MethodDeclaration | SetAccessorDeclaration;

/**
 * Extract named declarations from the body of a function-like node.
 * Only captures variable declarations, inner function declarations,
 * and arrow/function-expression assignments — NOT control flow or expressions.
 */
function extractBodyDeclarations(fnNode: FunctionLikeNode): SymbolNode[] {
	const body = fnNode.getBody();
	if (!body) return [];

	const results: SymbolNode[] = [];
	walkStatements(body, results);
	results.sort((a, b) => a.range.start - b.range.start);
	return results;
}

/**
 * Walk the immediate statements of a block, collecting named declarations.
 * Does not recurse into nested blocks (if/for/while) to keep output focused.
 */
function walkStatements(node: Node, results: SymbolNode[]): void {
	for (const child of node.getChildren()) {
		const kind = child.getKind();

		if (kind === SyntaxKind.VariableStatement) {
			const varStmt = child.asKindOrThrow(SyntaxKind.VariableStatement);
			const declKind = varStmt.getDeclarationKind().toString();
			const isConst = declKind === 'const';
			for (const decl of varStmt.getDeclarations()) {
				const varNode: SymbolNode = {
					kind: isConst ? 'constant' : 'variable',
					name: decl.getName(),
					range: { end: decl.getEndLineNumber(), start: decl.getStartLineNumber() }
				};
				const init = decl.getInitializer();
				if (init) {
					const innerFn = extractFunctionFromExpression(init);
					if (innerFn) {
						const innerBody = extractBodyDeclarations(innerFn);
						if (innerBody.length > 0) varNode.children = innerBody;
					}
				}
				results.push(varNode);
			}
		} else if (kind === SyntaxKind.FunctionDeclaration) {
			const fn = child.asKindOrThrow(SyntaxKind.FunctionDeclaration);
			const name = fn.getName() ?? '<anonymous>';
			const fnSymbol: SymbolNode = {
				kind: 'function',
				name,
				range: { end: fn.getEndLineNumber(), start: fn.getStartLineNumber() }
			};
			const bodyChildren = extractBodyDeclarations(fn);
			if (bodyChildren.length > 0) fnSymbol.children = bodyChildren;
			results.push(fnSymbol);
		} else if (kind === SyntaxKind.ClassDeclaration) {
			const cls = child.asKindOrThrow(SyntaxKind.ClassDeclaration);
			const name = cls.getName() ?? '<anonymous>';
			results.push({
				children: getClassMembers(cls),
				kind: 'class',
				name,
				range: { end: cls.getEndLineNumber(), start: cls.getStartLineNumber() }
			});
		}
	}
}

/**
 * If an expression node is an ArrowFunction or FunctionExpression, return it.
 */
function extractFunctionFromExpression(node: Node): ArrowFunction | FunctionExpression | undefined {
	if (node.getKind() === SyntaxKind.ArrowFunction) {
		return node.asKindOrThrow(SyntaxKind.ArrowFunction);
	}
	if (node.getKind() === SyntaxKind.FunctionExpression) {
		return node.asKindOrThrow(SyntaxKind.FunctionExpression);
	}
	return undefined;
}

function getInterfaceMembers(iface: InterfaceDeclaration): SymbolNode[] {
	const members: SymbolNode[] = [];

	for (const prop of iface.getProperties()) {
		members.push({
			kind: 'property',
			name: prop.getName(),
			range: { end: prop.getEndLineNumber(), start: prop.getStartLineNumber() }
		});
	}

	for (const method of iface.getMethods()) {
		members.push({
			kind: 'method',
			name: method.getName(),
			range: { end: method.getEndLineNumber(), start: method.getStartLineNumber() }
		});
	}

	members.sort((a, b) => a.range.start - b.range.start);
	return members;
}

function getEnumMembers(en: EnumDeclaration): SymbolNode[] {
	const members: SymbolNode[] = [];

	for (const member of en.getMembers()) {
		members.push({
			kind: 'enumMember',
			name: member.getName(),
			range: { end: member.getEndLineNumber(), start: member.getStartLineNumber() }
		});
	}

	return members;
}

// ── Symbol Population ────────────────────────────────

function populateSymbols(nodes: TreeNode[], pathPrefix: string, fileMap: Map<string, string>, storeLineCount = false): number {
	let totalSymbols = 0;

	for (const node of nodes) {
		if (node.type === 'directory' && node.children) {
			const childPrefix = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
			totalSymbols += populateSymbols(node.children, childPrefix, fileMap, storeLineCount);
			continue;
		}

		if (node.type !== 'file') continue;

		const relativePath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
		const absPath = fileMap.get(relativePath);
		if (!absPath) continue;

		const ext = node.name.split('.').pop()?.toLowerCase() ?? '';

		try {
			const { lineCount, text } = readFileText(absPath);
			if (storeLineCount) node.lineCount = lineCount;

			if (TS_PARSEABLE_EXTS.has(ext)) {
				const tsSymbols = getTypeScriptSymbols(text, node.name);
				if (tsSymbols.length > 0) {
					node.symbols = tsSymbols;
					const count = countSymbols(node.symbols);
					node.symbolCount = count;
					totalSymbols += count;
				}
				continue;
			}

			const parserForExt = getCustomParser(ext);
			if (parserForExt) {
				const parsed = parserForExt(text, Infinity);
				if (parsed && parsed.length > 0) {
					node.symbols = parsed;
					const count = countSymbols(node.symbols);
					node.symbolCount = count;
					totalSymbols += count;
				}
			}
		} catch {
			// Skip binary files or files that can't be read as text
		}
	}

	return totalSymbols;
}

function populateFileMetadata(nodes: TreeNode[], pathPrefix: string, fileMap: Map<string, string>): void {
	for (const node of nodes) {
		if (node.type === 'directory' && node.children) {
			const childPrefix = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
			populateFileMetadata(node.children, childPrefix, fileMap);
			continue;
		}
		if (node.type !== 'file') continue;

		const relativePath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
		const absPath = fileMap.get(relativePath);
		if (!absPath) continue;

		const ext = node.name.split('.').pop()?.toLowerCase() ?? '';

		try {
			const { lineCount, text } = readFileText(absPath);
			node.lineCount = lineCount;

			let symbolCount = 0;
			if (TS_PARSEABLE_EXTS.has(ext)) {
				const tsSymbols = getTypeScriptSymbols(text, node.name);
				symbolCount = countSymbols(tsSymbols);
			} else {
				const parserForExt = getCustomParser(ext);
				if (parserForExt) {
					const parsed = parserForExt(text, Infinity);
					if (parsed) symbolCount = countSymbols(parsed);
				}
			}
			if (symbolCount > 0) node.symbolCount = symbolCount;
		} catch {
			// Skip binary files or files that can't be read as text
		}
	}
}

// ── Counting Helpers ─────────────────────────────────

function countSymbols(symbols: SymbolNode[]): number {
	let count = symbols.length;
	for (const s of symbols) {
		if (s.children) count += countSymbols(s.children);
	}
	return count;
}

function countDirectories(nodes: TreeNode[]): number {
	let count = 0;
	for (const node of nodes) {
		if (node.type === 'directory') {
			count++;
			if (node.children) count += countDirectories(node.children);
		}
	}
	return count;
}

// ── Directory Stub Metadata ──────────────────────────

/**
 * For non-recursive mode, populate directory stubs with actual file/dir counts
 * by reading the filesystem. Only runs on directories without expanded children.
 */
function populateDirectoryStubMeta(tree: TreeNode[], parentDir: string): void {
	for (const node of tree) {
		if (node.type !== 'directory' || node.ignored) continue;
		if (node.children && node.children.length > 0) continue;

		const dirPath = path.join(parentDir, node.name);
		try {
			const entries = fs.readdirSync(dirPath, { withFileTypes: true });
			let fileCount = 0;
			let dirCount = 0;
			for (const entry of entries) {
				if (entry.isFile()) fileCount++;
				else if (entry.isDirectory()) dirCount++;
			}
			node.fileCount = fileCount;
			node.dirCount = dirCount;
		} catch {
			// Can't read directory — leave counts undefined
		}
	}
}

// ── Reference & Implementation Counting ──────────────

/**
 * Walk the tree and populate referenceCount/implementationCount on each symbol
 * using the workspace TypeScript project's language service.
 * Also sets totalReferences on file nodes as an aggregate.
 */
function populateReferenceCounts(tree: TreeNode[], resolvedFolder: string, rootDir: string): void {
	const project = getWorkspaceProject(rootDir);
	const langSvc = project.getLanguageService();

	const walk = (nodes: TreeNode[], parentDir: string): void => {
		for (const node of nodes) {
			if (node.type === 'directory' && node.children) {
				walk(node.children, path.join(parentDir, node.name));
				continue;
			}

			if (node.type !== 'file' || !node.symbols) continue;

			const ext = node.name.split('.').pop()?.toLowerCase() ?? '';
			if (!TS_PARSEABLE_EXTS.has(ext)) continue;

			const filePath = path.join(parentDir, node.name).replaceAll('\\', '/');
			const sourceFile = project.getSourceFile(filePath);
			if (!sourceFile) continue;

			// Build identifier lookup for efficient matching
			const identMap = buildIdentifierMap(sourceFile);
			populateSymbolRefs(node.symbols, sourceFile, identMap);
			node.totalReferences = sumSymbolRefs(node.symbols);
		}
	};

	const populateSymbolRefs = (symbols: SymbolNode[], sourceFile: SourceFile, identMap: Map<string, Node>): void => {
		for (const sym of symbols) {
			if (sym.name !== 'constructor' && !sym.name.startsWith('<')) {
				try {
					const key = `${sym.name}:${sym.range.start}`;
					const identNode = identMap.get(key);
					if (identNode) {
						// Reference count (subtract 1 for the definition itself)
						const refs = langSvc.findReferencesAsNodes(identNode);
						sym.referenceCount = Math.max(0, refs.length - 1);

						// Implementation count via raw TS compiler API
						const impls = langSvc.compilerObject.getImplementationAtPosition(sourceFile.getFilePath(), identNode.getStart());
						sym.implementationCount = impls ? impls.length : 0;
					}
				} catch {
					// Skip symbols that can't be resolved
				}
			}

			if (sym.children) {
				populateSymbolRefs(sym.children, sourceFile, identMap);
			}
		}
	};

	walk(tree, resolvedFolder);
}

function buildIdentifierMap(sourceFile: SourceFile): Map<string, Node> {
	const map = new Map<string, Node>();
	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	for (const ident of identifiers) {
		const key = `${ident.getText()}:${ident.getStartLineNumber()}`;
		if (!map.has(key)) {
			map.set(key, ident);
		}
	}
	return map;
}

function sumSymbolRefs(symbols: SymbolNode[]): number {
	let total = 0;
	for (const sym of symbols) {
		total += sym.referenceCount ?? 0;
		if (sym.children) total += sumSymbolRefs(sym.children);
	}
	return total;
}
