<div align="center">

# 📋 MCP Server Report

## `code-scalpel`
### [`3D-Tech-Solutions/code-scalpel`](https://github.com/3D-Tech-Solutions/code-scalpel)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/3D-Tech-Solutions/code-scalpel` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `5715c447d8e73b7e9fdd5e4884d6f0a396d7f753` |
| **Commit URL** | `https://github.com/3D-Tech-Solutions/code-scalpel/commit/5715c447d8e73b7e9fdd5e4884d6f0a396d7f753` |
| **License** | `Dual: MIT + Commercial` |
| **Version** | `1.2.1` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Code Scalpel MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` (some conventions are inferred from example payloads in the source report) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `mixed` (examples show both absolute-like `/src/...` and “path on server”; inputs accept absolute or relative paths) |
| **Line/column indexing** | `1-based` (examples show `lineno: 1`, file outlines with `line: 10`, etc.) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` (tool results are JSON envelopes like `ToolResponseEnvelope`) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server for code analysis, refactoring, security scans, and graph-related insights using polyglot parsing and symbolic execution.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Claude Desktop/Claude Code; VS Code MCP clients; Cursor |

### 1.3 Primary Capabilities

- Static analysis and code structure
- Security scanning and dependency analysis
- Graph and symbolic execution tools

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP-compliant client (examples mentioned: Claude Desktop/Claude Code, VS Code MCP clients, Cursor). |
| **Documented integrations** | VS Code (extension folder present: `vscode-extension/`) |
| **Notes / constraints** | No first-party JetBrains plugin is evident at the repository root. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Python; additional polyglot support via tree-sitter (JS/TS/Java) |
| **How to extend** | `Unknown` |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Mixed` |
| **License details** | Community MIT; Pro/Enterprise commercial |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python; TypeScript/JavaScript (extension assets) |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python 3.10+, `mcp` Python SDK (FastMCP), `tree-sitter` (+ language grammars), `networkx`, `graphviz`, `z3-solver`, `uvicorn`, `pydantic`, `pydantic-settings`, `PyYAML`, `tomli` (py<3.11), `PyJWT[crypto]`, `cryptography`, `defusedxml`, `urllib3` |
| **External / System** | OSV vulnerability data source (dependency scanning) |
| **Optional** | Docker (for HTTP transport) |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Mixed` (local `stdio`; remote `streamable-http`, optionally containerized) |
| **Started by MCP client** | `Yes` (`stdio` transport recommended for local assistants) |
| **Started independently** | `Yes` (`streamable-http` / `http`, can be run in Docker) |
| **Env vars used** | `Unknown` (see § 7) |
| **Config files used** | `Unknown` (see § 7) |
| **CLI flags used** | `Unknown` (see § 7) |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | Python `ast` + `tree-sitter` (polyglot parsing); internal graph layer + `networkx`; `graphviz`; `z3-solver`; OSV-backed dependency scanning |
| **Architecture notes** | Parsing/structure via Python `ast` + Tree-sitter<br>Graph analysis via an internal graph layer and NetworkX-style operations<br>Symbolic execution using Z3<br>Dependency vulnerability data via OSV |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `Yes` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `Unknown` |
| **Mechanism** | `Unknown` |
| **Secrets / Env vars** | `Unknown` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (e.g., `rename_symbol`, `update_symbol`, optional `.bak` backups) |
| **Uses local cache** | `Unknown` |
| **Uses external DB** | `Unknown` |
| **Retains user code** | `Unknown` |

---

## 🗂️ § 3 — Tool Index

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `analyze_code` |
| 2 | `code_policy_check` |
| 3 | `crawl_project` |
| 4 | `cross_file_security_scan` |
| 5 | `extract_code` |
| 6 | `generate_unit_tests` |
| 7 | `get_call_graph` |
| 8 | `get_cross_file_dependencies` |
| 9 | `get_file_context` |
| 10 | `get_graph_neighborhood` |
| 11 | `get_project_map` |
| 12 | `get_symbol_references` |
| 13 | `rename_symbol` |
| 14 | `scan_dependencies` |
| 15 | `security_scan` |
| 16 | `simulate_refactor` |
| 17 | `symbolic_execute` |
| 18 | `type_evaporation_scan` |
| 19 | `unified_sink_detect` |
| 20 | `update_symbol` |
| 21 | `validate_paths` |
| 22 | `verify_policy_integrity` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `None` | No shared input types documented. |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `ToolError` | `error: { error: string, error_code: string, error_details?: { suggestions?: string[] } }` (example error codes listed in §4.4). |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | File/directory paths are evaluated on the server side; some tools accept absolute or relative paths (see tool input schemas). |
| **Rate limits / retries** | `Unknown` |
| **File size limits** | Tier-based limits are documented for several tools (examples: `analyze_code` Community ~1 MB, Pro ~10 MB, Enterprise ~100 MB; other tools have tier caps on depth/files/paths). |
| **Resource constraints** | Many tools are tier-capped by file count, depth, node count, timeouts, etc. (see each tool’s Tier/Limits notes). |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Common error codes** | `invalid_argument`, `invalid_path`, `forbidden`, `not_found`, `timeout`, `too_large`, `resource_exhausted`, `not_implemented`, `upgrade_required`, `dependency_unavailable`, `internal_error` |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `analyze_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_code</code></td>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze a single source file/string to extract structural and (tier-gated) quality metrics: functions/classes/imports, complexity, and optional advanced metrics (e.g., cognitive complexity, Halstead metrics, duplicate blocks, code smells, and enterprise compliance/pattern signals). Accepts either inline code or a file path.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ❌ | — | Inline code (provide either `code` or `file_path`). |
| `language` | `string` | ❌ | `auto` | `auto \| python \| javascript \| typescript \| java`. |
| `file_path` | `string` | ❌ | — | Server-local file path (provide either `code` or `file_path`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code": "string (optional)",
	"language": "auto | python | javascript | typescript | java (default: auto)",
	"file_path": "string (optional, absolute or relative path on server)"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community | pro | enterprise (optional)",
	"tool_version": "string (optional)",
	"tool_id": "analyze_code (optional)",
	"request_id": "string (optional)",
	"capabilities": ["envelope-v1"],
	"duration_ms": 0,
	"warnings": [],
	"upgrade_hints": [
		{
			"feature": "string",
			"tier": "string",
			"reason": "string"
		}
	],
	"error": {
		"error": "string",
		"error_code": "invalid_argument | invalid_path | forbidden | not_found | timeout | too_large | resource_exhausted | not_implemented | upgrade_required | dependency_unavailable | internal_error",
		"error_details": {
			"suggestions": ["string"]
		}
	},
	"data": {
		"success": true,
		"functions": ["string"],
		"classes": ["string"],
		"imports": ["string"],
		"complexity": 0,
		"lines_of_code": 0,
		"issues": ["string"],
		"error": "string | null",

		"function_details": [
			{ "name": "string", "lineno": 1, "end_lineno": 10, "is_async": false }
		],
		"class_details": [
			{ "name": "string", "lineno": 1, "end_lineno": 10, "methods": ["string"] }
		],

		"cognitive_complexity": 0,
		"code_smells": ["string"],
		"halstead_metrics": { "volume": 0.0 },
		"duplicate_code_blocks": [ { "file": "string", "start": 1, "end": 10 } ],
		"dependency_graph": { "caller": ["callee"] },

		"naming_issues": ["string"],
		"compliance_issues": ["string"],
		"custom_rule_violations": [ { "rule": "string" } ],
		"organization_patterns": ["string"],

		"frameworks": ["string"],
		"dead_code_hints": ["string"],
		"decorator_summary": { "decorator": 1 },
		"type_summary": { "typed_functions": 0 },
		"architecture_patterns": ["string"],
		"technical_debt": { "score": 0 },
		"api_surface": { "public": ["string"] },
		"prioritized": false,
		"complexity_trends": { "path/to/file.py": { "complexity": 0 } },

		"language_detected": "python | javascript | typescript | java | null",
		"tier_applied": "community | pro | enterprise | null",

		"error_location": "string | null",
		"suggested_fix": "string | null",
		"sanitization_report": { "changes": [] },
		"parser_warnings": ["string"]
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Reads local files if `file_path` is used; otherwise none. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | If `file_path` is used, the path must be accessible on the server. |
| **Postconditions** | Returns an `AnalysisResult` payload in an envelope. |
| **Limits** | Tier-based file size checks occur before reading (`analyze_code` examples: Community ~1 MB, Pro ~10 MB, Enterprise ~100 MB). |
| **Security & privacy** | Processes code locally; may include sanitization reporting; errors include machine-parseable `error_code` and optional suggestions. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `crawl_project`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>crawl_project</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Crawl a project directory and return a project inventory + summary statistics. Tier-gated behavior applies: Community returns a discovery/inventory view (file list + entrypoints + language breakdown), while Pro/Enterprise perform deeper parsing and can include framework detection, dependency mapping, and hotspot identification.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root_path` | `string` | ❌ | — | Root directory to crawl. |
| `exclude_dirs` | `string[]` | ❌ | — | Directories to skip. |
| `complexity_threshold` | `number` | ❌ | `10` | Threshold used for reporting hotspots. |
| `include_report` | `boolean` | ❌ | `true` | Include report summary. |
| `pattern` | `string` | ❌ | — | Optional include filter. |
| `pattern_type` | `string` | ❌ | `regex` | `regex \| glob`. |
| `include_related` | `string[]` | ❌ | — | Optional related-path include hints. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root_path": "string (optional)",
	"exclude_dirs": ["string"],
	"complexity_threshold": 10,
	"include_report": true,
	"pattern": "string (optional)",
	"pattern_type": "regex | glob (optional, default: regex)",
	"include_related": ["string"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_version": "1.x.x",
	"tool_id": "crawl_project",
	"request_id": "uuid-v4",
	"duration_ms": 1234,
	"error": null,
	"warnings": [],
	"upgrade_hints": [],
	"data": {
		"success": true,
		"files_found": 150,
		"languages": {
			"python": 80,
			"javascript": 45,
			"json": 25
		},
		"framework_detected": "django",
		"entrypoints": [
			{ "file": "manage.py", "type": "django_management" },
			{ "file": "views.py", "type": "django_views" }
		],
		"report": {
			"total_files": 150,
			"high_complexity_files": 3,
			"generated_files": 2
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads project files/directories. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `root_path` must be accessible if provided. |
| **Postconditions** | Returns crawl inventory in `data`. |
| **Limits** | Community: max files=100, max depth=10; Pro: unlimited files; Enterprise: large-repo/monorepo scaling (100k+ per docs). |
| **Security & privacy** | Reads local files; expected crawl failures may be represented as `data.success=false` with `data.error` (unexpected failures use envelope `error`). |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_file_context`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_file_context</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return an AST-based outline and lightweight summary for a single file without sending full file contents over the wire. Pro/Enterprise can include semantic summary and quality metrics.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File path on the server. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "string (required)"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "get_file_context",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"file_path": "/src/utils.py",
		"language": "python",
		"line_count": 250,
		"outline": [
			{
				"type": "function",
				"name": "calculate_sum",
				"line": 10,
				"lines": "10-15",
				"docstring": "Calculate sum of items"
			}
		],
		"imports": ["os", "sys"],
		"quality_metrics": {
			"maintainability_index": 85,
			"documentation_coverage": 90
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads the target file. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `file_path` must exist and be accessible. |
| **Postconditions** | Returns outline/summary; may omit full file content for token efficiency. |
| **Limits** | Community: max context lines 500; Pro: 2,000; Enterprise: unlimited (and may apply RBAC depending on deployment). |
| **Security & privacy** | Operates on local file paths; error codes include `invalid_path`, `too_large`, `internal_error`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_symbol_references`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbol_references</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find all references/usages of a symbol across a project, optionally scoped by prefix. Pro/Enterprise add categorization and richer analysis; Enterprise can add impact analysis and risk assessment.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `symbol_name` | `string` | ✅ | — | Symbol to search for. |
| `project_root` | `string` | ❌ | — | Optional project root. |
| `scope_prefix` | `string` | ❌ | — | Optional scoping prefix. |
| `include_tests` | `boolean` | ❌ | `true` | Include test files. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"symbol_name": "string (required)",
	"project_root": "string (optional)",
	"scope_prefix": "string (optional)",
	"include_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "get_symbol_references",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"symbol": "calculate_total",
		"references_found": 5,
		"definition": {
			"file": "/src/math.py",
			"line": 42
		},
		"references": [
			{
				"file": "/src/api.py",
				"line": 100,
				"type": "function_call",
				"category": "usage",
				"code": "result = calculate_total(items)"
			}
		],
		"impact_analysis": {
			"high_risk_changes": 2,
			"affected_modules": ["api", "services"]
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads project files to locate references. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `symbol_name` must be provided; `project_root` (if provided) must exist. |
| **Postconditions** | Returns definition + references; higher tiers may include categorization and impact analysis. |
| **Limits** | Community: max files searched 100; max references 100. Pro: unlimited + categorization. Enterprise: adds impact analysis/ownership/risk. |
| **Security & privacy** | Operates on local files; common errors include `not_found`, `resource_exhausted`, `invalid_path`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `extract_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>extract_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Surgically extract a specific symbol (function/class/method/variable) from a file or inline code, optionally including dependency context. Pro/Enterprise can resolve cross-file dependencies and generate microservice wrappers; Enterprise can do organization-wide resolution and Dockerfile templates.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `target_type` | `string` | ✅ | — | `function \| class \| method \| variable`. |
| `target_name` | `string` | ✅ | — | Symbol name to extract. |
| `file_path` | `string` | ❌ | — | Prefer `file_path` or provide `code`. |
| `code` | `string` | ❌ | — | Inline code (alternative to `file_path`). |
| `language` | `string` | ❌ | `auto` | Language hint. |
| `include_context` | `boolean` | ❌ | `false` | Include contextual code. |
| `context_depth` | `number` | ❌ | `1` | Context depth. |
| `include_cross_file_deps` | `boolean` | ❌ | `false` | Pro+ feature for cross-file deps. |
| `include_token_estimate` | `boolean` | ❌ | `true` | Include token estimate. |
| `variable_promotion` | `boolean` | ❌ | `false` | Pro+ feature gate. |
| `closure_detection` | `boolean` | ❌ | `false` | Pro+ feature gate. |
| `dependency_injection_suggestions` | `boolean` | ❌ | `false` | Pro+ feature gate. |
| `as_microservice` | `boolean` | ❌ | `false` | Pro+ feature gate. |
| `microservice_host` | `string` | ❌ | `127.0.0.1` | Microservice wrapper host. |
| `microservice_port` | `number` | ❌ | `8000` | Microservice wrapper port. |
| `organization_wide` | `boolean` | ❌ | `false` | Enterprise feature gate. |
| `workspace_root` | `string` | ❌ | — | Optional workspace root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"target_type": "function | class | method | variable",
	"target_name": "string",
	"file_path": "string (optional)",
	"code": "string (optional)",
	"language": "python | javascript | typescript | java | auto (optional)",
	"include_context": false,
	"context_depth": 1,
	"include_cross_file_deps": false,
	"include_token_estimate": true,
	"variable_promotion": false,
	"closure_detection": false,
	"dependency_injection_suggestions": false,
	"as_microservice": false,
	"microservice_host": "127.0.0.1",
	"microservice_port": 8000,
	"organization_wide": false,
	"workspace_root": "string (optional)"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "extract_code",
	"duration_ms": 1234,
	"error": null,
	"warnings": [],
	"upgrade_hints": [],
	"data": {
		"success": true,
		"target_name": "function_name",
		"target_code": "def function_name():\n    ...",
		"context_code": "import os\n...",
		"full_code": "import os\n\ndef function_name():\n    ...",
		"error": null,
		"dependencies": {
			"direct": ["os", "sys"],
			"transitive": ["json"],
			"closure_variables": ["x"],
			"promoted_variables": ["config"]
		},
		"token_estimate": {
			"target": 45,
			"context": 120,
			"full": 165
		},
		"microservice_wrapper": null,
		"metadata": {
			"language": "python",
			"file_path": "/src/utils.py",
			"line_range": [42, 58]
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
| **Side effects** | Reads local files; may compute dependency context; may emit microservice wrapper metadata (tier-gated). |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Provide either `file_path` (recommended) or `code`. |
| **Postconditions** | Returns extracted code plus optional context/deps, token estimates, and metadata. |
| **Limits** | Community: single-file only, no cross-file deps, max extraction size 1 MB. Pro: cross-file deps depth=1, max 10 MB, variable promotion/closure detection/DI suggestions/microservice wrapper. Enterprise: unlimited context depth, org-wide resolution, max 100 MB, Dockerfile/service boundary detection. |
| **Security & privacy** | Operates on local files; may return stitched code; tier-gated features return `upgrade_required` or `data.success=false` depending on implementation. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `rename_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>rename_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Rename a symbol (function/class/method/variable) and update references depending on tier. Community updates the definition only; Pro updates cross-file references/imports within limits; Enterprise supports organization-wide rename with rollback planning.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File containing the symbol definition. |
| `target_type` | `string` | ❌ | — | `function \| class \| method \| variable`. |
| `target_name` | `string` | ✅ | — | Old name. |
| `new_name` | `string` | ✅ | — | New name. |
| `create_backup` | `boolean` | ❌ | `true` | Create a `.bak` file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "string (required)",
	"target_type": "function | class | method | variable",
	"target_name": "string (required)",
	"new_name": "string (required)",
	"create_backup": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_version": "1.x.x",
	"tool_id": "rename_symbol",
	"request_id": "uuid-v4",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"file_path": "/src/utils.py",
		"target_name": "old_name",
		"target_type": "function",
		"new_name": "new_name",
		"files_updated": 1,
		"references_updated": 0,
		"imports_updated": 0,
		"backup_created": true,
		"backup_path": "/src/utils.py.bak",
		"error": null,
		"details": {
			"definition_updated": true,
			"references": [],
			"imports": []
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes to files (updates definition; higher tiers can update cross-file references/imports); may create backups. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Target file must be writable; symbol must exist in the file. |
| **Postconditions** | Renames symbol; may update references/imports depending on tier; optional backup file written. |
| **Limits** | Community: definition-only; Pro: max files searched 500, max files updated 200; Enterprise: org-wide + rollback planning. |
| **Security & privacy** | May be blocked by permissions (`forbidden`); may return `upgrade_required` if tier-gated operations requested. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `update_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>update_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Safely replace (or modify) a symbol’s implementation while preserving surrounding code and creating backups. Pro/Enterprise add semantic validation, multi-file operations, atomic rollback, and hooks; Enterprise adds compliance/custom rules.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File containing the target symbol. |
| `target_type` | `string` | ❌ | — | `function \| class \| method \| variable`. |
| `target_name` | `string` | ✅ | — | Symbol name to update. |
| `new_code` | `string` | ❌ | — | Replacement code (for `replace`, `prepend`, `append`). |
| `operation` | `string` | ❌ | `replace` | `replace \| prepend \| append`. |
| `new_name` | `string` | ❌ | — | Pro+ (rename as part of update). |
| `create_backup` | `boolean` | ❌ | `true` | Create a `.bak` file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_path": "string (required)",
	"target_type": "function | class | method | variable",
	"target_name": "string (required)",
	"new_code": "string (optional)",
	"operation": "replace | prepend | append (optional, default: replace)",
	"new_name": "string (optional, Pro+)",
	"create_backup": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_version": "1.x.x",
	"tool_id": "update_symbol",
	"request_id": "uuid-v4",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"file_path": "/src/utils.py",
		"target_name": "old_name",
		"target_type": "function",
		"new_name": "new_name",
		"files_updated": 1,
		"backup_created": true,
		"backup_path": "/src/utils.py.bak",
		"error": null,
		"validation_results": {
			"syntax_valid": true,
			"semantic_valid": true,
			"warnings": []
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated code to disk; may create backups; may run syntax/semantic validation (tier-gated). |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `file_path` must be writable; symbol must exist. |
| **Postconditions** | Updates symbol and returns validation results. |
| **Limits** | Community: syntax validation, backups, max 10 updates per call. Pro: semantic validation, unlimited updates, atomic rollback, hooks. Enterprise: compliance/custom rules, advanced hooks, org-wide scope when configured. |
| **Security & privacy** | Permission errors surface as `forbidden`; tier denials can surface as `upgrade_required`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_call_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_call_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate a static call graph rooted at a function symbol and return caller/callee relationships, plus an optional Mermaid diagram and circular import indicators. Pro+ improves resolution (e.g., polymorphism/dynamic dispatch); Enterprise can add hotspot/hot-path style insights.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `symbol` | `string` | ✅ | — | Root function symbol. |
| `file_path` | `string` | ✅ | — | Starting file path. |
| `direction` | `string` | ❌ | `callees` | `callers \| callees`. |
| `max_depth` | `number` | ❌ | `3` | Max traversal depth. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"symbol": "string (required)",
	"file_path": "string (required)",
	"direction": "callers | callees (optional, default: callees)",
	"max_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "get_call_graph",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"root_symbol": "main",
		"direction": "callees",
		"depth": 3,
		"nodes": 12,
		"graph": {
			"nodes": [{ "id": "main", "type": "function" }],
			"edges": [{ "from": "main", "to": "process", "label": "calls" }]
		},
		"mermaid_diagram": "graph TD\n  main --> process\n  process --> analyze",
		"circular_imports": []
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads code to build call graph. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Root `symbol` must exist in `file_path`. |
| **Postconditions** | Returns nodes/edges and optional Mermaid diagram. |
| **Limits** | Community: max depth 3, max nodes 50. Pro: max depth 50, max nodes 500. Enterprise: unlimited depth/nodes (plus advanced insights depending on config). |
| **Security & privacy** | Local analysis; errors include `not_found`, `timeout`, `resource_exhausted`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_project_map`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_project_map</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate a comprehensive project structure map (packages/modules/languages/size), with tier-gated enhancements such as coupling metrics, ownership mapping, architectural layer detection, and Enterprise visualization overlays (city map / force graph / churn/bug hotspots). Can optionally request Enterprise service-boundary suggestions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_root` | `string` | ❌ | — | Project root. |
| `include_complexity` | `boolean` | ❌ | `true` | Include complexity metrics. |
| `complexity_threshold` | `number` | ❌ | `10` | Complexity threshold. |
| `include_circular_check` | `boolean` | ❌ | `true` | Include circular import checks. |
| `detect_service_boundaries` | `boolean` | ❌ | `false` | Enterprise-gated. |
| `min_isolation_score` | `number` | ❌ | `0.6` | Enterprise-gated boundary tuning. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"project_root": "string (optional)",
	"include_complexity": true,
	"complexity_threshold": 10,
	"include_circular_check": true,
	"detect_service_boundaries": false,
	"min_isolation_score": 0.6
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "get_project_map",
	"duration_ms": 1234,
	"warnings": [],
	"error": null,
	"data": {
		"success": true,
		"project_root": "/repo",
		"total_files": 42,
		"total_lines": 12000,
		"languages": { "python": 40, "markdown": 2 },
		"packages": ["pkg", "pkg.subpkg"],
		"modules": [
			{ "path": "main.py", "symbols": ["main"], "complexity": 3 },
			{ "path": "pkg/module_a.py", "symbols": ["func_a"], "complexity": 1 }
		],
		"hotspots": [
			{ "path": "pkg/complex.py", "complexity": 15, "threshold": 10 }
		],

		"coupling_metrics": null,
		"git_ownership": null,
		"architectural_layers": null,
		"module_relationships": null,
		"dependency_diagram": null,

		"city_map_data": null,
		"force_graph": null,
		"bug_hotspots": null,
		"churn_heatmap": null,
		"multi_repo_summary": null,
		"compliance_overlay": null,
		"historical_trends": null,
		"custom_metrics": null,

		"service_boundaries_success": null,
		"service_boundaries_error": null,
		"suggested_services": null,
		"service_dependency_graph": null,
		"service_total_files_analyzed": null,
		"service_boundaries_explanation": null
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads project structure and code to build the map. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `project_root` (if provided) must exist. |
| **Postconditions** | Returns map fields; higher tiers enable additional fields/overlays. |
| **Limits** | Community: up to 100 files, 50 modules. Pro: up to 1,000 files, 200 modules and richer fields. Enterprise: unlimited files, up to 1,000 modules; visualization overlays; `detect_service_boundaries` is Enterprise-gated. |
| **Security & privacy** | Local analysis; errors include `timeout`, `resource_exhausted`, `invalid_path`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_graph_neighborhood`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_graph_neighborhood</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extract a $k$-hop neighborhood subgraph around a center node in the code graph (dependencies/relationships), returning nodes/edges plus truncation metadata and a Mermaid diagram. Pro+ can include best-effort semantic neighbors and logical relationship detections; Enterprise can accept a graph query string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `center_node_id` | `string` | ✅ | — | Format: `language::module::type::name`. |
| `k` | `number` | ❌ | `2` | Hop count. |
| `max_nodes` | `number` | ❌ | `100` | Max nodes. |
| `direction` | `string` | ❌ | — | `outgoing \| incoming \| both`. |
| `min_confidence` | `number` | ❌ | `0.0` | Confidence threshold. |
| `project_root` | `string` | ❌ | — | Optional root. |
| `query` | `string` | ❌ | — | Enterprise-only (if enabled). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"center_node_id": "string (required; language::module::type::name)",
	"k": 2,
	"max_nodes": 100,
	"direction": "outgoing | incoming | both",
	"min_confidence": 0.0,
	"project_root": "string (optional)",
	"query": "string (optional; Enterprise only)"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "get_graph_neighborhood",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"center_node_id": "python::pkg.module::function::process_data",
		"k": 2,
		"nodes": [
			{
				"id": "python::pkg.module::function::process_data",
				"depth": 0,
				"metadata": { "kind": "function" },
				"in_degree": 1,
				"out_degree": 2
			}
		],
		"edges": [
			{
				"from_id": "python::pkg.module::function::process_data",
				"to_id": "python::pkg.validate::function::validate_input",
				"edge_type": "calls",
				"confidence": 1.0
			}
		],
		"total_nodes": 1,
		"total_edges": 1,
		"max_depth_reached": 1,
		"truncated": false,
		"truncation_warning": null,
		"mermaid": "graph TD\n  process_data --> validate_input",
		"semantic_neighbors": [],
		"logical_relationships": [],
		"query_supported": false,
		"traversal_rules_available": false,
		"path_constraints_supported": false,
		"hot_nodes": [],
		"error": null
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads graph/analysis state; may compute derived neighborhood and diagrams. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `center_node_id` must be valid; `project_root` (if provided) must exist. |
| **Postconditions** | Returns neighborhood subgraph and truncation metadata. |
| **Limits** | Community: max k=1, max nodes 20. Pro: max k=5, max nodes 100. Enterprise: unlimited k/nodes and optional `query` if enabled. |
| **Security & privacy** | Local analysis; errors include `timeout`, `resource_exhausted`, `invalid_argument`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_cross_file_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_cross_file_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze a target symbol in a target file and map/import or extract its cross-file dependencies up to a depth limit. Can optionally include combined code and a Mermaid diagram. Uses tier-based limits for depth and number of files.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `target_file` | `string` | ✅ | — | Target file path. |
| `target_symbol` | `string` | ✅ | — | Symbol in the target file. |
| `project_root` | `string` | ❌ | — | Optional root. |
| `max_depth` | `number` | ❌ | `3` | Max dependency depth. |
| `include_code` | `boolean` | ❌ | `true` | Include stitched code. |
| `include_diagram` | `boolean` | ❌ | `true` | Include Mermaid diagram. |
| `confidence_decay_factor` | `number` | ❌ | `0.9` | Confidence decay across hops. |
| `max_files` | `number` | ❌ | `50` | Max files. |
| `timeout_seconds` | `number` | ❌ | `120` | Timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"target_file": "string (required)",
	"target_symbol": "string (required)",
	"project_root": "string (optional)",
	"max_depth": 3,
	"include_code": true,
	"include_diagram": true,
	"confidence_decay_factor": 0.9,
	"max_files": 50,
	"timeout_seconds": 120
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "get_cross_file_dependencies",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"target_file": "src/api.py",
		"target_symbol": "handle_request",
		"max_depth_applied": 1,
		"max_files_applied": 50,
		"dependencies": [
			{
				"file": "src/utils.py",
				"depth": 1,
				"type": "module_import",
				"symbols": ["validate_input", "parse_id"]
			}
		],
		"combined_code": "# (optional) stitched code for target + deps",
		"dependency_diagram": "graph TD\n  api --> utils",
		"circular_imports": [],
		"error": null
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads and analyzes project files for dependencies. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `target_file` and `target_symbol` must exist; `project_root` (if provided) must exist. |
| **Postconditions** | Returns dependency list, optional stitched code, and optional diagram. |
| **Limits** | Community: max depth 1, max files 50. Pro: max depth 5, max files 500. Enterprise: unlimited depth/files. |
| **Security & privacy** | Local file reads; errors include `timeout`, `resource_exhausted`, `not_found`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `cross_file_security_scan`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>cross_file_security_scan</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Perform cross-file taint/security analysis to trace data flow across module boundaries and report source→sink vulnerabilities. Tier-gated limits constrain modules and depth; Pro+ adds framework-aware analysis/DI resolution; Enterprise allows global scope and advanced rule sets.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_root` | `string` | ❌ | — | Optional root. |
| `entry_points` | `string[]` | ❌ | — | Optional entry points. |
| `max_depth` | `number` | ❌ | `5` | Max depth. |
| `include_diagram` | `boolean` | ❌ | `true` | Include diagram. |
| `timeout_seconds` | `number` | ❌ | `120` | Timeout. |
| `max_modules` | `number` | ❌ | `100` | Max modules. |
| `confidence_threshold` | `number` | ❌ | `0.7` | Confidence cutoff. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"project_root": "string (optional)",
	"entry_points": ["string"],
	"max_depth": 5,
	"include_diagram": true,
	"timeout_seconds": 120,
	"max_modules": 100,
	"confidence_threshold": 0.7
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "cross_file_security_scan",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"vulnerabilities": [
			{
				"vulnerability_id": "sql-001",
				"type": "sql_injection",
				"severity": "high",
				"source": { "file": "src/api.py", "line": 42, "symbol": "request.args.get('id')" },
				"sink": { "file": "src/db.py", "line": 100, "symbol": "execute" },
				"path_length": 3
			}
		],
		"modules_scanned": 8,
		"taint_paths": 1,
		"diagram": "graph TD\n  api --> handlers --> db",
		"error": null
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads project files; performs static cross-file analysis. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `project_root` (if provided) must exist. |
| **Postconditions** | Returns vulnerabilities, paths, and optional diagram. |
| **Limits** | Community: max modules 10, max depth 3. Pro: max modules 100, max depth 10. Enterprise: unlimited modules/depth and custom rules (when enabled). |
| **Security & privacy** | Local analysis; can be expensive; errors include `timeout`, `resource_exhausted`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `security_scan`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>security_scan</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scan a file or inline code for security vulnerabilities (OWASP-focused in Community; broader vulnerability classes, secret detection, sanitizer recognition, and remediation suggestions in Pro; Enterprise adds cross-file taint/reachability and custom policies).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ❌ | — | Inline code (provide `code` or `file_path`). |
| `file_path` | `string` | ❌ | — | Server-local file path (provide `code` or `file_path`). |
| `language` | `string` | ❌ | — | Optional language hint (auto-detected if omitted). |
| `include_context` | `boolean` | ❌ | `false` | Include context. |
| `confidence_threshold` | `number` | ❌ | `0.7` | Confidence cutoff. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code": "string (optional)",
	"file_path": "string (optional)",
	"language": "string (optional; auto-detected if omitted)",
	"include_context": false,
	"confidence_threshold": 0.7
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "security_scan",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"findings": [
			{
				"finding_id": "vuln-001",
				"type": "sql_injection",
				"severity": "high",
				"confidence": 0.95,
				"location": { "file": "app.py", "line": 42, "column": 10 },
				"message": "User input directly concatenated into SQL query",
				"code_snippet": "query = f'SELECT * FROM users WHERE id={user_id}'",
				"remediation": "Use parameterized queries or ORM"
			}
		],
		"summary": {
			"total_findings": 1,
			"by_severity": { "critical": 0, "high": 1, "medium": 0, "low": 0 },
			"by_type": { "sql_injection": 1 }
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads code or a file and performs static analysis. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Provide either `code` or `file_path`. |
| **Postconditions** | Returns findings list and summary. |
| **Limits** | Community: max file size 500 KB; max findings 50; OWASP Top 10 only. Pro: broader scanning and unlimited file size/findings. Enterprise: adds cross-file taint, compliance checks, reachability and prioritized ordering (depending on config). |
| **Security & privacy** | Local scan; errors include `too_large`, `not_implemented`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `unified_sink_detect`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>unified_sink_detect</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Identify security-critical sinks (e.g., SQL execution, command execution, file operations, XSS/DOM sinks) in a single code snippet across multiple languages. Pro+ adds more languages and richer context-aware detection.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Code to analyze. |
| `language` | `string` | ✅ | — | Language id. |
| `confidence_threshold` | `number` | ❌ | `0.7` | Confidence cutoff. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code": "string (required)",
	"language": "string (required)",
	"confidence_threshold": 0.7
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "unified_sink_detect",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"sinks_found": 1,
		"language": "python",
		"sinks": [
			{
				"sink_id": "sink-001",
				"type": "sql_sink",
				"location": { "line": 42, "column": 10 },
				"code": "db.execute(query)",
				"confidence": 0.95,
				"cwe": "CWE-89",
				"context": "database query execution"
			}
		]
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None (analysis only). |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `code` and `language` are required. |
| **Postconditions** | Returns sink list and counts. |
| **Limits** | Community: languages Python/JS/TS/Java; max sinks 50. Pro: adds languages and unlimited sinks. Enterprise: org-specific sinks and coverage analysis. |
| **Security & privacy** | Local scan; errors include `resource_exhausted` and `not_implemented`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `scan_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>scan_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scan project dependencies for known vulnerabilities (OSV/CVE) and supply-chain risks. Pro+ adds reachability, license compliance, typosquatting detection, and update recommendations; Enterprise can add private dependency scanning, custom databases, and policy-based blocking/remediation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ❌ | — | Dependency file or project root. |
| `project_root` | `string` | ❌ | — | Project root. |
| `scan_vulnerabilities` | `boolean` | ❌ | `true` | Enable vulnerability scan. |
| `include_dev` | `boolean` | ❌ | `true` | Include dev dependencies. |
| `timeout` | `number` | ❌ | `30` | Timeout seconds. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"path": "string (optional; dependency file or project root)",
	"project_root": "string (optional)",
	"scan_vulnerabilities": true,
	"include_dev": true,
	"timeout": 30
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "scan_dependencies",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"vulnerabilities": [
			{
				"vulnerability_id": "vuln-001",
				"package": "requests",
				"version": "2.25.0",
				"severity": "high",
				"cvss_score": 7.5,
				"description": "Session fixation vulnerability",
				"affected_versions": ["<2.28.0"],
				"patched_version": "2.28.0",
				"remediation": "Upgrade to 2.28.0 or later"
			}
		],
		"error": null
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | May query external vulnerability data sources (e.g., OSV) depending on configuration. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Dependency file/root paths (if provided) must exist. |
| **Postconditions** | Returns vulnerability list and remediation hints. |
| **Limits** | Community: max dependencies 50. Pro: unlimited + reachability/license/typosquatting analysis. Enterprise: custom DB/private deps/policy blocking. |
| **Security & privacy** | May involve network calls; errors include `dependency_unavailable`, `timeout`, `resource_exhausted`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `type_evaporation_scan`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>type_evaporation_scan</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Detect “type evaporation” vulnerabilities where type safety is lost across boundaries (especially frontend TypeScript → backend), focusing on explicit/implicit <code>any</code>, boundary validation gaps, and (Enterprise) schema generation suggestions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `frontend_code` | `string` | ✅ | — | Frontend code. |
| `backend_code` | `string` | ✅ | — | Backend code. |
| `frontend_file` | `string` | ❌ | — | Optional file name. |
| `backend_file` | `string` | ❌ | — | Optional file name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"frontend_code": "string (required)",
	"backend_code": "string (required)",
	"frontend_file": "string (optional)",
	"backend_file": "string (optional)"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "type_evaporation_scan",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"evaporation_issues": 3,
		"frontend_any_count": 2,
		"implicit_any_count": 1,
		"issues": [
			{
				"issue_id": "evap-001",
				"type": "explicit_any",
				"location": { "file": "api.ts", "line": 15 },
				"message": "Explicit 'any' type used for API response",
				"code": "const response: any = await fetch('/api/user')"
			}
		],
		"schema_suggestions": null
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None (analysis only). |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `frontend_code` and `backend_code` are required. |
| **Postconditions** | Returns evaporation issues and optional schema suggestions (tier-gated). |
| **Limits** | Community: frontend-only, max files 50. Pro: frontend+backend correlation, max files 500. Enterprise: unlimited + schema generation and remediation. |
| **Security & privacy** | Processes code locally; errors include `too_large`, `resource_exhausted`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `symbolic_execute`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>symbolic_execute</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Perform symbolic execution on Python code to explore execution paths, collect constraints, and summarize branch coverage. Pro+ adds deeper loop unrolling, complex container types, and smarter path exploration.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Python source. |
| `max_paths` | `number` | ❌ | `50` | Max paths. |
| `max_depth` | `number` | ❌ | `10` | Max depth/loop unroll. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code": "string (required; Python source)",
	"max_paths": 50,
	"max_depth": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "symbolic_execute",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"paths_explored": 12,
		"max_paths_limit": 50,
		"execution_paths": [
			{
				"path_id": 1,
				"constraints": ["x > 0", "y < 100"],
				"return_value": "true",
				"branch_taken": "if x > 0"
			}
		],
		"coverage_metrics": {
			"branches_covered": 8,
			"total_branches": 10,
			"coverage_percentage": 80
		},
		"constraint_summary": {
			"total_constraints": 24,
			"constraint_types": ["int_comparison", "bool_expr", "string_match"],
			"unresolvable_constraints": 0
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
| **Side effects** | None (analysis only). |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Valid Python code is required. |
| **Postconditions** | Returns explored paths, constraints, and coverage summary. |
| **Limits** | Community: max paths 50; max loop unroll depth 10. Pro: unlimited paths; unroll depth 100; additional types and concolic outputs. Enterprise: unlimited loop depth; custom solvers and distributed execution (config-dependent). |
| **Security & privacy** | Executes analysis locally; errors include `timeout`, `resource_exhausted`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `generate_unit_tests`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_unit_tests</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate unit tests from Python code using symbolic execution and constraint-driven path exploration. The server can emit a bounded set of representative tests (tier-limited), optionally as data-driven/parameterized tests (Pro+), and optionally as bug-reproduction tests when a crash log is provided (Enterprise only).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ❌ | — | Provide `code` or `file_path`. |
| `file_path` | `string` | ❌ | — | Provide `code` or `file_path`. |
| `function_name` | `string` | ❌ | — | Often used with `file_path`. |
| `framework` | `string` | ❌ | `pytest` | `pytest \| unittest \| ...`. |
| `data_driven` | `boolean` | ❌ | `false` | Pro+ feature gate. |
| `crash_log` | `string` | ❌ | — | Enterprise-only feature gate. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"code": "string (optional; Python source)",
	"file_path": "string (optional; path on server)",
	"function_name": "string (optional)",
	"framework": "pytest | unittest | ... (default: pytest)",
	"data_driven": false,
	"crash_log": "string (optional; Enterprise-only feature gate)"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "generate_unit_tests",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"server_version": "string",
		"function_name": "string",
		"test_count": 5,
		"test_cases": [
			{
				"path_id": 1,
				"function_name": "string",
				"inputs": { "arg": 1 },
				"description": "string",
				"path_conditions": ["x > 0"]
			}
		],
		"total_test_cases": 8,
		"truncated": true,
		"truncation_warning": "string | null",
		"pytest_code": "string",
		"unittest_code": "string",
		"error": "string | null",

		"tier_applied": "community|pro|enterprise",
		"framework_used": "pytest|unittest|...",
		"max_test_cases_limit": 5,
		"data_driven_enabled": false,
		"bug_reproduction_enabled": false
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (generation only). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Provide `code` or `file_path`. |
| **Postconditions** | Returns generated tests and code strings; tier denials commonly appear as `data.success=false` with `data.error`. |
| **Limits** | Community: capped tests (commonly 5), framework allowlist typically only `pytest`. Pro: higher cap (commonly 20), supports `data_driven`. Enterprise: unlimited tests, broader frameworks, supports `crash_log` bug reproduction. |
| **Security & privacy** | Local analysis; tier gates can disable/deny features. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `simulate_refactor`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>simulate_refactor</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Simulate applying a code change and check whether the change is safe to apply. The tool can accept either a full replacement (<code>new_code</code>) or a patch/diff (<code>patch</code>) and returns a safety verdict, structural change summary, and any detected security issues.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `original_code` | `string` | ✅ | — | Baseline code. |
| `new_code` | `string` | ❌ | — | Full replacement code (or provide `patch`). |
| `patch` | `string` | ❌ | — | Patch/diff (or provide `new_code`). |
| `strict_mode` | `boolean` | ❌ | `false` | Strict checking mode. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"original_code": "string (required)",
	"new_code": "string (optional)",
	"patch": "string (optional)",
	"strict_mode": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "simulate_refactor",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"server_version": "string",
		"is_safe": true,
		"status": "safe|unsafe|warning|error",
		"reason": "string | null",
		"security_issues": [
			{
				"type": "string",
				"severity": "string",
				"line": 0,
				"description": "string",
				"cwe": "string | null"
			}
		],
		"structural_changes": {
			"functions_added": ["string"],
			"functions_removed": ["string"],
			"classes_added": ["string"],
			"classes_removed": ["string"]
		},
		"warnings": ["string"],
		"error": "string | null"
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None (simulation only). |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Must provide `original_code` and either `new_code` or `patch`. |
| **Postconditions** | Returns safety verdict and change summary. |
| **Limits** | Community: smaller max input size (commonly ~1 MB). Pro: larger (commonly ~10 MB). Enterprise: largest (commonly ~100 MB) and deep analysis; may enable compliance validation depending on capabilities. |
| **Security & privacy** | Local analysis; errors include `too_large`, `invalid_argument`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `validate_paths`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>validate_paths</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Validate that file/directory paths are accessible before running file-based operations. This is commonly used to preflight file tooling in local or containerized environments and to provide actionable guidance when a path is invalid.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `paths` | `string[]` | ✅ | — | Paths to validate. |
| `project_root` | `string` | ❌ | — | Optional root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"paths": ["string"],
	"project_root": "string | null"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "validate_paths",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"valid_paths": 4,
		"invalid_paths": 1,
		"docker_detected": true,
		"workspace_root": "string | null",
		"results": [
			{
				"path": "string",
				"valid": true,
				"accessible": true,
				"type": "file|dir|unknown",
				"resolved_path": "string (optional)",
				"error": "string (optional)",
				"suggestion": "string (optional)"
			}
		]
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads filesystem metadata to validate paths. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `paths` must be provided. |
| **Postconditions** | Returns per-path results and optional environment hints (e.g., Docker/workspace). |
| **Limits** | Community: may cap paths/request (~100). Pro: raises/removes caps, may include alias resolution. Enterprise: may add security-focused checks (config-dependent). |
| **Security & privacy** | Path validation may reveal environment info (e.g., docker detected). |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `verify_policy_integrity`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>verify_policy_integrity</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Verify policy file integrity (tamper detection) using cryptographic signatures and/or integrity manifests. The server can verify policies from a directory and may consult a manifest source (default <code>file</code>) to determine expected digests/signatures.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `policy_dir` | `string` | ❌ | — | Policy directory. |
| `manifest_source` | `string` | ❌ | — | `file \| server`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"policy_dir": "string | null",
	"manifest_source": "file | server"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "verify_policy_integrity",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"integrity_verified": true,
		"tampering_detected": false,
		"policy_files": 3,
		"verified_files": 3,
		"results": [
			{
				"file": "string",
				"valid": true,
				"signature_valid": true,
				"hash": "string (optional)",
				"last_modified": "string (optional)"
			}
		]
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads policy files and (optionally) signature/manifest metadata. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `policy_dir` must exist if provided. |
| **Postconditions** | Returns per-policy-file integrity results. |
| **Limits** | Community: basic verification (structure/presence). Pro: enables signature validation/tamper detection when configured. Enterprise: audit-grade reporting and extra metadata (config-dependent). |
| **Security & privacy** | Involves cryptographic verification; permission errors can surface as `forbidden`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `code_policy_check`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>code_policy_check</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Check one or more files for conformance to organizational policies (style guides, best practices, security patterns, and optionally compliance standards). Enterprise-only features include compliance standards evaluation and optional report generation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `paths` | `string[]` | ✅ | — | Paths to check. |
| `rules` | `string[]` | ❌ | — | Rules to apply. |
| `compliance_standards` | `string[]` | ❌ | — | Enterprise-only (silently disabled on non-Enterprise tiers per tool description). |
| `generate_report` | `boolean` | ❌ | `false` | Enterprise-only. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"paths": ["string"],
	"rules": ["string"],
	"compliance_standards": ["string"],
	"generate_report": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (`ToolResponseEnvelope`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"tier": "community|pro|enterprise",
	"tool_id": "code_policy_check",
	"duration_ms": 1234,
	"error": null,
	"data": {
		"success": true,
		"files_checked": 5,
		"issues_found": 8,
		"issues": [
			{
				"file": "string",
				"line": 42,
				"rule": "string",
				"severity": "info|warning|error",
				"message": "string",
				"suggestion": "string (optional)"
			}
		],
		"compliance": {
			"standards": ["string"],
			"compliant": true,
			"score": 92.5
		},
		"report": {
			"format": "string",
			"content": "string"
		}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Reads files to evaluate policy rules; may generate report artifacts in-memory. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `paths` is required and must exist. |
| **Postconditions** | Returns issues list and optional compliance/report payloads (tier/capability dependent). |
| **Limits** | Community: baseline style/pattern checks; may cap files/rules per request (~100 files cited). Pro: increases caps and can add best-practice + security-pattern checks. Enterprise: enables compliance standards and report generation depending on capabilities. |
| **Security & privacy** | Operates on local code and policies; errors include `resource_exhausted`, `invalid_path`, `not_implemented`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `Unknown` |
| **MCP prompts exposed** | `Unknown` |
| **Other RPC endpoints** | `Unknown` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `Unknown` | ❌ | — | `Unknown` | `Unknown` |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Unknown` | `Unknown` |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Unknown` | `Unknown` |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Python 3.10+ and required Python dependencies (FastMCP + analysis stack). |
| 2 | Ensure Z3 is available (uses `z3-solver`) if using symbolic execution features. |
| 3 | For HTTP/remote transport deployments, install and configure `uvicorn` (and optionally Docker). |

### 8.2 Typical Run Commands

```bash
# Unknown (not documented in source report)
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Unknown` |
| **Tracing / Metrics** | `Unknown` |

### 8.4 Performance Considerations

- Many tools are tier-limited by file counts, depth, node counts, and timeouts (see §5). 
- Symbolic execution and cross-file security scans can be resource-intensive.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `22` |
| **Read-only** | `20` |
| **Write-only** | `2` |
| **Hybrid** | `0` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Analyzed Ref / Commit URL | Not captured in the formatted report inputs; leave `Unknown` unless a specific ref is provided. |
| Auth requirements / mechanism | Not documented in the source report excerpt used for formatting. |
| Environment variables / config files / CLI flags | Not documented in the source report at the same level of detail as tool schemas. |

---

<div align="center">

*— End of Report —*

</div>
