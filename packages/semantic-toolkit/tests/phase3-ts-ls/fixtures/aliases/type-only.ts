/**
 * Alias fixture — type-only imports with renames.
 *
 * Tests: import type { Foo as Bar } patterns.
 */
import type { Widget as ReadonlyWidget, WidgetId as ReadonlyId } from './core';

export function describeWidget(w: ReadonlyWidget): string {
	return `Widget ${w.id}: ${w.label}`;
}

export function formatId(id: ReadonlyId): string {
	return `WID-${id}`;
}
