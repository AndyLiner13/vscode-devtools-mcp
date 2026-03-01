<div align="center">

# 📋 MCP Server Report

## Tavily MCP Server
### [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/tavily-ai/tavily-mcp` |
| **Target Path** *(optional)* | `N/A` |
| **Analyzed Ref** *(required)* | `bcb22478b42d8c53af042e427f10fb3646ca036f` |
| **Commit URL** *(optional)* | https://github.com/tavily-ai/tavily-mcp/commit/bcb22478b42d8c53af042e427f10fb3646ca036f |
| **License** *(required)* | `MIT` |
| **Version** *(optional)* | `0.2.16` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository review (README.md, package.json, src/index.ts). |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope for non-crawl/map tools inferred from MCP SDK patterns. |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `N/A` (tools accept web URLs, not repo file paths) |
| **Line/column indexing** *(required)* | `N/A` |
| **Encoding model** *(optional)* | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

The Tavily MCP server exposes Tavily’s web intelligence APIs through MCP tools. It provides search, extract, map, crawl, and research capabilities so MCP clients can query the live web, extract content, map site structures, and perform deeper research tasks with a single server.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Code, Cursor, Claude Desktop |

### 1.3 Primary Capabilities *(required)*

- [x] Web search with configurable depth and filters
- [x] URL content extraction (markdown/text)
- [x] Website crawl and mapping
- [x] Multi-source research workflows

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs anywhere Node.js 20+ is available; also offers a hosted remote MCP endpoint. |
| **Documented integrations** *(optional)* | Claude Code, Cursor, Claude Desktop |
| **Notes / constraints** *(optional)* | Requires a Tavily API key or OAuth for hosted remote server. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | `N/A` (web search/extraction, not language-specific) |
| **How to extend** *(optional)* | N/A |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `tavily_crawl` |
| 2 | `tavily_extract` |
| 3 | `tavily_map` |
| 4 | `tavily_research` |
| 5 | `tavily_search` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TavilyUrl` | URL string accepted by Tavily endpoints. |
| `SearchDepth` | `basic` or `advanced`. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TavilyResult` | Result item with `title`, `url`, `content`, `score`, and optional metadata. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `N/A` (URL-based) |
| **Rate limits / retries** | Tavily API limits apply |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `tavily_crawl`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>tavily_crawl</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Crawls a site from a root URL and returns extracted content for discovered pages.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `url` | `string` | ✅ | — | Root URL to crawl. |
| `max_depth` | `integer` | ❌ | `1` | Maximum crawl depth from the base URL. |
| `max_breadth` | `integer` | ❌ | `20` | Max links to follow per page. |
| `limit` | `integer` | ❌ | `50` | Total number of links to process. |
| `instructions` | `string` | ❌ | — | Natural language instructions guiding which pages to return. |
| `select_paths` | `array<string>` | ❌ | `[]` | Regex patterns to include specific paths. |
| `select_domains` | `array<string>` | ❌ | `[]` | Regex patterns to restrict domains/subdomains. |
| `allow_external` | `boolean` | ❌ | `true` | Whether to include external links in the response. |
| `extract_depth` | `string` | ❌ | `basic` | Extraction depth (`basic` or `advanced`). |
| `format` | `string` | ❌ | `markdown` | Content format (`markdown` or `text`). |
| `include_favicon` | `boolean` | ❌ | `false` | Include favicon URLs in results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "url": "https://example.com",
  "max_depth": 1,
  "max_breadth": 20,
  "limit": 50,
  "instructions": "Focus on documentation pages.",
  "select_paths": ["/docs/.*"],
  "select_domains": ["^docs\\.example\\.com$"]
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
  "base_url": "https://example.com",
  "results": [
    {
      "url": "https://example.com/docs",
      "raw_content": "# Documentation\nWelcome to Example docs.",
      "favicon": "https://example.com/favicon.ico"
    }
  ],
  "response_time": 0
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Network calls to Tavily API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `ListToolsRequestSchema` registration |
| **Core implementation** | `src/index.ts` → `tavily_crawl` handler |

---

### 🔹 Tool: `tavily_extract`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>tavily_extract</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extracts content from one or more URLs and returns page content in markdown or text.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `urls` | `array<string>` | ✅ | — | URLs to extract content from. |
| `extract_depth` | `string` | ❌ | `basic` | Extraction depth (`basic` or `advanced`). |
| `format` | `string` | ❌ | `markdown` | Content format (`markdown` or `text`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "urls": ["https://example.com/page"],
  "extract_depth": "basic",
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
  "results": [
    {
      "url": "https://example.com/page",
      "raw_content": "# Example Page\nThis is a short extracted summary."
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
| **Side effects** *(required)* | Network calls to Tavily API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `ListToolsRequestSchema` registration |
| **Core implementation** | `src/index.ts` → `tavily_extract` handler |

---

### 🔹 Tool: `tavily_map`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>tavily_map</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Maps a website’s structure starting from a root URL and returns discovered URLs.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `url` | `string` | ✅ | — | Root URL to map. |
| `max_depth` | `integer` | ❌ | `1` | Maximum depth from the base URL. |
| `max_breadth` | `integer` | ❌ | `20` | Max links to follow per page. |
| `limit` | `integer` | ❌ | `50` | Total number of links to process. |
| `instructions` | `string` | ❌ | — | Natural language instructions guiding which pages to return. |
| `select_paths` | `array<string>` | ❌ | `[]` | Regex patterns to include specific paths. |
| `select_domains` | `array<string>` | ❌ | `[]` | Regex patterns to restrict domains/subdomains. |
| `allow_external` | `boolean` | ❌ | `true` | Whether to include external links in the response. |
| `include_favicon` | `boolean` | ❌ | `false` | Include favicon URLs in results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "url": "https://example.com",
  "max_depth": 1,
  "max_breadth": 20,
  "limit": 50,
  "instructions": "Focus on documentation pages."
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
  "base_url": "https://example.com",
  "results": [
    {
      "url": "https://example.com/docs",
      "favicon": "https://example.com/favicon.ico"
    }
  ],
  "response_time": 0
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Network calls to Tavily API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `ListToolsRequestSchema` registration |
| **Core implementation** | `src/index.ts` → `tavily_map` handler |

---

### 🔹 Tool: `tavily_research`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>tavily_research</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs a deeper research task and returns a synthesized response.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `input` | `string` | ✅ | — | Description of the research task. |
| `model` | `string` | ❌ | `auto` | Research depth (`mini`, `pro`, `auto`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "input": "Summarize recent advancements in vector databases.",
  "model": "auto"
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
  "request_id": "req_123",
  "status": "completed",
  "content": "Summary of recent advancements in vector databases.",
  "error": null
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `General Research` |
| **Side effects** *(required)* | Network calls to Tavily API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `ListToolsRequestSchema` registration |
| **Core implementation** | `src/index.ts` → `tavily_research` handler |

---

### 🔹 Tool: `tavily_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>tavily_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs real-time web search with configurable depth, filters, and output options.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query. |
| `search_depth` | `string` | ❌ | `basic` | Search depth (`basic` or `advanced`). |
| `max_results` | `integer` | ❌ | `10` | Maximum number of results to return. |
| `include_answer` | `boolean` | ❌ | `true` | Include a summarized answer. |
| `include_raw_content` | `boolean` | ❌ | `false` | Include raw page content when available. |
| `include_images` | `boolean` | ❌ | `false` | Include image results. |
| `include_image_descriptions` | `boolean` | ❌ | `false` | Include image captions/descriptions. |
| `include_domains` | `array<string>` | ❌ | `[]` | Domains to explicitly include. |
| `exclude_domains` | `array<string>` | ❌ | `[]` | Domains to exclude. |
| `country` | `string` | ❌ | `""` | Boost results from a specific country. |
| `include_favicon` | `boolean` | ❌ | `false` | Include favicon URLs. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "latest MCP server examples",
  "search_depth": "basic",
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
  "query": "latest MCP server examples",
  "answer": "Recent MCP server examples include search and code-analysis servers.",
  "follow_up_questions": ["Which MCP servers are open source?"],
  "images": [
    {"url": "https://example.com/image.png", "description": "Example screenshot"}
  ],
  "results": [
    {
      "title": "Example MCP Server",
      "url": "https://example.com/mcp-server",
      "content": "Overview of an MCP server example and usage.",
      "score": 0.87,
      "published_date": "2025-01-15",
      "raw_content": "Full article content excerpt.",
      "favicon": "https://example.com/favicon.ico"
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
| **Side effects** *(required)* | Network calls to Tavily API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `ListToolsRequestSchema` registration |
| **Core implementation** | `src/index.ts` → `tavily_search` handler |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*
  "query": "latest MCP server examples",
  "search_depth": "basic",
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
  "query": "latest MCP server examples",
  "answer": "Recent MCP server examples include search and code-analysis servers.",
  "follow_up_questions": ["Which MCP servers are open source?"],
  "images": [
    {"url": "https://example.com/image.png", "description": "Example screenshot"}
  ],
  "results": [
    {
      "title": "Example MCP Server",
      "url": "https://example.com/mcp-server",
      "content": "Overview of an MCP server example and usage.",
      "score": 0,
      "published_date": "2025-01-15",
      "raw_content": "Full article content excerpt.",
      "favicon": "https://example.com/favicon.ico"
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
| **Side effects** *(required)* | Network calls to Tavily API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `ListToolsRequestSchema` registration |
| **Core implementation** | `src/index.ts` → `tavily_search` handler |

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
| `TAVILY_API_KEY` | ✅ | 🔒 | — | Tavily API key used to authenticate requests. |
| `DEFAULT_PARAMETERS` | ❌ | — | — | JSON string of default search parameters applied to requests. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | N/A |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| None | N/A |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Node.js 20+ |
| 2 | Obtain a Tavily API key |

### 8.2 Typical Run Commands *(optional)*

```bash
# Local MCP server
npx -y tavily-mcp@latest

# Remote MCP via mcp-remote (HTTP)
npx -y mcp-remote https://mcp.tavily.com/mcp/?tavilyApiKey=<your-api-key>
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console warnings/errors for configuration issues and MCP errors |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Higher `search_depth` and `include_raw_content` increase latency.
- `max_depth`, `max_breadth`, and `limit` directly affect crawl/map cost and response time.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `5` |

### 9.2 Known Gaps *(optional)*

- Output envelope for `tavily_search`, `tavily_extract`, and `tavily_research` is inferred from MCP patterns; confirm in source if needed.
<div align="center">

*— End of Report —*

</div>
