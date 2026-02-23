/**
 * MCP Inspector Lifecycle Manager
 *
 * Manages the Vite dev server for the MCP Inspector frontend (port 6275).
 * Provides start / stop / restart commands with graceful edge-case handling:
 *
 *   Start →  already running?  just open browser
 *   Stop  →  already stopped?  inform the user
 *   Restart → not running?     just start
 *
 * The inspector process is spawned as a detached child so it survives
 * brief extension reloads, but is explicitly killed on extension deactivate.
 */

import { type ChildProcess, execSync, spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import * as vscode from 'vscode';

// ── Constants ────────────────────────────────────────────────────────────────

const INSPECTOR_PORT = 6275;
const INSPECTOR_URL = `http://localhost:${INSPECTOR_PORT}`;
const STARTUP_POLL_INTERVAL_MS = 400;
const STARTUP_TIMEOUT_MS = 15_000;

// ── Module State ─────────────────────────────────────────────────────────────

let inspectorProcess: ChildProcess | null = null;
let logFn: ((message: string) => void) | undefined;

function log(message: string): void {
	if (logFn) {
		logFn(`[inspector-manager] ${message}`);
	}
}

// ── Port Probe ───────────────────────────────────────────────────────────────

async function isPortListening(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const req = http.get(`http://localhost:${port}/`, (res) => {
			res.resume();
			resolve(true);
		});
		req.on('error', () => {
			resolve(false);
		});
		req.setTimeout(1500, () => {
			req.destroy();
			resolve(false);
		});
	});
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

// Force the system browser — vscode.env.openExternal can be intercepted by VS Code's Simple Browser
async function openInBrowser(): Promise<void> {
	const url = INSPECTOR_URL;
	let cmd: string;
	switch (process.platform) {
		case 'win32':
			cmd = `start "" "${url}"`;
			break;
		case 'darwin':
			cmd = `open "${url}"`;
			break;
		default:
			cmd = `xdg-open "${url}"`;
			break;
	}
	try {
		execSync(cmd, { stdio: 'ignore' });
	} catch {
		log('OS open failed — falling back to vscode.env.openExternal');
		await vscode.env.openExternal(vscode.Uri.parse(url));
	}
}

async function startInspector(workspacePath: string): Promise<boolean> {
	const inspectorDir = path.join(workspacePath, 'inspector');

	const alreadyListening = await isPortListening(INSPECTOR_PORT);
	if (alreadyListening) {
		log('Inspector already running — opening browser');
		await openInBrowser();
		return true;
	}

	log(`Spawning Vite dev server in ${inspectorDir}`);

	const isWindows = process.platform === 'win32';

	const child = spawn('npm', ['run', 'dev'], {
		cwd: inspectorDir,
		detached: !isWindows,
		shell: isWindows,
		stdio: 'ignore',
		windowsHide: true
	});

	inspectorProcess = child;

	child.on('error', (err) => {
		log(`Inspector process error: ${err.message}`);
		inspectorProcess = null;
	});

	child.on('exit', (code) => {
		log(`Inspector process exited (code ${code ?? 'unknown'})`);
		inspectorProcess = null;
	});

	// Unref so the extension host can exit even if the inspector is still running
	child.unref();

	// Wait for the Vite server to become responsive
	const ready = await waitForPort(INSPECTOR_PORT, STARTUP_TIMEOUT_MS);
	if (!ready) {
		log('Inspector did not become responsive within timeout');
		vscode.window.showWarningMessage('MCP Inspector started but did not respond in time. It may still be loading — try opening http://localhost:6275 manually.');
		return false;
	}

	log('Inspector is ready — opening browser');
	await openInBrowser();
	return true;
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
	return new Promise((resolve) => {
		const deadline = Date.now() + timeoutMs;

		const poll = () => {
			if (Date.now() > deadline) {
				resolve(false);
				return;
			}
			void isPortListening(port).then((listening) => {
				if (listening) {
					resolve(true);
				} else {
					setTimeout(poll, STARTUP_POLL_INTERVAL_MS);
				}
			});
		};

		poll();
	});
}

async function stopInspector(): Promise<boolean> {
	const listening = await isPortListening(INSPECTOR_PORT);

	if (!listening && !inspectorProcess) {
		return false;
	}

	if (inspectorProcess) {
		log(`Killing inspector process (PID ${inspectorProcess.pid ?? 'unknown'})`);
		try {
			if (process.platform === 'win32') {
				// On Windows, spawn is not detached — use taskkill to kill the tree
				const { pid } = inspectorProcess;
				if (pid) {
					try {
						execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
					} catch {
						// Process may have already exited
					}
				}
			} else {
				// On Unix, the process group was created with detached: true
				const { pid } = inspectorProcess;
				if (pid) {
					process.kill(-pid, 'SIGTERM');
				}
			}
		} catch {
			// Best-effort kill
		}
		inspectorProcess = null;
		log('Inspector process killed');
		return true;
	}

	// Port is listening but we don't own the process (started externally)
	log('Inspector appears to be running but was not started by this extension');
	vscode.window.showWarningMessage('MCP Inspector is running but was not started by this extension. Please stop it manually.');
	return false;
}

// ── Command Handlers ─────────────────────────────────────────────────────────

function createStartCommand(workspacePath: string): () => Promise<void> {
	return async () => {
		log('Start command invoked');
		await startInspector(workspacePath);
	};
}

function createStopCommand(): () => Promise<void> {
	return async () => {
		log('Stop command invoked');
		const stopped = await stopInspector();
		if (stopped) {
			vscode.window.showInformationMessage('MCP Inspector stopped.');
		} else {
			vscode.window.showInformationMessage('MCP Inspector is already stopped.');
		}
	};
}

function createRestartCommand(workspacePath: string): () => Promise<void> {
	return async () => {
		log('Restart command invoked');
		const wasRunning = await isPortListening(INSPECTOR_PORT);

		if (wasRunning) {
			await stopInspector();
			// Brief pause to ensure the port is released
			await new Promise<void>((resolve) => setTimeout(resolve, 1000));
		}

		await startInspector(workspacePath);
	};
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Register the three inspector commands and return a cleanup function.
 * Call this from extension.ts in the Host role section.
 */
export function registerInspectorCommands(context: vscode.ExtensionContext, workspacePath: string, logger?: (message: string) => void): void {
	logFn = logger;

	context.subscriptions.push(
		vscode.commands.registerCommand('devtools.startInspector', createStartCommand(workspacePath)),
		vscode.commands.registerCommand('devtools.stopInspector', createStopCommand()),
		vscode.commands.registerCommand('devtools.restartInspector', createRestartCommand(workspacePath))
	);

	log('Inspector commands registered');
}

/**
 * Forcibly stop the inspector if it's running.
 * Called during extension deactivation.
 */
export async function shutdownInspector(): Promise<void> {
	if (inspectorProcess) {
		log('Extension deactivating — stopping inspector');
		await stopInspector();
	}
}
