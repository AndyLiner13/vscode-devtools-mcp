import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveTypeGuards } from '../../src/ts-ls/type-guards';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'type-guards');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Type Guards / Narrowing (Item 14)', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// User-defined type guards (x is T)
	// ===================================================================

	describe('User-defined type guards', () => {
		it('should detect isUser return type guard', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const userDefined = result.guards.filter(g => g.kind === 'user-defined');
			expect(userDefined).toHaveLength(1);
			expect(userDefined[0].narrowedName).toBe('value');
			expect(userDefined[0].narrowedTo).toBe('User');
			expect(userDefined[0].isReturnTypeGuard).toBe(true);
		});

		it('should detect isAdmin return type guard', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'isAdmin', workspaceRoot);
			const userDefined = result.guards.filter(g => g.kind === 'user-defined');
			expect(userDefined).toHaveLength(1);
			expect(userDefined[0].narrowedTo).toBe('Admin');
			expect(userDefined[0].isReturnTypeGuard).toBe(true);
		});
	});

	// ===================================================================
	// Assertion functions (asserts x is T)
	// ===================================================================

	describe('Assertion functions', () => {
		it('should detect assertAdmin assertion guard', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'assertAdmin', workspaceRoot);
			const assertions = result.guards.filter(g => g.kind === 'assertion');
			expect(assertions).toHaveLength(1);
			expect(assertions[0].narrowedName).toBe('value');
			expect(assertions[0].narrowedTo).toBe('Admin');
			expect(assertions[0].isReturnTypeGuard).toBe(true);
		});

		it('should detect assertDefined assertion without target type', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'assertDefined', workspaceRoot);
			const assertions = result.guards.filter(g => g.kind === 'assertion');
			expect(assertions).toHaveLength(1);
			expect(assertions[0].narrowedName).toBe('value');
			expect(assertions[0].narrowedTo).toBeUndefined();
			expect(assertions[0].isReturnTypeGuard).toBe(true);
		});
	});

	// ===================================================================
	// typeof guards
	// ===================================================================

	describe('typeof guards', () => {
		it('should detect typeof guards in processInput', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'processInput', workspaceRoot);
			const typeofGuards = result.guards.filter(g => g.kind === 'typeof');
			expect(typeofGuards).toHaveLength(2);
			expect(typeofGuards[0].narrowedName).toBe('input');
			expect(typeofGuards[0].narrowedTo).toBe('string');
			expect(typeofGuards[1].narrowedName).toBe('input');
			expect(typeofGuards[1].narrowedTo).toBe('number');
		});
	});

	// ===================================================================
	// instanceof guards
	// ===================================================================

	describe('instanceof guards', () => {
		it('should detect instanceof guards in handleError', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'handleError', workspaceRoot);
			const instanceofGuards = result.guards.filter(g => g.kind === 'instanceof');
			expect(instanceofGuards).toHaveLength(2);
			expect(instanceofGuards[0].narrowedName).toBe('err');
			expect(instanceofGuards[0].narrowedTo).toBe('TypeError');
			expect(instanceofGuards[1].narrowedTo).toBe('RangeError');
		});
	});

	// ===================================================================
	// in-operator guards
	// ===================================================================

	describe('in-operator guards', () => {
		it('should detect in-operator guard in describeAnimal', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'describeAnimal', workspaceRoot);
			const inGuards = result.guards.filter(g => g.kind === 'in-operator');
			expect(inGuards).toHaveLength(1);
			expect(inGuards[0].narrowedName).toBe('animal');
			expect(inGuards[0].narrowedTo).toBe('bark');
		});
	});

	// ===================================================================
	// Discriminated unions (switch)
	// ===================================================================

	describe('Discriminated union (switch)', () => {
		it('should detect discriminant cases in getArea', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'getArea', workspaceRoot);
			const discriminants = result.guards.filter(g => g.kind === 'discriminant');
			expect(discriminants).toHaveLength(3);
			expect(discriminants[0].narrowedTo).toBe('circle');
			expect(discriminants[1].narrowedTo).toBe('square');
			expect(discriminants[2].narrowedTo).toBe('triangle');
			for (const d of discriminants) {
				expect(d.narrowedName).toBe('shape');
			}
		});

		it('should detect exhaustiveness check in getArea', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'getArea', workspaceRoot);
			const exhaustive = result.guards.filter(g => g.kind === 'exhaustive');
			expect(exhaustive).toHaveLength(1);
			expect(exhaustive[0].narrowedTo).toBe('never');
		});
	});

	// ===================================================================
	// Discriminant via if (not switch)
	// ===================================================================

	describe('Discriminant via if', () => {
		it('should detect discriminant in handleResult', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'handleResult', workspaceRoot);
			const discriminants = result.guards.filter(g => g.kind === 'discriminant');
			expect(discriminants).toHaveLength(1);
			expect(discriminants[0].narrowedName).toBe('result');
			expect(discriminants[0].narrowedTo).toBe('true');
		});
	});

	// ===================================================================
	// Nullish guards
	// ===================================================================

	describe('Nullish guards', () => {
		it('should detect != null guard in greet', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'greet', workspaceRoot);
			const nullish = result.guards.filter(g => g.kind === 'nullish');
			expect(nullish).toHaveLength(1);
			expect(nullish[0].narrowedName).toBe('name');
		});

		it('should detect !== null guard in greetStrict', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'greetStrict', workspaceRoot);
			const nullish = result.guards.filter(g => g.kind === 'nullish');
			expect(nullish).toHaveLength(1);
			expect(nullish[0].narrowedName).toBe('name');
		});
	});

	// ===================================================================
	// Equality narrowing
	// ===================================================================

	describe('Equality narrowing', () => {
		it('should detect equality guards in describeStatus', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'describeStatus', workspaceRoot);
			const equality = result.guards.filter(g => g.kind === 'equality');
			expect(equality).toHaveLength(2);
			expect(equality[0].narrowedName).toBe('status');
			expect(equality[0].narrowedTo).toBe('active');
			expect(equality[1].narrowedTo).toBe('pending');
		});
	});

	// ===================================================================
	// Array.isArray
	// ===================================================================

	describe('Array.isArray', () => {
		it('should detect Array.isArray guard in flatten', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'flatten', workspaceRoot);
			const arrayGuards = result.guards.filter(g => g.kind === 'array-isarray');
			expect(arrayGuards).toHaveLength(1);
			expect(arrayGuards[0].narrowedName).toBe('input');
			expect(arrayGuards[0].narrowedTo).toBe('Array');
		});
	});

	// ===================================================================
	// Early-return guard clauses
	// ===================================================================

	describe('Early-return guard clauses', () => {
		it('should detect early-return in processUser (if + return)', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'processUser', workspaceRoot);
			const earlyReturn = result.guards.filter(g => g.kind === 'early-return');
			expect(earlyReturn).toHaveLength(1);
			expect(earlyReturn[0].narrowedName).toBe('user');
		});

		it('should detect early-return in processWithThrow (if + throw)', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'processWithThrow', workspaceRoot);
			const earlyReturn = result.guards.filter(g => g.kind === 'early-return');
			expect(earlyReturn).toHaveLength(1);
			expect(earlyReturn[0].narrowedName).toBe('user');
		});
	});

	// ===================================================================
	// Exhaustiveness check (standalone)
	// ===================================================================

	describe('Exhaustiveness check (standalone)', () => {
		it('should detect exhaustiveness check in describeShape', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'describeShape', workspaceRoot);
			const exhaustive = result.guards.filter(g => g.kind === 'exhaustive');
			expect(exhaustive).toHaveLength(1);
			expect(exhaustive[0].narrowedTo).toBe('never');
		});

		it('should also detect discriminant if-checks in describeShape', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'describeShape', workspaceRoot);
			const discriminants = result.guards.filter(g => g.kind === 'discriminant');
			expect(discriminants).toHaveLength(3);
		});
	});

	// ===================================================================
	// Compound guards
	// ===================================================================

	describe('Compound guards', () => {
		it('should detect compound || guard in isStringOrNumber', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'isStringOrNumber', workspaceRoot);
			const compound = result.guards.filter(g => g.kind === 'compound');
			expect(compound).toHaveLength(1);
			expect(compound[0].narrowedName).toBe('value');
			expect(compound[0].narrowedTo).toContain('string');
			expect(compound[0].narrowedTo).toContain('number');
		});

		it('should detect compound && guard in isNonNullAdmin', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'isNonNullAdmin', workspaceRoot);
			const compound = result.guards.filter(g => g.kind === 'compound');
			expect(compound).toHaveLength(1);
			expect(compound[0].narrowedName).toBe('value');
		});
	});

	// ===================================================================
	// Symbol reference
	// ===================================================================

	describe('Symbol reference', () => {
		it('should return correct symbol ref', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'processInput', workspaceRoot);
			expect(result.symbol.name).toBe('processInput');
			expect(result.symbol.filePath).toBe('guards.ts');
		});
	});

	// ===================================================================
	// Guards are sorted by line
	// ===================================================================

	describe('Sort order', () => {
		it('should return guards sorted by line number', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'getArea', workspaceRoot);
			const lines = result.guards.map(g => g.line);
			const sorted = [...lines].sort((a, b) => a - b);
			expect(lines).toEqual(sorted);
		});
	});

	// ===================================================================
	// Multiple guard kinds in one function
	// ===================================================================

	describe('Multiple guard kinds in one function', () => {
		it('isUser should have return-type guard', () => {
			const result = resolveTypeGuards(project, abs('guards.ts'), 'isUser', workspaceRoot);
			const kinds = new Set(result.guards.map(g => g.kind));
			expect(kinds.has('user-defined')).toBe(true);
			// Body is a return expression (not if-statements), so body guards
			// in return expressions are not extracted by the current walker.
			expect(result.guards.filter(g => g.isReturnTypeGuard)).toHaveLength(1);
		});
	});

	// ===================================================================
	// Error handling
	// ===================================================================

	describe('Error handling', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveTypeGuards(project, abs('guards.ts'), 'nonExistent', workspaceRoot),
			).toThrow('not found');
		});
	});
});
