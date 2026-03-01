<div align="center">

# 📋 MCP Server Report

## Headroom CCR MCP Server
### [chopratejas/headroom](https://github.com/chopratejas/headroom)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/chopratejas/headroom |
| **Target Path** *(optional)* | headroom/ccr |
| **Analyzed Ref** *(required)* | 1aa312b92300d29da1aaba922ce5ed6a488cec2b |
| **Commit URL** *(optional)* | https://github.com/chopratejas/headroom/commit/1aa312b92300d29da1aaba922ce5ed6a488cec2b |
| **License** *(required)* | Apache-2.0 |
| **Version** *(optional)* | 0.3.1 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | headroom/ccr MCP server and related docs at 1aa312b92300d29da1aaba922ce5ed6a488cec2b |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope inferred from MCP SDK usage |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | relative (to local files and proxy storage) |
| **Line/column indexing** *(required)* | Not applicable (no code location APIs) |
| **Encoding model** *(optional)* | UTF-8 (inferred) |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Headroom is a context-optimization layer for LLM applications. Its CCR (Compress-Cache-Retrieve) MCP server exposes a single tool, `headroom_retrieve`, which lets MCP clients (notably Claude Code subscription users) retrieve full, uncompressed content that was previously compressed by the Headroom proxy. This enables reversible compression while preserving accuracy and reducing token costs.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Code (subscription users), Claude Desktop via MCP config |

### 1.3 Primary Capabilities *(required)*

- [x] MCP tool to retrieve original content from compression hashes
- [x] Proxy-backed retrieval via HTTP endpoint
- [x] Direct retrieval from local CompressionStore

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a general-purpose MCP toolbox; only CCR retrieval is exposed
- Not a compression engine itself (depends on Headroom proxy and CompressionStore)

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.10+ (OS independent) |
| **Documented integrations** *(optional)* | Claude Code MCP configuration, Headroom proxy |
| **Notes / constraints** *(optional)* | Requires Headroom proxy or direct CompressionStore access |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Language-agnostic (returns stored compressed content) |
| **How to extend** *(optional)* | Add more MCP tools in `headroom/ccr/mcp_server.py` |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | Apache-2.0 |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | mcp, httpx (HTTP mode), pydantic, click |
| **External / System** *(optional)* | Headroom proxy service (for HTTP mode) |
| **Optional** *(optional)* | Direct CompressionStore access (same process) |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (via CLI) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | Yes (`~/.claude/mcp.json`) |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP Python SDK, Headroom CompressionStore, HTTP proxy |
| **Architecture notes** *(optional)* | MCP server exposes a single retrieval tool that calls the proxy’s `/v1/retrieve` or local store. |

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
| **Uses local cache** *(optional)* | Yes (CompressionStore in proxy/local process) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes — compressed content stored in proxy cache with TTL |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `headroom_retrieve` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `RetrieveRequest` | `{ hash: string, query?: string }` |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `RetrieveResponse` | `{ hash, original_content?, results?, error?, count? }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Not applicable |
| **Rate limits / retries** | Not documented; depends on proxy |
| **File size limits** | Not documented |
| **Resource constraints** | Retrieval limited by stored content TTL (5 minutes) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown (depends on client wrapper) |
| **Error as text** | Yes — JSON error object in text content |
| **Error as `{ error: string }`** | Yes |
| **Common error codes** | Not documented |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `headroom_retrieve`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>headroom_retrieve</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieve original uncompressed content associated with a compression hash. Optionally filter results by a query string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `hash` | string | ✅ | — | Hash key from compression marker (e.g., `hash=abc123`) |
| `query` | string | ❌ | — | Optional search query to filter results |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "hash": "string",
  "query": "string"
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
  "hash": "string",
  "original_content": "string",
  "original_item_count": 0,
  "compressed_item_count": 0,
  "retrieval_count": 0,
  "results": ["string"],
  "count": 0,
  "error": "string"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends (cache TTL, proxy state) |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Proxy must be running unless `--direct` mode is used |
| **Postconditions** | None |
| **Limits** | Compression entries expire after ~5 minutes |
| **Security & privacy** | Returns stored content; no external network calls beyond proxy |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | headroom/ccr/mcp_server.py (`list_tools`, `call_tool`) |
| **Core implementation** | headroom/ccr/mcp_server.py (`_retrieve_via_proxy`, `_retrieve_direct`) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | None |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `HEADROOM_PROXY_URL` | ❌ | — | `http://127.0.0.1:8787` | Proxy URL for retrieval requests |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `~/.claude/mcp.json` | Claude Code MCP server configuration |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--proxy-url` | Set proxy URL for retrieval |
| `--direct` | Use direct CompressionStore access |
| `--debug` | Enable debug logging |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `pip install "headroom-ai[mcp]"` |
| 2 | `headroom mcp install` (configure Claude Code) |
| 3 | `headroom proxy` (start proxy) |

### 8.2 Typical Run Commands *(optional)*

```bash
headroom mcp serve --proxy-url http://127.0.0.1:8787
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging to stdout; `--debug` enables DEBUG level |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Retrieval depends on proxy availability and cache TTL.
- Large compressed payloads may increase response size on retrieval.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 1 |

### 9.2 Known Gaps *(optional)*

- No explicit resource/prompt surfaces beyond the single tool.

| Category | Count |
|:---------|------:|
| **Read-only** | 1 |
| **Write-only** | 0 |
| **Hybrid** | 0 |

### 9.3 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| None identified | — |

---

<div align="center">

*— End of Report —*

</div>
