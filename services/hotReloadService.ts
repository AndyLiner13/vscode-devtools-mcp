/**
 * Hot Reload Service
 *
 * Content-hash change detection for extension build output.
 *
 * Instead of watching source files and triggering builds, this service
 * watches the **output folder** (derived from package.json `main` field)
 * and restarts only when the built artifacts actually change.
 *
 * For example, if package.json has `"main": "./dist/extension.js"`, the
 * service watches the `dist/` folder and restarts when its contents change.
 *
 * This approach is simpler and more reliable:
 * - Works with any build system (esbuild, tsc, rollup, etc.)
 * - No build orchestration needed - user/external process handles builds
 * - Only restarts when output actually changes, not on every source edit
 *
 * Hashes are pure SHA-256 of sorted (relativePath + rawFileBytes). No mtime,
 * no file metadata. Only content bytes determine whether a restart is needed.
 */

import type * as vscode from 'vscode';

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { join, relative } from 'node:path';
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
	private watchers = new Map<string, FSWatcher>();
	private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private onChange: ((packageRoot: string) => void) | undefined;

	constructor(private readonly workspaceState: vscode.Memento) {}

	/**
	 * Get the output folder path from package.json main field.
	 *
	 * For example, if package.json has `"main": "./dist/extension.js"`,
	 * this returns the absolute path to the `dist/` folder.
	 *
	 * Returns null if package.json doesn't exist or has no main field.
	 */
	getOutputFolder(packageRoot: string): string | null {
		const pkgPath = join(packageRoot, 'package.json');
		try {
			const raw = readFileSync(pkgPath, 'utf-8');
			const pkg: unknown = JSON.parse(raw);
			if (typeof pkg !== 'object' || pkg === null) {
				return null;
			}
			if (!('main' in pkg) || typeof pkg.main !== 'string') {
				return null;
			}

			const mainPath = pkg.main;
			// Extract the directory from the main entry (e.g., "./dist/extension.js" → "dist")
			const parts = mainPath.replace(/^\.\//, '').split('/');
			if (parts.length < 2) {
				// main is in root (e.g., "index.js"), use the package root
				return packageRoot;
			}
			// Use the first directory component (e.g., "dist" from "dist/extension.js")
			const outputDir = parts[0];
			return join(packageRoot, outputDir);
		} catch {
			return null;
		}
	}

	/**
	 * Discover all files in the output folder for hashing.
	 */
	discoverOutputFiles(outputFolder: string): string[] {
		if (!existsSync(outputFolder)) {
			return [];
		}

		const files: string[] = [];

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
					walk(fullPath);
				} else if (entry.isFile()) {
					files.push(fullPath);
				}
			}
		};

		walk(outputFolder);
		return files;
	}

	/**
	 * Compute SHA-256 of all file contents in a folder.
	 *
	 * Files are sorted by relative path for deterministic output.
	 * Each file contributes its relative path (forward slashes) and
	 * its raw byte content to the hash. No mtime, no metadata.
	 */
	computeContentHash(baseFolder: string, files: string[]): string {
		const hash = createHash('sha256');

		const sorted = files
			.map((absPath) => ({
				abs: absPath,
				rel: relative(baseFolder, absPath).replaceAll('\\', '/')
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
	 * Check if the output folder has changed since last check.
	 *
	 * Reads package.json `main` field to determine output folder,
	 * hashes all files in that folder, and compares to stored hash.
	 *
	 * Returns whether the output changed and the current hash.
	 * Does NOT trigger any builds - that's the caller's responsibility.
	 */
	detectOutputChange(packageRoot: string, hashKey: 'ext' | 'inspector' | 'mcp'): { changed: boolean; currentHash: string } {
		const key = hashKey === 'mcp' ? HASH_KEY_MCP : hashKey === 'inspector' ? HASH_KEY_INSPECTOR : HASH_KEY_EXT;

		log(`[hotReload] detectOutputChange called for ${packageRoot} (${key})`);

		const outputFolder = this.getOutputFolder(packageRoot);
		if (!outputFolder) {
			log(`[hotReload] Skipping detectOutputChange (${key}): no main field in package.json at ${packageRoot}`);
			return { changed: false, currentHash: '' };
		}

		log(`[hotReload] Output folder resolved: ${outputFolder}`);

		if (!existsSync(outputFolder)) {
			log(`[hotReload] Skipping detectOutputChange (${key}): output folder does not exist: ${outputFolder}`);
			return { changed: false, currentHash: '' };
		}

		const files = this.discoverOutputFiles(outputFolder);
		if (files.length === 0) {
			log(`[hotReload] Skipping detectOutputChange (${key}): no files in output folder: ${outputFolder}`);
			return { changed: false, currentHash: '' };
		}

		log(`[hotReload] Found ${files.length} files in output folder`);

		const currentHash = this.computeContentHash(outputFolder, files);
		const storedHash = this.getStoredHash(key);

		const currentPrefix = `${currentHash.slice(0, 12)}...`;

		// No stored hash = first run, just store it without triggering restart
		if (!storedHash) {
			log(`[hotReload] First run (${key}), storing initial hash: ${currentPrefix}`);
			return { changed: false, currentHash };
		}

		if (storedHash === currentHash) {
			log(`[hotReload] Output unchanged (${key}): ${currentPrefix}`);
			return { changed: false, currentHash };
		}

		const storedPrefix = `${storedHash.slice(0, 12)}...`;
		log(`[hotReload] Output changed (${key}): ${storedPrefix} -> ${currentPrefix}`);
		return { changed: true, currentHash };
	}

	/**
	 * Start watching the output folder of each extension path.
	 * Uses native fs.watch (recursive) with 500ms debounce.
	 * On confirmed content change, calls the onChange callback.
	 */
	startWatching(extensionPaths: string[], onChangeCallback: (packageRoot: string) => void): void {
		this.stopWatching();
		this.onChange = onChangeCallback;

		for (const packageRoot of extensionPaths) {
			const outputFolder = this.getOutputFolder(packageRoot);
			if (!outputFolder || !existsSync(outputFolder)) {
				log(`[hotReload] Cannot watch ${packageRoot}: no output folder`);
				continue;
			}

			try {
				const watcher = watch(outputFolder, { recursive: true }, (_event, _filename) => {
					this.handleFsEvent(packageRoot);
				});

				watcher.on('error', (err) => {
					log(`[hotReload] Watcher error for ${outputFolder}: ${String(err)}`);
				});

				this.watchers.set(packageRoot, watcher);
				log(`[hotReload] Watching output folder: ${outputFolder}`);
			} catch (err) {
				log(`[hotReload] Failed to watch ${outputFolder}: ${String(err)}`);
			}
		}
	}

	/**
	 * Stop all file watchers.
	 */
	stopWatching(): void {
		for (const [key, watcher] of this.watchers) {
			watcher.close();
			log(`[hotReload] Stopped watching: ${key}`);
		}
		this.watchers.clear();

		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();

		this.onChange = undefined;
	}

	private handleFsEvent(packageRoot: string): void {
		const existing = this.debounceTimers.get(packageRoot);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(() => {
			this.debounceTimers.delete(packageRoot);
			const detection = this.detectOutputChange(packageRoot, 'ext');
			if (detection.changed) {
				log(`[hotReload] File watcher confirmed content change for ${packageRoot}`);
				this.onChange?.(packageRoot);
			} else {
				log(`[hotReload] File watcher event but content unchanged for ${packageRoot}`);
			}
		}, 500);

		this.debounceTimers.set(packageRoot, timer);
	}

	/**
	 * Store a content hash after confirming the change.
	 * Call after deciding to restart to persist the hash for future comparisons.
	 */
	async commitHash(hashKey: 'ext' | 'inspector' | 'mcp', hash: string): Promise<void> {
		const key = hashKey === 'mcp' ? HASH_KEY_MCP : hashKey === 'inspector' ? HASH_KEY_INSPECTOR : HASH_KEY_EXT;
		await this.setStoredHash(key, hash);
		log(`[hotReload] Hash committed (${key}): ${hash.slice(0, 12)}...`);
	}

	/**
	 * Check a single extension path for output changes.
	 * Used by the multi-path extension flow in host-handlers.
	 *
	 * Returns whether output changed. No builds are triggered.
	 * The `rebuilt` field is always false (no build orchestration).
	 * The `buildError` field is always null (no builds).
	 *
	 * IMPORTANT: Does NOT commit the hash. Caller must call commitHash()
	 * after the client successfully restarts.
	 */
	async checkPackageWithScript(packageRoot: string, _buildScript: string): Promise<PackageCheckResult> {
		const detection = this.detectOutputChange(packageRoot, 'ext');
		return {
			buildError: null,
			changed: detection.changed,
			rebuilt: detection.changed
		};
	}

	/**
	 * Main entry point: check both extension and MCP server output.
	 *
	 * Checks if output folders have changed. No builds are triggered.
	 * - If extension output changed: caller handles Client restart
	 * - If MCP output changed: caller handles MCP restart
	 *
	 * IMPORTANT: Does NOT commit hashes. Caller must call commitHash()
	 * after the client/MCP successfully restarts.
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

		// Extension output folder
		const extDetection = this.detectOutputChange(extensionRoot, 'ext');
		result.extChanged = extDetection.changed;
		result.extRebuilt = extDetection.changed;

		// MCP server output folder
		const mcpDetection = this.detectOutputChange(mcpServerRoot, 'mcp');
		result.mcpChanged = mcpDetection.changed;
		result.mcpRebuilt = mcpDetection.changed;

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
