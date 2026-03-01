<div align="center">

# 📋 MCP Server Report

## GreptimeDB MCP Server
### [GreptimeTeam/greptimedb-mcp-server](https://github.com/GreptimeTeam/greptimedb-mcp-server)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/GreptimeTeam/greptimedb-mcp-server |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 02bc1293aea80a40379c71d37319e030fb550f53 |
| **Commit URL** *(optional)* | https://github.com/GreptimeTeam/greptimedb-mcp-server/commit/02bc1293aea80a40379c71d37319e030fb550f53 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 0.4.6 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository analysis at commit 02bc1293aea80a40379c71d37319e030fb550f53 |
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
| **Path model** *(required)* | Relative (GreptimeDB table identifiers and `greptime://<table>/data` resource URIs; no filesystem paths) |
| **Line/column indexing** *(required)* | Unknown (no position-bearing responses) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | plain text (JSON strings for structured outputs) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

GreptimeDB MCP Server is a Python-based MCP server that provides secure, read-only access to GreptimeDB for AI assistants. It supports SQL, TQL (PromQL-compatible), and GreptimeDB RANGE queries, along with schema inspection, query explanation, health checks, and pipeline management via the GreptimeDB HTTP API. Built-in safeguards include a security gate for blocking write/DDL operations, optional data masking, and audit logging.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop |

### 1.3 Primary Capabilities *(required)*

- [x] Execute SQL, TQL (PromQL-compatible), and RANGE queries against GreptimeDB
- [x] Inspect schema, explain queries, and run health checks
- [x] Manage GreptimeDB pipelines (list/create/dry run/delete) via HTTP API
- [x] Provide resources and prompt templates for observability workflows
- [x] Enforce read-only access with security gate, masking, and audit logs

### 1.4 Non-Goals / Exclusions *(optional)*

- Write or mutation queries (DDL/DML) are blocked by the security gate
- Requires an external GreptimeDB instance; no embedded database

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python MCP server; runs locally or in containers; supports stdio and HTTP transports |
| **Documented integrations** *(optional)* | Claude Desktop |
| **Notes / constraints** *(optional)* | Requires GreptimeDB connectivity (MySQL protocol + HTTP API for pipelines) |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | SQL (MySQL dialect), TQL (PromQL-compatible), GreptimeDB RANGE query syntax |
| **How to extend** *(optional)* | Add new MCP tools in `src/greptimedb_mcp_server/server.py` and update prompts/templates |

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
| **Runtime** *(required)* | `mcp>=1.8.0`, `mysql-connector-python==9.5.0`, `pyyaml>=6.0.2`, `aiohttp>=3.9.0` |
| **External / System** *(optional)* | GreptimeDB server (MySQL protocol + HTTP API) |
| **Optional** *(optional)* | None |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process / Docker |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (HTTP transports) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | No |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | GreptimeDB (MySQL protocol + HTTP API), MCP FastMCP |
| **Architecture notes** *(optional)* | - FastMCP server registers tools and resources in `server.py`
- SQL/TQL/RANGE queries execute via MySQL connector and format results
- Pipeline tools call GreptimeDB HTTP API using `aiohttp`
- Security gate blocks unsafe queries; optional masking and audit logging |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | Yes |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No (for MCP transport); Yes for GreptimeDB access |
| **Mechanism** *(optional)* | GreptimeDB credentials; HTTP API uses Basic Auth |
| **Secrets / Env vars** *(optional)* | `GREPTIMEDB_USER`, `GREPTIMEDB_PASSWORD` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | No |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | Yes (GreptimeDB) |
| **Retains user code** *(required)* | No (queries sent to GreptimeDB; results returned) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `create_pipeline` |
| 2 | `delete_pipeline` |
| 3 | `describe_table` |
| 4 | `dryrun_pipeline` |
| 5 | `execute_sql` |
| 6 | `execute_tql` |
| 7 | `explain_query` |
| 8 | `health_check` |
| 9 | `list_pipelines` |
| 10 | `query_range` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `OutputFormat` | `"csv" | "json" | "markdown"` |
| `TableName` | `schema.table` or `table` format (validated) |
| `Duration` | Prometheus-style duration (e.g., `1m`, `5m`, `1h`) |
| `TimeExpression` | SQL time expression, RFC3339 timestamp, or Unix timestamp |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TextOrJsonString` | Most tools return plain text; structured outputs are JSON strings |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | No filesystem paths; table identifiers validated against regex |
| **Rate limits / retries** | Not specified; depends on GreptimeDB and network |
| **File size limits** | Not specified |
| **Resource constraints** | SQL/TQL row limits enforced; maximum limit is 10,000 |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown (tools return string errors) |
| **Error as text** | Yes (strings prefixed with `Error:`) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | Not specified |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `create_pipeline`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>create_pipeline</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Create or update a GreptimeDB pipeline using YAML configuration via the HTTP API.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Pipeline name (same name creates a new version). |
| `yaml` | `string` | ✅ | — | Pipeline YAML configuration. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "name": "nginx_logs",
  "yaml": "pipelines:\n  - name: nginx_logs\n    processors: ..."
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "status": "ok",
  "message": "pipeline created"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Sends HTTP request to GreptimeDB pipeline API; creates a pipeline version |
| **Determinism** | Depends |
| **Idempotency** | Non-idempotent (same name creates new version) |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | GreptimeDB HTTP API must be reachable; credentials configured |
| **Postconditions** | Pipeline is created or updated in GreptimeDB |
| **Limits** | API-specific limits not documented |
| **Security & privacy** | YAML content and credentials sent to GreptimeDB API |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`@mcp.tool`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (HTTP calls with `aiohttp`) |

---

### 🔹 Tool: `delete_pipeline`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>delete_pipeline</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Delete a specific pipeline version by name via the GreptimeDB HTTP API.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Pipeline name to delete. |
| `version` | `string` | ❌ | — | Pipeline version identifier (optional). |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "name": "nginx_logs",
  "version": "v2"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "status": "ok",
  "message": "pipeline deleted"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Sends HTTP request to delete pipeline version |
| **Determinism** | Depends |
| **Idempotency** | Depends (deleting a non-existent version may error) |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Pipeline exists; GreptimeDB HTTP API reachable |
| **Postconditions** | Pipeline version removed |
| **Limits** | API-specific limits not documented |
| **Security & privacy** | Name/version sent to GreptimeDB API |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`@mcp.tool`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (HTTP calls with `aiohttp`) |

---

### 🔹 Tool: `describe_table`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>describe_table</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Return schema information for a table, including column names and types.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `table` | `string` | ✅ | — | Table name (`table` or `schema.table`). |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "table": "public.metrics" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"| Column | Type |\n| --- | --- |\n| ts | Timestamp |"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Executes `DESCRIBE` query |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Table name must pass validation regex |
| **Postconditions** | None |
| **Limits** | Not specified |
| **Security & privacy** | Query is read-only; masking applied if enabled |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`describe_table`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (`_sync_describe`) |

---

### 🔹 Tool: `dryrun_pipeline`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>dryrun_pipeline</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Validate a pipeline configuration against sample data without writing to the database.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `yaml` | `string` | ✅ | — | Pipeline YAML configuration. |
| `sample` | `string` | ✅ | — | Sample log/metric line(s) to test. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "yaml": "pipelines:\n  - name: nginx_logs\n    processors: ...",
  "sample": "127.0.0.1 - - [25/May/2024:20:16:37 +0000] \"GET /index.html\" 200 612"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "status": "ok",
  "result": { "rows": 1 }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Sends dry-run request to GreptimeDB HTTP API |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | GreptimeDB HTTP API reachable; pipeline YAML is valid |
| **Postconditions** | No data written to database |
| **Limits** | API-specific limits not documented |
| **Security & privacy** | Sample data sent to GreptimeDB API |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`@mcp.tool`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (HTTP calls with `aiohttp`) |

---

### 🔹 Tool: `execute_sql`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>execute_sql</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Execute a SQL query (MySQL dialect) against GreptimeDB with optional formatting and row limits.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | SQL query to run (read-only allowed). |
| `format` | `string` | ❌ | `"csv"` | Output format: `csv`, `json`, or `markdown`. |
| `limit` | `number` | ❌ | `1000` | Max rows to return (capped at 10,000). |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "query": "SELECT * FROM cpu",
  "format": "json",
  "limit": 1000
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"{\n  \"data\": [...],\n  \"row_count\": 10,\n  \"truncated\": false,\n  \"execution_time_ms\": 12.3\n}"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Executes query against GreptimeDB; audit logging if enabled |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Security gate blocks unsafe queries; format must be valid |
| **Postconditions** | None |
| **Limits** | Max query limit 10,000 rows |
| **Security & privacy** | Data masking applied to sensitive columns if enabled |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`execute_sql`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (`_execute_query`, `_process_query_result`) |

---

### 🔹 Tool: `execute_tql`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>execute_tql</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Execute TQL (PromQL-compatible) time-series queries with optional lookback and formatting.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | PromQL-compatible expression. |
| `start` | `string` | ✅ | — | Start time (SQL expr, RFC3339, or Unix time). |
| `end` | `string` | ✅ | — | End time (SQL expr, RFC3339, or Unix time). |
| `step` | `string` | ✅ | — | Resolution step (e.g., `1m`). |
| `lookback` | `string` | ❌ | — | Optional lookback delta (e.g., `5m`). |
| `format` | `string` | ❌ | `"json"` | Output format: `csv`, `json`, or `markdown`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "query": "rate(http_requests_total[5m])",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-01T01:00:00Z",
  "step": "1m",
  "lookback": "5m",
  "format": "json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"{\n  \"tql\": \"TQL EVAL (...) ...\",\n  \"data\": [...],\n  \"row_count\": 42,\n  \"execution_time_ms\": 8.7\n}"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Executes query against GreptimeDB |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Time parameters validated; security gate blocks unsafe input |
| **Postconditions** | None |
| **Limits** | Max row limit 10,000 |
| **Security & privacy** | Data masking applied if enabled |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`execute_tql`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (TQL execution) |

---

### 🔹 Tool: `explain_query`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>explain_query</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Return execution plan for a SQL or TQL query, with optional analysis.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | SQL or TQL query to explain. |
| `analyze` | `boolean` | ❌ | `false` | Run `EXPLAIN ANALYZE` when true. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "SELECT * FROM users", "analyze": false }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"plan\n| id | operator |"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Executes `EXPLAIN` (or `EXPLAIN ANALYZE`) |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Security gate blocks unsafe queries |
| **Postconditions** | None |
| **Limits** | Not specified |
| **Security & privacy** | Query sent to GreptimeDB; masking not applicable |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`explain_query`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (EXPLAIN execution) |

---

### 🔹 Tool: `health_check`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>health_check</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Verify GreptimeDB connectivity and return server version and response time.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"{\n  \"status\": \"healthy\",\n  \"host\": \"localhost\",\n  \"port\": 4002,\n  \"database\": \"public\",\n  \"version\": \"greptime-...\",\n  \"response_time_ms\": 3.4\n}"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Executes `SELECT 1` and `SELECT version()` |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`health_check`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (`_sync_health_check`) |

---

### 🔹 Tool: `list_pipelines`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>list_pipelines</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>List pipelines or fetch details for a specific pipeline via the GreptimeDB HTTP API.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ❌ | — | Optional pipeline name to filter or fetch details. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "name": "nginx_logs" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "pipelines": ["nginx_logs", "syslog"],
  "count": 2
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Sends HTTP request to GreptimeDB pipeline API |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | GreptimeDB HTTP API reachable |
| **Postconditions** | None |
| **Limits** | API-specific limits not documented |
| **Security & privacy** | Pipeline metadata retrieved over authenticated HTTP |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`@mcp.tool`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (HTTP calls with `aiohttp`) |

---

### 🔹 Tool: `query_range`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>query_range</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Execute GreptimeDB RANGE/ALIGN window queries with optional grouping and filtering.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `table` | `string` | ✅ | — | Table name to query. |
| `select` | `string` | ✅ | — | Columns and aggregations including `RANGE`. |
| `align` | `string` | ✅ | — | Alignment interval (e.g., `1m`). |
| `by` | `string` | ❌ | — | Group-by columns. |
| `where` | `string` | ❌ | — | WHERE clause. |
| `fill` | `string` | ❌ | — | Fill strategy: NULL, PREV, LINEAR, or number. |
| `order_by` | `string` | ❌ | — | ORDER BY clause. |
| `format` | `string` | ❌ | `"json"` | Output format: `csv`, `json`, or `markdown`. |
| `limit` | `number` | ❌ | `1000` | Maximum rows to return. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "table": "metrics",
  "select": "ts, host, avg(cpu) RANGE '5m'",
  "align": "1m",
  "by": "host",
  "format": "json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | text |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
"{\n  \"query\": \"SELECT ...\",\n  \"data\": [...],\n  \"row_count\": 42\n}"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | Executes query against GreptimeDB |
| **Determinism** | Depends |
| **Idempotency** | Idempotent |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Table and query components validated; security gate enforced |
| **Postconditions** | None |
| **Limits** | Max query limit 10,000 rows |
| **Security & privacy** | Read-only query with optional masking |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `src/greptimedb_mcp_server/server.py` (`query_range`) |
| **Core implementation** | `src/greptimedb_mcp_server/server.py` (RANGE query builder) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `greptime://<table>/data` (table data as resource) |
| **MCP prompts exposed** *(optional)* | `pipeline_creator`, `log_pipeline`, `metrics_analysis`, `promql_analysis`, `iot_monitoring`, `trace_analysis`, `table_operation` |
| **Other RPC endpoints** *(optional)* | HTTP/SSE/streamable HTTP endpoints when transport is configured |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `GREPTIMEDB_HOST` | ❌ | — | `localhost` | GreptimeDB host |
| `GREPTIMEDB_PORT` | ❌ | — | `4002` | MySQL protocol port |
| `GREPTIMEDB_USER` | ❌ | 🔒 | `""` | GreptimeDB username |
| `GREPTIMEDB_PASSWORD` | ❌ | 🔒 | `""` | GreptimeDB password |
| `GREPTIMEDB_DATABASE` | ❌ | — | `public` | Database name |
| `GREPTIMEDB_TIMEZONE` | ❌ | — | `""` | Session timezone |
| `GREPTIMEDB_HTTP_PORT` | ❌ | — | `4000` | HTTP API port for pipeline management |
| `GREPTIMEDB_HTTP_PROTOCOL` | ❌ | — | `http` | HTTP protocol for API calls |
| `GREPTIMEDB_POOL_SIZE` | ❌ | — | `5` | Connection pool size |
| `GREPTIMEDB_MASK_ENABLED` | ❌ | — | `true` | Enable data masking |
| `GREPTIMEDB_MASK_PATTERNS` | ❌ | — | `""` | Additional mask patterns (comma-separated) |
| `GREPTIMEDB_AUDIT_ENABLED` | ❌ | — | `true` | Enable audit logging |
| `GREPTIMEDB_TRANSPORT` | ❌ | — | `stdio` | Transport mode: stdio, sse, streamable-http |
| `GREPTIMEDB_LISTEN_HOST` | ❌ | — | `0.0.0.0` | HTTP server bind host |
| `GREPTIMEDB_LISTEN_PORT` | ❌ | — | `8080` | HTTP server bind port |
| `GREPTIMEDB_ALLOWED_HOSTS` | ❌ | — | `""` | DNS rebinding protection allowlist |
| `GREPTIMEDB_ALLOWED_ORIGINS` | ❌ | — | `""` | CORS allowlist (used with allowlist hosts) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | No config files required |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--host` | GreptimeDB host |
| `--port` | MySQL protocol port |
| `--database` | Database name |
| `--user` | Username |
| `--password` | Password |
| `--timezone` | Session timezone |
| `--pool-size` | Connection pool size |
| `--http-port` | HTTP API port |
| `--http-protocol` | HTTP protocol (http/https) |
| `--mask-enabled` | Enable data masking |
| `--mask-patterns` | Additional mask patterns |
| `--transport` | stdio, sse, streamable-http |
| `--listen-host` | HTTP server bind host |
| `--listen-port` | HTTP server bind port |
| `--audit-enabled` | Enable audit logging |
| `--allowed-hosts` | DNS rebinding allowlist |
| `--allowed-origins` | CORS allowlist |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `pip install greptimedb-mcp-server` |

### 8.2 Typical Run Commands *(optional)*

```bash
# stdio (default)
greptimedb-mcp-server --host localhost --database public

# streamable HTTP
greptimedb-mcp-server --transport streamable-http --listen-port 8080
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging; audit logger `greptimedb_mcp_server.audit` |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- Query limits enforced to prevent large result sets (default 1,000; max 10,000).
- HTTP pipeline tools depend on GreptimeDB API latency and authentication.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 10 |
| **Read-only** | 7 |
| **Write-only** | 3 |
| **Hybrid** | 0 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Pipeline API response schema | Responses depend on GreptimeDB HTTP API version |
| MCP error envelope | Tools return string errors; MCP `isError` usage not documented |

---

<div align="center">

*— End of Report —*

</div>
