<div align="center">

# 📋 MCP Server Report

## Smart Coding MCP
### [omar-haris/smart-coding-mcp](https://github.com/omar-haris/smart-coding-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/omar-haris/smart-coding-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | ef8e842fdd5002247a436056b7650f60fd99279b |
| **Commit URL** *(optional)* | https://github.com/omar-haris/smart-coding-mcp/commit/ef8e842fdd5002247a436056b7650f60fd99279b |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 2.3.3 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository review at the analyzed ref |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | No |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | absolute (workspace paths discovered with full paths; results may display relative paths to the configured workspace) |
| **Line/column indexing** *(required)* | 1-based |
| **Encoding model** *(optional)* | UTF-8 |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Smart Coding MCP is a local MCP server that indexes a codebase with AI embeddings and provides semantic code search to AI assistants. It builds an on-disk cache of code chunks and embeddings, enabling meaning-based search, incremental indexing, and hybrid search that blends semantic similarity with exact text matching.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | VS Code, Cursor, Windsurf, Claude Desktop, OpenCode, Raycast, Antigravity |

### 1.3 Primary Capabilities *(required)*

- [x] Semantic code search with hybrid (semantic + exact match) ranking
- [x] Incremental and on-demand codebase indexing with cache persistence
- [x] Workspace switching and server status reporting
- [x] Package version lookup across multiple registries

### 1.4 Non-Goals / Exclusions *(optional)*

- No telemetry or remote code transmission (runs fully locally)
- Not a full language server or code execution environment

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js >= 18; runs locally on major desktop OSes |
| **Documented integrations** *(optional)* | VS Code, Cursor, Windsurf, Claude Desktop, OpenCode, Raycast, Antigravity |
| **Notes / constraints** *(optional)* | Some clients require absolute workspace paths; uses local disk for caching |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Determined by file extension list in configuration (broad multi-language support) |
| **How to extend** *(optional)* | Add extensions and ignore patterns in configuration to include additional languages |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | JavaScript (Node.js, ESM) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | @modelcontextprotocol/sdk, @huggingface/transformers, better-sqlite3, chokidar, fastembed, fdir, glob, web-tree-sitter |
| **External / System** *(optional)* | SQLite (via better-sqlite3), ONNX runtime via transformers.js |
| **Optional** *(optional)* | None documented |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | Yes ([config.json](../../../../../research/config.json)) |
| **CLI flags used** *(optional)* | Yes (`--workspace`) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Local embeddings (transformers.js / fastembed), SQLite cache, optional AST chunking (tree-sitter) |
| **Architecture notes** *(optional)* | Progressive background indexing; hybrid search combines semantic similarity with exact-match boosting; cache stored on disk |

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
| **Writes local files** *(required)* | Yes (cache directory) |
| **Uses local cache** *(optional)* | Yes (.smart-coding-cache with SQLite database) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes (stores code chunks and embeddings in local cache) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `a_semantic_search` |
| 2 | `b_index_codebase` |
| 3 | `c_clear_cache` |
| 4 | `d_check_last_version` |
| 5 | `e_set_workspace` |
| 6 | `f_get_status` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| None | No shared input schema beyond per-tool JSON payloads |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| TextResponse | MCP content array with text payloads |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Absolute paths required for workspace switching; search uses configured workspace root |
| **Rate limits / retries** | Package version checks use retry attempts and timeout; indexing uses throttling |
| **File size limits** | Configurable max file size (default 1 MB) |
| **Resource constraints** | CPU throttling, worker limits, batch delays; progressive indexing | 

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (error messages are returned in content text) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | None documented |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `a_semantic_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>a_semantic_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs hybrid semantic search across the indexed codebase using local embeddings and exact-match boosting. Returns the most relevant code snippets with file locations and line ranges.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language or keyword query describing the desired code |
| `maxResults` | `number` | ❌ | Configured max results | Maximum number of results to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "where do we handle authentication",
  "maxResults": 5
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "## Result 1 (Relevance: 92.1%)\n**File:** src/auth.ts\n**Lines:** 10-45\n..."
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
| **Determinism** *(optional)* | Depends (may vary while indexing progresses) |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Codebase must be indexed for full results |
| **Postconditions** | None |
| **Limits** | Limited by `maxResults` and configured chunking settings |
| **Security & privacy** | Local-only search; results are derived from local cache |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | Unknown |
| **Core implementation** | Unknown |

---

### 🔹 Tool: `b_index_codebase`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>b_index_codebase</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Triggers a codebase indexing run to build or refresh the embeddings cache. Supports a force option to reindex even if files are unchanged.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `force` | `boolean` | ❌ | `false` | Force full reindex even if files appear unchanged |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "force": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Codebase reindexed successfully... Total files in index: 123... Total code chunks: 456"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes embeddings cache; consumes CPU and disk I/O |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Workspace path must be valid and accessible |
| **Postconditions** | Cache updated with new embeddings and file hashes |
| **Limits** | Respects max file size, file extension filters, and throttling |
| **Security & privacy** | Operates locally; writes cached code snippets to disk |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | Unknown |
| **Core implementation** | Unknown |

---

### 🔹 Tool: `c_clear_cache`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>c_clear_cache</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Clears the embeddings cache to force a full rebuild on the next indexing or search operation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Cache cleared successfully. Next indexing will be a full rebuild.\n\nCache directory: ..."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Deletes local cache data |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Indexing must not be in progress |
| **Postconditions** | Cache removed; next index rebuilds from scratch |
| **Limits** | None documented |
| **Security & privacy** | Local disk operation only |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | Unknown |
| **Core implementation** | Unknown |

---

### 🔹 Tool: `d_check_last_version`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>d_check_last_version</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Looks up the latest version of a package from its official registry across multiple ecosystems (npm, PyPI, Maven, Go, and more).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `package` | `string` | ✅ | — | Package name, optionally prefixed for ecosystem detection |
| `ecosystem` | `string` | ❌ | Auto-detected | Target ecosystem if not using a prefix |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "package": "npm:react",
  "ecosystem": "npm"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "Latest version of react (npm): 18.3.1\n\nSource: https://registry.npmjs.org/react"
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
| **Side effects** *(required)* | Network calls to public registries |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Internet access required for registry lookup |
| **Postconditions** | Cached results may be returned for repeated queries |
| **Limits** | Registry timeouts and retry limits |
| **Security & privacy** | Sends package names to public registries |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | Unknown |
| **Core implementation** | Unknown |

---

### 🔹 Tool: `e_set_workspace`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>e_set_workspace</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Switches the active workspace path at runtime, optionally clearing cache and reindexing the new workspace.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Absolute path to the new workspace directory |
| `clearCache` | `boolean` | ❌ | `false` | Clear cache before switching |
| `reindex` | `boolean` | ❌ | `true` | Trigger reindexing after switching |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "/absolute/path/to/project",
  "clearCache": false,
  "reindex": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"success\": true,\n  \"oldPath\": \"...\",\n  \"newPath\": \"...\",\n  \"cacheDirectory\": \"...\",\n  \"reindexed\": true\n}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Changes workspace state; may clear cache and reindex |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Path must exist and be a directory |
| **Postconditions** | Workspace config updated; cache directory created/updated |
| **Limits** | Reindex duration depends on codebase size |
| **Security & privacy** | Operates on local filesystem |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | Unknown |
| **Core implementation** | Unknown |

---

### 🔹 Tool: `f_get_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>f_get_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns current server status including version, workspace, cache, indexing progress, and model settings.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"version\": \"2.3.3\",\n  \"workspace\": { ... },\n  \"index\": { ... }\n}"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Server must be running |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | Returns local configuration and cache paths |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | Unknown |
| **Core implementation** | Unknown |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | None documented |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| SMART_CODING_VERBOSE | ❌ | — | false | Enable detailed logging |
| SMART_CODING_MAX_RESULTS | ❌ | — | 5 | Max search results returned |
| SMART_CODING_BATCH_SIZE | ❌ | — | 100 | Files to process in parallel |
| SMART_CODING_MAX_FILE_SIZE | ❌ | — | 1048576 | Max file size in bytes |
| SMART_CODING_CHUNK_SIZE | ❌ | — | 25 | Lines of code per chunk |
| SMART_CODING_EMBEDDING_DIMENSION | ❌ | — | 128 | Embedding dimension (64–768) |
| SMART_CODING_EMBEDDING_MODEL | ❌ | — | nomic-ai/nomic-embed-text-v1.5 | Embedding model |
| SMART_CODING_DEVICE | ❌ | — | cpu | Inference device (cpu, webgpu, auto) |
| SMART_CODING_SEMANTIC_WEIGHT | ❌ | — | 0.7 | Weight for semantic similarity |
| SMART_CODING_EXACT_MATCH_BOOST | ❌ | — | 1.5 | Boost for exact text matches |
| SMART_CODING_MAX_CPU_PERCENT | ❌ | — | 50 | CPU usage cap during indexing |
| SMART_CODING_CHUNKING_MODE | ❌ | — | smart | Chunking mode (smart, ast, line) |
| SMART_CODING_WATCH_FILES | ❌ | — | false | Auto-reindex on file changes |
| SMART_CODING_AUTO_INDEX_DELAY | ❌ | — | 5000 | Delay before background indexing (ms), false to disable |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| [config.json](../../../../../research/config.json) | Default configuration for search directory, file extensions, limits, and model settings |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "searchDirectory": ".",
  "chunkSize": 25,
  "maxResults": 5,
  "embeddingModel": "nomic-ai/nomic-embed-text-v1.5",
  "embeddingDimension": 128
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| --workspace | Absolute path to the workspace directory |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | npm install -g smart-coding-mcp |
| 2 | npm update -g smart-coding-mcp (optional update) |

### 8.2 Typical Run Commands *(optional)*

```bash
smart-coding-mcp --workspace /absolute/path/to/your/project
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | STDERR console logging |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- Progressive indexing allows search while indexing continues
- CPU throttling and worker limits help keep the machine responsive
- SQLite cache accelerates repeated searches and indexing runs

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 6 |
| **Read-only** | 3 |
| **Write-only** | 3 |
| **Hybrid** | 0 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| None | No known gaps or unknowns at this time. |

---

<div align="center">

*— End of Report —*

</div>
