<div align="center">

# 📋 MCP Server Report

## GraphRAG LangExtract MCP
### [baka3k/graph-rag-tiny](https://github.com/baka3k/graph-rag-tiny)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/baka3k/graph-rag-tiny |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 47d1ee08e6a9cdff68ac31b4ad4ba1e8f6f1356e |
| **Commit URL** *(optional)* | https://github.com/baka3k/graph-rag-tiny/commit/47d1ee08e6a9cdff68ac31b4ad4ba1e8f6f1356e |
| **License** *(required)* | Unknown |
| **Version** *(optional)* | N/A |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository at the analyzed commit, including Readme.md and mcp_graph_rag.py |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope and some return shapes inferred from tool code and README |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Relative or absolute (user-provided file paths are used by ingest scripts; MCP tools do not accept file paths) |
| **Line/column indexing** *(required)* | Unknown (not applicable in MCP tools) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | direct JSON |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

GraphRAG LangExtract MCP is a Python MCP server that exposes retrieval tools over a GraphRAG pipeline backed by Qdrant (vector search) and Neo4j (entity/relationship graph). It provides vector-only semantic search as well as graph-expanded retrieval using entity IDs extracted during ingest, returning structured passages, entities, and relations for downstream LLM or UI use.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | None |

### 1.3 Primary Capabilities *(required)*

- [x] Vector semantic search over Qdrant passages
- [x] Graph-expanded retrieval using Neo4j entities/relations
- [x] Listing of indexed source IDs and Qdrant collections
- [x] Fetching paragraph text by source and paragraph ID

### 1.4 Non-Goals / Exclusions *(optional)*

- No LLM answer generation; tools return context only.
- No ingest pipeline via MCP; ingestion is handled by separate scripts.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs as a local Python process with Neo4j and Qdrant services available. |
| **Documented integrations** *(optional)* | None |
| **Notes / constraints** *(optional)* | Requires access to Neo4j (bolt/http) and Qdrant endpoints. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Language-agnostic text; supports PDFs, DOCX, PPTX, XLSX, Markdown, and plain text via ingest scripts |
| **How to extend** *(optional)* | Swap embedding models, entity extractors, or ingest parsers. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Unknown |
| **License details** *(optional)* | No LICENSE file found in repository root. |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | neo4j, neo4j-graphrag, qdrant-client, python-dotenv, pydantic, openai, langextract, google-generativeai, pypdf, python-docx, python-pptx, openpyxl, sentence-transformers, spacy, fastmcp, lxml, gliner |
| **External / System** *(optional)* | Neo4j server, Qdrant server, spaCy model download, Hugging Face model storage |
| **Optional** *(optional)* | GLiNER model, LangExtract (Gemini/OpenAI/Azure/OpenAI compatible), OpenAI/Azure OpenAI/Gemini APIs |
| **Paid services / Tokens** *(required)* | OpenAI/Azure OpenAI/Gemini API keys (optional but required for LangExtract providers) |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | No |
| **Started independently** *(optional)* | Yes |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | Yes (.env) |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | FastMCP, Neo4j, Qdrant, SentenceTransformers |
| **Architecture notes** *(optional)* | - Query embeds text and searches Qdrant for passages
- Entity IDs from Qdrant payloads drive Neo4j expansion
- Optional heuristic rerank combines entity/type/confidence signals |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Unknown |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | NEO4J_PASS, QDRANT_KEY, AZURE_OPENAI_API_KEY, LANGEXTRACT_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | No |
| **Uses local cache** *(optional)* | Yes (model caches from Hugging Face / spaCy) |
| **Uses external DB** *(optional)* | Yes (Neo4j and Qdrant) |
| **Retains user code** *(required)* | Yes (stores ingested passages and graph data in external databases) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `get_paragraph_text` |
| 2 | `list_qdrant_collections` |
| 3 | `list_source_ids` |
| 4 | `query_graph_rag_langextract` |
| 5 | `semantic_search` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SourceId` | String identifier stored on Paragraph nodes and Qdrant payloads. |
| `EntityTypeList` | Array of entity type strings (or comma-separated string) used for relation expansion. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `Passage` | `{ text, score, source_id, paragraph_id, entity_ids?, entity_mentions? }` |
| `Entity` | `{ id, name, type }` from Neo4j Entity nodes |
| `Relation` | `{ source_id, source, source_type, relation, target_id, target, target_type }` |
| `Paragraph` | `{ text, short, source_id, paragraph_id }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | N/A (MCP tools do not accept file paths) |
| **Rate limits / retries** | Not documented |
| **File size limits** | Not documented |
| **Resource constraints** | Not documented |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Unknown |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Not documented |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `get_paragraph_text`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_paragraph_text</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetch a single paragraph from Neo4j by <code>source_id</code> and <code>paragraph_id</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `source_id` | `string` | ✅ | — | Source identifier for the document. |
| `paragraph_id` | `integer` | ✅ | — | Paragraph index within the source. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "source_id": "my_doc",
  "paragraph_id": 12
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
  "text": "The system stores entity relationships in Neo4j.",
  "short": "Stores entity relationships in Neo4j.",
  "source_id": "my_doc",
  "paragraph_id": 12
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (on database state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `fetch_paragraph_by_source` |

---

### 🔹 Tool: `list_qdrant_collections`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_qdrant_collections</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List available Qdrant collections for vector search.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters. |

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
["graph_rag_entities", "other_collection"]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (on database state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `list_qdrant_collections` |

---

### 🔹 Tool: `list_source_ids`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_source_ids</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List distinct <code>source_id</code> values from Neo4j Paragraph nodes.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `limit` | `integer` | ❌ | `50` | Maximum number of source IDs to return. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "limit": 50
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
["doc_a", "doc_b", "doc_c"]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (on database state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `list_source_ids` |

---

### 🔹 Tool: `query_graph_rag_langextract`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>query_graph_rag_langextract</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Run graph-expanded retrieval using entity extraction and Neo4j expansion to enrich Qdrant passages.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language query to embed and expand. |
| `top_k` | `integer` | ❌ | `5` | Number of top passages to return. |
| `source_id` | `string` | ❌ | — | Optional source filter; use `null` for no filter. |
| `collection` | `string` | ❌ | `graph_rag_entities` | Qdrant collection to search. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "digital key encryption",
  "top_k": 5,
  "source_id": null,
  "collection": "graph_rag_entities"
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
  "query": "digital key encryption",
  "top_k": 5,
  "source_id": null,
  "collection": "graph_rag_entities",
  "passages": [
    {
      "text": "Digital keys use envelope encryption for device provisioning.",
      "score": 0.42,
      "source_id": "doc_a",
      "paragraph_id": 3
    }
  ],
  "entities": [
    { "id": "e1", "name": "Digital Key", "type": "TECH" }
  ],
  "relations": [
    {
      "source_id": "e1",
      "source": "Digital Key",
      "source_type": "TECH",
      "relation": "RELATED",
      "target_id": "e2",
      "target": "AES",
      "target_type": "CRYPTO"
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
| **Determinism** *(optional)* | Depends (on database state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `query_graph_rag_langextract` |

---

### 🔹 Tool: `semantic_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>semantic_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Run vector-only semantic search over Qdrant passages.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Natural language query to embed and search. |
| `top_k` | `integer` | ❌ | `8` | Number of top passages to return. |
| `source_id` | `string` | ❌ | — | Optional source filter; use `null` for no filter. |
| `collection` | `string` | ❌ | `graph_rag_entities` | Qdrant collection to search. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "zero trust policy",
  "top_k": 8,
  "source_id": null,
  "collection": "graph_rag_entities"
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
  "query": "zero trust policy",
  "top_k": 8,
  "source_id": null,
  "collection": "graph_rag_entities",
  "passages": [
    {
      "text": "Zero trust policies require continuous verification of users.",
      "score": 0.31,
      "source_id": "doc_a",
      "paragraph_id": 5,
      "entity_ids": ["e1", "e2"]
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
| **Determinism** *(optional)* | Depends (on database state) |
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `semantic_search` |

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
| `NEO4J_URI` | ✅ | — | `bolt://localhost:7687` | Neo4j connection URI. |
| `NEO4J_USER` | ✅ | — | `neo4j` | Neo4j username. |
| `NEO4J_PASS` | ✅ | 🔒 | — | Neo4j password. |
| `QDRANT_HOST` | ✅ | — | `localhost` | Qdrant host. |
| `QDRANT_PORT` | ✅ | — | `6333` | Qdrant port. |
| `QDRANT_KEY` | ❌ | 🔒 | — | Qdrant API key, if enabled. |
| `EMBEDDING_MODEL` | ❌ | — | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model name or path. |
| `GLINER_LOCAL_ONLY` | ❌ | — | `0` | Whether to use local-only GLiNER model. |
| `DEFAULT_ENTITY_TYPES` | ❌ | — | `ORG,PERSON,TECH` | Comma-separated default entity types. |
| `HF_HUB_OFFLINE` | ❌ | — | `0` | Hugging Face offline mode. |
| `LANGEXTRACT_MODEL_ID` | ❌ | — | — | LangExtract model ID (e.g., gemini-2.5-flash). |
| `LANGEXTRACT_API_KEY` | ❌ | 🔒 | — | LangExtract provider API key. |
| `OPENAI_API_KEY` | ❌ | 🔒 | — | OpenAI API key for LangExtract provider. |
| `AZURE_OPENAI_API_KEY` | ❌ | 🔒 | — | Azure OpenAI API key for LangExtract provider. |
| `GEMINI_API_KEY` | ❌ | 🔒 | — | Gemini API key for LangExtract provider. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `.env` | Store service connection settings and API keys. |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "NEO4J_URI": "bolt://localhost:7687",
  "NEO4J_USER": "neo4j",
  "NEO4J_PASS": "neo4j_pass",
  "QDRANT_HOST": "localhost",
  "QDRANT_PORT": "6333"
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--host` | Host interface to bind the MCP HTTP server. |
| `--port` | HTTP port for the MCP server. |
| `--transport` | Transport type (e.g., streamable-http). |
| `--path` | MCP endpoint path. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Python dependencies (for example, `pip install -r requirements.txt`). |
| 2 | Start Neo4j and Qdrant services and ensure they are reachable. |

### 8.2 Typical Run Commands *(optional)*

```bash
python mcp_graph_rag.py --host 127.0.0.1 --port 8789 --transport streamable-http --path /mcp
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Not documented; relies on standard output/errors. |
| **Tracing / Metrics** | None documented. |

### 8.4 Performance Considerations *(optional)*

- Query latency depends on embedding model speed and Qdrant/Neo4j performance.
- Graph expansion depth and relation limits can significantly affect response size and runtime.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 5 |
| **Read-only** | 5 |
| **Write-only** | 0 |
| **Hybrid** | 0 |

### 9.2 Known Gaps *(optional)*

- License and version were not documented in the repository.
- stdio transport support not explicitly documented.

---

<div align="center">

*— End of Report —*

</div><div align="center">

# 📋 MCP Server Report

|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `fetch_paragraph_by_source` |

---

### 🔹 Tool: `list_qdrant_collections`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_qdrant_collections</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List available Qdrant collections for vector search.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters. |

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
| **Idempotency** *(optional)* | Idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | mcp_graph_rag.py: `register_tools` |
| **Core implementation** | mcp_graph_rag.py: `semantic_search` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |

### 7.1 Environment Variables *(optional)*

| `NEO4J_PASS` | ❌ | 🔒 | `password` | Neo4j password. |
| `NEO4J_USERNAME` | ❌ | — | `neo4j` | Alternate Neo4j user env. |
| `NEO4J_PASSWORD` | ❌ | 🔒 | `password` | Alternate Neo4j password env. |
| `EMBEDDING_MODEL` | ❌ | — | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model name or path. |
| `GLINER_LOCAL_ONLY` | ❌ | — | `0/1` | Local-only GLiNER model flag. |
| `DEFAULT_ENTITY_TYPES` | ❌ | — | See README | Comma-separated default entity types. |
| `HF_HUB_OFFLINE` | ❌ | — | `0/1` | Hugging Face offline mode. |
| `LANGEXTRACT_MODEL_ID` | ❌ | — | — | LangExtract model ID (e.g., gemini-2.5-flash). |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
```json
  "NEO4J_URI": "bolt://localhost:7687",
  "NEO4J_USER": "neo4j",
  "NEO4J_PASS": "neo4j_pass",
  "QDRANT_HOST": "localhost",
  "QDRANT_PORT": "6333"

### 7.3 CLI Flags *(optional)*

| `--port` | HTTP port for the MCP server. |
| `--transport` | Transport type (e.g., streamable-http). |
| `--path` | MCP endpoint path. |

| Step | Command / Action |
|:-----|:-----------------|
python mcp_graph_rag.py --host 127.0.0.1 --port 8789 --transport streamable-http --path /mcp

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Tracing / Metrics** | None documented. |

### 8.4 Performance Considerations *(optional)*

- Query latency depends on embedding model speed and Qdrant/Neo4j performance.
- Graph expansion depth and relation limits can significantly affect response size and runtime.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 5 |

### 9.2 Known Gaps *(optional)*

- License and version were not documented in the repository.
- stdio transport support not explicitly documented.

---

<div align="center">

*— End of Report —*

</div>
