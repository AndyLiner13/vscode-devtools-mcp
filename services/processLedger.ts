/**
 * Process Ledger Service
 *
 * Persists all Copilot-managed process events via VS Code's workspaceState for:
 * - Cross-session process tracking
 * - Orphan detection (processes that survived VS Code restart)
 * - Accountability (every MCP response includes the full ledger)
 *
 * Storage keys (workspaceState):
 *   - devtools.activeProcesses   # Currently running processes
 *   - devtools.processLog        # Capped event log (started, completed, killed)
 *
 * Event Types:
 *   - started: Process began, includes command, pid, terminal name
 *   - completed: Process finished with exit code
 *   - killed: Process was forcefully terminated
 *
 * Orphan Detection:
 *   On load, we check if previously "running" processes still exist.
 *   If they do but have no associated terminal → marked as "orphaned"
 */

import type * as vscode from 'vscode';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// ── Types ────────────────────────────────────────────────────────────────────

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
  endedAt?: string;         // ISO timestamp when completed/killed
  exitCode?: number;
  pid: number;
  sessionId: string;        // Unique session ID to track across restarts
  startedAt: string;        // ISO timestamp
  status: ProcessStatus;
  terminalName: string;
}

export interface ProcessEvent {
  command?: string;
  event: 'completed' | 'killed' | 'started';
  exitCode?: number;
  pid: number;
  sessionId: string;
  terminalName?: string;
  ts: string;               // ISO timestamp
}

export interface TerminalSessionInfo {
  command?: string;
  isActive: boolean;
  name: string;
  pid?: number;
  shell?: string;
  status: string;
}

export interface ProcessLedgerSummary {
  active: ProcessEntry[];
  orphaned: ProcessEntry[];
  recentlyCompleted: ProcessEntry[];  // Last N completed processes
  sessionId: string;
  terminalSessions: TerminalSessionInfo[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_PROCESSES_KEY = 'devtools.activeProcesses';
const PROCESS_LOG_KEY = 'devtools.processLog';
const MAX_RECENTLY_COMPLETED = 10;
const MAX_LOG_ENTRIES = 200;
const CHILD_CACHE_TTL_MS = 5_000;  // Re-query children every 5 seconds
const CHILD_QUERY_TIMEOUT_MS = 10_000;  // PowerShell execution timeout
const MAX_TREE_ITERATIONS = 200;  // BFS limit to prevent runaway queries

// ── Process Ledger Service ───────────────────────────────────────────────────

export class ProcessLedger {
  private readonly workspaceState: undefined | vscode.Memento;
  private readonly sessionId: string;
  private readonly activeProcesses = new Map<number, ProcessEntry>();
  private readonly orphanedProcesses = new Map<number, ProcessEntry>();
  private readonly recentlyCompleted: ProcessEntry[] = [];
  private initialized = false;
  private readonly childCache = new Map<number, ChildProcessInfo[]>();
  private childCacheTimestamp = 0;

  constructor(workspaceState?: vscode.Memento) {
    this.workspaceState = workspaceState;
    this.sessionId = this.generateSessionId();
    console.log(`[ProcessLedger] Created with sessionId: ${this.sessionId}`);
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  /**
   * Initialize the ledger: load persisted data, detect orphans.
   * Must be called before using other methods.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.workspaceState) {
      console.log('[ProcessLedger] No workspaceState — persistence disabled');
      this.initialized = true;
      return;
    }

    try {
      this.loadActiveProcesses();
      await this.detectOrphans();
      this.initialized = true;
      console.log(`[ProcessLedger] Initialized — ${this.activeProcesses.size} active, ${this.orphanedProcesses.size} orphaned`);
    } catch (err) {
      console.error('[ProcessLedger] Initialization error:', err);
      this.initialized = true; // Continue without persistence
    }
  }

  // ── Event Logging ──────────────────────────────────────────────────────────

  /**
   * Log a process start event.
   */
  async logStarted(pid: number, command: string, terminalName: string): Promise<void> {
    const entry: ProcessEntry = {
      command,
      pid,
      sessionId: this.sessionId,
      startedAt: new Date().toISOString(),
      status: 'running',
      terminalName,
    };

    this.activeProcesses.set(pid, entry);

    await this.appendEvent({
      command,
      event: 'started',
      pid,
      sessionId: this.sessionId,
      terminalName,
      ts: entry.startedAt,
    });

    await this.saveActiveProcesses();
    console.log(`[ProcessLedger] Started: PID ${pid} — ${command}`);
  }

  /**
   * Log a process completion event.
   */
  async logCompleted(pid: number, exitCode?: number): Promise<void> {
    const entry = this.activeProcesses.get(pid);
    if (!entry) {
      console.log(`[ProcessLedger] Completed: PID ${pid} not tracked (already completed?)`);
      return;
    }

    entry.status = 'completed';
    entry.endedAt = new Date().toISOString();
    entry.exitCode = exitCode;

    this.activeProcesses.delete(pid);
    this.addToRecentlyCompleted(entry);

    await this.appendEvent({
      event: 'completed',
      exitCode,
      pid,
      sessionId: this.sessionId,
      ts: entry.endedAt,
    });

    await this.saveActiveProcesses();
    console.log(`[ProcessLedger] Completed: PID ${pid} — exit ${exitCode ?? 'unknown'}`);
  }

  /**
   * Log a process kill event.
   */
  async logKilled(pid: number): Promise<void> {
    // Check both active and orphaned processes
    let entry = this.activeProcesses.get(pid);
    const wasOrphaned = !entry && this.orphanedProcesses.has(pid);
    if (!entry) {
      entry = this.orphanedProcesses.get(pid);
    }

    if (!entry) {
      console.log(`[ProcessLedger] Killed: PID ${pid} not tracked`);
      return;
    }

    entry.status = 'killed';
    entry.endedAt = new Date().toISOString();

    this.activeProcesses.delete(pid);
    this.orphanedProcesses.delete(pid);
    this.addToRecentlyCompleted(entry);

    await this.appendEvent({
      event: 'killed',
      pid,
      sessionId: this.sessionId,
      ts: entry.endedAt,
    });

    await this.saveActiveProcesses();
    console.log(`[ProcessLedger] Killed: PID ${pid}${wasOrphaned ? ' (was orphaned)' : ''}`);
  }

  // ── Query Methods ──────────────────────────────────────────────────────────

  /**
   * Get the full process ledger summary.
   * This is included in EVERY MCP tool response for Copilot accountability.
   * Children are populated from the cache (refreshed by refreshActiveChildren).
   */
  getLedger(): ProcessLedgerSummary {
    const populateChildren = (entry: ProcessEntry): ProcessEntry => {
      const children = this.childCache.get(entry.pid);
      if (children && children.length > 0) {
        return { ...entry, children };
      }
      return entry;
    };

    return {
      active: Array.from(this.activeProcesses.values()).map(populateChildren),
      orphaned: Array.from(this.orphanedProcesses.values()).map(populateChildren),
      recentlyCompleted: this.recentlyCompleted,
      sessionId: this.sessionId,
      terminalSessions: [],  // Populated by the RPC handler with live terminal data
    };
  }

  /**
   * Check if a PID is tracked (active or orphaned).
   */
  isTracked(pid: number): boolean {
    return this.activeProcesses.has(pid) || this.orphanedProcesses.has(pid);
  }

  /**
   * Get a specific process entry.
   */
  getProcess(pid: number): ProcessEntry | undefined {
    return this.activeProcesses.get(pid) ?? this.orphanedProcesses.get(pid);
  }

  // ── Kill Methods ───────────────────────────────────────────────────────────

  /**
   * Kill a process by PID using platform-appropriate method.
   * Works for both active and orphaned processes.
   */
  async killProcess(pid: number): Promise<{ success: boolean; error?: string }> {
    const entry = this.getProcess(pid);
    if (!entry) {
      return { error: `PID ${pid} is not tracked by Copilot`, success: false };
    }

    try {
      if (process.platform === 'win32') {
        // Windows: use taskkill to forcefully terminate
        await execAsync(`taskkill /F /PID ${pid}`);
      } else {
        // Unix: use kill -9
        await execAsync(`kill -9 ${pid}`);
      }

      await this.logKilled(pid);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Process might already be gone
      if (msg.includes('not found') || msg.includes('No such process')) {
        await this.logKilled(pid);
        return { success: true };
      }
      return { error: msg, success: false };
    }
  }

  /**
   * Kill all orphaned processes.
   */
  async killAllOrphans(): Promise<{ killed: number[]; failed: Array<{ pid: number; error: string }> }> {
    const killed: number[] = [];
    const failed: Array<{ pid: number; error: string }> = [];

    for (const [pid] of this.orphanedProcesses) {
      const result = await this.killProcess(pid);
      if (result.success) {
        killed.push(pid);
      } else {
        failed.push({ error: result.error ?? 'Unknown error', pid });
      }
    }

    return { failed, killed };
  }

  // ── Child Process Monitoring (Windows CIM/WMI) ─────────────────────────────

  /**
   * Refresh the child process cache for all active and orphaned PIDs.
   * Uses PowerShell Get-CimInstance Win32_Process for recursive BFS tree enumeration.
   * Skips the query if the cache is still fresh (within CHILD_CACHE_TTL_MS).
   */
  async refreshActiveChildren(): Promise<void> {
    const now = Date.now();
    if (now - this.childCacheTimestamp < CHILD_CACHE_TTL_MS) return;

    const allPids = [
      ...Array.from(this.activeProcesses.keys()),
      ...Array.from(this.orphanedProcesses.keys()),
    ];
    if (allPids.length === 0) {
      this.childCache.clear();
      this.childCacheTimestamp = now;
      return;
    }

    const allChildren = await this.queryChildProcessTree(allPids);

    // Group children by their root parent (the tracked PID that spawned them)
    this.childCache.clear();
    for (const child of allChildren) {
      const rootPid = this.findRootParent(child, allChildren, allPids);
      const existing = this.childCache.get(rootPid);
      if (existing) {
        existing.push(child);
      } else {
        this.childCache.set(rootPid, [child]);
      }
    }

    this.childCacheTimestamp = now;
    const totalChildren = allChildren.length;
    if (totalChildren > 0) {
      console.log(`[ProcessLedger] Child cache refreshed — ${totalChildren} children across ${this.childCache.size} roots`);
    }
  }

  /**
   * Walk up the parentPid chain to find which tracked root PID owns this child.
   */
  private findRootParent(
    child: ChildProcessInfo,
    allChildren: ChildProcessInfo[],
    rootPids: number[],
  ): number {
    let currentParent = child.parentPid;
    const visited = new Set<number>();

    while (!rootPids.includes(currentParent)) {
      if (visited.has(currentParent)) break;
      visited.add(currentParent);

      const parent = allChildren.find(c => c.pid === currentParent);
      if (!parent) break;
      currentParent = parent.parentPid;
    }

    return currentParent;
  }

  /**
   * Query the full process tree for multiple root PIDs using PowerShell CIM.
   * Performs iterative BFS: starts from rootPids, discovers children, then their children, etc.
   * Returns all descendant processes (not the roots themselves).
   */
  private async queryChildProcessTree(rootPids: number[]): Promise<ChildProcessInfo[]> {
    if (process.platform !== 'win32' || rootPids.length === 0) return [];

    const pidsStr = rootPids.join(',');
    const script = [
      `$rootPids = @(${pidsStr})`,
      `$pids = [System.Collections.ArrayList]@()`,
      `foreach ($r in $rootPids) { $null = $pids.Add($r) }`,
      `$result = [System.Collections.ArrayList]@()`,
      `$visited = [System.Collections.Generic.HashSet[int]]::new()`,
      `foreach ($r in $rootPids) { $null = $visited.Add($r) }`,
      `$i = 0`,
      `while ($i -lt $pids.Count -and $i -lt ${MAX_TREE_ITERATIONS}) {`,
      `  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($pids[$i])" -ErrorAction SilentlyContinue`,
      `  foreach ($c in $children) {`,
      `    if (-not $visited.Contains([int]$c.ProcessId)) {`,
      `      $null = $visited.Add([int]$c.ProcessId)`,
      `      $null = $result.Add([PSCustomObject]@{Pid=$c.ProcessId;Name=$c.Name;CommandLine=$c.CommandLine;ParentPid=$c.ParentProcessId})`,
      `      $null = $pids.Add($c.ProcessId)`,
      `    }`,
      `  }`,
      `  $i++`,
      `}`,
      `if ($result.Count -gt 0) { $result | ConvertTo-Json -Compress } else { Write-Output '[]' }`,
    ].join('\n');

    // Use -EncodedCommand to avoid shell escaping issues
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    try {
      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: CHILD_QUERY_TIMEOUT_MS },
      );

      const trimmed = stdout.trim();
      if (!trimmed || trimmed === '[]') return [];

      const parsed = JSON.parse(trimmed) as Array<Record<string, unknown>> | Record<string, unknown>;
      const items = Array.isArray(parsed) ? parsed : [parsed];

      return items.map(item => ({
        commandLine: (item.CommandLine as string) ?? '',
        name: (item.Name as string) ?? '',
        parentPid: item.ParentPid as number,
        pid: item.Pid as number,
      }));
    } catch (err) {
      console.error('[ProcessLedger] Child process tree query failed:', err);
      return [];
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private async appendEvent(event: ProcessEvent): Promise<void> {
    if (!this.workspaceState) return;

    try {
      const log = this.workspaceState.get<ProcessEvent[]>(PROCESS_LOG_KEY, []);
      log.push(event);

      // Cap the log to prevent unbounded growth
      const capped = log.length > MAX_LOG_ENTRIES ? log.slice(-MAX_LOG_ENTRIES) : log;
      await this.workspaceState.update(PROCESS_LOG_KEY, capped);
    } catch (err) {
      console.error('[ProcessLedger] Failed to append event:', err);
    }
  }

  private async saveActiveProcesses(): Promise<void> {
    if (!this.workspaceState) return;

    const data = {
      processes: Array.from(this.activeProcesses.values()),
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.workspaceState.update(ACTIVE_PROCESSES_KEY, data);
    } catch (err) {
      console.error('[ProcessLedger] Failed to save active processes:', err);
    }
  }

  private loadActiveProcesses(): void {
    if (!this.workspaceState) return;

    try {
      const data = this.workspaceState.get<{
        sessionId: string;
        processes: ProcessEntry[];
        timestamp: string;
      }>(ACTIVE_PROCESSES_KEY);

      if (!data) {
        console.log('[ProcessLedger] No previous active processes');
        return;
      }

      // Store as potential orphans (will verify in detectOrphans)
      for (const proc of data.processes ?? []) {
        if (proc.status === 'running') {
          this.orphanedProcesses.set(proc.pid, {
            ...proc,
            status: 'orphaned',
          });
        }
      }

      console.log(`[ProcessLedger] Loaded ${this.orphanedProcesses.size} potential orphans from previous session`);
    } catch (err) {
      console.log('[ProcessLedger] Failed to load previous state:', err);
    }
  }

  private async detectOrphans(): Promise<void> {
    // Check each potential orphan to see if the process is still running
    const toRemove: number[] = [];

    for (const [pid, entry] of this.orphanedProcesses) {
      const stillRunning = await this.isProcessRunning(pid);
      if (!stillRunning) {
        toRemove.push(pid);
        // Add to recently completed since it ended while we weren't watching
        entry.status = 'completed';
        entry.endedAt = new Date().toISOString();
        this.addToRecentlyCompleted(entry);
      } else {
        console.log(`[ProcessLedger] Orphaned process still running: PID ${pid} — ${entry.command}`);
      }
    }

    for (const pid of toRemove) {
      this.orphanedProcesses.delete(pid);
    }

    console.log(`[ProcessLedger] Orphan detection complete — ${this.orphanedProcesses.size} orphans confirmed`);
  }

  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Windows: check via tasklist
        const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /NH`);
        return stdout.includes(String(pid));
      } 
        // Unix: check via kill -0
        await execAsync(`kill -0 ${pid}`);
        return true;
      
    } catch {
      return false;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private generateSessionId(): string {
    return new Date().toISOString().replaceAll(/[:.]/g, '-');
  }

  private addToRecentlyCompleted(entry: ProcessEntry): void {
    this.recentlyCompleted.unshift(entry);
    if (this.recentlyCompleted.length > MAX_RECENTLY_COMPLETED) {
      this.recentlyCompleted.pop();
    }
  }

  /**
   * Dispose the ledger and clean up.
   */
  dispose(): void {
    console.log('[ProcessLedger] Disposing');
    this.saveActiveProcesses().catch(() => {});
  }
}

// ── Singleton Instance ───────────────────────────────────────────────────────

let instance: null | ProcessLedger = null;

export function initProcessLedger(workspaceState: vscode.Memento): ProcessLedger {
  if (!instance) {
    instance = new ProcessLedger(workspaceState);
  }
  return instance;
}

export function getProcessLedger(): ProcessLedger {
  if (!instance) {
    instance = new ProcessLedger();
  }
  return instance;
}

export function disposeProcessLedger(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
