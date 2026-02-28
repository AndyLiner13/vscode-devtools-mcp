/**
 * Cross-module fixture — top-level barrel (index).
 *
 * Multi-level barrel: re-exports from sub-barrel (which re-exports from types + user).
 * Also: namespace re-export, default-as-named re-export.
 */

// Multi-level: re-export everything from sub-barrel (which re-exports types + user)
export * from './sub-barrel';

// Namespace re-export — consumer accesses as configNs.defaults(), configNs.Config, etc.
export * as configNs from './config';

// Default-as-named re-export
export { default as createUser } from './user';

// Type-only re-export with rename
export type { Entity as IEntity } from './types';
