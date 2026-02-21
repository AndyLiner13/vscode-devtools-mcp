/**
 * MCP Server Definition Provider
 *
 * Registers the MCP server as a VS Code MCP provider so that Copilot and
 * other MCP clients discover it automatically. The extension owns the
 * server lifecycle — no user-facing mcp.json configuration needed.
 *
 * The server is auto-started on activation and can be toggled on/off
 * via the status bar item or the toggle command.
 */

import * as path from 'path';
import * as vscode from 'vscode';

const PROVIDER_ID = 'vscode-devtools.mcp-server';
const TOGGLE_COMMAND = 'vscode-devtools.toggleMcpServer';

export class McpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeMcpServerDefinitions = this._onDidChange.event;

  private _enabled = true;
  private readonly _statusBarItem: vscode.StatusBarItem;
  private readonly _workspacePath: string | undefined;

  constructor() {
    // Use the first workspace folder as the MCP server root (for hot-reload support)
    this._workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99,
    );
    this._statusBarItem.command = TOGGLE_COMMAND;
    this._updateStatusBar();
    this._statusBarItem.show();
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
    this._updateStatusBar();
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
    this._statusBarItem.dispose();
  }

  private _updateStatusBar(): void {
    if (this._enabled) {
      this._statusBarItem.text = '$(circle-filled) MCP Server';
      this._statusBarItem.tooltip = 'MCP Server: Running — click to stop';
      this._statusBarItem.backgroundColor = undefined;
    } else {
      this._statusBarItem.text = '$(circle-outline) MCP Server';
      this._statusBarItem.tooltip = 'MCP Server: Stopped — click to start';
      this._statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground',
      );
    }
  }
}

/**
 * Register the MCP server provider, toggle command, and status bar item.
 * Call during extension activation (Host role only).
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
