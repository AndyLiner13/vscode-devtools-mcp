/**
 * Language Model Tool: inspector_read
 *
 * Gives Copilot read access to MCP Inspector flagged test records.
 * Only surfaces records that are flagged (thumbs-down) AND fresh
 * (not stale from a pending hot reload).
 *
 * Two modes:
 *   1. List mode (toolName only): Returns flagged, non-stale record IDs + comments
 *   2. Detail mode (toolName + recordId): Returns full input/output for one record
 */

import net from 'node:net';
import * as vscode from 'vscode';

// ── Client Pipe RPC ──────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';
const CLIENT_PIPE_PATH = IS_WINDOWS ? '\\\\.\\pipe\\vscode-devtools-client' : '/tmp/vscode-devtools-client.sock';

let rpcIdCounter = 0;

async function sendClientRpc<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
	rpcIdCounter += 1;
	const id = `inspector-read-${rpcIdCounter}`;

	return new Promise((resolve, reject) => {
		let settled = false;
		let acc = '';

		const finish = (error?: Error, result?: unknown): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try { socket.destroy(); } catch { /* best-effort */ }
			if (error) { reject(error); } else { resolve(result as T); }
		};

		const socket = net.createConnection(CLIENT_PIPE_PATH, () => {
			const payload = JSON.stringify({ id, jsonrpc: '2.0', method: `inspector.${method}`, params: params ?? {} });
			socket.write(`${payload}\n`);
		});

		socket.setEncoding('utf8');

		socket.on('data', (chunk: string) => {
			acc += chunk;
			const idx = acc.indexOf('\n');
			if (idx === -1) return;
			try {
				const resp = JSON.parse(acc.slice(0, idx)) as { error?: { message: string }; result?: unknown };
				if (resp.error) { finish(new Error(resp.error.message)); }
				else { finish(undefined, resp.result); }
			} catch {
				finish(new Error('Invalid JSON-RPC response'));
			}
		});

		socket.on('error', (err) => { finish(new Error(`Client pipe error: ${err.message}`)); });
		socket.on('close', () => { finish(new Error('Client pipe closed before response')); });

		const timer = setTimeout(() => { finish(new Error('Client RPC timed out')); }, 10_000);
	});
}

// ── Input Schema ─────────────────────────────────────────────────────────────

interface IInspectorReadParams {
	recordId?: string;
	toolName: string;
}

// ── API Types ────────────────────────────────────────────────────────────────

interface InspectorRecord {
	comment: string;
	createdAt: string;
	durationMs: number;
	id: string;
	input: string;
	isError: boolean;
	isStale: boolean;
	lastRunAt: null | string;
	output: Array<{ type: string; text?: string }>;
	priority: number;
	rating: null | string;
	toolName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchInspectorRecords(toolName: string): Promise<InspectorRecord[]> {
	return sendClientRpc<InspectorRecord[]>('records/list', { tool: toolName });
}

async function fetchInspectorRecord(recordId: string): Promise<InspectorRecord | null> {
	try {
		return await sendClientRpc<InspectorRecord>('records/get', { id: recordId });
	} catch {
		return null;
	}
}

function combineOutputText(blocks: Array<{ type: string; text?: string }>): string {
	return blocks
		.filter((b) => b.text)
		.map((b) => b.text)
		.join('\n');
}

function formatTime(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function textResult(text: string): vscode.LanguageModelToolResult {
	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(text)]);
}

// ── LM Tool ──────────────────────────────────────────────────────────────────

export class InspectorReadTool implements vscode.LanguageModelTool<IInspectorReadParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IInspectorReadParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const { recordId, toolName } = options.input;

		if (recordId) {
			return {
				invocationMessage: `Reading inspector record ${recordId} for tool "${toolName}"`
			};
		}

		return {
			invocationMessage: `Listing flagged inspector issues for tool "${toolName}"`
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<IInspectorReadParams>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const { recordId, toolName } = options.input;

		try {
			if (recordId) {
				return await this.getRecordDetail(toolName, recordId);
			}
			return await this.listFlaggedRecords(toolName);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);

			if (message.includes('ECONNREFUSED') || message.includes('pipe error') || message.includes('pipe closed')) {
				return textResult('Inspector backend is not available. Ensure the Client window is running.');
			}

			return textResult(`Error reading inspector records: ${message}`);
		}
	}

	private async listFlaggedRecords(toolName: string): Promise<vscode.LanguageModelToolResult> {
		const records = await fetchInspectorRecords(toolName);

		// Only flagged (thumbs-down) and fresh (not stale) records
		const flagged = records.filter((r) => r.rating === 'bad' && !r.isStale).sort((a, b) => a.priority - b.priority);

		if (flagged.length === 0) {
			return textResult(
				`No flagged issues found for tool "${toolName}".\n\n` + 'Either there are no thumbs-down records, or all flagged records are stale ' + '(code has changed since they were last run — they need to be re-executed in the Inspector first).'
			);
		}

		const lines: string[] = [
			`## Flagged Issues for tool: ${toolName}\n`,
			`${flagged.length} flagged item(s) ready for review:\n`,
			'| # | Record ID | Description | Status | Last Run | Duration |',
			'|---|-----------|-------------|--------|----------|----------|'
		];

		for (let i = 0; i < flagged.length; i++) {
			const r = flagged[i];
			const description = r.comment || '_(no description)_';
			const status = r.isError ? '❌ Error' : '⚠️ Flagged';
			const lastRun = formatTime(r.lastRunAt ?? r.createdAt);
			const duration = `${r.durationMs}ms`;

			lines.push(`| ${i + 1} | \`${r.id}\` | ${description} | ${status} | ${lastRun} | ${duration} |`);
		}

		lines.push('', 'To see the full input and output for a specific issue, call `inspector_read` again with the `recordId` parameter set to the Record ID from the table above.');

		return textResult(lines.join('\n'));
	}

	private async getRecordDetail(toolName: string, recordId: string): Promise<vscode.LanguageModelToolResult> {
		const record = await fetchInspectorRecord(recordId);

		if (!record) {
			return textResult(`Record "${recordId}" not found for tool "${toolName}".`);
		}

		if (record.toolName !== toolName) {
			return textResult(`Record "${recordId}" belongs to tool "${record.toolName}", not "${toolName}".`);
		}

		const outputText = combineOutputText(record.output);
		const lastRun = formatTime(record.lastRunAt ?? record.createdAt);

		const lines: string[] = [
			`## Flagged Issue: ${recordId}\n`,
			`**Tool:** ${record.toolName}`,
			`**Description:** ${record.comment || '_(no description)_'}`,
			`**Status:** ${record.isError ? '❌ Error' : '⚠️ Flagged'}`,
			`**Stale:** ${record.isStale ? 'Yes (code changed since last run)' : 'No (current)'}`,
			`**Last Run:** ${lastRun}`,
			`**Duration:** ${record.durationMs}ms`,
			'',
			'### Input',
			'```json',
			record.input || '{}',
			'```',
			'',
			'### Output',
			'```',
			outputText,
			'```'
		];

		return textResult(lines.join('\n'));
	}
}
