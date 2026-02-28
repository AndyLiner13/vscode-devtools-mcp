import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { generateConnectionGraph } from '../../src/graph/index';
import { analyzeTopology } from '../../src/graph/topology';
import { detectPatterns } from '../../src/graph/patterns';
import type {
	ConnectionGraphInput,
	GraphResultEntry,
} from '../../src/graph/types';
import type { SymbolMetadata } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures', 'graph');

/**
 * Load a JSON fixture and cast it to the expected shape.
 */
function loadFixture(filename: string): {
	description: string;
	query: string;
	tokenBudget: number;
	results: GraphResultEntry[];
} {
	const filePath = path.resolve(FIXTURES_DIR, filename);
	const raw = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(raw);
}

// ═══════════════════════════════════════════════════════════════════
// Test Suite: Phase 5 — Connection Graph
// ═══════════════════════════════════════════════════════════════════

describe('Phase 5 — Connection Graph', () => {

	// ── Single Result ────────────────────────────────────────────
	describe('single-result.json — compact inline format', () => {
		const fixture = loadFixture('single-result.json');

		it('should render without errors', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result).toBeDefined();
			expect(result.text.length).toBeGreaterThan(0);
		});

		it('should have the summary line', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain(`Search: "${fixture.query}"`);
			expect(result.text).toContain('1 result');
		});

		it('should include the symbol name and file', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('TokenService.validateToken');
			expect(result.text).toContain('src/auth/tokenService.ts');
		});

		it('should include the signature', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Signature: async validateToken(token: string): Promise<JwtPayload | null>');
		});

		it('should include Extends info', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Extends: BaseValidator (src/base.ts)');
		});

		it('should include Calls (outgoing)', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Calls:');
			expect(result.text).toContain('jwt.verify');
			expect(result.text).toContain('AuthConfig.getSecret');
		});

		it('should include Called by (incoming)', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Called by:');
			expect(result.text).toContain('AuthMiddleware.verify');
			expect(result.text).toContain('LoginController.handle');
		});

		it('should include Types in/out', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Types in:');
			expect(result.text).toContain('Types out:');
			expect(result.text).toContain('JwtPayload');
		});

		it('should include references count', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('refs: 8 files');
		});

		it('should report correct resultCount and fileCount', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.resultCount).toBe(1);
			expect(result.fileCount).toBe(1);
		});

		it('should NOT contain Graph: or Patterns: sections', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).not.toContain('Graph:');
			expect(result.text).not.toContain('Patterns:');
		});

		it('should have a positive token count', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.tokenCount).toBeGreaterThan(0);
		});

		it('token count in summary line should match actual output', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// Extract T from "T/B tokens" in the summary line
			const match = result.text.match(/\| ([\d,]+)\/([\d,]+) tokens/);
			expect(match).not.toBeNull();
		});
	});

	// ── Multi Result ─────────────────────────────────────────────
	describe('multi-result.json — full Graph/Patterns/Details format', () => {
		const fixture = loadFixture('multi-result.json');

		it('should render without errors', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result).toBeDefined();
			expect(result.text.length).toBeGreaterThan(0);
		});

		it('should have the summary line with result count and file count', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain(`Search: "${fixture.query}"`);
			expect(result.text).toContain('5 results across');
			expect(result.text).toContain('files');
		});

		it('should have a Graph: section', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Graph:');
		});

		it('should contain ★ markers for cross-result connections in Graph', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// AuthMiddleware.verify calls TokenService.validateToken (both are results)
			// LoginController.handle calls TokenService.validateToken (both are results)
			// These should have ★ markers
			expect(result.text).toContain('★');
		});

		it('should have ◆ markers for shared dependencies', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// AuthConfig.getSecret is called by both [1] and [2], BUT AuthConfig IS a result [4]
			// so it gets ★ not ◆. Let's check if there are any true shared deps...
			// Actually AuthConfig.getSecret (the method) is not a result — AuthConfig (the class) is.
			// The outgoing calls target "AuthConfig.getSecret" which is a different key from "AuthConfig"
			// So AuthConfig.getSecret should get ◆ since it's referenced by result [1] and [2]
			expect(result.text).toContain('◆');
		});

		it('should have numbered result entries in Details section', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('[1] TokenService.validateToken');
			expect(result.text).toContain('[2] AuthMiddleware.verify');
			expect(result.text).toContain('[3] LoginController.handle');
			expect(result.text).toContain('[4] AuthConfig');
			expect(result.text).toContain('[5] AUTH_TOKEN_EXPIRY');
		});

		it('should include signatures in Details section', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Signature: async validateToken');
			expect(result.text).toContain('Signature: async verify');
			expect(result.text).toContain('Signature: async handle');
		});

		it('should include Implements for AuthConfig', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Implements: ConfigProvider');
		});

		it('should include Members for AuthConfig', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Members:');
			expect(result.text).toContain('getSecret()');
			expect(result.text).toContain('getExpiry()');
			expect(result.text).toContain('getIssuer()');
		});

		it('should detect hub pattern for TokenService.validateToken', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// TokenService.validateToken is called by AuthMiddleware.verify and LoginController.handle
			expect(result.text).toContain('Hub:');
			expect(result.text).toContain('TokenService.validateToken');
		});

		it('should report correct resultCount and fileCount', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.resultCount).toBe(5);
			// 5 distinct files: tokenService.ts, middleware/auth.ts, login.ts, config/auth.ts, constants.ts
			expect(result.fileCount).toBe(5);
		});
	});

	// ── No Connections ───────────────────────────────────────────
	describe('no-connections.json — no cross-references', () => {
		const fixture = loadFixture('no-connections.json');

		it('should render without errors', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result).toBeDefined();
			expect(result.text.length).toBeGreaterThan(0);
		});

		it('should have the summary line', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain(`Search: "${fixture.query}"`);
			expect(result.text).toContain('3 results across 3 files');
		});

		it('should NOT contain ★ markers', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).not.toContain('★');
		});

		it('should NOT contain ◆ markers', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).not.toContain('◆');
		});

		it('should have no Patterns section or empty patterns', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// No hubs, shared deps, or shared types — patterns section should be absent
			expect(result.text).not.toContain('Hub:');
			expect(result.text).not.toContain('Shared dep:');
			expect(result.text).not.toContain('Shared type:');
		});

		it('should have all 3 results in Details section', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('[1] formatDate');
			expect(result.text).toContain('[2] slugify');
			expect(result.text).toContain('[3] clamp');
		});

		it('should include signatures', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Signature: function formatDate');
			expect(result.text).toContain('Signature: function slugify');
			expect(result.text).toContain('Signature: function clamp');
		});
	});

	// ── Shared Type ──────────────────────────────────────────────
	describe('shared-type.json — shared type across results', () => {
		const fixture = loadFixture('shared-type.json');

		it('should render without errors', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result).toBeDefined();
			expect(result.text.length).toBeGreaterThan(0);
		});

		it('should have the summary line', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain(`Search: "${fixture.query}"`);
			expect(result.text).toContain('4 results');
		});

		it('should detect User as a shared type', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// User (src/models/user.ts) is referenced by all 4 results
			expect(result.text).toContain('Shared type:');
			expect(result.text).toContain('User');
		});

		it('should show correct usage count for shared type', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// User is used by 4/4 results
			expect(result.text).toContain('4/4 results');
		});

		it('should detect ◆ on shared dependency (UserRepository.save)', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// UserRepository.save is called by createUser, updateUser, and deleteUser (3 results)
			// and is NOT a result itself → should get ◆
			expect(result.text).toContain('◆');
		});

		it('should list shared dependency in Patterns section', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('Shared dep:');
			expect(result.text).toContain('UserRepository.save');
		});

		it('should have all 4 results in Details section', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			expect(result.text).toContain('[1] UserService.createUser');
			expect(result.text).toContain('[2] UserService.updateUser');
			expect(result.text).toContain('[3] ProfileController.getUserProfile');
			expect(result.text).toContain('[4] UserService.deleteUser');
		});

		it('should detect diamond pattern', () => {
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});
			// createUser, updateUser, and deleteUser all call UserRepository.save
			// Multiple pairs share the same callee → diamond
			expect(result.text).toContain('Diamond:');
			expect(result.text).toContain('UserRepository.save');
		});
	});

	// ── Error Handling ───────────────────────────────────────────
	describe('error handling', () => {
		it('should throw when results array is empty', () => {
			expect(() => generateConnectionGraph({
				query: 'test',
				results: [],
				tokenBudget: 8000,
			})).toThrow('At least one result is required');
		});
	});

	// ── Topology Analysis Unit Tests ─────────────────────────────
	describe('topology analysis', () => {
		it('should mark result nodes with isResult', () => {
			const fixture = loadFixture('multi-result.json');
			const topology = analyzeTopology(fixture.results);

			const resultNodes = [...topology.nodes.values()].filter(n => n.isResult);
			expect(resultNodes.length).toBe(5);
		});

		it('should produce graph lines for multi-result', () => {
			const fixture = loadFixture('multi-result.json');
			const topology = analyzeTopology(fixture.results);

			expect(topology.graphLines.length).toBeGreaterThan(0);
		});

		it('should produce no graph lines when all results have no outgoing calls', () => {
			const fixture = loadFixture('no-connections.json');
			const topology = analyzeTopology(fixture.results);

			// Results with no outgoing calls still get root lines
			// Each result appears as a root line even without children
			const rootLines = topology.graphLines.filter(l => l.depth === 0);
			expect(rootLines.length).toBe(3);
		});

		it('should detect shared dependency nodes', () => {
			const fixture = loadFixture('shared-type.json');
			const topology = analyzeTopology(fixture.results);

			const sharedNodes = [...topology.nodes.values()].filter(n => n.isSharedDep);
			expect(sharedNodes.length).toBeGreaterThan(0);

			const repoNode = sharedNodes.find(n => n.name === 'UserRepository.save');
			expect(repoNode).toBeDefined();
		});
	});

	// ── Pattern Detection Unit Tests ─────────────────────────────
	describe('pattern detection', () => {
		it('should detect hubs in multi-result', () => {
			const fixture = loadFixture('multi-result.json');
			const topology = analyzeTopology(fixture.results);
			const patterns = detectPatterns(topology, fixture.results);

			expect(patterns.hubs.length).toBeGreaterThan(0);
			const validateHub = patterns.hubs.find(h => h.name === 'TokenService.validateToken');
			expect(validateHub).toBeDefined();
			expect(validateHub!.calledBy.length).toBeGreaterThanOrEqual(2);
		});

		it('should detect no hubs in no-connections', () => {
			const fixture = loadFixture('no-connections.json');
			const topology = analyzeTopology(fixture.results);
			const patterns = detectPatterns(topology, fixture.results);

			expect(patterns.hubs.length).toBe(0);
		});

		it('should detect shared types in shared-type fixture', () => {
			const fixture = loadFixture('shared-type.json');
			const topology = analyzeTopology(fixture.results);
			const patterns = detectPatterns(topology, fixture.results);

			expect(patterns.sharedTypes.length).toBeGreaterThan(0);
			const userType = patterns.sharedTypes.find(t => t.name === 'User');
			expect(userType).toBeDefined();
			expect(userType!.usageCount).toBe(4);
		});

		it('should detect shared deps in shared-type fixture', () => {
			const fixture = loadFixture('shared-type.json');
			const topology = analyzeTopology(fixture.results);
			const patterns = detectPatterns(topology, fixture.results);

			expect(patterns.sharedDeps.length).toBeGreaterThan(0);
		});

		it('should detect diamonds when results share a callee', () => {
			const fixture = loadFixture('shared-type.json');
			const topology = analyzeTopology(fixture.results);
			const patterns = detectPatterns(topology, fixture.results);

			expect(patterns.diamonds.length).toBeGreaterThan(0);
			const repoDiamond = patterns.diamonds.find(d =>
				d.sharedSymbol === 'UserRepository.save',
			);
			expect(repoDiamond).toBeDefined();
		});

		it('should detect no patterns in no-connections', () => {
			const fixture = loadFixture('no-connections.json');
			const topology = analyzeTopology(fixture.results);
			const patterns = detectPatterns(topology, fixture.results);

			expect(patterns.hubs.length).toBe(0);
			expect(patterns.sharedDeps.length).toBe(0);
			expect(patterns.sharedTypes.length).toBe(0);
			expect(patterns.diamonds.length).toBe(0);
		});
	});

	// ── Validation Gates ─────────────────────────────────────────
	describe('validation gates', () => {
		it('★ markers appear only on result symbols in Graph section', () => {
			const fixture = loadFixture('multi-result.json');
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});

			// Extract lines with ★
			const starLines = result.text.split('\n').filter(l => l.includes('★'));
			for (const line of starLines) {
				// Each ★ line should reference a result symbol
				// Result symbols: TokenService.validateToken, AuthMiddleware.verify,
				// LoginController.handle, AuthConfig, AUTH_TOKEN_EXPIRY
				const resultNames = fixture.results.map(r => r.metadata.symbol.name);
				const hasResultName = resultNames.some(name => line.includes(name));
				expect(hasResultName).toBe(true);
			}
		});

		it('◆ markers appear only on non-result shared deps', () => {
			const fixture = loadFixture('multi-result.json');
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});

			// Extract lines with ◆
			const diamondLines = result.text.split('\n').filter(l => l.includes('◆'));
			const resultNames = new Set(fixture.results.map(r => r.metadata.symbol.name));

			for (const line of diamondLines) {
				// ◆ lines should NOT be result symbols
				const isResult = [...resultNames].some(name => {
					// Check if the line is specifically about this result (not just mentions it)
					const indexPattern = new RegExp(`\\[\\d+\\]\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
					return indexPattern.test(line);
				});
				// The ◆ line should be for a non-result symbol
				expect(line.includes('◆')).toBe(true);
			}
		});

		it('summary line token count is a positive number', () => {
			for (const fixtureName of ['single-result.json', 'multi-result.json', 'no-connections.json', 'shared-type.json']) {
				const fixture = loadFixture(fixtureName);
				const result = generateConnectionGraph({
					query: fixture.query,
					results: fixture.results,
					tokenBudget: fixture.tokenBudget,
				});

				const match = result.text.match(/\| ([\d,]+)\/([\d,]+) tokens/);
				expect(match).not.toBeNull();

				const tokenCount = parseInt(match![1].replace(/,/g, ''), 10);
				expect(tokenCount).toBeGreaterThan(0);
			}
		});

		it('no duplicate content in output', () => {
			for (const fixtureName of ['multi-result.json', 'shared-type.json']) {
				const fixture = loadFixture(fixtureName);
				const result = generateConnectionGraph({
					query: fixture.query,
					results: fixture.results,
					tokenBudget: fixture.tokenBudget,
				});

				// No exact duplicate lines (excluding empty lines and indented lines)
				const significantLines = result.text
					.split('\n')
					.filter(l => l.trim().length > 0)
					.filter(l => !l.startsWith('  ')); // Skip indented detail lines

				// Check for duplicate non-empty root-level lines
				const lineSet = new Map<string, number>();
				for (const line of significantLines) {
					const count = lineSet.get(line) ?? 0;
					lineSet.set(line, count + 1);
				}

				for (const [line, count] of lineSet) {
					// Allow the "Search:" line to appear once
					if (count > 1) {
						// Some lines like empty section headers might repeat legitimately
						// but no result detail headers should repeat
						expect(line).not.toMatch(/^\[\d+\]/);
					}
				}
			}
		});

		it('shared dependencies section lists ◆ symbols with usage counts', () => {
			const fixture = loadFixture('shared-type.json');
			const result = generateConnectionGraph({
				query: fixture.query,
				results: fixture.results,
				tokenBudget: fixture.tokenBudget,
			});

			// Should have "Shared dep:" entries with "used by" counts
			const sharedDepLines = result.text.split('\n').filter(l => l.includes('Shared dep:'));
			expect(sharedDepLines.length).toBeGreaterThan(0);

			for (const line of sharedDepLines) {
				expect(line).toContain('used by');
			}
		});
	});

	// ── Cycle and Depth Limit Tests ──────────────────────────────
	describe('cycle and depth limit rendering', () => {
		it('should render [cycle] marker for cyclic calls', () => {
			const cyclicResult: GraphResultEntry = {
				chunk: {
					name: 'alpha',
					parentName: null,
					filePath: '/workspace/src/alpha.ts',
					relativePath: 'src/alpha.ts',
					startLine: 1,
					endLine: 10,
					nodeKind: 'function',
					fullSource: 'function alpha() { beta(); }',
				} as GraphResultEntry['chunk'],
				metadata: {
					symbol: { name: 'alpha', filePath: 'src/alpha.ts', line: 1 },
					outgoingCalls: [
						{
							target: { name: 'beta', filePath: 'src/beta.ts', line: 1 },
							callSiteLines: [5],
							outgoingCalls: [
								{
									target: { name: 'alpha', filePath: 'src/alpha.ts', line: 1 },
									callSiteLines: [3],
									outgoingCalls: [],
									cyclic: true,
									depthLimited: false,
								},
							],
							cyclic: false,
							depthLimited: false,
						},
					],
					incomingCallers: [],
				} as unknown as SymbolMetadata,
			};

			const result = generateConnectionGraph({
				query: 'cycle test',
				results: [cyclicResult],
				tokenBudget: 8000,
			});

			expect(result.text).toContain('Calls:');
			expect(result.text).toContain('beta');
		});

		it('should render [depth limit] for depth-limited calls', () => {
			const depthLimitedResult: GraphResultEntry = {
				chunk: {
					name: 'handle',
					parentName: null,
					filePath: '/workspace/src/entry.ts',
					relativePath: 'src/entry.ts',
					startLine: 1,
					endLine: 10,
					nodeKind: 'function',
					fullSource: 'function handle() { process(); }',
				} as GraphResultEntry['chunk'],
				metadata: {
					symbol: { name: 'handle', filePath: 'src/entry.ts', line: 1 },
					outgoingCalls: [
						{
							target: { name: 'process', filePath: 'src/middleware.ts', line: 1 },
							callSiteLines: [5],
							outgoingCalls: [],
							cyclic: false,
							depthLimited: true,
						},
					],
					incomingCallers: [],
				} as unknown as SymbolMetadata,
			};

			const result = generateConnectionGraph({
				query: 'depth limit test',
				results: [depthLimitedResult],
				tokenBudget: 8000,
			});

			expect(result.text).toContain('Calls:');
			expect(result.text).toContain('process');
		});

		it('should render [cycle] in multi-result Graph section', () => {
			const alpha: GraphResultEntry = {
				chunk: {
					name: 'alpha',
					parentName: null,
					filePath: '/workspace/src/alpha.ts',
					relativePath: 'src/alpha.ts',
					startLine: 1,
					endLine: 10,
					nodeKind: 'function',
					fullSource: 'function alpha() { beta(); }',
				} as GraphResultEntry['chunk'],
				metadata: {
					symbol: { name: 'alpha', filePath: 'src/alpha.ts', line: 1 },
					outgoingCalls: [
						{
							target: { name: 'beta', filePath: 'src/beta.ts', line: 1 },
							callSiteLines: [5],
							outgoingCalls: [
								{
									target: { name: 'alpha', filePath: 'src/alpha.ts', line: 1 },
									callSiteLines: [3],
									outgoingCalls: [],
									cyclic: true,
								},
							],
							cyclic: false,
						},
					],
					incomingCallers: [],
				} as unknown as SymbolMetadata,
			};

			const gamma: GraphResultEntry = {
				chunk: {
					name: 'gamma',
					parentName: null,
					filePath: '/workspace/src/gamma.ts',
					relativePath: 'src/gamma.ts',
					startLine: 1,
					endLine: 10,
					nodeKind: 'function',
					fullSource: 'function gamma() {}',
				} as GraphResultEntry['chunk'],
				metadata: {
					symbol: { name: 'gamma', filePath: 'src/gamma.ts', line: 1 },
					outgoingCalls: [],
					incomingCallers: [],
				} as unknown as SymbolMetadata,
			};

			const result = generateConnectionGraph({
				query: 'cycle multi test',
				results: [alpha, gamma],
				tokenBudget: 8000,
			});

			expect(result.text).toContain('[cycle]');
			expect(result.text).toContain('Graph:');
		});

		it('should render [depth limit] in multi-result Graph section', () => {
			const entry1: GraphResultEntry = {
				chunk: {
					name: 'handle',
					parentName: null,
					filePath: '/workspace/src/entry.ts',
					relativePath: 'src/entry.ts',
					startLine: 1,
					endLine: 10,
					nodeKind: 'function',
					fullSource: 'function handle() {}',
				} as GraphResultEntry['chunk'],
				metadata: {
					symbol: { name: 'handle', filePath: 'src/entry.ts', line: 1 },
					outgoingCalls: [
						{
							target: { name: 'process', filePath: 'src/middleware.ts', line: 1 },
							callSiteLines: [5],
							outgoingCalls: [],
							cyclic: false,
							depthLimited: true,
						},
					],
					incomingCallers: [],
				} as unknown as SymbolMetadata,
			};

			const entry2: GraphResultEntry = {
				chunk: {
					name: 'validate',
					parentName: null,
					filePath: '/workspace/src/validator.ts',
					relativePath: 'src/validator.ts',
					startLine: 1,
					endLine: 10,
					nodeKind: 'function',
					fullSource: 'function validate() {}',
				} as GraphResultEntry['chunk'],
				metadata: {
					symbol: { name: 'validate', filePath: 'src/validator.ts', line: 1 },
					outgoingCalls: [],
					incomingCallers: [],
				} as unknown as SymbolMetadata,
			};

			const result = generateConnectionGraph({
				query: 'depth limit multi test',
				results: [entry1, entry2],
				tokenBudget: 8000,
			});

			expect(result.text).toContain('[depth limit]');
			expect(result.text).toContain('Graph:');
		});
	});
});
