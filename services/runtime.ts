/**
 * VS Code DevTools (devtools) - Runtime
 *
 * GUI features loaded dynamically by extension.ts:
 * - Settings welcome view — empty-state button to open extension settings
 * - Language Model tool registrations (native VS Code toggle)
 *
 * If this module fails to load, the extension enters Safe Mode.
 */

import * as vscode from 'vscode';

import { LogFileReadTool } from './logFileReadTool';
import { OutputReadTool, setClientLogsStoragePath, setHostLogUri } from './readHostOutputTool';
import { disposeUserActionTracker, getUserActionTracker } from './userActionTracker';
import { WaitTool } from './waitLmTool';
import { log } from './logger';


// ============================================================================
// Runtime Activation
// ============================================================================

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

	track(vscode.lm.registerTool('logFile_read', new LogFileReadTool()));
	track(vscode.lm.registerTool('output_read', new OutputReadTool()));
	track(vscode.lm.registerTool('wait', new WaitTool()));

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
