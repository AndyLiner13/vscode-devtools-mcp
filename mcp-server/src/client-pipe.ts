/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Client Pipe Client
 *
 * Connects to the Client extension's pipe server (Extension Development Host)
 * to interact with output channel, and VS Code command APIs.
 *
 * Output methods:
 * - output.listChannels: List VS Code output channels
 * - output.read: Read output channel content
 *
 * Command methods:
 * - command.execute: Execute a VS Code command
 */

import net from 'node:net';

import {logger} from './logger.js';

// ── Constants ────────────────────────────────────────────

const IS_WINDOWS = process.platform === 'win32';
const CLIENT_PIPE_PATH = IS_WINDOWS
  ? '\\\\.\\pipe\\vscode-devtools-client'
  : '/tmp/vscode-devtools-client.sock';

const DEFAULT_TIMEOUT_MS = 10_000;

// ── Types ────────────────────────────────────────────────

interface JsonRpcResponse {
  error?: {code: number; message: string; data?: unknown};
  id: null | number | string;
  jsonrpc: '2.0';
  result?: unknown;
}

// ── Type-safe result assertion ───────────────────────────

function assertResult<T extends object>(result: unknown, method: string): asserts result is T {
  if (typeof result !== 'object' || result === null) {
    throw new Error(
      `Invalid response from Client ${method}: expected object, got ${typeof result}`,
    );
  }
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    ('result' in value || 'error' in value)
  );
}

export type ProcessStatus = 'completed' | 'killed' | 'orphaned' | 'running';

export interface ChildProcessInfo {
  commandLine: string;
  name: string;
  parentPid: number;
  pid: number;
}

export interface ProcessEntry {
  children?: ChildProcessInfo[];
  command: string;
  endedAt?: string;
  exitCode?: number;
  pid: number;
  sessionId: string;
  startedAt: string;
  status: ProcessStatus;
  terminalName: string;
}

export interface ProcessLedgerSummary {
  active: ProcessEntry[];
  orphaned: ProcessEntry[];
  recentlyCompleted: ProcessEntry[];
  sessionId: string;
  terminalSessions: TerminalSessionInfo[];
}

export interface TerminalSessionInfo {
  command?: string;
  isActive: boolean;
  name: string;
  pid?: number;
  shell?: string;
  status: string;
}

export interface CommandExecuteResult {
  result: unknown;
}

// ── JSON-RPC Transport ───────────────────────────────────

/**
 * Send a JSON-RPC 2.0 request to the Client pipe and await the response.
 */
async function sendClientRequest(
  method: string,
  params: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    logger(`[client-pipe] ${method} → ${CLIENT_PIPE_PATH} (timeout=${timeoutMs}ms)`);
    const client = net.createConnection(CLIENT_PIPE_PATH);
    const reqId = `${method}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let response = '';
    let settled = false;
    client.setEncoding('utf8');

    const settle = (fn: typeof reject | typeof resolve, value: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.destroy();
      } catch {
        /* best-effort */
      }
      fn(value);
    };

    client.on('connect', () => {
      logger(`[client-pipe] ${method} connected — sending request (id=${reqId})`);
      const request =
        `${JSON.stringify({id: reqId, jsonrpc: '2.0', method, params})  }\n`;
      client.write(request);
    });

    client.on('data', (chunk: string) => {
      if (settled) return;
      response += chunk;
      const nlIdx = response.indexOf('\n');
      if (nlIdx !== -1) {
        try {
          const rawParsed: unknown = JSON.parse(
            response.slice(0, nlIdx),
          );
          if (!isJsonRpcResponse(rawParsed)) {
            settle(
              reject,
              new Error(`Invalid JSON-RPC response from Client ${method}`),
            );
            return;
          }
          if (rawParsed.error) {
            logger(
              `[client-pipe] ${method} ✗ error: [${rawParsed.error.code}] ${rawParsed.error.message}`,
            );
            settle(
              reject,
              new Error(
                `Client ${method} failed [${rawParsed.error.code}]: ${rawParsed.error.message}`,
              ),
            );
          } else {
            logger(`[client-pipe] ${method} ✓ success`);
            settle(resolve, rawParsed.result);
          }
        } catch (e: unknown) {
          settle(
            reject,
            new Error(
              `Failed to parse Client response: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
        }
      }
    });

    client.on('error', (err: Error) => {
      logger(`[client-pipe] ${method} ✗ connection error: ${err.message}`);
      settle(reject, new Error(`Client connection error: ${err.message}`));
    });

    client.on('close', () => {
      settle(
        reject,
        new Error(
          `Client ${method} socket closed before response was received`,
        ),
      );
    });

    const timer = setTimeout(() => {
      logger(`[client-pipe] ${method} ✗ TIMEOUT after ${timeoutMs}ms`);
      settle(
        reject,
        new Error(`Client ${method} request timed out (${timeoutMs}ms)`),
      );
    }, timeoutMs);
  });
}

// ── Command Methods ──────────────────────────────────────

/**
 * Execute a VS Code command in the Client window.
 */
async function commandExecute(
  command: string,
  args?: unknown[],
): Promise<CommandExecuteResult> {
  const result = await sendClientRequest('command.execute', {args, command});
  assertResult<CommandExecuteResult>(result, 'command.execute');
  return result;
}

// ── Codebase Types ───────────────────────────────────────

export interface CodebaseSymbolNode {
  children?: CodebaseSymbolNode[];
  detail?: string;
  implementationCount?: number;
  kind: string;
  name: string;
  range: {start: number; end: number};
  referenceCount?: number;
}

export interface CodebaseTreeNode {
  children?: CodebaseTreeNode[];
  dirCount?: number;
  fileCount?: number;
  ignored?: boolean;
  lineCount?: number;
  name: string;
  symbolCount?: number;
  symbols?: CodebaseSymbolNode[];
  totalReferences?: number;
  type: 'directory' | 'file';
}

export interface CodebaseOverviewResult {
  projectRoot: string;
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSymbols: number;
    diagnosticCounts?: {errors: number; warnings: number};
  };
  tree: CodebaseTreeNode[];
}

export interface CodebaseExportInfo {
  isDefault: boolean;
  isReExport: boolean;
  jsdoc?: string;
  kind: string;
  line: number;
  name: string;
  reExportSource?: string;
  signature?: string;
}

export interface CodebaseExportsResult {
  exports: CodebaseExportInfo[];
  module: string;
  reExports: Array<{name: string; from: string}>;
  summary: string;
}

// ── Codebase Trace Symbol Types ──────────────────────────

export interface SymbolLocationInfo {
  column: number;
  file: string;
  kind?: string;
  line: number;
  signature?: string;
  unresolved?: boolean;
}

export interface ReferenceInfo {
  column: number;
  context: string;
  file: string;
  kind: 'call' | 'import' | 'read' | 'type-ref' | 'unknown' | 'write';
  line: number;
}

export interface ReExportInfo {
  exportedAs: string;
  file: string;
  from: string;
  line: number;
  originalName: string;
}

export interface CallChainNode {
  column: number;
  file: string;
  line: number;
  symbol: string;
}

export interface CallChainInfo {
  incomingCalls: CallChainNode[];
  incomingTruncated?: boolean;
  outgoingCalls: CallChainNode[];
  outgoingTruncated?: boolean;
}

export interface TypeFlowInfo {
  direction: 'extends' | 'implements' | 'parameter' | 'property' | 'return';
  traceTo?: {symbol: string; file: string; line: number};
  type: string;
}

export interface ImpactDependentInfo {
  file: string;
  kind: string;
  line: number;
  symbol: string;
}

export interface ImpactInfo {
  directDependents: ImpactDependentInfo[];
  impactSummary: {
    directFiles: number;
    transitiveFiles: number;
    totalSymbolsAffected: number;
    riskLevel: 'high' | 'low' | 'medium';
  };
  transitiveDependents: ImpactDependentInfo[];
}

export interface TypeHierarchyNode {
  column: number;
  file: string;
  kind: 'class' | 'interface' | 'type-alias';
  line: number;
  name: string;
}

export interface TypeHierarchyInfo {
  stats: {
    totalSupertypes: number;
    totalSubtypes: number;
    maxDepth: number;
  };
  subtypes: TypeHierarchyNode[];
  supertypes: TypeHierarchyNode[];
}

export interface CodebaseTraceSymbolResult {
  callChain: CallChainInfo;
  definition?: SymbolLocationInfo;
  /** Diagnostic messages (e.g., excessive node_modules references). */
  diagnostics?: string[];
  /** Calculated effective timeout in milliseconds. */
  effectiveTimeout?: number;
  /** Elapsed time in milliseconds. */
  elapsedMs?: number;
  /** Error message if an error occurred during tracing. */
  errorMessage?: string;
  hierarchy?: TypeHierarchyInfo;
  impact?: ImpactInfo;
  /** Reason why symbol was not found. */
  notFoundReason?: 'file-not-in-project' | 'no-matching-files' | 'no-project' | 'parse-error' | 'symbol-not-found';
  /** True if results were truncated due to timeout or maxReferences limit. */
  partial?: boolean;
  /** Reason for partial results. */
  partialReason?: 'max-references' | 'timeout';
  reExports: ReExportInfo[];
  references: ReferenceInfo[];
  /** Resolved absolute path used as the project root. */
  resolvedRootDir?: string;
  /** Number of source files in the project. */
  sourceFileCount?: number;
  summary: {
    totalReferences: number;
    totalFiles: number;
    maxCallDepth: number;
  };
  symbol: string;
  typeFlows: TypeFlowInfo[];
}

// ── Codebase Methods ─────────────────────────────────────

/**
 * Get a structural overview of the codebase as a recursive tree.
 */
export async function codebaseGetOverview(
  rootDir: string,
  dir: string,
  recursive: boolean,
  symbols: boolean,
  timeout?: number,
  metadata?: boolean,
  toolScope?: string,
): Promise<CodebaseOverviewResult> {
  const result = await sendClientRequest(
    'codebase.getOverview',
    {dir, metadata, recursive, rootDir, symbols, toolScope},
    timeout ?? 30_000,
  );
  assertResult<CodebaseOverviewResult>(result, 'codebase.getOverview');
  return result;
}

/**
 * Get detailed exports from a module/file/directory.
 */
async function codebaseGetExports(
  path: string,
  rootDir?: string,
  includeTypes?: boolean,
  includeJSDoc?: boolean,
  kind?: string,
  includePatterns?: string[],
  excludePatterns?: string[],
): Promise<CodebaseExportsResult> {
  const result = await sendClientRequest(
    'codebase.getExports',
    {excludePatterns, includeJSDoc, includePatterns, includeTypes, kind, path, rootDir},
    30_000,
  );
  assertResult<CodebaseExportsResult>(result, 'codebase.getExports');
  return result;
}

/**
 * Trace a symbol through the codebase: definitions, references, re-exports,
 * call hierarchy, type flows, and optional impact analysis.
 */
export async function codebaseTraceSymbol(
  symbol: string,
  rootDir?: string,
  file?: string,
  line?: number,
  column?: number,
  depth?: number,
  include?: string[],
  includeImpact?: boolean,
  maxReferences?: number,
  timeout?: number,
  forceRefresh?: boolean,
  includePatterns?: string[],
  excludePatterns?: string[],
): Promise<CodebaseTraceSymbolResult> {
  const result = await sendClientRequest(
    'codebase.traceSymbol',
    {column, depth, excludePatterns, file, forceRefresh, include, includeImpact, includePatterns, line, maxReferences, rootDir, symbol, timeout},
    Math.max(60_000, (timeout ?? 30_000) + 5_000),
  );
  assertResult<CodebaseTraceSymbolResult>(result, 'codebase.traceSymbol');
  return result;
}

// ── Dead Code Detection Types ────────────────────────────

export interface DeadCodeItem {
  confidence: 'high' | 'low' | 'medium';
  exported: boolean;
  file: string;
  kind: string;
  line: number;
  name: string;
  reason: string;
}

export interface DeadCodeResult {
  deadCode: DeadCodeItem[];
  diagnostics?: string[];
  errorMessage?: string;
  resolvedRootDir?: string;
  summary: {
    totalScanned: number;
    totalDead: number;
    scanDurationMs: number;
    byKind?: Record<string, number>;
  };
}

/**
 * Find dead code: unused exports, unreachable functions, dead variables.
 */
export async function codebaseFindDeadCode(
  rootDir?: string,
  pattern?: string,
  exportedOnly?: boolean,
  excludeTests?: boolean,
  kinds?: string[],
  limit?: number,
  includePatterns?: string[],
  excludePatterns?: string[],
  timeout?: number,
): Promise<DeadCodeResult> {
  const result = await sendClientRequest(
    'codebase.findDeadCode',
    {excludePatterns, excludeTests, exportedOnly, includePatterns, kinds, limit, pattern, rootDir},
    timeout ?? 60_000,
  );
  assertResult<DeadCodeResult>(result, 'codebase.findDeadCode');
  return result;
}

// ── Import Graph Types ───────────────────────────────────

export interface ImportGraphModule {
  importedBy: string[];
  imports: string[];
  path: string;
}

export interface CircularChain {
  chain: string[];
}

export interface ImportGraphResult {
  circular: CircularChain[];
  errorMessage?: string;
  modules: Record<string, ImportGraphModule>;
  orphans: string[];
  stats: {
    totalModules: number;
    totalEdges: number;
    circularCount: number;
    orphanCount: number;
  };
}

/**
 * Get the import graph for a codebase: module dependencies, circular chains, orphans.
 */
export async function codebaseGetImportGraph(
  rootDir?: string,
  includePatterns?: string[],
  excludePatterns?: string[],
  timeout?: number,
): Promise<ImportGraphResult> {
  const result = await sendClientRequest(
    'codebase.getImportGraph',
    {excludePatterns, includePatterns, rootDir},
    timeout ?? 60_000,
  );
  assertResult<ImportGraphResult>(result, 'codebase.getImportGraph');
  return result;
}

// ── Duplicate Detection Types ────────────────────────────

export interface DuplicateInstance {
  endLine: number;
  file: string;
  line: number;
  name: string;
}

export interface DuplicateGroup {
  hash: string;
  instances: DuplicateInstance[];
  kind: string;
  lineCount: number;
}

export interface DuplicateDetectionResult {
  diagnostics?: string[];
  errorMessage?: string;
  groups: DuplicateGroup[];
  resolvedRootDir?: string;
  summary: {
    totalGroups: number;
    totalDuplicateInstances: number;
    filesWithDuplicates: number;
    scanDurationMs: number;
  };
}

/**
 * Find structurally duplicate code in the codebase using AST hashing.
 */
export async function codebaseFindDuplicates(
  rootDir?: string,
  kinds?: string[],
  limit?: number,
  includePatterns?: string[],
  excludePatterns?: string[],
  timeout?: number,
): Promise<DuplicateDetectionResult> {
  const result = await sendClientRequest(
    'codebase.findDuplicates',
    {excludePatterns, includePatterns, kinds, limit, rootDir},
    timeout ?? 60_000,
  );
  assertResult<DuplicateDetectionResult>(result, 'codebase.findDuplicates');
  return result;
}

// ── Diagnostics Types ────────────────────────────────────

export interface DiagnosticItem {
  code: string;
  column: number;
  file: string;
  line: number;
  message: string;
  severity: string;
  source: string;
}

export interface DiagnosticsResult {
  diagnostics: DiagnosticItem[];
  errorMessage?: string;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalFiles: number;
  };
}

/**
 * Get live diagnostics (errors/warnings) from VS Code's language services.
 */
export async function codebaseGetDiagnostics(
  severityFilter?: string[],
  includePatterns?: string[],
  excludePatterns?: string[],
  limit?: number,
  timeout?: number,
): Promise<DiagnosticsResult> {
  const result = await sendClientRequest(
    'codebase.getDiagnostics',
    {excludePatterns, includePatterns, limit, severityFilter},
    timeout ?? 30_000,
  );
  assertResult<DiagnosticsResult>(result, 'codebase.getDiagnostics');
  return result;
}

// ── File Service Types ───────────────────────────────────

export interface NativeDocumentSymbolRange {
  endChar: number;
  endLine: number;
  startChar: number;
  startLine: number;
}

export interface NativeDocumentSymbol {
  children: NativeDocumentSymbol[];
  detail?: string;
  kind: string;
  name: string;
  range: NativeDocumentSymbolRange;
  selectionRange: NativeDocumentSymbolRange;
}

export interface FileGetSymbolsResult {
  symbols: NativeDocumentSymbol[];
}

export interface FileReadContentResult {
  content: string;
  endLine: number;
  startLine: number;
  totalLines: number;
}

export interface FileApplyEditResult {
  file: string;
  success: boolean;
}

export interface FileDiagnosticItem {
  code: string;
  column: number;
  endColumn: number;
  endLine: number;
  line: number;
  message: string;
  severity: string;
  source: string;
}

export interface FileGetDiagnosticsResult {
  diagnostics: FileDiagnosticItem[];
}

export interface FileExecuteRenameResult {
  error?: string;
  filesAffected: string[];
  success: boolean;
  totalEdits: number;
}

// ── Orphaned Content Types ─────────────────────────────────

export interface OrphanedSymbolNode {
  children?: OrphanedSymbolNode[];
  detail?: string;
  kind: string;
  name: string;
  range: {start: number; end: number};
}

export interface OrphanedContentResult {
  directives: OrphanedSymbolNode[];
  exports: OrphanedSymbolNode[];
  gaps: Array<{start: number; end: number; type: 'blank' | 'unknown'}>;
  imports: OrphanedSymbolNode[];
  orphanComments: OrphanedSymbolNode[];
  stats: {
    totalImports: number;
    totalExports: number;
    totalOrphanComments: number;
    totalDirectives: number;
    totalBlankLines: number;
    coveragePercent: number;
  };
}

// ── Unified File Structure Types ─────────────────────────

export interface UnifiedFileSymbolRange {
  endChar: number;     // 0-indexed (column)
  endLine: number;     // 1-indexed
  startChar: number;   // 0-indexed (column)
  startLine: number;   // 1-indexed
}

export interface UnifiedFileSymbol {
  children: UnifiedFileSymbol[];
  detail?: string;
  exported?: boolean;
  kind: string;
  modifiers?: string[];
  name: string;
  range: UnifiedFileSymbolRange;
}

interface UnifiedFileResult {
  content: string;
  directives: OrphanedSymbolNode[];
  exports: OrphanedSymbolNode[];
  gaps: Array<{start: number; end: number; type: 'blank' | 'unknown'}>;
  imports: OrphanedSymbolNode[];
  orphanComments: OrphanedSymbolNode[];
  stats: {
    totalImports: number;
    totalExports: number;
    totalOrphanComments: number;
    totalDirectives: number;
    totalBlankLines: number;
    coveragePercent: number;
  };
  symbols: UnifiedFileSymbol[];
  totalLines: number;
}

export interface FileFindReferencesResult {
  references: Array<{file: string; line: number; character: number}>;
}

// ── Shared File Structure Types (Multi-Language) ─────────

export interface FileSymbolRange {
  endChar?: number;
  endLine: number;
  startChar?: number;
  startLine: number;
}

export interface FileSymbol {
  children: FileSymbol[];
  detail?: string;
  exported?: boolean;
  kind: string;
  modifiers?: string[];
  name: string;
  range: FileSymbolRange;
}

export type OrphanedCategory =
  | 'comment'
  | 'directive'
  | 'export'
  | 'footnote'
  | 'import'
  | 'linkdef';

export interface OrphanedItem {
  category: OrphanedCategory;
  children?: OrphanedItem[];
  detail?: string;
  kind: string;
  name: string;
  range: {start: number; end: number};
}

export interface FileStructureStats {
  coveragePercent: number;
  totalBlankLines: number;
  totalOrphaned: number;
  totalSymbols: number;
}

export interface FileStructure {
  content: string;
  fileType: 'json' | 'markdown' | 'typescript' | 'unknown';
  gaps: Array<{start: number; end: number; type: 'blank' | 'unknown'}>;
  orphaned: {items: OrphanedItem[]};
  stats: FileStructureStats;
  symbols: FileSymbol[];
  totalLines: number;
}

export interface FileCodeActionItem {
  hasCommand: boolean;
  hasEdit: boolean;
  index: number;
  isPreferred: boolean;
  kind: string;
  title: string;
}

export interface FileGetCodeActionsResult {
  actions: FileCodeActionItem[];
}

export interface FileApplyCodeActionResult {
  error?: string;
  success: boolean;
  title?: string;
}

// ── File Service Methods ─────────────────────────────────

/**
 * Get DocumentSymbols for a file with string kind names.
 */
export async function fileGetSymbols(filePath: string): Promise<FileGetSymbolsResult> {
  const result = await sendClientRequest('file.getSymbols', {filePath}, 10_000);
  assertResult<FileGetSymbolsResult>(result, 'file.getSymbols');
  return result;
}

/**
 * Read file content, optionally by line range (0-based).
 */
export async function fileReadContent(
  filePath: string,
  startLine?: number,
  endLine?: number,
): Promise<FileReadContentResult> {
  const result = await sendClientRequest(
    'file.readContent',
    {endLine, filePath, startLine},
    10_000,
  );
  assertResult<FileReadContentResult>(result, 'file.readContent');
  return result;
}

/**
 * Open a file in the client editor and highlight the range that was just read.
 * Fire-and-forget — does not block the tool response.
 */
export function fileHighlightReadRange(
  filePath: string,
  startLine: number,
  endLine: number,
  collapsedRanges?: Array<{startLine: number; endLine: number}>,
  sourceRanges?: Array<{startLine: number; endLine: number}>,
): void {
  sendClientRequest(
    'file.highlightReadRange',
    {collapsedRanges, endLine, filePath, sourceRanges, startLine},
    5_000,
  ).catch(() => {
    // Best-effort — don't let highlight failures affect tool responses
  });
}

/**
 * Open an inline diff editor showing old vs new content after an edit.
 * Old content was pre-captured by the extension's handleFileApplyEdit.
 * Fire-and-forget — does not block the tool response.
 */
export function fileShowEditDiff(
  filePath: string,
  editStartLine: number,
): void {
  sendClientRequest(
    'file.showEditDiff',
    {editStartLine, filePath},
    10_000,
  ).catch(() => {
    // Best-effort — don't let diff viewer failures affect tool responses
  });
}

/**
 * Apply a text replacement (range → new content) and save.
 */
export async function fileApplyEdit(
  filePath: string,
  startLine: number,
  endLine: number,
  newContent: string,
  startChar?: number,
  endChar?: number,
): Promise<FileApplyEditResult> {
  const result = await sendClientRequest(
    'file.applyEdit',
    {endChar, endLine, filePath, newContent, startChar, startLine},
    15_000,
  );
  assertResult<FileApplyEditResult>(result, 'file.applyEdit');
  return result;
}

/**
 * Get errors and warnings for a specific file.
 */
export async function fileGetDiagnostics(filePath: string): Promise<FileGetDiagnosticsResult> {
  const result = await sendClientRequest('file.getDiagnostics', {filePath}, 10_000);
  assertResult<FileGetDiagnosticsResult>(result, 'file.getDiagnostics');
  return result;
}

/**
 * Execute rename provider at a position.
 */
export async function fileExecuteRename(
  filePath: string,
  line: number,
  character: number,
  newName: string,
): Promise<FileExecuteRenameResult> {
  const result = await sendClientRequest(
    'file.executeRename',
    {character, filePath, line, newName},
    15_000,
  );
  assertResult<FileExecuteRenameResult>(result, 'file.executeRename');
  return result;
}

/**
 * Find all references to a symbol at a position.
 */
export async function fileFindReferences(
  filePath: string,
  line: number,
  character: number,
): Promise<FileFindReferencesResult> {
  const result = await sendClientRequest(
    'file.findReferences',
    {character, filePath, line},
    10_000,
  );
  assertResult<FileFindReferencesResult>(result, 'file.findReferences');
  return result;
}

/**
 * Get available code actions for a line range.
 */
export async function fileGetCodeActions(
  filePath: string,
  startLine: number,
  endLine: number,
): Promise<FileGetCodeActionsResult> {
  const result = await sendClientRequest(
    'file.getCodeActions',
    {endLine, filePath, startLine},
    10_000,
  );
  assertResult<FileGetCodeActionsResult>(result, 'file.getCodeActions');
  return result;
}

/**
 * Apply a specific code action by index for a line range.
 */
export async function fileApplyCodeAction(
  filePath: string,
  startLine: number,
  endLine: number,
  actionIndex: number,
): Promise<FileApplyCodeActionResult> {
  const result = await sendClientRequest(
    'file.applyCodeAction',
    {actionIndex, endLine, filePath, startLine},
    10_000,
  );
  assertResult<FileApplyCodeActionResult>(result, 'file.applyCodeAction');
  return result;
}

/**
 * Extract orphaned content (imports, exports, comments) from TypeScript/JavaScript files.
 * Supplements VS Code's DocumentSymbol API which doesn't include these constructs.
 */
async function fileExtractOrphanedContent(
  filePath: string,
  includeSymbols = true,
): Promise<OrphanedContentResult> {
  const result = await sendClientRequest(
    'file.extractOrphanedContent',
    {filePath, includeSymbols},
    30_000,
  );
  assertResult<OrphanedContentResult>(result, 'file.extractOrphanedContent');
  return result;
}

/**
 * Extract the complete file structure via the LanguageServiceRegistry.
 * Returns FileStructure if the file type is supported, undefined otherwise.
 */
export async function fileExtractStructure(
  filePath: string,
): Promise<FileStructure | undefined> {
  const result = await sendClientRequest(
    'file.extractStructure',
    {filePath},
    30_000,
  );
  // The registry returns undefined for unsupported file types
  if (result === undefined || result === null) return undefined;
  return result as FileStructure;
}

// ── Recovery Handler ─────────────────────────────────────

let clientRecoveryHandler: (() => Promise<void>) | undefined;
let clientRecoveryInProgress: Promise<void> | undefined;

/**
 * Register a callback that will be invoked when the client pipe
 * is unreachable. Typically wired to LifecycleService.recoverClientConnection()
 * so the Host can restart the Client window automatically.
 */
export function registerClientRecoveryHandler(handler: () => Promise<void>): void {
  clientRecoveryHandler = handler;
}

// ── Utility ──────────────────────────────────────────────

/**
 * Check if the Client pipe is reachable via a system.ping.
 */
export async function pingClient(): Promise<boolean> {
  try {
    await sendClientRequest('system.ping', {}, 3_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure the Client pipe is reachable, recovering automatically if not.
 *
 * 1. Pings the Client pipe.
 * 2. If unreachable, invokes the registered recovery handler
 *    (which asks the Host to restart the Client window).
 * 3. Retries the ping with exponential back-off (up to 3 attempts).
 * 4. Throws only if all recovery attempts fail.
 *
 * Deduplicated: when multiple parallel tool calls detect a dead Client
 * simultaneously, only the first triggers recovery — subsequent callers
 * await the in-flight recovery instead of starting independent attempts.
 */
export async function ensureClientAvailable(): Promise<void> {
  if (await pingClient()) return;

  // Deduplication: if recovery is already in-flight, wait for it
  if (clientRecoveryInProgress) {
    logger('[client-pipe] Recovery already in-flight — waiting for existing attempt…');
    try {
      await clientRecoveryInProgress;
    } catch {
      // The driving caller's recovery failed — we still check if Client came back
    }
    if (await pingClient()) return;
    throw new Error(
      'Client pipe unavailable after waiting for concurrent recovery. ' +
        'The VS Code Extension Development Host may have failed to restart.',
    );
  }

  if (!clientRecoveryHandler) {
    throw new Error(
      'Client pipe not available and no recovery handler is registered. ' +
        'Make sure the VS Code Extension Development Host window is running.',
    );
  }

  logger('[client-pipe] Client pipe not responding — triggering recovery…');

  clientRecoveryInProgress = (async () => {
    try {
      await clientRecoveryHandler();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger(`[client-pipe] Recovery handler threw: ${msg}`);
    }

    // Retry with increasing delays: 2s, 4s, 6s
    for (let attempt = 1; attempt <= 3; attempt++) {
      const delayMs = attempt * 2000;
      await new Promise<void>(resolve => setTimeout(resolve, delayMs));
      if (await pingClient()) {
        logger(`[client-pipe] Recovery successful (attempt ${attempt})`);
        return;
      }
      logger(`[client-pipe] Retry ${attempt}/3 — client pipe still not responding`);
    }

    throw new Error(
      'Client pipe unavailable after recovery. ' +
        'The VS Code Extension Development Host may have failed to restart.',
    );
  })();

  try {
    await clientRecoveryInProgress;
  } finally {
    clientRecoveryInProgress = undefined;
  }
}

/**
 * Returns the fixed Client pipe path for this platform.
 */
function getClientPipePath(): string {
  return CLIENT_PIPE_PATH;
}

// ── Process Ledger Methods ─────────────────────────────────────

/**
 * Get the full process ledger: active, orphaned, and recently completed processes.
 * This is called before EVERY tool response for Copilot accountability.
 */
export async function getProcessLedger(): Promise<ProcessLedgerSummary> {
  try {
    const result = await sendClientRequest('system.getProcessLedger', {}, 3_000);
    assertResult<ProcessLedgerSummary>(result, 'system.getProcessLedger');
    return result;
  } catch {
    // Return empty ledger if unavailable
    return {
      active: [],
      orphaned: [],
      recentlyCompleted: [],
      sessionId: 'unknown',
      terminalSessions: [],
    };
  }
}
