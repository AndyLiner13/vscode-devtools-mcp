<div align="center">

# 📋 MCP Server Report

## `lsp-mcp`
### [`jonrad/lsp-mcp`](https://github.com/jonrad/lsp-mcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/jonrad/lsp-mcp` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `b48c04c52731e3e499352fc644992dcce6202db2` |
| **Commit URL** | `https://github.com/jonrad/lsp-mcp/commit/b48c04c52731e3e499352fc644992dcce6202db2` |
| **License** | `MIT` |
| **Version** | `Unknown` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | jonrad/lsp-mcp MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` (LSP `Position` line/character indexing inferred as 0-based from LSP output examples) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `mixed` (`mem://...` URIs, `file://...` URIs, and raw filesystem paths which are resolved to absolute paths) |
| **Line/column indexing** | `0-based` (LSP `Position` line/character) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `mixed` (some tools return JSON strings in `content[].text`; others return plain text like a `mem://...` URI) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes LSP requests as MCP tools by proxying to locally spawned LSP servers.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Claude Desktop, Cursor, MCP CLI clients |

### 1.3 Primary Capabilities

- [x] Start/inspect LSP servers
- [x] LSP hover/symbol/document queries
- [x] Convert file contents to URI
- [x] Auto-generate MCP tools for configured LSP methods

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can run stdio MCP servers; also Docker. |
| **Documented integrations** | Claude Desktop, Cursor |
| **Notes / constraints** | Requires LSP servers installed/configured. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Any language with LSP server; examples include TypeScript/JS, Python |
| **How to extend** | Configure LSP servers via config/CLI |

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
| **Runtime** | Node.js (Dockerfile uses Node 20), MCP SDK, vscode-languageserver-protocol, vscode-jsonrpc, commander, zod, @apidevtools/json-schema-ref-parser, strip-json-comments |
| **External / System** | One or more LSP server executables (configured via `dev/*.config.json` or CLI) |
| **Optional** | Docker image installs `typescript-language-server` and `python3-pylsp` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Mixed` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `No` |
| **Config files used** | `Yes` (dev/*.config.json) |
| **CLI flags used** | `Yes` (CLI overrides) |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | LSP + MCP SDK |
| **Architecture notes** | Spawns LSP servers; JSON-RPC with LSP framing. |

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
| **Writes local files** | `No` (not documented) |
| **Uses local cache** | `No` (not documented) |
| **Uses external DB** | `No` |
| **Retains user code** | `Unknown` |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `file_contents_to_uri` |
| 2 | `lsp_info` |
| 3 | `textDocument_documentSymbol` |

> Note: This server can expose many more MCP tools at runtime by auto-generating tools for additional LSP request methods. Which methods are enabled is configurable via a `methods` list in config (e.g., `dev/dev.config.json` enables only `textDocument/documentSymbol`; omitting `methods` enables all available request methods from the bundled LSP schema/metamodel).

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `lsp` | Optional LSP backend ID used when multiple LSPs are configured. |
| `textDocument.uri` | A `mem://...` URI (from `file_contents_to_uri`), a `file://...` URI, or a raw filesystem path (resolved to an absolute path). |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `content[].text` | Tool results use MCP’s `content[]`; many tools place either a JSON string (e.g., LSP response) or plain text (e.g., `mem://...` URI) in `content[].text`. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | For non-`mem://` URIs, the server reads file contents from disk after resolving the input to an absolute path. |
| **Rate limits / retries** | `Not documented` |
| **File size limits** | `Not documented` |
| **Resource constraints** | `Not documented` |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Not documented` |

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `file_contents_to_uri`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>file_contents_to_uri</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Creates a temporary in-memory <code>mem://...</code> document URI from raw file contents, and opens that document in an LSP (via <code>textDocument/didOpen</code>) so that LSP request tools can reference it by URI.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_contents` | `string` | ✅ | — | Raw file contents to open in the LSP. |
| `programming_language` | `string` | ❌ | — | Language hint (case-insensitive) used to choose an LSP backend. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_contents": "function add(a: number, b: number) { return a + b }\n",
	"programming_language": "typescript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP tool result object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "mem://k9x2m1q0r.typescript"
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
| **Side effects** | Sends `textDocument/didOpen` to an LSP; may implicitly start the target LSP process. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | At least one LSP backend must be configured. |
| **Postconditions** | The LSP has an open document for the returned `mem://...` URI. |
| **Limits** | `Unknown` |
| **Implementation details** | Chooses an LSP based on `programming_language` (case-insensitive) when provided; otherwise uses the default LSP. Generated URIs follow `mem://{random}.{lspId}`. Opens the document via `textDocument/didOpen` with `version: 1` and a `languageId` currently hard-coded as `"typescript"` in the implementation. |
| **Security & privacy** | Avoids reading from disk by accepting raw contents; still sends contents to a local LSP subprocess. |

---

### 🔹 Tool: `lsp_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a JSON summary of configured LSP backends (their IDs, supported languages/extensions, whether they are started, and—if started—their reported server capabilities).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters documented. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP tool result object; `content[].text` is a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "[\n  {\n    \"id\": \"typescript\",\n    \"languages\": [\"typescript\", \"javascript\"],\n    \"extensions\": [\"ts\", \"tsx\", \"js\", \"jsx\"],\n    \"started\": \"Not started. LSP will start automatically when needed, such as when analyzing a file with extensions ts, tsx, js, jsx.\",\n    \"capabilities\": \"LSP not started. Capabilities will be available when started.\"\n  },\n  {\n    \"id\": \"python\",\n    \"languages\": [\"python\", \"python2\", \"python3\"],\n    \"extensions\": [\"py\"],\n    \"started\": true,\n    \"capabilities\": {\n      \"documentSymbolProvider\": true\n    }\n  }\n]"
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
| **Side effects** | None documented. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | LSP backends must be configured. |
| **Postconditions** | None. |
| **Limits** | `Unknown` |
| **Implementation details** | Implemented directly by the MCP server (not an LSP-method proxy). If an LSP is not started yet, `started`/`capabilities` may be human-readable strings; if started, `capabilities` is the LSP `ServerCapabilities` from the `initialize` handshake. |
| **Security & privacy** | Reports in-memory server state; no filesystem reads documented for this tool. |

---

### 🔹 Tool: `textDocument_documentSymbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>textDocument_documentSymbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Proxies the LSP request <code>textDocument/documentSymbol</code> to return the symbols defined in a document (functions, classes, variables, etc.).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `textDocument` | `object` | ✅ | — | LSP `TextDocumentIdentifier` containing `uri`. |
| `textDocument.uri` | `string` | ✅ | — | `mem://...` URI from `file_contents_to_uri`, a `file://...` URI, or a raw filesystem path. |
| `lsp` | `string` | ❌ | — | LSP backend ID (present when multiple LSPs are configured). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"textDocument": {
		"uri": "/absolute/or/container/path/to/file.ts"
	},
	"lsp": "typescript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP tool result object; `content[].text` is a JSON string of the LSP response) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "[\n  {\n    \"name\": \"add\",\n    \"kind\": 12,\n    \"range\": {\n      \"start\": { \"line\": 0, \"character\": 0 },\n      \"end\": { \"line\": 0, \"character\": 45 }\n    },\n    \"selectionRange\": {\n      \"start\": { \"line\": 0, \"character\": 9 },\n      \"end\": { \"line\": 0, \"character\": 12 }\n    }\n  }\n]"
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
| **Side effects** | May start the selected LSP; may read file contents from disk and send `textDocument/didOpen` for non-`mem://` URIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | LSP backends must be configured; if a disk path is provided, the file must exist and be readable. |
| **Postconditions** | The chosen LSP may have the document opened (via `didOpen`). |
| **Limits** | `Unknown` |
| **Implementation details** | This tool proxies the LSP method `textDocument/documentSymbol` and is auto-generated from the bundled LSP schema/metamodel (tool IDs replace `/` with `_`). If multiple LSPs are configured, an optional `lsp` input is injected; when omitted, the server may select an LSP based on file extension and otherwise fall back to the default. For non-`mem://` values, the server treats `textDocument.uri` as `file://...` or a raw path, resolves it to an absolute path, reads the file, sends `textDocument/didOpen`, and normalizes the URI to `file://{absolutePath}` before issuing the request. Result shape is whatever the LSP returns (`DocumentSymbol[]` or `SymbolInformation[]`). |
| **Security & privacy** | For non-`mem://` URIs, reads file contents from disk and sends them to a local LSP subprocess. |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `Not documented` |
| **MCP prompts exposed** | `Not documented` |
| **Other RPC endpoints** | `Not documented` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `None` | — | — | — | No environment variables were identified. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `dev/*.config.json` | Configure LSP backends and enabled LSP request methods (e.g., `methods` list). Omitting `methods` enables all available request methods from the bundled LSP schema/metamodel. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Unknown` | CLI overrides are supported (exact flags not documented in the source report). |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `Unknown` |

### 8.2 Typical Run Commands

```bash
Not documented
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- LSP subprocess startup may add latency; tools may auto-start LSPs on demand.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `3` |
| **Read-only** | `1` |
| **Write-only** | `0` |
| **Hybrid** | `2` |

<div align="center">

*— End of Report —*

</div>
