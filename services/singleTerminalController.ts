/**
 * Multi-Terminal Controller
 *
 * Manages multiple named VS Code terminals with:
 * - Shell Integration API for command completion (onDidEndTerminalShellExecution)
 * - Event-driven input detection: execution running + output idle = waiting for input
 * - Blocking wait pattern: run/input calls wait for completion or timeout
 * - Busy guard: rejects new commands on a terminal while one is running
 * - Terminal persistence: terminals persist between commands, indexed by name
 * - Backward compatible: default name "default" for single-terminal usage
 * - Process ledger: tracks all Copilot-managed processes for accountability
 *
 * Architecture:
 *   MCP tool (terminal_execute) → RPC → client-handlers → MultiTerminalController.run()
 *       → creates terminal if needed (by name)
 *       → sends command via sendText
 *       → waits for Shell Integration events + output settle OR timeout
 *       → returns { status, output, exitCode?, prompt? }
 */

import * as vscode from 'vscode';
import { cleanTerminalOutput, type TerminalStatus } from './processDetection';
import { getProcessLedger, type TerminalSessionInfo } from './processLedger';
import { getUserActionTracker } from './userActionTracker';
import { getProcessTree, isStdinDetectionAvailable, isTreeWaitingForStdin, type ProcessTreeResult, type StdinDetectionResult } from './stdinDetection';

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 120_000;  // 2 minutes default for blocking completion
const POLL_INTERVAL_MS = 200;        // State polling interval
const OUTPUT_SETTLE_MS = 2_000;      // Wait for output to settle after execution ends (fallback heuristic)
const NATIVE_STDIN_SETTLE_MS = 500;  // Reduced settle time when native detection available
const DEFAULT_TERMINAL_NAME = 'default';

// Native detection state
let nativeDetectionAvailable: boolean | null = null;  // null = not checked yet
let lastNativeCheckTime = 0;
let lastNativeStdinResult: StdinDetectionResult | null = null;
let lastNativeTreeResult: ProcessTreeResult | null = null;

/**
 * Ensure native detection is initialized. Only checks once.
 */
async function ensureNativeDetection(): Promise<boolean> {
  if (nativeDetectionAvailable === null) {
    nativeDetectionAvailable = await isStdinDetectionAvailable();
    console.log(`[NativeDetection] Available: ${nativeDetectionAvailable}`);
  }
  return nativeDetectionAvailable;
}

/**
 * Check if a process is waiting for stdin input.
 * Uses process tree walking to find the actual command process.
 *
 * Priority:
 * 1. Native: walk shell's child tree, check leaf processes for stdin wait
 * 2. Heuristic fallback: executionCount > 0 && output settled
 */
async function isWaitingForInputDetection(
  pid: number | undefined,
  executionCount: number,
  msSinceLastOutput: number,
  hasOutput: boolean
): Promise<{ waiting: boolean; method: 'native' | 'heuristic' }> {
  if (executionCount <= 0 || !hasOutput) {
    return { waiting: false, method: 'heuristic' };
  }

  const available = await ensureNativeDetection();

  if (pid && available) {
    const now = Date.now();

    if (now - lastNativeCheckTime >= 100) {
      lastNativeCheckTime = now;
      try {
        lastNativeStdinResult = await isTreeWaitingForStdin(pid);

        if (!lastNativeStdinResult.error) {
          if (lastNativeStdinResult.isWaitingForStdin) {
            console.log(`[NativeDetection] Tree under PID ${pid} waiting for stdin (reasons: ${lastNativeStdinResult.detectedWaitReasons.join(', ')})`);
            return { waiting: true, method: 'native' };
          } else if (msSinceLastOutput >= NATIVE_STDIN_SETTLE_MS) {
            return { waiting: false, method: 'native' };
          }
        }
      } catch (err) {
        console.log(`[NativeDetection] stdin check threw: ${err}`);
      }
    } else if (lastNativeStdinResult && !lastNativeStdinResult.error && lastNativeStdinResult.isWaitingForStdin) {
      return { waiting: true, method: 'native' };
    }
  }

  const waiting = msSinceLastOutput >= OUTPUT_SETTLE_MS;
  return { waiting, method: 'heuristic' };
}

/**
 * Check if all child processes of the shell have exited.
 * This replaces the OUTPUT_SETTLE_MS heuristic for completion detection.
 *
 * Returns:
 * - { done: true, method: 'native' } — no children alive, command is definitively done
 * - { done: false, method: 'native' } — children still running
 * - { done: undefined, method: 'heuristic' } — native unavailable, caller should use heuristic
 */
async function isCommandComplete(
  pid: number | undefined,
): Promise<{ done: boolean | undefined; method: 'native' | 'heuristic'; commandPid?: number }> {
  const available = await ensureNativeDetection();

  if (!pid || !available) {
    return { done: undefined, method: 'heuristic' };
  }

  try {
    lastNativeTreeResult = await getProcessTree(pid);

    if (lastNativeTreeResult.error) {
      return { done: undefined, method: 'heuristic' };
    }

    return {
      done: !lastNativeTreeResult.hasLiveChildren,
      method: 'native',
      commandPid: lastNativeTreeResult.commandPid,
    };
  } catch {
    return { done: undefined, method: 'heuristic' };
  }
}

// Busy terminal error: max chars of output to include (whole lines, newest first)
const BUSY_OUTPUT_MAX_CHARS = 4_000;

// Delay between key presses to allow TUI re-render (ms)
const KEY_SETTLE_MS = 100;

// Map of friendly key names → raw terminal escape sequences
const KEY_SEQUENCES: Record<string, string> = {
  // Arrow keys
  'ArrowUp':    '\x1b[A',
  'ArrowDown':  '\x1b[B',
  'ArrowRight': '\x1b[C',
  'ArrowLeft':  '\x1b[D',
  'Up':         '\x1b[A',
  'Down':       '\x1b[B',
  'Right':      '\x1b[C',
  'Left':       '\x1b[D',

  // Common keys
  'Enter':      '\r',
  'Tab':        '\t',
  'Escape':     '\x1b',
  'Backspace':  '\x7f',
  'Delete':     '\x1b[3~',
  'Space':      ' ',

  // Navigation
  'Home':       '\x1b[H',
  'End':        '\x1b[F',
  'PageUp':     '\x1b[5~',
  'PageDown':   '\x1b[6~',

  // Ctrl combos
  'Ctrl+A':     '\x01',
  'Ctrl+B':     '\x02',
  'Ctrl+C':     '\x03',
  'Ctrl+D':     '\x04',
  'Ctrl+E':     '\x05',
  'Ctrl+F':     '\x06',
  'Ctrl+K':     '\x0b',
  'Ctrl+L':     '\x0c',
  'Ctrl+N':     '\x0e',
  'Ctrl+P':     '\x10',
  'Ctrl+R':     '\x12',
  'Ctrl+U':     '\x15',
  'Ctrl+W':     '\x17',
  'Ctrl+Z':     '\x1a',

  // Common aliases
  'y':          'y',
  'n':          'n',
  'Y':          'Y',
  'N':          'N',
};

// ── Types ────────────────────────────────────────────────────────────────────

export type WaitMode = 'completion' | 'background';

export interface ActiveProcess {
  terminalName: string;
  pid?: number;
  command: string;
  status: TerminalStatus | 'timeout';
  startedAt: string;
  durationMs: number;
  exitCode?: number;
}

// PowerShell-only: All terminals use PowerShell
export type ShellType = 'powershell';

export interface TerminalRunResult {
  status: TerminalStatus | 'timeout';
  output: string;
  shell?: string;
  cwd?: string;
  exitCode?: number;
  prompt?: string;
  pid?: number;
  name?: string;
  durationMs?: number;
  activeProcesses?: ActiveProcess[];
  terminalSessions?: TerminalSessionInfo[];
}

interface InternalState {
  name: string;
  terminal: vscode.Terminal;
  shell: ShellType;
  status: TerminalStatus;
  output: string;
  cwd?: string;
  exitCode?: number;
  pid?: number;
  lastOutputTime: number;
  shellIntegration: vscode.TerminalShellIntegration | undefined;
  outputSnapshotIndex: number;
  command: string;
  executionCount: number;
  lastExitTime: number;
  commandStartTime: number;
}

// ── Controller ───────────────────────────────────────────────────────────────

export class SingleTerminalController {
  private readonly terminals = new Map<string, InternalState>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.setupGlobalListeners();
  }

  // ── Global Listeners ─────────────────────────────────────────────────────

  private setupGlobalListeners(): void {
    // Capture output from all shell executions targeting tracked terminals
    // Also track execution count for cascading command detection
    this.disposables.push(
      vscode.window.onDidStartTerminalShellExecution(async (event) => {
        const state = this.findStateByTerminal(event.terminal);
        if (!state) return;

        // Track that a new execution started (for cascading detection)
        state.executionCount++;
        console.log(`[MultiTerminalController] Execution started for "${state.name}" (count: ${state.executionCount})`);

        try {
          for await (const data of event.execution.read()) {
            state.output += data;
            state.lastOutputTime = Date.now();
          }
        } catch {
          // Stream may close unexpectedly
        }
      }),
    );

    // Detect command completion via Shell Integration
    this.disposables.push(
      vscode.window.onDidEndTerminalShellExecution((event) => {
        const state = this.findStateByTerminal(event.terminal);
        if (!state) return;

        // Track execution completion
        state.executionCount = Math.max(0, state.executionCount - 1);
        state.lastExitTime = Date.now();
        state.exitCode = event.exitCode;
        
        // Only mark as completed if no more executions pending
        if (state.executionCount === 0) {
          state.status = 'completed';
          
          // Log completion to persistent ledger
          if (state.pid !== undefined) {
            getProcessLedger().logCompleted(state.pid, event.exitCode).catch(() => {});
          }
        }
        
        console.log(`[MultiTerminalController] Execution ended for "${state.name}" (count: ${state.executionCount}, exitCode: ${event.exitCode})`);
      }),
    );

    // Track shell integration activation
    this.disposables.push(
      vscode.window.onDidChangeTerminalShellIntegration((event) => {
        const state = this.findStateByTerminal(event.terminal);
        if (!state) return;
        state.shellIntegration = event.shellIntegration;
        console.log(`[MultiTerminalController] Shell integration activated for "${state.name}"`);
      }),
    );

    // Track terminal closure
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        const state = this.findStateByTerminal(terminal);
        if (!state) return;
        state.status = 'completed';
        state.exitCode = terminal.exitStatus?.code;
        console.log(`[MultiTerminalController] Terminal "${state.name}" closed`);

        // Notify user action tracker so Copilot learns about the closure
        getUserActionTracker().onManagedTerminalClosed(state.name);
      }),
    );
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Run a command in a named terminal from a specific working directory.
   * All terminals use PowerShell.
   * - Creates terminal if none exists with that name
   * - Rejects if the named terminal already has a command running
   * - Waits for completion (shell integration events + output settle) or timeout
   * 
   * @param command The PowerShell command to execute
   * @param cwd Absolute path to the working directory for command execution
   * @param timeoutMs Max wait time (default: 120000ms)
   * @param name Terminal name (default: 'default')
   * @param waitMode 'completion' blocks until done; 'background' returns immediately
   * @param force Kill running process and start new command (default: false)
   */
  async run(
    command: string,
    cwd: string,
    timeoutMs?: number,
    name?: string,
    waitMode: WaitMode = 'completion',
    force = false,
  ): Promise<TerminalRunResult> {
    const shellType: ShellType = 'powershell';
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;

    let state = this.terminals.get(terminalName);

    // Busy guard: reject if this terminal is already running (unless force=true)
    if (state && state.status === 'running') {
      if (force) {
        console.log(`[MultiTerminalController] Force-killing terminal "${terminalName}"`);
        await this.kill(terminalName);
        state = undefined;
      } else {
        return this.buildBusyError(state, terminalName);
      }
    }

    // Create terminal if needed, or reuse existing idle one
    if (!state || state.status === 'completed') {
      state = await this.createTerminal(terminalName);
    }

    // Build wrapped command that changes to cwd first
    const wrappedCommand = this.buildCwdCommand(cwd, command);

    // Reset state for new command
    state.output = '';
    state.exitCode = undefined;
    state.status = 'running';
    state.cwd = cwd;
    state.lastOutputTime = Date.now();
    state.outputSnapshotIndex = 0;
    state.command = command;
    state.executionCount = 0;
    state.lastExitTime = 0;
    state.commandStartTime = Date.now();

    // Send the wrapped command (cd + original command)
    state.terminal.sendText(wrappedCommand, true);
    state.terminal.show(true);

    // Log start to persistent ledger (PID may not be available yet for new terminals)
    if (state.pid !== undefined) {
      getProcessLedger().logStarted(state.pid, command, terminalName).catch(() => {});
    } else {
      // Wait for PID and then log
      state.terminal.processId.then((pid) => {
        if (pid !== undefined) {
          getProcessLedger().logStarted(pid, command, terminalName).catch(() => {});
        }
      });
    }

    // Background mode: return immediately without waiting
    if (waitMode === 'background') {
      return this.withProcessSummary({
        status: 'running',
        output: '',
        shell: shellType,
        cwd,
        pid: state.pid,
        name: terminalName,
      });
    }

    // Completion mode: wait for one of: completion, prompt, or timeout
    const result = await this.waitForResult(state, timeout);
    return this.withProcessSummary({...result, shell: shellType, cwd});
  }

  /**
   * Send input to a named terminal that is waiting for a prompt.
   * Waits for the next completion or prompt after sending.
   */
  async sendInput(text: string, addNewline = true, timeoutMs?: number, name?: string): Promise<TerminalRunResult> {
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const state = this.terminals.get(terminalName);
    if (!state) {
      throw new Error(
        `No terminal named "${terminalName}" exists. Use terminal_execute to start a command first.`,
      );
    }

    // Snapshot current output length before sending input
    state.outputSnapshotIndex = state.output.length;

    // Reset to running state
    state.status = 'running';
    state.exitCode = undefined;
    state.lastOutputTime = Date.now();

    // Send the input
    state.terminal.sendText(text, addNewline);

    // Wait for next completion or prompt
    const result = await this.waitForResult(state, timeout);
    return this.withProcessSummary(result);
  }

  /**
   * Send one or more key sequences to a terminal for interactive TUI navigation.
   * Returns immediately with current terminal state (no waiting for completion).
   * Keys can be friendly names ("ArrowUp", "Enter", "Ctrl+C") or raw characters.
   *
   * Safety: If keys contains Enter AND other keys, Enter is stripped to force
   * a "navigate → verify → confirm" pattern. Copilot must send Enter separately
   * after confirming the visual state matches intent.
   */
  async sendKeys(keys: string[], name?: string, timeoutMs?: number): Promise<TerminalRunResult> {
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const state = this.terminals.get(terminalName);
    if (!state) {
      throw new Error(
        `No terminal named "${terminalName}" exists. Use terminal_execute to start a command first.`,
      );
    }

    // Safety: Strip Enter if keys contains Enter AND other keys
    // This forces a two-step pattern: navigate → verify visual state → confirm with separate Enter
    const enterKeys = ['Enter', '\r'];
    const hasEnter = keys.some(k => enterKeys.includes(k));
    const hasOtherKeys = keys.some(k => !enterKeys.includes(k));
    const enterRevoked = hasEnter && hasOtherKeys;

    // Filter out Enter keys if revoked
    const keysToSend = enterRevoked
      ? keys.filter(k => !enterKeys.includes(k))
      : keys;

    // Snapshot current output and reset state before sending keys
    state.outputSnapshotIndex = state.output.length;
    state.status = 'running';
    state.exitCode = undefined;
    state.lastOutputTime = Date.now();
    state.commandStartTime = Date.now();

    state.terminal.show(true);

    for (let i = 0; i < keysToSend.length; i++) {
      const key = keysToSend[i];
      const sequence = KEY_SEQUENCES[key] ?? key;
      state.terminal.sendText(sequence, false);

      // Brief delay between keys to let TUI re-render
      if (i < keysToSend.length - 1) {
        await new Promise(resolve => setTimeout(resolve, KEY_SETTLE_MS));
      }
    }

    // Wait for next completion, prompt, or timeout (same as sendInput)
    const result = await this.waitForResult(state, timeout);
    const finalResult = this.withProcessSummary(result);

    // Prepend notification if Enter was revoked
    if (enterRevoked) {
      const notification =
        `⚠️ ENTER KEY REVOKED — Review before confirming\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Original keys: [${keys.join(', ')}]\n` +
        `Sent keys:     [${keysToSend.join(', ')}]\n\n` +
        `The Enter key was removed to let you verify the visual state below\n` +
        `matches your intended selection. If correct, send keys: ["Enter"]\n` +
        `to confirm and submit your choice.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      finalResult.output = notification + finalResult.output;
    }

    return finalResult;
  }

  /**
   * Get current state of a named terminal without modifying anything.
   */
  async getState(name?: string): Promise<TerminalRunResult> {
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const state = this.terminals.get(terminalName);

    if (!state) {
      return this.withProcessSummary({
        status: 'idle',
        output: '',
        name: terminalName,
      });
    }

    const cleaned = cleanTerminalOutput(state.output);
    const msSinceLastOutput = Date.now() - state.lastOutputTime;

    // Use native process tree detection for input/completion status
    let detectedStatus: TerminalStatus = state.status;
    let prompt: string | undefined;

    if (state.status === 'running' && state.output.length > 0) {
      const detection = await isWaitingForInputDetection(
        state.pid,
        state.executionCount,
        msSinceLastOutput,
        state.output.length > 0,
      );

      if (detection.waiting) {
        detectedStatus = 'waiting_for_input';
        prompt = cleaned.split('\n').filter(l => l.trim()).pop();
      } else if (state.executionCount <= 0) {
        // Shell Integration says done — verify with native tree
        const completion = await isCommandComplete(state.pid);
        if (completion.method === 'native' && completion.done) {
          detectedStatus = 'completed';
        }
      }
    }

    return this.withProcessSummary({
      status: detectedStatus,
      output: cleaned,
      exitCode: state.exitCode,
      prompt,
      pid: state.pid,
      name: terminalName,
    });
  }

  /**
   * Send Ctrl+C to kill the running process in a named terminal.
   */
  kill(name?: string): TerminalRunResult {
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const state = this.terminals.get(terminalName);

    if (!state) {
      return this.withProcessSummary({ status: 'idle', output: '', name: terminalName });
    }

    // Send Ctrl+C (ETX character)
    state.terminal.sendText('\x03', false);
    state.status = 'completed';

    // Log kill to persistent ledger
    if (state.pid !== undefined) {
      getProcessLedger().logKilled(state.pid).catch(() => {});
    }

    const cleaned = cleanTerminalOutput(state.output);
    return this.withProcessSummary({
      status: 'completed',
      output: cleaned,
      pid: state.pid,
      name: terminalName,
    });
  }

  /**
   * List all tracked terminals with their current status.
   */
  listTracked(): Array<{ name: string; status: TerminalStatus; pid?: number }> {
    const result: Array<{ name: string; status: TerminalStatus; pid?: number }> = [];
    for (const [name, state] of this.terminals) {
      result.push({
        name,
        status: state.status,
        pid: state.pid,
      });
    }
    return result;
  }

  /**
   * Check if a specific terminal exists and is busy.
   */
  isBusy(name?: string): boolean {
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const state = this.terminals.get(terminalName);
    return state?.status === 'running';
  }

  /**
   * Get a summary of all Copilot-managed processes across all terminals.
   * Included in every result so Copilot always knows its process footprint.
   */
  private getActiveProcessSummary(): ActiveProcess[] {
    const processes: ActiveProcess[] = [];
    for (const [, state] of this.terminals) {
      if (!state.command) continue;

      const now = Date.now();
      const startTime = state.commandStartTime || now;
      processes.push({
        terminalName: state.name,
        pid: state.pid,
        command: state.command,
        status: state.status,
        startedAt: new Date(startTime).toISOString(),
        durationMs: now - startTime,
        exitCode: state.exitCode,
      });
    }
    return processes;
  }

  /**
   * Get a snapshot of active terminal sessions managed by this controller.
   * Only includes terminals that Copilot can actually interact with.
   */
  getTerminalSessions(): TerminalSessionInfo[] {
    const sessions: TerminalSessionInfo[] = [];
    const activeTerminal = vscode.window.activeTerminal;

    // Only show terminals that we're actively tracking (created in this session)
    for (const [, state] of this.terminals) {
      // Verify the terminal still exists in VS Code's terminal list
      const stillExists = vscode.window.terminals.includes(state.terminal);
      if (!stillExists) continue;

      sessions.push({
        name: state.name,
        shell: state.shell,
        pid: state.pid,
        isActive: state.terminal === activeTerminal,
        status: state.status,
        command: state.command || undefined,
      });
    }

    return sessions;
  }

  /**
   * Attach active process summary and terminal sessions to any terminal result.
   */
  private withProcessSummary(result: TerminalRunResult): TerminalRunResult {
    result.activeProcesses = this.getActiveProcessSummary();
    result.terminalSessions = this.getTerminalSessions();
    return result;
  }

  /**
   * Destroy a named terminal: dispose it from VS Code's panel and remove from tracking.
   * Used by ephemeral terminals that should disappear after their command completes.
   */
  destroyTerminal(name?: string): void {
    const terminalName = name ?? DEFAULT_TERMINAL_NAME;
    const state = this.terminals.get(terminalName);
    if (!state) return;

    try { state.terminal.dispose(); } catch { /* ignore */ }
    this.terminals.delete(terminalName);
    console.log(`[MultiTerminalController] Ephemeral terminal "${terminalName}" destroyed`);
  }

  /**
   * Dispose the controller and clean up all resources.
   */
  dispose(): void {
    for (const [, state] of this.terminals) {
      try { state.terminal.dispose(); } catch { /* ignore */ }
    }
    this.terminals.clear();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private findStateByTerminal(terminal: vscode.Terminal): InternalState | undefined {
    for (const [, state] of this.terminals) {
      if (state.terminal === terminal) return state;
    }
    return undefined;
  }

  /**
   * Build a command that changes to the specified directory before executing.
   * Uses PowerShell syntax.
   */
  private buildCwdCommand(cwd: string, command: string): string {
    const escapedPath = cwd.replace(/'/g, "''");
    return `Set-Location '${escapedPath}'; ${command}`;
  }

  /**
   * Get the PowerShell executable path.
   */
  private getShellPath(): string {
    return process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
  }

  private async createTerminal(name: string): Promise<InternalState> {
    // Clean up old terminal with same name if it exists
    const existing = this.terminals.get(name);
    if (existing) {
      try { existing.terminal.dispose(); } catch { /* ignore */ }
    }

    const cwd = this.getWorkspaceCwd();
    const displayName = name === DEFAULT_TERMINAL_NAME ? 'MCP Terminal' : name;
    const shellPath = this.getShellPath();
    const terminal = vscode.window.createTerminal({
      name: displayName,
      cwd,
      shellPath,
    });
    terminal.show(true);

    const state: InternalState = {
      name,
      terminal,
      shell: 'powershell',
      status: 'idle',
      output: '',
      exitCode: undefined,
      pid: undefined,
      lastOutputTime: Date.now(),
      shellIntegration: terminal.shellIntegration,
      outputSnapshotIndex: 0,
      command: '',
      executionCount: 0,
      lastExitTime: 0,
      commandStartTime: 0,
    };

    this.terminals.set(name, state);

    // Resolve PID asynchronously
    terminal.processId.then((pid) => {
      if (pid !== undefined) {
        state.pid = pid;
      }
    });

    // Wait briefly for shell integration to activate
    if (!state.shellIntegration) {
      await this.waitForShellIntegration(state, 5_000);
    }

    console.log(`[MultiTerminalController] Terminal "${name}" created`);
    return state;
  }

  /**
   * Enhanced waiting loop with grace period for robust completion detection.
   *
   * Strategy (Phase 1 Blueprint):
   * 1. Wait for Shell Integration exit code (status === 'completed')
   * 2. Start grace period (3000ms) to catch cascading commands
   * 3. Watch for new executions starting during grace
   * 4. Confirm shell prompt appeared in output (belt + suspenders)
   * 5. Return with full output when truly complete, or on prompt/timeout
   */
  /**
   * Build a descriptive error result for busy terminals.
   * Includes 4000 chars of output (whole lines, newest first).
   */
  private buildBusyError(state: InternalState, terminalName: string): TerminalRunResult {
    const cleaned = cleanTerminalOutput(state.output);
    const outputExcerpt = this.truncateToWholeLinesFromEnd(cleaned, BUSY_OUTPUT_MAX_CHARS);

    const errorMessage =
      `ERROR: Terminal "${terminalName}" is busy.\n\n` +
      `**Last Command:** ${state.command}\n` +
      `**Status:** running\n` +
      `**PID:** ${state.pid ?? 'unknown'}\n` +
      `**Started:** ${new Date(state.commandStartTime).toISOString()}\n` +
      `**Duration:** ${Date.now() - state.commandStartTime}ms\n\n` +
      `To force-kill and run a new command, set force=true.\n\n` +
      `**Current Output (last ${outputExcerpt.length} chars):**\n\'\'\'\n${outputExcerpt}\n\'\'\'`;

    return this.withProcessSummary({
      status: 'running',
      output: errorMessage,
      shell: state.shell,
      cwd: state.cwd,
      pid: state.pid,
      name: terminalName,
    });
  }

  /**
   * Truncate text to at most maxChars by keeping whole lines from the end.
   * Lines that would be cut off are excluded entirely.
   */
  private truncateToWholeLinesFromEnd(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    const allLines = text.split('\n');
    const kept: string[] = [];
    let totalChars = 0;

    for (let i = allLines.length - 1; i >= 0; i--) {
      const lineWithNewline = allLines[i].length + (kept.length > 0 ? 1 : 0);
      if (totalChars + lineWithNewline > maxChars) break;
      kept.unshift(allLines[i]);
      totalChars += lineWithNewline;
    }
    return kept.join('\n');
  }

  /**
   * Wait for command completion using shell integration events.
   *
   * Strategy:
   * 1. Poll every 200ms for state changes
   * 2. If execution is running (executionCount > 0) but output has stopped → waiting for input
   * 3. When executionCount reaches 0 (all shell executions finished):
   *    - Wait for output to settle (OUTPUT_SETTLE_MS of no new output)
   *    - Then resolve as completed
   * 4. Timeout fallback
   */
  private waitForResult(state: InternalState, timeoutMs: number): Promise<TerminalRunResult> {
    return new Promise((resolve) => {
      let resolved = false;
      let completedAt: number | null = null;

      const resolveOnce = (result: TerminalRunResult) => {
        if (resolved) return;
        resolved = true;
        if (pollInterval) clearInterval(pollInterval);
        if (timeoutTimer) clearTimeout(timeoutTimer);

        result.durationMs = Date.now() - state.commandStartTime;
        resolve(result);
      };

      const pollInterval = setInterval(() => {
        // Use async IIFE to handle native stdin detection
        void (async () => {
          if (resolved) return;  // Already resolved, skip

          const cleaned = cleanTerminalOutput(state.output);
          const msSinceLastOutput = Date.now() - state.lastOutputTime;

          // Priority 1: Input detection (native + heuristic fallback)
          // Shell execution is running (started, not ended) but output has stopped → check for stdin wait
          if (state.executionCount > 0 && state.output.length > 0) {
            const detection = await isWaitingForInputDetection(
              state.pid,
              state.executionCount,
              msSinceLastOutput,
              state.output.length > 0
            );

            if (detection.waiting) {
              const lastLine = cleaned.split('\n').filter(l => l.trim()).pop() ?? '';
              state.status = 'waiting_for_input';
              console.log(`[MultiTerminalController] Detected waiting_for_input via ${detection.method} for "${state.name}"`);
              resolveOnce({
                status: 'waiting_for_input',
                output: cleaned,
                prompt: lastLine,
                pid: state.pid,
                name: state.name,
              });
              return;
            }
          }

          // Priority 2: Completion detection
          // Shell integration says executionCount <= 0, or we can check the process tree natively
          if (state.executionCount <= 0 && state.lastExitTime > 0) {
            // Shell Integration says done — use native tree check to verify instantly
            const completion = await isCommandComplete(state.pid);

            if (completion.method === 'native' && completion.done) {
              console.log(`[MultiTerminalController] Native: no children alive for "${state.name}" — resolving as completed`);
              resolveOnce({
                status: 'completed',
                output: cleaned,
                exitCode: state.exitCode,
                pid: state.pid,
                name: state.name,
              });
              return;
            }

            // Native says children still running — keep waiting
            if (completion.method === 'native' && !completion.done) {
              return;
            }

            // Heuristic fallback: wait for output to settle
            if (completedAt === null) {
              completedAt = Date.now();
              console.log(`[MultiTerminalController] Execution count 0 for "${state.name}", waiting for output to settle...`);
              return;
            }

            if (msSinceLastOutput >= OUTPUT_SETTLE_MS) {
              console.log(`[MultiTerminalController] Output settled for "${state.name}" — resolving`);
              resolveOnce({
                status: 'completed',
                output: cleaned,
                exitCode: state.exitCode,
                pid: state.pid,
                name: state.name,
              });
              return;
            }
          } else if (state.executionCount > 0) {
            // Shell Integration says executions still running — but check native tree
            const completion = await isCommandComplete(state.pid);

            if (completion.method === 'native' && completion.done) {
              // Shell Integration is lagging — native confirms no children
              // Give a brief moment for Shell Integration to catch up
              if (completedAt === null) {
                completedAt = Date.now();
                return;
              }
              if (Date.now() - completedAt >= NATIVE_STDIN_SETTLE_MS) {
                console.log(`[MultiTerminalController] Native: tree empty for "${state.name}" (shell integration lagging) — resolving`);
                resolveOnce({
                  status: 'completed',
                  output: cleaned,
                  exitCode: state.exitCode,
                  pid: state.pid,
                  name: state.name,
                });
                return;
              }
            } else {
              // Children still running — reset completedAt tracker
              completedAt = null;
            }
          }
        })();
      }, POLL_INTERVAL_MS);

      // Timeout fallback
      const timeoutTimer = setTimeout(() => {
        // Use async IIFE for native detection
        void (async () => {
          const cleaned = cleanTerminalOutput(state.output);
          const msSinceLastOutput = Date.now() - state.lastOutputTime;
          
          // Check for waiting_for_input using native detection with fallback
          const detection = await isWaitingForInputDetection(
            state.pid,
            state.executionCount,
            msSinceLastOutput,
            state.output.length > 0
          );

          console.log(`[MultiTerminalController] Timeout for "${state.name}" after ${timeoutMs}ms (waitingForInput: ${detection.waiting} via ${detection.method})`);

          resolveOnce({
            status: 'timeout',
            output: cleaned,
            exitCode: state.exitCode,
            prompt: detection.waiting
              ? cleaned.split('\n').filter(l => l.trim()).pop()
              : undefined,
            pid: state.pid,
            name: state.name,
          });
        })();
      }, timeoutMs);
    });
  }

  private waitForShellIntegration(state: InternalState, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (state.shellIntegration) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        console.log(`[MultiTerminalController] Shell integration timeout for "${state.name}" — using sendText fallback`);
        resolve();
      }, timeoutMs);

      const disposable = vscode.window.onDidChangeTerminalShellIntegration((event) => {
        if (event.terminal === state.terminal) {
          clearTimeout(timer);
          state.shellIntegration = event.shellIntegration;
          disposable.dispose();
          resolve();
        }
      });

      this.disposables.push(disposable);
    });
  }

  private getWorkspaceCwd(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    return undefined;
  }
}
