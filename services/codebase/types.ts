// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure data types — no VS Code API dependency.

// ── Overview Types ───────────────────────────────────────

export interface OverviewParams {
	/** Folder to map. Absolute or relative to rootDir. */
	dir: string;
	/** When true, populate lineCount on file nodes and enable metadata display. */
	metadata?: boolean;
	/** When true, recurse into subdirectories. When false, show immediate children only. */
	recursive: boolean;
	/** Workspace root directory (used for .devtoolsignore resolution). */
	rootDir: string;
	/** When true, include symbol skeleton (name + kind, hierarchically nested). */
	symbols: boolean;
	/** Tool scope for per-tool .devtoolsignore sections (e.g. 'codebase_map'). */
	toolScope?: string;
}

export interface TreeNode {
	children?: TreeNode[];
	/** Immediate subdirectory count (populated on directory stubs when children aren't expanded). */
	dirCount?: number;
	/** Immediate file count (populated on directory stubs when children aren't expanded). */
	fileCount?: number;
	ignored?: boolean;
	lineCount?: number;
	name: string;
	/** Total symbol count including nested children (populated when metadata is enabled). */
	symbolCount?: number;
	symbols?: SymbolNode[];
	/** Aggregate reference count across all symbols in this file. */
	totalReferences?: number;
	type: 'directory' | 'file';
}

export interface SymbolNode {
	children?: SymbolNode[];
	detail?: string;
	/** Number of implementations of this symbol (interfaces, abstract members). */
	implementationCount?: number;
	kind: string;
	name: string;
	range: { start: number; end: number };
	/** Number of references to this symbol across the codebase. */
	referenceCount?: number;
}

export interface OverviewResult {
	projectRoot: string;
	summary: {
		totalFiles: number;
		totalDirectories: number;
		totalSymbols: number;
		diagnosticCounts?: { errors: number; warnings: number };
	};
	tree: TreeNode[];
}

// ── Exports Types ────────────────────────────────────────

export interface ExportsParams {
	includeJSDoc?: boolean;
	includeTypes?: boolean;
	kind?: string;
	path: string;
	rootDir: string;
}

export interface ExportInfo {
	isDefault: boolean;
	isReExport: boolean;
	jsdoc?: string;
	kind: string;
	line: number;
	name: string;
	reExportSource?: string;
	signature?: string;
}

export interface ExportsResult {
	exports: ExportInfo[];
	module: string;
	reExports: Array<{ name: string; from: string }>;
	summary: string;
}

// ── Trace Symbol Types ───────────────────────────────────

export interface TraceSymbolParams {
	depth?: number;
	file?: string;
	include?: string[];
	includeImpact?: boolean;
	/** Max references to return (default: 500). Prevents runaway scans on large codebases. */
	maxReferences?: number;
	rootDir: string;
	symbol: string;
	/** Timeout in milliseconds (default: 30000). Returns partial results if exceeded. */
	timeout?: number;
}

export interface SymbolLocationInfo {
	column: number;
	file: string;
	kind?: string;
	line: number;
	signature?: string;
	unresolved?: boolean;
}

export interface ReferenceInfo {
	column: number;
	context: string;
	file: string;
	kind: 'call' | 'import' | 'read' | 'type-ref' | 'unknown' | 'write';
	line: number;
}

export interface ReExportInfo {
	exportedAs: string;
	file: string;
	from: string;
	line: number;
	originalName: string;
}

export interface CallChainNode {
	column: number;
	file: string;
	line: number;
	symbol: string;
}

export interface CallChainInfo {
	incomingCalls: CallChainNode[];
	incomingTruncated?: boolean;
	outgoingCalls: CallChainNode[];
	outgoingTruncated?: boolean;
}

export interface TypeFlowInfo {
	direction: 'extends' | 'implements' | 'parameter' | 'property' | 'return';
	traceTo?: { symbol: string; file: string; line: number };
	type: string;
}

export interface ImpactDependentInfo {
	file: string;
	kind: string;
	line: number;
	symbol: string;
}

export interface ImpactInfo {
	directDependents: ImpactDependentInfo[];
	impactSummary: {
		directFiles: number;
		transitiveFiles: number;
		totalSymbolsAffected: number;
		riskLevel: 'high' | 'low' | 'medium';
	};
	transitiveDependents: ImpactDependentInfo[];
}

export interface TypeHierarchyNode {
	column: number;
	file: string;
	kind: 'class' | 'interface' | 'type-alias';
	line: number;
	name: string;
}

export interface TypeHierarchyInfo {
	stats: {
		totalSupertypes: number;
		totalSubtypes: number;
		maxDepth: number;
	};
	subtypes: TypeHierarchyNode[];
	supertypes: TypeHierarchyNode[];
}

export interface TraceSymbolResult {
	/** Metadata when call hierarchy depth was auto-reduced to stay within token budget. */
	_autoOptimizedCallDepth?: {
		requestedDepth: number;
		usedDepth: number;
		reason: string;
	};
	callChain: CallChainInfo;
	definition?: SymbolLocationInfo;
	/** Diagnostic messages (e.g., excessive node_modules references, pattern match warnings). */
	diagnostics?: string[];
	/** Calculated effective timeout in milliseconds (max of user timeout and dynamic calculation). */
	effectiveTimeout?: number;
	/** Elapsed time in milliseconds. */
	elapsedMs?: number;
	/** Error message if an error occurred during tracing. */
	errorMessage?: string;
	hierarchy?: TypeHierarchyInfo;
	impact?: ImpactInfo;
	/** Reason why symbol was not found (if definition is missing). */
	notFoundReason?: 'file-not-in-project' | 'no-matching-files' | 'no-project' | 'parse-error' | 'symbol-not-found';
	/** True if results were truncated due to timeout or maxReferences limit. */
	partial?: boolean;
	/** Reason for partial results (e.g., 'timeout', 'max-references'). */
	partialReason?: 'max-references' | 'timeout';
	reExports: ReExportInfo[];
	references: ReferenceInfo[];
	/** Resolved absolute path used as the project root. */
	resolvedRootDir?: string;
	/** Number of source files in the project (for diagnostics). */
	sourceFileCount?: number;
	summary: {
		totalReferences: number;
		totalFiles: number;
		maxCallDepth: number;
	};
	symbol: string;
	typeFlows: TypeFlowInfo[];
}

// ── Unused Symbol Detection Types ────────────────────────

export interface DeadCodeParams {
	/** Exclude test files (files matching *.test.*, *.spec.*, __tests__/*). Default: true */
	excludeTests?: boolean;
	/** Only check exported symbols (default: true). When false, also detects unreachable non-exported functions and dead variables. */
	exportedOnly?: boolean;
	/** Symbol kinds to check (default: all) */
	kinds?: string[];
	/** Max symbols to return (default: 100) */
	limit?: number;
	/** File or glob pattern to search within (e.g., 'src/**\/*.ts') */
	pattern?: string;
	rootDir: string;
}

export interface DeadCodeItem {
	/** Detection confidence: high = zero refs, medium = likely unused, low = possibly unused. */
	confidence: 'high' | 'low' | 'medium';
	exported: boolean;
	file: string;
	kind: string;
	line: number;
	name: string;
	/** Why this symbol is considered dead code. */
	reason: string;
}

export interface DeadCodeResult {
	deadCode: DeadCodeItem[];
	/** Diagnostic messages (e.g., excessive node_modules references, pattern match warnings). */
	diagnostics?: string[];
	/** Error message if scan failed. */
	errorMessage?: string;
	/** Resolved absolute path used as the project root. */
	resolvedRootDir?: string;
	summary: {
		totalScanned: number;
		totalDead: number;
		scanDurationMs: number;
		byKind?: Record<string, number>;
	};
}

/** File extensions that ts-morph can parse for import extraction */
export const /**
	 *
	 */
	TS_PARSEABLE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs']);

/**
 * Symbol kinds that represent body-bearing constructs (functions, classes, etc.).
 * In file-overview mode these stay as skeleton stubs. Shared across extension
 * host and MCP server to avoid duplication.
 */
export const BODY_BEARING_KINDS: ReadonlySet<string> = new Set([
	'function', 'method', 'constructor', 'getter', 'setter',
	'class', 'interface', 'enum',
]);

// ── Shared File Structure Types (Multi-Language) ─────────

/**
 * Range within a file. Lines are 1-indexed; columns are 0-indexed and optional.
 * TS/JS provides columns, but many languages (Markdown, JSON) only need lines.
 */
export interface FileSymbolRange {
	endChar?: number;
	endLine: number;
	startChar?: number;
	startLine: number;
}

/** Shared symbol interface for all file types. */
export interface FileSymbol {
	children: FileSymbol[];
	detail?: string;
	exported?: boolean;
	/** Number of implementations of this symbol (interfaces, abstract members). */
	implementationCount?: number;
	kind: string;
	modifiers?: string[];
	name: string;
	range: FileSymbolRange;
	/** Number of references to this symbol across the codebase. */
	referenceCount?: number;
}

export interface FileStructureStats {
	coveragePercent: number;
	totalBlankLines: number;
	totalSymbols: number;
}

/** Shared structure returned by all language service extractors. */
export interface FileStructure {
	content: string;
	fileType: 'json' | 'markdown' | 'typescript' | 'unknown';
	gaps: Array<{ start: number; end: number; type: 'blank' | 'unknown' }>;
	stats: FileStructureStats;
	symbols: FileSymbol[];
	totalLines: number;
}

// ── Chunk Types (Hierarchical Chunker) ───────────────────

/**
 * A chunk produced by the hierarchical chunker.
 * Contains text content, metadata, and parent/child relationships
 * for use across file_read, file_edit, and codebase_search.
 */
export interface Chunk {
	/** Full path from root symbol (e.g., "UserService > findById") */
	breadcrumb: string;
	/** Chunk IDs of direct children */
	childChunkIds: string[];
	/** The text content of this chunk */
	content: string;
	/** Hierarchy depth (0 = file-level, 1 = top-level symbol, 2 = member, etc.) */
	depth: number;
	/** Relative file path (from workspace root) */
	filePath: string;
	/** Deterministic ID derived from file path + symbol breadcrumb + range */
	id: string;
	/** Chunk ID of the parent (null for top-level chunks) */
	parentChunkId: null | string;
	/** 1-indexed line range in the source file */
	range: { start: number; end: number };
	/** Symbol kind (e.g., "class", "method", "function", "heading") */
	symbolKind: string;
	/** Human-readable symbol name (e.g., "UserService.findById") */
	symbolName: string;
	/** Approximate token count of the content */
	tokenCount: number;
}

/**
 * Parameters for the chunking operation.
 */
export interface ChunkFileParams {
	/** Absolute file path */
	filePath: string;
	/** Max hierarchy depth to chunk (default: Infinity) */
	maxDepth?: number;
	/** Workspace root for computing relative paths */
	rootDir: string;
	/** Max tokens per chunk before splitting (default: 512) */
	tokenBudget?: number;
}

/**
 * Result of chunking a single file.
 */
export interface ChunkFileResult {
	/** All chunks from this file, flat array with parent/child pointers */
	chunks: Chunk[];
	/** Chunking statistics */
	stats: {
		totalChunks: number;
		maxDepth: number;
		oversizedSplits: number;
	};
	/** The SymbolNode tree that was used for chunking */
	symbols: SymbolNode[];
}

// ── Import Graph Types ───────────────────────────────────

export interface ImportGraphParams {
	rootDir: string;
}

export interface ImportGraphModule {
	/** Modules that import this file (relative paths) */
	importedBy: string[];
	/** Modules this file imports (relative paths) */
	imports: string[];
	/** Relative path of the module */
	path: string;
}

export interface CircularChain {
	/** Sequence of module paths forming the cycle, ending with a repeat of the first */
	chain: string[];
}

export interface ImportGraphResult {
	/** Detected circular dependency chains */
	circular: CircularChain[];
	/** Map of module path → import/importedBy */
	modules: Record<string, ImportGraphModule>;
	/** Modules with no importers (potential entry points or orphans) */
	orphans: string[];
	stats: {
		totalModules: number;
		totalEdges: number;
		circularCount: number;
		orphanCount: number;
	};
}

// ── Duplicate Detection Types ────────────────────────────

export interface DuplicateDetectionParams {
	/** Kinds to check for duplicates */
	kinds?: string[];
	/** Max results. Default: 50 */
	limit?: number;
	rootDir: string;
	/** Minimum similarity threshold (0-1). Default: 0.9 */
	threshold?: number;
}

export interface DuplicateGroup {
	/** Structural hash of the duplicate */
	hash: string;
	/** The duplicate instances */
	instances: DuplicateInstance[];
	/** Kind of the duplicated symbol (function, class, etc.) */
	kind: string;
	/** Number of lines in each instance */
	lineCount: number;
}

export interface DuplicateInstance {
	/** End line */
	endLine: number;
	/** File path */
	file: string;
	/** Start line */
	line: number;
	/** Symbol name */
	name: string;
}

export interface DuplicateDetectionResult {
	diagnostics?: string[];
	errorMessage?: string;
	/** Groups of duplicated code */
	groups: DuplicateGroup[];
	resolvedRootDir?: string;
	summary: {
		totalGroups: number;
		totalDuplicateInstances: number;
		filesWithDuplicates: number;
		scanDurationMs: number;
	};
}
