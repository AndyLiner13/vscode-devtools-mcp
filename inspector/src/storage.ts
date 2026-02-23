import type { ContentBlock, ExecutionRecord, RecordRating } from './types';

type ChangeHandler = (toolName: string) => void;
const changeHandlers: ChangeHandler[] = [];

export function onStorageChange(handler: ChangeHandler): void {
	changeHandlers.push(handler);
}

export function connectStorageSync(): void {
	const es = new EventSource('/api/events');
	es.onmessage = (event) => {
		if (event.data === 'connected') {
			return;
		}
		try {
			const { tool } = JSON.parse(event.data) as { tool: string };
			for (const handler of changeHandlers) {
				handler(tool);
			}
		} catch {
			// ignore malformed SSE messages
		}
	};
}

async function apiGet<T>(url: string): Promise<T> {
	const res = await fetch(url);
	return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST'
	});
	return res.json() as Promise<T>;
}

async function apiPatch(url: string, body: unknown): Promise<void> {
	await fetch(url, {
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
		method: 'PATCH'
	});
}

async function apiDelete(url: string): Promise<void> {
	await fetch(url, { method: 'DELETE' });
}

export async function pruneUnrated(): Promise<void> {
	await apiPost('/api/prune-unrated', {});
}

export async function getRecords(toolName: string): Promise<ExecutionRecord[]> {
	return apiGet<ExecutionRecord[]>(`/api/records?tool=${encodeURIComponent(toolName)}`);
}

export async function getAllRecords(): Promise<Record<string, ExecutionRecord[]>> {
	return apiGet<Record<string, ExecutionRecord[]>>('/api/records');
}

export async function addRecord(toolName: string, input: string, output: ContentBlock[], isError: boolean, durationMs: number): Promise<ExecutionRecord> {
	return apiPost<ExecutionRecord>('/api/records', {
		durationMs,
		input,
		isError,
		output,
		toolName
	});
}

export async function updateRating(toolName: string, recordId: string, rating: RecordRating): Promise<void> {
	await apiPatch(`/api/records/${encodeURIComponent(recordId)}/rating`, {
		rating,
		toolName
	});
}

export async function updateComment(toolName: string, recordId: string, comment: string): Promise<void> {
	await apiPatch(`/api/records/${encodeURIComponent(recordId)}/comment`, {
		comment,
		toolName
	});
}

export async function updateRecordOutput(toolName: string, recordId: string, output: ContentBlock[], isError: boolean, durationMs: number): Promise<void> {
	await apiPatch(`/api/records/${encodeURIComponent(recordId)}/output`, {
		durationMs,
		isError,
		output,
		toolName
	});
}

export async function deleteRecord(toolName: string, recordId: string): Promise<void> {
	await apiDelete(`/api/records/${encodeURIComponent(recordId)}?tool=${encodeURIComponent(toolName)}`);
}

export async function reorderRecords(toolName: string, orderedIds: string[]): Promise<void> {
	await apiPost('/api/records/reorder', { orderedIds, toolName });
}
