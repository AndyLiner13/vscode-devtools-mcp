/**
 * Phase 3, Item 11 — Alias tracking resolver.
 *
 * Builds an alias graph for a named symbol: discovers all import/export
 * aliases across the project, classifies each by kind, and reconstructs
 * multi-hop alias chains through barrel re-exports.
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type {
	SourceFile,
	ImportDeclaration,
	ImportSpecifier,
	ExportDeclaration,
	ExportSpecifier,
	ImportEqualsDeclaration,
} from 'ts-morph';
import { toRelativePosixPath } from './paths.js';

import type { SymbolRef, AliasGraph, AliasEntry, AliasKind, AliasChain, AliasHop } from './types.js';

export type { AliasGraph, AliasEntry, AliasKind, AliasChain, AliasHop } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the alias graph for a named symbol.
 *
 * Scans all source files in the project for import/export statements that
 * rename, re-export, or namespace-wrap the target symbol.
 *
 * @param project       - ts-morph Project with all relevant source files added.
 * @param filePath      - Absolute path of the file containing the canonical declaration.
 * @param symbolName    - Name of the symbol to track aliases for.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns AliasGraph with canonical ref, all aliases, and multi-hop chains.
 */
export function resolveAliases(
	project: Project,
	filePath: string,
	symbolName: string,
	workspaceRoot: string,
): AliasGraph {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const declaration = findNamedDeclaration(sourceFile, symbolName);

	if (!declaration) {
		throw new Error(`Symbol "${symbolName}" not found in ${filePath}`);
	}

	const canonical: SymbolRef = {
		name: symbolName,
		filePath: toRelative(filePath, workspaceRoot),
		line: declaration.getStartLineNumber(),
	};

	const aliases: AliasEntry[] = [];

	// Find all references to the declaration across the project
	const refNodes = declaration.findReferencesAsNodes();

	for (const refNode of refNodes) {
		const refFile = refNode.getSourceFile();
		const refFilePath = refFile.getFilePath();

		if (refFilePath.endsWith('.d.ts') || refFilePath.includes('node_modules')) continue;

		// Skip the definition itself
		if (
			refFilePath === sourceFile.getFilePath() &&
			refNode.getStartLineNumber() === declaration.getStartLineNumber()
		) {
			continue;
		}

		const entry = classifyReference(refNode, symbolName, refFilePath, workspaceRoot);
		if (entry) {
			aliases.push(entry);
		}
	}

	// Also scan for namespace imports and dynamic imports that wrap this symbol
	collectNamespaceAliases(project, sourceFile, symbolName, workspaceRoot, aliases);
	collectExportStarAliases(project, sourceFile, symbolName, workspaceRoot, aliases);

	// Deduplicate aliases by (name, filePath, line, kind)
	const deduped = deduplicateAliases(aliases);

	// Build multi-hop chains from rename aliases
	const chains = buildChains(deduped, canonical);

	return { canonical, aliases: deduped, chains };
}

// ---------------------------------------------------------------------------
// Reference classification
// ---------------------------------------------------------------------------

function classifyReference(
	refNode: Node,
	originalName: string,
	refFilePath: string,
	workspaceRoot: string,
): AliasEntry | undefined {
	const parent = refNode.getParent();
	if (!parent) return undefined;

	// import { Foo as Bar } from '...'
	if (Node.isImportSpecifier(parent)) {
		return classifyImportSpecifier(parent, originalName, refFilePath, workspaceRoot);
	}

	// export { Foo as Bar } from '...'  OR  export { Foo as Bar }
	if (Node.isExportSpecifier(parent)) {
		return classifyExportSpecifier(parent, originalName, refFilePath, workspaceRoot);
	}

	// import Foo = Namespace.Bar
	// The reference to 'Bar' is inside a QualifiedName, whose ancestor is ImportEqualsDeclaration
	const importEqualsAncestor = refNode.getFirstAncestorByKind(SyntaxKind.ImportEqualsDeclaration);
	if (importEqualsAncestor) {
		const aliasName = importEqualsAncestor.getName();
		if (aliasName !== originalName) {
			return {
				name: aliasName,
				filePath: toRelative(refFilePath, workspaceRoot),
				line: importEqualsAncestor.getStartLineNumber(),
				kind: 'namespace-alias',
				originalName,
			};
		}
	}

	return undefined;
}

function classifyImportSpecifier(
	specifier: ImportSpecifier,
	originalName: string,
	refFilePath: string,
	workspaceRoot: string,
): AliasEntry | undefined {
	const importedName = specifier.getName();
	const aliasNode = specifier.getAliasNode();

	if (!aliasNode) return undefined; // No rename — not an alias

	const aliasName = aliasNode.getText();
	if (aliasName === originalName) return undefined; // Same name — not a rename

	const importDecl = specifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
	const isTypeOnly = importDecl?.isTypeOnly() || specifier.isTypeOnly();

	// Check if this is a default-as-named pattern: import { default as Foo }
	const isDefaultAsNamed = importedName === 'default';

	const kind: AliasKind = isTypeOnly
		? 'type-only'
		: isDefaultAsNamed
			? 'default-as-named'
			: 'import-rename';

	return {
		name: aliasName,
		filePath: toRelative(refFilePath, workspaceRoot),
		line: specifier.getStartLineNumber(),
		kind,
		originalName: isDefaultAsNamed ? originalName : importedName,
	};
}

function classifyExportSpecifier(
	specifier: ExportSpecifier,
	originalName: string,
	refFilePath: string,
	workspaceRoot: string,
): AliasEntry | undefined {
	const localName = specifier.getName();
	const aliasNode = specifier.getAliasNode();

	// No rename — not an alias
	if (!aliasNode) return undefined;

	const aliasName = aliasNode.getText();
	if (aliasName === localName) return undefined;

	const exportDecl = specifier.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);
	const isTypeOnly = exportDecl?.isTypeOnly() || specifier.isTypeOnly();

	const isDefaultAsNamed = localName === 'default';

	const kind: AliasKind = isTypeOnly
		? 'type-only'
		: isDefaultAsNamed
			? 'default-as-named'
			: 'export-rename';

	return {
		name: aliasName,
		filePath: toRelative(refFilePath, workspaceRoot),
		line: specifier.getStartLineNumber(),
		kind,
		originalName: isDefaultAsNamed ? originalName : localName,
	};
}

// ---------------------------------------------------------------------------
// Namespace imports: import * as ns from './module'
// ---------------------------------------------------------------------------

function collectNamespaceAliases(
	project: Project,
	declarationFile: SourceFile,
	symbolName: string,
	workspaceRoot: string,
	aliases: AliasEntry[],
): void {
	const declFilePath = declarationFile.getFilePath();

	for (const sf of project.getSourceFiles()) {
		if (sf.getFilePath().endsWith('.d.ts') || sf.getFilePath().includes('node_modules')) continue;

		for (const importDecl of sf.getImportDeclarations()) {
			const nsImport = importDecl.getNamespaceImport();
			if (!nsImport) continue;

			const moduleSpecifier = importDecl.getModuleSpecifierSourceFile();
			if (!moduleSpecifier) continue;

			// Direct namespace import of the declaration file
			if (moduleSpecifier.getFilePath() === declFilePath) {
				aliases.push({
					name: nsImport.getText(),
					filePath: toRelative(sf.getFilePath(), workspaceRoot),
					line: importDecl.getStartLineNumber(),
					kind: 'namespace',
					originalName: symbolName,
				});
				continue;
			}

			// Check if the module re-exports the symbol (barrel)
			if (moduleExportsSymbol(moduleSpecifier, symbolName, declFilePath, project)) {
				aliases.push({
					name: nsImport.getText(),
					filePath: toRelative(sf.getFilePath(), workspaceRoot),
					line: importDecl.getStartLineNumber(),
					kind: 'namespace',
					originalName: symbolName,
				});
			}
		}
	}
}

// ---------------------------------------------------------------------------
// export * as ns from './module' — namespace re-exports
// ---------------------------------------------------------------------------

function collectExportStarAliases(
	project: Project,
	declarationFile: SourceFile,
	symbolName: string,
	workspaceRoot: string,
	aliases: AliasEntry[],
): void {
	const declFilePath = declarationFile.getFilePath();

	for (const sf of project.getSourceFiles()) {
		if (sf.getFilePath().endsWith('.d.ts') || sf.getFilePath().includes('node_modules')) continue;

		for (const exportDecl of sf.getExportDeclarations()) {
			const nsExport = exportDecl.getNamespaceExport();
			if (!nsExport) continue;

			const moduleSpecifier = exportDecl.getModuleSpecifierSourceFile();
			if (!moduleSpecifier) continue;

			if (
				moduleSpecifier.getFilePath() === declFilePath ||
				moduleExportsSymbol(moduleSpecifier, symbolName, declFilePath, project)
			) {
				aliases.push({
					name: nsExport.getName(),
					filePath: toRelative(sf.getFilePath(), workspaceRoot),
					line: exportDecl.getStartLineNumber(),
					kind: 'namespace',
					originalName: symbolName,
				});
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a source file exports a given symbol name, either directly
 * or through barrel re-exports (export * from ...).
 */
function moduleExportsSymbol(
	moduleFile: SourceFile,
	symbolName: string,
	originFile: string,
	project: Project,
	visited?: Set<string>,
): boolean {
	const filePath = moduleFile.getFilePath();
	const seen = visited ?? new Set<string>();
	if (seen.has(filePath)) return false;
	seen.add(filePath);

	// Check direct named exports
	for (const exportDecl of moduleFile.getExportDeclarations()) {
		// Named re-exports: export { Foo } from './types' / export { Foo as Bar }
		for (const specifier of exportDecl.getNamedExports()) {
			if (specifier.getName() === symbolName || specifier.getAliasNode()?.getText() === symbolName) {
				const modFile = exportDecl.getModuleSpecifierSourceFile();
				if (modFile && (modFile.getFilePath() === originFile || moduleExportsSymbol(modFile, symbolName, originFile, project, seen))) {
					return true;
				}
				// Local re-export (no module specifier)
				if (!exportDecl.getModuleSpecifierValue()) {
					return true;
				}
			}
		}

		// Wildcard re-exports: export * from './types'
		if (exportDecl.getNamedExports().length === 0 && !exportDecl.getNamespaceExport()) {
			const modSpecValue = exportDecl.getModuleSpecifierValue();
			if (modSpecValue) {
				const modFile = exportDecl.getModuleSpecifierSourceFile();
				if (modFile) {
					if (modFile.getFilePath() === originFile) {
						// Check whether the origin file actually exports this symbol
						if (originFileExportsSymbol(modFile, symbolName)) {
							return true;
						}
					} else if (moduleExportsSymbol(modFile, symbolName, originFile, project, seen)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}

/** Check if a file has a direct export of the given symbol name. */
function originFileExportsSymbol(file: SourceFile, name: string): boolean {
	// Exported declarations
	for (const [exportName] of file.getExportedDeclarations()) {
		if (exportName === name) return true;
	}
	return false;
}

/** Deduplicate aliases by (name, filePath, line, kind). */
function deduplicateAliases(aliases: AliasEntry[]): AliasEntry[] {
	const seen = new Set<string>();
	const result: AliasEntry[] = [];

	for (const alias of aliases) {
		const key = `${alias.name}:${alias.filePath}:${alias.line}:${alias.kind}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(alias);
		}
	}

	return result.sort((a, b) =>
		a.filePath.localeCompare(b.filePath) || a.line - b.line || a.name.localeCompare(b.name),
	);
}

// ---------------------------------------------------------------------------
// Multi-hop chain construction
// ---------------------------------------------------------------------------

/**
 * Build multi-hop alias chains from rename-type aliases.
 *
 * A chain is created when: A is exported as B (file1), and B is re-exported
 * as C (file2). The chain would be: A → B → C.
 *
 * We only build chains for rename aliases (import-rename, export-rename,
 * default-as-named, type-only). Namespace aliases don't form rename chains.
 */
function buildChains(aliases: AliasEntry[], canonical: SymbolRef): AliasChain[] {
	const renameAliases = aliases.filter(a =>
		a.kind === 'import-rename' ||
		a.kind === 'export-rename' ||
		a.kind === 'default-as-named' ||
		a.kind === 'type-only',
	);

	if (renameAliases.length === 0) return [];

	// Build adjacency: originalName → [aliases with that originalName]
	const adjacency = new Map<string, AliasEntry[]>();
	for (const alias of renameAliases) {
		const existing = adjacency.get(alias.originalName);
		if (existing) {
			existing.push(alias);
		} else {
			adjacency.set(alias.originalName, [alias]);
		}
	}

	const chains: AliasChain[] = [];
	const visited = new Set<string>();

	// For each alias that starts from the canonical name, walk forward
	const roots = adjacency.get(canonical.name) ?? [];
	for (const root of roots) {
		const chain = walkChain(root, adjacency, visited);
		if (chain.length > 1) {
			chains.push({
				hops: [
					{ name: canonical.name, filePath: canonical.filePath, line: canonical.line },
					...chain,
				],
			});
		}
	}

	return chains;
}

function walkChain(
	current: AliasEntry,
	adjacency: Map<string, AliasEntry[]>,
	visited: Set<string>,
): AliasHop[] {
	const key = `${current.name}:${current.filePath}:${current.line}`;
	if (visited.has(key)) return [];
	visited.add(key);

	const hop: AliasHop = {
		name: current.name,
		filePath: current.filePath,
		line: current.line,
	};

	// See if this alias name is further renamed
	const nextAliases = adjacency.get(current.name) ?? [];
	for (const next of nextAliases) {
		const nextKey = `${next.name}:${next.filePath}:${next.line}`;
		if (!visited.has(nextKey)) {
			const tail = walkChain(next, adjacency, visited);
			return [hop, ...tail];
		}
	}

	return [hop];
}

// ---------------------------------------------------------------------------
// Declaration lookup (same pattern as other resolvers)
// ---------------------------------------------------------------------------

type NamedDeclarationNode = Node & { findReferencesAsNodes(): Node[] };

function findNamedDeclaration(
	sourceFile: SourceFile,
	name: string,
): NamedDeclarationNode | undefined {
	const fn = sourceFile.getFunction(name);
	if (fn) return fn;

	const cls = sourceFile.getClass(name);
	if (cls) return cls;

	const iface = sourceFile.getInterface(name);
	if (iface) return iface;

	const typeAlias = sourceFile.getTypeAlias(name);
	if (typeAlias) return typeAlias;

	const enumDecl = sourceFile.getEnum(name);
	if (enumDecl) return enumDecl;

	const varDecl = sourceFile.getVariableDeclaration(name);
	if (varDecl) return varDecl;

	for (const cls of sourceFile.getClasses()) {
		const method = cls.getMethod(name);
		if (method) return method;

		const prop = cls.getProperty(name);
		if (prop) return prop;
	}

	// Search inside namespace/module declarations
	for (const ns of sourceFile.getModules()) {
		const nsFn = ns.getFunction(name);
		if (nsFn) return nsFn;

		const nsVar = ns.getVariableDeclaration(name);
		if (nsVar) return nsVar;

		const nsCls = ns.getClass(name);
		if (nsCls) return nsCls;

		const nsIface = ns.getInterface(name);
		if (nsIface) return nsIface;

		const nsTypeAlias = ns.getTypeAlias(name);
		if (nsTypeAlias) return nsTypeAlias;

		const nsEnum = ns.getEnum(name);
		if (nsEnum) return nsEnum;
	}

	// Default export function: look for the default keyword
	for (const fn of sourceFile.getFunctions()) {
		if (fn.isDefaultExport() && (fn.getName() === name || name === 'default')) {
			return fn;
		}
	}

	return undefined;
}

function toRelative(absolutePath: string, workspaceRoot: string): string {
	return toRelativePosixPath(workspaceRoot, absolutePath);
}
