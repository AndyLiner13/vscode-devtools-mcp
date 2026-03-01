<div align="center">

# 📋 MCP Server Report

## `codebadger`
### [`Lekssays/codebadger`](https://github.com/Lekssays/codebadger)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/Lekssays/codebadger` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `v3.3.4-beta` |
| **Commit URL** | `N/A` |
| **License** | `GPL-3.0` |
| **Version** | `v3.3.4-beta` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Codebadger MCP server (full repo) |
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
| **Path model** | `mixed` (local filesystem paths for `source_path`; project-relative paths for `filename` in browsing tools) |
| **Line/column indexing** | `1-based` (e.g., `start_line`/`end_line` are 1-based inclusive) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text` JSON string (per report) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that generates and queries Joern Code Property Graphs (CPG) for static code analysis over HTTP.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | VS Code (Copilot MCP config), Claude Desktop |

### 1.3 Primary Capabilities

- Generate CPGs and query code structure
- Retrieve call graphs and control/data flows
- Taint analysis and program slicing

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can connect to HTTP/streamable HTTP MCP server. |
| **Documented integrations** | VS Code, Claude Desktop |
| **Notes / constraints** | Joern requires Docker. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Java, C/C++, JavaScript, Python, Go, Kotlin, C#, Ghidra, Jimple, PHP, Ruby, Swift |
| **How to extend** | `Unknown` |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | GPL-3.0 |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python 3.10+ (3.13 recommended), FastMCP, uvicorn, pydantic, httpx, aiohttp, websockets, docker, gitpython, PyYAML |
| **External / System** | Docker + Docker Compose, Joern |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Mixed` (local MCP service with Dockerized Joern) |
| **Started by MCP client** | `No` (HTTP server runs independently) |
| **Started independently** | `Yes` |
| **Env vars used** | `No` (none documented; see § 7.1) |
| **Config files used** | `Yes` (Dockerfile / Docker Compose) |
| **CLI flags used** | `No` (none documented; see § 7.3) |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | Joern CPG + CPGQL |
| **Architecture notes** | MCP server over HTTP, Joern in Docker. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `No` |
| `http` / `streamable-http` | `Yes` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `None` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (CPG cache) |
| **Uses local cache** | `Yes` (codebase cache) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (local cache) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `find_bounds_checks` |
| 2 | `find_taint_flows` |
| 3 | `find_taint_sinks` |
| 4 | `find_taint_sources` |
| 5 | `generate_cpg` |
| 6 | `get_call_graph` |
| 7 | `get_cfg` |
| 8 | `get_code_snippet` |
| 9 | `get_codebase_summary` |
| 10 | `get_cpg_status` |
| 11 | `get_cpgql_syntax_help` |
| 12 | `get_macro_expansion` |
| 13 | `get_method_source` |
| 14 | `get_program_slice` |
| 15 | `get_type_definition` |
| 16 | `get_variable_flow` |
| 17 | `list_calls` |
| 18 | `list_files` |
| 19 | `list_methods` |
| 20 | `list_parameters` |
| 21 | `run_cpgql_query` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `codebase_hash` | Deterministic identifier returned by `generate_cpg` and used by all other tools. |
| `language` | Joern language selector used during analysis/taint tools (e.g., `c`). |
| `location` | String location formats such as `filename:line` and (in some tools) `filename:line:call_name`. |
| Pagination | Many list-like tools accept `limit`, `page`, and `page_size` and return `total` and `total_pages`. |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `McpJsonTextResponse` | Tool responses are JSON returned as MCP `content[].text` containing a JSON string. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `mixed` (repo URL / local path inputs; project-relative file paths for browsing) |
| **Rate limits / retries** | `Not documented` |
| **File size limits** | `Not documented` |
| **Resource constraints** | `Not documented` |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Not documented` |
| **Error as text** | `Yes` (JSON error information returned as text content in the same envelope) |
| **Error as `{ error: string }`** | `Not documented` |
| **Common error codes** | `Not documented` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `generate_cpg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_cpg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates (or reuses) a Joern Code Property Graph (CPG) for a codebase and returns a deterministic <code>codebase_hash</code> used by all other tools. For <code>source_type="github"</code> it clones the repo into a local playground cache; for <code>source_type="local"</code> it copies files. CPG generation runs asynchronously in the Joern Docker container.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `source_type` | `string` | ✅ | — | Source type (e.g., `github` or `local`). |
| `source_path` | `string` | ✅ | — | Repo URL (GitHub) or local path. |
| `language` | `string` | ✅ | — | Language to analyze (Joern language selector). |
| `github_token` | `string` | ❌ | — | GitHub token (optional). |
| `branch` | `string` | ❌ | — | Git branch name (optional). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"source_type": "github",
	"source_path": "https://github.com/test/repo",
	"language": "c",
	"github_token": "ghp_... (optional)",
	"branch": "main (optional)"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"status": "generating",
	"message": "CPG generation started. Use get_cpg_status to check progress.",
	"source_type": "github",
	"source_path": "https://github.com/test/repo",
	"language": "c"
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes to local playground cache; updates codebase tracking; may start Joern server processes; may clone GitHub repositories. |
| **Determinism** | `Deterministic` (codebase hash) |
| **Idempotency** | `Depends` (may reuse existing cache) |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/core_tools.py` |

---

### 🔹 Tool: `get_cpg_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_cpg_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns the status for a previously requested CPG generation: <code>ready</code>, <code>generating</code>, <code>failed</code>, or <code>not_found</code>. When <code>ready</code>, it returns paths/metadata (and may attempt to start a Joern server if one isn’t running).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier from `generate_cpg`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"status": "ready",
	"cpg_path": "/tmp/test.cpg",
	"joern_port": 2000,
	"source_type": "github",
	"source_path": "https://github.com/test/repo",
	"language": "c",
	"container_codebase_path": "/playground/codebases/553642871dd4251d",
	"container_cpg_path": "/playground/cpgs/553642871dd4251d/cpg.bin",
	"repository": null,
	"created_at": "2026-01-01T00:00:00+00:00",
	"last_accessed": "2026-01-01T00:00:00+00:00"
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | May start a Joern server and persist the chosen port back into tracking. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/core_tools.py` |

---

### 🔹 Tool: `run_cpgql_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>run_cpgql_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes a raw CPGQL (Joern Scala DSL) query against the CPG for the given <code>codebase_hash</code>, returning structured results (<code>data</code>, <code>row_count</code>) or an error.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `query` | `string` | ✅ | — | CPGQL query string (Joern Scala DSL). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"query": "cpg.method"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"data": ["result"],
	"row_count": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/code_browsing_tools.py` |
| **Tests / expected shape** | `tests/test_mcp_tools.py` |

---

### 🔹 Tool: `get_cpgql_syntax_help`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_cpgql_syntax_help</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns built-in guidance for writing Joern/CPGQL queries (common patterns, node types, string matching approaches). Intended to help users compose inputs for <code>run_cpgql_query</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | Takes an empty JSON object. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"syntax_helpers": {
		"string_matching": {
			"description": "Different ways to match strings in CPGQL",
			"methods": [
				{
					"name": "Exact match",
					"syntax": ".name(\"exactName\")",
					"query": "cpg.method.name(\"main\").l"
				}
			]
		},
		"common_patterns": {
			"find_method_by_name": "cpg.method.name(\"methodName\").l",
			"find_calls_to_function": "cpg.call.name(\"functionName\").l"
		},
		"node_types": [
			{
				"type": "method",
				"properties": ["name", "filename", "signature", "lineNumber", "isExternal"]
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
| **Classification** | `General Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Helper data** | `src/utils/cpgql_validator.py` |
| **Entry point / registration** | `src/tools/code_browsing_tools.py` |

---

### 🔹 Tool: `get_codebase_summary`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_codebase_summary</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns an “at a glance” summary of the analyzed codebase by running an aggregate CPG query (counts for files/methods/calls/literals, plus language).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"summary": {
		"language": "c",
		"total_files": 5,
		"total_methods": 10,
		"user_defined_methods": 8,
		"total_calls": 15,
		"total_literals": 20
	}
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/code_browsing_tools.py` |
| **Tests / expected shape** | `tests/test_mcp_tools.py` |

---

### 🔹 Tool: `list_files`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_files</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists the codebase’s files/directories as a tree (from the cached source directory for GitHub repos, or the local source directory for local codebases). Supports optional <code>local_path</code> to list a subdirectory. Behavior includes per-directory child limits to keep results bounded.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `local_path` | `string` | ❌ | — | Subdirectory to list (optional). |
| `limit` | `number` | ❌ | — | Max results (example uses `1000`). |
| `page` | `number` | ❌ | — | Page number (example uses `1`). |
| `page_size` | `number` | ❌ | — | Page size (example uses `100`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"local_path": "src (optional)",
	"limit": 1000,
	"page": 1,
	"page_size": 100
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"files": [
		{
			"name": "many_files",
			"path": "many_files",
			"type": "dir",
			"children": [
				{ "name": "file_0.txt", "path": "many_files/file_0.txt", "type": "file" }
			]
		}
	],
	"total": 42,
	"page": 1,
	"page_size": 100,
	"total_pages": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/code_browsing_tools.py` |
| **Core implementation** | `src/services/code_browsing_service.py` |

---

### 🔹 Tool: `list_methods`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_methods</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists methods/functions found in the generated Code Property Graph (CPG), with optional regex-based filtering. Supports pagination (<code>page</code>, <code>page_size</code>) over a cached full result set.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `name_pattern` | `string` | ❌ | — | Restrict by method name (regex). |
| `file_pattern` | `string` | ❌ | — | Restrict by file path (regex). |
| `callee_pattern` | `string` | ❌ | — | Restrict to methods that call a callee matching the pattern. |
| `include_external` | `boolean` | ❌ | — | Include external methods (example uses `false`). |
| `limit` | `number` | ❌ | — | Max results (example uses `1000`). |
| `page` | `number` | ❌ | — | Page number (example uses `1`). |
| `page_size` | `number` | ❌ | — | Page size (example uses `100`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"name_pattern": ".*auth.*",
	"file_pattern": "src/.*",
	"callee_pattern": "memcpy|free|malloc",
	"include_external": false,
	"limit": 1000,
	"page": 1,
	"page_size": 100
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"methods": [
		{
			"node_id": "main",
			"name": "123456",
			"fullName": "main",
			"signature": "int main(int,char**)",
			"filename": "src/main.c",
			"lineNumber": 42,
			"isExternal": false
		}
	],
	"total": 1,
	"page": 1,
	"page_size": 100,
	"total_pages": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/code_browsing_tools.py` (`register_code_browsing_tools` → `list_methods`) |
| **Core implementation** | `src/services/code_browsing_service.py` (`CodeBrowsingService.list_methods`) |
| **Tests / usage** | `tests/test_mcp_tools.py`, `tests/integration/test_integration.py` |

---

### 🔹 Tool: `list_calls`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_calls</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists call-sites found in the CPG and returns caller→callee relationships. Supports pagination (<code>page</code>, <code>page_size</code>) over a cached full result set.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `caller_pattern` | `string` | ❌ | — | Restrict by containing method name. |
| `callee_pattern` | `string` | ❌ | — | Restrict by call name. |
| `limit` | `number` | ❌ | — | Max results (example uses `1000`). |
| `page` | `number` | ❌ | — | Page number (example uses `1`). |
| `page_size` | `number` | ❌ | — | Page size (example uses `100`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"caller_pattern": "main",
	"callee_pattern": "strcpy|memcpy",
	"limit": 1000,
	"page": 1,
	"page_size": 100
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"calls": [
		{
			"caller": "main",
			"callee": "printf",
			"code": "printf(\"hi\")",
			"filename": "src/main.c",
			"lineNumber": 10
		}
	],
	"total": 1,
	"page": 1,
	"page_size": 100,
	"total_pages": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/tools/code_browsing_tools.py` (`register_code_browsing_tools` → `list_calls`) |
| **Core implementation** | `src/services/code_browsing_service.py` (`CodeBrowsingService.list_calls`) |
| **Tests / usage** | `tests/integration/test_integration.py` |

---

### 🔹 Tool: `list_parameters`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_parameters</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists parameter metadata for methods in the CPG. Optional <code>method_name</code> filter restricts results to methods whose name matches the provided string/regex (passed through to the underlying CPG query).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `method_name` | `string` | ❌ | — | Filter for method name (string/regex). |
| `limit` | `number` | ❌ | — | Max results (example uses `1000`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"method_name": "main",
	"limit": 1000
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"methods": [
		{
			"method": "main",
			"parameters": [
				{
					"name": "argc",
					"type": "int",
					"index": 1
				},
				{
					"name": "argv",
					"type": "char**",
					"index": 2
				}
			]
		}
	],
	"total": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/services/code_browsing_service.py` (`CodeBrowsingService.list_parameters`) |
| **Docs** | `README.md` (Available Tools → Code Browsing Tools) |

---

### 🔹 Tool: `get_method_source`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_method_source</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves the source code for one or more methods by name (supports regex), optionally disambiguated by a <code>filename</code> substring filter. Uses a CPGQL query to locate <code>method.filename</code>, <code>method.lineNumber</code>, and <code>method.lineNumberEnd</code>, then reads the corresponding file from the codebase source directory to extract the method’s code range.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `method_name` | `string` | ✅ | — | Method name (supports regex). |
| `filename` | `string` | ❌ | — | Optional filename substring filter. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"method_name": "main",
	"filename": "src/main.c"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"methods": [
		{
			"name": "main",
			"filename": "src/main.c",
			"lineNumber": 10,
			"lineNumberEnd": 20,
			"code": "int main() {\n  return 0;\n}\n"
		}
	],
	"total": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py`, `src/tools/core_tools.py` |
| **Tests / usage** | `tests/integration/test_integration.py` |

---

### 🔹 Tool: `get_code_snippet`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_code_snippet</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a raw snippet of source code from <code>filename</code> between <code>start_line</code> and <code>end_line</code> (1-based, inclusive) in the specified codebase. Designed for lightweight file browsing and context extraction.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `filename` | `string` | ✅ | — | Project-relative file path. |
| `start_line` | `number` | ✅ | — | Start line (1-based, inclusive). |
| `end_line` | `number` | ✅ | — | End line (1-based, inclusive). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"filename": "core.c",
	"start_line": 1,
	"end_line": 10
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"code": "#include <stdio.h>\n\nint main(int argc, char** argv) {\n  return 0;\n}\n"
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py` |
| **Tests / usage** | `tests/integration/test_integration.py` |

---

### 🔹 Tool: `get_call_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_call_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Builds a call graph rooted at <code>method_name</code>, traversing up to <code>depth</code> hops. Supports <code>direction</code> (<code>outgoing</code> or <code>incoming</code>). Returns call edges as <code>{from, to, depth}</code> and includes a <code>total</code> edge count.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `method_name` | `string` | ✅ | — | Root method name. |
| `depth` | `number` | ✅ | — | Traversal depth (hops). |
| `direction` | `string` | ✅ | — | `outgoing` or `incoming`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"method_name": "authenticate",
	"depth": 3,
	"direction": "outgoing"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"root_method": "authenticate",
	"direction": "outgoing",
	"calls": [
		{
			"from": "authenticate",
			"to": "validate_password",
			"depth": 1
		},
		{
			"from": "validate_password",
			"to": "hash_password",
			"depth": 2
		}
	],
	"total": 2
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py` |
| **Docs** | `README.md` |

---

### 🔹 Tool: `get_cfg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_cfg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a control-flow graph (CFG) for a given method as node + edge lists. <code>method_name</code> can be a regex pattern; the tool takes the first matching method. The result is truncated when the number of nodes reaches <code>max_nodes</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `method_name` | `string` | ✅ | — | Method name (supports regex). |
| `max_nodes` | `number` | ✅ | — | Max nodes before truncation. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"method_name": "test_func",
	"max_nodes": 100
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"method_name": "test_func",
	"nodes": [
		{
			"id": 1001,
			"code": "if (x > 0)",
			"type": "ControlStructure"
		},
		{
			"id": 1002,
			"code": "return x",
			"type": "Return"
		}
	],
	"edges": [
		{
			"from": 1001,
			"to": 1002
		}
	],
	"total_nodes": 2,
	"total_edges": 1,
	"max_nodes": 100,
	"truncated": false
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py` |
| **Tests / expected shape** | `tests/test_mcp_tools.py` |

---

### 🔹 Tool: `get_type_definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_type_definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves struct/class/type declarations with member fields, based on the CPG’s type information. <code>type_name</code> is treated as a regex pattern; results are limited by <code>limit</code>. Useful for understanding memory layout (e.g., buffer sizes / member types) during security review.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `type_name` | `string` | ✅ | — | Type name (treated as regex). |
| `limit` | `number` | ✅ | — | Max results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"type_name": "Buffer",
	"limit": 10
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"types": [
		{
			"name": "Buffer",
			"fullName": "struct Buffer",
			"filename": "buffer.h",
			"lineNumber": 10,
			"members": [
				{
					"name": "data",
					"type": "char*"
				},
				{
					"name": "size",
					"type": "int"
				}
			]
		}
	],
	"total": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py` |
| **Tests / expected shape** | `tests/test_mcp_tools.py` |

---

### 🔹 Tool: `get_macro_expansion`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_macro_expansion</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Heuristically flags calls that might correspond to macro expansions (or macro-like constructs), using signals like dispatch type and naming conventions. <code>filename</code> is a partial match (project-relative in typical usage); <code>line_number</code> is optional. This is not a definitive macro expansion; it’s a best-effort indicator.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `filename` | `string` | ✅ | — | Partial file path (project-relative typical). |
| `line_number` | `number` | ❌ | — | Optional line number. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"filename": "utils.c",
	"line_number": 42
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"calls": [
		{
			"name": "MAX",
			"code": "MAX(a, b)",
			"lineNumber": 42,
			"filename": "utils.c",
			"dispatch_type": "INLINED",
			"is_macro": true,
			"macro_hints": [
				"INLINED_DISPATCH",
				"ALL_CAPS_NAME"
			]
		},
		{
			"name": "printf",
			"code": "printf(msg)",
			"lineNumber": 43,
			"filename": "utils.c",
			"dispatch_type": "STATIC_DISPATCH",
			"is_macro": false,
			"macro_hints": []
		}
	],
	"total": 2,
	"unique_names": 2,
	"note": "Heuristic detection only. Macros are expanded before CPG analysis."
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py` |
| **Tests / expected shape** | `tests/test_mcp_tools.py` |

---

### 🔹 Tool: `find_taint_sources`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_taint_sources</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Locates likely taint sources (entry points for untrusted data) by searching the CPG for call sites whose function names match configured/default source patterns. Supports an optional <code>filename</code> filter (regex-style match) to restrict results to files whose path contains the provided string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `language` | `string` | ✅ | — | Language selector (e.g., `c`). |
| `source_patterns` | `string[]` | ❌ | — | Source function name patterns. |
| `filename` | `string` | ❌ | — | Optional filename filter. |
| `limit` | `number` | ❌ | — | Max results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"language": "c",
	"source_patterns": ["getenv", "fgets"],
	"filename": "core.c",
	"limit": 10
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"sources": [
		{
			"node_id": 123,
			"name": "getenv",
			"code": "char *s = getenv(\"FOO\")",
			"filename": "core.c",
			"lineNumber": 10,
			"method": "main"
		}
	],
	"total": 1,
	"limit": 10,
	"has_more": false
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Security Analysis` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/taint_analysis_tools.py` |
| **Tests / expected shape** | `tests/test_taint_tools.py` |

---

### 🔹 Tool: `find_taint_sinks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_taint_sinks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Locates likely taint sinks (security-sensitive destinations) by searching the CPG for call sites whose function names match configured/default sink patterns. Supports an optional <code>filename</code> filter (regex-style match) to restrict results to files whose path contains the provided string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `language` | `string` | ✅ | — | Language selector (e.g., `c`). |
| `sink_patterns` | `string[]` | ❌ | — | Sink function name patterns. |
| `filename` | `string` | ❌ | — | Optional filename filter. |
| `limit` | `number` | ❌ | — | Max results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"language": "c",
	"sink_patterns": ["system", "popen"],
	"filename": "core.c",
	"limit": 10
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"sinks": [
		{
			"node_id": 456,
			"name": "system",
			"code": "system(cmd)",
			"filename": "core.c",
			"lineNumber": 42,
			"method": "main"
		}
	],
	"total": 1,
	"limit": 10,
	"has_more": false
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Security Analysis` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/taint_analysis_tools.py` |
| **Tests / expected shape** | `tests/test_taint_tools.py` |

---

### 🔹 Tool: `find_taint_flows`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_taint_flows</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds taint flows from sources to sinks across function boundaries. Supports pattern-based endpoints (<code>source_pattern</code>/<code>sink_pattern</code>) or location-based endpoints (<code>source_location</code>/<code>sink_location</code> in <code>file:line</code> form). The tool selects mode based on provided endpoints.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `source_location` | `string` | ❌ | — | Source endpoint in `file:line` form. |
| `sink_location` | `string` | ❌ | — | Sink endpoint in `file:line` form. |
| `max_depth` | `number` | ❌ | — | Depth (0 = intra-procedural). |
| `max_results` | `number` | ❌ | — | Max results. |
| `timeout` | `number` | ❌ | — | Timeout in seconds. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"source_location": "core.c:10",
	"sink_location": "core.c:42",
	"max_depth": 0,
	"max_results": 10,
	"timeout": 10
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"mode": "forward",
	"flows": [
		{
			"source": {
				"code": "getenv(\"FOO\")",
				"file": "core.c",
				"line": 10
			},
			"sink": {
				"code": "system(cmd)",
				"file": "core.c",
				"line": 42
			},
			"path_length": 1
		}
	],
	"total": 1
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Security Analysis` |
| **Side effects** | None |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Limits** | `max_depth=0` performs intra-procedural checks; `max_depth>=1` attempts inter-procedural bridging. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/taint_analysis_tools.py` |
| **Tests / expected shape** | `tests/test_taint_tools.py` |

---

### 🔹 Tool: `get_variable_flow`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_variable_flow</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes variable dependencies at a specific location. <code>direction="backward"</code> finds definitions/assignments/modifications leading up to the location; <code>direction="forward"</code> finds usage/propagation after the location. <code>location</code> must be <code>filename:line</code> (file typically relative to project root).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `location` | `string` | ✅ | — | Target location as `filename:line`. |
| `variable` | `string` | ✅ | — | Variable name. |
| `direction` | `string` | ✅ | — | `backward` or `forward`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"location": "main.c:50",
	"variable": "len",
	"direction": "backward"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"target": {
		"file": "main.c",
		"line": 50,
		"variable": "len",
		"method": "main"
	},
	"direction": "backward",
	"dependencies": [
		{
			"line": 12,
			"code": "size_t len = 256;",
			"type": "initialization",
			"filename": "main.c"
		},
		{
			"line": 34,
			"code": "len = read(fd, buf, len);",
			"type": "assignment",
			"filename": "main.c"
		}
	],
	"total": 2
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Security Analysis` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/taint_analysis_tools.py` |

---

### 🔹 Tool: `get_program_slice`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_program_slice</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Builds a backward program slice from a specific call site, returning the call plus related dataflow and (optionally) control dependencies. You must provide either a <code>node_id</code> (preferred) or a <code>location</code> string; <code>location</code> supports <code>filename:line</code> or <code>filename:line:call_name</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `node_id` | `string` | ❌ | — | Target call node id (preferred). |
| `location` | `string` | ❌ | — | Target call location string. |
| `include_dataflow` | `boolean` | ❌ | — | Include dataflow edges. |
| `include_control_flow` | `boolean` | ❌ | — | Include control dependencies. |
| `max_depth` | `number` | ❌ | — | Max depth. |
| `timeout` | `number` | ❌ | — | Timeout in seconds. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"location": "core.c:42:memcpy",
	"include_dataflow": true,
	"include_control_flow": true,
	"max_depth": 5,
	"timeout": 60
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"slice": {
		"target_call": {
			"node_id": "12345",
			"name": "memcpy",
			"code": "memcpy(dst, src, len)",
			"filename": "core.c",
			"lineNumber": 42,
			"method": "core.perform_copy",
			"arguments": ["dst", "src", "len"]
		},
		"dataflow": [
			{
				"variable": "len",
				"code": "len = user_controlled_length();",
				"filename": "core.c",
				"lineNumber": 18,
				"method": "core.perform_copy"
			}
		],
		"control_dependencies": [
			{
				"code": "if (len < MAX_BUFFER)",
				"filename": "core.c",
				"lineNumber": 40,
				"method": "core.perform_copy"
			}
		]
	},
	"total_nodes": 3
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Security Analysis` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/taint_analysis_tools.py` |

---

### 🔹 Tool: `find_bounds_checks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_bounds_checks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes a specific buffer access (by <code>filename:line</code>) to determine whether any bounds checks exist near the access. Reports discovered comparison operations involving the index expression/variable and whether checks occur before or after the access.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `codebase_hash` | `string` | ✅ | — | Codebase identifier. |
| `buffer_access_location` | `string` | ✅ | — | Location as `filename:line`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"codebase_hash": "553642871dd4251d",
	"buffer_access_location": "parser.c:3393"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (returned as MCP text content containing a JSON string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"buffer_access": {
		"line": 3393,
		"code": "buffer[index] = 'X'",
		"buffer": "buffer",
		"index": "index"
	},
	"bounds_checks": [
		{
			"line": 3391,
			"code": "if (index >= MAX_BUFFER_SIZE)",
			"checked_variable": "index",
			"bound": "MAX_BUFFER_SIZE",
			"operator": ">=",
			"position": "BEFORE_ACCESS"
		}
	],
	"check_before_access": true,
	"check_after_access": false,
	"index_variable": "index"
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Security Analysis` |
| **Side effects** | None |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Core implementation** | `src/tools/code_browsing_tools.py` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `None documented` |
| **MCP prompts exposed** | `None documented` |
| **Other RPC endpoints** | HTTP MCP endpoint (default): `http://localhost:4242/mcp` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `Not documented` | — | — | — | `Not documented` |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| Dockerfile / Docker Compose | Used to run Joern in Docker (exact filenames/paths not specified in the source report). |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | `Not documented` |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Python 3.10+ (3.13 recommended). |
| 2 | Ensure Docker + Docker Compose are available (required to run Joern). |

### 8.2 Typical Run Commands

```bash
# Not documented in the source report.
# Runtime notes: MCP over HTTP (default http://localhost:4242/mcp); Joern uses Docker ports 2000-2999.
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- Some tools support pagination (`page`, `page_size`) and `limit` to bound result size.
- Some analyses support timeouts (e.g., taint flow and slicing tools).

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `21` |
| **Read-only** | `19` |
| **Write-only** | `0` |
| **Hybrid** | `2` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Analyzed ref / commit URL | Not present in the source report. |
| Env vars, config filenames, run commands | Not documented in the source report beyond high-level runtime notes. |

---

<div align="center">

*— End of Report —*

</div>
