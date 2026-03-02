/**
 * Phase 6 — Symbol Lookup.
 *
 * Main entry point for the direct symbol lookup module. Detects
 * `symbol = ...` queries, resolves matching symbols, passes them
 * to the graph module for enrichment + rendering, and generates
 * smart snapshots.
 *
 * TODO(Phase 7): Replace fresh chunking with indexed chunk retrieval from LanceDB.
 *
 * Usage:
 *   const result = lookupSymbol(query, workspaceRoot, filePaths, tokenBudget);
 *   if (!result.isSymbolLookup) { // proceed with full pipeline }
 */

import { Project } from 'ts-morph';

import { chunkFile } from '../chunker/index.js';
import type { ChunkedFile, CodeChunk } from '../chunker/types.js';

import type { TsLsConfig } from '../ts-ls/types.js';

import { generateConnectionGraphFromChunks } from '../graph/index.js';

import { generateSnapshot } from '../snapshot/index.js';

import { parseSymbolQuery } from './parse-query.js';
import { resolveSymbol, formatCaseHint, formatPathHint, formatAmbiguityHint, formatLocalHint } from './resolve.js';
import type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
	OutputSections,
	ResolvedMatch,
} from './types.js';

export type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
	OutputSections,
	ParsedSymbolPath,
	QueryParseResult,
	ResolvedMatch,
	NearMatch,
	ResolutionResult,
} from './types.js';

export { parseSymbolQuery } from './parse-query.js';
export { resolveSymbol, formatCaseHint, formatPathHint, formatAmbiguityHint } from './resolve.js';

/**
 * Perform a symbol lookup against the workspace.
 *
 * If the query has a `symbol = ` prefix, resolves the symbol directly
 * (no vector search). Otherwise returns `{ isSymbolLookup: false }` so
 * the caller can proceed with the full search pipeline.
 *
 * TODO(Phase 7): Replace fresh parsing with indexed chunk retrieval.
 *
 * @param query         - The raw user query string.
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param filePaths     - Absolute paths to all supported source files.
 * @param tokenBudget   - Maximum token budget for the rendered output.
 * @param tsLsConfig    - Optional TS LS configuration (callDepth, typeDepth).
 * @returns LookupResult (either found symbols or "not a lookup").
 */
export function lookupSymbol(
	query: string,
	workspaceRoot: string,
	filePaths: string[],
	tokenBudget: number,
	tsLsConfig?: Partial<TsLsConfig>,
): LookupResult {
	// Step 1: Parse query for symbol lookup prefix
	const parsed = parseSymbolQuery(query);

	if (!parsed.isSymbolLookup || parsed.path === null) {
		return { isSymbolLookup: false } satisfies NotALookupResult;
	}

	// Step 2: Create ts-morph project + chunk all files
	// TODO(Phase 7): Replace with indexed chunk retrieval from LanceDB
	const project = new Project({ useInMemoryFileSystem: false });
	for (const fp of filePaths) {
		try {
			project.addSourceFileAtPath(fp);
		} catch {
			// Skip files that can't be loaded
		}
	}
	const chunkedFiles = chunkWorkspaceFiles(project);

	// Step 3: Resolve symbol matches
	const resolution = resolveSymbol(parsed.path, chunkedFiles, workspaceRoot);

	// Step 4: Handle no matches — return hints if available
	if (resolution.matches.length === 0) {
		let hint: string | null = null;

		if (resolution.hasCaseHints) {
			hint = formatCaseHint(parsed.path.symbolName, resolution.nearMatches);
		} else if (resolution.hasPathHints && parsed.path.filePath !== null) {
			hint = formatPathHint(parsed.path.filePath, resolution.nearMatches);
		} else if (resolution.hasLocalHint) {
			hint = formatLocalHint(parsed.path.symbolName, resolution.nearMatches);
		}

		return {
			isSymbolLookup: true,
			found: false,
			outputSections: { graph: hint ?? `No symbol "${parsed.path.symbolName}" found.` },
			matchCount: 0,
			fileCount: 0,
			tokenCount: estimateTokens(hint ?? ''),
			hint,
		} satisfies SymbolLookupResult;
	}

	// Step 4b: Detect ambiguous matches — multiple symbols with the same name
	// but different kinds. Only triggered when no kind filter was provided.
	if (parsed.path.symbolKind === null && resolution.matches.length > 1) {
		const uniqueKinds = new Set(resolution.matches.map(m => m.chunk.nodeKind.toLowerCase()));
		if (uniqueKinds.size > 1) {
			const hint = formatAmbiguityHint(
				parsed.path.symbolName,
				parsed.path.parentName,
				resolution.matches,
				workspaceRoot,
			);
			return {
				isSymbolLookup: true,
				found: false,
				outputSections: { graph: hint },
				matchCount: resolution.matches.length,
				fileCount: new Set(resolution.matches.map(m => m.filePath)).size,
				tokenCount: estimateTokens(hint),
				hint,
			} satisfies SymbolLookupResult;
		}
	}

	// Step 5: Enrich matches with TS LS metadata and render output
	return renderLookupOutput(
		query,
		resolution.matches,
		chunkedFiles,
		project,
		workspaceRoot,
		tokenBudget,
		tsLsConfig,
	);
}

// ─── Internal: Parse + Chunk ────────────────────────────────────

/**
 * Chunk all workspace files using ts-morph directly.
 * TODO(Phase 7): Replace with indexed chunk retrieval from LanceDB.
 */
function chunkWorkspaceFiles(
	project: Project,
): ChunkedFile[] {
	const chunkedFiles: ChunkedFile[] = [];

	for (const sourceFile of project.getSourceFiles()) {
		const fp = sourceFile.getFilePath();
		if (fp.endsWith('.d.ts') || fp.includes('node_modules')) continue;
		chunkedFiles.push(chunkFile(sourceFile));
	}

	return chunkedFiles;
}

// ─── Internal: Enrich + Render ──────────────────────────────────

/**
 * Enrich matched chunks via the graph module and render the full output
 * (connection graph + smart snapshots + chunk data).
 */
function renderLookupOutput(
	query: string,
	matches: ResolvedMatch[],
	chunkedFiles: ChunkedFile[],
	project: Project,
	workspaceRoot: string,
	tokenBudget: number,
	tsLsConfig?: Partial<TsLsConfig>,
): SymbolLookupResult {
	// Build a combined nodeMap from all chunked files for Node lookup
	const nodeMap = new Map<string, import('ts-morph').Node>();
	for (const cf of chunkedFiles) {
		for (const [chunkId, node] of cf.nodeMap) {
			nodeMap.set(chunkId, node);
		}
	}

	const chunks = matches.map(m => m.chunk);

	// Generate connection graph (enrichment happens inside the graph module)
	const graphResult = generateConnectionGraphFromChunks({
		query,
		chunks,
		nodeMap,
		tokenBudget,
		tsLsConfig,
	});

	// Generate smart snapshots (grouped by file)
	const snapshotTexts: string[] = [];
	const fileGroups = groupByFile(matches);

	for (const [, fileMatches] of fileGroups) {
		const targets = fileMatches.map(m => m.chunk);
		try {
			const snapshotResult = generateSnapshot(project, targets, workspaceRoot);
			snapshotTexts.push(snapshotResult.snapshot);
		} catch {
			// If snapshot generation fails for a file, skip it
		}
	}

	// Build chunk section (raw embeddingText per chunk)
	const chunkSection = chunks
		.map(c => `// ${c.filePath}:${c.startLine}-${c.endLine} (${c.nodeKind}) ${c.name}\n\n${c.embeddingText}`)
		.join('\n\n');

	const snapshotSection = snapshotTexts.map(s => s.trim()).join('\n\n');

	const distinctFiles = new Set(matches.map(m => m.filePath));

	const outputSections: OutputSections = {
		chunk: chunkSection,
		graph: graphResult.text.trim(),
		snapshot: snapshotSection || '(no code)',
	};

	const tokenCount = estimateTokens(
		outputSections.graph + '\n' + outputSections.snapshot,
	);

	return {
		isSymbolLookup: true,
		found: true,
		outputSections,
		matchCount: matches.length,
		fileCount: distinctFiles.size,
		tokenCount,
		hint: null,
	};
}

// ─── Helpers ────────────────────────────────────────────────────

/** Group resolved matches by file path. */
function groupByFile(matches: ResolvedMatch[]): Map<string, ResolvedMatch[]> {
	const groups = new Map<string, ResolvedMatch[]>();

	for (const match of matches) {
		const key = match.chunk.filePath;
		const existing = groups.get(key);
		if (existing) {
			existing.push(match);
		} else {
			groups.set(key, [match]);
		}
	}

	return groups;
}

/** Estimate token count using the ~4 chars per token heuristic. */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}
