/**
 * A code chunk ready for embedding. Represents a single embeddable unit
 * derived directly from ts-morph's AST.
 *
 * embeddingText contains raw source code with body-bearing children collapsed
 * to stubs — no metadata preamble. All metadata (file path, depth, etc.) is
 * stored in separate LanceDB schema fields.
 */
export interface CodeChunk {
	/** Deterministic ID: hash of filePath + nodeKind + name + startLine + parentChain. */
	id: string;

	/** Absolute file path. */
	filePath: string;

	/** ts-morph kind name (e.g. 'FunctionDeclaration', 'ClassDeclaration'). */
	nodeKind: string;

	/** Symbol name, or kind name for non-symbol root content. */
	name: string;

	/** Parent symbol name, if this is a nested symbol. */
	parentName: string | null;

	/** ID of the parent chunk for hierarchical navigation. Null for root-level. */
	parentChunkId: string | null;

	/** IDs of direct child chunks. */
	childChunkIds: string[];

	/** Nesting depth (0 = top-level). */
	depth: number;

	/** Complete raw source of the node — returned to Copilot. */
	fullSource: string;

	/** 1-indexed start line in the source file. */
	startLine: number;

	/** 1-indexed end line in the source file. */
	endLine: number;

	/** JSDoc comment text, or null. */
	jsdoc: string | null;

	/** Import statements actually used by this chunk's source code. */
	relevantImports: string[];

	/**
	 * Source code with body-bearing children collapsed to stubs.
	 * For leaf symbols, this equals fullSource.
	 * No metadata preamble — raw code only.
	 */
	embeddingText: string;
}

/** Result of chunking a single source file. */
export interface ChunkedFile {
	/** Absolute file path from sourceFile.getFilePath(). */
	filePath: string;

	/** All chunks produced from this file. */
	chunks: CodeChunk[];

	/**
	 * Maps chunk ID → ts-morph Node that produced the chunk.
	 * Available only during in-memory flows; not serializable.
	 * Used by resolvers that need the live AST node.
	 */
	nodeMap: Map<string, import('ts-morph').Node>;
}
