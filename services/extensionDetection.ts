/**
 * Extension Detection Service
 *
 * Scans the workspace for VS Code extension folders by looking for
 * package.json files with an `engines.vscode` field. Uses VS Code's
 * own file exclusion settings (files.exclude, search.exclude) to
 * skip ignored directories.
 *
 * When dev mode activates and no extension paths are configured,
 * this service auto-detects extension folders and writes them to
 * .vscode/settings.json. It also validates previously-configured
 * paths on startup.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as vscode from 'vscode';
import { log } from './logger';

interface ExtensionFolder {
	/** Absolute path to the folder containing the extension package.json */
	absolutePath: string;
	/** Display name from package.json (or folder name) */
	displayName: string;
	/** Whether this folder is at the workspace root */
	isRoot: boolean;
	/** Relative path from workspace root (e.g. "./packages/my-ext") */
	relativePath: string;
}

/**
 * Scan the workspace for VS Code extension folders.
 *
 * Uses `vscode.workspace.findFiles` which respects files.exclude and
 * search.exclude settings, avoiding git-ignored and user-excluded folders.
 */
async function scanForExtensionFolders(workspaceRoot: string, maxDepth: number): Promise<ExtensionFolder[]> {
	// Build a glob pattern to find package.json at varying depths up to maxDepth.
	// Depth 1 = root package.json, depth 2 = child/package.json, etc.
	const depthPatterns: string[] = [];
	for (let d = 0; d < maxDepth; d++) {
		const segments = d === 0 ? '' : `${'*/'.repeat(d)}`;
		depthPatterns.push(`${segments}package.json`);
	}
	const globPattern = `{${depthPatterns.join(',')}}`;

	log(`[extensionDetection] Scanning with pattern: ${globPattern}`);

	const uris = await vscode.workspace.findFiles(
		new vscode.RelativePattern(workspaceRoot, globPattern),
		undefined, // uses VS Code's default exclusions (files.exclude + search.exclude)
		500 // safety limit
	);

	const results: ExtensionFolder[] = [];

	for (const uri of uris) {
		const pkgPath = uri.fsPath;
		try {
			const raw = readFileSync(pkgPath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);

			if (!isRecord(parsed)) continue;

			const engines = parsed.engines;
			if (!isRecord(engines)) continue;
			if (typeof engines.vscode !== 'string') continue;

			const folderPath = join(pkgPath, '..');
			const relPath = relative(workspaceRoot, folderPath).replaceAll('\\', '/');
			const isRoot = relPath === '' || relPath === '.';
			const displayName =
				typeof parsed.displayName === 'string'
					? parsed.displayName
					: typeof parsed.name === 'string'
						? parsed.name
						: isRoot
							? '(workspace root)'
							: relPath;

			results.push({
				absolutePath: folderPath,
				displayName,
				isRoot,
				relativePath: isRoot ? '.' : `./${relPath}`
			});
		} catch {
			// Skip unreadable/unparseable package.json files
		}
	}

	log(`[extensionDetection] Found ${results.length} extension folder(s)`);
	for (const ext of results) {
		log(`[extensionDetection]   ${ext.relativePath} — ${ext.displayName}${ext.isRoot ? ' (root)' : ''}`);
	}

	return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read the current devtools.extensionPath value from .vscode/settings.json.
 * Returns undefined if not set or if the file doesn't exist.
 */
function readExtensionPathFromSettings(workspaceRoot: string): string[] | undefined {
	const settingsPath = join(workspaceRoot, '.vscode', 'settings.json');
	if (!existsSync(settingsPath)) return undefined;

	try {
		const raw = readFileSync(settingsPath, 'utf-8');
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return undefined;

		const value = parsed['devtools.extensionPath'];
		if (value === undefined) return undefined;

		// Handle legacy single-string value
		if (typeof value === 'string') {
			return value === '.' ? undefined : [value];
		}

		if (!Array.isArray(value)) return undefined;

		const paths: string[] = [];
		for (const item of value) {
			if (typeof item === 'string') paths.push(item);
		}
		return paths.length > 0 ? paths : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Write devtools.extensionPath to .vscode/settings.json.
 * Creates the file and directory if they don't exist.
 * Preserves existing settings.
 */
function writeExtensionPathToSettings(workspaceRoot: string, paths: string[]): void {
	const vscodePath = join(workspaceRoot, '.vscode');
	const settingsPath = join(vscodePath, 'settings.json');

	let settings: Record<string, unknown> = {};

	if (existsSync(settingsPath)) {
		try {
			const raw = readFileSync(settingsPath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			if (isRecord(parsed)) {
				settings = parsed;
			}
		} catch {
			// Start fresh if parsing fails
		}
	} else if (!existsSync(vscodePath)) {
		mkdirSync(vscodePath, { recursive: true });
	}

	settings['devtools.extensionPath'] = paths;
	writeFileSync(settingsPath, JSON.stringify(settings, null, '\t') + '\n', 'utf-8');
	log(`[extensionDetection] Wrote devtools.extensionPath to ${settingsPath}`);
}

/**
 * Validate that configured extension paths still contain valid VS Code extensions.
 * Returns only the paths that have a package.json with engines.vscode.
 */
function validateExtensionPaths(workspaceRoot: string, paths: string[]): string[] {
	const valid: string[] = [];

	for (const rawPath of paths) {
		const absPath = rawPath.startsWith('.') ? join(workspaceRoot, rawPath) : rawPath;

		const pkgPath = join(absPath, 'package.json');
		if (!existsSync(pkgPath)) {
			log(`[extensionDetection] Invalid path (no package.json): ${rawPath}`);
			continue;
		}

		try {
			const raw = readFileSync(pkgPath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			if (!isRecord(parsed)) continue;

			const engines = parsed.engines;
			if (!isRecord(engines)) continue;
			if (typeof engines.vscode !== 'string') {
				log(`[extensionDetection] Invalid path (no engines.vscode): ${rawPath}`);
				continue;
			}

			valid.push(rawPath);
		} catch {
			log(`[extensionDetection] Invalid path (unreadable): ${rawPath}`);
		}
	}

	return valid;
}

export interface DetectionResult {
	/** The resolved extension paths (relative to workspace root) */
	paths: string[];
	/** Whether paths were auto-detected (true) or loaded from existing config (false) */
	autoDetected: boolean;
}

/**
 * Main entry point: detect or validate extension paths for a workspace.
 *
 * 1. If extensionPath is already configured and valid, returns it
 * 2. If configured but invalid, shows a warning and re-scans
 * 3. If not configured, scans the workspace and auto-configures
 *
 * Notifications:
 * - Single extension found → auto-set + info notification
 * - Multiple found, one at root → root wins + info notification
 * - Multiple found, none at root → warning to set in settings
 */
export async function detectExtensionPaths(workspaceRoot: string): Promise<DetectionResult> {
	const config = vscode.workspace.getConfiguration('devtools');
	const scanDepth = config.get<number>('extensionDetection.scanDepth', 3);

	// Check if extension paths are already configured via VS Code settings API
	const configuredPaths = config.get<string[]>('extensionPath', []);
	if (configuredPaths.length > 0) {
		const validPaths = validateExtensionPaths(workspaceRoot, configuredPaths);
		if (validPaths.length === configuredPaths.length) {
			log(`[extensionDetection] All ${validPaths.length} configured path(s) are valid`);
			return { paths: validPaths, autoDetected: false };
		}

		if (validPaths.length > 0) {
			const invalidCount = configuredPaths.length - validPaths.length;
			log(`[extensionDetection] ${invalidCount} configured path(s) are invalid — using ${validPaths.length} valid one(s)`);
			void vscode.window.showWarningMessage(
				`DevTools: ${invalidCount} extension path(s) are no longer valid and were skipped.`
			);
			return { paths: validPaths, autoDetected: false };
		}

		log('[extensionDetection] All configured paths are invalid — re-scanning');
		void vscode.window.showWarningMessage('DevTools: All configured extension paths are invalid. Re-scanning workspace...');
	}

	// No valid configuration — scan the workspace
	const found = await scanForExtensionFolders(workspaceRoot, scanDepth);

	if (found.length === 0) {
		const defaultPath = '.';
		writeExtensionPathToSettings(workspaceRoot, [defaultPath]);
		log('[extensionDetection] No VS Code extension folders found — defaulting to workspace root');
		return { paths: [defaultPath], autoDetected: true };
	}

	if (found.length === 1) {
		const ext = found[0];
		const paths = [ext.relativePath];
		writeExtensionPathToSettings(workspaceRoot, paths);

		void vscode.window.showInformationMessage(
			`DevTools: Extension detected — "${ext.displayName}" at ${ext.relativePath}. Path saved to .vscode/settings.json.`
		);
		log(`[extensionDetection] Single extension auto-configured: ${ext.relativePath}`);
		return { paths, autoDetected: true };
	}

	// Multiple extensions found
	const rootExtensions = found.filter((f) => f.isRoot);
	const relativePaths = found.map((f) => f.relativePath);

	if (rootExtensions.length > 0) {
		// Root extension exists — auto-configure ALL found extensions,
		// but prioritize root by putting it first
		const sorted = [...found].sort((a, b) => {
			if (a.isRoot && !b.isRoot) return -1;
			if (!a.isRoot && b.isRoot) return 1;
			return a.relativePath.localeCompare(b.relativePath);
		});
		const paths = sorted.map((f) => f.relativePath);
		writeExtensionPathToSettings(workspaceRoot, paths);

		const names = sorted.map((f) => f.displayName).join(', ');
		void vscode.window.showInformationMessage(
			`DevTools: ${found.length} extensions detected (${names}). Paths saved to .vscode/settings.json.`
		);
		log(`[extensionDetection] Multiple extensions auto-configured (root present): ${paths.join(', ')}`);
		return { paths, autoDetected: true };
	}

	// Multiple extensions, none at root — enable all but warn
	writeExtensionPathToSettings(workspaceRoot, relativePaths);

	const names = found.map((f) => f.displayName).join(', ');
	void vscode.window
		.showWarningMessage(
			`DevTools: ${found.length} extensions detected (${names}). ` +
				'All were added to .vscode/settings.json — review and adjust if needed.',
			'Open Settings'
		)
		.then((choice) => {
			if (choice === 'Open Settings') {
				const settingsUri = vscode.Uri.file(join(workspaceRoot, '.vscode', 'settings.json'));
				void vscode.window.showTextDocument(settingsUri);
			}
		});

	log(`[extensionDetection] Multiple extensions auto-configured (no root): ${relativePaths.join(', ')}`);
	return { paths: relativePaths, autoDetected: true };
}

/**
 * Resolve extension paths to absolute paths.
 * Converts relative paths (starting with ".") to absolute using the workspace root.
 */
export function resolveExtensionPaths(workspaceRoot: string, paths: string[]): string[] {
	return paths.map((p) => (p.startsWith('.') ? join(workspaceRoot, p) : p));
}

/**
 * Join multiple extension paths into a semicolon-separated string
 * for use with --extensionDevelopmentPath.
 */
export function joinExtensionPaths(absolutePaths: string[]): string {
	return absolutePaths.join(';');
}
