<div align="center">

# 📋 MCP Server Report

## CocoIndex Code MCP Server
### [aanno/cocoindex-code-mcp-server](https://github.com/aanno/cocoindex-code-mcp-server)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/aanno/cocoindex-code-mcp-server |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 100173e6d5efcbc7f35f8af1617ff81e7005de30 |
| **Commit URL** *(optional)* | https://github.com/aanno/cocoindex-code-mcp-server/commit/100173e6d5efcbc7f35f8af1617ff81e7005de30 |
| **License** *(required)* | AGPL-3.0-or-later |
| **Version** *(optional)* | 0.2.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository at 100173e6d5efcbc7f35f8af1617ff81e7005de30 |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — line/column indexing inferred from result formatting (not explicitly documented) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | relative (to the indexed code root passed on the CLI) |
| **Line/column indexing** *(required)* | 1-based (inferred; not explicitly documented) |
| **Encoding model** *(optional)* | UTF-8 (inferred from Python tooling defaults) |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

The CocoIndex Code MCP Server is a Model Context Protocol server that provides RAG-style code retrieval using CocoIndex. It combines vector similarity search with keyword/metadata filtering to retrieve code snippets from large codebases. The server runs over streamable HTTP and is designed to integrate with MCP clients like Claude Desktop and other MCP-compatible tools, using PostgreSQL + pgvector as the storage backend.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, Claude Code CLI, MCP-compatible clients |

### 1.3 Primary Capabilities *(required)*

- [x] Hybrid vector + keyword search over code
- [x] Pure vector similarity search
- [x] Keyword/metadata-only search
- [x] Code analysis and metadata extraction
- [x] Embedding generation for text/code
- [x] MCP resources for stats, configuration, and schema

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a general-purpose database; requires PostgreSQL + pgvector
- Not a full IDE or editor integration by itself (relies on MCP clients)

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.11+ with native wheels; OS independent per PyPI classifiers |
| **Documented integrations** *(optional)* | Claude Desktop, Claude Code, streamable-http MCP clients |
| **Notes / constraints** *(optional)* | Requires PostgreSQL with pgvector and a populated CocoIndex index |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python, Rust, JavaScript, TypeScript, TSX, Java, Kotlin, C, C++, C#, Haskell, plus many others via default CocoIndex handlers |
| **How to extend** *(optional)* | Add language handlers and mappings in `language_handlers/` and `mappers.py` (CocoIndex-based) |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | AGPL-3.0-or-later |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python, Rust (maturin extension for Haskell parsing) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | cocoindex, mcp, psycopg (pool/binary), pgvector, tree-sitter (+ language grammars), astchunk, lark-parser, click, prompt-toolkit, cachetools, numpy |
| **External / System** *(optional)* | PostgreSQL + pgvector, Rust toolchain for extension builds |
| **Optional** *(optional)* | Qdrant backend (optional implementation), dev/test tools |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | Yes (.env) |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | CocoIndex pipeline, PostgreSQL + pgvector, tree-sitter, Lark, MCP SDK |
| **Architecture notes** *(optional)* | Uses CocoIndex to build embeddings and metadata, stores in PostgreSQL/pgvector, executes searches via backend abstraction, serves MCP over streamable HTTP. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | No |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | No (not documented) |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | No (except logs/test artifacts) |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | Yes (PostgreSQL + pgvector) |
| **Retains user code** *(required)* | Yes — code chunks and metadata stored in the database for retrieval |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `code-analyze` |
| 2 | `code-embeddings` |
| 3 | `help-keyword_syntax` |
| 4 | `search-hybrid` |
| 5 | `search-keyword` |
| 6 | `search-vector` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchQuery` | Common search inputs: query text, optional language/embedding model, `top_k`, and hybrid weights |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchResult` | Standardized fields: `filename`, `language`, `code`, `location`, `start`, `end`, `score`, `score_type`, `source`, and `metadata_json` |
| `ChunkMetadata` | Metadata fields promoted from index (functions, classes, imports, complexity, async, type hints, etc.) |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | relative to indexed roots; no explicit path traversal handling in MCP layer |
| **Rate limits / retries** | Not documented; relies on database behavior |
| **File size limits** | Not documented |
| **Resource constraints** | `top_k` defaults to 10; database and embedding model limits apply |
| **Field validation** | Keyword queries validate fields against schema to prevent SQL injection |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes (in client wrappers) |
| **Error as text** | Yes — JSON error object serialized in text content |
| **Error as `{ error: string }`** | No — uses `{ error: { type, code, message } }` |
| **Common error codes** | 32603 (mcp_protocol_error) |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `code-analyze`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>code-analyze</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze a code snippet and return extracted metadata (functions, classes, async/type hints, etc.) for indexing or inspection.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | string | ✅ | — | Code content to analyze |
| `file_path` | string | ✅ | — | File path used for context/metadata |
| `language` | string | ❌ | — | Programming language (auto-detected if omitted) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "string",
  "file_path": "string",
  "language": "string"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON (serialized in MCP text content) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "file_path": "string",
  "language": "string",
  "metadata": {
    "functions": ["string"],
    "classes": ["string"],
    "imports": ["string"],
    "has_async": true,
    "has_type_hints": true,
    "complexity_score": 0,
    "analysis_method": "string"
  }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (parser/handlers) |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | None (language auto-detection if omitted) |
| **Postconditions** | Returns parsed metadata only |
| **Limits** | Parser/model limits depend on language handlers |
| **Security & privacy** | Processes provided code in-memory; no network calls unless underlying models require |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | python/cocoindex_code_mcp_server/main_mcp_server.py (`get_mcp_tools`, `call_tool`) |
| **Core implementation** | python/cocoindex_code_mcp_server/lang/python/python_code_analyzer.py (for Python) and language handlers |

---

### 🔹 Tool: `code-embeddings`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>code-embeddings</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate an embedding vector for the provided text using the configured embedding model.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `text` | string | ✅ | — | Text to generate embeddings for |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "text": "string"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON (serialized in MCP text content) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "embedding": [0.0],
  "dimensions": 768
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (embedding model) |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Embedding model must be available in runtime |
| **Postconditions** | Returns embedding vector and dimensionality |
| **Limits** | Model token limits apply |
| **Security & privacy** | Embedding computed locally; no explicit external calls documented |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | python/cocoindex_code_mcp_server/main_mcp_server.py (`get_mcp_tools`, `call_tool`) |
| **Core implementation** | python/cocoindex_code_mcp_server/cocoindex_config.py (`code_to_embedding`) |

---

### 🔹 Tool: `help-keyword_syntax`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>help-keyword_syntax</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return documentation and examples for the keyword query syntax used in metadata filtering.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | Empty JSON object |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON (serialized in MCP text content) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "keyword_query_syntax": {
    "basic_operators": ["string"],
    "boolean_logic": "string",
    "available_fields": ["string"]
  }
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

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | python/cocoindex_code_mcp_server/main_mcp_server.py (`get_mcp_tools`, `call_tool`) |
| **Core implementation** | python/cocoindex_code_mcp_server/keyword_search_parser_lark.py (syntax), `mappers.py` (fields) |

---

### 🔹 Tool: `search-hybrid`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search-hybrid</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Perform hybrid search that combines vector similarity and keyword metadata filtering, using weighted scoring.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `vector_query` | string | ✅ | — | Text to embed and search for semantic similarity |
| `keyword_query` | string | ✅ | — | Keyword filter query (field:value, exists(field), value_contains(...)) |
| `language` | string | ❌ | — | Language for embedding model selection (required when using vector search unless embedding model provided) |
| `embedding_model` | string | ❌ | — | Explicit embedding model identifier |
| `top_k` | integer | ❌ | 10 | Number of results to return |
| `vector_weight` | number | ❌ | 0.7 | Weight for vector similarity score |
| `keyword_weight` | number | ❌ | 0.3 | Weight for keyword match score |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "vector_query": "string",
  "keyword_query": "string",
  "language": "string",
  "embedding_model": "string",
  "top_k": 10,
  "vector_weight": 0.7,
  "keyword_weight": 0.3
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON (serialized in MCP text content) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "query": {
    "vector_query": "string",
    "keyword_query": "string",
    "top_k": 10,
    "vector_weight": 0.7,
    "keyword_weight": 0.3
  },
  "results": [
    {
      "filename": "string",
      "language": "string",
      "code": "string",
      "score": 0.0,
      "start": 1,
      "end": 2,
      "source": "string",
      "score_type": "hybrid_combined",
      "location": "string",
      "source_name": "string",
      "metadata_json": {}
    }
  ],
  "total_results": 0
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (index state, embeddings) |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | PostgreSQL + pgvector must be running; index populated |
| **Postconditions** | None (read-only search) |
| **Limits** | `top_k` limits results; vector model must match stored embeddings |
| **Security & privacy** | Queries database only; no external network calls documented |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | python/cocoindex_code_mcp_server/main_mcp_server.py (`get_mcp_tools`, `call_tool`) |
| **Core implementation** | python/cocoindex_code_mcp_server/db/pgvector/hybrid_search.py (`HybridSearchEngine.search`) |

---

### 🔹 Tool: `search-keyword`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search-keyword</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Perform keyword/metadata-only search using field filters and boolean logic.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | string | ✅ | — | Keyword search query with AND/OR operators |
| `top_k` | integer | ❌ | 10 | Number of results to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "top_k": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON (serialized in MCP text content) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "query": {
    "query": "string",
    "top_k": 10
  },
  "results": [
    {
      "filename": "string",
      "language": "string",
      "code": "string",
      "score": 0.0,
      "start": 1,
      "end": 2,
      "source": "string",
      "score_type": "keyword_match",
      "location": "string",
      "source_name": "string",
      "metadata_json": {}
    }
  ],
  "total_results": 0
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (index state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | python/cocoindex_code_mcp_server/main_mcp_server.py (`get_mcp_tools`, `call_tool`) |
| **Core implementation** | python/cocoindex_code_mcp_server/keyword_search_parser_lark.py; python/cocoindex_code_mcp_server/backends/postgres_backend.py |

---

### 🔹 Tool: `search-vector`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search-vector</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Perform vector similarity search against the indexed code embeddings.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | string | ✅ | — | Text to embed and search for semantic similarity |
| `language` | string | ❌ | — | Language for embedding model selection (required unless embedding model provided) |
| `embedding_model` | string | ❌ | — | Explicit embedding model identifier |
| `top_k` | integer | ❌ | 10 | Number of results to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "language": "string",
  "embedding_model": "string",
  "top_k": 10
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON (serialized in MCP text content) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "query": {
    "query": "string",
    "top_k": 10
  },
  "results": [
    {
      "filename": "string",
      "language": "string",
      "code": "string",
      "score": 0.0,
      "start": 1,
      "end": 2,
      "source": "string",
      "score_type": "vector_similarity",
      "location": "string",
      "source_name": "string",
      "metadata_json": {}
    }
  ],
  "total_results": 0
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (embedding model, index state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | python/cocoindex_code_mcp_server/main_mcp_server.py (`get_mcp_tools`, `call_tool`) |
| **Core implementation** | python/cocoindex_code_mcp_server/db/pgvector/hybrid_search.py (`HybridSearchEngine.search`) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `cocoindex://search/stats` (search-statistics), `cocoindex://search/config` (search-configuration), `cocoindex://database/schema` (database-schema), `cocoindex://search/examples` (search:examples), `cocoindex://search/grammar` (search-keyword-grammar), `cocoindex://search/operators` (search-operators), `cocoindex://debug/example_resource` (debug-example_resource) |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | None |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `COCOINDEX_DATABASE_URL` | ✅ | 🔒 | — | PostgreSQL connection string for CocoIndex |
| `DATABASE_URL` | ❌ | 🔒 | — | Alternate connection string used for rescan logic |
| `DB_HOST` | ❌ | — | `localhost` | Postgres host (legacy/README example) |
| `DB_PORT` | ❌ | — | `5432` | Postgres port (legacy/README example) |
| `DB_NAME` | ❌ | — | `cocoindex` | Database name (legacy/README example) |
| `DB_USER` | ❌ | 🔒 | `postgres` | Database user (legacy/README example) |
| `DB_PASSWORD` | ❌ | 🔒 | — | Database password (legacy/README example) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| .env | Local environment variables for database connection |
| .mcp.json | Example MCP client configuration (not required for server) |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `paths` | Positional paths to index |
| `--paths` | Alternative explicit paths argument |
| `--no-live` | Disable live update mode |
| `--poll` | Polling interval for live updates (seconds) |
| `--default-embedding` | Use default CocoIndex embedding |
| `--default-chunking` | Use default CocoIndex chunking |
| `--default-language-handler` | Use default CocoIndex language handling |
| `--chunk-factor-percent` | Adjust chunk size scaling factor |
| `--port` | HTTP port for MCP server |
| `--log-level` | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `--json-response` | Return JSON instead of SSE stream |
| `--rescan` | Clear DB tables before re-indexing |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `uv sync && uv sync --all-extras` |
| 2 | `maturin develop` (build from source) or `pip install cocoindex-code-mcp-server` |
| 3 | Start PostgreSQL + pgvector and set `COCOINDEX_DATABASE_URL` |

### 8.2 Typical Run Commands *(optional)*

```bash
python -m cocoindex_code_mcp_server.main_mcp_server --rescan --port 3033 /path/to/code
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging to stdout; level controlled by `--log-level` |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Initial indexing can be slow for large repos; live updates rely on polling interval.
- Vector queries require embedding model alignment with stored embeddings.
- Database performance depends on pgvector indexing and table size.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 6 |

### 9.2 Known Gaps *(optional)*

- Resource payload schemas are not fully specified in docs; inferred from tests.
- Exact line/column indexing not explicitly documented; inferred from usage.

---

<div align="center">

*— End of Report —*

</div>
