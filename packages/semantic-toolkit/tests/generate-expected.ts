/**
 * Generate .expected.json for fixture files that don't have one yet.
 * Run from semantic-toolkit root: npx tsx tests/generate-expected.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource } from '../src/parser/index';
import type { ParsedSymbol } from '../src/parser/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

interface ExpectedSymbol {
	name: string;
	kind: string;
	depth: number;
	parentName: string | null;
	hasChildren: boolean;
	exported: boolean;
	modifiers: string[];
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

function flattenSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
	const flat: ParsedSymbol[] = [];
	for (const sym of symbols) {
		flat.push(sym);
		flat.push(...flattenSymbols(sym.children));
	}
	return flat;
}

const files = fs.readdirSync(FIXTURES_DIR);
const newFixtures: string[] = [];

for (const file of files) {
	if (file.endsWith('.expected.json')) continue;
	const ext = path.extname(file);
	if (!['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'].includes(ext)) continue;

	const expectedFile = file.replace(/\.[^.]+$/, '.expected.json');
	if (files.includes(expectedFile)) continue;

	newFixtures.push(file);
}

if (newFixtures.length === 0) {
	console.log('No new fixtures to generate.');
	process.exit(0);
}

console.log(`Generating expected JSON for ${newFixtures.length} fixture(s):`);

for (const file of newFixtures) {
	const codePath = path.join(FIXTURES_DIR, file);
	const expectedPath = path.join(FIXTURES_DIR, file.replace(/\.[^.]+$/, '.expected.json'));
	const source = fs.readFileSync(codePath, 'utf-8');

	const parsed = parseSource(source, codePath, FIXTURES_DIR);
	const flat = flattenSymbols(parsed.symbols);

	const symbols: ExpectedSymbol[] = flat.map((sym) => ({
		name: sym.name,
		kind: sym.kind,
		depth: sym.depth,
		parentName: sym.parentName,
		hasChildren: sym.children.length > 0,
		exported: sym.exported,
		modifiers: sym.modifiers,
		lineRange: [sym.range.startLine, sym.range.endLine] as [number, number],
	}));

	const rootItems: ExpectedRootItem[] = parsed.symbols
		.filter((s) => s.kind === 'import' || s.kind === 're-export' || s.kind === 'expression')
		.map((s) => ({
			kind: s.kind,
			name: s.name,
			lineRange: [s.range.startLine, s.range.endLine] as [number, number],
		}));

	let maxDepth = -1;
	for (const sym of flat) {
		if (sym.depth > maxDepth) maxDepth = sym.depth;
	}

	const expected: FixtureExpectation = {
		symbols,
		rootItems,
		stats: {
			totalSymbols: flat.length,
			totalRootItems: rootItems.length,
			maxDepth,
		},
	};

	fs.writeFileSync(expectedPath, JSON.stringify(expected, null, 2) + '\n');
	console.log(`  ✓ ${file} → ${flat.length} symbols, ${rootItems.length} root items, maxDepth=${maxDepth}`);
}

console.log('Done!');
