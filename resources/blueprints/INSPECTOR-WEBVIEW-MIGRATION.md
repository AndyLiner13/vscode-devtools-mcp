# Inspector WebView Migration Blueprint

## Goal

Replace the current Vite dev-server + external-browser architecture with a **VS Code WebView panel in the Host window** that serves pre-built static files. The WebView GUI lives where you work (Host), but ALL backend logic routes through the **Client** via pipe RPC, so backend changes hot-reload without ever reinstalling the Host extension.

Eliminates TCP ports, external browser windows, and process management entirely.

---

## Architecture: Host vs Client

- **Host** = Main VS Code window (VSIX-installed). Code changes require extension reinstall + restart. Keep Host-side code minimal and stable.
- **Client** = Extension Development Host (spawned window). esbuild watch auto-recompiles → Client picks up changes immediately.
- **MCP server** = Child process. Auto-rebuilds on next tool call.

**Key insight:** The WebView panel lives in the **Host** (where you see it), but acts as a thin shell. ALL backend logic (storage, MCP proxying, symbol lookup, file browsing) lives in the **Client** and is accessed via the existing named pipe RPC. This means:
- Inspector **UI** changes → rebuild frontend → refresh WebView (no Host reinstall)
- Inspector **backend** changes → Client hot-reloads automatically (no Host reinstall)
- Host extension code for the inspector is a **thin relay** that rarely changes

---

## Current Architecture

```
┌─────────────────┐   HTTP (random port)   ┌──────────────────────┐
│  External       │ ◄────────────────────── │  Vite Dev Server     │
│  Browser Tab    │                          │  (inspector/)        │
│                 │   fetch('/api/...')      │                      │
│  inspector UI   │ ─────────────────────► │  db-plugin.ts        │
│  (HTML/JS/CSS)  │                          │  (API middleware)    │
└─────────────────┘                          └──────┬───────────────┘
                                                     │ Named pipes
                                              ┌──────▼───────────────┐
                                              │  Extension Host      │
                                              │  (host-pipe, client) │
                                              └──────────────────────┘
```

### Components

| Component | File | Role |
|---|---|---|
| Inspector Manager | `services/inspectorManager.ts` | Spawns Vite, tracks port/PID, start/stop/restart commands |
| Dev script | `inspector/scripts/dev.mjs` | Uses `getPort()` for random port, launches Vite |
| Vite config | `inspector/vite.config.ts` | Vite build config + Tailwind + `noAutoReload` plugin |
| DB plugin | `inspector/db-plugin.ts` | Vite middleware: SQLite CRUD, MCP/Host/Client pipe proxying, file browse, symbol lookup |
| MCP client | `inspector/src/mcp-client.ts` | Frontend HTTP client for `/api/mcp/*` endpoints |
| Storage | `inspector/src/storage.ts` | Frontend HTTP client for `/api/records/*` + SSE live sync |
| JSON interactivity | `inspector/src/json-interactivity.ts` | `fetch(/api/browse)`, `fetch(/api/symbols)`, `fetch(/api/log)` |
| Monaco setup | `inspector/src/monaco-setup.ts` | Monaco editor config with Vite `?worker` imports |

### API Surface (db-plugin.ts → 14 Endpoints)

| Endpoint | Method | Category | Frontend Consumer |
|---|---|---|---|
| `/api/mcp/tools` | POST | MCP proxy | `mcp-client.ts` |
| `/api/mcp/call` | POST | MCP proxy | `mcp-client.ts` |
| `/api/records` | GET | SQLite CRUD | `storage.ts` |
| `/api/records` | POST | SQLite CRUD | `storage.ts` |
| `/api/records/:id` | GET | SQLite CRUD | `storage.ts` |
| `/api/records/:id` | DELETE | SQLite CRUD | `storage.ts` |
| `/api/records/:id/rating` | PATCH | SQLite CRUD | `storage.ts` |
| `/api/records/:id/comment` | PATCH | SQLite CRUD | `storage.ts` |
| `/api/records/:id/output` | PATCH | SQLite CRUD | `storage.ts` |
| `/api/records/mark-stale` | POST | SQLite CRUD | `storage.ts` |
| `/api/records/reorder` | POST | SQLite CRUD | `storage.ts` |
| `/api/prune-unrated` | POST | SQLite CRUD | `storage.ts` |
| `/api/browse` | GET | File system | `json-interactivity.ts` |
| `/api/symbols` | GET | VS Code API | `json-interactivity.ts` |
| `/api/log` | POST | Logging | `mcp-client.ts`, `json-interactivity.ts` |
| `/api/events` | GET (SSE) | Live sync | `storage.ts` |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Host Window (Main VS Code - VSIX installed)             │
│                                                           │
│  ┌───────────────────────────────────┐                   │
│  │  WebView Panel (Editor Tab)       │                   │
│  │  inspector UI (HTML/JS/CSS)       │  postMessage()    │
│  │  from inspector/dist/             │ <-------------->   │
│  └──────────────┬────────────────────┘                   │
│                  │                                        │
│  ┌──────────────v────────────────────┐                   │
│  │  Host Extension (thin relay)      │                   │
│  │  inspectorPanel.ts                │                   │
│  │  - Creates/manages WebView panel  │                   │
│  │  - Forwards ALL messages to       │                   │
│  │    Client via pipe RPC            │                   │
│  │  - Returns Client responses to    │                   │
│  │    WebView via postMessage        │                   │
│  └──────────────┬────────────────────┘                   │
└─────────────────┼─────────────────────────────────────────┘
                   │ Named pipe (client-pipe)
┌─────────────────┼─────────────────────────────────────────┐
│  Client Window   │ (Extension Development Host)            │
│  (Hot-reloads    v  automatically via esbuild watch)       │
│                                                            │
│  ┌─────────────────────────────────────┐                  │
│  │  Client Extension Code              │                  │
│  │  inspectorBackend.ts                │                  │
│  │                                      │                  │
│  │  RPC handlers for:                  │                  │
│  │  - Storage (workspaceState)         │                  │
│  │  - MCP pipe proxy (tools, call)     │                  │
│  │  - VS Code API (symbols, commands)  │                  │
│  │  - File browsing (fs.readdirSync)   │                  │
│  │  - Logging (output channel)         │                  │
│  └──────────────┬──────────────────────┘                  │
│                  │ Named pipes                              │
│  ┌──────────────v──────────────────────┐                  │
│  │  MCP Server (child process)          │                  │
│  └─────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────┘
```

### Key Changes

- **WebView lives in the Host window** — where you work, where you see the GUI
- **Host is a thin relay** — receives postMessage, forwards to Client via pipe RPC, returns response. Minimal code that rarely changes.
- **ALL backend logic lives in the Client** — storage, MCP proxy, symbols, file browsing, logging. Hot-reloads automatically.
- **No TCP ports** — WebView loads files via `vscode-webview://` protocol
- **No Vite process** — esbuild bundles inspector to `inspector/dist/`
- **No external browser** — WebView opens as an editor tab inside VS Code
- **No HTTP API** — Frontend uses `postMessage()` → Host relay → Client pipe RPC
- **Storage uses Client's `workspaceState`** — built into VS Code, no SQLite dependency
- **On-demand rebuild** — `npm run inspector:build` rebuilds the frontend. WebView refreshes on next open.
- **No Host reinstall for ANY inspector change** — UI changes rebuild frontend; backend changes hot-reload in Client

---

## Migration Plan

### Phase 1: Build System (esbuild for Inspector)

**Create `inspector/esbuild.mjs`**

An esbuild config that bundles the inspector frontend into `inspector/dist/`:
- Entry point: `inspector/src/main.ts`
- Output: `inspector/dist/main.js` + `inspector/dist/main.css`
- Handles Monaco editor workers (inline or separate chunk)
- Handles Tailwind CSS (postcss or tailwind CLI)
- Generates `inspector/dist/index.html` from template

**Monaco Worker Handling:**

Currently uses Vite's `?worker` imports. For esbuild, options:
1. **Inline workers** via `new Worker(new URL(...), { type: 'module' })` and esbuild's worker plugin
2. **Pre-built worker files** — build Monaco workers as separate entry points, reference them by relative URL
3. **Use `monaco-editor/esm/vs/editor/editor.worker` bundled as a data URL** (smaller but less clean)

Recommended: **Option 2** — build workers as separate files in `inspector/dist/`, reference them via the WebView's `asWebviewUri()`.

**Tailwind Handling:**

Currently uses `@tailwindcss/vite` plugin. For esbuild:
- Use `tailwindcss` CLI to compile CSS separately: `tailwindcss -i inspector/src/styles.css -o inspector/dist/styles.css`
- Or use `postcss` with `esbuild-postcss` plugin
- Recommended: **Tailwind CLI** as a pre-step, simplest and most reliable

**npm scripts:**
```json
{
  "scripts": {
    "inspector:build": "tailwindcss -i src/styles.css -o dist/styles.css && node esbuild.mjs"
  }
}
```

### Phase 2: Communication Layer (postMessage Bridge)

**Create a message protocol** to replace all 16 HTTP endpoints.

```typescript
// Shared types (used by both WebView and extension)
interface InspectorMessage {
  id: string;          // Unique request ID for correlating responses
  type: 'request' | 'response' | 'event';
  method: string;      // e.g. 'mcp/tools', 'records/get', 'browse', 'symbols'
  params?: unknown;    // Request parameters
  result?: unknown;    // Response data
  error?: string;      // Error message
}
```

**Frontend bridge module (`inspector/src/bridge.ts`):**

Replaces all `fetch()` calls with a unified `postMessage` request/response pattern:

```typescript
// Wraps postMessage with request-response correlation
function rpc<T>(method: string, params?: unknown): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as InspectorMessage;
      if (msg.id === id && msg.type === 'response') {
        window.removeEventListener('message', handler);
        if (msg.error) reject(new Error(msg.error));
        else resolve(msg.result as T);
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ id, method, params, type: 'request' });
  });
}
```

**Host-side relay (`services/inspectorPanel.ts` — runs in Host window):**

Receives messages from WebView, forwards them to the Client via the existing named pipe RPC, and returns the Client's response. This is a thin relay — no business logic here.

Since this code rarely changes, you almost never need to reinstall the Host.

```typescript
panel.webview.onDidReceiveMessage(async (msg: InspectorMessage) => {
  if (msg.type !== 'request') return;
  try {
    // Forward to Client via existing pipe RPC infrastructure
    const result = await sendClientRpc(msg.method, msg.params);
    panel.webview.postMessage({ id: msg.id, result, type: 'response' });
  } catch (err) {
    panel.webview.postMessage({ id: msg.id, error: String(err), type: 'response' });
  }
});
```

**Client-side backend (`services/inspectorBackend.ts` — runs in Client window):**

Registers RPC handlers for all inspector operations. This is where ALL the business logic lives — and it hot-reloads with the Client.

```typescript
// Registered in client-handlers.ts during Client activation
registerInspectorHandlers(pipeServer, workspaceState);

// Each method maps to a handler:
// 'mcp/tools'        → forward to MCP pipe
// 'mcp/call'         → forward to MCP pipe
// 'records/list'     → workspaceState.get(...)
// 'records/create'   → workspaceState.update(...)
// 'fs/browse'        → fs.readdirSync(...)
// 'editor/symbols'   → vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', ...)
// 'log'              → outputChannel.appendLine(...)
```

**Method mapping (HTTP → postMessage → pipe RPC):**

All requests follow: WebView `postMessage` → Host relay → Client pipe RPC → Client handler

| Old HTTP Endpoint | New Method Name | Client Handler |
|---|---|---|
| `POST /api/mcp/tools` | `mcp/tools` | → MCP pipe |
| `POST /api/mcp/call` | `mcp/call` | → MCP pipe |
| `GET /api/records?tool=X` | `records/list` | → workspaceState |
| `POST /api/records` | `records/create` | → workspaceState |
| `GET /api/records/:id` | `records/get` | → workspaceState |
| `DELETE /api/records/:id` | `records/delete` | → workspaceState |
| `PATCH /api/records/:id/rating` | `records/rating` | → workspaceState |
| `PATCH /api/records/:id/comment` | `records/comment` | → workspaceState |
| `PATCH /api/records/:id/output` | `records/output` | → workspaceState |
| `POST /api/records/mark-stale` | `records/markStale` | → workspaceState |
| `POST /api/records/reorder` | `records/reorder` | → workspaceState |
| `POST /api/prune-unrated` | `records/pruneUnrated` | → workspaceState |
| `GET /api/browse` | `fs/browse` | → `fs.readdirSync` |
| `GET /api/symbols` | `editor/symbols` | → VS Code API |
| `POST /api/log` | `log` | → output channel |
| `GET /api/events` (SSE) | `event` push | → Client pushes via pipe → Host forwards via `postMessage` |

### Phase 3: WebView Panel + Client Backend

#### 3A: Host-Side Panel (`services/inspectorPanel.ts` — runs in Host)

A thin, stable shell. Creates the WebView, loads the HTML, and relays messages to the Client. This code rarely changes.

```typescript
export class InspectorPanelProvider {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly sendClientRpc: (method: string, params?: unknown) => Promise<unknown>,
    private readonly logger: (msg: string) => void
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    this.panel = vscode.window.createWebviewPanel(
      'mcpInspector',
      'MCP Inspector',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'inspector', 'dist')
        ]
      }
    );
    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage(msg => this.relayToClient(msg));
    this.panel.onDidDispose(() => { this.panel = undefined; });
  }

  // Thin relay: forward every message to Client, return response to WebView
  private async relayToClient(msg: InspectorMessage): Promise<void> {
    if (msg.type !== 'request') return;
    try {
      const result = await this.sendClientRpc(msg.method, msg.params);
      this.panel?.webview.postMessage({ id: msg.id, result, type: 'response' });
    } catch (err) {
      this.panel?.webview.postMessage({ id: msg.id, error: String(err), type: 'response' });
    }
  }

  // Push events from Client to WebView (Client calls this via pipe RPC)
  pushEvent(event: InspectorMessage): void {
    this.panel?.webview.postMessage(event);
  }

  private getHtml(): string {
    const distUri = vscode.Uri.joinPath(this.extensionUri, 'inspector', 'dist');
    const mainJs = this.panel!.webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'main.js'));
    const mainCss = this.panel!.webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'styles.css'));
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
            style-src ${this.panel!.webview.cspSource} 'unsafe-inline';
            script-src 'nonce-${nonce}';
            font-src ${this.panel!.webview.cspSource};
            worker-src ${this.panel!.webview.cspSource} blob:;">
        <link rel="stylesheet" href="${mainCss}">
      </head>
      <body class="bg-vscode-bg text-vscode-text h-screen overflow-hidden">
        <div id="app" class="flex flex-col h-full"></div>
        <script nonce="${nonce}" src="${mainJs}"></script>
      </body>
      </html>`;
  }
}
```

**Registration in Host activation:**

```typescript
// In the host role section of extension.ts:
const inspectorPanel = new InspectorPanelProvider(
  context.extensionUri,
  sendClientRpc,  // existing pipe RPC function
  log
);
context.subscriptions.push(
  vscode.commands.registerCommand('devtools.openInspector', () => inspectorPanel.show())
);
```

#### 3B: Client-Side Backend (`services/inspectorBackend.ts` — runs in Client)

ALL business logic lives here. This hot-reloads with the Client.

```typescript
import type { PipeServer } from './runtime';

export function registerInspectorHandlers(
  pipeServer: PipeServer,
  workspaceState: vscode.Memento,
  sendMcpRpc: (method: string, params?: unknown) => Promise<unknown>
): void {
  // Storage CRUD
  pipeServer.on('records/list', async (params) => {
    const allRecords = workspaceState.get<Record[]>('inspector.records', []);
    return params.tool ? allRecords.filter(r => r.tool === params.tool) : allRecords;
  });
  pipeServer.on('records/create', async (params) => {
    const records = workspaceState.get<Record[]>('inspector.records', []);
    records.push(params.record);
    await workspaceState.update('inspector.records', records);
    return params.record;
  });
  // ... remaining CRUD handlers

  // MCP proxy
  pipeServer.on('mcp/tools', async () => sendMcpRpc('tools/list'));
  pipeServer.on('mcp/call', async (params) => sendMcpRpc('tools/call', params));

  // VS Code API
  pipeServer.on('editor/symbols', async (params) => {
    const uri = vscode.Uri.file(params.filePath);
    return vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
  });

  // File browsing
  pipeServer.on('fs/browse', async (params) => {
    return fs.readdirSync(params.path, { withFileTypes: true })
      .map(entry => ({ name: entry.name, isDirectory: entry.isDirectory() }));
  });

  // Logging
  pipeServer.on('log', async (params) => {
    outputChannel.appendLine(params.message);
  });
}
```

**Registration in Client activation:**

```typescript
// In the client role section of extension.ts:
registerInspectorHandlers(pipeServer, context.workspaceState, sendMcpRpc);
```
```

### Phase 4: Frontend Refactor

**Files to modify:**

| File | Change |
|---|---|
| `inspector/src/mcp-client.ts` | Replace all `fetch()` with `bridge.rpc()` |
| `inspector/src/storage.ts` | Replace all `fetch()` with `bridge.rpc()`, replace `EventSource` with message listener |
| `inspector/src/json-interactivity.ts` | Replace `fetch(/api/browse)` and `fetch(/api/symbols)` with `bridge.rpc()`, replace `fetch(/api/log)` with `bridge.rpc()` |
| `inspector/src/monaco-setup.ts` | Replace Vite `?worker` imports with standard esbuild-compatible worker loading |
| `inspector/src/main.ts` | Remove SSE connection, initialize bridge |
| `inspector/src/vite-env.d.ts` | Remove (Vite-specific type declarations) |

**Files to create:**

| File | Purpose |
|---|---|
| `inspector/src/bridge.ts` | postMessage RPC bridge (request/response + event listener) |
| `inspector/esbuild.mjs` | esbuild config for inspector bundle |
| `services/inspectorPanel.ts` | Host-side WebView panel provider (thin relay) |
| `services/inspectorBackend.ts` | Client-side RPC handlers (storage, MCP proxy, symbols, etc.) |

**Files to delete (after migration complete):**

| File | Reason |
|---|---|
| `inspector/db-plugin.ts` | Logic split into `inspectorPanel.ts` (relay) + `inspectorBackend.ts` (business logic) |
| `inspector/vite.config.ts` | No longer using Vite |
| `inspector/scripts/dev.mjs` | No longer using Vite |
| `inspector/src/vite-env.d.ts` | Vite-specific types no longer needed |
| `services/inspectorManager.ts` | No Vite process to manage |

### Phase 5: Extension Integration

**Modify `extension.ts` — Host role section:**
- Register `InspectorPanelProvider` (thin relay) in the Host activation path
- Register `devtools.openInspector` command
- Remove `registerInspectorCommands()` + `ensureInspectorRunning()` + `shutdownInspector()`
- Remove ALL Vite process management
- The Host code for the inspector is minimal and rarely changes → almost never needs reinstall

**Modify `extension.ts` — Client role section:**
- Call `registerInspectorHandlers()` from `inspectorBackend.ts` during Client activation
- Register RPC handlers for all inspector methods on the pipe server
- This is the bulk of the inspector backend → hot-reloads with Client

**Modify `package.json`:**
- Replace `devtools.startInspector` / `stopInspector` / `restartInspector` with:
  - `devtools.openInspector` — "Open MCP Inspector"
  - `devtools.refreshInspector` — "Refresh MCP Inspector" (smart rebuild + refresh)
- Add keybinding: `ctrl+r` → `devtools.refreshInspector` when `activeWebviewPanelId == 'mcpInspector'`

**Modify `services/client-handlers.ts`:**
- Import and call `registerInspectorHandlers()` from `inspectorBackend.ts`
- All inspector RPC methods registered on pipe server → hot-reload with Client

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Monaco workers in WebView CSP | Workers need `blob:` or data URL src | Use `worker-src blob:` in CSP; test with esbuild worker plugin |
| Tailwind without Vite plugin | CSS may differ | Use Tailwind CLI v4 which is standalone |
| `localStorage` for input/output state | WebView has scoped localStorage, may lose data | Use `retainContextWhenHidden: true` + back up to `workspaceState` via postMessage |
| SSE live sync across tabs | No multiple tabs in WebView | Remove SSE entirely — only one panel exists. Use direct postMessage push for mutations. |
| Large postMessage payloads | MCP tool results can be large | postMessage handles large messages fine; no chunking needed |
| Client window not running | Inspector backend unreachable | Host relay detects pipe disconnect and shows "Client not connected" message in WebView |
| Storage migration from SQLite | Existing inspector.db data | One-time migration: read SQLite → write to workspaceState on first Client activation |

---

## Development Workflow (After Migration)

### Smart Refresh: Ctrl+R in the Inspector WebView

When the Inspector WebView panel is focused, pressing **Ctrl+R** triggers a comprehensive rebuild-and-refresh cycle:

**Keybinding:**
```json
{
  "key": "ctrl+r",
  "command": "devtools.refreshInspector",
  "when": "activeWebviewPanelId == 'mcpInspector'"
}
```

**What Ctrl+R does (rebuild orchestrator):**

1. **Detect what needs rebuilding** — compare source file mtimes vs build output mtimes for each entity:
   - **Inspector frontend** (`inspector/src/` vs `inspector/dist/`) — needs explicit `npm run inspector:build`
   - **MCP server** (`mcp-server/src/` vs `mcp-server/build/`) — needs `npm run mcp:build`
   - **Client extension** (`services/`, `extension.ts`, etc. vs `dist/`) — already handled by esbuild watch, but verify Client is connected

2. **Rebuild all stale entities** — run builds in parallel where possible, show progress notification in Host

3. **Wait for dependent services** — once builds complete:
   - If MCP server was rebuilt → wait for it to start and be ready
   - If Client extension was rebuilt → wait for Client to hot-reload and reconnect pipe
   - These are already automatic — just need to wait for pipe to be responsive

4. **Refresh WebView** — once everything is current, re-set `panel.webview.html` to load the latest `inspector/dist/` files

**Flow diagram:**
```
Ctrl+R pressed (Host, Inspector focused)
  │
  ├─ Check: inspector/src newer than inspector/dist?
  │    └─ Yes → npm run inspector:build
  │
  ├─ Check: mcp-server/src newer than mcp-server/build?
  │    └─ Yes → npm run mcp:build
  │
  ├─ Check: extension src newer than dist/?
  │    └─ Yes → esbuild watch already handles this
  │         └─ Wait for Client pipe to reconnect
  │
  ├─ Wait for all builds to complete
  ├─ Wait for MCP server to be ready (if rebuilt)
  ├─ Wait for Client pipe to be connected (if reloaded)
  │
  └─ Refresh WebView (panel.webview.html = getHtml())
```

**Staleness detection (content-based hashing):**

Uses hashes of actual source file contents, NOT file metadata/mtimes (unreliable on Windows with junctions/symlinks).

After each successful build, store a hash of all source files. On Ctrl+R, re-hash and compare.

```typescript
import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function hashDirectory(dir: string, extensions: string[]): string {
  const hash = createHash('sha256');
  const files = collectFiles(dir, extensions); // recursive, sorted for determinism
  for (const file of files) {
    hash.update(file);                         // include relative path
    hash.update(readFileSync(file));           // include file contents
  }
  return hash.digest('hex');
}

function isStale(entity: 'inspector' | 'mcp-server' | 'extension'): boolean {
  const currentHash = hashDirectory(srcDir[entity], srcExtensions[entity]);
  const lastBuildHash = workspaceState.get<string>(`buildHash.${entity}`);
  return currentHash !== lastBuildHash;
}

// After successful build:
async function recordBuild(entity: string, srcDir: string, extensions: string[]): Promise<void> {
  const hash = hashDirectory(srcDir, extensions);
  await workspaceState.update(`buildHash.${entity}`, hash);
}
```

This ensures:
- No false positives from metadata changes (touch, copy, junction sync)
- No false negatives from unchanged mtimes
- Deterministic comparison (sorted file list, both path and content hashed)

**Where the logic lives:**
- **Host** (`inspectorPanel.ts`): Keybinding handler, calls `sendClientRpc('dev/smartRefresh')`, then refreshes WebView HTML when complete
- **Client** (`inspectorBackend.ts`): Runs the actual staleness checks, triggers builds, waits for services. Hot-reloads with Client so the orchestration logic itself can be updated.

This keeps the Host thin — it just sends one RPC and refreshes on completion. All the intelligence is in the Client.

### Manual workflow (without Ctrl+R):

#### Inspector UI changes:
1. Edit files in `inspector/src/`
2. Run `npm run inspector:build`
3. Press Ctrl+R in the Inspector panel (or just refresh)

#### Inspector backend changes:
1. Edit files in `services/inspectorBackend.ts` or related Client-side code
2. esbuild watch recompiles → Client window hot-reloads automatically
3. WebView keeps working — pipe RPC handlers update in place

#### MCP server changes:
1. Edit files in `mcp-server/src/`
2. MCP server auto-rebuilds on next tool call (existing behavior)
3. Or press Ctrl+R in Inspector to force rebuild

### Host relay code (`inspectorPanel.ts`):
- Rarely changes — it's just a message forwarder + Ctrl+R trigger
- If it DOES change, the Host needs to reinstall (but this should be very rare)

### No Host reinstall needed for virtually ALL inspector changes.

---

## Implementation Order

1. **Create `inspector/esbuild.mjs`** — get the build system working first
2. **Create `inspector/src/bridge.ts`** — postMessage RPC bridge
3. **Create `services/inspectorPanel.ts`** — Host-side WebView provider (thin relay)
4. **Create `services/inspectorBackend.ts`** — Client-side RPC handlers (all business logic)
5. **Migrate `mcp-client.ts`** — simplest, only 3 endpoints
6. **Migrate `storage.ts`** — 8 CRUD endpoints + SSE → push events
7. **Migrate `json-interactivity.ts`** — browse + symbols + log
8. **Migrate `monaco-setup.ts`** — worker loading for esbuild
9. **Update `extension.ts`** — Host: register panel; Client: register handlers
10. **Delete old files** — db-plugin, vite.config, dev.mjs, inspectorManager
11. **Test end-to-end** — all tool operations, history, intellisense

---

## Files Inventory

### Will Be Modified
- `extension.ts` — Host: register panel + relay; Client: register inspector backend handlers
- `package.json` — Update commands, remove Vite-related inspector scripts
- `inspector/package.json` — Replace Vite deps with esbuild, remove get-port, remove better-sqlite3
- `inspector/tsconfig.json` — Adjust for esbuild output
- `inspector/src/main.ts` — Initialize bridge, remove SSE
- `inspector/src/mcp-client.ts` — `fetch()` → `bridge.rpc()`
- `inspector/src/storage.ts` — `fetch()` → `bridge.rpc()`, `EventSource` → message listener
- `inspector/src/json-interactivity.ts` — `fetch()` → `bridge.rpc()`
- `inspector/src/monaco-setup.ts` — Vite worker imports → esbuild workers
- `services/client-handlers.ts` — Import and call `registerInspectorHandlers()`

### Will Be Created
- `inspector/esbuild.mjs` — esbuild build config
- `inspector/src/bridge.ts` — postMessage RPC bridge
- `services/inspectorPanel.ts` — Host-side WebView panel provider (thin relay)
- `services/inspectorBackend.ts` — Client-side RPC handlers (storage, MCP proxy, symbols, etc.)

### Will Be Deleted (After Validation)
- `inspector/db-plugin.ts` — Logic split: storage → inspectorBackend.ts, API → inspectorBackend.ts
- `inspector/vite.config.ts` — No longer needed
- `inspector/scripts/dev.mjs` — No longer needed
- `inspector/src/vite-env.d.ts` — Vite-specific types
- `services/inspectorManager.ts` — No Vite process to manage
