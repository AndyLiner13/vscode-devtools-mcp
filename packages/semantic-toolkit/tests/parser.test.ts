import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseSource } from '../src/parser/index';
import type { ParsedFile, ParsedSymbol } from '../src/parser/types';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

interface ExpectedSymbol {
	name: string;
	kind: string;
	depth: number;
	parentName: string | null;
	hasChildren: boolean;
	exported?: boolean;
	modifiers?: string[];
	lineRange: [number, number];
}

interface ExpectedRootItem {
	kind: string;
	name: string;
	lineRange: [number, number];
}

interface ExpectedStats {
	totalSymbols: number;
	totalRootItems: number;
	maxDepth: number;
}

interface FixtureExpectation {
	symbols: ExpectedSymbol[];
	rootItems: ExpectedRootItem[];
	stats: ExpectedStats;
}

// Glob fixture pairs: code file + .expected.json
function discoverFixtures(): Array<{ name: string; codePath: string; expectedPath: string }> {
	if (!fs.existsSync(FIXTURES_DIR)) return [];

	const files = fs.readdirSync(FIXTURES_DIR);
	const fixtures: Array<{ name: string; codePath: string; expectedPath: string }> = [];

	for (const file of files) {
		if (file.endsWith('.expected.json')) continue;
		const expectedFile = file.replace(/\.[^.]+$/, '.expected.json');
		if (files.includes(expectedFile)) {
			fixtures.push({
				name: file,
				codePath: path.join(FIXTURES_DIR, file),
				expectedPath: path.join(FIXTURES_DIR, expectedFile),
			});
		}
	}

	return fixtures;
}

function flattenSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
	const flat: ParsedSymbol[] = [];
	for (const sym of symbols) {
		flat.push(sym);
		flat.push(...flattenSymbols(sym.children));
	}
	return flat;
}

function countSymbols(symbols: ParsedSymbol[]): number {
	return flattenSymbols(symbols).length;
}

function findMaxDepth(symbols: ParsedSymbol[]): number {
	let max = -1;
	for (const sym of flattenSymbols(symbols)) {
		if (sym.depth > max) max = sym.depth;
	}
	return max;
}

// ── Tests ──

const fixtures = discoverFixtures();

describe('Parser: data-driven fixtures', () => {
	if (fixtures.length === 0) {
		it.skip('no fixtures found', () => {});
		return;
	}

	for (const fixture of fixtures) {
		describe(fixture.name, () => {
			const source = fs.readFileSync(fixture.codePath, 'utf-8');
			const expected: FixtureExpectation = JSON.parse(
				fs.readFileSync(fixture.expectedPath, 'utf-8'),
			);

			const parsed = parseSource(source, fixture.codePath, FIXTURES_DIR);

			// ── Symbol count ──
			it('should have the correct total symbol count', () => {
				expect(countSymbols(parsed.symbols)).toBe(expected.stats.totalSymbols);
			});

			// ── Max depth ──
			it('should have the correct max depth', () => {
				expect(findMaxDepth(parsed.symbols)).toBe(expected.stats.maxDepth);
			});

			// ── Root item count ──
			it('should have the correct root item count', () => {
				const rootItems = parsed.symbols.filter(
					s => s.kind === 'import' || s.kind === 're-export' || s.kind === 'expression',
				);
				expect(rootItems.length).toBe(expected.stats.totalRootItems);
			});

			// ── Individual symbol assertions ──
			it('should match expected symbols', () => {
				const flat = flattenSymbols(parsed.symbols);

				for (const exp of expected.symbols) {
					const match = flat.find(
						s =>
							s.name === exp.name &&
							s.kind === exp.kind &&
							s.depth === exp.depth &&
							s.parentName === exp.parentName,
					);

					expect(match, `Symbol not found: ${exp.kind} ${exp.name} at depth ${exp.depth}`).toBeDefined();

					if (!match) continue;

					expect(match.parentName).toBe(exp.parentName);
					expect(match.children.length > 0).toBe(exp.hasChildren);
					expect(match.range.startLine).toBe(exp.lineRange[0]);
					expect(match.range.endLine).toBe(exp.lineRange[1]);

					if (exp.exported !== undefined) {
						expect(match.exported).toBe(exp.exported);
					}

					if (exp.modifiers) {
						for (const mod of exp.modifiers) {
							expect(
								match.modifiers,
								`Missing modifier '${mod}' on ${exp.name}`,
							).toContain(mod);
						}
					}
				}
			});

			// ── Root item assertions ──
			if (expected.rootItems.length > 0) {
				it('should match expected root items', () => {
					const rootItems = parsed.symbols.filter(
						s => s.kind === 'import' || s.kind === 're-export' || s.kind === 'expression',
					);

					for (const exp of expected.rootItems) {
						const match = rootItems.find(
							s => s.name === exp.name && s.kind === exp.kind,
						);

						expect(
							match,
							`Root item not found: ${exp.kind} ${exp.name}`,
						).toBeDefined();

						if (match) {
							expect(match.range.startLine).toBe(exp.lineRange[0]);
							expect(match.range.endLine).toBe(exp.lineRange[1]);
						}
					}
				});
			}

			// ── Global validation: line ranges are within file bounds ──
			it('should have all line ranges within file bounds', () => {
				for (const sym of flattenSymbols(parsed.symbols)) {
					expect(sym.range.startLine).toBeGreaterThanOrEqual(1);
					expect(sym.range.endLine).toBeLessThanOrEqual(parsed.totalLines);
					expect(sym.range.startLine).toBeLessThanOrEqual(sym.range.endLine);
				}
			});

			// ── Global validation: hierarchy consistency ──
			it('should have consistent parent-child relationships', () => {
				function validateHierarchy(syms: ParsedSymbol[], expectedParent: string | null, expectedDepth: number): void {
					for (const sym of syms) {
						expect(sym.parentName).toBe(expectedParent);
						expect(sym.depth).toBe(expectedDepth);
						validateHierarchy(sym.children, sym.name, expectedDepth + 1);
					}
				}
				validateHierarchy(parsed.symbols, null, 0);
			});

			// ── Global validation: no empty names ──
			it('should have no empty symbol names', () => {
				for (const sym of flattenSymbols(parsed.symbols)) {
					expect(sym.name.length).toBeGreaterThan(0);
				}
			});

			// ── Global validation: signatures are non-empty ──
			it('should have non-empty signatures for all symbols', () => {
				for (const sym of flattenSymbols(parsed.symbols)) {
					expect(
						sym.signature.length,
						`Empty signature for ${sym.kind} ${sym.name}`,
					).toBeGreaterThan(0);
				}
			});

			// ── Global validation: deterministic output ──
			it('should produce deterministic output', () => {
				const parsed2 = parseSource(source, fixture.codePath, FIXTURES_DIR);
				expect(parsed.symbols).toEqual(parsed2.symbols);
			});
		});
	}
});
