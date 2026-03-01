<div align="center">

# 📋 MCP Server Report

## RagCode MCP
### [doITmagic/rag-code-mcp](https://github.com/doITmagic/rag-code-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/doITmagic/rag-code-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 56c4b96ac9d1bdd62bb61e57317695e93f4fe75b |
| **Commit URL** *(optional)* | https://github.com/doITmagic/rag-code-mcp/commit/56c4b96ac9d1bdd62bb61e57317695e93f4fe75b |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 1.1.21 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (README, server.json, Go source, tool schema docs) |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output shape varies by tool (`json` vs markdown strings) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Mixed (workspace file paths are typically absolute; some docs use relative) |
| **Line/column indexing** *(required)* | 1-based (line numbers in tool outputs) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | mixed (JSON strings for structured outputs, plain text for markdown-style responses) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

RagCode MCP is a privacy-first MCP server that makes local codebases AI-ready with semantic search and RAG. It indexes code into a local vector database (Qdrant) using local LLM embeddings (Ollama) and exposes MCP tools for semantic and hybrid search, symbol lookup, and workspace indexing across multiple languages.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | GitHub Copilot (VS Code), Cursor, Windsurf, Claude Desktop, Antigravity |

### 1.3 Primary Capabilities *(required)*

- [x] Semantic code search over local indexes
- [x] Hybrid keyword + semantic search for exact identifiers
- [x] Retrieve full function/type definitions and context
- [x] Find symbol implementations/usages
- [x] Index/reindex workspaces with multi-language support
- [x] Search documentation markdown

### 1.4 Non-Goals / Exclusions *(optional)*

- No cloud dependencies; all indexing/search is local
- JavaScript/TypeScript analysis is planned but not implemented yet

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Cross-platform Go binary (Linux/macOS/Windows) with Docker for dependencies |
| **Documented integrations** *(optional)* | VS Code, Cursor, Windsurf, Claude Desktop, Antigravity |
| **Notes / constraints** *(optional)* | Requires local Ollama and Qdrant (typically via Docker) |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Go, PHP, Python (plus Laravel extensions); HTML for indexing |
| **How to extend** *(optional)* | Add analyzers under internal/ragcode/analyzers and ensure workspace detection |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Go |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | github.com/modelcontextprotocol/go-sdk, github.com/qdrant/go-client, github.com/tmc/langchaingo |
| **External / System** *(optional)* | Ollama (LLM/embeddings), Qdrant (vector DB) |
| **Optional** *(optional)* | Docker (for running Ollama/Qdrant) |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI binary) |
| **Env vars used** *(optional)* | Yes (OLLAMA_*, QDRANT_*, MCP_LOG_*) |
| **Config files used** *(optional)* | Yes (config.yaml, server.json) |
| **CLI flags used** *(optional)* | Yes (config, ollama-base-url/model/embed, qdrant-url, update, health, allowed-paths, etc.) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Ollama embeddings, Qdrant vector search, MCP Go SDK |
| **Architecture notes** *(optional)* | - Indexes code into Qdrant using CodeChunk schema
- Tools query Qdrant and format results as descriptors
- Workspace manager handles multi-workspace/language collections |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Unknown |
| `sse` *(optional)* | Unknown |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (config.yaml, .ragcode/state.json, optional log file) |
| **Uses local cache** *(optional)* | Yes (.ragcode state tracking) |
| **Uses external DB** *(optional)* | Yes (Qdrant local vector DB) |
| **Retains user code** *(required)* | Yes (indexed code chunks stored locally in Qdrant) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `find_implementations` |
| 2 | `find_type_definition` |
| 3 | `get_code_context` |
| 4 | `get_function_details` |
| 5 | `hybrid_search` |
| 6 | `index_workspace` |
| 7 | `list_package_exports` |
| 8 | `search_code` |
| 9 | `search_docs` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `OutputFormat` | `json` or `markdown` (varies by tool) |
| `WorkspacePath` | `file_path` string used for workspace detection |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SymbolDescriptor` | Summary of symbol with location, signature, metadata (see docs/tool_schema_v2.md) |
| `ClassDescriptor` | Full type/class descriptor for JSON outputs |
| `FunctionDescriptor` | Full function/method descriptor for JSON outputs |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` or `relative` with resolution fallback (get_code_context) |
| **Rate limits / retries** | Not specified |
| **File size limits** | Not specified |
| **Resource constraints** | Indexing is background; Qdrant limits apply |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (tools return strings with error messages) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | Not specified (Go errors returned as text) |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `find_implementations`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_implementations</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds usages and implementations of a symbol by searching indexed code and returning snippets with locations.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `symbol_name` | `string` | ✅ | — | Symbol to find usages for. |
| `package` | `string` | ❌ | — | Optional package/namespace filter. |
| `file_path` | `string` | ✅ | — | Workspace file path for detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "symbol_name": "Handler", "file_path": "/repo/main.go" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"# Usages of `Handler`\n..."
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Workspace must be indexed for language |
| **Postconditions** | None |
| **Limits** | Returns top 20 results |
| **Security & privacy** | Reads indexed content only |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/find_implementations.go (`FindImplementationsTool`) |
| **Core implementation** | internal/tools/find_implementations.go (`Execute`) |

---

### 🔹 Tool: `find_type_definition`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_type_definition</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds a class/struct/interface definition and returns full type details (markdown or JSON).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `type_name` | `string` | ✅ | — | Type/class name to locate. |
| `package` | `string` | ❌ | — | Optional package/namespace filter. |
| `output_format` | `string` | ❌ | `markdown` | `markdown` or `json`. |
| `file_path` | `string` | ✅ | — | File path for workspace detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "type_name": "User", "output_format": "json", "file_path": "/repo/app/models/user.php" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"{\n  \"language\": \"php\", ... }"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Workspace must be indexed; type must exist |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | Returns type definition data from index or analyzer |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/find_type_definition.go (`FindTypeDefinitionTool`) |
| **Core implementation** | internal/tools/find_type_definition.go (`Execute`) |

---

### 🔹 Tool: `get_code_context`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_code_context</code></td></tr>
<tr><td><strong>Description</strong></td><td>Reads specific lines from a file and returns a context snippet with line numbers.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File to read. |
| `start_line` | `number` | ✅ | — | Start line (1-based). |
| `end_line` | `number` | ✅ | — | End line (1-based). |
| `context_lines` | `number` | ❌ | `5` | Lines of context around range. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "file_path": "/repo/main.go", "start_line": 10, "end_line": 20, "context_lines": 3 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"# main.go\n**Lines:** 10-20 ..."
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | Reads local files |
| **Determinism** | Deterministic |
| **Idempotency** | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/get_code_context.go (`GetCodeContextTool`) |
| **Core implementation** | internal/tools/get_code_context.go (`Execute`) |

---

### 🔹 Tool: `get_function_details`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_function_details</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns full function/method implementation, with optional JSON descriptor output.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `function_name` | `string` | ✅ | — | Function or method name. |
| `package` | `string` | ❌ | — | Optional package/namespace filter. |
| `output_format` | `string` | ❌ | `"markdown"` | `markdown` or `json`. |
| `file_path` | `string` | ✅ | — | Workspace file path for detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "function_name": "Handle", "output_format": "json", "file_path": "/repo/main.go" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"{\n  \"language\": \"go\", ... }"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | Reads source files for full code body |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Workspace must be indexed; function must exist |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | Reads local files for code body |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/get_function_details.go (`GetFunctionDetailsTool`) |
| **Core implementation** | internal/tools/get_function_details.go (`Execute`) |

---

### 🔹 Tool: `hybrid_search`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>hybrid_search</code></td></tr>
<tr><td><strong>Description</strong></td><td>Combines keyword matching with semantic ranking for exact identifier queries.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query. |
| `limit` | `number` | ❌ | `5` | Max results. |
| `output_format` | `string` | ❌ | `json` | `json` or `markdown`. |
| `file_path` | `string` | ✅ | — | File path for workspace detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "UserRepository", "limit": 5, "output_format": "json", "file_path": "/repo/main.go" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"[\n  {\"name\": \"UserRepository\", ...}\n]"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Workspace indexed; embedding model available |
| **Postconditions** | None |
| **Limits** | Defaults to 5 results |
| **Security & privacy** | Uses local embeddings and vector DB |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/hybrid_search.go (`HybridSearchTool`) |
| **Core implementation** | internal/tools/hybrid_search.go (`Execute`) |

---

### 🔹 Tool: `index_workspace`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>index_workspace</code></td></tr>
<tr><td><strong>Description</strong></td><td>Indexes or reindexes a workspace for semantic search, optionally recreating collections.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_path` | `string` | ✅ | — | File path used to detect workspace. |
| `language` | `string` | ❌ | — | Specific language to index. |
| `recreate` | `boolean` | ❌ | `false` | Recreate collections before indexing. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "file_path": "/repo/main.go", "recreate": true }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"✓ Indexing started for workspace ..."
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | General Research |
| **Side effects** | Creates/updates vector DB collections; writes workspace state |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Qdrant available; workspace detected |
| **Postconditions** | Indexing runs in background |
| **Limits** | Depends on workspace size |
| **Security & privacy** | Stores code chunks locally in vector DB |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/index_workspace.go (`IndexWorkspaceTool`) |
| **Core implementation** | internal/tools/index_workspace.go (`Execute`) |

---

### 🔹 Tool: `list_package_exports`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>list_package_exports</code></td></tr>
<tr><td><strong>Description</strong></td><td>Lists exported symbols in a package/namespace with optional JSON output.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `package` | `string` | ✅ | — | Package/namespace to inspect. |
| `symbol_type` | `string` | ❌ | — | Filter by kind (function, type, class, etc.). |
| `output_format` | `string` | ❌ | `"markdown"` | `markdown` or `json`. |
| `file_path` | `string` | ✅ | — | Workspace file path for detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "package": "github.com/acme/pkg", "output_format": "json", "file_path": "/repo/main.go" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text or JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
[{ "name": "Foo", "kind": "function", "location": { "file_path": "..." } }]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/list_package_exports.go (`ListPackageExportsTool`) |
| **Core implementation** | internal/tools/list_package_exports.go (`Execute`) |

---

### 🔹 Tool: `search_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Semantic search across indexed code, returning symbol descriptors or markdown snippets.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language search query. |
| `limit` | `number` | ❌ | `5` | Max results. |
| `output_format` | `string` | ❌ | `"json"` | `json` or `markdown`. |
| `file_path` | `string` | ✅ | — | Workspace file path for detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "authentication middleware", "limit": 5, "file_path": "/repo/main.go" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text or JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
[{ "name": "AuthMiddleware", "kind": "function", "location": { "file_path": "..." } }]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/search_local_index.go (`SearchLocalIndexTool`) |
| **Core implementation** | internal/tools/search_local_index.go (`Execute`) |

---

### 🔹 Tool: `search_docs`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_docs</code></td></tr>
<tr><td><strong>Description</strong></td><td>Searches indexed Markdown documentation and returns relevant snippets with file paths.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Documentation search query. |
| `limit` | `number` | ❌ | `5` | Max results. |
| `file_path` | `string` | ✅ | — | Workspace file path for detection. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "installation", "limit": 5, "file_path": "/repo/README.md" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"Found 2 relevant documentation snippets..."
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Docs index must exist; embedding model configured |
| **Postconditions** | None |
| **Limits** | Searches Markdown only |
| **Security & privacy** | Local embeddings and local vector DB |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/search_docs.go (`SearchDocsTool`) |
| **Core implementation** | internal/tools/search_docs.go (`Execute`) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | None (stdio MCP only) |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `OLLAMA_BASE_URL` | ❌ | — | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | ❌ | — | `phi3:medium` | LLM model |
| `OLLAMA_EMBED` | ❌ | — | `mxbai-embed-large` | Embedding model |
| `QDRANT_URL` | ❌ | — | `http://localhost:6333` | Qdrant URL |
| `MCP_LOG_LEVEL` | ❌ | — | `info` | Log level |
| `MCP_LOG_FILE` | ❌ | — | — | Log file path (if set) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `config.yaml` | LLM, storage, logging, workspace settings |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--config` | Path to config file |
| `--ollama-base-url` | Override Ollama base URL |
| `--ollama-model` | Override LLM model |
| `--ollama-embed` | Override embedding model |
| `--qdrant-url` | Override Qdrant URL |
| `--allowed-paths` | Comma-separated allowed workspace paths |
| `--disable-upward-search` | Disable parent directory search |
| `--auto-create-ide-rules` | Auto-create IDE rules files |
| `--version` | Print version |
| `--update` | Update to latest release |
| `--health` | Run health check and exit |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Run installer from README (downloads binary + sets up Docker) |
| 2 | Ensure Ollama + Qdrant are running |
| 3 | Launch MCP server via IDE config |

### 8.2 Typical Run Commands *(optional)*

```bash
# Run server directly
rag-code-mcp --config config.yaml

# Check health
rag-code-mcp --health
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Logs to stderr and optional `mcp.log` file |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Indexing speed depends on workspace size and embedding model
- Large models require more RAM/CPU (or GPU for Ollama)

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 9 |
| **Read-only** | 7 |
| **Write-only** | 1 |
| **Hybrid** | 1 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| MCP error envelope | Tools return text errors; MCP `isError` not consistently exposed |
| HTTP transport | Not implemented (stdio only) |

---

<div align="center">

*— End of Report —*

</div>

