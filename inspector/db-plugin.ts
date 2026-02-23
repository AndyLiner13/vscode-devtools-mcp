import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import { createRequire } from 'node:module';
import { join } from 'node:path';

const nodeRequire = createRequire(import.meta.url);

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
