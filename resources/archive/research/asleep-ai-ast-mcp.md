<div align="center">

# 📋 MCP Server Report

## AST-MCP
### [`asleep-ai/ast-mcp`](https://github.com/asleep-ai/ast-mcp)

</div>

---

> **Report Date:** `2026-02-03`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/asleep-ai/ast-mcp` |
| **Target Path** *(optional)* | `N/A` |
| **Analyzed Ref** *(required)* | `64d98de8e522dc65a50768b044139a10668d85b3` |
| **Commit URL** *(optional)* | `https://github.com/asleep-ai/ast-mcp/commit/64d98de8e522dc65a50768b044139a10668d85b3` |
| **License** *(required)* | `Unknown` |
| **Version** *(optional)* | `0.1.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository at commit `64d98de8e522dc65a50768b044139a10668d85b3` |
| **Observed in source** *(required)* | `Yes` |
| **Observed in docs** *(required)* | `Yes` |
| **Inferred** *(optional)* | `Yes` — runtime behavior and determinism inferred from source patterns |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `N/A` (no file path parameters) |
| **Line/column indexing** *(required)* | `N/A` (no position-based inputs/outputs) |
| **Encoding model** *(optional)* | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

This MCP server provides a single MCP tool that calls Asleep.ai’s AST platform API to generate sleep analysis insights. It exposes a Model Context Protocol interface over stdio, registers tools dynamically, and proxies tool invocations to the external REST API, returning responses as JSON strings within MCP content blocks.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `Any MCP client` |
| **Documented clients** *(optional)* | `None` |

### 1.3 Primary Capabilities *(required)*

- [x] MCP-compliant stdio server
- [x] Tool registration and discovery
- [x] External API invocation for sleep insights (`deep_insight`)

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js MCP server; runs as a local Node process or Docker container |
| **Documented integrations** *(optional)* | `None` |
| **Notes / constraints** *(optional)* | Requires AST credentials via environment variables |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | `Not language-specific` |
| **How to extend** *(optional)* | Add additional MCP tools in `src/index.ts` using `registerTool()` |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Unknown` |
| **License details** *(optional)* | No LICENSE file found in repository root |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript (Node.js) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | `@modelcontextprotocol/sdk`, `axios`, `express`, `zod` |
| **External / System** *(optional)* | Asleep.ai AST API (`https://api.agent-a.asleep.ai`) |
| **Optional** *(optional)* | `None` |
| **Paid services / Tokens** *(required)* | AST API credentials (`AST_ID`, `AST_API_KEY`) |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local Node.js process or Docker` |
| **Started by MCP client** *(required)* | `Yes` |
| **Started independently** *(optional)* | `Yes` (manual `node dist/index.js`) |
| **Env vars used** *(optional)* | `Yes` (see § 7) |
| **Config files used** *(optional)* | `Yes` (`smithery.yaml`) |
| **CLI flags used** *(optional)* | `No` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP SDK + external REST API (Asleep.ai AST platform) |
| **Architecture notes** *(optional)* | - Registers tools via `server.tool()`
- Proxies tool calls to Asleep.ai API with Axios
- Returns API responses as JSON strings in MCP content blocks |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` |
| `http` / `streamable-http` *(optional)* | `No` |
| `sse` *(optional)* | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `Yes` |
| **Mechanism** *(optional)* | `API key headers (x-api-key, x-ast-id)` |
| **Secrets / Env vars** *(optional)* | `AST_ID`, `AST_API_KEY` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `No` |
| **Uses local cache** *(optional)* | `No` |
| **Uses external DB** *(optional)* | `Yes` (Asleep.ai API backend) |
| **Retains user code** *(required)* | `No` (only sends tool requests to external API) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `deep_insight` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `None` | No shared input types beyond tool-specific schemas |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `None` | No shared output types beyond tool-specific responses |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `N/A` (no path parameters) |
| **Rate limits / retries** | `None` (no retry logic implemented) |
| **File size limits** | `N/A` |
| **Resource constraints** | `Unknown` |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `No` (errors returned as normal tool output) |
| **Error as text** | `No` |
| **Error as `{ error: string }`** | `Yes` (object with `error`, `message`, `status`, `details`) |
| **Common error codes** | HTTP status codes from Asleep.ai API |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `deep_insight`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deep_insight</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Requests a sleep analysis insight from the Asleep.ai AST API. The tool posts a <code>deep_insight</code> request to the remote service and returns the API response as a JSON string in MCP content.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `None` | — | — | — | No parameters (empty object accepted) |

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
| **Format** *(required)* | `JSON` (stringified in `content[].text`) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "data": "<Asleep.ai response payload>"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "error": true,
  "message": "An unexpected error occurred during sleep analysis",
  "status": 500,
  "details": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | Network call to Asleep.ai API |
| **Determinism** *(optional)* | `Non-deterministic` |
| **Idempotency** *(optional)* | `Depends` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `AST_ID` and `AST_API_KEY` must be set; server running over stdio |
| **Postconditions** | Returns response payload or error object from Asleep.ai API |
| **Limits** | `Unknown` (depends on external API) |
| **Security & privacy** | Sends API key and AST ID to external service over HTTPS |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/index.ts` → `registerTool({ name: 'deep_insight', ... })` |
| **Core implementation** | `src/index.ts` → `handler` in `deep_insight` tool |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `None` |
| **MCP prompts exposed** *(optional)* | `None` |
| **Other RPC endpoints** *(optional)* | `None` |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `AST_ID` | ✅ | 🔒 | — | AST platform ID used for `x-ast-id` header |
| `AST_API_KEY` | ✅ | 🔒 | — | API key used for `x-api-key` header |
| `LOG_LEVEL` | ❌ | — | `info` | Controls debug logging (request payloads logged when `debug`) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `smithery.yaml` | Smithery MCP config (start command and config schema) |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "port": 3000,
  "logLevel": "info",
  "ast_id": "ast_example_123",
  "ast_api_key": "ast_key_example_abc"
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `None` | No CLI flags documented |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `npm install` |
| 2 | `npm run build` |

### 8.2 Typical Run Commands *(optional)*

```bash
# Example startup command
node dist/index.js
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | `console.log` / `console.error` to stdout/stderr |
| **Tracing / Metrics** | `None` |

### 8.4 Performance Considerations *(optional)*

- Latency and throughput depend on Asleep.ai API responsiveness
- No retry/backoff logic; transient failures surface directly to clients

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `1` |
| **Read-only tools** | `1` |
| **Write-capable tools** | `0` |

### 9.2 Known Gaps *(optional)*

- No LICENSE file found; license status remains unknown
- Tool output schema is not formally specified beyond generic API response

<div align="center">

*— End of Report —*

</div>
