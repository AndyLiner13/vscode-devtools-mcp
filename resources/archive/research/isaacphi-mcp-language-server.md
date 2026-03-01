<div align="center">

# 📋 MCP Server Report

## `mcp-language-server`
### [`isaacphi/mcp-language-server`](https://github.com/isaacphi/mcp-language-server)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/isaacphi/mcp-language-server` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `Unknown` |
| **Commit URL** | `Unknown` |
| **License** | `BSD-3-Clause` |
| **Version** | `v0.1.1` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | mcp-language-server MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` — path model and output envelope inferred from the source report |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `Unknown` (the source report describes a `--workspace` directory but does not specify whether tool `filePath` inputs are absolute or workspace-relative) |
| **Line/column indexing** | `1-based` input (converted to 0-based for LSP) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `plain text` (MCP `CallToolResult` where the payload is formatted text in `content[].text`) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes LSP-powered definition, reference, diagnostics, hover, rename, and edit operations.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | VS Code, Cursor, JetBrains (via MCP-capable clients) |

### 1.3 Primary Capabilities

- [x] Find definitions and references
- [x] Diagnostics and hover
- [x] Rename and edit file

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can launch a stdio server; spawns local LSP servers. |
| **Documented integrations** | VS Code, Cursor, JetBrains (via MCP-capable clients) |
| **Notes / constraints** | Requires LSP server executable for target language. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Any language supported by underlying LSP server (tested setups documented for Go `gopls`, Rust `rust-analyzer`, Python `pyright-langserver`, TypeScript `typescript-language-server`, and C/C++ `clangd`) |
| **How to extend** | Configure LSP server |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | Open-source |
| **License details** | BSD-3-Clause |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Go |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Go toolchain; `github.com/mark3labs/mcp-go`, `github.com/fsnotify/fsnotify` |
| **External / System** | LSP server executable (gopls, rust-analyzer, pyright, typescript-language-server, clangd, etc.) |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Yes` (see § 7.1) |
| **Config files used** | `No` |
| **CLI flags used** | `Yes` (`--workspace`; other flags not documented in the source report) |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | LSP + `mcp-go` |
| **Architecture notes** | LSP protocol code derived from gopls (per attribution). |

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
| **Writes local files** | `Yes` (applies edits for rename/edit tools) |
| **Uses local cache** | `Yes` (diagnostics cache in memory) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (reads file contents for snippets/edits) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `definition` |
| 2 | `diagnostics` |
| 3 | `edit_file` |
| 4 | `hover` |
| 5 | `references` |
| 6 | `rename_symbol` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `filePath` | Path to a file under the configured `--workspace` directory. |
| `line` / `column` | 1-indexed position provided by the caller; converted internally to 0-indexed LSP `Position`. |
| `symbolName` | Symbol name, optionally qualified (e.g., `mypackage.MyFunction`, `MyType.MyMethod`). |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `CallToolResult` | Tools return MCP `CallToolResult` containing formatted text in `content[].text`. Source report includes output schemas with an optional `isError` boolean. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `Not documented` (source report implies local on-disk reads/writes within `--workspace`). |
| **Rate limits / retries** | `Not documented` |
| **File size limits** | `Not documented` |
| **Resource constraints** | `Not documented` |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Yes` (present in the example output schemas in the source report) |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Not documented` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses LSP <code>workspace/symbol</code> to find a symbol by name, then resolves and returns the full source definition where it is defined. Output includes symbol metadata and a line-numbered code excerpt.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `symbolName` | `string` | ✅ | — | The name of the symbol whose definition you want to find (e.g. `mypackage.MyFunction`, `MyType.MyMethod`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"symbolName": {
			"type": "string",
			"description": "The name of the symbol whose definition you want to find (e.g. 'mypackage.MyFunction', 'MyType.MyMethod')"
		}
	},
	"required": ["symbolName"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `CallToolResult`, containing text output) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text"] },
					"text": { "type": "string" }
				},
				"required": ["type", "text"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Opens files via the LSP client and reads source content to format excerpts. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | LSP server running and workspace indexed. |
| **Postconditions** | Returns formatted definition blocks. |
| **Limits** | Matching is intentionally conservative to reduce fuzzy matches (qualified names containing `.` require exact matches; unqualified method names may accept suffix matches like `Type.method` / `Type::method`). |
| **Implementation details** | Opens the defining file via the LSP client before extracting the full definition; formats the response as blocks beginning with `---` so multiple matches can be concatenated. |
| **Security & privacy** | Reads source files locally. |

---

### 🔹 Tool: `references`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>references</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds all references/usages of a symbol across the workspace using LSP <code>textDocument/references</code>, grouping results by file and including contextual source snippets.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `symbolName` | `string` | ✅ | — | The name of the symbol to search for (e.g. `mypackage.MyFunction`, `MyType`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"symbolName": {
			"type": "string",
			"description": "The name of the symbol to search for (e.g. 'mypackage.MyFunction', 'MyType')"
		}
	},
	"required": ["symbolName"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `CallToolResult`, containing text output) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text"] },
					"text": { "type": "string" }
				},
				"required": ["type", "text"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Reads source files from disk to format snippets. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | LSP server running and workspace indexed. |
| **Postconditions** | Returns references grouped by file with context lines. |
| **Limits** | Context width defaults to 5 lines and can be overridden via `LSP_CONTEXT_LINES`. |
| **Implementation details** | Uses `workspace/symbol` first to find a canonical location for the symbol, then runs `textDocument/references` from that location. Groups references per file (header includes total count and a compact `At: Lx:Cy` list) and computes display line ranges for excerpt formatting. Uses on-disk reads (`os.ReadFile`) for snippet generation. |
| **Security & privacy** | Reads source files locally. |

---

### 🔹 Tool: `diagnostics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>diagnostics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves diagnostics (errors/warnings/hints) for a specific file, then formats them with optional context.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filePath` | `string` | ✅ | — | The path to the file to get diagnostics for. |
| `contextLines` | `boolean` | ❌ | `false` | Lines to include around each diagnostic (note: implementation expects an integer line count; see notes). |
| `showLineNumbers` | `boolean` | ❌ | `true` | If true, adds line numbers to the output. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"filePath": {
			"type": "string",
			"description": "The path to the file to get diagnostics for"
		},
		"contextLines": {
			"type": "boolean",
			"description": "Lines to include around each diagnostic. (Note: implementation expects an integer line count; see notes.)",
			"default": false
		},
		"showLineNumbers": {
			"type": "boolean",
			"description": "If true, adds line numbers to the output",
			"default": true
		}
	},
	"required": ["filePath"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `CallToolResult`, containing text output) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text"] },
					"text": { "type": "string" }
				},
				"required": ["type", "text"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Opens the file and triggers a diagnostic request; reads diagnostics from an internal cache; may sleep to allow diagnostics to populate. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist and be readable. |
| **Postconditions** | Returns a formatted list of diagnostics; may include source excerpts. |
| **Limits** | `Not documented` |
| **Implementation details** | The implementation expects `contextLines int`, but the tool is registered with a boolean `contextLines` parameter; additionally it attempts to cast `contextLines` to `int` even though JSON numbers typically arrive as `float64`. For predictable context sizing, rely on `LSP_CONTEXT_LINES`. The tool sleeps for ~3 seconds to allow diagnostics to populate (TODO noted to wait for notifications properly). |
| **Security & privacy** | Reads source files locally. |

---

### 🔹 Tool: `hover`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>hover</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves hover information (type/docs) for the symbol under a file position via LSP <code>textDocument/hover</code>. If the LSP returns no hover content, returns a fallback message including the line of code at the requested position.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filePath` | `string` | ✅ | — | The path to the file to get hover information for. |
| `line` | `number` | ✅ | — | The line number where the hover is requested (1-indexed). |
| `column` | `number` | ✅ | — | The column number where the hover is requested (1-indexed). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"filePath": {
			"type": "string",
			"description": "The path to the file to get hover information for"
		},
		"line": {
			"type": "number",
			"description": "The line number where the hover is requested (1-indexed)"
		},
		"column": {
			"type": "number",
			"description": "The column number where the hover is requested (1-indexed)"
		}
	},
	"required": ["filePath", "line", "column"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `CallToolResult`, containing text output) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text"] },
					"text": { "type": "string" }
				},
				"required": ["type", "text"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Opens/reads the file and issues an LSP hover request. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist and be readable. |
| **Postconditions** | Returns hover content or a fallback message with the source line at the requested position. |
| **Limits** | `Not documented` |
| **Implementation details** | Converts 1-indexed `line`/`column` into 0-indexed LSP positions. Uses the `hoverResult.Contents.Value` field (markup content) when available. If hover content is empty, extracts and returns the full line of text as context. |
| **Security & privacy** | Reads source files locally. |

---

### 🔹 Tool: `rename_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>rename_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Renames a symbol across the workspace using LSP <code>textDocument/rename</code>, applies the resulting <code>WorkspaceEdit</code> to local files, and returns a summary of edits made.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filePath` | `string` | ✅ | — | The path to the file containing the symbol to rename. |
| `line` | `number` | ✅ | — | The line number where the symbol is located (1-indexed). |
| `column` | `number` | ✅ | — | The column number where the symbol is located (1-indexed). |
| `newName` | `string` | ✅ | — | The new name for the symbol. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"filePath": {
			"type": "string",
			"description": "The path to the file containing the symbol to rename"
		},
		"line": {
			"type": "number",
			"description": "The line number where the symbol is located (1-indexed)"
		},
		"column": {
			"type": "number",
			"description": "The column number where the symbol is located (1-indexed)"
		},
		"newName": {
			"type": "string",
			"description": "The new name for the symbol"
		}
	},
	"required": ["filePath", "line", "column", "newName"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `CallToolResult`, containing text output) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text"] },
					"text": { "type": "string" }
				},
				"required": ["type", "text"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Applies changes to local files using the returned `WorkspaceEdit`. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist and be readable; rename support depends on the configured LSP server. |
| **Postconditions** | Files may be modified on disk. |
| **Limits** | `Not documented` |
| **Implementation details** | Converts 1-indexed `line`/`column` into 0-indexed LSP positions. Executes rename without a `prepareRename` check for broader compatibility. Counts and formats changes from both `workspaceEdit.Changes` and `workspaceEdit.DocumentChanges`. Applies edits directly via a local `ApplyWorkspaceEdit` helper. Returns either a success summary (`Updated N occurrences across M files`) or `Failed to rename symbol. 0 occurrences found.` |
| **Security & privacy** | Writes to local files. |

---

### 🔹 Tool: `edit_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>edit_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Applies multiple line-based text edits to a file using 1-indexed inclusive line ranges and replacement text.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filePath` | `string` | ✅ | — | Path to the file to edit. |
| `edits` | `array` | ✅ | — | List of edits to apply (`startLine`, `endLine`, `newText`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"filePath": {
			"type": "string",
			"description": "Path to the file to edit"
		},
		"edits": {
			"type": "array",
			"description": "List of edits to apply",
			"items": {
				"type": "object",
				"properties": {
					"startLine": {
						"type": "number",
						"description": "Start line to replace, inclusive, one-indexed"
					},
					"endLine": {
						"type": "number",
						"description": "End line to replace, inclusive, one-indexed"
					},
					"newText": {
						"type": "string",
						"description": "Replacement text. Replace with the new text. Leave blank to remove lines."
					}
				},
				"required": ["startLine", "endLine"]
			}
		}
	},
	"required": ["filePath", "edits"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `CallToolResult`, containing text output) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text"] },
					"text": { "type": "string" }
				},
				"required": ["type", "text"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Applies edits to local files. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist and be readable. |
| **Postconditions** | File content is modified on disk. |
| **Limits** | `Not documented` |
| **Implementation details** | Edits are specified by 1-indexed inclusive line ranges with replacement `newText`, and applied bottom-to-top to avoid line-number shifting. Opens the file in the LSP client first (even though it applies edits locally). Computes a stable summary (`lines removed` / `lines added`) and applies changes via a `WorkspaceEdit` helper. |
| **Security & privacy** | Writes to local files. |

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
| `LSP_CONTEXT_LINES` | ❌ | ❌ | `5` | Controls context width for snippet output (notably referenced by `references`, and recommended for `diagnostics` due to the `contextLines` parameter mismatch). |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Not documented` | No config files were described in the source report. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `--workspace` | Workspace directory used as the context for the spawned LSP server. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `go install ...@latest` (install/build via Go toolchain; exact module path not specified in the source report) |
| 2 | Install a language server executable for your target language (e.g., `gopls`, `pyright-langserver`, `rust-analyzer`, `typescript-language-server`, `clangd`). |

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

- `diagnostics` may sleep (~3 seconds) to allow diagnostics to populate.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `6` |
| **Read-only** | `4` |
| **Write-only** | `2` |
| **Hybrid** | `0` |

### 9.2 Known Gaps / Unregistered Tools

- The codebase contains implementations for CodeLens-related operations (`get_codelens`, `execute_codelens`) under `internal/tools/`, but these tools are not registered by default (registrations commented out in `tools.go`).

<div align="center">

*— End of Report —*

</div>
