/**
 * Shared types for the semantic-toolkit.
 *
 * Centralizes branded path types, symbol kind enumerations, kind category
 * sets, and the SymbolTarget abstraction used by all ts-ls resolvers.
 *
 * Every module in the toolkit that needs file paths, symbol kinds, or
 * ts-morph node references should import from this file.
 */
import type { SourceFile, Node } from 'ts-morph';

// ---------------------------------------------------------------------------
// Branded path types
// ---------------------------------------------------------------------------

/**
 * Branded string for absolute file system paths.
 *
 * The `_brand` property exists only at the type level — it's never set
 * at runtime. This prevents accidental mixing of absolute and relative
 * paths while remaining a structural subtype of `string` in most contexts.
 */
export type AbsolutePath = string & { readonly _brand?: 'AbsolutePath' };

/**
 * Branded string for workspace-relative paths (POSIX forward-slash separators).
 */
export type RelativePath = string & { readonly _brand?: 'RelativePath' };

// ---------------------------------------------------------------------------
// Node kind — the single source of truth for all symbol kinds
// ---------------------------------------------------------------------------

/**
 * All symbol kinds emitted by the parser.
 *
 * Every downstream system (chunker, lookup, snapshot, ts-ls, graph) MUST
 * reference this type instead of defining its own string literals.
 */
export type NodeKind =
	| 'function'
	| 'method'
	| 'class'
	| 'interface'
	| 'type'
	| 'enum'
	| 'enumMember'
	| 'variable'
	| 'const'
	| 'property'
	| 'constructor'
	| 'getter'
	| 'setter'
	| 'namespace'
	| 'module'
	| 'staticBlock'
	| 'import'
	| 'expression'
	| 're-export'
	| 'comment';

// ---------------------------------------------------------------------------
// Kind category sets — typed, centralized, and exported
// ---------------------------------------------------------------------------

/** Kinds whose AST nodes contain bodies with nested declarations. */
export const BODY_BEARING_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
	'function', 'method', 'constructor', 'getter', 'setter',
	'class', 'interface', 'enum', 'namespace', 'module', 'staticBlock',
]);

/** Kinds that represent callable symbols (have call / construct signatures). */
export const CALLABLE_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
	'function', 'method', 'constructor', 'getter', 'setter',
]);

/** Kinds eligible for type hierarchy resolution (extends / implements). */
export const TYPE_HIERARCHY_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
	'class', 'interface',
]);

/** Kinds for which cross-file reference resolution should be skipped. */
export const SKIP_REFS_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
	'import', 'expression', 're-export', 'comment',
]);

/** Kinds that can act as parent wrappers for nested symbols. */
export const PARENT_WRAPPER_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
	'class', 'interface', 'namespace', 'module',
]);

// ---------------------------------------------------------------------------
// SymbolTarget — the unified input for all ts-ls resolvers
// ---------------------------------------------------------------------------

/**
 * A resolved reference to a specific symbol in the AST.
 *
 * Replaces the fragile `(project, filePath, symbolName)` triple that
 * forced every resolver to independently re-discover the AST node.
 * Created once from a CodeChunk (which already knows the exact position)
 * and passed to all resolvers.
 */
export interface SymbolTarget {
	/** The ts-morph SourceFile containing the symbol. */
	sourceFile: SourceFile;

	/**
	 * The ts-morph AST Node for the declaration.
	 *
	 * This is the exact node (function, class, interface, type alias, etc.)
	 * located via the chunk's start line — no name-based lookup needed.
	 */
	node: Node;

	/** The symbol name (for display / error messages). */
	name: string;

	/** The verified kind from the parser. */
	kind: NodeKind;

	/** 1-indexed start line of the declaration. */
	startLine: number;

	/** Absolute path of the source file. */
	filePath: AbsolutePath;

	/** Workspace-relative path (forward slashes). */
	relativePath: RelativePath;
}
