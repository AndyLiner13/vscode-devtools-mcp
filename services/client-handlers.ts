/**
 * Client RPC Handlers
 *
 * IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
 * We have no access to proposed APIs. They will cause the extension to
 * enter Safe Mode and all client handlers will fail to register.
 *
 * Handles RPC operations for the VS Code DevTools system.
 * The Client is the Extension Development Host (the spawned VS Code window).
 *
 * API Surface:
 * - terminal.listAll: List all VS Code terminals
 * - command.execute: Run arbitrary VS Code commands
 * - codebase.*: Codebase analysis methods
 * - file.*: File service methods (read, edit, symbols, diagnostics, etc.)
 */

import * as vscode from 'vscode';

import { extractStructure, findDeadCode, findDuplicates, getExports, getImportGraph, getOverview, traceSymbol } from './codebase/codebase-worker-proxy';
import { registerInspectorHandlers } from './inspector-backend';
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
		includeJSDoc: paramBool(params, 'includeJSDoc') ?? true,
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
			calls: paramBool(params, 'calls'),
			file: paramStr(params, 'file'),
			references: paramBool(params, 'references'),
			rootDir: resolveRootDir(params),
			symbol,
			types: paramBool(params, 'types')
		});
	} catch (err: unknown) {
		warn('[client] traceSymbol error:', errorMessage(err));
		return {
			errorMessage: errorMessage(err),
			partial: true,
			symbol
		};
	}
}

async function handleCodebaseFindDeadCode(params: Record<string, unknown>) {
	try {
		return await findDeadCode({
			excludeTests: paramBool(params, 'excludeTests') ?? true,
			exportedOnly: paramBool(params, 'exportedOnly') ?? true,
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

// ── File Rename (with import/reference updates) ─────────────────────────────

async function handleFileRenameFile(params: Record<string, unknown>) {
	const oldPath = paramStr(params, 'oldPath');
	const newPath = paramStr(params, 'newPath');

	if (!oldPath || !newPath) {
		throw new Error('oldPath and newPath are required');
	}

	const oldUri = vscode.Uri.file(oldPath);
	const newUri = vscode.Uri.file(newPath);

	// Verify source file exists
	try {
		await vscode.workspace.fs.stat(oldUri);
	} catch {
		throw new Error(`Source file not found: ${oldPath}`);
	}

	// Verify target does not already exist
	try {
		await vscode.workspace.fs.stat(newUri);
		throw new Error(`Target file already exists: ${newPath}`);
	} catch (err) {
		if (err instanceof Error && err.message.startsWith('Target file already exists')) throw err;
		// File not found is expected — proceed
	}

	const edit = new vscode.WorkspaceEdit();
	edit.renameFile(oldUri, newUri);
	const applied = await vscode.workspace.applyEdit(edit);

	if (!applied) {
		return { error: 'VS Code rejected the rename edit', filesAffected: [], success: false };
	}

	// Save all modified documents
	const filesAffected: string[] = [];
	for (const doc of vscode.workspace.textDocuments) {
		if (doc.isDirty) {
			filesAffected.push(vscode.workspace.asRelativePath(doc.uri));
			try {
				await doc.save();
			} catch {
				/* best-effort save */
			}
		}
	}

	return {
		filesAffected,
		newPath: vscode.workspace.asRelativePath(newUri),
		oldPath: vscode.workspace.asRelativePath(oldUri),
		success: true
	};
}

// ── File Delete (with reference safety check) ───────────────────────────────

async function handleFileDeleteFile(params: Record<string, unknown>) {
	const filePath = paramStr(params, 'filePath');

	if (!filePath) {
		return { blocked: false, message: 'filePath is required', success: false };
	}

	const uri = vscode.Uri.file(filePath);

	// Verify file exists (and is not a directory)
	try {
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type === vscode.FileType.Directory) {
			return { blocked: false, message: `Path is a directory, not a file: ${filePath}`, success: false };
		}
	} catch {
		return { blocked: false, message: `File not found: ${filePath}`, success: false };
	}

	// Get all symbols defined in the file
	const doc = await vscode.workspace.openTextDocument(uri);
	const symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		uri
	);

	// For each top-level symbol, find external references
	const brokenReferences: Array<{
		symbol: string;
		kind: string;
		references: Array<{ file: string; line: number; character: number }>;
	}> = [];

	const fileRelPath = vscode.workspace.asRelativePath(uri);

	if (symbols && symbols.length > 0) {
		for (const sym of symbols) {
			const position = sym.selectionRange.start;
			const locations = await vscode.commands.executeCommand<undefined | vscode.Location[]>(
				'vscode.executeReferenceProvider',
				uri,
				position
			);

			if (!locations) continue;

			// Filter to only external references (not in the file being deleted)
			const externalRefs = locations.filter(
				(loc) => vscode.workspace.asRelativePath(loc.uri) !== fileRelPath
			);

			if (externalRefs.length > 0) {
				brokenReferences.push({
					kind: vscode.SymbolKind[sym.kind],
					references: externalRefs.map((loc) => ({
						character: loc.range.start.character,
						file: vscode.workspace.asRelativePath(loc.uri),
						line: loc.range.start.line + 1
					})),
					symbol: sym.name
				});
			}
		}
	}

	// Check 2: Detect re-export patterns not covered by DocumentSymbolProvider.
	// Barrel files (export { x } from '...' and export * from '...') don't
	// surface as symbols, so they bypass the check above.
	if (brokenReferences.length === 0) {
		const text = doc.getText();

		// Named re-exports: export { ident1, ident2 } from '...'
		const namedReExportPattern = /export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
		let reExportMatch: RegExpExecArray | null;
		while ((reExportMatch = namedReExportPattern.exec(text)) !== null) {
			const identifiersBlock = reExportMatch[1];
			const bracesStart = text.indexOf('{', reExportMatch.index);

			for (const segment of identifiersBlock.split(',')) {
				const trimmed = segment.trim();
				if (!trimmed) continue;

				// Handle 'original as alias' — use the original name
				const name = trimmed.split(/\s+as\s+/)[0].trim();
				if (!name) continue;

				// Find the identifier position within the braces
				const identOffset = text.indexOf(name, bracesStart);
				if (identOffset === -1) continue;

				const position = doc.positionAt(identOffset);
				const locations = await vscode.commands.executeCommand<undefined | vscode.Location[]>(
					'vscode.executeReferenceProvider',
					uri,
					position
				);
				if (!locations) continue;

				const externalRefs = locations.filter(
					(loc) => vscode.workspace.asRelativePath(loc.uri) !== fileRelPath
				);

				if (externalRefs.length > 0) {
					brokenReferences.push({
						kind: 'ReExport',
						references: externalRefs.map((loc) => ({
							character: loc.range.start.character,
							file: vscode.workspace.asRelativePath(loc.uri),
							line: loc.range.start.line + 1
						})),
						symbol: name
					});
				}
			}
		}

		// Star re-exports: export * from '...' (no identifiers to query)
		// For these, check if any workspace file imports from this file's module path.
		const hasStarReExport = /export\s+\*\s+from\s+['"]/.test(text);
		if (hasStarReExport && brokenReferences.length === 0) {
			const importers = await findFilesImportingModule(uri);
			if (importers.length > 0) {
				const moduleName = uri.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'module';
				brokenReferences.push({
					kind: 'StarReExport',
					references: importers,
					symbol: moduleName + ' (star re-export barrel)'
				});
			}
		}
	}

	// If there are external references, block the deletion
	if (brokenReferences.length > 0) {
		const totalRefs = brokenReferences.reduce((sum, b) => sum + b.references.length, 0);
		return {
			blocked: true,
			brokenReferences,
			message: `Cannot delete ${vscode.workspace.asRelativePath(uri)}: ${brokenReferences.length} symbol(s) with ${totalRefs} external reference(s) would break.`,
			success: false
		};
	}

	// No external references — safe to delete (move to trash for recovery)
	await vscode.workspace.fs.delete(uri, { useTrash: true });

	return {
		blocked: false,
		deletedFile: vscode.workspace.asRelativePath(uri),
		success: true
	};
}

/**
 * Find workspace files that import from the given module URI.
 * Used to detect consumers of star-re-export barrel files
 * where executeDocumentSymbolProvider returns no queryable symbols.
 */
async function findFilesImportingModule(
	targetUri: vscode.Uri
): Promise<Array<{ file: string; line: number; character: number }>> {
	const targetPath = targetUri.fsPath;
	const targetNoExt = targetPath.replace(/\.[^.]+$/, '');
	const targetBasename = targetNoExt.split(/[\\/]/).pop() ?? '';
	if (!targetBasename) return [];

	const files = await vscode.workspace.findFiles(
		'**/*.{ts,tsx,js,jsx}',
		'**/node_modules/**'
	);

	const results: Array<{ file: string; line: number; character: number }> = [];
	const escapedName = targetBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const importPattern = new RegExp(
		`(?:import|export)\\s+.*?from\\s+['"][^'"]*[/\\\\]?${escapedName}(?:\\.\\w+)?['"]`,
		'g'
	);

	for (const file of files) {
		if (file.toString() === targetUri.toString()) continue;

		const fileDoc = await vscode.workspace.openTextDocument(file);
		const text = fileDoc.getText();

		let match: RegExpExecArray | null;
		while ((match = importPattern.exec(text)) !== null) {
			// Verify the import resolves to the target file by resolving
			// the specifier from the importing file's directory
			const specifierMatch = /from\s+['"]([^'"]+)['"]/.exec(match[0]);
			if (!specifierMatch) continue;

			const specifier = specifierMatch[1];
			if (!specifier.startsWith('.')) continue; // skip package imports

			const importingDir = vscode.Uri.joinPath(file, '..');
			const resolved = vscode.Uri.joinPath(importingDir, specifier);
			const resolvedNoExt = resolved.fsPath.replace(/\.[^.]+$/, '');

			// Compare resolved path (without extension) to the target
			if (resolvedNoExt.toLowerCase() === targetNoExt.toLowerCase()) {
				const pos = fileDoc.positionAt(match.index);
				results.push({
					character: pos.character,
					file: vscode.workspace.asRelativePath(file),
					line: pos.line + 1
				});
			}
		}

		importPattern.lastIndex = 0;
	}

	return results;
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Register all Client RPC handlers with the bootstrap.
 */
export function registerClientHandlers(register: RegisterHandler, workspaceState: vscode.Memento): vscode.Disposable {
	log('[client] Registering Client RPC handlers');

	// Terminal methods
	register('terminal.listAll', handleTerminalListAll);

	// Command methods
	register('command.execute', handleCommandExecute);

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
	register('file.extractStructure', handleFileExtractStructure);
	register('file.renameFile', handleFileRenameFile);
	register('file.deleteFile', handleFileDeleteFile);

	// Inspector backend handlers (storage CRUD, MCP proxy, file browsing, symbols)
	registerInspectorHandlers(register, workspaceState);

	log('[client] Client RPC handlers registered');

	// Return disposable for cleanup
	return new vscode.Disposable(() => {
		log('[client] Cleaning up Client handlers');
		readHighlightDecoration.dispose();
		editDiffProviderDisposable?.dispose();
		editDiffContentStore.clear();
	});
}
