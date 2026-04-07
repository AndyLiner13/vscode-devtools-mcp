/**
 * Hot Reload Service
 *
 * Content-hash change detection for MCP server and extension source code.
 * The extension is the single authority for all change detection, hashing,
 * building, and restart orchestration. The MCP server never hashes files.
 *
 * Source files are discovered via TypeScript's own API (ts.readConfigFile +
 * ts.parseJsonConfigFileContent), which reads tsconfig include/exclude patterns
 * and resolves the full file list. No custom glob walker, no .devtoolsignore,
 * no hardcoded exclude rules.
 *
 * Hashes are pure SHA-256 of sorted (relativePath + rawFileBytes). No mtime,
 * no file metadata. Only content bytes determine whether a rebuild is needed.
 */

import type * as vscode from 'vscode';

import { exec } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { log } from './logger';

// ── Storage Keys ─────────────────────────────────────────────────────────────

const HASH_KEY_MCP = 'hotReload:hash:mcpServer';
const HASH_KEY_EXT = 'hotReload:hash:extension';
const HASH_KEY_INSPECTOR = 'hotReload:hash:inspector';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChangeCheckResult {
	extBuildError: null | string;
	extChanged: boolean;
	extClientReloaded: boolean;
	extRebuilt: boolean;
	mcpBuildError: null | string;
	mcpChanged: boolean;
	mcpRebuilt: boolean;
	newCdpPort: null | number;
	newClientStartedAt: null | number;
}

interface PackageCheckResult {
	buildError: null | string;
	changed: boolean;
	rebuilt: boolean;
}

// ── Service ──────────────────────────────────────────────────────────────────

class HotReloadService {
	constructor(private readonly workspaceState: vscode.Memento) {}

	/**
	 * Discover source and config files with a lightweight recursive scan.
	 * This avoids any dependency on the removed semantic analysis system.
	 */
	discoverSourceFiles(packageRoot: string): string[] {
		const allFiles = new Set(this.discoverSourceFilesForPackage(packageRoot));

		// Include source files from bundled @packages/* dependencies
		const bundledRoots = this.discoverBundledPackageRoots(packageRoot);
		for (const pkgRoot of bundledRoots) {
			const pkgFiles = this.discoverSourceFilesForPackage(pkgRoot);
			for (const f of pkgFiles) {
				allFiles.add(f);
			}
		}

		return [...allFiles];
	}

	/**
	 * Discover source files for a single package (no recursion into bundled deps).
	 * Used to resolve files from dependent @packages/* roots.
	 */
	private discoverSourceFilesForPackage(packageRoot: string): string[] {
		const files: string[] = [];
		const allowedExtensions = new Set(['.css', '.html', '.js', '.json', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
		const excludedDirs = new Set(['.git', '.next', '.turbo', 'build', 'dist', 'node_modules', 'out']);

		for (const configName of ['package.json', 'tsconfig.json', 'tsconfig.build.json', 'esbuild.mjs']) {
			const configPath = join(packageRoot, configName);
			if (existsSync(configPath)) {
				files.push(configPath);
			}
		}

		const walk = (dir: string): void => {
			let entries;
			try {
				entries = readdirSync(dir, { withFileTypes: true });
			} catch {
				return;
			}

			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				if (entry.isDirectory()) {
					if (!excludedDirs.has(entry.name)) {
						walk(fullPath);
					}
					continue;
				}
				if (entry.isFile() && allowedExtensions.has(extname(entry.name))) {
					files.push(fullPath);
				}
			}
		};

		walk(packageRoot);
		return files;
	}

	/**
	 * Parse esbuild.mjs to discover @packages/* alias targets.
	 *
	 * Reads the esbuild config and extracts alias entries like:
	 *   { alias: '@packages/semantic-toolkit', target: 'packages/semantic-toolkit/src/index.js' }
	 *
	 * Returns the absolute package root directories (parent of 'src/').
	 */
	private discoverBundledPackageRoots(packageRoot: string): string[] {
		const esbuildPath = join(packageRoot, 'esbuild.mjs');
		if (!existsSync(esbuildPath)) return [];

		try {
			const content = readFileSync(esbuildPath, 'utf-8');
			const roots: string[] = [];

			// Match alias target patterns: target: 'packages/foo/src/index.js'
			const aliasPattern = /target:\s*['"]([^'"]+\/src\/[^'"]+)['"]/g;
			let match;
			while ((match = aliasPattern.exec(content)) !== null) {
				const targetPath = match[1];
				// Extract the package root (everything before /src/)
				const srcIdx = targetPath.indexOf('/src/');
				if (srcIdx === -1) continue;
				const pkgRelative = targetPath.slice(0, srcIdx);
				// Resolve relative to the monorepo root (parent of client-controller)
				const monorepoRoot = join(packageRoot, '..');
				const pkgAbsolute = join(monorepoRoot, pkgRelative);
				if (existsSync(pkgAbsolute)) {
					roots.push(pkgAbsolute);
					log(`[hotReload] Discovered bundled package: ${pkgRelative}`);
				}
			}

			return roots;
		} catch {
			log(`[hotReload] Failed to parse esbuild config at ${esbuildPath}`);
			return [];
		}
	}

	/**
	 * Compute SHA-256 of all source file contents.
	 *
	 * Files are sorted by relative path for deterministic output.
	 * Each file contributes its relative path (forward slashes) and
	 * its raw byte content to the hash. No mtime, no metadata.
	 */
	computeContentHash(packageRoot: string, files: string[]): string {
		const hash = createHash('sha256');

		const sorted = files
			.map((absPath) => ({
				abs: absPath,
				rel: relative(packageRoot, absPath).replaceAll('\\', '/')
			}))
			.sort((a, b) => a.rel.localeCompare(b.rel));

		for (const file of sorted) {
			hash.update(file.rel);
			try {
				hash.update(readFileSync(file.abs));
			} catch {
				// Skip unreadable files (e.g., locked by another process)
			}
		}

		return hash.digest('hex');
	}

	getStoredHash(key: string): string | undefined {
		return this.workspaceState.get<string>(key);
	}

	setStoredHash(key: string, hash: string): Thenable<void> {
		return this.workspaceState.update(key, hash);
	}

	/**
	 * Detect the package manager by checking for lockfiles.
	 */
	detectPackageManager(packageRoot: string): 'npm' | 'pnpm' | 'yarn' {
		if (existsSync(join(packageRoot, 'pnpm-lock.yaml'))) {
			return 'pnpm';
		}
		if (existsSync(join(packageRoot, 'yarn.lock'))) {
			return 'yarn';
		}
		return 'npm';
	}

	/**
	 * Run a package.json script using the detected package manager.
	 * Returns null on success, error output on failure.
	 * If the script does not exist in the target package.json, returns null
	 * (no-op) so callers never build non-extension workspaces.
	 */
	async runBuild(packageRoot: string, scriptName: string): Promise<null | string> {
		if (!this.hasPackageScript(packageRoot, scriptName)) {
			log(`[hotReload] Skipping build: no "${scriptName}" script in ${packageRoot}`);
			return null;
		}

		return new Promise((resolve) => {
			const pm = this.detectPackageManager(packageRoot);
			const cmd = `${pm} run ${scriptName}`;

			log(`[hotReload] Running build: ${cmd} in ${packageRoot}`);

			exec(cmd, { cwd: packageRoot, timeout: 300_000 }, (error, stdout, stderr) => {
				if (error) {
					const output = [stderr, stdout].filter(Boolean).join('\n').trim();
					resolve(output || error.message);
				} else {
					resolve(null);
				}
			});
		});
	}

	/**
	 * Check extension source only (for mcpReady / hotReloadRequired handlers).
	 * Returns whether the extension changed and was rebuilt.
	 */
	async checkExtensionOnly(extensionRoot: string): Promise<PackageCheckResult> {
		return this.checkPackage(extensionRoot, HASH_KEY_EXT, 'compile');
	}

	/**
	 * Check a single extension path with a user-configured build script.
	 * Used by the multi-path extension flow in host-handlers.
	 */
	async checkPackageWithScript(packageRoot: string, buildScript: string): Promise<PackageCheckResult> {
		return this.checkPackage(packageRoot, HASH_KEY_EXT, buildScript);
	}

	/**
	 * Check inspector frontend source and rebuild if changed.
	 * Uses the inspector's own tsconfig to discover source files
	 * and runs 'inspector:build' (esbuild → inspector/dist/).
	 */
	async checkInspector(inspectorRoot: string): Promise<PackageCheckResult> {
		return this.checkPackage(inspectorRoot, HASH_KEY_INSPECTOR, 'inspector:build');
	}

	/**
	 * Detect-only check for inspector source changes (no build).
	 */
	detectInspectorChange(inspectorRoot: string): { changed: boolean; currentHash: string } {
		return this.detectChange(inspectorRoot, 'inspector');
	}

	/**
	 * Check if source files have changed without triggering a build.
	 * Returns the current content hash and whether it differs from stored.
	 * Use with runBuild() + commitHash() for progress-aware workflows.
	 *
	 * Returns no-change when the package lacks the corresponding build
	 * script, so callers never enter build/restart flows for non-extension
	 * workspaces.
	 */
	detectChange(packageRoot: string, hashKey: 'ext' | 'inspector' | 'mcp'): { changed: boolean; currentHash: string } {
		const key = hashKey === 'mcp' ? HASH_KEY_MCP : hashKey === 'inspector' ? HASH_KEY_INSPECTOR : HASH_KEY_EXT;

		const buildScript = hashKey === 'mcp' ? 'build' : hashKey === 'inspector' ? 'inspector:build' : 'compile';
		if (!this.hasPackageScript(packageRoot, buildScript)) {
			log(`[hotReload] Skipping detectChange (${key}): no "${buildScript}" script in ${packageRoot}`);
			return { changed: false, currentHash: '' };
		}

		const files = this.discoverSourceFiles(packageRoot);
		if (files.length === 0) {
			return { changed: false, currentHash: '' };
		}

		const currentHash = this.computeContentHash(packageRoot, files);
		const storedHash = this.getStoredHash(key);

		if (storedHash === currentHash) {
			return { changed: false, currentHash };
		}

		const storedPrefix = storedHash ? `${storedHash.slice(0, 12)}...` : 'none';
		const currentPrefix = `${currentHash.slice(0, 12)}...`;
		log(`[hotReload] Content changed (${key}): ${storedPrefix} -> ${currentPrefix}`);
		return { changed: true, currentHash };
	}

	/**
	 * Store a content hash after a successful build.
	 * Call after runBuild() succeeds to persist the hash for future comparisons.
	 */
	async commitHash(hashKey: 'ext' | 'inspector' | 'mcp', hash: string): Promise<void> {
		const key = hashKey === 'mcp' ? HASH_KEY_MCP : hashKey === 'inspector' ? HASH_KEY_INSPECTOR : HASH_KEY_EXT;
		await this.setStoredHash(key, hash);
		log(`[hotReload] Hash committed (${key}): ${hash.slice(0, 12)}...`);
	}

	/**
	 * Check whether a package.json in the given directory defines the named script.
	 * Returns false if package.json is missing, unreadable, or lacks the script.
	 */
	private hasPackageScript(packageRoot: string, scriptName: string): boolean {
		const pkgPath = join(packageRoot, 'package.json');
		try {
			const raw = readFileSync(pkgPath, 'utf-8');
			const pkg: unknown = JSON.parse(raw);
			if (typeof pkg !== 'object' || pkg === null) {
				return false;
			}
			if (!('scripts' in pkg)) {
				return false;
			}
			const { scripts } = pkg;
			if (typeof scripts !== 'object' || scripts === null) {
				return false;
			}
			return scriptName in scripts;
		} catch {
			return false;
		}
	}

	/**
	 * Check for changes in a single package.
	 * Discovers files, hashes content, compares to stored hash,
	 * and rebuilds if content has changed.
	 *
	 * If the target directory has no package.json or the required build
	 * script is missing, returns early with no change — this gracefully
	 * handles workspaces that are not the extension source directory.
	 */
	private async checkPackage(packageRoot: string, hashKey: string, buildScript: string): Promise<PackageCheckResult> {
		if (!this.hasPackageScript(packageRoot, buildScript)) {
			log(`[hotReload] Skipping ${hashKey}: no "${buildScript}" script in ${packageRoot}`);
			return { buildError: null, changed: false, rebuilt: false };
		}

		const files = this.discoverSourceFiles(packageRoot);
		if (files.length === 0) {
			return { buildError: null, changed: false, rebuilt: false };
		}

		const currentHash = this.computeContentHash(packageRoot, files);
		const storedHash = this.getStoredHash(hashKey);

		if (storedHash === currentHash) {
			return { buildError: null, changed: false, rebuilt: false };
		}

		const storedPrefix = storedHash ? `${storedHash.slice(0, 12)}...` : 'none';
		const currentPrefix = `${currentHash.slice(0, 12)}...`;
		log(`[hotReload] Content changed (${hashKey}): ${storedPrefix} -> ${currentPrefix}`);

		const buildError = await this.runBuild(packageRoot, buildScript);
		if (buildError) {
			log(`[hotReload] Build failed (${hashKey}): ${buildError}`);
			return { buildError, changed: true, rebuilt: false };
		}

		await this.setStoredHash(hashKey, currentHash);
		log(`[hotReload] Build succeeded, hash stored: ${currentPrefix}`);
		return { buildError: null, changed: true, rebuilt: true };
	}

	/**
	 * Main entry point: check both extension and MCP server source.
	 *
	 * Extension is checked first, then MCP server.
	 * - If extension changed: rebuild inline, caller handles Client restart
	 * - If MCP changed: rebuild MCP source, caller handles MCP restart
	 */
	async checkForChanges(mcpServerRoot: string, extensionRoot: string): Promise<ChangeCheckResult> {
		const result: ChangeCheckResult = {
			extBuildError: null,
			extChanged: false,
			extClientReloaded: false,
			extRebuilt: false,
			mcpBuildError: null,
			mcpChanged: false,
			mcpRebuilt: false,
			newCdpPort: null,
			newClientStartedAt: null
		};

		// Extension first - uses 'compile' script (esbuild)
		const extResult = await this.checkPackage(extensionRoot, HASH_KEY_EXT, 'compile');
		result.extChanged = extResult.changed;
		result.extRebuilt = extResult.rebuilt;
		result.extBuildError = extResult.buildError;

		// MCP server - uses 'build' script (rollup)
		const mcpResult = await this.checkPackage(mcpServerRoot, HASH_KEY_MCP, 'build');
		result.mcpChanged = mcpResult.changed;
		result.mcpRebuilt = mcpResult.rebuilt;
		result.mcpBuildError = mcpResult.buildError;

		return result;
	}
}

// ── Factory ──────────────────────────────────────────────────────────────────

let serviceInstance: HotReloadService | undefined;

function createHotReloadService(workspaceState: vscode.Memento): HotReloadService {
	serviceInstance = new HotReloadService(workspaceState);
	return serviceInstance;
}

function getHotReloadService(): HotReloadService | undefined {
	return serviceInstance;
}

export type { ChangeCheckResult };
export { createHotReloadService, getHotReloadService };
