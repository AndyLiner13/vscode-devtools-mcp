export interface CommentNode {
	/** Comment kind from classifyComment (jsdoc, block-comment, line-comment, etc.) */
	kind: string;
	/** 1-indexed line range in the source file */
	range: { startLine: number; endLine: number };
	/** Raw comment text including delimiters (// or /* *\/) */
	text: string;
}

export interface TfIdfIdentifier {
	/** The original comment node this was generated for */
	source: CommentNode;
	/** Generated slug identifier, e.g. "authentication-timeout" */
	slug: string;
	/** Top N terms with their TF-IDF scores */
	terms: Array<{ term: string; score: number }>;
}

export interface TfIdfConfig {
	/** Number of top terms to include in the identifier (default: 3) */
	topTerms?: number;
}

export interface RegistryEntry {
	/** Hash of comment text for staleness detection */
	contentHash: string;
	/** Generated identifier slug */
	identifier: string;
	/** 1-indexed line range */
	range: { startLine: number; endLine: number };
}
