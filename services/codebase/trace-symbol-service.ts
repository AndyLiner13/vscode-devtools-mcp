import type {
	DeadCodeItem,
	DeadCodeParams,
	DeadCodeResult,
	TraceCalls,
	TraceCallNode,
	TraceDefinition,
	TraceMember,
	TraceParameter,
	TraceReExport,
	TraceReferenceFile,
	TraceReferences,
	TraceResolutionStep,
	TraceSymbolParams,
	TraceSymbolResult,
	TraceTypeFlow,
	TraceTypeHierarchy,
	TraceTypes,
	TraceUsageKind
} from './types';

import * as fs from 'node:fs';
// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure Node.js â€” no VS Code API dependency.
import * as path from 'node:path';
import { Node, type Project, type SourceFile, SyntaxKind, ts, type Symbol as TsSymbol } from 'ts-morph';

import { applyIgnoreRules, parseIgnoreRules } from './ignore-rules';
import { getWorkspaceProject, invalidateWorkspaceProject } from './ts-project';
import { warn } from '../logger';


// â”€â”€ File Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FileFilter = (absoluteFilePath: string) => boolean;

/**
 * Build a file filter function from .devtoolsignore rules.
 * Files matching the ignore rules are excluded from analysis.
 */
function buildFileFilter(rootDir: string): FileFilter {
	const ignoreRules = parseIgnoreRules(rootDir);

	return (absoluteFilePath: string): boolean => {
		const relativePath = path.relative(rootDir, absoluteFilePath).replaceAll('\\', '/');

		// Apply .devtoolsignore rules
		if (ignoreRules.length > 0 && applyIgnoreRules(relativePath, ignoreRules)) {
			return true;
		}

		return false;
	};
}

// â”€â”€ Module-Level Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DECLARATION_KINDS = new Set([
	SyntaxKind.FunctionDeclaration,
	SyntaxKind.ClassDeclaration,
	SyntaxKind.InterfaceDeclaration,
	SyntaxKind.TypeAliasDeclaration,
	SyntaxKind.EnumDeclaration,
	SyntaxKind.VariableDeclaration,
	SyntaxKind.MethodDeclaration,
	SyntaxKind.PropertyDeclaration,
	SyntaxKind.PropertySignature,
	SyntaxKind.MethodSignature,
	SyntaxKind.EnumMember,
	SyntaxKind.Parameter,
	SyntaxKind.ImportSpecifier,
	SyntaxKind.ImportClause,
	SyntaxKind.Constructor,
	SyntaxKind.GetAccessor,
	SyntaxKind.SetAccessor
]);

const CALLABLE_KINDS = new Set([SyntaxKind.FunctionDeclaration, SyntaxKind.MethodDeclaration, SyntaxKind.ArrowFunction, SyntaxKind.FunctionExpression, SyntaxKind.Constructor]);

const ASSIGNMENT_OPERATORS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '**=', '&&=', '||=', '??=']);

// â”€â”€ Project Root Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Walk up from a file path to find the best project root with a tsconfig.json.
 * Collects all ancestor directories with tsconfigs, then picks from highest to lowest:
 * - Solution tsconfigs (files:[], no include) are used only if their references cover the file
 * - Normal tsconfigs (with include) are preferred otherwise
 * This correctly handles monorepos where sub-trees have independent tsconfigs.
 */
function findNearestProjectRoot(filePath: string, workspaceRoot: string): string | undefined {
	const normalizedRoot = path.normalize(workspaceRoot);
	const normalizedFile = path.normalize(filePath);
	let dir = path.dirname(normalizedFile);
	const candidates: string[] = [];

	while (dir.length >= normalizedRoot.length) {
		if (fs.existsSync(path.join(dir, 'tsconfig.json'))) {
			candidates.push(dir);
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	if (candidates.length === 0) return undefined;

	// Candidates are ordered nearestâ†’highest. Reverse to try highest first.
	candidates.reverse();

	for (const candidate of candidates) {
		if (isSolutionTsconfig(candidate)) {
			if (solutionCoversFile(candidate, normalizedFile)) {
				return candidate;
			}
			continue;
		}
		return candidate;
	}

	// Fallback: nearest candidate
	return candidates[candidates.length - 1];
}

/**
 * Check if a tsconfig is solution-style (files:[], no include â€” delegates to references).
 */
function isSolutionTsconfig(dir: string): boolean {
	try {
		const raw = fs.readFileSync(path.join(dir, 'tsconfig.json'), 'utf-8');
		const config = JSON.parse(raw);
		return Array.isArray(config.files) && config.files.length === 0 && !config.include;
	} catch {
		return false;
	}
}

/**
 * Check if a solution-style tsconfig's references cover a given file path.
 */
function solutionCoversFile(solutionDir: string, filePath: string): boolean {
	try {
		const raw = fs.readFileSync(path.join(solutionDir, 'tsconfig.json'), 'utf-8');
		const config = JSON.parse(raw);
		const refs: Array<{ path: string }> = config.references ?? [];
		for (const ref of refs) {
			const refDir = path.normalize(path.resolve(solutionDir, ref.path));
			if (filePath.startsWith(refDir + path.sep) || filePath.startsWith(refDir)) {
				return true;
			}
		}
		return false;
	} catch {
		return false;
	}
}

// â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function traceSymbol(params: TraceSymbolParams): Promise<TraceSymbolResult> {
	const startTime = Date.now();
	let { rootDir } = params;
	const elapsed = (): number => Date.now() - startTime;
	const TIMEOUT_MS = 60_000;
	const isTimedOut = (): boolean => elapsed() >= TIMEOUT_MS;

	if (!rootDir) {
		return {
			elapsedMs: elapsed(),
			errorMessage: 'No workspace folder found. Open a folder or specify rootDir.',
			notFoundReason: 'no-project',
			symbol: params.symbol
		};
	}

	try {
		if (params.file) {
			const absFile = path.resolve(rootDir, params.file);
			const betterRoot = findNearestProjectRoot(absFile, rootDir);
			if (betterRoot) rootDir = betterRoot;
		}

		invalidateWorkspaceProject(rootDir);
		const project = getWorkspaceProject(rootDir);
		const isIgnored = buildFileFilter(rootDir);
		const sourceFileCount = project.getSourceFiles().length;

		if (sourceFileCount === 0) {
			return {
				elapsedMs: elapsed(),
				errorMessage: `No TypeScript/JavaScript files found in project. Check tsconfig.json in ${rootDir}`,
				notFoundReason: 'no-matching-files',
				resolvedRootDir: rootDir,
				sourceFileCount: 0,
				symbol: params.symbol
			};
		}

		let symbolInfo = findSymbolNode(project, params, rootDir, isIgnored, isTimedOut);

		if (!symbolInfo) {
			return {
				elapsedMs: elapsed(),
				errorMessage: buildSymbolNotFoundMessage(params, sourceFileCount),
				notFoundReason: 'symbol-not-found',
				resolvedRootDir: rootDir,
				sourceFileCount,
				symbol: params.symbol
			};
		}

		const resolvedImport = resolveImportToDefinition(symbolInfo, project);
		symbolInfo = resolvedImport ?? symbolInfo;

		const { node, sourceFile, symbol } = symbolInfo;

		const result: TraceSymbolResult = { symbol: params.symbol };

		result.definition = buildDefinition(node, sourceFile, rootDir, project);

		if (!isTimedOut() && params.references) {
			result.references = buildReferences(node, symbol, project, rootDir, isIgnored);
		}

		if (!isTimedOut() && params.calls) {
			result.calls = buildCalls(node, symbol, project, rootDir, isIgnored);
		}

		if (!isTimedOut() && params.types) {
			result.types = buildTypes(node, project, rootDir, isIgnored);
		}

		if (isTimedOut()) {
			result.partial = true;
			result.partialReason = 'timeout';
		}

		result.elapsedMs = elapsed();
		result.sourceFileCount = sourceFileCount;
		result.resolvedRootDir = rootDir;
		result.diagnostics = buildTraceDiagnostics(result);

		return result;
	} catch (err: unknown) {
		warn('[traceSymbol] Error:', err);
		return {
			elapsedMs: elapsed(),
			errorMessage: buildErrorMessage(err, params),
			partial: true,
			resolvedRootDir: rootDir,
			symbol: params.symbol
		};
	}
}

// â”€â”€ Find Symbol Node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SymbolNodeResult {
	node: Node;
	sourceFile: SourceFile;
	symbol: TsSymbol | undefined;
}

function findSymbolNode(project: Project, params: TraceSymbolParams, rootDir: string, isIgnored: FileFilter, isTimedOut?: () => boolean): SymbolNodeResult | undefined {
	const symbolName = params.symbol;

	if (params.file) {
		const rawPath = path.isAbsolute(params.file) ? params.file : path.join(rootDir, params.file);
		const normalizedPath = rawPath.replaceAll('\\', '/');

		let sourceFile = project.getSourceFile(normalizedPath) ?? project.getSourceFile(rawPath);

		if (!sourceFile) {
			const suffix = params.file.replaceAll('\\', '/');
			sourceFile = project.getSourceFiles().find((sf) => sf.getFilePath().endsWith(suffix));
		}

		if (!sourceFile) {
			try {
				sourceFile = project.addSourceFileAtPath(rawPath);
			} catch {
				return undefined;
			}
		}

		if (!sourceFile) return undefined;

		// Apply include/exclude filter to file-hinted lookups
		if (isIgnored(sourceFile.getFilePath())) return undefined;

		try {
			const found = findNamedDeclaration(sourceFile, symbolName);
			if (found) {
				const actualSourceFile = found.getSourceFile();
				return {
					node: found,
					sourceFile: actualSourceFile,
					symbol: found.getSymbol()
				};
			}
		} catch (err: unknown) {
			warn(`[findSymbolNode] findNamedDeclaration error for '${symbolName}' in ${sourceFile.getFilePath()}:`, err);
		}
	}

	for (const sourceFile of project.getSourceFiles()) {
		if (isTimedOut?.()) return undefined;
		if (isIgnored(sourceFile.getFilePath())) continue;

		try {
			const found = findNamedDeclaration(sourceFile, symbolName);
			if (found) {
				const actualSourceFile = found.getSourceFile();
				return { node: found, sourceFile: actualSourceFile, symbol: found.getSymbol() };
			}
		} catch (err: unknown) {
			warn(`[findSymbolNode] Error searching '${symbolName}' in ${sourceFile.getFilePath()}:`, err);
		}
	}

	return undefined;
}

function findNamedDeclaration(sourceFile: SourceFile, name: string): Node | undefined {
	const func = sourceFile.getFunction(name);
	if (func) return func;

	const cls = sourceFile.getClass(name);
	if (cls) return cls;

	const iface = sourceFile.getInterface(name);
	if (iface) return iface;

	const typeAlias = sourceFile.getTypeAlias(name);
	if (typeAlias) return typeAlias;

	const enumDecl = sourceFile.getEnum(name);
	if (enumDecl) return enumDecl;

	for (const enumD of sourceFile.getEnums()) {
		const member = enumD.getMember(name);
		if (member) return member;
	}

	for (const cls of sourceFile.getClasses()) {
		if (name === 'constructor') {
			const ctors = cls.getConstructors();
			if (ctors.length > 0) return ctors[0];
		}
		const method = cls.getMethod(name);
		if (method) return method;
		const prop = cls.getProperty(name);
		if (prop) return prop;
		const staticMethod = cls.getStaticMethod(name);
		if (staticMethod) return staticMethod;
		const staticProp = cls.getStaticProperty(name);
		if (staticProp) return staticProp;
		const accessor = cls.getGetAccessor(name);
		if (accessor) return accessor;
		const setter = cls.getSetAccessor(name);
		if (setter) return setter;
	}

	for (const iface of sourceFile.getInterfaces()) {
		const method = iface.getMethod(name);
		if (method) return method;
		const prop = iface.getProperty(name);
		if (prop) return prop;
	}

	for (const varStatement of sourceFile.getVariableStatements()) {
		for (const decl of varStatement.getDeclarations()) {
			if (decl.getName() === name) return decl;
		}
	}

	const exported = sourceFile.getExportedDeclarations().get(name);
	if (exported && exported.length > 0) {
		return exported[0];
	}

	const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
	for (const id of identifiers) {
		if (id.getText() === name) {
			const parent = id.getParent();
			if (parent && isDeclarationNode(parent)) {
				return parent;
			}
		}
	}

	return undefined;
}

function isDeclarationNode(node: Node): boolean {
	return DECLARATION_KINDS.has(node.getKind());
}

// â”€â”€ Import Resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * When a found node is an import specifier/clause, follow to the actual definition
 * using the native TypeScript compiler's type checker. This handles:
 * - Workspace package alias imports (@lab/core, @lab/domain, etc.)
 * - Package.json conditional exports (conditional-exports-pkg, misleading-types)
 * - Ambient @types packages (ghost-lib)
 * - Re-export chains
 *
 * Uses ts-morph's escape hatch (compilerObject / compilerNode) to access the raw
 * TypeScript API for full module resolution fidelity.
 */
function resolveImportToDefinition(symbolInfo: { node: Node; sourceFile: SourceFile; symbol: TsSymbol | undefined }, project: Project): undefined | { node: Node; sourceFile: SourceFile; symbol: TsSymbol | undefined } {
	const nodeKind = symbolInfo.node.getKind();

	if (nodeKind !== SyntaxKind.ImportSpecifier && nodeKind !== SyntaxKind.ImportClause) {
		return undefined;
	}

	try {
		const program = project.getProgram().compilerObject;
		const checker = program.getTypeChecker();
		const rawNode = symbolInfo.node.compilerNode;

		// Try native TypeChecker first.
		// For ImportSpecifier with `as` alias or `type` modifier,
		// getSymbolAtLocation on the full node may fail â€” fall back to the name identifier.
		let rawSymbol = checker.getSymbolAtLocation(rawNode);
		if (!rawSymbol && ts.isImportSpecifier(rawNode)) {
			rawSymbol = checker.getSymbolAtLocation(rawNode.name);
		}
		if (rawSymbol) {
			const resolved = resolveViaTypeChecker(checker, rawSymbol, project);
			if (resolved) return resolved;
		}

		// Fallback: TypeChecker couldn't resolve (e.g., conditional exports packages).
		// Use ts.resolveModuleName with ts.sys for full Node module resolution,
		// then search the resolved .d.ts file directly for the exported symbol.
		const importDecl = symbolInfo.node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
		const moduleSpecifier = importDecl?.getModuleSpecifierValue();
		if (!moduleSpecifier) return undefined;

		// Extract the original exported name from the ImportSpecifier.
		// `import { original as alias }` â†’ propertyName = "original", name = "alias"
		// `import { name }` â†’ propertyName = undefined, name = "name"
		// `import { type Foo }` â†’ propertyName = undefined, name = "Foo"
		let exportedName = symbolInfo.node.getText();
		if (ts.isImportSpecifier(rawNode)) {
			exportedName = rawNode.propertyName?.text ?? rawNode.name.text;
		}

		return resolveViaModuleResolution(exportedName, moduleSpecifier, symbolInfo.sourceFile.getFilePath(), program.getCompilerOptions(), project);
	} catch {
		return undefined;
	}
}

/**
 * Resolve via the TypeChecker's alias chain (works for workspace aliases, simple packages).
 */
function resolveViaTypeChecker(checker: ts.TypeChecker, rawSymbol: ts.Symbol, project: Project): undefined | { node: Node; sourceFile: SourceFile; symbol: TsSymbol | undefined } {
	const aliased = resolveRawAlias(checker, rawSymbol);
	if (!aliased || aliased === rawSymbol) return undefined;

	const { declarations } = aliased;
	if (!declarations || declarations.length === 0) return undefined;

	for (const decl of declarations) {
		if (ts.isImportSpecifier(decl) || ts.isImportClause(decl)) continue;

		const declFilePath = decl.getSourceFile().fileName;
		let morphSourceFile = project.getSourceFile(declFilePath);

		if (!morphSourceFile) {
			try {
				morphSourceFile = project.addSourceFileAtPath(declFilePath);
			} catch {
				const normalizedPath = declFilePath.replaceAll('\\', '/');
				morphSourceFile = project.getSourceFile(normalizedPath);
			}
		}

		if (!morphSourceFile) continue;

		const pos = decl.getStart();
		const morphNode = morphSourceFile.getDescendantAtPos(pos);
		if (!morphNode) continue;

		let resolved: Node | undefined = morphNode;
		while (resolved && !isDeclarationNode(resolved)) {
			resolved = resolved.getParent();
		}

		if (resolved) {
			return {
				node: resolved,
				sourceFile: morphSourceFile,
				symbol: resolved.getSymbol()
			};
		}
	}

	return undefined;
}

/**
 * Fallback: resolve via ts.resolveModuleName with ts.sys for full Node module resolution
 * (handles package.json conditional exports that ts-morph's CompilerHost doesn't support).
 */
function resolveViaModuleResolution(symbolName: string, moduleSpecifier: string, containingFile: string, compilerOptions: ts.CompilerOptions, project: Project): undefined | { node: Node; sourceFile: SourceFile; symbol: TsSymbol | undefined } {
	const moduleResolutionHost: ts.ModuleResolutionHost = {
		directoryExists: ts.sys.directoryExists ? (d: string) => ts.sys.directoryExists(d) : undefined,
		fileExists: (f: string) => ts.sys.fileExists(f),
		getCurrentDirectory: () => path.dirname(containingFile),
		getDirectories: ts.sys.getDirectories ? (d: string) => ts.sys.getDirectories(d) : undefined,
		readFile: (f: string) => ts.sys.readFile(f),
		realpath: ts.sys.realpath ? (f: string) => ts.sys.realpath!(f) : undefined
	};

	const resolved = ts.resolveModuleName(moduleSpecifier, containingFile, compilerOptions, moduleResolutionHost);

	const { resolvedModule } = resolved;
	if (!resolvedModule) return undefined;

	const resolvedFilePath = resolvedModule.resolvedFileName;

	// Add the resolved file to the project if not already there
	let morphSourceFile = project.getSourceFile(resolvedFilePath);
	if (!morphSourceFile) {
		try {
			morphSourceFile = project.addSourceFileAtPath(resolvedFilePath);
		} catch {
			const normalizedPath = resolvedFilePath.replaceAll('\\', '/');
			morphSourceFile = project.getSourceFile(normalizedPath);
		}
	}

	if (!morphSourceFile) return undefined;

	// Search for the exported symbol by name in the resolved file
	const exportedDecl = morphSourceFile.getExportedDeclarations().get(symbolName);
	if (exportedDecl && exportedDecl.length > 0) {
		const declNode = exportedDecl[0];
		return {
			node: declNode,
			sourceFile: morphSourceFile,
			symbol: declNode.getSymbol()
		};
	}

	// Symbol not found at top level â€” search inside `declare module` blocks
	// (e.g., @types packages that wrap exports in `declare module "pkg-name"`)
	for (const mod of morphSourceFile.getModules()) {
		const modName = mod.getName().replaceAll(/^['"]|['"]$/g, '');
		if (modName !== moduleSpecifier) continue;

		for (const statement of mod.getStatements()) {
			const sym = statement.getSymbol();
			if (sym?.getName() === symbolName) {
				return {
					node: statement,
					sourceFile: morphSourceFile,
					symbol: sym
				};
			}
		}
	}

	return undefined;
}

/**
 * Resolve a raw TypeScript symbol through its full alias chain.
 * Handles multi-hop re-export chains by iterating until we reach
 * a non-alias symbol or detect a cycle.
 */
function resolveRawAlias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol | undefined {
	const seen = new Set<ts.Symbol>();
	let current = symbol;

	// ts.SymbolFlags.Alias = 2097152
	while (current.flags & ts.SymbolFlags.Alias) {
		if (seen.has(current)) return current; // cycle guard
		seen.add(current);
		try {
			const next = checker.getAliasedSymbol(current);
			if (!next || next === current) return current;
			current = next;
		} catch {
			return current;
		}
	}

	return current;
}

// â”€â”€ Build Definition (always returned) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getSymbolName(node: Node): string {
	if (
		Node.isFunctionDeclaration(node) ||
		Node.isMethodDeclaration(node) ||
		Node.isClassDeclaration(node) ||
		Node.isInterfaceDeclaration(node) ||
		Node.isEnumDeclaration(node) ||
		Node.isTypeAliasDeclaration(node)
	) {
		return node.getName() ?? '<anonymous>';
	}
	if (Node.isVariableDeclaration(node)) return node.getName();
	if (Node.isPropertyDeclaration(node) || Node.isPropertySignature(node)) return node.getName();
	if (Node.isConstructorDeclaration(node)) return 'constructor';
	if (Node.isGetAccessor(node) || Node.isSetAccessor(node)) return node.getName();
	return node.getSymbol()?.getName() ?? '<unknown>';
}

function isExportedNode(node: Node): boolean {
	try {
		if ('isExported' in node && typeof node.isExported === 'function') {
			return (node as { isExported(): boolean }).isExported();
		}
		const parent = node.getParent();
		if (parent && Node.isVariableStatement(parent)) {
			return parent.isExported();
		}
		return false;
	} catch {
		return false;
	}
}

function getModifiers(node: Node): string[] | undefined {
	try {
		if (!('getModifiers' in node)) return undefined;
		const mods = (node as { getModifiers(): Node[] }).getModifiers();
		if (!mods || mods.length === 0) return undefined;
		return mods.map((m: Node) => m.getText());
	} catch {
		return undefined;
	}
}

function getJsDoc(node: Node): string | undefined {
	try {
		if (!('getJsDocs' in node)) return undefined;
		const docs = (node as { getJsDocs(): Array<{ getDescription(): string }> }).getJsDocs();
		if (!docs || docs.length === 0) return undefined;
		const text = docs.map((d) => d.getDescription()).join('\n').trim();
		return text || undefined;
	} catch {
		return undefined;
	}
}

function getTraceParameters(node: Node): TraceParameter[] | undefined {
	try {
		if (!Node.isFunctionDeclaration(node) && !Node.isMethodDeclaration(node) && !Node.isConstructorDeclaration(node)) {
			return undefined;
		}
		const params = node.getParameters();
		if (params.length === 0) return undefined;
		return params.map((p) => {
			const result: TraceParameter = {
				name: p.getName(),
				type: p.getType().getText(p)
			};
			const init = p.getInitializer();
			if (init) result.defaultValue = init.getText();
			return result;
		});
	} catch {
		return undefined;
	}
}

function getReturnType(node: Node): string | undefined {
	try {
		if (!Node.isFunctionDeclaration(node) && !Node.isMethodDeclaration(node)) return undefined;
		const retNode = node.getReturnTypeNode();
		if (retNode) return retNode.getText();
		const retType = node.getReturnType();
		const text = retType.getText(node);
		return text === 'void' ? undefined : text;
	} catch {
		return undefined;
	}
}

function getGenerics(node: Node): string | undefined {
	try {
		if (!('getTypeParameters' in node)) return undefined;
		const typeParams = (node as { getTypeParameters(): Array<{ getText(): string }> }).getTypeParameters();
		if (!typeParams || typeParams.length === 0) return undefined;
		return `<${typeParams.map((tp) => tp.getText()).join(', ')}>`;
	} catch {
		return undefined;
	}
}

function getOverloads(node: Node): string[] | undefined {
	try {
		if (Node.isFunctionDeclaration(node)) {
			const overloads = node.getOverloads();
			if (overloads.length === 0) return undefined;
			return overloads.map((o) => o.getText().trim());
		}
		if (Node.isMethodDeclaration(node)) {
			const overloads = node.getOverloads();
			if (overloads.length === 0) return undefined;
			return overloads.map((o) => o.getText().trim());
		}
		return undefined;
	} catch {
		return undefined;
	}
}

function getMembers(node: Node): TraceMember[] | undefined {
	try {
		if (!Node.isClassDeclaration(node) && !Node.isInterfaceDeclaration(node)) return undefined;

		const members: TraceMember[] = [];

		if (Node.isClassDeclaration(node)) {
			for (const m of node.getMethods()) {
				const member: TraceMember = { kind: 'method', name: m.getName() };
				const ret = m.getReturnTypeNode();
				if (ret) member.type = ret.getText();
				members.push(member);
			}
			for (const p of node.getProperties()) {
				const member: TraceMember = { kind: 'property', name: p.getName() };
				const t = p.getTypeNode();
				if (t) member.type = t.getText();
				members.push(member);
			}
			for (const g of node.getGetAccessors()) {
				members.push({ kind: 'getter', name: g.getName() });
			}
			for (const s of node.getSetAccessors()) {
				members.push({ kind: 'setter', name: s.getName() });
			}
		} else {
			for (const m of node.getMethods()) {
				const member: TraceMember = { kind: 'method', name: m.getName() };
				const ret = m.getReturnTypeNode();
				if (ret) member.type = ret.getText();
				members.push(member);
			}
			for (const p of node.getProperties()) {
				const member: TraceMember = { kind: 'property', name: p.getName() };
				const t = p.getTypeNode();
				if (t) member.type = t.getText();
				members.push(member);
			}
		}

		return members.length > 0 ? members : undefined;
	} catch {
		return undefined;
	}
}

function buildDefinition(node: Node, sourceFile: SourceFile, rootDir: string, project: Project): TraceDefinition {
	const filePath = sourceFile.getFilePath();
	const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');
	const kind = getNodeKindName(node);

	let signature = node.getText();
	if (signature.length > 300) {
		const firstBrace = signature.indexOf('{');
		if (firstBrace > 0) {
			signature = `${signature.substring(0, firstBrace).trim()} { ... }`;
		} else {
			signature = `${signature.substring(0, 300)}â€¦`;
		}
	}

	const def: TraceDefinition = {
		exported: isExportedNode(node),
		file: relativePath,
		kind,
		signature,
		symbol: getSymbolName(node)
	};

	const mods = getModifiers(node);
	if (mods) def.modifiers = mods;

	const jsdoc = getJsDoc(node);
	if (jsdoc) def.jsdoc = jsdoc;

	const params = getTraceParameters(node);
	if (params) def.parameters = params;

	const returns = getReturnType(node);
	if (returns) def.returns = returns;

	const generics = getGenerics(node);
	if (generics) def.generics = generics;

	const overloads = getOverloads(node);
	if (overloads) def.overloads = overloads;

	const members = getMembers(node);
	if (members) def.members = members;

	return def;
}

// â”€â”€ Build References â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TEST_FILE_RE = /[./](test|spec|__tests__)[./]/i;

function classifyUsageKind(node: Node): TraceUsageKind {
	const parent = node.getParent();
	if (!parent) return 'unknown';

	const parentKind = parent.getKind();

	if (parentKind === SyntaxKind.ImportSpecifier || parentKind === SyntaxKind.ImportClause || parentKind === SyntaxKind.NamespaceImport || parentKind === SyntaxKind.ImportDeclaration) {
		return 'import';
	}

	if (Node.isCallExpression(parent)) {
		const expr = parent.getExpression();
		if (expr === node || (expr.getKind() === SyntaxKind.PropertyAccessExpression && expr.getLastChild() === node)) {
			return 'call';
		}
	}

	if (parentKind === SyntaxKind.NewExpression) return 'call';

	const grandparent = parent.getParent();
	const grandparentKind = grandparent?.getKind();

	if (parentKind === SyntaxKind.PropertyAccessExpression && grandparentKind === SyntaxKind.CallExpression) {
		return 'call';
	}

	if (parentKind === SyntaxKind.TypeReference || parentKind === SyntaxKind.HeritageClause || parentKind === SyntaxKind.ExpressionWithTypeArguments || parentKind === SyntaxKind.TypeQuery) {
		return 'type-ref';
	}

	if (grandparentKind === SyntaxKind.Parameter || grandparentKind === SyntaxKind.PropertyDeclaration || grandparentKind === SyntaxKind.PropertySignature || grandparentKind === SyntaxKind.VariableDeclaration) {
		return 'type-ref';
	}

	if (parentKind === SyntaxKind.BinaryExpression) {
		const operatorToken = parent.getChildAtIndex(1);
		if (ASSIGNMENT_OPERATORS.has(operatorToken?.getText() ?? '') && parent.getChildAtIndex(0) === node) {
			return 'write';
		}
	}

	if (parentKind === SyntaxKind.PropertyAccessExpression && grandparentKind === SyntaxKind.BinaryExpression && grandparent) {
		const operatorToken = grandparent.getChildAtIndex(1);
		if (ASSIGNMENT_OPERATORS.has(operatorToken?.getText() ?? '') && grandparent.getChildAtIndex(0) === parent) {
			return 'write';
		}
	}

	if (parentKind === SyntaxKind.VariableDeclaration) return 'write';

	if (parentKind === SyntaxKind.PropertyAssignment && parent.getChildAtIndex(0) === node) {
		return 'write';
	}

	return 'read';
}

function collectReExports(symbolName: string, definitionSourceFile: SourceFile, project: Project, rootDir: string, isIgnored: FileFilter): TraceReExport[] {
	try {
		const reExports: TraceReExport[] = [];
		const definitionPath = definitionSourceFile.getFilePath();
		const seen = new Set<string>();

		for (const sourceFile of project.getSourceFiles()) {
			const filePath = sourceFile.getFilePath();
			if (isIgnored(filePath)) continue;
			if (filePath === definitionPath) continue;

			const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');

			for (const exportDecl of sourceFile.getExportDeclarations()) {
				const moduleSpec = exportDecl.getModuleSpecifierValue();
				if (!moduleSpec) continue;

				for (const namedExport of exportDecl.getNamedExports()) {
					const originalName = namedExport.getName();
					const exportedAs = namedExport.getAliasNode()?.getText() ?? originalName;

					if (originalName === symbolName || exportedAs === symbolName) {
						const key = `${relativePath}:${originalName}:${exportedAs}`;
						if (seen.has(key)) continue;
						seen.add(key);

						reExports.push({
							exportedAs,
							file: relativePath,
							from: moduleSpec
						});
					}
				}
			}
		}

		return reExports;
	} catch (err: unknown) {
		warn('[traceSymbol:collectReExports]', err);
		return [];
	}
}

function buildReferences(node: Node, symbol: TsSymbol | undefined, project: Project, rootDir: string, isIgnored: FileFilter): TraceReferences {
	try {
		const languageService = project.getLanguageService();
		const referenceNodes = languageService.findReferencesAsNodes(node);

		const fileMap = new Map<string, { test: boolean; usages: Set<TraceUsageKind> }>();
		let total = 0;

		const defLine = node.getStartLineNumber();
		const defFile = node.getSourceFile().getFilePath();

		for (const refNode of referenceNodes) {
			const refSourceFile = refNode.getSourceFile();
			if (!refSourceFile) continue;

			const refFilePath = refSourceFile.getFilePath();
			if (isIgnored(refFilePath)) continue;

			const line = refNode.getStartLineNumber();
			if (line === defLine && refFilePath === defFile) continue;

			const relativePath = path.relative(rootDir, refFilePath).replaceAll('\\', '/');
			const usage = classifyUsageKind(refNode);

			total++;

			if (!fileMap.has(relativePath)) {
				fileMap.set(relativePath, { test: TEST_FILE_RE.test(relativePath), usages: new Set() });
			}
			const entry = fileMap.get(relativePath);
			if (entry) entry.usages.add(usage);
		}

		const sourceFile = node.getSourceFile();
		const symbolName = getSymbolName(node);
		const reExports = collectReExports(symbolName, sourceFile, project, rootDir, isIgnored);

		const byFile: TraceReferenceFile[] = [];
		for (const [file, info] of fileMap) {
			const entry: TraceReferenceFile = {
				file,
				usages: [...info.usages].sort() as TraceUsageKind[]
			};
			if (info.test) entry.test = true;
			byFile.push(entry);
		}

		return {
			byFile: byFile.sort((a, b) => a.file.localeCompare(b.file)),
			files: fileMap.size,
			reExports,
			total
		};
	} catch (err: unknown) {
		warn('[traceSymbol:buildReferences]', err);
		return { byFile: [], files: 0, reExports: [], total: 0 };
	}
}

// â”€â”€ Build Calls (hierarchical) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MAX_CALL_DEPTH = 10;

function isCallableNode(node: Node): boolean {
	return CALLABLE_KINDS.has(node.getKind());
}

function buildOutgoingTree(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, visited: Set<string>, remainingDepth: number): TraceCallNode[] {
	if (remainingDepth <= 0) return [];

	const results: TraceCallNode[] = [];
	const callExprs = node.getDescendantsOfKind(SyntaxKind.CallExpression);

	for (const callExpr of callExprs) {
		try {
			const expr = callExpr.getExpression();
			let calledName = '';
			let targetNode: Node | undefined;

			if (expr.getKind() === SyntaxKind.Identifier) {
				calledName = expr.getText();
				const sym = expr.getSymbol();
				if (sym) {
					const decls = sym.getDeclarations();
					if (decls.length > 0) targetNode = decls[0];
				}
			} else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
				calledName = expr.getText();
				const lastChild = expr.getLastChild();
				if (lastChild) {
					const sym = lastChild.getSymbol();
					if (sym) {
						const decls = sym.getDeclarations();
						if (decls.length > 0) targetNode = decls[0];
					}
				}
			} else {
				calledName = expr.getText();
			}

			if (!calledName) continue;

			let filePath = '';

			if (targetNode) {
				const targetFile = targetNode.getSourceFile();
				if (targetFile) {
					const targetFilePath = targetFile.getFilePath();
					if (isIgnored(targetFilePath)) continue;
					filePath = path.relative(rootDir, targetFilePath).replaceAll('\\', '/');
				}
			}

			if (!filePath) {
				const callFile = callExpr.getSourceFile();
				const callFilePath = callFile.getFilePath();
				if (isIgnored(callFilePath)) continue;
				filePath = path.relative(rootDir, callFilePath).replaceAll('\\', '/');
			}

			const key = `${filePath}:${calledName}`;
			if (visited.has(key)) continue;
			visited.add(key);

			const callNode: TraceCallNode = { file: filePath, symbol: calledName };

			if (remainingDepth > 1 && targetNode && isCallableNode(targetNode)) {
				const children = buildOutgoingTree(targetNode, project, rootDir, isIgnored, visited, remainingDepth - 1);
				if (children.length > 0) callNode.children = children;
			}

			results.push(callNode);
		} catch {
			// Skip errors in call resolution
		}
	}

	return results;
}

function buildIncomingTree(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, visited: Set<string>, remainingDepth: number): TraceCallNode[] {
	if (remainingDepth <= 0) return [];

	const results: TraceCallNode[] = [];

	try {
		const languageService = project.getLanguageService();
		const refs = languageService.findReferencesAsNodes(node);

		for (const refNode of refs) {
			const refSourceFile = refNode.getSourceFile();
			if (!refSourceFile) continue;

			const refFilePath = refSourceFile.getFilePath();
			if (isIgnored(refFilePath)) continue;

			const parent = refNode.getParent();
			if (!parent) continue;

			const isCall = parent.getKind() === SyntaxKind.CallExpression || parent.getKind() === SyntaxKind.NewExpression || (parent.getKind() === SyntaxKind.PropertyAccessExpression && parent.getParent()?.getKind() === SyntaxKind.CallExpression);

			if (!isCall) continue;

			let containingFunc: Node | undefined = parent;
			while (containingFunc && !isCallableNode(containingFunc)) {
				containingFunc = containingFunc.getParent();
			}

			let funcName = '';
			if (containingFunc) {
				if (Node.isFunctionDeclaration(containingFunc) || Node.isMethodDeclaration(containingFunc)) {
					funcName = containingFunc.getName() ?? '<anonymous>';
				} else {
					funcName = '<anonymous>';
				}
			} else {
				funcName = '<module>';
			}

			const relativePath = path.relative(rootDir, refFilePath).replaceAll('\\', '/');
			const key = `${relativePath}:${funcName}`;
			if (visited.has(key)) continue;
			visited.add(key);

			const callNode: TraceCallNode = { file: relativePath, symbol: funcName };

			if (remainingDepth > 1 && containingFunc) {
				const children = buildIncomingTree(containingFunc, project, rootDir, isIgnored, visited, remainingDepth - 1);
				if (children.length > 0) callNode.children = children;
			}

			results.push(callNode);
		}
	} catch (err: unknown) {
		warn('[traceSymbol:buildIncomingTree]', err);
	}

	return results;
}

function buildCalls(node: Node, symbol: TsSymbol | undefined, project: Project, rootDir: string, isIgnored: FileFilter): TraceCalls {
	const outgoing = isCallableNode(node) ? buildOutgoingTree(node, project, rootDir, isIgnored, new Set(), MAX_CALL_DEPTH) : [];
	const incoming = symbol ? buildIncomingTree(node, project, rootDir, isIgnored, new Set(), MAX_CALL_DEPTH) : [];
	return { incoming, outgoing };
}

// â”€â”€ Build Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatTypeRef(heritageExpr: Node, rootDir: string): string {
	try {
		const expr = heritageExpr.getFirstDescendantByKind(SyntaxKind.Identifier);
		if (!expr) return heritageExpr.getText();

		const sym = expr.getSymbol();
		if (!sym) return heritageExpr.getText();

		const decls = sym.getDeclarations();
		const aliased = sym.getAliasedSymbol();
		const resolvedDecls = aliased ? aliased.getDeclarations() : decls;

		if (resolvedDecls.length > 0) {
			const decl = resolvedDecls[0];
			const file = decl.getSourceFile().getFilePath();
			const relFile = path.relative(rootDir, file).replaceAll('\\', '/');
			const kind = getNodeKindName(decl);
			return `${heritageExpr.getText()} (${relFile}, ${kind})`;
		}

		return heritageExpr.getText();
	} catch {
		return heritageExpr.getText();
	}
}

function resolveExpressionToDeclaration(expr: Node, _project: Project): Node | undefined {
	try {
		const symbol = expr.getSymbol();
		if (!symbol) return undefined;

		const declarations = symbol.getDeclarations();
		if (declarations.length === 0) return undefined;

		const aliased = symbol.getAliasedSymbol();
		if (aliased) {
			const aliasedDeclarations = aliased.getDeclarations();
			if (aliasedDeclarations.length > 0) return aliasedDeclarations[0];
		}

		return declarations[0];
	} catch {
		return undefined;
	}
}

function isSameDeclaration(a: Node, b: Node): boolean {
	return a.getSourceFile().getFilePath() === b.getSourceFile().getFilePath() && a.getStart() === b.getStart();
}

function findSubtypes(node: Node, project: Project, rootDir: string, isIgnored: FileFilter): string[] {
	const subtypes: string[] = [];
	const targetName = (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) ? node.getName() : undefined;
	if (!targetName) return subtypes;

	for (const sourceFile of project.getSourceFiles()) {
		const filePath = sourceFile.getFilePath();
		if (isIgnored(filePath)) continue;

		for (const classDecl of sourceFile.getClasses()) {
			let isSubtype = false;

			const extendsExpr = classDecl.getExtends();
			if (extendsExpr) {
				const resolved = resolveExpressionToDeclaration(extendsExpr.getExpression(), project);
				if (resolved && isSameDeclaration(resolved, node)) isSubtype = true;
			}

			if (!isSubtype) {
				for (const impl of classDecl.getImplements()) {
					const resolved = resolveExpressionToDeclaration(impl.getExpression(), project);
					if (resolved && isSameDeclaration(resolved, node)) { isSubtype = true; break; }
				}
			}

			if (isSubtype) {
				const relFile = path.relative(rootDir, filePath).replaceAll('\\', '/');
				const name = classDecl.getName() ?? '<anonymous>';
				subtypes.push(`${name} (${relFile}, class)`);
			}
		}

		if (Node.isInterfaceDeclaration(node)) {
			for (const ifaceDecl of sourceFile.getInterfaces()) {
				for (const ext of ifaceDecl.getExtends()) {
					const resolved = resolveExpressionToDeclaration(ext.getExpression(), project);
					if (resolved && isSameDeclaration(resolved, node)) {
						const relFile = path.relative(rootDir, filePath).replaceAll('\\', '/');
						const name = ifaceDecl.getName() ?? '<anonymous>';
						subtypes.push(`${name} (${relFile}, interface)`);
						break;
					}
				}
			}
		}
	}

	return subtypes;
}

function buildTypeFlows(node: Node, project: Project, rootDir: string, isIgnored: FileFilter): TraceTypes['flows'] | undefined {
	const flows: TraceTypes['flows'] = {};

	if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
		const params = node.getParameters();
		if (params.length > 0) {
			flows.parameters = params.map((p) => {
				const typeText = p.getType().getText(p);
				const flow: TraceTypeFlow = { name: p.getName(), type: typeText };
				const resolved = resolveTypeToFile(p.getType(), rootDir, isIgnored);
				if (resolved) flow.file = resolved;
				return flow;
			});
		}

		const retType = node.getReturnType();
		flows.returns = retType.getText(node);
	}

	if (Node.isClassDeclaration(node)) {
		const props = node.getProperties();
		if (props.length > 0) {
			flows.properties = props.map((p) => {
				const typeText = p.getType().getText(p);
				const flow: TraceTypeFlow = { name: p.getName(), type: typeText };
				const resolved = resolveTypeToFile(p.getType(), rootDir, isIgnored);
				if (resolved) flow.file = resolved;
				return flow;
			});
		}
	}

	if (Node.isInterfaceDeclaration(node)) {
		const props = node.getProperties();
		if (props.length > 0) {
			flows.properties = props.map((p) => {
				const typeText = p.getType().getText(p);
				const flow: TraceTypeFlow = { name: p.getName(), type: typeText };
				const resolved = resolveTypeToFile(p.getType(), rootDir, isIgnored);
				if (resolved) flow.file = resolved;
				return flow;
			});
		}
	}

	const hasContent = flows.parameters || flows.returns || flows.properties;
	return hasContent ? flows : undefined;
}

function resolveTypeToFile(type: ReturnType<Node['getType']>, rootDir: string, isIgnored: FileFilter): string | undefined {
	try {
		const sym = type.getSymbol();
		if (!sym) return undefined;
		const decls = sym.getDeclarations();
		if (decls.length === 0) return undefined;
		const filePath = decls[0].getSourceFile().getFilePath();
		if (isIgnored(filePath)) return undefined;
		return path.relative(rootDir, filePath).replaceAll('\\', '/');
	} catch {
		return undefined;
	}
}

function detectTypeGuard(node: Node): string | undefined {
	try {
		if (!Node.isFunctionDeclaration(node) && !Node.isMethodDeclaration(node)) return undefined;
		const retTypeNode = node.getReturnTypeNode();
		if (!retTypeNode) return undefined;
		const text = retTypeNode.getText();
		if (text.includes(' is ')) return text;
		return undefined;
	} catch {
		return undefined;
	}
}

function findMergedDeclarations(node: Node, project: Project, rootDir: string, isIgnored: FileFilter): string[] | undefined {
	try {
		const name = getSymbolName(node);
		if (name === '<anonymous>' || name === '<unknown>') return undefined;

		const declarations: string[] = [];
		const nodeFile = node.getSourceFile().getFilePath();
		const nodeStart = node.getStart();

		for (const sourceFile of project.getSourceFiles()) {
			const filePath = sourceFile.getFilePath();
			if (isIgnored(filePath)) continue;

			const exported = sourceFile.getExportedDeclarations().get(name);
			if (!exported) continue;

			for (const decl of exported) {
				if (decl.getSourceFile().getFilePath() === nodeFile && decl.getStart() === nodeStart) continue;
				const kind = getNodeKindName(decl);
				const relFile = path.relative(rootDir, decl.getSourceFile().getFilePath()).replaceAll('\\', '/');
				declarations.push(`${kind} in ${relFile}`);
			}
		}

		return declarations.length > 0 ? declarations : undefined;
	} catch {
		return undefined;
	}
}

function buildTypes(node: Node, project: Project, rootDir: string, isIgnored: FileFilter): TraceTypes {
	const result: TraceTypes = {};

	if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
		const hierarchy: TraceTypeHierarchy = {};

		if (Node.isClassDeclaration(node)) {
			const ext = node.getExtends();
			if (ext) hierarchy.extends = formatTypeRef(ext, rootDir);
			const impls = node.getImplements();
			if (impls.length > 0) hierarchy.implements = impls.map((i) => formatTypeRef(i, rootDir));
		} else {
			const exts = node.getExtends();
			if (exts.length > 0) hierarchy.extends = exts.map((e) => formatTypeRef(e, rootDir)).join(', ');
		}

		const subtypes = findSubtypes(node, project, rootDir, isIgnored);
		if (subtypes.length > 0) hierarchy.subtypes = subtypes;

		if (Object.keys(hierarchy).length > 0) result.hierarchy = hierarchy;
	}

	const flows = buildTypeFlows(node, project, rootDir, isIgnored);
	if (flows) result.flows = flows;

	const typeGuard = detectTypeGuard(node);
	if (typeGuard) result.typeGuard = typeGuard;

	const merged = findMergedDeclarations(node, project, rootDir, isIgnored);
	if (merged) result.mergedDeclarations = merged;

	return result;
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getNodeKindName(node: Node): string {
	const kind = node.getKind();
	switch (kind) {
		case SyntaxKind.FunctionDeclaration:
			return 'function';
		case SyntaxKind.MethodDeclaration:
			return 'method';
		case SyntaxKind.ClassDeclaration:
			return 'class';
		case SyntaxKind.InterfaceDeclaration:
			return 'interface';
		case SyntaxKind.TypeAliasDeclaration:
			return 'type';
		case SyntaxKind.EnumDeclaration:
			return 'enum';
		case SyntaxKind.VariableDeclaration:
			return 'variable';
		case SyntaxKind.PropertyDeclaration:
			return 'property';
		case SyntaxKind.PropertySignature:
			return 'property';
		case SyntaxKind.MethodSignature:
			return 'method';
		case SyntaxKind.EnumMember:
			return 'enum-member';
		case SyntaxKind.Parameter:
			return 'parameter';
		case SyntaxKind.ImportSpecifier:
			return 'import';
		case SyntaxKind.ImportClause:
			return 'import';
		case SyntaxKind.Constructor:
			return 'constructor';
		case SyntaxKind.GetAccessor:
			return 'getter';
		case SyntaxKind.SetAccessor:
			return 'setter';
		case SyntaxKind.ArrowFunction:
			return 'function';
		case SyntaxKind.FunctionExpression:
			return 'function';
		default:
			return 'unknown';
	}
}

function buildSymbolNotFoundMessage(params: TraceSymbolParams, sourceFileCount: number): string {
	const parts: string[] = [];
	parts.push(`Symbol '${params.symbol}' not found in project (${sourceFileCount} files scanned).`);

	if (params.file) {
		parts.push(`Searched in file: ${params.file}.`);
		parts.push('Verify the file is included in tsconfig.json.');
	} else {
		parts.push('Try specifying a file path to narrow the search.');
	}

	return parts.join(' ');
}

function buildErrorMessage(err: unknown, params: TraceSymbolParams): string {
	const errorStr = err instanceof Error ? err.message : String(err);

	if (errorStr.includes('Cannot find module') || errorStr.includes('ENOENT')) {
		return `File not found: ${params.file ?? params.rootDir}`;
	}
	if (errorStr.includes('tsconfig') || errorStr.includes('Cannot parse')) {
		return `TypeScript configuration error: ${errorStr}`;
	}
	if (errorStr.includes('out of memory') || errorStr.includes('heap')) {
		return `Memory limit exceeded while tracing '${params.symbol}'.`;
	}

	return `Unexpected error while tracing '${params.symbol}': ${errorStr}`;
}

function buildTraceDiagnostics(result: TraceSymbolResult): string[] {
	const diagnostics: string[] = [];
	const NODE_MODULES_SEG = '/node_modules/';
	const D_TS_SUFFIX = '.d.ts';
	const THRESHOLD = 5;

	let nodeModulesCount = 0;
	let dtsCount = 0;

	if (result.references) {
		for (const ref of result.references.byFile) {
			if (ref.file.includes(NODE_MODULES_SEG)) nodeModulesCount++;
			if (ref.file.endsWith(D_TS_SUFFIX)) dtsCount++;
		}
	}

	if (nodeModulesCount >= THRESHOLD) {
		diagnostics.push(`Found ${nodeModulesCount} references in node_modules. Consider adding "node_modules" to .devtoolsignore.`);
	}
	if (dtsCount >= THRESHOLD) {
		diagnostics.push(`Found ${dtsCount} references in .d.ts files. Consider adding "**/*.d.ts" to .devtoolsignore.`);
	}

	return diagnostics;
}


// -- Dead Code Detection ----------

const TEST_FILE_PATTERN = /[./](test|spec|__tests__)[./]/i;

/**
 * Find dead code in the codebase: unused exports, unreachable functions,
 * and dead variables. Each result includes a reason and confidence level.
 */
export async function findDeadCode(params: DeadCodeParams): Promise<DeadCodeResult> {
	const startTime = Date.now();
	const { rootDir } = params;
	const exportedOnly = params.exportedOnly ?? true;
	const excludeTests = params.excludeTests ?? true;
	const limit = params.limit ?? 100;
	const kinds = new Set(params.kinds ?? ['function', 'class', 'interface', 'type', 'variable', 'constant', 'enum']);
	const timeoutMs = 55_000;
	const isTimedOut = (): boolean => Date.now() - startTime >= timeoutMs;

	if (!rootDir) {
		return {
			deadCode: [],
			errorMessage: 'No workspace folder found. Open a folder or specify rootDir.',
			summary: { scanDurationMs: 0, totalDead: 0, totalScanned: 0 }
		};
	}

	try {
		const project = getWorkspaceProject(rootDir);
		const sourceFiles = project.getSourceFiles();
		const deadCode: DeadCodeItem[] = [];
		let totalScanned = 0;
		const byKind: Record<string, number> = {};
		const isIgnored = buildFileFilter(rootDir);

		const addDead = (item: DeadCodeItem): void => {
			deadCode.push(item);
			byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
		};

		for (const sourceFile of sourceFiles) {
			if (deadCode.length >= limit) break;
			if (isTimedOut()) break;

			const filePath = sourceFile.getFilePath();

			if (isIgnored(filePath)) {
				continue;
			}

			const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');

			if (excludeTests && TEST_FILE_PATTERN.test(relativePath)) {
				continue;
			}

			// â”€â”€ Exported symbols with zero external references â”€â”€
			const exportedDeclarations = sourceFile.getExportedDeclarations();

			for (const [name, declarations] of exportedDeclarations) {
				if (deadCode.length >= limit) break;

				const decl = declarations[0];
				if (!decl) continue;

				const kind = getSymbolKindString(decl);
				if (!kinds.has(kind)) continue;

				totalScanned++;

				const refs = Node.isReferenceFindable(decl) ? decl.findReferencesAsNodes() : [];
				const externalRefs = refs.filter((ref: Node) => {
					const refFile = ref.getSourceFile();
					return refFile !== sourceFile || ref.getStartLineNumber() !== decl.getStartLineNumber();
				});

				if (externalRefs.length === 0) {
					addDead({
						confidence: 'high',
						exported: true,
						file: relativePath,
						kind,
						line: decl.getStartLineNumber(),
						name,
						reason: 'exported but never imported or referenced by any other module'
					});
				}
			}

			// â”€â”€ Non-exported symbols (unreachable functions + dead variables) â”€â”€
			if (!exportedOnly) {
				// Unreachable functions: not exported AND no internal callers
				if (kinds.has('function')) {
					for (const decl of sourceFile.getFunctions()) {
						if (deadCode.length >= limit) break;
						if (decl.isExported?.()) continue;

						const name = decl.getName();
						if (!name) continue;

						totalScanned++;

						const refs = decl.findReferencesAsNodes();
						if (refs.length <= 1) {
							addDead({
								confidence: 'high',
								exported: false,
								file: relativePath,
								kind: 'function',
								line: decl.getStartLineNumber(),
								name,
								reason: 'non-exported function with no internal callers'
							});
						}
					}
				}

				// Dead variables: assigned but never read
				if (kinds.has('variable')) {
					for (const varStmt of sourceFile.getVariableStatements()) {
						if (deadCode.length >= limit) break;
						if (varStmt.isExported()) continue;

						for (const decl of varStmt.getDeclarations()) {
							if (deadCode.length >= limit) break;

							const name = decl.getName();
							if (!name) continue;

							totalScanned++;

							const refs = decl.findReferencesAsNodes();
							// A variable with only 1 ref (its own declaration) is dead
							if (refs.length <= 1) {
								addDead({
									confidence: decl.getInitializer() ? 'high' : 'medium',
									exported: false,
									file: relativePath,
									kind: 'variable',
									line: decl.getStartLineNumber(),
									name,
									reason: 'variable assigned but never read'
								});
							}
						}
					}
				}

				// Unreachable classes: not exported AND no internal usage
				if (kinds.has('class')) {
					for (const decl of sourceFile.getClasses()) {
						if (deadCode.length >= limit) break;
						if (decl.isExported?.()) continue;

						const name = decl.getName();
						if (!name) continue;

						totalScanned++;

						const refs = Node.isReferenceFindable(decl) ? decl.findReferencesAsNodes() : [];
						if (refs.length <= 1) {
							addDead({
								confidence: 'high',
								exported: false,
								file: relativePath,
								kind: 'class',
								line: decl.getStartLineNumber(),
								name,
								reason: 'non-exported class with no internal usage'
							});
						}
					}
				}

				// Unreachable interfaces/types: not exported AND no internal usage
				if (kinds.has('interface')) {
					for (const decl of sourceFile.getInterfaces()) {
						if (deadCode.length >= limit) break;
						if (decl.isExported?.()) continue;

						const name = decl.getName();
						if (!name) continue;

						totalScanned++;

						const refs = Node.isReferenceFindable(decl) ? decl.findReferencesAsNodes() : [];
						if (refs.length <= 1) {
							addDead({
								confidence: 'medium',
								exported: false,
								file: relativePath,
								kind: 'interface',
								line: decl.getStartLineNumber(),
								name,
								reason: 'non-exported interface with no internal usage'
							});
						}
					}
				}

				if (kinds.has('type')) {
					for (const decl of sourceFile.getTypeAliases()) {
						if (deadCode.length >= limit) break;
						if (decl.isExported?.()) continue;

						const name = decl.getName();
						if (!name) continue;

						totalScanned++;

						const refs = Node.isReferenceFindable(decl) ? decl.findReferencesAsNodes() : [];
						if (refs.length <= 1) {
							addDead({
								confidence: 'medium',
								exported: false,
								file: relativePath,
								kind: 'type',
								line: decl.getStartLineNumber(),
								name,
								reason: 'non-exported type alias with no internal usage'
							});
						}
					}
				}

				if (kinds.has('enum')) {
					for (const decl of sourceFile.getEnums()) {
						if (deadCode.length >= limit) break;
						if (decl.isExported?.()) continue;

						const name = decl.getName();
						if (!name) continue;

						totalScanned++;

						const refs = Node.isReferenceFindable(decl) ? decl.findReferencesAsNodes() : [];
						if (refs.length <= 1) {
							addDead({
								confidence: 'medium',
								exported: false,
								file: relativePath,
								kind: 'enum',
								line: decl.getStartLineNumber(),
								name,
								reason: 'non-exported enum with no internal usage'
							});
						}
					}
				}
			}
		}

		return {
			deadCode,
			resolvedRootDir: rootDir,
			summary: {
				byKind: Object.keys(byKind).length > 0 ? byKind : undefined,
				scanDurationMs: Date.now() - startTime,
				totalDead: deadCode.length,
				totalScanned
			}
		};
	} catch (err: unknown) {
		warn('[findDeadCode] Error:', err);
		return {
			deadCode: [],
			errorMessage: err instanceof Error ? err.message : String(err),
			resolvedRootDir: rootDir,
			summary: { scanDurationMs: Date.now() - startTime, totalDead: 0, totalScanned: 0 }
		};
	}
}

/**
 * Get a simple kind string from a ts-morph node.
 */
function getSymbolKindString(node: Node): string {
	const kind = node.getKind();
	switch (kind) {
		case SyntaxKind.FunctionDeclaration:
			return 'function';
		case SyntaxKind.ClassDeclaration:
			return 'class';
		case SyntaxKind.InterfaceDeclaration:
			return 'interface';
		case SyntaxKind.TypeAliasDeclaration:
			return 'type';
		case SyntaxKind.VariableDeclaration:
			return 'variable';
		case SyntaxKind.EnumDeclaration:
			return 'enum';
		default:
			return 'unknown';
	}
}
