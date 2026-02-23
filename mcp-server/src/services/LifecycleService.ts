/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MCP Lifecycle Service
 *
 * Orchestrates the MCP server's connection lifecycle:
 * - Startup: announce to Host → Host spawns/reconnects Client
 * - Hot-reload: request Host to rebuild Client
 * - Shutdown: clean disconnect (debug window preserved for reconnect)
 *
 * Uses Host pipe for lifecycle RPCs.
 * Singleton — one lifecycle per MCP server process.
 */

import process from 'node:process';

import {teardown as hostTeardown, hotReloadRequired, mcpReady} from '../host-pipe.js';
import {logger} from '../logger.js';
import {stopMcpSocketServer} from '../mcp-socket-server.js';

// ── Service Implementation ───────────────────────────────

class LifecycleService {
  private _debugWindowStartedAt: number | undefined;
  private _userDataDir: string | undefined;
  private _connected = false;
  private connectInProgress: Promise<void> | undefined;
  private recoveryInProgress: Promise<void> | undefined;
  private exitCleanupDone = false;
  private shutdownHandlersRegistered = false;

  /** Client workspace folder the MCP server controls */
  private _clientWorkspace: string | undefined;
  /** Extension development path for the Client */
  private _extensionPath: string | undefined;
  /** Launch flags for the Client VS Code window */
  private _launchFlags: Record<string, unknown> | undefined;
  /** True if this MCP process was just hot-reloaded */
  private _wasHotReloaded = false;

  /**
   * Initialize with config values from the MCP server.
   * Must be called before ensureConnection().
   *
   * @param params.wasHotReloaded - True if MCP server was just hot-reloaded
   */
  init(params: { clientWorkspace: string; extensionPath: string; launch?: Record<string, unknown>; wasHotReloaded?: boolean }): void {
    this._clientWorkspace = params.clientWorkspace;
    this._extensionPath = params.extensionPath;
    this._launchFlags = params.launch;
    this._wasHotReloaded = params.wasHotReloaded ?? false;
    logger(`[Lifecycle] Initialized — client=${params.clientWorkspace}, ext=${params.extensionPath}, wasHotReloaded=${this._wasHotReloaded}`);
  }

  // ── Startup ────────────────────────────────────────────

  /**
   * Ensure the VS Code debug window is running and the Host pipe is connected.
   *
   * On first call: announces MCP to Host via `mcpReady()`, which spawns
   * or reconnects the Client.
   *
   * On subsequent calls: returns immediately if already connected.
   * If another connection attempt is in-flight, waits for it.
   */
  async ensureConnection(): Promise<void> {
    if (this._connected) {
      logger('[Lifecycle] Fast path — already connected');
      return;
    }

    if (this.connectInProgress) {
      logger('[Lifecycle] Connection in-flight — waiting');
      return this.connectInProgress;
    }

    this.connectInProgress = this.doConnect();
    try {
      await this.connectInProgress;
    } finally {
      this.connectInProgress = undefined;
    }
  }

  // ── Hot-Reload ─────────────────────────────────────────

  /**
   * Handle hot-reload: tell Host to rebuild Client.
   *
   * Host internally: stops Client → builds → spawns new Client → returns new port info.
   *
   * If the Host's `waitForClientReady` times out (Client started but not yet
   * responding), falls back to `mcpReady()` which detects the
   * already-running Client and returns its info.
   */
  async handleHotReload(): Promise<void> {
    logger('[Lifecycle] Hot-reload — requesting Host rebuild…');

    if (this._clientWorkspace === undefined || this._extensionPath === undefined) {
      throw new Error('[Lifecycle] Not initialized — call init() before handleHotReload()');
    }

    let clientStartedAt: number | undefined;

    try {
      const result = await hotReloadRequired({
        clientWorkspace: this._clientWorkspace,
        extensionPath: this._extensionPath,
        launch: this._launchFlags,
      });
      clientStartedAt = result.clientStartedAt;
    } catch (hotReloadErr) {
      const msg = hotReloadErr instanceof Error ? hotReloadErr.message : String(hotReloadErr);
      logger(`[Lifecycle] Hot-reload RPC failed: ${msg} — retrying via mcpReady()…`);

      const fallbackResult = await mcpReady({
        clientWorkspace: this._clientWorkspace,
        extensionPath: this._extensionPath,
        launch: this._launchFlags,
      });
      clientStartedAt = fallbackResult.clientStartedAt;
      logger('[Lifecycle] Fallback mcpReady() succeeded');
    }

    this._debugWindowStartedAt = clientStartedAt ?? Date.now();
    this._connected = true;
    logger(`[Lifecycle] Hot-reload complete — sessionTs=${new Date(this._debugWindowStartedAt).toISOString()}`);
  }

  // ── Shutdown ───────────────────────────────────────────

  /**
   * Stop the debug window (e.g., for a full teardown).
   * Tells Host to clean up Client + debug sessions.
   */
  async stopDebugWindow(): Promise<void> {
    try {
      await hostTeardown();
    } catch {
      // best-effort — Host may already be gone
    }
    this._connected = false;
    this._debugWindowStartedAt = undefined;
    this._userDataDir = undefined;
    logger('[Lifecycle] Debug window stopped');
  }

  /**
   * Graceful detach: clear state.
   * Debug window stays alive for reconnect by a future MCP instance.
   */
  detachGracefully(): void {
    this._connected = false;
    this._debugWindowStartedAt = undefined;
    this._userDataDir = undefined;
    logger('[Lifecycle] Detached gracefully — debug window preserved');
  }

  /**
   * Register process-level shutdown handlers.
   * Call once during MCP server startup.
   *
   * On Windows, VS Code kills the MCP server by closing stdin.
   * All soft shutdown paths detach gracefully so the debug window
   * survives restarts.
   */
  registerShutdownHandlers(): void {
    if (this.shutdownHandlersRegistered) return;
    this.shutdownHandlersRegistered = true;

    const handleShutdown = (source: string): void => {
      if (this.exitCleanupDone) {
        logger(`[shutdown] ${source} — already cleaned up`);
        return;
      }
      this.exitCleanupDone = true;
      logger(`[shutdown] ${source} — detaching gracefully`);
      this.detachGracefully();
      stopMcpSocketServer();
      process.exit(0);
    };

    process.stdin.on('end', () => { handleShutdown('stdin ended'); });

    process.on('exit', () => {
      if (this.exitCleanupDone) return;
      this.exitCleanupDone = true;
      this.detachGracefully();
      stopMcpSocketServer();
    });

    process.on('SIGINT', () => { handleShutdown('SIGINT'); });
    process.on('SIGTERM', () => { handleShutdown('SIGTERM'); });

    process.on('uncaughtException', (err) => {
      logger('Uncaught exception:', err);
      if (!this.exitCleanupDone) {
        this.exitCleanupDone = true;
        this.detachGracefully();
        stopMcpSocketServer();
      }
      process.exit(1);
    });
  }

  // ── State Getters ──────────────────────────────────────

  get isConnected(): boolean {
    return this._connected;
  }

  get debugWindowStartedAt(): number | undefined {
    return this._debugWindowStartedAt;
  }

  get userDataDir(): string | undefined {
    return this._userDataDir;
  }

  // ── Recovery ───────────────────────────────────────────

  /**
   * Recover the Client pipe connection.
   *
   * Called when a tool detects the Client pipe is unreachable.
   * Uses a shared recovery mutex to prevent concurrent recovery
   * attempts from multiple parallel tool calls.
   */
  async recoverClientConnection(): Promise<void> {
    if (this.recoveryInProgress) {
      logger('[Lifecycle] Recovery already in-flight — waiting for existing attempt…');
      await this.recoveryInProgress;
      return;
    }

    this.recoveryInProgress = this.doRecoverClientConnection();
    try {
      await this.recoveryInProgress;
    } finally {
      this.recoveryInProgress = undefined;
    }
  }

  // ── Private ────────────────────────────────────────────

  private async doConnect(options?: { forceRestart?: boolean }): Promise<void> {
    logger('[Lifecycle] Connecting — calling mcpReady()…');

    if (this._clientWorkspace === undefined || this._extensionPath === undefined) {
      throw new Error('[Lifecycle] Not initialized — call init() before ensureConnection()');
    }

    const result = await mcpReady({
      clientWorkspace: this._clientWorkspace,
      extensionPath: this._extensionPath,
      forceRestart: options?.forceRestart,
      launch: this._launchFlags,
    });

    // If this MCP process was hot-reloaded (wasHotReloaded flag set in init()),
    // use the current time as the baseline for extension change detection,
    // NOT the original clientStartedAt. This prevents spurious extension
    // hot-reloads when only MCP server files changed.
    if (this._wasHotReloaded) {
      this._debugWindowStartedAt = Date.now();
      logger(`[Lifecycle] MCP hot-reload detected — using fresh timestamp for extension checks: ${new Date(this._debugWindowStartedAt).toISOString()}`);
    } else {
      this._debugWindowStartedAt = result.clientStartedAt ?? Date.now();
    }

    if ('userDataDir' in result && typeof result.userDataDir === 'string') {
      this._userDataDir = result.userDataDir;
    }

    this._connected = true;
    logger(`[Lifecycle] Connected — sessionTs=${new Date(this._debugWindowStartedAt).toISOString()}`);
  }

  private async doRecoverClientConnection(): Promise<void> {
    logger('[Lifecycle] Client pipe recovery requested — restarting Client…');

    if (this._clientWorkspace === undefined || this._extensionPath === undefined) {
      throw new Error('[Lifecycle] Not initialized — call init() before recoverClientConnection()');
    }

    this._connected = false;
    this._debugWindowStartedAt = undefined;

    try {
      await this.doConnect({ forceRestart: true });
      logger('[Lifecycle] Client recovery via doConnect() succeeded');
    } catch (connectErr) {
      const msg = connectErr instanceof Error ? connectErr.message : String(connectErr);
      logger(`[Lifecycle] doConnect() failed: ${msg} — trying handleHotReload()`);
      await this.handleHotReload();
      logger('[Lifecycle] Client recovery via handleHotReload() succeeded');
    }
  }
}

// ── Singleton Export ──────────────────────────────────────

export const /**
 *
 */
lifecycleService = new LifecycleService();
