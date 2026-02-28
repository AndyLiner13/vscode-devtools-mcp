import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveTypeFlows } from '../../src/ts-ls/type-flows';
import type { TypeFlow, TypeFlowType } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'type-flows');
const WORKSPACE_ROOT = FIXTURES_DIR;

function rel(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

/** Extract just the names from resolved types for concise assertions. */
function typeNames(types: TypeFlowType[]): string[] {
	return types.map(t => t.name).sort();
}

/** Extract param names from a TypeFlow. */
function paramNames(flow: TypeFlow): string[] {
	return flow.parameters.map(p => p.name);
}

describe('Phase 3 — Type Flows (Item 7)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// -------------------------------------------------------------------
	// Simple functions
	// -------------------------------------------------------------------

	describe('getUser — simple user-defined param and return', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'getUser', WORKSPACE_ROOT);
		});

		it('should identify the symbol', () => {
			expect(flow.symbol.name).toBe('getUser');
			expect(flow.symbol.filePath).toBe('functions.ts');
		});

		it('should have one parameter', () => {
			expect(paramNames(flow)).toEqual(['id']);
		});

		it('should resolve UserId in parameter', () => {
			expect(flow.parameters[0].type).toBe('UserId');
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['UserId']);
		});

		it('should resolve User in return type', () => {
			expect(flow.returnType).toBeDefined();
			expect(flow.returnType!.type).toBe('User');
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});

		it('should deduplicate referencedTypes', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['User', 'UserId']);
		});
	});

	describe('createToken — primitive params, user-defined return', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'createToken', WORKSPACE_ROOT);
		});

		it('should have two primitive parameters with no resolved types', () => {
			expect(paramNames(flow)).toEqual(['userId', 'secret']);
			expect(flow.parameters[0].resolvedTypes).toHaveLength(0);
			expect(flow.parameters[1].resolvedTypes).toHaveLength(0);
		});

		it('should resolve Token in return type', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['Token']);
		});

		it('should have Token as only referenced type', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['Token']);
		});
	});

	describe('add — no user-defined types at all', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'add', WORKSPACE_ROOT);
		});

		it('should have no resolved types in params', () => {
			for (const param of flow.parameters) {
				expect(param.resolvedTypes).toHaveLength(0);
			}
		});

		it('should have no resolved types in return', () => {
			expect(flow.returnType).toBeDefined();
			expect(flow.returnType!.resolvedTypes).toHaveLength(0);
		});

		it('should have empty referencedTypes', () => {
			expect(flow.referencedTypes).toHaveLength(0);
		});
	});

	describe('logMessage — void return with no user types', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'logMessage', WORKSPACE_ROOT);
		});

		it('should have one primitive parameter', () => {
			expect(paramNames(flow)).toEqual(['message']);
			expect(flow.parameters[0].resolvedTypes).toHaveLength(0);
		});

		it('should have void return type', () => {
			// Explicit void annotation exists, so returnType should be present
			expect(flow.returnType).toBeDefined();
			expect(flow.returnType!.type).toBe('void');
			expect(flow.returnType!.resolvedTypes).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------
	// Union and intersection types
	// -------------------------------------------------------------------

	describe('displayName — union type param (string | User)', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'displayName', WORKSPACE_ROOT);
		});

		it('should extract User from union (filtering out string)', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['User']);
		});

		it('should have User in referencedTypes', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['User']);
		});
	});

	describe('promoteUser — intersection type param (User & {...})', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'promoteUser', WORKSPACE_ROOT);
		});

		it('should extract User from intersection', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['User']);
		});

		it('should extract Role from return', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['Role']);
		});

		it('should have both User and Role in referencedTypes', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['Role', 'User']);
		});
	});

	// -------------------------------------------------------------------
	// Generics
	// -------------------------------------------------------------------

	describe('fetchUser — Promise<User>', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'fetchUser', WORKSPACE_ROOT);
		});

		it('should extract User from Promise<User> return', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});
	});

	describe('getTokenMap — Map<string, Array<Token>>', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'getTokenMap', WORKSPACE_ROOT);
		});

		it('should extract Token from nested generic', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['Token']);
		});
	});

	describe('permissionIndex — Map<UserId, Set<Permission>>', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'permissionIndex', WORKSPACE_ROOT);
		});

		it('should extract both UserId and Permission from deeply nested generics', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['Permission', 'UserId']);
		});
	});

	describe('findUser — Promise<User | null>', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'findUser', WORKSPACE_ROOT);
		});

		it('should extract User from union inside generic', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});
	});

	// -------------------------------------------------------------------
	// Tuples and arrays
	// -------------------------------------------------------------------

	describe('getUserWithToken — tuple return [User, Token]', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'getUserWithToken', WORKSPACE_ROOT);
		});

		it('should extract both User and Token from tuple return', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['Token', 'User']);
		});
	});

	describe('listUsers — User[] array return with Status param', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'listUsers', WORKSPACE_ROOT);
		});

		it('should extract Status from param', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['Status']);
		});

		it('should extract User from User[] return', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});
	});

	// -------------------------------------------------------------------
	// Function-typed parameters
	// -------------------------------------------------------------------

	describe('processUser — function-typed callback param', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'processUser', WORKSPACE_ROOT);
		});

		it('should extract User from direct param', () => {
			const userParam = flow.parameters.find(p => p.name === 'user');
			expect(userParam).toBeDefined();
			expect(typeNames(userParam!.resolvedTypes)).toEqual(['User']);
		});

		it('should extract AuditEntry and Token from callback param', () => {
			const cbParam = flow.parameters.find(p => p.name === 'callback');
			expect(cbParam).toBeDefined();
			expect(typeNames(cbParam!.resolvedTypes)).toEqual(['AuditEntry', 'Token']);
		});

		it('should have all types in referencedTypes', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['AuditEntry', 'Token', 'User']);
		});
	});

	// -------------------------------------------------------------------
	// Multiple params, deduplication
	// -------------------------------------------------------------------

	describe('assignRole — multiple user-defined params and return', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'assignRole', WORKSPACE_ROOT);
		});

		it('should resolve types for each param separately', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['User']);
			expect(typeNames(flow.parameters[1].resolvedTypes)).toEqual(['Role']);
		});

		it('should resolve AuditEntry in return', () => {
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['AuditEntry']);
		});

		it('should have all three in referencedTypes', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['AuditEntry', 'Role', 'User']);
		});
	});

	describe('cloneUser — same type in param and return (dedup test)', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'cloneUser', WORKSPACE_ROOT);
		});

		it('should have User in both param and return', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['User']);
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});

		it('should deduplicate User in referencedTypes', () => {
			expect(flow.referencedTypes).toHaveLength(1);
			expect(flow.referencedTypes[0].name).toBe('User');
		});
	});

	// -------------------------------------------------------------------
	// Class constructor
	// -------------------------------------------------------------------

	describe('UserService constructor', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('service.ts'), 'UserService', WORKSPACE_ROOT);
		});

		it('should identify the symbol as UserService', () => {
			expect(flow.symbol.name).toBe('UserService');
		});

		it('should have two constructor params', () => {
			expect(paramNames(flow)).toEqual(['defaultRole', 'initialUsers']);
		});

		it('should resolve Role in first param', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['Role']);
		});

		it('should resolve User from User[] in second param', () => {
			expect(typeNames(flow.parameters[1].resolvedTypes)).toEqual(['User']);
		});

		it('should have no return type (constructor)', () => {
			expect(flow.returnType).toBeUndefined();
		});

		it('should have Role and User in referencedTypes', () => {
			expect(typeNames(flow.referencedTypes)).toEqual(['Role', 'User']);
		});
	});

	// -------------------------------------------------------------------
	// Class methods
	// -------------------------------------------------------------------

	describe('UserService.authenticate — method type flows', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('service.ts'), 'authenticate', WORKSPACE_ROOT);
		});

		it('should resolve User in first param', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['User']);
		});

		it('should have primitive string in second param', () => {
			expect(flow.parameters[1].resolvedTypes).toHaveLength(0);
		});

		it('should resolve Token in return', () => {
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['Token']);
		});
	});

	describe('UserService.getById — union return (User | undefined)', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('service.ts'), 'getById', WORKSPACE_ROOT);
		});

		it('should extract User from User | undefined return', () => {
			expect(flow.returnType).toBeDefined();
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});
	});

	describe('UserService.listByStatus — enum param, array return', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('service.ts'), 'listByStatus', WORKSPACE_ROOT);
		});

		it('should extract Status from param', () => {
			expect(typeNames(flow.parameters[0].resolvedTypes)).toEqual(['Status']);
		});

		it('should extract User from User[] return', () => {
			expect(typeNames(flow.returnType!.resolvedTypes)).toEqual(['User']);
		});
	});

	// -------------------------------------------------------------------
	// Error cases
	// -------------------------------------------------------------------

	describe('error handling', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveTypeFlows(project, rel('functions.ts'), 'nonExistent', WORKSPACE_ROOT),
			).toThrow('Callable symbol "nonExistent" not found');
		});

		it('should throw for non-existent file', () => {
			expect(() =>
				resolveTypeFlows(project, rel('no-such-file.ts'), 'getUser', WORKSPACE_ROOT),
			).toThrow();
		});
	});

	// -------------------------------------------------------------------
	// TypeFlowType structure validation
	// -------------------------------------------------------------------

	describe('TypeFlowType structure', () => {
		let flow: TypeFlow;

		beforeAll(() => {
			flow = resolveTypeFlows(project, rel('functions.ts'), 'getUser', WORKSPACE_ROOT);
		});

		it('should include filePath and line for each resolved type', () => {
			for (const t of flow.referencedTypes) {
				expect(t.filePath).toBe('types.ts');
				expect(typeof t.line).toBe('number');
				expect(t.line).toBeGreaterThan(0);
			}
		});

		it('should have consistent return type structure', () => {
			expect(flow.returnType).toBeDefined();
			expect(flow.returnType!.name).toBe('return');
			expect(typeof flow.returnType!.type).toBe('string');
			expect(Array.isArray(flow.returnType!.resolvedTypes)).toBe(true);
		});
	});
});
