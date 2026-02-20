# Blueprint: Enhanced Terminal System v2

## Overview

Transform the terminal tools from a "start and poll" model to a **deterministic, blocking execution** model that mirrors human interaction. The system will:

1. **Wait for true completion** before returning to Copilot
2. **Track all child processes** spawned by terminal commands
3. **Persist process history** across sessions
4. **Detect zombie/orphan processes** from previous sessions

---

## Architecture Principles

- **Deterministic**: Copilot sends command → waits → gets complete result
- **Omniscient**: Full visibility into process trees, child processes, cascading commands
- **Persistent**: Cross-session memory of all processes started/stopped
- **Windows-First**: Native Windows APIs via PowerShell initially

---

## Phase 1: Core Completion Detection ✅ PRIORITY

### Goal
Replace the current "return immediately with 'running'" behavior with blocking execution that waits for true completion.

### Detection Strategy

```
Command Sent
    │
    ▼
┌─────────────────────────────────────────────┐
│  ACCUMULATE OUTPUT (streaming)              │
│  via onDidStartTerminalShellExecution       │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  EXIT CODE RECEIVED                         │
│  via onDidEndTerminalShellExecution         │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  GRACE PERIOD (3000ms)                      │
│  - Watch for new executions starting        │
│  - If new execution starts → reset & wait   │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  SHELL PROMPT CONFIRMATION                  │
│  - Detect PS C:\>, $, etc. in output        │
│  - Confirms shell is truly idle             │
└─────────────────────────────────────────────┘
    │
    ▼
RETURN TO COPILOT with full output
```

### Wait Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `completion` | Block until fully done (default) | Build tasks, installs |
| `background` | Return immediately | Dev servers, watchers |

### API Changes

```typescript
interface TerminalRunOptions {
  command: string;
  timeout?: number;           // Default: 120000 (2 min)
  name?: string;              // Terminal name, default: 'default'
  waitMode?: 'completion' | 'background';  // Default: 'completion'
}

interface TerminalRunResult {
  status: 'completed' | 'running' | 'waiting_for_input' | 'timeout';
  output: string;
  exitCode?: number;
  prompt?: string;            // If waiting_for_input
  pid?: number;
  name?: string;
  durationMs?: number;        // How long the command ran
}
```

### Return Conditions

| Condition | Status Returned | Includes |
|-----------|-----------------|----------|
| Exit code + grace period + prompt | `completed` | Full output, exitCode |
| Interactive prompt detected | `waiting_for_input` | Output so far, prompt text |
| Timeout expired | `timeout` | Output so far, no exitCode |
| Background mode | `running` | Partial output, pid |

### Shell Prompt Patterns (Windows PowerShell Focus)

```typescript
const SHELL_PROMPT_PATTERNS = [
  // PowerShell
  /^PS [A-Z]:\\.*>\s*$/m,            // PS C:\path>
  /^PS>\s*$/m,                        // PS>
  
  // CMD (if PowerShell spawns it)
  /^[A-Z]:\\[^>]*>\s*$/m,            // C:\path>
  
  // Bash/WSL (if used within PowerShell)
  /^\$\s*$/m,                         // $
  /^[a-z]+@[^:]+:[^$#]*[$#]\s*$/m,   // user@host:path$
];
```

### Implementation Location

- `extension/services/singleTerminalController.ts`:
  - Add `gracePeriodMs` constant (3000)
  - Add `waitMode` handling
  - Modify `waitForResult()` to implement grace period
  - Add shell prompt detection
  - Track execution count for cascading detection

---

## Phase 2: Child Process Monitoring (Windows)

### Goal
Track all child processes spawned by any terminal command, providing "full omniscience" over the process tree.

### Strategy: PowerShell Process Tree Enumeration

Use Windows CIM/WMI to query process relationships:

```powershell
# Get all child processes of a given PID
function Get-ProcessTree {
    param([int]$ParentPid)
    
    $children = Get-CimInstance Win32_Process | 
        Where-Object { $_.ParentProcessId -eq $ParentPid }
    
    foreach ($child in $children) {
        [PSCustomObject]@{
            Pid = $child.ProcessId
            Name = $child.Name
            CommandLine = $child.CommandLine
            ParentPid = $child.ParentProcessId
        }
        # Recurse for grandchildren
        Get-ProcessTree -ParentPid $child.ProcessId
    }
}
```

### Data Model

```typescript
interface TrackedProcess {
  pid: number;
  name: string;
  commandLine: string;
  parentPid: number;
  terminalName: string;           // Which MCP terminal spawned this
  startedAt: string;              // ISO timestamp
  endedAt?: string;               // ISO timestamp when killed/exited
  exitCode?: number;
  status: 'running' | 'completed' | 'killed' | 'orphaned';
}

interface ProcessTree {
  root: TrackedProcess;           // The shell process
  children: TrackedProcess[];     // All descendant processes
}
```

### Polling Strategy

1. **On command start**: Record shell PID
2. **Periodic poll** (every 2 seconds while command runs): Query process tree
3. **On command end**: Final snapshot of all children
4. **Track new children**: Compare snapshots, detect spawned processes

### API Extension

```typescript
// New MCP tool: Get process tree for a terminal
interface ProcessTreeResult {
  terminalName: string;
  rootPid: number;
  processes: TrackedProcess[];
  totalCount: number;
}
```

### Implementation Location

- `extension/services/processTreeMonitor.ts` (new file):
  - `getProcessTree(pid: number): Promise<TrackedProcess[]>`
  - `startMonitoring(terminalName: string, shellPid: number)`
  - `stopMonitoring(terminalName: string)`
  - PowerShell execution via VS Code terminal or `child_process`

---

## Phase 3: Process Persistence

### Goal
Maintain a persistent log of all processes started/stopped across sessions, enabling orphan detection.

### Storage Location

```
.devtools/
├── process-log.jsonl      # Append-only log of all process events
├── active-processes.json  # Currently running processes (rebuilt on startup)
└── sessions/
    └── {session-id}.json  # Per-session process summary
```

### Event Log Format (JSONL)

```json
{"event":"started","pid":1234,"name":"node.exe","cmd":"npm run dev","terminal":"dev-server","ts":"2024-01-15T10:30:00Z","sessionId":"abc123"}
{"event":"spawned","pid":1235,"parentPid":1234,"name":"esbuild.exe","terminal":"dev-server","ts":"2024-01-15T10:30:01Z","sessionId":"abc123"}
{"event":"completed","pid":1234,"exitCode":0,"ts":"2024-01-15T10:35:00Z","sessionId":"abc123"}
{"event":"killed","pid":1235,"ts":"2024-01-15T10:35:00Z","sessionId":"abc123"}
```

### Orphan Detection

On extension activation:
1. Load `active-processes.json`
2. For each PID, check if process still exists via `Get-Process -Id $pid -ErrorAction SilentlyContinue`
3. If exists but no associated terminal → mark as `orphaned`
4. Optionally prompt user or auto-kill orphans

### API Extensions

```typescript
// New MCP tools
interface ListProcessesResult {
  active: TrackedProcess[];
  orphaned: TrackedProcess[];
}

interface KillOrphansResult {
  killed: number[];
  failed: number[];
}
```

---

## Phase 4: Technology Stack Detection

### Goal
Auto-detect workspace technologies to understand expected process patterns.

### Detection Matrix

| File | Stack | Expected Processes |
|------|-------|-------------------|
| `package.json` | Node.js | node, npm, npx |
| `pnpm-lock.yaml` | pnpm | pnpm, node |
| `bun.lockb` | Bun | bun |
| `deno.json` | Deno | deno |
| `Cargo.toml` | Rust | cargo, rustc |
| `pyproject.toml` | Python | python, pip, poetry |
| `go.mod` | Go | go |
| `tsconfig.json` | TypeScript | tsc, ts-node |

### Process Signature Mapping

```typescript
interface StackDefinition {
  name: string;
  detectionFiles: string[];
  processPatterns: RegExp[];      // Expected process names
  devServerPatterns: RegExp[];    // Patterns that indicate long-running dev server
}

const STACKS: StackDefinition[] = [
  {
    name: 'pnpm',
    detectionFiles: ['pnpm-lock.yaml'],
    processPatterns: [/pnpm\.exe/, /node\.exe/],
    devServerPatterns: [/dev|watch|serve|start/],
  },
  // ... more stacks
];
```

### Workspace Analysis API

```typescript
interface WorkspaceAnalysis {
  detectedStacks: string[];
  projectRoot: string;
  expectedProcesses: string[];
}
```

---

## Phase 5: Future - Cross-Platform Support

### Linux/macOS Adaptations

| Feature | Windows | Linux/macOS |
|---------|---------|-------------|
| Process tree | `Get-CimInstance Win32_Process` | `pstree`, `/proc/{pid}/children` |
| Kill process | `Stop-Process -Id` | `kill -9` |
| Shell prompts | PowerShell patterns | Bash/Zsh patterns |
| Path separators | `\` | `/` |

### Abstraction Layer

```typescript
interface ProcessMonitor {
  getProcessTree(pid: number): Promise<TrackedProcess[]>;
  killProcess(pid: number): Promise<boolean>;
  isProcessRunning(pid: number): Promise<boolean>;
}

// Implementations
class WindowsProcessMonitor implements ProcessMonitor { ... }
class UnixProcessMonitor implements ProcessMonitor { ... }
```

---

## Implementation Order

### Iteration 1 ✅ COMPLETED (2026-02-13)
- [x] Phase 1: Core completion detection
  - [x] Add 3000ms grace period
  - [x] Add shell prompt detection
  - [x] Add `waitMode` parameter
  - [x] Update default timeout to 120 seconds
  - [x] Track execution count for cascading
  - [x] Update MCP tool schemas
  - [x] Add `durationMs` to results
  - [x] Add `timeout` status for expired waits

### Iteration 1.5 ✅ COMPLETED (2026-02-13)
- [x] Process Ledger (simplified Phase 2)
  - [x] `ActiveProcess` interface in singleTerminalController.ts
  - [x] `getActiveProcessSummary()` method returns all tracked processes
  - [x] `withProcessSummary()` attaches ledger to every terminal result
  - [x] Process states: `running`, `completed`, `killed`
  - [x] Updated MCP `TerminalRunResult` with `activeProcesses[]`
  - [x] Updated `formatTerminalResult()` with running/completed process sections
  - [x] **Purpose**: Copilot accountability - constant reminder of managed processes

### Iteration 1.6 ✅ COMPLETED (2026-02-13)  
- [x] Hot-Reload CDP Fix
  - [x] Root cause: `isPortResponding()` only checked TCP, but CDP needs HTTP
  - [x] Added `isCdpPortReady()` that fetches `/json/version` endpoint
  - [x] Updated `waitForClientReady()` to use HTTP verification
  - [x] **Verified working**: MCP detects changes → Host rebuilds → CDP reconnects

### Iteration 2 ✅ COMPLETED (2026-02-14)
- [x] Phase 2: Child process monitoring (merged into ProcessLedger)
  - [x] Added `ChildProcessInfo` interface to `processLedger.ts`
  - [x] Added `children?: ChildProcessInfo[]` to `ProcessEntry`
  - [x] PowerShell CIM tree query via `Get-CimInstance Win32_Process` (recursive BFS)
  - [x] Using `-EncodedCommand` to avoid shell escaping issues
  - [x] Child cache with 5-second TTL to avoid hammering PowerShell
  - [x] `refreshActiveChildren()` called before every ledger retrieval
  - [x] `getLedger()` populates children from cache for all active/orphaned entries
  - [x] Child processes shown in every MCP response (via existing ledger attachment)
  - [x] `list_processes` tool shows full child process trees
  - [x] Windows-only (returns empty on other platforms)
  - [x] **Key Design**: No separate tool — enhanced existing process monitoring system

### Iteration 3 ✅ COMPLETED (2026-02-13)
- [x] Phase 3: Process persistence + Global Accountability
  - [x] Created `processLedger.ts` service in extension
  - [x] JSONL persistence to `.devtools/process-log.jsonl`
  - [x] `active-processes.json` for quick orphan detection on startup
  - [x] Orphan detection: loads previous session's processes, checks if PIDs still exist
  - [x] Process events logged: `started`, `completed`, `killed`
  - [x] **Global ledger attachment**: Every MCP tool response includes process ledger
  - [x] New RPC handlers: `system.getProcessLedger`, `process.kill`, `process.killOrphans`
  - [x] New MCP tools:
    - [x] `kill_process` — Kill any PID (active or orphaned)
    - [x] `kill_orphans` — Kill all orphaned processes at once
    - [x] `list_processes` — Detailed view of all tracked processes
  - [x] Integration with `singleTerminalController.ts` for event logging
  - [x] **Key Design**: Ledger appears in EVERY tool response, not just terminal tools

### Iteration 4 (Future)
- [ ] Phase 4: Technology stack detection
  - [ ] Workspace file scanning
  - [ ] Stack definition database
  - [ ] Process pattern matching

### Future
- [ ] Phase 5: Cross-platform (Linux/macOS)

---

## Testing Strategy

### Phase 1 Tests
1. **Simple command**: `echo hello` → returns `completed` immediately
2. **Long build**: `npm run build` → blocks until done, returns full output
3. **Chained commands**: `echo a && echo b && echo c` → waits for all
4. **Interactive prompt**: `Read-Host "Yes?"` → returns `waiting_for_input`
5. **Timeout**: Command exceeds timeout → returns `timeout` with partial output
6. **Background mode**: Dev server → returns `running` immediately

### Phase 2 Tests
1. **npm run dev**: Track Node + spawned processes
2. **Multi-process build**: Detect all child processes
3. **Nested spawning**: Script that spawns scripts

### Phase 3 Tests
1. **Session persistence**: Start process → reload extension → detect orphan
2. **Clean shutdown**: Kill all children when terminal closed
3. **Log integrity**: Events correctly logged to JSONL

---

## Dependencies

- VS Code Shell Integration API (existing)
- PowerShell 5.1+ (for CIM commands)
- Windows only (Phase 5 for cross-platform)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| PowerShell CIM queries slow | Cache process tree, rate-limit polling |
| Too many child processes | Limit tree depth, skip system processes |
| Orphan detection false positives | Require PID + command match |
| Shell prompt patterns miss edge cases | Allow custom patterns, log unmatched |

---

## Success Criteria

1. **Deterministic execution**: Copilot gets complete output in one call
2. **No zombie processes**: All spawned processes tracked and killable
3. **Session continuity**: Pick up where we left off across reloads
4. **Zero manual polling**: No more `wait` + `terminal_state` loops

---

*Blueprint Version: 1.0*
*Created: 2026-02-13*
*Platform: Windows (PowerShell)*
