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
 * Item 13: Multi-project tsconfig — project references, composite, solution-style.
 * Item 14: Type guards — narrowing construct detection in function bodies.
 * Item 15: Callbacks — higher-order function and callback tracking.
 * Item 16: Guard callbacks — type guard functions used as callbacks with narrowing metadata.
 * Item 17: Advanced types — conditional, mapped, template literal, utility type structure.
 * Item 18: Enum members — enum member value/kind extraction.
 * Item 19: Unicode/confusable identifiers — homoglyph, Bidi, zero-width detection.
 * Item 20: Module-level side effects — IIFE, top-level calls, side-effect imports, await, assignments.
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

	/**
	 * Maximum nesting depth for advanced type structure extraction.
	 * Controls how deeply conditional types, mapped types, and nested
	 * type constructs are recursively expanded.
	 * - `1` = top-level structure only (default).
	 * - Any positive integer = that many nesting levels.
	 */
	typeDepth: number;
}

export const DEFAULT_TS_LS_CONFIG: TsLsConfig = {
	callDepth: 1,
	typeDepth: 1,
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
 * - Item 14: typeGuards (narrowing constructs in function bodies)
 * - Item 15: callbacks (higher-order function and callback tracking)
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

	/** Type guard analysis: narrowing constructs found in this function/method body. */
	typeGuards?: TypeGuardAnalysis;

	/** Callback analysis: where this function is used as a callback and HOF parameter info. */
	callbacks?: CallbackAnalysis;

	/** Guard-callback analysis: type guard functions used as callbacks, with narrowing metadata. */
	guardCallbacks?: GuardCallbackAnalysis;

	/** Advanced type analysis: conditional, mapped, template literal, utility type structure. */
	advancedType?: AdvancedTypeAnalysis;

	/** Enum member analysis: member names, values, const/declare flags. */
	enumMembers?: EnumAnalysis;

	/** Unicode identifier analysis: confusable/homoglyph/Bidi/zero-width detection. */
	unicodeIdentifiers?: UnicodeIdentifierAnalysis;

	/** Module-level side effect analysis: IIFE, top-level calls, side-effect imports, await, assignments. */
	sideEffects?: SideEffectAnalysis;
}

// ---------------------------------------------------------------------------
// Item 18: Enum Members
// ---------------------------------------------------------------------------

/** A single enum member with its resolved value. */
export interface EnumMemberEntry {
	/** Member name (e.g. 'Red', 'OK'). */
	name: string;

	/** Resolved value as source text (e.g. '0', '"RED"', '1 + 2'). */
	value: string;

	/** True when the initializer is not a simple numeric/string literal. */
	isComputed: boolean;

	/** 1-indexed line number. */
	line: number;
}

/** Full analysis of an enum declaration. */
export interface EnumAnalysis {
	/** The enum being analyzed. */
	symbol: SymbolRef;

	/** True for `const enum`. */
	isConst: boolean;

	/** True for `declare enum` (ambient). */
	isDeclare: boolean;

	/** All members in declaration order. */
	members: EnumMemberEntry[];
}

// ---------------------------------------------------------------------------
// Item 19: Unicode / Confusable Identifiers
// ---------------------------------------------------------------------------

/** Severity of a Unicode identifier finding. */
export type UnicodeIdentifierSeverity = 'info' | 'warning' | 'critical';

/** A single identifier that contains non-ASCII or suspicious characters. */
export interface UnicodeIdentifierEntry {
	/** The identifier as written in source code. */
	name: string;

	/** NFC-normalized form of the identifier. */
	normalizedName: string;

	/** Unicode scripts detected in this identifier (e.g. ['Latin', 'Cyrillic']). */
	scripts: string[];

	/** True when the identifier mixes multiple Unicode scripts. */
	isMixedScript: boolean;

	/** True when any Bidi override characters (U+202A–U+202E, U+2066–U+2069) are present. */
	hasBidiOverride: boolean;

	/** True when any zero-width characters (U+200B–U+200D, U+2060, U+FEFF) are present. */
	hasZeroWidth: boolean;

	/** Severity: info (non-ASCII single-script), warning (mixed-script), critical (homoglyph/Bidi/zero-width). */
	severity: UnicodeIdentifierSeverity;

	/** Scope enclosing the identifier (e.g. 'file', 'function:foo', 'class:Bar'). */
	scope: string;

	/** 1-indexed line number. */
	line: number;
}

/** A pair of identifiers that are visually confusable. */
export interface ConfusablePair {
	/** First identifier. */
	a: string;

	/** Second identifier. */
	b: string;

	/** Human-readable reason (e.g. 'Cyrillic а vs Latin a'). */
	reason: string;
}

/** Full Unicode identifier analysis for a file. */
export interface UnicodeIdentifierAnalysis {
	/** Workspace-relative file path. */
	filePath: string;

	/** All identifiers with non-ASCII or suspicious characters. */
	identifiers: UnicodeIdentifierEntry[];

	/** Pairs of identifiers that are visually confusable within the file. */
	confusablePairs: ConfusablePair[];
}

// ---------------------------------------------------------------------------
// Item 20: Module-level side effects
// ---------------------------------------------------------------------------

/** The kind of module-level side effect. */
export type SideEffectKind =
	| 'iife'                // Immediately Invoked Function Expression
	| 'call'                // Top-level function/method call
	| 'side-effect-import'  // import 'polyfill' (no bindings)
	| 'top-level-await'     // await expression at module scope
	| 'assignment';         // Top-level assignment (process.env.X = 'y')

/** A single side effect that executes when the module loads. */
export interface SideEffectEntry {
	/** Kind of side effect. */
	kind: SideEffectKind;

	/** Source text excerpt of the side effect. */
	text: string;

	/** 1-indexed line number. */
	line: number;

	/** Name of the called function/method, if applicable. */
	targetName?: string;

	/** True when inside a top-level conditional (if/try/switch). */
	isConditional: boolean;
}

/** Full module-level side effect analysis for a file. */
export interface SideEffectAnalysis {
	/** Workspace-relative file path. */
	filePath: string;

	/** All side effects in source order. */
	effects: SideEffectEntry[];
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

// ---------------------------------------------------------------------------
// Item 15: Callbacks / Higher-Order Function tracking
// ---------------------------------------------------------------------------

/** A site where a named function is passed as a callback argument. */
export interface CallbackUsage {
	/** Name of the function being passed as a callback. */
	callbackName: string;

	/** Name of the function/method receiving the callback (e.g. 'map', 'retry'). */
	calledBy: string;

	/** Workspace-relative file path where this usage occurs. */
	filePath: string;

	/** 1-indexed line number of the callback usage. */
	line: number;

	/** 0-based parameter position the callback occupies. */
	parameterIndex: number;

	/** True when the callback is wrapped in .bind() (e.g. this.handler.bind(this)). */
	boundWithBind?: boolean;
}

/** A parameter of a higher-order function that accepts a callback. */
export interface CallbackParameter {
	/** Parameter name (e.g. 'fn', 'callback', 'predicate'). */
	name: string;

	/** 0-based position in the parameter list. */
	parameterIndex: number;

	/** Type text of the callback parameter (e.g. '(item: T) => boolean'). */
	type: string;
}

/** Full callback analysis for a function or method. */
export interface CallbackAnalysis {
	/** The symbol this analysis describes. */
	symbol: SymbolRef;

	/** Sites across the project where this function is passed as a callback. */
	usedAsCallbackIn: CallbackUsage[];

	/** If this function is a HOF: parameters that accept callback functions. */
	callbackParameters: CallbackParameter[];

	/** Whether this function’s return type is a function. */
	returnsFunction: boolean;

	/** Return function type text (e.g. '(e: Event) => void'). Undefined if not a function return. */
	returnFunctionType?: string;
}

// ---------------------------------------------------------------------------// Item 16: Guard Callbacks (type guards used as callbacks)
// ---------------------------------------------------------------------------

/** A site where a type guard function is used as a callback argument. */
export interface GuardCallbackSite {
	/** Name of the type guard function being passed. */
	guardName: string;

	/** Name of the function/method receiving the guard as an argument. */
	calledBy: string;

	/** Workspace-relative file path of the call site. */
	filePath: string;

	/** 1-indexed line number. */
	line: number;

	/** Argument position (0-based). */
	parameterIndex: number;

	/** The type predicate kind: 'is' for `x is T`, 'asserts' for `asserts x is T`. */
	predicateKind: 'is' | 'asserts';

	/** Target type from the predicate (e.g. 'User' from `x is User`). */
	predicateType: string;

	/** Inferred input type before narrowing (e.g. 'User | Guest'). Undefined if not determinable. */
	inputType?: string;

	/** Narrowed result type after the guard is applied (e.g. 'User'). Undefined if not determinable. */
	narrowedOutputType?: string;
}

/** A HOF parameter that accepts a type predicate function. */
export interface GuardHofParameter {
	/** Parameter name. */
	name: string;

	/** Argument position (0-based). */
	parameterIndex: number;

	/** Full type annotation text. */
	type: string;

	/** Whether the parameter type includes a type predicate. */
	hasTypePredicate: boolean;

	/** Target type from the predicate, if present. */
	predicateType?: string;
}

/** Full analysis of type guard usage in callback contexts. */
export interface GuardCallbackAnalysis {
	/** The type guard function being analyzed. */
	symbol: SymbolRef;

	/** Sites where this guard is used as a callback, with narrowing info. */
	guardCallbackSites: GuardCallbackSite[];

	/** If this function is a HOF: parameters that accept type predicates. */
	guardHofParameters: GuardHofParameter[];
}

// ---------------------------------------------------------------------------
// Item 17: Advanced Types (Conditional, Mapped, Template Literal)
// ---------------------------------------------------------------------------

/** Classification of an advanced type construct. */
export type AdvancedTypeKind =
	| 'conditional'       // T extends U ? X : Y
	| 'mapped'            // { [K in keyof T]: V }
	| 'template-literal'  // `get${Capitalize<string>}`
	| 'utility'           // Partial<T>, Pick<T, K>, etc.
	| 'intersection'      // A & B
	| 'union'             // A | B
	| 'indexed-access'    // T[K]
	| 'keyof'             // keyof T
	| 'typeof'            // typeof expr
	| 'infer'             // infer R (within conditional)
	| 'simple';           // plain type reference or literal

/** Breakdown of a conditional type: T extends U ? X : Y. */
export interface ConditionalTypeInfo {
	/** The check type (T). */
	checkType: string;

	/** The extends constraint (U). */
	extendsType: string;

	/** The true branch type (X). Text or nested AdvancedTypeEntry if depth allows. */
	trueType: string;

	/** The false branch type (Y). Text or nested AdvancedTypeEntry if depth allows. */
	falseType: string;

	/** Infer declarations found in the extends type (e.g. 'infer R'). */
	inferTypes: string[];
}

/** Breakdown of a mapped type: { [K in Source]: V }. */
export interface MappedTypeInfo {
	/** The key parameter name (usually K). */
	keyName: string;

	/** The source constraint (e.g. 'keyof T', 'string', a union). */
	constraint: string;

	/** The value type expression. */
	valueType: string;

	/** Optional readonly modifier: '+readonly', '-readonly', or undefined. */
	readonlyModifier?: '+readonly' | '-readonly';

	/** Optional optionality modifier: '+?', '-?', or undefined. */
	optionalModifier?: '+?' | '-?';

	/** Key remapping clause (as NewKey), if present. */
	nameType?: string;
}

/** Breakdown of a template literal type. */
export interface TemplateLiteralInfo {
	/** The full template text (e.g. '`get${string}`'). */
	templateText: string;

	/** Literal head and span texts. */
	spans: TemplateLiteralSpan[];
}

/** A span in a template literal type. */
export interface TemplateLiteralSpan {
	/** The type expression in the span (e.g. 'string', 'Capitalize<K>'). */
	type: string;

	/** The literal text following this span. */
	literal: string;
}

/** Information about a recognized utility type. */
export interface UtilityTypeInfo {
	/** The utility type name (e.g. 'Partial', 'Pick', 'ReturnType'). */
	name: string;

	/** The type arguments passed to the utility. */
	typeArguments: string[];
}

/** A single advanced type entry extracted from a type alias. */
export interface AdvancedTypeEntry {
	/** What kind of advanced type this is. */
	kind: AdvancedTypeKind;

	/** Full source text of this type construct. */
	text: string;

	/** Conditional type breakdown (only when kind === 'conditional'). */
	conditional?: ConditionalTypeInfo;

	/** Mapped type breakdown (only when kind === 'mapped'). */
	mapped?: MappedTypeInfo;

	/** Template literal breakdown (only when kind === 'template-literal'). */
	templateLiteral?: TemplateLiteralInfo;

	/** Utility type info (only when kind === 'utility'). */
	utility?: UtilityTypeInfo;

	/** Nested entries (populated when typeDepth > 1 and this type contains sub-types). */
	children?: AdvancedTypeEntry[];
}

/** Full analysis of a type alias declaration's advanced type structure. */
export interface AdvancedTypeAnalysis {
	/** The type alias being analyzed. */
	symbol: SymbolRef;

	/** The full type alias text (right-hand side). */
	typeText: string;

	/** The top-level type structure. */
	structure: AdvancedTypeEntry;

	/** Type parameters on this alias (e.g. T, K extends keyof T). */
	typeParameters: string[];
}

// ---------------------------------------------------------------------------
// Item 14: Type Guards / Narrowing
// ---------------------------------------------------------------------------

/** The kind of type narrowing construct. */
export type TypeGuardKind =
	| 'user-defined'      // function isUser(x: any): x is User
	| 'assertion'         // function assertUser(x: any): asserts x is User
	| 'typeof'            // if (typeof x === 'string')
	| 'instanceof'        // if (x instanceof Error)
	| 'in-operator'       // if ('kind' in x)
	| 'discriminant'      // if (x.kind === 'circle')
	| 'nullish'           // if (x != null), if (x), x ?? fallback
	| 'equality'          // if (x === 'foo')
	| 'array-isarray'     // if (Array.isArray(x))
	| 'early-return'      // if (!x) return; (guard clause)
	| 'exhaustive'        // const _: never = x (exhaustiveness check)
	| 'compound';         // typeof x === 'string' || typeof x === 'number'

/** A single type guard / narrowing entry found in a function body. */
export interface TypeGuardEntry {
	/** What kind of narrowing construct. */
	kind: TypeGuardKind;

	/** 1-indexed line number where this guard occurs. */
	line: number;

	/** Source text of the guard expression (e.g. "typeof x === 'string'"). */
	guardText: string;

	/** The variable or parameter name being narrowed. */
	narrowedName: string;

	/** Target type if resolvable (e.g. 'string', 'User'). Undefined when not determinable. */
	narrowedTo?: string;

	/** True for return-type guards: `x is T` or `asserts x is T` on the function itself. */
	isReturnTypeGuard?: boolean;
}

/** Type guard analysis result for a function or method. */
export interface TypeGuardAnalysis {
	/** The symbol this analysis describes. */
	symbol: SymbolRef;

	/** All narrowing constructs found, ordered by line number. */
	guards: TypeGuardEntry[];
}

// ---------------------------------------------------------------------------
// Item 13: Multi-project tsconfig / project references
// ---------------------------------------------------------------------------

/** Information about a single TypeScript project (tsconfig.json). */
export interface ProjectInfo {
	/** Workspace-relative path to the tsconfig.json file. */
	configPath: string;

	/** Whether this project uses `composite: true`. */
	composite: boolean;

	/** Paths this tsconfig extends from (resolved, relative). */
	extendedFrom?: string;

	/** Project references declared in this tsconfig. */
	references: string[];

	/** Source files included in this project (workspace-relative). */
	sourceFiles: string[];

	/** Root directory of this project (workspace-relative). */
	rootDir: string;

	/** Output directory if specified. */
	outDir?: string;
}

/** Full project structure for a workspace with potentially multiple tsconfig files. */
export interface ProjectStructure {
	/** All discovered TypeScript projects in the workspace. */
	projects: ProjectInfo[];

	/** Solution-style tsconfig (if any) — a tsconfig with only references, no files. */
	solutionConfig?: string;

	/** Map of project → projects that reference it (reverse dependency graph). */
	referencedBy: Map<string, string[]>;
}
