# Debug Session Lifecycle Tethering Blueprint

## Decision

Implement a **mutual non-interference** lifecycle model between the MCP server and the Extension Development Host (DevHost) debug window. Neither component should harm the other during reloads:

- **MCP server restart** (source code change → VS Code watch mode restart): The debug window stays alive. The new MCP server instance reconnects to the existing window via persisted session info.
- **Extension source change** (detected per tool call): The MCP server compares file modification timestamps against the debug window's start time. If any tracked source file was modified after the window launched, the server closes the debug window, rebuilds the extension, and relaunches a fresh window before executing the tool.
- **True debug session termination** (user closes the window): The host extension detects termination and stops the MCP server after a grace period, preventing zombie servers.

---

## Architecture Overview

```
Host VS Code
+-----------------------------------------------------------+
|  vscode-devtools extension      MCP Server (stdio)        |
|  +---------------------+     +-------------------------+  |
|  | Bridge server       |<--->| session.json            |  |
|  | Debug listener      |     | (CDP port, Electron PID,|  |
|  |                     |     |  debugWindowStartedAt)  |  |
|  +---------------------+     |                         |  |
|           |                  | On exit: detach          |  |
|           |                  | On start: try reconnect  |  |
|           v                  +-------------------------+  |
|  +------------------------------------------------------+ |
|  | Extension Development Host (debug window)             | |
|  | Survives MCP restarts (detached process)              | |
|  | Killed only for extension hot-reload                  | |
|  +------------------------------------------------------+ |
+-----------------------------------------------------------+
```

### Lifecycle Flows

**Flow 1 — MCP server source changes:**
1. VS Code watches `mcp.json` dev.debug and MCP source files
2. VS Code closes stdin → MCP server receives `stdin.on('end')`
3. MCP server calls `detachGracefully()` — closes CDP WebSocket, clears in-memory state, does NOT kill child
4. Session info already persisted in `.devtools/session.json`
5. VS Code spawns new MCP server process
6. New MCP server calls `ensureVSCodeConnected()` → `doConnect()`
7. `doConnect()` reads `session.json`, finds CDP port still responsive
8. Reconnects CDP WebSocket, re-enables domains, discovers bridge
9. Tool execution proceeds immediately — no window spawn delay

**Flow 2 — Extension source changes (mtime-based hot-reload):**
1. LLM invokes a tool → `registerTool()` handler fires
2. `hasExtensionChangedSince(extensionDir, sessionStartMs)` scans tracked file `mtimeMs` values
3. If any tracked file has `mtimeMs > debugWindowStartedAt` → change detected
4. `stopDebugWindow()` kills the child process + clears `session.json`
5. `runHostShellTaskOrThrow('ext:build')` rebuilds the extension
6. `ensureConnection()` spawns a fresh debug window, records new `debugWindowStartedAt`
7. New session persisted to `session.json`
8. Tool executes against the fresh window

**Flow 3 — True debug session close (user action):**
1. User closes the DevHost window or stops debugging
2. Host extension receives `onDidTerminateDebugSession` event
3. Filters to `extensionHost` and `pwa-extensionHost` session types
4. Waits 3 seconds (grace period) to detect reload vs. true close
5. If no replacement session starts → calls `workbench.mcp.stopServer`
6. MCP server stops cleanly

---

## Implementation Details

### 1) Session Persistence (`mcp-server/src/vscode.ts`)

**Interface:**
```ts
interface PersistedSession {
  cdpPort: number;
  electronPid: number;
  inspectorPort: number;
  hostBridgePath: string;
  userDataDir: string;
  debugWindowStartedAt: number;   // epoch ms when the debug window was spawned
  persistedAt: number;            // epoch ms when session.json was last written
}
```

**Functions:**
- `persistSession(targetFolder)` — writes `session.json` to `.devtools/` after successful CDP connection
- `loadPersistedSession(targetFolder)` — reads and validates via type-safe `parsePersistedSession()` helper (no `as` casts; uses `readRequiredNumber` / `readRequiredString` guards)
- `clearPersistedSession(targetFolder)` — removes `session.json` (called by `stopDebugWindow()`)

**Location:** `.devtools/session.json` in the target workspace folder.

**Module state:**
- `debugWindowStartedAt` — set to `Date.now()` when a fresh debug window is spawned; restored from `session.json` on reconnect
- `getDebugWindowStartedAt()` — exported getter used by `main.ts` to pass into the extension watcher

### 2) Graceful Detach (`mcp-server/src/vscode.ts`)

**Function: `detachGracefully()`**
- Closes CDP WebSocket connection
- Clears in-memory state (`cdpWs`, `cdpPort`, etc.)
- Does NOT kill the child Electron process
- Does NOT clear the persisted `session.json` file
- Logs the detach event

**Modified lifecycle handlers:**
- `stdin.on('end')` → calls `detachGracefully()` instead of `forceKillChildSync()`
- `process.on('exit')` → calls `detachGracefully()`
- `SIGINT` / `SIGTERM` → calls `detachGracefully()` then exits
- `uncaughtException` → calls `detachGracefully()` then exits

### 3) Reconnect Logic (`mcp-server/src/vscode.ts`)

**Function: `tryReconnectToExistingWindow(targetFolder, options)`**

Steps:
1. Load persisted session from `session.json`
2. Verify CDP port is still responding (`/json/version`)
3. Restore module state (`cdpPort`, `electronPid`, `debugWindowStartedAt`, etc.)
4. Find workbench target and connect CDP WebSocket
5. Re-enable CDP domains (Runtime, Page, Target auto-attach)
6. Wait for workbench readiness
7. Rediscover DevHost bridge
8. Re-attach debugger (best effort)
9. Update persisted session with fresh `persistedAt` timestamp

**Modified `doConnect()`:**
```ts
async function doConnect(options) {
  // Try reconnect first
  const reconnected = await tryReconnectToExistingWindow(targetFolder, options);
  if (reconnected) return reconnected;

  // No existing window — clean up and spawn fresh
  teardownSync();
  debugWindowStartedAt = Date.now();
  // ... existing spawn logic ...
  // At end: persistSession(targetFolder);
}
```

### 4) Debug Session Listener (`extension/extension.ts`)

**Added to `activate()`:**
- Registers `vscode.debug.onDidTerminateDebugSession` listener
- Tracks active ExtensionHost sessions in an `activeExtHostSessionIds` Set
- Also registers `vscode.debug.onDidStartDebugSession` to populate the set
- Filters to `extensionHost` and `pwa-extensionHost` session types
- Implements reload-aware grace period (3 seconds) — if a new ExtensionHost session starts within the grace window, the stop is cancelled
- If no replacement session starts within grace period → calls `stopDevtoolsMcpServer()`

**Helper: `stopDevtoolsMcpServer()`**
- Primary: `vscode.commands.executeCommand('workbench.mcp.stopServer', 'vscode-devtools')`
- Fallback: `workbench.mcp.restartServer` then `workbench.mcp.stopServer` sequence
- All failures logged to output channel, never thrown

### 5) `stopDebugWindow()` Changes

- Now calls `clearPersistedSession(targetFolder)` to prevent the next MCP instance from trying to reconnect to a dead window
- Tracks `currentTargetFolder` module-level variable for access during cleanup

---

## Extension Change Detection (`mcp-server/src/extension-watcher.ts`)

### Strategy: Mtime-Based Timestamp Comparison

Instead of computing SHA-256 content hashes of every file on each tool call (expensive I/O — reads all file contents), the watcher uses a **timestamp comparison** approach:

1. Record `debugWindowStartedAt` when the debug window is spawned (epoch ms via `Date.now()`)
2. Before each tool call, recursively scan tracked extension source files and collect `stat.mtimeMs`
3. If the **newest** `mtimeMs` across all tracked files is greater than `debugWindowStartedAt`, trigger hot-reload
4. After hot-reload and fresh window spawn, `debugWindowStartedAt` is reset to `Date.now()`

**Why this is faster:** Only reads file metadata (`stat`) — never opens or reads file contents. The filesystem already tracks modification times, so we leverage existing OS-level data.

### Tracked Files and Ignore Rules

Files are filtered through two layers:

**Built-in defaults (hardcoded):**
- Ignored directories: `node_modules`, `dist`, `.git`
- Ignored extensions: `.vsix`

**User-configurable `.devtoolsignore` file:**

Located at `<extensionRoot>/.devtoolsignore`. Uses a `.gitignore`-style syntax:

```gitignore
# Ignore build output
out/
build/

# Ignore test fixtures but keep test source
test/fixtures/

# Re-include a specific file (negation)
!src/important-config.json
```

**Supported patterns:**
- `*` — matches any characters except `/`
- `**` — matches any characters including `/` (recursive)
- `!pattern` — negation (re-include previously ignored paths)
- `#` — comment lines
- Trailing `/` — matches directories only
- Blank lines are skipped

**Processing order:** Rules are evaluated sequentially; later rules override earlier ones for the same path.

### Exported API

```ts
/** Returns the newest mtimeMs across all tracked extension files. */
export function getNewestTrackedChangeTime(extensionDir: string): number;

/** Returns true if any tracked file was modified after sessionStartedAtMs. */
export function hasExtensionChangedSince(
  extensionDir: string,
  sessionStartedAtMs: number,
): boolean;
```

### Integration with `main.ts`

```ts
import { hasExtensionChangedSince } from './extension-watcher.js';
import { getDebugWindowStartedAt } from './vscode.js';

// Before each tool call:
const sessionStart = getDebugWindowStartedAt();
if (sessionStart && hasExtensionChangedSince(config.extensionBridgePath, sessionStart)) {
  // stopDebugWindow() → rebuild → ensureConnection()
}
```

---

## Risks / Caveats

- `workbench.mcp.stopServer` argument shape is not publicly documented; may change between VS Code builds
- Persisted `session.json` could become stale if the debug window crashes without cleanup — mitigated by CDP port availability check on reconnect
- WMIC-based PID discovery (Windows) adds slight startup latency — acceptable for correctness
- Grace period (3s) for reload detection is heuristic — may need tuning for slow machines
- Mtime precision: On some filesystems (FAT32), `mtimeMs` has only 2-second resolution. On NTFS/ext4/APFS this is sub-millisecond and not a concern for development workflows
- `.devtoolsignore` is optional — if absent, only the hardcoded defaults apply

**Mitigations:**
- Stop helper is centralized in `stopDevtoolsMcpServer()` with fallback path
- Session reconnect always validates CDP port responsiveness before proceeding
- All lifecycle operations log to the `vscode-devtools` output channel
- Persisted session is cleared on intentional stop (`stopDebugWindow()`)
- Mtime approach eliminates the cost of reading file contents — only metadata is accessed

---

## Success Criteria

- [x] Extension hot-reload: MCP detects extension changes via mtime → rebuild → relaunch → tool executes
- [x] MCP restart survival: Debug window survives MCP server restarts via graceful detach
- [x] Session reconnection: New MCP instance reconnects to existing window via `session.json`
- [x] True close detection: Host extension stops MCP server when debug session truly ends (not reload)
- [x] No zombie processes: Persisted session cleared on intentional kill; validated on reconnect
- [x] Logs: All lifecycle events traced in `vscode-devtools` output channel
- [x] `.devtoolsignore` support: User-configurable ignore patterns for change detection
- [x] No content hashing: Change detection uses only filesystem mtime metadata
