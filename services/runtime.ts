/**
 * VS Code DevTools (devtools) - Runtime
 *
 * GUI features loaded dynamically by extension.ts:
 * - Settings welcome view — empty-state button to open extension settings
 * - Language Model tool registrations (native VS Code toggle)
 *
 * Terminal management is handled by client-handlers.ts (Client role).
 * If this module fails to load, the extension enters Safe Mode.
 */

import * as vscode from 'vscode';
import { OutputReadTool, setClientLogsStoragePath } from './readHostOutputTool';
import {
    TerminalReadTool,
    TerminalExecuteTool,
} from './terminalLmTools';
import { WaitTool } from './waitLmTool';
import { McpStatusTool } from './mcpStatusTool';
import { getUserActionTracker, disposeUserActionTracker } from './userActionTracker';

// ============================================================================
// Runtime Activation
// ============================================================================

export async function activate(context: vscode.ExtensionContext) {
    console.log('[devtools:runtime] Runtime module loading...');

    const trackedDisposables: vscode.Disposable[] = [];
    const track = <T extends vscode.Disposable>(disposable: T): T => {
        trackedDisposables[trackedDisposables.length] = disposable;
        return disposable;
    };

    context.subscriptions.push(
        new vscode.Disposable(() => {
            for (let i = trackedDisposables.length - 1; i >= 0; i--) {
                try {
                    trackedDisposables[i].dispose();
                } catch {
                    // Ignore disposal errors
                }
            }
        }),
    );

    // ========================================================================
    // Settings View — empty-state welcome button opens extension settings
    // ========================================================================

    const emptyTreeProvider: vscode.TreeDataProvider<never> = {
        getTreeItem: () => { throw new Error('No items'); },
        getChildren: () => [],
    };

    const settingsView = vscode.window.createTreeView('devtools.settings', {
        treeDataProvider: emptyTreeProvider,
        canSelectMany: false,
    });
    track(settingsView);

    track(vscode.commands.registerCommand('devtools.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:AndyLiner.vscode-devtools');
    }));

    // ========================================================================
    // LM Tool Registration (all registered unconditionally, native toggle)
    // ========================================================================

    if (context.storageUri) {
        setClientLogsStoragePath(context.storageUri.fsPath);
    }

    track(vscode.lm.registerTool('output_read', new OutputReadTool()));
    track(vscode.lm.registerTool('terminal_read', new TerminalReadTool()));
    track(vscode.lm.registerTool('terminal_execute', new TerminalExecuteTool()));
    track(vscode.lm.registerTool('wait', new WaitTool()));
    track(vscode.lm.registerTool('mcpStatus', new McpStatusTool()));
    console.log('[devtools:runtime] All LM tools registered');

    // ========================================================================
    // User Action Tracker (detect user interventions)
    // ========================================================================

    getUserActionTracker();
    track({ dispose: () => disposeUserActionTracker() });
    console.log('[devtools:runtime] User action tracker initialized');

    console.log('[devtools:runtime] Runtime activation complete');
}

export async function deactivate() {
    console.log('[devtools:runtime] Runtime deactivating...');
}