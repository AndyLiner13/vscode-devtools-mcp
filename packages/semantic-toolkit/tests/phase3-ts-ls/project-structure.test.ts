/**
 * Phase 3, Item 13 — Multi-project / tsconfig structure resolver tests.
 *
 * Exercises resolveProjectStructure() against the multi-project fixture
 * with a solution-style root tsconfig, shared + app sub-projects,
 * composite flags, project references, and cross-project source files.
 */
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';

import { resolveProjectStructure } from '../../src/ts-ls/project-structure';

const FIXTURE_ROOT = path.resolve(
	__dirname,
	'fixtures/multi-project',
);

describe('resolveProjectStructure()', () => {
	const structure = resolveProjectStructure(FIXTURE_ROOT);

	// -----------------------------------------------------------------
	// Discovery
	// -----------------------------------------------------------------

	describe('project discovery', () => {
		it('should discover all tsconfig.json files in the workspace', () => {
			const configPaths = structure.projects.map(p => p.configPath);
			expect(configPaths).toContain('tsconfig.json');
			expect(configPaths).toContain('shared/tsconfig.json');
			expect(configPaths).toContain('app/tsconfig.json');
		});

		it('should discover exactly three projects', () => {
			expect(structure.projects).toHaveLength(3);
		});

		it('should return projects sorted by configPath', () => {
			const paths = structure.projects.map(p => p.configPath);
			const sorted = [...paths].sort();
			expect(paths).toEqual(sorted);
		});
	});

	// -----------------------------------------------------------------
	// Solution-style config
	// -----------------------------------------------------------------

	describe('solution config detection', () => {
		it('should detect the root tsconfig as a solution-style config', () => {
			expect(structure.solutionConfig).toBe('tsconfig.json');
		});

		it('should not flag sub-project configs as solution-style', () => {
			expect(structure.solutionConfig).not.toBe('shared/tsconfig.json');
			expect(structure.solutionConfig).not.toBe('app/tsconfig.json');
		});
	});

	// -----------------------------------------------------------------
	// Composite flag
	// -----------------------------------------------------------------

	describe('composite flag resolution', () => {
		it('should mark shared project as composite', () => {
			const shared = structure.projects.find(
				p => p.configPath === 'shared/tsconfig.json',
			);
			expect(shared?.composite).toBe(true);
		});

		it('should mark app project as composite', () => {
			const app = structure.projects.find(
				p => p.configPath === 'app/tsconfig.json',
			);
			expect(app?.composite).toBe(true);
		});

		it('should mark solution-style root as non-composite', () => {
			const root = structure.projects.find(
				p => p.configPath === 'tsconfig.json',
			);
			expect(root?.composite).toBe(false);
		});
	});

	// -----------------------------------------------------------------
	// Project references
	// -----------------------------------------------------------------

	describe('project references', () => {
		it('should resolve root references to shared and app', () => {
			const root = structure.projects.find(
				p => p.configPath === 'tsconfig.json',
			);
			expect(root?.references).toContain('shared/tsconfig.json');
			expect(root?.references).toContain('app/tsconfig.json');
			expect(root?.references).toHaveLength(2);
		});

		it('should resolve app references to shared', () => {
			const app = structure.projects.find(
				p => p.configPath === 'app/tsconfig.json',
			);
			expect(app?.references).toContain('shared/tsconfig.json');
			expect(app?.references).toHaveLength(1);
		});

		it('should have no references on shared project', () => {
			const shared = structure.projects.find(
				p => p.configPath === 'shared/tsconfig.json',
			);
			expect(shared?.references).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------
	// Source files
	// -----------------------------------------------------------------

	describe('source file resolution', () => {
		it('should discover shared source files', () => {
			const shared = structure.projects.find(
				p => p.configPath === 'shared/tsconfig.json',
			);
			expect(shared?.sourceFiles).toEqual(
				expect.arrayContaining([
					expect.stringContaining('shared/src/types.ts'),
					expect.stringContaining('shared/src/utils.ts'),
					expect.stringContaining('shared/src/index.ts'),
				]),
			);
		});

		it('should discover app source files', () => {
			const app = structure.projects.find(
				p => p.configPath === 'app/tsconfig.json',
			);
			expect(app?.sourceFiles).toEqual(
				expect.arrayContaining([
					expect.stringContaining('app/src/models.ts'),
					expect.stringContaining('app/src/main.ts'),
				]),
			);
		});

		it('should have no source files for solution-style root', () => {
			const root = structure.projects.find(
				p => p.configPath === 'tsconfig.json',
			);
			expect(root?.sourceFiles).toHaveLength(0);
		});

		it('should only include .ts files, not .d.ts', () => {
			for (const project of structure.projects) {
				for (const file of project.sourceFiles) {
					expect(file).not.toMatch(/\.d\.ts$/);
				}
			}
		});

		it('should not include node_modules files', () => {
			for (const project of structure.projects) {
				for (const file of project.sourceFiles) {
					expect(file).not.toContain('node_modules');
				}
			}
		});
	});

	// -----------------------------------------------------------------
	// outDir
	// -----------------------------------------------------------------

	describe('outDir resolution', () => {
		it('should resolve shared outDir', () => {
			const shared = structure.projects.find(
				p => p.configPath === 'shared/tsconfig.json',
			);
			expect(shared?.outDir).toBe('shared/dist');
		});

		it('should resolve app outDir', () => {
			const app = structure.projects.find(
				p => p.configPath === 'app/tsconfig.json',
			);
			expect(app?.outDir).toBe('app/dist');
		});

		it('should have no outDir for solution-style root', () => {
			const root = structure.projects.find(
				p => p.configPath === 'tsconfig.json',
			);
			expect(root?.outDir).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------
	// rootDir
	// -----------------------------------------------------------------

	describe('rootDir resolution', () => {
		it('should set shared rootDir to shared project folder', () => {
			const shared = structure.projects.find(
				p => p.configPath === 'shared/tsconfig.json',
			);
			expect(shared?.rootDir).toBe('shared');
		});

		it('should set app rootDir to app project folder', () => {
			const app = structure.projects.find(
				p => p.configPath === 'app/tsconfig.json',
			);
			expect(app?.rootDir).toBe('app');
		});

		it('should set root rootDir to workspace root', () => {
			const root = structure.projects.find(
				p => p.configPath === 'tsconfig.json',
			);
			expect(root?.rootDir).toBe('.');
		});
	});

	// -----------------------------------------------------------------
	// Reverse dependency graph
	// -----------------------------------------------------------------

	describe('reverse dependency graph', () => {
		it('should show shared is referenced by root and app', () => {
			const refs = structure.referencedBy.get('shared/tsconfig.json');
			expect(refs).toBeDefined();
			expect(refs).toContain('tsconfig.json');
			expect(refs).toContain('app/tsconfig.json');
			expect(refs).toHaveLength(2);
		});

		it('should show app is referenced by root', () => {
			const refs = structure.referencedBy.get('app/tsconfig.json');
			expect(refs).toBeDefined();
			expect(refs).toContain('tsconfig.json');
			expect(refs).toHaveLength(1);
		});

		it('should have sorted referencing projects', () => {
			const sharedRefs = structure.referencedBy.get('shared/tsconfig.json');
			if (sharedRefs) {
				const sorted = [...sharedRefs].sort();
				expect(sharedRefs).toEqual(sorted);
			}
		});

		it('should not have root in the reverse map as a target', () => {
			const refs = structure.referencedBy.get('tsconfig.json');
			expect(refs).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------
	// extends chain
	// -----------------------------------------------------------------

	describe('extends chain', () => {
		it('should have no extendedFrom for configs without extends', () => {
			for (const project of structure.projects) {
				// None of our fixture configs use extends
				expect(project.extendedFrom).toBeUndefined();
			}
		});
	});

	// -----------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------

	describe('edge cases', () => {
		it('should handle non-existent workspace root gracefully', () => {
			const result = resolveProjectStructure('/non/existent/path/xyz');
			expect(result.projects).toHaveLength(0);
			expect(result.solutionConfig).toBeUndefined();
		});

		it('should return empty referencedBy for workspace with no references', () => {
			const result = resolveProjectStructure('/non/existent/path/xyz');
			expect(result.referencedBy.size).toBe(0);
		});
	});
});
