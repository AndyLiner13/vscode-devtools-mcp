/**
 * Phase 3 — TypeScript Language Services module.
 *
 * Provides structural metadata resolution for symbols using
 * the TypeScript compiler's language services via ts-morph.
 */
export { resolveCallHierarchy } from './call-hierarchy';

export type {
	TsLsConfig,
	SymbolRef,
	OutgoingCall,
	IncomingCaller,
	SymbolMetadata,
} from './types';

export { DEFAULT_TS_LS_CONFIG } from './types';
