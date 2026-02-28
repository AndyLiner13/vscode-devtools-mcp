import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseSource } from '../../src/parser/index';
import { chunkFile } from '../../src/chunker/index';
import { BODY_BEARING_KINDS } from '../../src/parser/types';
import type { CodeChunk } from '../../src/chunker/types';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const EXPECTATIONS_DIR = path.join(__dirname, 'expectations');

// Estimated token count: ~4 chars per token
const MAX_TOKENS = 32_000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

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

function discoverFixtures(): Array<{ name: string; codePath: string; expectedPath: string }> {
	if (!fs.existsSync(FIXTURES_DIR) || !fs.existsSync(EXPECTATIONS_DIR)) return [];

	const codeFiles = fs.readdirSync(FIXTURES_DIR);
	const expectedFiles = fs.readdirSync(EXPECTATIONS_DIR);
	const fixtures: Array<{ name: string; codePath: string; expectedPath: string }> = [];

	for (const file of codeFiles) {
		const expectedFile = file.replace(/\.[^.]+$/, '.chunker-expected.json');
		if (expectedFiles.includes(expectedFile)) {
			fixtures.push({
				name: file,
				codePath: path.join(FIXTURES_DIR, file),
				expectedPath: path.join(EXPECTATIONS_DIR, expectedFile),
			});
		}
	}

	return fixtures;
}

// ── Tests ──

const fixtures = discoverFixtures();

describe('Chunker: data-driven fixtures', () => {
	if (fixtures.length === 0) {
		it.skip('no chunker fixtures found', () => {});
		return;
	}

	for (const fixture of fixtures) {
		describe(fixture.name, () => {
			const source = fs.readFileSync(fixture.codePath, 'utf-8');
			const expected: ChunkExpectation = JSON.parse(
				fs.readFileSync(fixture.expectedPath, 'utf-8'),
			);

			const parsed = parseSource(source, fixture.codePath, FIXTURES_DIR);
			const { chunks } = chunkFile(parsed, source);

			// ── Total chunk count ──
			it('should have the correct total chunk count', () => {
				expect(chunks.length).toBe(expected.stats.totalChunks);
			});

			// ── Max depth ──
			it('should have the correct max depth', () => {
				const maxDepth = chunks.reduce((max, c) => Math.max(max, c.depth), -1);
				expect(maxDepth).toBe(expected.stats.maxDepth);
			});

			// ── Individual chunk assertions ──
			it('should match expected chunks', () => {
				const consumed = new Set<number>();

				for (const exp of expected.chunks) {
					const matchIdx = chunks.findIndex(
						(c, idx) =>
							!consumed.has(idx) &&
							c.breadcrumb === exp.breadcrumb &&
							c.nodeKind === exp.nodeKind,
					);

					expect(
						matchIdx,
						`Chunk not found: ${exp.nodeKind} ${exp.breadcrumb}`,
					).not.toBe(-1);

					if (matchIdx === -1) continue;
					consumed.add(matchIdx);
					const chunk = chunks[matchIdx];

					expect(chunk.childChunkIds.length > 0).toBe(exp.hasCollapsedChildren);

					const isLeaf = !BODY_BEARING_KINDS.has(chunk.nodeKind)
						|| chunk.childChunkIds.length === 0;
					expect(isLeaf).toBe(exp.isLeaf);

					const chunkLineCount = chunk.endLine - chunk.startLine + 1;
					expect(chunkLineCount).toBe(exp.lineCount);

					expect(chunk.relevantImports.sort()).toEqual(exp.relevantImports.sort());
				}
			});

			// ── Global: full coverage ──
			it('should cover every non-blank line in the source file', () => {
				const fileLines = source.split('\n');
				const totalLines = fileLines.length;

				// Collect lines covered by root-level chunks (depth 0)
				const coveredLines = new Set<number>();
				for (const chunk of chunks) {
					if (chunk.depth === 0) {
						for (let i = chunk.startLine; i <= chunk.endLine; i++) {
							coveredLines.add(i);
						}
					}
				}

				// Every non-blank line must be covered
				const uncoveredLines: number[] = [];
				for (let i = 1; i <= totalLines; i++) {
					const lineContent = fileLines[i - 1] ?? '';
					const isBlank = lineContent.trim() === '';
					if (!isBlank && !coveredLines.has(i)) {
						uncoveredLines.push(i);
					}
				}

				expect(
					uncoveredLines,
					`Lines not covered by any root-level chunk: ${uncoveredLines.join(', ')}`,
				).toEqual([]);
			});

			// ── Global: source fidelity ──
			it('should extract fullSource matching file content at line range', () => {
				const fileLines = source.split('\n');
				for (const chunk of chunks) {
					const expected = fileLines.slice(chunk.startLine - 1, chunk.endLine).join('\n');
					expect(
						chunk.fullSource,
						`Source mismatch for ${chunk.breadcrumb}`,
					).toBe(expected);
				}
			});

			// ── Global: token limit ──
			it('should have all embeddingText under 32K tokens', () => {
				for (const chunk of chunks) {
					expect(
						chunk.embeddingText.length,
						`Token limit exceeded for ${chunk.breadcrumb}: ${Math.ceil(chunk.embeddingText.length / CHARS_PER_TOKEN)} tokens`,
					).toBeLessThanOrEqual(MAX_CHARS);
				}
			});

			// ── Global: hierarchy consistency ──
			it('should have consistent parent-child chunk ID links', () => {
				const idSet = new Set(chunks.map(c => c.id));

				for (const chunk of chunks) {
					if (chunk.parentChunkId !== null) {
						expect(
							idSet.has(chunk.parentChunkId),
							`Parent ${chunk.parentChunkId} not found for ${chunk.breadcrumb}`,
						).toBe(true);

						const parent = chunks.find(c => c.id === chunk.parentChunkId);
						expect(
							parent?.childChunkIds,
							`Parent ${parent?.breadcrumb} does not list child ${chunk.breadcrumb}`,
						).toContain(chunk.id);
					}

					for (const childId of chunk.childChunkIds) {
						expect(
							idSet.has(childId),
							`Child ${childId} not found for ${chunk.breadcrumb}`,
						).toBe(true);

						const child = chunks.find(c => c.id === childId);
						expect(
							child?.parentChunkId,
							`Child ${child?.breadcrumb} parentChunkId should point to ${chunk.breadcrumb}`,
						).toBe(chunk.id);
					}
				}
			});

			// ── Global: no sibling overlap ──
			it('should have no overlapping sibling chunks at the same depth', () => {
				const byParent = new Map<string | null, CodeChunk[]>();
				for (const chunk of chunks) {
					const key = chunk.parentChunkId;
					const siblings = byParent.get(key) ?? [];
					siblings.push(chunk);
					byParent.set(key, siblings);
				}

				for (const [parentId, siblings] of byParent) {
					const sorted = [...siblings].sort((a, b) => a.startLine - b.startLine);
					for (let i = 1; i < sorted.length; i++) {
						expect(
							sorted[i].startLine,
							`Sibling overlap under parent ${parentId}: ${sorted[i - 1].breadcrumb} (${sorted[i - 1].startLine}-${sorted[i - 1].endLine}) and ${sorted[i].breadcrumb} (${sorted[i].startLine}-${sorted[i].endLine})`,
						).toBeGreaterThan(sorted[i - 1].endLine);
					}
				}
			});

			// ── Global: collapsed children correctness ──
			it('should collapse body-bearing children to signatures in embeddingText', () => {
				for (const chunk of chunks) {
					const bodyBearingChildren = chunks.filter(
						c => c.parentChunkId === chunk.id && BODY_BEARING_KINDS.has(c.nodeKind),
					);

					if (bodyBearingChildren.length === 0) {
						// Leaf: embeddingText should equal fullSource
						expect(
							chunk.embeddingText,
							`Leaf ${chunk.breadcrumb} embeddingText should equal fullSource`,
						).toBe(chunk.fullSource);
					} else {
						// Parent: embeddingText should NOT contain body-bearing children's full bodies
						for (const child of bodyBearingChildren) {
							const childBodyLines = child.fullSource.split('\n');
							// If child has more than 1 line, the full body should not appear
							if (childBodyLines.length > 1) {
								expect(
									chunk.embeddingText.includes(child.fullSource),
									`Parent ${chunk.breadcrumb} embeddingText should not contain full body of ${child.breadcrumb}`,
								).toBe(false);
							}
						}

						// Parent's embeddingText should contain each body-bearing child's signature
						for (const child of bodyBearingChildren) {
							expect(
								chunk.embeddingText.includes(child.signature),
								`Parent ${chunk.breadcrumb} embeddingText should contain signature of ${child.breadcrumb}: "${child.signature}"`,
							).toBe(true);
						}
					}
				}
			});

			// ── Global: stub format correctness ──
			it('should format collapsed stubs with semicolon terminator, no braces', () => {
				for (const chunk of chunks) {
					const bodyBearingChildren = chunks.filter(
						c => c.parentChunkId === chunk.id && BODY_BEARING_KINDS.has(c.nodeKind),
					);

					for (const child of bodyBearingChildren) {
						// Find the stub line in the parent's embeddingText
						// The stub line should match "signature;" pattern, not just contain the signature
						const embeddingLines = chunk.embeddingText.split('\n');
						const stubLine = embeddingLines.find(line => {
							const trimmed = line.trim();
							// Stub line must start with signature text and end with ;
							// This avoids matching JSDoc lines that mention the method name
							return trimmed.includes(child.signature) &&
								trimmed.endsWith(';') &&
								!trimmed.startsWith('*') &&
								!trimmed.startsWith('//');
						});

						if (stubLine) {
							// Stub should end with ; (after trimming whitespace)
							expect(
								stubLine.trimEnd().endsWith(';'),
								`Stub for ${child.breadcrumb} should end with semicolon: "${stubLine.trim()}"`,
							).toBe(true);

							// Stub should NOT contain function body: ") {" or "> {" patterns
							// (But inline object types like "config: { a: number }" are allowed)
							const hasBodyOpening = /\)\s*\{[^}]|>\s*\{[^}]/.test(stubLine);
							expect(
								hasBodyOpening,
								`Stub for ${child.breadcrumb} should not contain function body: "${stubLine.trim()}"`,
							).toBe(false);
						}
					}
				}
			});

			// ── Global: relevantImports accuracy ──
			it('should only include imports whose identifiers appear in chunk source', () => {
				const importChunks = chunks.filter(c => c.nodeKind === 'import');

				for (const chunk of chunks) {
					if (chunk.nodeKind === 'import' || chunk.nodeKind === 're-export') continue;

					for (const impChunk of importChunks) {
						const sig = impChunk.signature;
						const isInRelevant = chunk.relevantImports.includes(sig);

						if (isInRelevant) {
							// If import is marked relevant, at least one identifier must appear in chunk source
							// Extract identifiers from import signature
							const identifiers: string[] = [];

							// Namespace import: import * as Name
							const nsMatch = sig.match(/\*\s+as\s+(\w+)/);
							if (nsMatch) identifiers.push(nsMatch[1]);

							// Named imports: { A, B as C }
							const namedMatch = sig.match(/\{\s*([^}]+)\s*\}/);
							if (namedMatch) {
								const names = namedMatch[1].split(',').map(n => n.trim());
								for (const name of names) {
									const asMatch = name.match(/\w+\s+as\s+(\w+)/);
									if (asMatch) {
										identifiers.push(asMatch[1]);
									} else {
										const cleanName = name.replace(/^type\s+/, '').trim();
										if (cleanName) identifiers.push(cleanName);
									}
								}
							}

							// Default import
							const defaultMatch = sig.match(/^import\s+(?:type\s+)?([A-Za-z_$]\w*)(?:\s*,|\s+from)/);
							if (defaultMatch) identifiers.push(defaultMatch[1]);

							const usesAnyIdentifier = identifiers.some(id => {
								const pattern = new RegExp(`\\b${id}\\b`);
								return pattern.test(chunk.fullSource);
							});

							expect(
								usesAnyIdentifier,
								`Chunk ${chunk.breadcrumb} has import "${sig}" in relevantImports but doesn't use any of its identifiers: ${identifiers.join(', ')}`,
							).toBe(true);
						}
					}
				}
			});

			// ── Global: breadcrumb accuracy ──
			it('should have accurate breadcrumbs built from hierarchy', () => {
				for (const chunk of chunks) {
					const parts: string[] = [chunk.relativePath];

					// Walk up parent chain
					let currentParentId = chunk.parentChunkId;
					const ancestors: string[] = [];
					while (currentParentId !== null) {
						const parent = chunks.find(c => c.id === currentParentId);
						if (!parent) break;
						ancestors.unshift(parent.name);
						currentParentId = parent.parentChunkId;
					}

					parts.push(...ancestors, chunk.name);
					const expectedBreadcrumb = parts.join(' > ');
					expect(chunk.breadcrumb).toBe(expectedBreadcrumb);
				}
			});

			// ── Global: deterministic output ──
			it('should produce deterministic chunk IDs across runs', () => {
				const parsed2 = parseSource(source, fixture.codePath, FIXTURES_DIR);
				const { chunks: chunks2 } = chunkFile(parsed2, source);

				const ids1 = chunks.map(c => c.id).sort();
				const ids2 = chunks2.map(c => c.id).sort();
				expect(ids1).toEqual(ids2);
			});

			// ── Global: root-level isolation ──
			it('should produce exactly one chunk per root-level import/expression/re-export', () => {
				const rootItems = chunks.filter(
					c => c.depth === 0 && (c.nodeKind === 'import' || c.nodeKind === 'expression' || c.nodeKind === 're-export'),
				);

				// Each should have a unique startLine (no merging)
				const startLines = rootItems.map(c => c.startLine);
				const uniqueStartLines = new Set(startLines);
				expect(startLines.length).toBe(uniqueStartLines.size);
			});
		});
	}
});
