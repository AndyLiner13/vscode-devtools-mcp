<div align="center">

# 📋 MCP Server Report

## `lsp-mcp`
### [`Tritlo/lsp-mcp`](https://github.com/Tritlo/lsp-mcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/Tritlo/lsp-mcp` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `a37170a1bbd6b7fe99c8021707b6ff0dbbaed376` |
| **Commit URL** | `https://github.com/Tritlo/lsp-mcp/commit/a37170a1bbd6b7fe99c8021707b6ff0dbbaed376` |
| **License** | `MIT` |
| **Version** | `0.2.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Tritlo lsp-mcp MCP server |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Unknown` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `absolute` (root_dir, file paths) |
| **Line/column indexing** | `1-based` (converted to 0-based for LSP) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text` (plain text or JSON string) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that bridges MCP clients to a local LSP server, exposing hover/completions/diagnostics/code actions.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | `None` |

### 1.3 Primary Capabilities

- Start/restart LSP server
- Open/close documents & diagnostics
- Hover/completions/code actions

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Local stdio MCP server that spawns LSP. |
| **Documented integrations** | `Unknown` |
| **Notes / constraints** | Requires Node.js and an LSP server executable. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Determined by LSP server installed |
| **How to extend** | Install/configure LSP server |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | `MIT` |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | TypeScript (Node.js ESM; compiled to `dist/index.js`) |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Node.js (v16+), `@modelcontextprotocol/sdk`, `zod`, `zod-to-json-schema` |
| **External / System** | LSP server executable (e.g., `typescript-language-server`) |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Unknown` |
| **Config files used** | `Unknown` |
| **CLI flags used** | `Unknown` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | MCP SDK + LSP |
| **Architecture notes** | Spawns language server process and communicates via stdio LSP JSON-RPC with `Content-Length` framing. |

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
| **Writes local files** | `No` |
| **Uses local cache** | `Yes` (in-memory diagnostics cache) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (in-memory document contents for open files) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `close_document` |
| 2 | `get_code_actions` |
| 3 | `get_completions` |
| 4 | `get_diagnostics` |
| 5 | `get_info_on_location` |
| 6 | `open_document` |
| 7 | `restart_lsp_server` |
| 8 | `set_log_level` |
| 9 | `start_lsp` |

---

## 🔨 § 5 — MCP Tools Reference

### 🔹 Tool: `close_document`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>close_document</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Closes a previously opened file in the LSP server to reduce server-side analysis load.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute path to file to close. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "/absolute/path/to/your/project/src/example.ts"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with plain text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "File successfully closed: /absolute/path/to/your/project/src/example.ts"
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
| **Side effects** | Mutates LSP document state. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called. |
| **Postconditions** | Document closed via `textDocument/didClose`. |
| **Limits** | No-op if document was not open. |
| **Security & privacy** | Operates on local files only. |

---

### 🔹 Tool: `get_code_actions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_code_actions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves code actions (quick fixes/refactors) for a range using LSP <code>textDocument/codeAction</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute path to file. |
| `language_id` | `string` | ✅ | — | LSP language id (e.g., `typescript`). |
| `start_line` | `integer` | ✅ | — | 1-based start line. |
| `start_column` | `integer` | ✅ | — | 1-based start column. |
| `end_line` | `integer` | ✅ | — | 1-based end line. |
| `end_column` | `integer` | ✅ | — | 1-based end column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "/absolute/path/to/your/project/src/example.ts",
	"language_id": "typescript",
	"start_line": 40,
	"start_column": 1,
	"end_line": 40,
	"end_column": 20
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array; `content[0].text` is JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "[\n  {\n    \"title\": \"Add missing import\",\n    \"kind\": \"quickfix\"\n  }\n]"
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
| **Side effects** | None. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called. |
| **Postconditions** | Returns code actions for the given range. |
| **Limits** | Range is converted to 0-based LSP coordinates. |
| **Security & privacy** | Operates on local files only. |

---

### 🔹 Tool: `get_completions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_completions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves completion suggestions at a file location using LSP <code>textDocument/completion</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute path to file. |
| `language_id` | `string` | ✅ | — | LSP language id. |
| `line` | `integer` | ✅ | — | 1-based line. |
| `column` | `integer` | ✅ | — | 1-based column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "/absolute/path/to/your/project/src/example.ts",
	"language_id": "typescript",
	"line": 5,
	"column": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array; `content[0].text` is JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "[\n  {\n    \"label\": \"toString\",\n    \"kind\": 2\n  }\n]"
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
| **Side effects** | None. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called. |
| **Postconditions** | Returns completion items (array or list). |
| **Limits** | Line/column converted to 0-based for LSP. |
| **Security & privacy** | Operates on local files only. |

---

### 🔹 Tool: `get_diagnostics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_diagnostics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns diagnostic messages for one open file or all currently open files.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ❌ | — | Absolute path to file; omit to get all open files. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "/absolute/path/to/your/project/src/example.ts"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array; `content[0].text` is JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "{\n  \"file:///absolute/path/to/your/project/src/example.ts\": [\n    {\n      \"range\": {\n        \"start\": { \"line\": 0, \"character\": 0 },\n        \"end\": { \"line\": 0, \"character\": 10 }\n      },\n      \"severity\": 1,\n      \"message\": \"Example diagnostic message\"\n    }\n  ]\n}"
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
| **Side effects** | None. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called; file must be open if `file_path` is provided. |
| **Postconditions** | Returns cached diagnostics from LSP publish notifications. |
| **Limits** | Only open files are included when `file_path` is omitted. |
| **Security & privacy** | Operates on local files only. |

---

### 🔹 Tool: `get_info_on_location`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_info_on_location</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves hover information at a specific file location using LSP <code>textDocument/hover</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute path to file. |
| `language_id` | `string` | ✅ | — | LSP language id. |
| `line` | `integer` | ✅ | — | 1-based line. |
| `column` | `integer` | ✅ | — | 1-based column. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "/absolute/path/to/your/project/src/example.ts",
	"language_id": "typescript",
	"line": 4,
	"column": 15
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with plain text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "(hover text returned by the LSP server)"
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
| **Side effects** | None. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called. |
| **Postconditions** | Returns hover text or empty string. |
| **Limits** | Line/column treated as 1-based input and converted to 0-based for LSP (`line - 1`, `column - 1`). |
| **Security & privacy** | Opens document internally before hover. |

---

### 🔹 Tool: `open_document`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>open_document</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Opens a file in the LSP server (or updates it if already open).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | Absolute path to file. |
| `language_id` | `string` | ✅ | — | LSP language id. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "/absolute/path/to/your/project/src/example.ts",
	"language_id": "typescript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with plain text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "File successfully opened: /absolute/path/to/your/project/src/example.ts"
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
| **Side effects** | Mutates LSP document state. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called. |
| **Postconditions** | LSP `didOpen` or `didChange` sent. |
| **Limits** | Reads file content from disk. |
| **Security & privacy** | Local file contents are read into memory. |

---

### 🔹 Tool: `restart_lsp_server`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>restart_lsp_server</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Restarts the underlying LSP server process and reinitializes it.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root_dir` | `string` | ❌ | — | Optional new root directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```

```json
{
	"root_dir": "/absolute/path/to/your/project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with plain text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "LSP server successfully restarted"
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
| **Side effects** | Restarts external LSP process. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `start_lsp` must have been called at least once. |
| **Postconditions** | LSP server restarts and re-initializes. |
| **Limits** | Uses stored root if not provided. |
| **Security & privacy** | Local process management only. |

---

### 🔹 Tool: `set_log_level`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>set_log_level</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Sets MCP server logging verbosity at runtime.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `level` | `string` | ✅ | — | One of: debug, info, notice, warning, error, critical, alert, emergency. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"level": "debug"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with plain text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "Log level set to: debug"
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
| **Side effects** | Changes server logging level. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Server running. |
| **Postconditions** | Logging verbosity updated; may send MCP message notification. |
| **Limits** | Logging goes to console with ANSI coloring. |
| **Security & privacy** | None. |

---

### 🔹 Tool: `start_lsp`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>start_lsp</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Starts and initializes the LSP client/server connection for a given project root directory.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root_dir` | `string` | ✅ | — | Absolute path to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root_dir": "/absolute/path/to/your/project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with plain text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "LSP server successfully started with root directory: /absolute/path/to/your/project"
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
| **Side effects** | Starts external LSP process and initializes state. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | LSP executable configured and available. |
| **Postconditions** | LSP initialized with `rootUri` based on `root_dir`. |
| **Limits** | Must be called before other LSP tools. |
| **Security & privacy** | Spawns local process; uses stdio. |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `Not documented` (URI-based resources are mentioned, but not enumerated in the source report) |
| **MCP prompts exposed** | `Not documented` |
| **Other RPC endpoints** | `Not documented` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `Not documented` | — | — | — | No environment variables are described in the source report. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Not documented` | No config files are described in the source report. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | The source report notes that the language-server executable path and args are passed to the MCP server CLI, but does not enumerate flags. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Node.js (README indicates v16+). |
| 2 | Install a language server executable suitable for your project (e.g., `typescript-language-server`). |

### 8.2 Typical Run Commands

```bash
Not documented
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | Printed to server console (ANSI colored); may also send notifications to the MCP client. |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- Diagnostics are cached in-memory by file URI and returned only for currently open documents.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `9` |
| **Read-only** | `4` |
| **Write-only** | `0` |
| **Hybrid** | `5` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Resource URI schemes / list of resources | The server is described as exposing URI-based resources, but the source report does not list resource names or URI patterns. |
| CLI flags and exact startup examples | The source report does not provide concrete CLI invocation examples. |
| Environment variables / config files | Not documented in the source report. |

---

<div align="center">

*— End of Report —*

</div>
