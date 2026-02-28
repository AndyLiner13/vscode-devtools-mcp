import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveGuardCallbacks } from '../../src/ts-ls/guard-callbacks';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'guard-callbacks');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Guard Callbacks (Item 16)', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// Guard callback site detection — .filter()
	// ===================================================================

	describe('Guard used in .filter()', () => {
		it('should detect isUser used in .filter() with "is" predicate', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const filterSites = result.guardCallbackSites.filter(s => s.calledBy === 'filter');
			expect(filterSites.length).toBeGreaterThanOrEqual(1);

			const mainSite = filterSites.find(s => s.filePath === 'guards.ts');
			expect(mainSite).toBeDefined();
			expect(mainSite!.predicateKind).toBe('is');
			expect(mainSite!.predicateType).toBe('User');
			expect(mainSite!.parameterIndex).toBe(0);
		});

		it('should detect isAdmin used in .filter()', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isAdmin', workspaceRoot);
			const filterSites = result.guardCallbackSites.filter(s => s.calledBy === 'filter');
			expect(filterSites.length).toBeGreaterThanOrEqual(1);
			expect(filterSites[0].predicateKind).toBe('is');
			expect(filterSites[0].predicateType).toBe('Admin');
		});

		it('should detect isCat used in .filter()', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isCat', workspaceRoot);
			const filterSites = result.guardCallbackSites.filter(s => s.calledBy === 'filter');
			expect(filterSites.length).toBeGreaterThanOrEqual(1);
			expect(filterSites[0].predicateType).toBe('Cat');
		});
	});

	// ===================================================================
	// Guard callback site detection — .find()
	// ===================================================================

	describe('Guard used in .find()', () => {
		it('should detect isUser used in .find()', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const findSites = result.guardCallbackSites.filter(s => s.calledBy === 'find');
			expect(findSites.length).toBeGreaterThanOrEqual(1);
			expect(findSites[0].predicateKind).toBe('is');
			expect(findSites[0].predicateType).toBe('User');
		});
	});

	// ===================================================================
	// Assertion guard as callback — .forEach()
	// ===================================================================

	describe('Assertion guard used as callback', () => {
		it('should detect assertDefined used in .forEach() with "asserts" predicate', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'assertDefined', workspaceRoot);
			const forEachSites = result.guardCallbackSites.filter(s => s.calledBy === 'forEach');
			expect(forEachSites.length).toBeGreaterThanOrEqual(1);
			expect(forEachSites[0].predicateKind).toBe('asserts');
		});

		it('should NOT detect assertUser as callback (not used as callback in fixture)', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'assertUser', workspaceRoot);
			expect(result.guardCallbackSites).toHaveLength(0);
		});
	});

	// ===================================================================
	// Custom HOF usage
	// ===================================================================

	describe('Guard passed to custom HOF', () => {
		it('should detect isUser passed to filterByGuard()', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const hofSites = result.guardCallbackSites.filter(s => s.calledBy === 'filterByGuard');
			expect(hofSites.length).toBeGreaterThanOrEqual(1);
			expect(hofSites[0].predicateKind).toBe('is');
			expect(hofSites[0].predicateType).toBe('User');
			expect(hofSites[0].parameterIndex).toBe(1);
		});

		it('should detect assertDefined passed to assertAll()', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'assertDefined', workspaceRoot);
			const assertAllSites = result.guardCallbackSites.filter(s => s.calledBy === 'assertAll');
			expect(assertAllSites.length).toBeGreaterThanOrEqual(1);
			expect(assertAllSites[0].predicateKind).toBe('asserts');
			expect(assertAllSites[0].parameterIndex).toBe(1);
		});
	});

	// ===================================================================
	// Narrowed output type detection
	// ===================================================================

	describe('Narrowed output type', () => {
		it('should capture narrowed output type for .filter(isUser)', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const filterSite = result.guardCallbackSites.find(
				s => s.calledBy === 'filter' && s.filePath === 'guards.ts',
			);
			expect(filterSite).toBeDefined();
			expect(filterSite!.narrowedOutputType).toBeDefined();
			// TypeScript narrows Person[] → User[] through the type predicate
			expect(filterSite!.narrowedOutputType).toContain('User');
		});

		it('should capture input type for .filter(isUser)', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const filterSite = result.guardCallbackSites.find(
				s => s.calledBy === 'filter' && s.filePath === 'guards.ts',
			);
			expect(filterSite).toBeDefined();
			expect(filterSite!.inputType).toBeDefined();
			// Input is Person (union of User | Admin | Guest)
			expect(filterSite!.inputType).toMatch(/User|Admin|Guest|Person/);
		});
	});

	// ===================================================================
	// HOF parameter detection (type predicates in params)
	// ===================================================================

	describe('HOF parameter with type predicate', () => {
		it('should detect filterByGuard has a guard parameter with type predicate', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'filterByGuard', workspaceRoot);
			expect(result.guardHofParameters.length).toBeGreaterThanOrEqual(1);
			const guardParam = result.guardHofParameters.find(p => p.name === 'guard');
			expect(guardParam).toBeDefined();
			expect(guardParam!.hasTypePredicate).toBe(true);
			expect(guardParam!.predicateType).toBeDefined();
		});

		it('should detect assertAll has an assertion parameter', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'assertAll', workspaceRoot);
			expect(result.guardHofParameters.length).toBeGreaterThanOrEqual(1);
			const assertParam = result.guardHofParameters.find(p => p.name === 'assertion');
			expect(assertParam).toBeDefined();
		});

		it('should NOT flag non-predicate callback params (processPeople)', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'processPeople', workspaceRoot);
			const predicateParams = result.guardHofParameters.filter(p => p.hasTypePredicate);
			expect(predicateParams).toHaveLength(0);
		});
	});

	// ===================================================================
	// Non-guard function → empty results
	// ===================================================================

	describe('Non-guard function', () => {
		it('should return empty guardCallbackSites for non-guard function', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'formatPerson', workspaceRoot);
			expect(result.guardCallbackSites).toHaveLength(0);
		});
	});

	// ===================================================================
	// Cross-file guard callback detection
	// ===================================================================

	describe('Cross-file guard callback detection', () => {
		it('should detect isUser used in .filter() in consumer.ts', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const crossFile = result.guardCallbackSites.filter(s => s.filePath === 'consumer.ts');
			const filterSite = crossFile.find(s => s.calledBy === 'filter');
			expect(filterSite).toBeDefined();
			expect(filterSite!.predicateKind).toBe('is');
			expect(filterSite!.predicateType).toBe('User');
		});

		it('should detect isAdmin used in .filter() in consumer.ts', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isAdmin', workspaceRoot);
			const crossFile = result.guardCallbackSites.filter(s => s.filePath === 'consumer.ts');
			expect(crossFile.length).toBeGreaterThanOrEqual(1);
		});

		it('should detect isCat used in .filter() in consumer.ts', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isCat', workspaceRoot);
			const crossFile = result.guardCallbackSites.filter(s => s.filePath === 'consumer.ts');
			expect(crossFile.length).toBeGreaterThanOrEqual(1);
		});

		it('should detect isUser used in .find() in consumer.ts', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const crossFile = result.guardCallbackSites.filter(s => s.filePath === 'consumer.ts');
			const findSite = crossFile.find(s => s.calledBy === 'find');
			expect(findSite).toBeDefined();
		});

		it('should detect assertDefined used in .forEach() in consumer.ts', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'assertDefined', workspaceRoot);
			const crossFile = result.guardCallbackSites.filter(s => s.filePath === 'consumer.ts');
			const forEachSite = crossFile.find(s => s.calledBy === 'forEach');
			expect(forEachSite).toBeDefined();
			expect(forEachSite!.predicateKind).toBe('asserts');
		});

		it('should detect isUser passed to filterByGuard() cross-file', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const crossFile = result.guardCallbackSites.filter(s => s.filePath === 'consumer.ts');
			const hofSite = crossFile.find(s => s.calledBy === 'filterByGuard');
			expect(hofSite).toBeDefined();
			expect(hofSite!.parameterIndex).toBe(1);
		});
	});

	// ===================================================================
	// Symbol metadata and error handling
	// ===================================================================

	describe('Symbol metadata', () => {
		it('should include correct symbol ref', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			expect(result.symbol.name).toBe('isUser');
			expect(result.symbol.filePath).toBe('guards.ts');
			expect(result.symbol.line).toBeGreaterThan(0);
		});

		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveGuardCallbacks(project, abs('guards.ts'), 'nonExistent', workspaceRoot),
			).toThrow(/Callable symbol "nonExistent" not found/);
		});
	});

	// ===================================================================
	// Aggregated counts
	// ===================================================================

	describe('Aggregated counts', () => {
		it('should find all guard callback sites for isUser across both files', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'isUser', workspaceRoot);
			// guards.ts: filter, find, filterByGuard
			// consumer.ts: filter, find, filterByGuard
			expect(result.guardCallbackSites.length).toBeGreaterThanOrEqual(5);
		});

		it('should find all guard callback sites for assertDefined across both files', () => {
			const result = resolveGuardCallbacks(project, abs('guards.ts'), 'assertDefined', workspaceRoot);
			// guards.ts: forEach, assertAll
			// consumer.ts: forEach
			expect(result.guardCallbackSites.length).toBeGreaterThanOrEqual(3);
		});
	});
});
