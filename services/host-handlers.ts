/**
 * Host RPC Handlers
 *
 * IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
 * We have no access to proposed APIs. Do not add enabledApiProposals
 * to package.json or use --enable-proposed-api flags.
 *
 * Handles lifecycle management for the VS Code DevTools MCP system.
 * The Host is the VSIX-installed extension in the main VS Code window.
 *
 * API Surface (4 methods + Inspector lifecycle):
 * - mcpReady: MCP announces presence → Host spawns/reconnects Client → returns connection info
 * - hotReloadRequired: Extension files changed → Host rebuilds, restarts Client → returns new connection
 * - getStatus: Query current state
 * - takeover: Another VS Code instance wants to become Host
 * - ensureMcpServer: Inspector requests that the MCP server is running
 */

import { type ChildProcess, exec, execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import * as vscode from 'vscode';

import { BrowserService, CdpClient } from './browser';
import { setBrowserService, setReconnectCdpCallback } from './clientDevTools';
import { type ChangeCheckResult, createHotReloadService, getHotReloadService } from './hotReloadService';
import { log, warn } from './logger';

// ── Client State Events ────────────────────────────────────────────────────

const _onClientStateChanged = new vscode.EventEmitter<boolean>();

/** Fires when the client window connects or disconnects. Payload = connected state. */
export const /**
	 *
	 */
	onClientStateChanged = _onClientStateChanged.event;

let lastKnownClientState = false;

// ── Constants ──────────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';
const CLIENT_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';
const MCP_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-mcp' : '/tmp/vscode-devtools-mcp.sock';

// ── Module State ─────────────────────────────────────────────────────────────

/** Launcher PID of the spawned Client (may exit immediately on Windows) */
let launcherPid: null | number = null;

/** Real Electron PID — discovered from CDP port after launch (the actual process to kill) */
let electronPid: null | number = null;

/** Allocated CDP port for the Client browser */
let cdpPort: null | number = null;

/** Inspector port for the Client Extension Host debugger */
let inspectorPort: null | number = null;

/** The Extension Development Host process reference */
let clientProcess: ChildProcess | null = null;

/** Debug session for the Client (simple variable, not Map) */
let currentDebugSession: null | vscode.DebugSession = null;

// ── MCP Server ID Resolution ─────────────────────────────────────────────

// VS Code constructs server definition IDs as: ExtensionIdentifier.toKey(id) + '/' + label
// Our extension ID is 'andyliner.vscode-devtools', label is 'Experimental DevTools'
const MCP_SERVER_ID = 'andyliner.vscode-devtools/Experimental DevTools';

function getMcpServerId(): string {
	return MCP_SERVER_ID;
}

/** Flag to prevent MCP shutdown during hot-reload */
let hotReloadInProgress = false;

// ── Inspector Staleness ──────────────────────────────────────────────────

function markInspectorRecordsStale(): void {
	const IS_WIN = process.platform === 'win32';
	const pipePath = IS_WIN ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';
	const socket = net.createConnection(pipePath, () => {
		const payload = JSON.stringify({
			id: `mark-stale-${Date.now()}`,
			jsonrpc: '2.0',
			method: 'inspector.records/markStale',
			params: {}
		});
		socket.write(`${payload}\n`);
		socket.on('data', () => { socket.destroy(); });
	});
	socket.on('error', () => { /* Inspector backend may not be ready */ });
}

/** Workspace storage path for persisting user-data, set during registerHostHandlers */
let hostStoragePath: null | string = null;

/** Timestamp when Client was started */
let clientStartedAt: null | number = null;

/** Last extension path used for Client launch */
let currentExtensionPath: null | string = null;

/** Last client workspace used for Client launch */
let currentClientWorkspace: null | string = null;

/** True while reconnecting after a Client window reload */
let clientReconnecting = false;

/** Shared reconnect promise to coalesce concurrent calls */
let reconnectPromise: null | Promise<boolean> = null;

/** Active CDP client for browser automation LM tools */
let activeCdpClient: CdpClient | null = null;

/** Optional callback to propagate browser service changes to other bundles (e.g., runtime.js) */
let onBrowserServiceChangedCallback: ((service: BrowserService | null) => void) | null = null;

/**
 * Register a callback to be notified when the BrowserService changes.
 * Used by extension.ts to wire browser service to the runtime bundle.
 */
export function onBrowserServiceChanged(callback: (service: BrowserService | null) => void): void {
	onBrowserServiceChangedCallback = callback;
}

// ── MCP Server Readiness Tracking ───────────────────────────────────────────

/**
 * Deferred promise for MCP server restart. Set when checkForChanges detects
 * MCP source changes (before readyToRestart is called). Resolved when the
 * new MCP server process calls mcpReady. Used by the mcpStatus LM tool.
 */
let mcpReadyDeferred: null | { promise: Promise<void>; resolve: () => void } = null;

function expectMcpRestart(): void {
	let resolver!: () => void; // Definite assignment: Promise executor runs synchronously
	const promise = new Promise<void>((r) => {
		resolver = r;
	});
	mcpReadyDeferred = { promise, resolve: resolver };
	log('[host] MCP restart expected — mcpStatus will block until mcpReady');
}

function signalMcpReady(): void {
	if (mcpReadyDeferred) {
		mcpReadyDeferred.resolve();
		mcpReadyDeferred = null;
		log('[host] MCP ready signaled — mcpStatus unblocked');
	}
}

/**
 * Wait for the MCP server to be ready after a restart.
 * Returns true if ready, false if timed out.
 * If no restart is pending, resolves immediately (server is already running).
 */
export async function waitForMcpReady(timeoutMs: number): Promise<boolean> {
	if (!mcpReadyDeferred) {
		return Promise.resolve(true);
	}
	return Promise.race([
		mcpReadyDeferred.promise.then(() => true),
		new Promise<boolean>((r) =>
			setTimeout(() => {
				r(false);
			}, timeoutMs)
		)
	]);
}

// ── Types ─────────────────────────────────────────────────────────────────

type RegisterHandler = (method: string, handler: (params: Record<string, unknown>) => Promise<unknown> | unknown) => void;

// ── Session Persistence ──────────────────────────────────────────────────────

interface PersistedSession {
	cdpPort: number;
	clientPid: number;
	extensionPath: string;
	inspectorPort: number;
	startedAt: number;
}

function isPersistedSession(value: unknown): value is PersistedSession {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const clientPid = Reflect.get(value, 'clientPid');
	const persistedCdpPort = Reflect.get(value, 'cdpPort');
	const persistedInspectorPort = Reflect.get(value, 'inspectorPort');
	const extensionPath = Reflect.get(value, 'extensionPath');
	const startedAt = Reflect.get(value, 'startedAt');

	return typeof clientPid === 'number' && typeof persistedCdpPort === 'number' && typeof persistedInspectorPort === 'number' && typeof extensionPath === 'string' && typeof startedAt === 'number';
}

// Captured during registerHostHandlers — used by session persistence helpers
let hostWorkspaceState: null | vscode.Memento = null;
const HOST_SESSION_KEY = 'devtools.hostSession';

function getWorkspacePath(): null | string {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

async function notifyMcpClientReconnected(params: { electronPid: null | number; cdpPort: number; inspectorPort: number; at: number }): Promise<void> {
	await new Promise<void>((resolve) => {
		const socket = net.createConnection(MCP_PIPE_PATH);
		let settled = false;

		const done = () => {
			if (settled) {
				return;
			}
			settled = true;
			resolve();
		};

		const timer = setTimeout(() => {
			try {
				socket.destroy();
			} catch {
				// best-effort
			}
			done();
		}, 1500);

		socket.on('connect', () => {
			const payload = {
				jsonrpc: '2.0',
				method: 'client-reconnected',
				params
			};
			socket.write(`${JSON.stringify(payload)}\n`, () => {
				clearTimeout(timer);
				socket.end();
				done();
			});
		});

		socket.on('error', () => {
			clearTimeout(timer);
			done();
		});

		socket.on('close', () => {
			clearTimeout(timer);
			done();
		});
	});
}

function loadPersistedSession(): null | PersistedSession {
	if (!hostWorkspaceState) return null;
	try {
		const data: unknown = hostWorkspaceState.get(HOST_SESSION_KEY);
		if (data && isPersistedSession(data)) {
			return data;
		}
		if (data) {
			log('[host] Ignoring invalid persisted session payload');
		}
	} catch (err) {
		log('[host] Failed to load persisted session:', err);
	}
	return null;
}

function persistSession(session: PersistedSession): void {
	if (!hostWorkspaceState) return;
	try {
		hostWorkspaceState.update(HOST_SESSION_KEY, session);
	} catch (err) {
		log('[host] Failed to persist session:', err);
	}
}

function clearPersistedSession(): void {
	if (!hostWorkspaceState) return;
	try {
		hostWorkspaceState.update(HOST_SESSION_KEY);
	} catch {
		// Ignore cleanup errors
	}
}

// ── Client Health Checks ────────────────────────────────────────────────────

/**
 * Check if a process with the given PID is still running
 */
function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/**
 * Discover the PID of the process listening on the given port.
 *
 * On Windows: uses `netstat -ano` to find LISTENING pid on the CDP port.
 * On Linux/macOS: uses `lsof -ti :port`.
 *
 * This is necessary because Code.exe on Windows is a launcher stub that
 * forks the real Electron binary and exits. The launcher PID is useless
 * for cleanup — we need the real Electron PID.
 */
function discoverElectronPid(port: number): null | number {
	try {
		if (IS_WINDOWS) {
			const out = execSync(`netstat -ano | findstr "LISTENING" | findstr ":${port} "`, { encoding: 'utf8', timeout: 5000 }).trim();
			for (const line of out.split('\n')) {
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 5) {
					const pid = parseInt(parts[parts.length - 1], 10);
					if (pid > 0) {
						return pid;
					}
				}
			}
		} else {
			const out = execSync(`lsof -ti :${port}`, {
				encoding: 'utf8',
				timeout: 5000
			}).trim();
			const pid = parseInt(out.split('\n')[0], 10);
			if (pid > 0) {
				return pid;
			}
		}
	} catch {
		// Command failed — maybe no process or tool not available
	}
	return null;
}

/**
 * Check if a port is responding (TCP probe)
 */
async function isPortResponding(port: number, timeout = 1000): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		const timer = setTimeout(() => {
			socket.destroy();
			resolve(false);
		}, timeout);

		socket.connect(port, '127.0.0.1', () => {
			clearTimeout(timer);
			socket.destroy();
			resolve(true);
		});

		socket.on('error', () => {
			clearTimeout(timer);
			socket.destroy();
			resolve(false);
		});
	});
}

/**
 * Check if the CDP HTTP server is actually ready (not just TCP port open).
 * This is the authoritative check — TCP may be open before the HTTP server is ready.
 */
async function isCdpPortReady(port: number, timeout = 2000): Promise<boolean> {
	const controller = new AbortController();
	const timer = setTimeout(() => {
		controller.abort();
	}, timeout);

	try {
		const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
			signal: controller.signal
		});
		clearTimeout(timer);
		return response.ok;
	} catch {
		clearTimeout(timer);
		return false;
	}
}

/**
 * Check if the Client pipe is connectable
 */
async function isClientPipeConnectable(timeout = 1000): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = net.createConnection(CLIENT_PIPE_PATH, () => {
			socket.end();
			resolve(true);
		});

		const timer = setTimeout(() => {
			socket.destroy();
			resolve(false);
		}, timeout);

		socket.on('error', () => {
			clearTimeout(timer);
			socket.destroy();
			resolve(false);
		});

		socket.on('connect', () => {
			clearTimeout(timer);
		});
	});
}

/**
 * Send a real system.ping RPC to the Client pipe and verify a response.
 * Unlike isClientPipeConnectable(), this catches frozen/blocked clients
 * that accept connections but never process messages.
 */
async function pingClientPipe(timeout = 3000): Promise<boolean> {
	return new Promise((resolve) => {
		let settled = false;
		const finish = (result: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				socket.destroy();
			} catch {
				/* best-effort */
			}
			resolve(result);
		};

		const socket = net.createConnection(CLIENT_PIPE_PATH, () => {
			const reqId = `health-ping-${Date.now()}`;
			const request = `${JSON.stringify({
				id: reqId,
				jsonrpc: '2.0',
				method: 'system.ping',
				params: {}
			})}\n`;
			socket.write(request);
		});

		let response = '';
		socket.setEncoding('utf8');

		socket.on('data', (chunk: string) => {
			response += chunk;
			if (response.includes('\n')) {
				finish(true);
			}
		});

		socket.on('error', () => {
			finish(false);
		});
		socket.on('close', () => {
			finish(false);
		});

		const timer = setTimeout(() => {
			finish(false);
		}, timeout);
	});
}

/**
 * Wait until the Client pipe is no longer connectable (process died, pipe released).
 * Used after stopClient() to avoid race conditions when spawning a new Client.
 */
async function waitForPipeRelease(maxWaitMs = 5000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxWaitMs) {
		const alive = await isClientPipeConnectable(500);
		if (!alive) {
			log(`[host] Client pipe released after ${Date.now() - start}ms`);
			return;
		}
		await sleep(300);
	}
	log(`[host] Client pipe still exists after ${maxWaitMs}ms — proceeding anyway`);
}

/**
 * Comprehensive health check for existing Client.
 * Does NOT rely on launcher PID — on Windows, Code.exe exits immediately.
 * Instead checks the real Electron PID (if known), CDP port, and Client pipe.
 */
async function isClientHealthy(): Promise<boolean> {
	if (!cdpPort) {
		return false;
	}

	// Check real Electron PID (the actual process, not the launcher)
	if (electronPid && !isProcessAlive(electronPid)) {
		log('[host] Real Electron PID no longer alive');
		return false;
	}

	// Check CDP port (authoritative signal — if CDP responds, the process is alive)
	const cdpOk = await isPortResponding(cdpPort);
	if (!cdpOk) {
		log('[host] CDP port not responding');
		return false;
	}

	// If we don't have the real PID yet, try to discover it from the CDP port
	if (!electronPid) {
		const realPid = discoverElectronPid(cdpPort);
		if (realPid) {
			electronPid = realPid;
			log(`[host] Discovered real Electron PID: ${electronPid}`);
		}
	}

	// Check Client pipe responsiveness (not just connectivity)
	const pipeOk = await pingClientPipe(3000);
	if (!pipeOk) {
		log('[host] Client pipe not responding to ping');
		return false;
	}

	return true;
}

// ── Client Spawn & Lifecycle ─────────────────────────────────────────────────

/**
 * Allocate a free port for CDP
 */
async function allocatePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (address && typeof address === 'object') {
				const { port } = address;
				server.close(() => {
					resolve(port);
				});
			} else {
				reject(new Error('Failed to get port from server'));
			}
		});
		server.on('error', reject);
	});
}

/**
 * Get the path to the Electron executable
 */
function getElectronPath(): string {
	// process.execPath in VS Code extension points to the Electron binary
	return process.execPath;
}

/**
 * Spawn the Extension Development Host (Client)
 * @param clientWorkspace - Workspace folder the Client should open (from host config)
 * @param extensionPath - Extension development path (from host config)
 */
async function spawnClient(clientWorkspace: string, extensionPath: string, launchFlags?: Record<string, unknown>): Promise<{ cdpPort: number; userDataDir: string; clientStartedAt: number }> {
	// Allocate ports (CDP for browser debugging + inspector for Extension Host debugging)
	const allocatedCdpPort = await allocatePort();
	const allocatedInspectorPort = await allocatePort();
	log(`[host] Allocated CDP port: ${allocatedCdpPort}, inspector port: ${allocatedInspectorPort}`);

	const electronPath = getElectronPath();

	// User data directory for the Client (persists state, stored in workspace storage)
	const userDataDir = hostStoragePath ? path.join(hostStoragePath, 'user-data') : path.join(clientWorkspace, '.devtools', 'user-data');
	if (!fs.existsSync(userDataDir)) {
		fs.mkdirSync(userDataDir, { recursive: true });
	}

	// Build launch arguments — core flags first
	const args = [
		`--extensionDevelopmentPath=${extensionPath}`,
		`--remote-debugging-port=${allocatedCdpPort}`,
		`--inspect-extensions=${allocatedInspectorPort}`,
		`--user-data-dir=${userDataDir}`,
		'--new-window',
		'--no-sandbox',
		'--disable-gpu-sandbox',
		'--disable-updates'
	];

	// Apply launch flags from MCP config (if provided)
	if (launchFlags) {
		if (launchFlags.skipReleaseNotes) {
			args.push('--skip-release-notes');
		}
		if (launchFlags.skipWelcome) {
			args.push('--skip-welcome');
		}
		if (launchFlags.disableGpu) {
			args.push('--disable-gpu');
		}
		if (launchFlags.disableWorkspaceTrust) {
			args.push('--disable-workspace-trust');
		}
		if (launchFlags.verbose) {
			args.push('--verbose');
		}
		// Extra raw args
		const { extraArgs } = launchFlags;
		if (Array.isArray(extraArgs)) {
			for (const arg of extraArgs) {
				if (typeof arg === 'string') {
					args.push(arg);
				}
			}
		}
	}

	// Client workspace folder — last positional arg
	args.push(clientWorkspace);

	log('[host] Spawning Client:', electronPath);
	log('[host] Spawn args:', JSON.stringify(args, null, 2));

	// Strip environment variables that would make the child VS Code
	// communicate with the parent instance instead of starting fresh.
	// This matches the original working vscode.ts logic.
	const childEnv = { ...process.env };
	delete childEnv.ELECTRON_RUN_AS_NODE;
	delete childEnv.ELECTRON_NO_ASAR;
	for (const key of Object.keys(childEnv)) {
		if (key.startsWith('VSCODE_')) {
			delete childEnv[key];
		}
	}

	// `detached: true` is REQUIRED on Windows because Code.exe is a launcher
	// stub that forks the real Electron binary and immediately exits (code 9).
	// We do NOT call unref() — keep a reference so Node doesn't exit early.
	// Capture stderr for diagnostics — Code.exe may log startup failures.
	const child = spawn(electronPath, args, {
		detached: true,
		env: childEnv,
		stdio: ['ignore', 'ignore', 'pipe']
	});

	if (!child.pid) {
		throw new Error('Failed to spawn Client: no PID');
	}

	// Capture launcher stderr for diagnostics
	if (child.stderr) {
		let stderrOutput = '';
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk: string) => {
			stderrOutput += chunk;
		});
		child.stderr.on('end', () => {
			const trimmed = stderrOutput.trim();
			if (trimmed) {
				log(`[host] Launcher stderr: ${trimmed}`);
			}
		});
	}

	log(`[host] Launcher spawned — PID: ${child.pid} (may exit immediately on Windows)`);

	// Track launcher exit (on Windows this fires almost immediately with code=9)
	child.on('exit', (code, signal) => {
		log(`[host] Launcher process exited: code=${code}, signal=${signal}`);
		if (clientProcess === child) {
			clientProcess = null;
			launcherPid = null;
		}
	});

	child.on('error', (err) => {
		log(`[host] Spawn error: ${err.message}`);
		clientProcess = null;
		launcherPid = null;
	});

	// Store state — note: this is the LAUNCHER PID, not the real Electron PID
	clientProcess = child;
	launcherPid = child.pid;
	electronPid = null; // Will be discovered after CDP port becomes available
	cdpPort = allocatedCdpPort;
	inspectorPort = allocatedInspectorPort;
	clientStartedAt = Date.now();
	currentExtensionPath = extensionPath;
	currentClientWorkspace = clientWorkspace;
	const spawnTimestamp = clientStartedAt;

	// Wait for Client to be ready (poll CDP and pipe — NOT PID)
	log(`[spawn] Waiting for client to be ready on CDP port ${allocatedCdpPort}...`);
	const waitStart = Date.now();
	await waitForClientReady(allocatedCdpPort);
	const waitDuration = Date.now() - waitStart;
	log(`[spawn] Client ready after ${waitDuration}ms`);

	// After CDP is ready, discover the REAL Electron PID from the port.
	// On Windows, Code.exe (launcher) exits immediately — the real Electron
	// process is the one actually listening on the CDP port.
	const realPid = discoverElectronPid(allocatedCdpPort);
	if (realPid) {
		electronPid = realPid;
		log(`[host] Real Electron PID: ${electronPid}`);
	} else {
		log('[host] Warning: could not discover Electron PID — cleanup may be incomplete');
	}

	// Attach debugger to the Client's Extension Host inspector.
	// This lights up the full debug UI: orange status bar, floating toolbar, call stack.
	try {
		log(`[debugger] Attaching debugger to inspector port ${allocatedInspectorPort}...`);
		await attachDebuggerToInspector(allocatedInspectorPort);
		log('[host] Debug session attached — full debug UI active');
		log('[debugger] Debug session attached successfully — full debug UI active');
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(`[host] Warning: debugger attach failed: ${msg}. Continuing without debug UI.`);
		log(`[debugger] WARNING: debugger attach failed: ${msg}. Continuing without debug UI.`);
	}

	// Persist session with REAL Electron PID (not launcher PID)
	persistSession({
		cdpPort: allocatedCdpPort,
		clientPid: electronPid ?? child.pid,
		extensionPath,
		inspectorPort: allocatedInspectorPort,
		startedAt: clientStartedAt
	});

	return { cdpPort: allocatedCdpPort, clientStartedAt: spawnTimestamp, userDataDir };
}

/**
 * Wait for Client to be ready (CDP HTTP server responding + pipe connectable)
 *
 * NOTE: We use isCdpPortReady() which checks the actual CDP HTTP endpoint,
 * not just TCP connectivity. The TCP port may be open before the HTTP server
 * is ready to accept WebSocket connections.
 *
 * Adaptive timeout: if the Client pipe comes UP (extension loaded) but CDP
 * is still DOWN, the Client IS alive and making progress — extend the wait
 * up to `adaptiveMaxMs` to give CDP time to initialize.
 */
async function waitForClientReady(port: number, maxWaitMs = 90_000, adaptiveMaxMs = 120_000): Promise<void> {
	const startTime = Date.now();
	const pollInterval = 500;
	let lastLog = 0;
	let pipeSeenUp = false;

	log(`[host] Waiting for Client to be ready (CDP port=${port}, timeout=${maxWaitMs}ms, adaptiveMax=${adaptiveMaxMs}ms)...`);

	while (true) {
		const elapsed = Date.now() - startTime;
		const effectiveTimeout = pipeSeenUp ? adaptiveMaxMs : maxWaitMs;

		if (elapsed >= effectiveTimeout) {
			break;
		}

		const cdpOk = await isCdpPortReady(port);
		const pipeOk = await isClientPipeConnectable();

		if (cdpOk && pipeOk) {
			const finalElapsed = Date.now() - startTime;
			log(`[host] Client is ready (CDP HTTP + pipe responding) after ${finalElapsed}ms`);
			return;
		}

		if (pipeOk && !pipeSeenUp) {
			pipeSeenUp = true;
			log(`[host] Client pipe is UP after ${elapsed}ms — extending timeout to ${adaptiveMaxMs}ms while waiting for CDP`);
		}

		// Log status every 5 seconds so we can diagnose hangs
		const now = Date.now();
		if (now - lastLog >= 5000) {
			log(`[host] Still waiting for Client (${elapsed}ms elapsed) — CDP: ${cdpOk ? 'UP' : 'DOWN'}, pipe: ${pipeOk ? 'UP' : 'DOWN'}${pipeSeenUp ? ' (adaptive timeout active)' : ''}`);
			lastLog = now;
		}

		await sleep(pollInterval);
	}

	// Final diagnostic before throwing
	const finalCdp = await isCdpPortReady(port);
	const finalPipe = await isClientPipeConnectable();
	const totalElapsed = Date.now() - startTime;
	throw new Error(`Client did not become ready within ${totalElapsed}ms — CDP: ${finalCdp ? 'UP' : 'DOWN'}, pipe: ${finalPipe ? 'UP' : 'DOWN'}`);
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll until a port becomes available (TCP connectable).
 * Used to wait for the Extension Host inspector port before attaching debugger.
 */
async function waitForPort(port: number, timeout = 30000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		if (await isPortResponding(port)) {
			return;
		}
		await sleep(300);
	}
	throw new Error(`Port ${port} did not become available within ${timeout}ms`);
}

async function attachDebuggerToInspector(port: number): Promise<void> {
	log(`[debugger] waitForPort(${port}) starting...`);
	await waitForPort(port);
	log(`[debugger] waitForPort(${port}) completed — port is responding`);

	log(`[debugger] Calling vscode.debug.startDebugging for port ${port}...`);
	const success = await vscode.debug.startDebugging(undefined, {
		autoAttachChildProcesses: false,
		name: `Extension Host (port ${port})`,
		port,
		request: 'attach',
		skipFiles: ['<node_internals>/**'],
		type: 'node'
	});

	if (!success) {
		log(`[debugger] vscode.debug.startDebugging returned FALSE — debug session did not start`);
		throw new Error('vscode.debug.startDebugging returned false — debug session failed to attach');
	}

	log(`[debugger] vscode.debug.startDebugging returned TRUE — debug session should be active`);
}

async function reconnectToClient(maxWaitMs = 60_000): Promise<boolean> {
	if (reconnectPromise) {
		return reconnectPromise;
	}

	reconnectPromise = (async () => {
		if (clientReconnecting) {
			return false;
		}

		if (!cdpPort || !inspectorPort) {
			log('[host] Reconnect skipped: missing cdpPort or inspectorPort');
			return false;
		}

		clientReconnecting = true;
		const started = Date.now();
		log(`[host] Reconnect started (cdp=${cdpPort}, inspector=${inspectorPort})`);

		try {
			while (Date.now() - started < maxWaitMs) {
				const cdpOk = await isCdpPortReady(cdpPort, 2000);
				const pipeOk = await isClientPipeConnectable(2000);
				if (cdpOk && pipeOk) {
					break;
				}
				await sleep(400);
			}

			const cdpAlive = await isCdpPortReady(cdpPort, 2500);
			const pipeAlive = await isClientPipeConnectable(2500);
			if (!cdpAlive || !pipeAlive) {
				log(`[host] Reconnect timed out — cdp=${cdpAlive}, pipe=${pipeAlive}`);
				return false;
			}

			const refreshedPid = discoverElectronPid(cdpPort);
			if (refreshedPid) {
				electronPid = refreshedPid;
				log(`[host] Reconnect discovered Electron PID: ${electronPid}`);
			}

			if (currentDebugSession) {
				try {
					await vscode.debug.stopDebugging(currentDebugSession);
				} catch {
					// session may have already ended
				}
			}

			await attachDebuggerToInspector(inspectorPort);
			log('[host] Reconnect debugger attach complete');

			const pidToPersist = electronPid ?? launcherPid;
			if (pidToPersist && currentExtensionPath && clientStartedAt) {
				persistSession({
					cdpPort,
					clientPid: pidToPersist,
					extensionPath: currentExtensionPath,
					inspectorPort,
					startedAt: clientStartedAt
				});
			}

			void notifyMcpClientReconnected({
				at: Date.now(),
				cdpPort,
				electronPid,
				inspectorPort
			}).catch(() => {
				// best-effort notification
			});

			return true;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log(`[host] Reconnect failed: ${msg}`);
			return false;
		} finally {
			clientReconnecting = false;
		}
	})().finally(() => {
		reconnectPromise = null;
	});

	return reconnectPromise;
}

/**
 * Stop the Client process.
 *
 * On Windows, Code.exe is a launcher stub that exits immediately.
 * We track the REAL Electron PID (discovered from CDP port) and
 * kill its entire process tree with `taskkill /F /T`.
 */
function stopClient(): void {
	let pidToKill = electronPid;

	// Fallback: rediscover from CDP port if we lost the real PID
	if (!pidToKill && cdpPort) {
		pidToKill = discoverElectronPid(cdpPort);
		if (pidToKill) {
			log(`[host] Rediscovered Electron PID ${pidToKill} from CDP port ${cdpPort}`);
		}
	}

	// Kill the real Electron process
	if (pidToKill) {
		try {
			log('[host] Stopping real Electron PID:', pidToKill);
			if (IS_WINDOWS) {
				execSync(`taskkill /F /T /PID ${pidToKill}`, { stdio: 'ignore' });
			} else {
				process.kill(pidToKill, 'SIGKILL');
			}
		} catch {
			// Process may have already exited
		}
	}

	// Also try the launcher PID (may still be alive on non-Windows)
	if (launcherPid && launcherPid !== pidToKill) {
		try {
			if (IS_WINDOWS) {
				execSync(`taskkill /F /T /PID ${launcherPid}`, { stdio: 'ignore' });
			} else {
				process.kill(launcherPid, 'SIGKILL');
			}
		} catch {
			// Process may have already exited
		}
	}

	clientProcess = null;
	launcherPid = null;
	electronPid = null;
	cdpPort = null;
	inspectorPort = null;
	clientStartedAt = null;
	currentExtensionPath = null;
	currentClientWorkspace = null;
	clientReconnecting = false;
	reconnectPromise = null;
	clearPersistedSession();
}

/**
 * Connect the extension's CDP client to the client window for browser automation LM tools.
 * Creates a CdpClient + BrowserService and makes them available via setBrowserService().
 * Registers a WebSocket disconnect callback for instant client death detection.
 */
async function connectCdpClient(port: number): Promise<void> {
	log(`connectCdpClient: Connecting to CDP on port ${port}...`);
	disconnectCdpClient();

	try {
		const client = new CdpClient();
		await client.connect(port);
		activeCdpClient = client;

		// Instant disconnect detection via WebSocket close event
		client.onDisconnect(() => {
			log('[host] CDP WebSocket closed — client window died');
			log('CDP WebSocket closed — client window disconnected');

			// Clean up immediately — no polling needed
			setBrowserService(null);
			onBrowserServiceChangedCallback?.(null);
			activeCdpClient = null;
			lastKnownClientState = false;
			log('[state-fire] connectCdpClient: firing connected=false (websocket closed)');
			_onClientStateChanged.fire(false);
		});

		const service = new BrowserService(client);
		service.initConsoleCollection();
		setBrowserService(service);
		onBrowserServiceChangedCallback?.(service);

		lastKnownClientState = true;
		log('[state-fire] connectCdpClient: firing connected=true');
		_onClientStateChanged.fire(true);

		const msg = `CDP client connected on port ${port} — browser LM tools active`;
		log(`[host] ${msg}`);
		log(msg);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const warning = `CDP client connection failed on port ${port}: ${msg}. Browser LM tools unavailable.`;
		log(`[host] Warning: ${warning}`);
		log(warning);
		disconnectCdpClient();
	}
}

/**
 * Disconnect the extension's CDP client and teardown the BrowserService.
 * Safe to call multiple times (idempotent).
 */
function disconnectCdpClient(): void {
	setBrowserService(null);
	onBrowserServiceChangedCallback?.(null);
	if (activeCdpClient) {
		activeCdpClient.dispose();
		activeCdpClient = null;
		log('[host] CDP client disconnected');
	}
}

// ── RPC Handlers ────────────────────────────────────────────────────────────

/**
 * Register all Host RPC handlers with the bootstrap
 */
export function registerHostHandlers(register: RegisterHandler, context: vscode.ExtensionContext): void {
	log('[host] Registering Host RPC handlers');

	// Capture workspaceState for session persistence helpers
	hostWorkspaceState = context.workspaceState;

	// Capture storage path for user-data directory
	hostStoragePath = context.storageUri?.fsPath ?? null;

	// Initialize the hot reload service (content-hash change detection)
	const hotReloadService = createHotReloadService(context.workspaceState);

	// Register lazy CDP reconnection callback for browser LM tools.
	// NOTE: The reconnect callback is no longer set here because the extension.js and
	// runtime.js bundles have separate clientDevTools module instances. Instead, we export
	// createReconnectCdpCallback() and extension.ts wires it to runtime.js after loading.

	/**
	 * mcpReady — MCP announces it's online
	 * Host spawns Client (or reconnects to existing) and returns connection info
	 */
	register('mcpReady', async (params) => {
		log('[host] mcpReady called with params:', JSON.stringify(params));

		// Signal that the MCP server is ready (unblocks mcpStatus tool if waiting)
		signalMcpReady();

		// MCP tells us where the client workspace and extension are
		const clientWorkspace = typeof params.clientWorkspace === 'string' ? params.clientWorkspace : undefined;
		const extensionPath = typeof params.extensionPath === 'string' ? params.extensionPath : undefined;
		const launchFlags = typeof params.launch === 'object' && params.launch !== null ? (params.launch as Record<string, unknown>) : undefined;
		const forceRestart = typeof params.forceRestart === 'boolean' ? params.forceRestart : false;

		if (!clientWorkspace) {
			throw new Error('mcpReady: clientWorkspace is required');
		}
		if (!extensionPath) {
			throw new Error('mcpReady: extensionPath is required');
		}

		// Check if extension source changed (content hash, not mtime)
		const extCheck = await hotReloadService.checkExtensionOnly(extensionPath);
		if (extCheck.changed && !extCheck.rebuilt) {
			log(`[host] Extension build failed: ${extCheck.buildError ?? 'unknown'}`);
		}

		// Check for existing healthy Client
		const session = loadPersistedSession();
		if (session) {
			electronPid = session.clientPid; // Persisted PID is the real Electron PID
			cdpPort = session.cdpPort;
			inspectorPort = session.inspectorPort;
			currentExtensionPath = session.extensionPath;

			if (forceRestart) {
				// MCP explicitly requested a restart — Client is unresponsive
				log('[host] forceRestart requested — stopping existing Client unconditionally');
				stopClient();
				clearPersistedSession();
				electronPid = null;
				cdpPort = null;
				inspectorPort = null;
				currentExtensionPath = null;
				await waitForPipeRelease();
			} else {
				const healthy = await isClientHealthy();
				if (healthy && !extCheck.changed) {
					log('[host] Existing Client is healthy and build is current, returning connection info');
					const dataDir = hostStoragePath ? path.join(hostStoragePath, 'user-data') : path.join(clientWorkspace, '.devtools', 'user-data');

					// Ensure CDP client is connected for browser automation LM tools
					if (!activeCdpClient?.connected) {
						await connectCdpClient(session.cdpPort);
					}

					return { cdpPort: session.cdpPort, clientStartedAt: session.startedAt, userDataDir: dataDir };
				}

				// Client exists but source changed — restart with fresh code
				if (healthy && extCheck.rebuilt) {
					log('[host] Extension source changed — stopping existing Client to restart with fresh code');
				} else {
					log('[host] Persisted session exists but Client is not healthy');
				}
				stopClient();
				clearPersistedSession();
				electronPid = null;
				cdpPort = null;
				inspectorPort = null;
				currentExtensionPath = null;
				await waitForPipeRelease();
			}
		}

		// Spawn new Client with MCP-provided paths (build is guaranteed up-to-date)
		log(`[host] Spawning new Client — workspace: ${clientWorkspace}, ext: ${extensionPath}`);
		const result = await spawnClient(clientWorkspace, extensionPath, launchFlags);

		// Connect CDP client for browser automation LM tools
		await connectCdpClient(result.cdpPort);

		return { cdpPort: result.cdpPort, clientStartedAt: result.clientStartedAt, userDataDir: result.userDataDir };
	});

	/**
	 * hotReloadRequired — Extension files changed
	 * Host rebuilds, restarts Client, returns new connection info
	 */
	register('hotReloadRequired', async (params) => {
		log('[host] hotReloadRequired called');
		hotReloadInProgress = true;

		const clientWorkspace = typeof params.clientWorkspace === 'string' ? params.clientWorkspace : undefined;
		const extensionPath = typeof params.extensionPath === 'string' ? params.extensionPath : undefined;
		const launchFlags = typeof params.launch === 'object' && params.launch !== null ? (params.launch as Record<string, unknown>) : undefined;

		if (!clientWorkspace || !extensionPath) {
			throw new Error('hotReloadRequired: clientWorkspace and extensionPath are required');
		}

		try {
			// Stop existing Client + teardown CDP client
			disconnectCdpClient();
			stopClient();

			// Wait for pipe to be released before spawning new Client
			await waitForPipeRelease();

			// Ensure build is up-to-date before relaunching (content hash check)
			await hotReloadService.checkExtensionOnly(extensionPath);

			// Spawn fresh Client with latest build
			const result = await spawnClient(clientWorkspace, extensionPath, launchFlags);

			// Reconnect CDP for browser automation LM tools
			await connectCdpClient(result.cdpPort);

			return { cdpPort: result.cdpPort, clientStartedAt: result.clientStartedAt, userDataDir: result.userDataDir };
		} finally {
			hotReloadInProgress = false;
		}
	});

	/**
	 * clientShuttingDown — Client notifies Host before extension host reload/deactivate.
	 * If CDP is still alive, this is likely a reload and we should reconnect.
	 */
	register('clientShuttingDown', async (params) => {
		const reason = typeof params.reason === 'string' ? params.reason : 'unknown';
		log(`[host] clientShuttingDown received: reason=${reason}`);

		if (hotReloadInProgress) {
			return { acknowledged: true, ignored: 'hot-reload', reconnecting: false };
		}

		if (!cdpPort) {
			return { acknowledged: true, ignored: 'no-cdp-port', reconnecting: false };
		}

		const cdpStillAlive = await isCdpPortReady(cdpPort, 2000);
		if (!cdpStillAlive) {
			log('[host] CDP is down after shutdown notification; treating as close');
			return { acknowledged: true, ignored: 'cdp-down', reconnecting: false };
		}

		void reconnectToClient().then((ok) => {
			log(`[host] Background reconnect completed: ${ok ? 'success' : 'failed'}`);
		});

		return { acknowledged: true, reconnecting: true };
	});

	/**
	 * getStatus — Query current state
	 */
	register('getStatus', async (_params) => {
		const healthy = cdpPort ? await isClientHealthy() : false;

		return {
			cdpPort,
			clientConnected: healthy,
			clientReconnecting,
			electronPid,
			hotReloadInProgress,
			inspectorPort,
			launcherPid
		};
	});

	/**
	 * takeover — Another VS Code instance wants to become Host
	 */
	register('takeover', async (params) => {
		const reason = (params.reason as string) || 'unknown';
		log('[host] takeover requested:', reason);

		// Show notification to user
		const choice = await vscode.window.showInformationMessage(`Your DevTools session was overridden: ${reason}`, 'Reclaim');

		if (choice === 'Reclaim') {
			// TODO: Send takeover to new Host
			log('[host] User wants to reclaim, but this is not yet implemented');
		}

		// Gracefully shut down
		stopClient();

		// Note: The pipe server will be stopped separately by the bootstrap
		// when the extension deactivates

		return { acknowledged: true };
	});

	/**
	 * teardown — MCP server is shutting down
	 * Stop Client, clean up debug sessions, release resources
	 */
	register('teardown', async (_params) => {
		log('[host] teardown called — MCP server shutting down');

		// Stop any debug sessions first
		if (currentDebugSession) {
			try {
				await vscode.debug.stopDebugging();
				log('[host] Debug sessions stopped');
			} catch {
				// Session may have already ended
			}
		}

		// Stop the Client process
		stopClient();

		return { stopped: true };
	});

	/**
	 * readyToRestart — MCP server has drained its queue and is ready to be stopped.
	 *
	 * The build was already completed during `checkForChanges`, so this is just:
	 * stop → clear tool cache → start. Near-instant since no build step.
	 *
	 * Deduplication guard: if a restart is already in progress, subsequent calls
	 * wait for the existing restart to complete instead of triggering another.
	 */
	// ── MCP Progress Bridge ─────────────────────────────────
	// Bridges the progress notification started during checkForChanges
	// (rebuild phase) into readyToRestart (stop/clear/start phases).
	// If the MCP process crashes before calling readyToRestart, a 30s
	// safety timeout closes the notification automatically.
	interface McpProgressBridge {
		report: (message: string) => void;
		resolve: () => void;
	}
	let mcpProgressBridge: McpProgressBridge | null = null;

	let restartInProgress: null | Promise<Record<string, unknown>> = null;

	const delay = async (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

	const handleMcpRestart = async (): Promise<Record<string, unknown>> => {
		if (restartInProgress) {
			log('[host] MCP restart already in progress — waiting');
			return restartInProgress;
		}

		const doRestart = async (): Promise<Record<string, unknown>> => {
			log('[host] readyToRestart — stop → clearCache → start');
			// Suppress health monitor during MCP restart to prevent
			// the tethered lifecycle from stopping the server mid-restart
			hotReloadInProgress = true;
			const serverId = getMcpServerId();
			const bridge = mcpProgressBridge;
			mcpProgressBridge = null;

			if (bridge) {
				// Continue in the progress notification started by checkForChanges
				bridge.report('Stopping…');
				try {
					await vscode.commands.executeCommand('workbench.mcp.stopServer', serverId);
					log('[host] MCP server stopped');
				} catch (stopErr) {
					const msg = stopErr instanceof Error ? stopErr.message : String(stopErr);
					log(`[host] MCP stopServer failed: ${msg} — continuing`);
				}

				bridge.report('Clearing tool cache…');
				try {
					await vscode.commands.executeCommand('workbench.mcp.resetCachedTools');
					log('[host] Tool cache cleared');
				} catch (cacheErr) {
					const msg = cacheErr instanceof Error ? cacheErr.message : String(cacheErr);
					log(`[host] resetCachedTools failed: ${msg}`);
				}

				bridge.report('Starting…');
				try {
					await vscode.commands.executeCommand('workbench.mcp.startServer', serverId);
					log('[host] MCP server started');
				} catch (startErr) {
					const msg = startErr instanceof Error ? startErr.message : String(startErr);
					log(`[host] MCP startServer failed: ${msg}`);
					vscode.window.showWarningMessage(`❌ MCP Server failed to start: ${msg}`);
					bridge.resolve();
					return { error: msg, restarted: false };
				}

				bridge.resolve();
				return { restarted: true, toolCacheCleared: true };
			}

			// Fallback: no bridge (e.g., manual restart via command palette)
			return vscode.window.withProgress(
				{
					cancellable: false,
					location: vscode.ProgressLocation.Notification,
					title: 'MCP Server'
				},
				async (progress) => {
					progress.report({ increment: 0, message: 'Stopping…' });
					try {
						await vscode.commands.executeCommand('workbench.mcp.stopServer', serverId);
						log('[host] MCP server stopped');
					} catch (stopErr) {
						const msg = stopErr instanceof Error ? stopErr.message : String(stopErr);
						log(`[host] MCP stopServer failed: ${msg} — continuing`);
					}

					progress.report({ increment: 33, message: 'Clearing tool cache…' });
					try {
						await vscode.commands.executeCommand('workbench.mcp.resetCachedTools');
						log('[host] Tool cache cleared');
					} catch (cacheErr) {
						const msg = cacheErr instanceof Error ? cacheErr.message : String(cacheErr);
						log(`[host] resetCachedTools failed: ${msg}`);
					}

					progress.report({ increment: 33, message: 'Starting…' });
					try {
						await vscode.commands.executeCommand('workbench.mcp.startServer', serverId);
						log('[host] MCP server started');
					} catch (startErr) {
						const msg = startErr instanceof Error ? startErr.message : String(startErr);
						log(`[host] MCP startServer failed: ${msg}`);
						vscode.window.showWarningMessage(`❌ MCP Server failed to start: ${msg}`);
						return { error: msg, restarted: false };
					}

					vscode.window.showInformationMessage('✅ MCP Server restarted');
					return { restarted: true, toolCacheCleared: true };
				}
			);
		};

		try {
			restartInProgress = doRestart();
			return await restartInProgress;
		} finally {
			restartInProgress = null;
			hotReloadInProgress = false;
			log('[host] MCP restart complete — health monitor resumed');
		}
	};

	register('readyToRestart', async () => handleMcpRestart());

	/**
	 * checkForChanges — MCP server asks extension to check for source changes.
	 *
	 * Called per-batch by the RequestPipeline. Detects changes via content
	 * hashing, rebuilds if changed, and shows progress notifications:
	 *   - Extension notification: Rebuilding → Stopping client → Launching client → ✅ Connected
	 *   - MCP Server notification: Rebuilding → Rebuilt ✓ (bridges into readyToRestart)
	 * Both notifications can appear simultaneously when both packages changed.
	 */
	register('checkForChanges', async (params) => {
		const mcpServerRoot = typeof params.mcpServerRoot === 'string' ? params.mcpServerRoot : undefined;
		const extensionPath = typeof params.extensionPath === 'string' ? params.extensionPath : undefined;

		if (!mcpServerRoot || !extensionPath) {
			throw new Error('checkForChanges: mcpServerRoot and extensionPath are required');
		}

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

		// Phase 1: Detect changes (fast hash checks only — no builds yet)
		const extChange = hotReloadService.detectChange(extensionPath, 'ext');
		const mcpChange = hotReloadService.detectChange(mcpServerRoot, 'mcp');
		result.extChanged = extChange.changed;
		result.mcpChanged = mcpChange.changed;

		if (!extChange.changed && !mcpChange.changed) {
			return result;
		}

		// Suppress health monitor during the entire checkForChanges operation.
		// Without this, stopping the client window (Phase 2) causes the health
		// monitor to fire onClientStateChanged(false), which triggers the
		// tethered lifecycle in extension.ts to call workbench.mcp.stopServer,
		// killing the MCP server process that is waiting for this RPC response.
		hotReloadInProgress = true;
		log('[host] checkForChanges: changes detected — suppressing health monitor');

		try {
			// Phase 2: Extension progress notification — rebuild → stop client → launch client
			if (extChange.changed) {
				await vscode.window.withProgress(
					{
						cancellable: false,
						location: vscode.ProgressLocation.Notification,
						title: 'Extension'
					},
					async (progress) => {
						progress.report({ message: 'Rebuilding…' });
						const buildError = await hotReloadService.runBuild(extensionPath, 'compile');
						if (buildError) {
							result.extBuildError = buildError;
							return;
						}

						await hotReloadService.commitHash('ext', extChange.currentHash);
						result.extRebuilt = true;

						// Mark flagged inspector records as stale — extension code changed
						markInspectorRecordsStale();

						// Capture workspace before stopClient clears it
						const workspace = currentClientWorkspace;

						progress.report({ message: 'Stopping client window…' });
						stopClient();
						await waitForPipeRelease();

						if (workspace) {
							progress.report({ message: 'Launching client window…' });
							const spawnResult = await spawnClient(workspace, extensionPath);
							result.extClientReloaded = true;
							result.newCdpPort = spawnResult.cdpPort;
							result.newClientStartedAt = spawnResult.clientStartedAt;
							log(`[host] Client restarted with fresh extension code (cdpPort: ${spawnResult.cdpPort})`);

							vscode.window.showInformationMessage('✅ Extension rebuilt — client reconnected');
						}
					}
				);
			}

			// Phase 3: MCP progress notification — rebuild → bridge to readyToRestart
			if (mcpChange.changed) {
				let buildDoneResolve!: (error: null | string) => void;
				const buildDone = new Promise<null | string>((r) => {
					buildDoneResolve = r;
				});

				let bridgeResolve!: () => void;
				const bridgePromise = new Promise<void>((r) => {
					bridgeResolve = r;
				});

				// Fire-and-forget: the notification stays open until readyToRestart completes
				void vscode.window.withProgress(
					{
						cancellable: false,
						location: vscode.ProgressLocation.Notification,
						title: 'MCP Server'
					},
					async (progress) => {
						progress.report({ message: 'Rebuilding…' });
						const buildError = await hotReloadService.runBuild(mcpServerRoot, 'build');
						buildDoneResolve(buildError);

						if (buildError) {
							return;
						}

						progress.report({ message: 'Rebuilt ✓ — restarting…' });

						// Store bridge so readyToRestart can continue this notification
						mcpProgressBridge = {
							report: (msg: string) => {
								progress.report({ message: msg });
							},
							resolve: bridgeResolve
						};

						// Keep notification open until readyToRestart resolves (or 30s safety timeout)
						const safetyTimeout = setTimeout(() => {
							if (mcpProgressBridge) {
								mcpProgressBridge = null;
								bridgeResolve();
							}
						}, 30_000);

						await bridgePromise;
						clearTimeout(safetyTimeout);

						vscode.window.showInformationMessage('✅ MCP Server restarted');
					}
				);

				// Wait only for the build to finish, then return result to MCP
				const buildError = await buildDone;
				if (buildError) {
					result.mcpBuildError = buildError;
				} else {
					await hotReloadService.commitHash('mcp', mcpChange.currentHash);
					result.mcpRebuilt = true;
					expectMcpRestart();

					// Mark flagged inspector records as stale — tool code changed
					markInspectorRecordsStale();
				}
			}
		} finally {
			// Only reset if no MCP restart is pending — handleMcpRestart owns the
			// flag when MCP changes need stop → clearCache → start cycle
			if (!result.mcpRebuilt) {
				hotReloadInProgress = false;
				log('[host] checkForChanges: complete — health monitor resumed');
			} else {
				log('[host] checkForChanges: MCP restart pending — health monitor stays suppressed until readyToRestart');
			}
		}

		return result;
	});

	/**
	 * ensureMcpServer — Inspector requests that the MCP server is running.
	 * Executes the startMcpServer command (idempotent — no-op if already running).
	 * The Inspector then connects to the MCP server via its named pipe.
	 */
	register('ensureMcpServer', async () => {
		log('[host] ensureMcpServer called from Inspector');
		await vscode.commands.executeCommand('devtools.startMcpServer', { silent: true });
		return { ok: true };
	});

	// Track debug session lifecycle
	context.subscriptions.push(
		vscode.debug.onDidStartDebugSession((session) => {
			currentDebugSession = session;
			log('[host] Debug session started:', session.name);
			log(`[debugger] onDidStartDebugSession fired — session: ${session.name}, id: ${session.id}`);
		}),
		vscode.debug.onDidTerminateDebugSession((session) => {
			if (currentDebugSession?.id === session.id) {
				currentDebugSession = null;
				log('[host] Debug session ended:', session.name);
				log(`[debugger] onDidTerminateDebugSession fired — session: ${session.name}`);
			}
		})
	);
}

/**
 * Check hot-reload state
 */
function isHotReloadInProgress(): boolean {
	return hotReloadInProgress;
}

// ── Client Lifecycle Exports ─────────────────────────────────────────────────

/**
 * Resolve clientWorkspace and extensionPath from VS Code settings.
 * Mirrors the config resolution in mcpServerProvider's buildConfigEnv.
 */
function resolveClientConfig(): null | { clientWorkspace: string; extensionPath: string; launchFlags: Record<string, unknown> } {
	const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspacePath) {
		return null;
	}

	const config = vscode.workspace.getConfiguration('devtools');

	const clientWorkspaceRaw = config.get<string>('clientWorkspace', '');
	const extensionPathRaw = config.get<string>('extensionPath', '.');

	const clientWorkspace = clientWorkspaceRaw ? (path.isAbsolute(clientWorkspaceRaw) ? clientWorkspaceRaw : path.resolve(workspacePath, clientWorkspaceRaw)) : workspacePath;
	const extensionPath = path.isAbsolute(extensionPathRaw) ? extensionPathRaw : path.resolve(workspacePath, extensionPathRaw);

	const launchFlags: Record<string, unknown> = {
		disableGpu: config.get<boolean>('launch.disableGpu', false),
		disableWorkspaceTrust: config.get<boolean>('launch.disableWorkspaceTrust', false),
		extraArgs: config.get<string[]>('launch.extraArgs', []),
		skipReleaseNotes: config.get<boolean>('launch.skipReleaseNotes', true),
		skipWelcome: config.get<boolean>('launch.skipWelcome', true),
		verbose: config.get<boolean>('launch.verbose', false)
	};

	return { clientWorkspace, extensionPath, launchFlags };
}

/**
 * Start the client window immediately. Resolves config from VS Code settings,
 * spawns the Extension Development Host, and connects the CDP client.
 *
 * Called during extension activation to auto-start the client.
 */
export async function startClientWindow(): Promise<boolean> {
	log('startClientWindow: ENTRY');
	log('[host] startClientWindow: ENTRY');

	// Already running?
	if (cdpPort && electronPid) {
		log(`startClientWindow: PATH=already-running (cdpPort=${cdpPort}, pid=${electronPid})`);
		const healthy = await isClientHealthy();
		if (healthy) {
			log('[host] Client window already running and healthy');
			if (!activeCdpClient?.connected) {
				await connectCdpClient(cdpPort);
			}
			if (!activeCdpClient?.connected) {
				log('Client window healthy but CDP connection failed — browser LM tools unavailable until reconnection');
			}
			lastKnownClientState = true;
			log('[state-fire] startClientWindow: firing connected=true (already-running path)');
			_onClientStateChanged.fire(true);
			return true;
		}
		// Not healthy — clean up and respawn
		stopClient();
	}

	// Try persisted session first
	const session = loadPersistedSession();
	log(`startClientWindow: PATH=persisted-session (session=${session ? 'FOUND' : 'NULL'})`);
	if (session) {
		electronPid = session.clientPid;
		cdpPort = session.cdpPort;
		inspectorPort = session.inspectorPort;
		currentExtensionPath = session.extensionPath;

		log(`startClientWindow: Checking persisted session health (pid=${session.clientPid}, cdpPort=${session.cdpPort})`);
		const healthy = await isClientHealthy();
		log(`startClientWindow: Persisted session healthy=${healthy}`);
		if (healthy) {
			log('[host] Reconnected to persisted client session');
			log(`Reconnected to persisted client session (cdpPort: ${session.cdpPort})`);
			await connectCdpClient(session.cdpPort);
			if (!activeCdpClient?.connected) {
				log('Client session healthy but CDP connection failed — browser LM tools will retry on first use');
			}
			lastKnownClientState = true;
			log('[state-fire] startClientWindow: firing connected=true (persisted-session path)');
			_onClientStateChanged.fire(true);
			return true;
		}
		// Stale session — clean up
		stopClient();
		await waitForPipeRelease();
	}

	const resolved = resolveClientConfig();
	log(`startClientWindow: PATH=spawn (resolved=${resolved ? 'OK' : 'NULL'})`);
	if (!resolved) {
		log('[host] Cannot auto-start client: no workspace folder or config');
		log('startClientWindow: FAILED — no workspace folder or config');
		return false;
	}

	try {
		log('[host] Auto-starting client window...');
		log(`startClientWindow: Spawning client window...`);
		const result = await spawnClient(resolved.clientWorkspace, resolved.extensionPath, resolved.launchFlags);
		log(`startClientWindow: Client spawned, connecting CDP on port ${result.cdpPort}...`);
		await connectCdpClient(result.cdpPort);
		log(`startClientWindow: CDP connection attempt complete, activeCdpClient.connected=${activeCdpClient?.connected}`);
		log(`[host] Client window auto-started successfully (cdpPort: ${result.cdpPort})`);
		lastKnownClientState = true;
		log('[state-fire] startClientWindow: firing connected=true (spawn path)');
		_onClientStateChanged.fire(true);
		return true;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(`[host] Failed to auto-start client window: ${msg}`);
		log(`startClientWindow: FAILED — ${msg}`);
		return false;
	}
}

/**
 * Stop the client window and disconnect CDP.
 */
export function stopClientWindow(): void {
	disconnectCdpClient();
	stopClient();
	lastKnownClientState = false;
	log('[state-fire] stopClientWindow: firing connected=false');
	_onClientStateChanged.fire(false);
}

/**
 * Returns whether the client window is currently connected (fast, no I/O).
 */
export function isClientWindowConnected(): boolean {
	return lastKnownClientState;
}

/**
 * Creates the lazy CDP reconnection callback for wiring to runtime.js bundle.
 * Called by extension.ts after loading the runtime module to bridge the bundle gap.
 */
export function createReconnectCdpCallback(): () => Promise<boolean> {
	return async () => {
		log('[host] lazyReconnectCallback: INVOKED');
		log('lazyReconnectCallback: Attempting CDP reconnection...');

		const session = loadPersistedSession();
		log(`lazyReconnectCallback: session=${session ? `FOUND(cdpPort=${session.cdpPort})` : 'NULL'}`);
		if (!session?.cdpPort) return false;

		const healthy = await isClientHealthy();
		log(`lazyReconnectCallback: isClientHealthy=${healthy}`);
		if (!healthy) return false;

		// Restore module state from persisted session
		if (!cdpPort) {
			electronPid = session.clientPid;
			cdpPort = session.cdpPort;
			inspectorPort = session.inspectorPort;
			currentExtensionPath = session.extensionPath;
		}

		log(`lazyReconnectCallback: Calling connectCdpClient(${session.cdpPort})...`);
		await connectCdpClient(session.cdpPort);
		const result = activeCdpClient?.connected === true;
		log(`lazyReconnectCallback: RESULT=${result}`);
		return result;
	};
}

/**
 * Export for deactivate cleanup
 */
export function cleanup(): void {
	disconnectCdpClient();
	stopClient();
	_onClientStateChanged.dispose();
}
