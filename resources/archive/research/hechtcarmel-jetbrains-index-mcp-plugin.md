<div align="center">

# 📋 MCP Server Report

## `jetbrains-index-mcp-plugin`
### [`hechtcarmel/jetbrains-index-mcp-plugin`](https://github.com/hechtcarmel/jetbrains-index-mcp-plugin)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/hechtcarmel/jetbrains-index-mcp-plugin` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `Unknown` |
| **Commit URL** | `Unknown` |
| **License** | `MIT` |
| **Version** | `3.3.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | JetBrains IDE plugin hosting an embedded MCP server |
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
| **Path model** | `relative` (relative to project root) |
| **Line/column indexing** | `1-based` |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *JetBrains IDE plugin that exposes IntelliJ PSI/index capabilities as MCP tools over HTTP.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Claude Code, Codex CLI, Cursor, Windsurf, VS Code |

### 1.3 Primary Capabilities

- [x] Symbol navigation (references, definition, implementations, super methods)
- [x] Structural/navigation views (type hierarchy, call hierarchy, file structure)
- [x] Diagnostics and intentions/quick-fixes
- [x] Refactoring (rename, safe delete)

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Runs as a JetBrains IDE plugin hosting an embedded MCP server; MCP clients connect via HTTP using SSE or streamable HTTP. |
| **Documented integrations** | Claude Code, Codex CLI, Cursor, Windsurf, VS Code |
| **Notes / constraints** | Requires JetBrains IDE with plugin installed. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Depends on installed JetBrains language plugins |
| **How to extend** | Install additional IDE language plugins |

- Universal tools are language-agnostic (e.g., references, definition, diagnostics, index status, file/class indices, word-index search).
- Language-aware navigation tools are registered when language handlers are available (varies by tool; README mentions Java, Kotlin, Python, JavaScript/TypeScript, PHP, Go, Rust).
- `ide_file_structure` explicitly documents: Java, Kotlin, Python.
- Refactoring:
	- Rename: works across all languages (via IntelliJ RenameProcessor).
	- Safe delete: Java/Kotlin only (requires Java plugin).

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT (README mentions Apache 2.0, LICENSE is source of truth) |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Kotlin/Java (IntelliJ platform) |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | JetBrains IDE (IntelliJ Platform), JVM 21 (Kotlin JVM toolchain 21), Ktor Server (CIO/core/CORS), kotlinx.serialization, MCP Kotlin SDK |
| **External / System** | IntelliJ PSI/indices |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `No` |
| **Started independently** | `Yes` (IDE plugin) |
| **Env vars used** | `No` |
| **Config files used** | `No` |
| **CLI flags used** | `No` |

- Runs inside the JetBrains IDE process.
- Hosts a local HTTP server (README documents default ports/names).
- Includes a tool window (“Index MCP Server”) showing status and a history of tool calls.

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | IntelliJ PSI + indices; IntelliJ daemon analyzer; IntelliJ refactoring framework |
| **Architecture notes** | Embedded HTTP server via Ktor; JSON-RPC 2.0 request envelope; MCP protocol version defaults to `2024-11-05`. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `No` |
| `http` / `streamable-http` | `Yes` |
| `sse` | `Yes` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `None` |

- SSE transport: `http://127.0.0.1:<port>/index-mcp/sse`
- Streamable HTTP: `http://127.0.0.1:<port>/index-mcp`

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (refactor tools modify project files) |
| **Uses local cache** | `Yes` (IntelliJ indices/cache) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (project files and IDE indices stored locally) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `ide_diagnostics` |
| 2 | `ide_file_structure` |
| 3 | `ide_find_class` |
| 4 | `ide_find_definition` |
| 5 | `ide_find_file` |
| 6 | `ide_find_implementations` |
| 7 | `ide_find_references` |
| 8 | `ide_find_super_methods` |
| 9 | `ide_find_symbol` |
| 10 | `ide_index_status` |
| 11 | `ide_refactor_rename` |
| 12 | `ide_refactor_safe_delete` |
| 13 | `ide_search_text` |
| 14 | `ide_type_hierarchy` |
| 15 | `ide_call_hierarchy` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `project_path` | Absolute path to project root; only needed when multiple projects are open in the IDE. |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `ToolCallResult` | MCP tool result envelope that returns payload JSON as a string in `content[].text` on success. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `relative` to project root (tool inputs use relative paths like `src/...`) |
| **Rate limits / retries** | `Not documented` |
| **File size limits** | `Not documented` |
| **Resource constraints** | Common per-tool caps (e.g., `ide_find_references` max 500; `ide_call_hierarchy` depth max 5; `ide_diagnostics` caps 100 problems and 50 intentions) |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Yes` (tool result envelope includes `isError`) |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | Standard JSON-RPC: `-32700` Parse Error, `-32600` Invalid Request, `-32601` Method Not Found, `-32602` Invalid Params, `-32603` Internal Error; Custom: `-32001` Index Not Ready, `-32002` File Not Found, `-32003` Symbol Not Found, `-32004` Refactoring Conflict |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.**

---

### 🔹 Tool: `ide_find_references`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_references</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds all references to the symbol at <code>file</code>/<code>line</code>/<code>column</code> using IntelliJ’s <code>ReferencesSearch</code>. Returns reference locations with a one-line context snippet and a coarse usage type classification; supports limiting results via <code>maxResults</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open in IDE. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number where the symbol is located. |
| `column` | `integer` | ✅ | — | 1-based column number within the line. |
| `maxResults` | `integer` | ❌ | `100` | Maximum number of references to return (max 500). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {
			"type": "string",
			"description": "Absolute path to project root. Only needed when multiple projects are open in IDE."
		},
		"file": {
			"type": "string",
			"description": "Path to file relative to project root (e.g., 'src/main/java/com/example/MyClass.java'). REQUIRED."
		},
		"line": {
			"type": "integer",
			"description": "1-based line number where the symbol is located. REQUIRED."
		},
		"column": {
			"type": "integer",
			"description": "1-based column number within the line. REQUIRED."
		},
		"maxResults": {
			"type": "integer",
			"description": "Maximum number of references to return. Default: 100, max: 500."
		}
	},
	"required": ["file", "line", "column"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"usages": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"file": { "type": "string" },
					"line": { "type": "integer" },
					"column": { "type": "integer" },
					"context": { "type": "string" },
					"type": { "type": "string" }
				},
				"required": ["file", "line", "column", "context", "type"]
			}
		},
		"totalCount": { "type": "integer" }
	},
	"required": ["usages", "totalCount"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode (index ready) required. |
| **Postconditions** | None. |
| **Limits** | `maxResults` clamped to 1–500. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_find_definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Resolves the symbol at <code>file</code>/<code>line</code>/<code>column</code> to its definition/declaration. If the element has a reference, resolves it; otherwise attempts to treat the element as a declaration. Returns the definition location and either a short preview snippet or full element text (<code>fullElementPreview=true</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open in IDE. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number where the symbol reference is located. |
| `column` | `integer` | ✅ | — | 1-based column number within the line. |
| `fullElementPreview` | `boolean` | ❌ | `false` | If true, returns the complete element code instead of a preview snippet. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {
			"type": "string",
			"description": "Absolute path to project root. Only needed when multiple projects are open in IDE."
		},
		"file": {
			"type": "string",
			"description": "Path to file relative to project root (e.g., 'src/main/java/com/example/MyClass.java'). REQUIRED."
		},
		"line": {
			"type": "integer",
			"description": "1-based line number where the symbol reference is located. REQUIRED."
		},
		"column": {
			"type": "integer",
			"description": "1-based column number within the line. REQUIRED."
		},
		"fullElementPreview": {
			"type": "boolean",
			"description": "If true, returns the complete element code instead of a preview snippet. Optional, defaults to false."
		}
	},
	"required": ["file", "line", "column"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"file": { "type": "string" },
		"line": { "type": "integer" },
		"column": { "type": "integer" },
		"preview": { "type": "string" },
		"symbolName": { "type": "string" }
	},
	"required": ["file", "line", "column", "preview", "symbolName"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | None. |
| **Limits** | Searches up to 3 parent levels when resolving references. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_type_hierarchy`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_type_hierarchy</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns the type/class hierarchy for a target element. Accepts either <code>className</code> (preferred) or <code>file</code>+<code>line</code>+<code>column</code>. Delegates to a language-specific handler selected via <code>LanguageHandlerRegistry</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open in IDE. |
| `className` | `string` | ❌ | — | Fully qualified class name (recommended when known). |
| `file` | `string` | ❌ | — | Path to file relative to project root (use with `line`/`column`). |
| `line` | `integer` | ❌ | — | 1-based line number (required if using `file`). |
| `column` | `integer` | ❌ | — | 1-based column number (required if using `file`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {
			"type": "string",
			"description": "Absolute path to project root. Only needed when multiple projects are open in IDE."
		},
		"className": {
			"type": "string",
			"description": "Fully qualified class name (e.g., 'com.example.MyClass' for Java or 'App\\\\Models\\\\User' for PHP). RECOMMENDED - use this if you know the class name."
		},
		"file": {
			"type": "string",
			"description": "Path to file relative to project root (e.g., 'src/main/java/com/example/MyClass.java'). Use with line and column."
		},
		"line": {
			"type": "integer",
			"description": "1-based line number where the class is defined. Required if using file parameter."
		},
		"column": {
			"type": "integer",
			"description": "1-based column number. Required if using file parameter."
		}
	},
	"required": []
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"element": { "$ref": "#/definitions/TypeElement" },
		"supertypes": { "type": "array", "items": { "$ref": "#/definitions/TypeElement" } },
		"subtypes": { "type": "array", "items": { "$ref": "#/definitions/TypeElement" } }
	},
	"required": ["element", "supertypes", "subtypes"],
	"definitions": {
		"TypeElement": {
			"type": "object",
			"properties": {
				"name": { "type": "string" },
				"file": { "type": ["string", "null"] },
				"kind": { "type": "string" },
				"language": { "type": ["string", "null"] },
				"supertypes": {
					"type": ["array", "null"],
					"items": { "$ref": "#/definitions/TypeElement" }
				}
			},
			"required": ["name", "kind"]
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | None. |
| **Limits** | Attempts `className` resolution via multi-language `findClassByName()` (Java/PHP via reflection) and falls back to `file`/`line`/`column`. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_call_hierarchy`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_call_hierarchy</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Builds a recursive call tree for a method/function at <code>file</code>/<code>line</code>/<code>column</code>. Requires <code>direction</code> (<code>callers</code> or <code>callees</code>) and supports <code>depth</code> (default 3, max 5). Delegates to a language-specific handler via <code>LanguageHandlerRegistry</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; required when multiple projects are open. |
| `file` | `string` | ✅ | — | Path to the file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number. |
| `column` | `integer` | ✅ | — | 1-based column number. |
| `direction` | `string` | ✅ | — | Direction: `callers` or `callees`. |
| `depth` | `integer` | ❌ | `3` | Levels deep to traverse (max 5). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {
			"type": "string",
			"description": "Absolute path to the project root. Required when multiple projects are open."
		},
		"file": { "type": "string", "description": "Path to the file relative to project root" },
		"line": { "type": "integer", "description": "1-based line number" },
		"column": { "type": "integer", "description": "1-based column number" },
		"direction": {
			"type": "string",
			"description": "Direction: 'callers' (methods that call this method) or 'callees' (methods this method calls)",
			"enum": ["callers", "callees"]
		},
		"depth": {
			"type": "integer",
			"description": "How many levels deep to traverse the call hierarchy (default: 3, max: 5)"
		}
	},
	"required": ["file", "line", "column", "direction"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"element": { "$ref": "#/definitions/CallElement" },
		"calls": { "type": "array", "items": { "$ref": "#/definitions/CallElement" } }
	},
	"required": ["element", "calls"],
	"definitions": {
		"CallElement": {
			"type": "object",
			"properties": {
				"name": { "type": "string" },
				"file": { "type": "string" },
				"line": { "type": "integer" },
				"language": { "type": ["string", "null"] },
				"children": { "type": ["array", "null"], "items": { "$ref": "#/definitions/CallElement" } }
			},
			"required": ["name", "file", "line"]
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | None. |
| **Limits** | `depth` clamped to 1–5. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_find_implementations`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_implementations</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds implementations of an interface/abstract class or method at <code>file</code>/<code>line</code>/<code>column</code>. Delegates to a language handler chosen by <code>LanguageHandlerRegistry</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; required when multiple projects are open. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number. |
| `column` | `integer` | ✅ | — | 1-based column number. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to the project root. Required when multiple projects are open." },
		"file": { "type": "string", "description": "Path to the file relative to project root" },
		"line": { "type": "integer", "description": "1-based line number" },
		"column": { "type": "integer", "description": "1-based column number" }
	},
	"required": ["file", "line", "column"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"implementations": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"name": { "type": "string" },
					"file": { "type": "string" },
					"line": { "type": "integer" },
					"kind": { "type": "string" },
					"language": { "type": ["string", "null"] }
				},
				"required": ["name", "file", "line", "kind"]
			}
		},
		"totalCount": { "type": "integer" }
	},
	"required": ["implementations", "totalCount"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `ide_find_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for symbols by name across available language handlers. Aggregates results from all available handlers and de-dupes matches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open in IDE. |
| `query` | `string` | ✅ | — | Search pattern; supports substring and camelCase matching. |
| `includeLibraries` | `boolean` | ❌ | `false` | Include symbols from library dependencies. |
| `limit` | `integer` | ❌ | `25` | Maximum results to return (max 100). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to project root. Only needed when multiple projects are open in IDE." },
		"query": { "type": "string", "description": "Search pattern. Supports substring and camelCase matching." },
		"includeLibraries": { "type": "boolean", "description": "Include symbols from library dependencies. Default: false." },
		"limit": { "type": "integer", "description": "Maximum results to return. Default: 25, Max: 100." }
	},
	"required": ["query"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"symbols": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"name": { "type": "string" },
					"qualifiedName": { "type": ["string", "null"] },
					"kind": { "type": "string" },
					"file": { "type": "string" },
					"line": { "type": "integer" },
					"containerName": { "type": ["string", "null"] },
					"language": { "type": ["string", "null"] }
				},
				"required": ["name", "kind", "file", "line"]
			}
		},
		"totalCount": { "type": "integer" },
		"query": { "type": "string" }
	},
	"required": ["symbols", "totalCount", "query"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | None. |
| **Limits** | De-dupes results by `file:line:name`. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_find_super_methods`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_super_methods</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds the chain of overridden/implemented super methods for the method at <code>file</code>/<code>line</code>/<code>column</code>. Delegates to a language-specific handler.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open in IDE. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number; can be any line within the method. |
| `column` | `integer` | ✅ | — | 1-based column number; can be any position within the method. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to project root. Only needed when multiple projects are open in IDE." },
		"file": { "type": "string", "description": "Path to file relative to project root. REQUIRED." },
		"line": { "type": "integer", "description": "1-based line number. Can be any line within the method." },
		"column": { "type": "integer", "description": "1-based column number. Can be any position within the method." }
	},
	"required": ["file", "line", "column"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"method": {
			"type": "object",
			"properties": {
				"name": { "type": "string" },
				"signature": { "type": "string" },
				"containingClass": { "type": "string" },
				"file": { "type": "string" },
				"line": { "type": "integer" },
				"language": { "type": ["string", "null"] }
			},
			"required": ["name", "signature", "containingClass", "file", "line"]
		},
		"hierarchy": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"name": { "type": "string" },
					"signature": { "type": "string" },
					"containingClass": { "type": "string" },
					"containingClassKind": { "type": "string" },
					"file": { "type": ["string", "null"] },
					"line": { "type": ["integer", "null"] },
					"isInterface": { "type": "boolean" },
					"depth": { "type": "integer" },
					"language": { "type": ["string", "null"] }
				},
				"required": ["name", "signature", "containingClass", "containingClassKind", "isInterface", "depth"]
			}
		},
		"totalCount": { "type": "integer" }
	},
	"required": ["method", "hierarchy", "totalCount"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `ide_file_structure`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_file_structure</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Produces a hierarchical structure view of a source file (similar to the IDE “Structure” tool window). Delegates to a language-specific structure handler and formats results as a tree string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {
			"type": "string",
			"description": "Absolute path to project root. Only needed when multiple projects are open."
		},
		"file": {
			"type": "string",
			"description": "Path to file relative to project root (e.g., 'src/main/java/com/example/MyClass.java'). REQUIRED."
		}
	},
	"required": ["file"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult`; payload JSON OR plain text success message on empty/no structure) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"file": { "type": "string" },
		"language": { "type": "string" },
		"structure": { "type": "string" }
	},
	"required": ["file", "language", "structure"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | None. |
| **Limits** | If the file has no parseable structure, returns a human-readable success message instead of a JSON model. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_find_class`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_class</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for classes/interfaces using IntelliJ’s <code>CLASS_EP_NAME</code> contributors (equivalent to “Go to Class”). Supports fuzzy matching and optional library scope.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; required when multiple projects are open. |
| `query` | `string` | ✅ | — | Search pattern; supports substring and camelCase matching. |
| `includeLibraries` | `boolean` | ❌ | `false` | Include classes from library dependencies. |
| `limit` | `integer` | ❌ | `25` | Maximum results to return (max 100). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to the project root. Required when multiple projects are open, optional otherwise." },
		"query": { "type": "string", "description": "Search pattern. Supports substring and camelCase matching." },
		"includeLibraries": { "type": "boolean", "description": "Include classes from library dependencies. Default: false." },
		"limit": { "type": "integer", "description": "Maximum results to return. Default: 25, Max: 100." }
	},
	"required": ["query"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"classes": { "type": "array", "items": { "$ref": "#/definitions/SymbolMatch" } },
		"totalCount": { "type": "integer" },
		"query": { "type": "string" }
	},
	"required": ["classes", "totalCount", "query"],
	"definitions": {
		"SymbolMatch": {
			"type": "object",
			"properties": {
				"name": { "type": "string" },
				"qualifiedName": { "type": ["string", "null"] },
				"kind": { "type": "string" },
				"file": { "type": "string" },
				"line": { "type": "integer" },
				"containerName": { "type": ["string", "null"] },
				"language": { "type": ["string", "null"] }
			},
			"required": ["name", "kind", "file", "line"]
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `ide_find_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_find_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for files using IntelliJ’s <code>FILE_EP_NAME</code> contributors (equivalent to “Go to File”). Supports fuzzy matching and optional library scope.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; required when multiple projects are open. |
| `query` | `string` | ✅ | — | File name pattern; supports substring and fuzzy matching. |
| `includeLibraries` | `boolean` | ❌ | `false` | Include files from library dependencies. |
| `limit` | `integer` | ❌ | `25` | Maximum results to return (max 100). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to the project root. Required when multiple projects are open, optional otherwise." },
		"query": { "type": "string", "description": "File name pattern. Supports substring and fuzzy matching." },
		"includeLibraries": { "type": "boolean", "description": "Include files from library dependencies. Default: false." },
		"limit": { "type": "integer", "description": "Maximum results to return. Default: 25, Max: 100." }
	},
	"required": ["query"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"files": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"name": { "type": "string" },
					"path": { "type": "string" },
					"directory": { "type": "string" }
				},
				"required": ["name", "path", "directory"]
			}
		},
		"totalCount": { "type": "integer" },
		"query": { "type": "string" }
	},
	"required": ["files", "totalCount", "query"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `ide_search_text`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_search_text</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for an exact word using IntelliJ’s word index (<code>PsiSearchHelper.processElementsWithWord</code>). Supports context filtering (<code>code</code>, <code>comments</code>, <code>strings</code>, <code>all</code>), case sensitivity, and a result limit.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; required when multiple projects are open. |
| `query` | `string` | ✅ | — | Exact word to search for (not a pattern/regex). |
| `context` | `string` | ❌ | `all` | Where to search: `code`, `comments`, `strings`, `all`. |
| `caseSensitive` | `boolean` | ❌ | `true` | Case sensitive search. |
| `limit` | `integer` | ❌ | `100` | Maximum results to return (max 500). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to the project root. Required when multiple projects are open, optional otherwise." },
		"query": { "type": "string", "description": "Exact word to search for (not a pattern/regex)." },
		"context": {
			"type": "string",
			"description": "Where to search: \"code\", \"comments\", \"strings\", \"all\". Default: \"all\".",
			"enum": ["code", "comments", "strings", "all"]
		},
		"caseSensitive": { "type": "boolean", "description": "Case sensitive search. Default: true." },
		"limit": { "type": "integer", "description": "Maximum results to return. Default: 100, Max: 500." }
	},
	"required": ["query"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"matches": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"file": { "type": "string" },
					"line": { "type": "integer" },
					"column": { "type": "integer" },
					"context": { "type": "string" },
					"contextType": { "type": "string" }
				},
				"required": ["file", "line", "column", "context", "contextType"]
			}
		},
		"totalCount": { "type": "integer" },
		"query": { "type": "string" }
	},
	"required": ["matches", "totalCount", "query"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | None. |
| **Limits** | Word-index lookup only (not regex/substring scanning). |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_diagnostics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_diagnostics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs IntelliJ daemon analysis to collect problems (errors/warnings) and intentions/quick-fixes. If the file is not open, it is temporarily opened to trigger daemon analysis. Supports optional line range filters and optional position for intention lookup.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open in IDE. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ❌ | `1` | 1-based line number for intention lookup. |
| `column` | `integer` | ❌ | `1` | 1-based column number for intention lookup. |
| `startLine` | `integer` | ❌ | — | Filter problems to start from this line. |
| `endLine` | `integer` | ❌ | — | Filter problems to end at this line. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to project root. Only needed when multiple projects are open in IDE." },
		"file": { "type": "string", "description": "Path to file relative to project root (e.g., 'src/main/java/com/example/MyClass.java'). REQUIRED." },
		"line": { "type": "integer", "description": "1-based line number for intention lookup. Optional, defaults to 1." },
		"column": { "type": "integer", "description": "1-based column number for intention lookup. Optional, defaults to 1." },
		"startLine": { "type": "integer", "description": "Filter problems to start from this line. Optional." },
		"endLine": { "type": "integer", "description": "Filter problems to end at this line. Optional." }
	},
	"required": ["file"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"problems": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"message": { "type": "string" },
					"severity": { "type": "string" },
					"file": { "type": "string" },
					"line": { "type": "integer" },
					"column": { "type": "integer" },
					"endLine": { "type": ["integer", "null"] },
					"endColumn": { "type": ["integer", "null"] }
				},
				"required": ["message", "severity", "file", "line", "column"]
			}
		},
		"intentions": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"name": { "type": "string" },
					"description": { "type": ["string", "null"] }
				},
				"required": ["name"]
			}
		},
		"problemCount": { "type": "integer" },
		"intentionCount": { "type": "integer" }
	},
	"required": ["problems", "intentions", "problemCount", "intentionCount"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | None. |
| **Limits** | De-dupes problems by `line:column:message` and caps collection at 100 problems and 50 intentions. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_index_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_index_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Reports whether the IDE is currently in “dumb mode” (indexing) via <code>DumbService</code>. This tool disables PSI sync since it only checks status.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; required when multiple projects are open. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {
			"type": "string",
			"description": "Absolute path to the project root. Required when multiple projects are open."
		}
	},
	"required": []
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"isDumbMode": { "type": "boolean" },
		"isIndexing": { "type": "boolean" },
		"indexingProgress": { "type": ["number", "null"] }
	},
	"required": ["isDumbMode", "isIndexing", "indexingProgress"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `ide_refactor_rename`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_refactor_rename</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Renames a symbol at <code>file</code>/<code>line</code>/<code>column</code> to <code>newName</code> using IntelliJ’s language-agnostic <code>RenameProcessor</code>. Uses background validation plus EDT execution and performs extra headless work to include related renames without showing dialogs.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number where the symbol is located. |
| `column` | `integer` | ✅ | — | 1-based column number. |
| `newName` | `string` | ✅ | — | New name for the symbol. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to project root. Only needed when multiple projects are open." },
		"file": { "type": "string", "description": "Path to file relative to project root. REQUIRED." },
		"line": { "type": "integer", "description": "1-based line number where the symbol is located. REQUIRED." },
		"column": { "type": "integer", "description": "1-based column number. REQUIRED." },
		"newName": { "type": "string", "description": "The new name for the symbol. REQUIRED." }
	},
	"required": ["file", "line", "column", "newName"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"success": { "type": "boolean" },
		"affectedFiles": { "type": "array", "items": { "type": "string" } },
		"changesCount": { "type": "integer" },
		"message": { "type": "string" }
	},
	"required": ["success", "affectedFiles", "changesCount", "message"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Renames symbols; modifies project files. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | Updates project files with renamed identifiers. |
| **Limits** | Validates identifier rules and rename conflicts; runs rename with `searchInComments=false` and `searchTextOccurrences=false`. |
| **Security & privacy** | Not documented. |

---

### 🔹 Tool: `ide_refactor_safe_delete`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ide_refactor_safe_delete</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Deletes a symbol safely by checking for usages first. If usages exist and <code>force=false</code>, returns a blocked result including usage locations; if <code>force=true</code>, deletes anyway (may break references). Uses a two-phase approach: background discovery then EDT write-action delete.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ❌ | — | Absolute path to project root; only needed when multiple projects are open. |
| `file` | `string` | ✅ | — | Path to file relative to project root. |
| `line` | `integer` | ✅ | — | 1-based line number where the element is located. |
| `column` | `integer` | ✅ | — | 1-based column number. |
| `force` | `boolean` | ❌ | `false` | Force deletion even if usages exist. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": { "type": "string", "description": "Absolute path to project root. Only needed when multiple projects are open." },
		"file": { "type": "string", "description": "Path to file relative to project root. REQUIRED." },
		"line": { "type": "integer", "description": "1-based line number where the element is located. REQUIRED." },
		"column": { "type": "integer", "description": "1-based column number. REQUIRED." },
		"force": { "type": "boolean", "description": "Force deletion even if usages exist. Optional, default: false. Use with caution!" }
	},
	"required": ["file", "line", "column"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP `ToolCallResult` containing text JSON payload) |

<details>
<summary><strong>Example Output Schema (Envelope)</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"content": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"type": { "type": "string", "enum": ["text", "image"] },
					"text": { "type": "string" },
					"data": { "type": "string" },
					"mimeType": { "type": "string" }
				},
				"required": ["type"]
			}
		},
		"isError": { "type": "boolean" }
	},
	"required": ["content"]
}
```
</details>

<details>
<summary><strong>Example Payload Schema</strong> <em>(required)</em></summary>

```json
{
	"oneOf": [
		{
			"type": "object",
			"properties": {
				"success": { "type": "boolean" },
				"affectedFiles": { "type": "array", "items": { "type": "string" } },
				"changesCount": { "type": "integer" },
				"message": { "type": "string" }
			},
			"required": ["success", "affectedFiles", "changesCount", "message"]
		},
		{
			"type": "object",
			"properties": {
				"canDelete": { "type": "boolean" },
				"elementName": { "type": "string" },
				"elementType": { "type": "string" },
				"usageCount": { "type": "integer" },
				"blockingUsages": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"file": { "type": "string" },
							"line": { "type": "integer" },
							"column": { "type": "integer" },
							"context": { "type": "string" }
						},
						"required": ["file", "line", "column", "context"]
					}
				},
				"message": { "type": "string" }
			},
			"required": [
				"canDelete",
				"elementName",
				"elementType",
				"usageCount",
				"blockingUsages",
				"message"
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
| **Side effects** | Deletes symbols; modifies project files. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Smart mode required. |
| **Postconditions** | Removes symbol declarations when deletion proceeds. |
| **Limits** | When blocked, returns at most the first 20 usages. |
| **Security & privacy** | Not documented. |

---

<div align="center">

*— End of Report —*

</div>
