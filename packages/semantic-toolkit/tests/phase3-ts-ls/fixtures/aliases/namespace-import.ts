/**
 * Alias fixture — namespace import.
 *
 * Tests: import * as ns from './module' pattern.
 */
import * as CoreWidgets from './core';

export function listWidgets(): void {
	const w = CoreWidgets.createWidget('ns-test');
	const svc = new CoreWidgets.WidgetService();
	svc.add(w);
}
