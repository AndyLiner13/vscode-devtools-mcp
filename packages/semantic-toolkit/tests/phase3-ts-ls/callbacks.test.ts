import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveCallbacks } from '../../src/ts-ls/callbacks';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'callbacks');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Callbacks / Higher-Order Functions (Item 15)', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// Array method callbacks
	// ===================================================================

	describe('Array method callbacks', () => {
		it('should detect double used as .map() callback', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			const mapUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'map');
			expect(mapUsages.length).toBeGreaterThanOrEqual(1);
			const mainUsage = mapUsages.find(u => u.filePath === 'main.ts');
			expect(mainUsage).toBeDefined();
			expect(mainUsage!.parameterIndex).toBe(0);
		});

		it('should detect isEven used as .filter() callback', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'isEven', workspaceRoot);
			const filterUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'filter');
			expect(filterUsages.length).toBeGreaterThanOrEqual(1);
			expect(filterUsages[0].parameterIndex).toBe(0);
		});

		it('should detect toUpper used as .map() callback', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'toUpper', workspaceRoot);
			const mapUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'map');
			expect(mapUsages).toHaveLength(1);
			expect(mapUsages[0].parameterIndex).toBe(0);
		});
	});

	// ===================================================================
	// Promise chain callbacks
	// ===================================================================

	describe('Promise chain callbacks', () => {
		it('should detect parseJSON used as .then() callback', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'parseJSON', workspaceRoot);
			const thenUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'then');
			expect(thenUsages.length).toBeGreaterThanOrEqual(1);
			expect(thenUsages[0].parameterIndex).toBe(0);
		});

		it('should detect logError used as .catch() callback', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'logError', workspaceRoot);
			const catchUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'catch');
			expect(catchUsages.length).toBeGreaterThanOrEqual(1);
			expect(catchUsages[0].parameterIndex).toBe(0);
		});
	});

	// ===================================================================
	// Custom HOF callbacks
	// ===================================================================

	describe('Custom HOF callbacks', () => {
		it('should detect double passed to retry()', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			const retryUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'retry');
			expect(retryUsages.length).toBeGreaterThanOrEqual(1);
			expect(retryUsages[0].parameterIndex).toBe(0);
		});

		it('should detect logError passed to debounce()', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'logError', workspaceRoot);
			const debounceUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'debounce');
			expect(debounceUsages.length).toBeGreaterThanOrEqual(1);
			expect(debounceUsages[0].parameterIndex).toBe(0);
		});

		it('should detect logError passed to on() (event bus)', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'logError', workspaceRoot);
			const onUsages = result.usedAsCallbackIn.filter(u => u.calledBy === 'on');
			expect(onUsages.length).toBeGreaterThanOrEqual(1);
			expect(onUsages[0].parameterIndex).toBe(1);
		});
	});

	// ===================================================================
	// HOF parameter detection
	// ===================================================================

	describe('HOF parameter detection', () => {
		it('should detect retry has a callback parameter at index 0', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'retry', workspaceRoot);
			expect(result.callbackParameters).toHaveLength(1);
			expect(result.callbackParameters[0].name).toBe('fn');
			expect(result.callbackParameters[0].parameterIndex).toBe(0);
		});

		it('should detect debounce has a callback parameter at index 0', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'debounce', workspaceRoot);
			expect(result.callbackParameters).toHaveLength(1);
			expect(result.callbackParameters[0].name).toBe('fn');
			expect(result.callbackParameters[0].parameterIndex).toBe(0);
		});

		it('should detect compose has two callback parameters', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'compose', workspaceRoot);
			expect(result.callbackParameters).toHaveLength(2);
			expect(result.callbackParameters[0].name).toBe('f');
			expect(result.callbackParameters[0].parameterIndex).toBe(0);
			expect(result.callbackParameters[1].name).toBe('g');
			expect(result.callbackParameters[1].parameterIndex).toBe(1);
		});

		it('should detect onResult has two callback parameters', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'onResult', workspaceRoot);
			expect(result.callbackParameters).toHaveLength(2);
			expect(result.callbackParameters[0].name).toBe('onSuccess');
			expect(result.callbackParameters[0].parameterIndex).toBe(0);
			expect(result.callbackParameters[1].name).toBe('onError');
			expect(result.callbackParameters[1].parameterIndex).toBe(1);
		});

		it('should detect withLogging has a callback parameter', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'withLogging', workspaceRoot);
			expect(result.callbackParameters).toHaveLength(1);
			expect(result.callbackParameters[0].name).toBe('fn');
		});

		it('should NOT detect callback parameters on non-HOF functions', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			expect(result.callbackParameters).toHaveLength(0);
		});
	});

	// ===================================================================
	// Function-returning HOFs
	// ===================================================================

	describe('Function-returning HOFs', () => {
		it('should detect multiplier returns a function', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'multiplier', workspaceRoot);
			expect(result.returnsFunction).toBe(true);
			expect(result.returnFunctionType).toBe('(n: number) => number');
		});

		it('should detect debounce returns a function', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'debounce', workspaceRoot);
			expect(result.returnsFunction).toBe(true);
		});

		it('should detect compose returns a function', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'compose', workspaceRoot);
			expect(result.returnsFunction).toBe(true);
		});

		it('should NOT detect returnsFunction for plain functions', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			expect(result.returnsFunction).toBe(false);
		});
	});

	// ===================================================================
	// .bind(this) detection
	// ===================================================================

	describe('.bind(this) detection', () => {
		it('should detect format used with .bind(this) in setup', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'format', workspaceRoot);
			const boundUsages = result.usedAsCallbackIn.filter(u => u.boundWithBind === true);
			expect(boundUsages.length).toBeGreaterThanOrEqual(1);
			expect(boundUsages[0].calledBy).toBe('forEach');
			expect(boundUsages[0].parameterIndex).toBe(0);
		});
	});

	// ===================================================================
	// Cross-file callback detection
	// ===================================================================

	describe('Cross-file callback detection', () => {
		it('should detect double used as callback in consumer.ts', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			const crossFile = result.usedAsCallbackIn.filter(u => u.filePath === 'consumer.ts');
			expect(crossFile.length).toBeGreaterThanOrEqual(1);
			const mapUsage = crossFile.find(u => u.calledBy === 'map');
			expect(mapUsage).toBeDefined();
		});

		it('should detect isEven used cross-file in filter()', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'isEven', workspaceRoot);
			const crossFile = result.usedAsCallbackIn.filter(u => u.filePath === 'consumer.ts');
			expect(crossFile.length).toBeGreaterThanOrEqual(1);
		});

		it('should detect parseJSON used cross-file in .then()', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'parseJSON', workspaceRoot);
			const crossFile = result.usedAsCallbackIn.filter(u => u.filePath === 'consumer.ts');
			const thenUsage = crossFile.find(u => u.calledBy === 'then');
			expect(thenUsage).toBeDefined();
		});

		it('should detect logError used cross-file in .catch()', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'logError', workspaceRoot);
			const crossFile = result.usedAsCallbackIn.filter(u => u.filePath === 'consumer.ts');
			const catchUsage = crossFile.find(u => u.calledBy === 'catch');
			expect(catchUsage).toBeDefined();
		});

		it('should detect double passed to retry() cross-file', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			const crossFile = result.usedAsCallbackIn.filter(u => u.filePath === 'consumer.ts');
			const retryUsage = crossFile.find(u => u.calledBy === 'retry');
			expect(retryUsage).toBeDefined();
			expect(retryUsage!.parameterIndex).toBe(0);
		});
	});

	// ===================================================================
	// Symbol metadata
	// ===================================================================

	describe('Symbol metadata', () => {
		it('should include correct symbol ref for the analyzed function', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			expect(result.symbol.name).toBe('double');
			expect(result.symbol.filePath).toBe('main.ts');
			expect(result.symbol.line).toBeGreaterThan(0);
		});

		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveCallbacks(project, abs('main.ts'), 'nonExistent', workspaceRoot),
			).toThrow(/Callable symbol "nonExistent" not found/);
		});
	});

	// ===================================================================
	// Total callback usages count sanity
	// ===================================================================

	describe('Aggregated counts', () => {
		it('should find all callback usages of double across both files', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'double', workspaceRoot);
			// main.ts: map, retry  |  consumer.ts: map, retry, filter
			expect(result.usedAsCallbackIn.length).toBeGreaterThanOrEqual(4);
		});

		it('should find all callback usages of logError across both files', () => {
			const result = resolveCallbacks(project, abs('main.ts'), 'logError', workspaceRoot);
			// main.ts: catch, debounce, on  |  consumer.ts: catch, debounce
			expect(result.usedAsCallbackIn.length).toBeGreaterThanOrEqual(4);
		});
	});
});
