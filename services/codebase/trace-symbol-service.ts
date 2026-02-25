import type {
	CallChainInfo,
	CallChainNode,
	DeadCodeItem,
	DeadCodeParams,
	DeadCodeResult,
	ImpactDependentInfo,
	ImpactInfo,
	ReExportInfo,
	ReferenceInfo,
	SymbolLocationInfo,
	TraceSymbolParams,
	TraceSymbolResult,
	TypeFlowInfo,
	TypeHierarchyInfo,
	TypeHierarchyNode
} from './types';

import * as fs from 'node:fs';
// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure Node.js — no VS Code API dependency.
import * as path from 'node:path';
import { Node, type Project, type SourceFile, SyntaxKind, ts, type Symbol as TsSymbol } from 'ts-morph';

import { applyIgnoreRules, globToRegex, parseIgnoreRules } from './ignore-rules';
import { getWorkspaceProject, invalidateWorkspaceProject } from './ts-project';
import { warn } from '../logger';


// ── File Filter ────────────────────────────────────────

type FileFilter = (absoluteFilePath: string) => boolean;

/**
 * Build a file filter function from .devtoolsignore + per-request include/exclude patterns.
 * Follows VS Code search semantics:
 * - If includePatterns specified → file must match at least one (overrides all excludes)
 * - Otherwise → .devtoolsignore exclusions + excludePatterns are applied
 */
function buildFileFilter(rootDir: string, includePatterns?: string[], excludePatterns?: string[]): FileFilter {
	const ignoreRules = parseIgnoreRules(rootDir);

	if (excludePatterns) {
		for (const pattern of excludePatterns) {
			ignoreRules.push({ negated: false, pattern, scope: null });
		}
	}

	const includeMatchers = (includePatterns ?? []).map((p) => globToRegex(p));

	return (absoluteFilePath: string): boolean => {
		const relativePath = path.relative(rootDir, absoluteFilePath).replaceAll('\\', '/');

		// If includePatterns specified, file must match at least one to be considered
		if (includeMatchers.length > 0) {
			if (!includeMatchers.some((regex) => regex.test(relativePath))) {
				return true;
			}
		}

		// Then apply .devtoolsignore + excludePatterns to further narrow
		if (ignoreRules.length > 0 && applyIgnoreRules(relativePath, ignoreRules)) {
			return true;
		}

		return false;
	};
}

// ── Module-Level Constants ─────────────────────────────

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

// ── Project Root Detection ─────────────────────────────

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

	// Candidates are ordered nearest→highest. Reverse to try highest first.
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
 * Check if a tsconfig is solution-style (files:[], no include — delegates to references).
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

// ── Public API ─────────────────────────────────────────

export async function traceSymbol(params: TraceSymbolParams): Promise<TraceSymbolResult> {
	const startTime = Date.now();
	const userTimeout = params.timeout ?? 30000;
	const maxReferences = params.maxReferences ?? 500;
	const include = new Set(params.include ?? ['all']);
	const includeAll = include.has('all');
	const depth = params.depth ?? 3;
	let { rootDir } = params;

	const elapsed = (): number => Date.now() - startTime;

	if (!rootDir) {
		const result = emptyTraceResult(params.symbol);
		result.notFoundReason = 'no-project';
		result.errorMessage = 'No workspace folder found. Open a folder or specify rootDir.';
		result.elapsedMs = elapsed();
		return result;
	}

	try {
		// When a specific file is given, find the best project root with a tsconfig
		if (params.file) {
			const absFile = path.resolve(rootDir, params.file);
			const betterRoot = findNearestProjectRoot(absFile, rootDir);
			if (betterRoot) {
				rootDir = betterRoot;
			}
		}

		// Force refresh project cache if requested (e.g., after adding new files)
		if (params.forceRefresh) {
			invalidateWorkspaceProject(rootDir);
		}

		const project = getWorkspaceProject(rootDir);

		// Build file filter from .devtoolsignore + per-request patterns
		const isIgnored = buildFileFilter(rootDir, params.includePatterns, params.excludePatterns);

		// Calculate dynamic timeout based on project size
		const sourceFileCount = project.getSourceFiles().length;
		const calculatedTimeout = calculateDynamicTimeout(sourceFileCount, maxReferences, depth);
		const effectiveTimeout = Math.max(userTimeout, calculatedTimeout);
		const isTimedOut = (): boolean => elapsed() >= effectiveTimeout;

		if (sourceFileCount === 0) {
			const result = emptyTraceResult(params.symbol);
			result.resolvedRootDir = rootDir;
			result.notFoundReason = 'no-matching-files';
			result.errorMessage = `No TypeScript/JavaScript files found in project. Check tsconfig.json "include" patterns or ensure *.ts files exist in ${rootDir}`;
			result.elapsedMs = elapsed();
			result.sourceFileCount = 0;
			result.effectiveTimeout = effectiveTimeout;
			return result;
		}

		let symbolInfo = findSymbolNode(project, params, rootDir, isIgnored, isTimedOut);

		// Track if line/column hint was provided but didn't match
		const lineHintIgnored = symbolInfo?.lineHintIgnored ?? false;

		if (!symbolInfo) {
			const emptyResult = emptyTraceResult(params.symbol);
			emptyResult.resolvedRootDir = rootDir;
			emptyResult.elapsedMs = elapsed();
			emptyResult.sourceFileCount = sourceFileCount;
			emptyResult.effectiveTimeout = effectiveTimeout;
			emptyResult.notFoundReason = 'symbol-not-found';
			emptyResult.errorMessage = buildSymbolNotFoundMessage(params, sourceFileCount);
			return emptyResult;
		}

		// If the found node is an import, follow to the actual definition
		const originalNodeKind = symbolInfo.node.getKind();
		const wasImport = originalNodeKind === SyntaxKind.ImportSpecifier || originalNodeKind === SyntaxKind.ImportClause;
		const resolvedImport = resolveImportToDefinition(symbolInfo, project);
		const unresolved = wasImport && !resolvedImport;
		symbolInfo = resolvedImport ?? symbolInfo;

		const { node, sourceFile, symbol } = symbolInfo;

		const result: TraceSymbolResult = {
			callChain: { incomingCalls: [], outgoingCalls: [] },
			reExports: [],
			references: [],
			summary: { maxCallDepth: 0, totalFiles: 0, totalReferences: 0 },
			symbol: params.symbol,
			typeFlows: []
		};

		// Phase 1: Definition (fast, always do)
		if (includeAll || include.has('definitions')) {
			result.definition = traceDefinition(node, sourceFile, rootDir);
			if (result.definition && unresolved) {
				result.definition.unresolved = true;
			}
		}

		// Phase 2: References (can be slow, respect limits)
		if (!isTimedOut() && (includeAll || include.has('references'))) {
			const refs = traceReferences(node, symbol, project, rootDir, isIgnored, maxReferences);
			result.references = refs.references;
			if (refs.truncated) {
				result.partial = true;
				result.partialReason = 'max-references';
			}
		}

		// Phase 3: Re-exports (moderate cost)
		if (!isTimedOut() && (includeAll || include.has('reexports'))) {
			result.reExports = traceReExports(params.symbol, sourceFile, project, rootDir, isIgnored);
		}

		// Phase 4: Call hierarchy (can be slow) with adaptive depth
		if (!isTimedOut() && (includeAll || include.has('calls'))) {
			const TOKEN_BUDGET = 12_000; // ~3000 tokens
			let usedDepth = depth;
			let callChain = traceCallHierarchy(node, symbol, project, usedDepth, rootDir, isIgnored);

			// Adaptive depth: reduce if over budget
			while (usedDepth > 1 && estimateCallChainChars(callChain) > TOKEN_BUDGET) {
				usedDepth--;
				callChain = traceCallHierarchy(node, symbol, project, usedDepth, rootDir, isIgnored);
			}

			result.callChain = callChain;

			// Track auto-optimization metadata
			if (usedDepth < depth) {
				result._autoOptimizedCallDepth = {
					reason: `Call chain exceeded ${TOKEN_BUDGET} char budget; reduced from depth ${depth} to ${usedDepth}.`,
					requestedDepth: depth,
					usedDepth
				};
			}
		}

		// Phase 5: Type flows (moderate cost)
		if (!isTimedOut() && (includeAll || include.has('type-flows'))) {
			result.typeFlows = traceTypeFlows(node, project, isIgnored);
		}

		// Phase 6: Type hierarchy (moderate cost)
		if (!isTimedOut() && (includeAll || include.has('hierarchy'))) {
			result.hierarchy = traceTypeHierarchy(node, project, depth, rootDir, isIgnored);
		}

		// Phase 7: Impact analysis (expensive, skip if timed out)
		if (!isTimedOut() && params.includeImpact) {
			result.impact = computeImpact(node, project, depth, rootDir, isIgnored);
		}

		// Check if we timed out during processing
		if (isTimedOut() && !result.partial) {
			result.partial = true;
			result.partialReason = 'timeout';
		}

		const referencedFiles = new Set<string>();
		for (const ref of result.references) {
			referencedFiles.add(ref.file);
		}
		if (result.definition) {
			referencedFiles.add(result.definition.file);
		}
		result.summary = {
			maxCallDepth: computeMaxCallDepth(result.callChain, depth),
			totalFiles: referencedFiles.size,
			totalReferences: result.references.length
		};

		result.elapsedMs = elapsed();
		result.sourceFileCount = sourceFileCount;
		result.effectiveTimeout = effectiveTimeout;
		result.resolvedRootDir = rootDir;
		result.diagnostics = buildTraceDiagnostics(result, params);

		// Add warning if line/column hint was provided but didn't match the found symbol
		if (lineHintIgnored && result.definition) {
			const msg = `Line ${params.line} hint was ignored — symbol '${params.symbol}' was found at line ${result.definition.line} instead. Verify the line number matches the symbol definition.`;
			result.diagnostics = result.diagnostics ?? [];
			result.diagnostics.unshift(msg);
		}

		return result;
	} catch (err: unknown) {
		warn('[traceSymbol] Error:', err);
		const errorResult = emptyTraceResult(params.symbol);
		errorResult.elapsedMs = elapsed();
		errorResult.partial = true;
		errorResult.errorMessage = buildErrorMessage(err, params);
		errorResult.resolvedRootDir = rootDir;
		return errorResult;
	}
}

// ── Find Symbol Node ─────────────────────────────────

interface SymbolNodeResult {
	lineHintIgnored?: boolean;
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

		// Track if line/column lookup was attempted
		let lineColAttempted = false;
		let lineColFailed = false;

		if (params.line !== undefined && params.column !== undefined) {
			lineColAttempted = true;
			try {
				const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(params.line - 1, params.column);
				let nodeAtPos: Node | undefined = sourceFile.getDescendantAtPos(pos);

				while (nodeAtPos && !isDeclarationNode(nodeAtPos)) {
					nodeAtPos = nodeAtPos.getParent();
				}

				if (nodeAtPos) {
					const actualSourceFile = nodeAtPos.getSourceFile();
					return { node: nodeAtPos, sourceFile: actualSourceFile, symbol: nodeAtPos.getSymbol() };
				}
				lineColFailed = true;
			} catch (err: unknown) {
				warn(`[findSymbolNode] Line/col error for '${symbolName}':`, err);
				lineColFailed = true;
			}
		}

		try {
			const found = findNamedDeclaration(sourceFile, symbolName);
			if (found) {
				const actualSourceFile = found.getSourceFile();
				const foundLine = found.getStartLineNumber();

				// Check if line hint was provided but doesn't match found location
				const lineHintMismatch = params.line !== undefined && foundLine !== params.line;

				return {
					lineHintIgnored: (lineColAttempted && lineColFailed) || lineHintMismatch,
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

// ── Import Resolution ─────────────────────────────────

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
		// getSymbolAtLocation on the full node may fail — fall back to the name identifier.
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
		// `import { original as alias }` → propertyName = "original", name = "alias"
		// `import { name }` → propertyName = undefined, name = "name"
		// `import { type Foo }` → propertyName = undefined, name = "Foo"
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

	// Symbol not found at top level — search inside `declare module` blocks
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

// ── Trace Definition ─────────────────────────────────

function traceDefinition(node: Node, sourceFile: SourceFile, rootDir: string): SymbolLocationInfo | undefined {
	try {
		const filePath = sourceFile.getFilePath();
		const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');
		const startLine = node.getStartLineNumber();
		const startCol = node.getStart() - node.getStartLinePos();

		const kind = getNodeKindName(node);

		let signature = node.getText();
		if (signature.length > 200) {
			const firstBrace = signature.indexOf('{');
			if (firstBrace > 0) {
				signature = `${signature.substring(0, firstBrace).trim()} { ... }`;
			} else {
				signature = `${signature.substring(0, 200)}…`;
			}
		}

		return {
			column: startCol,
			file: relativePath,
			kind,
			line: startLine,
			signature
		};
	} catch (err: unknown) {
		warn('[traceSymbol:traceDefinition]', err);
		return undefined;
	}
}

// ── Trace References ─────────────────────────────────

function traceReferences(node: Node, symbol: TsSymbol | undefined, project: Project, rootDir: string, isIgnored: FileFilter, maxReferences = 500): { references: ReferenceInfo[]; truncated: boolean } {
	try {
		const languageService = project.getLanguageService();
		const referenceNodes = languageService.findReferencesAsNodes(node);

		const results: ReferenceInfo[] = [];
		const seen = new Set<string>();
		let truncated = false;

		const defLine = node.getStartLineNumber();
		const defFile = node.getSourceFile().getFilePath();

		for (const refNode of referenceNodes) {
			// Check if we've reached the limit
			if (results.length >= maxReferences) {
				truncated = true;
				break;
			}

			const refSourceFile = refNode.getSourceFile();
			if (!refSourceFile) continue;

			const refFilePath = refSourceFile.getFilePath();
			if (isIgnored(refFilePath)) continue;

			const line = refNode.getStartLineNumber();
			const column = refNode.getStart() - refNode.getStartLinePos();

			if (line === defLine && refFilePath === defFile) continue;

			const relativePath = path.relative(rootDir, refFilePath).replaceAll('\\', '/');

			const key = `${relativePath}:${line}:${column}`;
			if (seen.has(key)) continue;
			seen.add(key);

			const lineText = refSourceFile.getFullText().split('\n')[line - 1]?.trim() ?? '';
			const context = lineText.length > 200 ? `${lineText.substring(0, 200)}…` : lineText;

			const kind = classifyReferenceKind(refNode);

			results.push({
				column,
				context,
				file: relativePath,
				kind,
				line
			});
		}

		return { references: results, truncated };
	} catch (err: unknown) {
		warn('[traceSymbol:traceReferences]', err);
		return { references: [], truncated: false };
	}
}

function classifyReferenceKind(node: Node): ReferenceInfo['kind'] {
	const parent = node.getParent();
	if (!parent) return 'unknown';

	const parentKind = parent.getKind();

	if (
		parentKind === SyntaxKind.FunctionDeclaration ||
		parentKind === SyntaxKind.ClassDeclaration ||
		parentKind === SyntaxKind.InterfaceDeclaration ||
		parentKind === SyntaxKind.TypeAliasDeclaration ||
		parentKind === SyntaxKind.EnumDeclaration ||
		parentKind === SyntaxKind.MethodDeclaration
	) {
		return 'read';
	}

	if (parentKind === SyntaxKind.ImportSpecifier || parentKind === SyntaxKind.ImportClause || parentKind === SyntaxKind.NamespaceImport || parentKind === SyntaxKind.ImportDeclaration) {
		return 'import';
	}

	if (parentKind === SyntaxKind.ExportSpecifier || parentKind === SyntaxKind.ExportAssignment) {
		return 'read';
	}

	const grandparent = parent.getParent();
	const grandparentKind = grandparent?.getKind();

	if (Node.isCallExpression(parent)) {
		const expr = parent.getExpression();
		if (expr === node || (expr.getKind() === SyntaxKind.PropertyAccessExpression && expr.getLastChild() === node)) {
			return 'call';
		}
	}

	if (parentKind === SyntaxKind.NewExpression) {
		return 'call';
	}

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

	if (parentKind === SyntaxKind.VariableDeclaration) {
		return 'write';
	}

	if (parentKind === SyntaxKind.PropertyAssignment && parent.getChildAtIndex(0) === node) {
		return 'write';
	}

	return 'read';
}

// ── Trace Re-exports ─────────────────────────────────

function traceReExports(symbolName: string, definitionSourceFile: SourceFile, project: Project, rootDir: string, isIgnored: FileFilter): ReExportInfo[] {
	try {
		const reExports: ReExportInfo[] = [];
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
							from: moduleSpec,
							line: exportDecl.getStartLineNumber(),
							originalName
						});
					}
				}
			}

			const exportedDecls = sourceFile.getExportedDeclarations();
			const exportedSymbol = exportedDecls.get(symbolName);
			if (exportedSymbol && exportedSymbol.length > 0) {
				for (const decl of exportedSymbol) {
					const declFile = decl.getSourceFile()?.getFilePath();
					if (declFile && declFile !== filePath && declFile === definitionPath) {
						const key = `${relativePath}:${symbolName}:${symbolName}`;
						if (seen.has(key)) continue;
						seen.add(key);

						reExports.push({
							exportedAs: symbolName,
							file: relativePath,
							from: path.relative(path.dirname(filePath), definitionPath).replaceAll('\\', '/'),
							line: decl.getStartLineNumber?.() ?? 1,
							originalName: symbolName
						});
					}
				}
			}
		}

		return reExports;
	} catch (err: unknown) {
		warn('[traceSymbol:traceReExports]', err);
		return [];
	}
}

// ── Trace Call Hierarchy ─────────────────────────────

interface CallChainWithDepth {
	actualDepth: number;
	calls: CallChainNode[];
	truncated: boolean;
}

function traceCallHierarchy(node: Node, symbol: TsSymbol | undefined, project: Project, depth: number, rootDir: string, isIgnored: FileFilter): CallChainInfo & { actualIncomingDepth?: number; actualOutgoingDepth?: number } {
	const result: CallChainInfo & { actualIncomingDepth?: number; actualOutgoingDepth?: number } = {
		incomingCalls: [],
		outgoingCalls: []
	};

	try {
		if (isCallableNode(node)) {
			const outgoingResult = getOutgoingCallsWithDepth(node, project, rootDir, isIgnored, depth, new Set());
			result.outgoingCalls = outgoingResult.calls;
			result.outgoingTruncated = outgoingResult.truncated;
			result.actualOutgoingDepth = outgoingResult.actualDepth;
		}

		if (symbol) {
			const incomingResult = getIncomingCallsWithDepth(node, project, rootDir, isIgnored, depth, new Set());
			result.incomingCalls = incomingResult.calls;
			result.incomingTruncated = incomingResult.truncated;
			result.actualIncomingDepth = incomingResult.actualDepth;
		}
	} catch (err: unknown) {
		warn('[traceSymbol:traceCallHierarchy]', err);
	}

	return result;
}

function isCallableNode(node: Node): boolean {
	return CALLABLE_KINDS.has(node.getKind());
}

/**
 * Quick check: does the call chain have callable targets that could go deeper
 * but were stopped by the depth limit?
 */
function hasDeepCallsAtDepthLimit(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, depth: number): boolean {
	if (depth <= 0) return true;

	// Check if any top-level outgoing calls have their own outgoing calls
	const callExprs = node.getDescendantsOfKind(SyntaxKind.CallExpression);
	for (const callExpr of callExprs) {
		try {
			const expr = callExpr.getExpression();
			let targetNode: Node | undefined;

			if (expr.getKind() === SyntaxKind.Identifier) {
				const symbol = expr.getSymbol();
				if (symbol) {
					const decls = symbol.getDeclarations();
					if (decls.length > 0) targetNode = decls[0];
				}
			}

			if (targetNode && isCallableNode(targetNode)) {
				const targetFile = targetNode.getSourceFile();
				if (targetFile && !isIgnored(targetFile.getFilePath())) {
					// This callable target exists and could have more calls beyond our depth
					return true;
				}
			}
		} catch {
			// Skip errors in truncation detection
		}
	}

	return false;
}

function getOutgoingCalls(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, remainingDepth: number, visited: Set<string>): CallChainNode[] {
	if (remainingDepth <= 0) return [];

	const results: CallChainNode[] = [];

	const callExprs = node.getDescendantsOfKind(SyntaxKind.CallExpression);

	for (const callExpr of callExprs) {
		try {
			const expr = callExpr.getExpression();
			let calledName = '';
			let targetNode: Node | undefined;

			if (expr.getKind() === SyntaxKind.Identifier) {
				calledName = expr.getText();
				const symbol = expr.getSymbol();
				if (symbol) {
					const decls = symbol.getDeclarations();
					if (decls.length > 0) {
						targetNode = decls[0];
					}
				}
			} else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
				calledName = expr.getText();
				const lastChild = expr.getLastChild();
				if (lastChild) {
					const symbol = lastChild.getSymbol();
					if (symbol) {
						const decls = symbol.getDeclarations();
						if (decls.length > 0) {
							targetNode = decls[0];
						}
					}
				}
			} else {
				calledName = expr.getText();
			}

			if (!calledName) continue;

			let filePath = '';
			let line = 0;
			let column = 0;

			if (targetNode) {
				const targetFile = targetNode.getSourceFile();
				if (targetFile) {
					const targetFilePath = targetFile.getFilePath();
					if (isIgnored(targetFilePath)) {
						continue;
					}
					filePath = path.relative(rootDir, targetFilePath).replaceAll('\\', '/');
					line = targetNode.getStartLineNumber();
					column = targetNode.getStart() - targetNode.getStartLinePos();
				}
			}

			if (!filePath) {
				const callFile = callExpr.getSourceFile();
				const callFilePath = callFile.getFilePath();
				if (isIgnored(callFilePath)) {
					continue;
				}
				filePath = path.relative(rootDir, callFilePath).replaceAll('\\', '/');
				line = callExpr.getStartLineNumber();
				column = callExpr.getStart() - callExpr.getStartLinePos();
			}

			const key = `${filePath}:${line}:${calledName}`;
			if (visited.has(key)) continue;
			visited.add(key);

			results.push({
				column,
				file: filePath,
				line,
				symbol: calledName
			});

			if (remainingDepth > 1 && targetNode && isCallableNode(targetNode)) {
				const deeper = getOutgoingCalls(targetNode, project, rootDir, isIgnored, remainingDepth - 1, visited);
				results.push(...deeper);
			}
		} catch (err: unknown) {
			console.debug('[traceSymbol:getOutgoingCalls] Skipping call expression:', err);
		}
	}

	return results;
}

function getIncomingCalls(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, remainingDepth: number, visited: Set<string>): CallChainNode[] {
	if (remainingDepth <= 0) return [];

	const results: CallChainNode[] = [];

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
			let line: number;
			let column: number;

			if (containingFunc) {
				if (Node.isFunctionDeclaration(containingFunc) || Node.isMethodDeclaration(containingFunc)) {
					funcName = containingFunc.getName() ?? '<anonymous>';
				} else {
					funcName = '<anonymous>';
				}
				line = containingFunc.getStartLineNumber();
				column = containingFunc.getStart() - containingFunc.getStartLinePos();
			} else {
				funcName = '<module>';
				line = refNode.getStartLineNumber();
				column = refNode.getStart() - refNode.getStartLinePos();
			}

			const relativePath = path.relative(rootDir, refFilePath).replaceAll('\\', '/');

			const key = `${relativePath}:${line}:${funcName}`;
			if (visited.has(key)) continue;
			visited.add(key);

			results.push({
				column,
				file: relativePath,
				line,
				symbol: funcName
			});

			if (remainingDepth > 1 && containingFunc) {
				const deeper = getIncomingCalls(containingFunc, project, rootDir, isIgnored, remainingDepth - 1, visited);
				results.push(...deeper);
			}
		}
	} catch (err: unknown) {
		console.debug('[traceSymbol:getIncomingCalls] Failed:', err);
	}

	return results;
}

/**
 * Get outgoing calls with depth tracking and accurate truncation detection.
 * Returns actual depth reached and whether more calls exist at the limit.
 */
function getOutgoingCallsWithDepth(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, maxDepth: number, visited: Set<string>): CallChainWithDepth {
	let actualDepth = 0;
	let truncated = false;

	function recurse(currentNode: Node, remainingDepth: number, currentDepth: number): CallChainNode[] {
		if (remainingDepth <= 0) return [];

		const results: CallChainNode[] = [];
		const callExprs = currentNode.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const callExpr of callExprs) {
			try {
				const expr = callExpr.getExpression();
				let calledName = '';
				let targetNode: Node | undefined;

				if (expr.getKind() === SyntaxKind.Identifier) {
					calledName = expr.getText();
					const symbol = expr.getSymbol();
					if (symbol) {
						const decls = symbol.getDeclarations();
						if (decls.length > 0) targetNode = decls[0];
					}
				} else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
					calledName = expr.getText();
					const lastChild = expr.getLastChild();
					if (lastChild) {
						const symbol = lastChild.getSymbol();
						if (symbol) {
							const decls = symbol.getDeclarations();
							if (decls.length > 0) targetNode = decls[0];
						}
					}
				} else {
					calledName = expr.getText();
				}

				if (!calledName) continue;

				let filePath = '';
				let line = 0;
				let column = 0;

				if (targetNode) {
					const targetFile = targetNode.getSourceFile();
					if (targetFile) {
						const targetFilePath = targetFile.getFilePath();
						if (isIgnored(targetFilePath)) continue;
						filePath = path.relative(rootDir, targetFilePath).replaceAll('\\', '/');
						line = targetNode.getStartLineNumber();
						column = targetNode.getStart() - targetNode.getStartLinePos();
					}
				}

				if (!filePath) {
					const callFile = callExpr.getSourceFile();
					const callFilePath = callFile.getFilePath();
					if (isIgnored(callFilePath)) continue;
					filePath = path.relative(rootDir, callFilePath).replaceAll('\\', '/');
					line = callExpr.getStartLineNumber();
					column = callExpr.getStart() - callExpr.getStartLinePos();
				}

				const key = `${filePath}:${line}:${calledName}`;
				if (visited.has(key)) continue;
				visited.add(key);

				results.push({ column, file: filePath, line, symbol: calledName });
				actualDepth = Math.max(actualDepth, currentDepth);

				if (remainingDepth > 1 && targetNode && isCallableNode(targetNode)) {
					const deeper = recurse(targetNode, remainingDepth - 1, currentDepth + 1);
					results.push(...deeper);
				} else if (remainingDepth === 1 && targetNode && isCallableNode(targetNode)) {
					// Check if there are more calls at this level (truncation detection)
					const targetCallExprs = targetNode.getDescendantsOfKind(SyntaxKind.CallExpression);
					if (targetCallExprs.length > 0) {
						truncated = true;
					}
				}
			} catch {
				// Skip errors
			}
		}

		return results;
	}

	const calls = recurse(node, maxDepth, 1);
	return { actualDepth, calls, truncated };
}

/**
 * Get incoming calls with depth tracking and accurate truncation detection.
 * Returns actual depth reached and whether more calls exist at the limit.
 */
function getIncomingCallsWithDepth(node: Node, project: Project, rootDir: string, isIgnored: FileFilter, maxDepth: number, visited: Set<string>): CallChainWithDepth {
	let actualDepth = 0;
	let truncated = false;

	function recurse(currentNode: Node, remainingDepth: number, currentDepth: number): CallChainNode[] {
		if (remainingDepth <= 0) return [];

		const results: CallChainNode[] = [];

		try {
			const languageService = project.getLanguageService();
			const refs = languageService.findReferencesAsNodes(currentNode);

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
				let line: number;
				let column: number;

				if (containingFunc) {
					if (Node.isFunctionDeclaration(containingFunc) || Node.isMethodDeclaration(containingFunc)) {
						funcName = containingFunc.getName() ?? '<anonymous>';
					} else {
						funcName = '<anonymous>';
					}
					line = containingFunc.getStartLineNumber();
					column = containingFunc.getStart() - containingFunc.getStartLinePos();
				} else {
					funcName = '<module>';
					line = refNode.getStartLineNumber();
					column = refNode.getStart() - refNode.getStartLinePos();
				}

				const relativePath = path.relative(rootDir, refFilePath).replaceAll('\\', '/');
				const key = `${relativePath}:${line}:${funcName}`;
				if (visited.has(key)) continue;
				visited.add(key);

				results.push({ column, file: relativePath, line, symbol: funcName });
				actualDepth = Math.max(actualDepth, currentDepth);

				if (remainingDepth > 1 && containingFunc) {
					const deeper = recurse(containingFunc, remainingDepth - 1, currentDepth + 1);
					results.push(...deeper);
				} else if (remainingDepth === 1 && containingFunc) {
					// Check if this function has callers (truncation detection)
					const callerRefs = languageService.findReferencesAsNodes(containingFunc);
					const hasCallers = callerRefs.some((r) => {
						const p = r.getParent();
						return p && (p.getKind() === SyntaxKind.CallExpression || p.getKind() === SyntaxKind.NewExpression);
					});
					if (hasCallers) {
						truncated = true;
					}
				}
			}
		} catch (err: unknown) {
			console.debug('[traceSymbol:getIncomingCallsWithDepth] Failed:', err);
		}

		return results;
	}

	const calls = recurse(node, maxDepth, 1);
	return { actualDepth, calls, truncated };
}

// ── Trace Type Flows ─────────────────────────────────

function traceTypeFlows(node: Node, project: Project, isIgnored: FileFilter): TypeFlowInfo[] {
	try {
		const flows: TypeFlowInfo[] = [];

		if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
			for (const param of node.getParameters()) {
				const typeNode = param.getTypeNode();
				if (typeNode) {
					flows.push({
						direction: 'parameter',
						traceTo: resolveTypeTrace(typeNode, project, isIgnored),
						type: typeNode.getText()
					});
				} else {
					const paramType = param.getType();
					flows.push({
						direction: 'parameter',
						traceTo: resolveInferredType(paramType, isIgnored),
						type: paramType.getText()
					});
				}
			}

			const returnTypeNode = node.getReturnTypeNode();
			if (returnTypeNode) {
				flows.push({
					direction: 'return',
					traceTo: resolveTypeTrace(returnTypeNode, project, isIgnored),
					type: returnTypeNode.getText()
				});
			} else {
				const returnType = node.getReturnType();
				flows.push({
					direction: 'return',
					traceTo: resolveInferredType(returnType, isIgnored),
					type: returnType.getText()
				});
			}
		}

		if (Node.isClassDeclaration(node)) {
			const extendsExpr = node.getExtends();
			if (extendsExpr) {
				flows.push({
					direction: 'extends',
					traceTo: resolveHeritageTrace(extendsExpr, isIgnored),
					type: extendsExpr.getText()
				});
			}

			for (const impl of node.getImplements()) {
				flows.push({
					direction: 'implements',
					traceTo: resolveHeritageTrace(impl, isIgnored),
					type: impl.getText()
				});
			}

			// Class member type flows: properties and methods
			for (const prop of node.getProperties()) {
				const typeNode = prop.getTypeNode();
				if (typeNode) {
					flows.push({
						direction: 'property',
						traceTo: resolveTypeTrace(typeNode, project, isIgnored),
						type: `${prop.getName()}: ${typeNode.getText()}`
					});
				}
			}

			for (const ctor of node.getConstructors()) {
				for (const param of ctor.getParameters()) {
					const typeNode = param.getTypeNode();
					if (typeNode) {
						flows.push({
							direction: 'parameter',
							traceTo: resolveTypeTrace(typeNode, project, isIgnored),
							type: `constructor(${param.getName()}: ${typeNode.getText()})`
						});
					}
				}
			}

			for (const method of node.getMethods()) {
				const returnTypeNode = method.getReturnTypeNode();
				if (returnTypeNode) {
					flows.push({
						direction: 'return',
						traceTo: resolveTypeTrace(returnTypeNode, project, isIgnored),
						type: `${method.getName()}(): ${returnTypeNode.getText()}`
					});
				}
				for (const param of method.getParameters()) {
					const typeNode = param.getTypeNode();
					if (typeNode) {
						flows.push({
							direction: 'parameter',
							traceTo: resolveTypeTrace(typeNode, project, isIgnored),
							type: `${method.getName()}(${param.getName()}: ${typeNode.getText()})`
						});
					}
				}
			}
		}

		if (Node.isInterfaceDeclaration(node)) {
			for (const ext of node.getExtends()) {
				flows.push({
					direction: 'extends',
					traceTo: resolveHeritageTrace(ext, isIgnored),
					type: ext.getText()
				});
			}

			// Interface property type flows
			for (const prop of node.getProperties()) {
				const typeNode = prop.getTypeNode();
				if (typeNode) {
					flows.push({
						direction: 'property',
						traceTo: resolveTypeTrace(typeNode, project, isIgnored),
						type: `${prop.getName()}: ${typeNode.getText()}`
					});
				}
			}

			for (const method of node.getMethods()) {
				const returnTypeNode = method.getReturnTypeNode();
				if (returnTypeNode) {
					flows.push({
						direction: 'return',
						traceTo: resolveTypeTrace(returnTypeNode, project, isIgnored),
						type: `${method.getName()}(): ${returnTypeNode.getText()}`
					});
				}
			}
		}

		if (Node.isTypeAliasDeclaration(node)) {
			const typeNode = node.getTypeNode();
			if (typeNode) {
				flows.push({
					direction: 'property',
					traceTo: resolveTypeTrace(typeNode, project, isIgnored),
					type: typeNode.getText()
				});

				// Resolve constituent types in unions and intersections
				if (Node.isUnionTypeNode(typeNode) || Node.isIntersectionTypeNode(typeNode)) {
					for (const member of typeNode.getTypeNodes()) {
						const memberTraceTo = resolveTypeTrace(member, project, isIgnored);
						if (memberTraceTo) {
							flows.push({
								direction: 'property',
								traceTo: memberTraceTo,
								type: member.getText()
							});
						}
					}
				}
			}
		}

		if (Node.isVariableDeclaration(node)) {
			const typeNode = node.getTypeNode();
			if (typeNode) {
				flows.push({
					direction: 'property',
					traceTo: resolveTypeTrace(typeNode, project, isIgnored),
					type: typeNode.getText()
				});
			} else {
				const varType = node.getType();
				flows.push({
					direction: 'property',
					traceTo: resolveInferredType(varType, isIgnored),
					type: varType.getText()
				});
			}
		}

		return flows;
	} catch (err: unknown) {
		warn('[traceSymbol:traceTypeFlows]', err);
		return [];
	}
}

function resolveTypeTrace(typeNode: Node, project: Project, isIgnored: FileFilter): TypeFlowInfo['traceTo'] | undefined {
	try {
		const symbol = typeNode.getSymbol();
		if (!symbol) {
			const identifier = typeNode.getFirstDescendantByKind(SyntaxKind.Identifier);
			if (identifier) {
				const idSymbol = identifier.getSymbol();
				if (idSymbol) {
					return getSymbolLocation(idSymbol, isIgnored);
				}
			}
			return undefined;
		}

		return getSymbolLocation(symbol, isIgnored);
	} catch {
		return undefined;
	}
}

function resolveInferredType(type: ReturnType<Node['getType']>, isIgnored: FileFilter): TypeFlowInfo['traceTo'] | undefined {
	try {
		const symbol = type.getSymbol();
		if (!symbol) return undefined;
		return getSymbolLocation(symbol, isIgnored);
	} catch {
		return undefined;
	}
}

function resolveHeritageTrace(heritageExpr: Node, isIgnored: FileFilter): TypeFlowInfo['traceTo'] | undefined {
	try {
		const expr = heritageExpr.getFirstDescendantByKind(SyntaxKind.Identifier);
		if (!expr) return undefined;

		const symbol = expr.getSymbol();
		if (!symbol) return undefined;

		return getSymbolLocation(symbol, isIgnored);
	} catch {
		return undefined;
	}
}

function getSymbolLocation(symbol: TsSymbol, isIgnored: FileFilter): TypeFlowInfo['traceTo'] | undefined {
	try {
		const decls = symbol.getDeclarations();
		if (decls.length === 0) return undefined;

		const decl = decls[0];
		const sourceFile = decl.getSourceFile();
		if (!sourceFile) return undefined;

		const filePath = sourceFile.getFilePath();
		if (isIgnored(filePath)) {
			return undefined;
		}

		const line = decl.getStartLineNumber();
		if (!filePath || line <= 0) {
			return undefined;
		}

		return {
			file: filePath,
			line,
			symbol: symbol.getName()
		};
	} catch {
		return undefined;
	}
}

// ── Type Hierarchy ───────────────────────────────────

function traceTypeHierarchy(node: Node, project: Project, maxDepth: number, rootDir: string, isIgnored: FileFilter): TypeHierarchyInfo {
	const supertypes: TypeHierarchyNode[] = [];
	const subtypes: TypeHierarchyNode[] = [];
	let actualMaxDepth = 0;

	try {
		if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
			const visited = new Set<string>();
			collectSupertypes(node, project, 1, maxDepth, rootDir, isIgnored, supertypes, visited);
			collectSubtypes(node, project, 1, maxDepth, rootDir, isIgnored, subtypes, visited);

			if (supertypes.length > 0 || subtypes.length > 0) {
				actualMaxDepth = Math.max(supertypes.length > 0 ? 1 : 0, subtypes.length > 0 ? 1 : 0);
			}
		}
	} catch (err) {
		warn('[traceTypeHierarchy] Error:', err);
	}

	return {
		stats: {
			maxDepth: actualMaxDepth,
			totalSubtypes: subtypes.length,
			totalSupertypes: supertypes.length
		},
		subtypes,
		supertypes
	};
}

function nodeToHierarchyKind(node: Node): 'class' | 'interface' | 'type-alias' {
	if (Node.isClassDeclaration(node)) return 'class';
	if (Node.isInterfaceDeclaration(node)) return 'interface';
	return 'type-alias';
}

function toHierarchyNode(node: Node, rootDir: string): TypeHierarchyNode | undefined {
	const sourceFile = node.getSourceFile();
	const filePath = sourceFile.getFilePath();
	const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');

	let name = '';
	if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node) || Node.isTypeAliasDeclaration(node)) {
		name = node.getName() ?? '<anonymous>';
	}

	return {
		column: node.getStart() - node.getStartLineNumber(),
		file: relativePath,
		kind: nodeToHierarchyKind(node),
		line: node.getStartLineNumber(),
		name
	};
}

function collectSupertypes(node: Node, project: Project, currentDepth: number, maxDepth: number, rootDir: string, isIgnored: FileFilter, result: TypeHierarchyNode[], visited: Set<string>): void {
	if (currentDepth > maxDepth) return;

	const nodeKey = `${node.getSourceFile().getFilePath()}:${node.getStartLineNumber()}`;
	if (visited.has(nodeKey)) return;
	visited.add(nodeKey);

	const parentTypes: Node[] = [];

	if (Node.isClassDeclaration(node)) {
		const extendsExpr = node.getExtends();
		if (extendsExpr) {
			const resolved = resolveExpressionToDeclaration(extendsExpr.getExpression(), project);
			if (resolved) parentTypes.push(resolved);
		}
		for (const impl of node.getImplements()) {
			const resolved = resolveExpressionToDeclaration(impl.getExpression(), project);
			if (resolved) parentTypes.push(resolved);
		}
	} else if (Node.isInterfaceDeclaration(node)) {
		for (const ext of node.getExtends()) {
			const resolved = resolveExpressionToDeclaration(ext.getExpression(), project);
			if (resolved) parentTypes.push(resolved);
		}
	}

	for (const parentNode of parentTypes) {
		const parentFile = parentNode.getSourceFile().getFilePath();
		if (isIgnored(parentFile)) continue;

		const hierarchyNode = toHierarchyNode(parentNode, rootDir);
		if (hierarchyNode) {
			result.push(hierarchyNode);
			collectSupertypes(parentNode, project, currentDepth + 1, maxDepth, rootDir, isIgnored, result, visited);
		}
	}
}

function collectSubtypes(node: Node, project: Project, currentDepth: number, maxDepth: number, rootDir: string, isIgnored: FileFilter, result: TypeHierarchyNode[], visited: Set<string>): void {
	if (currentDepth > maxDepth) return;

	const targetName = Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node) ? node.getName() : undefined;
	if (!targetName) return;

	const targetFile = node.getSourceFile().getFilePath();
	const targetLine = node.getStartLineNumber();
	const targetKey = `${targetFile}:${targetLine}`;

	for (const sourceFile of project.getSourceFiles()) {
		const filePath = sourceFile.getFilePath();
		if (isIgnored(filePath)) continue;

		// Check classes that extend or implement the target
		for (const classDecl of sourceFile.getClasses()) {
			const classKey = `${filePath}:${classDecl.getStartLineNumber()}`;
			if (visited.has(classKey)) continue;

			let isSubtype = false;

			const extendsExpr = classDecl.getExtends();
			if (extendsExpr) {
				const resolved = resolveExpressionToDeclaration(extendsExpr.getExpression(), project);
				if (resolved && isSameDeclaration(resolved, node)) {
					isSubtype = true;
				}
			}

			if (!isSubtype) {
				for (const impl of classDecl.getImplements()) {
					const resolved = resolveExpressionToDeclaration(impl.getExpression(), project);
					if (resolved && isSameDeclaration(resolved, node)) {
						isSubtype = true;
						break;
					}
				}
			}

			if (isSubtype) {
				visited.add(classKey);
				const hierarchyNode = toHierarchyNode(classDecl, rootDir);
				if (hierarchyNode) {
					result.push(hierarchyNode);
					collectSubtypes(classDecl, project, currentDepth + 1, maxDepth, rootDir, isIgnored, result, visited);
				}
			}
		}

		// Check interfaces that extend the target (only if target is an interface)
		if (Node.isInterfaceDeclaration(node)) {
			for (const ifaceDecl of sourceFile.getInterfaces()) {
				const ifaceKey = `${filePath}:${ifaceDecl.getStartLineNumber()}`;
				if (visited.has(ifaceKey)) continue;

				for (const ext of ifaceDecl.getExtends()) {
					const resolved = resolveExpressionToDeclaration(ext.getExpression(), project);
					if (resolved && isSameDeclaration(resolved, node)) {
						visited.add(ifaceKey);
						const hierarchyNode = toHierarchyNode(ifaceDecl, rootDir);
						if (hierarchyNode) {
							result.push(hierarchyNode);
							collectSubtypes(ifaceDecl, project, currentDepth + 1, maxDepth, rootDir, isIgnored, result, visited);
						}
						break;
					}
				}
			}
		}
	}
}

function resolveExpressionToDeclaration(expr: Node, _project: Project): Node | undefined {
	try {
		const symbol = expr.getSymbol();
		if (!symbol) return undefined;

		const declarations = symbol.getDeclarations();
		if (declarations.length === 0) return undefined;

		// Follow aliased symbols (imports, re-exports)
		const aliased = symbol.getAliasedSymbol();
		if (aliased) {
			const aliasedDeclarations = aliased.getDeclarations();
			if (aliasedDeclarations.length > 0) {
				return aliasedDeclarations[0];
			}
		}

		return declarations[0];
	} catch {
		return undefined;
	}
}

function isSameDeclaration(a: Node, b: Node): boolean {
	return a.getSourceFile().getFilePath() === b.getSourceFile().getFilePath() && a.getStartLineNumber() === b.getStartLineNumber() && a.getStart() === b.getStart();
}

// ── Impact Analysis ──────────────────────────────────

function computeImpact(node: Node, project: Project, depth: number, rootDir: string, isIgnored: FileFilter): ImpactInfo {
	const directDependents: ImpactDependentInfo[] = [];
	const transitiveDependents: ImpactDependentInfo[] = [];
	const visited = new Set<string>();

	try {
		const languageService = project.getLanguageService();
		const refs = languageService.findReferencesAsNodes(node);

		for (const refNode of refs) {
			const refSourceFile = refNode.getSourceFile();
			if (!refSourceFile) continue;

			const refFilePath = refSourceFile.getFilePath();
			if (isIgnored(refFilePath)) continue;

			const line = refNode.getStartLineNumber();
			const relativePath = path.relative(rootDir, refFilePath).replaceAll('\\', '/');

			const key = `${relativePath}:${line}`;
			if (visited.has(key)) continue;
			visited.add(key);

			let containingNode: Node | undefined = refNode;
			while (containingNode && !isDeclarationNode(containingNode)) {
				containingNode = containingNode.getParent();
			}

			let symbolName = 'unknown';
			let symbolKind = 'unknown';

			if (containingNode) {
				if (
					Node.isFunctionDeclaration(containingNode) ||
					Node.isMethodDeclaration(containingNode) ||
					Node.isClassDeclaration(containingNode) ||
					Node.isInterfaceDeclaration(containingNode) ||
					Node.isVariableDeclaration(containingNode) ||
					Node.isEnumDeclaration(containingNode) ||
					Node.isTypeAliasDeclaration(containingNode)
				) {
					symbolName = containingNode.getName() ?? 'unknown';
				} else if (Node.isPropertyDeclaration(containingNode) || Node.isPropertySignature(containingNode)) {
					symbolName = containingNode.getName();
				} else if (Node.isImportSpecifier(containingNode)) {
					symbolName = containingNode.getName();
					symbolKind = 'import';
				} else if (Node.isImportClause(containingNode)) {
					const defaultImport = containingNode.getDefaultImport();
					symbolName = defaultImport?.getText() ?? 'default';
					symbolKind = 'import';
				}
				if (symbolKind === 'unknown') {
					symbolKind = getNodeKindName(containingNode);
				}
			}

			directDependents.push({
				file: relativePath,
				kind: symbolKind,
				line,
				symbol: symbolName
			});
		}

		if (depth > 1 && directDependents.length < 50) {
			for (const dep of directDependents) {
				if (dep.kind !== 'function' && dep.kind !== 'method') continue;

				const depFile = project.getSourceFile(path.join(rootDir, dep.file));
				if (!depFile) continue;

				const depNode = findNamedDeclaration(depFile, dep.symbol);
				if (!depNode) continue;

				try {
					const depLangSvc = project.getLanguageService();
					const depRefs = depLangSvc.findReferencesAsNodes(depNode);
					for (const depRef of depRefs) {
						const depRefFile = depRef.getSourceFile();
						if (!depRefFile) continue;

						const depRefFilePath = depRefFile.getFilePath();
						if (isIgnored(depRefFilePath)) continue;

						const parent = depRef.getParent();
						if (!parent) continue;

						const isCall = parent.getKind() === SyntaxKind.CallExpression || parent.getKind() === SyntaxKind.NewExpression;
						if (!isCall) continue;

						const depLine = depRef.getStartLineNumber();
						const depRelPath = path.relative(rootDir, depRefFilePath).replaceAll('\\', '/');
						const tKey = `${depRelPath}:${depLine}`;

						if (!visited.has(tKey)) {
							visited.add(tKey);

							let containingFunc: Node | undefined = parent;
							while (containingFunc && !isCallableNode(containingFunc)) {
								containingFunc = containingFunc.getParent();
							}

							let funcName = 'unknown';
							if (containingFunc && (Node.isFunctionDeclaration(containingFunc) || Node.isMethodDeclaration(containingFunc))) {
								funcName = containingFunc.getName() ?? 'unknown';
							}

							transitiveDependents.push({
								file: depRelPath,
								kind: 'function',
								line: depLine,
								symbol: funcName
							});
						}
					}
				} catch (err: unknown) {
					console.debug('[traceSymbol:computeImpact] Skipping transitive dep:', err);
				}
			}
		}
	} catch (err: unknown) {
		warn('[traceSymbol:computeImpact]', err);
	}

	const directFileSet = new Set(directDependents.map((d) => d.file));
	const transitiveFileSet = new Set(transitiveDependents.map((d) => d.file));
	const totalAffected = directDependents.length + transitiveDependents.length;

	let riskLevel: ImpactInfo['impactSummary']['riskLevel'] = 'low';
	if (totalAffected > 20 || directFileSet.size > 5) riskLevel = 'high';
	else if (totalAffected > 5 || directFileSet.size > 2) riskLevel = 'medium';

	return {
		directDependents,
		impactSummary: {
			directFiles: directFileSet.size,
			riskLevel,
			totalSymbolsAffected: totalAffected,
			transitiveFiles: transitiveFileSet.size
		},
		transitiveDependents
	};
}

// ── Helpers ──────────────────────────────────────────

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

/**
 * Build a descriptive error message for when a symbol is not found.
 */
function buildSymbolNotFoundMessage(params: TraceSymbolParams, sourceFileCount: number): string {
	const parts: string[] = [];

	parts.push(`Symbol '${params.symbol}' not found in project (${sourceFileCount} files scanned).`);

	if (params.file) {
		parts.push(`Searched in file: ${params.file}`);
		if (params.line !== undefined) {
			parts.push(`at line ${params.line}${params.column !== undefined ? `:${params.column}` : ''}`);
		}
		parts.push('. Verify the file is included in tsconfig.json.');
	} else {
		parts.push('Try specifying a file path to narrow the search, or check if the symbol is exported.');
	}

	return parts.join(' ');
}

/**
 * Build a descriptive error message from an exception.
 */
function buildErrorMessage(err: unknown, params: TraceSymbolParams): string {
	const errorStr = err instanceof Error ? err.message : String(err);

	// Common error patterns with helpful messages
	if (errorStr.includes('Cannot find module') || errorStr.includes('ENOENT')) {
		return `File not found. Ensure the file exists and is accessible: ${params.file ?? params.rootDir}`;
	}

	if (errorStr.includes('tsconfig') || errorStr.includes('Cannot parse')) {
		return `TypeScript configuration error. Check tsconfig.json for syntax errors: ${errorStr}`;
	}

	if (errorStr.includes('out of memory') || errorStr.includes('heap')) {
		return `Memory limit exceeded. Try reducing maxReferences or narrowing the search with a file hint.`;
	}

	if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
		return `Operation timed out. The project may be too large. Try increasing timeout or using forceRefresh=false.`;
	}

	// Fallback with the original error
	return `Unexpected error while tracing '${params.symbol}': ${errorStr}`;
}

const NODE_MODULES_SEG = `${path.sep}node_modules${path.sep}`;
const D_TS_SUFFIX = '.d.ts';
const NODE_MODULES_DIAGNOSTIC_THRESHOLD = 5;

function buildTraceDiagnostics(result: TraceSymbolResult, params: TraceSymbolParams): string[] {
	const diagnostics: string[] = [];

	// Detect excessive node_modules / .d.ts references
	let nodeModulesCount = 0;
	let dtsCount = 0;

	for (const ref of result.references) {
		if (ref.file.includes(NODE_MODULES_SEG)) nodeModulesCount++;
		if (ref.file.endsWith(D_TS_SUFFIX)) dtsCount++;
	}
	for (const call of result.callChain.outgoingCalls) {
		if (call.file.includes(NODE_MODULES_SEG)) nodeModulesCount++;
		if (call.file.endsWith(D_TS_SUFFIX)) dtsCount++;
	}
	for (const call of result.callChain.incomingCalls) {
		if (call.file.includes(NODE_MODULES_SEG)) nodeModulesCount++;
		if (call.file.endsWith(D_TS_SUFFIX)) dtsCount++;
	}

	if (nodeModulesCount >= NODE_MODULES_DIAGNOSTIC_THRESHOLD) {
		diagnostics.push(`Found ${nodeModulesCount} references in node_modules. Consider adding "node_modules" to .devtoolsignore to exclude third-party code from analysis.`);
	}
	if (dtsCount >= NODE_MODULES_DIAGNOSTIC_THRESHOLD) {
		diagnostics.push(`Found ${dtsCount} references in .d.ts declaration files. Consider adding "**/*.d.ts" to .devtoolsignore to exclude type declarations from analysis.`);
	}

	// Warn if include patterns matched nothing useful
	if (params.includePatterns && params.includePatterns.length > 0 && result.references.length === 0 && !result.definition) {
		diagnostics.push(`Include patterns [${params.includePatterns.join(', ')}] may not match any files in project root "${result.resolvedRootDir ?? '(unknown)'}". Check that patterns are relative to the project root.`);
	}

	return diagnostics;
}

function computeMaxCallDepth(callChain: CallChainInfo & { actualIncomingDepth?: number; actualOutgoingDepth?: number }, requestedDepth: number): number {
	// Bug #3 fix: Use actual tracked depth instead of array length
	const actualIncoming = callChain.actualIncomingDepth ?? 0;
	const actualOutgoing = callChain.actualOutgoingDepth ?? 0;

	if (actualIncoming === 0 && actualOutgoing === 0) {
		// Fall back to array length heuristic if no depth tracked
		const hasIncoming = callChain.incomingCalls.length > 0;
		const hasOutgoing = callChain.outgoingCalls.length > 0;
		if (!hasIncoming && !hasOutgoing) return 0;
		return Math.min(Math.max(callChain.incomingCalls.length, callChain.outgoingCalls.length), requestedDepth);
	}

	return Math.max(actualIncoming, actualOutgoing);
}

/**
 * Estimate the character count for a call chain result.
 * Used for adaptive depth optimization to stay within token budget.
 */
function estimateCallChainChars(callChain: CallChainInfo): number {
	let chars = 0;

	// Each call entry: "  - symbol() from file:line"
	// Average formatting overhead: ~15 chars (" - ", "() from ", ":")
	const lineOverhead = 15;

	for (const call of callChain.incomingCalls) {
		chars += call.symbol.length + call.file.length + String(call.line).length + lineOverhead;
	}

	for (const call of callChain.outgoingCalls) {
		chars += call.symbol.length + call.file.length + String(call.line).length + lineOverhead;
	}

	// Add section headers overhead (~100 chars for "#### Incoming Calls" etc.)
	if (callChain.incomingCalls.length > 0) chars += 50;
	if (callChain.outgoingCalls.length > 0) chars += 50;

	return chars;
}

/**
 * Calculate dynamic timeout based on project size and analysis depth.
 * Large projects need more time for initial parsing and reference resolution.
 *
 * Formula: baseMs + (fileCount * msPerFile) + (depth * depthMultiplier * fileCount)
 *
 * Empirical observations:
 * - ~100 files: needs ~2-3s
 * - ~1,500 files: needs ~6-10s
 * - ~5,000 files: needs ~60-90s (VS Code repo)
 *
 * @param fileCount Number of source files in the project
 * @param maxReferences Max references limit (higher = more work)
 * @param depth Call hierarchy depth (higher = more traversal)
 */
function calculateDynamicTimeout(fileCount: number, maxReferences: number, depth: number): number {
	const baseMs = 5000; // Minimum 5 seconds for any project
	const msPerFile = 12; // ~12ms per file for initial load and basic ops
	const depthFactor = depth * 500; // Each depth level adds ~500ms overhead
	const refFactor = Math.min(maxReferences / 100, 10) * 500; // Reference limit factor (capped)

	const calculated = baseMs + fileCount * msPerFile + depthFactor + refFactor;

	// Cap at 5 minutes to avoid runaway timeouts
	return Math.min(calculated, 300000);
}

function emptyTraceResult(symbol: string): TraceSymbolResult {
	return {
		callChain: { incomingCalls: [], outgoingCalls: [] },
		reExports: [],
		references: [],
		summary: { maxCallDepth: 0, totalFiles: 0, totalReferences: 0 },
		symbol,
		typeFlows: []
	};
}

// ── Dead Code Detection ─────────────────────────────────

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
		const isIgnored = buildFileFilter(rootDir, params.includePatterns, params.excludePatterns);

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

			// ── Exported symbols with zero external references ──
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

			// ── Non-exported symbols (unreachable functions + dead variables) ──
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
