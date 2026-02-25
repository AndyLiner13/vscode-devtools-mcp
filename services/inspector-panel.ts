/**
 * Inspector WebView Panel Provider (Host-side thin relay)
 *
 * Creates and manages a VS Code WebView panel that hosts the Inspector GUI.
 * ALL business logic lives in the Client — this module just relays messages.
 *
 * Message flow:
 *   WebView postMessage → this relay → Client pipe JSON-RPC → response → WebView postMessage
 */

import net from 'node:net';
import * as vscode from 'vscode';

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

export class InspectorPanelProvider {
	private panel: undefined | vscode.WebviewPanel;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly logger: (msg: string) => void
	) {}

	show(): void {
		if (this.panel) {
			this.panel.reveal();
			return;
		}

		this.logger('Creating Inspector WebView panel');

		this.panel = vscode.window.createWebviewPanel(
			PANEL_VIEW_TYPE,
			'MCP Inspector',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this.extensionUri, 'inspector'),
					vscode.Uri.joinPath(this.extensionUri, 'inspector', 'dist')
				],
				retainContextWhenHidden: true
			}
		);

		this.panel.webview.html = this.getHtml();

		this.panel.webview.onDidReceiveMessage(
			(msg: InspectorMessage) => void this.relayToClient(msg)
		);

		this.panel.onDidDispose(() => {
			this.logger('Inspector WebView panel disposed');
			this.panel = undefined;
		});

		this.logger('Inspector WebView panel created');
	}

	/**
	 * Refresh the WebView by re-setting its HTML (reloads latest inspector/dist/).
	 * Does not destroy the panel — just refreshes the content.
	 */
	refresh(): void {
		if (!this.panel) return;
		this.logger('Refreshing Inspector WebView');
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

	// ── Private ──

	/**
	 * Thin relay: forward every request to Client pipe, return response to WebView.
	 */
	private async relayToClient(msg: InspectorMessage): Promise<void> {
		if (msg.type !== 'request') return;

		this.logger(`Inspector RPC: ${msg.method}`);

		try {
			const result = await sendClientRpc(msg.method, msg.params);
			this.panel?.webview.postMessage({
				id: msg.id,
				result,
				type: 'response'
			} satisfies InspectorMessage);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.logger(`Inspector RPC error (${msg.method}): ${errorMsg}`);
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

		const distUri = vscode.Uri.joinPath(this.extensionUri, 'inspector', 'dist');
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
			script-src 'nonce-${nonce}' blob:;
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
	context: vscode.ExtensionContext,
	logger: (msg: string) => void
): InspectorPanelProvider {
	const provider = new InspectorPanelProvider(context.extensionUri, logger);

	context.subscriptions.push(
		vscode.commands.registerCommand('devtools.openInspector', () => { provider.show(); }),
		vscode.commands.registerCommand('devtools.refreshInspector', () => { provider.refresh(); }),
		{ dispose: () => { provider.dispose(); } }
	);

	logger('Inspector panel commands registered');
	return provider;
}
