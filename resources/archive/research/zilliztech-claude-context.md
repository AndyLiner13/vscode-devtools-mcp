<div align="center">

# 📋 MCP Server Report

## Claude Context MCP
### [zilliztech/claude-context](https://github.com/zilliztech/claude-context)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/zilliztech/claude-context` |
| **Target Path** *(optional)* | `packages/mcp` |
| **Analyzed Ref** *(required)* | `2484ae29b3a9c92815f1524cbb9924b3e241ec17` |
| **Commit URL** *(optional)* | https://github.com/zilliztech/claude-context/commit/2484ae29b3a9c92815f1524cbb9924b3e241ec17 |
| **License** *(required)* | `MIT` |
| **Version** *(optional)* | `0.1.3` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | packages/mcp (README.md, src/index.ts, src/handlers.ts, src/config.ts). |
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
| **Path model** *(required)* | `absolute` (tools require absolute paths) |
| **Line/column indexing** *(required)* | `Unknown` |
| **Encoding model** *(optional)* | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Claude Context MCP provides semantic code search and indexing for Claude and other MCP clients. It indexes a local codebase into a vector database (Milvus/Zilliz Cloud) and enables natural-language search over the indexed code.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Code, Cursor, VS Code, Gemini CLI, OpenAI Codex CLI |

### 1.3 Primary Capabilities *(required)*

- [x] Codebase indexing with AST or character splitters
- [x] Semantic search across large codebases
- [x] Index status and lifecycle management

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a general-purpose file system tool (limited to indexed search workflows).

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js >= 20 and < 24. |
| **Documented integrations** *(optional)* | Claude Code, Cursor, VS Code, Gemini CLI, OpenAI Codex CLI |
| **Notes / constraints** *(optional)* | Requires Milvus/Zilliz Cloud credentials and embedding provider keys. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Determined by indexed files; supports common source code file extensions. |
| **How to extend** *(optional)* | Add custom file extensions via `customExtensions`. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript (Node.js) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | `@modelcontextprotocol/sdk`, `@zilliz/claude-context-core`, `zod` |
| **External / System** *(optional)* | Node.js 20+, Milvus/Zilliz Cloud |
| **Optional** *(optional)* | Ollama (local embeddings) |
| **Paid services / Tokens** *(required)* | OpenAI/VoyageAI/Gemini API keys (embedding providers), Milvus/Zilliz token |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (`npx @zilliz/claude-context-mcp@latest`) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | No mandatory files |
| **CLI flags used** *(optional)* | `--help`, `-h` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Milvus/Zilliz Cloud vector database, embedding provider (OpenAI/VoyageAI/Gemini/Ollama) |
| **Architecture notes** *(optional)* | Indexing syncs to vector DB; search uses semantic embedding queries. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | No |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | Yes |
| **Mechanism** *(optional)* | API keys via environment variables |
| **Secrets / Env vars** *(optional)* | `OPENAI_API_KEY`, `VOYAGEAI_API_KEY`, `GEMINI_API_KEY`, `MILVUS_TOKEN` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (snapshot file) |
| **Uses local cache** *(optional)* | Yes (`mcp-codebase-snapshot.json`) |
| **Uses external DB** *(optional)* | Yes (Milvus/Zilliz Cloud) |
| **Retains user code** *(required)* | Yes (indexed embeddings stored in vector DB) |

---

## 🗂️ § 3 — Tool Index *(required)*

| # | Tool Name |
|--:|:----------|
| 1 | `clear_index` |
| 2 | `get_indexing_status` |
| 3 | `index_codebase` |
| 4 | `search_code` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CodebasePath` | Absolute path to the codebase directory. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `McpTextResponse` | MCP `content[].text` JSON string output. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Absolute path required; relative paths rejected. |
| **Rate limits / retries** | Determined by embedding provider and Milvus. |
| **File size limits** | Not documented. |
| **Resource constraints** | Indexing limited by collection limits (cloud). |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes |
| **Error as text** | Yes |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Invalid path, not indexed, collection limit reached |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `clear_index`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>clear_index</code></td></tr>
<tr><td><strong>Description</strong></td><td>Clears the vector index for a specific codebase path.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Absolute path to codebase. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "/abs/path/to/codebase" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "cleared" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Deletes index data in vector DB |

---

### 🔹 Tool: `get_indexing_status`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_indexing_status</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns indexing progress or completion status for a codebase.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Absolute path to codebase. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "/abs/path/to/codebase" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "indexing", "percentage": 42 }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

### 🔹 Tool: `index_codebase`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>index_codebase</code></td></tr>
<tr><td><strong>Description</strong></td><td>Indexes a codebase for semantic search with AST or LangChain splitters.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Absolute path to codebase. |
| `force` | `boolean` | ❌ | `false` | Force re-index. |
| `splitter` | `string` | ❌ | `ast` | `ast` or `langchain`. |
| `customExtensions` | `array<string>` | ❌ | `[]` | Extra extensions to index. |
| `ignorePatterns` | `array<string>` | ❌ | `[]` | Extra ignore patterns. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "/abs/path/to/codebase", "splitter": "ast" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "status": "started" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes embeddings to vector DB |

---

### 🔹 Tool: `search_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Runs semantic search against an indexed codebase.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Absolute path to codebase. |
| `query` | `string` | ✅ | — | Natural language query. |
| `limit` | `number` | ❌ | `10` | Max results (<=50). |
| `extensionFilter` | `array<string>` | ❌ | `[]` | File extensions filter. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": "/abs/path", "query": "authentication middleware" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "results": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | None documented |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `MCP_SERVER_NAME` | ❌ | — | `Context MCP Server` | Server name override. |
| `MCP_SERVER_VERSION` | ❌ | — | `1.0.0` | Server version override. |
| `EMBEDDING_PROVIDER` | ❌ | — | `OpenAI` | Embedding provider. |
| `EMBEDDING_MODEL` | ❌ | — | provider default | Embedding model. |
| `OPENAI_API_KEY` | ⚠️ | 🔒 | — | OpenAI key. |
| `OPENAI_BASE_URL` | ❌ | — | — | OpenAI base URL. |
| `VOYAGEAI_API_KEY` | ⚠️ | 🔒 | — | VoyageAI key. |
| `GEMINI_API_KEY` | ⚠️ | 🔒 | — | Gemini key. |
| `GEMINI_BASE_URL` | ❌ | — | — | Gemini base URL. |
| `OLLAMA_HOST` | ❌ | — | `http://127.0.0.1:11434` | Ollama host. |
| `OLLAMA_MODEL` | ❌ | — | provider default | Ollama model override. |
| `MILVUS_ADDRESS` | ❌ | — | — | Milvus address. |
| `MILVUS_TOKEN` | ❌ | 🔒 | — | Milvus token. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | N/A |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--help`, `-h` | Display help text. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `npx @zilliz/claude-context-mcp@latest` |
| 2 | Provide embedding and Milvus credentials via env vars |

### 8.2 Typical Run Commands *(optional)*

```bash
OPENAI_API_KEY=sk-... MILVUS_TOKEN=... npx @zilliz/claude-context-mcp@latest
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console logs redirected to stderr to preserve MCP output |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Indexing large codebases can be slow; use `limit` on search.
- Collection limits may prevent indexing (returns collection limit message).

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `4` |

### 9.2 Known Gaps *(optional)*

- README tool list truncated; tool set confirmed via `packages/mcp/src/index.ts`.

---

<div align="center">

*— End of Report —*

</div>
