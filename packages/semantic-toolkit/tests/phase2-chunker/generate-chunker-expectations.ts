/**
 * Script to generate chunker expectations for fixtures that are missing them.
 * Run with: npx tsx tests/phase2-chunker/generate-chunker-expectations.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource } from '../../src/parser/index.js';
import { chunkFile, BODY_BEARING_KINDS } from '../../src/chunker/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const EXPECTATIONS_DIR = path.join(__dirname, 'expectations');

interface ExpectedChunk {
	breadcrumb: string;
	nodeKind: string;
	hasCollapsedChildren: boolean;
	isLeaf: boolean;
	lineCount: number;
	relevantImports: string[];
}

interface ChunkExpectation {
	chunks: ExpectedChunk[];
	stats: {
		totalChunks: number;
		maxDepth: number;
		allChunksUnder32K: boolean;
		fullCoverage: boolean;
	};
}

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'];
const MAX_TOKENS = 32_000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

const codeFiles = fs.readdirSync(FIXTURES_DIR).filter(f => EXTENSIONS.some(ext => f.endsWith(ext)));
let generatedCount = 0;

for (const file of codeFiles) {
	const expectedFile = file.replace(/\.[^.]+$/, '.chunker-expected.json');
	const expectedPath = path.join(EXPECTATIONS_DIR, expectedFile);

	// Only generate if missing
	if (fs.existsSync(expectedPath)) {
		console.log(`Exists: ${expectedFile}`);
		continue;
	}

	const codePath = path.join(FIXTURES_DIR, file);
	const source = fs.readFileSync(codePath, 'utf-8');
	const parsed = parseSource(source, codePath, FIXTURES_DIR);
	const { chunks } = chunkFile(parsed, source);

	const expectedChunks: ExpectedChunk[] = chunks.map(chunk => ({
		breadcrumb: chunk.breadcrumb,
		nodeKind: chunk.nodeKind,
		hasCollapsedChildren: chunk.childChunkIds.length > 0,
		isLeaf: !BODY_BEARING_KINDS.has(chunk.nodeKind) || chunk.childChunkIds.length === 0,
		lineCount: chunk.endLine - chunk.startLine + 1,
		relevantImports: chunk.relevantImports,
	}));

	const maxDepth = chunks.reduce((max, c) => Math.max(max, c.depth), -1);
	const allUnder32K = chunks.every(c => c.embeddingText.length <= MAX_CHARS);

	// Check full coverage
	const fileLines = source.split('\n');
	const totalLines = fileLines.length;
	const coveredLines = new Set<number>();
	for (const chunk of chunks) {
		if (chunk.depth === 0) {
			for (let i = chunk.startLine; i <= chunk.endLine; i++) {
				coveredLines.add(i);
			}
		}
	}
	const fullCoverage = !fileLines.some((line, idx) => {
		const lineNum = idx + 1;
		return line.trim() !== '' && !coveredLines.has(lineNum);
	});

	const expectation: ChunkExpectation = {
		chunks: expectedChunks,
		stats: {
			totalChunks: chunks.length,
			maxDepth,
			allChunksUnder32K: allUnder32K,
			fullCoverage,
		},
	};

	fs.writeFileSync(expectedPath, JSON.stringify(expectation, null, 2) + '\n');
	generatedCount++;
	console.log(`Generated: ${expectedFile}`);
}

console.log(`\nDone. Generated ${generatedCount} new expectation files.`);
