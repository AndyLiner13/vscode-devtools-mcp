import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

import { parseSymbolQuery } from '../../src/lookup/parse-query';
import { resolveSymbol, formatCaseHint, formatPathHint } from '../../src/lookup/resolve';
import { lookupSymbol } from '../../src/lookup/index';
import type {
	ParsedSymbolPath,
	QueryParseResult,
	ResolvedMatch,
	ResolutionResult,
	NearMatch,
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
} from '../../src/lookup/types';

import { parseFiles } from '../../src/parser/index';
import { chunkFile } from '../../src/chunker/index';
import type { ChunkedFile } from '../../src/chunker/types';

// ─── Test helpers ───────────────────────────────────────────────

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures', 'lookup');
const WORKSPACE_ROOT = path.resolve(__dirname, '..', 'fixtures');

function getFixturePaths(): string[] {
	return fs.readdirSync(FIXTURES_DIR)
		.filter(f => f.endsWith('.ts'))
		.map(f => path.resolve(FIXTURES_DIR, f));
}

/**
 * Parse + chunk all lookup fixtures.
 * Mirrors what the entry point does internally.
 */
function buildChunkedFiles(): ChunkedFile[] {
	const filePaths = getFixturePaths();
	const parsed = parseFiles(filePaths, WORKSPACE_ROOT);
	const chunked: ChunkedFile[] = [];

	for (const pf of parsed) {
		const content = fs.readFileSync(pf.filePath, 'utf-8');
		chunked.push(chunkFile(pf, content));
	}

	return chunked;
}

// ═════════════════════════════════════════════════════════════════
// 1 — Query Parsing  (parseSymbolQuery)
// ═════════════════════════════════════════════════════════════════

describe('Phase 6 — Query Parsing (parseSymbolQuery)', () => {

	// ── Detection ────────────────────────────────────────────────

	describe('prefix detection', () => {
		it('should detect "symbol = name"', () => {
			const result = parseSymbolQuery('symbol = validateToken');
			expect(result.isSymbolLookup).toBe(true);
			expect(result.path).not.toBeNull();
			expect(result.path?.symbolName).toBe('validateToken');
		});

		it('should detect "symbol=name" (no spaces)', () => {
			const result = parseSymbolQuery('symbol=validateToken');
			expect(result.isSymbolLookup).toBe(true);
			expect(result.path?.symbolName).toBe('validateToken');
		});

		it('should be case-insensitive on the prefix keyword', () => {
			const result = parseSymbolQuery('Symbol = validateToken');
			expect(result.isSymbolLookup).toBe(true);
			expect(result.path?.symbolName).toBe('validateToken');
		});

		it('should not detect queries without the prefix', () => {
			const result = parseSymbolQuery('how does validateToken work?');
			expect(result.isSymbolLookup).toBe(false);
			expect(result.path).toBeNull();
		});

		it('should not detect empty queries', () => {
			const result = parseSymbolQuery('');
			expect(result.isSymbolLookup).toBe(false);
		});

		it('should not detect "symbol = " with no value', () => {
			const result = parseSymbolQuery('symbol = ');
			expect(result.isSymbolLookup).toBe(false);
		});
	});

	// ── Parse: name-only ─────────────────────────────────────────

	describe('name-only lookups', () => {
		it('should parse a bare symbol name', () => {
			const result = parseSymbolQuery('symbol = validateToken');
			expect(result.path).toEqual({
				filePath: null,
				parentName: null,
				symbolName: 'validateToken',
			} satisfies ParsedSymbolPath);
		});

		it('should trim whitespace from the name', () => {
			const result = parseSymbolQuery('symbol =   validateToken   ');
			expect(result.path?.symbolName).toBe('validateToken');
		});
	});

	// ── Parse: parent.name ───────────────────────────────────────

	describe('parent.name lookups', () => {
		it('should parse Parent.method', () => {
			const result = parseSymbolQuery('symbol = TokenService.validateToken');
			expect(result.path).toEqual({
				filePath: null,
				parentName: 'TokenService',
				symbolName: 'validateToken',
			} satisfies ParsedSymbolPath);
		});

		it('should handle single name (no dot) as symbol only', () => {
			const result = parseSymbolQuery('symbol = TokenService');
			expect(result.path?.parentName).toBeNull();
			expect(result.path?.symbolName).toBe('TokenService');
		});
	});

	// ── Parse: file::name ────────────────────────────────────────

	describe('file::name lookups', () => {
		it('should parse file::symbol', () => {
			const result = parseSymbolQuery('symbol = auth-service.ts::validateToken');
			expect(result.path).toEqual({
				filePath: 'auth-service.ts',
				parentName: null,
				symbolName: 'validateToken',
			} satisfies ParsedSymbolPath);
		});

		it('should parse path/file::symbol', () => {
			const result = parseSymbolQuery('symbol = lookup/auth-service.ts::validateToken');
			expect(result.path).toEqual({
				filePath: 'lookup/auth-service.ts',
				parentName: null,
				symbolName: 'validateToken',
			} satisfies ParsedSymbolPath);
		});

		it('should parse file::Parent.method', () => {
			const result = parseSymbolQuery('symbol = auth-service.ts::TokenService.validateToken');
			expect(result.path).toEqual({
				filePath: 'auth-service.ts',
				parentName: 'TokenService',
				symbolName: 'validateToken',
			} satisfies ParsedSymbolPath);
		});
	});
});

// ═════════════════════════════════════════════════════════════════
// 2 — Symbol Resolution  (resolveSymbol)
// ═════════════════════════════════════════════════════════════════

describe('Phase 6 — Symbol Resolution (resolveSymbol)', () => {
	const chunkedFiles = buildChunkedFiles();

	// ── Exact match ──────────────────────────────────────────────

	describe('exact match', () => {
		it('should find top-level function by name', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'formatDate',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBeGreaterThanOrEqual(1);
			expect(result.matches[0].chunk.name).toBe('formatDate');
			expect(result.hasCaseHints).toBe(false);
			expect(result.hasPathHints).toBe(false);
		});

		it('should find class by name', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'TokenService',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].chunk.name).toBe('TokenService');
		});

		it('should find nested method with parent', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: 'TokenService',
				symbolName: 'validateToken',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].chunk.name).toBe('validateToken');
			expect(result.matches[0].chunk.parentName).toBe('TokenService');
		});

		it('should find interface by name', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'AuthConfig',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].chunk.name).toBe('AuthConfig');
		});

		it('should find constant by name', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'MAX_RETRIES',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].chunk.name).toBe('MAX_RETRIES');
		});

		it('should find type alias by name', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'EventHandler',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].chunk.name).toBe('EventHandler');
		});
	});

	// ── Multiple matches (same name, different files) ────────────

	describe('multiple matches', () => {
		it('should find "validateToken" in both auth-service and data-repository', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'validateToken',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBeGreaterThanOrEqual(2);
			const paths = result.matches.map(m => m.relativePath);
			expect(paths.some(p => p.includes('auth-service'))).toBe(true);
			expect(paths.some(p => p.includes('data-repository'))).toBe(true);
		});

		it('should narrow to parent when specified', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: 'TokenService',
				symbolName: 'validateToken',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].chunk.parentName).toBe('TokenService');
		});
	});

	// ── File path scoping ────────────────────────────────────────

	describe('file path scoping', () => {
		it('should restrict results to a specific file', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: 'lookup/auth-service.ts',
				parentName: null,
				symbolName: 'validateToken',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(1);
			expect(result.matches[0].relativePath).toContain('auth-service');
		});

		it('should return path hints when basename matches but directory is wrong', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: 'wrong/auth-service.ts',
				parentName: null,
				symbolName: 'validateToken',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(0);
			expect(result.hasPathHints).toBe(true);
			expect(result.nearMatches.length).toBeGreaterThan(0);
			expect(result.nearMatches[0].kind).toBe('partial-path');
			expect(result.nearMatches[0].value).toContain('auth-service.ts');
		});
	});

	// ── Case-sensitivity hints ───────────────────────────────────

	describe('case-sensitivity hints', () => {
		it('should not match wrong case but should provide hints', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'formatdate',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(0);
			expect(result.hasCaseHints).toBe(true);
			expect(result.nearMatches.length).toBeGreaterThanOrEqual(1);
			const hintValues = result.nearMatches.map(m => m.value.toLowerCase());
			expect(hintValues).toContain('formatdate');
		});

		it('should handle VALIDATETOKEN (all caps)', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'VALIDATETOKEN',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(0);
			expect(result.hasCaseHints).toBe(true);
		});
	});

	// ── No match ─────────────────────────────────────────────────

	describe('no match', () => {
		it('should return empty results for nonexistent symbol', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: null,
				symbolName: 'completelyNonexistentSymbol',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(0);
			expect(result.nearMatches.length).toBe(0);
			expect(result.hasCaseHints).toBe(false);
			expect(result.hasPathHints).toBe(false);
		});

		it('should return empty for wrong parent', () => {
			const symbolPath: ParsedSymbolPath = {
				filePath: null,
				parentName: 'NonexistentParent',
				symbolName: 'validateToken',
			};
			const result = resolveSymbol(symbolPath, chunkedFiles);
			expect(result.matches.length).toBe(0);
		});
	});
});

// ═════════════════════════════════════════════════════════════════
// 3 — Hint Formatting
// ═════════════════════════════════════════════════════════════════

describe('Phase 6 — Hint Formatting', () => {

	describe('formatCaseHint', () => {
		it('should produce a message mentioning the searched name', () => {
			const nearMatches: NearMatch[] = [
				{ value: 'ValidateToken', location: 'auth-service.ts:20', kind: 'case-mismatch' },
			];
			const hint = formatCaseHint('validatetoken', nearMatches);
			expect(hint).toContain('validatetoken');
			expect(hint).toContain('ValidateToken');
			expect(hint).toContain('auth-service.ts:20');
		});

		it('should list multiple near-matches', () => {
			const nearMatches: NearMatch[] = [
				{ value: 'FormatDate', location: 'utils.ts:10', kind: 'case-mismatch' },
				{ value: 'formatDate', location: 'utils.ts:6', kind: 'case-mismatch' },
			];
			const hint = formatCaseHint('formatdate', nearMatches);
			expect(hint).toContain('FormatDate');
			expect(hint).toContain('formatDate');
		});
	});

	describe('formatPathHint', () => {
		it('should produce a message mentioning the searched path', () => {
			const nearMatches: NearMatch[] = [
				{ value: 'lookup/auth-service.ts', location: 'lookup/auth-service.ts', kind: 'partial-path' },
			];
			const hint = formatPathHint('auth.ts', nearMatches);
			expect(hint).toContain('auth.ts');
			expect(hint).toContain('lookup/auth-service.ts');
		});

		it('should list multiple partial-path matches', () => {
			const nearMatches: NearMatch[] = [
				{ value: 'lookup/auth-service.ts', location: 'lookup/auth-service.ts', kind: 'partial-path' },
				{ value: 'lookup/data-repository.ts', location: 'lookup/data-repository.ts', kind: 'partial-path' },
			];
			const hint = formatPathHint('lookup', nearMatches);
			expect(hint).toContain('lookup/auth-service.ts');
			expect(hint).toContain('lookup/data-repository.ts');
		});
	});
});

// ═════════════════════════════════════════════════════════════════
// 4 — Entry Point Integration  (lookupSymbol)
// ═════════════════════════════════════════════════════════════════

describe('Phase 6 — Entry Point (lookupSymbol)', () => {
	const filePaths = getFixturePaths();

	// ── Non-lookup queries ───────────────────────────────────────

	describe('non-lookup queries pass through', () => {
		it('should return isSymbolLookup: false for regular queries', () => {
			const result = lookupSymbol(
				'how does authentication work?',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(false);
		});

		it('should return isSymbolLookup: false for empty query', () => {
			const result = lookupSymbol('', WORKSPACE_ROOT, filePaths, 4000);
			expect(result.isSymbolLookup).toBe(false);
		});
	});

	// ── Found symbols ────────────────────────────────────────────

	describe('successful lookups', () => {
		it('should find TokenService and produce output', () => {
			const result = lookupSymbol(
				'symbol = TokenService',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.found).toBe(true);
			expect(lookup.matchCount).toBe(1);
			expect(lookup.fileCount).toBe(1);
			expect(lookup.output.length).toBeGreaterThan(0);
			expect(lookup.tokenCount).toBeGreaterThan(0);
			expect(lookup.hint).toBeNull();
		});

		it('should find nested method with parent', () => {
			const result = lookupSymbol(
				'symbol = TokenService.validateToken',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.found).toBe(true);
			expect(lookup.matchCount).toBe(1);
		});

		it('should find symbol with file scope', () => {
			const result = lookupSymbol(
				'symbol = lookup/auth-service.ts::TokenService',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.found).toBe(true);
			expect(lookup.matchCount).toBe(1);
		});
	});

	// ── Not found with hints ─────────────────────────────────────

	describe('not found with hints', () => {
		it('should return hint for case mismatch', () => {
			const result = lookupSymbol(
				'symbol = tokenservice',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.found).toBe(false);
			expect(lookup.matchCount).toBe(0);
			expect(lookup.hint).not.toBeNull();
			expect(lookup.hint).toContain('TokenService');
		});

		it('should return hint for wrong file path', () => {
			const result = lookupSymbol(
				'symbol = wrong/auth-service.ts::TokenService',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.found).toBe(false);
			expect(lookup.hint).not.toBeNull();
		});
	});

	// ── Completely not found ─────────────────────────────────────

	describe('completely not found', () => {
		it('should return error message for nonexistent symbol', () => {
			const result = lookupSymbol(
				'symbol = totallyNotARealSymbol',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.found).toBe(false);
			expect(lookup.matchCount).toBe(0);
			expect(lookup.output).toContain('totallyNotARealSymbol');
			expect(lookup.hint).toBeNull();
		});
	});

	// ── Token budget awareness ───────────────────────────────────

	describe('token budget', () => {
		it('should estimate token count in the output', () => {
			const result = lookupSymbol(
				'symbol = TokenService',
				WORKSPACE_ROOT,
				filePaths,
				4000,
			);
			expect(result.isSymbolLookup).toBe(true);
			const lookup = result as SymbolLookupResult;
			expect(lookup.tokenCount).toBeGreaterThan(0);
			expect(lookup.tokenCount).toBeLessThanOrEqual(4000);
		});
	});
});
