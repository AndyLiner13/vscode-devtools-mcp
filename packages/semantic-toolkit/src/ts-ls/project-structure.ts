/**
 * Phase 3, Item 13 — Multi-project / tsconfig structure resolver.
 *
 * Discovers all tsconfig.json files in a workspace, resolves project
 * references, composite flags, extends chains, source file lists,
 * and builds a reverse dependency graph.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project } from 'ts-morph';

import type { ProjectInfo, ProjectStructure } from './types';

export type { ProjectInfo, ProjectStructure } from './types';

// JSON5-style comment stripping (tsconfig allows comments)
function stripJsonComments(text: string): string {
	return text
		.replace(/\/\/.*$/gm, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/,\s*([}\]])/g, '$1');
}

function readTsConfig(configPath: string): Record<string, unknown> | undefined {
	try {
		const raw = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(stripJsonComments(raw)) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the full project structure for a workspace.
 *
 * Discovers all tsconfig.json files (excluding node_modules and common
 * output directories), resolves their relationships, and builds a
 * dependency graph.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @returns ProjectStructure with all projects, solution config, and reverse references.
 */
export function resolveProjectStructure(workspaceRoot: string): ProjectStructure {
	const configPaths = findTsConfigs(workspaceRoot);
	const projects: ProjectInfo[] = [];
	let solutionConfig: string | undefined;

	for (const configPath of configPaths) {
		const absolutePath = path.resolve(workspaceRoot, configPath);
		const config = readTsConfig(absolutePath);
		if (!config) continue;

		const compilerOptions = (config.compilerOptions ?? {}) as Record<string, unknown>;
		const composite = Boolean(compilerOptions.composite);
		const outDir = compilerOptions.outDir
			? toRelative(path.resolve(path.dirname(absolutePath), String(compilerOptions.outDir)), workspaceRoot)
			: undefined;

		// Resolve extends
		let extendedFrom: string | undefined;
		if (typeof config.extends === 'string') {
			const extendsAbsolute = path.resolve(path.dirname(absolutePath), config.extends);
			if (fs.existsSync(extendsAbsolute)) {
				extendedFrom = toRelative(extendsAbsolute, workspaceRoot);
			} else {
				extendedFrom = config.extends;
			}
		}

		// Resolve references
		const references: string[] = [];
		if (Array.isArray(config.references)) {
			for (const ref of config.references) {
				if (ref && typeof ref === 'object' && 'path' in ref) {
					const refRecord = ref as Record<string, unknown>;
					const refPath = String(refRecord.path);
					const refAbsolute = path.resolve(path.dirname(absolutePath), refPath);
					// Find the tsconfig in the referenced path
					let refConfig = refAbsolute;
					if (fs.existsSync(refAbsolute) && fs.statSync(refAbsolute).isDirectory()) {
						refConfig = path.join(refAbsolute, 'tsconfig.json');
					}
					if (fs.existsSync(refConfig)) {
						references.push(toRelative(refConfig, workspaceRoot));
					} else {
						references.push(toRelative(refAbsolute, workspaceRoot));
					}
				}
			}
		}

		// Determine rootDir
		const rootDir = toRelative(path.dirname(absolutePath), workspaceRoot) || '.';

		// Detect solution-style config: has references but no files/include
		// Must detect BEFORE resolving source files — ts-morph defaults to
		// including all .ts under the directory when no include/files is set.
		const hasFiles = Array.isArray(config.files) && (config.files as unknown[]).length > 0;
		const hasInclude = Array.isArray(config.include) && (config.include as unknown[]).length > 0;
		const isSolutionStyle = references.length > 0 && !hasFiles && !hasInclude;

		if (isSolutionStyle) {
			solutionConfig = configPath;
		}

		// Resolve source files (skip for solution-style configs — they don't own sources)
		const sourceFiles = isSolutionStyle ? [] : resolveSourceFiles(absolutePath, workspaceRoot);

		const info: ProjectInfo = {
			configPath,
			composite,
			extendedFrom,
			references,
			sourceFiles,
			rootDir,
			outDir,
		};

		projects.push(info);
	}

	// Build reverse reference map
	const referencedBy = buildReverseDependencyGraph(projects);

	// Sort projects by configPath for deterministic output
	projects.sort((a, b) => a.configPath.localeCompare(b.configPath));

	return { projects, solutionConfig, referencedBy };
}

// ---------------------------------------------------------------------------
// tsconfig discovery
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set([
	'node_modules', '.git', 'dist', 'out', 'build', '.next', '.nuxt',
	'coverage', '.turbo', '.cache',
]);

function findTsConfigs(dir: string, relativeTo?: string, results: string[] = []): string[] {
	const root = relativeTo ?? dir;

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return results;
	}

	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.has(entry.name)) continue;
			findTsConfigs(path.join(dir, entry.name), root, results);
		} else if (entry.isFile() && entry.name === 'tsconfig.json') {
			results.push(toRelative(path.join(dir, entry.name), root));
		}
	}

	return results;
}

// ---------------------------------------------------------------------------
// Source file resolution
// ---------------------------------------------------------------------------

function resolveSourceFiles(configPath: string, workspaceRoot: string): string[] {
	try {
		const tempProject = new Project({
			tsConfigFilePath: configPath,
			skipAddingFilesFromTsConfig: false,
		});

		const files: string[] = [];
		for (const sf of tempProject.getSourceFiles()) {
			const fp = sf.getFilePath();
			if (fp.includes('node_modules') || fp.endsWith('.d.ts')) continue;
			files.push(toRelative(fp, workspaceRoot));
		}

		return files.sort();
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Reverse dependency graph
// ---------------------------------------------------------------------------

function buildReverseDependencyGraph(projects: ProjectInfo[]): Map<string, string[]> {
	const referencedBy = new Map<string, string[]>();

	for (const project of projects) {
		for (const ref of project.references) {
			const existing = referencedBy.get(ref);
			if (existing) {
				existing.push(project.configPath);
			} else {
				referencedBy.set(ref, [project.configPath]);
			}
		}
	}

	// Sort referencing projects for determinism
	for (const [, refs] of referencedBy) {
		refs.sort();
	}

	return referencedBy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toRelative(absolutePath: string, workspaceRoot: string): string {
	return path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
}
