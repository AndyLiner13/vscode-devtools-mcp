<div align="center">

# 📋 MCP Server Report

## `xray`
### [`srijanshukla18/xray`](https://github.com/srijanshukla18/xray)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/srijanshukla18/xray` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `v0.6.1` |
| **Commit URL** | `Unknown` |
| **License** | `MIT` |
| **Version** | `0.6.1` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | XRAY MCP server (full repo) |
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
| **Path model** | `absolute` (root_path) |
| **Line/column indexing** | `Unknown` |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text` (tool responses) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *XRAY is an MCP server that provides progressive code intelligence via structural search (ast-grep / tree-sitter) and lightweight Python logic, aiming to sit between plain text search and full LSP-based setups. The intended workflow is map (`explore_repo`) → find (`find_symbol`) → peek (`read_interface`) → impact (`what_breaks`).*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | `VS Code`, `Cursor`, `Claude Desktop` |

### 1.3 Primary Capabilities

- [x] Explore repo and optionally include symbol skeletons
- [x] Find symbols and read interfaces
- [x] Impact analysis (`what_breaks`)

### 1.4 Non-Goals / Exclusions

- Not documented.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client; stdio-based server. |
| **Documented integrations** | `VS Code`, `Cursor`, `Claude Desktop` |
| **Notes / constraints** | Optional Docker run mode via config generator. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Python, JavaScript, TypeScript, Go |
| **How to extend** | `Unknown` |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | Open-source |
| **License details** | `MIT` |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python >= 3.10, `fastmcp>=0.1.0`, `ast-grep-cli>=0.39.0`, `thefuzz>=0.20.0` |
| **External / System** | `ast-grep` CLI (invoked as subprocess) |
| **Optional** | Docker (run mode via config generator) |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | Yes (see § 7.1) |
| **Config files used** | Yes (see § 7.2) |
| **CLI flags used** | No |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | FastMCP, ast-grep, Python `ast` |
| **Architecture notes** | `ast-grep` is invoked as a subprocess; Python `ast` builds symbol skeletons. |

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
| **Writes local files** | `Yes` (symbol cache on disk, best-effort) |
| **Uses local cache** | `Yes` (symbol cache) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (local symbol cache) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `explore_repo` |
| 2 | `find_symbol` |
| 3 | `read_interface` |
| 4 | `what_breaks` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `ExactSymbol` | Symbol object returned by `find_symbol()`; passed into `what_breaks` as `exact_symbol` (contains at least `name` and `path`, and may include `type`, `start_line`, `end_line`). |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `Not documented` | No shared output types are explicitly documented in the source report. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `root_path` is an absolute path; `file_path` may be absolute or relative to `root_path` (resolved by the server). |
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

---

## 🔨 § 5 — MCP Tools Reference

### 🔹 Tool: `explore_repo`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>explore_repo</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Maps repository structure and optionally adds per-file symbol skeletons (functions/classes/interfaces), with focus and depth controls.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root_path` | `string` | ✅ | — | Absolute path to project root. |
| `max_depth` | `integer \| string \| null` | ❌ | — | Directory depth limit. |
| `include_symbols` | `boolean \| string` | ❌ | — | Whether to include symbol skeletons. |
| `focus_dirs` | `array \| null` | ❌ | — | Top-level directories to include. |
| `max_symbols_per_file` | `integer \| string` | ❌ | — | Symbol limit per file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root_path": {"type": "string", "description": "Absolute path to project root"},
		"max_depth": {"type": ["integer", "string", "null"], "description": "Directory depth limit"},
		"include_symbols": {"type": ["boolean", "string"], "description": "Whether to include symbol skeletons"},
		"focus_dirs": {
			"type": ["array", "null"],
			"items": {"type": "string"},
			"description": "Top-level directories to include (zoom-in)"
		},
		"max_symbols_per_file": {"type": ["integer", "string"], "description": "Symbol limit per file"}
	},
	"required": ["root_path"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"root_path": "/path/to/project",
	"focus_dirs": ["src"],
	"include_symbols": true,
	"max_depth": 3,
	"max_symbols_per_file": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A formatted tree (lines with ├── / └──), optionally with symbol lines under files"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
/path/to/project
└── src
		├── auth.py
		│   ├── class AuthService: # Handles user authentication
		│   └── def authenticate(username, password): # Validates credentials
		└── models.py
				└── class User(BaseModel): # User account model
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes/updates local symbol cache on disk. |
| **Determinism** | `Depends` (repo content) |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `root_path` exists and is readable. |
| **Postconditions** | Returns formatted tree, optionally with symbol lines. |
| **Limits** | Excludes common folders and honors simplified `.gitignore`. |
| **Security & privacy** | Reads local files; may cache symbol data on disk. |

---

### 🔹 Tool: `find_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds functions/classes/methods/types by name using ast-grep structural search and fuzzy matching.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root_path` | `string` | ✅ | — | Absolute path to project root. |
| `query` | `string` | ✅ | — | Fuzzy query for a symbol. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root_path": {"type": "string", "description": "Absolute path to project root"},
		"query": {"type": "string", "description": "Fuzzy query for a symbol"}
	},
	"required": ["root_path", "query"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"root_path": "/path/to/project",
	"query": "authenticate"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (array of objects) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "array",
	"items": {
		"type": "object",
		"properties": {
			"name": {"type": "string"},
			"type": {"type": "string", "description": "function|class|method|interface|type|struct (depends on language/pattern)"},
			"path": {"type": "string"},
			"start_line": {"type": "integer"},
			"end_line": {"type": "integer"}
		},
		"required": ["name", "type", "path"]
	}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
[
	{
		"name": "authenticate_user",
		"type": "function",
		"path": "/path/to/project/src/auth.py",
		"start_line": 45,
		"end_line": 67
	}
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `root_path` exists and is readable; `ast-grep` is available (invoked as a subprocess). |
| **Postconditions** | Returns candidate symbol definitions ranked by fuzzy match to `query`. |
| **Limits** | Results depend on language patterns and structural search coverage. |
| **Security & privacy** | Reads local code; runs `ast-grep` as a local subprocess. |

---

### 🔹 Tool: `read_interface`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>read_interface</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a high-level interface view of a file: signatures, class/type definitions, and doc/comment summaries (no implementations).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root_path` | `string` | ✅ | — | Absolute path to project root. |
| `file_path` | `string` | ✅ | — | Path to file (relative to root or absolute). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root_path": {"type": "string", "description": "Absolute path to project root"},
		"file_path": {"type": "string", "description": "Path to file (relative to root or absolute)"}
	},
	"required": ["root_path", "file_path"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"root_path": "/path/to/project",
	"file_path": "src/auth.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "Newline-separated signatures (optionally with doc snippets)"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
class AuthService:
def authenticate(username, password): # Validate credentials
async def refresh_token(user_id): # Refresh auth token
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `root_path` exists and is readable; `file_path` exists. |
| **Postconditions** | Returns a newline-separated interface view (signatures / defs) without full implementations. |
| **Limits** | Python uses the built-in `ast` module; JS/TS/Go use regex-based extraction of common constructs. |
| **Security & privacy** | Reads local files only. |

---

### 🔹 Tool: `what_breaks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>what_breaks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs impact analysis by finding references to an exact symbol object (typically from <code>find_symbol</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `exact_symbol` | `object` | ✅ | — | Symbol object from `find_symbol()` output. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"exact_symbol": {
			"type": "object",
			"properties": {
				"name": {"type": "string"},
				"path": {"type": "string"},
				"type": {"type": "string"},
				"start_line": {"type": "integer"},
				"end_line": {"type": "integer"}
			},
			"required": ["name", "path"],
			"description": "Symbol object returned by find_symbol(); must include at least name and path"
		}
	},
	"required": ["exact_symbol"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"exact_symbol": {
		"name": "authenticate_user",
		"type": "function",
		"path": "/path/to/project/src/auth.py",
		"start_line": 45,
		"end_line": 67
	}
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object with arrays and fields) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"references": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"file": {"type": "string"},
					"line": {"type": "integer"},
					"text": {"type": "string", "description": "Match with surrounding context"},
					"type": {"type": "string", "description": "Kind/category of reference"}
				},
				"required": ["file", "line", "text"]
			}
		},
		"total_count": {"type": "integer"},
		"strategy": {"type": "string", "description": "e.g., structural"},
		"note": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"references": [
		{
			"file": "/path/to/project/src/api.py",
			"line": 23,
			"text": "    user = authenticate_user(username, password)\n    if not user:\n        ...",
			"type": "code"
		}
	],
	"total_count": 1,
	"strategy": "structural",
	"note": "Found 1 references using structural search."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `exact_symbol` is provided (typically taken directly from `find_symbol()` output); `ast-grep` is available (invoked as a subprocess). |
| **Postconditions** | Returns references to the symbol along with context snippets. |
| **Limits** | Uses structural search intended to focus on code references (not comments/strings). |
| **Security & privacy** | Reads local code; runs `ast-grep` as a local subprocess. |

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
| `XRAY_DB_PATH` | ❌ | — | — | Path to the local symbol cache database. |
| `XRAY_DEBUG` | ❌ | — | — | Enables debug logging. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `README.md` | Example MCP client configs (VS Code, Cursor, Claude Desktop). |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | No CLI flags are enumerated in the source report. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Python `>= 3.10`. |
| 2 | Install XRAY and ensure `ast-grep` is available (installed via `ast-grep-cli>=0.39.0`, and invoked as a subprocess). |

### 8.2 Typical Run Commands

```bash
python -m xray.mcp_server
```

```bash
xray-mcp
```

```bash
docker run --rm -i xray
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- Symbol extraction uses a best-effort disk cache keyed by file mtime/size and scoped to git commit when available.
- Structural matching is performed by invoking the `ast-grep` CLI as a subprocess.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `4` |
| **Read-only** | `4` |
| **Write-only** | `0` |
| **Hybrid** | `0` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Commit URL | Not provided in the source report. |
| Line/column indexing conventions | Not documented; tools return line numbers in some outputs but indexing basis is not specified. |

<div align="center">

*— End of Report —*

</div>
