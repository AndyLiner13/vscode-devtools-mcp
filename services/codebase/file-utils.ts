// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure Node.js file utilities — no VS Code API dependency.
import * as fs from 'node:fs';
import * as path from 'node:path';

import { applyIgnoreRules, globToRegex, parseIgnoreRules } from './ignore-rules';

export interface DiscoverFilesOptions {
	excludeGlob?: string;
	excludePatterns?: string[];
	/** File extensions to include (e.g., Set(['.ts', '.md'])). undefined = all extensions. */
	fileExtensions?: Set<string>;
	/** Directory to load .devtoolsignore from (defaults to rootDir). */
	ignoreRulesRoot?: string;
	includeGlob?: string;
	includePatterns?: string[];
	/** Maximum directory depth to walk. 1 = immediate children only. undefined = unlimited. */
	maxDepth?: number;
	maxResults?: number;
	respectIgnoreRules?: boolean;
	rootDir: string;
	/** Tool scope for per-tool .devtoolsignore sections (e.g. 'codebase_map'). */
	toolScope?: string;
}

/**
 * Walk the filesystem and collect files matching the given criteria.
 * Returns a Map of relative path → absolute path (forward-slash normalized).
 */
export function discoverFiles(options: DiscoverFilesOptions): Map<string, string> {
	const { excludeGlob, excludePatterns, fileExtensions, ignoreRulesRoot, includeGlob, includePatterns, maxDepth, maxResults = 5000, respectIgnoreRules = true, rootDir, toolScope } = options;

	const rulesRoot = ignoreRulesRoot ?? rootDir;
	const ignoreRules = respectIgnoreRules ? parseIgnoreRules(rulesRoot) : [];
	const includeMatcher = includeGlob ? globToRegex(includeGlob) : null;
	const excludeMatcher = excludeGlob ? globToRegex(excludeGlob) : null;
	const callerIncludes = (includePatterns ?? []).map((p) => globToRegex(p));
	const callerExcludes = (excludePatterns ?? []).map((p) => globToRegex(p));

	const normalizedRoot = rootDir.replaceAll('\\', '/').replace(/\/+$/, '');
	const fileMap = new Map<string, string>();

	walkDirectory(rootDir, normalizedRoot, fileMap, {
		callerExcludes,
		callerIncludes,
		excludeMatcher,
		fileExtensions,
		ignoreRules,
		includeMatcher,
		maxDepth,
		maxResults,
		toolScope
	});

	return fileMap;
}

interface WalkContext {
	callerExcludes: RegExp[];
	callerIncludes: RegExp[];
	excludeMatcher: null | RegExp;
	fileExtensions?: Set<string>;
	ignoreRules: ReturnType<typeof parseIgnoreRules>;
	includeMatcher: null | RegExp;
	maxDepth?: number;
	maxResults: number;
	toolScope?: string;
}

function walkDirectory(dir: string, normalizedRoot: string, fileMap: Map<string, string>, ctx: WalkContext, visitedInodes?: Set<string>, currentDepth = 0): void {
	if (fileMap.size >= ctx.maxResults) return;

	// Symlink cycle detection — track visited directory inodes
	const visited = visitedInodes ?? new Set<string>();
	try {
		const dirStat = fs.statSync(dir);
		const inodeKey = `${dirStat.dev}:${dirStat.ino}`;
		if (visited.has(inodeKey)) return;
		visited.add(inodeKey);
	} catch {
		return;
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (fileMap.size >= ctx.maxResults) return;

		const fullPath = path.join(dir, entry.name);
		const normalizedFull = fullPath.replaceAll('\\', '/');
		const relative = normalizedFull.startsWith(`${normalizedRoot}/`) ? normalizedFull.slice(normalizedRoot.length + 1) : normalizedFull.startsWith(normalizedRoot) ? normalizedFull.slice(normalizedRoot.length).replace(/^\//, '') : normalizedFull;

		if (entry.isDirectory()) {
			if (ctx.ignoreRules.length > 0 && applyIgnoreRules(relative, ctx.ignoreRules, ctx.toolScope)) continue;

			// Depth limiting: skip subdirectories when at max depth
			if (ctx.maxDepth !== undefined && currentDepth >= ctx.maxDepth) continue;

			walkDirectory(fullPath, normalizedRoot, fileMap, ctx, visited, currentDepth + 1);
			continue;
		}

		if (!entry.isFile()) continue;

		if (ctx.ignoreRules.length > 0 && applyIgnoreRules(relative, ctx.ignoreRules, ctx.toolScope)) continue;
		if (ctx.includeMatcher && !ctx.includeMatcher.test(relative)) continue;
		if (ctx.excludeMatcher && ctx.excludeMatcher.test(relative)) continue;
		if (ctx.callerIncludes.length > 0 && !ctx.callerIncludes.some((rx) => rx.test(relative))) continue;
		if (ctx.callerExcludes.length > 0 && ctx.callerExcludes.some((rx) => rx.test(relative))) continue;

		// Extension filtering
		if (ctx.fileExtensions) {
			const dotIdx = entry.name.lastIndexOf('.');
			const ext = dotIdx >= 0 ? entry.name.slice(dotIdx).toLowerCase() : '';
			if (!ctx.fileExtensions.has(ext)) continue;
		}

		fileMap.set(relative, fullPath);
	}
}

/**
 * Read a file as UTF-8 text. Returns the text and line count.
 */
export function readFileText(filePath: string): { text: string; lineCount: number } {
	const text = fs.readFileSync(filePath, 'utf-8');
	let lineCount = 1;
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) === 10) lineCount++;
	}
	return { lineCount, text };
}

/**
 * Determine whether a path is a file or directory.
 */
export function getPathType(filePath: string): 'directory' | 'file' {
	const stat = fs.statSync(filePath);
	if (stat.isDirectory()) return 'directory';
	return 'file';
}
