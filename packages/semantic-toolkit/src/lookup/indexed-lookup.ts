/**
 * Phase 7 — Index-backed symbol lookup.
 *
 * Queries LanceDB for matching chunks instead of fresh ts-morph parsing.
 * Default path (snapshot=false): entirely from indexed data, no ts-morph.
 * Enriched path (snapshot=true): matches from index, then targeted ts-morph
 * parse for graph/snapshot enrichment of matched files only.
 */

import { Project } from 'ts-morph';
import * as path from 'node:path';

import type { CodeChunk, ChunkedFile } from '../chunker/types.js';
import { chunkFile } from '../chunker/index.js';
import { parseName, parseKind, parseParentPath } from '../indexer/symbol-path.js';
import { getChunksByFile, type DbHandle } from '../indexer/db.js';

import type { TsLsConfig } from '../ts-ls/types.js';
import { generateConnectionGraphFromChunks } from '../graph/index.js';
import { generateSnapshot } from '../snapshot/index.js';

import { parseSymbolQuery } from './parse-query.js';
import { formatCaseHint, formatPathHint, formatAmbiguityHint } from './resolve.js';
import type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
	OutputSections,
	ParsedSymbolPath,
	ResolvedMatch,
	NearMatch,
} from './types.js';

/**
 * Perform a symbol lookup against the LanceDB index.
 *
 * @param query         - The raw user query string (e.g. "symbol = UserProfile").
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param filePath      - Absolute path to the target file.
 * @param db            - Live LanceDB handle from sync().
 * @param tsLsConfig    - Optional TS LS configuration (callDepth).
 * @param enrich        - When true, also generates graph + snapshot via ts-morph.
 */
export async function lookupFromIndex(
	query: string,
	workspaceRoot: string,
	filePath: string,
	db: DbHandle,
	tsLsConfig?: Partial<TsLsConfig>,
	enrich = true,
): Promise<LookupResult> {
	const parsed = parseSymbolQuery(query);

	if (!parsed.isSymbolLookup || parsed.path === null) {
		return { isSymbolLookup: false } satisfies NotALookupResult;
	}

	// Normalize to forward slashes (ts-morph stores forward slashes)
	const normalizedFilePath = filePath.replaceAll('\\', '/');

	// Query LanceDB for all chunks in the target file
	const indexedChunks = await getChunksByFile(db, normalizedFilePath);

	if (indexedChunks.length === 0) {
		return {
			isSymbolLookup: true,
			found: false,
			outputSections: { graph: `No indexed chunks found for "${path.relative(workspaceRoot, filePath)}". The file may not have been indexed yet.` },
			matchCount: 0,
			fileCount: 0,
			hint: null,
		} satisfies SymbolLookupResult;
	}

	// Convert IndexedChunks to CodeChunk shape for resolution
	const chunks: CodeChunk[] = indexedChunks.map(ic => ({
		filePath: ic.filePath,
		symbolPath: ic.symbolPath,
		startLine: ic.startLine,
		endLine: ic.endLine,
		chunkContent: ic.chunkContent,
	}));

	const relativeFilePath = toRelative(filePath, workspaceRoot);

	// Resolve symbol against indexed chunks
	const symbolPath = parsed.path;
	const matches = findMatchesInChunks(symbolPath, chunks, relativeFilePath, workspaceRoot);

	// Handle no matches — generate helpful hints
	if (matches.length === 0) {
		const hint = generateHint(symbolPath, chunks, relativeFilePath, workspaceRoot);
		return {
			isSymbolLookup: true,
			found: false,
			outputSections: { graph: hint ?? `No symbol "${symbolPath.symbolName}" found.` },
			matchCount: 0,
			fileCount: 0,
			hint,
		} satisfies SymbolLookupResult;
	}

	// Detect ambiguous matches (same name, different kinds)
	if (symbolPath.symbolKind === null && matches.length > 1) {
		const uniqueKinds = new Set(matches.map(m => parseKind(m.chunk.symbolPath).toLowerCase()));
		if (uniqueKinds.size > 1) {
			const hint = formatAmbiguityHint(
				symbolPath.symbolName,
				symbolPath.parentName,
				matches,
				workspaceRoot,
			);
			return {
				isSymbolLookup: true,
				found: false,
				outputSections: { graph: hint },
				matchCount: matches.length,
				fileCount: new Set(matches.map(m => m.filePath)).size,
				hint,
			} satisfies SymbolLookupResult;
		}
	}

	// Non-enriched path: serve entirely from indexed data
	if (!enrich) {
		const matchedChunks = matches.map(m => m.chunk);
		const chunkSection = matchedChunks
			.map(c => `// ${toRelative(c.filePath, workspaceRoot)}\n\n${c.chunkContent}`)
			.join('\n\n');

		return {
			isSymbolLookup: true,
			found: true,
			outputSections: { chunk: chunkSection, graph: '', snapshot: '' },
			matchCount: matches.length,
			fileCount: new Set(matches.map(m => m.filePath)).size,
			hint: null,
		} satisfies SymbolLookupResult;
	}

	// Enriched path: use targeted ts-morph parse for matched files only
	return renderEnrichedOutput(query, matches, workspaceRoot, tsLsConfig);
}

// ─── Internal: Symbol Matching ─────────────────────────────────

function findMatchesInChunks(
	symbolPath: ParsedSymbolPath,
	chunks: CodeChunk[],
	_relativeFilePath: string,
	_workspaceRoot: string,
): ResolvedMatch[] {
	// Exact case-sensitive match
	let exactMatches = findByName(symbolPath.symbolName, symbolPath.parentName, chunks, true);

	// Apply kind filter if specified
	if (exactMatches.length > 0 && symbolPath.symbolKind !== null) {
		exactMatches = exactMatches.filter(
			m => parseKind(m.chunk.symbolPath).toLowerCase() === symbolPath.symbolKind,
		);
	}

	if (exactMatches.length > 0) {
		return exactMatches;
	}

	return [];
}

function findByName(
	symbolName: string,
	parentName: string | null,
	chunks: CodeChunk[],
	caseSensitive: boolean,
): ResolvedMatch[] {
	const compare = caseSensitive
		? (a: string, b: string) => a === b
		: (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

	const matches: ResolvedMatch[] = [];

	for (const chunk of chunks) {
		if (!compare(parseName(chunk.symbolPath), symbolName)) continue;

		if (parentName !== null) {
			const parentPath = parseParentPath(chunk.symbolPath);
			if (parentPath === null || !compare(parseName(parentPath), parentName)) continue;
		}

		matches.push({ chunk, filePath: chunk.filePath });
	}

	return matches;
}

function generateHint(
	symbolPath: ParsedSymbolPath,
	chunks: CodeChunk[],
	relativeFilePath: string,
	workspaceRoot: string,
): string | null {
	// Case-insensitive fallback
	const caseMatches = findByName(symbolPath.symbolName, symbolPath.parentName, chunks, false);
	if (caseMatches.length > 0) {
		return formatCaseHint(
			symbolPath.symbolName,
			caseMatches.map(m => ({
				value: parseName(m.chunk.symbolPath),
				location: `${relativeFilePath}:${m.chunk.startLine}`,
				kind: 'case-mismatch' as const,
			})),
		);
	}
	return null;
}

// ─── Internal: Enriched Output ──────────────────────────────────

function renderEnrichedOutput(
	query: string,
	matches: ResolvedMatch[],
	workspaceRoot: string,
	tsLsConfig?: Partial<TsLsConfig>,
): SymbolLookupResult {
	const matchedChunks = matches.map(m => m.chunk);
	const distinctFiles = new Set(matches.map(m => m.filePath));

	// Build chunk section (raw chunkContent — always present)
	const chunkSection = matchedChunks
		.map(c => `// ${toRelative(c.filePath, workspaceRoot)}\n\n${c.chunkContent}`)
		.join('\n\n');

	// Create targeted ts-morph Project for enrichment (only matched files)
	const project = new Project({ useInMemoryFileSystem: false });
	const chunkedFiles: ChunkedFile[] = [];

	for (const fp of distinctFiles) {
		try {
			const sourceFile = project.addSourceFileAtPath(fp);
			chunkedFiles.push(chunkFile(sourceFile));
		} catch {
			// If a matched file can't be parsed, skip enrichment for it
		}
	}

	// Build combined nodeMap
	const nodeMap = new Map<string, import('ts-morph').Node>();
	for (const cf of chunkedFiles) {
		for (const [sp, node] of cf.nodeMap) {
			nodeMap.set(`${cf.filePath}::${sp}`, node);
		}
	}

	// Generate connection graph
	const graphResult = generateConnectionGraphFromChunks({
		query,
		chunks: matchedChunks,
		nodeMap,
		tsLsConfig,
	});

	// Generate smart snapshots
	const snapshotTexts: string[] = [];
	const fileGroups = groupByFile(matches);

	for (const [, fileMatches] of fileGroups) {
		const targets = fileMatches.map(m => m.chunk);
		try {
			const snapshotResult = generateSnapshot(project, targets, workspaceRoot);
			snapshotTexts.push(snapshotResult.snapshot);
		} catch {
			// Skip if snapshot generation fails
		}
	}

	const snapshotSection = snapshotTexts.map(s => s.trim()).join('\n\n');

	const outputSections: OutputSections = {
		chunk: chunkSection,
		graph: graphResult.text.trim(),
		snapshot: snapshotSection || '(no code)',
	};

	return {
		isSymbolLookup: true,
		found: true,
		outputSections,
		matchCount: matches.length,
		fileCount: distinctFiles.size,
		hint: null,
	};
}

// ─── Helpers ────────────────────────────────────────────────────

function toRelative(filePath: string, workspaceRoot: string): string {
	return path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
}

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
