<div align="center">

# 📋 MCP Server Report

## VS Code MCP Server
### [juehang/vscode-mcp-server](https://github.com/juehang/vscode-mcp-server)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/juehang/vscode-mcp-server |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 4f5162f4881ec02d03c65cd1ff029ae70fc468dc |
| **Commit URL** *(optional)* | https://github.com/juehang/vscode-mcp-server/commit/4f5162f4881ec02d03c65cd1ff029ae70fc468dc |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 0.4.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (README, extension/server code, tool modules) |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | No |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Relative to VS Code workspace root (tool inputs); file system paths are resolved by VS Code |
| **Line/column indexing** *(required)* | 1-based for tool inputs/outputs (converted internally to 0-based) |
| **Encoding model** *(optional)* | UTF-16 for VS Code positions, UTF-8 file contents |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

VS Code MCP Server is a VS Code extension that exposes workspace file operations, symbol navigation, diagnostics, and shell execution as MCP tools over a local streamable HTTP endpoint. It allows MCP clients (e.g., Claude Desktop, Cursor, VS Code) to operate directly against the active VS Code workspace.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, Cursor, VS Code, Windsurf |

### 1.3 Primary Capabilities *(required)*

- [x] Expose VS Code file read/list/move/rename/copy tools
- [x] Create and edit files via WorkspaceEdit
- [x] Execute shell commands in VS Code terminal
- [x] Provide diagnostics for files/workspace
- [x] Symbol search, definitions, and document outline tools

### 1.4 Non-Goals / Exclusions *(optional)*

- No authentication support yet (explicitly noted)
- Single workspace support only (per README caveats)

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | VS Code extension running locally with streamable HTTP MCP endpoint |
| **Documented integrations** *(optional)* | Claude Desktop, Cursor, VS Code, Windsurf |
| **Notes / constraints** *(optional)* | Shell execution enabled; trust client and keep port local |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Determined by VS Code language services |
| **How to extend** *(optional)* | Add new tools in src/tools and register in server setup |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | @modelcontextprotocol/sdk, express, zod |
| **External / System** *(optional)* | VS Code APIs |
| **Optional** *(optional)* | None |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process (VS Code extension) |
| **Started by MCP client** *(required)* | No (server toggled from VS Code) |
| **Started independently** *(optional)* | No |
| **Env vars used** *(optional)* | No |
| **Config files used** *(optional)* | No (uses VS Code settings) |
| **CLI flags used** *(optional)* | No |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | VS Code APIs + MCP SDK streamable HTTP |
| **Architecture notes** *(optional)* | - Extension spins up Express server and MCP transport
- Tools are registered by category toggles
- Uses VS Code WorkspaceEdit and language services |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | No |
| `http` / `streamable-http` *(optional)* | Yes (http://localhost:3000/mcp) |
| `sse` *(optional)* | No (explicitly not using SSE) |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (file/edit tools) |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | No (operates on local workspace only) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `copy_file_code` |
| 2 | `create_file_code` |
| 3 | `execute_shell_command_code` |
| 4 | `get_diagnostics_code` |
| 5 | `get_document_symbols_code` |
| 6 | `get_symbol_definition_code` |
| 7 | `list_files_code` |
| 8 | `move_file_code` |
| 9 | `read_file_code` |
| 10 | `rename_file_code` |
| 11 | `replace_lines_code` |
| 12 | `search_symbols_code` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `WorkspacePath` | Relative path from VS Code workspace root |
| `LineRange` | 1-based line numbers for input (converted internally) |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CallToolResult` | MCP content array with `text` payload |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Relative to workspace root, validated by VS Code APIs |
| **Rate limits / retries** | Not specified |
| **File size limits** | `read_file_code` defaults to 100,000 characters |
| **Resource constraints** | Shell commands timeout (default 10s) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (errors thrown and returned as messages) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | -32603 for server errors |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `copy_file_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>copy_file_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Copies a file to a new location in the workspace.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `sourcePath` | `string` | ✅ | — | Source file path. |
| `targetPath` | `string` | ✅ | — | Destination file path. |
| `overwrite` | `boolean` | ❌ | `false` | Overwrite target if it exists. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "sourcePath": "src/a.ts", "targetPath": "src/a.copy.ts", "overwrite": false }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Successfully copied ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Creates a new file in workspace |
| **Determinism** | Deterministic |
| **Idempotency** | Depends |

---

### 🔹 Tool: `create_file_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>create_file_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Creates a new file or overwrites an existing file using VS Code WorkspaceEdit.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Target file path. |
| `content` | `string` | ✅ | — | File contents. |
| `overwrite` | `boolean` | ❌ | `false` | Overwrite if file exists. |
| `ignoreIfExists` | `boolean` | ❌ | `false` | Skip if file exists. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "src/new.ts", "content": "export {}", "overwrite": false }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "File src/new.ts created successfully" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Writes file to workspace |
| **Determinism** | Deterministic |
| **Idempotency** | Depends |

---

### 🔹 Tool: `execute_shell_command_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>execute_shell_command_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Executes a shell command in the VS Code integrated terminal with optional working directory and timeout.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `command` | `string` | ✅ | — | Shell command to run. |
| `cwd` | `string` | ❌ | `"."` | Working directory. |
| `timeout` | `number` | ❌ | `10000` | Timeout in milliseconds. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "command": "npm test", "cwd": ".", "timeout": 10000 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Command: npm test\n\nOutput:\n..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Executes commands in terminal |
| **Determinism** | Depends |
| **Idempotency** | Non-idempotent |

---

### 🔹 Tool: `get_diagnostics_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_diagnostics_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns VS Code diagnostics (errors/warnings) for a file or the whole workspace.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ❌ | `""` | Optional file path; empty means all files. |
| `severities` | `number[]` | ❌ | `[0,1]` | Severity filter (0=Error,1=Warning,2=Info,3=Hint). |
| `format` | `"text" \| "json"` | ❌ | `"text"` | Output format. |
| `includeSource` | `boolean` | ❌ | `true` | Include diagnostic source. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "src/app.ts", "severities": [0,1], "format": "text" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Found 1 issue(s): ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

---

### 🔹 Tool: `get_document_symbols_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_document_symbols_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns a hierarchical outline of symbols in a file with counts by kind.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | File path to analyze. |
| `maxDepth` | `number` | ❌ | — | Maximum nesting depth. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "src/extension.ts", "maxDepth": 2 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Symbols in file ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | Reads workspace files |
| **Determinism** | Deterministic |
| **Idempotency** | Idempotent |

---

### 🔹 Tool: `get_symbol_definition_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_symbol_definition_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns hover/definition information for a symbol at a specific line in a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | File path containing the symbol. |
| `line` | `number` | ✅ | — | Line number (1-based). |
| `symbol` | `string` | ✅ | — | Symbol name on that line. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "src/app.ts", "line": 10, "symbol": "MyClass" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Symbol definition for ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

---

### 🔹 Tool: `list_files_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>list_files_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Lists files and directories in the VS Code workspace (optionally recursive).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Directory path to list from. |
| `recursive` | `boolean` | ❌ | `false` | Recursive listing. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": ".", "recursive": false }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "[{\"path\":...}]" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Deterministic |
| **Idempotency** | Idempotent |

---

### 🔹 Tool: `move_file_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>move_file_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Moves a file or directory using VS Code WorkspaceEdit (refactors references).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `sourcePath` | `string` | ✅ | — | Source path. |
| `targetPath` | `string` | ✅ | — | Destination path. |
| `overwrite` | `boolean` | ❌ | `false` | Overwrite if target exists. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "sourcePath": "src/a.ts", "targetPath": "src/new/a.ts" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Successfully moved ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Moves files/directories, updates references |
| **Determinism** | Deterministic |
| **Idempotency** | Depends |

---

### 🔹 Tool: `read_file_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>read_file_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Reads file contents with encoding, size limit, and optional line ranges.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | File path to read. |
| `encoding` | `string` | ❌ | `"utf-8"` | Text encoding or `base64`. |
| `maxCharacters` | `number` | ❌ | `100000` | Max characters allowed. |
| `startLine` | `number` | ❌ | `-1` | Start line (1-based), or -1 for start. |
| `endLine` | `number` | ❌ | `-1` | End line (1-based), or -1 for end. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "src/app.ts", "startLine": 1, "endLine": 50 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "...file content..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Deterministic |
| **Idempotency** | Idempotent |

---

### 🔹 Tool: `rename_file_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>rename_file_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Renames a file or directory using VS Code WorkspaceEdit (refactors references).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filePath` | `string` | ✅ | — | Current file path. |
| `newName` | `string` | ✅ | — | New name for file/dir. |
| `overwrite` | `boolean` | ❌ | `false` | Overwrite if target exists. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "filePath": "src/a.ts", "newName": "b.ts" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Successfully renamed ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Renames file/dir and updates references |
| **Determinism** | Deterministic |
| **Idempotency** | Depends |

---

### 🔹 Tool: `replace_lines_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>replace_lines_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Replaces specific lines in a file with validation against original content.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | File path to modify. |
| `startLine` | `number` | ✅ | — | Start line (1-based). |
| `endLine` | `number` | ✅ | — | End line (1-based). |
| `content` | `string` | ✅ | — | Replacement content. |
| `originalCode` | `string` | ✅ | — | Exact original code to validate. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "src/a.ts", "startLine": 5, "endLine": 6, "content": "const value = 42;\n", "originalCode": "const value = 41;\n" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Lines 5-6 in file ... replaced successfully" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Writes file contents |
| **Determinism** | Deterministic |
| **Idempotency** | Depends |

---

### 🔹 Tool: `search_symbols_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_symbols_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Fuzzy searches symbols in the workspace and returns locations and kinds.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Symbol name query. |
| `maxResults` | `number` | ❌ | `10` | Max results to return. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "createWorkspace", "maxResults": 10 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Found 3 symbols ..." }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | Streamable HTTP endpoint at http://localhost:3000/mcp |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| — | — | — | — | None documented |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| package.json | VS Code extension settings and contribution points. |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "vscode-mcp-server.port": 3000,
  "vscode-mcp-server.host": "127.0.0.1",
  "vscode-mcp-server.defaultEnabled": false,
  "vscode-mcp-server.enabledTools": {
    "file": true,
    "edit": true,
    "shell": true,
    "diagnostics": true,
    "symbol": true
  }
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| — | Not applicable (VS Code extension) |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install from VS Code Marketplace (JuehangQin.vscode-mcp-server) |
| 2 | Or build from source: `npm install` then `npm run compile` |

### 8.2 Typical Run Commands *(optional)*

```bash
# Start VS Code and toggle the MCP server from the status bar
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | VS Code OutputChannel (MCP Server Extension) |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- Recursive file listing on root may be large; avoid unless needed.
- Shell command execution is time-limited by default (10s).

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 12 |
| **Read-only** | 5 |
| **Write-only** | 6 |
| **Hybrid** | 1 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Authentication | Not implemented (explicitly noted). |
| Multi-workspace support | README says only one workspace supported. |

---

<div align="center">

*— End of Report —*

</div>
