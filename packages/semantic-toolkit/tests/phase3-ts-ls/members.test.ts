import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveMembers } from '../../src/ts-ls/members';
import type { MemberInfo } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'members');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

function byName(members: MemberInfo[], name: string): MemberInfo | undefined {
	return members.find(m => m.name === name);
}

function byKind(members: MemberInfo[], kind: string): MemberInfo[] {
	return members.filter(m => m.kind === kind);
}

describe('Phase 3 — Members (Item 8)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// =======================================================================
	// UserService class — all member kinds
	// =======================================================================

	describe('UserService class', () => {
		let members: MemberInfo[];

		beforeAll(() => {
			members = resolveMembers(project, abs('user-service.ts'), 'UserService');
		});

		// --- Overall structure ---

		it('should return members sorted by line number', () => {
			const lines = members.map(m => m.line);
			const sorted = [...lines].sort((a, b) => a - b);
			expect(lines).toEqual(sorted);
		});

		it('should include all member kinds present in the class', () => {
			const kinds = new Set(members.map(m => m.kind));
			expect(kinds).toContain('property');
			expect(kinds).toContain('method');
			expect(kinds).toContain('getter');
			expect(kinds).toContain('setter');
			expect(kinds).toContain('constructor');
			expect(kinds).toContain('indexSignature');
		});

		// --- Properties ---

		it('should resolve public name property', () => {
			const member = byName(members, 'name');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('string');
			expect(member!.modifiers).toContain('public');
		});

		it('should resolve private secret property', () => {
			const member = byName(members, 'secret');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('string');
			expect(member!.modifiers).toContain('private');
		});

		it('should resolve protected count property', () => {
			const member = byName(members, 'count');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('number');
			expect(member!.modifiers).toContain('protected');
		});

		it('should resolve static instance property', () => {
			const member = byName(members, 'instance');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('UserService | null');
			expect(member!.modifiers).toContain('static');
		});

		it('should resolve readonly version property', () => {
			const member = byName(members, 'version');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('number');
			expect(member!.modifiers).toContain('readonly');
		});

		it('should resolve ECMAScript private field #internalFlag', () => {
			const member = byName(members, '#internalFlag');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('boolean');
			// JS private fields have no TS access modifiers
			expect(member!.modifiers).not.toContain('private');
		});

		// --- Constructor ---

		it('should resolve constructor', () => {
			const member = byName(members, 'constructor');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('constructor');
			expect(member!.type).toBe('(name: string, secret: string)');
		});

		// --- Methods ---

		it('should resolve public async fetchUser method', () => {
			const member = byName(members, 'fetchUser');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('Promise<string>');
			expect(member!.modifiers).toContain('public');
			expect(member!.modifiers).toContain('async');
		});

		it('should resolve private hashSecret method', () => {
			const member = byName(members, 'hashSecret');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('string');
			expect(member!.modifiers).toContain('private');
		});

		it('should resolve protected resetCount method', () => {
			const member = byName(members, 'resetCount');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('void');
			expect(member!.modifiers).toContain('protected');
		});

		it('should resolve static create method', () => {
			const member = byName(members, 'create');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('UserService');
			expect(member!.modifiers).toContain('static');
		});

		it('should resolve abstract validate method', () => {
			const member = byName(members, 'validate');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('boolean');
			expect(member!.modifiers).toContain('abstract');
		});

		it('should resolve override toString method', () => {
			const member = byName(members, 'toString');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('string');
			expect(member!.modifiers).toContain('override');
		});

		// --- Getters / Setters ---

		it('should resolve getter isActive', () => {
			const member = byName(members, 'isActive');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('getter');
			expect(member!.type).toBe('boolean');
		});

		it('should resolve setter threshold', () => {
			const member = byName(members, 'threshold');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('setter');
			expect(member!.type).toBe('number');
		});

		// --- Index Signature ---

		it('should resolve index signature', () => {
			const idxMembers = byKind(members, 'indexSignature');
			expect(idxMembers.length).toBe(1);
			expect(idxMembers[0].name).toBe('');
			expect(idxMembers[0].type).toContain('[key: string]');
		});
	});

	// =======================================================================
	// BaseService class — simple class with one method
	// =======================================================================

	describe('BaseService class', () => {
		let members: MemberInfo[];

		beforeAll(() => {
			members = resolveMembers(project, abs('user-service.ts'), 'BaseService');
		});

		it('should have exactly 1 member (toString method)', () => {
			expect(members).toHaveLength(1);
		});

		it('should resolve toString method with no modifiers', () => {
			expect(members[0].name).toBe('toString');
			expect(members[0].kind).toBe('method');
			expect(members[0].type).toBe('string');
			expect(members[0].modifiers).toEqual([]);
		});
	});

	// =======================================================================
	// Repository interface — all interface member kinds
	// =======================================================================

	describe('Repository interface', () => {
		let members: MemberInfo[];

		beforeAll(() => {
			members = resolveMembers(project, abs('repository.ts'), 'Repository');
		});

		it('should return members sorted by line number', () => {
			const lines = members.map(m => m.line);
			const sorted = [...lines].sort((a, b) => a - b);
			expect(lines).toEqual(sorted);
		});

		it('should include all interface member kinds', () => {
			const kinds = new Set(members.map(m => m.kind));
			expect(kinds).toContain('property');
			expect(kinds).toContain('method');
			expect(kinds).toContain('indexSignature');
			expect(kinds).toContain('callSignature');
			expect(kinds).toContain('constructSignature');
		});

		// --- Properties ---

		it('should resolve readonly tableName property', () => {
			const member = byName(members, 'tableName');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('string');
			expect(member!.modifiers).toContain('readonly');
		});

		it('should resolve version property (no modifiers)', () => {
			const member = byName(members, 'version');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('property');
			expect(member!.type).toBe('number');
			expect(member!.modifiers).toEqual([]);
		});

		// --- Methods ---

		it('should resolve findById method', () => {
			const member = byName(members, 'findById');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('Promise<T | null>');
		});

		it('should resolve save method', () => {
			const member = byName(members, 'save');
			expect(member).toBeDefined();
			expect(member!.kind).toBe('method');
			expect(member!.type).toBe('Promise<void>');
		});

		// --- Index Signature ---

		it('should resolve index signature', () => {
			const idxMembers = byKind(members, 'indexSignature');
			expect(idxMembers.length).toBe(1);
			expect(idxMembers[0].name).toBe('');
			expect(idxMembers[0].type).toContain('[key: string]');
		});

		// --- Call Signature ---

		it('should resolve call signature', () => {
			const callMembers = byKind(members, 'callSignature');
			expect(callMembers.length).toBe(1);
			expect(callMembers[0].name).toBe('');
			expect(callMembers[0].type).toContain('query: string');
		});

		// --- Construct Signature ---

		it('should resolve construct signature', () => {
			const ctorMembers = byKind(members, 'constructSignature');
			expect(ctorMembers.length).toBe(1);
			expect(ctorMembers[0].name).toBe('');
			expect(ctorMembers[0].type).toContain('new');
		});
	});

	// =======================================================================
	// Empty interface — edge case
	// =======================================================================

	describe('Empty interface', () => {
		it('should return empty array', () => {
			const members = resolveMembers(project, abs('repository.ts'), 'Empty');
			expect(members).toEqual([]);
		});
	});

	// =======================================================================
	// Config interface — properties only
	// =======================================================================

	describe('Config interface (properties only)', () => {
		let members: MemberInfo[];

		beforeAll(() => {
			members = resolveMembers(project, abs('repository.ts'), 'Config');
		});

		it('should have exactly 3 members', () => {
			expect(members).toHaveLength(3);
		});

		it('should have all properties', () => {
			expect(members.every(m => m.kind === 'property')).toBe(true);
		});

		it('should identify readonly debug', () => {
			const debug = byName(members, 'debug');
			expect(debug).toBeDefined();
			expect(debug!.modifiers).toContain('readonly');
			expect(debug!.type).toBe('boolean');
		});

		it('should have host as plain property', () => {
			const host = byName(members, 'host');
			expect(host).toBeDefined();
			expect(host!.modifiers).toEqual([]);
			expect(host!.type).toBe('string');
		});
	});

	// =======================================================================
	// Error handling
	// =======================================================================

	describe('error handling', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveMembers(project, abs('user-service.ts'), 'NonExistent'),
			).toThrow('Class or interface "NonExistent" not found');
		});

		it('should throw for non-existent file', () => {
			expect(() =>
				resolveMembers(project, abs('doesnt-exist.ts'), 'Foo'),
			).toThrow();
		});
	});
});
