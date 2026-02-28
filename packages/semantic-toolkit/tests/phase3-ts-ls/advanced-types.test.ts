import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveAdvancedTypes } from '../../src/ts-ls/advanced-types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'advanced-types');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Advanced Types (Item 17)', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// Conditional types
	// ===================================================================

	describe('Conditional types', () => {
		it('should detect simple conditional: IsString<T>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'IsString', workspaceRoot);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.conditional).toBeDefined();
			expect(result.structure.conditional!.checkType).toBe('T');
			expect(result.structure.conditional!.extendsType).toBe('string');
			expect(result.structure.conditional!.trueType).toBe('true');
			expect(result.structure.conditional!.falseType).toBe('false');
			expect(result.structure.conditional!.inferTypes).toEqual([]);
			expect(result.typeParameters).toEqual(['T']);
		});

		it('should detect nested conditional: TypeName<T>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'TypeName', workspaceRoot);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.conditional).toBeDefined();
			expect(result.structure.conditional!.checkType).toBe('T');
			expect(result.structure.conditional!.extendsType).toBe('string');
			expect(result.structure.conditional!.trueType).toBe("'string'");
			// The false branch is another conditional
			expect(result.structure.conditional!.falseType).toContain('T extends number');
		});

		it('should detect conditional with infer: UnpackPromise<T>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UnpackPromise', workspaceRoot);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.conditional).toBeDefined();
			expect(result.structure.conditional!.inferTypes).toContainEqual(expect.stringContaining('infer R'));
			expect(result.structure.conditional!.trueType).toBe('R');
			expect(result.structure.conditional!.falseType).toBe('T');
		});

		it('should detect conditional with infer: UnpackArray<T>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UnpackArray', workspaceRoot);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.conditional!.inferTypes).toContainEqual(expect.stringContaining('infer E'));
			expect(result.structure.conditional!.falseType).toBe('never');
		});

		it('should detect conditional with multiple infer: FunctionReturnType<T>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'FunctionReturnType', workspaceRoot);
			expect(result.structure.kind).toBe('conditional');
			const infers = result.structure.conditional!.inferTypes;
			expect(infers.length).toBeGreaterThanOrEqual(1);
			expect(infers).toContainEqual(expect.stringContaining('infer'));
		});

		it('should expand nested conditional when typeDepth > 1', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'TypeName', workspaceRoot, 2);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.children).toBeDefined();
			expect(result.structure.children!.length).toBeGreaterThan(0);
		});

		it('should NOT expand children at depth 1 (default)', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'TypeName', workspaceRoot, 1);
			expect(result.structure.children).toBeUndefined();
		});
	});

	// ===================================================================
	// Mapped types
	// ===================================================================

	describe('Mapped types', () => {
		it('should detect Nullable<T> mapped type', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'Nullable', workspaceRoot);
			expect(result.structure.kind).toBe('mapped');
			expect(result.structure.mapped).toBeDefined();
			expect(result.structure.mapped!.keyName).toBe('K');
			expect(result.structure.mapped!.constraint).toBe('keyof T');
			expect(result.structure.mapped!.valueType).toBe('T[K] | null');
		});

		it('should detect ReadonlyDeep<T> with readonly modifier', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'ReadonlyDeep', workspaceRoot);
			expect(result.structure.kind).toBe('mapped');
			expect(result.structure.mapped!.readonlyModifier).toBe('+readonly');
		});

		it('should detect Mutable<T> with -readonly modifier', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'Mutable', workspaceRoot);
			expect(result.structure.kind).toBe('mapped');
			expect(result.structure.mapped!.readonlyModifier).toBe('-readonly');
		});

		it('should detect RequiredFields<T> with -? modifier', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'RequiredFields', workspaceRoot);
			expect(result.structure.kind).toBe('mapped');
			expect(result.structure.mapped!.optionalModifier).toBe('-?');
		});

		it('should detect Getters<T> with key remapping (as clause)', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'Getters', workspaceRoot);
			expect(result.structure.kind).toBe('mapped');
			expect(result.structure.mapped!.nameType).toBeDefined();
			expect(result.structure.mapped!.nameType).toContain('Capitalize');
		});

		it('should include type parameters for mapped types', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'Nullable', workspaceRoot);
			expect(result.typeParameters).toEqual(['T']);
		});
	});

	// ===================================================================
	// Template literal types
	// ===================================================================

	describe('Template literal types', () => {
		it('should detect EventName template literal', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'EventName', workspaceRoot);
			expect(result.structure.kind).toBe('template-literal');
			expect(result.structure.templateLiteral).toBeDefined();
			expect(result.structure.templateLiteral!.templateText).toContain('on');
			expect(result.structure.templateLiteral!.spans.length).toBeGreaterThanOrEqual(1);
			expect(result.structure.templateLiteral!.spans[0].type).toBe('string');
		});

		it('should detect PropGetter<T> template literal with Capitalize', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'PropGetter', workspaceRoot);
			expect(result.structure.kind).toBe('template-literal');
			expect(result.structure.templateLiteral!.spans[0].type).toContain('Capitalize');
			expect(result.typeParameters).toEqual(['T extends string']);
		});

		it('should detect CssProperty template literal', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'CssProperty', workspaceRoot);
			expect(result.structure.kind).toBe('template-literal');
			expect(result.structure.templateLiteral!.spans.length).toBeGreaterThanOrEqual(1);
		});
	});

	// ===================================================================
	// Utility types
	// ===================================================================

	describe('Utility types', () => {
		it('should detect Partial<User> as utility type', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'PartialUser', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility).toBeDefined();
			expect(result.structure.utility!.name).toBe('Partial');
			expect(result.structure.utility!.typeArguments).toContain('User');
		});

		it('should detect Required<User>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'RequiredUser', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('Required');
		});

		it('should detect Readonly<User>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'ReadonlyUser', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('Readonly');
		});

		it('should detect Record<string, User>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserRecord', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('Record');
			expect(result.structure.utility!.typeArguments).toEqual(['string', 'User']);
		});

		it('should detect Pick<User, "name" | "email">', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserNameEmail', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('Pick');
			expect(result.structure.utility!.typeArguments.length).toBe(2);
		});

		it('should detect Omit<User, "email">', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserWithoutEmail', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('Omit');
		});

		it('should detect NonNullable<string | null | undefined>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'NonNullString', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('NonNullable');
		});

		it('should detect ReturnType<typeof parseInt>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'FnReturn', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('ReturnType');
		});

		it('should detect Parameters<typeof parseInt>', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'FnParams', workspaceRoot);
			expect(result.structure.kind).toBe('utility');
			expect(result.structure.utility!.name).toBe('Parameters');
		});

		it('should have no type parameters for concrete utility alias', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'PartialUser', workspaceRoot);
			expect(result.typeParameters).toEqual([]);
		});
	});

	// ===================================================================
	// Union and intersection types
	// ===================================================================

	describe('Union and intersection types', () => {
		it('should detect union type: StringOrNumber', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'StringOrNumber', workspaceRoot);
			expect(result.structure.kind).toBe('union');
			expect(result.structure.text).toContain('string');
			expect(result.structure.text).toContain('number');
		});

		it('should detect intersection type: WithTimestamp', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'WithTimestamp', workspaceRoot);
			expect(result.structure.kind).toBe('intersection');
			expect(result.structure.text).toContain('User');
			expect(result.structure.text).toContain('timestamp');
		});

		it('should expand union children at depth 2', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'StringOrNumber', workspaceRoot, 2);
			expect(result.structure.children).toBeDefined();
			expect(result.structure.children!.length).toBe(2);
		});

		it('should NOT expand union children at depth 1', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'StringOrNumber', workspaceRoot, 1);
			expect(result.structure.children).toBeUndefined();
		});
	});

	// ===================================================================
	// Indexed access types
	// ===================================================================

	describe('Indexed access types', () => {
		it('should detect indexed access: UserName = User["name"]', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserName', workspaceRoot);
			expect(result.structure.kind).toBe('indexed-access');
			expect(result.structure.text).toContain('User');
			expect(result.structure.text).toContain('name');
		});

		it('should detect indexed access with union key: UserIdOrName', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserIdOrName', workspaceRoot);
			expect(result.structure.kind).toBe('indexed-access');
			expect(result.structure.text).toContain('User');
		});
	});

	// ===================================================================
	// keyof types
	// ===================================================================

	describe('keyof types', () => {
		it('should detect keyof: UserKeys = keyof User', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserKeys', workspaceRoot);
			expect(result.structure.kind).toBe('keyof');
			expect(result.structure.text).toContain('keyof');
			expect(result.structure.text).toContain('User');
		});
	});

	// ===================================================================
	// Simple types (control group)
	// ===================================================================

	describe('Simple types', () => {
		it('should classify UserId as simple', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'UserId', workspaceRoot);
			expect(result.structure.kind).toBe('simple');
			expect(result.structure.text).toBe('number');
		});

		it('should classify Callback = () => void as simple', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'Callback', workspaceRoot);
			expect(result.structure.kind).toBe('simple');
		});
	});

	// ===================================================================
	// Nested / complex types with depth control
	// ===================================================================

	describe('Nested types with typeDepth control', () => {
		it('should detect DeepPartial as conditional at top level', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'DeepPartial', workspaceRoot, 1);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.children).toBeUndefined();
		});

		it('should expand DeepPartial children at depth 2', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'DeepPartial', workspaceRoot, 2);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.children).toBeDefined();
			expect(result.structure.children!.length).toBeGreaterThan(0);
		});

		it('should expand DeepPartial deeper at depth 3', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'DeepPartial', workspaceRoot, 3);
			const children = result.structure.children;
			expect(children).toBeDefined();
			// At depth 3, the true-branch child should be a mapped type (has its own structure)
			const mappedChild = children!.find(c => c.kind === 'mapped');
			expect(mappedChild).toBeDefined();
			expect(mappedChild!.mapped).toBeDefined();
		});

		it('should detect IsArray nested conditional at depth 2', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'IsArray', workspaceRoot, 2);
			expect(result.structure.kind).toBe('conditional');
			expect(result.structure.children).toBeDefined();
			// The false branch is another conditional (nested)
			const falseChild = result.structure.children!.find(c => c.kind === 'conditional');
			// The false branch (3rd child) should be 'not-array'
		});
	});

	// ===================================================================
	// Symbol metadata
	// ===================================================================

	describe('Symbol metadata', () => {
		it('should include correct symbol ref', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'IsString', workspaceRoot);
			expect(result.symbol.name).toBe('IsString');
			expect(result.symbol.filePath).toBe('types.ts');
			expect(result.symbol.line).toBeGreaterThan(0);
		});

		it('should include type text', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'IsString', workspaceRoot);
			expect(result.typeText).toContain('T extends string');
		});

		it('should throw for non-existent type alias', () => {
			expect(() => {
				resolveAdvancedTypes(project, abs('types.ts'), 'NonExistent', workspaceRoot);
			}).toThrow('Type alias "NonExistent" not found');
		});
	});

	// ===================================================================
	// HttpMethod union (not a union alias — it's a union of string literals)
	// ===================================================================

	describe('Union of string literals', () => {
		it('should detect HttpMethod as a union type', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'HttpMethod', workspaceRoot);
			expect(result.structure.kind).toBe('union');
			expect(result.structure.text).toContain('GET');
			expect(result.structure.text).toContain('POST');
		});
	});

	// ===================================================================
	// ApiEndpoint — template literal referencing other types
	// ===================================================================

	describe('Template literal referencing other types', () => {
		it('should detect ApiEndpoint as template literal', () => {
			const result = resolveAdvancedTypes(project, abs('types.ts'), 'ApiEndpoint', workspaceRoot);
			expect(result.structure.kind).toBe('template-literal');
			expect(result.structure.templateLiteral).toBeDefined();
			expect(result.structure.templateLiteral!.spans.length).toBeGreaterThanOrEqual(1);
		});
	});
});
