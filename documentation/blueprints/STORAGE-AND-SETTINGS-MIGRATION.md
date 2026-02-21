# Storage & Settings Migration Blueprint

> **Status**: Draft  
> **Created**: 2026-02-20  
> **Scope**: Migrate all `.devtools/` temporary state to VS Code workspace storage, replace config files with VS Code settings, and add GitHub repo sandbox support for client workspaces.

---

## Table of Contents

1. [Current State](#current-state)
2. [Target Architecture](#target-architecture)
3. [Phase 1: Temp State → Workspace Storage](#phase-1-temp-state--workspace-storage)
4. [Phase 2: Config Files → VS Code Settings](#phase-2-config-files--vs-code-settings)
5. [Phase 3: Config Delivery to MCP Server](#phase-3-config-delivery-to-mcp-server)
6. [Phase 4: Client User-Data → Workspace Storage](#phase-4-client-user-data--workspace-storage)
7. [Phase 5: GitHub Repo Sandbox](#phase-5-github-repo-sandbox)
8. [Phase 6: Cleanup](#phase-6-cleanup)
9. [Settings Schema](#settings-schema)
10. [Migration Path](#migration-path)
11. [Risk Analysis](#risk-analysis)

---

## Current State

### Files in `.devtools/` folder

| File | Writer | Purpose | Type |
|------|--------|---------|------|
| `host.config.jsonc` | `config.ts`, `project.ts` | Host settings (clientWorkspace, extensionPath, lmToolsWorkspace, hotReload) | User config |
| `client.config.jsonc` | `config.ts` | Client runtime settings (headless, launch flags, experiments) | User config |
| `host-session.json` | `host-handlers.ts` | Persisted client PID, CDP port, inspector port | Temp state |
| `active-processes.json` | `processLedger.ts` | Currently running process entries | Temp state |
| `process-log.jsonl` | `processLedger.ts` | Append-only process event log | Temp state |
| `user-data/` | `host-handlers.ts` | Electron `--user-data-dir` for Client window | Runtime data |

### Files in workspace root

| File | Writer | Purpose | Type |
|------|--------|---------|------|
| `.devtoolsignore` | User | Ignore patterns for codebase tools | User config |

### How config reaches the MCP server today

```
.devtools/host.config.jsonc  ──→  MCP server reads via fs  ──→  loadConfig()
.devtools/client.config.jsonc ──→  MCP server reads via fs  ──→  loadConfig()
                                                                    │
                                                                    ▼
                                                          lifecycleService.init()
                                                          Tool registration
```

The MCP server is spawned by `McpServerDefinitionProvider.provideMcpServerDefinitions()` which returns a `McpStdioServerDefinition(label, command, args, env)`. The `env` parameter allows passing config values as environment variables.

---

## Target Architecture

```
                    VS Code Settings (contributes.configuration)
                              │
                    ┌─────────┴─────────┐
                    │                   │
            Extension reads      Extension passes
            settings directly    via env vars
                    │                   │
                    ▼                   ▼
             host-handlers.ts    McpStdioServerDefinition(
             processLedger.ts      label, command, args,
             readHostOutput.ts     env: { DEVTOOLS_CONFIG: JSON }
             project.ts          )
                    │                   │
                    │                   ▼
                    │            MCP server reads
                    │            process.env.DEVTOOLS_CONFIG
                    │            instead of .devtools/ files
                    │
                    ▼
         Workspace Storage (context.storageUri)
         ├── host-session.json
         ├── active-processes.json
         ├── process-log.jsonl
         └── user-data/           ← Electron --user-data-dir
```

### What stays in workspace

- `.devtoolsignore` — user-facing, version-controlled, read by both extension and MCP server

### What gets deleted

- `.devtools/host.config.jsonc` — replaced by VS Code settings
- `.devtools/client.config.jsonc` — replaced by VS Code settings
- `.devtools/host-session.json` — moved to workspace storage
- `.devtools/active-processes.json` — moved to workspace storage
- `.devtools/process-log.jsonl` — moved to workspace storage
- `.devtools/user-data/` — moved to workspace storage

---

## Phase 1: Temp State → Workspace Storage

**Goal**: Move `process-log.jsonl`, `active-processes.json`, and `host-session.json` to `context.storageUri`.

### Changes

#### 1a. `processLedger.ts` — Storage path migration

**Before**: Uses `path.join(workspacePath, '.devtools')` for storage.  
**After**: Accepts a `storagePath: string` constructor parameter.

```typescript
// Constructor change
export class ProcessLedger {
  constructor(private readonly storagePath: string) {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// Singleton change — needs storage path from extension context
let instance: ProcessLedger | null = null;

export function initProcessLedger(storagePath: string): ProcessLedger {
  instance = new ProcessLedger(storagePath);
  return instance;
}
```

**Files modified**: `services/processLedger.ts`  
**Callers updated**: `extension.ts` (pass `context.storageUri.fsPath`), any service that calls `getProcessLedger()`

#### 1b. `host-handlers.ts` — Session file migration

**Before**: `getSessionFilePath()` returns `.devtools/host-session.json`.  
**After**: `registerHostHandlers` receives `storagePath` and uses it for session persistence.

```typescript
// Signature change
export function registerHostHandlers(
  register: RegisterHandler,
  context: vscode.ExtensionContext,
  storagePath: string,
): void

// Internal change
function getSessionFilePath(): string {
  return path.join(storagePath, 'host-session.json');
}
```

**Files modified**: `services/host-handlers.ts`  
**Callers updated**: `extension.ts`

#### 1c. `extension.ts` — Provide storage path

```typescript
// In activate()
const storagePath = context.storageUri?.fsPath;
if (storagePath) {
  await vscode.workspace.fs.createDirectory(context.storageUri);
}

// Pass to processLedger
initProcessLedger(storagePath ?? fallbackPath);

// Pass to host handlers
registerHostHandlers(bootstrap.registerHandler, context, storagePath ?? fallbackPath);
```

---

## Phase 2: Config Files → VS Code Settings

**Goal**: Replace `.devtools/host.config.jsonc` and `.devtools/client.config.jsonc` with `contributes.configuration` settings.

### Settings Schema (in `package.json`)

All settings use the `devtools.` prefix as specified.

```jsonc
{
  "contributes": {
    "configuration": {
      "title": "VS Code DevTools",
      "properties": {
        // ── Host Settings ──
        "devtools.clientWorkspace": {
          "type": "string",
          "default": "",
          "description": "Path to the client workspace folder (absolute, or relative to host workspace root). If empty, uses the host workspace root.",
          "scope": "resource"
        },
        "devtools.extensionPath": {
          "type": "string",
          "default": ".",
          "description": "Path to the vscode-devtools extension folder (absolute, or relative to host workspace root).",
          "scope": "resource"
        },
        "devtools.lmToolsWorkspace": {
          "type": "string",
          "default": ".",
          "description": "Workspace scope for host LM tools. Set via the sidebar tree view.",
          "scope": "resource"
        },

        // ── Client Settings ──
        "devtools.client.devDiagnostic": {
          "type": "boolean",
          "default": false,
          "description": "Enable extra diagnostic tools (debug_evaluate)."
        },
        "devtools.client.headless": {
          "type": "boolean",
          "default": false,
          "description": "Run Client VS Code headless (Linux only)."
        },
        "devtools.client.experimentalVision": {
          "type": "boolean",
          "default": false,
          "description": "Enable experimental vision tools."
        },
        "devtools.client.experimentalStructuredContent": {
          "type": "boolean",
          "default": false,
          "description": "Enable experimental structured content output."
        },

        // ── Launch Flags ──
        "devtools.launch.newWindow": {
          "type": "boolean",
          "default": true,
          "description": "Open the client workspace in a new window."
        },
        "devtools.launch.disableExtensions": {
          "type": "boolean",
          "default": true,
          "description": "Disable all extensions except those in enableExtensions."
        },
        "devtools.launch.skipReleaseNotes": {
          "type": "boolean",
          "default": true,
          "description": "Suppress the release-notes tab on startup."
        },
        "devtools.launch.skipWelcome": {
          "type": "boolean",
          "default": true,
          "description": "Suppress the welcome tab on startup."
        },
        "devtools.launch.disableGpu": {
          "type": "boolean",
          "default": false,
          "description": "Disable GPU hardware acceleration."
        },
        "devtools.launch.disableWorkspaceTrust": {
          "type": "boolean",
          "default": false,
          "description": "Disable workspace-trust dialog."
        },
        "devtools.launch.verbose": {
          "type": "boolean",
          "default": false,
          "description": "Enable verbose VS Code logging."
        },
        "devtools.launch.locale": {
          "type": ["string", "null"],
          "default": null,
          "description": "Set the display language (e.g. 'en', 'de'). Null uses OS default."
        },
        "devtools.launch.enableExtensions": {
          "type": "array",
          "items": { "type": "string" },
          "default": [
            "vscode.typescript-language-features",
            "github.copilot-chat"
          ],
          "description": "Extension IDs to keep enabled when disableExtensions is true."
        },
        "devtools.launch.extraArgs": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "Arbitrary extra CLI flags forwarded verbatim to the client VS Code."
        },

        // ── Hot Reload ──
        "devtools.hotReload.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable automatic hot-reload on source changes."
        },
        "devtools.hotReload.restartDelay": {
          "type": "number",
          "default": 2000,
          "description": "Delay (ms) between stopping and starting MCP server during restart."
        },
        "devtools.hotReload.mcpStatusTimeout": {
          "type": "number",
          "default": 60000,
          "description": "Max wait time (ms) for MCP status tool before timeout."
        },

        // ── Session Persistence ──
        "devtools.session.persistence": {
          "type": "string",
          "enum": ["session", "permanent"],
          "default": "session",
          "enumDescriptions": [
            "Client data persists until Host extension reloads",
            "Client data persists permanently unless manually deleted"
          ],
          "description": "How long client window data (user-data, extensions cache) should persist."
        }
      }
    }
  }
}
```

### Changes

#### 2a. Extension reads settings directly

```typescript
// New utility in extension or a shared settings module
function getDevtoolsConfig(): ResolvedConfig {
  const config = vscode.workspace.getConfiguration('devtools');
  return {
    clientWorkspace: config.get<string>('clientWorkspace', ''),
    extensionPath: config.get<string>('extensionPath', '.'),
    lmToolsWorkspace: config.get<string>('lmToolsWorkspace', '.'),
    devDiagnostic: config.get<boolean>('client.devDiagnostic', false),
    headless: config.get<boolean>('client.headless', false),
    // ... etc
  };
}
```

#### 2b. `gui/primarySidebar/project.ts` — Read/write VS Code settings

**Before**: Reads/writes `lmToolsWorkspace` in `.devtools/host.config.jsonc` via JSONC manipulation.  
**After**: Uses `vscode.workspace.getConfiguration('devtools').update('lmToolsWorkspace', value)`.

#### 2c. Settings gear icon in Tree View

Add a gear icon to the tree view title bar that opens the settings filtered to `devtools.`:

```jsonc
{
  "command": "vscode-devtools.openSettings",
  "title": "VS Code DevTools: Settings",
  "icon": "$(gear)"
}
```

Menu contribution:
```jsonc
{
  "command": "vscode-devtools.openSettings",
  "when": "view == vscdt.project",
  "group": "navigation@2"
}
```

Command handler:
```typescript
vscode.commands.registerCommand('vscode-devtools.openSettings', () => {
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:AndyLiner.vscode-devtools');
});
```

---

## Phase 3: Config Delivery to MCP Server

**Goal**: Pass resolved config from extension settings to the MCP server via environment variables, eliminating the MCP server's dependency on `.devtools/` config files.

### Approach: Environment Variables

The `McpStdioServerDefinition` constructor accepts an `env` parameter. The extension serializes the resolved config as a JSON string in `DEVTOOLS_CONFIG`.

#### 3a. `mcpServerProvider.ts` — Pass config via env

```typescript
provideMcpServerDefinitions(_token: vscode.CancellationToken): vscode.McpStdioServerDefinition[] {
  const config = vscode.workspace.getConfiguration('devtools');
  const resolvedConfig = {
    clientWorkspace: resolveAbsolutePath(config.get<string>('clientWorkspace', '')),
    extensionPath: resolveAbsolutePath(config.get<string>('extensionPath', '.')),
    devDiagnostic: config.get<boolean>('client.devDiagnostic', false),
    headless: config.get<boolean>('client.headless', false),
    experimentalVision: config.get<boolean>('client.experimentalVision', false),
    experimentalStructuredContent: config.get<boolean>('client.experimentalStructuredContent', false),
    launch: {
      newWindow: config.get<boolean>('launch.newWindow', true),
      disableExtensions: config.get<boolean>('launch.disableExtensions', true),
      // ... all launch flags
    },
    hotReload: {
      enabled: config.get<boolean>('hotReload.enabled', true),
      // ... all hot reload settings
    },
  };

  return [
    new vscode.McpStdioServerDefinition(
      'VS Code DevTools',
      'node',
      [initScript],
      {
        DEVTOOLS_CONFIG: JSON.stringify(resolvedConfig),
        DEVTOOLS_USER_DATA_DIR: userDataPath,
      },
    ),
  ];
}
```

#### 3b. `mcp-server/src/config.ts` — Read from env, fall back to files

```typescript
export function loadConfig(): ResolvedConfig {
  // Priority 1: Environment variable (set by extension via McpStdioServerDefinition)
  const envConfig = process.env.DEVTOOLS_CONFIG;
  if (envConfig) {
    return parseEnvConfig(envConfig);
  }

  // Priority 2: File-based config (standalone/development mode)
  return loadConfigFromFiles();
}
```

This maintains backward compatibility — the MCP server can still run standalone during development.

#### 3c. Settings change → MCP restart

Listen for settings changes and trigger MCP server definition refresh:

```typescript
context.subscriptions.push(
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('devtools')) {
      mcpProvider.refresh(); // fires onDidChangeMcpServerDefinitions
    }
  }),
);
```

---

## Phase 4: Client User-Data → Workspace Storage

**Goal**: Move the Electron `--user-data-dir` from `.devtools/user-data/` to `context.storageUri/user-data/`.

### Design: Per-Host-Workspace, Not Per-Client-Dir

The user-data directory is stored in workspace storage, which is keyed per Host workspace. Changing `devtools.clientWorkspace` does NOT change the user-data — extensions, settings, and state persist across client directory changes.

### Session Persistence Behavior

Controlled by `devtools.session.persistence`:

- **`"session"`** (default): User-data is retained during the VS Code session. On Host extension deactivation, the user-data directory is deleted (if the MCP server has been disconnected).
- **`"permanent"`**: User-data is never automatically deleted. Manual cleanup via a command.

### Changes

#### 4a. `host-handlers.ts` — Use storage path for user-data

```typescript
// Before:
const userDataDir = path.join(clientWorkspace, '.devtools', 'user-data');

// After:
const userDataDir = path.join(storagePath, 'user-data');
```

#### 4b. `readHostOutputTool.ts` — Update log discovery

```typescript
// Before: Scans <workspace>/.devtools/user-data/logs/
// After: Scans <storagePath>/user-data/logs/

function getClientLogsDir(storagePath: string): string | null {
  const logsDir = path.join(storagePath, 'user-data', 'logs');
  return getLatestSessionDir(logsDir);
}
```

#### 4c. `extension.ts` — Session cleanup on deactivate

```typescript
async function deactivate() {
  const persistence = vscode.workspace.getConfiguration('devtools')
    .get<string>('session.persistence', 'session');

  if (persistence === 'session') {
    const storagePath = context.storageUri?.fsPath;
    if (storagePath) {
      const userDataDir = path.join(storagePath, 'user-data');
      await fs.promises.rm(userDataDir, { recursive: true, force: true });
    }
  }
}
```

#### 4d. MCP server receives user-data path via env

The extension passes the resolved user-data path via `DEVTOOLS_USER_DATA_DIR` environment variable (set in `McpStdioServerDefinition`'s `env` parameter). The MCP server uses this for any tool that needs to reference client logs.

---

## Phase 5: GitHub Repo Sandbox

**Goal**: Allow `devtools.clientWorkspace` to be a GitHub repository URL. The extension clones the repo into a temp directory, injects config, and launches the Client window against it.

### Research: Remote Workspace Options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Clone to temp dir** | `git clone` into `os.tmpdir()` or workspace storage | Simple, reliable, full file access | Uses disk space, network latency |
| **GitHub Codespaces** | Open in a Codespace via `vscode.env.openExternal` | Zero local resources | Requires Codespace plan, different VS Code instance |
| **Remote Repositories** (vscode.dev) | `vscode.vfs.github` virtual filesystem | No clone needed | Limited API, read-only in many cases |
| **Dev Containers** | Clone into container | Isolated environment | Requires Docker, complex setup |

### Recommended: Clone to Workspace Storage

```
context.storageUri/
├── user-data/
├── sandbox/
│   └── <repo-hash>/
│       ├── .git/
│       └── <repo contents>
└── host-session.json
```

### Setting

```jsonc
"devtools.clientWorkspace": {
  "type": "string",
  "default": "",
  "description": "Local path or GitHub repo URL (e.g. 'https://github.com/user/repo'). When a GitHub URL is provided, the repo is cloned into a temporary sandbox."
}
```

### Flow

1. Extension detects `devtools.clientWorkspace` starts with `https://github.com/`
2. Computes sandbox path: `<storageUri>/sandbox/<hash-of-url>`
3. If not cloned, runs `git clone --depth=1 <url> <sandboxPath>`
4. Resolves `clientWorkspace` to the cloned path
5. Passes resolved path to MCP server via env
6. On deactivation (if `persistence === "session"`), deletes the sandbox

### Branch Support

```
"devtools.clientWorkspace": "https://github.com/user/repo#feature-branch"
```

Hash portion parsed as branch name: `git clone --depth=1 --branch feature-branch`

### Commands

```jsonc
{
  "command": "devtools.clearSandbox",
  "title": "VS Code DevTools: Clear Client Sandbox"
}
```

---

## Phase 6: Cleanup

### Remove `.devtools/` config file infrastructure

1. Delete `mcp-server/src/config.ts` functions: `loadHostConfig()`, `loadClientConfig()`, config templates
2. Delete `gui/primarySidebar/project.ts` JSONC read/write functions
3. Remove `.devtools/` from `.always_exclude_dirs` and replace with dynamic filtering
4. Simplify MCP server config to only handle env-based or file-based (dev mode) loading
5. Update `.gitignore` to remove `.devtools/` entries
6. Update documentation (README, tool-reference, etc.)

### Migration Command

For users with existing `.devtools/` config files:

```typescript
vscode.commands.registerCommand('devtools.migrateConfig', async () => {
  // Read existing .devtools/*.config.jsonc
  // Write values to VS Code settings
  // Offer to delete old files
});
```

---

## Settings Schema

### Complete Flat Settings List

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `devtools.clientWorkspace` | `string` | `""` | Client workspace path or GitHub URL |
| `devtools.extensionPath` | `string` | `"."` | Extension folder path |
| `devtools.lmToolsWorkspace` | `string` | `"."` | LM tools workspace scope |
| `devtools.client.devDiagnostic` | `boolean` | `false` | Enable diagnostic tools |
| `devtools.client.headless` | `boolean` | `false` | Run headless (Linux only) |
| `devtools.client.experimentalVision` | `boolean` | `false` | Enable vision tools |
| `devtools.client.experimentalStructuredContent` | `boolean` | `false` | Enable structured content |
| `devtools.launch.newWindow` | `boolean` | `true` | Open in new window |
| `devtools.launch.disableExtensions` | `boolean` | `true` | Disable extensions |
| `devtools.launch.skipReleaseNotes` | `boolean` | `true` | Skip release notes |
| `devtools.launch.skipWelcome` | `boolean` | `true` | Skip welcome tab |
| `devtools.launch.disableGpu` | `boolean` | `false` | Disable GPU |
| `devtools.launch.disableWorkspaceTrust` | `boolean` | `false` | Disable workspace trust |
| `devtools.launch.verbose` | `boolean` | `false` | Verbose logging |
| `devtools.launch.locale` | `string\|null` | `null` | Display language |
| `devtools.launch.enableExtensions` | `string[]` | `[...]` | Extensions to keep enabled |
| `devtools.launch.extraArgs` | `string[]` | `[]` | Extra CLI flags |
| `devtools.hotReload.enabled` | `boolean` | `true` | Enable hot reload |
| `devtools.hotReload.restartDelay` | `number` | `2000` | Restart delay (ms) |
| `devtools.hotReload.mcpStatusTimeout` | `number` | `60000` | MCP status timeout (ms) |
| `devtools.session.persistence` | `"session"\|"permanent"` | `"session"` | Client data persistence |

---

## Migration Path

### From `.devtools/` config files to VS Code settings

1. On activation, check if `.devtools/host.config.jsonc` exists
2. If so, show an info notification: "VS Code DevTools settings have moved to VS Code Settings. Migrate now?"
3. On "Migrate", read config values and write to workspace settings
4. Offer to delete old config files
5. Config files are still supported as fallback in MCP server dev mode

---

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Workspace storage not available (no workspace open) | Extension can't persist state | Use `globalStorageUri` as fallback |
| MCP server started before settings are read | Config mismatch | `resolveMcpServerDefinition()` is called before spawn |
| GitHub clone fails (auth, network) | Sandbox unusable | Show error notification, fall back to local path |
| Settings change mid-session | Config out of sync | Listen for `onDidChangeConfiguration`, fire `onDidChangeMcpServerDefinitions` |
| User-data cleanup on "session" mode | Data loss on reload | Warn user, provide "permanent" option |
| Large repos cloned to sandbox | Disk space | Use `--depth=1`, warn on repos > 1GB |

---

## Implementation Order

| Phase | Dependencies | Estimated Scope |
|-------|-------------|-----------------|
| **Phase 1**: Temp state → workspace storage | None | Small — 3 files |
| **Phase 2**: Config → VS Code settings | None | Medium — package.json + 3 files |
| **Phase 3**: Config delivery via env vars | Phase 2 | Medium — 2 files |
| **Phase 4**: User-data → workspace storage | Phase 1 | Small — 3 files |
| **Phase 5**: GitHub repo sandbox | Phases 2, 3, 4 | Large — new feature |
| **Phase 6**: Cleanup | All above | Small — deletions |

Phases 1–4 can proceed immediately and independently. Phase 5 requires all previous phases. Phase 6 is cleanup after everything is validated.
