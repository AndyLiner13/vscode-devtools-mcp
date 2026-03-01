<div align="center">

# 📋 MCP Server Report

## `narsil-mcp`
### [`postrv/narsil-mcp`](https://github.com/postrv/narsil-mcp)

</div>

---

> **Report Date:** `2026-02-06`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/postrv/narsil-mcp` |
| **Target Path** *(optional)* | `[subdir path]` or `N/A` |
| **Analyzed Ref** *(required)* | `main` (`bd09f8b59c6ad001fe089607d28e82af63e75d37`) |
| **Commit URL** *(optional)* | `https://github.com/postrv/narsil-mcp/commit/bd09f8b59c6ad001fe089607d28e82af63e75d37` |
| **License** *(required)* | `MIT OR Apache-2.0` |
| **Version** *(optional)* | `1.4.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (default branch, commit `bd09f8b59c6ad001fe089607d28e82af63e75d37`) |
| **Observed in source** *(required)* | `Yes` |
| **Observed in docs** *(required)* | `Yes` |
| **Inferred** *(optional)* | `No` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `relative` (repository root for file paths) |
| **Line/column indexing** *(required)* | `1-based` |
| **Encoding model** *(optional)* | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

> narsil-mcp is a Rust-based MCP server that provides deep code intelligence for AI assistants, offering a large suite of local tools for symbol discovery, search, graphs, security analysis, and supply chain insights. It focuses on fast, privacy-first, on-device analysis with tree-sitter parsing across many languages, plus optional neural semantic search and advanced analyses (call graphs, data/control flow, taint tracking). It exists to give MCP clients rich, structured code understanding without sending source code off-machine.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `Any MCP client` |
| **Documented clients** *(optional)* | Claude Desktop; Claude Code; Cursor; VS Code Copilot; Zed |

### 1.3 Primary Capabilities *(required)*

- [x] Code intelligence: symbol discovery, search, and graph-based insights
- [x] Security and supply chain analysis: taint tracking, vuln scanning, SBOM/license checks
- [x] Semantic search and advanced analysis: neural similarity, call graphs, data/control flow

### 1.4 Non-Goals / Exclusions *(optional)*

- None documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs on macOS, Linux, and Windows (x64; macOS supports Intel/Apple Silicon). |
| **Documented integrations** *(optional)* | Claude Desktop, Claude Code, Cursor, VS Code Copilot, Zed |
| **Notes / constraints** *(optional)* | Some features require build-time flags (e.g., graph, neural-onnx, frontend). |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Rust, Python, JavaScript, TypeScript, Go, C, C++, Java, C#, Bash, Ruby, Kotlin, PHP, Swift, Verilog/SystemVerilog, Scala, Lua, Haskell, Elixir, Clojure, Dart, Julia, R, Perl, Zig, Erlang, Elm, Fortran, PowerShell, Nix, Groovy |
| **How to extend** *(optional)* | Add a tree-sitter grammar dependency and wire symbol extraction/parsing in the codebase. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Open-source` |
| **License details** *(optional)* | Dual-licensed `MIT OR Apache-2.0` for narsil-mcp core. |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Rust (server/core), TypeScript/JavaScript (frontend tooling) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | Rust runtime; tree-sitter; tantivy; tokio; serde/serde_json |
| **External / System** *(optional)* | Git (for `--git`), installed language servers (for `--lsp`) |
| **Optional** *(optional)* | Oxigraph + flate2 (graph/SPARQL), Usearch/ndarray/ort/tokenizers (neural/onnx), axum/tower/rust-embed (frontend) |
| **Paid services / Tokens** *(required)* | Optional: Voyage AI or OpenAI API keys for neural embeddings |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local process` |
| **Started by MCP client** *(required)* | `Yes` |
| **Started independently** *(optional)* | `Yes` |
| **Env vars used** *(optional)* | `Yes` (see § 7) |
| **Config files used** *(optional)* | `Yes` (see § 7) |
| **CLI flags used** *(optional)* | `Yes` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | `tree-sitter`, `tantivy`, `LSP` (optional), `Oxigraph` (optional), `GitHub API` (optional) |
| **Architecture notes** *(optional)* | MCP stdio server dispatches to a tool registry backed by a code intelligence engine; optional HTTP server exposes REST endpoints for the frontend. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` |
| `http` / `streamable-http` *(optional)* | `Yes` (REST API for frontend, not MCP) |
| `sse` *(optional)* | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `No` |
| **Mechanism** *(optional)* | `none` |
| **Secrets / Env vars** *(optional)* | `EMBEDDING_API_KEY`, `VOYAGE_API_KEY`, `OPENAI_API_KEY`, `EMBEDDING_SERVER_ENDPOINT`, `GITHUB_TOKEN` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `Yes` (index persistence and caches) |
| **Uses local cache** *(optional)* | `Yes` (default index path `~/.cache/narsil-mcp`) |
| **Uses external DB** *(optional)* | `No` (optional local Oxigraph store when graph feature enabled) |
| **Retains user code** *(required)* | `Yes` (local indexes and cached excerpts; no remote upload by default) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `add_remote_repo` |
| 2 | `check_cwe_top25` |
| 3 | `check_dependencies` |
| 4 | `check_licenses` |
| 5 | `check_owasp_top10` |
| 6 | `check_type_errors` |
| 7 | `discover_repos` |
| 8 | `explain_vulnerability` |
| 9 | `export_ccg` |
| 10 | `export_ccg_architecture` |
| 11 | `export_ccg_full` |
| 12 | `export_ccg_index` |
| 13 | `export_ccg_manifest` |
| 14 | `find_call_path` |
| 15 | `find_circular_imports` |
| 16 | `find_dead_code` |
| 17 | `find_dead_stores` |
| 18 | `find_injection_vulnerabilities` |
| 19 | `find_references` |
| 20 | `find_semantic_clones` |
| 21 | `find_similar_code` |
| 22 | `find_similar_to_symbol` |
| 23 | `find_symbol_usages` |
| 24 | `find_symbols` |
| 25 | `find_uninitialized` |
| 26 | `find_unused_exports` |
| 27 | `find_upgrade_path` |
| 28 | `generate_sbom` |
| 29 | `get_blame` |
| 30 | `get_branch_info` |
| 31 | `get_call_graph` |
| 32 | `get_callers` |
| 33 | `get_callees` |
| 34 | `get_ccg_access_info` |
| 35 | `get_ccg_acl` |
| 36 | `get_ccg_manifest` |
| 37 | `get_chunk_stats` |
| 38 | `get_chunks` |
| 39 | `get_code_graph` |
| 40 | `get_commit_diff` |
| 41 | `get_complexity` |
| 42 | `get_contributors` |
| 43 | `get_control_flow` |
| 44 | `get_data_flow` |
| 45 | `get_dependencies` |
| 46 | `get_embedding_stats` |
| 47 | `get_excerpt` |
| 48 | `get_export_map` |
| 49 | `get_file` |
| 50 | `get_file_history` |
| 51 | `get_function_hotspots` |
| 52 | `get_hotspots` |
| 53 | `get_hover_info` |
| 54 | `get_import_graph` |
| 55 | `get_incremental_status` |
| 56 | `get_index_status` |
| 57 | `get_metrics` |
| 58 | `get_modified_files` |
| 59 | `get_neural_stats` |
| 60 | `get_project_structure` |
| 61 | `get_recent_changes` |
| 62 | `get_reaching_definitions` |
| 63 | `get_remote_file` |
| 64 | `get_security_summary` |
| 65 | `get_symbol_definition` |
| 66 | `get_symbol_history` |
| 67 | `get_taint_sources` |
| 68 | `get_typed_taint_flow` |
| 69 | `get_type_info` |
| 70 | `go_to_definition` |
| 71 | `hybrid_search` |
| 72 | `import_ccg` |
| 73 | `import_ccg_from_registry` |
| 74 | `infer_types` |
| 75 | `list_remote_files` |
| 76 | `list_repos` |
| 77 | `list_sparql_templates` |
| 78 | `neural_search` |
| 79 | `query_ccg` |
| 80 | `reindex` |
| 81 | `run_sparql_template` |
| 82 | `scan_security` |
| 83 | `search_chunks` |
| 84 | `search_code` |
| 85 | `semantic_search` |
| 86 | `sparql_query` |
| 87 | `suggest_fix` |
| 88 | `trace_taint` |
| 89 | `validate_repo` |
| 90 | `workspace_symbol_search` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `RepoRef` | Repository name or local path string (`repo` parameters) |
| `FilePath` | Path string relative to repository root (`path` parameters) |
| `LineRange` | `start_line`/`end_line` or `lines[]` with 1-based indexing |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ToolContentText` | Tool output returned as a text payload inside MCP `content[].text` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `relative` (repo-root paths for file params) |
| **Rate limits / retries** | GitHub API rate limits for remote tools without `GITHUB_TOKEN` |
| **File size limits** | Not documented |
| **Resource constraints** | SPARQL `timeout_ms` max 300000; SPARQL `limit` max 10000 |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `No` |
| **Error as `{ error: string }`** | `No` (JSON-RPC error object) |
| **Common error codes** | `-32601` (method not found), `-32602` (invalid params), `-32700` (parse error), `-32000` (tool execution error) |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `list_repos`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_repos</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List all indexed repositories with metadata (path, language breakdown, file count).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters |

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
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"name\":\"my-repo\",\"path\":\"/path/to/repo\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Writes output file when `output` is provided. |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed by the running server. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local repository metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `ListReposHandler` |

---

### 🔹 Tool: `get_project_structure`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_project_structure</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the directory structure and key files of a repository. Returns a tree view with file types and sizes.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `max_depth` | `integer` | ❌ | `4` | Maximum directory depth |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "max_depth": 4
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "max_depth": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "src/\n  main.rs\n  lib.rs"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Writes output file when `output` is provided. |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Depth limited by `max_depth` (default 4). |
| **Security & privacy** | Returns local file tree data only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `GetProjectStructureHandler` |

---

### 🔹 Tool: `get_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the contents of a specific file with optional line range.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path relative to repository root |
| `start_line` | `integer` | ❌ | — | Start line (1-indexed) |
| `end_line` | `integer` | ❌ | — | End line (inclusive, 1-indexed) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "start_line": 1,
  "end_line": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "start_line": 1,
  "end_line": 120
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "fn main() {\n  println!(\"hello\");\n}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Writes output file when `output` is provided. |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist in the indexed repository. |
| **Postconditions** | None. |
| **Limits** | Optional line range narrows output. |
| **Security & privacy** | Reads local file contents only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `GetFileHandler` |

---

### 🔹 Tool: `get_excerpt`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_excerpt</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extract code excerpts around specific lines with intelligent context expansion. Automatically expands to function/class boundaries when enabled.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path relative to repository root |
| `lines` | `array` | ✅ | — | Line numbers to extract around (1-indexed) |
| `context_before` | `integer` | ❌ | `5` | Lines of context before |
| `context_after` | `integer` | ❌ | `5` | Lines of context after |
| `expand_to_scope` | `boolean` | ❌ | `true` | Expand to function/class boundaries |
| `max_lines` | `integer` | ❌ | `50` | Maximum lines per excerpt |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "lines": [1],
  "context_before": 5,
  "context_after": 5,
  "expand_to_scope": true,
  "max_lines": 50
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "lines": [42]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "fn handler() {\n  // ...\n}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Writes output file when `output` is provided. |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist in the indexed repository. |
| **Postconditions** | None. |
| **Limits** | Excerpt length capped by `max_lines` (default 50). |
| **Security & privacy** | Reads local file contents only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `GetExcerptHandler` |

---

### 🔹 Tool: `discover_repos`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>discover_repos</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Auto-discover repositories in a directory by detecting VCS roots and project markers.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Base directory to search for repositories |
| `max_depth` | `integer` | ❌ | `3` | Maximum directory depth to search |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "string",
  "max_depth": 3
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "path": "/home/user/projects",
  "max_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[\"/home/user/projects/app1\",\"/home/user/projects/app2\"]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Writes output bundle when `output_dir` is provided. |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Path must exist on the server machine. |
| **Postconditions** | None. |
| **Limits** | Search depth limited by `max_depth` (default 3). |
| **Security & privacy** | Scans local directories; no network access. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `DiscoverReposHandler` |

---

### 🔹 Tool: `validate_repo`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>validate_repo</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Validate that a path is a valid repository and can be indexed.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Path to validate as a repository |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "path": "/home/user/projects/app1"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"valid\":true}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Path must exist on the server machine. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Checks local filesystem paths only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `ValidateRepoHandler` |

---

### 🔹 Tool: `reindex`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>reindex</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Trigger re-indexing of a repository or all repositories.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ❌ | — | Repository to reindex (reindexes all if omitted) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Reindex started"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Rebuilds index data on disk. |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed or discoverable by the server. |
| **Postconditions** | Index data refreshed. |
| **Limits** | Not documented. |
| **Security & privacy** | Operates on local index and repository data only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `ReindexHandler` |

---

### 🔹 Tool: `get_index_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_index_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get status of the search index and enabled features. Shows which optional features are enabled and index statistics.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ❌ | — | Repository name (optional, shows all if omitted) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"indexed_files\":1234,\"features\":[\"git\",\"call_graph\"]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `GetIndexStatusHandler` |

---

### 🔹 Tool: `get_incremental_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_incremental_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get status of incremental indexing including Merkle tree root hash, file counts, and change statistics.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"merkle_root\":\"abc123\",\"files\":1200}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `GetIncrementalStatusHandler` |

---

### 🔹 Tool: `get_metrics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_metrics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get performance metrics including tool execution times, indexing statistics, and server uptime.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `format` | `string` | ❌ | `markdown` | Output format (`markdown` or `json`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "format": "markdown"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "format": "json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"uptime_seconds\":1234,\"tool_timings\":{}}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must be running with metrics enabled (default). |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local performance metrics only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/repo.rs](../../../../../research/src/tool_handlers/repo.rs) `GetMetricsHandler` |

---

### 🔹 Tool: `find_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find data structures (structs, classes, enums, interfaces) and functions/methods in a repository, with filtering by type and pattern.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `symbol_type` | `string` | ❌ | `all` | Symbol type (`struct`, `class`, `enum`, `interface`, `function`, `method`, `trait`, `type`, `all`) |
| `pattern` | `string` | ❌ | — | Glob or regex pattern for symbol names |
| `file_pattern` | `string` | ❌ | — | Glob pattern to filter files |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "symbol_type": "all",
  "pattern": "string",
  "file_pattern": "string",
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "symbol_type": "function",
  "pattern": "*Handler*",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"name\":\"handle\",\"path\":\"src/handlers.rs\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns symbol metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `FindSymbolsHandler` |

---

### 🔹 Tool: `get_symbol_definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbol_definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the full definition of a symbol with surrounding context.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `symbol` | `string` | ✅ | — | Fully qualified symbol name |
| `context_lines` | `integer` | ❌ | `5` | Context lines before/after |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "symbol": "string",
  "context_lines": 5
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "symbol": "MyStruct",
  "context_lines": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "struct MyStruct { ... }"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local symbol definitions only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `GetSymbolDefinitionHandler` |

---

### 🔹 Tool: `find_references`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_references</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find all references to a symbol across the codebase.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `symbol` | `string` | ✅ | — | Symbol name to find references for |
| `include_definition` | `boolean` | ❌ | `true` | Include definition location |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "symbol": "string",
  "include_definition": true,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "symbol": "MyStruct",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"line\":10}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns symbol reference locations only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `FindReferencesHandler` |

---

### 🔹 Tool: `get_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze dependencies and imports for a file or module.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File or module path |
| `direction` | `string` | ❌ | `both` | Direction (`imports`, `imported_by`, `both`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "direction": "both"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "direction": "imports"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"imports\":[\"std::fmt\"]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns dependency metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `GetDependenciesHandler` |

---

### 🔹 Tool: `find_symbol_usages`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_symbol_usages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find all usages of a symbol across files, including imports and re-exports.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `symbol` | `string` | ✅ | — | Symbol name |
| `include_imports` | `boolean` | ❌ | `true` | Include import statements |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "symbol": "string",
  "include_imports": true,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "symbol": "MyStruct",
  "include_imports": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"line\":20}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns symbol usage locations only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `FindSymbolUsagesHandler` |

---

### 🔹 Tool: `get_export_map`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_export_map</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the export map for a file or module showing all exported symbols and their types.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path to get exports for |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"exports\":[\"Foo\",\"Bar\"]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns export metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `GetExportMapHandler` |

---

### 🔹 Tool: `workspace_symbol_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>workspace_symbol_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fuzzy search for symbols across the entire workspace using trigram matching.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Symbol name or partial name to search for |
| `kind` | `string` | ❌ | `all` | Symbol kind filter |
| `limit` | `integer` | ❌ | `20` | Maximum results to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "kind": "all",
  "limit": 20
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "handler",
  "kind": "function",
  "limit": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"name\":\"handleRequest\",\"path\":\"src/api.ts\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | `limit` defaults to 20. |
| **Security & privacy** | Returns symbol metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/symbols.rs](../../../../../research/src/tool_handlers/symbols.rs) `WorkspaceSymbolSearchHandler` |

---

### 🔹 Tool: `search_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Semantic and keyword search across code, returning ranked excerpts with context.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query (natural language or code pattern) |
| `repo` | `string` | ❌ | — | Repository name (searches all if omitted) |
| `file_pattern` | `string` | ❌ | — | Glob pattern to filter files |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "repo": "string",
  "file_pattern": "string",
  "max_results": 10,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "parse config",
  "repo": "./my-repo",
  "max_results": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"line\":12}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Searches local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `SearchCodeHandler` |

---

### 🔹 Tool: `semantic_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semantic_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>BM25-ranked semantic search with code-aware tokenization for natural language queries.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query |
| `repo` | `string` | ❌ | — | Repository name (searches all if omitted) |
| `doc_type` | `string` | ❌ | — | Filter by document type (`file`, `function`, `class`, `struct`, `method`) |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "repo": "string",
  "doc_type": "function",
  "max_results": 10,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "parse config",
  "doc_type": "function",
  "max_results": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"score\":0.82}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Searches local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `SemanticSearchHandler` |

---

### 🔹 Tool: `hybrid_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>hybrid_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Hybrid BM25 + TF-IDF search with Reciprocal Rank Fusion.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query |
| `repo` | `string` | ❌ | — | Repository name (searches all if omitted) |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |
| `mode` | `string` | ❌ | `hybrid` | Search mode (`hybrid`, `bm25`, `tfidf`) |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "repo": "string",
  "max_results": 10,
  "mode": "hybrid",
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "parse config",
  "mode": "hybrid"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"score\":0.76}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Searches local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `HybridSearchHandler` |

---

### 🔹 Tool: `neural_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>neural_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search code using neural embeddings for semantic similarity. Requires `--neural` and API keys.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language or code query |
| `repo` | `string` | ❌ | — | Repository name (searches all if omitted) |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "repo": "string",
  "max_results": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "parse config",
  "max_results": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"score\":0.91}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--neural` and valid API key. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Query sent to embedding backend when using API-based embeddings. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `NeuralSearchHandler` |

---

### 🔹 Tool: `search_chunks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_chunks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search over AST-aware code chunks with symbol context.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query |
| `repo` | `string` | ❌ | — | Repository name (searches all if omitted) |
| `chunk_type` | `string` | ❌ | — | Chunk type (`function`, `method`, `class`, `trait`, `module`, `all`) |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "repo": "string",
  "chunk_type": "function",
  "max_results": 10,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "parse config",
  "chunk_type": "function"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"chunk\":\"...\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Searches local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `SearchChunksHandler` |

---

### 🔹 Tool: `find_similar_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_similar_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find code similar to a snippet using TF-IDF embeddings.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Code snippet to match |
| `repo` | `string` | ❌ | — | Repository name (searches all if omitted) |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |
| `exclude_tests` | `boolean` | ❌ | `false` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "repo": "string",
  "max_results": 10,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "fn parse_config(...)",
  "max_results": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"score\":0.7}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Searches local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `FindSimilarCodeHandler` |

---

### 🔹 Tool: `find_similar_to_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_similar_to_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find code similar to a specific symbol (function, class, etc.).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `symbol` | `string` | ✅ | — | Symbol name |
| `max_results` | `integer` | ❌ | `10` | Maximum results to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "symbol": "string",
  "max_results": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "symbol": "parse_config",
  "max_results": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/config.rs\",\"score\":0.68}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | `max_results` defaults to 10. |
| **Security & privacy** | Searches local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `FindSimilarToSymbolHandler` |

---

### 🔹 Tool: `find_semantic_clones`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_semantic_clones</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find semantic code clones using neural embeddings. Requires `--neural` and API keys.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ✅ | — | Function name to find clones of |
| `threshold` | `number` | ❌ | `0.8` | Similarity threshold (0-1) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string",
  "threshold": 0.8
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "function": "parse_config",
  "threshold": 0.85
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/other.rs\",\"score\":0.86}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--neural` and valid API key. |
| **Postconditions** | None. |
| **Limits** | `threshold` defaults to 0.8. |
| **Security & privacy** | Queries sent to embedding backend when using API-based embeddings. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `FindSemanticClonesHandler` |

---

### 🔹 Tool: `get_embedding_stats`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_embedding_stats</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get statistics about the embedding index.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters |

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
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"embeddings\":1234}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local index stats only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `GetEmbeddingStatsHandler` |

---

### 🔹 Tool: `get_neural_stats`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_neural_stats</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get statistics about the neural embedding index. Requires `--neural`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters |

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
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"vectors\":987}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--neural`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local neural index stats only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `GetNeuralStatsHandler` |

---

### 🔹 Tool: `get_chunk_stats`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_chunk_stats</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get statistics about code chunks in a repository.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"chunks\":200}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns local chunk stats only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `GetChunkStatsHandler` |

---

### 🔹 Tool: `get_chunks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_chunks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get AST-aware code chunks for a file with symbol context.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `include_imports` | `boolean` | ❌ | `true` | Include import statements |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "include_imports": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "include_imports": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"chunk\":\"fn main()\",\"range\":[1,10]}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local indexed data only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/search.rs](../../../../../research/src/tool_handlers/search.rs) `GetChunksHandler` |

---

### 🔹 Tool: `get_call_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_call_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the call graph for a repository or specific function. Requires `--call-graph`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `function` | `string` | ❌ | — | Focus on specific function |
| `depth` | `integer` | ❌ | `3` | Maximum depth to traverse |
| `exclude_tests` | `boolean` | ❌ | — | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "function": "string",
  "depth": 3,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "function": "handle_request",
  "depth": 2
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"nodes\":[],\"edges\":[]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--call-graph`. |
| **Postconditions** | None. |
| **Limits** | Depth defaults to 3. |
| **Security & privacy** | Uses local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/callgraph.rs](../../../../../research/src/tool_handlers/callgraph.rs) `GetCallGraphHandler` |

---

### 🔹 Tool: `get_callers`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_callers</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find functions that call a given function. Requires `--call-graph`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `function` | `string` | ✅ | — | Function name to find callers of |
| `transitive` | `boolean` | ❌ | `false` | Include transitive callers |
| `max_depth` | `integer` | ❌ | `5` | Maximum depth for transitive analysis |
| `exclude_tests` | `boolean` | ❌ | — | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "function": "string",
  "transitive": false,
  "max_depth": 5,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "function": "handle_request",
  "transitive": true,
  "max_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"caller\":\"foo\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--call-graph`. |
| **Postconditions** | None. |
| **Limits** | `max_depth` defaults to 5. |
| **Security & privacy** | Uses local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/callgraph.rs](../../../../../research/src/tool_handlers/callgraph.rs) `GetCallersHandler` |

---

### 🔹 Tool: `get_callees`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_callees</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find functions called by a given function. Requires `--call-graph`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `function` | `string` | ✅ | — | Function name to find callees of |
| `transitive` | `boolean` | ❌ | `false` | Include transitive callees |
| `max_depth` | `integer` | ❌ | `5` | Maximum depth for transitive analysis |
| `exclude_tests` | `boolean` | ❌ | — | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "function": "string",
  "transitive": false,
  "max_depth": 5,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "function": "handle_request",
  "transitive": true,
  "max_depth": 3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"callee\":\"bar\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--call-graph`. |
| **Postconditions** | None. |
| **Limits** | `max_depth` defaults to 5. |
| **Security & privacy** | Uses local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/callgraph.rs](../../../../../research/src/tool_handlers/callgraph.rs) `GetCalleesHandler` |

---

### 🔹 Tool: `find_call_path`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_call_path</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find the call path between two functions. Requires `--call-graph`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `from` | `string` | ✅ | — | Source function name |
| `to` | `string` | ✅ | — | Target function name |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "from": "string",
  "to": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "from": "handle_request",
  "to": "save_config"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[\"handle_request\",\"save_config\"]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--call-graph`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Uses local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/callgraph.rs](../../../../../research/src/tool_handlers/callgraph.rs) `FindCallPathHandler` |

---

### 🔹 Tool: `get_complexity`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_complexity</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get complexity metrics (cyclomatic, cognitive) for a function. Requires `--call-graph`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `function` | `string` | ✅ | — | Function name to analyze |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "function": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "function": "handle_request"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"cyclomatic\":3,\"cognitive\":2}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--call-graph`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Uses local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/callgraph.rs](../../../../../research/src/tool_handlers/callgraph.rs) `GetComplexityHandler` |

---

### 🔹 Tool: `get_function_hotspots`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_function_hotspots</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find highly connected functions based on call graph analysis. Requires `--call-graph`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `min_connections` | `integer` | ❌ | `5` | Minimum total connections |
| `exclude_tests` | `boolean` | ❌ | — | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "min_connections": 5,
  "exclude_tests": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "min_connections": 8
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"function\":\"handle_request\",\"connections\":10}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--call-graph`. |
| **Postconditions** | None. |
| **Limits** | `min_connections` defaults to 5. |
| **Security & privacy** | Uses local index only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/callgraph.rs](../../../../../research/src/tool_handlers/callgraph.rs) `GetFunctionHotspotsHandler` |

---

### 🔹 Tool: `get_blame`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_blame</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get git blame information for a file. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path relative to repository |
| `start_line` | `integer` | ❌ | — | Start line for blame range |
| `end_line` | `integer` | ❌ | — | End line for blame range |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "start_line": 1,
  "end_line": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "start_line": 1,
  "end_line": 20
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"line\":1,\"author\":\"alice\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetBlameHandler` |

---

### 🔹 Tool: `get_file_history`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_file_history</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get git commit history for a file. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path relative to repository |
| `max_commits` | `integer` | ❌ | `20` | Maximum commits to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "max_commits": 20
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "max_commits": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"commit\":\"abc\",\"message\":\"fix\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | `max_commits` defaults to 20. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetFileHistoryHandler` |

---

### 🔹 Tool: `get_recent_changes`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_recent_changes</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get recent commits across the repository. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `days` | `integer` | ❌ | `7` | Days to look back |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "days": 7
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "days": 14
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"commit\":\"abc\",\"message\":\"fix\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | `days` defaults to 7. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetRecentChangesHandler` |

---

### 🔹 Tool: `get_hotspots`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_hotspots</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find files with high churn and complexity. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `days` | `integer` | ❌ | `30` | Days to analyze |
| `min_complexity` | `integer` | ❌ | — | Minimum cyclomatic complexity |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "days": 30,
  "min_complexity": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "days": 30,
  "min_complexity": 15
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"churn\":12}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | `days` defaults to 30. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetHotspotsHandler` |

---

### 🔹 Tool: `get_contributors`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_contributors</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get contributors to a file or repository. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ❌ | — | File path (optional) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"author\":\"alice\",\"commits\":3}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetContributorsHandler` |

---

### 🔹 Tool: `get_commit_diff`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_commit_diff</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the diff for a specific commit. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `commit` | `string` | ✅ | — | Commit hash or reference |
| `path` | `string` | ❌ | — | Optional file path filter |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "commit": "string",
  "path": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "commit": "HEAD",
  "path": "src/main.rs"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "diff --git a/src/main.rs b/src/main.rs"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetCommitDiffHandler` |

---

### 🔹 Tool: `get_symbol_history`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbol_history</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get commits that modified a specific symbol/function. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path relative to repository |
| `symbol` | `string` | ✅ | — | Symbol/function name |
| `max_commits` | `integer` | ❌ | `10` | Maximum commits to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "symbol": "string",
  "max_commits": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "symbol": "parse_config",
  "max_commits": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"commit\":\"abc\",\"message\":\"refactor\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | `max_commits` defaults to 10. |
| **Security & privacy** | Reads local git history only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetSymbolHistoryHandler` |

---

### 🔹 Tool: `get_branch_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_branch_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get current branch name and repository status. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"branch\":\"main\",\"dirty\":false}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local git metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetBranchInfoHandler` |

---

### 🔹 Tool: `get_modified_files`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_modified_files</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get list of modified files in the working tree. Requires `--git`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[\"src/main.rs\",\"README.md\"]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--git`. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local git metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/git.rs](../../../../../research/src/tool_handlers/git.rs) `GetModifiedFilesHandler` |

---

### 🔹 Tool: `get_hover_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_hover_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get hover information (type info, documentation) for a symbol at a position.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `line` | `integer` | ✅ | `1` | Line number (1-indexed) |
| `character` | `integer` | ✅ | `0` | Character position (0-indexed) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "line": 1,
  "character": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "line": 10,
  "character": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Type: Result<String>"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | LSP enhances results when `--lsp` is enabled. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Uses local files and optional local language servers. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/lsp.rs](../../../../../research/src/tool_handlers/lsp.rs) `GetHoverInfoHandler` |

---

### 🔹 Tool: `get_type_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_type_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get precise type information for a symbol. Requires `--lsp`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `line` | `integer` | ✅ | `1` | Line number (1-indexed) |
| `character` | `integer` | ✅ | `0` | Character position (0-indexed) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "line": 1,
  "character": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "line": 10,
  "character": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Type: Result<String>"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--lsp` and language servers installed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Uses local language servers. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/lsp.rs](../../../../../research/src/tool_handlers/lsp.rs) `GetTypeInfoHandler` |

---

### 🔹 Tool: `go_to_definition`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>go_to_definition</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find the definition location of a symbol at a position.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `line` | `integer` | ✅ | `1` | Line number (1-indexed) |
| `character` | `integer` | ✅ | `0` | Character position (0-indexed) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "line": 1,
  "character": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/main.rs",
  "line": 10,
  "character": 4
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"path\":\"src/lib.rs\",\"line\":42}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | LSP enhances results when `--lsp` is enabled. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Uses local files and optional local language servers. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/lsp.rs](../../../../../research/src/tool_handlers/lsp.rs) `GoToDefinitionHandler` |

---

### 🔹 Tool: `add_remote_repo`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>add_remote_repo</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Add a remote GitHub repository for indexing. Requires `--remote`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `url` | `string` | ✅ | — | GitHub URL |
| `sparse_paths` | `array` | ❌ | — | Optional paths for sparse checkout |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "url": "string",
  "sparse_paths": ["string"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "url": "https://github.com/owner/repo",
  "sparse_paths": ["src", "README.md"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Remote repo indexed"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Clones repo to a temporary location. |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Depends` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--remote` and network access. |
| **Postconditions** | Remote repository is available for indexing. |
| **Limits** | Rate-limited by GitHub API without `GITHUB_TOKEN`. |
| **Security & privacy** | Downloads repository contents from GitHub. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/remote.rs](../../../../../research/src/tool_handlers/remote.rs) `AddRemoteRepoHandler` |

---

### 🔹 Tool: `list_remote_files`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_remote_files</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List files in a remote GitHub repository via API. Requires `--remote`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `url` | `string` | ✅ | — | GitHub URL |
| `path` | `string` | ❌ | — | Optional subdirectory path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "url": "string",
  "path": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "url": "https://github.com/owner/repo",
  "path": "src"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[\"src/main.rs\",\"src/lib.rs\"]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--remote` and network access. |
| **Postconditions** | None. |
| **Limits** | Rate-limited by GitHub API without `GITHUB_TOKEN`. |
| **Security & privacy** | Uses GitHub API only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/remote.rs](../../../../../research/src/tool_handlers/remote.rs) `ListRemoteFilesHandler` |

---

### 🔹 Tool: `get_remote_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_remote_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetch a specific file from a remote GitHub repository via API. Requires `--remote`.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `url` | `string` | ✅ | — | GitHub URL |
| `path` | `string` | ✅ | — | File path to fetch |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "url": "string",
  "path": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "url": "https://github.com/owner/repo",
  "path": "README.md"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "# README"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must run with `--remote` and network access. |
| **Postconditions** | None. |
| **Limits** | Rate-limited by GitHub API without `GITHUB_TOKEN`. |
| **Security & privacy** | Uses GitHub API only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/remote.rs](../../../../../research/src/tool_handlers/remote.rs) `GetRemoteFileHandler` |

---

### 🔹 Tool: `scan_security`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>scan_security</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scan repository for security issues using the rules engine (OWASP, CWE, secrets, crypto).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ❌ | — | Optional file or directory path |
| `ruleset` | `string` | ❌ | — | Optional ruleset (`owasp`, `cwe`, `crypto`, `secrets`, or custom path) |
| `severity_threshold` | `string` | ❌ | `low` | Minimum severity to report |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |
| `max_findings` | `integer` | ❌ | — | Maximum findings to return |
| `offset` | `integer` | ❌ | — | Offset for pagination |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "ruleset": "owasp",
  "severity_threshold": "low",
  "exclude_tests": true,
  "max_findings": 100,
  "offset": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "ruleset": "owasp",
  "severity_threshold": "medium"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"rule\":\"OWASP-A03\",\"path\":\"src/app.js\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | Supports pagination via `max_findings` and `offset`. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `ScanSecurityHandler` |

---

### 🔹 Tool: `check_owasp_top10`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_owasp_top10</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scan for OWASP Top 10 2021 vulnerabilities.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ❌ | — | Optional file or directory path |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"rule\":\"OWASP-A01\",\"path\":\"src/app.js\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `CheckOwaspTop10Handler` |

---

### 🔹 Tool: `check_cwe_top25`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_cwe_top25</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scan for CWE Top 25 most dangerous software weaknesses.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ❌ | — | Optional file or directory path |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"rule\":\"CWE-89\",\"path\":\"src/app.js\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `CheckCweTop25Handler` |

---

### 🔹 Tool: `find_injection_vulnerabilities`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_injection_vulnerabilities</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find injection vulnerabilities (SQLi, XSS, command, path traversal) using taint analysis.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ❌ | — | Optional file path |
| `vulnerability_types` | `array` | ❌ | `all` | Types: `sql`, `xss`, `command`, `path`, `all` |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "vulnerability_types": ["all"],
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "vulnerability_types": ["sql", "xss"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"type\":\"sql\",\"path\":\"src/db.js\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repositories must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `FindInjectionVulnerabilitiesHandler` |

---

### 🔹 Tool: `trace_taint`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>trace_taint</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Trace tainted data flow from a source location.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `line` | `integer` | ✅ | `1` | Line number for taint source |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "line": 1
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/app.js",
  "line": 42
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/app.js\",\"line\":42}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `TraceTaintHandler` |

---

### 🔹 Tool: `get_taint_sources`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_taint_sources</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List identified taint sources in the codebase.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ❌ | — | Optional file path |
| `source_types` | `array` | ❌ | `all` | Source types (`user_input`, `file_read`, `database`, `environment`, `network`, `all`) |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "source_types": ["all"],
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "source_types": ["network"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/app.js\",\"line\":10}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `GetTaintSourcesHandler` |

---

### 🔹 Tool: `get_security_summary`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_security_summary</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get a security summary for a repository, including vulnerability counts.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"critical\":0,\"high\":1}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Scans local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `GetSecuritySummaryHandler` |

---

### 🔹 Tool: `explain_vulnerability`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>explain_vulnerability</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get details for a vulnerability type (rule or CWE).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `rule_id` | `string` | ❌ | — | Rule ID (e.g., OWASP-A03-001) |
| `cwe` | `string` | ❌ | — | CWE ID (e.g., CWE-89) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "rule_id": "string",
  "cwe": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "cwe": "CWE-89"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "SQL injection allows..."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | No code access required. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `ExplainVulnerabilityHandler` |

---

### 🔹 Tool: `suggest_fix`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>suggest_fix</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get suggested fixes for a specific security finding.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `line` | `integer` | ✅ | `1` | Line number of vulnerability |
| `rule_id` | `string` | ❌ | — | Rule ID that detected the issue |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "line": 1,
  "rule_id": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/app.js",
  "line": 42,
  "rule_id": "OWASP-A03-001"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Use parameterized queries..."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local file context only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/security.rs](../../../../../research/src/tool_handlers/security.rs) `SuggestFixHandler` |

---

### 🔹 Tool: `generate_sbom`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>generate_sbom</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate a Software Bill of Materials (SBOM) in CycloneDX/SPDX/JSON.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `format` | `string` | ❌ | `cyclonedx` | Output format (`cyclonedx`, `spdx`, `json`) |
| `compact` | `boolean` | ❌ | `false` | Minify JSON output |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "format": "cyclonedx",
  "compact": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "format": "spdx",
  "compact": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"bomFormat\":\"CycloneDX\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local manifests only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/supply_chain.rs](../../../../../research/src/tool_handlers/supply_chain.rs) `GenerateSbomHandler` |

---

### 🔹 Tool: `check_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Check project dependencies for known vulnerabilities using OSV.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `severity_threshold` | `string` | ❌ | `low` | Minimum severity to report |
| `include_dev` | `boolean` | ❌ | `true` | Include dev dependencies |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "severity_threshold": "low",
  "include_dev": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "severity_threshold": "high",
  "include_dev": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"dependency\":\"foo\",\"cve\":\"CVE-2024-1234\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Queries OSV database over network. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/supply_chain.rs](../../../../../research/src/tool_handlers/supply_chain.rs) `CheckDependenciesHandler` |

---

### 🔹 Tool: `check_licenses`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_licenses</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze dependency licenses for compliance issues.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `project_license` | `string` | ❌ | — | SPDX identifier for project license |
| `fail_on_copyleft` | `boolean` | ❌ | `false` | Treat copyleft licenses as issues |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "project_license": "MIT",
  "fail_on_copyleft": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "project_license": "Apache-2.0",
  "fail_on_copyleft": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"copyleft\":false}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local manifests only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/supply_chain.rs](../../../../../research/src/tool_handlers/supply_chain.rs) `CheckLicensesHandler` |

---

### 🔹 Tool: `find_upgrade_path`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_upgrade_path</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find safe upgrade paths for vulnerable dependencies.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `dependency` | `string` | ❌ | — | Specific dependency to check |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "dependency": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "dependency": "serde"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"from\":\"1.0.0\",\"to\":\"1.2.0\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | May query OSV over network. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/supply_chain.rs](../../../../../research/src/tool_handlers/supply_chain.rs) `FindUpgradePathHandler` |

---

### 🔹 Tool: `check_type_errors`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_type_errors</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find potential type errors in Python/JavaScript/TypeScript code without running external type checkers.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File or directory path |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"line\":88}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `CheckTypeErrorsHandler` |

---

### 🔹 Tool: `find_dead_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_dead_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find unreachable code blocks in a function or file using control flow analysis.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ❌ | — | Optional function name |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"line\":55}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `FindDeadCodeHandler` |

---

### 🔹 Tool: `find_dead_stores`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_dead_stores</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find variable assignments that are never read (dead stores).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ❌ | — | Optional function name |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"line\":22}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `FindDeadStoresHandler` |

---

### 🔹 Tool: `find_uninitialized`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_uninitialized</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find variables that may be used before being initialized.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ❌ | — | Optional function name |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"line\":9}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `FindUninitializedHandler` |

---

### 🔹 Tool: `find_unused_exports`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_unused_exports</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Detect exported symbols never imported by other files in the repository.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `exclude_entry_points` | `boolean` | ❌ | `true` | Exclude entry point files (e.g., `main.rs`, `index.js`) |
| `exclude_patterns` | `array` | ❌ | — | Glob patterns to exclude from analysis |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "exclude_entry_points": true,
  "exclude_patterns": ["string"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "exclude_entry_points": true,
  "exclude_patterns": ["src/public/**"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"path\":\"src/lib.rs\",\"symbol\":\"Foo\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `FindUnusedExportsHandler` |

---

### 🔹 Tool: `get_control_flow`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_control_flow</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get a control-flow graph for a function or file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ✅ | — | Function name |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "function": "foo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "digraph cfg { ... }"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Requires language support for control-flow analysis. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `GetControlFlowHandler` |

---

### 🔹 Tool: `get_data_flow`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_data_flow</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get a data-flow graph for a function or file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ✅ | — | Function name |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "function": "foo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "digraph dfg { ... }"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Requires language support for data-flow analysis. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `GetDataFlowHandler` |

---

### 🔹 Tool: `get_reaching_definitions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_reaching_definitions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Compute reaching definitions for a symbol or file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ✅ | — | Function name |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "function": "foo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"definitions\":[...]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Requires language support for data-flow analysis. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `GetReachingDefinitionsHandler` |

---

### 🔹 Tool: `get_typed_taint_flow`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_typed_taint_flow</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Compute a typed taint flow for a source/sink in a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `source_line` | `integer` | ✅ | — | Line number to trace from |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "source_line": 1
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "source_line": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"nodes\":[...]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Requires language support for taint analysis. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `GetTypedTaintFlowHandler` |

---

### 🔹 Tool: `get_import_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_import_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Build and analyze the import/dependency graph for a codebase.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `file` | `string` | ❌ | — | Optional file to focus on |
| `direction` | `string` | ❌ | `both` | Direction (`imports`, `importers`, `both`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "file": "string",
  "direction": "both"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "file": "src/lib.rs",
  "direction": "imports"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"nodes\":[...],\"edges\":[...]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `GetImportGraphHandler` |

---

### 🔹 Tool: `find_circular_imports`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_circular_imports</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Detect circular import dependencies in the codebase.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `exclude_tests` | `boolean` | ❌ | `true` | Exclude test files |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "exclude_tests": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "exclude_tests": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[[\"src/a.rs\",\"src/b.rs\"]]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `FindCircularImportsHandler` |

---

### 🔹 Tool: `infer_types`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>infer_types</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Infer types for symbols in a file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `path` | `string` | ✅ | — | File path |
| `function` | `string` | ✅ | — | Function name |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "path": "string",
  "function": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "path": "src/lib.rs",
  "function": "foo"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"symbol\":\"foo\",\"type\":\"i32\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | Requires language support for type inference. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/analysis.rs](../../../../../research/src/tool_handlers/analysis.rs) `InferTypesHandler` |

---

### 🔹 Tool: `get_code_graph`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_code_graph</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get graph visualization data (call, import, symbol, hybrid, or flow views). HTTP-only tool.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name or path |
| `view` | `string` | ❌ | `call` | View type (`call`, `import`, `symbol`, `hybrid`, `flow`) |
| `root` | `string` | ❌ | — | Root function or symbol name |
| `depth` | `integer` | ❌ | `3` | Maximum traversal depth |
| `direction` | `string` | ❌ | `both` | Direction (`callers`, `callees`, `both`) |
| `include_metrics` | `boolean` | ❌ | `true` | Include complexity metrics |
| `include_security` | `boolean` | ❌ | `false` | Overlay security info |
| `include_excerpts` | `boolean` | ❌ | `false` | Include code excerpts |
| `cluster_by` | `string` | ❌ | `none` | Cluster mode (`none`, `file`) |
| `filter` | `object` | ❌ | — | Filter options: `min_complexity`, `file_pattern` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "view": "call",
  "root": "string",
  "depth": 3,
  "direction": "both",
  "include_metrics": true,
  "include_security": false,
  "include_excerpts": false,
  "cluster_by": "none",
  "filter": {
    "min_complexity": 5,
    "file_pattern": "src/**/*.rs"
  }
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "view": "call",
  "root": "crate::main",
  "depth": 2,
  "include_metrics": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"metadata\":{...},\"nodes\":[...],\"edges\":[...]}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Structural Analysis` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Repository must be indexed. |
| **Postconditions** | None. |
| **Limits** | HTTP-only tool; not available over MCP stdio. |
| **Security & privacy** | Reads local files only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/graph.rs](../../../../../research/src/tool_handlers/graph.rs) `GetCodeGraphHandler` |

---

### 🔹 Tool: `sparql_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>sparql_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Execute a SPARQL query against the RDF knowledge graph (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | SPARQL query to execute |
| `timeout_ms` | `integer` | ❌ | `30000` | Query timeout in ms (max 300000) |
| `limit` | `integer` | ❌ | `1000` | Maximum results (max 10000) |
| `offset` | `integer` | ❌ | `0` | Offset for pagination |
| `format` | `string` | ❌ | `json` | Output format (`json`, `markdown`, `csv`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "timeout_ms": 30000,
  "limit": 1000,
  "offset": 0,
  "format": "json"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "SELECT ?s WHERE { ?s a <http://example.com/Symbol> }",
  "limit": 50,
  "format": "markdown"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"s\":\"...\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Enforces timeouts and limits. |
| **Security & privacy** | Queries local graph data only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/sparql.rs](../../../../../research/src/tool_handlers/sparql.rs) `SparqlQueryHandler` |

---

### 🔹 Tool: `list_sparql_templates`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_sparql_templates</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List available SPARQL query templates (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[\"find_functions\",\"find_calls\"]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Queries local graph metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/sparql.rs](../../../../../research/src/tool_handlers/sparql.rs) `ListSparqlTemplatesHandler` |

---

### 🔹 Tool: `run_sparql_template`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>run_sparql_template</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Execute a predefined SPARQL query template (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `template` | `string` | ✅ | — | Template name |
| `params` | `object` | ❌ | — | Template parameters |
| `timeout_ms` | `integer` | ❌ | `30000` | Query timeout in ms |
| `limit` | `integer` | ❌ | `1000` | Maximum results |
| `format` | `string` | ❌ | `json` | Output format (`json`, `markdown`, `csv`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "template": "string",
  "params": {
    "key": "value"
  },
  "timeout_ms": 30000,
  "limit": 1000,
  "format": "json"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "template": "find_functions",
  "params": {
    "name": "foo"
  },
  "format": "markdown"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"function\":\"foo\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Enforces timeouts and limits. |
| **Security & privacy** | Queries local graph data only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/sparql.rs](../../../../../research/src/tool_handlers/sparql.rs) `RunSparqlTemplateHandler` |

---

### 🔹 Tool: `get_ccg_manifest`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_ccg_manifest</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get CCG Layer 0 manifest JSON-LD for a repository (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `include_security` | `boolean` | ❌ | `true` | Include security summary |
| `base_url` | `string` | ❌ | — | Base URL for layer URIs |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "include_security": true,
  "base_url": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "include_security": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"@context\":...}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Manifest is small by design. |
| **Security & privacy** | Reads local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `GetCcgManifestHandler` |

---

### 🔹 Tool: `export_ccg_manifest`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>export_ccg_manifest</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Export CCG Layer 0 manifest to a file or return content (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `include_security` | `boolean` | ❌ | `true` | Include security summary |
| `base_url` | `string` | ❌ | — | Base URL for layer URIs |
| `output` | `string` | ❌ | — | Output file path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "include_security": true,
  "base_url": "string",
  "output": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "output": "./ccg/manifest.json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | Writes output if `output` provided. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ExportCcgManifestHandler` |

---

### 🔹 Tool: `export_ccg_architecture`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>export_ccg_architecture</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Export CCG Layer 1 architecture JSON-LD (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `output` | `string` | ❌ | — | Output file path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "output": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "output": "./ccg/architecture.json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | Writes output if `output` provided. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ExportCcgArchitectureHandler` |

---

### 🔹 Tool: `export_ccg_index`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>export_ccg_index</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Export CCG Layer 2 symbol index (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `output` | `string` | ❌ | — | Output file path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "output": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "output": "./ccg/symbol-index.nq.gz.b64"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | Writes output if `output` provided. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ExportCcgIndexHandler` |

---

### 🔹 Tool: `export_ccg_full`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>export_ccg_full</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Export CCG Layer 3 full detail (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `output` | `string` | ❌ | — | Output file path |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "output": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "output": "./ccg/full-detail.nq.gz.b64"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | Writes output if `output` provided. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ExportCcgFullHandler` |

---

### 🔹 Tool: `export_ccg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>export_ccg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Export all CCG layers as a bundle (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `output_dir` | `string` | ❌ | — | Output directory path |
| `base_url` | `string` | ❌ | — | Base URL for layer URIs |
| `include_security` | `boolean` | ❌ | `true` | Include security summary |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "output_dir": "string",
  "base_url": "string",
  "include_security": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "output_dir": "./ccg",
  "include_security": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | Writes bundle if `output_dir` provided. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local index metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ExportCcgHandler` |

---

### 🔹 Tool: `query_ccg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>query_ccg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Run a SPARQL query against CCG Layer 3 (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `query` | `string` | ✅ | — | SPARQL query |
| `timeout_ms` | `integer` | ❌ | `30000` | Query timeout in ms |
| `limit` | `integer` | ❌ | `1000` | Maximum results |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "query": "string",
  "timeout_ms": 30000,
  "limit": 1000
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "query": "SELECT ?s WHERE { ?s ?p ?o }",
  "limit": 50
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"s\":\"...\"}]"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Semantic Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Enforces timeouts and limits. |
| **Security & privacy** | Queries local graph data only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `QueryCcgHandler` |

---

### 🔹 Tool: `get_ccg_acl`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_ccg_acl</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate a WebACL access control document for CCG layers.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `repo` | `string` | ✅ | — | Repository name |
| `tier` | `string` | ❌ | `triple-heart` | Access tier (`public` or `triple-heart`) |
| `agent` | `string` | ❌ | — | Agent URI for private tier |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "repo": "string",
  "tier": "triple-heart",
  "agent": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "repo": "./my-repo",
  "tier": "public"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "@prefix acl: <http://www.w3.org/ns/auth/acl#> ..."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Generates access control metadata only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `GetCcgAclHandler` |

---

### 🔹 Tool: `get_ccg_access_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_ccg_access_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get information about CCG access tiers and permissions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `tier` | `string` | ❌ | `public` | Access tier (`public`, `authenticated`, `private`) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "tier": "public"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "tier": "private"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "# CCG Access Tier: ..."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Deterministic` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | Returns informational text only. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `GetCcgAccessInfoHandler` |

---

### 🔹 Tool: `import_ccg`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>import_ccg</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Import a CCG layer from URL or local file (requires graph feature).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `url` | `string` | ❌ | — | URL to fetch CCG layer from |
| `path` | `string` | ❌ | — | Local file path to load |
| `layer` | `string` | ❌ | — | Layer (`manifest`, `architecture`, `symbol_index`, `full_detail`, or 0-3) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "url": "string",
  "path": "string",
  "layer": "manifest"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "path": "./ccg/manifest.json",
  "layer": "manifest"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"layer\":\"Manifest\"}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Requires either `url` or `path`. |
| **Security & privacy** | May fetch remote registry content. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ImportCcgHandler` |

---

### 🔹 Tool: `import_ccg_from_registry`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>import_ccg_from_registry</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Import all CCG layers from the codecontextgraph.com registry.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `host` | `string` | ❌ | `github.com` | Git host |
| `owner` | `string` | ✅ | — | Repository owner |
| `repo` | `string` | ✅ | — | Repository name |
| `commit` | `string` | ❌ | `latest` | Commit SHA or `latest` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "host": "github.com",
  "owner": "string",
  "repo": "string",
  "commit": "latest"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "owner": "postrv",
  "repo": "narsil-mcp",
  "commit": "latest"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"layers_imported\":4}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | `None` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Idempotent` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Graph feature must be enabled. |
| **Postconditions** | None. |
| **Limits** | Pulls all layers from registry. |
| **Security & privacy** | Fetches remote registry content. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [src/tool_handlers/mod.rs](../../../../../research/src/tool_handlers/mod.rs) `ToolRegistry::new` |
| **Core implementation** | [src/tool_handlers/ccg.rs](../../../../../research/src/tool_handlers/ccg.rs) `ImportCcgFromRegistryHandler` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `None` |
| **MCP prompts exposed** *(optional)* | `None` |
| **Other RPC endpoints** *(optional)* | HTTP server (enabled with `--http`): `GET /health`, `GET /tools`, `POST /tools/call`, `GET /graph`; `/` serves embedded frontend when built with `frontend` feature. |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `NARSIL_PRESET` | ❌ | — | — | Apply a preset (`minimal`, `balanced`, `full`, `security-focused`). |
| `NARSIL_CONFIG_PATH` | ❌ | — | — | Custom config file path. |
| `NARSIL_ENABLED_CATEGORIES` | ❌ | — | — | Comma-separated category allowlist. |
| `NARSIL_DISABLED_TOOLS` | ❌ | — | — | Comma-separated tool denylist. |
| `EMBEDDING_API_KEY` | ❌ | 🔒 | — | Generic embedding API key. |
| `VOYAGE_API_KEY` | ❌ | 🔒 | — | Voyage AI API key for neural search. |
| `OPENAI_API_KEY` | ❌ | 🔒 | — | OpenAI API key for neural search. |
| `EMBEDDING_SERVER_ENDPOINT` | ❌ | — | — | Custom embedding API endpoint URL. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `.narsil.yaml` | Project-level configuration (repo root). |
| `~/.config/narsil-mcp/config.yaml` | User config (macOS: `~/Library/Application Support/narsil-mcp/config.yaml`; Windows: `%APPDATA%\narsil-mcp\config.yaml`). |

<details>
<summary><strong>Example Config</strong></summary>

```yaml
version: "1.0"
preset: "balanced"
tools:
  categories:
    Git:
      enabled: true
  overrides:
    neural_search:
      enabled: false
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--repos` | Repository path(s) to index (repeatable). |
| `--git` | Enable Git tools. |
| `--call-graph` | Enable call graph tools. |
| `--lsp` | Enable LSP integration tools. |
| `--neural` | Enable neural search tools. |
| `--remote` | Enable GitHub remote repo tools. |
| `--persist` | Persist index on disk for faster startup. |
| `--watch` | Watch for file changes and reindex. |
| `--graph` | Enable SPARQL/CCG tools (requires graph feature build). |
| `--http` | Start HTTP server for visualization API. |
| `--preset` | Apply a preset from CLI. |
| `--neural-backend` | Select neural backend (`api` or `onnx`). |
| `--neural-model` | Select embedding model (e.g., `voyage-code-2`). |
| `--reindex` | Force reindex on startup. |
| `--verbose` | Enable verbose logging. |
| `--streaming` | Stream large result sets. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install via a package manager (e.g., `brew install narsil-mcp`, `scoop install narsil-mcp`, or `cargo install narsil-mcp`). |
| 2 | Verify install: `narsil-mcp --version`. |

### 8.2 Typical Run Commands *(optional)*

```bash
# Example startup command
narsil-mcp --repos /path/to/project

# With common optional features
narsil-mcp --repos /path/to/project --git --call-graph --persist --watch
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | stdout/stderr; use `--verbose` for more detail. |
| **Tracing / Metrics** | `None` documented. |

### 8.4 Performance Considerations *(optional)*

- Use presets and category filters to limit tool count and startup latency.
- Use `--persist` and `--watch` for faster startup and incremental updates on large repos.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `90` |
| **Read-only** | `83` |
| **Write-only** | `0` |
| **Hybrid** | `7` |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Tool count in docs | Docs mention 79 tools; this report counts 90 from the tool registry. |
| Embedded frontend availability | `/` served only when built with `frontend` feature; not always present in prebuilt binaries. |

---

<div align="center">

*— End of Report —*

</div>
