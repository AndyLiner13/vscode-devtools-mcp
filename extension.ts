/**
 * VS Code DevTools Extension - Entry Point
 *
 * IMPORTANT: This extension does NOT use any VS Code proposed APIs.
 * DO NOT add enabledApiProposals to package.json or use --enable-proposed-api.
 * We have no access to proposed APIs and attempting to use them causes Safe Mode.
 *
 * This extension uses a pipe-based role detection system:
 * - Tries to create Host pipe → success = this is the Host
 * - Host pipe exists (EADDRINUSE) → this is the Client
 *
 * The bootstrap (bootstrap.js) provides a Safe Mode guarantee:
 * even if handler code fails to compile, the pipe server responds to ping.
 */

import net from 'node:net';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as vscode from 'vscode';

import * as bootstrap from './bootstrap';
import pkg from './package.json';
import { startWorker, stopWorker } from './services/codebase/codebase-worker-proxy';
import { registerInspectorPanel } from './services/inspector-panel';
import { initInspectorChannel, initMainChannel, log } from './services/logger';
import { registerMcpServerProvider } from './services/mcpServerProvider';

// VS Code constructs server definition IDs as: ExtensionIdentifier.toKey(id) + '/' + label
const MCP_SERVER_DEF_ID = 'andyliner.vscode-devtools/Experimental DevTools';
const MCP_PROVIDER_ID = 'devtools.mcp-server';

// ── Constants ────────────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';
const HOST_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-host' : '/tmp/vscode-devtools-host.sock';
const CLIENT_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';

// ── Module State ─────────────────────────────────────────────────────────────

interface RuntimeModule {
	activate: (context: vscode.ExtensionContext) => Promise<void>;
	deactivate: () => Promise<void>;
	wireBrowserService: (service: null | unknown) => void;
	wireReconnectCdpCallback: (callback: () => Promise<boolean>) => void;
}

let runtimeModule: RuntimeModule | undefined;
let outputChannel: vscode.OutputChannel;
let currentRole: 'client' | 'host' | undefined;
let hostHandlersCleanup: (() => void) | undefined;
let clientHandlersCleanup: undefined | vscode.Disposable;
let reconnectCdpCallbackForRuntime: (() => Promise<boolean>) | undefined;

async function notifyHostOfShutdown(reason: string): Promise<void> {
	await new Promise<void>((resolve) => {
		const socket = net.createConnection(HOST_PIPE_PATH);
		let settled = false;

		const finish = () => {
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
			finish();
		}, 2000);

		socket.on('connect', () => {
			const payload = {
				jsonrpc: '2.0',
				method: 'clientShuttingDown',
				params: {
					at: Date.now(),
					reason
				}
			};
			try {
				socket.write(`${JSON.stringify(payload)}\n`, () => {
					clearTimeout(timer);
					socket.end();
					finish();
				});
			} catch {
				clearTimeout(timer);
				finish();
			}
		});

		socket.on('error', () => {
			clearTimeout(timer);
			finish();
		});

		socket.on('close', () => {
			clearTimeout(timer);
			finish();
		});
	});
}

// ── Activation ───────────────────────────────────────────────────────────────

export async function activate(context: vscode.ExtensionContext) {
	// Output channel for all logging
	outputChannel = vscode.window.createOutputChannel('devtools');
	context.subscriptions.push(outputChannel);
	initMainChannel(outputChannel);

	log('VS Code DevTools extension activating...');

	// Register the Inspector WebView serializer synchronously — MUST happen
	// before any `await` so VS Code can restore the panel across reloads.
	const inspectorPanel = registerInspectorPanel(context);
	log('Inspector WebView panel registered (serializer active)');

	// ========================================================================
	// Status Bar (always visible — reflects MCP connection state for Host)
	// ========================================================================

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);

	const version = pkg.version || 'unknown';
	statusBarItem.text = '$(debug-disconnect) VS Code DevTools';
	statusBarItem.tooltip = `VS Code DevTools v${version}`;
	statusBarItem.show();

	/** Update the status bar to reflect MCP / connection state (Host only). */
	function updateStatusBar(state: 'connected' | 'connecting' | 'disconnected' | 'safe-mode', detail?: string): void {
		log(`[status-bar] Updating to: ${state}${detail ? ` (${detail})` : ''}`);
		switch (state) {
			case 'connected': {
				statusBarItem.text = '$(debug-connected) VS Code DevTools Host';
				statusBarItem.tooltip = `VS Code DevTools v${version}\nRole: Host\nClient Window: Connected\nMCP Server: Enabled\nClick to toggle`;
				statusBarItem.command = 'devtools.toggleMcpServer';
				statusBarItem.backgroundColor = undefined;
				break;
			}
			case 'connecting':
				statusBarItem.text = '$(debug-disconnect) VS Code DevTools Host';
				statusBarItem.tooltip = `VS Code DevTools v${version}\nRole: Host\nClient Window: Connecting...\nMCP Server: Starting...`;
				statusBarItem.command = undefined;
				statusBarItem.backgroundColor = undefined;
				break;
			case 'disconnected':
				statusBarItem.text = '$(debug-disconnect) VS Code DevTools Host';
				statusBarItem.tooltip = `VS Code DevTools v${version}\nRole: Host\nClient Window: Disconnected\nMCP Server: Disabled\nClick to toggle`;
				statusBarItem.command = 'devtools.toggleMcpServer';
				statusBarItem.backgroundColor = undefined;
				break;
			case 'safe-mode':
				statusBarItem.text = `$(warning) VS Code DevTools ${currentRole ?? ''} Safe Mode`;
				statusBarItem.tooltip = `VS Code DevTools v${version} — SAFE MODE\n\n${detail ?? ''}`;
				statusBarItem.command = undefined;
				statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
				break;
		}
	}

	// ========================================================================
	// Step 1: Role Detection via Pipe Availability
	// ========================================================================

	try {
		// Try to claim the Host pipe
		await bootstrap.startServer(HOST_PIPE_PATH);
		currentRole = 'host';
		log(`Claimed Host pipe @ ${HOST_PIPE_PATH} — this instance is the HOST`);
		updateStatusBar('disconnected');
	} catch (err: unknown) {
		const error = err as NodeJS.ErrnoException;
		if (error.code === 'EADDRINUSE') {
			// Host pipe exists → we're the Client
			// Try to claim the Client pipe — may need retries if the previous
			// Client was just killed and the OS hasn't released the pipe yet
			let clientPipeClaimed = false;
			const MAX_PIPE_RETRIES = 6;
			for (let attempt = 1; attempt <= MAX_PIPE_RETRIES; attempt++) {
				try {
					await bootstrap.startServer(CLIENT_PIPE_PATH);
					clientPipeClaimed = true;
					break;
				} catch (clientErr: unknown) {
					const clientError = clientErr as NodeJS.ErrnoException;
					if (clientError.code !== 'EADDRINUSE') {
						throw clientErr;
					}
					if (attempt < MAX_PIPE_RETRIES) {
						log(`Client pipe EADDRINUSE — retry ${attempt}/${MAX_PIPE_RETRIES} (waiting ${attempt * 500}ms for pipe release)`);
						await new Promise((resolve) => setTimeout(resolve, attempt * 500));
					}
				}
			}

			if (!clientPipeClaimed) {
				// Exhausted retries — genuine session conflict
				log('Session conflict: Both Host and Client pipes already exist after retries');
				await showSessionConflictNotification();
				return;
			}

			currentRole = 'client';
			log(`Host pipe exists — claimed Client pipe @ ${CLIENT_PIPE_PATH} — this instance is the CLIENT`);
			statusBarItem.text = '$(debug-connected) VS Code DevTools Client';
			statusBarItem.tooltip = `VS Code DevTools v${version}\nRole: Client\nPipe: ${CLIENT_PIPE_PATH}`;
			statusBarItem.command = undefined;
		} else {
			throw err;
		}
	}

	// ========================================================================
	// Step 2: Load Role-Specific Handlers
	// ========================================================================

	try {
		if (currentRole === 'host') {
			// Dynamic import keeps host-handlers out of the static dependency graph.
			// If it fails to compile, the extension still works in Safe Mode.
			log('Loading host-handlers module...');
			const { cleanup, createReconnectCdpCallback, onBrowserServiceChanged, onClientStateChanged, registerHostHandlers, startClientWindow, stopClientWindow } = await import('./services/host-handlers');
			log('host-handlers module loaded, registering handlers...');
			registerHostHandlers(bootstrap.registerHandler, context);
			hostHandlersCleanup = cleanup;

			// Safety net: kill spawned processes if the extension host exits without
			// deactivate() running (crash, force-close, timeout). stopClient() inside
			// cleanup() uses execSync which is safe in synchronous 'exit' handlers.
			process.on('exit', () => {
				if (hostHandlersCleanup) {
					hostHandlersCleanup();
					hostHandlersCleanup = undefined;
				}
			});

			// Save the callback for wiring to runtime after it loads
			reconnectCdpCallbackForRuntime = createReconnectCdpCallback();

			// Register a callback to propagate browser service changes to runtime bundle
			// This callback will be invoked when runtime loads and sets up runtimeModule
			onBrowserServiceChanged((service: unknown) => {
				if (runtimeModule) {
					runtimeModule.wireBrowserService(service);
					log(`Browser service ${service ? 'connected to' : 'disconnected from'} runtime bundle`);
				}
			});

			log('Host handlers registered, CDP reconnect callback created');

			// Register the MCP server provider so Copilot discovers it automatically
			const mcpProvider = registerMcpServerProvider(context);
			log(`MCP server provider registered (enabled: ${mcpProvider.enabled})`);

			// Listen for settings changes and refresh MCP server definitions
			context.subscriptions.push(
				vscode.workspace.onDidChangeConfiguration((e) => {
					if (e.affectsConfiguration('devtools')) {
						mcpProvider.refresh();
						log('Settings changed — MCP server definitions refreshed');
					}
				})
			);

			// ── MCP Server Lifecycle Commands ──────────────────────────────────
			context.subscriptions.push(
				vscode.commands.registerCommand('devtools.startMcpServer', async (options?: { silent?: boolean }) => {
					if (mcpProvider.enabled) {
						log('Start MCP Server: already enabled — ensuring server is running');
						if (!options?.silent) {
							vscode.window.showInformationMessage('MCP Server is already running.');
						}
						// Re-fire start in case the server crashed while enabled
						void startClientWindow();
						void vscode.commands.executeCommand(
							'workbench.mcp.startServer',
							MCP_SERVER_DEF_ID,
							{ waitForLiveTools: true },
						);
						return;
					}
					log('Start MCP Server: enabling provider (triggers tethered lifecycle)');
					mcpProvider.setEnabled(true);
				}),
				vscode.commands.registerCommand('devtools.stopMcpServer', () => {
					if (!mcpProvider.enabled) {
						log('Stop MCP Server: already stopped');
						vscode.window.showInformationMessage('MCP Server is already stopped.');
						return;
					}
					log('Stop MCP Server: disabling provider (triggers tethered lifecycle)');
					mcpProvider.setEnabled(false);
				}),
				vscode.commands.registerCommand('devtools.restartMcpServer', async () => {
					log('Restart MCP Server invoked');
					if (mcpProvider.enabled) {
						mcpProvider.setEnabled(false);
						await new Promise<void>((r) => setTimeout(r, 2000));
					}
					mcpProvider.setEnabled(true);
				}),
			);
			log('MCP Server lifecycle commands registered');

			// ── Tethered Lifecycle: Client Window ↔ MCP Server ──────────────────
			// The client window and MCP server are a single entity:
			// - Extension activation → start both immediately
			// - Client dies → stop MCP server (keeps server registered for restart)
			// - MCP toggled off → stop client window
			// - MCP toggled on → start client window

			// Track whether WE are driving a toggle to avoid recursive loops
			let tetheredAction = false;

			// When client state changes (health monitor fires), update status bar and MCP
			context.subscriptions.push(
				onClientStateChanged((connected: boolean) => {
					if (tetheredAction) {
						log('Tethered lifecycle: ignoring state change (tethered action in progress)');
						return;
					}
					if (connected) {
						updateStatusBar('connected');
						log('Client window connected — ensuring MCP server is running');

						// Restore Inspector panel if it was open before reload
						if (inspectorPanel.wasOpen && !inspectorPanel.isVisible) {
							log('Restoring Inspector panel (was open before reload)');
							inspectorPanel.show();
						}

						tetheredAction = true;
						void vscode.commands.executeCommand('workbench.mcp.startServer', MCP_SERVER_DEF_ID, { waitForLiveTools: true }).then(
							() => {
								log('Tethered lifecycle: MCP server started/confirmed running');
								tetheredAction = false;
							},
							(err: unknown) => {
								const msg = err instanceof Error ? err.message : String(err);
								log(`Tethered lifecycle: MCP startServer failed: ${msg}`);
								tetheredAction = false;
							}
						);
					} else {
						updateStatusBar('disconnected');
						log('Client window disconnected — stopping MCP server via tethered lifecycle');
						tetheredAction = true;
						void vscode.commands.executeCommand('workbench.mcp.stopServer', MCP_SERVER_DEF_ID).then(
							() => {
								log('Tethered lifecycle: MCP server stopped successfully');
								tetheredAction = false;
							},
							(err: unknown) => {
								const msg = err instanceof Error ? err.message : String(err);
								log(`Tethered lifecycle: MCP stopServer failed: ${msg}`);
								tetheredAction = false;
							}
						);
					}
				})
			);

			// When MCP is toggled, start/stop client window + MCP server together
			context.subscriptions.push(
				mcpProvider.onDidToggle((enabled: boolean) => {
					if (tetheredAction) {
						return;
					}
					log(`MCP server toggled: ${enabled ? 'enabled' : 'disabled'}`);
					if (enabled) {
						// MCP turned on → start both client window and MCP server
						void Promise.all([
							startClientWindow().then((ok: boolean) => {
								if (!ok) {
									log('Failed to start client window after MCP enable');
									updateStatusBar('disconnected');
								}
							}),
							vscode.commands.executeCommand('workbench.mcp.startServer', MCP_SERVER_DEF_ID).then(
								() => {
									log('MCP server started after toggle on');
								},
								(err: unknown) => {
									const msg = err instanceof Error ? err.message : String(err);
									log(`MCP server start after toggle on failed: ${msg}`);
								}
							)
						]);
					} else {
						// MCP turned off → stop client window
						stopClientWindow();
						updateStatusBar('disconnected');
					}
				})
			);

			// Auto-start: Start MCP server only — the MCP server's ensureConnection()
			// will spawn the client window via the Host handlers. This avoids a race
			// condition where both extension.ts AND mcp-server/main.ts try to spawn
			// the client simultaneously.
			updateStatusBar('connecting');
			log('Auto-starting MCP server (will spawn client via ensureConnection)...');

			// Startup progress notification that tracks both MCP server and client connection
			let startupProgressResolve: (() => void) | undefined;
			const startupProgressPromise = new Promise<void>((r) => { startupProgressResolve = r; });

			void vscode.window.withProgress(
				{
					cancellable: false,
					location: vscode.ProgressLocation.Notification,
					title: 'VS Code DevTools'
				},
				async (progress) => {
					progress.report({ message: 'Starting MCP server…' });
					try {
						await vscode.commands.executeCommand(
							'workbench.mcp.startServer',
							MCP_SERVER_DEF_ID,
							{ waitForLiveTools: true },
						);
						log('[auto-start] MCP server started');
						progress.report({ message: 'Connecting to client window…' });
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						log(`[auto-start] MCP server start failed: ${msg}`);
						updateStatusBar('disconnected');
						return;
					}
					// Keep the notification open until the client connects
					await startupProgressPromise;
				}
			);

			// Listen for client connection to dismiss the startup notification
			const startupClientListener = onClientStateChanged((connected: boolean) => {
				if (connected && startupProgressResolve) {
					// Auto-hide notification after 3 seconds
					vscode.window.setStatusBarMessage('✅ VS Code DevTools started', 3000);
					startupProgressResolve();
					startupProgressResolve = undefined;
					startupClientListener.dispose();
				}
			});
		} else {
			log('Loading client-handlers module...');
			const inspectorChannel = vscode.window.createOutputChannel('DevTools Inspector');
			context.subscriptions.push(inspectorChannel);
			initInspectorChannel(inspectorChannel);

			const { registerClientHandlers } = await import('./services/client-handlers');
			log('client-handlers module loaded, registering handlers...');
			const disposable = registerClientHandlers(bootstrap.registerHandler, context.workspaceState);
			clientHandlersCleanup = disposable;
			context.subscriptions.push(disposable);
			log('Client handlers registered');

			// Noop MCP provider: the package.json declares mcpServerDefinitionProviders
			// globally, so VS Code in this window will try to discover the provider.
			// Register an empty provider so the client never spawns its own MCP server.
			const noopProvider: vscode.McpServerDefinitionProvider = {
				provideMcpServerDefinitions: () => []
			};
			context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, noopProvider));
			log('Noop MCP provider registered — client will not spawn MCP server');

			// Start the codebase worker thread so ts-morph stays warm
			startWorker();
			log('Codebase worker thread started');
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error ? err.stack : undefined;
		log(`Failed to load ${currentRole} handlers — Safe Mode: ${msg}`);
		if (stack) {
			log(`Stack trace:\n${stack}`);
		}
		updateStatusBar('safe-mode', msg);
	}

	// ========================================================================
	// Step 3: Load Runtime (GUI features — Tree Views, Webviews, etc.)
	// ========================================================================

	try {
		const runtimePath = path.join(__dirname, 'runtime.js');
		const runtimeUrl = pathToFileURL(runtimePath).href;
		const runtime = (await import(runtimeUrl)) as RuntimeModule;

		await runtime.activate(context);
		runtimeModule = runtime;

		// Wire the CDP reconnect callback from host-handlers to runtime bundle
		// This bridges the esbuild bundle gap - both bundles have separate clientDevTools instances
		if (currentRole === 'host' && reconnectCdpCallbackForRuntime) {
			runtime.wireReconnectCdpCallback(reconnectCdpCallbackForRuntime);
			log('Wired CDP reconnect callback to runtime bundle');
		}

		// Signal to VS Code that runtime loaded — views become visible
		await vscode.commands.executeCommand('setContext', 'devtools.coreLoaded', true);
		log('Runtime loaded successfully');
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error ? err.stack : undefined;

		// Views stay hidden
		await vscode.commands.executeCommand('setContext', 'devtools.coreLoaded', false);

		updateStatusBar('safe-mode', msg);

		vscode.window.showErrorMessage(`devtools: Runtime failed to load — entering Safe Mode.\n\n${msg}`, 'Show Output').then((choice) => {
			if (choice === 'Show Output') {
				outputChannel.show();
			}
		});

		log(`SAFE MODE — Runtime failed to load: ${msg}`);
		if (stack) {
			log(stack);
		}
	}

	log(`Extension activation complete (role: ${currentRole})`);
}

// ── Session Conflict Handling ────────────────────────────────────────────────

async function showSessionConflictNotification(): Promise<void> {
	const choice = await vscode.window.showWarningMessage('VS Code DevTools: Another session is already running (both Host and Client pipes exist).', 'Override Session', 'Cancel');

	if (choice === 'Override Session') {
		log('User chose to override session — initiating takeover');
		await initiateTakeover();
	} else {
		log('User cancelled — extension will not activate pipes');
	}
}

async function initiateTakeover(): Promise<void> {
	// TODO: Connect to existing Host pipe and send takeover command
	// For now, just log and show a message
	vscode.window.showInformationMessage('Session takeover is not yet fully implemented. Please close the existing VS Code windows and try again.');
	log('Takeover: Not yet implemented');
}

// ── Deactivation ─────────────────────────────────────────────────────────────

export async function deactivate() {
	log('Extension deactivating...');

	// Kill spawned processes FIRST — synchronously, before any async work.
	// VS Code gives deactivate() a short timeout (~5s). If the async operations
	// below hang, the extension host is force-killed and cleanup never runs.
	if (currentRole === 'host' && hostHandlersCleanup) {
		hostHandlersCleanup();
		hostHandlersCleanup = undefined;
		log('Host cleanup completed (client window stopped)');
	}

	if (currentRole === 'client') {
		try {
			await notifyHostOfShutdown('deactivate');
			log('Client notified Host about shutdown');
		} catch {
			// best-effort notification
		}
	}

	// Deactivate runtime if loaded
	if (runtimeModule) {
		try {
			await runtimeModule.deactivate();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			log(`Runtime deactivation error: ${msg}`);
		}
	}

	// Stop the bootstrap pipe server
	try {
		bootstrap.stopServer();
		log('Bootstrap pipe server stopped');
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(`Bootstrap stop error: ${msg}`);
	}

	// Terminate the codebase worker thread
	try {
		await stopWorker();
		log('Codebase worker thread stopped');
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(`Worker stop error: ${msg}`);
	}
}
