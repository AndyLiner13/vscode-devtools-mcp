/**
 * Script to add 'signature' field to all expected symbols in expectation files.
 * Run with: npx tsx tests/phase1-parser/add-signatures.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource } from '../../src/parser/index.js';
import type { ParsedSymbol } from '../../src/parser/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const EXPECTATIONS_DIR = path.join(__dirname, 'expectations');

interface ExpectedSymbol {
	name: string;
	kind: string;
	depth: number;
	parentName: string | null;
	hasChildren: boolean;
	exported?: boolean;
	modifiers?: string[];
	lineRange: [number, number];
	signature?: string;
}

interface FixtureExpectation {
	symbols: ExpectedSymbol[];
	rootItems: unknown[];
	stats: unknown;
}

function flattenSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
	const flat: ParsedSymbol[] = [];
	for (const sym of symbols) {
		flat.push(sym);
		flat.push(...flattenSymbols(sym.children));
	}
	return flat;
}

const codeFiles = fs.readdirSync(FIXTURES_DIR);
const expectedFiles = fs.readdirSync(EXPECTATIONS_DIR);
let updatedCount = 0;

for (const file of codeFiles) {
	const expectedFile = file.replace(/\.[^.]+$/, '.expected.json');
	if (!expectedFiles.includes(expectedFile)) continue;

	const codePath = path.join(FIXTURES_DIR, file);
	const expectedPath = path.join(EXPECTATIONS_DIR, expectedFile);

	const source = fs.readFileSync(codePath, 'utf-8');
	const expected: FixtureExpectation = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));
	const parsed = parseSource(source, codePath, FIXTURES_DIR);
	const flat = flattenSymbols(parsed.symbols);

	const consumed = new Set<number>();
	let changed = false;

	for (const exp of expected.symbols) {
		const matchIdx = flat.findIndex(
			(s, idx) =>
				!consumed.has(idx) &&
				s.name === exp.name &&
				s.kind === exp.kind &&
				s.depth === exp.depth &&
				s.parentName === exp.parentName,
		);

		if (matchIdx === -1) {
			console.warn(`  WARNING: No match for ${exp.kind} "${exp.name}" in ${file}`);
			continue;
		}

		consumed.add(matchIdx);
		const match = flat[matchIdx];

		if (exp.signature === undefined || exp.signature !== match.signature) {
			exp.signature = match.signature;
			changed = true;
		}
	}

	if (changed) {
		fs.writeFileSync(expectedPath, JSON.stringify(expected, null, 2) + '\n');
		updatedCount++;
		console.log(`Updated: ${expectedFile}`);
	} else {
		console.log(`No changes: ${expectedFile}`);
	}
}

console.log(`\nDone. Updated ${updatedCount} expectation files.`);
