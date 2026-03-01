<div align="center">

# 📋 MCP Server Report

## `ast-mcp-server`
### [`angrysky56/ast-mcp-server`](https://github.com/angrysky56/ast-mcp-server)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/angrysky56/ast-mcp-server` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `cf5550896573caf45fc37822f940d253598382af` |
| **Commit URL** | `https://github.com/angrysky56/ast-mcp-server/commit/cf5550896573caf45fc37822f940d253598382af` |
| **License** | `MIT` |
| **Version** | `0.2.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | AST MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` (schemas are representative examples inferred from source) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `Unknown` |
| **Line/column indexing** | `Unknown` |
| **Encoding model** | `bytes` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` (tool result object) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that parses and analyzes code using tree-sitter/ast-grep and provides AST/ASG/graph tooling.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | `Claude Desktop` |

### 1.3 Primary Capabilities

- [ ] AST parsing and ASG generation
- [ ] Code analysis and pattern search/transform
- [ ] Graph queries and semantic search

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can run local stdio servers. |
| **Documented integrations** | Claude Desktop |
| **Notes / constraints** | Some tree-sitter bindings may be ABI-incompatible depending on local version. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Python, JavaScript, TypeScript, Go, Rust, C, C++, Java |
| **How to extend** | Install/configure tree-sitter language modules. |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python (requires >= 3.12) |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python 3.12+, `mcp[cli]`, tree-sitter + language modules, `ast-grep` CLI, `ast-grep-py`, `typer`, `rich`, `python-dotenv` |
| **External / System** | Neo4j server (optional), OpenRouter API (optional) |
| **Optional** | ChromaDB (semantic search), OpenRouter |
| **Paid services / Tokens** | OpenRouter API key (optional features) |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` (stdio) |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Yes` (e.g., OPENROUTER_API_KEY) |
| **Config files used** | `Yes` (`claude_desktop_config.json` for Claude Desktop setup) |
| **CLI flags used** | `Unknown` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | tree-sitter, ast-grep, Neo4j (optional), ChromaDB (optional) |
| **Architecture notes** | ASG builder + FastMCP tool registration. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `Unknown` |
| `sse` | `Unknown` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `OPENROUTER_API_KEY` (optional features) |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (cached AST/ASG/analysis resources in temp directory) |
| **Uses local cache** | `Yes` (cached AST/ASG/analysis via MCP resources like `ast://{code_hash}`) |
| **Uses external DB** | `Yes` (Neo4j) |
| **Retains user code** | `Yes` (stores derived artifacts; may write analysis outputs to disk; optional Neo4j persistence) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `analyze_and_cache` |
| 2 | `analyze_code` |
| 3 | `analyze_project` |
| 4 | `analyze_source_file` |
| 5 | `ask_uss_agent` |
| 6 | `ast_diff_and_cache` |
| 7 | `diff_ast` |
| 8 | `find_node_at_position` |
| 9 | `generate_and_cache_asg` |
| 10 | `generate_and_cache_enhanced_asg` |
| 11 | `generate_asg` |
| 12 | `generate_enhanced_asg` |
| 13 | `list_transformation_examples` |
| 14 | `parse_and_cache` |
| 15 | `parse_and_cache_incremental` |
| 16 | `parse_to_ast` |
| 17 | `parse_to_ast_incremental` |
| 18 | `query_graph` |
| 19 | `query_neo4j_graph` |
| 20 | `search_code_patterns` |
| 21 | `semantic_search` |
| 22 | `supported_languages` |
| 23 | `sync_file_to_graph` |
| 24 | `transform_code_patterns` |
| 25 | `uss_agent_status` |
| 26 | `validate_ast_pattern` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `parse_to_ast`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_to_ast</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses provided source code (or a file) into a tree-sitter Abstract Syntax Tree represented as JSON.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language query for vector search. |
| `node_type` | `string \| null` | ❌ | — | Optional node type filter (USS schema). |
| `project` | `string \| null` | ❌ | — | Optional project filter. |
| `limit` | `integer` | ❌ | `10` | Maximum number of results to return. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Cypher query to execute in Neo4j. |
| `parameters` | `object \| null` | ❌ | — | Optional parameter bindings for the Cypher query. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to build the enhanced ASG and cache it. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string \| null` | ❌ | — | New/updated source code for incremental parsing. |
| `old_code` | `string \| null` | ❌ | — | Previous version of source code for diffing ranges. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `None` | — | — | — | This tool takes no input parameters. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string \| null` | ❌ | — | Source code to parse when not using `filename`. |
| `language` | `string \| null` | ❌ | — | Language identifier (e.g., `python`, `typescript`) to select parser. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |
| `include_children` | `boolean` | ❌ | `true` | Whether to include child nodes in the returned AST. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": ["string", "null"]},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]},
		"include_children": {"type": "boolean", "default": true}
	}
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `graph_path` | `string` | ✅ | — | Path to a saved USS graph JSON file. |
| `mode` | `string` | ❌ | `summary` | Query mode (`summary`, `node`, `traverse`, `query`). |
| `node_id` | `string \| null` | ❌ | — | Target node id for node/traverse modes. |
| `node_type` | `string \| null` | ❌ | — | Optional node type filter. |
| `edge_types` | `string[] \| null` | ❌ | — | Optional edge type filter list. |
| `depth` | `integer` | ❌ | `3` | Traversal depth for traverse mode. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to search. |
| `pattern` | `string` | ✅ | — | ast-grep pattern to match. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `old_code` | `string` | ✅ | — | Previous version of the source code. |
| `new_code` | `string` | ✅ | — | Updated version of the source code. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string \| null` | ❌ | — | Source code used to build the enhanced ASG. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to parse and cache. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string \| null` | ❌ | — | Source code to analyze into an ASG. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"language": {"type": "string"},
		"ast": {
			"type": "object",
			"properties": {
				"type": {"type": "string"},
				"start_byte": {"type": "integer"},
				"end_byte": {"type": "integer"},
				"start_point": {"type": "object", "properties": {"row": {"type": "integer"}, "column": {"type": "integer"}}},
				"end_point": {"type": "object", "properties": {"row": {"type": "integer"}, "column": {"type": "integer"}}},
				"text": {"type": "string"},
				"children": {"type": "array"}
			}
		},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `generate_asg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_asg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Builds an Abstract Semantic Graph (ASG) from an AST, producing nodes and edges (e.g., <code>contains</code>, plus limited language-specific edges).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language query to route through USS Agent. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to transform. |
| `pattern` | `string` | ✅ | — | ast-grep pattern to match. |
| `replacement` | `string` | ✅ | — | Replacement template applied to each match. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |
| `preview_only` | `boolean` | ❌ | `false` | If true, returns a preview without applying changes. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_name` | `string` | ✅ | — | Name of the project used for output folder naming. |
| `code` | `string \| null` | ❌ | — | Source code to analyze when not using a file path. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |
| `include_summary` | `boolean` | ❌ | `true` | Whether to request and save an LLM summary (OpenRouter). |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `old_code` | `string` | ✅ | — | Previous version of the source code. |
| `new_code` | `string` | ✅ | — | Updated version of the source code. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to analyze into an ASG and cache. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string \| null` | ❌ | — | Source code to analyze. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": ["string", "null"]},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	}
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `None` | — | — | — | This tool takes no input parameters. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | ast-grep pattern to validate. |
| `language` | `string` | ✅ | — | Language identifier used to validate the pattern. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_path` | `string` | ✅ | — | Root directory to scan for source files. |
| `project_name` | `string` | ✅ | — | Name used for output folder naming. |
| `file_extensions` | `string[] \| null` | ❌ | — | Optional list of file extensions to include (e.g., `.py`, `.ts`). |
| `sync_to_db` | `boolean` | ❌ | `true` | Whether to sync each analyzed file into Neo4j. |
| `include_summary` | `boolean` | ❌ | `true` | Whether to request and save an LLM summary (OpenRouter). |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string \| null` | ❌ | — | Source code to inspect when not using `filename`. |
| `line` | `integer` | ❌ | — | 1-based line number of the cursor position. |
| `column` | `integer` | ❌ | — | 0-based or 1-based column at the cursor position (per parser behavior). |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to analyze and cache. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"language": {"type": "string"},
		"nodes": {"type": "array", "items": {"type": "object"}},
		"edges": {"type": "array", "items": {"type": "object"}},
		"root": {"type": "string"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `analyze_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs lightweight structural/complexity analysis on code (functions/classes/imports + metrics like nesting depth and node counts).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `None` | — | — | — | This tool takes no input parameters. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to parse and sync into the graph. |
| `file_path` | `string` | ✅ | — | Full path or identifier used to store the file in Neo4j. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to incrementally parse and cache. |
| `language` | `string \| null` | ❌ | — | Language identifier for parser selection. |
| `filename` | `string \| null` | ❌ | — | Optional filename used for language inference. |
| `code_id` | `string \| null` | ❌ | — | Optional identifier for incremental parsing sessions. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": ["string", "null"]},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	}
}
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
	"type": "object",
	"properties": {
		"language": {"type": "string"},
		"code_length": {"type": "integer"},
		"functions": {"type": "array"},
		"classes": {"type": "array"},
		"imports": {"type": "array"},
		"complexity_metrics": {
			"type": "object",
			"properties": {
				"max_nesting_level": {"type": "integer"},
				"total_nodes": {"type": "integer"}
			}
		},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `supported_languages`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>supported_languages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns the list of languages the server can parse, based on configured language modules / maps.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"type": "object", "properties": {}}
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
	"type": "object",
	"properties": {
		"languages": {"type": "array", "items": {"type": "string"}},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `parse_and_cache`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_and_cache</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses code into an AST and writes a cached AST to local temp storage so it can be retrieved via MCP resources (<code>ast://{code_hash}</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["code"]
}
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
	"type": "object",
	"properties": {
		"ast": {"type": "object"},
		"resource_uri": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes local cache for AST retrieval |

---

### 🔹 Tool: `generate_and_cache_asg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_and_cache_asg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates ASG and caches it for resource access (<code>asg://{code_hash}</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["code"]
}
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
	"type": "object",
	"properties": {
		"asg": {"type": "object"},
		"resource_uri": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes local cache for ASG retrieval |

---

### 🔹 Tool: `analyze_and_cache`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_and_cache</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs code structure analysis and caches the results for resource access (<code>analysis://{code_hash}</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["code"]
}
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
	"type": "object",
	"properties": {
		"analysis": {"type": "object"},
		"resource_uri": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes local cache for analysis retrieval |

---

### 🔹 Tool: `parse_to_ast_incremental`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_to_ast_incremental</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Incremental Tree-sitter parsing variant that can compute changed ranges more efficiently than full reparsing.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": ["string", "null"]},
		"old_code": {"type": ["string", "null"]},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	}
}
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
	"type": "object",
	"properties": {
		"language": {"type": "string"},
		"ast": {"type": "object"},
		"changed_ranges": {"type": ["array", "null"]},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `generate_enhanced_asg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_enhanced_asg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Produces an “enhanced” ASG with improved scope tracking and more complete semantic edges (most thoroughly for Python; partial for JS/TS).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": ["string", "null"]},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	}
}
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
	"type": "object",
	"properties": {
		"language": {"type": "string"},
		"nodes": {"type": "array"},
		"edges": {"type": "array"},
		"root": {"type": "string"},
		"node_lookup": {"type": "object"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `diff_ast`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>diff_ast</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Compares two versions of code and returns an AST-level diff (nodes added/removed/changed) intended to be more meaningful than text diffs.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"old_code": {"type": "string"},
		"new_code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["old_code", "new_code"]
}
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
	"type": "object",
	"properties": {
		"added": {"type": "array"},
		"removed": {"type": "array"},
		"changed": {"type": "array"},
		"language": {"type": ["string", "null"]},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `find_node_at_position`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_node_at_position</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Locates the AST node at a specific cursor position (line/column), useful for editor-like workflows.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": ["string", "null"]},
		"line": {"type": "integer"},
		"column": {"type": "integer"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	}
}
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
	"type": "object",
	"properties": {
		"node": {"type": "object"},
		"path": {"type": "array"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `parse_and_cache_incremental`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_and_cache_incremental</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Incrementally parses code and caches the AST for resource access. Often used to speed up repeated parsing in interactive/editor workflows.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]},
		"code_id": {"type": ["string", "null"]}
	},
	"required": ["code"]
}
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
	"type": "object",
	"properties": {
		"ast": {"type": "object"},
		"resource_uri": {"type": "string"},
		"incremental": {"type": "boolean"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes local cache for AST retrieval |

---

### 🔹 Tool: `generate_and_cache_enhanced_asg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_and_cache_enhanced_asg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates an enhanced ASG and caches it for retrieval using an <code>enhanced_asg://{code_hash}</code> resource.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["code"]
}
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
	"type": "object",
	"properties": {
		"asg": {"type": "object"},
		"resource_uri": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes local cache for enhanced ASG retrieval |

---

### 🔹 Tool: `ast_diff_and_cache`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ast_diff_and_cache</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Produces an AST diff between old/new code and caches the diff for retrieval via a <code>diff://{diff_hash}</code> resource.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"old_code": {"type": "string"},
		"new_code": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["old_code", "new_code"]
}
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
	"type": "object",
	"properties": {
		"diff": {"type": "object"},
		"resource_uri": {"type": "string"},
		"old_uri": {"type": "string"},
		"new_uri": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes local cache for diff retrieval |

---

### 🔹 Tool: `analyze_source_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_source_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes a single source file (AST + ASG + structure analysis) and writes reports to disk; optionally requests an LLM summary via OpenRouter and saves it as <code>summary.txt</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_name": {"type": "string"},
		"code": {"type": ["string", "null"]},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]},
		"include_summary": {"type": "boolean", "default": true}
	},
	"required": ["project_name"]
}
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
	"type": "object",
	"properties": {
		"status": {"type": "string"},
		"project_name": {"type": "string"},
		"language": {"type": "string"},
		"output_folder": {"type": "string"},
		"files_created": {"type": "array", "items": {"type": "string"}},
		"summary": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes analysis outputs to disk; optional remote API call to OpenRouter |

---

### 🔹 Tool: `analyze_project`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_project</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Recursively scans a project directory, runs <code>analyze_source_file</code> per matching file extension, and optionally syncs each file into Neo4j via <code>sync_file_to_graph</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"project_path": {"type": "string"},
		"project_name": {"type": "string"},
		"file_extensions": {"type": ["array", "null"], "items": {"type": "string"}},
		"sync_to_db": {"type": "boolean", "default": true},
		"include_summary": {"type": "boolean", "default": true}
	},
	"required": ["project_path", "project_name"]
}
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
	"type": "object",
	"properties": {
		"processed_files": {"type": "integer"},
		"failed_files": {"type": "integer"},
		"synced_files": {"type": "integer"},
		"failures": {"type": "array"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Reads files; writes reports to disk; optional Neo4j writes |

---

### 🔹 Tool: `sync_file_to_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>sync_file_to_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses code (AST), generates ASG, performs structure analysis, and stores artifacts in Neo4j (nodes/relationships) for later graph queries.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"file_path": {"type": "string"},
		"language": {"type": ["string", "null"]}
	},
	"required": ["code", "file_path"]
}
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
	"type": "object",
	"properties": {
		"file_path": {"type": "string"},
		"status": {"type": "string"},
		"stored": {
			"type": "object",
			"properties": {
				"ast_id": {"type": "string"},
				"asg_id": {"type": "string"},
				"analysis_id": {"type": "string"}
			}
		},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes to Neo4j database |

---

### 🔹 Tool: `query_neo4j_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>query_neo4j_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes a raw Cypher query against the configured Neo4j database and returns result records.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"query": {"type": "string"},
		"parameters": {"type": ["object", "null"]}
	},
	"required": ["query"]
}
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
	"type": "object",
	"properties": {
		"records": {"type": "array", "items": {"type": "object"}},
		"count": {"type": "integer"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `search_code_patterns`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_code_patterns</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs ast-grep structural pattern matching over code and returns match ranges + matched text.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"pattern": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]}
	},
	"required": ["code", "pattern"]
}
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
	"type": "object",
	"properties": {
		"success": {"type": "boolean"},
		"pattern": {"type": "string"},
		"language": {"type": "string"},
		"matches_found": {"type": "integer"},
		"matches": {"type": "array"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `transform_code_patterns`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>transform_code_patterns</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uses ast-grep rewrite to transform code by applying a structural match + replacement. Supports preview-only mode.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"code": {"type": "string"},
		"pattern": {"type": "string"},
		"replacement": {"type": "string"},
		"language": {"type": ["string", "null"]},
		"filename": {"type": ["string", "null"]},
		"preview_only": {"type": "boolean", "default": false}
	},
	"required": ["code", "pattern", "replacement"]
}
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
	"type": "object",
	"properties": {
		"success": {"type": "boolean"},
		"preview_mode": {"type": "boolean"},
		"matches_found": {"type": "integer"},
		"changes_applied": {"type": "integer"},
		"original_code": {"type": "string"},
		"transformed_code": {"type": ["string", "null"]},
		"error_message": {"type": ["string", "null"]},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `validate_ast_pattern`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>validate_ast_pattern</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Validates that an ast-grep pattern is syntactically usable for a given language by running it against minimal sample code.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"pattern": {"type": "string"},
		"language": {"type": "string"}
	},
	"required": ["pattern", "language"]
}
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
	"type": "object",
	"properties": {
		"valid": {"type": "boolean"},
		"pattern": {"type": "string"},
		"language": {"type": "string"},
		"test_matches": {"type": "integer"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `list_transformation_examples`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_transformation_examples</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a curated set of example ast-grep patterns and rewrites for modernization/refactoring.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"type": "object", "properties": {}}
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
	"type": "object",
	"properties": {
		"examples": {"type": "object"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `semantic_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semantic_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs semantic search over indexed USS content using ChromaDB (vector store). Supports optional filters and a result limit.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"query": {"type": "string"},
		"node_type": {"type": ["string", "null"]},
		"project": {"type": ["string", "null"]},
		"limit": {"type": "integer", "default": 10}
	},
	"required": ["query"]
}
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
	"type": "object",
	"properties": {
		"query": {"type": "string"},
		"count": {"type": "integer"},
		"results": {"type": "array"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `query_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>query_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Queries a saved USS <code>UniversalGraph</code> JSON file on disk (summary/node/traverse/query modes).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"graph_path": {"type": "string"},
		"mode": {"type": "string", "default": "summary"},
		"node_id": {"type": ["string", "null"]},
		"node_type": {"type": ["string", "null"]},
		"edge_types": {"type": ["array", "null"], "items": {"type": "string"}},
		"depth": {"type": "integer", "default": 3}
	},
	"required": ["graph_path"]
}
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
	"type": "object",
	"properties": {
		"node_count": {"type": "integer"},
		"edge_count": {"type": "integer"},
		"node_types": {"type": "object"},
		"edge_types": {"type": "object"},
		"nodes": {"type": "array"},
		"paths": {"type": "array"},
		"error": {"type": "string"}
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

---

### 🔹 Tool: `ask_uss_agent`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ask_uss_agent</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Natural language query interface that uses an LLM (OpenRouter) to decide whether to query Neo4j, ChromaDB, or both; executes chosen operations and returns raw results and an LLM summary.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"query": {"type": "string"}
	},
	"required": ["query"]
}
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
	"type": "object",
	"properties": {
		"decision": {"type": "object"},
		"neo4j_result": {"type": ["object", "null"]},
		"chromadb_result": {"type": ["object", "null"]},
		"summary": {"type": "string"},
		"error": {"type": "string"}
	}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | May execute DB reads; may call OpenRouter |

---

### 🔹 Tool: `uss_agent_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>uss_agent_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns operational status for USS Agent dependencies (Neo4j availability/connection, ChromaDB availability, configured model).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{"type": "object", "properties": {}}
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
	"type": "object",
	"properties": {
		"neo4j_available": {"type": "boolean"},
		"neo4j_connected": {"type": "boolean"},
		"chromadb_available": {"type": "boolean"},
		"model": {"type": "string"},
		"error": {"type": "string"}
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

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `ast://{code_hash}`, `asg://{code_hash}`, `analysis://{code_hash}`, `enhanced_asg://{code_hash}`, `diff://{diff_hash}` |
| **MCP prompts exposed** | `None` |
| **Other RPC endpoints** | `None` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `OPENROUTER_API_KEY` | ❌ | 🔒 | — | Enables OpenRouter-backed features (USS agent and summarization). |

---

## 🚀 § 8 — Operational Notes

### 8.2 Typical Run Commands

```bash
uv run server.py
```

---

<div align="center">

*— End of Report —*

</div>
