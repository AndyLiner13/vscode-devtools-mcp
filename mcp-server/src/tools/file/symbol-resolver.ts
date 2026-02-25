/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Minimum shape required for symbol tree navigation.
 * FileSymbol from the shared interface satisfies this.
 */
export interface SymbolLikeRange {
	endLine: number;
	startLine: number;
}

export interface SymbolLike {
	children: SymbolLike[];
	exported?: boolean;
	kind: string;
	modifiers?: string[];
	name: string;
	range: SymbolLikeRange;
}

/**
 * Build a display label for a symbol, prefixing its kind with export/async/etc. modifiers.
 * When kind === name (e.g. container symbols like "imports"), the name is omitted.
 */
export function formatSymbolLabel(symbol: SymbolLike): string {
	const prefixParts: string[] = [];
	if (symbol.exported) prefixParts.push('export');
	if (symbol.modifiers) {
		for (const mod of symbol.modifiers) prefixParts.push(mod);
	}
	prefixParts.push(symbol.kind);
	const qualifiedKind = prefixParts.join(' ');
	return symbol.kind === symbol.name ? qualifiedKind : `${qualifiedKind} ${symbol.name}`;
}

/**
 * Strip surrounding quotes from a string (single or double).
 * E.g., "'./augmented'" → "./augmented", "\"foo\"" → "foo"
 */
function stripQuotes(s: string): string {
	if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
		return s.slice(1, -1);
	}
	return s;
}

/**
 * Match a symbol name against a target, handling quoted module names.
 */
function nameMatches(symbolName: string, targetName: string): boolean {
	if (symbolName === targetName) return true;
	return stripQuotes(symbolName) === stripQuotes(targetName);
}

export function resolveSymbolTarget<T extends SymbolLike>(symbols: T[], target: string): undefined | { symbol: T; parent?: T; path: string[] } {
	// First, try exact match at top level (handles module names with dots like './augmented')
	const exactMatch = symbols.find((s) => nameMatches(s.name, target));
	if (exactMatch) {
		return { parent: undefined, path: [target], symbol: exactMatch };
	}

	// Then try dot-path resolution for nested symbols
	const segments = target.split('.');

	let currentList: SymbolLike[] = symbols;
	let parent: T | undefined;
	const pathSoFar: string[] = [];

	for (let i = 0; i < segments.length; i++) {
		const name = segments[i];
		const found = currentList.find((s) => nameMatches(s.name, name));
		if (!found) return undefined;

		pathSoFar.push(name);

		if (i < segments.length - 1) {
			parent = found as T;
			currentList = found.children;
		} else {
			return { parent, path: pathSoFar, symbol: found as T };
		}
	}

	return undefined;
}

/**
 * Collect names of sibling symbols (same level, excluding the matched one).
 */
function getSiblingNames<T extends SymbolLike>(allSymbols: T[], match: { symbol: T; parent?: T }): string[] {
	const siblingSource = match.parent ? match.parent.children : allSymbols;
	return siblingSource.filter((s) => s.name !== match.symbol.name).map((s) => s.name);
}

/**
 * Collect child names of a symbol, up to maxDepth.
 */
function getChildNames(symbol: SymbolLike, maxDepth?: number): string[] {
	if (maxDepth !== undefined && maxDepth <= 0) return [];
	return symbol.children.map((c) => c.name);
}

/**
 * Search all children (recursively) of all top-level symbols for a name match.
 * Returns the qualified dot-path(s) if found, e.g. ["ParentSection.ChildName"].
 * Useful for suggesting the correct qualified path when an unqualified name fails.
 */
export function findQualifiedPaths(symbols: SymbolLike[], targetName: string): string[] {
	const results: string[] = [];

	function searchChildren(children: SymbolLike[], parentPath: string): void {
		for (const child of children) {
			const qualifiedPath = `${parentPath}.${child.name}`;
			if (nameMatches(child.name, targetName)) {
				results.push(qualifiedPath);
			}
			if (child.children.length > 0) {
				searchChildren(child.children, qualifiedPath);
			}
		}
	}

	for (const symbol of symbols) {
		if (symbol.children.length > 0) {
			searchChildren(symbol.children, symbol.name);
		}
	}

	return results;
}

/**
 * Find all symbols whose kind matches the target (case-insensitive).
 * Searches top-level symbols and recursively through children.
 */
export function findSymbolsByKind<T extends SymbolLike>(symbols: T[], targetKind: string): T[] {
	const kind = targetKind.toLowerCase();
	const results: T[] = [];

	function walk(list: SymbolLike[]): void {
		for (const sym of list) {
			if (sym.kind.toLowerCase() === kind) {
				results.push(sym as T);
			}
			if (sym.children.length > 0) {
				walk(sym.children);
			}
		}
	}

	walk(symbols);
	return results;
}

/**
 * Resolve a "kind.name" target like "comments.pipe-extension-use".
 * Splits on the first dot, matches the first segment as a kind,
 * then finds a symbol with that kind whose name matches the rest.
 */
export function resolveByKindAndName<T extends SymbolLike>(symbols: T[], target: string): T | undefined {
	const dotIndex = target.indexOf('.');
	if (dotIndex < 0) return undefined;

	const kindPart = target.slice(0, dotIndex).toLowerCase();
	const namePart = target.slice(dotIndex + 1);

	for (const sym of symbols) {
		if (sym.kind.toLowerCase() === kindPart && nameMatches(sym.name, namePart)) {
			return sym;
		}
	}
	return undefined;
}

/**
 * Collect all unique symbol kinds present in a symbol tree.
 */
export function collectSymbolKinds(symbols: readonly SymbolLike[]): string[] {
	const kinds = new Set<string>();

	function walk(list: readonly SymbolLike[]): void {
		for (const sym of list) {
			kinds.add(sym.kind);
			if (sym.children.length > 0) walk(sym.children);
		}
	}

	walk(symbols);
	return [...kinds].sort();
}

/**
 * Format a symbol's range as 1-indexed "lines X-Y of Z".
 * Takes 0-indexed line numbers (legacy path).
 */
function formatRange(startLine: number, endLine: number, totalLines: number): string {
	return `lines ${startLine + 1}-${endLine + 1} of ${totalLines}`;
}
