# Hot-Reload System Redesign

## Problem Statement

The current hot-reload system has three fundamental issues:

1. **Mtime-based detection produces false positives.** Any operation that touches file metadata — `git add`, `git checkout`, opening a file in VS Code's git diff view, touching a file — triggers an unnecessary rebuild and server restart, even though the file contents haven't changed.

2. **Duplicated detection logic with wrong authority.** Two independent watcher implementations (`extension-watcher.ts` and `mcp-server-watcher.ts`) each implement their own mtime scanning, content hashing, fingerprint storage, ignore-rule parsing, and glob-to-regex conversion. The MCP server does its own hashing and build triggering, even though the extension host is the one that actually performs builds and restarts. This split creates confusion about who is responsible for what.

3. **No request pipeline.** When multiple tool calls arrive in parallel and one determines a hot-reload is needed, the remaining parallel calls don't have a unified mechanism to be notified and cancelled. This causes cascading race conditions — multiple redundant hot-reload checks, multiple restart RPCs to the host, and multiple Client window restarts.

## Current Architecture (What's Wrong)

```
┌─────────────────────────────────────────────────┐
│  MCP Server (main.ts)                           │
│                                                 │
│  On every tool call:                            │
│  ┌─────────────────────────────────────────┐    │
│  │ hotReloadMutex                          │    │
│  │  1. hasMcpServerSourceChanged()         │──► mcp-server-watcher.ts
│  │     (mtime src/ vs build/src/)          │    │   ← WRONG: MCP shouldn't hash
│  │     (content hash if mtime says stale)  │    │   ← WRONG: mtime-based gate
│  │  2. hasBuildChangedSinceProcessStart()  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ extHotReloadMutex                       │    │
│  │  1. isBuildStale()                      │──► extension-watcher.ts
│  │     (mtime ext/ vs ext/dist/)           │    │   ← WRONG: duplicated logic
│  │     (content hash if mtime says stale)  │    │   ← WRONG: MCP shouldn't do this
│  │  2. hasBuildChangedSinceWindowStart()   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Each check runs independently per tool call    │
│  No request queue — parallel calls race         │
│  MCP does its own rebuild (exec tsc)  ← WRONG  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Extension Host (host-handlers.ts)              │
│                                                 │
│  On mcpReady:                                   │
│  - scanNewestSourceMtime() (THIRD mtime impl)   │
│  - scanNewestBuildMtime()  (FOURTH mtime impl)  │
│  - isBuildStale()   ← WRONG: more mtime logic   │
│  - ensureBuildUpToDate() → runExtBuild()        │
│                                                 │
│  On restartMcpServer:                           │
│  - No deduplication guard                       │
│  - Multiple parallel calls → multiple restarts  │
└─────────────────────────────────────────────────┘
```

### Files to be replaced/eliminated

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `mcp-server/src/mcp-server-watcher.ts` | ~430 | MCP server self-reload detection | **DELETE** |
| `mcp-server/src/extension-watcher.ts` | ~430 | Extension reload detection | **DELETE** |
| `extension/host-handlers.ts` lines 35-135 | ~100 | Extension build staleness (4 functions) | **DELETE** |

## Proposed Architecture

### Design Principles

1. **Extension is the single authority.** The extension host owns ALL change detection, hashing, building, and restart orchestration. The MCP server never hashes files.
2. **Content-hash only.** Hash the actual bytes of source files via `readFileSync()`. No mtime. No file metadata. Only the content matters.
3. **Config-driven.** Source/build directories are declared in `.devtools/host.config.jsonc`, not hardcoded.
4. **Request pipeline.** A centralized request pipeline in the MCP server serializes all tool calls. Before executing, the first tool in a batch asks the extension "has anything changed?" The extension's answer determines whether the batch proceeds or gets cancelled.
5. **Graceful handoff.** When a restart is needed, the MCP server drains its queue (cancelling remaining requests with a clear message), then signals the extension that it's ready to be killed.

### Two Change Scenarios

#### Scenario A: MCP Server Source Changed

```
Copilot ──► MCP Server ──► Extension Host
               │                │
               │   "check for   │
               │    changes"    │
               │ ──────────────►│
               │                │ Hash mcp-server/src/ contents
               │                │ Compare vs stored hash
               │                │ CHANGED!
               │                │
               │                │ Rebuild mcp-server/src/ (tsc)
               │                │ Store new hash
               │                │
               │   "mcp source  │
               │    rebuilt,    │
               │    restart     │
               │    required"   │
               │ ◄──────────────│
               │                │
               │ Drain queue:   │
               │ Cancel B,C,D   │
               │ with "server   │
               │ restarting"    │
               │                │
               │   "ready to    │
               │    restart"    │
               │ ──────────────►│
               │                │ Stop MCP server (VS Code MCP command)
               │                │ Clear MCP tool cache
               │                │ Start MCP server
```

Key points:
- The extension rebuilds the MCP server source **before** responding to the RPC, so the build is already done by the time the restart happens.
- The extension uses the VS Code MCP server command to stop the server (not `process.exit()`).
- Tool cache is cleared **before** starting the new MCP server.
- The tool call that triggered the check returns a "server is restarting" message to Copilot. Copilot can then call the `mcpStatus` LM tool with an empty input so it waits for the restart to complete.

#### Scenario B: Extension Source Changed

```
Copilot ──► MCP Server ──► Extension Host
               │                │
               │   "check for   │
               │    changes"    │
               │ ──────────────►│
               │                │ Hash extension/ contents
               │                │ Compare vs stored hash
               │                │ CHANGED!
               │                │
               │                │ Rebuild extension
               │                │ Restart Client window
               │                │ Wait for Client ready
               │                │ Store new hash
               │                │
               │   "extension   │
               │    updated,    │
               │    Client      │
               │    reloaded"   │
               │ ◄──────────────│
               │                │
               │ Include status │
               │ in tool output │
               │                │
               │ Execute tool   │
               │ normally       │
```

The tool call completes normally — no MCP restart needed. The tool response includes a note that the extension was updated.

#### Scenario C: Both Changed

```
Same as Scenario B first (extension rebuilds inline),
then Scenario A (MCP source triggers restart).
Extension checks both in order: extension first, then MCP.
```

#### Scenario D: Nothing Changed

```
Copilot ──► MCP Server ──► Extension Host
               │                │
               │   "check for   │
               │    changes"    │
               │ ──────────────►│
               │                │ Hash both source dirs
               │                │ Both match stored hashes
               │   "no changes" │
               │ ◄──────────────│
               │                │
               │ Execute tool   │
               │ normally       │
```

### System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  MCP Server                                                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  RequestPipeline                                         │    │
│  │                                                          │    │
│  │  All tool calls are serialized into a FIFO queue.        │    │
│  │                                                          │    │
│  │  Per-batch behavior:                                     │    │
│  │  - First tool in a batch → asks extension "changed?"     │    │
│  │  - Remaining tools in same batch → skip check            │    │
│  │  - Queue drains to empty → next batch re-checks          │    │
│  │                                                          │    │
│  │  On restart signal:                                      │    │
│  │  - All queued tools get resolved with "restarting" msg   │    │
│  │  - Pipeline sends "ready to restart" to extension        │    │
│  │  - Extension stops MCP → clears cache → starts MCP       │    │
│  │    (build already done — extension rebuilt before responding) │  │
│  │                                                          │    │
│  │  MCP server does NO hashing. NO building.                │    │
│  │  It only asks and responds to the extension.             │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Extension Host (Single Authority)                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  HotReloadService                                        │    │
│  │                                                          │    │
│  │  Content-hash change detection:                          │    │
│  │  - Source files discovered via tsconfig.json patterns    │    │
│  │    using vscode.workspace.findFiles(RelativePattern)     │    │
│  │  - tsconfig parsed via ts.readConfigFile() (native TS)   │    │
│  │  - Hash = SHA-256 of sorted (relativePath + fileBytes)   │    │
│  │  - NO mtime. NO file metadata. Content bytes only.       │    │
│  │  - NO .devtoolsignore — tsconfig include/exclude only    │    │
│  │                                                          │    │
│  │  Stored hashes:                                          │    │
│  │  - VS Code workspaceState (workspace-scoped, persists)   │    │
│  │  - One hash per package root                             │    │
│  │  - Written after each successful build                   │    │
│  │                                                          │    │
│  │  RPC handler: "checkForChanges"                          │    │
│  │  → Hashes mcp-server/src/ and extension/ contents        │    │
│  │  → Compares to stored hashes                             │    │
│  │  → Returns: { mcpChanged, extChanged }                   │    │
│  │  → If extChanged: rebuilds extension inline, returns     │    │
│  │    { extChanged: true, extRebuilt: true }                │    │
│  │  → If mcpChanged: rebuilds MCP source first, then        │    │
│  │    returns { mcpChanged: true, mcpRebuilt: true }        │    │
│  │    (MCP server handles graceful shutdown, build is done)  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Restart Guard                                           │    │
│  │                                                          │    │
│  │  RPC handler: "readyToRestart"                           │    │
│  │  → MCP server says "I've drained my queue, stop me"      │    │
│  │  → Extension: stop MCP (VS Code command) → clear tool    │    │
│  │    cache → start MCP (build already done)                │    │
│  │  → Deduplication: if restart already in progress,        │    │
│  │    subsequent calls wait for it                          │    │
│  │                                                          │    │
│  │  Progress notification (withProgress) shows status        │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Configuration

Extend the existing `.devtools/host.config.jsonc` with a `hotReload` section:

```jsonc
{
  // ── Existing fields ──────────────────────────────────────
  "clientWorkspace": "../test-workspace",
  "extensionPath": "../extension",
  "mcpServerRoot": ".",                           // Root of the MCP server package (where package.json/tsconfig live)
                                                  // Relative to host.config.jsonc location, or absolute.
                                                  // Defaults to auto-detected from MCP server __dirname if omitted.

  // ── Hot-reload configuration ─────────────────────────────
  "hotReload": {
    // Master switch — set false to disable all hot-reload checks
    "enabled": true,

    // The MCP server name as defined in .vscode/mcp.json
    // Used to construct the VS Code server definition ID
    "mcpServerName": "vscode-devtools",

    // Delay (ms) between stopping and starting MCP server during restart
    "restartDelay": 2000,

    // Max wait time (ms) for mcpStatus LM tool before timeout
    "mcpStatusTimeout": 60000
  }
}
```

**Source file discovery is fully automatic:**
- **MCP server source**: Parsed from `tsconfig.build.json` (preferred) or `tsconfig.json` in the configured `mcpServerRoot` (or auto-detected from MCP server `__dirname` if omitted). The `include` and `exclude` patterns define exactly which files to hash.
- **Extension source**: Parsed from `tsconfig.json` in the configured `extensionPath`. Same `include`/`exclude` pattern-based discovery.
- **Build commands**: Run the existing `build` script (MCP server) or `compile` script (extension) from each package's `package.json`. Package manager is auto-detected from lockfiles (`pnpm-lock.yaml` → pnpm, `package-lock.json` → npm, `yarn.lock` → yarn).
- **No `.devtoolsignore`** — tsconfig patterns are the single source of truth for which files constitute "source code."
- **No custom `sourceDir`, `buildDir`, or `buildCommand` config** — these are derived from tsconfig and package.json, which already define the project structure.

**Native APIs used:**
- `vscode.workspace.findFiles(RelativePattern)` — file discovery using tsconfig glob patterns
- `ts.readConfigFile()` — tsconfig parsing (handles `extends`, comments, defaults)
- `context.workspaceState` — hash persistence (workspace-scoped, survives reloads)
- `crypto.createHash('sha256')` — content hashing
- `fs.readFileSync()` — reading raw file bytes for hashing

**All fields are optional.** When omitted, the defaults shown above are used. Existing setups work without any config changes.

#### Message Templates (Deferred)

Message templates (`messages` section) and tool defaults (`toolDefaults` section) are **deferred to a future iteration**. For now, all hot-reload messages are hardcoded as constants in `requestPipeline.ts`:

- `RESTART_MESSAGE` — tells Copilot to call `mcpStatus` tool
- `BUILD_FAILURE_MESSAGE` — includes full error output
- `RESTARTING_QUEUED_MESSAGE` — for cancelled queued tools

**Planned message template variables (future):**
- `{error}` — build error output (stderr from tsc or npm run compile)
- `{timeout}` — timeout duration in milliseconds

### New Files

#### 1. `extension/services/hotReloadService.ts`

Lives entirely in the extension. The MCP server never imports this.

```typescript
interface ChangeCheckResult {
  mcpChanged: boolean;
  mcpRebuilt: boolean;       // true if MCP source was rebuilt (build ready for restart)
  mcpBuildError: string | null; // Build error output if MCP rebuild failed (tsc errors, etc.)
  extChanged: boolean;
  extRebuilt: boolean;       // true if extension was rebuilt inline
  extBuildError: string | null; // Build error output if extension rebuild failed
  extClientReloaded: boolean; // true if Client window was restarted
}

class HotReloadService {
  constructor(private workspaceState: vscode.Memento) {}

  /**
   * Discover source files using tsconfig.json patterns.
   * 
   * Reads the package's tsconfig (tsconfig.build.json preferred, tsconfig.json fallback)
   * using ts.readConfigFile() to parse include/exclude patterns.
   * Uses vscode.workspace.findFiles(RelativePattern) to discover matching files.
   * 
   * This is fully automatic — no sourceDir config needed.
   */
  async discoverSourceFiles(packageRoot: string): Promise<vscode.Uri[]>;

  /**
   * Compute SHA-256 fingerprint of all source files.
   * Reads file CONTENTS via readFileSync — no metadata involved.
   * Files are sorted by relative path for deterministic output.
   * Each file contributes: relativePath + rawFileBytes to the hash.
   */
  computeContentHash(packageRoot: string, files: vscode.Uri[]): string;

  /**
   * Read the stored hash for a given package root.
   * Uses VS Code workspaceState for persistence.
   */
  getStoredHash(key: string): string | undefined;

  /**
   * Store the hash after a successful build.
   */
  setStoredHash(key: string, hash: string): Thenable<void>;

  /**
   * Detect the package manager by checking for lockfiles.
   * pnpm-lock.yaml → pnpm, package-lock.json → npm, yarn.lock → yarn.
   */
  detectPackageManager(packageRoot: string): 'pnpm' | 'npm' | 'yarn';

  /**
   * Run the build script from package.json using the detected package manager.
   * Returns the build output (stderr) on failure, null on success.
   */
  async runBuild(packageRoot: string, scriptName: string): Promise<string | null>;

  /**
   * Main entry point: check both MCP server and extension source.
   * Checks extension first, then MCP.
   * If extension changed → rebuild inline, restart Client, wait for ready.
   * If MCP changed → rebuild MCP source immediately, return { mcpChanged: true, mcpRebuilt: true }.
   *   (MCP server handles graceful shutdown; build is already done so restart is near-instant.)
   */
  async checkForChanges(mcpServerRoot: string, extensionRoot: string): Promise<ChangeCheckResult>;
}
```

**Key design decisions:**
- **Source file discovery uses native APIs**: `ts.readConfigFile()` parses tsconfig patterns; `vscode.workspace.findFiles(RelativePattern)` discovers matching files. No custom glob walker, no `.devtoolsignore`, no hardcoded exclude rules.
- **Content hash uses `readFileSync()`** which returns the file's byte content — no mtime, no permissions, no metadata.
- **Stored hashes use VS Code's `context.workspaceState`** (survives window reloads, scoped to workspace).
- **Build commands use existing `package.json` scripts** (`build` for MCP server, `compile` for extension). Package manager auto-detected from lockfiles.
- The extension rebuilds itself inline when its source changed — the MCP server's tool call waits for this and then proceeds normally.
- **Build errors are captured and returned in the response.** If the build fails, the full error output (stderr) is returned in `mcpBuildError` or `extBuildError`. The MCP server forwards this to Copilot in the tool response so Copilot can see exactly what went wrong and fix it.

#### 2. `mcp-server/src/services/requestPipeline.ts`

Manages the sequential execution of ALL tool calls with hot-reload awareness.
Replaces ALL 4 mutexes (`toolMutex`, `codebaseMutex`, `hotReloadMutex`, `extHotReloadMutex`)
with a single unified FIFO queue.

**Architecture note:** Both the stdio MCP server (Copilot) and the inspector HTTP server
(MCP Inspector browser) submit tool calls to the SAME pipeline instance. This tethers
them together — hot-reload detection, restart signals, and serialization apply uniformly
to ALL tool calls regardless of which transport they arrived on.

```
Single Process: node mcp-server
├── stdio transport (stdin/stdout) → VS Code/Copilot  ─┐
├── HTTP server (port 6274) → MCP Inspector browser   ─┤── shared RequestPipeline
├── Host pipe client (named pipe) → Extension Host      │
└── Services (lifecycle, CDP, etc.)                     ┘
```

```typescript
interface PipelineEntry {
  toolName: string;
  execute: () => Promise<CallToolResult>;
  resolve: (result: CallToolResult) => void;
  reject: (error: Error) => void;
}

class RequestPipeline {
  private queue: PipelineEntry[] = [];
  private processing = false;
  private restartScheduled = false;
  private batchChecked = false;  // Reset when queue drains to empty

  /**
   * Submit a tool call to the pipeline.
   * Returns a promise that resolves with the tool's result,
   * or with a "server restarting" message if cancelled.
   *
   * ALL tool calls go through this — standard tools, codebase tools,
   * standalone tools, and inspector tools. The pipeline is the single
   * serialization mechanism (replaces all 4 old mutexes).
   *
   * Timeout behavior: The execute() function should apply its own
   * timeout AFTER being called by the pipeline. This means queue wait
   * time and hot-reload check time are NEVER counted against the
   * tool's timeout budget. This applies to ALL tools uniformly
   * (previously only codebase tools had this exemption).
   */
  submit(toolName: string, execute: () => Promise<CallToolResult>): Promise<CallToolResult>;

  /**
   * Signal that a restart is needed.
   * - Sets restartScheduled = true
   * - Resolves all queued entries with "server restarting" message
   * - Sends "readyToRestart" RPC to extension after current tool completes
   * - Closes the inspector HTTP server cleanly (prevents port conflicts)
   * - Calls process.exit(0)
   */
  signalRestart(reason: string): void;
}
```

**Unified timeout model:**

Previously, there were 4 separate mutexes with inconsistent timeout behavior:
- `toolMutex` — standard tools: timeout counted from entry (included queue wait)
- `codebaseMutex` — codebase tools: timeout started AFTER mutex acquisition
- `hotReloadMutex` — serialized hot-reload checks
- `extHotReloadMutex` — serialized extension reload checks

Now ALL tools use the pipeline, and the timeout starts AFTER the pipeline
calls `execute()`. This means:
1. Tool enters queue → no timeout yet
2. Waits in queue → no timeout yet
3. Pipeline dequeues → hot-reload check if needed → no timeout yet
4. Pipeline calls `execute()` → **timeout starts now**
5. Tool runs → timeout applies

This gives ALL tools the same queue-wait exemption that codebase tools previously
had as a special case. Simple, consistent, and correct.

**Per-batch logic:**

1. Copilot sends 4 tool calls simultaneously → all 4 enter the queue
2. Pipeline picks up #1 → `batchChecked` is false → asks extension "checkForChanges" → extension says "no changes" → `batchChecked = true` → executes tool #1
3. Pipeline picks up #2 → `batchChecked` is true → **skips check** → executes tool #2
4. Pipeline picks up #3, #4 → same as #2
5. Queue is now empty → `batchChecked = false`
6. Copilot sends 1 more tool call 200ms later → queue was empty → `batchChecked` is false → asks extension again

**On restart:**
1. Tool #1 asks extension → "MCP source changed!" → `signalRestart("mcp source changed")`
2. Tools #2, #3, #4 still queued → all resolved immediately with "⚡ MCP server is restarting…"
3. Tool #1's response includes the restart message
4. Pipeline sends `readyToRestart` RPC to extension
5. Pipeline closes inspector HTTP server (frees port 6274)
6. Pipeline calls `process.exit(0)` after brief flush delay
7. Extension stops MCP server (VS Code command) → clears tool cache → starts MCP server (build already done)
8. Inspector browser window auto-reconnects to new process's HTTP server

### RPC Changes

#### New RPC: `checkForChanges`

**Direction:** MCP Server → Extension Host

**Request:**
```typescript
{
  mcpServerRoot: string;    // Absolute path to mcp-server/ package root
  extensionPath: string;    // Absolute path to extension/ root
}
```

**Response:**
```typescript
{
  mcpChanged: boolean;      // MCP server source content changed
  mcpRebuilt: boolean;      // MCP server was rebuilt (build ready for restart)
  mcpBuildError: string | null; // Build error output (tsc stderr) if rebuild failed
  extChanged: boolean;      // Extension source content changed
  extRebuilt: boolean;      // Extension was rebuilt inline
  extBuildError: string | null; // Build error output if extension rebuild failed
  extClientReloaded: boolean; // Client window was restarted
}
```

#### Modified RPC: `restartMcpServer` → `readyToRestart`

**Direction:** MCP Server → Extension Host

**Semantics change:** Previously the MCP server told the extension "restart me now." Now the MCP server says "I've drained my queue and I'm ready to be killed." The extension then:
1. Stops the MCP server (via VS Code MCP command)
2. Clears the MCP tool cache
3. Starts the MCP server (build was already done during `checkForChanges`)
4. Shows progress notification (single `withProgress` bar, auto-clears after 5s)

Since the extension already rebuilt the MCP source during the `checkForChanges` RPC, the restart is near-instant — just stop → clear cache → start.

The deduplication guard ensures that if multiple `readyToRestart` calls arrive (shouldn't happen with the pipeline, but defense in depth), only the first one triggers the restart.

#### Removed RPC: `showNotification`

No longer needed — the extension handles all notification display internally.

### LM Tool: `mcpStatus`

A VS Code Language Model Tool (registered via `vscode.lm.registerTool` on the extension host) that Copilot can call to wait until the MCP server is fully started and accepting tool calls.

**Purpose:** When any MCP tool returns "server is restarting," the response explicitly tells Copilot to call the `mcpStatus` tool with an empty input. This eliminates Copilot having to guess or invent its own retry mechanism.

```typescript
// Registered in extension host
class McpStatusTool implements vscode.LanguageModelTool {
  /**
   * Blocks until the MCP server is fully started.
   * Polls the MCP server status at a short interval.
   * Returns when the server is ready to accept tool calls.
   * Times out after a configurable duration (e.g. 60s).
   *
   * Input: {} (empty — no parameters needed)
   */
  async invoke(options: ToolInvocation): Promise<ToolResult> {
    // Wait for MCP server to be running and responsive
    // Return detailed guidance (see below)
  }
}
```

**MCP restart message (what Copilot sees when a tool triggers a restart):**

```
⚡ MCP server source changed — rebuilt successfully.

The MCP server is restarting to apply the latest changes.
Use the `mcpStatus` tool with an empty input to wait for the server to be ready.
Do NOT retry any MCP tools until `mcpStatus` confirms the server is ready.
```

**MCP build failure message (what Copilot sees when the build fails):**

```
❌ MCP server rebuild failed:

```
<tsc error output here>
```

The MCP server was NOT restarted because the build failed.
Fix the error above and try calling a tool again to trigger a rebuild.
```

**`mcpStatus` response when ready:**

```
✅ MCP server is ready.

The MCP tool cache was already cleared during the restart.
Do NOT call `mcpStatus` again — proceed directly to using MCP tools.

If tools are not visible or changes are not working as expected:
1. Check the MCP server's output via the `output_read` tool
2. Review the MCP server's source code to determine the cause
```

This gives Copilot a deterministic, opinionated workflow:
1. Tool returns restart message → Copilot knows to call `mcpStatus`
2. `mcpStatus` returns ready → Copilot knows to proceed with MCP tools
3. If something is wrong after restart → Copilot knows to check logs and source code

**Location:** `extension/services/mcpStatusTool.ts`

### What Gets Deleted

| File/Code | Reason |
|-----------|--------|
| `mcp-server/src/mcp-server-watcher.ts` (entire file, ~430 lines) | MCP server no longer does any change detection |
| `mcp-server/src/extension-watcher.ts` (entire file, ~430 lines) | MCP server no longer does any extension change detection |
| `extension/host-handlers.ts` lines 35-135 (`scanNewestSourceMtime`, `scanNewestBuildMtime`, `isBuildStale`, `ensureBuildUpToDate`) | Replaced by `HotReloadService` (✅ done in Phase 1) |
| `main.ts`: ALL 4 mutexes (`toolMutex`, `codebaseMutex`, `hotReloadMutex`, `extHotReloadMutex`) | Replaced by unified `RequestPipeline` |
| `main.ts`: `extensionHotReloadInProgress` | Replaced by `RequestPipeline` |
| `main.ts`: `runMcpServerBuild()` | Extension handles all builds |
| `main.ts`: `scheduleMcpServerRestart()` | Replaced by `pipeline.signalRestart()` |
| `main.ts`: Inline hot-reload checks in `registerTool()` (~100 lines) | Moved into `RequestPipeline` |
| `main.ts`: `mcpProcessStartTime` | No longer needed |
| `main.ts`: `mcpServerHotReloadInfo`, `extensionHotReloadInfo`, `hotReloadResult` | Replaced by pipeline's deterministic messages |
| `main.ts`: `mcpServerRestartScheduled` | Replaced by `pipeline.restartScheduled` |
| `host-pipe.ts`: `showHostNotification()` | Extension handles notifications internally |
| `mcp-server-watcher.ts`: `getMcpServerRoot()` | Relocated to `config.ts` |

### What Gets Created

| File | Purpose | Owner |
|------|---------|-------|
| `extension/services/hotReloadService.ts` | Content-hash change detection, build orchestration | Extension |
| `extension/services/mcpStatusTool.ts` | LM tool for Copilot to wait until MCP server is ready | Extension |
| `mcp-server/src/services/requestPipeline.ts` | Sequential tool execution, batch checking, graceful restart | MCP Server |

### What Gets Modified

| File | Change |
|------|--------|
| `mcp-server/src/config.ts` | Add `hotReload` section to `HostConfig` interface and parser; relocate `getMcpServerRoot()` from `mcp-server-watcher.ts` |
| `mcp-server/src/main.ts` | Replace `registerTool()` internals with `pipeline.submit()`; remove ALL 4 mutexes; remove `runMcpServerBuild()`, `scheduleMcpServerRestart()`, `mcpProcessStartTime`, hot-reload banners; add proper HTTP server shutdown; export `inspectorHttpServer` for pipeline to close on restart |
| `mcp-server/src/host-pipe.ts` | Add `checkForChanges()` RPC function; rename `restartMcpServer()` → `readyToRestart()`; remove `showHostNotification()` |
| `mcp-server/src/services/LifecycleService.ts` | Add inspector HTTP server cleanup to `handleShutdown()` |
| `extension/host-handlers.ts` | Register `checkForChanges` handler; update `restartMcpServer` handler with deduplication guard; delete mtime-based functions (✅ done in Phase 1) |

## Migration Plan

### Phase 1: HotReloadService in Extension

1. Create `extension/services/hotReloadService.ts`:
   - `discoverSourceFiles()` — reads tsconfig via `ts.readConfigFile()`, finds files via `vscode.workspace.findFiles(RelativePattern)`
   - `computeContentHash()` — SHA-256 of sorted `relativePath + readFileSync(file)` for all discovered files
   - No `.devtoolsignore`, no hardcoded excludes — tsconfig `include`/`exclude` patterns are the single source of truth
   - `getStoredHash()` / `setStoredHash()` — backed by VS Code `workspaceState`
   - `detectPackageManager()` — checks for lockfiles (pnpm-lock.yaml, package-lock.json, yarn.lock)
   - `runBuild()` — runs existing package.json scripts (`build` for MCP, `compile` for extension) using detected package manager
   - `checkForChanges()` — main entry point, checks both directories

2. Register `checkForChanges` RPC handler in `host-handlers.ts`:
   - Receives MCP server root + extension path
   - Calls `hotReloadService.checkForChanges()`
   - If extension changed: rebuilds inline, restarts Client, waits for Client ready
   - Returns `ChangeCheckResult`

3. Update `restartMcpServer` handler → `readyToRestart`:
   - Add deduplication guard (if already in progress, wait for it)
   - Stop MCP (VS Code command) → clear tool cache → start MCP (build already done)
   - Uses `withProgress` notification (already implemented)

4. Create `extension/services/mcpStatusTool.ts`:
   - Register `mcpStatus` LM tool via `vscode.lm.registerTool`
   - Blocks until MCP server is running and accepting tool calls
   - Returns deterministic guidance message (see LM Tool section)
   - Times out after configurable duration (default 60s)

5. Delete mtime-based functions from `host-handlers.ts` (lines 35-135)

### Phase 2: RequestPipeline in MCP Server

1. Create `mcp-server/src/services/requestPipeline.ts`:
   - FIFO queue with per-batch change checking (replaces ALL 4 mutexes)
   - `batchChecked` flag (reset when queue drains)
   - `signalRestart()` cancels all queued entries, closes inspector HTTP server, sends `readyToRestart` RPC
   - Unified timeout model: timeout starts AFTER pipeline calls `execute()`, not when tool enters queue
   - Both stdio and inspector servers share the same pipeline instance
   - Accepts `serverShutdownFn` callback for proper inspector HTTP server cleanup

2. Update `main.ts`:
   - Replace `registerTool()` internals with `pipeline.submit()`
   - Remove ALL 4 mutexes: `toolMutex`, `codebaseMutex`, `hotReloadMutex`, `extHotReloadMutex`
   - Remove `runMcpServerBuild()`, `scheduleMcpServerRestart()`, `mcpProcessStartTime`
   - Remove `mcpServerHotReloadInfo`, `extensionHotReloadInfo`, `hotReloadResult`, `mcpServerRestartScheduled`
   - Remove `extensionHotReloadInProgress`
   - Remove all inline hot-reload check code (mcp + extension blocks in `registerTool()`)
   - Export `inspectorHttpServer` reference so pipeline can close it on restart
   - Add proper HTTP server shutdown to LifecycleService's `handleShutdown()` flow

3. Update `host-pipe.ts`:
   - Add `checkForChanges(mcpServerRoot, extensionPath)` RPC function
   - Rename `restartMcpServer()` → `readyToRestart()`
   - Remove `showHostNotification()`

4. Update `config.ts`:
   - Add `hotReload` section (enabled, restartDelay, mcpStatusTimeout) to `HostConfig` interface
   - Add parsing in `coerceHostConfig()` with sensible defaults for all fields
   - Relocate `getMcpServerRoot()` from `mcp-server-watcher.ts` to `config.ts`
   - Messages are hardcoded as constants in `requestPipeline.ts` (template system deferred)
   - Provide sensible defaults so existing setups work without config changes

### Phase 3: Cleanup

1. Delete `mcp-server/src/mcp-server-watcher.ts`
2. Delete `mcp-server/src/extension-watcher.ts`
3. Remove all imports of deleted modules from `main.ts` and any other files
4. Remove backward-compatibility aliases from `extension/host-handlers.ts` (`restartMcpServer`, `showNotification` RPC handlers)
5. Verify no mtime-based detection exists anywhere in codebase (`grep` for `mtime`, `mtimeMs`, `scanNewest`, etc.)

## Success Criteria

- [ ] `git add`, `git checkout`, opening git diff views NO LONGER trigger rebuilds
- [ ] Only actual content changes to source files trigger rebuilds
- [ ] MCP server does ZERO hashing — all detection is in the extension
- [ ] Parallel tool calls during a hot-reload result in exactly ONE restart
- [ ] Parallel tool calls in the same batch only check for changes ONCE (first tool checks, rest skip)
- [ ] When MCP source changes: extension rebuilds first → graceful queue drain → extension stops/clears/starts MCP
- [ ] When extension source changes: inline rebuild + Client restart → tool call completes normally
- [ ] Cancelled queued tools return a clear, brief "server restarting" message
- [ ] `mcpStatus` LM tool lets Copilot wait for MCP server to come back online
- [ ] Build failures return full error output (tsc stderr) to Copilot for automatic fix
- [ ] Restart message explicitly tells Copilot to use `mcpStatus` tool (deterministic workflow)
- [ ] `mcpStatus` ready response tells Copilot NOT to call it again and provides troubleshooting tips
- [ ] No mtime-based detection anywhere in the codebase
- [ ] Source files discovered automatically from tsconfig.json include/exclude patterns — no manual sourceDir config
- [ ] Builds triggered using existing package.json scripts — no custom build commands
- [ ] Package manager auto-detected from lockfiles — no manual configuration
- [ ] Existing setups work without config changes
- [ ] ALL 4 old mutexes removed — single RequestPipeline handles all serialization
- [ ] ALL tools (standard, codebase, inspector) use the same unified pipeline
- [ ] Tool timeouts never count queue wait or hot-reload check time (deferred timeout model)
- [ ] Inspector HTTP server properly closed on shutdown/restart (prevents port 6274 conflicts)
- [ ] Inspector browser window auto-reconnects after MCP server restart
