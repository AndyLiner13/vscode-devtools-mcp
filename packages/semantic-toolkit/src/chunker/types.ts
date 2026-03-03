/**
 * A code chunk ready for embedding. Represents a single embeddable unit
 * derived directly from ts-morph's AST.
 *
 * All hierarchy information (name, kind, parent, depth) is encoded in
 * the `symbolPath` field — a kind-annotated materialized path.
 * Use parser functions from `../indexer/symbol-path.js` to extract components.
 */
export interface CodeChunk {
	/** Absolute file path. */
	filePath: string;

	/**
	 * Kind-annotated materialized path encoding the full hierarchy.
	 * Format: "Kind:Name.Kind:Name" at each level, dot-separated.
	 * Example: "ClassDeclaration:AuthService.MethodDeclaration:validateToken"
	 *
	 * Composite key: filePath + symbolPath uniquely identifies every chunk.
	 * All hierarchy queries reduce to prefix matching (no joins needed).
	 */
	symbolPath: string;

	/** 1-indexed start line in the source file. */
	startLine: number;

	/** 1-indexed end line in the source file. */
	endLine: number;

	/**
	 * Source code with body-bearing children collapsed to stubs.
	 * For leaf symbols, this equals the full source.
	 * Raw code only — serves as both display output and embedding input.
	 */
	chunkContent: string;
}

/** Result of chunking a single source file. */
export interface ChunkedFile {
	/** Absolute file path from sourceFile.getFilePath(). */
	filePath: string;

	/** All chunks produced from this file. */
	chunks: CodeChunk[];

	/**
	 * Maps symbolPath → ts-morph Node that produced the chunk.
	 * Available only during in-memory flows; not serializable.
	 * Used by resolvers that need the live AST node.
	 */
	nodeMap: Map<string, import('ts-morph').Node>;
}
