/**
 * Alias fixture — export renames and re-exports.
 *
 * Tests: export { Foo as Bar } from './module' patterns.
 */

// Export rename with module specifier
export { Widget as Component, createWidget as buildComponent } from './core';

// Type-only export rename
export type { WidgetId as ComponentId } from './core';

// Default-as-named re-export
export { default as createDefaultWidget } from './core';
