/**
 * Phase 3 — TypeScript Language Services module.
 *
 * Provides structural metadata resolution for symbols using
 * the TypeScript compiler's language services via ts-morph.
 */
export { resolveCallHierarchy } from './call-hierarchy';
export { resolveTypeHierarchy } from './type-hierarchy';
export { resolveReferences } from './references';

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
} from './types';

export { DEFAULT_TS_LS_CONFIG } from './types';
