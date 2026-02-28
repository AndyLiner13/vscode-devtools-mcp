import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveCallHierarchy } from '../../src/ts-ls/call-hierarchy';
import type { SymbolMetadata, OutgoingCall, IncomingCaller } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'call-chain');
const WORKSPACE_ROOT = FIXTURES_DIR;

function rel(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

function outgoingNames(meta: SymbolMetadata): string[] {
	return meta.outgoingCalls.map(c => c.target.name).sort();
}

function incomingNames(meta: SymbolMetadata): string[] {
	return meta.incomingCallers.map(c => c.source.name).sort();
}

describe('Phase 3 — Core Call Hierarchy (Item 1)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	describe('service.ts → processRequest', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				rel('service.ts'),
				'processRequest',
				WORKSPACE_ROOT,
			);
		});

		it('should resolve the symbol reference', () => {
			expect(meta.symbol.name).toBe('processRequest');
			expect(meta.symbol.filePath).toBe('service.ts');
		});

		it('should have outgoing calls to validate and format', () => {
			expect(outgoingNames(meta)).toEqual(['format', 'validate']);
		});

		it('should have no incoming callers (top-level entry)', () => {
			expect(meta.incomingCallers).toHaveLength(0);
		});

		it('should include call site lines for outgoing calls', () => {
			const validateCall = meta.outgoingCalls.find(c => c.target.name === 'validate');
			expect(validateCall).toBeDefined();
			expect(validateCall!.callSiteLines.length).toBeGreaterThan(0);

			const formatCall = meta.outgoingCalls.find(c => c.target.name === 'format');
			expect(formatCall).toBeDefined();
			expect(formatCall!.callSiteLines.length).toBeGreaterThan(0);
		});

		it('should resolve outgoing call targets to correct files', () => {
			const validateCall = meta.outgoingCalls.find(c => c.target.name === 'validate');
			expect(validateCall!.target.filePath).toBe('validator.ts');

			const formatCall = meta.outgoingCalls.find(c => c.target.name === 'format');
			expect(formatCall!.target.filePath).toBe('formatter.ts');
		});
	});

	describe('validator.ts → validate', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				rel('validator.ts'),
				'validate',
				WORKSPACE_ROOT,
			);
		});

		it('should resolve the symbol reference', () => {
			expect(meta.symbol.name).toBe('validate');
			expect(meta.symbol.filePath).toBe('validator.ts');
		});

		it('should have outgoing call to sanitize', () => {
			expect(outgoingNames(meta)).toEqual(['sanitize']);
		});

		it('should have incoming caller: processRequest', () => {
			expect(incomingNames(meta)).toEqual(['processRequest']);
		});

		it('should resolve incoming caller to service.ts', () => {
			const caller = meta.incomingCallers.find(c => c.source.name === 'processRequest');
			expect(caller).toBeDefined();
			expect(caller!.source.filePath).toBe('service.ts');
		});
	});

	describe('formatter.ts → format', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				rel('formatter.ts'),
				'format',
				WORKSPACE_ROOT,
			);
		});

		it('should resolve the symbol reference', () => {
			expect(meta.symbol.name).toBe('format');
			expect(meta.symbol.filePath).toBe('formatter.ts');
		});

		it('should have outgoing call to sanitize', () => {
			expect(outgoingNames(meta)).toEqual(['sanitize']);
		});

		it('should have incoming caller: processRequest', () => {
			expect(incomingNames(meta)).toEqual(['processRequest']);
		});
	});

	describe('helper.ts → sanitize', () => {
		let meta: SymbolMetadata;

		beforeAll(() => {
			meta = resolveCallHierarchy(
				project,
				rel('helper.ts'),
				'sanitize',
				WORKSPACE_ROOT,
			);
		});

		it('should resolve the symbol reference', () => {
			expect(meta.symbol.name).toBe('sanitize');
			expect(meta.symbol.filePath).toBe('helper.ts');
		});

		it('should have no outgoing calls (leaf node — only built-in methods)', () => {
			expect(meta.outgoingCalls).toHaveLength(0);
		});

		it('should have incoming callers: validate and format', () => {
			expect(incomingNames(meta)).toEqual(['format', 'validate']);
		});

		it('should resolve incoming callers to correct files', () => {
			const validateCaller = meta.incomingCallers.find(c => c.source.name === 'validate');
			expect(validateCaller).toBeDefined();
			expect(validateCaller!.source.filePath).toBe('validator.ts');

			const formatCaller = meta.incomingCallers.find(c => c.source.name === 'format');
			expect(formatCaller).toBeDefined();
			expect(formatCaller!.source.filePath).toBe('formatter.ts');
		});
	});

	describe('error handling', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveCallHierarchy(
					project,
					rel('service.ts'),
					'nonExistentFunction',
					WORKSPACE_ROOT,
				),
			).toThrow('Symbol "nonExistentFunction" not found');
		});
	});
});
