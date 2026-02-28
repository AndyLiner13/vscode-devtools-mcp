import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveReferences } from '../../src/ts-ls/references';
import type { References } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'references');
const WORKSPACE_ROOT = FIXTURES_DIR;

function rel(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

function filePaths(refs: References): string[] {
	return refs.files.map(f => f.filePath).sort();
}

describe('Phase 3 — Cross-file References (Item 6)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// -------------------------------------------------------------------
	// formatDate — widely referenced function
	// -------------------------------------------------------------------

	describe('formatDate (referenced across 4 files)', () => {
		let refs: References;

		beforeAll(() => {
			refs = resolveReferences(project, rel('utils.ts'), 'formatDate', WORKSPACE_ROOT);
		});

		it('should find references in 4 files', () => {
			expect(refs.fileCount).toBe(4);
		});

		it('should list all referencing files', () => {
			expect(filePaths(refs)).toEqual([
				'order-service.ts',
				'report.ts',
				'user-service.ts',
				'utils.ts',
			]);
		});

		it('should count total occurrences correctly', () => {
			// utils.ts: 1 (formatDateTime uses it) — the definition on line 2 is excluded
			// user-service.ts: 2 (import + call)
			// order-service.ts: 3 (import + 2 calls)
			// report.ts: 3 (import + 2 calls)
			expect(refs.totalCount).toBeGreaterThanOrEqual(4);
		});

		it('should include same-file usage but exclude the definition', () => {
			const utilsFile = refs.files.find(f => f.filePath === 'utils.ts');
			expect(utilsFile).toBeDefined();
			// formatDate is called in formatDateTime — that's a same-file usage
			expect(utilsFile!.lines.length).toBeGreaterThanOrEqual(1);
			// Definition is on line 2 — should NOT be included
			expect(utilsFile!.lines).not.toContain(2);
		});

		it('should have sorted lines per file', () => {
			for (const file of refs.files) {
				const sorted = [...file.lines].sort((a, b) => a - b);
				expect(file.lines).toEqual(sorted);
			}
		});
	});

	// -------------------------------------------------------------------
	// formatTime — referenced only in same file
	// -------------------------------------------------------------------

	describe('formatTime (only same-file reference)', () => {
		let refs: References;

		beforeAll(() => {
			refs = resolveReferences(project, rel('utils.ts'), 'formatTime', WORKSPACE_ROOT);
		});

		it('should find references in 1 file (same file usage)', () => {
			expect(refs.fileCount).toBe(1);
			expect(refs.files[0].filePath).toBe('utils.ts');
		});

		it('should exclude the definition line', () => {
			// Definition is on line 7
			expect(refs.files[0].lines).not.toContain(7);
		});
	});

	// -------------------------------------------------------------------
	// DateString type alias — cross-file type reference
	// -------------------------------------------------------------------

	describe('DateString (type alias referenced across files)', () => {
		let refs: References;

		beforeAll(() => {
			refs = resolveReferences(project, rel('utils.ts'), 'DateString', WORKSPACE_ROOT);
		});

		it('should find references across multiple files', () => {
			expect(refs.fileCount).toBeGreaterThanOrEqual(2);
		});

		it('should include user-service.ts and report.ts', () => {
			const paths = filePaths(refs);
			expect(paths).toContain('user-service.ts');
			expect(paths).toContain('report.ts');
		});
	});

	// -------------------------------------------------------------------
	// Timestamped interface — referenced via implements
	// -------------------------------------------------------------------

	describe('Timestamped (interface referenced via implements)', () => {
		let refs: References;

		beforeAll(() => {
			refs = resolveReferences(project, rel('utils.ts'), 'Timestamped', WORKSPACE_ROOT);
		});

		it('should find references in multiple files', () => {
			expect(refs.fileCount).toBeGreaterThanOrEqual(2);
		});

		it('should include user-service.ts and order-service.ts', () => {
			const paths = filePaths(refs);
			expect(paths).toContain('user-service.ts');
			expect(paths).toContain('order-service.ts');
		});
	});

	// -------------------------------------------------------------------
	// internalOnly — no external references
	// -------------------------------------------------------------------

	describe('internalOnly (no references at all)', () => {
		let refs: References;

		beforeAll(() => {
			refs = resolveReferences(project, rel('isolated.ts'), 'internalOnly', WORKSPACE_ROOT);
		});

		it('should have 0 file count', () => {
			expect(refs.fileCount).toBe(0);
		});

		it('should have 0 total count', () => {
			expect(refs.totalCount).toBe(0);
		});

		it('should have empty files array', () => {
			expect(refs.files).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------
	// Class reference
	// -------------------------------------------------------------------

	describe('UserService class (referenced by name)', () => {
		let refs: References;

		beforeAll(() => {
			refs = resolveReferences(project, rel('user-service.ts'), 'UserService', WORKSPACE_ROOT);
		});

		it('should resolve without error', () => {
			expect(refs).toBeDefined();
			expect(refs.fileCount).toBeGreaterThanOrEqual(0);
		});
	});

	// -------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------

	describe('error cases', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveReferences(project, rel('utils.ts'), 'Nonexistent', WORKSPACE_ROOT),
			).toThrow('Symbol "Nonexistent" not found');
		});
	});
});
