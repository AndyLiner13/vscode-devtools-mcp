/**
 * Phase 6 — Symbol Lookup.
 *
 * Main entry point for the direct symbol lookup module. Detects
 * `symbol = ...` queries, resolves matching symbols, enriches them
 * with TS LS metadata, and renders the same output as the full pipeline.
 *
 * TODO(Phase 7): Replace fresh parsing with indexed chunk retrieval.
 * Once the LanceDB index exists, the workspace must be queried via the
 * index instead of fresh parsing. There should be only one code path —
 * the fresh parsing path below is temporary.
 *
 * Usage:
 *   const result = lookupSymbol(query, workspaceRoot, filePaths, tokenBudget);
 *   if (!result.isSymbolLookup) { // proceed with full pipeline }
 */

import { Project } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseFile, parseFiles } from '../parser/index.js';
import { chunkFile } from '../chunker/index.js';
import type { ChunkedFile, CodeChunk } from '../chunker/types.js';
import type { ParsedFile } from '../parser/types.js';

import { resolveCallHierarchy } from '../ts-ls/call-hierarchy.js';
import { resolveTypeHierarchy } from '../ts-ls/type-hierarchy.js';
import { resolveReferences } from '../ts-ls/references.js';
import { resolveTypeFlows } from '../ts-ls/type-flows.js';
import { resolveMembers } from '../ts-ls/members.js';
import { resolveSignature } from '../ts-ls/signature.js';
import type { SymbolMetadata, SymbolRef, MemberInfo } from '../ts-ls/types.js';
import type { TsLsConfig } from '../ts-ls/types.js';

import { generateConnectionGraph } from '../graph/index.js';
import type { GraphResultEntry, ConnectionGraphResult } from '../graph/types.js';

import { generateSnapshot } from '../snapshot/index.js';
import type { SnapshotResult } from '../snapshot/types.js';

import { parseSymbolQuery } from './parse-query.js';
import { resolveSymbol, formatCaseHint, formatPathHint } from './resolve.js';
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
export { resolveSymbol, formatCaseHint, formatPathHint } from './resolve.js';

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

	// Step 2: Fresh parse + chunk all files
	// TODO(Phase 7): Replace with indexed chunk retrieval from LanceDB
	const chunkedFiles = parseAndChunkFiles(filePaths, workspaceRoot);

	// Step 3: Resolve symbol matches
	const resolution = resolveSymbol(parsed.path, chunkedFiles);

	// Step 4: Handle no matches — return hints if available
	if (resolution.matches.length === 0) {
		let hint: string | null = null;

		if (resolution.hasCaseHints) {
			hint = formatCaseHint(parsed.path.symbolName, resolution.nearMatches);
		} else if (resolution.hasPathHints && parsed.path.filePath !== null) {
			hint = formatPathHint(parsed.path.filePath, resolution.nearMatches);
		}

		return {
			isSymbolLookup: true,
			found: false,
			output: hint ?? `No symbol "${parsed.path.symbolName}" found.`,
			matchCount: 0,
			fileCount: 0,
			tokenCount: estimateTokens(hint ?? ''),
			hint,
		} satisfies SymbolLookupResult;
	}

	// Step 5: Enrich matches with TS LS metadata and render output
	return renderLookupOutput(
		query,
		resolution.matches,
		workspaceRoot,
		filePaths,
		tokenBudget,
		tsLsConfig,
	);
}

// ─── Internal: Parse + Chunk ────────────────────────────────────

/**
 * Parse and chunk all workspace files.
 * TODO(Phase 7): Replace with indexed chunk retrieval.
 */
function parseAndChunkFiles(
	filePaths: string[],
	workspaceRoot: string,
): ChunkedFile[] {
	const parsedFiles = parseFiles(filePaths, workspaceRoot);
	const chunkedFiles: ChunkedFile[] = [];

	for (const pf of parsedFiles) {
		const content = fs.readFileSync(pf.filePath, 'utf-8');
		chunkedFiles.push(chunkFile(pf, content));
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
	workspaceRoot: string,
	filePaths: string[],
	tokenBudget: number,
	tsLsConfig?: Partial<TsLsConfig>,
): SymbolLookupResult {
	// Create a shared ts-morph project for TS LS resolution
	const project = new Project({ useInMemoryFileSystem: false });
	for (const fp of filePaths) {
		try {
			project.addSourceFileAtPath(fp);
		} catch {
			// Skip files that can't be loaded
		}
	}

	// Enrich each match with metadata
	const resultEntries: GraphResultEntry[] = [];
	for (const match of matches) {
		const metadata = enrichWithMetadata(
			project,
			match.chunk,
			workspaceRoot,
			tsLsConfig,
		);
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

	for (const [filePath, fileMatches] of fileGroups) {
		const targets = fileMatches.map(m => m.chunk);
		try {
			const snapshotResult = generateSnapshot(project, targets, workspaceRoot);
			snapshotTexts.push(snapshotResult.snapshot);
		} catch {
			// If snapshot generation fails for a file, skip it
		}
	}

	// Combine output
	const outputParts: string[] = [graphResult.text];
	if (snapshotTexts.length > 0) {
		outputParts.push('');
		outputParts.push('--- Code ---');
		for (const snapshot of snapshotTexts) {
			outputParts.push('');
			outputParts.push(snapshot);
		}
	}

	const output = outputParts.join('\n');
	const distinctFiles = new Set(matches.map(m => m.relativePath));

	return {
		isSymbolLookup: true,
		found: true,
		output,
		matchCount: matches.length,
		fileCount: distinctFiles.size,
		tokenCount: estimateTokens(output),
		hint: null,
	};
}

/**
 * Enrich a single chunk with TS LS structural metadata.
 * Resolves as many metadata fields as applicable for the chunk's kind.
 */
function enrichWithMetadata(
	project: Project,
	chunk: CodeChunk,
	workspaceRoot: string,
	tsLsConfig?: Partial<TsLsConfig>,
): SymbolMetadata {
	const symbolRef: SymbolRef = {
		name: chunk.parentName ? `${chunk.parentName}.${chunk.name}` : chunk.name,
		filePath: chunk.relativePath,
		line: chunk.startLine,
	};

	const metadata: SymbolMetadata = {
		symbol: symbolRef,
		outgoingCalls: [],
		incomingCallers: [],
	};

	const lookupName = chunk.name;
	const absFilePath = chunk.filePath;

	// Signature + modifiers (applicable to all kinds)
	try {
		const sigInfo = resolveSignature(project, absFilePath, lookupName);
		metadata.signature = sigInfo.signature;
		metadata.modifiers = sigInfo.modifiers;
	} catch {
		// Not all symbols have resolvable signatures
	}

	// Call hierarchy (functions, methods, constructors)
	const callableKinds = new Set(['function', 'method', 'constructor', 'getter', 'setter']);
	if (callableKinds.has(chunk.nodeKind)) {
		try {
			const callMeta = resolveCallHierarchy(
				project, absFilePath, lookupName, workspaceRoot, tsLsConfig,
			);
			metadata.outgoingCalls = callMeta.outgoingCalls;
			metadata.incomingCallers = callMeta.incomingCallers;
		} catch {
			// Call hierarchy may fail for some symbols
		}
	}

	// Type hierarchy (classes, interfaces)
	const typeHierarchyKinds = new Set(['class', 'interface']);
	if (typeHierarchyKinds.has(chunk.nodeKind)) {
		try {
			metadata.typeHierarchy = resolveTypeHierarchy(
				project, absFilePath, lookupName, workspaceRoot,
			);
		} catch {
			// Not all classes/interfaces have resolvable type hierarchies
		}
	}

	// Members (classes, interfaces)
	if (typeHierarchyKinds.has(chunk.nodeKind)) {
		try {
			metadata.members = resolveMembers(project, absFilePath, lookupName);
		} catch {
			// Not all classes/interfaces have members
		}
	}

	// References (all named symbols)
	const skipRefsKinds = new Set(['import', 'expression', 're-export', 'comment']);
	if (!skipRefsKinds.has(chunk.nodeKind)) {
		try {
			metadata.references = resolveReferences(
				project, absFilePath, lookupName, workspaceRoot,
			);
		} catch {
			// References may fail for some symbols
		}
	}

	// Type flows (functions, methods, constructors)
	if (callableKinds.has(chunk.nodeKind)) {
		try {
			metadata.typeFlows = resolveTypeFlows(
				project, absFilePath, lookupName, workspaceRoot,
			);
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
