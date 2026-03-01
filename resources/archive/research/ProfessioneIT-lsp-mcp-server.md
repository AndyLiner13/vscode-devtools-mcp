<div align="center">

# 📋 MCP Server Report

## `lsp-mcp-server`
### [`ProfessioneIT/lsp-mcp-server`](https://github.com/ProfessioneIT/lsp-mcp-server)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/ProfessioneIT/lsp-mcp-server` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `91984f70171e90f122d8e913f82a5bd98385d395` |
| **Commit URL** | `https://github.com/ProfessioneIT/lsp-mcp-server/commit/91984f70171e90f122d8e913f82a5bd98385d395` |
| **License** | `MIT` |
| **Version** | `1.1.6` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | lsp-mcp-server MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `No` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `absolute` (file_path) |
| **Line/column indexing** | `1-based` |
| **Encoding model** | `UTF-16` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes LSP features by managing local language servers and providing tool wrappers.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Claude Code |

### 1.3 Primary Capabilities

- [ ] LSP navigation (definition, type definition, references, implementations)
- [ ] LSP assistance (hover, signature help, completions)
- [ ] Workspace and document symbol discovery
- [ ] Diagnostics (per-file and workspace, cached)
- [ ] Editing via LSP (rename, formatting, code actions)

### 1.4 Non-Goals / Exclusions

- `Not documented`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that supports stdio. |
| **Documented integrations** | Claude Code |
| **Notes / constraints** | Requires LSP servers installed. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | TS/JS, Python, Rust, Go, C/C++, Ruby, PHP, Elixir (configurable) |
| **How to extend** | Configure lsp-mcp JSON config |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | TypeScript |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Node.js >= 18, MCP SDK, vscode-jsonrpc, vscode-languageserver-protocol, zod |
| **External / System** | Language server executables |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Unknown` |
| **Config files used** | `Yes` (`.lsp-mcp.json`, `lsp-mcp.json`) |
| **CLI flags used** | `Unknown` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | LSP |
| **Architecture notes** | MCP SDK + LSP JSON-RPC. |

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
| **Writes local files** | `Yes` (rename/format/code actions when apply) |
| **Uses local cache** | `Yes` (in-memory/session cache for diagnostics and opened documents) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (reads file contents for LSP operations) |

---

## 🗂️ § 3 — Tool Index

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `lsp_call_hierarchy` |
| 2 | `lsp_code_actions` |
| 3 | `lsp_completions` |
| 4 | `lsp_diagnostics` |
| 5 | `lsp_document_symbols` |
| 6 | `lsp_file_exports` |
| 7 | `lsp_file_imports` |
| 8 | `lsp_find_implementations` |
| 9 | `lsp_find_references` |
| 10 | `lsp_find_symbol` |
| 11 | `lsp_format_document` |
| 12 | `lsp_goto_definition` |
| 13 | `lsp_goto_type_definition` |
| 14 | `lsp_hover` |
| 15 | `lsp_related_files` |
| 16 | `lsp_rename` |
| 17 | `lsp_server_status` |
| 18 | `lsp_signature_help` |
| 19 | `lsp_smart_search` |
| 20 | `lsp_start_server` |
| 21 | `lsp_stop_server` |
| 22 | `lsp_type_hierarchy` |
| 23 | `lsp_workspace_diagnostics` |
| 24 | `lsp_workspace_symbols` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `FilePosition` | `{ file_path: string, line: number, column: number }` (absolute path; 1-indexed positions) |
| `FileRange` | `{ start_line: number, start_column: number, end_line: number, end_column: number }` (1-indexed) |
| `WorkspaceRoot` | Absolute path string used when starting servers (`workspace_root`) |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `Location` | `{ path: string, line: number, column: number, end_line?: number, end_column?: number, context?: string }` (representative; varies by language server) |
| `Range` | `{ start: { line: number, column: number }, end: { line: number, column: number } }` (returned in several tool outputs) |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` paths required for `file_path` inputs |
| **Position handling** | Input `line`/`column` are 1-indexed; converted internally to LSP’s 0-indexed UTF-16 coordinates |
| **Document sync** | Tools ensure the document is opened/synced to the language server before querying |
| **Workspace boundary validation** | Writes are validated to stay within workspace before applying edits (for rename/format/code actions) |
| **Session scope** | Some results (e.g., `imported_by`, workspace diagnostics) may be partial and based on files opened in the current session |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Not documented` |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `lsp_call_hierarchy`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_call_hierarchy</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP call hierarchy to show callers/callees for a callable symbol.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `direction` | `string` | ❌ | — | Call direction (e.g., `both`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 20, "column": 5, "direction": "both"}
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
	"item": {"name": "doWork", "kind": "Function", "path": "/abs/path/to/src/main.ts", "line": 20, "column": 1, "range": {"start": {"line": 20, "column": 1}, "end": {"line": 40, "column": 2}}, "selection_range": {"start": {"line": 20, "column": 10}, "end": {"line": 20, "column": 16}}},
	"incoming_calls": [{"from": {"name": "main", "kind": "Function", "path": "/abs/path/to/src/app.ts", "line": 5, "column": 1, "range": {"start": {"line": 5, "column": 1}, "end": {"line": 12, "column": 2}}, "selection_range": {"start": {"line": 5, "column": 10}, "end": {"line": 5, "column": 14}}}, "from_ranges": [{"start": {"line": 8, "column": 3}, "end": {"line": 8, "column": 9}}]}]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | A language server must be running for the file’s workspace. |
| **Postconditions** | None. |
| **Limits** | Output schema is representative and can vary by language server. |
| **Security & privacy** | Reads local files and queries local language servers. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `lsp_code_actions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_code_actions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists available LSP code actions for a range and optionally applies an edit-based action. Command-only actions are not executable (no <code>workspace/executeCommand</code> support).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `start_line` | `number` | ✅ | — | 1-based start line. |
| `start_column` | `number` | ✅ | — | 1-based start column. |
| `end_line` | `number` | ✅ | — | 1-based end line. |
| `end_column` | `number` | ✅ | — | 1-based end column. |
| `kinds` | `string[]` | ❌ | — | Optional filter by action kind. |
| `apply` | `boolean` | ❌ | — | Whether to apply edits to disk when possible. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "start_line": 5, "start_column": 1, "end_line": 5, "end_column": 40, "kinds": ["quickfix"], "apply": false}
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
	"actions": [
		{
			"title": "Add missing import",
			"kind": "quickfix",
			"is_preferred": true,
			"edit": {
				"files_affected": 1,
				"changes": {
					"/abs/path/to/src/main.ts": [
						{"range": {"start": {"line": 1, "column": 1}, "end": {"line": 1, "column": 1}}, "new_text": "import { X } from './x';\n"}
					]
				}
			}
		}
	],
	"total_count": 1
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | May write edits to disk when `apply=true` and the action contains a `WorkspaceEdit`. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Unknown` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | A language server must be running for the file’s workspace. |
| **Postconditions** | When `apply=true`, edits may be applied to disk (workspace-boundary validated). |
| **Limits** | Command-only actions are not executable and will error if `apply=true`. |
| **Security & privacy** | Reads local files and may write local files when applying edits. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `lsp_completions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_completions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP completion and returns normalized completion items with a configurable limit.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `limit` | `number` | ❌ | — | Max results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 15, "column": 12, "limit": 20}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"completions": [{"label": "toString", "kind": "Method", "detail": "(method) toString(): string"}], "is_incomplete": false}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_diagnostics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_diagnostics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns cached diagnostics for a file (from <code>publishDiagnostics</code> notifications). Supports severity filtering.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `severity_filter` | `string` | ❌ | — | Severity filter (e.g., `warning`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "severity_filter": "warning"}
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
	"diagnostics": [{"range": {"start": {"line": 5, "column": 10}, "end": {"line": 5, "column": 20}}, "severity": "error", "message": "Cannot find name 'x'", "context": "console.log(x)"}],
	"summary": {"errors": 1, "warnings": 0, "info": 0, "hints": 0},
	"note": "Diagnostics are cached from language server notifications. If file was recently modified, re-open it to refresh."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_document_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_document_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP document symbols to return a structured outline for a single file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts"}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"symbols": [{"name": "UserService", "kind": "Class", "range": {"start": {"line": 1, "column": 1}, "end": {"line": 80, "column": 2}}, "children": [{"name": "getUser", "kind": "Method", "range": {"start": {"line": 10, "column": 3}, "end": {"line": 20, "column": 4}}}]}]}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_file_exports`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_file_exports</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses document symbols (and optional per-symbol hover) to approximate a file’s exported/top-level API surface.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `include_signatures` | `boolean` | ❌ | — | Whether to attempt signature-like strings via hover. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/index.ts", "include_signatures": true}
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
	"file": "/abs/path/to/src/index.ts",
	"exports": [{"name": "makeClient", "kind": "Function", "line": 5, "column": 1, "signature": "makeClient(url: string): Client"}],
	"note": "Returns top-level symbols. For true export detection, check if symbols are prefixed with \"export\" in the source."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_file_imports`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_file_imports</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extracts import dependencies by scanning file content with patterns (ESM, dynamic import, CommonJS require), not by querying the language server.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts"}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"file": "/abs/path/to/src/main.ts", "imports": [{"module": "react", "line": 1}, {"module": "./utils", "line": 2, "symbols": ["foo", "bar"], "is_type_only": false}], "note": "Imports extracted from file content using pattern matching. Supports ES modules, CommonJS require(), and dynamic imports."}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_find_implementations`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_find_implementations</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP implementation lookup to find implementations of interfaces/abstract members.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `limit` | `number` | ❌ | — | Max results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/types.ts", "line": 20, "column": 7, "limit": 50}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"implementations": [{"path": "/abs/path/to/src/impl.ts", "line": 14, "column": 1, "end_line": 14, "end_column": 35, "context": "export class Impl implements IFoo {"}], "total_count": 1, "returned_count": 1, "has_more": false}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_find_references`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_find_references</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP references to return a paginated list of semantic references to the symbol.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `include_declaration` | `boolean` | ❌ | — | Include the declaration reference. |
| `limit` | `number` | ❌ | — | Page size. |
| `offset` | `number` | ❌ | — | Page offset. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 10, "column": 5, "include_declaration": true, "limit": 100, "offset": 0}
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
	"references": [{"path": "/abs/path/to/src/a.ts", "line": 5, "column": 3, "end_line": 5, "end_column": 12, "context": "callUserService()"}],
	"total_count": 12,
	"returned_count": 1,
	"offset": 0,
	"has_more": true
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_find_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_find_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for a symbol by name (fuzzy), selects a best match, and enriches it with additional semantic results. Requires at least one running server.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Symbol name query. |
| `kind` | `string` | ❌ | — | Symbol kind filter. |
| `include` | `string[]` | ❌ | — | Enrichments to include (e.g., definition/references/hover). |
| `references_limit` | `number` | ❌ | — | Max references to return when included. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"name": "UserService", "kind": "Class", "include": ["definition", "references", "hover"], "references_limit": 20}
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
	"query": "UserService",
	"matches_found": 3,
	"match": {"name": "UserService", "kind": "Class", "path": "/abs/path/to/src/user.ts", "line": 3, "column": 1},
	"symbol_name": "UserService",
	"definition": {"path": "/abs/path/to/src/user.ts", "line": 3, "column": 1, "end_line": 30, "end_column": 2, "context": "export class UserService {"}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_format_document`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_format_document</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP document formatting and can optionally apply the resulting edits to disk.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `tab_size` | `number` | ❌ | — | Tab size. |
| `insert_spaces` | `boolean` | ❌ | — | Whether to insert spaces instead of tabs. |
| `apply` | `boolean` | ❌ | — | Whether to apply edits to disk. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "tab_size": 2, "insert_spaces": true, "apply": false}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"edits": [{"range": {"start": {"line": 1, "column": 1}, "end": {"line": 1, "column": 10}}, "new_text": "formatted"}], "edits_count": 1, "applied": false}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | May write edits to disk when `apply=true` (workspace-boundary validated). |
| **Determinism** | `Unknown` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `lsp_goto_definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_goto_definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP definition lookup to find the symbol’s definition location.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 42, "column": 10}
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
	"definitions": [
		{
			"path": "/abs/path/to/src/utils.ts",
			"line": 10,
			"column": 1,
			"end_line": 10,
			"end_column": 25,
			"context": "export function helper(...) {",
			"symbol_name": "helper"
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_goto_type_definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_goto_type_definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP type definition lookup to navigate to the symbol’s type definition.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 12, "column": 18}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"definitions": [{"path": "/abs/path/to/src/types.ts", "line": 3, "column": 1, "end_line": 8, "end_column": 2, "context": "export interface User {"}]}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_hover`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_hover</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP hover to retrieve type info and docs at a position. Normalizes hover content into a string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 8, "column": 15}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"contents": "(method) UserService.getUser(id: string): Promise<User>", "range": {"start": {"line": 8, "column": 10}, "end": {"line": 8, "column": 17}}}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_related_files`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_related_files</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Computes import relationships for a file (imports and a best-effort imported-by list based on files opened in the current session).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `relationship` | `string` | ❌ | — | Relationship mode (e.g., `all`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "relationship": "all"}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"file": "/abs/path/to/src/main.ts", "imports": ["./utils"], "imported_by": ["/abs/path/to/src/app.ts"], "note": "Import relationships based on file content analysis. Only files opened in this session are included in imported_by."}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_rename`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_rename</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Safe refactor rename via LSP prepare/rename. Defaults to <code>dry_run=true</code> to preview edits; can apply edits when <code>dry_run=false</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `new_name` | `string` | ✅ | — | New symbol name. |
| `dry_run` | `boolean` | ❌ | `true` | Preview only when `true`; apply edits when `false`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 10, "column": 5, "new_name": "newIdentifier", "dry_run": true}
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
	"original_name": "oldIdentifier",
	"changes": {
		"/abs/path/to/src/main.ts": [
			{"range": {"start": {"line": 10, "column": 5}, "end": {"line": 10, "column": 18}}, "new_text": "newIdentifier", "context": "oldIdentifier"}
		]
	},
	"files_affected": 1,
	"edits_count": 1,
	"applied": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | May write edits to disk when `dry_run=false` (workspace-boundary validated). |
| **Determinism** | `Unknown` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `lsp_server_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_server_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists active language-server instances (optionally filtered by <code>server_id</code>), including status and capabilities.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `server_id` | `string` | ❌ | — | Filter by server id. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"server_id": "typescript"}
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
	"servers": [
		{
			"id": "typescript",
			"status": "running",
			"pid": 12345,
			"workspace_root": "/abs/path/to/project",
			"capabilities": ["definition", "references", "hover"],
			"uptime_seconds": 120,
			"restart_count": 0
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_signature_help`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_signature_help</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP signature help to return call signatures and active parameter information.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 30, "column": 25}
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
	"signatures": [{"label": "fn(a: string, b: number): void", "parameters": [{"label": "a: string"}, {"label": "b: number"}]}],
	"active_signature": 0,
	"active_parameter": 1
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_smart_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_smart_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Convenience “meta tool” that can combine multiple operations in one call (hover, definition, references, implementations, call hierarchy).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `include` | `string[]` | ❌ | — | Sections to include (e.g., definition/references/hover). |
| `references_limit` | `number` | ❌ | — | Max references to return when included. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/main.ts", "line": 10, "column": 5, "include": ["definition", "references", "hover"], "references_limit": 10}
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
	"symbol_name": "UserService",
	"hover": {"contents": "class UserService"},
	"definition": {"path": "/abs/path/to/src/user.ts", "line": 3, "column": 1, "end_line": 30, "end_column": 2, "context": "export class UserService {"},
	"references": {"items": [{"path": "/abs/path/to/src/app.ts", "line": 7, "column": 9, "end_line": 7, "end_column": 20, "context": "new UserService()"}], "total_count": 5, "has_more": false}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_start_server`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_start_server</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Starts a configured language server for a workspace root and returns detected capabilities.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `server_id` | `string` | ✅ | — | Language server id. |
| `workspace_root` | `string` | ✅ | — | Absolute workspace root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"server_id": "typescript", "workspace_root": "/abs/path/to/project"}
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
	"status": "started",
	"server_id": "typescript",
	"workspace_root": "/abs/path/to/project",
	"capabilities": ["definition", "references", "hover", "formatting"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Starts a local language server process. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `lsp_stop_server`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_stop_server</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Stops a running language server instance (optionally scoped by workspace root).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `server_id` | `string` | ✅ | — | Language server id. |
| `workspace_root` | `string` | ❌ | — | Workspace root; omit to stop all instances for the server id. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"server_id": "typescript", "workspace_root": "/abs/path/to/project"}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"status": "stopped", "server_id": "typescript", "was_running": true, "workspace_root": "/abs/path/to/project"}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Stops a local language server process. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `lsp_type_hierarchy`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_type_hierarchy</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP type hierarchy to explore inheritance/implementation relationships.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute file path. |
| `line` | `number` | ✅ | — | 1-based line. |
| `column` | `number` | ✅ | — | 1-based column. |
| `direction` | `string` | ❌ | — | Type direction (e.g., `both`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"file_path": "/abs/path/to/src/types.ts", "line": 3, "column": 1, "direction": "both"}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"item": {"name": "Base", "kind": "Class", "path": "/abs/path/to/src/types.ts", "line": 3, "column": 1, "range": {"start": {"line": 3, "column": 1}, "end": {"line": 10, "column": 2}}, "selection_range": {"start": {"line": 3, "column": 7}, "end": {"line": 3, "column": 11}}}, "subtypes": [{"name": "Derived", "kind": "Class", "path": "/abs/path/to/src/derived.ts", "line": 1, "column": 1, "range": {"start": {"line": 1, "column": 1}, "end": {"line": 20, "column": 2}}, "selection_range": {"start": {"line": 1, "column": 7}, "end": {"line": 1, "column": 14}}}]}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_workspace_diagnostics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_workspace_diagnostics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns cached diagnostics across all files that have diagnostics in the session cache. Supports grouping and limiting.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `severity_filter` | `string` | ❌ | — | Severity filter (e.g., `all`). |
| `limit` | `number` | ❌ | — | Max results. |
| `group_by` | `string` | ❌ | — | Grouping mode (e.g., `file`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"severity_filter": "all", "limit": 50, "group_by": "file"}
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
	"items": [{"file": "/abs/path/to/src/a.ts", "line": 1, "column": 1, "end_line": 1, "end_column": 10, "severity": "warning", "message": "Unused import", "context": "import x from 'y'"}],
	"total_count": 12,
	"returned_count": 1,
	"files_affected": 3,
	"summary": {"errors": 2, "warnings": 5, "info": 3, "hints": 2},
	"note": "Diagnostics are from cache. Only files that have been opened in this session will have diagnostics. Use lsp_diagnostics on specific files to refresh."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_workspace_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_workspace_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Queries all active running language servers and merges their workspace symbol results (polyglot support).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Query string. |
| `kinds` | `string[]` | ❌ | — | Filter by symbol kinds. |
| `limit` | `number` | ❌ | — | Max results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"query": "UserService", "kinds": ["Class"], "limit": 50}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{"symbols": [{"name": "UserService", "kind": "Class", "path": "/abs/path/to/src/user.ts", "line": 3, "column": 1, "container_name": "services"}], "total_count": 1, "returned_count": 1, "has_more": false}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `None` |
| **MCP prompts exposed** | `None` |
| **Other RPC endpoints** | `None` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables
| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `None` | — | — | — | No environment variables documented. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `.lsp-mcp.json` | Server configuration (details not documented in the source report). |
| `lsp-mcp.json` | Server configuration (details not documented in the source report). |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `None` | No CLI flags documented. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| `None` | No installation steps documented. |

### 8.2 Typical Run Commands

Not documented in the source report.

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- `Not documented`

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | 24 |
| **Read-only** | 19 |
| **Write-only** | 2 |
| **Hybrid** | 3 |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Error model details | Not documented (MCP `isError` behavior and common error codes not described). |
| Config schema | The config file schema/keys are not documented in the source report. |
| CLI flags | Not documented in the source report. |
| Environment variables | Not documented in the source report. |

---

<div align="center">

*— End of Report —*

</div>
