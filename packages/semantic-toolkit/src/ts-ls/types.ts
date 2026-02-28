/**
 * Phase 3 — TypeScript Language Services types.
 *
 * Types are added incrementally per implementation item.
 * Item 1: Core call hierarchy (outgoingCalls, incomingCallers).
 * Item 2: Multi-hop traversal with recursive tree, cycle detection, depth limits.
 * Item 4: Type hierarchy (extends, implements, subtypes).
 * Item 5: isAbstract, rich generics (name+constraint+default), isAbstract on SymbolRef.
 * Item 7: Type flows — parameter/return type provenance with full generic unwrapping.
 * Item 8: Members — class/interface member listing.
 * Item 9: Signature + modifiers.
 * Item 11: Alias tracking — import/export alias graph resolution.
 * Item 12: Ambient/global augmentations — declare global, declare module, .d.ts.
 */

/** Configuration for TS Language Services operations. */
export interface TsLsConfig {
	/**
	 * Maximum call depth for outgoing/incoming call resolution.
	 * - `1` = immediate callers/callees only (default).
	 * - `-1` = full transitive (follow all hops, with cycle detection).
	 * - Any positive integer = that many hops.
	 */
	callDepth: number;
}

export const DEFAULT_TS_LS_CONFIG: TsLsConfig = {
	callDepth: 1,
};

/** A reference to a symbol in a specific file location. */
export interface SymbolRef {
	/** Symbol name as it appears at the call site. */
	name: string;

	/** Workspace-relative file path (forward slashes). */
	filePath: string;

	/** 1-indexed line number of the call/reference. */
	line: number;

	/** True when the referenced class is abstract. Only set for class declarations. */
	isAbstract?: boolean;
}

/** A generic type parameter with optional constraint and default. */
export interface TypeParameter {
	/** Parameter name (e.g. 'T', 'K'). */
	name: string;

	/** Constraint type text (e.g. 'Entity', 'string | number'). Undefined if unconstrained. */
	constraint?: string;

	/** Default type text (e.g. 'User'). Undefined if no default. */
	default?: string;
}

/** Outgoing call: a symbol that this symbol calls (recursive tree). */
export interface OutgoingCall {
	/** The called symbol. */
	target: SymbolRef;

	/** Lines within the source symbol where the call occurs. */
	callSiteLines: number[];

	/** Recursive outgoing calls from the target (populated when callDepth > 1). */
	outgoingCalls: OutgoingCall[];

	/** True when this target is an ancestor in the call chain (back-edge). */
	cyclic?: boolean;

	/** True when this target has deeper calls that weren't expanded due to callDepth limit. */
	depthLimited?: boolean;
}

/** Incoming caller: a symbol that calls this symbol (recursive tree). */
export interface IncomingCaller {
	/** The calling symbol. */
	source: SymbolRef;

	/** Lines within the calling symbol where the call occurs. */
	callSiteLines: number[];

	/** Recursive incoming callers of the source (populated when callDepth > 1). */
	incomingCallers: IncomingCaller[];

	/** True when this source is a descendant in the caller chain (back-edge). */
	cyclic?: boolean;

	/** True when this source has deeper callers that weren't expanded due to callDepth limit. */
	depthLimited?: boolean;
}

/** Type hierarchy for a class or interface. */
export interface TypeHierarchy {
	/** Parent class this symbol extends (classes only). */
	extends?: SymbolRef;

	/** Interfaces or parent interfaces this symbol implements/extends. */
	implements: SymbolRef[];

	/** Classes/interfaces that extend or implement this symbol. */
	subtypes: SymbolRef[];

	/** True when the queried class is abstract. */
	isAbstract?: boolean;

	/** Generic type parameters with constraints and defaults. Empty for non-generic types. */
	typeParameters: TypeParameter[];

	// TODO: Mixin detection — detect functions that return class expressions extending
	// their base parameter (e.g. `function Timestamped<T>(Base: T) { return class extends Base {...} }`).
	// Add `mixins?: SymbolRef[]` field. Moderate effort, uncommon pattern.

	// TODO: Full generic instantiation tracking — find all sites where this generic
	// class/interface is instantiated with concrete type arguments (e.g. `Repository<User>`).
	// Very high cost (project-wide reference + type inference). Defer to future phase.
}

/** A file that references a symbol, with the specific lines where it's referenced. */
export interface FileReference {
	/** Workspace-relative file path (forward slashes). */
	filePath: string;

	/** 1-indexed lines where the symbol is referenced in this file. */
	lines: number[];
}

/** Cross-file reference summary for a symbol. */
export interface References {
	/** Total number of reference occurrences across all files. */
	totalCount: number;

	/** Number of distinct files that reference this symbol. */
	fileCount: number;

	/** Per-file breakdown of reference locations, sorted by file path. */
	files: FileReference[];
}

// ---------------------------------------------------------------------------
// Item 7 — Type Flows
// ---------------------------------------------------------------------------

/** A user-defined type resolved to its definition location. */
export interface TypeFlowType {
	/** Type name as written in source (e.g. 'User', 'Role'). */
	name: string;

	/** Workspace-relative file path where this type is defined (forward slashes). */
	filePath: string;

	/** 1-indexed line number of the type definition. */
	line: number;
}

/** A parameter with its raw type text and resolved user-defined types. */
export interface TypeFlowParam {
	/** Parameter name as declared. */
	name: string;

	/** Raw type annotation text (e.g. 'Promise<User>', 'string | Role'). */
	type: string;

	/** User-defined types extracted from this parameter's type annotation. */
	resolvedTypes: TypeFlowType[];
}

/** Type flow provenance for a function, method, or constructor. */
export interface TypeFlow {
	/** The symbol this type flow describes. */
	symbol: SymbolRef;

	/** Parameter type provenance — each parameter with its resolved types. */
	parameters: TypeFlowParam[];

	/** Return type provenance. Undefined for constructors or void functions with no annotation. */
	returnType: TypeFlowParam | undefined;

	/** Deduplicated union of all user-defined types referenced across params and return. */
	referencedTypes: TypeFlowType[];
}

// ---------------------------------------------------------------------------
// Item 8 — Members
// ---------------------------------------------------------------------------

/** The kind of a class/interface member. */
export type MemberKind =
	| 'method'
	| 'property'
	| 'getter'
	| 'setter'
	| 'constructor'
	| 'indexSignature'
	| 'callSignature'
	| 'constructSignature';

/** A member of a class or interface (method, property, accessor, signature). */
export interface MemberInfo {
	/** Member name. Empty string for index/call/construct signatures. */
	name: string;

	/** Kind of the member. */
	kind: MemberKind;

	/** 1-indexed line number of the member declaration. */
	line: number;

	/**
	 * Type text for properties, or return type text for methods/getters.
	 * Parameter signature for constructors (e.g. '(name: string, age: number)').
	 * Full signature text for index/call/construct signatures.
	 * Undefined when no type annotation exists.
	 */
	type?: string;

	/** Modifiers: public, private, protected, static, abstract, readonly, async, override. */
	modifiers: string[];
}

/**
 * Structural metadata for a symbol, resolved via TS Language Services.
 *
 * Fields are added incrementally:
 * - Item 1: outgoingCalls, incomingCallers
 * - Item 2: Multi-hop recursive tree with cycle detection
 * - Item 4: typeHierarchy
 * - Item 5: isAbstract, typeParameters, isAbstract on SymbolRef
 * - Item 6: references (cross-file reference count + file list)
 * - Item 7: typeFlows (parameter/return type provenance)
 * - Item 8: members (class/interface member listing)
 * - Item 9: signature + modifiers
 * - Item 11: aliases (import/export alias graph)
 * - Item 12: ambients (declare global, declare module, .d.ts)
 */
export interface SymbolMetadata {
	/** The symbol this metadata describes. */
	symbol: SymbolRef;

	/** Complete type signature of the declaration (e.g. 'async fetchUser(id: number): Promise<string>'). */
	signature?: string;

	/** Modifiers on the declaration (e.g. ['async', 'exported', 'public']). */
	modifiers?: string[];

	/** Symbols this symbol calls (recursive tree up to configured callDepth). */
	outgoingCalls: OutgoingCall[];

	/** Symbols that call this symbol (recursive tree up to configured callDepth). */
	incomingCallers: IncomingCaller[];

	/** Type hierarchy: extends, implements, subtypes. Undefined for non-class/interface symbols. */
	typeHierarchy?: TypeHierarchy;

	/** Cross-file references: how many files reference this symbol and where. */
	references?: References;

	/** Type flows: parameter and return type provenance for functions/methods/constructors. */
	typeFlows?: TypeFlow;

	/** Members: methods, properties, accessors, signatures. Undefined for non-class/interface symbols. */
	members?: MemberInfo[];

	/** Alias graph: all import/export aliases pointing to this symbol across the project. */
	aliases?: AliasGraph;
}

// ---------------------------------------------------------------------------
// Item 11: Alias tracking
// ---------------------------------------------------------------------------

/** The kind of alias relationship. */
export type AliasKind =
	| 'import-rename'       // import { Foo as Bar }
	| 'export-rename'       // export { Foo as Bar } from './module'
	| 'namespace'           // import * as ns from './module'
	| 'default-as-named'    // export { default as Foo } from './module'  OR  import Foo from './module'
	| 'type-only'           // import type { Foo as Bar } or export type { Foo as Bar }
	| 'namespace-alias'     // import Foo = SomeNamespace.Bar
	| 'dynamic-import';     // const mod = await import('./module') → mod.Foo

/** A single alias entry in the alias graph. */
export interface AliasEntry {
	/** The alias name used at this site. */
	name: string;

	/** File where the alias appears. */
	filePath: string;

	/** Line where the alias is declared. */
	line: number;

	/** What kind of alias relationship. */
	kind: AliasKind;

	/** The original exported name being aliased. */
	originalName: string;
}

/** Full alias graph for a symbol: canonical declaration + all aliases + optional alias chain. */
export interface AliasGraph {
	/** The canonical (original) declaration of the symbol. */
	canonical: SymbolRef;

	/** All aliases discovered across the project. */
	aliases: AliasEntry[];

	/**
	 * Multi-hop alias chains where a symbol is renamed through successive re-exports.
	 * Each chain is an ordered array from original → final consumer alias.
	 * Only populated when there are multi-hop renames (not just direct aliases).
	 */
	chains: AliasChain[];
}

/** A single multi-hop alias chain, e.g. Entity → IEntity → BaseEntity. */
export interface AliasChain {
	/** Ordered list of hops from original to final alias. */
	hops: AliasHop[];
}

/** One hop in a multi-hop alias chain. */
export interface AliasHop {
	/** The name at this point in the chain. */
	name: string;

	/** File where this hop occurs. */
	filePath: string;

	/** Line of this alias/re-export. */
	line: number;
}

// ---------------------------------------------------------------------------
// Item 12: Ambient / Global Augmentations
// ---------------------------------------------------------------------------

/** A member declared inside an ambient block (declare global, declare module, .d.ts). */
export interface AmbientMember {
	/** Member name. */
	name: string;

	/** Kind: 'function', 'variable', 'interface', 'type', 'class', 'enum', 'namespace', 'method', 'property'. */
	kind: string;

	/** 1-indexed line number. */
	line: number;

	/** Signature or type text. */
	signature?: string;
}

/** A single `declare global { ... }` block. */
export interface GlobalAugmentation {
	/** File where the declare global block appears. */
	filePath: string;

	/** Line where the block starts. */
	line: number;

	/** Members added to the global scope by this block. */
	members: AmbientMember[];
}

/** A single `declare module 'xxx' { ... }` block (module augmentation or ambient module). */
export interface ModuleAugmentation {
	/** The module specifier string (e.g. 'express', './my-module'). */
	moduleName: string;

	/** File where the declare module block appears. */
	filePath: string;

	/** Line where the block starts. */
	line: number;

	/** Members added/augmented in this module. */
	members: AmbientMember[];
}

/** An ambient declaration from a .d.ts file. */
export interface AmbientDeclaration {
	/** Declaration name. */
	name: string;

	/** Kind: 'function', 'variable', 'interface', 'type', 'class', 'enum', 'namespace'. */
	kind: string;

	/** File where the declaration lives. */
	filePath: string;

	/** 1-indexed line number. */
	line: number;

	/** Signature or type text. */
	signature?: string;
}

/** Full ambient information for the project. */
export interface AmbientInfo {
	/** All `declare global { ... }` blocks found across the project. */
	globalAugmentations: GlobalAugmentation[];

	/** All `declare module 'xxx' { ... }` blocks found across the project. */
	moduleAugmentations: ModuleAugmentation[];

	/** Ambient declarations from .d.ts files (excluding node_modules). */
	ambientDeclarations: AmbientDeclaration[];
}
