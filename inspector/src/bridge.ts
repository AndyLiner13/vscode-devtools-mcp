/**
 * postMessage RPC bridge for the Inspector WebView.
 *
 * Replaces all `fetch()` calls to the Vite middleware API with a
 * unified request/response pattern over VS Code's postMessage channel.
 *
 * Request flow:
 *   WebView (bridge.rpc) → postMessage → Host relay → pipe RPC → Client backend
 *   Client backend → pipe response → Host relay → postMessage → WebView (bridge resolves)
 */

// ── Types ──

export interface InspectorMessage {
	error?: string;
	id: string;
	method: string;
	params?: unknown;
	result?: unknown;
	type: 'event' | 'request' | 'response';
}

// ── VS Code API acquisition ──

interface VsCodeApi {
	getState: () => unknown;
	postMessage: (msg: unknown) => void;
	setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let _vscode: undefined | VsCodeApi;

function getVsCodeApi(): VsCodeApi {
	_vscode ??= acquireVsCodeApi();
	return _vscode;
}

// ── Pending request tracking ──

interface PendingRequest {
	reject: (reason: Error) => void;
	resolve: (value: unknown) => void;
}

const pending = new Map<string, PendingRequest>();

// ── Event listeners ──

type EventHandler = (data: unknown) => void;
const eventHandlers = new Map<string, Set<EventHandler>>();

// Listen for messages from the Host extension
function isInspectorMessage(data: unknown): data is InspectorMessage {
	return typeof data === 'object' && data !== null && 'type' in data && 'id' in data;
}

window.addEventListener('message', (event: MessageEvent) => {
	if (!isInspectorMessage(event.data)) return;
	const msg = event.data;

	if (msg.type === 'response' && msg.id) {
		const request = pending.get(msg.id);
		if (request) {
			pending.delete(msg.id);
			if (msg.error) {
				request.reject(new Error(msg.error));
			} else {
				request.resolve(msg.result);
			}
		}
	}

	if (msg.type === 'event' && msg.method) {
		const handlers = eventHandlers.get(msg.method);
		if (handlers) {
			for (const handler of handlers) {
				handler(msg.result);
			}
		}
	}
});

// ── Public API ──

/**
 * Send an RPC request to the extension host and await the response.
 * Correlates request/response by unique ID.
 */
export async function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
	const id = crypto.randomUUID();
	return new Promise<T>((resolve, reject) => {
		pending.set(id, {
			reject,
			resolve: resolve as (value: unknown) => void
		});
		getVsCodeApi().postMessage({
			id,
			method,
			params,
			type: 'request'
		} satisfies InspectorMessage);
	});
}

/**
 * Subscribe to push events from the extension host.
 * Returns an unsubscribe function.
 */
export function onEvent(method: string, handler: EventHandler): () => void {
	let handlers = eventHandlers.get(method);
	if (!handlers) {
		handlers = new Set();
		eventHandlers.set(method, handlers);
	}
	handlers.add(handler);
	return () => {
		handlers.delete(handler);
		if (handlers.size === 0) {
			eventHandlers.delete(method);
		}
	};
}

/**
 * Get the VS Code API for state persistence.
 */
export function getState<T = unknown>(): T | undefined {
	return getVsCodeApi().getState() as T | undefined;
}

export function setState<T = unknown>(state: T): void {
	getVsCodeApi().setState(state);
}
