import type { ParsedSymbol } from '../parser/types';

/**
 * Parsed representation of an import for identifier matching.
 */
interface ImportInfo {
	/** The full import statement source text. */
	source: string;
	/** Identifiers introduced by this import (for matching against chunk source). */
	identifiers: string[];
}

/**
 * Extract identifier names from an import symbol's signature.
 * Handles: default imports, named imports, namespace imports, side-effect imports.
 */
export function extractImportIdentifiers(importSymbol: ParsedSymbol): ImportInfo {
	const sig = importSymbol.signature;
	const identifiers: string[] = [];

	// Namespace import: import * as Name from '...'
	const nsMatch = sig.match(/\*\s+as\s+(\w+)/);
	if (nsMatch) {
		identifiers.push(nsMatch[1]);
	}

	// Named imports: import { A, B as C } from '...'
	const namedMatch = sig.match(/\{\s*([^}]+)\s*\}/);
	if (namedMatch) {
		const names = namedMatch[1].split(',').map(n => n.trim());
		for (const name of names) {
			// Handle "X as Y" — the local name is Y
			const asMatch = name.match(/\w+\s+as\s+(\w+)/);
			if (asMatch) {
				identifiers.push(asMatch[1]);
			} else {
				const cleanName = name.replace(/^type\s+/, '').trim();
				if (cleanName) identifiers.push(cleanName);
			}
		}
	}

	// Default import: import Name from '...' or import Name, { ... } from '...'
	// Match: "import Name" or "import type Name" before "from" but not "* as" or "{"
	const defaultMatch = sig.match(/^import\s+(?:type\s+)?([A-Za-z_$]\w*)(?:\s*,|\s+from)/);
	if (defaultMatch) {
		identifiers.push(defaultMatch[1]);
	}

	return {
		source: sig,
		identifiers,
	};
}

/**
 * Resolve which imports are relevant to a chunk's source code.
 * An import is relevant if at least one of its identifiers appears
 * as a word boundary match in the chunk's source text.
 */
export function resolveRelevantImports(
	chunkSource: string,
	allImports: ParsedSymbol[],
): string[] {
	if (allImports.length === 0) return [];

	const relevant: string[] = [];

	for (const imp of allImports) {
		const info = extractImportIdentifiers(imp);

		// Side-effect imports (no identifiers) are never relevant to specific chunks
		if (info.identifiers.length === 0) continue;

		const isUsed = info.identifiers.some(id => {
			const pattern = new RegExp(`\\b${escapeRegExp(id)}\\b`);
			return pattern.test(chunkSource);
		});

		if (isUsed) {
			relevant.push(info.source);
		}
	}

	return relevant;
}

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
