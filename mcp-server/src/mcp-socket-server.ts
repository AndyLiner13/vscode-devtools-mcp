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
 * Supported methods:
 *  - `detach-gracefully`: Sets a flag so the MCP server detaches from the
 *    debug window on shutdown instead of tearing it down.
 *  - `client-reconnected`: Notification from Host about a client reconnect.
 *  - `listTools`: Returns all registered tool definitions (name, description, inputSchema).
 *  - `callTool`: Executes a tool by name with the given arguments.
 */

import net from 'node:net';

import { logger } from './logger.js';

const IS_WINDOWS = process.platform === 'win32';
const MCP_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-mcp' : '/tmp/vscode-devtools-mcp.sock';

// ── Types ───────────────────────────────────────────────

interface ToolInfo {
	annotations?: Record<string, unknown>;
	description: string;
	inputSchema: Record<string, unknown>;
	name: string;
}

interface ToolCallResult {
	content: Array<{ data?: string; mimeType?: string; text?: string; type: string }>;
	isError?: boolean;
}

export interface McpSocketDeps {
	executeTool: (name: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
	getToolList: () => ToolInfo[];
	version: string;
}

// ── State ───────────────────────────────────────────────

let server: net.Server | undefined;
let pipePath: string | undefined;
let deps: McpSocketDeps | undefined;

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
export function startMcpSocketServer(options: McpSocketDeps): void {
	if (server) {
		logger('MCP socket server already running');
		return;
	}

	deps = options;
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
	deps = undefined;
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
const INTERNAL_ERROR = -32603;
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

			dispatch(req).then((response) => {
				conn.write(`${JSON.stringify(response)}\n`);
			}).catch(() => {
				// Connection may have closed before we could write
			});
		}
	});

	conn.on('error', () => {
		// Client disconnected — nothing to do
	});
}

// ── Method Dispatch ─────────────────────────────────────

async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse> {
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

		case 'listTools': {
			if (!deps) {
				return { error: { code: INTERNAL_ERROR, message: 'Socket server not initialized' }, id, jsonrpc: '2.0' };
			}
			const tools = deps.getToolList();
			return { id, jsonrpc: '2.0', result: { serverInfo: { name: 'vscode_devtools', version: deps.version }, tools } };
		}

		case 'callTool': {
			if (!deps) {
				return { error: { code: INTERNAL_ERROR, message: 'Socket server not initialized' }, id, jsonrpc: '2.0' };
			}
			const params = req.params ?? {};
			const toolName = params.name as string | undefined;
			const args = (params.arguments ?? {}) as Record<string, unknown>;
			if (!toolName) {
				return { error: { code: INTERNAL_ERROR, message: 'Missing required parameter: name' }, id, jsonrpc: '2.0' };
			}
			try {
				const result = await deps.executeTool(toolName, args);
				return { id, jsonrpc: '2.0', result };
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				logger(`MCP socket: callTool(${toolName}) error: ${message}`);
				return { error: { code: INTERNAL_ERROR, message }, id, jsonrpc: '2.0' };
			}
		}

		default:
			return {
				error: { code: METHOD_NOT_FOUND, message: `Unknown method: ${req.method}` },
				id,
				jsonrpc: '2.0'
			};
	}
}
