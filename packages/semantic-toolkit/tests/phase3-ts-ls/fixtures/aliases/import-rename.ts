/**
 * Alias fixture — import renames.
 *
 * Tests: import { Foo as Bar } patterns.
 */
import { Widget as UIWidget, createWidget as makeWidget, WidgetService as Svc } from './core';

export function useWidgets(): void {
	const w: UIWidget = makeWidget('test');
	const svc = new Svc();
	svc.add(w);
}
