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
import { OutputReadTool, setClientLogsStoragePath, setHostLogUri } from './readHostOutputTool';
import {
    TerminalReadTool,
    TerminalExecuteTool,
} from './terminalLmTools';
import { WaitTool } from './waitLmTool';
import { McpStatusTool } from './mcpStatusTool';
import { getUserActionTracker, disposeUserActionTracker } from './userActionTracker';
import { getClientDevTools, setReconnectCdpCallback as _setReconnectCdpCallback, setBrowserService as _setBrowserService } from './clientDevTools';
import type { BrowserService } from './browser';

// ============================================================================
// Runtime Activation
// ============================================================================

/**
 * Re-export setReconnectCdpCallback so extension.ts can wire the callback
 * from the host-handlers module (which is in a separate esbuild bundle).
 * This ensures the callback is set in THIS bundle's clientDevTools module instance.
 */
export function wireReconnectCdpCallback(callback: () => Promise<boolean>): void {
    _setReconnectCdpCallback(callback);
}

/**
 * Re-export setBrowserService so extension.ts can wire the browser service
 * from the host-handlers module (which is in a separate esbuild bundle).
 * This ensures the service is set in THIS bundle's clientDevTools module instance.
 */
export function wireBrowserService(service: BrowserService | null): void {
    _setBrowserService(service);
}

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
    setHostLogUri(context.logUri.fsPath);

    track(vscode.lm.registerTool('output_read', new OutputReadTool()));
    track(vscode.lm.registerTool('terminal_read', new TerminalReadTool()));
    track(vscode.lm.registerTool('terminal_execute', new TerminalExecuteTool()));
    track(vscode.lm.registerTool('wait', new WaitTool()));
    track(vscode.lm.registerTool('mcpStatus', new McpStatusTool()));

    // Client DevTools — browser automation via CDP (factory-created tools)
    for (const entry of getClientDevTools()) {
        track(vscode.lm.registerTool(entry.name, entry.tool));
    }

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