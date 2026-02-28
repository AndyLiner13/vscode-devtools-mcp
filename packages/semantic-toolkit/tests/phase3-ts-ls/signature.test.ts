import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveSignature } from '../../src/ts-ls/signature';
import type { SignatureInfo } from '../../src/ts-ls/signature';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'signature');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Signature + Modifiers (Item 9)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// =======================================================================
	// Functions
	// =======================================================================

	describe('exported async function fetchData', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'fetchData');
		});

		it('should build full signature with params and return type', () => {
			expect(info.signature).toBe('fetchData(url: string, retries?: number): Promise<string>');
		});

		it('should include async and exported modifiers', () => {
			expect(info.modifiers).toContain('async');
			expect(info.modifiers).toContain('exported');
		});
	});

	describe('non-exported function helperFn', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'helperFn');
		});

		it('should build correct signature', () => {
			expect(info.signature).toBe('helperFn(a: number, b: number): number');
		});

		it('should not include exported modifier', () => {
			expect(info.modifiers).not.toContain('exported');
		});
	});

	describe('generic function with rest params', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'genericFn');
		});

		it('should include type params in signature', () => {
			expect(info.signature).toContain('<T extends object>');
		});

		it('should include rest param syntax', () => {
			expect(info.signature).toContain('...extra: string[]');
		});

		it('should include return type', () => {
			expect(info.signature).toContain('T | null');
		});

		it('should be exported', () => {
			expect(info.modifiers).toContain('exported');
		});
	});

	// =======================================================================
	// Variables
	// =======================================================================

	describe('exported const MAX_RETRIES', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'MAX_RETRIES');
		});

		it('should include variable keyword and type', () => {
			expect(info.signature).toBe('const MAX_RETRIES: number');
		});

		it('should be exported', () => {
			expect(info.modifiers).toContain('exported');
		});
	});

	describe('non-exported let counter', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'counter');
		});

		it('should include let keyword', () => {
			expect(info.signature).toContain('let counter');
		});

		it('should not be exported', () => {
			expect(info.modifiers).not.toContain('exported');
		});
	});

	// =======================================================================
	// Type aliases
	// =======================================================================

	describe('type alias UserId', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'UserId');
		});

		it('should show type alias with value', () => {
			expect(info.signature).toBe('type UserId = string');
		});

		it('should be exported', () => {
			expect(info.modifiers).toContain('exported');
		});
	});

	describe('generic type alias Result', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'Result');
		});

		it('should include type params with default', () => {
			expect(info.signature).toContain('<T, E = Error>');
		});

		it('should include the union type body', () => {
			expect(info.signature).toContain('{ ok: true; value: T }');
		});
	});

	// =======================================================================
	// Enums
	// =======================================================================

	describe('regular enum Direction', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'Direction');
		});

		it('should have enum signature', () => {
			expect(info.signature).toBe('enum Direction');
		});

		it('should be exported', () => {
			expect(info.modifiers).toContain('exported');
		});
	});

	describe('const enum LogLevel', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'LogLevel');
		});

		it('should have const enum signature', () => {
			expect(info.signature).toBe('const enum LogLevel');
		});
	});

	// =======================================================================
	// Interfaces
	// =======================================================================

	describe('interface Serializable', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'Serializable');
		});

		it('should have interface signature', () => {
			expect(info.signature).toBe('interface Serializable');
		});

		it('should be exported', () => {
			expect(info.modifiers).toContain('exported');
		});
	});

	describe('generic interface Repository extending Serializable', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'Repository');
		});

		it('should include type params and extends', () => {
			expect(info.signature).toBe('interface Repository<T extends object> extends Serializable');
		});
	});

	// --- Interface members ---

	describe('interface method findById (from Repository)', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'findById');
		});

		it('should have method signature with params and return', () => {
			expect(info.signature).toBe('findById(id: string): Promise<T | null>');
		});

		it('should have no modifiers (interface methods have none)', () => {
			expect(info.modifiers).toEqual([]);
		});
	});

	// =======================================================================
	// Classes
	// =======================================================================

	describe('abstract class BaseService', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'BaseService');
		});

		it('should include abstract keyword in class signature', () => {
			expect(info.signature).toContain('class BaseService');
		});

		it('should have abstract and exported modifiers', () => {
			expect(info.modifiers).toContain('abstract');
			expect(info.modifiers).toContain('exported');
		});
	});

	describe('class UserService extending and implementing', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'UserService');
		});

		it('should include extends and implements in signature', () => {
			expect(info.signature).toBe('class UserService extends BaseService implements Serializable');
		});

		it('should be exported but not abstract', () => {
			expect(info.modifiers).toContain('exported');
			expect(info.modifiers).not.toContain('abstract');
		});
	});

	// --- Class members ---

	describe('class property id (public readonly)', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'id');
		});

		it('should have property signature', () => {
			expect(info.signature).toBe('id: number');
		});

		it('should have public and readonly modifiers', () => {
			expect(info.modifiers).toContain('public');
			expect(info.modifiers).toContain('readonly');
		});
	});

	describe('class method fetchUser (public async)', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'fetchUser');
		});

		it('should have full method signature', () => {
			expect(info.signature).toBe('fetchUser(userId: UserId): Promise<string>');
		});

		it('should have public and async modifiers', () => {
			expect(info.modifiers).toContain('public');
			expect(info.modifiers).toContain('async');
		});
	});

	describe('class method reset (private static)', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'reset');
		});

		it('should have method signature', () => {
			expect(info.signature).toBe('reset(): void');
		});

		it('should have private and static modifiers', () => {
			expect(info.modifiers).toContain('private');
			expect(info.modifiers).toContain('static');
		});
	});

	describe('getter isActive', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'isActive');
		});

		it('should have get accessor signature', () => {
			expect(info.signature).toBe('get isActive(): boolean');
		});
	});

	describe('setter threshold', () => {
		let info: SignatureInfo;
		beforeAll(() => {
			info = resolveSignature(project, abs('all-kinds.ts'), 'threshold');
		});

		it('should have set accessor signature', () => {
			expect(info.signature).toBe('set threshold(value: number)');
		});
	});

	// =======================================================================
	// Error handling
	// =======================================================================

	describe('error handling', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveSignature(project, abs('all-kinds.ts'), 'NonExistent'),
			).toThrow('Symbol "NonExistent" not found');
		});

		it('should throw for non-existent file', () => {
			expect(() =>
				resolveSignature(project, abs('missing.ts'), 'Foo'),
			).toThrow();
		});
	});
});
