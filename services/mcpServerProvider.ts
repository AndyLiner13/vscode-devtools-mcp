/**
 * MCP Server Definition Provider
 *
 * Registers the MCP server as a VS Code MCP provider so that Copilot and
 * other MCP clients discover it automatically. The extension owns the
 * server lifecycle — no user-facing mcp.json configuration needed.
 *
 * The status bar and connection state are managed externally by extension.ts.
 * This provider only handles server definition provisioning and toggle logic.
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

const PROVIDER_ID = 'devtools.mcp-server';
const TOGGLE_COMMAND = 'devtools.toggleMcpServer';

/**
 * Build the resolved config object from VS Code settings to pass as env var.
 */
function buildConfigEnv(workspacePath: string): Record<string, string> {
  const config = vscode.workspace.getConfiguration('devtools');

  const clientWorkspaceRaw = config.get<string>('clientWorkspace', '');
  const extensionPathRaw = config.get<string>('extensionPath', '.');

  const clientWorkspace = clientWorkspaceRaw
    ? (path.isAbsolute(clientWorkspaceRaw) ? clientWorkspaceRaw : path.resolve(workspacePath, clientWorkspaceRaw))
    : workspacePath;
  const extensionPath = path.isAbsolute(extensionPathRaw)
    ? extensionPathRaw
    : path.resolve(workspacePath, extensionPathRaw);

  const resolvedConfig = {
    clientWorkspace,
    extensionPath,
    hotReload: {
      enabled: config.get<boolean>('hotReload.enabled', true),
      mcpStatusTimeout: config.get<number>('hotReload.mcpStatusTimeout', 60000),
    },
    launch: {
      disableGpu: config.get<boolean>('launch.disableGpu', false),
      disableWorkspaceTrust: config.get<boolean>('launch.disableWorkspaceTrust', false),
      extraArgs: config.get<string[]>('launch.extraArgs', []),
      skipReleaseNotes: config.get<boolean>('launch.skipReleaseNotes', true),
      skipWelcome: config.get<boolean>('launch.skipWelcome', true),
      verbose: config.get<boolean>('launch.verbose', false),
    },
  };

  return {
    DEVTOOLS_CONFIG: JSON.stringify(resolvedConfig),
  };
}

export class McpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeMcpServerDefinitions = this._onDidChange.event;

  private readonly _onDidToggle = new vscode.EventEmitter<boolean>();
  /** Fires when the provider is toggled on/off. Payload = new enabled state. */
  readonly onDidToggle = this._onDidToggle.event;

  private _enabled = true;
  private readonly _workspacePath: string | undefined;

  constructor() {
    this._workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Notify VS Code that server definitions changed (triggers re-spawn). */
  refresh(): void {
    this._onDidChange.fire();
  }

  provideMcpServerDefinitions(
    _token: vscode.CancellationToken,
  ): vscode.McpStdioServerDefinition[] {
    console.log(`[mcpServerProvider] provideMcpServerDefinitions called (enabled=${this._enabled}, workspace=${this._workspacePath ? 'YES' : 'NO'})`);
    if (!this._enabled || !this._workspacePath) {
      console.log('[mcpServerProvider] Returning empty — provider disabled or no workspace');
      return [];
    }

    const initScript = path.join(
      this._workspacePath,
      'mcp-server',
      'scripts',
      'init.mjs',
    );

    console.log(`[mcpServerProvider] Returning definition: command=node, args=[${initScript}]`);
    const env = buildConfigEnv(this._workspacePath);

    return [
      new vscode.McpStdioServerDefinition(
        'Experimental DevTools',
        'node',
        [initScript],
        env,
      ),
    ];
  }

  toggle(): void {
    this._enabled = !this._enabled;
    this._onDidChange.fire();
    this._onDidToggle.fire(this._enabled);
  }

  /**
   * Called by VS Code before every MCP server start — including after crashes.
   * Rebuilds the MCP server to ensure fresh output. If the build fails, throws
   * an error so VS Code surfaces it to Copilot instead of starting a broken server.
   */
  async resolveMcpServerDefinition(
    server: vscode.McpStdioServerDefinition,
    token: vscode.CancellationToken,
  ): Promise<vscode.McpStdioServerDefinition> {
    console.log('[mcpServerProvider] resolveMcpServerDefinition called — building MCP server...');
    if (!this._workspacePath) {
      console.log('[mcpServerProvider] No workspace path — skipping build');
      return server;
    }

    const mcpServerRoot = path.join(this._workspacePath, 'mcp-server');
    const buildStart = Date.now();
    const buildError = await this._runBuild(mcpServerRoot, token);
    const buildDuration = Date.now() - buildStart;

    if (buildError) {
      console.log(`[mcpServerProvider] Build FAILED after ${buildDuration}ms: ${buildError.substring(0, 200)}`);
      throw new Error(`MCP server build failed:\n${  buildError}`);
    }

    console.log(`[mcpServerProvider] Build succeeded in ${buildDuration}ms — server ready to start`);
    return server;
  }

  private async _runBuild(packageRoot: string, token: vscode.CancellationToken): Promise<null | string> {
    return new Promise(resolve => {
      const pm = this._detectPackageManager(packageRoot);
      const cmd = `${pm  } run build`;

      console.log(`[mcpServerProvider] Pre-start build: ${  cmd  } in ${  packageRoot}`);

      const child = exec(cmd, { cwd: packageRoot, timeout: 300_000 }, (error, stdout, stderr) => {
        if (token.isCancellationRequested) {
          resolve('Build cancelled');
          return;
        }
        if (error) {
          const output = [stderr, stdout].filter(Boolean).join('\n').trim();
          resolve(output || error.message);
        } else {
          resolve(null);
        }
      });

      token.onCancellationRequested(() => {
        child.kill();
      });
    });
  }

  private _detectPackageManager(packageRoot: string): string {
    if (existsSync(path.join(packageRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (existsSync(path.join(packageRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }

  /** Programmatically set enabled state. Only fires events if state actually changes. */
  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) {
      return;
    }
    this._enabled = enabled;
    this._onDidChange.fire();
    this._onDidToggle.fire(this._enabled);
  }

  dispose(): void {
    this._onDidChange.dispose();
    this._onDidToggle.dispose();
  }
}

/**
 * Register the MCP server provider and toggle command.
 * The status bar is managed by extension.ts — not by this module.
 */
export function registerMcpServerProvider(
  context: vscode.ExtensionContext,
): McpServerProvider {
  const provider = new McpServerProvider();

  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider(PROVIDER_ID, provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(TOGGLE_COMMAND, () => {
      provider.toggle();
    }),
  );

  context.subscriptions.push(provider);

  return provider;
}
