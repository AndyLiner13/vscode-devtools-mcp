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

import { appendFileSync } from 'node:fs';
import net from 'node:net';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as vscode from 'vscode';

// File-based diagnostic logger — writes to workspace root so we can read it after reinstall
const DIAG_LOG_PATH = path.join(homedir(), 'devtools-activation.log');
function diagLog(msg: string): void {
	const ts = new Date().toISOString();
	const pid = process.pid;
	try {
		appendFileSync(DIAG_LOG_PATH, `[${ts}] [PID:${pid}] ${msg}\n`);
	} catch {
		// best-effort
	}
}

import * as bootstrap from './bootstrap';
import pkg from './package.json';
import { startWorker, stopWorker } from './services/codebase/codebase-worker-proxy';
import { registerInspectorPanel } from './services/inspector-panel';
import { initInspectorChannel, initMainChannel, log } from './services/logger';
import { registerMcpServerProvider } from './services/mcpServerProvider';
import { attachErrorToChat, showCompletionNotification } from './services/notifications';
import { DevToolsUriHandler, disposeUriHandler } from './services/uriHandler';

// VS Code constructs server definition IDs as: ExtensionIdentifier.toKey(id) + '/' + label
const MCP_SERVER_DEF_ID = 'andyliner.vscode-devtools/Client Controller';
const MCP_PROVIDER_ID = 'devtools.client-controller';

// ── Constants ────────────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';
const HOST_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-host' : '/tmp/vscode-devtools-host.sock';
const CLIENT_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';

/** Environment variable name for client token — must match host-handlers.ts */
const CLIENT_TOKEN_ENV_VAR = 'DEVTOOLS_CLIENT_TOKEN';

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
	diagLog('========== ACTIVATE START ==========');
	diagLog(`vscode.env.appName=${vscode.env.appName}`);
	diagLog(`vscode.env.appHost=${vscode.env.appHost}`);
	diagLog(`vscode.env.sessionId=${vscode.env.sessionId}`);
	diagLog(`vscode.env.machineId=${vscode.env.machineId}`);
	diagLog(`workspace.folders=${JSON.stringify(vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath))}`);
	diagLog(`extensionPath=${context.extensionPath}`);
	diagLog(`extensionMode=${context.extensionMode}`);

	// Output channel for all logging
	outputChannel = vscode.window.createOutputChannel('devtools');
	context.subscriptions.push(outputChannel);
	initMainChannel(outputChannel);

	// Inspector output channel — separate from main to avoid noise
	const inspectorChannel = vscode.window.createOutputChannel('DevTools Inspector');
	context.subscriptions.push(inspectorChannel);
	initInspectorChannel(inspectorChannel);

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
		statusBarItem.show();
	}

	// ========================================================================
	// Step 1: Role Detection
	// ========================================================================

	diagLog('Step 1: Role detection starting...');

	// Check for client token first — if present, this is the spawned client
	const clientToken = process.env[CLIENT_TOKEN_ENV_VAR];
	if (clientToken) {
		diagLog(`Client token found: ${clientToken.slice(0, 8)}... — this instance is CLIENT`);
		currentRole = 'client';
		log(`Client token present — this instance is the CLIENT`);

		// Start the client pipe server for RPC from MCP server
		try {
			await bootstrap.startServer(CLIENT_PIPE_PATH);
			diagLog('SUCCESS: Started client pipe server');
			log(`Started client pipe server @ ${CLIENT_PIPE_PATH}`);
		} catch (pipeErr: unknown) {
			const pipeError = pipeErr as NodeJS.ErrnoException;
			if (pipeError.code === 'EADDRINUSE') {
				// Previous client pipe not yet released — wait and retry
				diagLog('Client pipe EADDRINUSE — waiting for release...');
				await new Promise((resolve) => setTimeout(resolve, 1000));
				try {
					await bootstrap.startServer(CLIENT_PIPE_PATH);
					diagLog('SUCCESS: Started client pipe server (retry)');
				} catch {
					log('Warning: Could not start client pipe server — RPC may not work');
				}
			} else {
				log(`Warning: Client pipe server error: ${pipeError.message}`);
			}
		}

		statusBarItem.text = '$(debug-connected) VS Code DevTools Client';
		statusBarItem.tooltip = `VS Code DevTools v${version}\nRole: Client`;
		statusBarItem.command = undefined;
		statusBarItem.show();
	} else {
		// No client token — try to become host
		try {
			diagLog(`Attempting to claim Host pipe: ${HOST_PIPE_PATH}`);
			await bootstrap.startServer(HOST_PIPE_PATH);
			currentRole = 'host';
			diagLog('SUCCESS: Claimed Host pipe — this instance is HOST');
			log(`Claimed Host pipe @ ${HOST_PIPE_PATH} — this instance is the HOST`);
		} catch (err: unknown) {
			const error = err as NodeJS.ErrnoException;
			if (error.code === 'EADDRINUSE') {
				diagLog('Host pipe EADDRINUSE and no client token — this is a regular VS Code window');
				log('Host pipe exists but no client token — this VS Code instance is not a DevTools participant');
				// Not the host, not the client — just a regular VS Code window
				return;
			}
			throw err;
		}
	}

	// ========================================================================
	// Step 1.5: Register URI Handler (Host only, always active)
	// ========================================================================

	if (currentRole === 'host') {
		const uriHandler = new DevToolsUriHandler();
		context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));
		context.subscriptions.push({ dispose: disposeUriHandler });
		log('URI handler registered — vscode://andyliner.vscode-devtools/open/... links are active');
	}

	// ========================================================================
	// Step 2: Load Role-Specific Handlers
	// ========================================================================

	try {
		if (currentRole === 'host') {
			diagLog('Step 2: Loading HOST handlers...');
			// Dynamic import keeps host-handlers out of the static dependency graph.
			// If it fails to compile, the extension still works in Safe Mode.
			log('Loading host-handlers module...');
			const {
				cleanup,
				createReconnectCdpCallback,
				isClientWindowConnected,
				isHotReloadInProgress,
				onBrowserServiceChanged,
				onClientStateChanged,
				registerHostHandlers,
				stopClientWindow
			} = await import('./services/host-handlers');
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

			const isDevModeEnabled = (): boolean => vscode.workspace.getConfiguration('devtools').get<boolean>('dev.enabled', false);

			// Gate the MCP server + client window on the dev mode setting
			const devModeEnabled = isDevModeEnabled();
			diagLog(`devtools.dev.enabled = ${devModeEnabled}`);
			if (!devModeEnabled) {
				mcpProvider.setEnabled(false);
			}
			diagLog(`MCP provider enabled=${mcpProvider.enabled}`);
			log(`MCP server provider registered (enabled: ${mcpProvider.enabled}, devMode: ${devModeEnabled})`);

			// Listen for settings changes — dev mode toggle + general refresh
			context.subscriptions.push(
				vscode.workspace.onDidChangeConfiguration((e) => {
					if (e.affectsConfiguration('devtools.dev.enabled')) {
						const newEnabled = vscode.workspace.getConfiguration('devtools').get<boolean>('dev.enabled', false);
						if (newEnabled && !mcpProvider.enabled) {
							log('Dev mode enabled — starting MCP server and client window');
							updateStatusBar('connecting');
							mcpProvider.setEnabled(true);
						} else if (!newEnabled && mcpProvider.enabled) {
							log('Dev mode disabled — stopping MCP server and client window');
							mcpProvider.setEnabled(false);
							statusBarItem.hide();
						}
					} else if (e.affectsConfiguration('devtools')) {
						mcpProvider.refresh();
						log('Settings changed — MCP server definitions refreshed');
					}
				})
			);

			// ── MCP Server Lifecycle Commands ──────────────────────────────────
			context.subscriptions.push(
				vscode.commands.registerCommand('devtools.startMcpServer', async (options?: { silent?: boolean }) => {
					if (!isDevModeEnabled()) {
						log('Start MCP Server blocked: dev mode is disabled');
						if (!options?.silent) {
							showCompletionNotification('Enable dev mode to start the MCP server and client window.');
						}
						return;
					}
					if (mcpProvider.enabled) {
						log('Start MCP Server: already enabled — ensuring server is running');
						if (!options?.silent) {
							showCompletionNotification('MCP Server is already running.');
						}
						void vscode.commands.executeCommand('workbench.mcp.startServer', MCP_SERVER_DEF_ID, { waitForLiveTools: true });
						return;
					}
					log('Start MCP Server: enabling provider (triggers tethered lifecycle)');
					mcpProvider.setEnabled(true);
				}),
				vscode.commands.registerCommand('devtools.stopMcpServer', () => {
					if (!mcpProvider.enabled) {
						log('Stop MCP Server: already stopped');
						showCompletionNotification('MCP Server is already stopped.');
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
				vscode.commands.registerCommand('devtools.restartTsServer', () => {
					log('Restart TS Server invoked');
					void vscode.commands.executeCommand('typescript.restartTsServer');
				})
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
			const TETHERED_TIMEOUT_MS = 30_000;

			function runTetheredCommand(label: string, ...commandArgs: unknown[]): void {
				tetheredAction = true;
				const timeout = setTimeout(() => {
					if (tetheredAction) {
						log(`Tethered lifecycle: ${label} timed out after ${TETHERED_TIMEOUT_MS}ms — resetting guard`);
						tetheredAction = false;
					}
				}, TETHERED_TIMEOUT_MS);
				void (vscode.commands.executeCommand as (...args: unknown[]) => Thenable<unknown>)(...commandArgs).then(
					() => {
						clearTimeout(timeout);
						log(`Tethered lifecycle: ${label} completed`);
						tetheredAction = false;
					},
					(err: unknown) => {
						clearTimeout(timeout);
						const msg = err instanceof Error ? err.message : String(err);
						log(`Tethered lifecycle: ${label} failed: ${msg}`);
						tetheredAction = false;
					}
				);
			}

			// When client state changes (health monitor fires), update status bar and MCP
			context.subscriptions.push(
				onClientStateChanged((connected: boolean) => {
					if (tetheredAction) {
						log('Tethered lifecycle: ignoring state change (tethered action in progress)');
						return;
					}
					if (isHotReloadInProgress()) {
						log('Tethered lifecycle: ignoring state change (hot reload in progress)');
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

						runTetheredCommand('MCP startServer', 'workbench.mcp.startServer', MCP_SERVER_DEF_ID, { waitForLiveTools: true });
					} else {
						updateStatusBar('disconnected');
						log('Client window disconnected — stopping MCP server via tethered lifecycle');
						runTetheredCommand('MCP stopServer', 'workbench.mcp.stopServer', MCP_SERVER_DEF_ID);
					}
				})
			);

			// When MCP is toggled, start/stop the MCP server. The mcpReady handler
			// in host-handlers will spawn the client window — no pre-launch here.
			context.subscriptions.push(
				mcpProvider.onDidToggle((enabled: boolean) => {
					if (tetheredAction) {
						return;
					}
					if (enabled && !isDevModeEnabled()) {
						log('MCP server toggle-on blocked: dev mode is disabled');
						mcpProvider.setEnabled(false);
						updateStatusBar('disconnected');
						return;
					}
					log(`MCP server toggled: ${enabled ? 'enabled' : 'disabled'}`);
					if (enabled) {
						updateStatusBar('connecting');
						void vscode.commands
							.executeCommand('workbench.mcp.startServer', MCP_SERVER_DEF_ID, { waitForLiveTools: true })
							.then(
								() => {
									log('MCP server started after toggle on');
								},
								(err: unknown) => {
									const msg = err instanceof Error ? err.message : String(err);
									log(`MCP server start after toggle on failed: ${msg}`);
									updateStatusBar('disconnected');
								}
							);
					} else {
						// MCP turned off → stop client window
						stopClientWindow();
						updateStatusBar('disconnected');
					}
				})
			);

			// Auto-start: Start MCP server only — mcpReady will spawn the client window.
			diagLog(`Step 3: Auto-start check — devModeEnabled=${devModeEnabled}`);
			if (devModeEnabled) {
				diagLog('AUTO-START: Starting MCP server (client window will launch on mcpReady)');
				updateStatusBar('connecting');
				log('Auto-starting MCP server — client window will launch when mcpReady fires...');

				let startupProgressResolve: (() => void) | undefined;
				const startupProgressPromise = new Promise<void>((r) => {
					startupProgressResolve = r;
				});
				const startupClientListener = onClientStateChanged((connected: boolean) => {
					if (connected && startupProgressResolve) {
						vscode.window.setStatusBarMessage('✅ VS Code DevTools started', 3000);
						startupProgressResolve();
						startupProgressResolve = undefined;
						startupClientListener.dispose();
					}
				});

				void vscode.window.withProgress(
					{
						cancellable: false,
						location: vscode.ProgressLocation.Notification,
						title: 'VS Code DevTools'
					},
					async (progress) => {
						progress.report({ message: 'Starting MCP server…' });
						try {
							await vscode.commands.executeCommand('workbench.mcp.startServer', MCP_SERVER_DEF_ID, { waitForLiveTools: true });
							log('[auto-start] MCP server started — waiting for mcpReady to spawn client');
							progress.report({ message: 'Waiting for client window…' });
							if (isClientWindowConnected() && startupProgressResolve) {
								vscode.window.setStatusBarMessage('✅ VS Code DevTools started', 3000);
								startupProgressResolve();
								startupProgressResolve = undefined;
								startupClientListener.dispose();
							}
						} catch (err: unknown) {
							const msg = err instanceof Error ? err.message : String(err);
							log(`[auto-start] MCP server start failed: ${msg}`);
							updateStatusBar('disconnected');
							startupClientListener.dispose();
							startupProgressResolve = undefined;
							return;
						}
						await startupProgressPromise;
					}
				);
			} else {
				diagLog('SKIP: Dev mode disabled — no auto-start');
				log('Dev mode disabled — skipping auto-start. Enable devtools.dev.enabled to activate.');
			}
		} else {
			diagLog('Step 2: Loading CLIENT handlers...');
			log('Loading client-handlers module...');

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

		// Signal to VS Code that runtime loaded
		log('Runtime loaded successfully');
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const stack = err instanceof Error ? err.stack : undefined;

		updateStatusBar('safe-mode', msg);

		vscode.window
			.showErrorMessage(`devtools: Runtime failed to load — entering Safe Mode.\n\n${msg}`, 'Attach to Chat')
			.then((choice) => {
				if (choice === 'Attach to Chat') {
					void attachErrorToChat(`Runtime failed to load — entering Safe Mode.\n\n${msg}`, stack);
				}
			});

		log(`SAFE MODE — Runtime failed to load: ${msg}`);
		if (stack) {
			log(stack);
		}
	}

	diagLog(`========== ACTIVATE COMPLETE (role: ${currentRole}) ==========`);
	log(`Extension activation complete (role: ${currentRole})`);
}

// ── Deactivation ─────────────────────────────────────────────────────────────

export async function deactivate() {
	diagLog('========== DEACTIVATE START ==========');
	diagLog(`role=${currentRole}`);
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

	diagLog('========== DEACTIVATE COMPLETE ==========');
}
