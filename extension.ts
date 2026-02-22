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

import * as path from 'path';
import net from 'node:net';
import * as vscode from 'vscode';
import pkg from './package.json';
import { startWorker, stopWorker } from './services/codebase/codebase-worker-proxy';
import { registerMcpServerProvider } from './services/mcpServerProvider';

// ── Bootstrap (Plain JS, always loads) ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bootstrap: {
  registerHandler: (method: string, fn: (params: Record<string, unknown>) => unknown | Promise<unknown>) => void;
  unregisterHandler: (method: string) => void;
  startServer: (socketPath: string) => Promise<{ socketPath: string }>;
  stopServer: () => void;
  getSocketPath: () => string | null;
} = require('./bootstrap');

// ── Constants ────────────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';
const HOST_PIPE_PATH = IS_WINDOWS
  ? '\\\\.\\pipe\\vscode-devtools-host'
  : '/tmp/vscode-devtools-host.sock';
const CLIENT_PIPE_PATH = IS_WINDOWS
  ? '\\\\.\\pipe\\vscode-devtools-client'
  : '/tmp/vscode-devtools-client.sock';

// ── Module State ─────────────────────────────────────────────────────────────

interface RuntimeModule {
  activate(context: vscode.ExtensionContext): Promise<void>;
  deactivate(): Promise<void>;
  wireReconnectCdpCallback(callback: () => Promise<boolean>): void;
  wireBrowserService(service: unknown | null): void;
}

let runtimeModule: RuntimeModule | undefined;
let outputChannel: vscode.OutputChannel;
let currentRole: 'host' | 'client' | undefined;
let hostHandlersCleanup: (() => void) | undefined;
let clientHandlersCleanup: vscode.Disposable | undefined;
let reconnectCdpCallbackForRuntime: (() => Promise<boolean>) | undefined;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  outputChannel?.appendLine(line);
  console.log(`[devtools] ${message}`);
}

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
          reason,
          at: Date.now(),
        },
      };
      try {
        socket.write(JSON.stringify(payload) + '\n', () => {
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

  log('VS Code DevTools extension activating...');

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
  function updateStatusBar(state: 'connected' | 'disconnected' | 'safe-mode', detail?: string): void {
    switch (state) {
      case 'connected':
        statusBarItem.text = '$(debug-connected) VS Code DevTools Host';
        statusBarItem.tooltip = `VS Code DevTools v${version}\nRole: Host\nClient Window: Connected\nMCP Server: Enabled\nClick to toggle`;
        statusBarItem.command = 'devtools.toggleMcpServer';
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
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
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
      // Dynamic import to ensure esbuild doesn't bundle host-handlers into client builds
      log('Loading host-handlers module...');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { registerHostHandlers, cleanup, startClientWindow, stopClientWindow, onClientStateChanged, createReconnectCdpCallback, onBrowserServiceChanged } = require('./services/host-handlers');
      log('host-handlers module loaded, registering handlers...');
      registerHostHandlers(bootstrap.registerHandler, context, log);
      hostHandlersCleanup = cleanup;
      
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
        }),
      );

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
            log('Client window connected');
          } else {
            updateStatusBar('disconnected');
            log('Client window disconnected — stopping MCP server via tethered lifecycle');
            tetheredAction = true;
            void vscode.commands.executeCommand('workbench.mcp.stopServer', 'devtools.mcp-server').then(
              () => {
                log('Tethered lifecycle: MCP server stopped successfully');
                tetheredAction = false;
              },
              (err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                log(`Tethered lifecycle: MCP stopServer failed: ${msg}`);
                tetheredAction = false;
              },
            );
          }
        }),
      );

      // When MCP is toggled, start/stop client window to match
      context.subscriptions.push(
        mcpProvider.onDidToggle((enabled: boolean) => {
          if (tetheredAction) {
            return;
          }
          log(`MCP server toggled: ${enabled ? 'enabled' : 'disabled'}`);
          if (enabled) {
            // MCP turned on → start client window
            void startClientWindow().then((ok: boolean) => {
              if (!ok) {
                log('Failed to start client window after MCP enable');
                updateStatusBar('disconnected');
              }
            });
          } else {
            // MCP turned off → stop client window
            stopClientWindow();
            updateStatusBar('disconnected');
          }
        }),
      );

      // Auto-start: spawn client window immediately during activation
      updateStatusBar('disconnected');
      log('Auto-starting client window...');
      void startClientWindow().then((ok: boolean) => {
        if (ok) {
          log('Client window auto-started successfully');
          // MCP provider is already enabled by default — status bar updated by onClientStateChanged
        } else {
          log('Client window auto-start failed — MCP server stays enabled, client will start on first tool call');
          updateStatusBar('disconnected');
        }
      });
    } else {
      log('Loading client-handlers module...');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { registerClientHandlers } = require('./services/client-handlers');
      log('client-handlers module loaded, registering handlers...');
      const disposable = registerClientHandlers(bootstrap.registerHandler, context.workspaceState);
      clientHandlersCleanup = disposable;
      context.subscriptions.push(disposable);
      log('Client handlers registered');

      // Noop MCP provider: the package.json declares mcpServerDefinitionProviders
      // globally, so VS Code in this window will try to discover the provider.
      // Register an empty provider so the client never spawns its own MCP server.
      const noopProvider: vscode.McpServerDefinitionProvider = {
        provideMcpServerDefinitions: () => [],
      };
      context.subscriptions.push(
        vscode.lm.registerMcpServerDefinitionProvider('devtools.mcp-server', noopProvider),
      );
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtime: RuntimeModule = require(runtimePath);

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

    vscode.window.showErrorMessage(
      `devtools: Runtime failed to load — entering Safe Mode.\n\n${msg}`,
      'Show Output'
    ).then(choice => {
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
  const choice = await vscode.window.showWarningMessage(
    'VS Code DevTools: Another session is already running (both Host and Client pipes exist).',
    'Override Session',
    'Cancel'
  );

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
  vscode.window.showInformationMessage(
    'Session takeover is not yet fully implemented. Please close the existing VS Code windows and try again.'
  );
  log('Takeover: Not yet implemented');
}

// ── Deactivation ─────────────────────────────────────────────────────────────

export async function deactivate() {
  log('Extension deactivating...');

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

  // Clean up handlers
  if (currentRole === 'host' && hostHandlersCleanup) {
    hostHandlersCleanup();
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

