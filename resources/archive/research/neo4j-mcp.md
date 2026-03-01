<div align="center">

# 📋 MCP Server Report

## Neo4j MCP
### [neo4j/mcp](https://github.com/neo4j/mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/neo4j/mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 49d8799c21addba0188b6cf4c96f1bf6b51915ba |
| **Commit URL** *(optional)* | https://github.com/neo4j/mcp/commit/49d8799c21addba0188b6cf4c96f1bf6b51915ba |
| **License** *(required)* | GPL-3.0 |
| **Version** *(optional)* | 1.0.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (Neo4j MCP server). |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope inferred from MCP SDK usage. |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | relative (no filesystem path inputs; logical database identifiers only) |
| **Line/column indexing** *(required)* | Unknown |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Neo4j MCP is the official MCP server for Neo4j. It exposes tools to introspect schema, run read-only Cypher queries, execute write queries, and list available Graph Data Science procedures. The server supports both stdio and HTTP transport modes, adapts tool availability to read-only/GDS settings, and integrates with Neo4j via the official Go driver.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | VS Code, Claude Desktop (stdio), web clients via HTTP |

### 1.3 Primary Capabilities *(required)*

- [x] Retrieve Neo4j schema and metadata
- [x] Execute read-only Cypher queries
- [x] Execute write Cypher queries (when allowed)
- [x] Discover GDS procedures when available

### 1.4 Non-Goals / Exclusions *(optional)*

- No tools are exposed if read-only mode disables write-cypher or GDS is not installed (adaptive behavior).

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Go-based MCP server supporting stdio and HTTP transports. |
| **Documented integrations** *(optional)* | VS Code, Claude Desktop, HTTP clients |
| **Notes / constraints** *(optional)* | Requires Neo4j instance with APOC plugin; GDS tools require GDS library. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Cypher (Neo4j query language) |
| **How to extend** *(optional)* | Add new tool specs/handlers under internal/tools. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | GPL-3.0 (see LICENSE.txt). |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Go |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | github.com/mark3labs/mcp-go, github.com/neo4j/neo4j-go-driver/v6 |
| **External / System** *(optional)* | Neo4j database instance, APOC plugin, optional GDS library |
| **Optional** *(optional)* | TLS certificates for HTTPS mode |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Mixed (local process or Docker) |
| **Started by MCP client** *(required)* | Yes (stdio) / No (HTTP server) |
| **Started independently** *(optional)* | Yes (HTTP server) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | No |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Neo4j Go Driver, MCP Go SDK |
| **Architecture notes** *(optional)* | - Registers tools based on read-only and GDS availability.
- HTTP mode uses Streamable HTTP server with optional TLS.
- STDIO mode performs startup verification of Neo4j/APOC. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | Yes (HTTP), No (stdio) |
| **Mechanism** *(optional)* | Basic Auth (HTTP per-request), env vars (stdio) |
| **Secrets / Env vars** *(optional)* | NEO4J_USERNAME, NEO4J_PASSWORD |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | No |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | Yes (Neo4j) |
| **Retains user code** *(required)* | No |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `get-schema` |
| 2 | `list-gds-procedures` |
| 3 | `read-cypher` |
| 4 | `write-cypher` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CypherInput` | `{ query: string, params?: object }` for `read-cypher` and `write-cypher`. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CypherResult` | JSON-encoded result set returned as text content. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Not applicable. |
| **Rate limits / retries** | None documented. |
| **File size limits** | None documented. |
| **Resource constraints** | HTTP timeouts (read 15s, write 60s), optional TLS. |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes (uses `NewToolResultError`) |
| **Error as text** | Yes (error message string) |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Missing DB service, invalid query, APOC/GDS missing. |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `get-schema`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get-schema</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves Neo4j schema information (labels, relationship types, properties) via APOC and returns a simplified JSON schema payload.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters. |

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
		{ "type": "text", "text": "[{\"key\":\"Movie\",\"value\":{\"properties\":{\"title\":\"STRING\",\"released\":\"INTEGER\"}}},{\"key\":\"Person\",\"value\":{\"properties\":{\"name\":\"STRING\"}}}]" }
	]
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
| **Entry point / registration** | internal/tools/cypher/get_schema_spec.go (`GetSchemaSpec`) |
| **Core implementation** | internal/tools/cypher/get_schema_handler.go (`handleGetSchema`) |

---

### 🔹 Tool: `list-gds-procedures`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list-gds-procedures</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists available Neo4j Graph Data Science (GDS) procedures in the connected instance.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| — | — | — | — | No parameters. |

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
		{ "type": "text", "text": "[{\"name\":\"gds.pageRank.stream\",\"signature\":\"gds.pageRank.stream(graphName :: STRING?, configuration :: MAP?) :: (nodeId :: INTEGER?, score :: FLOAT?)\"}]" }
	]
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
| **Entry point / registration** | internal/tools/gds/list_gds_procedures_spec.go (`ListGDSProceduresSpec`) |
| **Core implementation** | internal/tools/gds/list_gds_procedures_handler.go (`handleListGdsProcedures`) |

---

### 🔹 Tool: `read-cypher`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>read-cypher</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes read-only Cypher queries and returns JSON-encoded results; rejects write/admin/profile queries.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | string | ✅ | `MATCH(n) RETURN n` | Cypher query to execute (read-only). |
| `params` | object | ❌ | `{}` | Cypher parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"query": "MATCH (n) RETURN n",
	"params": {}
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
		{ "type": "text", "text": "[{\"n\":{\"id\":123,\"labels\":[\"Person\"],\"properties\":{\"name\":\"Alice\"}}}]" }
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Neo4j connection and APOC available. |
| **Postconditions** | Returns JSON-encoded result set. |
| **Limits** | Rejects write/admin/profile queries. |
| **Security & privacy** | Executes user-provided queries; use least-privilege credentials. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/cypher/read_cypher_spec.go (`ReadCypherSpec`) |
| **Core implementation** | internal/tools/cypher/read_cypher_handler.go (`handleReadCypher`) |

---

### 🔹 Tool: `write-cypher`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>write-cypher</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes arbitrary Cypher queries with write access against the configured Neo4j database.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | string | ✅ | `MATCH(n) RETURN n` | Cypher query to execute. |
| `params` | object | ❌ | `{}` | Cypher parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"query": "CREATE (n:User {name: 'Alice'}) RETURN n",
	"params": {}
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
		{ "type": "text", "text": "[{\"n\":{\"id\":456,\"labels\":[\"Person\"],\"properties\":{\"name\":\"John\"}}}]" }
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes to Neo4j database. |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Write access enabled; read-only mode must be false. |
| **Postconditions** | Database may be modified. |
| **Limits** | Disabled when `NEO4J_READ_ONLY=true`. |
| **Security & privacy** | Use caution with destructive queries. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | internal/tools/cypher/write_cypher_spec.go (`WriteCypherSpec`) |
| **Core implementation** | internal/tools/cypher/write_cypher_handler.go (`handleWriteCypher`) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | Streamable HTTP endpoint at /mcp (HTTP mode). |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `NEO4J_URI` | ✅ | — | — | Neo4j connection URI. |
| `NEO4J_USERNAME` | ✅ (stdio) | — | — | Neo4j username (stdio mode). |
| `NEO4J_PASSWORD` | ✅ (stdio) | 🔒 | — | Neo4j password (stdio mode). |
| `NEO4J_DATABASE` | ❌ | — | `neo4j` | Neo4j database name. |
| `NEO4J_READ_ONLY` | ❌ | — | `false` | Disable write tools. |
| `NEO4J_TELEMETRY` | ❌ | — | `true` | Enable telemetry. |
| `NEO4J_LOG_LEVEL` | ❌ | — | `info` | Log level. |
| `NEO4J_LOG_FORMAT` | ❌ | — | `text` | Log format. |
| `NEO4J_SCHEMA_SAMPLE_SIZE` | ❌ | — | `100` | Schema inference sample size. |
| `NEO4J_TRANSPORT_MODE` | ❌ | — | `stdio` | Transport mode (`stdio` or `http`). |
| `NEO4J_MCP_HTTP_HOST` | ❌ | — | `127.0.0.1` | HTTP host. |
| `NEO4J_MCP_HTTP_PORT` | ❌ | — | `80`/`443` | HTTP port (defaults based on TLS). |
| `NEO4J_MCP_HTTP_ALLOWED_ORIGINS` | ❌ | — | — | CORS allowed origins. |
| `NEO4J_MCP_HTTP_TLS_ENABLED` | ❌ | — | `false` | Enable TLS. |
| `NEO4J_MCP_HTTP_TLS_CERT_FILE` | ❌ | — | — | TLS cert file path. |
| `NEO4J_MCP_HTTP_TLS_KEY_FILE` | ❌ | 🔒 | — | TLS key file path. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `N/A` | No config files used. |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--neo4j-uri` | Neo4j connection URI. |
| `--neo4j-username` | Database username. |
| `--neo4j-password` | Database password. |
| `--neo4j-database` | Database name. |
| `--neo4j-read-only` | Enable read-only mode. |
| `--neo4j-telemetry` | Enable telemetry. |
| `--neo4j-schema-sample-size` | Schema inference sample size. |
| `--neo4j-transport-mode` | Transport mode (`stdio` or `http`). |
| `--neo4j-http-port` | HTTP server port. |
| `--neo4j-http-host` | HTTP server host. |
| `--neo4j-http-allowed-origins` | CORS allowed origins. |
| `--neo4j-http-tls-enabled` | Enable TLS/HTTPS. |
| `--neo4j-http-tls-cert-file` | TLS certificate path. |
| `--neo4j-http-tls-key-file` | TLS key path. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Download release binary and add `neo4j-mcp` to PATH. |
| 2 | Configure required environment variables for STDIO or HTTP mode. |

### 8.2 Typical Run Commands *(optional)*

```bash
# STDIO mode
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="password"
neo4j-mcp

# HTTP mode
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_TRANSPORT_MODE="http"
neo4j-mcp
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Structured logging via Go `slog`; level/format controlled by `NEO4J_LOG_LEVEL` and `NEO4J_LOG_FORMAT`. |
| **Tracing / Metrics** | `None` (telemetry via Mixpanel when enabled). |

### 8.4 Performance Considerations *(optional)*

- HTTP server uses read/write timeouts to protect against slow clients.
- Schema sampling size impacts schema inference cost.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `4` |
| **Read-only tools** | `3` |
| **Write tools** | `1` |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| None | No known gaps or unknowns at this time. |

---

<div align="center">

*— End of Report —*

</div>
