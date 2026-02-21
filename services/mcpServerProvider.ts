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

const PROVIDER_ID = 'vscode-devtools.mcp-server';
const TOGGLE_COMMAND = 'vscode-devtools.toggleMcpServer';

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

    return [
      new vscode.McpStdioServerDefinition(
        'VS Code DevTools',
        'node',
        [initScript],
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
