<div align="center">

# 📋 MCP Server Report

## `semgrep-mcp`
### [`semgrep/semgrep`](https://github.com/semgrep/semgrep/tree/develop/cli/src/semgrep/mcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/semgrep/semgrep` |
| **Target Path** | `cli/src/semgrep/mcp` |
| **Analyzed Ref** | `216225223eba87ba72bae76c00f88e9ddcc32b2d` |
| **Commit URL** | `https://github.com/semgrep/semgrep/commit/216225223eba87ba72bae76c00f88e9ddcc32b2d` |
| **License** | `LGPL-2.1` |
| **Version** | `v1.150.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Semgrep MCP server in semgrep repo (cli/src/semgrep/mcp) |
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
| **Path model** | `absolute` for local scans; relative for remote content |
| **Line/column indexing** | `Unknown` |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` (Semgrep JSON results) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server exposing Semgrep security/static-analysis capabilities, locally or remotely.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Cursor, VS Code/Copilot, Windsurf, Claude Desktop, Claude Code, ChatGPT Connectors |

### 1.3 Primary Capabilities

- [x] Semgrep scans against local files (absolute paths) or in-memory code files
- [x] Convenience security scan via Semgrep defaults (`security_check`)
- [x] Custom-rule scanning (inline Semgrep rule YAML)
- [x] Optional Semgrep RPC daemon workflow for Pro Engine scans
- [x] Fetch Semgrep rule JSON Schema and supported languages list
- [x] Fetch findings from Semgrep AppSec Platform API (auth required)
- [x] Parse code snippets into Semgrep AST payloads

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client supporting stdio or streamable-http. |
| **Documented integrations** | Cursor, VS Code/Copilot, Windsurf, Claude Desktop, Claude Code, ChatGPT |
| **Notes / constraints** | Some features require Semgrep Pro/AppSec. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Semgrep-supported languages (multi-language) |
| **How to extend** | `supported_languages` tool |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | LGPL-2.1 (server code) |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Semgrep CLI binary; MCP Python SDK (`mcp.server.fastmcp.FastMCP`); `pydantic`; `starlette`; `requests`; `opentelemetry`; `jwt` |
| **External / System** | Semgrep AppSec Platform API |
| **Optional** | Docker |
| **Paid services / Tokens** | Semgrep AppSec Platform API token (`SEMGREP_APP_TOKEN`) and/or OAuth/JWT (hosted); Semgrep Pro Engine (token-required for some workflows) |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` or Docker; optional hosted endpoint |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Yes` (see § 7) |
| **Config files used** | `Not documented` |
| **CLI flags used** | `Not documented` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | Semgrep static analysis engine |
| **Architecture notes** | FastMCP server; optional Semgrep RPC daemon for Pro Engine scans. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `Yes` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` (unless using AppSec) |
| **Mechanism** | `token` / OAuth |
| **Secrets / Env vars** | `SEMGREP_APP_TOKEN` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (temp dirs for remote scans) |
| **Uses local cache** | `Unknown` |
| **Uses external DB** | `No` |
| **Retains user code** | `Temporarily` (remote scans write files to temp dir) |

---

## 🗂️ § 3 — Tool Index

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `get_abstract_syntax_tree` |
| 2 | `security_check` |
| 3 | `semgrep_findings` |
| 4 | `semgrep_rule_schema` |
| 5 | `semgrep_scan` |
| 6 | `semgrep_scan_remote` |
| 7 | `semgrep_scan_rpc` |
| 8 | `semgrep_scan_with_custom_rule` |
| 9 | `supported_languages` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `CodeFile` | `{ "path": string, "content": string }` |
| `CodePath` | `{ "path": string }` where `path` must be an absolute filesystem path for local scanning |
| `CodeWithLanguage` | Code snippet plus language identifier (README uses `code`/`language`; a closely related model uses `content`/`language`) |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `SemgrepScanResult` | `{ version: string, results: object[], errors: object[], paths: object, skipped_rules: string[], mcp_scan_results: object }` |
| `Finding` | Semgrep AppSec Platform finding object (see `semgrep_findings` example output) |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | Local scan paths must be absolute; remote `CodeFile.path` is treated as untrusted relative path and safe-joined to prevent traversal |
| **Rate limits / retries** | `Unknown` |
| **File size limits** | `Unknown` |
| **Resource constraints** | Hosted mode rejects RPC; config values accept `p/...`, `r/...`, `auto`, otherwise must be an absolute path |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Unknown` |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `get_abstract_syntax_tree`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_abstract_syntax_tree</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Produces an AST representation of a code snippet for a specified language.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Code content to parse. |
| `language` | `string` | ✅ | — | Language identifier (Semgrep-supported). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code": "string",
	"language": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"code": "def hello():\n  return 1\n",
	"language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (AST payload) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"ast": {}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"ast": {"type": "Module", "children": []}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Semgrep must support the requested `language`. |
| **Postconditions** | None. |
| **Limits** | `Unknown` |
| **Security & privacy** | Operates on provided in-memory code snippet. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `security_check`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>security_check</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scans code for security vulnerabilities using Semgrep’s default/typical security configuration (convenience wrapper around a Semgrep scan).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code_files` | `array` | ❌ | — | Remote scan inputs (`{path, content}`). |
| `local_files` | `array` | ❌ | — | Local scan inputs (`{path}` absolute). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code_files": [{"path": "string", "content": "string"}],
	"local_files": [{"path": "C:/absolute/path/to/file"}]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"code_files": [
		{"path": "app.py", "content": "print('hello')"}
	]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (Semgrep scan result) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [
		{
			"check_id": "python.lang.security.audit.eval-used",
			"path": "app.py",
			"start": {"line": 1, "col": 1},
			"end": {"line": 1, "col": 10},
			"extra": {"message": "Avoid using eval()", "severity": "WARNING"}
		}
	],
	"errors": [],
	"paths": {"scanned": ["app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Linting` |
| **Side effects** | Remote scans write temp files. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `local_files[*].path` must be absolute; `code_files[*]` uses `{path, content}`. |
| **Postconditions** | May write temporary files when using `code_files`. |
| **Limits** | `Unknown` |
| **Security & privacy** | Remote `CodeFile.path` is treated as untrusted relative and safe-joined. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | Helper logic in `models.py` and scan helpers (e.g., `semgrep.py`, `semgrep_context.py`) |

---

### 🔹 Tool: `semgrep_findings`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semgrep_findings</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetches Semgrep findings from the Semgrep AppSec Platform API (requires authentication: <code>SEMGREP_APP_TOKEN</code> for local runs, or OAuth/JWT for hosted).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `limit` | `integer` | ❌ | — | Pagination limit. |
| `offset` | `integer` | ❌ | — | Pagination offset. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"limit": 50,
	"offset": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"limit": 50,
	"offset": 0
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (array of Finding objects) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
	{
		"id": 123,
		"ref": "refs/heads/main",
		"repository": {"name": "semgrep/semgrep", "url": "https://github.com/semgrep/semgrep"},
		"severity": "HIGH",
		"confidence": "HIGH",
		"categories": ["security"],
		"rule_name": "python.lang.security.audit.eval-used",
		"rule_message": "Avoid using eval()",
		"location": {
			"file_path": "src/app.py",
			"line": 10,
			"column": 1,
			"end_line": 10,
			"end_column": 20
		},
		"line_of_code_url": "https://github.com/semgrep/semgrep/blob/main/src/app.py#L10",
		"created_at": "2026-01-01T00:00:00Z",
		"relevant_since": "2026-01-01T00:00:00Z",
		"state_updated_at": "2026-01-01T00:00:00Z",
		"rule": {
			"name": "eval-used",
			"message": "Avoid using eval()",
			"confidence": "HIGH",
			"category": "security",
			"subcategories": [],
			"vulnerability_classes": [],
			"cwe_names": [],
			"owasp_names": []
		},
		"review_comments": []
	}
]
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
[]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Requires authentication: `SEMGREP_APP_TOKEN` for local/self-hosted, or OAuth/JWT for hosted. |
| **Postconditions** | None. |
| **Limits** | `Unknown` (this tool may support additional server-side filters beyond `limit`/`offset`) |
| **Security & privacy** | Makes network calls to Semgrep AppSec Platform API. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | Auth helpers in `utilities/utils.py` and `utilities/token_verifier.py`; output models in `models.py` |

---

### 🔹 Tool: `semgrep_rule_schema`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semgrep_rule_schema</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetches the latest Semgrep rule JSON Schema used to validate rule YAML.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{}
```
</details>

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `Text` (JSON Schema string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"$schema": "http://json-schema.org/draft-07/schema#",
	"type": "object",
	"properties": {"rules": {"type": "array"}}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"$schema": "http://json-schema.org/draft-07/schema#",
	"type": "object",
	"properties": {"rules": {"type": "array"}}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | None. |
| **Limits** | `Unknown` |
| **Security & privacy** | Fetches schema via HTTP. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `semgrep_scan`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semgrep_scan</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Semgrep against provided code files with optional config selector.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code_files` | `array` | ❌ | — | Remote scan inputs (`{path, content}`). |
| `local_files` | `array` | ❌ | — | Local scan inputs (`{path}` absolute). |
| `config` | `string` | ❌ | `auto` | Semgrep config (`p/...`, `r/...`, `auto`, or absolute path). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code_files": [{"path": "string", "content": "string"}],
	"local_files": [{"path": "C:/absolute/path/to/file"}],
	"config": "auto"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"code_files": [{"path": "src/app.py", "content": "print('hello')"}],
	"config": "p/python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (Semgrep scan result) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json

{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["src/app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["src/app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Linting` |
| **Side effects** | Remote scans write temp files. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | If `config` is not `p/...`, `r/...`, or `auto`, it must be an absolute path. |
| **Postconditions** | May write temporary files when using `code_files`. |
| **Limits** | `Unknown` |
| **Security & privacy** | Remote `CodeFile.path` is treated as untrusted relative and safe-joined; local paths must be absolute. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | Config validation helper; scan helpers in `semgrep.py` / `semgrep_context.py` |

---

### 🔹 Tool: `semgrep_scan_remote`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semgrep_scan_remote</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scans code provided as in-memory content for hosted/remote workflows.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code_files` | `array` | ✅ | — | Remote scan inputs (`{path, content}`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code_files": [{"path": "src/app.py", "content": "print('hello')"}]
}
```
</details>

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code_files": [{"path": "string", "content": "string"}]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"code_files": [
		{"path": "hello_world.py", "content": "def hello(): print('Hello, World!')"}
	]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (Semgrep scan result) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["src/app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["hello_world.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["hello_world.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Linting` |
| **Side effects** | Writes temp files for remote scan. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Intended for hosted/remote semantics where the client sends file content (README suggests setting `SEMGREP_IS_HOSTED=true` for some setups). |
| **Postconditions** | Writes temporary files. |
| **Limits** | `Unknown` |
| **Security & privacy** | Untrusted relative paths are safe-joined to prevent traversal. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | Remote scan helpers and safe-join logic (see § 4.3) |

---

### 🔹 Tool: `semgrep_scan_rpc`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semgrep_scan_rpc</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs a Semgrep scan via the local Semgrep RPC daemon (Pro Engine workflow).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code_files` | `array` | ✅ | — | Remote scan inputs (`{path, content}`). |

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (Semgrep scan result) |

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Linting` |
| **Side effects** | Uses RPC daemon; not available when hosted. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Not available when `SEMGREP_IS_HOSTED=true`; requires Semgrep Pro Engine; daemon use depends on `USE_SEMGREP_RPC` and token availability. |
| **Postconditions** | May spawn/use a local RPC daemon. |
| **Limits** | `Unknown` |
| **Security & privacy** | Operates on provided code content; RPC payload may include git info fields. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | RPC workflow described in helpers (e.g., `semgrep_context.py`, `semgrep.py`) |

---

### 🔹 Tool: `semgrep_scan_with_custom_rule`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semgrep_scan_with_custom_rule</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Semgrep against provided code using a custom rule supplied inline as YAML.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code_files` | `array` | ✅ | — | Remote scan inputs (`{path, content}`). |
| `rule` | `string` | ✅ | — | Semgrep rule YAML string. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code_files": [{"path": "string", "content": "string"}],
	"rule": "string (Semgrep rule YAML)"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"code_files": [{"path": "app.py", "content": "print('hello')"}],
	"rule": "rules:\n  - id: demo.rule\n    message: Demo rule\n    languages: [python]\n    severity: WARNING\n    pattern: print(...)\n"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (Semgrep scan result) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
	"version": "1.150.0",
	"results": [],
	"errors": [],
	"paths": {"scanned": ["app.py"], "skipped": []},
	"skipped_rules": [],
	"mcp_scan_results": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Linting` |
| **Side effects** | Remote scans write temp files. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `rule` must be a Semgrep rule YAML string. |
| **Postconditions** | Writes temporary files. |
| **Limits** | `Unknown` |
| **Security & privacy** | Treats `CodeFile.path` as untrusted relative path and safe-joins. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | Scan helpers and config validation (see § 4.3) |

---

### 🔹 Tool: `supported_languages`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>supported_languages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns Semgrep’s supported language list at runtime.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (array of strings) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
["python", "javascript", "typescript", "java", "go"]
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
["python", "javascript"]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Unknown` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | None. |
| **Limits** | `Unknown` |
| **Security & privacy** | None. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` (server implementation details may be truncated) |
| **Core implementation** | `Unknown` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `None` |
| **MCP prompts exposed** | `None` |
| **Other RPC endpoints** | streamable-http endpoint (documented as `127.0.0.1:8000/mcp`); experimental hosted endpoint `https://mcp.semgrep.ai/mcp` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `SEMGREP_APP_TOKEN` | ❌ | 🔒 | — | Semgrep AppSec Platform API token (used for `semgrep_findings` in local/self-hosted scenarios; also used for token-gated workflows). |
| `SEMGREP_IS_HOSTED` | ❌ | — | — | Enables hosted-mode behavior; hosted mode rejects the RPC workflow. |
| `USE_SEMGREP_RPC` | ❌ | — | — | Enables/controls use of the local Semgrep RPC daemon workflow when available. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Not documented` | — |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | — |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install the Semgrep CLI (required dependency for `semgrep mcp`). |

### 8.2 Typical Run Commands

```bash
# Run the MCP server via the Semgrep CLI
semgrep mcp
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Unknown` |
| **Tracing / Metrics** | `OpenTelemetry` (dependency observed in code) |

### 8.4 Performance Considerations

- `Not documented`.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `9` |
| **Read-only** | `9` |
| **Write-only** | `0` |
| **Hybrid** | `0` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| `server.py` implementation details | Large file content may be truncated during research; report documents observable contract from models and helpers. |
| `semgrep_findings` exact filter set | Filtering/pagination fields may exist beyond the documented `limit`/`offset`. |
| Line/column indexing and encoding model | Not explicitly documented in the reviewed material. |
| Cache behavior | Not documented. |

---

<div align="center">

*— End of Report —*

</div>
