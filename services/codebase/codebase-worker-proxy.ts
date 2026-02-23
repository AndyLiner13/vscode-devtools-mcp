// Codebase Worker Proxy
// Main-thread interface that forwards all codebase operations to the worker thread.
// Provides the same API surface as the direct service imports.
// Auto-restarts the worker on crash and applies per-request timeouts.

import type { UnifiedFileResult } from './file-structure-extractor';
import type { OrphanedContentResult } from './orphaned-content';
import type { OverviewParams, OverviewResult } from './types';
import type { ExportsParams, ExportsResult } from './types';
import type { TraceSymbolParams, TraceSymbolResult } from './types';
import type { DeadCodeParams, DeadCodeResult } from './types';
import type { ImportGraphParams, ImportGraphResult } from './types';
import type { DuplicateDetectionParams, DuplicateDetectionResult } from './types';
import type { ChunkFileParams, ChunkFileResult } from './types';
import type { FileStructure } from './types';

import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

// ── Configuration ────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 120_000;
const READY_TIMEOUT_MS = 30_000;
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_WINDOW_MS = 60_000;

// Per-operation timeout overrides (ms)
const OPERATION_TIMEOUTS: Record<string, number> = {
	chunkFile: 60_000,
	extractOrphanedContent: 30_000,
	findDeadCode: 120_000,
	findDuplicates: 120_000,
	getExports: 60_000,
	getImportGraph: 60_000,
	getOverview: 90_000,
	invalidateProject: 10_000,
	traceSymbol: 120_000
};

// ── Message Protocol ─────────────────────────────────────

interface WorkerRequest {
	id: number;
	operation: string;
	params: unknown;
}

interface WorkerResponse {
	error?: string;
	id: number;
	result?: unknown;
	stack?: string;
	type: 'response';
}

interface ReadyMessage {
	type: 'ready';
}

type WorkerMessage = ReadyMessage | WorkerResponse;

function isReadyMessage(msg: WorkerMessage): msg is ReadyMessage {
	return msg.type === 'ready';
}

// ── Pending Request Tracking ─────────────────────────────

interface PendingRequest {
	reject: (reason: Error) => void;
	resolve: (value: unknown) => void;
	timer: ReturnType<typeof setTimeout>;
}

// ── Worker Proxy ─────────────────────────────────────────

let worker: null | Worker = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();
let workerReady: null | Promise<void> = null;
let workerReadyResolve: (() => void) | null = null;
let workerReadyTimer: null | ReturnType<typeof setTimeout> = null;
let intentionallyStopped = false;

// Crash tracking for restart backoff
const crashTimestamps: number[] = [];

function getWorkerPath(): string {
	return path.join(__dirname, 'codebase-worker.js');
}

function shouldAllowRestart(): boolean {
	const now = Date.now();
	// Prune crashes outside the window
	while (crashTimestamps.length > 0 && now - crashTimestamps[0] > RESTART_WINDOW_MS) {
		crashTimestamps.shift();
	}
	return crashTimestamps.length < MAX_RESTART_ATTEMPTS;
}

function spawnWorker(): void {
	workerReady = new Promise<void>((resolve, reject) => {
		workerReadyResolve = resolve;

		workerReadyTimer = setTimeout(() => {
			workerReadyResolve = null;
			workerReadyTimer = null;
			reject(new Error('Worker failed to signal ready within timeout'));
			teardownWorker();
		}, READY_TIMEOUT_MS);
	});

	worker = new Worker(getWorkerPath());

	worker.on('message', (msg: WorkerMessage) => {
		if (isReadyMessage(msg)) {
			if (workerReadyTimer) {
				clearTimeout(workerReadyTimer);
				workerReadyTimer = null;
			}
			workerReadyResolve?.();
			workerReadyResolve = null;
			return;
		}

		const pending = pendingRequests.get(msg.id);
		if (!pending) return;

		clearTimeout(pending.timer);
		pendingRequests.delete(msg.id);

		if (msg.error) {
			const err = new Error(msg.error);
			if (msg.stack) err.stack = msg.stack;
			pending.reject(err);
		} else {
			pending.resolve(msg.result);
		}
	});

	worker.on('error', (err) => {
		console.error('[codebase-worker] Worker error:', err.message);
		rejectAllPending(err);
	});

	worker.on('exit', (code) => {
		worker = null;
		workerReady = null;

		if (workerReadyTimer) {
			clearTimeout(workerReadyTimer);
			workerReadyTimer = null;
		}

		if (code !== 0 && !intentionallyStopped) {
			console.warn(`[codebase-worker] Worker exited with code ${code} — will auto-restart on next request`);
			crashTimestamps.push(Date.now());
		}

		rejectAllPending(new Error(`Worker exited with code ${code}`));
	});
}

export function startWorker(): void {
	if (worker) return;
	intentionallyStopped = false;
	spawnWorker();
}

export async function stopWorker(): Promise<void> {
	if (!worker) return;

	intentionallyStopped = true;
	rejectAllPending(new Error('Worker is shutting down'));

	if (workerReadyTimer) {
		clearTimeout(workerReadyTimer);
		workerReadyTimer = null;
	}

	await worker.terminate();
	worker = null;
	workerReady = null;
}

function teardownWorker(): void {
	if (!worker) return;
	const w = worker;
	worker = null;
	workerReady = null;
	rejectAllPending(new Error('Worker torn down'));
	w.terminate().catch(() => {});
}

function rejectAllPending(err: Error): void {
	for (const pending of pendingRequests.values()) {
		clearTimeout(pending.timer);
		pending.reject(err);
	}
	pendingRequests.clear();
}

async function ensureWorker(): Promise<void> {
	if (worker && workerReady) return workerReady;

	if (!shouldAllowRestart()) {
		return Promise.reject(new Error(`Worker crashed ${MAX_RESTART_ATTEMPTS} times within ${RESTART_WINDOW_MS / 1000}s — refusing to restart. Call startWorker() to reset.`));
	}

	intentionallyStopped = false;
	spawnWorker();
	if (!workerReady) {
		return Promise.reject(new Error('Worker failed to initialize'));
	}
	return workerReady;
}

async function sendRequest<T>(operation: string, params: unknown): Promise<T> {
	await ensureWorker();

	const id = nextRequestId++;
	const timeoutMs = OPERATION_TIMEOUTS[operation] ?? DEFAULT_TIMEOUT_MS;
	const request: WorkerRequest = { id, operation, params };

	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			pendingRequests.delete(id);
			reject(new Error(`Worker operation '${operation}' timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		pendingRequests.set(id, {
			reject,
			resolve: resolve as (value: unknown) => void,
			timer
		});
		const w = worker;
		if (!w) {
			clearTimeout(timer);
			pendingRequests.delete(id);
			reject(new Error('Worker disappeared before request could be sent'));
			return;
		}
		w.postMessage(request);
	});
}

// ── Public API (matches direct service imports) ──────────

export async function getOverview(params: OverviewParams): Promise<OverviewResult> {
	return sendRequest<OverviewResult>('getOverview', params);
}

export async function getExports(params: ExportsParams): Promise<ExportsResult> {
	return sendRequest<ExportsResult>('getExports', params);
}

export async function traceSymbol(params: TraceSymbolParams): Promise<TraceSymbolResult> {
	return sendRequest<TraceSymbolResult>('traceSymbol', params);
}

export async function findDeadCode(params: DeadCodeParams): Promise<DeadCodeResult> {
	return sendRequest<DeadCodeResult>('findDeadCode', params);
}

export async function getImportGraph(params: ImportGraphParams): Promise<ImportGraphResult> {
	return sendRequest<ImportGraphResult>('getImportGraph', params);
}

export async function findDuplicates(params: DuplicateDetectionParams): Promise<DuplicateDetectionResult> {
	return sendRequest<DuplicateDetectionResult>('findDuplicates', params);
}

export async function chunkFile(params: ChunkFileParams): Promise<ChunkFileResult> {
	return sendRequest<ChunkFileResult>('chunkFile', params);
}

export async function invalidateProject(rootDir?: string): Promise<void> {
	return sendRequest<void>('invalidateProject', { rootDir });
}

export interface ExtractOrphanedContentParams {
	filePath: string;
	symbolRanges?: Array<{ start: number; end: number }>;
}

export async function extractOrphanedContent(params: ExtractOrphanedContentParams): Promise<OrphanedContentResult> {
	return sendRequest<OrphanedContentResult>('extractOrphanedContent', params);
}

export async function extractFileStructure(filePath: string): Promise<UnifiedFileResult> {
	return sendRequest<UnifiedFileResult>('extractFileStructure', { filePath });
}

export async function extractStructure(filePath: string): Promise<FileStructure | undefined> {
	return sendRequest<FileStructure | undefined>('extractStructure', { filePath });
}
