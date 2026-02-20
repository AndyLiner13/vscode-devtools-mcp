# `exp_file_create` Tool Schema Proposal

**Purpose:** Create new files in the workspace with explicit safety controls.

**Date:** 2025-01-XX  
**Status:** Draft - Awaiting parameter classification

---

## Complete Parameter List

All possible parameters for this tool. You will decide which should be:
- **[COPILOT]** - Set by Copilot in the tool call parameters
- **[USER]** - Configured by user in settings/config file
- **[SYSTEM]** - Determined automatically at runtime

---

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dir` | `string` | Yes | Directory path for the new file. Can be relative to workspace root or absolute. Example: `"src/utils"`, `"C:/projects/my-app/src"` |
| `name` | `string` | Yes | Filename including extension. Example: `"helpers.ts"`, `"config.json"` |
| `content` | `string` | Yes | The file content to write. Full content of the new file. |

---

### Directory Handling Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `createParentDirectories` | `boolean` | `true` | If parent directories don't exist, create them automatically (like `mkdir -p`). If `false`, error when parent directory doesn't exist. |

---

### File Existence Handling Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ifExists` | `enum` | `"error"` | What to do if the target file already exists. Options below. |

**`ifExists` Options:**
- `"error"` - Return an error, do not modify existing file
- `"overwrite"` - Replace the entire existing file with new content
- `"skip"` - Do nothing, return success with a warning
- `"prompt"` - Return a special response asking user for confirmation
- `"backup_then_overwrite"` - Create a `.bak` copy, then overwrite
- `"append"` - Append content to end of existing file
- `"prepend"` - Prepend content to beginning of existing file

---

### Path Security Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `allowOutsideWorkspace` | `boolean` | `false` | Allow creating files outside the active VS Code workspace. If `false` and path resolves outside workspace, return error. |
| `outsideWorkspacePolicy` | `enum` | `"prompt"` | What to do when path is outside workspace. Options: `"block"`, `"prompt"`, `"allow"` |
| `blockedPaths` | `string[]` | `["node_modules", ".git", "dist", "build"]` | Glob patterns or directory names where file creation is blocked. |
| `allowedExtensions` | `string[]` | `[]` | If non-empty, only allow creating files with these extensions. Empty = all allowed. Example: `[".ts", ".js", ".json"]` |
| `blockedExtensions` | `string[]` | `[".exe", ".dll", ".so", ".dylib"]` | Never allow creating files with these extensions (binary/executable files). |

---

### Post-Creation Behavior Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `openAfterCreate` | `boolean` | `false` | Open the newly created file in VS Code editor |
| `focusEditor` | `boolean` | `false` | If `openAfterCreate` is true, focus the editor window |
| `revealInExplorer` | `boolean` | `false` | Reveal the new file in the Explorer sidebar |
| `formatOnCreate` | `boolean` | `false` | Apply VS Code's formatter to the file after creation |

---

### Audit/Logging Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `logCreation` | `boolean` | `true` | Log file creation to the DevTools output channel |
| `includeContentInLog` | `boolean` | `false` | Include file content in logs (may expose sensitive data) |
| `reason` | `string` | `undefined` | Optional human-readable reason for creating this file (for audit trail) |

---

### Encoding Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `encoding` | `string` | `"utf8"` | File encoding. Options: `"utf8"`, `"utf16le"`, `"utf16be"`, `"ascii"`, `"latin1"` |
| `addBOM` | `boolean` | `false` | Add byte-order mark to beginning of file |
| `lineEnding` | `enum` | `"auto"` | Line ending style: `"auto"` (detect from OS/workspace settings), `"lf"`, `"crlf"` |

---

### Validation Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `validateSyntax` | `boolean` | `false` | For supported file types (.ts, .js, .json), validate syntax before writing. Error if invalid. |
| `maxFileSize` | `number` | `10485760` | Maximum allowed file size in bytes (default 10MB). Error if content exceeds this. |
| `requireNonEmpty` | `boolean` | `true` | Error if content is empty string |

---

### Template Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `template` | `string` | `undefined` | Instead of `content`, use a predefined template name. Templates defined in config. |
| `templateVariables` | `object` | `{}` | Variables to substitute in template. Example: `{ "className": "UserService" }` |

---

## Output Schema

```typescript
interface FileCreateOutput {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Absolute path of the created/affected file */
  filePath: string;
  
  /** What action was taken */
  action: "created" | "overwritten" | "skipped" | "backed_up_and_overwritten" | "appended" | "prepended" | "error" | "awaiting_confirmation";
  
  /** File size in bytes after creation */
  sizeBytes?: number;
  
  /** Number of lines in the file */
  lineCount?: number;
  
  /** Parent directories that were created (if any) */
  createdDirectories?: string[];
  
  /** Whether the file was opened in editor */
  openedInEditor?: boolean;
  
  /** Path to backup file if backup was created */
  backupPath?: string;
  
  /** Warning messages (non-fatal) */
  warnings?: string[];
  
  /** Error message if action === "error" */
  error?: string;
  
  /** For "awaiting_confirmation" - details of what confirmation is needed */
  confirmationNeeded?: {
    reason: "file_exists" | "outside_workspace" | "blocked_path";
    currentFile?: {
      path: string;
      size: number;
      lines: number;
      lastModified: string;
    };
    requestedAction: string;
  };
}
```

---

## Example Tool Calls

### Simple File Creation
```json
{
  "dir": "src/utils",
  "name": "helpers.ts",
  "content": "export function formatDate(date: Date): string {\n  return date.toISOString();\n}"
}
```

### With Options
```json
{
  "dir": "src/config",
  "name": "settings.json",
  "content": "{\n  \"version\": 1\n}",
  "ifExists": "overwrite",
  "openAfterCreate": true,
  "formatOnCreate": true
}
```

### Outside Workspace (if allowed)
```json
{
  "dir": "C:/shared-configs",
  "name": "database.json",
  "content": "...",
  "allowOutsideWorkspace": true
}
```

---

## Questions for Review

1. **Which parameters should Copilot be able to set vs. user-configured?**

2. **Should `ifExists: "overwrite"` require user confirmation even if Copilot sets it?**

3. **Should there be a "dry run" mode that shows what would be created without actually creating?**

4. **Should we track file creation history for undo capability?**

5. **Should we support creating multiple files in one call?**

---

## Notes

- This is a comprehensive list of ALL possible parameters
- Many of these may be deemed unnecessary or over-engineered
- The goal is to provide full visibility so you can make informed decisions
- Feel free to remove, combine, or modify any parameters
