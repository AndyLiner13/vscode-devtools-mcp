import net from 'node:net';

import * as vscode from 'vscode';

import { log, warn } from './logger';

const IS_WINDOWS = process.platform === 'win32';
const CLIENT_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';

// Highlight decoration for URI-opened ranges — golden selection with overview ruler mark
const uriHighlightDecoration = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(255, 213, 79, 0.25)',
	border: '1px solid rgba(255, 213, 79, 0.4)',
	isWholeLine: false,
	overviewRulerColor: 'rgba(255, 213, 79, 0.7)',
	overviewRulerLane: vscode.OverviewRulerLane.Center
});

// Auto-clear: remove highlight when the user types or changes the active editor
let clearListenerDisposable: vscode.Disposable | undefined;

function scheduleClearOnInteraction(): void {
	clearListenerDisposable?.dispose();

	const clearHighlights = () => {
		for (const editor of vscode.window.visibleTextEditors) {
			editor.setDecorations(uriHighlightDecoration, []);
		}
		clearListenerDisposable?.dispose();
		clearListenerDisposable = undefined;
	};

	const typingListener = vscode.workspace.onDidChangeTextDocument(clearHighlights);
	const editorListener = vscode.window.onDidChangeActiveTextEditor(clearHighlights);

	clearListenerDisposable = {
		dispose() {
			typingListener.dispose();
			editorListener.dispose();
		}
	};
}

/**
 * Parse a range-annotated path like:
 *   /C:/Users/Andy/projects/graphrag.js/src/indexer.ts:42:10-57:25
 *
 * Returns the file path and an optional range (all 1-based in the URI, converted to 0-based).
 */
function parseFilePathWithRange(rawPath: string): { filePath: string; range?: vscode.Range } {
	// Match: <path>:<startLine>:<startCol>-<endLine>:<endCol>
	const rangeMatch = /^(.+?):(\d+):(\d+)-(\d+):(\d+)$/.exec(rawPath);
	if (rangeMatch) {
		const filePath = rangeMatch[1];
		const startLine = parseInt(rangeMatch[2], 10) - 1;
		const startCol = parseInt(rangeMatch[3], 10) - 1;
		const endLine = parseInt(rangeMatch[4], 10) - 1;
		const endCol = parseInt(rangeMatch[5], 10) - 1;
		return {
			filePath,
			range: new vscode.Range(Math.max(0, startLine), Math.max(0, startCol), Math.max(0, endLine), Math.max(0, endCol))
		};
	}

	// Match: <path>:<line>:<col> (single position — no highlight, just cursor)
	const posMatch = /^(.+?):(\d+):(\d+)$/.exec(rawPath);
	if (posMatch) {
		const filePath = posMatch[1];
		const line = parseInt(posMatch[2], 10) - 1;
		const col = parseInt(posMatch[3], 10) - 1;
		const pos = new vscode.Position(Math.max(0, line), Math.max(0, col));
		return { filePath, range: new vscode.Range(pos, pos) };
	}

	// Match: <path>:<line> (line only — place cursor at start of line)
	const lineMatch = /^(.+?):(\d+)$/.exec(rawPath);
	if (lineMatch) {
		const filePath = lineMatch[1];
		const line = parseInt(lineMatch[2], 10) - 1;
		const pos = new vscode.Position(Math.max(0, line), 0);
		return { filePath, range: new vscode.Range(pos, pos) };
	}

	return { filePath: rawPath };
}

export class DevToolsUriHandler implements vscode.UriHandler {
	async handleUri(uri: vscode.Uri): Promise<void> {
		log(`[uri-handler] Incoming URI: ${uri.toString()}`);

		if (uri.path.startsWith('/open/client/') || uri.path.startsWith('/open/client\\')) {
			const rawFilePath = uri.path.slice('/open/client/'.length);
			await this.openFileOnClient(rawFilePath);
			return;
		}

		if (uri.path.startsWith('/open/') || uri.path.startsWith('/open\\')) {
			const rawFilePath = uri.path.slice('/open/'.length);
			await this.openFileWithRange(rawFilePath);
			return;
		}

		warn(`[uri-handler] Unknown path: ${uri.path}`);
	}

	private async openFileWithRange(rawPath: string): Promise<void> {
		const { filePath, range } = parseFilePathWithRange(decodeURIComponent(rawPath));

		if (!filePath) {
			warn('[uri-handler] No file path provided');
			return;
		}

		log(
			`[uri-handler] Opening ${filePath}${range ? ` at ${range.start.line + 1}:${range.start.character + 1}-${range.end.line + 1}:${range.end.character + 1}` : ''}`
		);

		const fileUri = vscode.Uri.file(filePath);

		try {
			await vscode.workspace.fs.stat(fileUri);
		} catch {
			warn(`[uri-handler] File not found: ${filePath}`);
			vscode.window.showErrorMessage(`File not found: ${filePath}`);
			return;
		}

		const doc = await vscode.workspace.openTextDocument(fileUri);
		const editor = await vscode.window.showTextDocument(doc, {
			preserveFocus: false,
			preview: true
		});

		if (!range) {
			return;
		}

		// Clamp to document bounds
		const clampedStart = new vscode.Position(
			Math.min(range.start.line, doc.lineCount - 1),
			Math.min(range.start.character, doc.lineAt(Math.min(range.start.line, doc.lineCount - 1)).text.length)
		);
		const clampedEnd = new vscode.Position(
			Math.min(range.end.line, doc.lineCount - 1),
			Math.min(range.end.character, doc.lineAt(Math.min(range.end.line, doc.lineCount - 1)).text.length)
		);
		const clampedRange = new vscode.Range(clampedStart, clampedEnd);

		// Place cursor at the start position without selecting the range
		editor.selection = new vscode.Selection(clampedStart, clampedStart);
		editor.revealRange(clampedRange, vscode.TextEditorRevealType.InCenter);

		// Apply highlight decoration if this is a real range (not a single cursor position)
		const isRealRange = !clampedRange.isEmpty;
		if (isRealRange) {
			for (const visibleEditor of vscode.window.visibleTextEditors) {
				visibleEditor.setDecorations(uriHighlightDecoration, []);
			}
			editor.setDecorations(uriHighlightDecoration, [clampedRange]);
			scheduleClearOnInteraction();
		}
	}

	private async openFileOnClient(rawPath: string): Promise<void> {
		const { filePath, range } = parseFilePathWithRange(decodeURIComponent(rawPath));

		if (!filePath) {
			warn('[uri-handler] No file path provided for client open');
			return;
		}

		log(
			`[uri-handler] Forwarding to client: ${filePath}${range ? ` at ${range.start.line + 1}:${range.start.character + 1}-${range.end.line + 1}:${range.end.character + 1}` : ''}`
		);

		try {
			await sendClientRpc('uri.openFileWithRange', {
				endCol: range?.end.character ?? 0,
				endLine: range?.end.line ?? 0,
				filePath,
				startCol: range?.start.character ?? 0,
				startLine: range?.start.line ?? 0
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			warn(`[uri-handler] Failed to forward to client: ${msg}`);
			vscode.window.showErrorMessage(`Could not open file on client: ${msg}`);
		}
	}
}

function sendClientRpc(method: string, params: Record<string, unknown>, timeout = 5000): Promise<unknown> {
	return new Promise((resolve, reject) => {
		let settled = false;
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			fn();
		};

		const socket = net.createConnection(CLIENT_PIPE_PATH, () => {
			const reqId = `uri-handler-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const request = `${JSON.stringify({
				id: reqId,
				jsonrpc: '2.0',
				method,
				params
			})}\n`;
			socket.write(request);
		});

		let response = '';
		socket.setEncoding('utf8');

		socket.on('data', (chunk: string) => {
			response += chunk;
			if (response.includes('\n')) {
				try {
					const parsed = JSON.parse(response.split('\n')[0]) as Record<string, unknown>;
					if (parsed['error']) {
						const error = parsed['error'] as Record<string, unknown>;
						finish(() => reject(new Error(String(error['message'] ?? 'RPC error'))));
					} else {
						finish(() => resolve(parsed['result']));
					}
				} catch {
					finish(() => resolve(undefined));
				}
				try {
					socket.destroy();
				} catch {
					/* best-effort */
				}
			}
		});

		socket.on('error', (err) => {
			finish(() => reject(new Error(`Client pipe connection failed: ${err.message}`)));
		});

		socket.on('close', () => {
			finish(() => reject(new Error('Client pipe closed before response')));
		});

		const timer = setTimeout(() => {
			finish(() => reject(new Error('Client pipe RPC timed out')));
			try {
				socket.destroy();
			} catch {
				/* best-effort */
			}
		}, timeout);
	});
}

export function disposeUriHandler(): void {
	clearListenerDisposable?.dispose();
	clearListenerDisposable = undefined;
	uriHighlightDecoration.dispose();
}
