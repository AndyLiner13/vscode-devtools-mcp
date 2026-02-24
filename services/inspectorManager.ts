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

const STARTUP_POLL_INTERVAL_MS = 400;
const STARTUP_TIMEOUT_MS = 15_000;
const PORT_PARSE_REGEX = /^INSPECTOR_PORT=(\d+)$/m;

// ── Module State ─────────────────────────────────────────────────────────────

let inspectorProcess: ChildProcess | null = null;
let currentInspectorPort: number | null = null;
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
async function openInBrowser(port: number): Promise<void> {
	const url = `http://localhost:${port}`;
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

/**
 * Parse the port from stdout output.
 * Looks for a line like: INSPECTOR_PORT=47619
 */
function parsePortFromOutput(output: string): number | null {
	const match = PORT_PARSE_REGEX.exec(output);
	if (match) {
		const port = parseInt(match[1], 10);
		if (!isNaN(port) && port > 0 && port < 65536) {
			return port;
		}
	}
	return null;
}

async function startInspector(workspacePath: string): Promise<boolean> {
	const inspectorDir = path.join(workspacePath, 'inspector');

	// If we already have a running inspector, just open the browser
	if (currentInspectorPort && await isPortListening(currentInspectorPort)) {
		log(`Inspector already running on port ${currentInspectorPort} — opening browser`);
		await openInBrowser(currentInspectorPort);
		return true;
	}

	log(`Spawning Vite dev server in ${inspectorDir}`);

	const isWindows = process.platform === 'win32';

	// Capture stdout to parse the port
	const child = spawn('npm', ['run', 'dev'], {
		cwd: inspectorDir,
		detached: !isWindows,
		shell: isWindows,
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true
	});

	inspectorProcess = child;

	// Collect stdout to parse the port
	let stdoutBuffer = '';
	let portResolved = false;

	const portPromise = new Promise<number | null>((resolve) => {
		const timeout = setTimeout(() => {
			if (!portResolved) {
				portResolved = true;
				resolve(null);
			}
		}, STARTUP_TIMEOUT_MS);

		child.stdout?.on('data', (data: Buffer) => {
			const chunk = data.toString();
			stdoutBuffer += chunk;
			log(`[stdout] ${chunk.trim()}`);

			if (!portResolved) {
				const port = parsePortFromOutput(stdoutBuffer);
				if (port) {
					portResolved = true;
					clearTimeout(timeout);
					resolve(port);
				}
			}
		});

		child.stderr?.on('data', (data: Buffer) => {
			log(`[stderr] ${data.toString().trim()}`);
		});

		child.on('error', () => {
			if (!portResolved) {
				portResolved = true;
				clearTimeout(timeout);
				resolve(null);
			}
		});

		child.on('exit', () => {
			if (!portResolved) {
				portResolved = true;
				clearTimeout(timeout);
				resolve(null);
			}
		});
	});

	child.on('error', (err) => {
		log(`Inspector process error: ${err.message}`);
		inspectorProcess = null;
		currentInspectorPort = null;
	});

	child.on('exit', (code) => {
		log(`Inspector process exited (code ${code ?? 'unknown'})`);
		inspectorProcess = null;
		currentInspectorPort = null;
	});

	// Unref so the extension host can exit even if the inspector is still running
	child.unref();

	// Wait for the port to be parsed from stdout
	const port = await portPromise;
	if (!port) {
		log('Failed to parse port from inspector output');
		vscode.window.showWarningMessage('MCP Inspector failed to start — could not determine port.');
		return false;
	}

	currentInspectorPort = port;
	log(`Inspector port parsed: ${port}`);

	// Wait for the Vite server to become responsive
	const ready = await waitForPort(port, STARTUP_TIMEOUT_MS);
	if (!ready) {
		log('Inspector did not become responsive within timeout');
		vscode.window.showWarningMessage(`MCP Inspector started but did not respond in time. Try opening http://localhost:${port} manually.`);
		return false;
	}

	log('Inspector is ready — opening browser');
	await openInBrowser(port);
	return true;
}

/**
 * Ensure the Vite dev server is running without opening the browser.
 * Idempotent — does nothing if already listening.
 */
async function ensureInspectorRunning(workspacePath: string): Promise<boolean> {
	// If we already have a running inspector, check if it's still alive
	if (currentInspectorPort && await isPortListening(currentInspectorPort)) {
		log(`Inspector already running on port ${currentInspectorPort} — no action needed`);
		return true;
	}

	const inspectorDir = path.join(workspacePath, 'inspector');
	log(`Auto-starting Vite dev server in ${inspectorDir}`);

	const isWindows = process.platform === 'win32';

	// Capture stdout to parse the port
	const child = spawn('npm', ['run', 'dev'], {
		cwd: inspectorDir,
		detached: !isWindows,
		shell: isWindows,
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true
	});

	inspectorProcess = child;

	// Collect stdout to parse the port
	let stdoutBuffer = '';
	let portResolved = false;

	const portPromise = new Promise<number | null>((resolve) => {
		const timeout = setTimeout(() => {
			if (!portResolved) {
				portResolved = true;
				resolve(null);
			}
		}, STARTUP_TIMEOUT_MS);

		child.stdout?.on('data', (data: Buffer) => {
			const chunk = data.toString();
			stdoutBuffer += chunk;

			if (!portResolved) {
				const port = parsePortFromOutput(stdoutBuffer);
				if (port) {
					portResolved = true;
					clearTimeout(timeout);
					resolve(port);
				}
			}
		});

		child.on('error', () => {
			if (!portResolved) {
				portResolved = true;
				clearTimeout(timeout);
				resolve(null);
			}
		});

		child.on('exit', () => {
			if (!portResolved) {
				portResolved = true;
				clearTimeout(timeout);
				resolve(null);
			}
		});
	});

	child.on('error', (err) => {
		log(`Inspector process error: ${err.message}`);
		inspectorProcess = null;
		currentInspectorPort = null;
	});

	child.on('exit', (code) => {
		log(`Inspector process exited (code ${code ?? 'unknown'})`);
		inspectorProcess = null;
		currentInspectorPort = null;
	});

	child.unref();

	// Wait for the port to be parsed from stdout
	const port = await portPromise;
	if (!port) {
		log('Inspector auto-start: failed to parse port from output');
		return false;
	}

	currentInspectorPort = port;
	log(`Inspector auto-start: port parsed as ${port}`);

	const ready = await waitForPort(port, STARTUP_TIMEOUT_MS);
	if (!ready) {
		log('Inspector auto-start: did not become responsive within timeout');
		return false;
	}

	log('Inspector auto-start: Vite dev server is ready');
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
	// Check if we have a known port to check
	const portToCheck = currentInspectorPort;
	const listening = portToCheck ? await isPortListening(portToCheck) : false;

	if (!listening && !inspectorProcess) {
		currentInspectorPort = null;
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
		currentInspectorPort = null;
		log('Inspector process killed');
		return true;
	}

	// Port is listening but we don't own the process — kill whatever is on the port
	if (portToCheck) {
		log(`Inspector running on port ${portToCheck} but not owned by this extension — killing process on port`);
		try {
			if (process.platform === 'win32') {
				// Find PID listening on the inspector port and kill it
				const output = execSync(`netstat -ano | findstr LISTENING | findstr :${portToCheck}`, { encoding: 'utf8' });
				const pids = new Set<string>();
				for (const line of output.split('\n')) {
					const parts = line.trim().split(/\s+/);
					const pid = parts[parts.length - 1];
					if (pid && /^\d+$/.test(pid) && pid !== '0') {
						pids.add(pid);
					}
				}
				for (const pid of pids) {
					try {
						execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
					} catch {
						// process may have already exited
					}
				}
			} else {
				execSync(`lsof -ti:${portToCheck} | xargs kill -9`, { stdio: 'ignore' });
			}
			log('Killed external inspector process');
			currentInspectorPort = null;
			return true;
		} catch {
			log('Failed to kill external inspector process');
			return false;
		}
	}

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
		const wasRunning = currentInspectorPort && await isPortListening(currentInspectorPort);

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
 * Ensure the inspector Vite dev server is running (auto-start on activation).
 * Does not open the browser — just ensures the server process is alive.
 */
export { ensureInspectorRunning };

/**
 * Get the current inspector port if running, or null if not running.
 */
export function getInspectorPort(): number | null {
	return currentInspectorPort;
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
