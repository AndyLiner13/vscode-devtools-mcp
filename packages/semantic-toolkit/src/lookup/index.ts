/**
 * Phase 6 — Symbol Lookup.
 *
 * Main entry point for the direct symbol lookup module. Detects
 * `symbol = ...` queries, resolves matching symbols, enriches them
 * with TS LS metadata, and renders the same output as the full pipeline.
 *
 * TODO(Phase 7): Replace fresh chunking with indexed chunk retrieval from LanceDB.
 *
 * Usage:
 *   const result = lookupSymbol(query, workspaceRoot, filePaths, tokenBudget);
 *   if (!result.isSymbolLookup) { // proceed with full pipeline }
 */

import { Project, Node } from 'ts-morph';

import { chunkFile } from '../chunker/index.js';
import type { ChunkedFile, CodeChunk } from '../chunker/types.js';

import { resolveCallHierarchy } from '../ts-ls/call-hierarchy.js';
import { resolveTypeHierarchy } from '../ts-ls/type-hierarchy.js';
import { resolveReferences } from '../ts-ls/references.js';
import { resolveTypeFlows } from '../ts-ls/type-flows.js';
import { resolveMembers } from '../ts-ls/members.js';
import { resolveSignature } from '../ts-ls/signature.js';
import type { SymbolMetadata, SymbolRef } from '../ts-ls/types.js';
import type { TsLsConfig } from '../ts-ls/types.js';

import { generateConnectionGraph } from '../graph/index.js';
import type { GraphResultEntry } from '../graph/types.js';

import { generateSnapshot } from '../snapshot/index.js';

import { parseSymbolQuery } from './parse-query.js';
import { resolveSymbol, formatCaseHint, formatPathHint, formatAmbiguityHint, formatLocalHint } from './resolve.js';
import type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
	ResolvedMatch,
} from './types.js';

export type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
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
			outputSections: [hint ?? `No symbol "${parsed.path.symbolName}" found.`],
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
				outputSections: [hint],
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
 * Enrich matched chunks with TS LS metadata and render the full output
 * (connection graph + smart snapshots).
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

	// Enrich each match with metadata
	const resultEntries: GraphResultEntry[] = [];
	for (const match of matches) {
		const node = nodeMap.get(match.chunk.id);
		const metadata = enrichWithMetadata(node, match.chunk, tsLsConfig);
		resultEntries.push({ chunk: match.chunk, metadata });
	}

	// Generate connection graph
	const graphResult = generateConnectionGraph({
		query,
		results: resultEntries,
		tokenBudget,
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

	// Build code section
	const codeSection = snapshotTexts.map(s => s.trim()).join('\n\n');

	const distinctFiles = new Set(matches.map(m => m.filePath));

	// Debug metadata section
	const debugMeta = [
		graphResult.summaryLine,
		`# matches: ${matches.length}`,
		`# files: ${distinctFiles.size}`,
		`# tokens: ${graphResult.tokenCount}`,
	].join('\n');

	const outputSections: [string, string, string] = [
		debugMeta,
		graphResult.graphBody.trim(),
		codeSection || '(no code)',
	];

	const tokenCount = estimateTokens(outputSections.join('\n'));

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

/**
 * Enrich a single chunk with TS LS structural metadata.
 * Uses the ts-morph Node directly from the chunker's nodeMap.
 */
function enrichWithMetadata(
	node: Node | undefined,
	chunk: CodeChunk,
	tsLsConfig?: Partial<TsLsConfig>,
): SymbolMetadata {
	const symbolRef: SymbolRef = {
		name: chunk.parentName ? `${chunk.parentName}.${chunk.name}` : chunk.name,
		filePath: chunk.filePath,
		line: chunk.startLine,
	};

	const metadata: SymbolMetadata = {
		symbol: symbolRef,
		outgoingCalls: [],
		incomingCallers: [],
	};

	if (!node) return metadata;

	// Signature + modifiers (applicable to all kinds)
	try {
		const sigInfo = resolveSignature(node);
		metadata.signature = sigInfo.signature;
		metadata.modifiers = sigInfo.modifiers;
	} catch {
		// Not all symbols have resolvable signatures
	}

	// Call hierarchy (functions, methods, constructors)
	if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
		try {
			const callMeta = resolveCallHierarchy(node, tsLsConfig);
			metadata.outgoingCalls = callMeta.outgoingCalls;
			metadata.incomingCallers = callMeta.incomingCallers;
		} catch {
			// Call hierarchy may fail for some symbols
		}
	}

	// Type hierarchy (classes, interfaces)
	if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
		try {
			metadata.typeHierarchy = resolveTypeHierarchy(node);
		} catch {
			// Not all classes/interfaces have resolvable type hierarchies
		}
	}

	// Members (classes, interfaces)
	if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
		try {
			metadata.members = resolveMembers(node);
		} catch {
			// Not all classes/interfaces have members
		}
	}

	// References (all named symbols — skip imports, expressions, re-exports, comments)
	const skipRefsKinds = new Set(['ImportDeclaration', 'ExpressionStatement', 'ExportDeclaration']);
	if (!skipRefsKinds.has(node.getKindName())) {
		try {
			metadata.references = resolveReferences(node);
		} catch {
			// References may fail for some symbols
		}
	}

	// Type flows (callable symbols)
	if (
		Node.isFunctionDeclaration(node)
		|| Node.isMethodDeclaration(node)
		|| Node.isConstructorDeclaration(node)
	) {
		try {
			metadata.typeFlows = resolveTypeFlows(node);
		} catch {
			// Type flows may fail for some symbols
		}
	}

	return metadata;
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
