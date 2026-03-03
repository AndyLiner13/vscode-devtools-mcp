// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.

/**
 * Backward-compatible wrapper around the Phase 7 ignore system in semantic-toolkit.
 *
 * Delegates to the `ignore` npm package (via @packages/semantic-toolkit)
 * while preserving the existing function signatures so all consumers
 * (codebase_map, codebase_trace, overview-service, etc.) continue to work.
 */

import {
	loadIgnoreRules,
	isIgnored,
	type IgnoreConfig,
} from '@packages/semantic-toolkit';

export { type IgnoreConfig } from '@packages/semantic-toolkit';

/**
 * Backward-compatible wrapper: extends IgnoreConfig with a `length` property
 * so existing `ignoreRules.length > 0` checks continue to work.
 */
export interface IgnoreRulesCompat extends IgnoreConfig {
	length: number;
}

/**
 * Parse .devtoolsignore rules from the workspace root.
 * Returns a compat object that works with both the old and new API.
 */
export function parseIgnoreRules(rootDir: string): IgnoreRulesCompat {
	const config = loadIgnoreRules(rootDir);
	let count = config.globalPatterns.length;
	for (const patterns of config.toolPatterns.values()) {
		count += patterns.length;
	}
	return { ...config, length: count };
}

/**
 * Check whether a workspace-relative path should be ignored.
 * Backward-compatible wrapper around isIgnored().
 */
export function applyIgnoreRules(relativePath: string, rules: IgnoreRulesCompat, toolScope?: string): boolean {
	return isIgnored(relativePath, rules, toolScope);
}

/**
 * Convert a glob pattern to a RegExp.
 * Kept for backward compatibility — used by file-utils.ts for include/exclude patterns.
 * This is separate from the gitignore-compatible pattern matching in the ignore system.
 */
export function globToRegex(pattern: string): RegExp {
	const normalized = pattern.trim().replaceAll('\\', '/');
	let source = '';
	for (let i = 0; i < normalized.length; i++) {
		const char = normalized[i];
		const next = normalized[i + 1];
		if (char === '*' && next === '*') {
			if (normalized[i + 2] === '/') {
				source += '(.*/)?';
				i += 2;
			} else {
				source += '.*';
				i++;
			}
			continue;
		}
		if (char === '*') {
			source += '[^/]*';
			continue;
		}
		source += char.replaceAll(/[|\\{}()[\]^$+?.]/g, '\\$&');
	}
	return new RegExp(`^${source}$`);
}
