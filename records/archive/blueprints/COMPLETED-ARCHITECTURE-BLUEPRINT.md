# Architecture Blueprint: Bridge & Bootstrap Redesign

> **Status:** Draft — pending review before implementation  
> **Scope:** Complete teardown and replacement of bridge.js, bridge-client.ts, bootstrap/lifecycle code  
> **Goal:** A deterministic, typed, reliable host-client-MCP architecture

---

## 1. Executive Summary

The current system has three actors (Host VS Code, Client/Dev Host VS Code, MCP Server) communicating over five channels using ad-hoc patterns: `new Function()` string exec, `globalThis` hacks for IPC, and a single monolithic `bridge.js` that runs identically in both VS Code instances with no way to distinguish its role. The result is a fragile system where the second bridge exec call freezes the Extension Development Host.

This blueprint replaces the entire bridge/bootstrap layer with a **typed JSON-RPC 2.0 protocol** where every command is a named method with a defined schema — no arbitrary code execution. The Host and Client roles are explicitly separated at activation time, each loading role-specific handlers. Safe Mode is preserved through a minimal JS loader.

---

## 2. The Three Actors

```
┌─────────────────┐     stdio (MCP)      ┌─────────────────┐
│                  │◄───────────────────►│                  │
│  GitHub Copilot  │                      │   MCP Server     │
│  (LLM Agent)     │                      │   (thin orchestrator)
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                    ┌─────────────┼──────────────┐
                                    │             │              │
                              Named Pipe     Named Pipe    CDP WebSocket
                           (Host Bootstrap)  (Client Bootstrap)  (DOM)
                                    │             │              │
                              ┌─────▼─────┐ ┌────▼────┐  ┌──────▼──────┐
                              │ Host       │ │         │  │             │
                              │ VS Code    │ │ Spawns  │  │   Client    │
                              │ (User's    │─┼────────►│  │  VS Code    │
                              │  editor)   │ │         │  │  (Dev Host) │
                              └───────────┘ └─────────┘  └─────────────┘
```

| Actor | Identity | Role |
|-------|----------|------|
| **Host VS Code** | The user's running editor with vscode-devtools installed. Exposes a **global** named pipe (`\\.\pipe\vscode-devtools-host`). Only one Host can exist at a time. | **Lifecycle engine**: spawns Client, handles hot-reload, manages PID lifecycle. Immutable — build once, never change. |
| **Client VS Code** | Extension Development Host spawned by the Host. Loads the same extension via `--extensionDevelopmentPath`. Exposes its own named pipe (Client Bootstrap). | **The puppet**: all MCP tools operate here. Terminals, output channels, state queries. Rebuilt on hot-reload. |
| **MCP Server** | Node.js process started by VS Code's MCP infrastructure. Communicates with Copilot via stdio. | **Thin orchestrator**: announces "I'm online" to Host, detects extension changes, notifies Host when hot-reload needed, routes tool calls to Client. Does NOT spawn or manage lifecycle directly. |

### Key Architecture Decisions

1. **Host Bootstrap = Immutable Framework** — like vscode-api-expose. Build once, never change. All lifecycle complexity is internal to Host.

2. **MCP Server = Minimal** — only announces presence and notifies of hot-reload. Does NOT spawn Client, does NOT run tasks, does NOT manage PIDs.

3. **Shared Codebase, Role Detection** — one extension project, role determined at runtime via `ExtensionMode.Development`. Host loads `host/handlers.ts`, Client loads `client/handlers.ts`.

4. **Global Fixed Pipe Name** — Host pipe is `\\.\pipe\vscode-devtools-host` (not per-workspace). First VS Code to activate wins; only one Host ever exists.

5. **MCP→Client Direct** — tool calls route directly to Client Bootstrap. Host is not in the data path for tools.

---

## 3. Why We're Starting Fresh

The current system is too tangled to debug incrementally. Rather than enumerate every issue, here's the core problem:

**The architecture was not designed with clear separation of concerns.** The same `bridge.js` runs in both Host and Client. The MCP server handles lifecycle, CDP connection, task execution, and tool routing. Communication patterns are ad-hoc: string-based `new Function()` eval, `globalThis` globals, five different channels.

The result: tracked terminal tools freeze on the second call, and we've lost track of why.

**Our solution: Start fresh with a clear architecture.** The new design has explicit roles (Host vs Client), minimal MCP server responsibilities, and typed RPC protocols. Rather than fixing the current system, we're replacing the entire bridge/bootstrap layer.

---

## 4. New Architecture

### 4.1 Design Principles

1. **Host = Immutable Lifecycle Engine** — The Host Bootstrap handles all lifecycle complexity internally: spawning, PID management, debug attach, task running, reconnection. MCP never sees these details. Build the Host once, never change it.

2. **MCP = Thin Orchestrator** — MCP only announces its presence and notifies when hot-reload is needed. It does NOT spawn processes, manage PIDs, or run tasks.

3. **Client = The Puppet** — All MCP tools operate on the Client. This is where creative work happens. The Client is rebuilt on hot-reload, so it can evolve freely.

4. **Global Fixed Pipe Name** — Host pipe is `\\.\pipe\vscode-devtools-host` (Windows) or `/tmp/vscode-devtools-host.sock` (Unix). Only one Host exists at a time.

5. **Host as Source of Truth** — Host persists session data (CDP port, Client PID, connection status). MCP queries Host for this info rather than maintaining its own state.

6. **Typed RPC + Fallback Exec** — Client exposes typed methods for common operations (`terminal.create`, `terminal.sendText`). A fallback `exec()` method exists for edge cases but should be used sparingly.

7. **Fail-Fast** — Every RPC call has a timeout. Every handler is try/catch wrapped. No dangling promises.

### 4.2 Role Detection (Pipe-Based)

Role detection uses **pipe availability** as the deterministic signal — not VS Code APIs:

```typescript
async function detectAndClaimRole(): Promise<'host' | 'client'> {
  // Try to claim the Host pipe (global fixed name, only one exists)
  try {
    await createPipeServer(HOST_PIPE_PATH);
    return 'host';  // We created it → we're the Host
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      // Host pipe exists → we're the Client
      await createPipeServer(CLIENT_PIPE_PATH);
      return 'client';
    }
    throw err;  // Unexpected error
  }
}
```

**Why this is better than `ExtensionMode`:**
- Based on actual resource constraints, not an API flag
- Works even if VS Code changes its extension mode semantics
- Self-documenting: the pipe existence IS the role

**Pipe Names (Fixed, Global):**

| Actor | Pipe Path | Purpose |
|-------|-----------|---------|
| Host | `\\.\pipe\vscode-devtools-host` | Host VS Code instance |
| Client | `\\.\pipe\vscode-devtools-client` | Dev Host window (Extension Development Host) |

Only ONE of each can exist at a time. Collision = session conflict (see takeover flow below).

### 4.2.1 Session Override (Takeover Flow)

When a new VS Code instance activates and the Host pipe already exists:

```
New VS Code activates
    │
    ├── Tries to create Host pipe → EADDRINUSE
    │
    ├── Shows notification: "Another Host session exists"
    │       └── [ Override ] [ Cancel ]
    │
    └── User clicks "Override":
            │
            ├── 1. Connect to existing Host pipe
            │
            ├── 2. Send RPC: takeover({ reason: 'user-override' })
            │
            ├── 3. Old Host receives takeover:
            │       ├── Shows "Session overridden" notification with [ Reclaim ] button
            │       ├── Gracefully shuts down its Client (if any)
            │       ├── Stops its MCP server (sends stdin close)
            │       └── Releases Host pipe (closes server)
            │
            ├── 4. New instance claims Host pipe
            │
            └── 5. New Host session starts fresh
                    └── Starts its own MCP server when ready
```

**Reclaim flow:** Old Host can click "Reclaim" → sends `takeover` to new Host → reverses the process.

**Key insight:** Each Host session "owns" its MCP server. Takeover = full session replacement, not MCP hot-reconnect.

### 4.3 Communication Architecture

```
┌─────────────────┐     stdio (MCP)      ┌─────────────────┐
│  GitHub Copilot │◄───────────────────►│   MCP Server     │
└─────────────────┘                      └───────┬─┬───────┘
                                                 │ │
                               ┌─────────────────┘ └──────────────┐
                               │                                  │
                         Named Pipe                    Named Pipe + CDP
                        (Host Bridge)               (Client Bridge)
                    \\.\pipe\vscode-              \\.\pipe\vscode-
                     devtools-host                devtools-client
                               │                          │
                         ┌─────▼─────┐              ┌─────▼─────┐
                         │ Host       │   Spawns    │ Client     │◄── CDP WebSocket
                         │ VS Code    │────────────►│ VS Code    │
                         │ (VSIX)     │             │ (DevHost)  │
                         └───────────┘              └───────────┘
```

**Four channels (no MCP pipe — MCP initiates all communication):**

| # | Channel | Direction | Purpose |
|---|---------|-----------|---------|
| 1 | stdio | Copilot ↔ MCP | MCP protocol (required, unchanged) |
| 2 | Host pipe | MCP ↔ Host | Lifecycle: `mcpReady`, `hotReloadRequired`, `getStatus`, `takeover` |
| 3 | Client pipe | MCP ↔ Client | Tools: `terminal.*`, `output.*` |
| 4 | CDP WebSocket | MCP → Client browser | DOM: clicks, screenshots, snapshots |

**Why no MCP pipe?** Since MCP initiates all lifecycle operations (`hotReloadRequired`, etc.), Host never needs to push unsolicited messages. MCP calls Host → Host handles internally → MCP gets response. Simpler.

**Both pipes are bidirectional** — MCP connects as client, but either side can send once connected.

### 4.4 Host Bootstrap API (Ultra-Minimal)

The Host Bootstrap exposes exactly **4 methods**. All lifecycle complexity is internal.

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `mcpReady` | `{ mcpPipePath: string }` | `{ clientPipePath: string, cdpPort: number }` | MCP announces it's online. Host spawns Client (or reconnects to existing). Returns connection info. |
| `hotReloadRequired` | `{ extensionPath: string }` | `{ clientPipePath: string, cdpPort: number }` | MCP says extension changed. Host rebuilds, restarts Client, returns new connection info. |
| `getStatus` | `{}` | `{ clientConnected: bool, clientPipePath?, cdpPort? }` | MCP queries current state. |
| `takeover` | `{ reason: string }` | `{ acknowledged: true }` | Another VS Code instance requests to become Host. Current Host gracefully shuts down. |

**What Host handles internally (MCP never sees):**
- Spawning the Client process (`child_process.spawn`)
- Allocating dynamic ports (CDP + inspector)
- Building the extension (`ext:build` task)
- Attaching the debugger (orange toolbar)
- PID management (killing on exit)
- Session persistence (surviving MCP restarts)
- Reconnecting to existing Client on MCP restart
- Takeover coordination (releasing pipe, notifying user)

### 4.5 Client Bootstrap API (Typed + Exec Fallback)

The Client Bootstrap exposes **typed methods** for common operations plus a fallback `exec()`.

#### Typed Terminal Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `terminal.create` | `{ name?, shellPath?, cwd? }` | `{ terminalId, name }` | Create tracked terminal |
| `terminal.sendText` | `{ terminalId, text, addNewline? }` | `{ sent: true }` | Send text to terminal |
| `terminal.getBuffer` | `{ terminalId, lastN?, includeMetadata? }` | `{ output, metadata?, inputHistory }` | Read terminal output |
| `terminal.list` | `{ runningOnly? }` | `Array<TerminalMetadata>` | List tracked terminals |
| `terminal.close` | `{ terminalId }` | `{ closed: true }` | Close and clean up |

#### Typed Output Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `output.listChannels` | `{}` | `Array<{ name }>` | List VS Code output channels |
| `output.read` | `{ channel, limit?, pattern? }` | `{ lines: string[] }` | Read output channel content |

#### System Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `system.ping` | `{}` | `{ alive: true, registeredMethods: string[] }` | Health check |
| `exec` | `{ code: string, payload?: any }` | `any` | **Fallback:** Execute arbitrary code. Use sparingly. |

### 4.6 MCP Server Startup Flow

```
MCP Server starts (via VS Code MCP infrastructure)
    │
    ├── 1. Parse config, start stdio transport
    │
    ├── 2. Connect to Host Bootstrap pipe (global fixed name)
    │       └── \\.\pipe\vscode-devtools-host
    │
    ├── 3. Call mcpReady({ mcpPipePath: '...' })
    │       └── Host either:
    │           ├── Returns existing Client connection (fast path)
    │           └── Spawns new Client, waits for ready, returns connection
    │
    ├── 4. Connect to Client Bootstrap + CDP WebSocket
    │       ├── Client pipe from mcpReady response
    │       └── CDP port from mcpReady response
    │
    └── 5. Ready — tools can execute
```

### 4.7 Hot-Reload Flow

```
MCP detects extension source file changed (pre-tool-call check)
    │
    ├── 1. Call hotReloadRequired({ extensionPath })
    │       └── MCP waits for response (may take 30+ seconds)
    │
    ├── 2. Host handles internally:
    │       ├── Stop existing Client window
    │       ├── Run ext:build task
    │       ├── Spawn new Client with rebuilt extension
    │       ├── Wait for Client ready
    │       └── Return new { clientPipePath, cdpPort }
    │
    ├── 3. MCP reconnects to new Client
    │       ├── New Client pipe
    │       └── New CDP WebSocket
    │
    └── 4. Continue with original tool call
```

### 4.8 Session Persistence (Host-Owned)

Host persists session data to survive MCP restarts:

**Location:** `<hostWorkspace>/.devtools/host-session.json`

```json
{
  "clientPid": 12345,
  "cdpPort": 9222,
  "extensionPath": "C:\\path\\to\\extension",
  "startedAt": 1707753600000
}
```

**Note:** `clientPipePath` is NOT persisted — it's always the fixed name `\\.\pipe\vscode-devtools-client`.

**On MCP startup:**
1. MCP calls `mcpReady()`
2. Host reads persisted session
3. Host probes Client (is PID alive? is CDP port responding? is Client pipe connectable?)
4. If Client healthy → return existing connection info (fast path)
5. If Client dead → spawn fresh, update session, return new connection info

### 4.9 Safe Mode Design

**Goal:** The Host Bootstrap must ALWAYS work, even if handler code fails to compile.

**Solution:** Plain JavaScript bootstrap loader + dynamically loaded TypeScript handlers.

```
extension/
  extension.ts          ← Entry point: role detection, dynamic loading
  bootstrap.js          ← Plain JS: pipe server, handler registry (~60 lines)
  host/
    handlers.ts         ← TypeScript: Host RPC handlers (3 methods)
  client/
    handlers.ts         ← TypeScript: Client RPC handlers (terminals, etc.)
  runtime.ts            ← TypeScript: GUI features (tree views, webviews)
```

**Safe Mode Flow:**
1. `extension.ts` loads → succeeds (esbuild always produces output)
2. `bootstrap.js` loads → succeeds (plain JS, always works)
3. `host/handlers.ts` loads → **fails** (compilation error)
4. Result: pipe server responds to `system.ping` but returns "method not found" for other calls
5. MCP detects Safe Mode → can still communicate with Host for basic health checks

---

## 5. Extension Entry Point (Revised extension.ts)

```typescript
// Constants for fixed pipe names
const HOST_PIPE_PATH = process.platform === 'win32' 
  ? '\\\\.\\pipe\\vscode-devtools-host' 
  : '/tmp/vscode-devtools-host.sock';
const CLIENT_PIPE_PATH = process.platform === 'win32' 
  ? '\\\\.\\pipe\\vscode-devtools-client' 
  : '/tmp/vscode-devtools-client.sock';

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('vscode-devtools');
  const log = (msg: string) => outputChannel.appendLine(`[${new Date().toISOString()}] ${msg}`);

  const bootstrap = require('./bootstrap');

  // 1. Detect role via pipe availability (not ExtensionMode)
  let role: 'host' | 'client';
  try {
    await bootstrap.startServer(HOST_PIPE_PATH);
    role = 'host';
    log('Claimed Host pipe — this instance is the Host');
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      // Host pipe exists → we're the Client
      await bootstrap.startServer(CLIENT_PIPE_PATH);
      role = 'client';
      log('Host pipe exists — this instance is the Client');
    } else {
      throw err;
    }
  }

  // 2. Load role-specific handlers
  try {
    if (role === 'host') {
      const { registerHostHandlers } = require('./host-handlers');
      registerHostHandlers(bootstrap.registerHandler, context);
    } else {
      const { registerClientHandlers } = require('./client-handlers');
      const cleanup = registerClientHandlers(bootstrap.registerHandler);
      context.subscriptions.push(cleanup);
    }
    log(`${role} handlers registered`);
  } catch (err) {
    log(`Failed to load ${role} handlers — Safe Mode: ${err.message}`);
  }

  // 3. Load runtime (GUI features)
  try {
    const runtime = require('./runtime');
    await runtime.activate(context);
    await vscode.commands.executeCommand('setContext', 'vscdt.coreLoaded', true);
    log('Runtime loaded');
  } catch (err) {
    await vscode.commands.executeCommand('setContext', 'vscdt.coreLoaded', false);
    log(`Runtime failed — Safe Mode GUI: ${err.message}`);
  }
}
```

---

## 6. Lifecycle Management

### 6.1 Startup Sequence

```
MCP Server starts (via VS Code MCP infrastructure)
  │
  ├── 1. Parse config, start stdio transport
  │
  ├── 2. Connect to Host pipe (fixed name: \\.\pipe\vscode-devtools-host)
  │       └── system.ping() to verify Host is alive
  │
  ├── 3. Call mcpReady({ })
  │       └── Host handles EVERYTHING internally:
  │           ├── Check for existing Client (persisted session)
  │           ├── Probe Client health (PID, CDP, pipe)
  │           ├── If healthy → fast path (return existing connection)
  │           ├── If dead → spawn new Client, allocate ports, wait for ready
  │           └── Return { cdpPort }
  │
  ├── 4. Connect to Client pipe (fixed name: \\.\pipe\vscode-devtools-client)
  │       └── system.ping() to verify Client handlers loaded
  │
  ├── 5. Connect CDP WebSocket (port from mcpReady response)
  │       └── Find workbench target, attach
  │
  └── 6. Ready — tools can execute
```

### 6.2 Tool Execution

```
Copilot sends tool call via stdio
  │
  ├── Hot-reload check (if extension files changed)
  │       └── Call hotReloadRequired() — see 6.4
  │
  ├── isConnected() guard (CDP WebSocket open?)
  │
  ├── Tool mutex acquire
  │
  ├── Route to handler:
  │       ├── CDP tools → sendCdp() (unchanged)
  │       ├── Terminal tools → clientRpc.sendText() / getBuffer() / etc.
  │       └── Standalone tools → direct execution
  │
  └── Return result
```

### 6.3 Shutdown

```
MCP Server exit (stdin end / SIGINT / SIGTERM)
  │
  ├── detachGracefully()
  │       ├── Close CDP WebSocket
  │       ├── Clear in-memory state
  │       └── Leave debug window alive (for reconnect)
  │
  └── process.exit()

Host VS Code closes
  │
  ├── extension deactivate()
  │       ├── bootstrap.stopServer()
  │       └── Kill Client process (if spawned by this Host)
  │
  └── MCP server detects pipe disconnect → exits or reconnects
```

### 6.4 Hot-Reload

```
MCP detects extension source file changed (pre-tool-call check)
  │
  ├── Call hotReloadRequired({ extensionPath })
  │       └── MCP waits for response (may take 30+ seconds)
  │
  ├── Host handles EVERYTHING internally:
  │       ├── Stop existing Client window
  │       ├── Run ext:build task (waits for completion)
  │       ├── Spawn new Client with rebuilt extension  
  │       ├── Wait for Client ready (pipe + CDP)
  │       └── Return new { cdpPort }
  │
  ├── MCP reconnects:
  │       ├── New Client pipe (same fixed path, new server)
  │       └── New CDP WebSocket (new port)
  │
  └── Continue with original tool call
```

---

## 7. File Structure (New)

### Extension Side

```
extension/
  bootstrap.js              ← Plain JS pipe server (Safe Mode core, ~80 lines)
  extension.ts              ← Entry point: pipe-based role detection, dynamic loading
  host-handlers.ts          ← Host RPC handlers (mcpReady, hotReloadRequired, getStatus, takeover)
  client-handlers.ts        ← Client RPC handlers (terminal.*, output.*, system.ping)
  runtime.ts                ← GUI features (tree views, webviews) [mostly unchanged]
  services/
    trackedPseudoterminal.ts ← PTY proxy [unchanged]
    terminalBufferService.ts ← Buffer storage [unchanged]
```

**Note:** If handlers grow to multiple files, move to subfolders (`host/`, `client/`).

### MCP Server Side

```
mcp-server/src/
  rpc-transport.ts     ← Shared JSON-RPC transport (sendPipeRequest)
  host-rpc.ts          ← Typed Host RPC client (mcpReady, hotReloadRequired, getStatus)
  client-rpc.ts        ← Typed Client RPC client (terminal.*, output.*)
  vscode.ts            ← Launch/connection orchestration [heavily refactored]
  main.ts              ← Tool registration [minor changes]
  tools/
    tracked-terminal.ts ← Uses client-rpc typed methods [refactored]
    output-panel.ts     ← Uses client-rpc typed methods [refactored]
```

### Files Removed

| File | Replacement |
|------|-------------|
| `extension/bridge.js` | `extension/bootstrap.js` + `host-handlers.ts` + `client-handlers.ts` |
| `mcp-server/src/bridge-client.ts` | `rpc-transport.ts` + `host-rpc.ts` + `client-rpc.ts` |
| `mcp-server/src/mcp-socket-server.ts` | Eliminated — not needed |

---

## 8. Why This Fixes the Freeze

The freeze occurs because `new Function()` exec creates an async wrapper (`async function(){ ... }`) that yields to microtasks between the function body completing and the bridge writing the response. With PTY output flooding the event loop, the response write never gets scheduled.

The new architecture eliminates this entirely:

1. **No `new Function()`** — handlers are regular registered functions
2. **No async wrapper** — `terminal.sendText()` is synchronous; the handler returns `{ sent: true }` directly
3. **Immediate response** — `bootstrap.js` writes the JSON-RPC response in the same synchronous path as the handler return
4. **No globalThis access** — handlers have direct references to terminals via closure scope, not global lookup

The bootstrap's `processLine` function:
```javascript
const result = await handler(req.params ?? {});
conn.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
```

Even with `await`, if the handler returns synchronously (most do), the `conn.write` happens in the same microtask tick. No PTY callbacks can interleave.

---

## 9. Migration Plan

### Phase 1: Extension Side (bootstrap + handlers)
1. Create `bootstrap.js` — minimal pipe server with handler registry (~80 lines plain JS)
2. Create `host-handlers.ts` — implement 4 methods:
   - `mcpReady` — spawn or reconnect Client, return `{ cdpPort }`
   - `hotReloadRequired` — stop Client, build, respawn, return `{ cdpPort }`
   - `getStatus` — return current state
   - `takeover` — graceful session handoff
3. Create `client-handlers.ts` — implement terminal + output methods
4. Update `extension.ts`:
   - Replace `computeSocketPath()` with fixed pipe names
   - Replace `ExtensionMode` check with **try Host pipe → fail = Client**
   - Dynamic loading of handlers
5. Remove `bridge.js`
6. Remove globalThis bridges (`__trackedTerminalBridge`, `__debugSessionBridge`) from runtime.ts

### Phase 2: MCP Server Side (typed RPC clients)
1. Create `rpc-transport.ts`:
   - Extract `sendPipeRequest()` function (JSON-RPC over named pipe)
   - Uses fixed pipe paths (no workspace-based computation)
2. Create `host-rpc.ts`:
   - `mcpReady()` — call on startup
   - `hotReloadRequired()` — call when extension files changed
   - `getStatus()` — call for health check
3. Create `client-rpc.ts`:
   - `terminal.create()`, `sendText()`, `getBuffer()`, `list()`, `close()`
   - `output.listChannels()`, `read()`
   - `system.ping()` — health check
4. Update `vscode.ts`:
   - Remove all MCP-side spawning/port-allocation logic
   - Use `hostRpc.mcpReady()` to get connection info
   - Connect to Client pipe and CDP with returned info
5. Update `tracked-terminal.ts`:
   - Replace `bridgeExec()` strings with `clientRpc.sendText()` etc.
6. Update `output-panel.ts` if it uses bridge exec
7. Remove `bridge-client.ts`
8. Remove `mcp-socket-server.ts`

### Phase 3: Verification
1. Build both extension and MCP server (clean builds)
2. Test: Cold start → `mcpReady` → Client spawns → tools work
3. Test: `create_tracked_terminal` → `send_to_tracked_terminal` → `get_terminal_buffer`
4. Test: Hot-reload cycle (edit extension file → `hotReloadRequired` → reconnect)
5. Test: MCP server restart → reconnect to existing Client (fast path)
6. Test: Session takeover (start second VS Code → notification → override → reclaim)
7. Test: Safe Mode (break client-handlers.ts compilation → verify Host still responds to ping)

---

## 10. Open Questions

### ~~Q1: Should list_tracked_terminals remain standalone?~~ ✅ RESOLVED
**Decision:** Use client-rpc (requires connection). Simpler, consistent — all terminal tools use Client RPC.

### ~~Q2: MCP Socket Server — keep or fold?~~ ✅ RESOLVED
**Decision:** Eliminated entirely. Since MCP initiates `hotReloadRequired`, Host never needs to push unsolicited messages. No MCP pipe needed.

### ~~Q3: Debug session tracking — where does it live?~~ ✅ RESOLVED
**Decision:** Simplify to a single variable (`let currentDebugSession: DebugSession | null`). There's only one debug session at a time — no Map needed.

### ~~Q4: Extension-watcher.ts — should it ignore package.json?~~ ✅ RESOLVED
**Decision:** Add `package.json` to `.devtoolsignore` file. User can customize ignore patterns.

---

## 11. Summary of Changes

| Component | Current | New | Impact |
|-----------|---------|-----|--------|
| Bridge server | `bridge.js` (337 lines, monolith) | `bootstrap.js` (~80 lines) + handlers | Separation of concerns |
| Code execution | `new Function(code)` string eval | Named typed RPC handlers | Eliminates freeze, adds type safety |
| IPC channel | `globalThis.__trackedTerminalBridge` | Closure-scoped in handlers | No global state pollution |
| Role awareness | None (identical code in both instances) | Pipe-based detection (claim Host pipe → Host, else Client) | Deterministic role |
| MCP client | `bridge-client.ts` (monolith for all bridge calls) | `host-rpc.ts` + `client-rpc.ts` | Clear separation of concerns |
| Terminal tools | Inline code strings in tool handlers | `clientRpc.sendText()` etc. | Type-safe, no string assembly |
| Safe Mode | bridge.js always loads (plain JS) | bootstrap.js always loads (plain JS) | Preserved |
| Session conflict | Silent race condition | Takeover flow with user notification | Explicit control |

---

*End of blueprint — ready for review.*

---

## Appendix A: Implementation Code Sketches

This appendix contains reference implementation code. These are not final — they're starting points for implementation.

### A.1 bootstrap.js (Plain JavaScript Pipe Server)

```javascript
// bootstrap.js — Plain JavaScript, DO NOT convert to TypeScript

const net = require('net');
const handlers = new Map();

let server = null;
let socketPath = null;

function registerHandler(method, fn) {
  handlers.set(method, fn);
}

function handleConnection(conn) {
  let acc = '';
  conn.setEncoding('utf8');
  conn.on('data', (chunk) => {
    acc += chunk;
    let idx;
    while ((idx = acc.indexOf('\n')) !== -1) {
      const line = acc.slice(0, idx);
      acc = acc.slice(idx + 1);
      if (!line.trim()) continue;
      processLine(conn, line);
    }
  });
  conn.on('error', () => {});
}

async function processLine(conn, line) {
  let req;
  try { req = JSON.parse(line); } catch {
    conn.write(JSON.stringify({
      jsonrpc: '2.0', id: null,
      error: { code: -32700, message: 'Parse error' }
    }) + '\n');
    return;
  }

  const id = req?.id ?? null;
  const method = req?.method;
  if (!method) {
    conn.write(JSON.stringify({
      jsonrpc: '2.0', id,
      error: { code: -32600, message: 'Invalid request' }
    }) + '\n');
    return;
  }

  // system.ping always works, even without registered handlers
  if (method === 'system.ping') {
    const registered = Array.from(handlers.keys());
    conn.write(JSON.stringify({
      jsonrpc: '2.0', id,
      result: { alive: true, registeredMethods: registered }
    }) + '\n');
    return;
  }

  const handler = handlers.get(method);
  if (!handler) {
    conn.write(JSON.stringify({
      jsonrpc: '2.0', id,
      error: { code: -32601, message: `Method not found: ${method}` }
    }) + '\n');
    return;
  }

  try {
    const result = await handler(req.params ?? {});
    conn.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  } catch (err) {
    conn.write(JSON.stringify({
      jsonrpc: '2.0', id,
      error: { code: -32603, message: String(err?.message ?? err) }
    }) + '\n');
  }
}

function startServer(path) {
  return new Promise((resolve, reject) => {
    server = net.createServer(handleConnection);
    server.on('error', reject);
    server.listen(path, () => {
      socketPath = path;
      resolve({ socketPath });
    });
  });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { registerHandler, startServer, stopServer };
```

### A.2 host-handlers.ts (Host RPC Handlers)

```typescript
// extension/host/handlers.ts
import * as vscode from 'vscode';
import type { RegisterHandler } from '../bootstrap';

export function registerHostHandlers(register: RegisterHandler) {
  let clientPid: number | null = null;
  let cdpPort: number | null = null;

  register('mcpReady', async (params) => {
    // TODO: Check for existing client, spawn if needed
    // Return connection info
    return {
      clientPipePath: '\\\\.\\pipe\\vscode-devtools-client',
      cdpPort: cdpPort ?? 9222,
    };
  });

  register('hotReloadRequired', async (params) => {
    // TODO: Stop client, build, respawn
    return {
      clientPipePath: '\\\\.\\pipe\\vscode-devtools-client',
      cdpPort: cdpPort ?? 9222,
    };
  });

  register('getStatus', () => {
    return {
      clientConnected: clientPid !== null,
      clientPipePath: '\\\\.\\pipe\\vscode-devtools-client',
      cdpPort,
    };
  });

  register('takeover', async (params) => {
    // Show notification to user
    vscode.window.showInformationMessage(
      `Session overridden: ${params.reason}`,
      'Reclaim'
    ).then(choice => {
      if (choice === 'Reclaim') {
        // TODO: Send takeover to new host
      }
    });
    // Gracefully shut down
    // TODO: kill client, close MCP, release pipe
    return { acknowledged: true };
  });
}
```

### A.3 client-handlers.ts (Client RPC Handlers)

```typescript
// extension/client/handlers.ts
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import type { RegisterHandler } from '../bootstrap';

export function registerClientHandlers(register: RegisterHandler) {
  const trackedTerminals = new Map<string, vscode.Terminal>();

  register('terminal.create', (params) => {
    const id = randomUUID();
    const terminal = vscode.window.createTerminal({
      name: params.name ?? 'Tracked Terminal',
      shellPath: params.shellPath,
      cwd: params.cwd,
    });
    trackedTerminals.set(id, terminal);
    terminal.show();
    return { terminalId: id, name: terminal.name };
  });

  register('terminal.sendText', (params) => {
    const terminal = trackedTerminals.get(params.terminalId);
    if (!terminal) throw new Error(`Terminal ${params.terminalId} not found`);
    terminal.sendText(params.text, params.addNewline ?? true);
    return { sent: true };
  });

  register('terminal.getBuffer', (params) => {
    // TODO: Integrate with TerminalBufferService
    return { output: '', metadata: null, inputHistory: [] };
  });

  register('terminal.list', () => {
    return Array.from(trackedTerminals.entries()).map(([id, t]) => ({
      terminalId: id,
      name: t.name,
    }));
  });

  register('terminal.close', (params) => {
    const terminal = trackedTerminals.get(params.terminalId);
    if (terminal) terminal.dispose();
    trackedTerminals.delete(params.terminalId);
    return { closed: true };
  });

  // Cleanup disposable
  return new vscode.Disposable(() => {
    for (const terminal of trackedTerminals.values()) {
      try { terminal.dispose(); } catch {}
    }
    trackedTerminals.clear();
  });
}
```

### A.4 Tool Migration Example (Before/After)

```typescript
// BEFORE (current — string exec)
await bridgeExec(
  bridgePath,
  `${BRIDGE_CHECK}
  const bridge = globalThis.__trackedTerminalBridge;
  return bridge.sendText(payload.terminalId, payload.text, payload.addNewline ?? true);`,
  { terminalId, text, addNewline },
  10_000,
);

// AFTER (new — typed RPC)
const clientRpc = getClientRpc();
await clientRpc.sendText(terminalId, text, addNewline);
```

---

*End of appendix.*
