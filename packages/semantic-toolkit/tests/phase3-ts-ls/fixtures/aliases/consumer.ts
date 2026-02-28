/**
 * Alias fixture — consumer that imports through barrel (multi-hop).
 *
 * Uses final alias names that have been renamed through multiple levels.
 */
import { Element, createElement, createDefaultWidget } from './barrel';
import type { ComponentId } from './barrel';

export function renderElement(id: ComponentId): Element {
	const el = createElement(`element-${id}`);
	return el;
}

export function renderDefault(): Element {
	return createDefaultWidget();
}
