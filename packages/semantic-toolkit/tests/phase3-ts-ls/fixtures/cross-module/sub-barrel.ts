/**
 * Cross-module fixture — sub-level barrel.
 *
 * Uses both wildcard and named re-exports.
 * This is the first level of barrel indirection.
 */

// Wildcard re-export — all types.ts exports
export * from './types';

// Named re-exports from user.ts
export { User, UserService, createDefaultUser } from './user';
