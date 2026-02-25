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

import type { BrowserService } from './browser';

import * as vscode from 'vscode';

import { setBrowserService as _setBrowserService, setReconnectCdpCallback as _setReconnectCdpCallback, getClientDevTools } from './clientDevTools';
import { OutputReadTool, setClientLogsStoragePath, setHostLogUri } from './readHostOutputTool';
import { TerminalExecuteTool, TerminalReadTool } from './terminalLmTools';
import { disposeUserActionTracker, getUserActionTracker } from './userActionTracker';
import { WaitTool } from './waitLmTool';
import { log } from './logger';


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
	log('[devtools:runtime] Runtime module loading...');

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
		})
	);

	// ========================================================================
	// Settings View — empty-state welcome button opens extension settings
	// ========================================================================

	const emptyTreeProvider: vscode.TreeDataProvider<never> = {
		getChildren: () => [],
		getTreeItem: () => {
			throw new Error('No items');
		}
	};

	const settingsView = vscode.window.createTreeView('devtools.settings', {
		canSelectMany: false,
		treeDataProvider: emptyTreeProvider
	});
	track(settingsView);

	track(
		vscode.commands.registerCommand('devtools.openSettings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', '@ext:AndyLiner.vscode-devtools');
		})
	);

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

	// Client DevTools — browser automation via CDP (factory-created tools)
	for (const entry of getClientDevTools()) {
		track(vscode.lm.registerTool(entry.name, entry.tool));
	}

	log('[devtools:runtime] All LM tools registered');

	// ========================================================================
	// User Action Tracker (detect user interventions)
	// ========================================================================

	getUserActionTracker();
	track({
		dispose: () => {
			disposeUserActionTracker();
		}
	});
	log('[devtools:runtime] User action tracker initialized');

	log('[devtools:runtime] Runtime activation complete');
}

export async function deactivate() {
	log('[devtools:runtime] Runtime deactivating...');
}
