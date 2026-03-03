/**
 * Phase 7 — Ignore system rewrite.
 *
 * Replaces the custom globToRegex in services/codebase/ignore-rules.ts
 * with the `ignore` npm package for gitignore-compatible matching.
 * Preserves per-tool scoping via `# tool:name` section headers.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import type { IgnoreConfig } from './types.js';

export type { IgnoreConfig } from './types.js';

const DEVTOOLS_IGNORE_FILENAME = '.devtoolsignore';

const DEFAULT_PATTERNS = [
	'node_modules/',
	'.git/',
	'dist/',
	'build/',
	'out/',
	'coverage/',
	'.devtools/',
	'*.d.ts',
];

/**
 * Parse a `.devtoolsignore` file into an IgnoreConfig.
 *
 * Section syntax (same as the original system):
 *   `# global`      — patterns apply to ALL tools
 *   `# tool:name`   — patterns apply only to that tool
 *   Other `#` lines — comments (ignored)
 *   Lines before any section header — preamble (ignored)
 */
export function parseIgnoreFile(content: string): IgnoreConfig {
	const globalPatterns: string[] = [];
	const toolPatterns = new Map<string, string[]>();

	type Section = 'preamble' | 'global' | 'tool';
	let section: Section = 'preamble';
	let currentToolName: string | null = null;

	for (const line of content.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (trimmed.startsWith('#')) {
			const sectionName = trimmed.slice(1).trim();

			if (sectionName.toLowerCase() === 'global') {
				section = 'global';
				currentToolName = null;
				continue;
			}

			if (sectionName.toLowerCase().startsWith('tool:')) {
				const toolName = sectionName.slice(5).trim();
				if (toolName) {
					section = 'tool';
					currentToolName = toolName;
					if (!toolPatterns.has(toolName)) {
						toolPatterns.set(toolName, []);
					}
				}
				continue;
			}

			// Any other # line is a comment
			continue;
		}

		// Skip pattern lines in preamble
		if (section === 'preamble') continue;

		if (section === 'global') {
			globalPatterns.push(trimmed);
		} else if (section === 'tool' && currentToolName) {
			const patterns = toolPatterns.get(currentToolName);
			if (patterns) {
				patterns.push(trimmed);
			}
		}
	}

	return { globalPatterns, toolPatterns };
}

/**
 * Load ignore rules from the workspace `.devtoolsignore` file.
 * Falls back to DEFAULT_PATTERNS when no file exists.
 */
export function loadIgnoreRules(workspaceRoot: string): IgnoreConfig {
	const filePath = path.join(workspaceRoot, DEVTOOLS_IGNORE_FILENAME);

	if (!fs.existsSync(filePath)) {
		return { globalPatterns: [...DEFAULT_PATTERNS], toolPatterns: new Map() };
	}

	let raw = '';
	try {
		raw = fs.readFileSync(filePath, 'utf8');
	} catch {
		return { globalPatterns: [...DEFAULT_PATTERNS], toolPatterns: new Map() };
	}

	const config = parseIgnoreFile(raw);

	// If the file has no global section, apply defaults
	if (config.globalPatterns.length === 0 && config.toolPatterns.size === 0) {
		return { globalPatterns: [...DEFAULT_PATTERNS], toolPatterns: new Map() };
	}

	return config;
}

/**
 * Build an `ignore` instance for a specific tool scope.
 * Combines global patterns + tool-specific patterns.
 */
function buildIgnoreInstance(config: IgnoreConfig, toolScope?: string): Ignore {
	const ig = ignore();

	ig.add(config.globalPatterns);

	if (toolScope) {
		const toolSpecific = config.toolPatterns.get(toolScope);
		if (toolSpecific) {
			ig.add(toolSpecific);
		}
	}

	return ig;
}

/**
 * Check whether a workspace-relative path should be ignored.
 *
 * @param relativePath  Workspace-relative path (forward slashes)
 * @param config        Parsed IgnoreConfig from loadIgnoreRules()
 * @param toolScope     Optional tool name for per-tool filtering
 */
export function isIgnored(relativePath: string, config: IgnoreConfig, toolScope?: string): boolean {
	const normalized = relativePath.replaceAll('\\', '/');
	const ig = buildIgnoreInstance(config, toolScope);
	return ig.ignores(normalized);
}

/**
 * Filter an array of workspace-relative paths, returning only non-ignored ones.
 */
export function filterIgnored(
	relativePaths: string[],
	config: IgnoreConfig,
	toolScope?: string,
): string[] {
	const ig = buildIgnoreInstance(config, toolScope);
	return relativePaths.filter(p => !ig.ignores(p.replaceAll('\\', '/')));
}
