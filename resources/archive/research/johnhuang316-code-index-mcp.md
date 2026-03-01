<div align="center">

# 📋 MCP Server Report

## Code Index MCP
### [johnhuang316/code-index-mcp](https://github.com/johnhuang316/code-index-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/johnhuang316/code-index-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 428613fafb5eefd8584c45be44d1cf8fd18411f0 |
| **Commit URL** *(optional)* | https://github.com/johnhuang316/code-index-mcp/commit/428613fafb5eefd8584c45be44d1cf8fd18411f0 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 2.13.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository analysis at the commit ref listed above |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — some output shapes inferred from service names and docstrings |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Paths are resolved against the configured project path; file resource uses `files://{file_path}` |
| **Line/column indexing** *(required)* | 1-based for symbol extraction (inferred) |
| **Encoding model** *(optional)* | UTF-8 with fallback encodings (inferred from file utilities) |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | Direct JSON from FastMCP tool return values |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Code Index MCP is a Python MCP server that indexes local repositories and exposes advanced search, file discovery, and code analysis utilities for AI assistants. It supports multi-language indexing (tree-sitter for core languages plus fallback indexing), provides deep symbol analysis with a build step, and offers file watcher auto-refresh to keep the index up to date.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, Codex CLI, MCP Inspector |

### 1.3 Primary Capabilities *(required)*

- [x] Project initialization and indexing (shallow + deep)
- [x] Advanced search with regex/fuzzy options
- [x] File discovery via glob patterns
- [x] File summary and symbol body extraction
- [x] Auto-refresh via file watcher
- [x] Temp directory management and settings reset

### 1.4 Non-Goals / Exclusions *(optional)*

- Does not run code execution; focuses on indexing and analysis.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.10+ |
| **Documented integrations** *(optional)* | MCP stdio and SSE/streamable-http clients |
| **Notes / constraints** *(optional)* | Requires file system access to project path; tree-sitter libs required for deep index |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python, JavaScript, TypeScript, Java, Go, Objective-C, Zig (deep); 50+ others via fallback indexing |
| **How to extend** *(optional)* | Add parsing strategies or update tree-sitter bindings |

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
| **Runtime** *(required)* | mcp, watchdog, tree-sitter, tree-sitter-javascript, tree-sitter-typescript, tree-sitter-java, tree-sitter-kotlin, tree-sitter-c-sharp, tree-sitter-zig, pathspec, msgpack |
| **External / System** *(optional)* | Search tools (ugrep/ripgrep/ag/grep) if available |
| **Optional** *(optional)* | Docker runtime (optional) |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Mixed |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI, FastMCP) |
| **Env vars used** *(optional)* | None documented |
| **Config files used** *(optional)* | `.well-known/mcp.json`, `fastmcp.json` (manifest files) |
| **CLI flags used** *(optional)* | `--project-path`, `--transport`, `--mount-path`, `--indexer-path`, `--tool-prefix`, `--port` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | FastMCP, tree-sitter, watchdog, search CLI tools |
| **Architecture notes** *(optional)* | Service-oriented architecture with indexing, search, and file watcher services; uses FIFO concurrency limiter |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | Yes |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None documented |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (index data under temp directory) |
| **Uses local cache** *(optional)* | Yes (index cache) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes — indexed metadata stored locally |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `build_deep_index` |
| 2 | `check_temp_directory` |
| 3 | `clear_settings` |
| 4 | `configure_file_watcher` |
| 5 | `create_temp_directory` |
| 6 | `find_files` |
| 7 | `get_file_summary` |
| 8 | `get_file_watcher_status` |
| 9 | `get_settings_info` |
| 10 | `get_symbol_body` |
| 11 | `refresh_index` |
| 12 | `refresh_search_tools` |
| 13 | `search_code_advanced` |
| 14 | `set_project_path` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchOptions` | `{ pattern, case_sensitive, context_lines, file_pattern, fuzzy, regex, start_index, max_results }` |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `FileSummary` | `{ line_count, symbols, imports, complexity }` |
| `SymbolBody` | `{ symbol_name, type, line, end_line, code, signature }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Project path must be initialized via `set_project_path` or `--project-path` |
| **Rate limits / retries** | FIFO concurrency limiter (max 3 concurrent) |
| **File size limits** | Not documented |
| **Resource constraints** | Search pagination defaults to 10 results |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown (FastMCP handles tool errors) |
| **Error as text** | Yes (string error messages) |
| **Error as `{ error: string }`** | Yes (e.g., `queue_timeout`) |
| **Common error codes** | `queue_timeout` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

### 🔹 Tool: `build_deep_index`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>build_deep_index</code></td></tr>
<tr><td><strong>Description</strong></td><td>Builds the deep index with full symbol extraction for the current project.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "success", "message": "Deep index built" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `General Research` |
| **Side effects** | Rebuilds index data on disk |

---

### 🔹 Tool: `check_temp_directory`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>check_temp_directory</code></td></tr>
<tr><td><strong>Description</strong></td><td>Checks the status of the temporary directory used for index storage.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "temp_directory": "/tmp/code_indexer", "exists": true }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `clear_settings`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>clear_settings</code></td></tr>
<tr><td><strong>Description</strong></td><td>Clears settings and cached index data.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "success", "message": "Settings cleared" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Removes cached settings/index files |

---

### 🔹 Tool: `configure_file_watcher`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>configure_file_watcher</code></td></tr>
<tr><td><strong>Description</strong></td><td>Configures auto-refresh file watcher settings.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `enabled` | `boolean` | ❌ | — | Enable/disable watcher |
| `debounce_seconds` | `number` | ❌ | — | Debounce interval |
| `additional_exclude_patterns` | `array` | ❌ | — | Extra exclude globs |
| `observer_type` | `string` | ❌ | — | `auto`, `kqueue`, `fsevents`, `polling` |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "enabled": true, "debounce_seconds": 1.0 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "success", "message": "File watcher updated" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Starts/stops watcher threads |

---

### 🔹 Tool: `create_temp_directory`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>create_temp_directory</code></td></tr>
<tr><td><strong>Description</strong></td><td>Creates the temp directory used for index storage.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "temp_directory": "/tmp/code_indexer", "created": true }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Creates directories on disk |

---

### 🔹 Tool: `find_files`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_files</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds files by glob patterns using the in-memory index.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Glob pattern (e.g., `**/*.py`) |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "pattern": "src/**/*.ts" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "files": ["src/app.ts", "src/utils.ts"] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `get_file_summary`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_file_summary</code></td></tr>
<tr><td><strong>Description</strong></td><td>Analyzes a file and returns structure, symbols, and complexity info (requires deep index).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File to analyze |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "file_path": "src/app.ts" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "line_count": 120, "symbols": ["App"], "imports": ["react"] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `get_file_watcher_status`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_file_watcher_status</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns the status and stats of the file watcher.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "active": true, "status": "monitoring" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `get_settings_info`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_settings_info</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns current settings and project configuration details.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "project_path": "/repo", "index_status": "loaded" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `get_symbol_body`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_symbol_body</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns the source body for a symbol (function/method/class) from a file.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File containing the symbol |
| `symbol_name` | `string` | ✅ | — | Symbol name |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "file_path": "src/app.ts", "symbol_name": "App" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "symbol_name": "App", "type": "function", "line": 10, "end_line": 42, "code": "function App() { return <div />; }" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `refresh_index`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>refresh_index</code></td></tr>
<tr><td><strong>Description</strong></td><td>Rebuilds the shallow file index after changes.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "success", "message": "Index refreshed" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `General Research` |
| **Side effects** | Updates index data on disk |

---

### 🔹 Tool: `refresh_search_tools`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>refresh_search_tools</code></td></tr>
<tr><td><strong>Description</strong></td><td>Re-detects available command-line search tools.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "success", "message": "Search tools refreshed" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Updates internal search tool preference |

---

### 🔹 Tool: `search_code_advanced`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_code_advanced</code></td></tr>
<tr><td><strong>Description</strong></td><td>Searches code with regex/fuzzy support, file filters, and pagination.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Search pattern |
| `case_sensitive` | `boolean` | ❌ | `true` | Case sensitivity |
| `context_lines` | `number` | ❌ | `0` | Context lines around matches |
| `file_pattern` | `string` | ❌ | — | Glob filter |
| `fuzzy` | `boolean` | ❌ | `false` | Fuzzy search (ugrep) |
| `regex` | `boolean` | ❌ | — | Treat pattern as regex |
| `start_index` | `number` | ❌ | `0` | Pagination start |
| `max_results` | `number` | ❌ | `10` | Maximum results |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "pattern": "auth", "file_pattern": "*.py", "max_results": 20 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "matches": [ { "file": "src/auth.py", "line": 42, "text": "def check_auth(token):" } ], "next_index": 10 }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `set_project_path`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>set_project_path</code></td></tr>
<tr><td><strong>Description</strong></td><td>Initializes the project path and prepares indexes and settings.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Project root path |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "/repo" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "success", "message": "Project initialized" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes settings/index data and starts watcher |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `files://{file_path}` resource for file contents |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | SSE/streamable-http endpoints when using those transports |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `HOME`, `APPDATA`, `LOCALAPPDATA` | ❌ | — | OS defaults | Required for `uvx` on Windows when using Codex CLI |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `.well-known/mcp.json` | MCP manifest |
| `.well-known/mcp.llmfeed.json` | LLM feed metadata |
| `fastmcp.json` | FastMCP entrypoint manifest |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--project-path` | Initialize project path at startup |
| `--transport` | `stdio`, `sse`, or `streamable-http` |
| `--mount-path` | SSE mount path |
| `--indexer-path` | Custom index storage path |
| `--tool-prefix` | Prefix tool names |
| `--port` | Port for SSE transport |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `uvx code-index-mcp` (recommended) |
| 2 | `pip install code-index-mcp` (alternative) |

### 8.2 Typical Run Commands *(optional)*

```bash
uvx code-index-mcp --project-path /absolute/path/to/repo
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | stderr only (errors); no file logging by default |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Deep indexing is more expensive; use only when symbol data is required.
- File watcher uses debounce and can be disabled for large repos.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 14 |
| **Read-only** | 7 |
| **Write-only** | 2 |
| **Hybrid** | 5 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Exact output schema for search results | Service response format inferred from README examples |

---

<div align="center">

*— End of Report —*

</div>
