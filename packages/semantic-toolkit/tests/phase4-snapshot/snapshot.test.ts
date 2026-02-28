import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseSource } from '../../src/parser/index';
import { chunkFile } from '../../src/chunker/index';
import { generateSnapshot } from '../../src/snapshot/index';
import type { CodeChunk } from '../../src/chunker/types';
import type { SnapshotResult } from '../../src/snapshot/types';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures', 'snapshot');
const WORKSPACE_ROOT = FIXTURES_DIR;

/**
 * Helper: load a fixture file, parse it, chunk it, and create a ts-morph project.
 * Returns the chunks and project ready for snapshot generation.
 */
function loadFixture(filename: string): { chunks: CodeChunk[]; project: Project; fileContent: string } {
	const filePath = path.resolve(FIXTURES_DIR, filename);
	const fileContent = fs.readFileSync(filePath, 'utf-8');

	// Parse and chunk
	const parsed = parseSource(fileContent, filePath, WORKSPACE_ROOT);
	const chunked = chunkFile(parsed, fileContent);

	// Create ts-morph project with the fixture + stubs
	const project = new Project({
		tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
	});

	return { chunks: chunked.chunks, project, fileContent };
}

/**
 * Find chunk(s) by name. For class members, use "ClassName.memberName".
 */
function findChunks(chunks: CodeChunk[], ...names: string[]): CodeChunk[] {
	const found: CodeChunk[] = [];
	for (const name of names) {
		const parts = name.split('.');
		const symbolName = parts[parts.length - 1];
		const parentName = parts.length > 1 ? parts[0] : null;

		const chunk = chunks.find(c =>
			c.name === symbolName
			&& (parentName === null || c.parentName === parentName),
		);
		if (!chunk) {
			throw new Error(
				`Chunk "${name}" not found. Available: ${chunks.map(c => c.parentName ? `${c.parentName}.${c.name}` : c.name).join(', ')}`,
			);
		}
		found.push(chunk);
	}
	return found;
}

/**
 * Verify a snapshot is parseable TypeScript.
 */
function isValidTypeScript(snapshot: string): boolean {
	try {
		const tempProject = new Project({ useInMemoryFileSystem: true });
		tempProject.createSourceFile('snapshot-check.ts', snapshot);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check that a named identifier appears in the snapshot text.
 */
function snapshotContains(snapshot: string, text: string): boolean {
	return snapshot.includes(text);
}

/**
 * Check that a named identifier does NOT appear in the snapshot text.
 */
function snapshotOmits(snapshot: string, text: string): boolean {
	return !snapshot.includes(text);
}

// ═══════════════════════════════════════════════════════════════════
// Test Suite: Phase 4 — Smart Structural Snapshots
// ═══════════════════════════════════════════════════════════════════

describe('Phase 4 — Smart Structural Snapshots', () => {
	// ── Fixture 1: single-method.ts ──────────────────────────────
	describe('single-method.ts — one method target', () => {
		let result: SnapshotResult;
		let chunks: CodeChunk[];

		beforeAll(() => {
			const fixture = loadFixture('single-method.ts');
			chunks = fixture.chunks;
			const targets = findChunks(chunks, 'PaymentService.processPayment');
			result = generateSnapshot(fixture.project, targets, WORKSPACE_ROOT);
		});

		it('should have the file header comment', () => {
			expect(result.snapshot.startsWith('// ')).toBe(true);
			expect(snapshotContains(result.snapshot, 'single-method.ts')).toBe(true);
		});

		it('should include the target method body', () => {
			expect(snapshotContains(result.snapshot, 'processPayment')).toBe(true);
			expect(snapshotContains(result.snapshot, 'this.gateway.charge')).toBe(true);
		});

		it('should include imports used by the target', () => {
			// processPayment uses: Logger (this.logger), PaymentGateway (this.gateway),
			// PaymentResult (return type), MetricsClient (this.metrics)
			expect(snapshotContains(result.snapshot, "from './payment-gateway'")).toBe(true);
		});

		it('should include constants used by the target', () => {
			// processPayment uses MAX_RETRIES and DEFAULT_CURRENCY
			expect(snapshotContains(result.snapshot, 'MAX_RETRIES')).toBe(true);
			expect(snapshotContains(result.snapshot, 'DEFAULT_CURRENCY')).toBe(true);
		});

		it('should include class properties used by the target', () => {
			// processPayment accesses this.gateway, this.logger, this.metrics
			expect(snapshotContains(result.snapshot, 'private gateway')).toBe(true);
		});

		it('should include the class declaration wrapper', () => {
			expect(snapshotContains(result.snapshot, 'class PaymentService')).toBe(true);
		});

		it('should omit sibling methods not targeted', () => {
			expect(snapshotOmits(result.snapshot, 'refundPayment')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'batchProcess')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'calculateTax')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'recordAudit')).toBe(true);
		});

		it('should omit constants not used by the target', () => {
			// processPayment does NOT use TIMEOUT_MS, TAX_RATE, BATCH_SIZE
			expect(snapshotOmits(result.snapshot, 'BATCH_SIZE')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'TAX_RATE')).toBe(true);
		});

		it('should omit imports not used by the target', () => {
			// processPayment does NOT use AuditTrail or NotificationService
			expect(snapshotOmits(result.snapshot, "from './audit'")).toBe(true);
		});

		it('should be parseable TypeScript', () => {
			expect(isValidTypeScript(result.snapshot)).toBe(true);
		});

		it('should report correct target count', () => {
			expect(result.targetCount).toBe(1);
		});
	});

	// ── Fixture 2: two-methods.ts ────────────────────────────────
	describe('two-methods.ts — two methods merged', () => {
		let result: SnapshotResult;

		beforeAll(() => {
			const fixture = loadFixture('two-methods.ts');
			const targets = findChunks(
				fixture.chunks,
				'AuthService.authenticate',
				'AuthService.refreshSession',
			);
			result = generateSnapshot(fixture.project, targets, WORKSPACE_ROOT);
		});

		it('should include both target methods', () => {
			expect(snapshotContains(result.snapshot, 'authenticate')).toBe(true);
			expect(snapshotContains(result.snapshot, 'refreshSession')).toBe(true);
		});

		it('should include the union of imports from both methods', () => {
			// authenticate uses: Logger, TokenValidator, SessionStore, RateLimiter
			// refreshSession uses: Logger, SessionStore, Session
			expect(snapshotContains(result.snapshot, "from './logger'")).toBe(true);
			expect(snapshotContains(result.snapshot, "from './session-store'")).toBe(true);
		});

		it('should include the union of constants from both methods', () => {
			// authenticate uses MAX_ATTEMPTS; refreshSession uses MAX_SESSION_AGE, REFRESH_WINDOW
			expect(snapshotContains(result.snapshot, 'MAX_ATTEMPTS')).toBe(true);
			expect(snapshotContains(result.snapshot, 'MAX_SESSION_AGE')).toBe(true);
			expect(snapshotContains(result.snapshot, 'REFRESH_WINDOW')).toBe(true);
		});

		it('should include the union of class properties from both methods', () => {
			// authenticate: this.limiter, this.validator, this.logger, this.store
			// refreshSession: this.logger, this.store
			expect(snapshotContains(result.snapshot, 'private validator')).toBe(true);
			expect(snapshotContains(result.snapshot, 'private store')).toBe(true);
			expect(snapshotContains(result.snapshot, 'private logger')).toBe(true);
		});

		it('should omit constants not used by either target', () => {
			// Neither uses CACHE_TTL or SESSION_PREFIX
			expect(snapshotOmits(result.snapshot, 'CACHE_TTL')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'SESSION_PREFIX')).toBe(true);
		});

		it('should omit sibling methods not targeted', () => {
			expect(snapshotOmits(result.snapshot, 'invalidateSession')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'purgeExpired')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'cacheSession')).toBe(true);
		});

		it('should have no duplicate content', () => {
			// Logger import should appear exactly once
			const loggerImportCount = (result.snapshot.match(/from '\.\/logger'/g) ?? []).length;
			expect(loggerImportCount).toBe(1);
		});

		it('should be parseable TypeScript', () => {
			expect(isValidTypeScript(result.snapshot)).toBe(true);
		});

		it('should report correct target count', () => {
			expect(result.targetCount).toBe(2);
		});

		it('should wrap targets in the class declaration', () => {
			expect(snapshotContains(result.snapshot, 'class AuthService')).toBe(true);
		});
	});

	// ── Fixture 3: root-constant.ts ──────────────────────────────
	describe('root-constant.ts — root function target', () => {
		let result: SnapshotResult;

		beforeAll(() => {
			const fixture = loadFixture('root-constant.ts');
			const targets = findChunks(fixture.chunks, 'formatOutput');
			result = generateSnapshot(fixture.project, targets, WORKSPACE_ROOT);
		});

		it('should include the target function', () => {
			expect(snapshotContains(result.snapshot, 'function formatOutput')).toBe(true);
		});

		it('should include only the constants used by the target', () => {
			// formatOutput uses OUTPUT_FORMAT and MAX_LINE_LENGTH
			expect(snapshotContains(result.snapshot, 'OUTPUT_FORMAT')).toBe(true);
			expect(snapshotContains(result.snapshot, 'MAX_LINE_LENGTH')).toBe(true);
		});

		it('should omit constants not used by the target', () => {
			// formatOutput does NOT use INDENT_SIZE, DEFAULT_ENCODING, HASH_ALGORITHM
			expect(snapshotOmits(result.snapshot, 'INDENT_SIZE')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'DEFAULT_ENCODING')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'HASH_ALGORITHM')).toBe(true);
		});

		it('should omit functions not targeted', () => {
			expect(snapshotOmits(result.snapshot, 'function computeHash')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'function getIndent')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'function readSource')).toBe(true);
		});

		it('should omit imports not used by the target', () => {
			expect(snapshotOmits(result.snapshot, "from 'crypto'")).toBe(true);
			expect(snapshotOmits(result.snapshot, "from 'path'")).toBe(true);
			expect(snapshotOmits(result.snapshot, "from 'fs/promises'")).toBe(true);
		});

		it('should not include a class wrapper', () => {
			expect(snapshotOmits(result.snapshot, 'class ')).toBe(true);
		});

		it('should be parseable TypeScript', () => {
			expect(isValidTypeScript(result.snapshot)).toBe(true);
		});
	});

	// ── Fixture 4: no-dependencies.ts ────────────────────────────
	describe('no-dependencies.ts — pure function with no deps', () => {
		let result: SnapshotResult;

		beforeAll(() => {
			const fixture = loadFixture('no-dependencies.ts');
			const targets = findChunks(fixture.chunks, 'fibonacci');
			result = generateSnapshot(fixture.project, targets, WORKSPACE_ROOT);
		});

		it('should include the target function', () => {
			expect(snapshotContains(result.snapshot, 'function fibonacci')).toBe(true);
		});

		it('should have the file header', () => {
			expect(result.snapshot.startsWith('// ')).toBe(true);
			expect(snapshotContains(result.snapshot, 'no-dependencies.ts')).toBe(true);
		});

		it('should omit all imports (none used)', () => {
			expect(snapshotOmits(result.snapshot, 'import ')).toBe(true);
		});

		it('should omit all constants (none used)', () => {
			expect(snapshotOmits(result.snapshot, 'DEFAULT_TIMEOUT')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'MAX_ITEMS')).toBe(true);
		});

		it('should omit the interface and other functions', () => {
			expect(snapshotOmits(result.snapshot, 'interface Config')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'function createConfig')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'function logMetrics')).toBe(true);
		});

		it('should have zero dependencies', () => {
			expect(result.dependencyCount).toBe(0);
		});

		it('should be parseable TypeScript', () => {
			expect(isValidTypeScript(result.snapshot)).toBe(true);
		});
	});

	// ── Fixture 5: cross-reference.ts ────────────────────────────
	describe('cross-reference.ts — two methods with cross-call', () => {
		let result: SnapshotResult;

		beforeAll(() => {
			const fixture = loadFixture('cross-reference.ts');
			const targets = findChunks(
				fixture.chunks,
				'InputValidator.validate',
				'InputValidator.sanitize',
			);
			result = generateSnapshot(fixture.project, targets, WORKSPACE_ROOT);
		});

		it('should include both target methods', () => {
			expect(snapshotContains(result.snapshot, 'validate(input: string)')).toBe(true);
			expect(snapshotContains(result.snapshot, 'sanitize(input: string)')).toBe(true);
		});

		it('should include the union of constants from both methods', () => {
			// validate uses MAX_INPUT_LENGTH and FORBIDDEN_PATTERNS
			// sanitize uses ALLOWED_TAGS
			expect(snapshotContains(result.snapshot, 'MAX_INPUT_LENGTH')).toBe(true);
			expect(snapshotContains(result.snapshot, 'FORBIDDEN_PATTERNS')).toBe(true);
			expect(snapshotContains(result.snapshot, 'ALLOWED_TAGS')).toBe(true);
		});

		it('should include class properties used by both methods', () => {
			// validate uses this.logger; sanitize uses this.strictMode
			expect(snapshotContains(result.snapshot, 'private logger')).toBe(true);
			expect(snapshotContains(result.snapshot, 'private strictMode')).toBe(true);
		});

		it('should include imports used by either method', () => {
			// validate uses Logger (this.logger); validate return type uses ValidationResult
			expect(snapshotContains(result.snapshot, "from './logger'")).toBe(true);
		});

		it('should omit sibling methods not targeted', () => {
			expect(snapshotOmits(result.snapshot, 'isValidLength')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'getStrictMode')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'setStrictMode')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'getAllowedTags')).toBe(true);
		});

		it('should include the class wrapper', () => {
			expect(snapshotContains(result.snapshot, 'class InputValidator')).toBe(true);
		});

		it('should be parseable TypeScript', () => {
			expect(isValidTypeScript(result.snapshot)).toBe(true);
		});

		it('should report 2 targets', () => {
			expect(result.targetCount).toBe(2);
		});
	});

	// ── Fixture 6: expressions-file.ts ───────────────────────────
	describe('expressions-file.ts — root function target', () => {
		let result: SnapshotResult;

		beforeAll(() => {
			const fixture = loadFixture('expressions-file.ts');
			const targets = findChunks(fixture.chunks, 'initializeApp');
			result = generateSnapshot(fixture.project, targets, WORKSPACE_ROOT);
		});

		it('should include the target function', () => {
			expect(snapshotContains(result.snapshot, 'function initializeApp')).toBe(true);
		});

		it('should include imports used by the target', () => {
			// initializeApp uses createServer, connectDatabase, loadConfig
			expect(snapshotContains(result.snapshot, "from 'http'")).toBe(true);
			expect(snapshotContains(result.snapshot, "from './database'")).toBe(true);
			expect(snapshotContains(result.snapshot, "from './config'")).toBe(true);
		});

		it('should include constants used by the target', () => {
			// initializeApp uses PORT and DB_URL
			expect(snapshotContains(result.snapshot, 'DB_URL')).toBe(true);
		});

		it('should include variable declarations used by the target', () => {
			// initializeApp assigns to server, db, config (let declarations)
			expect(snapshotContains(result.snapshot, 'let server')).toBe(true);
			expect(snapshotContains(result.snapshot, 'let db')).toBe(true);
			expect(snapshotContains(result.snapshot, 'let config')).toBe(true);
		});

		it('should omit constants not used by the target', () => {
			// initializeApp does NOT use HOST or APP_NAME
			expect(snapshotOmits(result.snapshot, 'APP_NAME')).toBe(true);
		});

		it('should omit functions not targeted', () => {
			expect(snapshotOmits(result.snapshot, 'function shutdownApp')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'function getAppName')).toBe(true);
			expect(snapshotOmits(result.snapshot, 'function getHost')).toBe(true);
		});

		it('should be parseable TypeScript', () => {
			expect(isValidTypeScript(result.snapshot)).toBe(true);
		});

		it('should have the file header', () => {
			expect(result.snapshot.startsWith('// ')).toBe(true);
			expect(snapshotContains(result.snapshot, 'expressions-file.ts')).toBe(true);
		});
	});

	// ── Edge Case: empty targets throws ──────────────────────────
	describe('error handling', () => {
		it('should throw when targets array is empty', () => {
			const project = new Project({ useInMemoryFileSystem: true });
			expect(() => generateSnapshot(project, [], WORKSPACE_ROOT)).toThrow(
				'At least one target chunk is required',
			);
		});

		it('should throw when targets are from different files', () => {
			const fixture = loadFixture('single-method.ts');
			const chunks = fixture.chunks;
			const target1 = chunks[0];
			const target2 = { ...chunks[0], filePath: '/other/file.ts' };
			expect(() => generateSnapshot(fixture.project, [target1, target2], WORKSPACE_ROOT)).toThrow(
				'All targets must be from the same file',
			);
		});
	});

	// ── Validation Gates ─────────────────────────────────────────
	describe('validation gates', () => {
		it('no snapshot has duplicate import lines', { timeout: 60000 }, () => {
			// Run all fixtures and check for duplicate imports
			for (const filename of [
				'single-method.ts',
				'two-methods.ts',
				'root-constant.ts',
				'cross-reference.ts',
				'expressions-file.ts',
			]) {
				const fixture = loadFixture(filename);
				const firstBodyChunk = fixture.chunks.find(c =>
					c.nodeKind !== 'import' && c.nodeKind !== 'comment' && c.parentName === null,
				);
				if (!firstBodyChunk) continue;

				const result = generateSnapshot(fixture.project, [firstBodyChunk], WORKSPACE_ROOT);
				const importLines = result.snapshot
					.split('\n')
					.filter(line => line.trimStart().startsWith('import '));

				const uniqueImports = new Set(importLines.map(l => l.trim()));
				expect(importLines.length).toBe(uniqueImports.size);
			}
		});

		it('all snapshots start with a file header comment', { timeout: 60000 }, () => {
			for (const filename of [
				'single-method.ts',
				'two-methods.ts',
				'root-constant.ts',
				'no-dependencies.ts',
				'cross-reference.ts',
				'expressions-file.ts',
			]) {
				const fixture = loadFixture(filename);
				const firstBodyChunk = fixture.chunks.find(c =>
					c.nodeKind !== 'import' && c.nodeKind !== 'comment',
				);
				if (!firstBodyChunk) continue;

				const result = generateSnapshot(fixture.project, [firstBodyChunk], WORKSPACE_ROOT);
				expect(result.snapshot.startsWith('// ')).toBe(true);
			}
		});
	});
});
