/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MCP Inspector launcher that mirrors the extension's buildConfigEnv() logic.
 *
 * Reads devtools.* settings from .vscode/settings.json in the host workspace,
 * resolves all paths (same as mcpServerProvider.ts), builds DEVTOOLS_CONFIG,
 * then launches the MCP inspector with that env var set so the MCP server
 * receives a fully-configured context — identical to how VS Code spawns it.
 */

import {existsSync, readFileSync} from 'node:fs';
import {isAbsolute, resolve, dirname} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// mcp-server/scripts → mcp-server → vscode-devtools (host workspace root)
const serverDir = dirname(scriptDir);
const hostWorkspace = dirname(serverDir);

// ── Read .vscode/settings.json ───────────────────────────

/** @type {Record<string, unknown>} */
let settings = {};

const settingsPath = resolve(hostWorkspace, '.vscode', 'settings.json');
if (existsSync(settingsPath)) {
	try {
		settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
		console.log(`[inspect] Loaded settings from ${settingsPath}`);
	} catch (/** @type {unknown} */ error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.warn(`[inspect] Could not parse .vscode/settings.json: ${msg} — using defaults`);
	}
} else {
	console.log(`[inspect] No .vscode/settings.json found at ${settingsPath} — using defaults`);
}

// ── Build DEVTOOLS_CONFIG (mirrors mcpServerProvider.ts buildConfigEnv) ─────

/**
 * Get a setting value with a fallback default.
 * @template T
 * @param {string} key
 * @param {T} defaultValue
 * @returns {T}
 */
function get(key, defaultValue) {
	const value = settings[key];
	return value !== undefined ? /** @type {T} */ (value) : defaultValue;
}

const clientWorkspaceRaw = get('devtools.clientWorkspace', '');
const extensionPathRaw = get('devtools.extensionPath', '.');

const clientWorkspace = clientWorkspaceRaw
	? (isAbsolute(clientWorkspaceRaw)
		? clientWorkspaceRaw
		: resolve(hostWorkspace, clientWorkspaceRaw))
	: hostWorkspace;

const extensionPath = isAbsolute(extensionPathRaw)
	? extensionPathRaw
	: resolve(hostWorkspace, extensionPathRaw);

const devtoolsConfig = {
	clientWorkspace,
	extensionPath,
	launch: {
		skipReleaseNotes: get('devtools.launch.skipReleaseNotes', true),
		skipWelcome:      get('devtools.launch.skipWelcome', true),
		disableGpu:       get('devtools.launch.disableGpu', false),
		disableWorkspaceTrust: get('devtools.launch.disableWorkspaceTrust', false),
		verbose:          get('devtools.launch.verbose', false),
		extraArgs:        get('devtools.launch.extraArgs', []),
	},
	hotReload: {
		enabled:          get('devtools.hotReload.enabled', true),
		mcpStatusTimeout: get('devtools.hotReload.mcpStatusTimeout', 60_000),
	},
};

console.log('[inspect] DEVTOOLS_CONFIG:');
console.log(`  clientWorkspace : ${devtoolsConfig.clientWorkspace}`);
console.log(`  extensionPath   : ${devtoolsConfig.extensionPath}`);

// ── Launch Inspector ─────────────────────────────────────

// On Windows, npx resolves via a .cmd shim so we must use shell:true.
// To avoid the "args with shell" deprecation warning we pass the full
// command + args as a single string and an empty args array.
const inspectorCommand = 'npx @modelcontextprotocol/inspector node mcp-server/build/src/index.js';

const inspector = spawn(inspectorCommand, [], {
	cwd: hostWorkspace,
	stdio: 'inherit',
	shell: true,
	env: {
		...process.env,
		DEVTOOLS_CONFIG: JSON.stringify(devtoolsConfig),
	},
});

inspector.on('error', (/** @type {Error} */ err) => {
	console.error(`[inspect] Failed to launch inspector: ${err.message}`);
	process.exit(1);
});

inspector.on('exit', (/** @type {number | null} */ code) => {
	process.exit(code ?? 0);
});
