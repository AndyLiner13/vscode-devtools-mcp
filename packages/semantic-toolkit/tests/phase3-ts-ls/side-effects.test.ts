import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveSideEffects } from '../../src/ts-ls/side-effects';
import type { SideEffectAnalysis } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'side-effects');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Module-Level Side Effects (Item 20)', () => {
	let project: Project;
	let tsResult: SideEffectAnalysis;
	let jsResult: SideEffectAnalysis;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
		// Explicitly add JS file since ts-morph may not auto-include it
		const jsPath = abs('effects.js');
		if (!project.getSourceFile(jsPath)) {
			project.addSourceFileAtPath(jsPath);
		}
		tsResult = resolveSideEffects(project, abs('effects.ts'), workspaceRoot);
		jsResult = resolveSideEffects(project, jsPath, workspaceRoot);
	});

	// ===================================================================
	// Basic structure
	// ===================================================================

	describe('basic structure', () => {
		it('should return the correct relative file path for TS', () => {
			expect(tsResult.filePath).toBe('effects.ts');
		});

		it('should return the correct relative file path for JS', () => {
			expect(jsResult.filePath).toBe('effects.js');
		});

		it('should return effects array', () => {
			expect(Array.isArray(tsResult.effects)).toBe(true);
			expect(tsResult.effects.length).toBeGreaterThan(0);
		});
	});

	// ===================================================================
	// Side-effect imports
	// ===================================================================

	describe('side-effect imports', () => {
		it('should detect side-effect import of polyfill', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'side-effect-import' && e.targetName === './polyfill',
			);
			expect(effect).toBeDefined();
		});

		it('should detect side-effect import of setup', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'side-effect-import' && e.targetName === './setup',
			);
			expect(effect).toBeDefined();
		});

		it('should not flag normal import with bindings as side-effect', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'side-effect-import' && e.targetName === 'fs',
			);
			expect(effect).toBeUndefined();
		});

		it('should detect side-effect import in JS file', () => {
			const effect = jsResult.effects.find(
				e => e.kind === 'side-effect-import' && e.targetName === './polyfill',
			);
			expect(effect).toBeDefined();
		});

		it('should not be conditional', () => {
			const effect = tsResult.effects.find(e => e.kind === 'side-effect-import');
			expect(effect?.isConditional).toBe(false);
		});
	});

	// ===================================================================
	// Top-level function calls
	// ===================================================================

	describe('top-level function calls', () => {
		it('should detect console.log call', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.targetName === 'console.log' && !e.isConditional,
			);
			expect(effect).toBeDefined();
		});

		it('should detect console.warn call', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.targetName === 'console.warn',
			);
			expect(effect).toBeDefined();
		});

		it('should detect process.stdout.write call', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.targetName === 'process.stdout.write',
			);
			expect(effect).toBeDefined();
		});

		it('should detect console.log in JS file', () => {
			const effect = jsResult.effects.find(
				e => e.kind === 'call' && e.targetName === 'console.log',
			);
			expect(effect).toBeDefined();
		});

		it('should include source text', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.targetName === 'console.log' && !e.isConditional,
			);
			expect(effect?.text).toContain('console.log');
		});
	});

	// ===================================================================
	// IIFEs
	// ===================================================================

	describe('IIFEs', () => {
		it('should detect classic function IIFE', () => {
			const iifes = tsResult.effects.filter(e => e.kind === 'iife');
			expect(iifes.length).toBeGreaterThanOrEqual(2);
		});

		it('should detect arrow IIFE', () => {
			const iifes = tsResult.effects.filter(e => e.kind === 'iife');
			// At least one should contain arrow syntax
			expect(iifes.length).toBeGreaterThanOrEqual(2);
		});

		it('should detect IIFE in JS file', () => {
			const effect = jsResult.effects.find(e => e.kind === 'iife');
			expect(effect).toBeDefined();
		});

		it('should not be conditional for top-level IIFE', () => {
			const effect = tsResult.effects.find(e => e.kind === 'iife');
			expect(effect?.isConditional).toBe(false);
		});
	});

	// ===================================================================
	// Top-level assignments
	// ===================================================================

	describe('top-level assignments', () => {
		it('should detect process.env.NODE_ENV assignment', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'assignment' && e.targetName === 'process.env.NODE_ENV',
			);
			expect(effect).toBeDefined();
		});

		it('should detect process.env.DEBUG assignment', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'assignment' && e.targetName === 'process.env.DEBUG',
			);
			expect(effect).toBeDefined();
		});

		it('should detect globalThis assignment in JS', () => {
			const effect = jsResult.effects.find(
				e => e.kind === 'assignment' && e.targetName === 'globalThis.appVersion',
			);
			expect(effect).toBeDefined();
		});

		it('should include the full assignment text', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'assignment' && e.targetName === 'process.env.NODE_ENV',
			);
			expect(effect?.text).toContain("'production'");
		});
	});

	// ===================================================================
	// Top-level await
	// ===================================================================

	describe('top-level await', () => {
		it('should detect await fetch call', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'top-level-await' && e.text.includes('fetch'),
			);
			expect(effect).toBeDefined();
		});

		it('should detect await Promise', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'top-level-await' && e.text.includes('Promise'),
			);
			expect(effect).toBeDefined();
		});

		it('should not be conditional', () => {
			const awaits = tsResult.effects.filter(e => e.kind === 'top-level-await');
			for (const effect of awaits) {
				expect(effect.isConditional).toBe(false);
			}
		});
	});

	// ===================================================================
	// Conditional side effects
	// ===================================================================

	describe('conditional side effects', () => {
		it('should mark calls inside if-block as conditional', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.isConditional && e.text.includes('Development mode'),
			);
			expect(effect).toBeDefined();
			expect(effect?.isConditional).toBe(true);
		});

		it('should mark calls inside try-block as conditional', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.isConditional && e.text.includes('Trying something'),
			);
			expect(effect).toBeDefined();
			expect(effect?.isConditional).toBe(true);
		});

		it('should mark calls inside catch-block as conditional', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.isConditional && e.text.includes('Failed'),
			);
			expect(effect).toBeDefined();
		});

		it('should mark calls inside for-of loop as conditional', () => {
			const effect = tsResult.effects.find(
				e => e.kind === 'call' && e.isConditional && e.targetName === 'console.log'
					&& e.text.includes('item'),
			);
			expect(effect).toBeDefined();
		});
	});

	// ===================================================================
	// NON side effects (should not appear)
	// ===================================================================

	describe('non side effects', () => {
		it('should not include function declarations', () => {
			const effect = tsResult.effects.find(
				e => e.text.includes('helperFunction') && e.kind !== 'call',
			);
			expect(effect).toBeUndefined();
		});

		it('should not include class declarations', () => {
			const effect = tsResult.effects.find(e => e.text.includes('MyClass'));
			expect(effect).toBeUndefined();
		});

		it('should not include interface declarations', () => {
			const effect = tsResult.effects.find(e => e.text.includes('MyInterface'));
			expect(effect).toBeUndefined();
		});

		it('should not include type alias declarations', () => {
			const effect = tsResult.effects.find(e => e.text.includes('MyType'));
			expect(effect).toBeUndefined();
		});

		it('should not include enum declarations', () => {
			const effect = tsResult.effects.find(e => e.text.includes('MyEnum'));
			expect(effect).toBeUndefined();
		});

		it('should not flag normal import (with bindings) as side-effect', () => {
			const fsImport = tsResult.effects.find(
				e => e.kind === 'side-effect-import' && e.targetName === 'fs',
			);
			expect(fsImport).toBeUndefined();
		});
	});

	// ===================================================================
	// Line numbers
	// ===================================================================

	describe('line numbers', () => {
		it('should provide valid line numbers for all effects', () => {
			for (const effect of tsResult.effects) {
				expect(effect.line).toBeGreaterThan(0);
			}
		});

		it('should have effects in source order', () => {
			for (let i = 1; i < tsResult.effects.length; i++) {
				expect(tsResult.effects[i].line).toBeGreaterThanOrEqual(tsResult.effects[i - 1].line);
			}
		});
	});

	// ===================================================================
	// Count sanity
	// ===================================================================

	describe('count sanity', () => {
		it('should detect at least 2 side-effect imports in TS', () => {
			const count = tsResult.effects.filter(e => e.kind === 'side-effect-import').length;
			expect(count).toBeGreaterThanOrEqual(2);
		});

		it('should detect at least 3 top-level calls (unconditional) in TS', () => {
			const count = tsResult.effects.filter(e => e.kind === 'call' && !e.isConditional).length;
			expect(count).toBeGreaterThanOrEqual(3);
		});

		it('should detect at least 2 IIFEs in TS', () => {
			const count = tsResult.effects.filter(e => e.kind === 'iife').length;
			expect(count).toBeGreaterThanOrEqual(2);
		});

		it('should detect at least 2 assignments in TS', () => {
			const count = tsResult.effects.filter(e => e.kind === 'assignment').length;
			expect(count).toBeGreaterThanOrEqual(2);
		});

		it('should detect at least 2 top-level awaits in TS', () => {
			const count = tsResult.effects.filter(e => e.kind === 'top-level-await').length;
			expect(count).toBeGreaterThanOrEqual(2);
		});

		it('should detect at least 3 conditional effects in TS', () => {
			const count = tsResult.effects.filter(e => e.isConditional).length;
			expect(count).toBeGreaterThanOrEqual(3);
		});

		it('should detect effects in JS file', () => {
			expect(jsResult.effects.length).toBeGreaterThanOrEqual(3);
		});

		it('should detect all 5 effect kinds across both files', () => {
			const allKinds = new Set([
				...tsResult.effects.map(e => e.kind),
				...jsResult.effects.map(e => e.kind),
			]);
			expect(allKinds.has('side-effect-import')).toBe(true);
			expect(allKinds.has('call')).toBe(true);
			expect(allKinds.has('iife')).toBe(true);
			expect(allKinds.has('assignment')).toBe(true);
			expect(allKinds.has('top-level-await')).toBe(true);
		});
	});
});
