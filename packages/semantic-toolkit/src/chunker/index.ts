import type { ParsedFile, ParsedSymbol } from '../parser/types';
import { BODY_BEARING_KINDS } from '../parser/types';
import type { CodeChunk, ChunkedFile } from './types';
import { collapseChildren } from './collapse';
import { generateChunkId, buildBreadcrumb } from './ids';
import { resolveRelevantImports } from './imports';

export type { CodeChunk, ChunkedFile } from './types';
export { BODY_BEARING_KINDS } from '../parser/types';

/**
 * Chunk a parsed file into embeddable CodeChunk[].
 * Each symbol in the tree becomes a chunk. Body-bearing children
 * are collapsed to signature stubs in the parent's embeddingText.
 */
export function chunkFile(
	parsedFile: ParsedFile,
	sourceContent: string,
): ChunkedFile {
	const fileLines = sourceContent.split('\n');

	// Collect all import symbols for relevantImports resolution
	const allImports = parsedFile.symbols.filter(s => s.kind === 'import');

	// First pass: generate all chunk IDs so we can link parent/child
	const idMap = new Map<string, string>();
	buildIdMap(parsedFile.symbols, parsedFile.filePath, [], idMap);

	// Second pass: create chunks
	const chunks: CodeChunk[] = [];
	createChunks(
		parsedFile.symbols,
		parsedFile.filePath,
		parsedFile.relativePath,
		fileLines,
		allImports,
		[],
		null,
		idMap,
		chunks,
	);

	return { parsedFile, chunks };
}

/**
 * Recursively build the ID map for all symbols.
 */
function buildIdMap(
	symbols: ParsedSymbol[],
	filePath: string,
	parentChain: string[],
	idMap: Map<string, string>,
): void {
	for (const sym of symbols) {
		const key = makeKey(sym, parentChain);
		const id = generateChunkId(filePath, sym.kind, sym.name, sym.range.startLine, parentChain);
		idMap.set(key, id);

		if (sym.children.length > 0) {
			buildIdMap(sym.children, filePath, [...parentChain, sym.name], idMap);
		}
	}
}

/**
 * Recursively create chunks from the symbol tree.
 */
function createChunks(
	symbols: ParsedSymbol[],
	filePath: string,
	relativePath: string,
	fileLines: string[],
	allImports: ParsedSymbol[],
	parentChain: string[],
	parentChunkId: string | null,
	idMap: Map<string, string>,
	chunks: CodeChunk[],
): void {
	for (const sym of symbols) {
		const key = makeKey(sym, parentChain);
		const chunkId = idMap.get(key);
		if (!chunkId) continue;

		// Filter out same-line children: children whose line range matches
		// the parent's exactly contain no unique content worth embedding separately.
		const chunkableChildren = sym.children.filter(
			child =>
				child.range.startLine !== sym.range.startLine ||
				child.range.endLine !== sym.range.endLine,
		);

		// Extract full source from file lines
		const startIdx = sym.range.startLine - 1;
		const endIdx = sym.range.endLine;
		const fullSource = fileLines.slice(startIdx, endIdx).join('\n');

		// Build embedding text (source with body-bearing children collapsed)
		// Only collapse chunkable children (same-line children stay inline)
		const embeddingText = collapseChildren(
			fullSource,
			sym.range.startLine,
			chunkableChildren,
			fileLines,
		);

		// Resolve child chunk IDs (only for chunkable children)
		const childChain = [...parentChain, sym.name];
		const childChunkIds: string[] = [];
		for (const child of chunkableChildren) {
			const childKey = makeKey(child, childChain);
			const childId = idMap.get(childKey);
			if (childId) childChunkIds.push(childId);
		}

		// Resolve relevant imports (only for symbols that reference other code)
		const relevantImports = (sym.kind === 'import' || sym.kind === 're-export' || sym.kind === 'comment')
			? []
			: resolveRelevantImports(fullSource, allImports);

		const breadcrumb = buildBreadcrumb(relativePath, sym.name, parentChain);

		chunks.push({
			id: chunkId,
			filePath,
			relativePath,
			nodeKind: sym.kind,
			name: sym.name,
			parentName: sym.parentName,
			parentChunkId,
			childChunkIds,
			depth: sym.depth,
			signature: sym.signature,
			fullSource,
			startLine: sym.range.startLine,
			endLine: sym.range.endLine,
			jsdoc: sym.jsdoc,
			relevantImports,
			embeddingText,
			breadcrumb,
		});

		// Recurse into chunkable children only
		if (chunkableChildren.length > 0) {
			createChunks(
				chunkableChildren,
				filePath,
				relativePath,
				fileLines,
				allImports,
				childChain,
				chunkId,
				idMap,
				chunks,
			);
		}
	}
}

/**
 * Create a unique key for a symbol within its parent chain.
 * Used for the ID map lookup since multiple symbols can share names
 * (e.g., overloaded functions, declaration merging).
 */
function makeKey(sym: ParsedSymbol, parentChain: string[]): string {
	return [...parentChain, sym.kind, sym.name, String(sym.range.startLine)].join('::');
}
