/**
 * VS Code DevTools (devtools) - Runtime
 *
 * GUI features loaded dynamically by extension.ts:
 * - Settings welcome view — empty-state button to open extension settings
 *
 * If this module fails to load, the extension enters Safe Mode.
 */

import * as vscode from 'vscode';

import type { BrowserService } from './browser';
import { setBrowserService, setReconnectCdpCallback } from './clientDevTools';
import { disposeUserActionTracker, getUserActionTracker } from './userActionTracker';
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

export function wireReconnectCdpCallback(callback: () => Promise<boolean>): void {
	setReconnectCdpCallback(callback);
}

export function wireBrowserService(service: BrowserService | null): void {
	setBrowserService(service);
}
