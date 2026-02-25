import type { ContentBlock, ExecutionRecord, RecordRating } from './types';

import { onEvent, rpc } from './bridge';

type ChangeHandler = (toolName: string) => void;
const changeHandlers: ChangeHandler[] = [];

export function onStorageChange(handler: ChangeHandler): void {
	changeHandlers.push(handler);
}

/**
 * Listen for storage mutation events pushed from the Client backend.
 * Replaces the old SSE EventSource connection.
 */
export function connectStorageSync(): void {
	onEvent('storage/changed', (data) => {
		const tool = typeof data === 'object' && data !== null && 'tool' in data
			? String((data as { tool: string }).tool)
			: '*';
		for (const handler of changeHandlers) {
			handler(tool);
		}
	});
}

export async function pruneUnrated(): Promise<void> {
	await rpc('records/pruneUnrated');
}

export async function getRecords(toolName: string): Promise<ExecutionRecord[]> {
	return rpc<ExecutionRecord[]>('records/list', { tool: toolName });
}

export async function addRecord(toolName: string, input: string, output: ContentBlock[], isError: boolean, durationMs: number): Promise<ExecutionRecord> {
	return rpc<ExecutionRecord>('records/create', {
		durationMs,
		input,
		isError,
		output,
		toolName
	});
}

export async function updateRating(_toolName: string, recordId: string, rating: RecordRating): Promise<void> {
	await rpc('records/rating', { id: recordId, rating });
}

export async function updateComment(_toolName: string, recordId: string, comment: string): Promise<void> {
	await rpc('records/comment', { comment, id: recordId });
}

export async function updateRecordOutput(_toolName: string, recordId: string, output: ContentBlock[], isError: boolean, durationMs: number): Promise<void> {
	await rpc('records/output', {
		durationMs,
		id: recordId,
		isError,
		output
	});
}

export async function deleteRecord(_toolName: string, recordId: string): Promise<void> {
	await rpc('records/delete', { id: recordId });
}
