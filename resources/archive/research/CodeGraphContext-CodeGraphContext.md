<div align="center">

# 📋 MCP Server Report

## `CodeGraphContext`
### [`CodeGraphContext/CodeGraphContext`](https://github.com/CodeGraphContext/CodeGraphContext)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/CodeGraphContext/CodeGraphContext` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `80d6a76a0d9a4564940bd642130588fdad7d3eb5` |
| **Commit URL** | `https://github.com/CodeGraphContext/CodeGraphContext/commit/80d6a76a0d9a4564940bd642130588fdad7d3eb5` |
| **License** | `MIT` |
| **Version** | `0.1.38` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | CodeGraphContext MCP server (full repo) |
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
| **Path model** | `absolute` (tool input paths) |
| **Line/column indexing** | `Unknown` |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[0].text` JSON string (pretty-printed JSON wrapped as text) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that builds and queries a code graph using tree-sitter and graph DB backends (Neo4j/FalkorDB Lite), typically run as a local CLI + local MCP server over stdio (JSON-RPC).*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | VS Code, Cursor, Windsurf, CLI MCP clients |

### 1.3 Primary Capabilities

- [x] Index code into graph DB
- [x] Query graph and analyze relationships
- [x] Watch directories and manage indexed repos

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | MCP clients via local CLI + stdio JSON-RPC. |
| **Documented integrations** | VS Code, Cursor, Windsurf |
| **Notes / constraints** | Requires local graph DB backend. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Python, JavaScript, TypeScript, Java, C/C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin |
| **How to extend** | Add tree-sitter language pack support. |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python 3.10+, tree-sitter, tree-sitter-language-pack, typer, rich, inquirerpy, watchdog, python-dotenv |
| **External / System** | Neo4j (Docker/native) or FalkorDB Lite |
| **Optional** | Docker (for DB) |
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
| **Engine(s)** | tree-sitter + graph DB (Neo4j/FalkorDB Lite) |
| **Architecture notes** | CLI and MCP server share indexing pipeline and graph backends. |

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
| **Writes local files** | `Yes` (may generate a local HTML file for `visualize_graph_query` when using FalkorDB Lite) |
| **Uses local cache** | `Not documented` |
| **Uses external DB** | `Yes` (Neo4j/FalkorDB Lite) |
| **Retains user code** | `Unknown` |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `add_code_to_graph` |
| 2 | `add_package_to_graph` |
| 3 | `analyze_code_relationships` |
| 4 | `calculate_cyclomatic_complexity` |
| 5 | `check_job_status` |
| 6 | `delete_repository` |
| 7 | `execute_cypher_query` |
| 8 | `find_code` |
| 9 | `find_dead_code` |
| 10 | `find_most_complex_functions` |
| 11 | `get_repository_stats` |
| 12 | `list_indexed_repositories` |
| 13 | `list_jobs` |
| 14 | `list_watched_paths` |
| 15 | `load_bundle` |
| 16 | `search_registry_bundles` |
| 17 | `unwatch_directory` |
| 18 | `visualize_graph_query` |
| 19 | `watch_directory` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `JobId` | Background job identifier returned by indexing/watching tools (e.g., `job_id` in `add_code_to_graph`, `watch_directory`, `add_package_to_graph`). |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `ToolOutputTextJSON` | Most tools return JSON, wrapped as pretty-printed JSON inside `result.content[0].text` (per source report). |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | Tool inputs use `absolute` paths (per report). |
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

---

### 🔹 Tool: `add_code_to_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>add_code_to_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>One-time indexing of a local directory/file into the code graph. Runs asynchronously and returns a <code>job_id</code> for tracking.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Path to a local directory or file to index. |
| `is_dependency` | `boolean` | ❌ | `false` | Whether the indexed code should be treated as a dependency. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"path": "string",
	"is_dependency": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC: `result.content[0].text`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"job_id": "string",
	"message": "string",
	"estimated_files": 123,
	"estimated_duration_seconds": 12.34,
	"estimated_duration_human": "0m 12s",
	"instructions": "string"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Indexes/writes nodes/edges into the graph DB asynchronously. |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `check_job_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_job_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns progress and status information for a background indexing job.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `job_id` | `string` | ✅ | — | Job identifier returned by an indexing/watch tool. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "job_id": "string" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"job": {
		"id": "string",
		"status": "running|completed|failed|...",
		"total_files": 123,
		"processed_files": 45,
		"estimated_duration": 12.34,
		"estimated_time_remaining_human": "0m 10s",
		"elapsed_time_human": "0m 02s",
		"start_time": "YYYY-MM-DD HH:MM:SS",
		"end_time": "YYYY-MM-DD HH:MM:SS"
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `list_jobs`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_jobs</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists all known background jobs and their current status.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"jobs": [
		{ "id": "string", "status": "string", "start_time": "YYYY-MM-DD HH:MM:SS" }
	],
	"total_jobs": 1
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `find_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for relevant code snippets related to a keyword or phrase using the indexed graph.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query. |
| `fuzzy_search` | `boolean` | ❌ | `false` | Whether to use fuzzy search. |
| `edit_distance` | `number` | ❌ | `2` | Edit distance to use when fuzzy searching. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"query": "string",
	"fuzzy_search": false,
	"edit_distance": 2
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"query": "string",
	"results": [
		{
			"path": "string",
			"name": "string",
			"code": "string"
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
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `analyze_code_relationships`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_code_relationships</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Relationship/graph queries such as callers/callees, class hierarchy, overrides, call chains, module dependencies, variable scope, etc.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query_type` | `string` | ✅ | — | Query type (e.g., `find_callers`). |
| `target` | `string` | ✅ | — | Target symbol name. |
| `context` | `string` | ❌ | — | Optional context (e.g., file path). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"query_type": "find_callers",
	"target": "some_symbol_name",
	"context": "optional/file/path.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"query_type": "find_callers",
	"target": "some_symbol_name",
	"context": "optional/file/path.py",
	"results": []
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

---

### 🔹 Tool: `watch_directory`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>watch_directory</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Starts watching a directory for changes; may trigger initial indexing if the directory is not already indexed.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Directory path to watch. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "path": "string" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"message": "string",
	"job_id": "string",
	"details": "string"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Starts a long-lived watcher; may start indexing. |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `execute_cypher_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>execute_cypher_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes a <strong>read-only</strong> Cypher query against the code graph. Includes a guard to reject write keywords.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `cypher_query` | `string` | ✅ | — | Cypher query to execute (read-only). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "cypher_query": "MATCH (n) RETURN n LIMIT 10" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"query": "string",
	"record_count": 10,
	"results": [ { "n": {} } ]
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

---

### 🔹 Tool: `add_package_to_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>add_package_to_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Resolves a locally installed package location (language-specific) and indexes it into the graph as a dependency.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `package_name` | `string` | ✅ | — | Package name to index. |
| `language` | `string` | ✅ | — | Package ecosystem/language (e.g., `python`). |
| `is_dependency` | `boolean` | ❌ | — | Whether to treat the package as a dependency. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"package_name": "requests",
	"language": "python",
	"is_dependency": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"job_id": "string",
	"package_name": "string",
	"discovered_path": "string",
	"estimated_files": 123
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Indexes/writes dependency package nodes/edges into the graph DB asynchronously. |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `find_dead_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_dead_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds potentially unused functions (“dead code”), optionally excluding decorated entrypoints (e.g., web routes).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `exclude_decorated_with` | `string[]` | ❌ | — | Decorators to exclude from dead-code detection (e.g., route decorators). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "exclude_decorated_with": ["@app.route"] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"query_type": "dead_code",
	"results": []
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `calculate_cyclomatic_complexity`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>calculate_cyclomatic_complexity</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Calculates cyclomatic complexity for a named function; optional <code>file_path</code> disambiguates.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `function_name` | `string` | ✅ | — | Function name to analyze. |
| `file_path` | `string` | ❌ | — | Optional file path to disambiguate. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"function_name": "process_data",
	"file_path": "/abs/or/project/relative/path.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"function_name": "string",
	"file_path": "string",
	"results": [ { "cyclomatic_complexity": 7 } ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `find_most_complex_functions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_most_complex_functions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns the top-N most complex functions by cyclomatic complexity.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `limit` | `number` | ✅ | — | Max number of functions to return. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "limit": 10 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"limit": 10,
	"results": [
		{ "function_name": "string", "cyclomatic_complexity": 25, "path": "string" }
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `list_indexed_repositories`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_indexed_repositories</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists repositories currently indexed in the graph.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"repositories": [
		{ "name": "string", "path": "string", "is_dependency": false }
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `delete_repository`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>delete_repository</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Deletes all graph data associated with an indexed repository path.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo_path` | `string` | ✅ | — | Repository path whose graph data should be deleted. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "repo_path": "string" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{ "success": true, "message": "string" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Deletes graph DB data for the repository path. |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `visualize_graph_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>visualize_graph_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Produces a URL to visualize query results (Neo4j: HTTP URL to Neo4j Browser; FalkorDB Lite: generates a local HTML file visualization and returns a <code>file://</code> URL).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `cypher_query` | `string` | ✅ | — | Cypher query to visualize. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "cypher_query": "MATCH (n) RETURN n LIMIT 25" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"visualization_url": "string",
	"message": "string"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | May write a local HTML file for visualization depending on DB backend. |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `list_watched_paths`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_watched_paths</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists directories currently watched for live changes.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{ "success": true, "watched_paths": ["string"] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `unwatch_directory`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>unwatch_directory</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Stops watching a directory path for live changes.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Directory path to stop watching. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "path": "string" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{ "success": true, "message": "string" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Modifies watcher state (stops watching). |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `load_bundle`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>load_bundle</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Loads a pre-indexed <code>.cgc</code> bundle into the database, either from local file or by downloading from a registry.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `bundle_name` | `string` | ✅ | — | Bundle name (e.g., a <code>.cgc</code> bundle). |
| `clear_existing` | `boolean` | ❌ | `false` | Whether to clear existing data before loading. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"bundle_name": "flask-main-2579ce9.cgc",
	"clear_existing": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"message": "string",
	"stats": { "files": 123, "functions": 456 }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Loads bundle contents into the graph DB. |
| **Determinism** | `Depends` |
| **Idempotency** | `Unknown` |

---

### 🔹 Tool: `search_registry_bundles`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_registry_bundles</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Queries the bundle registry and returns bundle metadata; can filter by search query and optionally deduplicate by package.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ❌ | — | Search query string. |
| `unique_only` | `boolean` | ❌ | — | Whether to deduplicate by package. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "query": "flask", "unique_only": true }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"bundles": [
		{ "name": "string", "full_name": "string", "repo": "string", "generated_at": "string" }
	],
	"total": 1,
	"query": "flask",
	"unique_only": true
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `get_repository_stats`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_repository_stats</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns counts of indexed repositories/files/functions/classes/modules either globally or for a specific repository path.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo_path` | `string` | ❌ | — | Optional repository path to scope stats. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{ "repo_path": "string" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (wrapped as text in JSON-RPC) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"repository": "string",
	"stats": {
		"files": 123,
		"functions": 456,
		"classes": 78,
		"modules": 90
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

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
| `Not documented` | — | — | — | The source report mentions `python-dotenv` for env handling, but does not enumerate variables. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Not documented` | No config file names/paths are listed in the source report. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | No CLI flags are enumerated in the source report. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Python `3.10+`. |
| 2 | Ensure a graph DB backend is available (Neo4j or FalkorDB Lite). |

### 8.2 Typical Run Commands

```bash
cgc mcp start
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `19` |
| **Read-only** | `12` |
| **Write-only** | `5` |
| **Hybrid** | `2` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Exact env var/config schema | Not documented in the source report. |
| Error model / failure envelopes | Not documented in the source report. |

<div align="center">

*— End of Report —*

</div>
