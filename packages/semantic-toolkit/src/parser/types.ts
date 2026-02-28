/** Supported file extensions for TypeScript/JavaScript parsing. */
export const PARSEABLE_EXTENSIONS = new Set([
	'ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs',
]);

/** Symbol kinds that have bodies which contain nested declarations. */
export const BODY_BEARING_KINDS = new Set([
	'function', 'method', 'constructor', 'getter', 'setter',
	'class', 'interface', 'enum', 'namespace', 'module', 'staticBlock',
]);

/** Range within a file. Lines are 1-indexed. */
export interface SymbolRange {
	startLine: number;
	endLine: number;
}

/**
 * A parsed symbol extracted from a source file.
 * Represents any named or structural element: function, class, import, expression, etc.
 */
export interface ParsedSymbol {
	/** Symbol name. For imports: "import:moduleName". For expressions: truncated text. */
	name: string;

	/** Symbol kind. */
	kind:
		| 'function'
		| 'method'
		| 'class'
		| 'interface'
		| 'type'
		| 'enum'
		| 'enumMember'
		| 'variable'
		| 'const'
		| 'property'
		| 'constructor'
		| 'getter'
		| 'setter'
		| 'namespace'
		| 'module'
		| 'staticBlock'
		| 'import'
		| 'expression'
		| 're-export'
		| 'comment';

	/** Nesting depth. 0 = file root, 1 = class member, 2 = nested inside member, etc. */
	depth: number;

	/** Name of the parent symbol, or null for root-level symbols. */
	parentName: string | null;

	/** 1-indexed line range in the source file. */
	range: SymbolRange;

	/** Full type signature (e.g., "async validate(token: string): Promise<boolean>"). */
	signature: string;

	/** Modifiers: async, static, abstract, private, protected, readonly, exported, generator, default. */
	modifiers: string[];

	/** JSDoc comment text (without delimiters), or null if absent. */
	jsdoc: string | null;

	/** Whether this symbol is exported from its module. */
	exported: boolean;

	/** Nested child symbols. */
	children: ParsedSymbol[];
}

/** Result of parsing a single file. */
export interface ParsedFile {
	/** Absolute file path. */
	filePath: string;

	/** Workspace-relative path (forward slashes). */
	relativePath: string;

	/** All symbols including root-level items (imports, expressions, declarations). */
	symbols: ParsedSymbol[];

	/** Total line count of the file. */
	totalLines: number;

	/** True if the file has parse-level syntax errors. */
	hasSyntaxErrors: boolean;
}
