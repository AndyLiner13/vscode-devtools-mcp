// Codebase Worker Thread
// Runs all codebase analysis operations in a dedicated worker thread.
// Holds ts-morph Project instances in memory permanently for instant reuse.

import type { FileStructure, OverviewParams, OverviewResult } from './types';
import type { ExportsParams, ExportsResult } from './types';
import type { TraceSymbolParams, TraceSymbolResult } from './types';
import type { DeadCodeParams, DeadCodeResult } from './types';
import type { ImportGraphParams, ImportGraphResult } from './types';
import type { DuplicateDetectionParams, DuplicateDetectionResult } from './types';
import type { ChunkFileParams, ChunkFileResult } from './types';

import * as path from 'node:path';
import { parentPort } from 'node:worker_threads';

import { chunkFile } from './chunker';
import { findDuplicates } from './duplicate-detection-service';
import { getExports } from './exports-service';
import { getImportGraph } from './import-graph-service';
import { LanguageServiceRegistry } from './language-service-registry';
import { TypeScriptLanguageService } from './language-services';
import { MarkdownLanguageService } from './language-services';
import { JsonLanguageService } from './language-services';
import { getOverview } from './overview-service';
import { findDeadCode, traceSymbol } from './trace-symbol-service';
import { invalidateWorkspaceProject } from './ts-project';

// ── Language Service Registry ────────────────────────────

const registry = new LanguageServiceRegistry();
registry.register(new TypeScriptLanguageService());
registry.register(new MarkdownLanguageService());
registry.register(new JsonLanguageService());

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

// ── Operation Registry ───────────────────────────────────

type OperationHandler = (params: never) => Promise<unknown> | unknown;

const operations: Record<string, OperationHandler> = {
	chunkFile: (params: ChunkFileParams) => chunkFile(params),
	extractStructure: async (params: { filePath: string }) => {
		const ext = path.extname(params.filePath).slice(1).toLowerCase();
		const service = registry.get(ext);
		if (!service) return null;
		return service.extractStructure(params.filePath);
	},
	findDeadCode: async (params: DeadCodeParams) => findDeadCode(params),
	findDuplicates: async (params: DuplicateDetectionParams) => findDuplicates(params),
	getExports: (params: ExportsParams) => getExports(params),
	getImportGraph: async (params: ImportGraphParams) => getImportGraph(params),
	getOverview: (params: OverviewParams) => getOverview(params),
	invalidateProject: (params: { rootDir?: string }) => {
		invalidateWorkspaceProject(params.rootDir);
		return { ok: true };
	},
	traceSymbol: async (params: TraceSymbolParams) => traceSymbol(params)
};

// ── Message Handler ──────────────────────────────────────

if (!parentPort) {
	throw new Error('codebase-worker.ts must be run as a worker thread');
}

parentPort.on('message', async (msg: WorkerRequest) => {
	const { id, operation, params } = msg;
	const handler = operations[operation];

	const port = parentPort;
	if (!port) return;

	if (!handler) {
		const response: WorkerResponse = { error: `Unknown operation: ${operation}`, id, type: 'response' };
		port.postMessage(response);
		return;
	}

	try {
		const result = await handler(params as never);
		const response: WorkerResponse = { id, result, type: 'response' };
		port.postMessage(response);
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : undefined;
		const response: WorkerResponse = { error: errorMessage, id, stack: errorStack, type: 'response' };
		port.postMessage(response);
	}
});

// Signal that the worker is ready
parentPort.postMessage({ type: 'ready' });
