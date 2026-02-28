/**
 * Alias fixture — barrel re-export (intermediate level).
 *
 * Re-exports from export-rename.ts which itself renames exports from core.ts.
 * This creates multi-hop chains: Widget → Component → Element.
 */

// Second-hop rename: Component → Element
export { Component as Element, buildComponent as createElement } from './export-rename';

// Pass-through re-export (no rename at this level)
export { createDefaultWidget } from './export-rename';

// Type-only pass-through
export type { ComponentId } from './export-rename';
