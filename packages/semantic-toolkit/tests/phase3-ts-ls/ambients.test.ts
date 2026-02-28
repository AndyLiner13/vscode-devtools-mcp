import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveAmbients } from '../../src/ts-ls/ambients';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'ambients');

describe('Phase 3, Item 12 — Ambient / Global Augmentations', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// declare global { ... }
	// ===================================================================

	describe('Global augmentations (declare global)', () => {
		it('should find all declare global blocks across the project', () => {
			const info = resolveAmbients(project, workspaceRoot);

			// global-augment.ts and global-augment-2.ts each have one block
			expect(info.globalAugmentations.length).toBe(2);
		});

		it('should extract members from first declare global block', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const aug1 = info.globalAugmentations.find(g => g.filePath === 'global-augment.ts');
			expect(aug1).toBeDefined();

			const memberNames = aug1!.members.map(m => m.name);
			expect(memberNames).toContain('globalHelper');
			expect(memberNames).toContain('APP_VERSION');
			expect(memberNames).toContain('GlobalConfig');
			expect(memberNames).toContain('NodeJS');
		});

		it('should extract members from second declare global block', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const aug2 = info.globalAugmentations.find(g => g.filePath === 'global-augment-2.ts');
			expect(aug2).toBeDefined();

			const memberNames = aug2!.members.map(m => m.name);
			expect(memberNames).toContain('globalLogger');
			expect(memberNames).toContain('Window');
		});

		it('should classify member kinds correctly in global block', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const aug1 = info.globalAugmentations.find(g => g.filePath === 'global-augment.ts');
			expect(aug1).toBeDefined();

			const helper = aug1!.members.find(m => m.name === 'globalHelper');
			expect(helper?.kind).toBe('function');

			const appVersion = aug1!.members.find(m => m.name === 'APP_VERSION');
			expect(appVersion?.kind).toBe('variable');

			const config = aug1!.members.find(m => m.name === 'GlobalConfig');
			expect(config?.kind).toBe('interface');

			const nodeJs = aug1!.members.find(m => m.name === 'NodeJS');
			expect(nodeJs?.kind).toBe('namespace');
		});

		it('should provide line numbers for global augmentation blocks', () => {
			const info = resolveAmbients(project, workspaceRoot);

			for (const aug of info.globalAugmentations) {
				expect(aug.line).toBeGreaterThan(0);
			}
		});

		it('should provide signatures for function members in global blocks', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const aug1 = info.globalAugmentations.find(g => g.filePath === 'global-augment.ts');
			const helper = aug1!.members.find(m => m.name === 'globalHelper');
			expect(helper?.signature).toBeDefined();
			expect(helper!.signature).toContain('globalHelper');
			expect(helper!.signature).toContain('msg');
		});
	});

	// ===================================================================
	// declare module 'xxx' { ... }
	// ===================================================================

	describe('Module augmentations (declare module)', () => {
		it('should find all declare module blocks', () => {
			const info = resolveAmbients(project, workspaceRoot);

			// module-augment.ts has two: 'my-external-lib' and 'my-config-lib'
			expect(info.moduleAugmentations.length).toBe(2);
		});

		it('should extract module name for external lib augmentation', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const extLib = info.moduleAugmentations.find(m => m.moduleName === 'my-external-lib');
			expect(extLib).toBeDefined();
			expect(extLib!.filePath).toBe('module-augment.ts');
		});

		it('should extract members from external lib augmentation', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const extLib = info.moduleAugmentations.find(m => m.moduleName === 'my-external-lib');
			expect(extLib).toBeDefined();

			const memberNames = extLib!.members.map(m => m.name);
			expect(memberNames).toContain('Request');
			expect(memberNames).toContain('Response');
			expect(memberNames).toContain('createServer');
		});

		it('should extract members from config lib augmentation', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const configLib = info.moduleAugmentations.find(m => m.moduleName === 'my-config-lib');
			expect(configLib).toBeDefined();

			const memberNames = configLib!.members.map(m => m.name);
			expect(memberNames).toContain('Settings');
			expect(memberNames).toContain('VERSION');
		});

		it('should classify member kinds in module augmentation', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const extLib = info.moduleAugmentations.find(m => m.moduleName === 'my-external-lib');

			const request = extLib!.members.find(m => m.name === 'Request');
			expect(request?.kind).toBe('interface');

			const createServer = extLib!.members.find(m => m.name === 'createServer');
			expect(createServer?.kind).toBe('function');
		});

		it('should sort module augmentations by moduleName', () => {
			const info = resolveAmbients(project, workspaceRoot);

			for (let i = 1; i < info.moduleAugmentations.length; i++) {
				const prev = info.moduleAugmentations[i - 1];
				const curr = info.moduleAugmentations[i];
				expect(prev.moduleName.localeCompare(curr.moduleName)).toBeLessThanOrEqual(0);
			}
		});
	});

	// ===================================================================
	// .d.ts ambient declarations
	// ===================================================================

	describe('Ambient declarations (.d.ts)', () => {
		it('should find ambient declarations from .d.ts files', () => {
			const info = resolveAmbients(project, workspaceRoot);

			// ambient-types.d.ts has: formatCurrency, MAX_CONNECTIONS, DatabaseConfig,
			// ConnectionString, DatabaseDriver, LogLevel, DBUtils
			expect(info.ambientDeclarations.length).toBeGreaterThanOrEqual(7);
		});

		it('should detect ambient function declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const formatCurrency = info.ambientDeclarations.find(d => d.name === 'formatCurrency');
			expect(formatCurrency).toBeDefined();
			expect(formatCurrency!.kind).toBe('function');
			expect(formatCurrency!.filePath).toBe('ambient-types.d.ts');
			expect(formatCurrency!.signature).toContain('formatCurrency');
		});

		it('should detect ambient variable declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const maxConn = info.ambientDeclarations.find(d => d.name === 'MAX_CONNECTIONS');
			expect(maxConn).toBeDefined();
			expect(maxConn!.kind).toBe('variable');
		});

		it('should detect ambient interface declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const dbConfig = info.ambientDeclarations.find(d => d.name === 'DatabaseConfig');
			expect(dbConfig).toBeDefined();
			expect(dbConfig!.kind).toBe('interface');
		});

		it('should detect ambient type alias declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const connStr = info.ambientDeclarations.find(d => d.name === 'ConnectionString');
			expect(connStr).toBeDefined();
			expect(connStr!.kind).toBe('type');
			expect(connStr!.signature).toContain('type ConnectionString');
		});

		it('should detect ambient class declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const driver = info.ambientDeclarations.find(d => d.name === 'DatabaseDriver');
			expect(driver).toBeDefined();
			expect(driver!.kind).toBe('class');
		});

		it('should detect ambient enum declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const logLevel = info.ambientDeclarations.find(d => d.name === 'LogLevel');
			expect(logLevel).toBeDefined();
			expect(logLevel!.kind).toBe('enum');
		});

		it('should detect ambient namespace declaration', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const dbUtils = info.ambientDeclarations.find(d => d.name === 'DBUtils');
			expect(dbUtils).toBeDefined();
			expect(dbUtils!.kind).toBe('namespace');
		});

		it('should sort ambient declarations by filePath, then line', () => {
			const info = resolveAmbients(project, workspaceRoot);

			for (let i = 1; i < info.ambientDeclarations.length; i++) {
				const prev = info.ambientDeclarations[i - 1];
				const curr = info.ambientDeclarations[i];
				const cmp = prev.filePath.localeCompare(curr.filePath) || prev.line - curr.line;
				expect(cmp).toBeLessThanOrEqual(0);
			}
		});
	});

	// ===================================================================
	// Edge cases
	// ===================================================================

	describe('Edge cases', () => {
		it('should not include node_modules files', () => {
			const info = resolveAmbients(project, workspaceRoot);

			const allFiles = [
				...info.globalAugmentations.map(g => g.filePath),
				...info.moduleAugmentations.map(m => m.filePath),
				...info.ambientDeclarations.map(d => d.filePath),
			];

			for (const file of allFiles) {
				expect(file).not.toContain('node_modules');
			}
		});

		it('should not count regular namespaces as module augmentations', () => {
			const info = resolveAmbients(project, workspaceRoot);

			// The NodeJS namespace inside declare global should not appear as a module augmentation
			const nodeJsAug = info.moduleAugmentations.find(m => m.moduleName === 'NodeJS');
			expect(nodeJsAug).toBeUndefined();
		});

		it('should provide line numbers for all entries', () => {
			const info = resolveAmbients(project, workspaceRoot);

			for (const aug of info.globalAugmentations) {
				expect(aug.line).toBeGreaterThan(0);
				for (const m of aug.members) {
					expect(m.line).toBeGreaterThan(0);
				}
			}

			for (const aug of info.moduleAugmentations) {
				expect(aug.line).toBeGreaterThan(0);
				for (const m of aug.members) {
					expect(m.line).toBeGreaterThan(0);
				}
			}

			for (const decl of info.ambientDeclarations) {
				expect(decl.line).toBeGreaterThan(0);
			}
		});

		it('should have members sorted by line within each block', () => {
			const info = resolveAmbients(project, workspaceRoot);

			for (const aug of info.globalAugmentations) {
				for (let i = 1; i < aug.members.length; i++) {
					expect(aug.members[i].line).toBeGreaterThanOrEqual(aug.members[i - 1].line);
				}
			}

			for (const aug of info.moduleAugmentations) {
				for (let i = 1; i < aug.members.length; i++) {
					expect(aug.members[i].line).toBeGreaterThanOrEqual(aug.members[i - 1].line);
				}
			}
		});
	});
});
