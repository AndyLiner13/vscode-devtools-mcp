<div align="center">

# 📋 MCP Server Report

## `mcp-refactor-typescript`
### [`Stefan-Nitu/mcp-refactor-typescript`](https://github.com/Stefan-Nitu/mcp-refactor-typescript)

</div>

---

> **Report Date:** `2025-01-18`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/Stefan-Nitu/mcp-refactor-typescript` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `main` |
| **Commit URL** | `N/A` |
| **License** | `MIT` |
| **Version** | `2.0.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Full repository analysis |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `No` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `absolute` (paths resolved via `resolve()`) |
| **Line/column indexing** | `1-based` (line parameter is 1-based positive integer) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

MCP Refactor TypeScript is an MCP server that exposes TypeScript's powerful refactoring engine through the Model Context Protocol. It enables AI assistants and other MCP clients to perform sophisticated, type-aware code transformations that would be impossible or error-prone to do manually. The server leverages tsserver (TypeScript's language server) directly for accurate, compiler-powered refactoring operations including rename, extract function/variable/constant, organize imports, find references, and file operations with automatic import updates.

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Claude Desktop` / `Any MCP client` |
| **Documented clients** | Claude Desktop, MCP Inspector |

### 1.3 Primary Capabilities

- [x] Type-aware symbol renaming with cross-file reference updates
- [x] Extract function/variable/constant refactoring with auto-detection of parameters, types, and closures
- [x] File operations (rename, move, batch move) with automatic import path updates
- [x] Code quality operations (organize imports, fix all, remove unused)
- [x] Find references across entire codebase
- [x] Preview mode for all destructive operations
- [x] Detailed reporting with file paths and line numbers

### 1.4 Non-Goals / Exclusions

- Does not support languages other than TypeScript/JavaScript
- Does not provide code completion or hover information
- Does not integrate with version control systems directly

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Works on any platform where Node.js v18+ is available |
| **Documented integrations** | Claude Desktop |
| **Notes / constraints** | Requires TypeScript project with `tsconfig.json` for full functionality |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | TypeScript, JavaScript, TSX, JSX, MJS, CJS |
| **How to extend** | N/A - limited to TypeScript compiler supported file types |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT License |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | TypeScript |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | `@modelcontextprotocol/sdk`, `zod`, `pino` |
| **External / System** | TypeScript (`tsserver` binary, typically from `node_modules/typescript/lib/tsserver.js`) |
| **Optional** | None |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `Yes` (can run via CLI for testing) |
| **Env vars used** | `Yes` (LOG_LEVEL) |
| **Config files used** | `No` |
| **CLI flags used** | `No` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | `tsserver` (TypeScript Language Server) |
| **Architecture notes** | <ul><li>Direct tsserver communication via child process</li><li>One tsserver instance shared across all operations</li><li>Lazy tsserver initialization on first TS/JS file detection</li><li>Uses `OperationRegistry` for operation management</li><li>Grouped tools pattern for reduced tool count</li></ul> |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `No` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `None` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (applies refactoring edits to source files) |
| **Uses local cache** | `No` |
| **Uses external DB** | `No` |
| **Retains user code** | `No` (processes in-memory, writes back to source) |

---

## 🗂️ § 3 — Tool Index

> 📝 **Tool names only** (stable TOC). Server uses grouped tools pattern with 4 tools containing 15 total operations.

| # | Tool Name |
|--:|:----------|
| 1 | `file_operations` |
| 2 | `code_quality` |
| 3 | `refactoring` |
| 4 | `workspace` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `filePath` | Absolute or relative file path (string, required, min 1 char) |
| `line` | 1-based line number (positive integer) |
| `text` | Text content to locate or operate on (string, min 1 char) |
| `name` | New name for rename/extract operations (string, optional) |
| `preview` | Preview mode flag - don't apply changes (boolean, optional) |
| `operation` | Specific operation to execute within a tool group (enum) |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `RefactorResult` | Standard response: `{ success: boolean, message: string, filesChanged?: FileChange[] }` |
| `FileChange` | File modification: `{ filePath: string, edits: Edit[] }` |
| `Edit` | Individual edit: `{ old: string, new: string, line?: number }` |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` (resolved via Node.js `resolve()`) |
| **Rate limits / retries** | None documented |
| **File size limits** | None documented |
| **Resource constraints** | tsserver indexing timeout handling |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `No` |
| **Error as text** | `Yes` - success: false with message |
| **Error as `{ error: string }`** | `No` |
| **Common error codes** | `tsserver still indexing`, `File not found`, `No refactoring available` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `file_operations`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>file_operations</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Move/rename TypeScript/JavaScript files while updating all imports automatically. Unlike manual moves, this tool updates import statements across your entire codebase.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `operation` | `enum` | ✅ | — | One of: `rename_file`, `move_file`, `batch_move_files` |
| `sourcePath` | `string` | ✅ | — | Source file path |
| `name` | `string` | ✅* | — | New filename (for `rename_file`) |
| `destinationPath` | `string` | ✅* | — | Destination path (for `move_file`) |
| `files` | `array` | ✅* | — | Array of `{sourcePath, destinationPath}` (for `batch_move_files`) |
| `preview` | `boolean` | ❌ | `false` | Preview changes without applying |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "operation": "rename_file | move_file | batch_move_files",
  "sourcePath": "string",
  "name": "string",
  "destinationPath": "string",
  "files": [
    {
      "sourcePath": "string",
      "destinationPath": "string"
    }
  ],
  "preview": "boolean"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong></summary>

```json
{
  "operation": "rename_file",
  "sourcePath": "src/utils/helper.ts",
  "name": "helpers.ts",
  "preview": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "success": "boolean",
  "message": "string",
  "filesChanged": [
    {
      "filePath": "string",
      "edits": [
        {
          "old": "string",
          "new": "string",
          "line": "number"
        }
      ]
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong></summary>

```json
{
  "success": true,
  "message": "Renamed helper.ts to helpers.ts and updated 5 import(s)",
  "filesChanged": [
    {
      "filePath": "/project/src/index.ts",
      "edits": [
        {
          "old": "import { foo } from './utils/helper'",
          "new": "import { foo } from './utils/helpers'",
          "line": 3
        }
      ]
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Modifies source files, renames/moves files on disk |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/grouped-tools.ts` |
| **Core implementation** | `src/operations/rename-file.ts`, `src/operations/move-file.ts`, `src/operations/batch-move-files.ts` |

---

### 🔹 Tool: `code_quality`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>code_quality</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Auto-fix code quality issues using TypeScript's compiler-powered fixes. Organizes imports, fixes auto-fixable errors, and removes unused code safely.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `operation` | `enum` | ✅ | — | One of: `organize_imports`, `fix_all`, `remove_unused` |
| `filePath` | `string` | ✅ | — | File to process |
| `preview` | `boolean` | ❌ | `false` | Preview changes without applying |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "operation": "organize_imports | fix_all | remove_unused",
  "filePath": "string",
  "preview": "boolean"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong></summary>

```json
{
  "operation": "organize_imports",
  "filePath": "src/index.ts",
  "preview": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "success": "boolean",
  "message": "string",
  "filesChanged": [
    {
      "filePath": "string",
      "edits": [
        {
          "old": "string",
          "new": "string",
          "line": "number"
        }
      ]
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong></summary>

```json
{
  "success": true,
  "message": "Organized imports in index.ts",
  "filesChanged": [
    {
      "filePath": "/project/src/index.ts",
      "edits": [
        {
          "old": "import { z } from 'zod';\nimport { foo } from './foo';\nimport { bar } from './bar';",
          "new": "import { z } from 'zod';\n\nimport { bar } from './bar';\nimport { foo } from './foo';",
          "line": 1
        }
      ]
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Modifies source files |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/grouped-tools.ts` |
| **Core implementation** | `src/operations/organize-imports.ts`, `src/operations/fix-all.ts`, `src/operations/remove-unused.ts` |

---

### 🔹 Tool: `refactoring`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>refactoring</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Rename symbols project-wide OR extract functions (auto-detects params/types/closures). Unlike simple find-and-replace, updates ALL references including imports, JSDoc, and dynamic imports.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `operation` | `enum` | ✅ | — | One of: `rename`, `extract_function`, `extract_constant`, `extract_variable`, `infer_return_type` |
| `filePath` | `string` | ✅ | — | File containing the symbol |
| `line` | `number` | ✅ | — | 1-based line number |
| `text` | `string` | ✅ | — | Text to locate (for position identification) |
| `name` | `string` | ❌ | — | New name for the symbol/extraction |
| `preview` | `boolean` | ❌ | `false` | Preview changes without applying |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "operation": "rename | extract_function | extract_constant | extract_variable | infer_return_type",
  "filePath": "string",
  "line": "number",
  "text": "string",
  "name": "string",
  "preview": "boolean"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong></summary>

```json
{
  "operation": "extract_function",
  "filePath": "src/utils.ts",
  "line": 15,
  "text": "x + y",
  "name": "addNumbers",
  "preview": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "success": "boolean",
  "message": "string",
  "filesChanged": [
    {
      "filePath": "string",
      "edits": [
        {
          "old": "string",
          "new": "string",
          "line": "number"
        }
      ]
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong></summary>

```json
{
  "success": true,
  "message": "Extracted function 'addNumbers' successfully",
  "filesChanged": [
    {
      "filePath": "/project/src/utils.ts",
      "edits": [
        {
          "old": "x + y",
          "new": "addNumbers(x, y)",
          "line": 15
        },
        {
          "old": "",
          "new": "function addNumbers(x: number, y: number): number {\n  return x + y;\n}\n",
          "line": 1
        }
      ]
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Modifies source files across entire codebase |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | tsserver must be initialized and project indexed |
| **Postconditions** | All references updated, new function/variable created for extractions |
| **Limits** | None documented |
| **Security & privacy** | No network calls, local file operations only |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/grouped-tools.ts` |
| **Core implementation** | `src/operations/rename.ts`, `src/operations/extract-function.ts`, `src/operations/extract-constant.ts`, `src/operations/extract-variable.ts` |

---

### 🔹 Tool: `workspace`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>workspace</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Workspace-level operations for analysis and maintenance. Find all references to a symbol, refactor modules, perform codebase-wide cleanup, or restart tsserver if needed.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `operation` | `enum` | ✅ | — | One of: `find_references`, `refactor_module`, `cleanup_codebase`, `restart_tsserver` |
| `filePath` | `string` | ❌* | — | File path (required for `find_references`, `refactor_module`) |
| `line` | `number` | ❌* | — | 1-based line number (for `find_references`) |
| `text` | `string` | ❌* | — | Text to locate (for `find_references`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "operation": "find_references | refactor_module | cleanup_codebase | restart_tsserver",
  "filePath": "string",
  "line": "number",
  "text": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong></summary>

```json
{
  "operation": "find_references",
  "filePath": "src/services/auth.ts",
  "line": 25,
  "text": "validateToken"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "success": "boolean",
  "message": "string",
  "references": [
    {
      "filePath": "string",
      "line": "number",
      "column": "number",
      "text": "string"
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong></summary>

```json
{
  "success": true,
  "message": "Found 12 references to 'validateToken'",
  "references": [
    {
      "filePath": "/project/src/services/auth.ts",
      "line": 25,
      "column": 17,
      "text": "export function validateToken(token: string): boolean {"
    },
    {
      "filePath": "/project/src/middleware/auth.ts",
      "line": 8,
      "column": 5,
      "text": "if (validateToken(req.headers.authorization)) {"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` (mostly read, some operations write) |
| **Classification** | `Semantic Research` |
| **Side effects** | `find_references`: None; `cleanup_codebase`/`refactor_module`: Modifies files; `restart_tsserver`: Restarts process |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Depends` (find_references is idempotent, others are not) |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/grouped-tools.ts` |
| **Core implementation** | `src/operations/find-references.ts`, `src/operations/refactor-module.ts`, `src/operations/cleanup-codebase.ts` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `operations://catalog` - Detailed documentation for all refactoring operations (loaded from `docs/OPERATIONS.md`) |
| **MCP prompts exposed** | `None` |
| **Other RPC endpoints** | None |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `LOG_LEVEL` | ❌ | — | `info` | Pino log level (debug, info, warn, error) |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `tsconfig.json` | TypeScript project configuration (used by tsserver) |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| None | Server is configured via MCP protocol |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `npm install -g mcp-refactor-typescript` |
| 2 | Configure Claude Desktop (see below) |

### 8.2 Typical Run Commands

```bash
# Run directly (for testing)
mcp-refactor-typescript

# Run via npx
npx mcp-refactor-typescript

# Run from source
npm run build && node dist/index.js

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

**Claude Desktop Configuration** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "typescript-refactor": {
      "command": "npx",
      "args": ["-y", "mcp-refactor-typescript"]
    }
  }
}
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | stderr (MCP protocol compliant), using Pino logger |
| **Tracing / Metrics** | `None` |

### 8.4 Performance Considerations

- tsserver is started lazily on first TypeScript/JavaScript file detection
- One tsserver instance is shared across all operations for efficiency
- Project indexing may take time on first operation for large codebases
- Operations wait for tsserver indexing to complete before executing

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `4` |
| **Total operations** | `15` |
| **Read-only** | `1` (find_references) |
| **Write/Hybrid** | `14` |

### 9.2 Operations by Tool

| Tool | Operations |
|:-----|:-----------|
| `file_operations` | `rename_file`, `move_file`, `batch_move_files` |
| `code_quality` | `organize_imports`, `fix_all`, `remove_unused` |
| `refactoring` | `rename`, `extract_function`, `extract_constant`, `extract_variable`, `infer_return_type` |
| `workspace` | `find_references`, `refactor_module`, `cleanup_codebase`, `restart_tsserver` |

### 9.3 Version History

| Version | Date | Notes |
|:--------|:-----|:------|
| `2.0.0` | 2025-01-15 | Current version |
| `1.1.0` | 2025-01-10 | Added shared utilities, integration testing, MCP Inspector support |
| `1.0.0` | 2025-01-05 | Initial release |

---

<div align="center">

*— End of Report —*

</div>
