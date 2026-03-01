<div align="center">

# 📋 MCP Server Report

## `codelogic-mcp-server`
### [`CodeLogicIncEngineering/codelogic-mcp-server`](https://github.com/CodeLogicIncEngineering/codelogic-mcp-server)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/CodeLogicIncEngineering/codelogic-mcp-server` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `854d2bceb5a314c59cb60451f48919f3732e73bc` |
| **Commit URL** | `https://github.com/CodeLogicIncEngineering/codelogic-mcp-server/commit/854d2bceb5a314c59cb60451f48919f3732e73bc` |
| **License** | `MPL-2.0` |
| **Version** | `1.0.11` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | CodeLogic MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `No` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `Not applicable` (tools operate on CodeLogic entities; no file paths at the protocol boundary) |
| **Line/column indexing** | `Not applicable` |
| **Encoding model** | `Not applicable` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text` (markdown) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that queries CodeLogic’s dependency/knowledge graph to produce impact analysis reports.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | VS Code, Claude Desktop, Cursor, Windsurf |

### 1.3 Primary Capabilities

- [ ] Method impact analysis
- [ ] Database entity impact analysis

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | MCP stdio server; compatible with MCP clients. |
| **Documented integrations** | VS Code, Claude Desktop, Cursor, Windsurf |
| **Notes / constraints** | `uvx` issue on macOS (per docs). |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Java, JavaScript, TypeScript, C#/.NET; database entities (table/view/column) |
| **How to extend** | `Unknown` |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MPL-2.0 |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python (requires >= 3.13) |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python >= 3.13, `mcp[cli]`, uv/uvx, `httpx`, `python-dotenv`, `tenacity`, `toml` |
| **External / System** | CodeLogic server (via CodeLogic APIs) |
| **Optional** | `debugpy` (optional debugging entrypoint) |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` (stdio) |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Yes` (CODELOGIC_* variables) |
| **Config files used** | `Not documented` |
| **CLI flags used** | `Not documented` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | CodeLogic dependency/knowledge graph APIs |
| **Architecture notes** | Uses CodeLogic’s dependency/knowledge graph via CodeLogic server APIs and exposes tools via the Python MCP SDK. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `No` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `Yes` |
| **Mechanism** | CodeLogic server credentials via environment variables |
| **Secrets / Env vars** | `CODELOGIC_SERVER_HOST`, `CODELOGIC_USERNAME`, `CODELOGIC_PASSWORD`, `CODELOGIC_WORKSPACE_NAME` (plus optional `CODELOGIC_DEBUG_MODE`) |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (debug artifacts when CODELOGIC_DEBUG_MODE=true) |
| **Uses local cache** | `Unknown` (cache TTL tuning env vars exist: `CODELOGIC_*_CACHE_TTL`; cache storage/details not documented) |
| **Uses external DB** | `Yes` (CodeLogic server) |
| **Retains user code** | `Unknown` |

---

## 🗂️ § 3 — Tool Index

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `codelogic-database-impact` |
| 2 | `codelogic-method-impact` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `MethodImpactInput` | `{ method: string, class: string }` |
| `DatabaseImpactInput` | `{ entity_type: "column" | "table" | "view", name: string, table_or_view?: string }` |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `McpMarkdownContent` | MCP `content` array containing a single `{ type: "text", text: "# Impact Analysis for Method: MyMethod" }` item. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `Not applicable` (tools do not accept file paths; they query CodeLogic server APIs). |
| **Rate limits / retries** | Retries are supported via `tenacity` dependency (exact policy not documented). |
| **File size limits** | `Not applicable` |
| **Resource constraints** | `Not documented` |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Yes` (user-facing markdown error report returned in `TextContent.text` for common failures) |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Not documented` |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `codelogic-method-impact`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>codelogic-method-impact</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes the impact of modifying a method by querying CodeLogic APIs and returns a markdown report (risk guidance, metrics, affected apps, relationship map).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `method` | `string` | ✅ | — | Name of the method being analyzed. |
| `class` | `string` | ✅ | — | Name of the class containing the method. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"method": { "type": "string", "description": "Name of the method being analyzed" },
		"class": { "type": "string", "description": "Name of the class containing the method" }
	},
	"required": ["method", "class"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"method": "MyMethod",
	"class": "MyClass"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with markdown text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
	{
		"type": "text",
		"text": "# Impact Analysis for Method: `MyMethod`\n\n## Summary\n- Risk level: Medium\n- Affected applications: 3\n\n## Affected Components\n- com.example.FooService.MyMethod\n- com.example.BarRepository.update\n\n## Relationship Map\n- FooService.MyMethod → BarRepository.update\n"
	}
]
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
[
	{
		"type": "text",
		"text": "# Impact Analysis for Method: `MyMethod`\n\n## Summary\n- Risk level: Medium\n- Affected applications: 3\n\n## Affected Components\n- com.example.FooService.MyMethod\n- com.example.BarRepository.update\n\n## Relationship Map\n- FooService.MyMethod → BarRepository.update\n"
	}
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes debug artifacts if `CODELOGIC_DEBUG_MODE=true` |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | CodeLogic server reachable; required env vars set. |
| **Postconditions** | Emits a markdown impact analysis report in MCP text content. |
| **Limits** | `Not documented` |
| **Security & privacy** | Sends method/class identifiers to CodeLogic APIs. If method search fails/returns empty (including HTTP/timeouts), returns a user-facing markdown error report with suggestions (retry, check method name, verify connectivity). |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `@server.list_tools()` / `@server.call_tool()` in server code (see original report) |
| **Core implementation** | Implementation normalizes dotted class names (e.g., `com.foo.Bar` → `Bar`); resolves the workspace materialized view via `CODELOGIC_WORKSPACE_NAME`; searches for matching method nodes; selects best candidate (prefers those with complexity metrics); then formats the impact graph into markdown. |

---

### 🔹 Tool: `codelogic-database-impact`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>codelogic-database-impact</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes impacts between database entities and code, returning a markdown report describing affected code and related DB objects.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `entity_type` | `string` | ✅ | — | `column`, `table`, or `view`. |
| `name` | `string` | ✅ | — | Name of the database entity. |
| `table_or_view` | `string` | ❌ | — | Required for columns; table or view name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"entity_type": {
			"type": "string",
			"description": "Type of database entity to search for (column, table, or view)",
			"enum": ["column", "table", "view"]
		},
		"name": { "type": "string", "description": "Name of the database entity to search for" },
		"table_or_view": {
			"type": "string",
			"description": "Name of the table or view containing the column (required for columns only)"
		}
	},
	"required": ["entity_type", "name"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"entity_type": "column",
	"name": "user_id",
	"table_or_view": "users"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with markdown text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
	{
		"type": "text",
		"text": "# Impact Analysis for Database Entity: users.user_id (column)\n\n## Summary\n- Affected code paths: 5\n- Affected services: 2\n\n## Affected Code\n- com.example.UserRepository.findById\n- com.example.UserService.loadUser\n\n## Related DB Objects\n- users\n- user_profiles\n"
	}
]
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
[
	{
		"type": "text",
		"text": "# Impact Analysis for Database Entity: users.user_id (column)\n\n## Summary\n- Affected code paths: 5\n- Affected services: 2\n\n## Affected Code\n- com.example.UserRepository.findById\n- com.example.UserService.loadUser\n\n## Related DB Objects\n- users\n- user_profiles\n"
	}
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Writes debug artifacts if `CODELOGIC_DEBUG_MODE=true` |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | CodeLogic server reachable; env vars set. |
| **Postconditions** | Emits markdown report in MCP text content. |
| **Limits** | `Not documented` |
| **Security & privacy** | Sends entity identifiers to CodeLogic APIs. Database searches are defensive and may return empty lists on API errors rather than raising, enabling a user-facing markdown outcome. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `@server.list_tools()` / `@server.call_tool()` in server code (see original report) |
| **Core implementation** | For `entity_type`, uses different search parameters: table uses `tableName={name}`, view uses `viewName={name}`, column uses `columnName={name}` and optional `tableOrViewName={table_or_view}`; always includes workspace materialized view id; converts CodeLogic graph payload into standardized nodes/relationships and merges results for multiple matches. |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `Not documented` |
| **MCP prompts exposed** | `Not documented` |
| **Other RPC endpoints** | `Not documented` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `CODELOGIC_SERVER_HOST` | ✅ | ❌ | `Unknown` | URL of the CodeLogic server. |
| `CODELOGIC_USERNAME` | ✅ | ❌ | `Unknown` | Username for CodeLogic server authentication. |
| `CODELOGIC_PASSWORD` | ✅ | ✅ | `Unknown` | Password for CodeLogic server authentication. |
| `CODELOGIC_WORKSPACE_NAME` | ✅ | ❌ | `Unknown` | CodeLogic workspace/materialized view selection. |
| `CODELOGIC_DEBUG_MODE` | ❌ | ❌ | `false` | Set to `true` to enable debug artifacts written to the system temp directory. |
| `CODELOGIC_TOKEN_CACHE_TTL` | ❌ | ❌ | `3600` | Token cache TTL (seconds). |
| `CODELOGIC_METHOD_CACHE_TTL` | ❌ | ❌ | `300` | Method cache TTL (seconds). |
| `CODELOGIC_IMPACT_CACHE_TTL` | ❌ | ❌ | `300` | Impact cache TTL (seconds). |
| `CODELOGIC_REQUEST_TIMEOUT` | ❌ | ❌ | `120.0` | Request timeout (seconds). |
| `CODELOGIC_CONNECT_TIMEOUT` | ❌ | ❌ | `30.0` | Connect timeout (seconds). |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Not documented` | `Not documented` |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | `Not documented` |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Python >= 3.13. |
| 2 | Use Astral `uv/uvx` per repository docs (packaging/launcher). |
| 3 | Ensure connectivity to a CodeLogic server and set required `CODELOGIC_*` environment variables. |

### 8.2 Typical Run Commands

```bash
# Not documented as explicit commands in the source report
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` (debug artifacts may be written when `CODELOGIC_DEBUG_MODE=true`) |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- This server queries a remote CodeLogic server via HTTP; responsiveness depends on network and CodeLogic server performance.
- A `tenacity` dependency is present for retries (exact behavior not documented).

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `2` |
| **Read-only** | `0` |
| **Write-only** | `0` |
| **Hybrid** | `2` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Path/position conventions | Tools operate on CodeLogic entities (no file paths/line offsets documented at the protocol boundary). |
| Formal error envelope / `isError` usage | Source report emphasizes user-facing markdown error content; protocol-level error signaling is not documented. |
| Config files / CLI flags | Not documented in the source report. |

---

<div align="center">

*— End of Report —*

</div>
