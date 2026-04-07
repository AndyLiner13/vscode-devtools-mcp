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
import { detectExtensionPaths } from './services/extensionDetection';
import { registerInspectorPanel } from './services/inspector-panel';
import { debug, initDebugLogging, initInspectorChannel, initMainChannel, log, setDebugEnabled } from './services/logger';
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
let globalCommandsRegistered = false;

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

	// Initialize debug file logging if enabled
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
	const debugModeEnabled = vscode.workspace.getConfiguration('devtools').get<boolean>('debug.enabled', false);
	initDebugLogging(workspaceRoot, debugModeEnabled);
	if (debugModeEnabled) {
		diagLog('Debug mode enabled — writing to devtools.debug.log');
	}

	log('VS Code DevTools extension activating...');
	debug(`Extension path: ${context.extensionPath}`);
	debug(`Extension mode: ${context.extensionMode}`);
	debug(`Workspace root: ${workspaceRoot ?? 'none'}`);
	debug(`VS Code version: ${vscode.version}`);

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
		void vscode.commands.executeCommand('setContext', 'devtools.isHost', false);
		void vscode.commands.executeCommand('setContext', 'devtools.isClient', true);
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
		// No client token — this window MAY become the host, but only if dev mode is enabled.
		const devModeEnabledAtStart = vscode.workspace.getConfiguration('devtools').get<boolean>('dev.enabled', false);

		if (!devModeEnabledAtStart) {
			diagLog('Dev mode disabled — skipping host pipe claim, this is a regular VS Code window');
			log('Dev mode disabled — not claiming host pipe. Enable devtools.dev.enabled to activate.');

			// Register global commands for regular VS Code windows
			context.subscriptions.push(
				vscode.commands.registerCommand('devtools.restartTsServer', () => {
					log('Restart TS Server invoked');
					void vscode.commands.executeCommand('typescript.restartTsServer');
				})
			);
			globalCommandsRegistered = true;
			log('Global commands registered (regular window)');

			// Listen for debug mode being toggled
			context.subscriptions.push(
				vscode.workspace.onDidChangeConfiguration((e) => {
					if (!e.affectsConfiguration('devtools.debug.enabled')) return;
					const newDebugEnabled = vscode.workspace.getConfiguration('devtools').get<boolean>('debug.enabled', false);
					const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
					setDebugEnabled(newDebugEnabled, wsRoot);
					log(`Debug mode ${newDebugEnabled ? 'enabled' : 'disabled'}`);
				})
			);

			// Listen for dev mode being toggled on later — late activation
			context.subscriptions.push(
				vscode.workspace.onDidChangeConfiguration((e) => {
					if (!e.affectsConfiguration('devtools.dev.enabled')) return;
					const newEnabled = vscode.workspace.getConfiguration('devtools').get<boolean>('dev.enabled', false);
					if (newEnabled && currentRole === undefined) {
						log('Dev mode toggled on — attempting late host activation');
						debug('Late host activation triggered from settings change');
						void activateAsHost();
					}
				})
			);

			// Fall through to Step 3 (runtime loading) — skip Step 2 since no role assigned
		} else {
			// Dev mode is enabled at startup — claim the host pipe immediately
			const claimed = await claimHostPipe();
			if (!claimed) {
				log('Host pipe already in use — this window will not be a DevTools participant');
				// Fall through to runtime loading anyway
			}
		}
	}

	// ========================================================================
	// Helper: Claim the host pipe
	// ========================================================================

	async function claimHostPipe(): Promise<boolean> {
		try {
			diagLog(`Attempting to claim Host pipe: ${HOST_PIPE_PATH}`);
			await bootstrap.startServer(HOST_PIPE_PATH);
			currentRole = 'host';
			void vscode.commands.executeCommand('setContext', 'devtools.isHost', true);
			void vscode.commands.executeCommand('setContext', 'devtools.isClient', false);
			diagLog('SUCCESS: Claimed Host pipe — this instance is HOST');
			log(`Claimed Host pipe @ ${HOST_PIPE_PATH} — this instance is the HOST`);
			return true;
		} catch (err: unknown) {
			const error = err as NodeJS.ErrnoException;
			if (error.code === 'EADDRINUSE') {
				diagLog('Host pipe EADDRINUSE — another host already running');
				log('Host pipe already in use — cannot become host');
				return false;
			}
			throw err;
		}
	}

	// ========================================================================
	// Helper: Full host activation (pipe claim + handler loading + MCP setup)
	// ========================================================================

	let hostActivationPromise: Promise<void> | undefined;
	let hostActivated = false;

	async function activateAsHost(): Promise<void> {
		if (hostActivated) {
			log('Host activation already completed — skipping duplicate activation');
			return;
		}

		if (hostActivationPromise) {
			log('Host activation already in progress — awaiting existing activation');
			await hostActivationPromise;
			return;
		}

		let activationSucceeded = false;
		hostActivationPromise = (async () => {
			// Claim the host pipe if not already claimed
			if (currentRole !== 'host') {
				const claimed = await claimHostPipe();
				if (!claimed) {
					log('Could not claim host pipe — remaining as regular window');
					return;
				}
			}

			// Register URI handler
			const uriHandler = new DevToolsUriHandler();
			context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));
			context.subscriptions.push({ dispose: disposeUriHandler });
			log('URI handler registered — vscode://andyliner.vscode-devtools/open/... links are active');

			// Register global commands (skip restartTsServer if already registered from early-return path)
			if (!globalCommandsRegistered) {
				context.subscriptions.push(
					vscode.commands.registerCommand('devtools.restartTsServer', () => {
						log('Restart TS Server invoked');
						void vscode.commands.executeCommand('typescript.restartTsServer');
					})
				);
				globalCommandsRegistered = true;
				log('Global commands registered');
			}

			try {
				diagLog('Loading HOST handlers...');
				log('Loading host-handlers module...');
				const {
					cleanup,
					createReconnectCdpCallback,
					isClientWindowConnected,
					isHotReloadInProgress,
					onBrowserServiceChanged,
					onClientStateChanged,
					registerHostHandlers,
					startClientWindow,
					stopClientWindow
				} = await import('./services/host-handlers');
				log('host-handlers module loaded, registering handlers...');
				registerHostHandlers(bootstrap.registerHandler, context);
				hostHandlersCleanup = cleanup;

				process.on('exit', () => {
					if (hostHandlersCleanup) {
						hostHandlersCleanup();
						hostHandlersCleanup = undefined;
					}
				});

				reconnectCdpCallbackForRuntime = createReconnectCdpCallback();

				onBrowserServiceChanged((service: unknown) => {
					if (runtimeModule) {
						runtimeModule.wireBrowserService(service);
						log(`Browser service ${service ? 'connected to' : 'disconnected from'} runtime bundle`);
					}
				});

				// Wire CDP reconnect callback if runtime already loaded
				if (runtimeModule && reconnectCdpCallbackForRuntime) {
					runtimeModule.wireReconnectCdpCallback(reconnectCdpCallbackForRuntime);
					log('Wired CDP reconnect callback to already-loaded runtime bundle');
				}

				log('Host handlers registered, CDP reconnect callback created');

				const mcpProvider = registerMcpServerProvider(context);

				const isDevModeEnabled = (): boolean =>
					vscode.workspace.getConfiguration('devtools').get<boolean>('dev.enabled', false);

				// Dev mode is known to be enabled (either at startup or just toggled on)
				diagLog(`MCP provider enabled=${mcpProvider.enabled}`);
				log(`MCP server provider registered (enabled: ${mcpProvider.enabled})`);

				// Listen for settings changes — dev mode toggle + debug mode toggle + general refresh
				context.subscriptions.push(
					vscode.workspace.onDidChangeConfiguration((e) => {
						if (e.affectsConfiguration('devtools.debug.enabled')) {
							const newDebugEnabled = vscode.workspace.getConfiguration('devtools').get<boolean>('debug.enabled', false);
							const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
							setDebugEnabled(newDebugEnabled, wsRoot);
							log(`Debug mode ${newDebugEnabled ? 'enabled' : 'disabled'}`);
						}
						if (e.affectsConfiguration('devtools.dev.enabled')) {
							const newEnabled = vscode.workspace.getConfiguration('devtools').get<boolean>('dev.enabled', false);
							debug(`Dev mode config changed: ${newEnabled}`);
							if (newEnabled && !mcpProvider.enabled) {
								log('Dev mode enabled — running extension detection then starting MCP server');
								void runExtensionDetection().then(() => {
									updateStatusBar('connecting');
									mcpProvider.setEnabled(true);
								});
							} else if (!newEnabled && mcpProvider.enabled) {
								log('Dev mode disabled — stopping MCP server and client window');
								mcpProvider.setEnabled(false);
								statusBarItem.hide();
							}
						} else if (e.affectsConfiguration('devtools')) {
							mcpProvider.refresh();
							log('Settings changed — MCP server definitions refreshed');
							debug('MCP provider refresh triggered by config change');
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
							if (!isClientWindowConnected()) {
								log('Start MCP Server: client disconnected — launching client window first');
								updateStatusBar('connecting');
								const started = await startClientWindow();
								if (!started) {
									log('Start MCP Server: failed to launch client window');
									updateStatusBar('disconnected');
									if (!options?.silent) {
										showCompletionNotification('Failed to start the client window.');
									}
								}
								return;
							}
							if (!options?.silent) {
								showCompletionNotification('MCP Server is already running.');
							}
							void vscode.commands.executeCommand('workbench.mcp.startServer', MCP_SERVER_DEF_ID);
							return;
						}
						log('Start MCP Server: enabling provider (triggers tethered lifecycle)');
						mcpProvider.setEnabled(true);
						if (!isClientWindowConnected()) {
							log('Start MCP Server: provider enabled while client disconnected — launching client window');
							updateStatusBar('connecting');
							const started = await startClientWindow();
							if (!started) {
								log('Start MCP Server: failed to launch client window after enabling provider');
								updateStatusBar('disconnected');
								mcpProvider.setEnabled(false);
							}
						}
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
					})
				);
				log('MCP Server lifecycle commands registered');

				// ── Tethered Lifecycle: Client Window ↔ MCP Server ──────────────────
				let tetheredAction = false;
				const TETHERED_TIMEOUT_MS = 30_000;

				function runTetheredCommand(label: string, ...commandArgs: unknown[]): void {
					tetheredAction = true;
					debug(`Tethered command starting: ${label}`);
					const timeout = setTimeout(() => {
						if (tetheredAction) {
							log(`Tethered lifecycle: ${label} timed out after ${TETHERED_TIMEOUT_MS}ms — resetting guard`);
							debug(`Tethered timeout - command args: ${JSON.stringify(commandArgs)}`);
							tetheredAction = false;
						}
					}, TETHERED_TIMEOUT_MS);
					void (vscode.commands.executeCommand as (...args: unknown[]) => Thenable<unknown>)(...commandArgs).then(
						() => {
							clearTimeout(timeout);
							log(`Tethered lifecycle: ${label} completed`);
							debug(`Tethered command done: ${label}`);
							tetheredAction = false;
						},
						(err: unknown) => {
							clearTimeout(timeout);
							const msg = err instanceof Error ? err.message : String(err);
							log(`Tethered lifecycle: ${label} failed: ${msg}`);
							debug(`Tethered command error: ${label} - ${msg}`);
							tetheredAction = false;
						}
					);
				}

				context.subscriptions.push(
					onClientStateChanged((connected: boolean) => {
						debug(
							`onClientStateChanged fired: connected=${connected}, tetheredAction=${tetheredAction}, hotReload=${isHotReloadInProgress()}`
						);
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

							if (inspectorPanel.wasOpen && !inspectorPanel.isVisible) {
								log('Restoring Inspector panel (was open before reload)');
								inspectorPanel.show();
							}

							runTetheredCommand('MCP startServer', 'workbench.mcp.startServer', MCP_SERVER_DEF_ID);
						} else {
							updateStatusBar('disconnected');
							log('Client window disconnected — stopping MCP server via tethered lifecycle');
							runTetheredCommand('MCP stopServer', 'workbench.mcp.stopServer', MCP_SERVER_DEF_ID);
						}
					})
				);

				// onDidToggle is for reacting to MCP server state changes - NOT for spawning clients.
				// The tethered lifecycle (onClientStateChanged) handles client spawn → MCP start.
				// This handler only updates status bar and stops the client when MCP is disabled.
				context.subscriptions.push(
					mcpProvider.onDidToggle((enabled: boolean) => {
						debug(
							`onDidToggle fired: enabled=${enabled}, tetheredAction=${tetheredAction}, devMode=${isDevModeEnabled()}, clientConnected=${isClientWindowConnected()}`
						);
						if (tetheredAction) {
							debug('onDidToggle: skipping (tethered action in progress)');
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
							// Just update status - client spawn is handled by tethered lifecycle
							if (isClientWindowConnected()) {
								updateStatusBar('connected');
								debug('onDidToggle: client already connected, status=connected');
							} else {
								updateStatusBar('connecting');
								debug('onDidToggle: client not connected yet, status=connecting');
							}
						} else {
							debug('onDidToggle: stopping client window');
							stopClientWindow();
							updateStatusBar('disconnected');
						}
					})
				);

				// ── Extension Path Detection ─────────────────────────────────────
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

				async function runExtensionDetection(): Promise<void> {
					if (!workspaceRoot) return;
					try {
						const result = await detectExtensionPaths(workspaceRoot);
						if (result.paths.length > 0) {
							log(
								`[extensionDetection] Active extension paths: ${result.paths.join(', ')} (autoDetected: ${result.autoDetected})`
							);
						} else {
							log('[extensionDetection] No VS Code extension folders found in workspace');
						}
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err);
						log(`[extensionDetection] Detection failed: ${msg}`);
					}
				}

				// Auto-start: run extension detection then start the client window directly.
				// Once connected, the tethered lifecycle starts the MCP server.
				await runExtensionDetection();
				diagLog('AUTO-START: Starting client window directly');
				updateStatusBar('connecting');
				log('Auto-starting client window directly...');

				let startupInProgress = true;

				const resolveStartup = (showSuccess: boolean) => {
					if (!startupInProgress) return;
					startupInProgress = false;
					if (showSuccess) {
						vscode.window.setStatusBarMessage('✅ VS Code DevTools started', 3000);
					}
					startupClientListener.dispose();
					clearInterval(clientPollInterval);
				};

				const startupClientListener = onClientStateChanged((connected: boolean) => {
					resolveStartup(connected);
				});

				let wasEverConnected = false;
				const clientPollInterval = setInterval(() => {
					if (!startupInProgress) {
						clearInterval(clientPollInterval);
						return;
					}
					const connected = isClientWindowConnected();
					if (connected) {
						wasEverConnected = true;
						resolveStartup(true);
					} else if (wasEverConnected) {
						resolveStartup(false);
					}
				}, 500);

				void (async () => {
					try {
						const started = await startClientWindow();
						log(`[auto-start] startClientWindow completed: started=${started}`);
						if (!started) {
							updateStatusBar('disconnected');
							resolveStartup(false);
							return;
						}
						if (isClientWindowConnected()) {
							resolveStartup(true);
						}
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						log(`[auto-start] MCP server start failed: ${msg}`);
						updateStatusBar('disconnected');
						resolveStartup(false);
					}
				})();

				activationSucceeded = true;
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				const stack = err instanceof Error ? err.stack : undefined;
				log(`Failed to load host handlers — Safe Mode: ${msg}`);
				if (stack) {
					log(`Stack trace:\n${stack}`);
				}
				updateStatusBar('safe-mode', msg);
			}
		})();

		try {
			await hostActivationPromise;
			hostActivated = activationSucceeded;
		} finally {
			hostActivationPromise = undefined;
		}
	}

	// ========================================================================
	// Step 2: Role-specific setup
	// ========================================================================

	if (currentRole === 'host') {
		// Host pipe was already claimed above — run the full host setup
		await activateAsHost();
	} else if (currentRole === 'client') {
		// Register global commands for the client window
		if (!globalCommandsRegistered) {
			context.subscriptions.push(
				vscode.commands.registerCommand('devtools.restartTsServer', () => {
					log('Restart TS Server invoked');
					void vscode.commands.executeCommand('typescript.restartTsServer');
				})
			);
			globalCommandsRegistered = true;
			log('Global commands registered');
		}

		try {
			diagLog('Loading CLIENT handlers...');
			log('Loading client-handlers module...');

			const { registerClientHandlers } = await import('./services/client-handlers');
			log('client-handlers module loaded, registering handlers...');
			const disposable = registerClientHandlers(bootstrap.registerHandler, context.workspaceState);
			clientHandlersCleanup = disposable;
			context.subscriptions.push(disposable);
			log('Client handlers registered');

			const noopProvider: vscode.McpServerDefinitionProvider = {
				provideMcpServerDefinitions: () => []
			};
			context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, noopProvider));
			log('Noop MCP provider registered — client will not spawn MCP server');
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			const stack = err instanceof Error ? err.stack : undefined;
			log(`Failed to load client handlers — Safe Mode: ${msg}`);
			if (stack) {
				log(`Stack trace:\n${stack}`);
			}
			updateStatusBar('safe-mode', msg);
		}
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

	diagLog('========== DEACTIVATE COMPLETE ==========');
}
