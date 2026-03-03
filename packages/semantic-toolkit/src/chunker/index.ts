import type { SourceFile, Node } from 'ts-morph';
import type { CodeChunk, ChunkedFile } from './types.js';
import { hasBody, buildEmbeddingText } from './collapse.js';
import { buildSymbolPath } from '../indexer/symbol-path.js';

export type { CodeChunk, ChunkedFile } from './types.js';
export { hasBody } from './collapse.js';

/**
 * Chunk a source file into embeddable CodeChunk[].
 * Uses the compiler's symbol table (getLocals) for named declarations,
 * plus getStatementsWithComments() for non-symbol root content
 * (imports, expressions, re-exports, standalone comments).
 */
export function chunkFile(sourceFile: SourceFile): ChunkedFile {
	const chunks: CodeChunk[] = [];
	const nodeMap = new Map<string, Node>();
	const chunkedNodePositions = new Set<number>();

	// 1. Named symbols via the compiler's symbol table.
	for (const sym of sourceFile.getLocals()) {
		for (const decl of sym.getDeclarations()) {
			const chunk = chunkNode(decl, sourceFile, []);
			chunks.push(chunk);
			nodeMap.set(chunk.symbolPath, decl);
			chunkedNodePositions.add(decl.getStart());

			// Recurse into body-bearing members of containers (classes, interfaces, enums)
			if ('getMembers' in decl && typeof (decl as Record<string, unknown>).getMembers === 'function') {
				const members = (decl as unknown as { getMembers(): Node[] }).getMembers();
				for (const member of members) {
					if (hasBody(member)) {
						const memberChunk = chunkNode(member, sourceFile, [decl]);
						chunks.push(memberChunk);
						nodeMap.set(memberChunk.symbolPath, member);
						chunkedNodePositions.add(member.getStart());
					}
				}
			}
		}
	}

	// 2. Non-symbol root content: imports, expressions, re-exports, standalone comments.
	for (const stmt of sourceFile.getStatementsWithComments()) {
		if (!chunkedNodePositions.has(stmt.getStart()) && !isChildOfChunkedNode(stmt, chunkedNodePositions)) {
			const chunk = chunkNode(stmt, sourceFile, []);
			chunks.push(chunk);
			nodeMap.set(chunk.symbolPath, stmt);
		}
	}

	return { filePath: sourceFile.getFilePath(), chunks, nodeMap };
}

/**
 * Create a CodeChunk for a single ts-morph node.
 *
 * @param node       - The AST node to chunk.
 * @param sourceFile - The source file containing the node.
 * @param ancestors  - Ancestor nodes ordered root-to-parent (outermost first).
 */
export function chunkNode(
	node: Node,
	sourceFile: SourceFile,
	ancestors: Node[],
): CodeChunk {
	const symbolPath = buildSymbolPath(node, ancestors);
	const chunkContent = buildEmbeddingText(node);

	return {
		filePath: sourceFile.getFilePath(),
		symbolPath,
		startLine: node.getStartLineNumber(),
		endLine: node.getEndLineNumber(),
		chunkContent,
	};
}

/**
 * Check if a statement is a child of an already-chunked node.
 * Prevents double-chunking VariableStatements whose VariableDeclarations
 * were already chunked via getLocals().
 */
function isChildOfChunkedNode(stmt: Node, chunkedPositions: Set<number>): boolean {
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
