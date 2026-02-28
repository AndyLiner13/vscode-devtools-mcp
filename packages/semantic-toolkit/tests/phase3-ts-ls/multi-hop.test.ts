import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveCallHierarchy } from '../../src/ts-ls/call-hierarchy';
import type { SymbolMetadata, OutgoingCall, IncomingCaller } from '../../src/ts-ls/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function outgoingNames(calls: OutgoingCall[]): string[] {
	return calls.map(c => c.target.name).sort();
}

function incomingNames(callers: IncomingCaller[]): string[] {
	return callers.map(c => c.source.name).sort();
}

// ---------------------------------------------------------------------------
// Multi-hop fixtures
// ---------------------------------------------------------------------------

const MULTI_HOP_DIR = path.resolve(__dirname, 'fixtures', 'multi-hop');

describe('Phase 3 — Multi-hop traversal (Item 2)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(MULTI_HOP_DIR, 'tsconfig.json'),
		});
	});

	describe('callDepth: 1 (default — backward compatible)', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				path.resolve(MULTI_HOP_DIR, 'entry.ts'),
				'handle',
				MULTI_HOP_DIR,
			);
		});

		it('should resolve direct outgoing calls only', () => {
			expect(outgoingNames(meta.outgoingCalls)).toEqual(['process']);
		});

		it('should have empty recursive children at depth 1', () => {
			const processCall = meta.outgoingCalls.find(c => c.target.name === 'process');
			expect(processCall).toBeDefined();
			expect(processCall!.outgoingCalls).toEqual([]);
		});

		it('should mark depthLimited on targets that have further calls', () => {
			const processCall = meta.outgoingCalls.find(c => c.target.name === 'process');
			expect(processCall!.depthLimited).toBe(true);
		});
	});

	describe('callDepth: 2', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				path.resolve(MULTI_HOP_DIR, 'entry.ts'),
				'handle',
				MULTI_HOP_DIR,
				{ callDepth: 2 },
			);
		});

		it('should resolve 2 hops of outgoing calls', () => {
			expect(outgoingNames(meta.outgoingCalls)).toEqual(['process']);
			const processCall = meta.outgoingCalls[0];
			expect(outgoingNames(processCall.outgoingCalls)).toEqual(['execute']);
		});

		it('should mark depthLimited at the boundary (hop 2)', () => {
			const executeCall = meta.outgoingCalls[0].outgoingCalls[0];
			expect(executeCall.target.name).toBe('execute');
			expect(executeCall.depthLimited).toBe(true);
			expect(executeCall.outgoingCalls).toEqual([]);
		});
	});

	describe('callDepth: 3', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				path.resolve(MULTI_HOP_DIR, 'entry.ts'),
				'handle',
				MULTI_HOP_DIR,
				{ callDepth: 3 },
			);
		});

		it('should resolve 3 hops: handle → process → execute → normalize', () => {
			const processCall = meta.outgoingCalls[0];
			expect(processCall.target.name).toBe('process');

			const executeCall = processCall.outgoingCalls[0];
			expect(executeCall.target.name).toBe('execute');

			const normalizeCall = executeCall.outgoingCalls[0];
			expect(normalizeCall.target.name).toBe('normalize');
		});

		it('should not mark depthLimited on leaf node (normalize has no project calls)', () => {
			const normalizeCall = meta.outgoingCalls[0].outgoingCalls[0].outgoingCalls[0];
			expect(normalizeCall.target.name).toBe('normalize');
			expect(normalizeCall.depthLimited).toBeUndefined();
			expect(normalizeCall.outgoingCalls).toEqual([]);
		});
	});

	describe('callDepth: -1 (unlimited)', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				path.resolve(MULTI_HOP_DIR, 'entry.ts'),
				'handle',
				MULTI_HOP_DIR,
				{ callDepth: -1 },
			);
		});

		it('should resolve full chain without depth limits', () => {
			const processCall = meta.outgoingCalls[0];
			const executeCall = processCall.outgoingCalls[0];
			const normalizeCall = executeCall.outgoingCalls[0];

			expect(processCall.target.name).toBe('process');
			expect(executeCall.target.name).toBe('execute');
			expect(normalizeCall.target.name).toBe('normalize');
			expect(normalizeCall.outgoingCalls).toEqual([]);
		});

		it('should not have depthLimited flags anywhere', () => {
			const allCalls = flattenOutgoing(meta.outgoingCalls);
			for (const call of allCalls) {
				expect(call.depthLimited).toBeUndefined();
			}
		});
	});

	describe('incoming callers — multi-hop', () => {
		it('should resolve recursive incoming callers at callDepth: 2', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(MULTI_HOP_DIR, 'helper.ts'),
				'normalize',
				MULTI_HOP_DIR,
				{ callDepth: 2 },
			);

			expect(incomingNames(meta.incomingCallers)).toEqual(['execute']);

			const executeCaller = meta.incomingCallers[0];
			expect(incomingNames(executeCaller.incomingCallers)).toEqual(['process']);
		});

		it('should resolve full incoming chain at callDepth: -1', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(MULTI_HOP_DIR, 'helper.ts'),
				'normalize',
				MULTI_HOP_DIR,
				{ callDepth: -1 },
			);

			const executeCaller = meta.incomingCallers[0];
			expect(executeCaller.source.name).toBe('execute');

			const processCaller = executeCaller.incomingCallers[0];
			expect(processCaller.source.name).toBe('process');

			const handleCaller = processCaller.incomingCallers[0];
			expect(handleCaller.source.name).toBe('handle');
			expect(handleCaller.incomingCallers).toEqual([]);
		});
	});
});

// ---------------------------------------------------------------------------
// Cycle detection fixtures
// ---------------------------------------------------------------------------

const CYCLE_DIR = path.resolve(__dirname, 'fixtures', 'cycle');

describe('Phase 3 — Cycle detection (Item 2)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(CYCLE_DIR, 'tsconfig.json'),
		});
	});

	describe('mutual recursion: alpha ↔ beta', () => {
		it('should detect cycle at callDepth: -1 (outgoing)', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(CYCLE_DIR, 'alpha.ts'),
				'alpha',
				CYCLE_DIR,
				{ callDepth: -1 },
			);

			// alpha → beta
			expect(meta.outgoingCalls).toHaveLength(1);
			const betaCall = meta.outgoingCalls[0];
			expect(betaCall.target.name).toBe('beta');
			expect(betaCall.cyclic).toBeUndefined();

			// beta → alpha [cycle]
			expect(betaCall.outgoingCalls).toHaveLength(1);
			const alphaCall = betaCall.outgoingCalls[0];
			expect(alphaCall.target.name).toBe('alpha');
			expect(alphaCall.cyclic).toBe(true);
			expect(alphaCall.outgoingCalls).toEqual([]);
		});

		it('should detect cycle at callDepth: -1 (incoming)', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(CYCLE_DIR, 'alpha.ts'),
				'alpha',
				CYCLE_DIR,
				{ callDepth: -1 },
			);

			// alpha ← beta
			expect(meta.incomingCallers).toHaveLength(1);
			const betaCaller = meta.incomingCallers[0];
			expect(betaCaller.source.name).toBe('beta');
			expect(betaCaller.cyclic).toBeUndefined();

			// beta ← alpha [cycle]
			expect(betaCaller.incomingCallers).toHaveLength(1);
			const alphaCaller = betaCaller.incomingCallers[0];
			expect(alphaCaller.source.name).toBe('alpha');
			expect(alphaCaller.cyclic).toBe(true);
			expect(alphaCaller.incomingCallers).toEqual([]);
		});

		it('should respect callDepth: 1 without triggering cycle detection', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(CYCLE_DIR, 'alpha.ts'),
				'alpha',
				CYCLE_DIR,
				{ callDepth: 1 },
			);

			expect(meta.outgoingCalls).toHaveLength(1);
			expect(meta.outgoingCalls[0].target.name).toBe('beta');
			expect(meta.outgoingCalls[0].cyclic).toBeUndefined();
			expect(meta.outgoingCalls[0].depthLimited).toBe(true);
		});
	});

	describe('self-recursion: factorial', () => {
		it('should detect self-recursion at callDepth: -1', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(CYCLE_DIR, 'self-recursive.ts'),
				'factorial',
				CYCLE_DIR,
				{ callDepth: -1 },
			);

			// factorial → factorial [cycle]
			expect(meta.outgoingCalls).toHaveLength(1);
			const selfCall = meta.outgoingCalls[0];
			expect(selfCall.target.name).toBe('factorial');
			expect(selfCall.cyclic).toBe(true);
			expect(selfCall.outgoingCalls).toEqual([]);
		});

		it('should detect self-recursion in incoming callers at callDepth: -1', () => {
			const meta = resolveCallHierarchy(
				project,
				path.resolve(CYCLE_DIR, 'self-recursive.ts'),
				'factorial',
				CYCLE_DIR,
				{ callDepth: -1 },
			);

			// factorial ← factorial [cycle]
			expect(meta.incomingCallers).toHaveLength(1);
			const selfCaller = meta.incomingCallers[0];
			expect(selfCaller.source.name).toBe('factorial');
			expect(selfCaller.cyclic).toBe(true);
			expect(selfCaller.incomingCallers).toEqual([]);
		});
	});
});

// ---------------------------------------------------------------------------
// Constructor call fixtures
// ---------------------------------------------------------------------------

const CTOR_DIR = path.resolve(__dirname, 'fixtures', 'constructor');

describe('Phase 3 — Constructor call resolution (Item 2)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(CTOR_DIR, 'tsconfig.json'),
		});
	});

	it('should resolve new Database() as an outgoing call from initApp', () => {
		const meta = resolveCallHierarchy(
			project,
			path.resolve(CTOR_DIR, 'app.ts'),
			'initApp',
			CTOR_DIR,
		);

		const ctorCall = meta.outgoingCalls.find(c => c.target.name === 'Database');
		expect(ctorCall).toBeDefined();
		expect(ctorCall!.target.filePath).toBe('database.ts');
	});

	it('should also resolve db.query() as an outgoing call', () => {
		const meta = resolveCallHierarchy(
			project,
			path.resolve(CTOR_DIR, 'app.ts'),
			'initApp',
			CTOR_DIR,
		);

		const queryCall = meta.outgoingCalls.find(c => c.target.name === 'query');
		expect(queryCall).toBeDefined();
		expect(queryCall!.target.filePath).toBe('database.ts');
	});

	it('should resolve constructor outgoing calls at callDepth: 2', () => {
		const meta = resolveCallHierarchy(
			project,
			path.resolve(CTOR_DIR, 'app.ts'),
			'initApp',
			CTOR_DIR,
			{ callDepth: 2 },
		);

		// initApp → Database (constructor) → createPool
		const ctorCall = meta.outgoingCalls.find(c => c.target.name === 'Database');
		expect(ctorCall).toBeDefined();

		const createPoolCall = ctorCall!.outgoingCalls.find(c => c.target.name === 'createPool');
		expect(createPoolCall).toBeDefined();
		expect(createPoolCall!.target.filePath).toBe('pool.ts');
	});
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function flattenOutgoing(calls: OutgoingCall[]): OutgoingCall[] {
	const result: OutgoingCall[] = [];
	for (const call of calls) {
		result.push(call);
		result.push(...flattenOutgoing(call.outgoingCalls));
	}
	return result;
}
