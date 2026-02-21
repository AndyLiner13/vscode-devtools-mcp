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

import * as path from 'path';
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
    launch: {
      skipReleaseNotes: config.get<boolean>('launch.skipReleaseNotes', true),
      skipWelcome: config.get<boolean>('launch.skipWelcome', true),
      disableGpu: config.get<boolean>('launch.disableGpu', false),
      disableWorkspaceTrust: config.get<boolean>('launch.disableWorkspaceTrust', false),
      verbose: config.get<boolean>('launch.verbose', false),
      extraArgs: config.get<string[]>('launch.extraArgs', []),
    },
    hotReload: {
      enabled: config.get<boolean>('hotReload.enabled', true),
      mcpStatusTimeout: config.get<number>('hotReload.mcpStatusTimeout', 60000),
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
    if (!this._enabled || !this._workspacePath) {
      return [];
    }

    const initScript = path.join(
      this._workspacePath,
      'mcp-server',
      'scripts',
      'init.mjs',
    );

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
