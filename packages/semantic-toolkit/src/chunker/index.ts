import type { SourceFile, Node } from 'ts-morph';
import type { CodeChunk, ChunkedFile } from './types.js';
import { hasBody, buildEmbeddingText } from './collapse.js';
import { generateChunkId } from './ids.js';
import { resolveRelevantImports } from './imports.js';

export type { CodeChunk, ChunkedFile } from './types.js';
export { hasBody } from './collapse.js';

/**
 * Chunk a source file into embeddable CodeChunk[].
 * Uses the compiler's symbol table (getLocals) for named declarations,
 * plus getStatementsWithComments() for non-symbol root content
 * (imports, expressions, re-exports, standalone comments).
 * No custom AST walking. No workspaceRoot.
 */
export function chunkFile(sourceFile: SourceFile): ChunkedFile {
	const chunks: CodeChunk[] = [];
	const nodeMap = new Map<string, Node>();
	const chunkedNodePositions = new Set<number>();

	// 1. Named symbols: use the compiler's symbol table directly.
	//    getLocals() returns every named binding in the file's scope.
	for (const sym of sourceFile.getLocals()) {
		for (const decl of sym.getDeclarations()) {
			const chunk = chunkNode(decl, sourceFile, null, 0);
			chunks.push(chunk);
			nodeMap.set(chunk.id, decl);
			chunkedNodePositions.add(decl.getStart());

			// Recurse into members of containers (classes, interfaces, enums)
			if ('getMembers' in decl && typeof (decl as Record<string, unknown>).getMembers === 'function') {
				const members = (decl as unknown as { getMembers(): Node[] }).getMembers();
				for (const member of members) {
					if (hasBody(member)) {
						const memberChunk = chunkNode(member, sourceFile, getChunkLabel(decl), 1);
						chunks.push(memberChunk);
						nodeMap.set(memberChunk.id, member);
						chunkedNodePositions.add(member.getStart());
					}
				}
			}
		}
	}

	// 2. Non-symbol root content: imports, expressions, re-exports, standalone comments.
	for (const stmt of sourceFile.getStatementsWithComments()) {
		if (!chunkedNodePositions.has(stmt.getStart()) && !isChildOfChunkedNode(stmt, chunkedNodePositions)) {
			const chunk = chunkNode(stmt, sourceFile, null, 0);
			chunks.push(chunk);
			nodeMap.set(chunk.id, stmt);
		}
	}

	// Link parent/child chunk IDs
	linkParentChild(chunks);

	return { filePath: sourceFile.getFilePath(), chunks, nodeMap };
}

/**
 * Create a CodeChunk for a single ts-morph node.
 * Used by both batch indexing and direct lookup.
 */
export function chunkNode(
	node: Node,
	sourceFile: SourceFile,
	parentName: string | null,
	depth: number,
): CodeChunk {
	const name = getChunkLabel(node);
	const parentChain = parentName ? [parentName] : [];

	const fullSource = node.getText();
	const embeddingText = buildEmbeddingText(node);
	const relevantImports = resolveRelevantImports(fullSource, sourceFile);
	const jsdoc = extractJsDoc(node);

	return {
		id: generateChunkId(sourceFile.getFilePath(), node.getKindName(), name, node.getStartLineNumber(), parentChain),
		filePath: sourceFile.getFilePath(),
		nodeKind: node.getKindName(),
		name,
		parentName,
		parentChunkId: null,
		childChunkIds: [],
		depth,
		fullSource,
		startLine: node.getStartLineNumber(),
		endLine: node.getEndLineNumber(),
		jsdoc,
		relevantImports,
		embeddingText,
	};
}

/**
 * Get a label for a chunk node.
 * Named declarations use getName(); non-symbol content uses getKindName().
 */
function getChunkLabel(node: Node): string {
	if ('getName' in node && typeof (node as Record<string, unknown>).getName === 'function') {
		const name = (node as unknown as { getName(): string | undefined }).getName();
		if (name) return name;
	}
	return node.getKindName();
}

/**
 * Extract JSDoc comment text from a node, if present.
 */
function extractJsDoc(node: Node): string | null {
	if ('getJsDocs' in node && typeof (node as Record<string, unknown>).getJsDocs === 'function') {
		const jsDocs = (node as unknown as { getJsDocs(): Array<{ getDescription(): string }> }).getJsDocs();
		if (jsDocs.length > 0) {
			return jsDocs.map(doc => doc.getDescription().trim()).filter(Boolean).join('\n') || null;
		}
	}
	return null;
}

/**
 * Check if a statement is a child of an already-chunked node.
 * Prevents double-chunking VariableStatements whose VariableDeclarations
 * were already chunked via getLocals().
 */
function isChildOfChunkedNode(stmt: Node, chunkedPositions: Set<number>): boolean {
	// VariableStatements wrap VariableDeclarations; if the inner declaration
	// was chunked via getLocals(), skip the outer statement.
	if (stmt.getKindName() === 'VariableStatement') {
		const children = stmt.getChildren();
		for (const child of children) {
			if (child.getKindName() === 'VariableDeclarationList') {
				const innerChildren = child.getChildren();
				for (const inner of innerChildren) {
					if (chunkedPositions.has(inner.getStart())) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

/**
 * Link parent/child chunk IDs after all chunks are created.
 */
function linkParentChild(chunks: CodeChunk[]): void {
	const chunkByNameAndDepth = new Map<string, CodeChunk>();
	for (const chunk of chunks) {
		if (chunk.depth === 0) {
			chunkByNameAndDepth.set(chunk.name, chunk);
		}
	}

	for (const chunk of chunks) {
		if (chunk.parentName !== null) {
			const parent = chunkByNameAndDepth.get(chunk.parentName);
			if (parent) {
				chunk.parentChunkId = parent.id;
				parent.childChunkIds.push(chunk.id);
			}
		}
	}
}
