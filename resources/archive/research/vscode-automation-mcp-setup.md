# vscode-automation-mcp Setup — Context Transfer Document

## Goal

Set up the [vscode-automation-mcp](https://github.com/Sukarth/vscode-automation-mcp) MCP server to launch a **standalone VSCode instance** that loads the **vsctk extension** via `--extensionDevelopmentPath` (like an F5 debug window), opens this workspace, and exposes ~60 automation tools (DOM inspection, UI clicks, screenshots, IntelliSense, etc.) to Copilot Chat.

## What Was Done

### 1. Cloned vscode-automation-mcp locally
```
cd c:\hw-workspace\hw-mcp-tools\documentation\graphrag.js\vscode-toolkit
git clone https://github.com/Sukarth/vscode-automation-mcp.git vscode-automation-mcp
cd vscode-automation-mcp
npm install
```
The clone lives at: `vscode-toolkit/vscode-automation-mcp/`  
It's already added to `.gitignore`.

### 2. Modified the server to support extension development mode

**Problem:** The original server always passes `--disable-extensions` via a Chrome Options monkey-patch, and has no way to load a custom extension or open a workspace folder.

**Solution:** Added three new environment variables and modified the Chrome Options patch and initialization logic.

#### Files modified:

**`vscode-automation-mcp/src/types.ts`** — Added `extensionDevPath` to `VSCodeDriverConfig`:
```typescript
export interface VSCodeDriverConfig {
    // ...existing fields...
    /** Path to an extension source directory to load (like --extensionDevelopmentPath in debug) */
    extensionDevPath?: string;
}
```

**`vscode-automation-mcp/src/vscode-driver.ts`** — Three changes:

1. **Saved env vars early** (before cleanup removes VSCODE_* vars):
```typescript
const _extDevPath = process.env.VSCODE_AUTOMATION_EXT_DEV_PATH || '';
const _workspacePath = process.env.VSCODE_AUTOMATION_WORKSPACE_PATH || '';
```

2. **Modified Chrome Options flags** — conditionally skips `--disable-extensions` and adds `--extensionDevelopmentPath` when `_extDevPath` is set:
```typescript
const gpuDisablingFlags = [
    // ...GPU flags...
    // Only disable extensions if no extension dev path is specified
    ...(_extDevPath ? [] : ['--disable-extensions']),
    // ...other flags...
    // Extension Development Host: load extension from source path
    ...(_extDevPath ? [`--extensionDevelopmentPath=${_extDevPath}`] : []),
];
```

3. **Added workspace opening after browser starts**:
```typescript
// Open workspace folder if configured
if (this.config.workspacePath && fs.existsSync(this.config.workspacePath)) {
    await this.browser.openResources(this.config.workspacePath);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.browser.waitForWorkbench();
}
```

4. **Added env vars to DEFAULT_CONFIG**:
```typescript
const DEFAULT_CONFIG: VSCodeDriverConfig = {
    // ...existing...
    extensionDevPath: _extDevPath || undefined,
    workspacePath: _workspacePath || undefined,
};
```

### 3. Built the modified server
```
cd vscode-automation-mcp
npm run build
```
Output is at `vscode-automation-mcp/dist/index.js`.

### 4. Configured `.vscode/mcp.json`

Current config:
```json
{
    "servers": {
        "vscode-automation-mcp": {
            "type": "stdio",
            "command": "node",
            "args": ["${workspaceFolder}/vscode-automation-mcp/dist/index.js"],
            "env": {
                "VSCODE_AUTOMATION_EXT_DEV_PATH": "${workspaceFolder}",
                "VSCODE_AUTOMATION_WORKSPACE_PATH": "${workspaceFolder}",
                "VSCODE_AUTOMATION_VERSION": "1.95.0"
            }
        }
    }
}
```

**Key env vars:**
| Variable | Purpose | Value |
|---|---|---|
| `VSCODE_AUTOMATION_EXT_DEV_PATH` | Extension source dir (like F5 debug `--extensionDevelopmentPath`) | This workspace root |
| `VSCODE_AUTOMATION_WORKSPACE_PATH` | Folder to open in the standalone VSCode | This workspace root |
| `VSCODE_AUTOMATION_VERSION` | Pin VSCode version for compatibility with vscode-extension-tester | `1.95.0` |

### 5. Version pinned to 1.95.0

**Problem:** VSCode `latest` (1.109.0+) has a restructured directory layout where `resources/app/out/cli.js` no longer exists. The `vscode-extension-tester@8.11.0` library expects the old layout and crashes with `MODULE_NOT_FOUND`.

**Solution:** Pinned to `1.95.0` via `VSCODE_AUTOMATION_VERSION` env var. Cleaned the cached incompatible download:
```powershell
Remove-Item -Recurse -Force "C:\Users\conta\AppData\Local\Temp\vscode-automation-mcp\VSCode-win32-x64-archive"
Remove-Item -Recurse -Force "C:\Users\conta\AppData\Local\Temp\vscode-automation-mcp\chromedriver*"
```

### 6. Built the vsctk extension
```
cd c:\hw-workspace\hw-mcp-tools\documentation\graphrag.js\vscode-toolkit
pnpm run compile
```

## What Remains To Do

### 1. Initialize and test the server
The server needs `vscode_initialize` called, which will:
- Download VSCode 1.95.0 + matching ChromeDriver (first run only)
- Launch standalone VSCode with `--extensionDevelopmentPath=<workspace>` 
- Open the workspace folder
- Make all ~60 tools operational

```
Call: mcp_vscode-automa_vscode_initialize
```

### 2. Validate tools work
After initialization, test key tools:
- `vscode_get_status` — confirm server is ready
- `vscode_take_screenshot` — see the standalone window
- `vscode_get_editor_content` — read editor text
- `vscode_execute_command` — run VS Code commands
- `vscode_click_element` — UI automation
- etc.

### 3. Potential issues to watch for

1. **ChromeDriver version mismatch** — If 1.95.0 still fails, try `1.85.0` or `1.90.0`
2. **Extension not loading** — Check the standalone VSCode's title bar for "[Extension Development Host]"
3. **`.inputarea` selector not found** — Some tools (like `get_editor_content`, `assert_text` without explicit selector) use `.inputarea` CSS selector which may not exist in certain VSCode versions. Use explicit selectors like `.view-lines` as workaround.
4. **`check_file_open` returning false** — Known quirk, the tool's tab detection doesn't always work.

## How to Restart the MCP Server

```powershell
# Via vsctk proxy
Invoke-WebRequest -Uri 'http://127.0.0.1:3637/exec' -Method POST -Body '{"code": "await vscode.commands.executeCommand(\"workbench.mcp.stopServer\", \"vscode-automation-mcp\"); await new Promise(r => setTimeout(r, 1000)); await vscode.commands.executeCommand(\"workbench.mcp.resetCachedTools\", \"vscode-automation-mcp\"); await vscode.commands.executeCommand(\"workbench.mcp.startServer\", \"vscode-automation-mcp\"); return \"restarted\""}' -ContentType 'application/json' -UseBasicParsing | Select-Object -ExpandProperty Content
```

## How to Rebuild After Changes

```powershell
cd c:\hw-workspace\hw-mcp-tools\documentation\graphrag.js\vscode-toolkit\vscode-automation-mcp
npm run build
# Then restart the MCP server (see above)
```

## File Locations

| Item | Path |
|---|---|
| MCP config | `.vscode/mcp.json` |
| Modified server source | `vscode-automation-mcp/src/vscode-driver.ts` |
| Modified types | `vscode-automation-mcp/src/types.ts` |
| Built server entry | `vscode-automation-mcp/dist/index.js` |
| VSCode cache | `%TEMP%\vscode-automation-mcp\` |
| Screenshots | `%TEMP%\vscode-automation-mcp\screenshots\` |
| ChromeDriver log | `%TEMP%\chromedriver.log` |
| vsctk extension | `vscode-toolkit/` (workspace root) |

## Previous Test Results (before version pin)

- `vscode_get_status` — ✅ Works (returns server state without initialization)
- `vscode_initialize` — ❌ Failed with `MODULE_NOT_FOUND` on VSCode 1.109.0 (fixed by pinning to 1.95.0)
- `vscode_initialize` (with 1.95.0) — ⏳ Not yet tested (session ended before we could try)
- `vscode_take_screenshot` — ✅ Worked (when initialized with `latest` before the directory restructure broke it)
- `vscode_assert_text` with selector — ✅ Worked
- `vscode_verify_element` — ✅ Worked  
- `vscode_open_file` — ✅ Worked
- `vscode_wait_for_idle` — ✅ Worked

## Environment Variables Reference (from upstream)

| Variable | Description | Default |
|---|---|---|
| `VSCODE_AUTOMATION_VERSION` | VSCode version to download | `latest` |
| `VSCODE_AUTOMATION_STORAGE_PATH` | Directory to store VSCode and ChromeDriver | System temp dir |
| `VSCODE_AUTOMATION_OFFLINE` | Use cached binaries only | `false` |
| `VSCODE_AUTOMATION_LOG_LEVEL` | `trace`, `debug`, `info`, `warn`, `error` | `info` |
| `VSCODE_AUTOMATION_EXT_DEV_PATH` | **Custom** — Extension source path for dev host mode | (none) |
| `VSCODE_AUTOMATION_WORKSPACE_PATH` | **Custom** — Workspace folder to open on launch | (none) |
