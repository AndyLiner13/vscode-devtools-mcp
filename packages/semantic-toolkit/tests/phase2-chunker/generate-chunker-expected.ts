/**
 * Generate .chunker-expected.json for all fixture files.
 * Run from semantic-toolkit root: npx tsx tests/phase2-chunker/generate-chunker-expected.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource } from '../../src/parser/index';
import { chunkFile } from '../../src/chunker/index';
import { BODY_BEARING_KINDS } from '../../src/parser/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const EXPECTATIONS_DIR = path.join(__dirname, 'expectations');

const PARSEABLE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'];

interface ExpectedChunk {
	breadcrumb: string;
	nodeKind: string;
	hasCollapsedChildren: boolean;
	isLeaf: boolean;
	lineCount: number;
	relevantImports: string[];
}

interface ExpectedChunkStats {
	totalChunks: number;
	maxDepth: number;
	allChunksUnder32K: boolean;
	fullCoverage: boolean;
}

interface ChunkExpectation {
	chunks: ExpectedChunk[];
	stats: ExpectedChunkStats;
}

if (!fs.existsSync(EXPECTATIONS_DIR)) {
	fs.mkdirSync(EXPECTATIONS_DIR, { recursive: true });
}

const codeFiles = fs.readdirSync(FIXTURES_DIR).filter(f => {
	const ext = path.extname(f);
	return PARSEABLE_EXTS.includes(ext);
});

console.log(`Generating chunker expectations for ${codeFiles.length} fixture(s):`);

const MAX_CHARS = 32_000 * 4;

for (const file of codeFiles) {
	const codePath = path.join(FIXTURES_DIR, file);
	const expectedPath = path.join(EXPECTATIONS_DIR, file.replace(/\.[^.]+$/, '.chunker-expected.json'));
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

	// Full coverage check: every non-blank source line is covered by at least one root-level chunk
	const fileLines = source.split('\n');
	const coveredLines = new Set<number>();
	for (const chunk of chunks) {
		if (chunk.depth === 0) {
			for (let i = chunk.startLine; i <= chunk.endLine; i++) {
				coveredLines.add(i);
			}
		}
	}

	let fullCoverage = true;
	for (let i = 1; i <= fileLines.length; i++) {
		const line = fileLines[i - 1];
		const isBlank = line.trim() === '';
		if (!isBlank && !coveredLines.has(i)) {
			fullCoverage = false;
			break;
		}
	}

	const expected: ChunkExpectation = {
		chunks: expectedChunks,
		stats: {
			totalChunks: chunks.length,
			maxDepth,
			allChunksUnder32K: allUnder32K,
			fullCoverage,
		},
	};

	fs.writeFileSync(expectedPath, JSON.stringify(expected, null, 2) + '\n');
	console.log(`  ✓ ${file} → ${chunks.length} chunks, maxDepth=${maxDepth}, coverage=${fullCoverage}`);
}

console.log('Done!');
