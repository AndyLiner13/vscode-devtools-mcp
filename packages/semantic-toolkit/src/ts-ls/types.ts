/**
 * Phase 3 — TypeScript Language Services types.
 *
 * Types are added incrementally per implementation item.
 * Item 1: Core call hierarchy (outgoingCalls, incomingCallers).
 * Item 2: Multi-hop traversal with recursive tree, cycle detection, depth limits.
 * Item 4: Type hierarchy (extends, implements, subtypes).
 * Item 5: isAbstract, rich generics (name+constraint+default), isAbstract on SymbolRef.
 * Item 7: Type flows — parameter/return type provenance with full generic unwrapping.
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
}
