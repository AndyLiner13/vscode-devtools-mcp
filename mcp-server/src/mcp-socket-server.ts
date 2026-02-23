/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MCP Socket Server — JSON-RPC 2.0 named-pipe server
 *
 * Runs inside the MCP server process so the extension (or other callers)
 * can send commands directly to this process. Uses a static pipe name
 * so callers can connect without discovery. Only one MCP server instance
 * can exist at a time.
 *
 * Pipe path:
 *   Windows: \\.\pipe\vscode-devtools-mcp
 *   Unix:    /tmp/vscode-devtools-mcp.sock
 *
 * Protocol: JSON-RPC 2.0 over newline-delimited JSON.
 *
 * Currently supported methods:
 *  - `detach-gracefully`: Sets a flag so the MCP server detaches from the
 *    debug window on shutdown instead of tearing it down.
 */

import net from 'node:net';

import { logger } from './logger.js';

const IS_WINDOWS = process.platform === 'win32';
const MCP_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-mcp' : '/tmp/vscode-devtools-mcp.sock';

// ── State ───────────────────────────────────────────────

let server: net.Server | undefined;
let pipePath: string | undefined;

// When true, the next shutdown will detach gracefully instead of tearing down.
let watchRestartPending = false;

// ── Public API ──────────────────────────────────────────

function isWatchRestartPending(): boolean {
	return watchRestartPending;
}

function clearWatchRestartPending(): void {
	watchRestartPending = false;
}



/**
 * Start the MCP socket server on the static pipe path.
 * Idempotent — calling when already running is a no-op.
 */
export function startMcpSocketServer(): void {
	if (server) {
		logger('MCP socket server already running');
		return;
	}

	pipePath = MCP_PIPE_PATH;

	const srv = net.createServer(handleConnection);

	srv.on('error', (err: Error) => {
		logger(`MCP socket server error: ${err.message}`);
		server = undefined;
		pipePath = undefined;
	});

	srv.listen(pipePath, () => {
		server = srv;
		logger(`MCP socket server listening on ${pipePath}`);
	});
}

/**
 * Stop the MCP socket server. Best-effort, safe to call anytime.
 */
export function stopMcpSocketServer(): void {
	if (!server) return;
	try {
		server.close();
	} catch {
		// best-effort
	}
	server = undefined;
	pipePath = undefined;
	logger('MCP socket server stopped');
}

// ── JSON-RPC 2.0 Types ─────────────────────────────────

interface JsonRpcRequest {
	id?: null | number | string;
	jsonrpc: '2.0';
	method: string;
	params?: Record<string, unknown>;
}

interface JsonRpcResponse {
	error?: { code: number; message: string; data?: unknown };
	id: null | number | string;
	jsonrpc: '2.0';
	result?: unknown;
}

// Standard JSON-RPC 2.0 error codes
const METHOD_NOT_FOUND = -32601;
const PARSE_ERROR = -32700;

// ── Connection Handler ──────────────────────────────────

function handleConnection(conn: net.Socket): void {
	let acc = '';
	conn.setEncoding('utf8');

	conn.on('data', (chunk: string) => {
		acc += chunk;
		let idx: number;
		while ((idx = acc.indexOf('\n')) !== -1) {
			const line = acc.slice(0, idx);
			acc = acc.slice(idx + 1);
			if (!line.trim()) continue;

			let req: JsonRpcRequest;
			try {
				req = JSON.parse(line) as JsonRpcRequest;
			} catch {
				const errResp: JsonRpcResponse = {
					error: { code: PARSE_ERROR, message: 'Parse error' },
					id: null,
					jsonrpc: '2.0'
				};
				conn.write(`${JSON.stringify(errResp)}\n`);
				continue;
			}

			const response = dispatch(req);
			conn.write(`${JSON.stringify(response)}\n`);
		}
	});

	conn.on('error', () => {
		// Client disconnected — nothing to do
	});
}

// ── Method Dispatch ─────────────────────────────────────

function dispatch(req: JsonRpcRequest): JsonRpcResponse {
	const id = req.id ?? null;

	switch (req.method) {
		case 'detach-gracefully':
			watchRestartPending = true;
			logger('MCP socket: detach-gracefully received — next shutdown will detach');
			return { id, jsonrpc: '2.0', result: { ok: true } };

		case 'client-reconnected': {
			const params = req.params ?? {};
			const { electronPid } = params;
			const { cdpPort } = params;
			const { inspectorPort } = params;
			logger(`MCP socket: client-reconnected received — pid=${String(electronPid)}, cdp=${String(cdpPort)}, inspector=${String(inspectorPort)}`);
			return { id, jsonrpc: '2.0', result: { ok: true } };
		}

		default:
			return {
				error: { code: METHOD_NOT_FOUND, message: `Unknown method: ${req.method}` },
				id,
				jsonrpc: '2.0'
			};
	}
}
