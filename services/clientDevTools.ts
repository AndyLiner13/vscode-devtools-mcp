/**
 * Client DevTools — BrowserService state management.
 *
 * Holds the shared BrowserService reference and reconnection logic.
 * Used by host-handlers.ts to wire CDP connections and by browser RPC
 * handlers to access the active BrowserService instance.
 */

import type { BrowserService } from './browser';

let activeBrowserService: BrowserService | null = null;
let reconnectCdpCallback: (() => Promise<boolean>) | null = null;

export function setBrowserService(service: BrowserService | null): void {
	activeBrowserService = service;
}

export function getBrowserService(): BrowserService | null {
	return activeBrowserService;
}

export function setReconnectCdpCallback(callback: () => Promise<boolean>): void {
	reconnectCdpCallback = callback;
}

export async function requireBrowserService(): Promise<BrowserService> {
	if (activeBrowserService) return activeBrowserService;

	if (reconnectCdpCallback) {
		const reconnected = await reconnectCdpCallback();
		if (reconnected && activeBrowserService) {
			return activeBrowserService;
		}
	}

	throw new Error('Client DevTools not ready. The client VS Code window has not been spawned yet.');
}
