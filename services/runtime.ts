/**
 * VS Code DevTools (devtools) - Runtime
 *
 * GUI features loaded dynamically by extension.ts:
 * - Workspace Root tree view — Git workspace picker
 * - Language Model tool registrations (native VS Code toggle)
 *
 * Terminal management is handled by client-handlers.ts (Client role).
 * If this module fails to load, the extension enters Safe Mode.
 */

import * as vscode from 'vscode';
import {
    ProjectTreeProvider,
    setProjectTreeProvider,
} from '../gui';
import { OutputReadTool, setClientLogsStoragePath } from './readHostOutputTool';
import {
    TerminalReadTool,
    TerminalExecuteTool,
} from './terminalLmTools';
import { WaitTool } from './waitLmTool';
import { McpStatusTool } from './mcpStatusTool';
import { getUserActionTracker, disposeUserActionTracker } from './userActionTracker';

// ============================================================================
// View Constants
// ============================================================================

const Views = {
    Container: 'devtools',
    Project: 'devtools.project',
};

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
    // Workspace Root Tree View — Git workspace picker
    // ========================================================================

    const projectTreeProvider = new ProjectTreeProvider();
    setProjectTreeProvider(projectTreeProvider);

    const projectTreeView = vscode.window.createTreeView(Views.Project, {
        treeDataProvider: projectTreeProvider,
        canSelectMany: false,
    });
    track(projectTreeView);
    track({ dispose: () => projectTreeProvider.dispose() });

    track(vscode.commands.registerCommand('devtools.refreshProjectTree', () => {
        projectTreeProvider.refresh();
    }));

    track(vscode.commands.registerCommand('devtools.selectWorkspace', (item) => {
        projectTreeProvider.selectWorkspace(item);
    }));

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