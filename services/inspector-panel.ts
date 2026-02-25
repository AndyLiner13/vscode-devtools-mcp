/**
 * Inspector WebView Panel Provider (Host-side thin relay)
 *
 * Creates and manages a VS Code WebView panel that hosts the Inspector GUI.
 * ALL business logic lives in the Client — this module just relays messages.
 *
 * Message flow:
 *   WebView postMessage → this relay → Client pipe JSON-RPC → response → WebView postMessage
 */

import { existsSync } from 'node:fs';
import net from 'node:net';
import { isAbsolute, join, resolve } from 'node:path';
import * as vscode from 'vscode';

import { getHotReloadService } from './hotReloadService';
import { log } from './logger';

// ── Types ──

interface InspectorMessage {
	error?: string;
	id: string;
	method?: string;
	params?: unknown;
	result?: unknown;
	type: 'event' | 'request' | 'response';
}

// ── Constants ──

const IS_WINDOWS = process.platform === 'win32';
const CLIENT_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';
const PANEL_VIEW_TYPE = 'mcpInspector';
const RPC_TIMEOUT_MS = 30_000;
const STATE_KEY_PANEL_OPEN = 'inspector.panelOpen';

// ── Client Pipe RPC ──

let rpcIdCounter = 0;

/**
 * Send a JSON-RPC request to the Client pipe and return the result.
 * Opens a short-lived connection per request (simple and stateless).
 */
async function sendClientRpc(method: string, params?: unknown): Promise<unknown> {
	rpcIdCounter += 1;
	const id = `inspector-${rpcIdCounter}`;

	return new Promise((resolve, reject) => {
		let settled = false;
		let responseBuffer = '';

		const finish = (error?: Error, result?: unknown): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				socket.destroy();
			} catch {
				// best-effort
			}
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		};

		const socket = net.createConnection(CLIENT_PIPE_PATH, () => {
			const request = JSON.stringify({
				id,
				jsonrpc: '2.0',
				method: `inspector.${method}`,
				params: params ?? {}
			});
			socket.write(`${request}\n`);
		});

		socket.setEncoding('utf8');

		socket.on('data', (chunk: string) => {
			responseBuffer += chunk;
			const newlineIndex = responseBuffer.indexOf('\n');
			if (newlineIndex === -1) return;

			const line = responseBuffer.slice(0, newlineIndex).trim();
			if (!line) return;

			try {
				const response = JSON.parse(line) as { error?: { message: string }; result?: unknown };
				if (response.error) {
					finish(new Error(response.error.message));
				} else {
					finish(undefined, response.result);
				}
			} catch {
				finish(new Error('Invalid JSON-RPC response from Client'));
			}
		});

		socket.on('error', (err) => {
			finish(new Error(`Client pipe error: ${err.message}`));
		});

		socket.on('close', () => {
			finish(new Error('Client pipe closed before response'));
		});

		const timer = setTimeout(() => {
			finish(new Error(`Client RPC timed out after ${RPC_TIMEOUT_MS}ms: inspector.${method}`));
		}, RPC_TIMEOUT_MS);
	});
}

// ── Nonce Generator ──

function getNonce(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

// ── Panel Provider ──

class InspectorPanelProvider {
	private panel: undefined | vscode.WebviewPanel;
	private readonly workspaceState: vscode.Memento;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly inspectorUri: vscode.Uri,
		workspaceState: vscode.Memento
	) {
		this.workspaceState = workspaceState;
	}

	show(): void {
		if (this.panel) {
			this.panel.reveal();
			return;
		}

		log('Creating Inspector WebView panel');

		const panel = vscode.window.createWebviewPanel(
			PANEL_VIEW_TYPE,
			'MCP Inspector',
			vscode.ViewColumn.One,
			this.getWebviewOptions()
		);

		this.attachPanel(panel);
		log('Inspector WebView panel created');
	}

	/**
	 * Attach a WebView panel (newly created or restored by serializer)
	 * and wire up message relay + dispose tracking.
	 */
	attachPanel(panel: vscode.WebviewPanel): void {
		this.panel = panel;
		this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'icon.png');
		// Ensure localResourceRoots include the workspace inspector path
		// (restored panels may have stale roots from a previous session)
		this.panel.webview.options = this.getWebviewOptions();
		this.panel.webview.html = this.getHtml();

		this.panel.webview.onDidReceiveMessage(
			(msg: InspectorMessage) => void this.relayToClient(msg)
		);

		this.panel.onDidDispose(() => {
			log('Inspector WebView panel disposed');
			this.panel = undefined;
			void this.workspaceState.update(STATE_KEY_PANEL_OPEN, false);
		});

		void this.workspaceState.update(STATE_KEY_PANEL_OPEN, true);
	}

	/**
	 * Refresh the WebView by re-setting its HTML (reloads latest inspector/dist/).
	 * Does not destroy the panel — just refreshes the content.
	 */
	refresh(): void {
		if (!this.panel) return;
		log('Refreshing Inspector WebView');
		this.panel.webview.html = this.getHtml();
	}

	/**
	 * Push an event from the Client to the WebView.
	 * Used by the Client backend to send live updates (record mutations, etc.).
	 */
	pushEvent(method: string, data?: unknown): void {
		if (!this.panel) return;
		const message: InspectorMessage = {
			id: `event-${Date.now()}`,
			method,
			result: data,
			type: 'event'
		};
		void this.panel.webview.postMessage(message);
	}

	get isVisible(): boolean {
		return this.panel?.visible ?? false;
	}

	dispose(): void {
		this.panel?.dispose();
	}

	/**
	 * Whether the panel was previously open (persisted across reloads).
	 */
	get wasOpen(): boolean {
		return this.workspaceState.get<boolean>(STATE_KEY_PANEL_OPEN) ?? false;
	}

	// ── Private ──

	private getWebviewOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
		const roots = [
			vscode.Uri.joinPath(this.extensionUri, 'inspector'),
			vscode.Uri.joinPath(this.extensionUri, 'inspector', 'dist')
		];
		// When serving from workspace source, also allow the workspace inspector paths
		if (this.inspectorUri.toString() !== vscode.Uri.joinPath(this.extensionUri, 'inspector').toString()) {
			roots.push(this.inspectorUri);
			roots.push(vscode.Uri.joinPath(this.inspectorUri, 'dist'));
		}
		return {
			enableScripts: true,
			localResourceRoots: roots,
			retainContextWhenHidden: true
		};
	}

	/**
	 * Thin relay: forward every request to Client pipe, return response to WebView.
	 */
	private async relayToClient(msg: InspectorMessage): Promise<void> {
		if (msg.type !== 'request' || !msg.method) return;

		log(`Inspector RPC: ${msg.method}`);

		try {
			const result = await sendClientRpc(msg.method, msg.params);
			this.panel?.webview.postMessage({
				id: msg.id,
				result,
				type: 'response'
			} satisfies InspectorMessage);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			log(`Inspector RPC error (${msg.method}): ${errorMsg}`);
			this.panel?.webview.postMessage({
				error: errorMsg,
				id: msg.id,
				type: 'response'
			} satisfies InspectorMessage);
		}
	}

	/**
	 * Generate the WebView HTML that loads the pre-built Inspector frontend.
	 */
	private getHtml(): string {
		if (!this.panel) return '';

		const distUri = vscode.Uri.joinPath(this.inspectorUri, 'dist');
		const { webview } = this.panel;

		const mainJs = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'main.js'));
		const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'main.css'));
		const workerBaseUri = webview.asWebviewUri(distUri);
		const nonce = getNonce();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy"
		content="default-src 'none';
			style-src ${webview.cspSource} 'unsafe-inline';
			script-src 'nonce-${nonce}' blob: ${webview.cspSource};
			font-src ${webview.cspSource};
			img-src ${webview.cspSource} data:;
			worker-src blob:;
			connect-src ${webview.cspSource};">
	<link rel="stylesheet" href="${stylesUri.toString()}">
</head>
<body>
	<div id="app"></div>
	<script nonce="${nonce}">globalThis.__WORKER_BASE_URI__ = '${workerBaseUri.toString()}';</script>
	<script type="module" nonce="${nonce}" src="${mainJs.toString()}"></script>
</body>
</html>`;
	}
}

// ── Registration Helper ──

/**
 * Register the Inspector panel and related commands in the Host activation path.
 * Returns the panel provider for use by the smart refresh orchestrator.
 */
export function registerInspectorPanel(
	context: vscode.ExtensionContext
): InspectorPanelProvider {
	// Prefer workspace inspector source for hot-reload + asset serving (development).
	// Fall back to the installed extension path (production).
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
	const workspaceInspectorPath = workspaceRoot ? join(workspaceRoot.fsPath, 'inspector') : null;
	const hasWorkspaceSource = workspaceInspectorPath !== null && existsSync(join(workspaceInspectorPath, 'tsconfig.json'));

	const inspectorRoot = hasWorkspaceSource
		? workspaceInspectorPath
		: join(context.extensionUri.fsPath, 'inspector');
	const inspectorUri = hasWorkspaceSource
		? vscode.Uri.file(inspectorRoot)
		: vscode.Uri.joinPath(context.extensionUri, 'inspector');

	if (hasWorkspaceSource) {
		log(`Inspector using workspace source: ${inspectorRoot}`);
	} else {
		log(`Inspector using installed extension: ${inspectorRoot}`);
	}

	const provider = new InspectorPanelProvider(context.extensionUri, inspectorUri, context.workspaceState);

	/**
	 * Resolve the extension development path from VS Code settings.
	 * Mirrors the config resolution in host-handlers' resolveClientConfig.
	 */
	const resolveExtensionPath = (): string | undefined => {
		const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!workspacePath) return undefined;
		const config = vscode.workspace.getConfiguration('devtools');
		const raw = config.get<string>('extensionPath', '.');
		return isAbsolute(raw) ? raw : resolve(workspacePath, raw);
	};

	/**
	 * Build the inspector if source changed. Returns whether it was rebuilt.
	 */
	const rebuildInspectorIfNeeded = async (): Promise<boolean> => {
		const hotReload = getHotReloadService();
		if (!hotReload) return false;

		const result = await hotReload.checkInspector(inspectorRoot);
		if (result.rebuilt) {
			log('Inspector frontend rebuilt — refreshing WebView');
			return true;
		}
		if (result.changed && result.buildError) {
			log(`Inspector build failed: ${result.buildError}`);
			vscode.window.showErrorMessage(`Inspector build failed: ${result.buildError}`);
		}
		return false;
	};

	/**
	 * Smart refresh: check both inspector and extension source.
	 * - Inspector changed → rebuild inspector, refresh WebView
	 * - Extension changed → rebuild extension, restart client (with notification)
	 * - Neither changed → refresh WebView only (to pick up manual edits)
	 * The client window is NEVER restarted unless extension source actually changed.
	 */
	const smartRefresh = async (): Promise<void> => {
		const hotReload = getHotReloadService();
		if (!hotReload) {
			provider.refresh();
			return;
		}

		// Phase 1: Detect changes without building (fast hash checks)
		const inspectorChange = hotReload.detectChange(inspectorRoot, 'inspector');
		const extensionPath = resolveExtensionPath();
		const extChange = extensionPath ? hotReload.detectChange(extensionPath, 'ext') : { changed: false, currentHash: '' };

		const needsInspectorBuild = inspectorChange.changed;
		const needsExtBuild = extChange.changed && extensionPath !== undefined;

		// Phase 2: If nothing changed, just refresh the WebView and return
		if (!needsInspectorBuild && !needsExtBuild) {
			log('[smartRefresh] No source changes detected — refreshing WebView only');
			provider.refresh();
			return;
		}

		// Phase 3: Rebuild with progress notification
		await vscode.window.withProgress(
			{
				cancellable: false,
				location: vscode.ProgressLocation.Notification,
				title: 'Smart Refresh'
			},
			async (progress) => {
				// Extension rebuild + client restart (only if extension source changed)
				if (needsExtBuild && extensionPath) {
					progress.report({ message: 'Rebuilding extension…' });
					const buildError = await hotReload.runBuild(extensionPath, 'compile');
					if (buildError) {
						log(`[smartRefresh] Extension build failed: ${buildError}`);
						vscode.window.showErrorMessage(`Extension build failed: ${buildError}`);
					} else {
						await hotReload.commitHash('ext', extChange.currentHash);
						log('[smartRefresh] Extension rebuilt — restarting client window');

						progress.report({ message: 'Restarting client window…' });
						try {
							const { startClientWindow, stopClientWindow } = await import('./host-handlers');
							stopClientWindow();
							await startClientWindow();
							vscode.window.showInformationMessage('✅ Extension rebuilt — client reconnected');
						} catch (err) {
							const msg = err instanceof Error ? err.message : String(err);
							log(`[smartRefresh] Client restart failed: ${msg}`);
							vscode.window.showErrorMessage(`Client restart failed: ${msg}`);
						}
					}
				}

				// Inspector rebuild (only if inspector source changed)
				if (needsInspectorBuild) {
					progress.report({ message: 'Rebuilding Inspector…' });
					const buildError = await hotReload.runBuild(inspectorRoot, 'inspector:build');
					if (buildError) {
						log(`[smartRefresh] Inspector build failed: ${buildError}`);
						vscode.window.showErrorMessage(`Inspector build failed: ${buildError}`);
					} else {
						await hotReload.commitHash('inspector', inspectorChange.currentHash);
						log('[smartRefresh] Inspector rebuilt');
					}
				}

				// Refresh WebView with latest build output
				progress.report({ message: 'Refreshing Inspector…' });
				provider.refresh();
			}
		);
	};

	// Register serializer so VS Code can restore the panel across reloads.
	// Must be registered synchronously during activation (before any await).
	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
			async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
				log('Restoring Inspector panel from previous session');
				provider.attachPanel(panel);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('devtools.openInspector', async () => {
			const rebuilt = await rebuildInspectorIfNeeded();
			if (rebuilt && provider.isVisible) {
				provider.refresh();
			}
			provider.show();
		}),
		vscode.commands.registerCommand('devtools.refreshInspector', async () => {
			await smartRefresh();
		}),
		{ dispose: () => { provider.dispose(); } }
	);

	log('Inspector panel commands registered');
	return provider;
}
