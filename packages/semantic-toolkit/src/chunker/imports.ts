import type { SourceFile, ImportDeclaration } from 'ts-morph';

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
 * Extract identifier names from an import declaration using ts-morph.
 */
function extractImportIdentifiers(decl: ImportDeclaration): ImportInfo {
	const source = decl.getText();
	const identifiers: string[] = [];

	// Default import: import Name from '...'
	const defaultImport = decl.getDefaultImport();
	if (defaultImport) {
		identifiers.push(defaultImport.getText());
	}

	// Namespace import: import * as Name from '...'
	const nsImport = decl.getNamespaceImport();
	if (nsImport) {
		identifiers.push(nsImport.getText());
	}

	// Named imports: import { A, B as C } from '...'
	for (const named of decl.getNamedImports()) {
		identifiers.push(named.getName());
	}

	return { source, identifiers };
}

/**
 * Resolve which imports are relevant to a chunk's source code.
 * An import is relevant if at least one of its identifiers appears
 * as a word boundary match in the chunk's source text.
 */
export function resolveRelevantImports(
	chunkSource: string,
	sourceFile: SourceFile,
): string[] {
	const imports = sourceFile.getImportDeclarations();
	if (imports.length === 0) return [];

	const relevant: string[] = [];

	for (const imp of imports) {
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
