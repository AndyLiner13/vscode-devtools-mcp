import type { ParsedFile, ParsedSymbol } from './types.js';

import { Project } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import * as path from 'node:path';

import { extractFileSymbols } from './extractors.js';
import { extractRootContent } from './root-content.js';
import { PARSEABLE_EXTENSIONS } from './types.js';

export { PARSEABLE_EXTENSIONS } from './types.js';
export type { ParsedFile, ParsedSymbol, SymbolRange } from './types.js';
export { extractFileSymbols } from './extractors.js';
export { extractRootContent } from './root-content.js';
export { extractSignature } from './signatures.js';

/**
 * Parse a single TypeScript/JavaScript source file into a ParsedFile.
 * Uses ts-morph under the hood for AST analysis.
 */
export function parseFile(filePath: string, workspaceRoot: string): ParsedFile {
	const ext = path.extname(filePath).replace('.', '');
	if (!PARSEABLE_EXTENSIONS.has(ext)) {
		throw new Error(`Unsupported file extension: .${ext}`);
	}

	const project = new Project({ useInMemoryFileSystem: false });
	const sourceFile = project.addSourceFileAtPath(filePath);
	return buildParsedFile(sourceFile, filePath, workspaceRoot);
}

/**
 * Parse source code from a string (useful for testing).
 * The filePath is used for the output metadata only.
 */
export function parseSource(
	source: string,
	filePath: string,
	workspaceRoot: string,
): ParsedFile {
	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile(filePath, source);
	return buildParsedFile(sourceFile, filePath, workspaceRoot);
}

/**
 * Parse multiple files in a shared project context.
 * More efficient than calling parseFile() repeatedly since it shares a single ts-morph Project.
 */
export function parseFiles(filePaths: string[], workspaceRoot: string): ParsedFile[] {
	const project = new Project({ useInMemoryFileSystem: false });
	const results: ParsedFile[] = [];

	for (const filePath of filePaths) {
		const ext = path.extname(filePath).replace('.', '');
		if (!PARSEABLE_EXTENSIONS.has(ext)) continue;

		try {
			const sourceFile = project.addSourceFileAtPath(filePath);
			results.push(buildParsedFile(sourceFile, filePath, workspaceRoot));
		} catch {
			// Skip files that can't be parsed
		}
	}

	return results;
}

// ── Internal ──

function buildParsedFile(
	sourceFile: SourceFile,
	filePath: string,
	workspaceRoot: string,
): ParsedFile {
	const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
	const totalLines = sourceFile.getEndLineNumber();

	// Only check syntactic diagnostics — semantic checking crashes without type definitions
	const project = sourceFile.getProject();
	const syntacticDiagnostics = project.getProgram().compilerObject
		.getSyntacticDiagnostics(sourceFile.compilerNode);
	const hasSyntaxErrors = syntacticDiagnostics.length > 0;

	// Combine declaration symbols and root content
	const declarations = extractFileSymbols(sourceFile);
	const rootContent = extractRootContent(sourceFile);

	// Deduplicate: root content should not overlap with declarations on the same line
	const declLines = new Set<number>();
	for (const sym of declarations) {
		declLines.add(sym.range.startLine);
	}
	const uniqueRootContent = rootContent.filter(sym => !declLines.has(sym.range.startLine));

	const symbols = [...declarations, ...uniqueRootContent];
	symbols.sort((a, b) => a.range.startLine - b.range.startLine);

	return {
		filePath,
		relativePath,
		symbols,
		totalLines,
		hasSyntaxErrors,
	};
}
