export type { CommentNode, RegistryEntry, TfIdfConfig, TfIdfIdentifier } from './types.js';
export { generateIdentifiers } from './tfidf-service.js';
export { buildRegistryEntries, getIdentifiers, invalidate, invalidateAll } from './registry.js';
