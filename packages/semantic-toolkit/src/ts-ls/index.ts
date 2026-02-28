/**
 * Phase 3 — TypeScript Language Services module.
 *
 * Provides structural metadata resolution for symbols using
 * the TypeScript compiler's language services via ts-morph.
 */
export { resolveCallHierarchy } from './call-hierarchy.js';
export { resolveTypeHierarchy } from './type-hierarchy.js';
export { resolveReferences } from './references.js';
export { resolveTypeFlows } from './type-flows.js';
export { resolveMembers } from './members.js';
export { resolveSignature } from './signature.js';
export { resolveAliases } from './aliases.js';
export { resolveAmbients } from './ambients.js';
export { resolveProjectStructure } from './project-structure.js';
export { resolveTypeGuards } from './type-guards.js';
export { resolveCallbacks } from './callbacks.js';
export { resolveGuardCallbacks } from './guard-callbacks.js';
export { resolveAdvancedTypes } from './advanced-types.js';
export { resolveEnumMembers } from './enum-members.js';
export { resolveUnicodeIdentifiers } from './unicode-identifiers.js';
export { resolveSideEffects } from './side-effects.js';

export type {
	TsLsConfig,
	SymbolRef,
	OutgoingCall,
	IncomingCaller,
	SymbolMetadata,
	TypeHierarchy,
	TypeParameter,
	References,
	FileReference,
	TypeFlow,
	TypeFlowParam,
	TypeFlowType,
	MemberInfo,
	MemberKind,
	AliasGraph,
	AliasEntry,
	AliasKind,
	AliasChain,
	AliasHop,
	AmbientInfo,
	GlobalAugmentation,
	ModuleAugmentation,
	AmbientDeclaration,
	AmbientMember,
	ProjectInfo,
	ProjectStructure,
	TypeGuardKind,
	TypeGuardEntry,
	TypeGuardAnalysis,
	CallbackUsage,
	CallbackParameter,
	CallbackAnalysis,
	GuardCallbackSite,
	GuardHofParameter,
	GuardCallbackAnalysis,
	AdvancedTypeKind,
	ConditionalTypeInfo,
	MappedTypeInfo,
	TemplateLiteralInfo,
	TemplateLiteralSpan,
	UtilityTypeInfo,
	AdvancedTypeEntry,
	AdvancedTypeAnalysis,
	EnumMemberEntry,
	EnumAnalysis,
	UnicodeIdentifierEntry,
	UnicodeIdentifierAnalysis,
	UnicodeIdentifierSeverity,
	ConfusablePair,
	SideEffectKind,
	SideEffectEntry,
	SideEffectAnalysis,
} from './types.js';

export { DEFAULT_TS_LS_CONFIG } from './types.js';
