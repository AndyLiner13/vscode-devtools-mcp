import type { ParsedFile } from '../parser/types';

/**
 * A code chunk ready for embedding. Represents a single embeddable unit
 * derived from the parser's symbol tree.
 *
 * embeddingText contains raw source code with body-bearing children collapsed
 * to signature stubs only — no metadata preamble. All metadata (file path,
 * breadcrumb, depth, etc.) is stored in separate LanceDB schema fields.
 * This maximizes the semantic signal per token for the embedding model.
 */
export interface CodeChunk {
	/** Deterministic ID: hash of filePath + nodeKind + name + parentChain. */
	id: string;

	/** Absolute file path. */
	filePath: string;

	/** Workspace-relative path (forward slashes). */
	relativePath: string;

	/** Symbol kind from the parser. */
	nodeKind: string;

	/** Symbol name. */
	name: string;

	/** Parent symbol name, if this is a nested symbol. */
	parentName: string | null;

	/** ID of the parent chunk for hierarchical navigation. Null for root-level. */
	parentChunkId: string | null;

	/** IDs of direct child chunks. */
	childChunkIds: string[];

	/** Nesting depth (0 = top-level). */
	depth: number;

	/** Full type signature. */
	signature: string;

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
	 * Source code with body-bearing children collapsed to signature-only stubs.
	 * For leaf symbols, this equals fullSource.
	 * No metadata preamble — raw code only.
	 */
	embeddingText: string;

	/**
	 * Breadcrumb path: "file > parent > ... > name".
	 * Built from the actual hierarchy.
	 */
	breadcrumb: string;
}

/** Result of chunking a single parsed file. */
export interface ChunkedFile {
	/** The original parsed file metadata. */
	parsedFile: ParsedFile;

	/** All chunks produced from this file. */
	chunks: CodeChunk[];
}
