import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveAliases } from '../../src/ts-ls/aliases';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'aliases');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3, Item 11 — Alias Tracking', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// Import renames: import { Foo as Bar }
	// ===================================================================

	describe('Import renames', () => {
		it('should detect import rename for Widget → UIWidget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			expect(graph.canonical.name).toBe('Widget');
			expect(graph.canonical.filePath).toBe('core.ts');

			const importRenames = graph.aliases.filter(a => a.kind === 'import-rename');
			const uiWidget = importRenames.find(a => a.name === 'UIWidget');
			expect(uiWidget).toBeDefined();
			expect(uiWidget!.filePath).toBe('import-rename.ts');
			expect(uiWidget!.originalName).toBe('Widget');
		});

		it('should detect import rename for createWidget → makeWidget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'createWidget', workspaceRoot);

			const importRenames = graph.aliases.filter(a => a.kind === 'import-rename');
			const makeWidget = importRenames.find(a => a.name === 'makeWidget');
			expect(makeWidget).toBeDefined();
			expect(makeWidget!.filePath).toBe('import-rename.ts');
			expect(makeWidget!.originalName).toBe('createWidget');
		});

		it('should detect import rename for WidgetService → Svc', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'WidgetService', workspaceRoot);

			const importRenames = graph.aliases.filter(a => a.kind === 'import-rename');
			const svc = importRenames.find(a => a.name === 'Svc');
			expect(svc).toBeDefined();
			expect(svc!.originalName).toBe('WidgetService');
		});
	});

	// ===================================================================
	// Export renames: export { Foo as Bar } from './module'
	// ===================================================================

	describe('Export renames', () => {
		it('should detect export rename Widget → Component', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			const exportRenames = graph.aliases.filter(a => a.kind === 'export-rename');
			const component = exportRenames.find(a => a.name === 'Component');
			expect(component).toBeDefined();
			expect(component!.filePath).toBe('export-rename.ts');
			expect(component!.originalName).toBe('Widget');
		});

		it('should detect export rename createWidget → buildComponent', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'createWidget', workspaceRoot);

			const exportRenames = graph.aliases.filter(a => a.kind === 'export-rename');
			const build = exportRenames.find(a => a.name === 'buildComponent');
			expect(build).toBeDefined();
			expect(build!.originalName).toBe('createWidget');
		});

		it('should detect multi-hop export rename Component → Element in barrel', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			const exportRenames = graph.aliases.filter(a => a.kind === 'export-rename');
			const element = exportRenames.find(a => a.name === 'Element');
			expect(element).toBeDefined();
			expect(element!.filePath).toBe('barrel.ts');
			expect(element!.originalName).toBe('Component');
		});
	});

	// ===================================================================
	// Type-only aliases
	// ===================================================================

	describe('Type-only aliases', () => {
		it('should detect type-only export rename WidgetId → ComponentId', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'WidgetId', workspaceRoot);

			const typeOnly = graph.aliases.filter(a => a.kind === 'type-only');
			const componentId = typeOnly.find(a => a.name === 'ComponentId');
			expect(componentId).toBeDefined();
			expect(componentId!.filePath).toBe('export-rename.ts');
			expect(componentId!.originalName).toBe('WidgetId');
		});

		it('should detect type-only import rename Widget → ReadonlyWidget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			const typeOnly = graph.aliases.filter(a => a.kind === 'type-only');
			const readonlyWidget = typeOnly.find(a => a.name === 'ReadonlyWidget');
			expect(readonlyWidget).toBeDefined();
			expect(readonlyWidget!.filePath).toBe('type-only.ts');
		});

		it('should detect type-only import rename WidgetId → ReadonlyId', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'WidgetId', workspaceRoot);

			const typeOnly = graph.aliases.filter(a => a.kind === 'type-only');
			const readonlyId = typeOnly.find(a => a.name === 'ReadonlyId');
			expect(readonlyId).toBeDefined();
			expect(readonlyId!.filePath).toBe('type-only.ts');
		});
	});

	// ===================================================================
	// Default export aliases
	// ===================================================================

	describe('Default export aliases', () => {
		it('should detect default-as-named re-export: default → createDefaultWidget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'defaultFactory', workspaceRoot);

			const defaultAliases = graph.aliases.filter(a => a.kind === 'default-as-named');
			const createDefault = defaultAliases.find(a => a.name === 'createDefaultWidget');
			expect(createDefault).toBeDefined();
			expect(createDefault!.filePath).toBe('export-rename.ts');
		});
	});

	// ===================================================================
	// Namespace imports: import * as ns from './module'
	// ===================================================================

	describe('Namespace imports', () => {
		it('should detect namespace import: import * as CoreWidgets from core', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			const nsAliases = graph.aliases.filter(a => a.kind === 'namespace');
			const coreWidgets = nsAliases.find(a => a.name === 'CoreWidgets');
			expect(coreWidgets).toBeDefined();
			expect(coreWidgets!.filePath).toBe('namespace-import.ts');
			expect(coreWidgets!.originalName).toBe('Widget');
		});

		it('should also detect namespace import for createWidget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'createWidget', workspaceRoot);

			const nsAliases = graph.aliases.filter(a => a.kind === 'namespace');
			const coreWidgets = nsAliases.find(a => a.name === 'CoreWidgets');
			expect(coreWidgets).toBeDefined();
		});
	});

	// ===================================================================
	// Namespace alias: import Foo = Namespace.Bar
	// ===================================================================

	describe('Namespace alias (import = syntax)', () => {
		it('should detect namespace alias: import SW = WidgetNS.SpecialWidget', () => {
			const graph = resolveAliases(project, abs('namespace-alias.ts'), 'SpecialWidget', workspaceRoot);

			const nsAliases = graph.aliases.filter(a => a.kind === 'namespace-alias');
			const sw = nsAliases.find(a => a.name === 'SW');
			expect(sw).toBeDefined();
			expect(sw!.filePath).toBe('namespace-alias.ts');
			expect(sw!.originalName).toBe('SpecialWidget');
		});
	});

	// ===================================================================
	// Multi-hop chains
	// ===================================================================

	describe('Multi-hop alias chains', () => {
		it('should build a chain for Widget → Component → Element', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			expect(graph.chains.length).toBeGreaterThanOrEqual(1);

			const widgetChain = graph.chains.find(c =>
				c.hops.some(h => h.name === 'Element'),
			);
			expect(widgetChain).toBeDefined();

			const names = widgetChain!.hops.map(h => h.name);
			expect(names[0]).toBe('Widget');
			expect(names).toContain('Component');
			expect(names).toContain('Element');
		});

		it('should build a chain for createWidget → buildComponent → createElement', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'createWidget', workspaceRoot);

			const chain = graph.chains.find(c =>
				c.hops.some(h => h.name === 'createElement'),
			);
			expect(chain).toBeDefined();

			const names = chain!.hops.map(h => h.name);
			expect(names[0]).toBe('createWidget');
			expect(names).toContain('buildComponent');
			expect(names).toContain('createElement');
		});
	});

	// ===================================================================
	// Bidirectional lookup
	// ===================================================================

	describe('Bidirectional alias lookup', () => {
		it('should include both import and export aliases for Widget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			const allAliasNames = graph.aliases.map(a => a.name);
			// Import renames
			expect(allAliasNames).toContain('UIWidget');
			// Export renames
			expect(allAliasNames).toContain('Component');
			// Type-only
			expect(allAliasNames).toContain('ReadonlyWidget');
		});

		it('should track aliases across multiple files for WidgetId', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'WidgetId', workspaceRoot);

			const files = new Set(graph.aliases.map(a => a.filePath));
			// WidgetId is aliased in export-rename.ts (ComponentId) and type-only.ts (ReadonlyId)
			expect(files.has('export-rename.ts')).toBe(true);
			expect(files.has('type-only.ts')).toBe(true);
		});
	});

	// ===================================================================
	// Edge cases
	// ===================================================================

	describe('Edge cases', () => {
		it('should return empty aliases for a symbol that is never aliased', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'WidgetService', workspaceRoot);

			// WidgetService has import rename (Svc) but no export renames
			const exportRenames = graph.aliases.filter(a => a.kind === 'export-rename');
			// No export renames for WidgetService
			expect(exportRenames.length).toBe(0);
		});

		it('should throw for non-existent symbol', () => {
			expect(() =>
				resolveAliases(project, abs('core.ts'), 'NonExistentSymbol', workspaceRoot),
			).toThrow('Symbol "NonExistentSymbol" not found');
		});

		it('should deduplicate aliases that would otherwise appear multiple times', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			// Same (name, filePath, line, kind) should not appear twice
			const keys = graph.aliases.map(a => `${a.name}:${a.filePath}:${a.line}:${a.kind}`);
			const unique = new Set(keys);
			expect(unique.size).toBe(keys.length);
		});

		it('should sort aliases by filePath, then line, then name', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			for (let i = 1; i < graph.aliases.length; i++) {
				const prev = graph.aliases[i - 1];
				const curr = graph.aliases[i];
				const cmp = prev.filePath.localeCompare(curr.filePath)
					|| prev.line - curr.line
					|| prev.name.localeCompare(curr.name);
				expect(cmp).toBeLessThanOrEqual(0);
			}
		});
	});

	// ===================================================================
	// Canonical reference
	// ===================================================================

	describe('Canonical reference', () => {
		it('should return correct canonical ref for Widget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'Widget', workspaceRoot);

			expect(graph.canonical.name).toBe('Widget');
			expect(graph.canonical.filePath).toBe('core.ts');
			expect(graph.canonical.line).toBeGreaterThan(0);
		});

		it('should return correct canonical ref for createWidget', () => {
			const graph = resolveAliases(project, abs('core.ts'), 'createWidget', workspaceRoot);

			expect(graph.canonical.name).toBe('createWidget');
			expect(graph.canonical.filePath).toBe('core.ts');
		});
	});
});
