/**
 * Inspector Backend (Client-side RPC handlers)
 *
 * ALL inspector business logic lives here — storage CRUD, MCP proxy,
 * file browsing, symbol lookup, and logging. This code runs in the
 * Client (Extension Development Host) where it hot-reloads automatically.
 *
 * Storage uses VS Code's workspaceState (key-value memento) instead of SQLite.
 */

import type { RegisterHandler } from './client-handlers';

import { readdirSync } from 'node:fs';
import net from 'node:net';
import { resolve as resolvePath } from 'node:path';
import * as vscode from 'vscode';

// ── Types ──

interface ExecutionRecord {
	comment: string;
	createdAt: string;
	durationMs: number;
	id: string;
	input: string;
	isError: boolean;
	isStale: boolean;
	lastRunAt: null | string;
	output: unknown[];
	priority: number;
	rating: 'bad' | 'good' | null;
	toolName: string;
}

interface BrowseEntry {
	name: string;
	type: 'dir' | 'file';
}

// ── Constants ──

const IS_WINDOWS = process.platform === 'win32';
const MCP_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-mcp' : '/tmp/vscode-devtools-mcp.sock';
const HOST_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-host' : '/tmp/vscode-devtools-host.sock';
const STORAGE_KEY = 'inspector.records';
const FILE_WRAPPER_KINDS = new Set(['module', 'file', 'namespace']);

// ── Pipe RPC helpers ──

let rpcIdCounter = 0;

async function sendPipeRpc(
	pipePath: string,
	method: string,
	params: Record<string, unknown>,
	timeoutMs = 60_000
): Promise<Record<string, unknown>> {
	rpcIdCounter += 1;
	const id = `inspector-backend-${rpcIdCounter}`;

	return new Promise((pipeResolve, pipeReject) => {
		let settled = false;
		let acc = '';

		const finish = (error?: Error, result?: Record<string, unknown>): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				socket.destroy();
			} catch {
				// best-effort
			}
			if (error) {
				pipeReject(error);
			} else {
				pipeResolve(result ?? {});
			}
		};

		const socket = net.createConnection(pipePath, () => {
			const payload = JSON.stringify({ id, jsonrpc: '2.0', method, params });
			socket.write(`${payload}\n`);
		});

		socket.setEncoding('utf8');

		socket.on('data', (chunk: string) => {
			acc += chunk;
			const idx = acc.indexOf('\n');
			if (idx === -1) return;

			try {
				const resp = JSON.parse(acc.slice(0, idx)) as { error?: { message: string }; result?: Record<string, unknown> };
				if (resp.error) {
					finish(new Error(resp.error.message));
				} else {
					finish(undefined, resp.result);
				}
			} catch {
				finish(new Error(`Invalid JSON-RPC response from ${pipePath}`));
			}
		});

		socket.on('error', (err) => {
			finish(new Error(`Pipe connection failed (${pipePath}): ${err.message}`));
		});

		const timer = setTimeout(() => {
			finish(new Error(`Pipe RPC timed out after ${timeoutMs}ms: ${method}`));
		}, timeoutMs);
	});
}

// ── Symbol Flattening ──

interface RawSymbol {
	children?: RawSymbol[];
	kind?: string;
	name?: string;
}

function isFileWrapperName(name: string): boolean {
	return /^['"<]/.test(name) || /\.(ts|js|tsx|jsx|mjs|cjs)$/i.test(name);
}

function flattenDocumentSymbols(
	symbols: RawSymbol[],
	prefix = ''
): Array<{ kind: string; name: string }> {
	const out: Array<{ kind: string; name: string }> = [];
	for (const sym of symbols) {
		const kind = sym.kind ?? 'Unknown';
		const isFileWrapper = prefix === '' && (
			FILE_WRAPPER_KINDS.has(kind.toLowerCase()) || isFileWrapperName(sym.name ?? '')
		);

		let fullName: string;
		if (isFileWrapper) {
			fullName = '';
		} else if (prefix) {
			fullName = `${prefix}.${sym.name ?? ''}`;
		} else {
			fullName = sym.name ?? '';
		}

		if (fullName) {
			out.push({ kind, name: fullName });
		}
		if (sym.children?.length) {
			out.push(...flattenDocumentSymbols(sym.children, fullName));
		}
	}
	return out;
}

// ── Storage Helpers ──

function getAllRecords(state: vscode.Memento): ExecutionRecord[] {
	return state.get<ExecutionRecord[]>(STORAGE_KEY, []);
}

async function saveAllRecords(state: vscode.Memento, records: ExecutionRecord[]): Promise<void> {
	await state.update(STORAGE_KEY, records);
}

// ── Registration ──

/**
 * Register all Inspector RPC handlers on the Client pipe server.
 * These handle every inspector operation — frontend communicates via
 * Host relay → Client pipe → these handlers.
 */
export function registerInspectorHandlers(
	register: RegisterHandler,
	workspaceState: vscode.Memento,
	logFn?: (msg: string) => void
): void {
	const log = (msg: string): void => {
		if (logFn) {
			logFn(`[inspector-backend] ${msg}`);
		}
	};

	log('Registering Inspector backend handlers');

	// ── MCP Proxy ──

	register('inspector.mcp/tools', async () => {
		try {
			await sendPipeRpc(HOST_PIPE_PATH, 'ensureMcpServer', {}, 10_000);
		} catch {
			// MCP server may already be running
		}
		return sendPipeRpc(MCP_PIPE_PATH, 'listTools', {}, 10_000);
	});

	register('inspector.mcp/call', async (params) => {
		const toolName = typeof params.name === 'string' ? params.name : '';
		const args = (typeof params.arguments === 'object' && params.arguments !== null)
			? params.arguments as Record<string, unknown>
			: {};
		if (!toolName) {
			throw new Error('Missing required field: name');
		}
		return sendPipeRpc(MCP_PIPE_PATH, 'callTool', { arguments: args, name: toolName }, 120_000);
	});

	// ── Storage CRUD ──

	register('inspector.records/list', (params) => {
		const tool = typeof params.tool === 'string' ? params.tool : undefined;
		const records = getAllRecords(workspaceState);

		if (tool) {
			return records
				.filter((r) => r.toolName === tool)
				.sort((a, b) => a.priority - b.priority);
		}

		const grouped: Record<string, ExecutionRecord[]> = {};
		for (const record of records) {
			const key = record.toolName;
			if (key in grouped) {
				grouped[key].push(record);
			} else {
				grouped[key] = [record];
			}
		}
		return grouped;
	});

	register('inspector.records/create', async (params) => {
		const toolName = typeof params.toolName === 'string' ? params.toolName : '';
		const input = typeof params.input === 'string' ? params.input : '';
		const output = Array.isArray(params.output) ? params.output as unknown[] : [];
		const isError = params.isError === true;
		const durationMs = typeof params.durationMs === 'number' ? params.durationMs : 0;

		const records = getAllRecords(workspaceState);
		const toolRecords = records.filter((r) => r.toolName === toolName);
		const maxPriority = toolRecords.reduce((max, r) => Math.max(max, r.priority), -1);

		const newRecord: ExecutionRecord = {
			comment: '',
			createdAt: new Date().toISOString(),
			durationMs,
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			input,
			isError,
			isStale: false,
			lastRunAt: null,
			output,
			priority: maxPriority + 1,
			rating: null,
			toolName
		};

		records.push(newRecord);
		await saveAllRecords(workspaceState, records);
		return newRecord;
	});

	register('inspector.records/get', (params) => {
		const id = typeof params.id === 'string' ? params.id : '';
		const records = getAllRecords(workspaceState);
		const record = records.find((r) => r.id === id);
		if (!record) {
			throw new Error('Record not found');
		}
		return record;
	});

	register('inspector.records/delete', async (params) => {
		const id = typeof params.id === 'string' ? params.id : '';
		const records = getAllRecords(workspaceState);
		const filtered = records.filter((r) => r.id !== id);
		await saveAllRecords(workspaceState, filtered);
		return { ok: true };
	});

	register('inspector.records/rating', async (params) => {
		const id = typeof params.id === 'string' ? params.id : '';
		const rating = params.rating as 'bad' | 'good' | null;
		const records = getAllRecords(workspaceState);
		const record = records.find((r) => r.id === id);
		if (record) {
			record.rating = rating;
			await saveAllRecords(workspaceState, records);
		}
		return { ok: true };
	});

	register('inspector.records/comment', async (params) => {
		const id = typeof params.id === 'string' ? params.id : '';
		const comment = typeof params.comment === 'string' ? params.comment : '';
		const records = getAllRecords(workspaceState);
		const record = records.find((r) => r.id === id);
		if (record) {
			record.comment = comment;
			await saveAllRecords(workspaceState, records);
		}
		return { ok: true };
	});

	register('inspector.records/output', async (params) => {
		const id = typeof params.id === 'string' ? params.id : '';
		const output = Array.isArray(params.output) ? params.output as unknown[] : [];
		const isError = params.isError === true;
		const durationMs = typeof params.durationMs === 'number' ? params.durationMs : 0;
		const records = getAllRecords(workspaceState);
		const record = records.find((r) => r.id === id);
		if (record) {
			record.output = output;
			record.isError = isError;
			record.durationMs = durationMs;
			record.lastRunAt = new Date().toISOString();
			record.isStale = false;
			await saveAllRecords(workspaceState, records);
		}
		return { ok: true };
	});

	register('inspector.records/markStale', async () => {
		const records = getAllRecords(workspaceState);
		for (const record of records) {
			if (record.rating === 'bad') {
				record.isStale = true;
			}
		}
		await saveAllRecords(workspaceState, records);
		return { ok: true };
	});

	register('inspector.records/reorder', async (params) => {
		const _toolName = typeof params.toolName === 'string' ? params.toolName : '';
		const orderedIds = Array.isArray(params.orderedIds) ? params.orderedIds as string[] : [];
		const records = getAllRecords(workspaceState);

		for (let i = 0; i < orderedIds.length; i++) {
			const record = records.find((r) => r.id === orderedIds[i]);
			if (record) {
				record.priority = i;
			}
		}
		await saveAllRecords(workspaceState, records);
		return { ok: true };
	});

	register('inspector.records/pruneUnrated', async () => {
		const records = getAllRecords(workspaceState);
		const filtered = records.filter((r) => r.rating !== null);
		await saveAllRecords(workspaceState, filtered);
		return { ok: true };
	});

	// ── File Browsing ──

	register('inspector.fs/browse', (params) => {
		const { workspaceFolders } = vscode.workspace;
		const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
		const requestedPath = typeof params.path === 'string' ? params.path : '';

		let targetDir: string;
		if (!requestedPath) {
			targetDir = workspaceRoot;
		} else if (requestedPath.startsWith('/') || /^[A-Za-z]:/.test(requestedPath)) {
			targetDir = requestedPath;
		} else {
			targetDir = resolvePath(workspaceRoot, requestedPath);
		}

		try {
			const entries: BrowseEntry[] = readdirSync(targetDir, { withFileTypes: true })
				.filter((e) => !e.name.startsWith('.'))
				.map((e) => ({
					name: e.name,
					type: e.isDirectory() ? 'dir' as const : 'file' as const
				}))
				.sort((a, b) => {
					if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
					return a.name.localeCompare(b.name);
				});

			return { entries, root: workspaceRoot };
		} catch (err) {
			return { entries: [], error: String(err), root: workspaceRoot };
		}
	});

	// ── Symbol Lookup ──

	register('inspector.editor/symbols', async (params) => {
		const { workspaceFolders } = vscode.workspace;
		const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
		const requestedFile = typeof params.file === 'string' ? params.file : '';

		let filePath: string;
		if (!requestedFile) {
			filePath = '';
		} else if (requestedFile.startsWith('/') || /^[A-Za-z]:/.test(requestedFile)) {
			filePath = requestedFile;
		} else {
			filePath = resolvePath(workspaceRoot, requestedFile);
		}

		if (!filePath) {
			return { symbols: [] };
		}

		try {
			const uri = vscode.Uri.file(filePath);
			const rawSymbols = await vscode.commands.executeCommand<RawSymbol[]>(
				'vscode.executeDocumentSymbolProvider',
				uri
			);
			const symbols = flattenDocumentSymbols(rawSymbols);
			return { symbols };
		} catch (err) {
			return { error: String(err), symbols: [] };
		}
	});

	// ── Logging ──

	register('inspector.log', (params) => {
		const message = typeof params.message === 'string' ? params.message : JSON.stringify(params.message);
		log(message);
		return { ok: true };
	});

	log('Inspector backend handlers registered');
}
