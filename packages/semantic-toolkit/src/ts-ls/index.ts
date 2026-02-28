/**
 * Phase 3 — TypeScript Language Services module.
 *
 * Provides structural metadata resolution for symbols using
 * the TypeScript compiler's language services via ts-morph.
 */
export { resolveCallHierarchy } from './call-hierarchy';
export { resolveTypeHierarchy } from './type-hierarchy';
export { resolveReferences } from './references';
export { resolveTypeFlows } from './type-flows';
export { resolveMembers } from './members';
export { resolveSignature } from './signature';
export { resolveAliases } from './aliases';
export { resolveAmbients } from './ambients';
export { resolveProjectStructure } from './project-structure';

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
} from './types';

export { DEFAULT_TS_LS_CONFIG } from './types';
