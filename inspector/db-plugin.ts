import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import net from 'node:net';
import { join, resolve } from 'node:path';

const nodeRequire = createRequire(import.meta.url);

/**
 * Logs to stdio (stdout) so messages appear in VS Code output panel.
 * Uses process.stdout.write for reliable output without console formatting.
 */
function log(message: string): void {
	process.stdout.write(`[Inspector] ${message}\n`);
}

const IS_WINDOWS = process.platform === 'win32';
const HOST_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-host' : '/tmp/vscode-devtools-host.sock';

interface DbRow {
	comment: string;
	created_at: string;
	duration_ms: number;
	id: string;
	input: string;
	is_error: number;
	is_stale: number;
	last_run_at: null | string;
	output_json: string;
	priority: number;
	rating: null | string;
	tool_name: string;
}

interface SqliteStatement {
	all: (...params: unknown[]) => DbRow[];
	get: (...params: unknown[]) => DbRow | undefined;
	run: (...params: unknown[]) => { changes: number };
}

interface SqliteDatabase {
	close: () => void;
	exec: (sql: string) => void;
	pragma: (statement: string) => unknown;
	prepare: (sql: string) => SqliteStatement;
	transaction: <F extends (...args: never[]) => void>(fn: F) => F;
}

function rowToApi(row: DbRow): Record<string, unknown> {
	return {
		comment: row.comment,
		createdAt: row.created_at,
		durationMs: row.duration_ms,
		id: row.id,
		input: row.input,
		isError: row.is_error === 1,
		isStale: row.is_stale === 1,
		lastRunAt: row.last_run_at,
		output: JSON.parse(row.output_json),
		priority: row.priority,
		rating: row.rating,
		toolName: row.tool_name
	};
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (chunk: Buffer) => {
			body += chunk.toString();
		});
		req.on('end', () => {
			try {
				resolve(body ? JSON.parse(body) : {});
			} catch (e) {
				reject(e);
			}
		});
		req.on('error', reject);
	});
}

interface FlatSymbol {
	kind: string;
	name: string;
}

// Root-level symbols with these kinds are file-level wrappers (VS Code adds a
// Module/File symbol whose name is the file's basename). We skip adding them to
// the flat list but still recurse into their children so child paths are
// relative ("UserService.findById" instead of "MyFile.UserService.findById").
const FILE_WRAPPER_KINDS = new Set(['module', 'file', 'namespace']);

/**
 * Flatten a nested NativeDocumentSymbol tree into dot-notation paths.
 * e.g. class UserService { findById() {} } → ["UserService", "UserService.findById"]
 * Root-level Module/File/Namespace symbols are skipped (they're file wrappers)
 * but their children are still included.
 */
function flattenDocumentSymbols(
	symbols: Array<{ children?: unknown[]; kind?: string; name?: string }>,
	prefix = '',
	out: FlatSymbol[] = []
): FlatSymbol[] {
	for (const sym of symbols) {
		if (!sym.name) continue;
		const kind = sym.kind ?? 'Unknown';
		const isFileWrapper = prefix === '' && FILE_WRAPPER_KINDS.has(kind.toLowerCase());
		const fullName = isFileWrapper ? '' : (prefix ? `${prefix}.${sym.name}` : sym.name);
		if (!isFileWrapper) {
			out.push({ kind, name: fullName });
		}
		if (Array.isArray(sym.children) && sym.children.length > 0) {
			flattenDocumentSymbols(
				sym.children as Array<{ children?: unknown[]; kind?: string; name?: string }>,
				fullName,
				out
			);
		}
	}
	return out;
}

export function inspectorDbPlugin(): Plugin {
	return {
		configureServer(server) {
			// Native module loaded via createRequire to avoid esbuild bundling issues
			const Database = nodeRequire('better-sqlite3') as new (path: string) => SqliteDatabase;
			const dbPath = join(process.cwd(), 'inspector.db');
			const db = new Database(dbPath);

			db.pragma('journal_mode = WAL');

			db.exec(`
        CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY,
          tool_name TEXT NOT NULL,
          input TEXT NOT NULL,
          output_json TEXT NOT NULL,
          is_error INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          last_run_at TEXT,
          rating TEXT CHECK(rating IN ('good', 'bad')),
          comment TEXT NOT NULL DEFAULT '',
          priority INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0
        )
      `);
			db.exec('CREATE INDEX IF NOT EXISTS idx_tool ON records(tool_name)');

			// Migration: add is_stale column for staleness tracking after hot reloads
			try {
				db.exec('ALTER TABLE records ADD COLUMN is_stale INTEGER NOT NULL DEFAULT 0');
			} catch {
				// Column already exists
			}

			const sseClients = new Set<ServerResponse>();

			function broadcast(tool: string): void {
				const msg = `data: ${JSON.stringify({ tool })}\n\n`;
				for (const client of sseClients) {
					client.write(msg);
				}
			}

			function json(res: ServerResponse, data: unknown, status = 200): void {
				res.statusCode = status;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(data));
			}

			// Send a JSON-RPC 2.0 request to the Host extension pipe
			function sendHostRpc(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
				return new Promise((resolve, reject) => {
					const socket = net.createConnection(HOST_PIPE_PATH);
					let acc = '';
					const timeout = setTimeout(() => {
						socket.destroy();
						reject(new Error('Host pipe timeout'));
					}, 5000);

					socket.on('connect', () => {
						const payload = { id: 1, jsonrpc: '2.0', method, params };
						socket.write(`${JSON.stringify(payload)}\n`);
					});

					socket.setEncoding('utf8');
					socket.on('data', (chunk: string) => {
						acc += chunk;
						const idx = acc.indexOf('\n');
						if (idx !== -1) {
							clearTimeout(timeout);
							try {
								const resp = JSON.parse(acc.slice(0, idx)) as { error?: { message: string }; result?: Record<string, unknown> };
								if (resp.error) {
									reject(new Error(resp.error.message));
								} else {
									resolve(resp.result ?? {});
								}
							} catch {
								reject(new Error('Invalid response from Host pipe'));
							}
							socket.end();
						}
					});

					socket.on('error', (err) => {
						clearTimeout(timeout);
						reject(new Error(`Host pipe connection failed: ${err.message}`));
					});
				});
			}

			async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
				const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
				const { pathname } = url;
				const method = req.method ?? 'GET';

				// SSE live-sync endpoint
				if (pathname === '/api/events' && method === 'GET') {
					res.writeHead(200, {
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
						'Content-Type': 'text/event-stream'
					});
					res.write('data: connected\n\n');
					sseClients.add(res);
					req.on('close', () => sseClients.delete(res));
					return;
				}

				// POST /api/ensure-mcp — tell Host extension to start MCP server if not running
				if (pathname === '/api/ensure-mcp' && method === 'POST') {
					try {
						await sendHostRpc('ensureMcpServer', {});
						json(res, { ok: true });
					} catch (err) {
						const message = err instanceof Error ? err.message : String(err);
						json(res, { error: message, ok: false }, 502);
					}
					return;
				}

				// GET /api/records?tool=NAME — records for a specific tool
				if (pathname === '/api/records' && method === 'GET') {
					const tool = url.searchParams.get('tool');
					if (tool) {
						const rows = db.prepare('SELECT * FROM records WHERE tool_name = ? ORDER BY priority ASC').all(tool);
						json(res, rows.map(rowToApi));
					} else {
						const rows = db.prepare('SELECT * FROM records ORDER BY tool_name, priority ASC').all();
						const grouped: Record<string, unknown[]> = {};
						for (const row of rows) {
							const record = rowToApi(row);
							const toolName = record.toolName as string;
							if (!grouped[toolName]) {
								grouped[toolName] = [];
							}
							grouped[toolName].push(record);
						}
						json(res, grouped);
					}
					return;
				}

				// POST /api/records — create new record
				if (pathname === '/api/records' && method === 'POST') {
					const body = await parseBody(req);
					const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
					const toolName = body.toolName as string;

					const maxRow = db.prepare('SELECT COALESCE(MAX(priority), -1) as priority FROM records WHERE tool_name = ?').get(toolName);
					const maxPriority = maxRow?.priority ?? -1;

					db.prepare(
						`INSERT INTO records (id, tool_name, input, output_json, is_error, created_at, priority, duration_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
					).run(id, toolName, body.input as string, JSON.stringify(body.output), body.isError ? 1 : 0, new Date().toISOString(), maxPriority + 1, (body.durationMs as number) ?? 0);

					const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
					broadcast(toolName);
					json(res, row ? rowToApi(row) : { id }, 201);
					return;
				}

				// PATCH /api/records/:id/rating
				const ratingMatch = pathname.match(/^\/api\/records\/([^/]+)\/rating$/);
				if (ratingMatch && method === 'PATCH') {
					const body = await parseBody(req);
					const recordId = decodeURIComponent(ratingMatch[1]);
					db.prepare('UPDATE records SET rating = ? WHERE id = ?').run((body.rating as null | string) ?? null, recordId);
					broadcast(body.toolName as string);
					json(res, { ok: true });
					return;
				}

				// PATCH /api/records/:id/comment
				const commentMatch = pathname.match(/^\/api\/records\/([^/]+)\/comment$/);
				if (commentMatch && method === 'PATCH') {
					const body = await parseBody(req);
					const recordId = decodeURIComponent(commentMatch[1]);
					db.prepare('UPDATE records SET comment = ? WHERE id = ?').run(body.comment as string, recordId);
					broadcast(body.toolName as string);
					json(res, { ok: true });
					return;
				}

				// PATCH /api/records/:id/output
				const outputMatch = pathname.match(/^\/api\/records\/([^/]+)\/output$/);
				if (outputMatch && method === 'PATCH') {
					const body = await parseBody(req);
					const recordId = decodeURIComponent(outputMatch[1]);
					db.prepare('UPDATE records SET output_json = ?, is_error = ?, duration_ms = ?, last_run_at = ?, is_stale = 0 WHERE id = ?').run(JSON.stringify(body.output), body.isError ? 1 : 0, body.durationMs as number, new Date().toISOString(), recordId);
					broadcast(body.toolName as string);
					json(res, { ok: true });
					return;
				}

				// DELETE /api/records/:id?tool=NAME
				const deleteMatch = pathname.match(/^\/api\/records\/([^/]+)$/);
				if (deleteMatch && method === 'DELETE') {
					const recordId = decodeURIComponent(deleteMatch[1]);
					const tool = url.searchParams.get('tool') ?? '';
					db.prepare('DELETE FROM records WHERE id = ?').run(recordId);
					broadcast(tool);
					json(res, { ok: true });
					return;
				}

				// GET /api/records/:id — single record by ID
				const singleMatch = pathname.match(/^\/api\/records\/([^/]+)$/);
				if (singleMatch && method === 'GET') {
					const recordId = decodeURIComponent(singleMatch[1]);
					const row = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId);
					if (row) {
						json(res, rowToApi(row));
					} else {
						json(res, { error: 'Record not found' }, 404);
					}
					return;
				}

				// POST /api/records/mark-stale — flag all bad-rated records as stale
				if (pathname === '/api/records/mark-stale' && method === 'POST') {
					db.prepare('UPDATE records SET is_stale = 1 WHERE rating = ?').run('bad');
					broadcast('*');
					json(res, { ok: true });
					return;
				}

				// POST /api/prune-unrated
				if (pathname === '/api/prune-unrated' && method === 'POST') {
					db.prepare('DELETE FROM records WHERE rating IS NULL').run();
					broadcast('*');
					json(res, { ok: true });
					return;
				}

				// POST /api/records/reorder
				if (pathname === '/api/records/reorder' && method === 'POST') {
					const body = await parseBody(req);
					const toolName = body.toolName as string;
					const orderedIds = body.orderedIds as string[];
					const stmt = db.prepare('UPDATE records SET priority = ? WHERE id = ?');
					const reorder = db.transaction(() => {
						for (let i = 0; i < orderedIds.length; i++) {
							stmt.run(i, orderedIds[i]);
						}
					});
					reorder();
					broadcast(toolName);
					json(res, { ok: true });
					return;
				}

				// POST /api/log — receive client-side logs and write to stdio
				if (pathname === '/api/log' && method === 'POST') {
					const body = await parseBody(req);
					const message = typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
					log(`[client] ${message}`);
					json(res, { ok: true });
					return;
				}

				// GET /api/browse?path=<dir> — list directory contents for file/dir intellisense
				if (pathname === '/api/browse' && method === 'GET') {
					const workspaceRoot = resolve(process.cwd(), '..');
					const requestedPath = url.searchParams.get('path') ?? '';
					log(`[browse] Request: path=${JSON.stringify(requestedPath)} root=${workspaceRoot}`);

					const targetDir = requestedPath
						? (requestedPath.startsWith('/') || /^[A-Za-z]:/.test(requestedPath)
							? requestedPath
							: resolve(workspaceRoot, requestedPath))
						: workspaceRoot;

					log(`[browse] Target dir: ${targetDir}`);

					const debug = {
						requestedPath,
						targetDir,
						workspaceRoot
					};

					try {
						const entries = readdirSync(targetDir, { withFileTypes: true })
							.filter((e) => !e.name.startsWith('.'))
							.map((e) => ({
								name: e.name,
								type: e.isDirectory() ? 'dir' as const : 'file' as const
							}))
							.sort((a, b) => {
								if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
								return a.name.localeCompare(b.name);
							});

						log(`[browse] Found ${entries.length} entries, first 5: ${entries.slice(0, 5).map(e => e.name).join(', ')}`);
						json(res, { debug, entries, root: workspaceRoot });
					} catch (err) {
						log(`[browse] ERROR: ${String(err)}`);
						json(res, { debug, entries: [], error: String(err), root: workspaceRoot });
					}
					return;
				}

				// GET /api/symbols?file=<path> — document symbols for symbol intellisense
				if (pathname === '/api/symbols' && method === 'GET') {
					const workspaceRoot = resolve(process.cwd(), '..');
					const requestedFile = url.searchParams.get('file') ?? '';
					const filePath = requestedFile
						? (requestedFile.startsWith('/') || /^[A-Za-z]:/.test(requestedFile)
							? requestedFile
							: resolve(workspaceRoot, requestedFile))
						: '';

					if (!filePath) {
						json(res, { symbols: [] });
						return;
					}

					try {
						const result = await sendHostRpc('file.getSymbols', { filePath }) as { symbols?: Array<{ children?: unknown[]; kind?: string; name?: string }> };
						const symbols = flattenDocumentSymbols(result.symbols ?? []);
						json(res, { symbols });
					} catch (err) {
						log(`[symbols] ERROR for ${filePath}: ${String(err)}`);
						json(res, { error: String(err), symbols: [] }, 502);
					}
					return;
				}

				json(res, { error: 'Not found' }, 404);
			}

			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith('/api/')) {
					next();
					return;
				}
				handleApi(req, res).catch((err: unknown) => {
					if (!res.headersSent) {
						res.statusCode = 500;
						res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify({ error: String(err) }));
					}
				});
			});
		},
		name: 'inspector-db'
	};
}
