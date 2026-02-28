import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveCallHierarchy } from '../../src/ts-ls/call-hierarchy';
import { resolveTypeHierarchy } from '../../src/ts-ls/type-hierarchy';
import { resolveReferences } from '../../src/ts-ls/references';
import { resolveTypeFlows } from '../../src/ts-ls/type-flows';
import { resolveMembers } from '../../src/ts-ls/members';
import { resolveSignature } from '../../src/ts-ls/signature';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'cross-module');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Cross-Module Resolution', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// Call Hierarchy — through barrel re-exports
	// ===================================================================

	describe('Call Hierarchy through barrel', () => {
		it('should resolve outgoing calls from consumer.processUser through multi-level barrel', () => {
			const meta = resolveCallHierarchy(
				project, abs('consumer.ts'), 'processUser', workspaceRoot,
			);
			const outNames = meta.outgoingCalls.map(c => c.target.name);

			// processUser calls: configNs.Config.defaults(), new UserService(),
			// createDefaultUser(), svc.save(), createUser(), svc.activate(), svc.findById()
			expect(outNames).toContain('defaults');
			expect(outNames).toContain('save');
			expect(outNames).toContain('activate');
			expect(outNames).toContain('findById');
		});

		it('should resolve incoming callers for UserService.activate from consumer through barrel', () => {
			const meta = resolveCallHierarchy(
				project, abs('user.ts'), 'activate', workspaceRoot,
			);
			const callerNames = meta.incomingCallers.map(c => c.source.name);
			expect(callerNames).toContain('processUser');
		});

		it('should resolve outgoing calls from bulkCreate through barrel', () => {
			const meta = resolveCallHierarchy(
				project, abs('consumer.ts'), 'bulkCreate', workspaceRoot,
			);
			const outNames = meta.outgoingCalls.map(c => c.target.name);
			expect(outNames).toContain('save');
			expect(outNames).toContain('createDefaultUser');
		});

		it('should trace multi-hop calls: processUser → activate → findById', () => {
			const meta = resolveCallHierarchy(
				project, abs('consumer.ts'), 'processUser', workspaceRoot,
				{ callDepth: 2 },
			);

			const activateCall = meta.outgoingCalls.find(c => c.target.name === 'activate');
			if (activateCall) {
				const nestedNames = activateCall.outgoingCalls.map(c => c.target.name);
				expect(nestedNames).toContain('findById');
				expect(nestedNames).toContain('save');
			}
		});
	});

	// ===================================================================
	// Type Hierarchy — classes/interfaces imported through barrel
	// ===================================================================

	describe('Type Hierarchy through barrel', () => {
		it('should resolve UserService extends BaseService (defined in types.ts, consumed through barrel)', () => {
			const hierarchy = resolveTypeHierarchy(
				project, abs('user.ts'), 'UserService', workspaceRoot,
			);
			expect(hierarchy.extends).toBeDefined();
			expect(hierarchy.extends!.name).toBe('BaseService');
			expect(hierarchy.extends!.filePath).toContain('types.ts');
		});

		it('should resolve User extends Entity interface through import', () => {
			const hierarchy = resolveTypeHierarchy(
				project, abs('user.ts'), 'User', workspaceRoot,
			);
			expect(hierarchy.implements.length).toBeGreaterThanOrEqual(1);
			const entityRef = hierarchy.implements.find(i => i.name === 'Entity');
			expect(entityRef).toBeDefined();
			expect(entityRef!.filePath).toContain('types.ts');
		});

		it('should resolve BaseService subtypes include UserService', () => {
			const hierarchy = resolveTypeHierarchy(
				project, abs('types.ts'), 'BaseService', workspaceRoot,
			);
			const subtypeNames = hierarchy.subtypes.map(s => s.name);
			expect(subtypeNames).toContain('UserService');
		});

		it('should mark BaseService as abstract', () => {
			const hierarchy = resolveTypeHierarchy(
				project, abs('types.ts'), 'BaseService', workspaceRoot,
			);
			expect(hierarchy.isAbstract).toBe(true);
		});

		it('should resolve BaseService type parameters', () => {
			const hierarchy = resolveTypeHierarchy(
				project, abs('types.ts'), 'BaseService', workspaceRoot,
			);
			expect(hierarchy.typeParameters.length).toBe(1);
			expect(hierarchy.typeParameters[0].name).toBe('T');
			expect(hierarchy.typeParameters[0].constraint).toBe('Entity');
		});
	});

	// ===================================================================
	// References — through multi-level barrel indirection
	// ===================================================================

	describe('References through barrel', () => {
		it('should count Entity references across all files (direct + through barrel)', () => {
			const refs = resolveReferences(
				project, abs('types.ts'), 'Entity', workspaceRoot,
			);
			// Entity is used in: user.ts (extends Entity, return types), sub-barrel.ts (re-export),
			// index.ts (type re-export as IEntity), config-ext.ts may not reference Entity
			expect(refs.totalCount).toBeGreaterThanOrEqual(2);
			expect(refs.fileCount).toBeGreaterThanOrEqual(2);
		});

		it('should count Status references across files', () => {
			const refs = resolveReferences(
				project, abs('types.ts'), 'Status', workspaceRoot,
			);
			// Status used in: user.ts (property type, Status.Active, Status.Inactive),
			// consumer.ts (Status.Inactive through barrel), sub-barrel.ts (re-export)
			expect(refs.totalCount).toBeGreaterThanOrEqual(3);
			expect(refs.fileCount).toBeGreaterThanOrEqual(2);
		});

		it('should count UserService references including barrel re-exports', () => {
			const refs = resolveReferences(
				project, abs('user.ts'), 'UserService', workspaceRoot,
			);
			// UserService referenced in: sub-barrel.ts, consumer.ts (new UserService)
			expect(refs.totalCount).toBeGreaterThanOrEqual(2);
			expect(refs.fileCount).toBeGreaterThanOrEqual(2);
		});

		it('should count createDefaultUser references through barrel chain', () => {
			const refs = resolveReferences(
				project, abs('user.ts'), 'createDefaultUser', workspaceRoot,
			);
			// createDefaultUser exported from sub-barrel, re-exported through index,
			// used in consumer.ts
			expect(refs.totalCount).toBeGreaterThanOrEqual(2);
		});

		it('should count EntityId references through wildcard re-export', () => {
			const refs = resolveReferences(
				project, abs('types.ts'), 'EntityId', workspaceRoot,
			);
			// Used in: user.ts (param types), consumer.ts (import type)
			expect(refs.totalCount).toBeGreaterThanOrEqual(2);
		});

		it('should count Config references', () => {
			const refs = resolveReferences(
				project, abs('config.ts'), 'Config', workspaceRoot,
			);
			// Config is used in: config.ts (namespace + return types), config-ext.ts (import + augmentation),
			// index.ts (namespace re-export), consumer.ts (configNs.Config.defaults())
			expect(refs.totalCount).toBeGreaterThanOrEqual(2);
		});
	});

	// ===================================================================
	// Type Flows — type origins resolved through barrel indirection
	// ===================================================================

	describe('Type Flows through barrel', () => {
		it('should resolve EntityId type in processUser parameter through barrel', () => {
			const flow = resolveTypeFlows(
				project, abs('consumer.ts'), 'processUser', workspaceRoot,
			);
			const idParam = flow.parameters.find(p => p.name === 'id');
			expect(idParam).toBeDefined();
			expect(idParam!.type).toBe('EntityId');

			// EntityId should resolve back to types.ts
			const entityIdRef = idParam!.resolvedTypes.find(t => t.name === 'EntityId');
			expect(entityIdRef).toBeDefined();
			expect(entityIdRef!.filePath).toContain('types.ts');
		});

		it('should resolve return type IEntity through type-only re-export', () => {
			const flow = resolveTypeFlows(
				project, abs('consumer.ts'), 'processUser', workspaceRoot,
			);
			expect(flow.returnType).toBeDefined();
			// Return type is IEntity | undefined — IEntity resolves to Entity in types.ts
			const returnRefs = flow.returnType!.resolvedTypes;
			const entityRef = returnRefs.find(t => t.name === 'Entity');
			expect(entityRef).toBeDefined();
			expect(entityRef!.filePath).toContain('types.ts');
		});

		it('should resolve type flows for createDefaultUser in user.ts', () => {
			const flow = resolveTypeFlows(
				project, abs('user.ts'), 'createDefaultUser', workspaceRoot,
			);
			expect(flow.parameters.length).toBe(1);
			expect(flow.parameters[0].name).toBe('name');

			// Return type User should resolve locally
			expect(flow.returnType).toBeDefined();
			const userRef = flow.returnType!.resolvedTypes.find(t => t.name === 'User');
			expect(userRef).toBeDefined();
		});

		it('should resolve type flows for activate method', () => {
			const flow = resolveTypeFlows(
				project, abs('user.ts'), 'activate', workspaceRoot,
			);
			expect(flow.parameters.length).toBe(1);
			expect(flow.parameters[0].name).toBe('id');
			expect(flow.parameters[0].type).toBe('EntityId');
		});
	});

	// ===================================================================
	// Members — class/interface accessed through barrel
	// ===================================================================

	describe('Members resolution', () => {
		it('should resolve UserService members (defined in user.ts)', () => {
			const members = resolveMembers(project, abs('user.ts'), 'UserService');
			const memberNames = members.map(m => m.name);

			expect(memberNames).toContain('findById');
			expect(memberNames).toContain('save');
			expect(memberNames).toContain('activate');

			// Should include the private users property
			const usersField = members.find(m => m.name === 'users');
			expect(usersField).toBeDefined();
			expect(usersField!.kind).toBe('property');
			expect(usersField!.modifiers).toContain('private');
		});

		it('should resolve BaseService members including abstract methods', () => {
			const members = resolveMembers(project, abs('types.ts'), 'BaseService');
			const memberNames = members.map(m => m.name);

			expect(memberNames).toContain('findById');
			expect(memberNames).toContain('save');
			expect(memberNames).toContain('log');

			const findById = members.find(m => m.name === 'findById');
			expect(findById).toBeDefined();
			expect(findById!.modifiers).toContain('abstract');
		});

		it('should resolve Entity interface members', () => {
			const members = resolveMembers(project, abs('types.ts'), 'Entity');
			const memberNames = members.map(m => m.name);

			expect(memberNames).toContain('id');
			expect(memberNames).toContain('createdAt');
			expect(members.length).toBe(2);
		});

		it('should resolve User interface members including inherited shape', () => {
			const members = resolveMembers(project, abs('user.ts'), 'User');
			const memberNames = members.map(m => m.name);

			// User has: name, email, status (own properties) + id, createdAt from Entity
			// resolveMembers only returns declared members, not inherited
			expect(memberNames).toContain('name');
			expect(memberNames).toContain('email');
			expect(memberNames).toContain('status');
		});
	});

	// ===================================================================
	// Signature — symbols accessed through barrel
	// ===================================================================

	describe('Signature through barrel', () => {
		it('should resolve processUser signature in consumer.ts', () => {
			const sig = resolveSignature(project, abs('consumer.ts'), 'processUser');
			expect(sig.signature).toContain('processUser');
			expect(sig.signature).toContain('EntityId');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve bulkCreate signature in consumer.ts', () => {
			const sig = resolveSignature(project, abs('consumer.ts'), 'bulkCreate');
			expect(sig.signature).toContain('bulkCreate');
			expect(sig.signature).toContain('string[]');
			expect(sig.signature).toContain('void');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve UserService class signature with heritage', () => {
			const sig = resolveSignature(project, abs('user.ts'), 'UserService');
			expect(sig.signature).toContain('class UserService');
			expect(sig.signature).toContain('extends BaseService');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve BaseService abstract class signature', () => {
			const sig = resolveSignature(project, abs('types.ts'), 'BaseService');
			expect(sig.signature).toContain('class BaseService');
			expect(sig.modifiers).toContain('abstract');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve Status enum signature', () => {
			const sig = resolveSignature(project, abs('types.ts'), 'Status');
			expect(sig.signature).toBe('enum Status');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve EntityId type alias signature', () => {
			const sig = resolveSignature(project, abs('types.ts'), 'EntityId');
			expect(sig.signature).toBe('type EntityId = string');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve createDefaultUser function signature', () => {
			const sig = resolveSignature(project, abs('user.ts'), 'createDefaultUser');
			expect(sig.signature).toContain('createDefaultUser');
			expect(sig.signature).toContain('name: string');
			expect(sig.signature).toContain('User');
			expect(sig.modifiers).toContain('exported');
		});
	});

	// ===================================================================
	// Declaration Merging — interface + namespace
	// ===================================================================

	describe('Declaration merging', () => {
		it('should resolve Config interface members from config.ts', () => {
			const members = resolveMembers(project, abs('config.ts'), 'Config');
			const memberNames = members.map(m => m.name);

			expect(memberNames).toContain('host');
			expect(memberNames).toContain('port');
			expect(memberNames).toContain('debug');
		});

		it('should resolve Config interface signature', () => {
			const sig = resolveSignature(project, abs('config.ts'), 'Config');
			// Config is an interface
			expect(sig.signature).toContain('interface Config');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve applyDefaults from config-ext.ts', () => {
			const sig = resolveSignature(project, abs('config-ext.ts'), 'applyDefaults');
			expect(sig.signature).toContain('applyDefaults');
			expect(sig.signature).toContain('Config');
			expect(sig.modifiers).toContain('exported');
		});

		it('should count Config references including cross-file augmentation', () => {
			const refs = resolveReferences(
				project, abs('config.ts'), 'Config', workspaceRoot,
			);
			// Config used in config.ts (namespace return types), config-ext.ts (import + augment),
			// index.ts (re-export as namespace)
			expect(refs.totalCount).toBeGreaterThanOrEqual(3);
			expect(refs.fileCount).toBeGreaterThanOrEqual(2);
		});
	});

	// ===================================================================
	// Namespace re-export — configNs.Config.defaults()
	// ===================================================================

	describe('Namespace re-export', () => {
		it('should resolve defaults function signature from Config namespace', () => {
			const sig = resolveSignature(project, abs('config.ts'), 'defaults');
			expect(sig.signature).toContain('defaults');
			expect(sig.signature).toContain('Config');
			expect(sig.modifiers).toContain('exported');
		});

		it('should resolve fromEnv function signature from Config namespace', () => {
			const sig = resolveSignature(project, abs('config.ts'), 'fromEnv');
			expect(sig.signature).toContain('fromEnv');
			expect(sig.signature).toContain('Config');
		});

		it('should count defaults references through namespace re-export', () => {
			const refs = resolveReferences(
				project, abs('config.ts'), 'defaults', workspaceRoot,
			);
			// defaults() called in consumer.ts through configNs.Config.defaults()
			expect(refs.totalCount).toBeGreaterThanOrEqual(1);
		});
	});

	// ===================================================================
	// Default export re-exported as named — createUser
	// ===================================================================

	describe('Default export re-exported as named', () => {
		it('should resolve incoming callers for the default export createUser function', () => {
			// The default export in user.ts is consumed through barrel as "createUser"
			// We need to check if call hierarchy can find usage from consumer.ts
			const meta = resolveCallHierarchy(
				project, abs('consumer.ts'), 'processUser', workspaceRoot,
			);
			// processUser calls createUser (default-as-named through barrel)
			const outNames = meta.outgoingCalls.map(c => c.target.name);
			expect(outNames).toContain('createUser');
		});
	});
});
