<div align="center">

# 📋 MCP Server Report

## MCP Tree-sitter Server
### [`wrale/mcp-server-tree-sitter`](https://github.com/wrale/mcp-server-tree-sitter)

</div>

---

> **Report Date:** `2026-02-03`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/wrale/mcp-server-tree-sitter` |
| **Target Path** *(optional)* | `N/A` |
| **Analyzed Ref** *(required)* | `main` |
| **Commit URL** *(optional)* | `N/A` |
| **License** *(required)* | `MIT` |
| **Version** *(optional)* | `0.5.1` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Repository root on `main` (Python MCP server + tools) |
| **Observed in source** *(required)* | `Yes` |
| **Observed in docs** *(required)* | `Yes` |
| **Inferred** *(optional)* | `Yes` — output shapes and limits are inferred from tool signatures and examples |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `relative` to registered project root (absolute paths supported for config files) |
| **Line/column indexing** *(required)* | `0-based` (row/column for AST node lookup) |
| **Encoding model** *(optional)* | `bytes` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `direct JSON` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

MCP Tree-sitter Server is a Python MCP server that exposes tree-sitter–powered code analysis tools for exploring, searching, and understanding codebases. It is designed for AI assistants (with Claude Desktop as the reference client) to access project structure, symbols, and dependencies without running a full language server.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `Claude Desktop` |
| **Documented clients** *(optional)* | Claude Desktop, MCP CLI |

### 1.3 Primary Capabilities *(required)*

- Register projects and enumerate files
- Parse files into ASTs and inspect nodes by position
- Run text search and tree-sitter query searches
- Extract symbols, dependencies, and project structure
- Configure cache, file size limits, and logging

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a full LSP replacement (no live editor integration)
- Does not modify project files (analysis-only)

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.10+ local MCP server using tree-sitter-language-pack. |
| **Documented integrations** *(optional)* | Claude Desktop, MCP CLI |
| **Notes / constraints** *(optional)* | Requires tree-sitter-language-pack and local file system access. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Multiple via tree-sitter-language-pack (Python, JavaScript/TypeScript, Go, Rust, C/C++, Swift, Java, Kotlin, Julia, APL, etc.). |
| **How to extend** *(optional)* | Update or extend tree-sitter-language-pack to add parsers. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Open-source` |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | `mcp[cli]`, `tree-sitter`, `tree-sitter-language-pack`, `pyyaml`, `pydantic`, `types-pyyaml` |
| **External / System** *(optional)* | Python 3.10+ |
| **Optional** *(optional)* | `pytest`, `pytest-cov`, `ruff`, `mypy` (dev) |
| **Paid services / Tokens** *(required)* | `None` |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local process` |
| **Started by MCP client** *(required)* | `Yes` |
| **Started independently** *(optional)* | `Yes` (CLI/server entry point) |
| **Env vars used** *(optional)* | `Yes` (see § 7) |
| **Config files used** *(optional)* | `Yes` (YAML config) |
| **CLI flags used** *(optional)* | `Yes` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP SDK, tree-sitter |
| **Architecture notes** *(optional)* | Project registry + language registry with parse tree cache and query/search tools. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` |
| `http` / `streamable-http` *(optional)* | `No` |
| `sse` *(optional)* | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `No` |
| **Mechanism** *(optional)* | `none` |
| **Secrets / Env vars** *(optional)* | `None` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `No` |
| **Uses local cache** *(optional)* | `Yes` (in-memory parse tree cache) |
| **Uses external DB** *(optional)* | `No` |
| **Retains user code** *(required)* | `Yes` (in-memory AST/cache during runtime) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order.

| # | Tool Name |
|--:|:----------|
| 1 | `adapt_query` |
| 2 | `analyze_complexity` |
| 3 | `analyze_project` |
| 4 | `build_query` |
| 5 | `check_language_available` |
| 6 | `clear_cache` |
| 7 | `configure` |
| 8 | `find_similar_code` |
| 9 | `find_text` |
| 10 | `find_usage` |
| 11 | `get_ast` |
| 12 | `get_dependencies` |
| 13 | `get_file` |
| 14 | `get_file_metadata` |
| 15 | `get_node_at_position` |
| 16 | `get_node_types` |
| 17 | `get_query_template_tool` |
| 18 | `get_symbols` |
| 19 | `list_files` |
| 20 | `list_languages` |
| 21 | `list_projects_tool` |
| 22 | `list_query_templates_tool` |
| 23 | `register_project_tool` |
| 24 | `remove_project_tool` |
| 25 | `run_query` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ProjectName` | Registered project identifier string. |
| `FilePath` | Path relative to project root. |
| `LanguageName` | Tree-sitter language name (e.g., `python`). |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchMatch` | `{ file: string, line: number, text: string, context?: string[] }` |
| `AstNode` | `{ type: string, start: {row: number, column: number}, end: {row: number, column: number}, text?: string }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `relative` to project root with normalization; absolute allowed only for config paths |
| **Rate limits / retries** | Not documented; operations use internal limits |
| **File size limits** | Max file size configured via `security.max_file_size_mb` |
| **Resource constraints** | Search/queries capped by `max_results_default` (default 100) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `ValueError`, `ProjectError` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `adapt_query`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>adapt_query</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Adapts a tree-sitter query from one language to another using built-in heuristics.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Original query string. |
| `from_language` | `string` | ✅ | — | Source language name. |
| `to_language` | `string` | ✅ | — | Target language name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "(function_definition name: (identifier) @name)",
  "from_language": "python",
  "to_language": "javascript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "original_language": "python",
  "target_language": "javascript",
  "original_query": "(function_definition name: (identifier) @name)",
  "adapted_query": "(function_declaration name: (identifier) @name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `adapt_query` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/query_builder.py `adapt_query_for_language()` |

---

### 🔹 Tool: `analyze_complexity`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>analyze_complexity</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Computes code complexity metrics for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "file": "src/main.py",
  "cyclomatic_complexity": 12,
  "function_count": 8
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `analyze_complexity` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `analyze_complexity()` |

---

### 🔹 Tool: `analyze_project`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>analyze_project</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Summarizes project structure, languages, and key files.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `scan_depth` | `integer` | ❌ | `3` | Depth for analysis (higher is slower). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "scan_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_count": 128,
  "languages": ["python", "markdown"],
  "top_directories": ["src", "tests"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `analyze_project` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `analyze_project_structure()` |

---

### 🔹 Tool: `build_query`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>build_query</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Builds a tree-sitter query from templates or custom patterns.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |
| `patterns` | `string[]` | ✅ | — | Template names or raw pattern fragments. |
| `combine` | `string` | ❌ | `"or"` | Combination strategy (`or` or `and`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "patterns": ["functions", "classes"],
  "combine": "or"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "query": "(function_definition name: (identifier) @name) | (class_definition name: (identifier) @name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `build_query` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/query_builder.py `build_compound_query()` |

---

### 🔹 Tool: `check_language_available`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>check_language_available</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Checks if a tree-sitter parser is available for a given language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name to check. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Language 'python' is available via tree-sitter-language-pack"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `check_language_available` |
| **Core implementation** | src/mcp_server_tree_sitter/language/registry.py `is_language_available()` |

---

### 🔹 Tool: `clear_cache`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>clear_cache</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Clears in-memory parse tree caches.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Cache cleared"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Clears cached parse trees |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `clear_cache` |
| **Core implementation** | src/mcp_server_tree_sitter/cache/parser_cache.py `clear()` |

---

### 🔹 Tool: `configure`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>configure</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Updates server configuration values and optionally loads a YAML config file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `config_path` | `string` | ❌ | — | Path to YAML config file. |
| `cache_enabled` | `boolean` | ❌ | — | Enable or disable parse tree caching. |
| `max_file_size_mb` | `integer` | ❌ | — | Maximum file size in MB. |
| `log_level` | `string` | ❌ | — | Logging level (DEBUG, INFO, WARNING, ERROR). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "config_path": "/path/to/config.yaml",
  "cache_enabled": true,
  "max_file_size_mb": 10,
  "log_level": "INFO"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "cache": { "enabled": true, "max_size_mb": 100, "ttl_seconds": 300 },
  "security": { "max_file_size_mb": 10 },
  "language": { "default_max_depth": 5 },
  "log_level": "INFO"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Updates server configuration and cache settings |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `configure` |
| **Core implementation** | src/mcp_server_tree_sitter/config.py `ConfigurationManager` |

---

### 🔹 Tool: `find_similar_code`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>find_similar_code</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Finds code snippets similar to a given file or snippet.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `file_path` | `string` | ✅ | — | File path to compare against. |
| `max_results` | `integer` | ❌ | `5` | Maximum number of similar matches. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py",
  "max_results": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/utils.py", "score": 0.82, "snippet": "def helper(...):" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `find_similar_code` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `find_similar_code()` |

---

### 🔹 Tool: `find_text`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>find_text</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Searches for text patterns across project files.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `pattern` | `string` | ✅ | — | Text pattern to search for. |
| `file_pattern` | `string` | ❌ | — | Glob filter (e.g., `**/*.py`). |
| `max_results` | `integer` | ❌ | `100` | Maximum number of results. |
| `case_sensitive` | `boolean` | ❌ | `false` | Case-sensitive matching. |
| `whole_word` | `boolean` | ❌ | `false` | Whole-word matching. |
| `use_regex` | `boolean` | ❌ | `false` | Treat pattern as regex. |
| `context_lines` | `integer` | ❌ | `2` | Context lines to include. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "pattern": "function",
  "file_pattern": "**/*.py",
  "max_results": 50
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/main.py", "line": 12, "text": "def function_name():" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `find_text` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/search.py `search_text()` |

---

### 🔹 Tool: `find_usage`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>find_usage</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Finds usages of a symbol across a project.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `symbol` | `string` | ✅ | — | Symbol name to search for. |
| `file_pattern` | `string` | ❌ | — | Optional file filter. |
| `max_results` | `integer` | ❌ | `100` | Maximum results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "symbol": "MyClass",
  "file_pattern": "**/*.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/main.py", "line": 42, "text": "MyClass()" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `find_usage` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `find_usage()` |

---

### 🔹 Tool: `get_ast`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_ast</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns a parsed abstract syntax tree for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `max_depth` | `integer` | ❌ | `5` | Maximum AST depth to include. |
| `include_text` | `boolean` | ❌ | `true` | Include node text. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "max_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "type": "module",
  "children": [
    { "type": "function_definition", "name": "main" }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_ast` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/ast_operations.py `get_file_ast()` |

---

### 🔹 Tool: `get_dependencies`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_dependencies</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Extracts dependency information for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `file_path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "imports": ["typing", "os"],
  "local_modules": ["src/utils.py"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_dependencies` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `get_dependencies()` |

---

### 🔹 Tool: `get_file`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_file</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns file content, optionally limited to a range of lines.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `max_lines` | `integer` | ❌ | — | Maximum number of lines to return. |
| `start_line` | `integer` | ❌ | `0` | First line to include (0-based). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "max_lines": 200,
  "start_line": 0
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```text
def main():
    print("hello")
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_file` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/file_operations.py `get_file_content()` |

---

### 🔹 Tool: `get_file_metadata`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_file_metadata</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns size, language, and metadata for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src/main.py",
  "size_bytes": 3142,
  "language": "python",
  "modified_time": "2026-02-03T10:15:00Z"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_file_metadata` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/file_operations.py `get_file_info()` |

---

### 🔹 Tool: `get_node_at_position`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_node_at_position</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns the AST node at a given row/column position.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `row` | `integer` | ✅ | — | 0-based line number. |
| `column` | `integer` | ✅ | — | 0-based column number. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "row": 10,
  "column": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "type": "identifier",
  "start": { "row": 10, "column": 4 },
  "end": { "row": 10, "column": 12 },
  "text": "function"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_node_at_position` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/ast_operations.py `find_node_at_position()` |

---

### 🔹 Tool: `get_node_types`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_node_types</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns descriptions of common AST node types for a language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "function_definition": "A function declaration node",
  "class_definition": "A class declaration node"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_node_types` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/query_builder.py `describe_node_types()` |

---

### 🔹 Tool: `get_query_template_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_query_template_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns a predefined tree-sitter query template for a language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |
| `template_name` | `string` | ✅ | — | Template name (e.g., `functions`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "template_name": "functions"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "name": "functions",
  "query": "(function_definition name: (identifier) @name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_query_template_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/language/query_templates.py `get_query_template()` |

---

### 🔹 Tool: `get_symbols`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_symbols</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Extracts symbols (functions, classes, imports) from a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `file_path` | `string` | ✅ | — | File path relative to project root. |
| `symbol_types` | `string[]` | ❌ | — | Filter to symbol types (functions, classes, imports). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py",
  "symbol_types": ["functions", "classes"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "functions": [{ "name": "main", "line": 1 }],
  "classes": []
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_symbols` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `extract_symbols()` |

---

### 🔹 Tool: `list_files`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_files</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists files in a project with optional filtering.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `pattern` | `string` | ❌ | — | Glob pattern (e.g., `**/*.py`). |
| `max_depth` | `integer` | ❌ | — | Maximum directory depth. |
| `extensions` | `string[]` | ❌ | — | File extensions (no dots). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "pattern": "**/*.py",
  "max_depth": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  "src/main.py",
  "src/utils.py"
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_files` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/file_operations.py `list_project_files()` |

---

### 🔹 Tool: `list_languages`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_languages</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists languages available through tree-sitter-language-pack.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "available": ["python", "javascript", "typescript"],
  "installable": []
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_languages` |
| **Core implementation** | src/mcp_server_tree_sitter/language/registry.py `list_available_languages()` |

---

### 🔹 Tool: `list_projects_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_projects_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists all registered projects.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "name": "my-project", "path": "/path/to/project", "description": "Demo" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_projects_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/models/project.py `ProjectRegistry.list_projects()` |

---

### 🔹 Tool: `list_query_templates_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_query_templates_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists available query templates, optionally filtered by language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ❌ | — | Language name to filter by. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "templates": ["functions", "classes", "imports"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_query_templates_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/language/query_templates.py `list_query_templates()` |

---

### 🔹 Tool: `register_project_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>register_project_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Registers a project directory for analysis.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Path to project directory. |
| `name` | `string` | ❌ | — | Project name (defaults to directory name). |
| `description` | `string` | ❌ | — | Optional description. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "/path/to/project",
  "name": "my-project",
  "description": "Demo project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "my-project",
  "path": "/path/to/project",
  "languages": ["python", "markdown"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Registers project and scans files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `register_project_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/models/project.py `ProjectRegistry.register_project()` |

---

### 🔹 Tool: `remove_project_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>remove_project_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Removes a registered project.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Project name to remove. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "my-project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Project 'my-project' removed"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Removes project from registry |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `remove_project_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/models/project.py `ProjectRegistry.remove_project()` |

---

### 🔹 Tool: `run_query`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>run_query</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Runs a tree-sitter query against project files.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `query` | `string` | ✅ | — | Tree-sitter query string. |
| `file_path` | `string` | ❌ | — | Optional file path to search. |
| `language` | `string` | ❌ | — | Language name (required if `file_path` omitted). |
| `max_results` | `integer` | ❌ | `100` | Maximum results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "query": "(function_definition name: (identifier) @name)",
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/main.py", "captures": { "name": "main" } }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `run_query` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/search.py `query_code()` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `project://{project}/files`, `project://{project}/files/{pattern}`, `project://{project}/file/{path}`, `project://{project}/file/{path}/lines/{start}-{end}`, `project://{project}/ast/{path}`, `project://{project}/ast/{path}/depth/{depth}` |
| **MCP prompts exposed** *(optional)* | `code_review`, `explain_code`, `explain_tree_sitter_query`, `suggest_improvements`, `project_overview` |
| **Other RPC endpoints** *(optional)* | `None` |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `MCP_TS_LOG_LEVEL` | ❌ | — | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR). |
| `MCP_TS_CACHE_MAX_SIZE_MB` | ❌ | — | `100` | Cache size in MB. |
| `MCP_TS_CONFIG_PATH` | ❌ | — | — | Path to YAML configuration file. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `~/.config/tree-sitter/config.yaml` | Default YAML configuration file. |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--config` | Load configuration from a YAML file. |
| `--debug` | Enable debug logging. |
| `--disable-cache` | Disable parse tree caching. |
| `--help` | Show help. |
| `--version` | Show version. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `pip install mcp-server-tree-sitter` |
| 2 | `pip install -e ".[dev,languages]"` (development) |

### 8.2 Typical Run Commands *(optional)*

```bash
# Run via MCP CLI
python -m mcp run mcp_server_tree_sitter.server

# Run using installed script
mcp-server-tree-sitter
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging to stdout/stderr; controlled by `MCP_TS_LOG_LEVEL` |
| **Tracing / Metrics** | `None` |

### 8.4 Performance Considerations *(optional)*

- Parse tree caching improves repeated analysis of the same files.
- Large files are limited by `security.max_file_size_mb` and may be skipped.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `25` |
| **Read-only** | `21` |
| **Write-only** | `4` |
| **Hybrid** | `0` |

---

<div align="center">

*— End of Report —*

</div><div align="center">

# 📋 MCP Server Report

## MCP Tree-sitter Server
### [`wrale/mcp-server-tree-sitter`](https://github.com/wrale/mcp-server-tree-sitter)

</div>

---

> **Report Date:** `2026-02-03`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/wrale/mcp-server-tree-sitter` |
| **Target Path** *(optional)* | `N/A` |
| **Analyzed Ref** *(required)* | `main` |
| **Commit URL** *(optional)* | `N/A` |
| **License** *(required)* | `MIT` |
| **Version** *(optional)* | `0.5.1` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Repository root on `main` (Python MCP server + tools) |
| **Observed in source** *(required)* | `Yes` |
| **Observed in docs** *(required)* | `Yes` |
| **Inferred** *(optional)* | `Yes` — output shapes and limits are inferred from tool signatures and examples |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `relative` to registered project root (absolute paths supported for config files) |
| **Line/column indexing** *(required)* | `0-based` (row/column for AST node lookup) |
| **Encoding model** *(optional)* | `bytes` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `direct JSON` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

MCP Tree-sitter Server is a Python MCP server that exposes tree-sitter–powered code analysis tools for exploring, searching, and understanding codebases. It is designed for AI assistants (with Claude Desktop as the reference client) to access project structure, symbols, and dependencies without running a full language server.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `Claude Desktop` |
| **Documented clients** *(optional)* | Claude Desktop, MCP CLI |

### 1.3 Primary Capabilities *(required)*

- Register projects and enumerate files
- Parse files into ASTs and inspect nodes by position
- Run text search and tree-sitter query searches
- Extract symbols, dependencies, and project structure
- Configure cache, file size limits, and logging

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a full LSP replacement (no live editor integration)
- Does not modify project files (analysis-only)

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.10+ local MCP server using tree-sitter-language-pack. |
| **Documented integrations** *(optional)* | Claude Desktop, MCP CLI |
| **Notes / constraints** *(optional)* | Requires tree-sitter-language-pack and local file system access. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Multiple via tree-sitter-language-pack (Python, JavaScript/TypeScript, Go, Rust, C/C++, Swift, Java, Kotlin, Julia, APL, etc.). |
| **How to extend** *(optional)* | Update or extend tree-sitter-language-pack to add parsers. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Open-source` |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | `mcp[cli]`, `tree-sitter`, `tree-sitter-language-pack`, `pyyaml`, `pydantic`, `types-pyyaml` |
| **External / System** *(optional)* | Python 3.10+ |
| **Optional** *(optional)* | `pytest`, `pytest-cov`, `ruff`, `mypy` (dev) |
| **Paid services / Tokens** *(required)* | `None` |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local process` |
| **Started by MCP client** *(required)* | `Yes` |
| **Started independently** *(optional)* | `Yes` (CLI/server entry point) |
| **Env vars used** *(optional)* | `Yes` (see § 7) |
| **Config files used** *(optional)* | `Yes` (YAML config) |
| **CLI flags used** *(optional)* | `Yes` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP SDK, tree-sitter |
| **Architecture notes** *(optional)* | Project registry + language registry with parse tree cache and query/search tools. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` |
| `http` / `streamable-http` *(optional)* | `No` |
| `sse` *(optional)* | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `No` |
| **Mechanism** *(optional)* | `none` |
| **Secrets / Env vars** *(optional)* | `None` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `No` |
| **Uses local cache** *(optional)* | `Yes` (in-memory parse tree cache) |
| **Uses external DB** *(optional)* | `No` |
| **Retains user code** *(required)* | `Yes` (in-memory AST/cache during runtime) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order.

| # | Tool Name |
|--:|:----------|
| 1 | `adapt_query` |
| 2 | `analyze_complexity` |
| 3 | `analyze_project` |
| 4 | `build_query` |
| 5 | `check_language_available` |
| 6 | `clear_cache` |
| 7 | `configure` |
| 8 | `find_similar_code` |
| 9 | `find_text` |
| 10 | `find_usage` |
| 11 | `get_ast` |
| 12 | `get_dependencies` |
| 13 | `get_file` |
| 14 | `get_file_metadata` |
| 15 | `get_node_at_position` |
| 16 | `get_node_types` |
| 17 | `get_query_template_tool` |
| 18 | `get_symbols` |
| 19 | `list_files` |
| 20 | `list_languages` |
| 21 | `list_projects_tool` |
| 22 | `list_query_templates_tool` |
| 23 | `register_project_tool` |
| 24 | `remove_project_tool` |
| 25 | `run_query` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ProjectName` | Registered project identifier string. |
| `FilePath` | Path relative to project root. |
| `LanguageName` | Tree-sitter language name (e.g., `python`). |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchMatch` | `{ file: string, line: number, text: string, context?: string[] }` |
| `AstNode` | `{ type: string, start: {row: number, column: number}, end: {row: number, column: number}, text?: string }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `relative` to project root with normalization; absolute allowed only for config paths |
| **Rate limits / retries** | Not documented; operations use internal limits |
| **File size limits** | Max file size configured via `security.max_file_size_mb` |
| **Resource constraints** | Search/queries capped by `max_results_default` (default 100) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `ValueError`, `ProjectError` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `adapt_query`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>adapt_query</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Adapts a tree-sitter query from one language to another using built-in heuristics.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Original query string. |
| `from_language` | `string` | ✅ | — | Source language name. |
| `to_language` | `string` | ✅ | — | Target language name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "(function_definition name: (identifier) @name)",
  "from_language": "python",
  "to_language": "javascript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "original_language": "python",
  "target_language": "javascript",
  "original_query": "(function_definition name: (identifier) @name)",
  "adapted_query": "(function_declaration name: (identifier) @name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `adapt_query` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/query_builder.py `adapt_query_for_language()` |

---

### 🔹 Tool: `analyze_complexity`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>analyze_complexity</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Computes code complexity metrics for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "file": "src/main.py",
  "cyclomatic_complexity": 12,
  "function_count": 8
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `analyze_complexity` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `analyze_complexity()` |

---

### 🔹 Tool: `analyze_project`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>analyze_project</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Summarizes project structure, languages, and key files.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `scan_depth` | `integer` | ❌ | `3` | Depth for analysis (higher is slower). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "scan_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_count": 128,
  "languages": ["python", "markdown"],
  "top_directories": ["src", "tests"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `analyze_project` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `analyze_project_structure()` |

---

### 🔹 Tool: `build_query`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>build_query</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Builds a tree-sitter query from templates or custom patterns.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |
| `patterns` | `string[]` | ✅ | — | Template names or raw pattern fragments. |
| `combine` | `string` | ❌ | `"or"` | Combination strategy (`or` or `and`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "patterns": ["functions", "classes"],
  "combine": "or"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "query": "(function_definition name: (identifier) @name) | (class_definition name: (identifier) @name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `build_query` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/query_builder.py `build_compound_query()` |

---

### 🔹 Tool: `check_language_available`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>check_language_available</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Checks if a tree-sitter parser is available for a given language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name to check. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Language 'python' is available via tree-sitter-language-pack"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `check_language_available` |
| **Core implementation** | src/mcp_server_tree_sitter/language/registry.py `is_language_available()` |

---

### 🔹 Tool: `clear_cache`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>clear_cache</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Clears in-memory parse tree caches.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Cache cleared"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Clears cached parse trees |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `clear_cache` |
| **Core implementation** | src/mcp_server_tree_sitter/cache/parser_cache.py `clear()` |

---

### 🔹 Tool: `configure`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>configure</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Updates server configuration values and optionally loads a YAML config file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `config_path` | `string` | ❌ | — | Path to YAML config file. |
| `cache_enabled` | `boolean` | ❌ | — | Enable or disable parse tree caching. |
| `max_file_size_mb` | `integer` | ❌ | — | Maximum file size in MB. |
| `log_level` | `string` | ❌ | — | Logging level (DEBUG, INFO, WARNING, ERROR). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "config_path": "/path/to/config.yaml",
  "cache_enabled": true,
  "max_file_size_mb": 10,
  "log_level": "INFO"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "cache": { "enabled": true, "max_size_mb": 100, "ttl_seconds": 300 },
  "security": { "max_file_size_mb": 10 },
  "language": { "default_max_depth": 5 },
  "log_level": "INFO"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Updates server configuration and cache settings |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `configure` |
| **Core implementation** | src/mcp_server_tree_sitter/config.py `ConfigurationManager` |

---

### 🔹 Tool: `find_similar_code`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>find_similar_code</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Finds code snippets similar to a given file or snippet.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `file_path` | `string` | ✅ | — | File path to compare against. |
| `max_results` | `integer` | ❌ | `5` | Maximum number of similar matches. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py",
  "max_results": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/utils.py", "score": 0.82, "snippet": "def helper(...):" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `find_similar_code` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `find_similar_code()` |

---

### 🔹 Tool: `find_text`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>find_text</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Searches for text patterns across project files.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `pattern` | `string` | ✅ | — | Text pattern to search for. |
| `file_pattern` | `string` | ❌ | — | Glob filter (e.g., `**/*.py`). |
| `max_results` | `integer` | ❌ | `100` | Maximum number of results. |
| `case_sensitive` | `boolean` | ❌ | `false` | Case-sensitive matching. |
| `whole_word` | `boolean` | ❌ | `false` | Whole-word matching. |
| `use_regex` | `boolean` | ❌ | `false` | Treat pattern as regex. |
| `context_lines` | `integer` | ❌ | `2` | Context lines to include. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "pattern": "function",
  "file_pattern": "**/*.py",
  "max_results": 50
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/main.py", "line": 12, "text": "def function_name():" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `find_text` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/search.py `search_text()` |

---

### 🔹 Tool: `find_usage`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>find_usage</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Finds usages of a symbol across a project.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `symbol` | `string` | ✅ | — | Symbol name to search for. |
| `file_pattern` | `string` | ❌ | — | Optional file filter. |
| `max_results` | `integer` | ❌ | `100` | Maximum results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "symbol": "MyClass",
  "file_pattern": "**/*.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/main.py", "line": 42, "text": "MyClass()" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `find_usage` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `find_usage()` |

---

### 🔹 Tool: `get_ast`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_ast</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns a parsed abstract syntax tree for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `max_depth` | `integer` | ❌ | `5` | Maximum AST depth to include. |
| `include_text` | `boolean` | ❌ | `true` | Include node text. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "max_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "type": "module",
  "children": [
    { "type": "function_definition", "name": "main" }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_ast` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/ast_operations.py `get_file_ast()` |

---

### 🔹 Tool: `get_dependencies`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_dependencies</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Extracts dependency information for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `file_path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "imports": ["typing", "os"],
  "local_modules": ["src/utils.py"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_dependencies` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `get_dependencies()` |

---

### 🔹 Tool: `get_file`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_file</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns file content, optionally limited to a range of lines.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `max_lines` | `integer` | ❌ | — | Maximum number of lines to return. |
| `start_line` | `integer` | ❌ | `0` | First line to include (0-based). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "max_lines": 200,
  "start_line": 0
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```text
def main():
    print("hello")
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_file` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/file_operations.py `get_file_content()` |

---

### 🔹 Tool: `get_file_metadata`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_file_metadata</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns size, language, and metadata for a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src/main.py",
  "size_bytes": 3142,
  "language": "python",
  "modified_time": "2026-02-03T10:15:00Z"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_file_metadata` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/file_operations.py `get_file_info()` |

---

### 🔹 Tool: `get_node_at_position`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_node_at_position</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns the AST node at a given row/column position.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `row` | `integer` | ✅ | — | 0-based line number. |
| `column` | `integer` | ✅ | — | 0-based column number. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "row": 10,
  "column": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "type": "identifier",
  "start": { "row": 10, "column": 4 },
  "end": { "row": 10, "column": 12 },
  "text": "function"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_node_at_position` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/ast_operations.py `find_node_at_position()` |

---

### 🔹 Tool: `get_node_types`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_node_types</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns descriptions of common AST node types for a language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "function_definition": "A function declaration node",
  "class_definition": "A class declaration node"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_node_types` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/query_builder.py `describe_node_types()` |

---

### 🔹 Tool: `get_query_template_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_query_template_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Returns a predefined tree-sitter query template for a language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |
| `template_name` | `string` | ✅ | — | Template name (e.g., `functions`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "template_name": "functions"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "name": "functions",
  "query": "(function_definition name: (identifier) @name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_query_template_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/language/query_templates.py `get_query_template()` |

---

### 🔹 Tool: `get_symbols`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>get_symbols</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Extracts symbols (functions, classes, imports) from a file.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `file_path` | `string` | ✅ | — | File path relative to project root. |
| `symbol_types` | `string[]` | ❌ | — | Filter to symbol types (functions, classes, imports). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py",
  "symbol_types": ["functions", "classes"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "functions": [{ "name": "main", "line": 1 }],
  "classes": []
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `get_symbols` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/analysis.py `extract_symbols()` |

---

### 🔹 Tool: `list_files`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_files</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists files in a project with optional filtering.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `pattern` | `string` | ❌ | — | Glob pattern (e.g., `**/*.py`). |
| `max_depth` | `integer` | ❌ | — | Maximum directory depth. |
| `extensions` | `string[]` | ❌ | — | File extensions (no dots). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "pattern": "**/*.py",
  "max_depth": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  "src/main.py",
  "src/utils.py"
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_files` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/file_operations.py `list_project_files()` |

---

### 🔹 Tool: `list_languages`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_languages</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists languages available through tree-sitter-language-pack.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "available": ["python", "javascript", "typescript"],
  "installable": []
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_languages` |
| **Core implementation** | src/mcp_server_tree_sitter/language/registry.py `list_available_languages()` |

---

### 🔹 Tool: `list_projects_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_projects_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists all registered projects.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "name": "my-project", "path": "/path/to/project", "description": "Demo" }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_projects_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/models/project.py `ProjectRegistry.list_projects()` |

---

### 🔹 Tool: `list_query_templates_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>list_query_templates_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Lists available query templates, optionally filtered by language.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ❌ | — | Language name to filter by. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "templates": ["functions", "classes", "imports"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `list_query_templates_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/language/query_templates.py `list_query_templates()` |

---

### 🔹 Tool: `register_project_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>register_project_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Registers a project directory for analysis.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Path to project directory. |
| `name` | `string` | ❌ | — | Project name (defaults to directory name). |
| `description` | `string` | ❌ | — | Optional description. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "/path/to/project",
  "name": "my-project",
  "description": "Demo project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "my-project",
  "path": "/path/to/project",
  "languages": ["python", "markdown"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Registers project and scans files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `register_project_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/models/project.py `ProjectRegistry.register_project()` |

---

### 🔹 Tool: `remove_project_tool`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>remove_project_tool</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Removes a registered project.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Project name to remove. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "my-project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Project 'my-project' removed"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Write Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Removes project from registry |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `remove_project_tool` |
| **Core implementation** | src/mcp_server_tree_sitter/models/project.py `ProjectRegistry.remove_project()` |

---

### 🔹 Tool: `run_query`

<table>
<tr><td width="150"><strong>Name</strong> <em>(required)</em></td><td><code>run_query</code></td></tr>
<tr><td><strong>Description</strong> <em>(required)</em></td><td>Runs a tree-sitter query against project files.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name. |
| `query` | `string` | ✅ | — | Tree-sitter query string. |
| `file_path` | `string` | ❌ | — | Optional file path to search. |
| `language` | `string` | ❌ | — | Language name (required if `file_path` omitted). |
| `max_results` | `integer` | ❌ | `100` | Maximum results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "query": "(function_definition name: (identifier) @name)",
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  { "file": "src/main.py", "captures": { "name": "main" } }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_server_tree_sitter/tools/registration.py `run_query` |
| **Core implementation** | src/mcp_server_tree_sitter/tools/search.py `query_code()` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `project://{project}/files`, `project://{project}/files/{pattern}`, `project://{project}/file/{path}`, `project://{project}/file/{path}/lines/{start}-{end}`, `project://{project}/ast/{path}`, `project://{project}/ast/{path}/depth/{depth}` |
| **MCP prompts exposed** *(optional)* | `code_review`, `explain_code`, `explain_tree_sitter_query`, `suggest_improvements`, `project_overview` |
| **Other RPC endpoints** *(optional)* | `None` |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `MCP_TS_LOG_LEVEL` | ❌ | — | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR). |
| `MCP_TS_CACHE_MAX_SIZE_MB` | ❌ | — | `100` | Cache size in MB. |
| `MCP_TS_CONFIG_PATH` | ❌ | — | — | Path to YAML configuration file. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `~/.config/tree-sitter/config.yaml` | Default YAML configuration file. |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--config` | Load configuration from a YAML file. |
| `--debug` | Enable debug logging. |
| `--disable-cache` | Disable parse tree caching. |
| `--help` | Show help. |
| `--version` | Show version. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `pip install mcp-server-tree-sitter` |
| 2 | `pip install -e ".[dev,languages]"` (development) |

### 8.2 Typical Run Commands *(optional)*

```bash
# Run via MCP CLI
python -m mcp run mcp_server_tree_sitter.server

# Run using installed script
mcp-server-tree-sitter
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging to stdout/stderr; controlled by `MCP_TS_LOG_LEVEL` |
| **Tracing / Metrics** | `None` |

### 8.4 Performance Considerations *(optional)*

- Parse tree caching improves repeated analysis of the same files.
- Large files are limited by `security.max_file_size_mb` and may be skipped.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `25` |
| **Read-only** | `21` |
| **Write-only** | `4` |
| **Hybrid** | `0` |

---

<div align="center">

*— End of Report —*

</div><div align="center">

# 📋 MCP Server Report

## MCP Tree-sitter Server
### [wrale/mcp-server-tree-sitter](https://github.com/wrale/mcp-server-tree-sitter)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/wrale/mcp-server-tree-sitter |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | a10571771f509d60ffff33752d97689bf18dd893 |
| **Commit URL** *(optional)* | https://github.com/wrale/mcp-server-tree-sitter/commit/a10571771f509d60ffff33752d97689bf18dd893 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 0.5.1 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Repository root at commit a10571771f509d60ffff33752d97689bf18dd893 |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — platform compatibility and runtime defaults derived from README and config defaults |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | relative to registered project root |
| **Line/column indexing** *(required)* | 0-based |
| **Encoding model** *(optional)* | bytes |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | direct JSON |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

The MCP Tree-sitter Server is a Model Context Protocol server that exposes tree-sitter powered code analysis to AI assistants. It provides project registration, file access, AST inspection, search/query execution, and higher-level analyses such as symbols, dependencies, and complexity. The server targets Claude Desktop but works with any MCP client.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Claude Desktop |
| **Documented clients** *(optional)* | Claude Desktop, MCP CLI |

### 1.3 Primary Capabilities *(required)*

- Project registration with persistent in-memory state
- File listing, file content retrieval, and file metadata lookup
- AST extraction, node lookup, and query-based search
- Symbol, dependency, complexity, and usage analysis

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a source code editor or refactoring engine
- Does not provide network-based transports or auth mechanisms

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs wherever Python 3.10+ and tree-sitter parsers are available. |
| **Documented integrations** *(optional)* | Claude Desktop, MCP CLI |
| **Notes / constraints** *(optional)* | Requires language parsers via tree-sitter-language-pack. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python, JavaScript, TypeScript, Go, Rust, C, C++, Swift, Java, Kotlin, Julia, APL, plus additional languages via tree-sitter-language-pack |
| **How to extend** *(optional)* | Install or enable additional parsers via tree-sitter-language-pack. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | mcp[cli] >= 0.12.0, tree-sitter >= 0.20.0, tree-sitter-language-pack >= 0.6.1, pyyaml >= 6.0, pydantic >= 2.0.0, types-pyyaml >= 6.0.12.20241230 |
| **External / System** *(optional)* | None |
| **Optional** *(optional)* | pytest, pytest-cov, ruff, mypy (dev) |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes |
| **Env vars used** *(optional)* | Yes (see § 7.1) |
| **Config files used** *(optional)* | Yes (YAML config) |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | tree-sitter, tree-sitter-language-pack |
| **Architecture notes** *(optional)* | Dependency injection container, in-memory project registry, parse tree cache, query templates. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | No |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | No |
| **Uses local cache** *(optional)* | Yes (in-memory parse tree cache) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes — retained in memory for the running server session only |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `adapt_query` |
| 2 | `analyze_complexity` |
| 3 | `analyze_project` |
| 4 | `build_query` |
| 5 | `check_language_available` |
| 6 | `clear_cache` |
| 7 | `configure` |
| 8 | `diagnose_config` |
| 9 | `find_similar_code` |
| 10 | `find_text` |
| 11 | `find_usage` |
| 12 | `get_ast` |
| 13 | `get_dependencies` |
| 14 | `get_file` |
| 15 | `get_file_metadata` |
| 16 | `get_node_at_position` |
| 17 | `get_node_types` |
| 18 | `get_query_template_tool` |
| 19 | `get_symbols` |
| 20 | `list_files` |
| 21 | `list_languages` |
| 22 | `list_projects_tool` |
| 23 | `list_query_templates_tool` |
| 24 | `register_project_tool` |
| 25 | `remove_project_tool` |
| 26 | `run_query` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `adapt_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>adapt_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Adapt a tree-sitter query from one language to another.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Original query string. |
| `from_language` | `string` | ✅ | — | Source language name. |
| `to_language` | `string` | ✅ | — | Target language name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "(function_definition name: (identifier) @function.name)",
  "from_language": "python",
  "to_language": "javascript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "original_language": "python",
  "target_language": "javascript",
  "original_query": "(function_definition name: (identifier) @function.name)",
  "adapted_query": "(function_declaration name: (identifier) @function.name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `analyze_complexity`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_complexity</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Compute code complexity metrics for a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `file_path` | `string` | ✅ | — | Path to file in project. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "file_path": "src/main.py",
  "cyclomatic_complexity": 7,
  "line_count": 120,
  "function_count": 4
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `analyze_project`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_project</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze overall project structure and summarize key files, languages, and entry points.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `scan_depth` | `number` | ❌ | `3` | Depth for detailed analysis. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "scan_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "languages": {
    "python": 42,
    "javascript": 5
  },
  "entry_points": [
    {
      "path": "src/main.py",
      "language": "python"
    }
  ],
  "build_files": [
    {
      "path": "pyproject.toml",
      "type": "python"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `build_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>build_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Build a tree-sitter query from templates or custom patterns.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |
| `patterns` | `string[]` | ✅ | — | Template names or pattern strings. |
| `combine` | `string` | ❌ | `"or"` | How to combine patterns (`or` or `and`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "patterns": ["functions", "classes"],
  "combine": "or"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "query": "(function_definition name: (identifier) @function.name) | (class_definition name: (identifier) @class.name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `check_language_available`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_language_available</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Check whether a tree-sitter language parser is available.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name to check. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Language 'python' is available via tree-sitter-language-pack"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `clear_cache`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>clear_cache</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Clear parse tree caches globally or for a specific project.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ❌ | — | Optional project name to clear cache for. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Cache cleared"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Clears in-memory parse tree caches |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `configure`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>configure</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Update server configuration such as cache settings, file size limits, and log level.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `config_path` | `string` | ❌ | — | Path to YAML config file. |
| `cache_enabled` | `boolean` | ❌ | — | Enable/disable parse tree caching. |
| `max_file_size_mb` | `number` | ❌ | — | Max file size in MB. |
| `log_level` | `string` | ❌ | — | Logging level (DEBUG, INFO, WARNING, ERROR). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "config_path": "/path/to/config.yaml",
  "cache_enabled": true,
  "max_file_size_mb": 10,
  "log_level": "INFO"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "cache": {
    "enabled": true,
    "max_size_mb": 100
  },
  "security": {
    "max_file_size_mb": 5
  },
  "language": {
    "default_max_depth": 5
  },
  "log_level": "INFO",
  "max_results_default": 100
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Updates in-memory configuration and cache settings |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `diagnose_config`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>diagnose_config</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Run diagnostics on YAML configuration loading.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `config_path` | `string` | ✅ | — | Path to YAML config file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "config_path": "/path/to/config.yaml"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "issues": [],
  "loaded": true
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `find_similar_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_similar_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find similar code snippets in a project for a given snippet.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `snippet` | `string` | ✅ | — | Code snippet to compare. |
| `language` | `string` | ✅ | — | Language of the snippet. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "snippet": "print('Hello, world!')",
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "matches": [
    {
      "file": "src/utils.py",
      "score": 0.82,
      "start_line": 10,
      "end_line": 12
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `find_text`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_text</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search for a text pattern in project files with filtering options.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `pattern` | `string` | ✅ | — | Text pattern to search for. |
| `file_pattern` | `string` | ❌ | — | Optional glob pattern (e.g., "**/*.py"). |
| `max_results` | `number` | ❌ | `100` | Maximum number of results. |
| `case_sensitive` | `boolean` | ❌ | `false` | Case-sensitive matching. |
| `whole_word` | `boolean` | ❌ | `false` | Whole-word matching. |
| `use_regex` | `boolean` | ❌ | `false` | Treat pattern as regex. |
| `context_lines` | `number` | ❌ | `2` | Number of context lines to include. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "pattern": "TODO",
  "file_pattern": "**/*.py",
  "max_results": 20,
  "case_sensitive": false,
  "whole_word": false,
  "use_regex": false,
  "context_lines": 2
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  {
    "file": "src/main.py",
    "line": 12,
    "text": "# TODO: improve error handling",
    "context": ["def handler():", "# TODO: improve error handling", "return True"]
  }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `find_usage`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_usage</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find references to a symbol across project files.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `symbol` | `string` | ✅ | — | Symbol name to search for. |
| `language` | `string` | ❌ | — | Language name for query templates. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "symbol": "main",
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "matches": [
    {
      "file": "src/main.py",
      "line": 5,
      "snippet": "def main():"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_ast`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_ast</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return an abstract syntax tree for a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `max_depth` | `number` | ❌ | — | Max depth for AST traversal. |
| `include_text` | `boolean` | ❌ | `true` | Whether to include node text. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "max_depth": 3,
  "include_text": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "type": "module",
  "children": [
    {
      "type": "function_definition",
      "name": "main",
      "start": {"row": 0, "column": 0},
      "end": {"row": 4, "column": 0}
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extract import and dependency information from a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `file_path` | `string` | ✅ | — | Path to file in project. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "imports": ["os", "sys"],
  "from_imports": ["collections.Counter"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return file contents from a registered project.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `max_lines` | `number` | ❌ | — | Maximum number of lines to return. |
| `start_line` | `number` | ❌ | `0` | First line index to include. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "max_lines": 200,
  "start_line": 0
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```text
def main():
    print("hello")
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_file_metadata`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_file_metadata</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return metadata for a file, including size and timestamps.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src/main.py",
  "size_bytes": 2048,
  "modified_time": "2026-02-01T12:00:00Z"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_node_at_position`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_node_at_position</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find the AST node at a specific row and column in a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `path` | `string` | ✅ | — | File path relative to project root. |
| `row` | `number` | ✅ | — | 0-based line index. |
| `column` | `number` | ✅ | — | 0-based column index. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "path": "src/main.py",
  "row": 10,
  "column": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "type": "identifier",
  "text": "main",
  "start": {"row": 10, "column": 4},
  "end": {"row": 10, "column": 8}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_node_types`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_node_types</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return descriptions for common node types for a language.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "function_definition": "Function declaration node",
  "class_definition": "Class declaration node"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_query_template_tool`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_query_template_tool</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return a predefined tree-sitter query template by name.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Language name. |
| `template_name` | `string` | ✅ | — | Template identifier (e.g., functions, classes). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "template_name": "functions"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "name": "functions",
  "query": "(function_definition name: (identifier) @function.name)"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `get_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extract symbols (functions, classes, imports) from a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `file_path` | `string` | ✅ | — | Path to file in project. |
| `symbol_types` | `string[]` | ❌ | — | Optional list of symbol types. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "file_path": "src/main.py",
  "symbol_types": ["functions", "classes", "imports"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "functions": [
    {
      "name": "main",
      "type": "functions",
      "location": {
        "start": {"row": 0, "column": 0},
        "end": {"row": 3, "column": 0}
      }
    }
  ],
  "imports": [
    {
      "name": "os",
      "type": "imports",
      "location": {
        "start": {"row": 0, "column": 0},
        "end": {"row": 0, "column": 8}
      }
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `list_files`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_files</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List files in a registered project with optional filters.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `pattern` | `string` | ❌ | — | Optional glob pattern. |
| `max_depth` | `number` | ❌ | — | Maximum directory depth. |
| `extensions` | `string[]` | ❌ | — | File extensions to include (without dot). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "pattern": "**/*.py",
  "max_depth": 5,
  "extensions": ["py"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  "src/main.py",
  "src/utils.py"
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `list_languages`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_languages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List available tree-sitter languages.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "available": ["python", "javascript", "typescript"],
  "installable": []
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `list_projects_tool`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_projects_tool</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List all registered projects.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No input parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  {
    "name": "my-project",
    "path": "/path/to/project",
    "description": "My project"
  }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `list_query_templates_tool`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_query_templates_tool</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List query templates, optionally filtered by language.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ❌ | — | Language to filter by. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "python": ["functions", "classes", "imports"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `register_project_tool`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>register_project_tool</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Register a project directory for analysis.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Absolute path to project directory. |
| `name` | `string` | ❌ | — | Project name (defaults to directory name). |
| `description` | `string` | ❌ | — | Optional description. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "/path/to/project",
  "name": "my-project",
  "description": "My awesome project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "my-project",
  "path": "/path/to/project",
  "description": "My awesome project",
  "languages": ["python"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Adds project to in-memory registry and scans files |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

---

### 🔹 Tool: `remove_project_tool`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>remove_project_tool</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Remove a registered project from the server.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Project name to remove. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "my-project"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "status": "success",
  "message": "Project 'my-project' removed"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Removes project from in-memory registry |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Non-idempotent |

---

### 🔹 Tool: `run_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>run_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Run a tree-sitter query across project files or a specific file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Registered project name. |
| `query` | `string` | ✅ | — | Tree-sitter query string. |
| `file_path` | `string` | ❌ | — | File path to query. |
| `language` | `string` | ❌ | — | Language to use if file_path not provided. |
| `max_results` | `number` | ❌ | `100` | Max results to return. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project": "my-project",
  "query": "(function_definition name: (identifier) @function.name)",
  "file_path": "src/main.py",
  "language": "python",
  "max_results": 100
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  {
    "file": "src/main.py",
    "captures": {
      "function.name": "main"
    },
    "start": {"row": 0, "column": 0},
    "end": {"row": 2, "column": 0}
  }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | project://{project}/files, project://{project}/files/{pattern}, project://{project}/file/{path}, project://{project}/file/{path}/lines/{start}-{end}, project://{project}/ast/{path}, project://{project}/ast/{path}/depth/{depth} |
| **MCP prompts exposed** *(optional)* | code_review, explain_code, explain_tree_sitter_query, suggest_improvements, project_overview |
| **Other RPC endpoints** *(optional)* | None |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `MCP_TS_LOG_LEVEL` | ❌ | — | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR). |
| `MCP_TS_CACHE_MAX_SIZE_MB` | ❌ | — | `100` | Cache size limit in MB. |
| `MCP_TS_CONFIG_PATH` | ❌ | — | — | Path to YAML configuration file. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `~/.config/tree-sitter/config.yaml` | Default configuration file location. |

<details>
<summary><strong>Example Config</strong></summary>

```yaml
cache:
  enabled: true
  max_size_mb: 100
  ttl_seconds: 300

security:
  max_file_size_mb: 5
  excluded_dirs:
    - .git
    - node_modules
    - __pycache__
  allowed_extensions: []

language:
  default_max_depth: 5
  preferred_languages:
    - python
    - javascript

log_level: INFO
max_results_default: 100
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--config` | Path to YAML configuration file. |
| `--debug` | Enable debug logging. |
| `--disable-cache` | Disable parse tree caching. |
| `--help` | Show CLI help. |
| `--version` | Show version information. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `pip install mcp-server-tree-sitter` |
| 2 | Configure MCP client to launch `mcp_server_tree_sitter.server` or `mcp-server-tree-sitter` |

### 8.2 Typical Run Commands *(optional)*

```bash
mcp-server-tree-sitter
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging; verbosity controlled via `MCP_TS_LOG_LEVEL` |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- Enable parse tree caching for repeated analysis.
- Pre-load preferred languages to reduce first-use latency.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 26 |

*— End of Report —*<div align="center">

# 📋 MCP Server Report

## `[SERVER_NAME]`
### [`wrale/mcp-server-tree-sitter`](https://github.com/wrale/mcp-server-tree-sitter)

</div>

---

> **Report Date:** `[YYYY-MM-DD]`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/wrale/mcp-server-tree-sitter` |
| **Target Path** *(optional)* | `[subdir path]` or `N/A` |
| **Analyzed Ref** *(required)* | `[branch/tag/commit]` |
| **Commit URL** *(optional)* | `[URL]` or `N/A` |
| **License** *(required)* | `[LICENSE]` or `Unknown` |
| **Version** *(optional)* | `[VERSION]` or `N/A` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | What was reviewed (repo, subfolder, specific version) |
| **Observed in source** *(required)* | `Yes` / `No` |
| **Observed in docs** *(required)* | `Yes` / `No` |
| **Inferred** *(optional)* | `Yes` / `No` — explain what is inferred |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `absolute` / `relative` (relative to what?) |
| **Line/column indexing** *(required)* | `1-based` / `0-based` / `mixed` |
| **Encoding model** *(optional)* | `UTF-16` / `bytes` / `codepoints` / `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `direct JSON` / `content[].text JSON string` / `plain text` / `mixed` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

> *One-paragraph summary of what the server does and why it exists.*

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `VS Code` / `Cursor` / `JetBrains` / `Claude Desktop` / `CLI` / `Any MCP client` / `Unknown` |
| **Documented clients** *(optional)* | [list] or `None` |

### 1.3 Primary Capabilities *(required)*

- [ ] Capability 1
- [ ] Capability 2
- [ ] Capability 3

### 1.4 Non-Goals / Exclusions *(optional)*

- Explicit limitation 1
- Explicit limitation 2

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | [text] |
| **Documented integrations** *(optional)* | [list] |
| **Notes / constraints** *(optional)* | [text] |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | [list] or `Determined by underlying engine` |
| **How to extend** *(optional)* | [text] |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Open-source` / `Proprietary` / `Mixed` / `Unknown` |
| **License details** *(optional)* | [text] |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | [list] |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | [list] |
| **External / System** *(optional)* | [list] |
| **Optional** *(optional)* | [list] |
| **Paid services / Tokens** *(required)* | `None` or [list] |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local process` / `Docker` / `Remote` / `Mixed` / `Unknown` |
| **Started by MCP client** *(required)* | `Yes` / `No` |
| **Started independently** *(optional)* | `Yes` / `No` |
| **Env vars used** *(optional)* | `Yes` / `No` (see § 7) |
| **Config files used** *(optional)* | `Yes` / `No` (name/location) |
| **CLI flags used** *(optional)* | `Yes` / `No` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | `LSP` / `tree-sitter` / `Joern` / `Semgrep` / `GitHub API` / `Neo4j` / etc. |
| **Architecture notes** *(optional)* | [bullet list describing key components and data flow] |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` / `No` |
| `http` / `streamable-http` *(optional)* | `Yes` / `No` |
| `sse` *(optional)* | `Yes` / `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `Yes` / `No` |
| **Mechanism** *(optional)* | `token` / `OAuth` / `basic auth` / `none` / `Unknown` |
| **Secrets / Env vars** *(optional)* | [list] or `None` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `Yes` / `No` |
| **Uses local cache** *(optional)* | `Yes` / `No` (location) |
| **Uses external DB** *(optional)* | `Yes` / `No` (which) |
| **Retains user code** *(required)* | `Yes` / `No` / `Unknown` (describe) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `tool_name_1` |
| 2 | `tool_name_2` |
| 3 | `tool_name_3` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TypeName` | [brief definition] |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TypeName` | [brief definition] |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` / `relative` / `safe-join` / `traversal protection` |
| **Rate limits / retries** | `429` / backoff behavior |
| **File size limits** | [limits] |
| **Resource constraints** | [timeouts, max results] |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Yes` / `No` / `Unknown` |
| **Error as text** | `Yes` / `No` / `Unknown` |
| **Error as `{ error: string }`** | `Yes` / `No` / `Unknown` |
| **Common error codes** | [list] |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `[tool_name]`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>[tool_name]</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>[What it does in 1–3 sentences.]</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` / `text` / `other` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `param1` | `string` | ✅ | — | [description] |
| `param2` | `number` | ❌ | `10` | [description] |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "param1": "...",
  "param2": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "param1": "example",
  "param2": 42
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` / `text` / `other` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "result": "..."
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "result": "example"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` / `Write Only` / `Hybrid` / `Unknown` |
| **Classification** *(required)* | `Semantic Research` / `General Research` / `Other` / `Unknown` |
| **Side effects** *(required)* | `None` or [list] |
| **Determinism** *(optional)* | `Deterministic` / `Non-deterministic` / `Depends` / `Unknown` |
| **Idempotency** *(optional)* | `Idempotent` / `Non-idempotent` / `Depends` / `Unknown` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | [e.g., must call `start_server` first] |
| **Postconditions** | [what changes] |
| **Limits** | [max results, timeouts] |
| **Security & privacy** | [PII, secrets, path traversal, network calls] |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [file path / symbol name] or `Unknown` |
| **Core implementation** | [file path / symbol name] or `Unknown` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `None` or [list] |
| **MCP prompts exposed** *(optional)* | `None` or [list] |
| **Other RPC endpoints** *(optional)* | [text] |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `ENV_VAR_1` | ✅ | 🔒 | — | [description] |
| `ENV_VAR_2` | ❌ | — | `default` | [description] |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `[path/name]` | [text] |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "key": "value"
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--flag` | [description] |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | [command or action] |
| 2 | [command or action] |

### 8.2 Typical Run Commands *(optional)*

```bash
# Example startup command
[command]
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | [where/how] |
| **Tracing / Metrics** | `OpenTelemetry` / `None` / [other] |

### 8.4 Performance Considerations *(optional)*

- [consideration 1]
- [consideration 2]

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `[N]` |
| **Read-only** | `[N]` |
| **Write-only** | `[N]` |
| **Hybrid** | `[N]` |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| [Unknown field 1] | [why it's unknown] |
| [Unknown field 2] | [why it's unknown] |

---

<div align="center">

*— End of Report —*

</div>
