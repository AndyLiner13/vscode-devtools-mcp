/**
 * Client RPC Handlers
 *
 * IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
 * We have no access to proposed APIs. They will cause the extension to
 * enter Safe Mode and all client handlers will fail to register.
 *
 * Handles tool operations for the VS Code DevTools MCP system.
 * The Client is the Extension Development Host (the spawned VS Code window).
 *
 * API Surface (Terminal — single-terminal model):
 * - terminal.run: Run a command, wait for completion/prompt/timeout
 * - terminal.input: Send input to a waiting prompt
 * - terminal.state: Check current terminal state
 * - terminal.kill: Send Ctrl+C to stop the running process
 *
 * API Surface (Other):
 * - terminal.listAll: List all VS Code terminals
 * - command.execute: Run arbitrary VS Code commands
 */

import * as vscode from 'vscode';

import { extractFileStructure, extractOrphanedContent, extractStructure, findDeadCode, findDuplicates, getExports, getImportGraph, getOverview, traceSymbol } from './codebase/codebase-worker-proxy';
import { registerInspectorHandlers } from './inspector-backend';
import { disposeProcessLedger, getProcessLedger, initProcessLedger, type ProcessLedgerSummary } from './processLedger';
import { SingleTerminalController } from './singleTerminalController';
import { getUserActionTracker } from './userActionTracker';
import { error, log, warn } from './logger';


// ── Types ────────────────────────────────────────────────────────────────────

export type RegisterHandler = (method: string, handler: (params: Record<string, unknown>) => Promise<unknown> | unknown) => void;

// ── Type-safe param extraction ───────────────────────────────────────────────

function paramStr(p: Record<string, unknown>, k: string): string | undefined {
	const v = p[k];
	return typeof v === 'string' ? v : undefined;
}

function paramNum(p: Record<string, unknown>, k: string): number | undefined {
	const v = p[k];
	return typeof v === 'number' ? v : undefined;
}

function paramBool(p: Record<string, unknown>, k: string): boolean | undefined {
	const v = p[k];
	return typeof v === 'boolean' ? v : undefined;
}

function paramStrArray(p: Record<string, unknown>, k: string): string[] | undefined {
	const v = p[k];
	if (!Array.isArray(v)) return undefined;
	return v.filter((item): item is string => typeof item === 'string');
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

// ── Module State ─────────────────────────────────────────────────────────────

let terminalController: null | SingleTerminalController = null;

// ── Read Highlight Decoration ────────────────────────────────────────────────

const readHighlightDecoration = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(255, 213, 79, 0.25)',
	border: '1px solid rgba(255, 213, 79, 0.4)',
	isWholeLine: false,
	overviewRulerColor: 'rgba(255, 213, 79, 0.7)',
	overviewRulerLane: vscode.OverviewRulerLane.Center
});

const collapsedRangeDecoration = vscode.window.createTextEditorDecorationType({
	backgroundColor: 'rgba(150, 150, 150, 0.15)',
	isWholeLine: true,
	overviewRulerColor: 'rgba(150, 150, 150, 0.4)',
	overviewRulerLane: vscode.OverviewRulerLane.Center
});

// ── Edit Diff Virtual Document Provider ──────────────────────────────────────

const EDIT_DIFF_SCHEME = 'devtools-edit-before';
const editDiffContentStore = new Map<string, string>();
let editDiffProviderDisposable: undefined | vscode.Disposable;

// Windows drive letters can differ in case between URI.from() and VS Code's internal normalization
function diffStoreKey(rawPath: string): string {
	return rawPath.replaceAll('\\', '/').toLowerCase();
}

function ensureEditDiffProvider(): void {
	if (editDiffProviderDisposable) return;
	editDiffProviderDisposable = vscode.workspace.registerTextDocumentContentProvider(EDIT_DIFF_SCHEME, {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return editDiffContentStore.get(diffStoreKey(uri.path)) ?? '';
		}
	});
}

// Per-document folding range provider so we can fold on our own boundaries
let activeFoldingProvider: undefined | vscode.Disposable;
let activeFoldingRanges: vscode.FoldingRange[] = [];

function registerFoldingRanges(doc: vscode.TextDocument, collapsedRanges: Array<{ startLine: number; endLine: number }>): void {
	activeFoldingProvider?.dispose();
	activeFoldingRanges = collapsedRanges.map((r) => {
		const s = Math.max(0, Math.min(r.startLine - 1, doc.lineCount - 1));
		const e = Math.max(s, Math.min(r.endLine - 1, doc.lineCount - 1));
		return new vscode.FoldingRange(s, e, vscode.FoldingRangeKind.Region);
	});
	activeFoldingProvider = vscode.languages.registerFoldingRangeProvider(
		{ pattern: doc.uri.fsPath },
		{
			provideFoldingRanges(): vscode.FoldingRange[] {
				return activeFoldingRanges;
			}
		}
	);
}

function parseRangeArray(value: unknown): Array<{ startLine: number; endLine: number }> {
	if (!Array.isArray(value)) return [];
	const ranges: Array<{ startLine: number; endLine: number }> = [];
	for (const item of value) {
		if (item !== null && typeof item === 'object' && 'startLine' in item && 'endLine' in item) {
			const s = item.startLine;
			const e = item.endLine;
			if (typeof s === 'number' && typeof e === 'number') {
				ranges.push({ endLine: e, startLine: s });
			}
		}
	}
	return ranges;
}

/**
 * Get the shared terminal controller (for LM tools or other consumers).
 */
export function getTerminalControllerFromClient(): null | SingleTerminalController {
	return terminalController;
}

// ── Terminal Handlers (Multi-Terminal Model) ─────────────────────────────────

/**
 * Run a command in a named terminal (PowerShell).
 * Creates the terminal if needed, rejects with current state if busy.
 * Returns when the command completes, a prompt is detected, or timeout fires.
 */
async function handleTerminalRun(params: Record<string, unknown>) {
	if (!terminalController) throw new Error('Terminal controller not initialized');

	const command = paramStr(params, 'command');
	if (!command) {
		throw new Error('command is required and must be a string');
	}

	const cwd = paramStr(params, 'cwd');
	if (!cwd) {
		throw new Error('cwd is required and must be an absolute path');
	}

	const timeout = paramNum(params, 'timeout');
	const name = paramStr(params, 'name');

	log(`[client] terminal.run — cwd: ${cwd}, command: ${command}, name: ${name ?? 'default'}`);
	return terminalController.run(command, cwd, timeout, name);
}

/**
 * Send input text to a terminal (e.g. answering a [Y/n] prompt).
 * Waits for the next completion or prompt after sending.
 */
async function handleTerminalInput(params: Record<string, unknown>) {
	if (!terminalController) throw new Error('Terminal controller not initialized');

	const text = paramStr(params, 'text');
	if (typeof text !== 'string') {
		throw new Error('text is required and must be a string');
	}

	const addNewline = paramBool(params, 'addNewline') ?? true;
	const timeout = paramNum(params, 'timeout');
	const name = paramStr(params, 'name');

	log(`[client] terminal.input — text: ${text}, name: ${name ?? 'default'}`);
	return terminalController.sendInput(text, addNewline, timeout, name);
}

/**
 * Get the current terminal state without modifying anything.
 */
async function handleTerminalState(params: Record<string, unknown>) {
	if (!terminalController) throw new Error('Terminal controller not initialized');

	const name = paramStr(params, 'name');
	return terminalController.getState(name);
}

/**
 * Send Ctrl+C to kill the running process in a terminal.
 */
function handleTerminalKill(params: Record<string, unknown>) {
	if (!terminalController) throw new Error('Terminal controller not initialized');

	const name = paramStr(params, 'name');
	log(`[client] terminal.kill — name: ${name ?? 'default'}`);
	return terminalController.kill(name);
}

// ── Process Ledger Handlers ──────────────────────────────────────────────────

/**
 * Get the full process ledger (active + orphaned + recently completed + terminal sessions).
 * This is called by MCP before EVERY tool response for Copilot accountability.
 * Refreshes the child process cache if stale (PowerShell CIM query, 5s TTL).
 */
async function handleGetProcessLedger(_params: Record<string, unknown>): Promise<ProcessLedgerSummary> {
	const ledger = getProcessLedger();
	await ledger.refreshActiveChildren();
	const summary = ledger.getLedger();

	// Inject live terminal session data from the terminal controller
	if (terminalController) {
		summary.terminalSessions = terminalController.getTerminalSessions();
	}

	return summary;
}

/**
 * Kill a process by PID. Works for both active and orphaned processes.
 */
async function handleKillProcess(params: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
	const pid = paramNum(params, 'pid');
	if (typeof pid !== 'number' || pid <= 0) {
		throw new Error('pid is required and must be a positive number');
	}

	log(`[client] process.kill — PID: ${pid}`);
	const ledger = getProcessLedger();
	return ledger.killProcess(pid);
}

/**
 * Kill all orphaned processes from previous sessions.
 */
async function handleKillOrphans(_params: Record<string, unknown>): Promise<{ killed: number[]; failed: Array<{ pid: number; error: string }> }> {
	log('[client] process.killOrphans');
	const ledger = getProcessLedger();
	return ledger.killAllOrphans();
}

// ── Terminal ListAll Handler ─────────────────────────────────────────────────

/**
 * List ALL terminals in this VS Code window (tracked and untracked).
 * Uses the VS Code API's vscode.window.terminals.
 */
function handleTerminalListAll(_params: Record<string, unknown>): unknown {
	const { terminals } = vscode.window;
	const { activeTerminal } = vscode.window;

	const terminalInfos = terminals.map((terminal, index) => {
		const opts = terminal.creationOptions;
		return {
			creationOptions: {
				name: opts?.name,
				shellPath: opts && 'shellPath' in opts ? opts.shellPath : undefined
			},
			exitStatus: terminal.exitStatus ? { code: terminal.exitStatus.code, reason: terminal.exitStatus.reason } : undefined,
			index,
			isActive: terminal === activeTerminal,
			name: terminal.name,
			processId: undefined,
			state: {
				isInteractedWith: terminal.state?.isInteractedWith ?? false
			}
		};
	});

	const activeIndex = terminalInfos.findIndex((t) => t.isActive);

	return {
		activeIndex: activeIndex >= 0 ? activeIndex : undefined,
		terminals: terminalInfos,
		total: terminalInfos.length
	};
}

// ── Command Execute Handler ──────────────────────────────────────────────────

/**
 * Execute a VS Code command in this window.
 */
async function handleCommandExecute(params: Record<string, unknown>): Promise<{ result: unknown }> {
	const command = paramStr(params, 'command');
	const args = Array.isArray(params.args) ? params.args : undefined;

	if (!command) {
		throw new Error('command is required');
	}

	const result = args ? await vscode.commands.executeCommand(command, ...args) : await vscode.commands.executeCommand(command);

	return { result };
}

// ── Codebase Handler ─────────────────────────────────────────────────────────

function resolveRootDir(params: Record<string, unknown>): string {
	const explicit = paramStr(params, 'rootDir');
	if (explicit) return explicit;
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (workspaceRoot) return workspaceRoot;
	throw new Error('No workspace folder found. Open a folder or specify rootDir.');
}

async function handleCodebaseGetOverview(params: Record<string, unknown>) {
	const rootDir = resolveRootDir(params);
	return getOverview({
		dir: paramStr(params, 'dir') ?? rootDir,
		metadata: paramBool(params, 'metadata') ?? false,
		recursive: paramBool(params, 'recursive') ?? false,
		rootDir,
		symbols: paramBool(params, 'symbols') ?? false,
		toolScope: paramStr(params, 'toolScope') ?? undefined
	});
}

async function handleCodebaseGetExports(params: Record<string, unknown>) {
	const pathParam = paramStr(params, 'path');
	if (!pathParam) {
		throw new Error('path is required');
	}

	return getExports({
		excludePatterns: paramStrArray(params, 'excludePatterns'),
		includeJSDoc: paramBool(params, 'includeJSDoc') ?? true,
		includePatterns: paramStrArray(params, 'includePatterns'),
		includeTypes: paramBool(params, 'includeTypes') ?? true,
		kind: paramStr(params, 'kind') ?? 'all',
		path: pathParam,
		rootDir: resolveRootDir(params)
	});
}

async function handleCodebaseTraceSymbol(params: Record<string, unknown>) {
	const symbol = paramStr(params, 'symbol');
	if (!symbol) {
		throw new Error('symbol is required');
	}

	try {
		return await traceSymbol({
			column: paramNum(params, 'column'),
			depth: paramNum(params, 'depth') ?? 3,
			excludePatterns: paramStrArray(params, 'excludePatterns'),
			file: paramStr(params, 'file'),
			forceRefresh: paramBool(params, 'forceRefresh') ?? false,
			include: paramStrArray(params, 'include') ?? ['all'],
			includeImpact: paramBool(params, 'includeImpact') ?? false,
			includePatterns: paramStrArray(params, 'includePatterns'),
			line: paramNum(params, 'line'),
			maxReferences: undefined,
			rootDir: resolveRootDir(params),
			symbol,
			timeout: paramNum(params, 'timeout')
		});
	} catch (err: unknown) {
		warn('[client] traceSymbol error:', errorMessage(err));
		return {
			callChain: { incomingCalls: [], outgoingCalls: [] },
			partial: true,
			reExports: [],
			references: [],
			summary: { maxCallDepth: 0, totalFiles: 0, totalReferences: 0 },
			symbol,
			typeFlows: []
		};
	}
}

async function handleCodebaseFindDeadCode(params: Record<string, unknown>) {
	try {
		return await findDeadCode({
			excludePatterns: paramStrArray(params, 'excludePatterns'),
			excludeTests: paramBool(params, 'excludeTests') ?? true,
			exportedOnly: paramBool(params, 'exportedOnly') ?? true,
			includePatterns: paramStrArray(params, 'includePatterns'),
			kinds: paramStrArray(params, 'kinds'),
			limit: paramNum(params, 'limit') ?? 100,
			pattern: paramStr(params, 'pattern'),
			rootDir: resolveRootDir(params)
		});
	} catch (err: unknown) {
		warn('[client] findDeadCode error:', errorMessage(err));
		return {
			deadCode: [],
			errorMessage: errorMessage(err),
			summary: { scanDurationMs: 0, totalDead: 0, totalScanned: 0 }
		};
	}
}

async function handleCodebaseGetImportGraph(params: Record<string, unknown>) {
	try {
		return await getImportGraph({
			excludePatterns: paramStrArray(params, 'excludePatterns'),
			includePatterns: paramStrArray(params, 'includePatterns'),
			rootDir: resolveRootDir(params)
		});
	} catch (err: unknown) {
		warn('[client] getImportGraph error:', errorMessage(err));
		return {
			circular: [],
			errorMessage: errorMessage(err),
			modules: {},
			orphans: [],
			stats: { circularCount: 0, orphanCount: 0, totalEdges: 0, totalModules: 0 }
		};
	}
}

async function handleCodebaseFindDuplicates(params: Record<string, unknown>) {
	try {
		return await findDuplicates({
			excludePatterns: paramStrArray(params, 'excludePatterns'),
			includePatterns: paramStrArray(params, 'includePatterns'),
			kinds: paramStrArray(params, 'kinds'),
			limit: paramNum(params, 'limit') ?? 50,
			rootDir: resolveRootDir(params)
		});
	} catch (err: unknown) {
		warn('[client] findDuplicates error:', errorMessage(err));
		return {
			errorMessage: errorMessage(err),
			groups: [],
			summary: { filesWithDuplicates: 0, scanDurationMs: 0, totalDuplicateInstances: 0, totalGroups: 0 }
		};
	}
}

async function handleCodebaseGetDiagnostics(params: Record<string, unknown>) {
	try {
		const severityFilter = paramStrArray(params, 'severityFilter');
		const includePatterns = paramStrArray(params, 'includePatterns');
		const excludePatterns = paramStrArray(params, 'excludePatterns');
		const limit = paramNum(params, 'limit') ?? 100;

		const allDiagnostics = vscode.languages.getDiagnostics();

		// Determine which severities to include
		const wantErrors = !severityFilter || severityFilter.includes('error');
		const wantWarnings = !severityFilter || severityFilter.includes('warning');

		const items: Array<{
			file: string;
			line: number;
			column: number;
			severity: string;
			code: string;
			message: string;
			source: string;
		}> = [];

		for (const [uri, diagnostics] of allDiagnostics) {
			const filePath = uri.fsPath;

			// Apply include/exclude pattern filters
			if (includePatterns && includePatterns.length > 0) {
				const matchesInclude = includePatterns.some((pattern) => {
					const regex = globToRegex(pattern);
					return regex.test(filePath);
				});
				if (!matchesInclude) continue;
			}

			if (excludePatterns && excludePatterns.length > 0) {
				const matchesExclude = excludePatterns.some((pattern) => {
					const regex = globToRegex(pattern);
					return regex.test(filePath);
				});
				if (matchesExclude) continue;
			}

			for (const diag of diagnostics) {
				const severity = diagSeverityToString(diag.severity);
				if (severity === 'error' && !wantErrors) continue;
				if (severity === 'warning' && !wantWarnings) continue;
				if (severity !== 'error' && severity !== 'warning') continue;

				if (items.length >= limit) break;

				const codeStr = typeof diag.code === 'object' && diag.code !== null ? String((diag.code as { value: number | string }).value) : String(diag.code ?? '');

				items.push({
					code: codeStr,
					column: diag.range.start.character + 1,
					file: vscode.workspace.asRelativePath(uri),
					line: diag.range.start.line + 1,
					message: diag.message,
					severity,
					source: diag.source ?? 'unknown'
				});
			}
			if (items.length >= limit) break;
		}

		const errorCount = items.filter((i) => i.severity === 'error').length;
		const warningCount = items.filter((i) => i.severity === 'warning').length;

		return {
			diagnostics: items,
			summary: {
				totalErrors: errorCount,
				totalFiles: new Set(items.map((i) => i.file)).size,
				totalWarnings: warningCount
			}
		};
	} catch (err: unknown) {
		warn('[client] getDiagnostics error:', errorMessage(err));
		return {
			diagnostics: [],
			errorMessage: errorMessage(err),
			summary: { totalErrors: 0, totalFiles: 0, totalWarnings: 0 }
		};
	}
}

function diagSeverityToString(severity: vscode.DiagnosticSeverity): string {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error:
			return 'error';
		case vscode.DiagnosticSeverity.Warning:
			return 'warning';
		case vscode.DiagnosticSeverity.Information:
			return 'info';
		case vscode.DiagnosticSeverity.Hint:
			return 'hint';
		default:
			return 'unknown';
	}
}

function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
		.replaceAll('**', '<<<GLOBSTAR>>>')
		.replaceAll('*', '[^/\\\\]*')
		.replaceAll('<<<GLOBSTAR>>>', '.*')
		.replaceAll('?', '[^/\\\\]');
	return new RegExp(escaped, 'i');
}

// ── File Service Handlers ────────────────────────────────────────────────────

/** Map VS Code SymbolKind enum to human-readable strings */
function symbolKindName(kind: vscode.SymbolKind): string {
	const names: Record<number, string> = {
		[vscode.SymbolKind.Array]: 'array',
		[vscode.SymbolKind.Boolean]: 'boolean',
		[vscode.SymbolKind.Class]: 'class',
		[vscode.SymbolKind.Constant]: 'constant',
		[vscode.SymbolKind.Constructor]: 'constructor',
		[vscode.SymbolKind.Enum]: 'enum',
		[vscode.SymbolKind.EnumMember]: 'enumMember',
		[vscode.SymbolKind.Event]: 'event',
		[vscode.SymbolKind.Field]: 'field',
		[vscode.SymbolKind.File]: 'file',
		[vscode.SymbolKind.Function]: 'function',
		[vscode.SymbolKind.Interface]: 'interface',
		[vscode.SymbolKind.Key]: 'key',
		[vscode.SymbolKind.Method]: 'method',
		[vscode.SymbolKind.Module]: 'module',
		[vscode.SymbolKind.Namespace]: 'namespace',
		[vscode.SymbolKind.Null]: 'null',
		[vscode.SymbolKind.Number]: 'number',
		[vscode.SymbolKind.Object]: 'object',
		[vscode.SymbolKind.Operator]: 'operator',
		[vscode.SymbolKind.Package]: 'package',
		[vscode.SymbolKind.Property]: 'property',
		[vscode.SymbolKind.String]: 'string',
		[vscode.SymbolKind.Struct]: 'struct',
		[vscode.SymbolKind.TypeParameter]: 'typeParameter',
		[vscode.SymbolKind.Variable]: 'variable'
	};
	return names[kind] ?? 'unknown';
}

interface SerializedFileSymbol {
	children: SerializedFileSymbol[];
	detail?: string;
	kind: string;
	name: string;
	range: { startLine: number; startChar: number; endLine: number; endChar: number };
	selectionRange: { startLine: number; startChar: number; endLine: number; endChar: number };
}

function serializeDocSymbol(sym: vscode.DocumentSymbol): SerializedFileSymbol {
	let { name } = sym;

	// Fix "<unknown>" name for module.exports patterns (VS Code limitation)
	if (name === '<unknown>' && sym.kind === vscode.SymbolKind.Variable) {
		name = 'module.exports';
	}

	return {
		children: sym.children.map(serializeDocSymbol),
		detail: sym.detail || undefined,
		kind: symbolKindName(sym.kind),
		name,
		range: {
			endChar: sym.range.end.character,
			endLine: sym.range.end.line,
			startChar: sym.range.start.character,
			startLine: sym.range.start.line
		},
		selectionRange: {
			endChar: sym.selectionRange.end.character,
			endLine: sym.selectionRange.end.line,
			startChar: sym.selectionRange.start.character,
			startLine: sym.selectionRange.start.line
		}
	};
}

/**
 * Get DocumentSymbols for a file, serialized with string kind names.
 */
async function handleFileGetSymbols(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	const uri = vscode.Uri.file(filePath);
	try {
		await vscode.workspace.openTextDocument(uri);
	} catch {
		/* best-effort open */
	}

	const symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[] | vscode.SymbolInformation[]>('vscode.executeDocumentSymbolProvider', uri);

	if (!symbols || symbols.length === 0) return { symbols: [] };

	// Only handle DocumentSymbol (not SymbolInformation)
	const docSymbols = symbols.filter((s): s is vscode.DocumentSymbol => 'children' in s);
	return { symbols: docSymbols.map(serializeDocSymbol) };
}

/**
 * Read file content, optionally by line range.
 */
async function handleFileReadContent(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	// Track file access so we can alert Copilot if the user saves changes
	getUserActionTracker().trackFileAccess(filePath);

	const uri = vscode.Uri.file(filePath);
	const doc = await vscode.workspace.openTextDocument(uri);
	const totalLines = doc.lineCount;

	const startLine = paramNum(params, 'startLine') ?? 0;
	const endLine = paramNum(params, 'endLine') ?? totalLines - 1;

	const clampedStart = Math.max(0, Math.min(startLine, totalLines - 1));
	const clampedEnd = Math.max(clampedStart, Math.min(endLine, totalLines - 1));

	const range = new vscode.Range(clampedStart, 0, clampedEnd, doc.lineAt(clampedEnd).text.length);
	const content = doc.getText(range);

	return { content, endLine: clampedEnd, startLine: clampedStart, totalLines };
}

/**
 * Open a file in the editor and highlight the range Copilot just read.
 * Clears any previous read highlight so only the latest read is visible.
 */
async function handleFileHighlightReadRange(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	getUserActionTracker().trackFileAccess(filePath);

	const startLine = paramNum(params, 'startLine') ?? 0;
	const endLine = paramNum(params, 'endLine') ?? 0;
	const collapsedRanges = parseRangeArray(params['collapsedRanges']);
	const sourceRanges = parseRangeArray(params['sourceRanges']);

	const uri = vscode.Uri.file(filePath);
	const doc = await vscode.workspace.openTextDocument(uri);

	// Clear previous highlights on ALL visible editors
	for (const editor of vscode.window.visibleTextEditors) {
		editor.setDecorations(readHighlightDecoration, []);
		editor.setDecorations(collapsedRangeDecoration, []);
	}

	const editor = await vscode.window.showTextDocument(doc, {
		preserveFocus: false,
		preview: true
	});

	if (collapsedRanges.length > 0 || sourceRanges.length > 0) {
		// Structured mode: source lines get yellow (skip empty lines), collapsed items fold
		const sourceDecorations: vscode.Range[] = [];
		for (const r of sourceRanges) {
			const s = Math.max(0, Math.min(r.startLine - 1, doc.lineCount - 1));
			const e = Math.max(s, Math.min(r.endLine - 1, doc.lineCount - 1));
			for (let line = s; line <= e; line++) {
				const lineText = doc.lineAt(line).text;
				if (lineText.trim().length > 0) {
					sourceDecorations.push(new vscode.Range(line, 0, line, lineText.length));
				}
			}
		}

		const collapsedDecorations: vscode.Range[] = [];
		const foldLines: number[] = [];
		for (const r of collapsedRanges) {
			const s = Math.max(0, Math.min(r.startLine - 1, doc.lineCount - 1));
			const e = Math.max(s, Math.min(r.endLine - 1, doc.lineCount - 1));
			foldLines.push(s);
			collapsedDecorations.push(new vscode.Range(s, 0, e, doc.lineAt(e).text.length));
		}

		editor.setDecorations(readHighlightDecoration, sourceDecorations);
		editor.setDecorations(collapsedRangeDecoration, collapsedDecorations);

		// Register our own folding ranges and fold them
		if (collapsedRanges.length > 0) {
			registerFoldingRanges(doc, collapsedRanges);
			// Small delay so VS Code picks up the new folding provider before we fold
			await new Promise((resolve) => setTimeout(resolve, 100));
			await vscode.commands.executeCommand('editor.fold', { levels: 1, selectionLines: foldLines });
		}

		// Center viewport on the first non-collapsed (source) content
		const scrollTarget = sourceRanges[0] ?? collapsedRanges[0];
		if (scrollTarget) {
			const scrollLine = Math.max(0, scrollTarget.startLine - 1);
			editor.revealRange(new vscode.Range(scrollLine, 0, scrollLine, 0), vscode.TextEditorRevealType.InCenter);
		}
	} else {
		// Legacy mode: single range highlight
		const clampedStart = Math.max(0, Math.min(startLine, doc.lineCount - 1));
		const clampedEnd = Math.max(clampedStart, Math.min(endLine, doc.lineCount - 1));
		const highlightRange = new vscode.Range(clampedStart, 0, clampedEnd, doc.lineAt(clampedEnd).text.length);
		editor.revealRange(highlightRange, vscode.TextEditorRevealType.InCenter);
		editor.setDecorations(readHighlightDecoration, [highlightRange]);
	}

	return { success: true };
}

/**
 * Show an inline diff editor comparing old content vs current file after an edit.
 * Old content was pre-captured by handleFileApplyEdit before the edit was applied.
 */
async function handleFileShowEditDiff(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	const editStartLine = paramNum(params, 'editStartLine') ?? 0;

	// The "before" content was captured by handleFileApplyEdit
	const beforeUri = vscode.Uri.from({ path: filePath, scheme: EDIT_DIFF_SCHEME });
	if (!editDiffContentStore.has(diffStoreKey(filePath))) {
		return { reason: 'No pre-edit content snapshot available', success: false };
	}

	const afterUri = vscode.Uri.file(filePath);
	const fileName = filePath.replaceAll('\\', '/').split('/').pop() ?? 'file';

	await vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri, `${fileName} (edit diff)`, {
		preview: false,
		renderSideBySide: false
	});

	// Scroll to the edit region in the diff editor
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const revealLine = Math.max(0, editStartLine);
		activeEditor.revealRange(new vscode.Range(revealLine, 0, revealLine, 0), vscode.TextEditorRevealType.InCenter);
	}

	return { success: true };
}

/**
 * Apply a WorkspaceEdit (replace a range with new content).
 */
async function handleFileApplyEdit(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	// Track file access so we can alert Copilot if the user saves changes
	getUserActionTracker().trackFileAccess(filePath);

	const startLine = paramNum(params, 'startLine');
	const startChar = paramNum(params, 'startChar') ?? 0;
	const endLine = paramNum(params, 'endLine');
	const endChar = paramNum(params, 'endChar');
	const newContent = paramStr(params, 'newContent');

	if (startLine === undefined || endLine === undefined || newContent === undefined) {
		throw new Error('startLine, endLine, and newContent are required');
	}

	const uri = vscode.Uri.file(filePath);
	const doc = await vscode.workspace.openTextDocument(uri);

	// Snapshot old content BEFORE applying the edit — used by the diff viewer
	ensureEditDiffProvider();
	editDiffContentStore.set(diffStoreKey(filePath), doc.getText());

	const resolvedEndChar = endChar ?? doc.lineAt(endLine).text.length;
	const range = new vscode.Range(startLine, startChar, endLine, resolvedEndChar);

	const edit = new vscode.WorkspaceEdit();
	edit.replace(uri, range, newContent);
	const applied = await vscode.workspace.applyEdit(edit);

	if (!applied) throw new Error('VS Code rejected the workspace edit');

	await doc.save();

	return { file: filePath, success: true };
}

/**
 * Get diagnostics for a specific file, returning only errors and warnings.
 */
async function handleFileGetDiagnostics(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	const uri = vscode.Uri.file(filePath);
	const diagnostics = vscode.languages.getDiagnostics(uri);

	const items = diagnostics
		.filter((d) => d.severity === vscode.DiagnosticSeverity.Error || d.severity === vscode.DiagnosticSeverity.Warning)
		.map((d) => ({
			code: typeof d.code === 'object' && d.code !== null ? String((d.code as { value: number | string }).value) : String(d.code ?? ''),
			column: d.range.start.character + 1,
			endColumn: d.range.end.character + 1,
			endLine: d.range.end.line + 1,
			line: d.range.start.line + 1,
			message: d.message,
			severity: diagSeverityToString(d.severity),
			source: d.source ?? 'unknown'
		}));

	return { diagnostics: items };
}

/**
 * Execute rename provider at a specific position.
 */
async function handleFileExecuteRename(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	const line = paramNum(params, 'line');
	const character = paramNum(params, 'character');
	const newName = paramStr(params, 'newName');

	if (!filePath || line === undefined || character === undefined || !newName) {
		throw new Error('filePath, line, character, and newName are required');
	}

	const uri = vscode.Uri.file(filePath);
	await vscode.workspace.openTextDocument(uri);
	const position = new vscode.Position(line, character);

	const workspaceEdit = await vscode.commands.executeCommand<undefined | vscode.WorkspaceEdit>('vscode.executeDocumentRenameProvider', uri, position, newName);

	if (!workspaceEdit) {
		return { error: 'Rename provider returned no edits', filesAffected: [], success: false, totalEdits: 0 };
	}

	const applied = await vscode.workspace.applyEdit(workspaceEdit);
	if (!applied) {
		return { error: 'VS Code rejected the rename edits', filesAffected: [], success: false, totalEdits: 0 };
	}

	// Clean up redundant self-aliases (e.g. `foo as foo`) left by rename provider
	const selfAliasPattern = /\b(\w+)\s+as\s+\1\b/g;
	for (const [affectedUri] of workspaceEdit.entries()) {
		try {
			const doc = await vscode.workspace.openTextDocument(affectedUri);
			const text = doc.getText();
			if (selfAliasPattern.test(text)) {
				selfAliasPattern.lastIndex = 0;
				const cleanedText = text.replace(selfAliasPattern, '$1');
				if (cleanedText !== text) {
					const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(text.length));
					const cleanupEdit = new vscode.WorkspaceEdit();
					cleanupEdit.replace(affectedUri, fullRange, cleanedText);
					await vscode.workspace.applyEdit(cleanupEdit);
				}
			}
		} catch {
			/* best-effort cleanup */
		}
	}

	// Save all affected documents
	const filesAffected: string[] = [];
	let totalEdits = 0;
	for (const [affectedUri, edits] of workspaceEdit.entries()) {
		filesAffected.push(vscode.workspace.asRelativePath(affectedUri));
		totalEdits += edits.length;
		try {
			const doc = await vscode.workspace.openTextDocument(affectedUri);
			await doc.save();
		} catch {
			/* best-effort save */
		}
	}

	return { filesAffected, success: true, totalEdits };
}

/**
 * Find all references to a symbol at a position.
 */
async function handleFileFindReferences(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	const line = paramNum(params, 'line');
	const character = paramNum(params, 'character');

	if (!filePath || line === undefined || character === undefined) {
		throw new Error('filePath, line, and character are required');
	}

	const uri = vscode.Uri.file(filePath);
	await vscode.workspace.openTextDocument(uri);
	const position = new vscode.Position(line, character);

	const locations = await vscode.commands.executeCommand<undefined | vscode.Location[]>('vscode.executeReferenceProvider', uri, position);

	if (!locations) return { references: [] };

	return {
		references: locations.map((loc) => ({
			character: loc.range.start.character,
			file: vscode.workspace.asRelativePath(loc.uri),
			line: loc.range.start.line + 1
		}))
	};
}

/**
 * Get code actions for a specific range in a file.
 */
async function handleFileGetCodeActions(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	const startLine = paramNum(params, 'startLine');
	const endLine = paramNum(params, 'endLine');

	if (!filePath || startLine === undefined || endLine === undefined) {
		throw new Error('filePath, startLine, and endLine are required');
	}

	const uri = vscode.Uri.file(filePath);
	const doc = await vscode.workspace.openTextDocument(uri);
	const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);

	const actions = await vscode.commands.executeCommand<undefined | vscode.CodeAction[]>('vscode.executeCodeActionProvider', uri, range);

	if (!actions) return { actions: [] };

	return {
		actions: actions
			.filter((a) => a.edit || a.command)
			.map((a, i) => ({
				hasCommand: !!a.command,
				hasEdit: !!a.edit,
				index: i,
				isPreferred: a.isPreferred ?? false,
				kind: a.kind?.value ?? 'unknown',
				title: a.title
			}))
	};
}

/**
 * Apply a specific code action by getting it again and applying.
 */
async function handleFileApplyCodeAction(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	const startLine = paramNum(params, 'startLine');
	const endLine = paramNum(params, 'endLine');
	const actionIndex = paramNum(params, 'actionIndex');

	if (!filePath || startLine === undefined || endLine === undefined || actionIndex === undefined) {
		throw new Error('filePath, startLine, endLine, and actionIndex are required');
	}

	const uri = vscode.Uri.file(filePath);
	const doc = await vscode.workspace.openTextDocument(uri);
	const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);

	const actions = await vscode.commands.executeCommand<undefined | vscode.CodeAction[]>('vscode.executeCodeActionProvider', uri, range);

	if (!actions || actionIndex >= actions.length) {
		return { error: `Code action at index ${actionIndex} not found`, success: false };
	}

	const action = actions[actionIndex];

	if (action.edit) {
		const applied = await vscode.workspace.applyEdit(action.edit);
		if (!applied) return { error: 'VS Code rejected the code action edit', success: false };
	}

	if (action.command) {
		await vscode.commands.executeCommand(action.command.command, ...(action.command.arguments ?? []));
	}

	return { success: true, title: action.title };
}

// ── Unified File Structure Extraction (registry-based) ──────────────────────

async function handleFileExtractStructure(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');
	return extractStructure(filePath);
}

// ── Orphaned Content Extraction ──────────────────────────────────────────────

async function handleExtractOrphanedContent(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');
	if (!filePath) throw new Error('filePath is required');

	// Optionally get symbol ranges from VS Code first (for gap calculation)
	const includeSymbols = paramBool(params, 'includeSymbols') ?? true;
	const symbolRanges: Array<{ start: number; end: number }> = [];

	if (includeSymbols) {
		try {
			const uri = vscode.Uri.file(filePath);
			await vscode.workspace.openTextDocument(uri);
			const symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[] | vscode.SymbolInformation[]>('vscode.executeDocumentSymbolProvider', uri);

			if (symbols) {
				const collectRanges = (syms: vscode.DocumentSymbol[]): void => {
					for (const s of syms) {
						symbolRanges.push({
							end: s.range.end.line + 1,
							start: s.range.start.line + 1 // Convert to 1-indexed
						});
						if (s.children) collectRanges(s.children);
					}
				};

				const docSymbols = symbols.filter((s): s is vscode.DocumentSymbol => 'children' in s);
				collectRanges(docSymbols);
			}
		} catch {
			// Continue without symbol ranges
		}
	}

	const result = await extractOrphanedContent({ filePath, symbolRanges });
	return result;
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Register all Client RPC handlers with the bootstrap.
 */
export function registerClientHandlers(register: RegisterHandler, workspaceState: vscode.Memento): vscode.Disposable {
	log('[client] Registering Client RPC handlers');

	// Initialize the process ledger with VS Code's workspace state for persistence
	const processLedger = initProcessLedger(workspaceState);
	processLedger.initialize().catch((err) => {
		error('[client] Process ledger initialization failed:', err);
	});

	// Initialize the single terminal controller (for MCP tools)
	terminalController = new SingleTerminalController();

	// Terminal methods (single-terminal model)
	register('terminal.run', handleTerminalRun);
	register('terminal.input', handleTerminalInput);
	register('terminal.state', handleTerminalState);
	register('terminal.kill', handleTerminalKill);
	register('terminal.listAll', handleTerminalListAll);

	// Command methods
	register('command.execute', handleCommandExecute);

	// Process ledger methods (for global accountability)
	register('system.getProcessLedger', handleGetProcessLedger);
	register('process.kill', handleKillProcess);
	register('process.killOrphans', handleKillOrphans);

	// Codebase analysis methods
	register('codebase.getOverview', handleCodebaseGetOverview);
	register('codebase.getExports', handleCodebaseGetExports);
	register('codebase.traceSymbol', handleCodebaseTraceSymbol);
	register('codebase.findDeadCode', handleCodebaseFindDeadCode);
	register('codebase.getImportGraph', handleCodebaseGetImportGraph);
	register('codebase.findDuplicates', handleCodebaseFindDuplicates);
	register('codebase.getDiagnostics', handleCodebaseGetDiagnostics);

	// File service methods (for semantic read/edit tools)
	register('file.getSymbols', handleFileGetSymbols);
	register('file.readContent', handleFileReadContent);
	register('file.highlightReadRange', handleFileHighlightReadRange);
	register('file.showEditDiff', handleFileShowEditDiff);
	register('file.applyEdit', handleFileApplyEdit);
	register('file.getDiagnostics', handleFileGetDiagnostics);
	register('file.executeRename', handleFileExecuteRename);
	register('file.findReferences', handleFileFindReferences);
	register('file.getCodeActions', handleFileGetCodeActions);
	register('file.applyCodeAction', handleFileApplyCodeAction);
	register('file.extractOrphanedContent', handleExtractOrphanedContent);
	register('file.extractStructure', handleFileExtractStructure);

	// Inspector backend handlers (storage CRUD, MCP proxy, file browsing, symbols)
	registerInspectorHandlers(register, workspaceState);

	log('[client] Client RPC handlers registered');

	// Return disposable for cleanup
	return new vscode.Disposable(() => {
		log('[client] Cleaning up Client handlers');

		if (terminalController) {
			terminalController.dispose();
			terminalController = null;
		}

		readHighlightDecoration.dispose();
		editDiffProviderDisposable?.dispose();
		editDiffContentStore.clear();
		disposeProcessLedger();
	});
}
