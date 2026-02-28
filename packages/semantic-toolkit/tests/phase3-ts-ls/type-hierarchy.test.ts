import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveTypeHierarchy } from '../../src/ts-ls/type-hierarchy';
import type { TypeHierarchy } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'type-hierarchy');
const WORKSPACE_ROOT = FIXTURES_DIR;

function rel(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

function names(refs: { name: string }[]): string[] {
	return refs.map(r => r.name).sort();
}

describe('Phase 3 — Type Hierarchy (Item 4)', () => {
	let project: Project;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// -------------------------------------------------------------------
	// Interface hierarchy
	// -------------------------------------------------------------------

	describe('Entity interface', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('interfaces.ts'), 'Entity', WORKSPACE_ROOT);
		});

		it('should have no extends (root interface)', () => {
			expect(th.extends).toBeUndefined();
		});

		it('should have no implements (root interface)', () => {
			expect(th.implements).toHaveLength(0);
		});

		it('should have subtypes: Auditable interface and BaseModel class', () => {
			expect(names(th.subtypes)).toEqual(['Auditable', 'BaseModel']);
		});
	});

	describe('Serializable interface', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('interfaces.ts'), 'Serializable', WORKSPACE_ROOT);
		});

		it('should have no parents', () => {
			expect(th.extends).toBeUndefined();
			expect(th.implements).toHaveLength(0);
		});

		it('should have BaseModel as a subtype', () => {
			expect(names(th.subtypes)).toEqual(['BaseModel']);
		});
	});

	describe('Auditable interface (extends Entity)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('interfaces.ts'), 'Auditable', WORKSPACE_ROOT);
		});

		it('should extend Entity (via implements list for interfaces)', () => {
			expect(th.implements).toHaveLength(1);
			expect(th.implements[0].name).toBe('Entity');
		});

		it('should have AuditedModel as subtype', () => {
			expect(names(th.subtypes)).toEqual(['AuditedModel']);
		});
	});

	// -------------------------------------------------------------------
	// Class hierarchy
	// -------------------------------------------------------------------

	describe('BaseModel class (implements Entity, Serializable)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('models.ts'), 'BaseModel', WORKSPACE_ROOT);
		});

		it('should have no extends (no parent class)', () => {
			expect(th.extends).toBeUndefined();
		});

		it('should implement Entity and Serializable', () => {
			expect(names(th.implements)).toEqual(['Entity', 'Serializable']);
		});

		it('should have User and AuditedModel as subtypes', () => {
			expect(names(th.subtypes)).toEqual(['AuditedModel', 'User']);
		});
	});

	describe('User class (extends BaseModel)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('models.ts'), 'User', WORKSPACE_ROOT);
		});

		it('should extend BaseModel', () => {
			expect(th.extends).toBeDefined();
			expect(th.extends!.name).toBe('BaseModel');
			expect(th.extends!.filePath).toBe('models.ts');
		});

		it('should have no implements', () => {
			expect(th.implements).toHaveLength(0);
		});

		it('should have AdminUser as subtype', () => {
			expect(names(th.subtypes)).toEqual(['AdminUser']);
		});
	});

	describe('AdminUser class (extends User — multi-level)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('models.ts'), 'AdminUser', WORKSPACE_ROOT);
		});

		it('should extend User', () => {
			expect(th.extends).toBeDefined();
			expect(th.extends!.name).toBe('User');
		});

		it('should have no subtypes (leaf class)', () => {
			expect(th.subtypes).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------
	// Diamond pattern
	// -------------------------------------------------------------------

	describe('AuditedModel (extends BaseModel, implements Auditable — diamond)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('diamond.ts'), 'AuditedModel', WORKSPACE_ROOT);
		});

		it('should extend BaseModel', () => {
			expect(th.extends).toBeDefined();
			expect(th.extends!.name).toBe('BaseModel');
		});

		it('should implement Auditable', () => {
			expect(th.implements).toHaveLength(1);
			expect(th.implements[0].name).toBe('Auditable');
		});

		it('should have no subtypes', () => {
			expect(th.subtypes).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------
	// Standalone (no hierarchy)
	// -------------------------------------------------------------------

	describe('Standalone class (no extends, no implements)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('standalone.ts'), 'Standalone', WORKSPACE_ROOT);
		});

		it('should have no parents', () => {
			expect(th.extends).toBeUndefined();
			expect(th.implements).toHaveLength(0);
		});

		it('should have no subtypes', () => {
			expect(th.subtypes).toHaveLength(0);
		});
	});

	describe('Isolated interface (no parents, no subtypes)', () => {
		let th: TypeHierarchy;

		beforeAll(() => {
			th = resolveTypeHierarchy(project, rel('standalone.ts'), 'Isolated', WORKSPACE_ROOT);
		});

		it('should have no parents', () => {
			expect(th.extends).toBeUndefined();
			expect(th.implements).toHaveLength(0);
		});

		it('should have no subtypes', () => {
			expect(th.subtypes).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------
	// Item 5: isAbstract detection
	// -------------------------------------------------------------------

	describe('isAbstract on TypeHierarchy', () => {
		it('should mark abstract class BaseModel as isAbstract', () => {
			const th = resolveTypeHierarchy(project, rel('models.ts'), 'BaseModel', WORKSPACE_ROOT);
			expect(th.isAbstract).toBe(true);
		});

		it('should not set isAbstract for concrete class User', () => {
			const th = resolveTypeHierarchy(project, rel('models.ts'), 'User', WORKSPACE_ROOT);
			expect(th.isAbstract).toBeUndefined();
		});

		it('should not set isAbstract for interfaces', () => {
			const th = resolveTypeHierarchy(project, rel('interfaces.ts'), 'Entity', WORKSPACE_ROOT);
			expect(th.isAbstract).toBeUndefined();
		});
	});

	describe('isAbstract on SymbolRef (heritage refs)', () => {
		it('should set isAbstract on extends ref when parent is abstract', () => {
			const th = resolveTypeHierarchy(project, rel('models.ts'), 'User', WORKSPACE_ROOT);
			expect(th.extends).toBeDefined();
			expect(th.extends!.isAbstract).toBe(true);
		});

		it('should not set isAbstract on extends ref when parent is concrete', () => {
			const th = resolveTypeHierarchy(project, rel('models.ts'), 'AdminUser', WORKSPACE_ROOT);
			expect(th.extends).toBeDefined();
			expect(th.extends!.isAbstract).toBeUndefined();
		});

		it('should set isAbstract on abstract subtype refs', () => {
			const th = resolveTypeHierarchy(project, rel('interfaces.ts'), 'Entity', WORKSPACE_ROOT);
			const baseModelRef = th.subtypes.find(s => s.name === 'BaseModel');
			expect(baseModelRef).toBeDefined();
			expect(baseModelRef!.isAbstract).toBe(true);
		});

		it('should not set isAbstract on interface SymbolRefs', () => {
			const th = resolveTypeHierarchy(project, rel('interfaces.ts'), 'Entity', WORKSPACE_ROOT);
			const auditableRef = th.subtypes.find(s => s.name === 'Auditable');
			expect(auditableRef).toBeDefined();
			expect(auditableRef!.isAbstract).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------
	// Item 5: Generic type parameters
	// -------------------------------------------------------------------

	describe('generic type parameters', () => {
		it('should extract constrained + defaulted params from Repository<T extends Entity, ID = string>', () => {
			const th = resolveTypeHierarchy(project, rel('generics.ts'), 'Repository', WORKSPACE_ROOT);
			expect(th.typeParameters).toHaveLength(2);

			expect(th.typeParameters[0].name).toBe('T');
			expect(th.typeParameters[0].constraint).toBe('Entity');
			expect(th.typeParameters[0].default).toBeUndefined();

			expect(th.typeParameters[1].name).toBe('ID');
			expect(th.typeParameters[1].constraint).toBeUndefined();
			expect(th.typeParameters[1].default).toBe('string');
		});

		it('should extract unconstrained param from Container<T>', () => {
			const th = resolveTypeHierarchy(project, rel('generics.ts'), 'Container', WORKSPACE_ROOT);
			expect(th.typeParameters).toHaveLength(1);
			expect(th.typeParameters[0].name).toBe('T');
			expect(th.typeParameters[0].constraint).toBeUndefined();
			expect(th.typeParameters[0].default).toBeUndefined();
		});

		it('should extract constrained param from generic interface Queryable<T extends Entity>', () => {
			const th = resolveTypeHierarchy(project, rel('generics.ts'), 'Queryable', WORKSPACE_ROOT);
			expect(th.typeParameters).toHaveLength(1);
			expect(th.typeParameters[0].name).toBe('T');
			expect(th.typeParameters[0].constraint).toBe('Entity');
		});

		it('should return empty typeParameters for non-generic class', () => {
			const th = resolveTypeHierarchy(project, rel('generics.ts'), 'SimpleService', WORKSPACE_ROOT);
			expect(th.typeParameters).toHaveLength(0);
		});

		it('should return empty typeParameters for non-generic interface', () => {
			const th = resolveTypeHierarchy(project, rel('standalone.ts'), 'Isolated', WORKSPACE_ROOT);
			expect(th.typeParameters).toHaveLength(0);
		});

		it('should return empty typeParameters for existing non-generic classes', () => {
			const th = resolveTypeHierarchy(project, rel('models.ts'), 'User', WORKSPACE_ROOT);
			expect(th.typeParameters).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------

	describe('error cases', () => {
		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveTypeHierarchy(project, rel('models.ts'), 'Nonexistent', WORKSPACE_ROOT),
			).toThrow('Symbol "Nonexistent" not found');
		});

		it('should throw for function name (not a class/interface)', () => {
			// functions aren't valid targets for type hierarchy
			expect(() =>
				resolveTypeHierarchy(project, rel('standalone.ts'), 'value', WORKSPACE_ROOT),
			).toThrow('not found as a class or interface');
		});
	});
});
