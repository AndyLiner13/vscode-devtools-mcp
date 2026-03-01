<div align="center">

# 📋 MCP Server Report

## `MetaMCP`
### [`metatool-ai/metamcp`](https://github.com/metatool-ai/metamcp)

</div>

---

> **Report Date:** `2026-02-03`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/metatool-ai/metamcp` |
| **Target Path** *(optional)* | `N/A` |
| **Analyzed Ref** *(required)* | `main` @ `95bf679938a66764fe9cb0368dfd511d3de08c34` |
| **Commit URL** *(optional)* | `https://github.com/metatool-ai/metamcp/commit/95bf679938a66764fe9cb0368dfd511d3de08c34` |
| **License** *(required)* | `MIT` |
| **Version** *(optional)* | `N/A (monorepo; backend 1.0.0, frontend 0.1.0)` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (monorepo) at commit `95bf6799…` |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope details for proxied tools/resources are inferred from MCP SDK behavior |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `relative` (tool/prompt/resource names are logical identifiers from upstream MCP servers) |
| **Line/column indexing** *(required)* | `Unknown` (not applicable to this server’s proxy layer) |
| **Encoding model** *(optional)* | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `direct JSON` (MCP JSON-RPC; tool responses follow MCP content envelopes) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

MetaMCP is a MCP proxy/gateway that aggregates multiple upstream MCP servers into a single unified MCP endpoint. It lets users register MCP servers, group them into namespaces, apply middleware (e.g., tool filtering/overrides), and expose public endpoints over SSE or Streamable HTTP, with optional OpenAPI tooling. It is designed to run as infrastructure so any MCP client can connect to one endpoint and access a curated, dynamic toolset.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `Any MCP client` |
| **Documented clients** *(optional)* | Cursor, Claude Desktop (via proxy), Open WebUI (via OpenAPI) |

### 1.3 Primary Capabilities *(required)*

- [x] Aggregate multiple MCP servers into a single namespace/endpoint
- [x] Expose MCP over SSE and Streamable HTTP (remote endpoints)
- [x] Apply tool filtering/overrides and other middleware to tool lists/calls
- [x] Provide an OpenAPI façade for MCP tools
- [x] Provide a built-in inspector experience with saved server configs

### 1.4 Non-Goals / Exclusions *(optional)*

- MetaMCP does not provide its own static tool set; it proxies tools from upstream MCP servers. *(inferred)*

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs as a Node.js/Express service (typically Docker) and exposes MCP endpoints over SSE/Streamable HTTP. |
| **Documented integrations** *(optional)* | Cursor, Claude Desktop (via proxy), Open WebUI (OpenAPI) |
| **Notes / constraints** *(optional)* | Public endpoints are remote-only; stdio-only clients need a local proxy. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Determined by upstream MCP servers (MetaMCP is language-agnostic) |
| **How to extend** *(optional)* | Add/register upstream MCP servers in MetaMCP and group them into namespaces. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Open-source` |
| **License details** *(optional)* | MIT |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript (Node.js) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | `@modelcontextprotocol/sdk`, `express`, `@trpc/server`, `better-auth`, `drizzle-orm`, `pg`, `zod` |
| **External / System** *(optional)* | Postgres (required), Docker (recommended) |
| **Optional** *(optional)* | OIDC provider (Auth0/Keycloak/Azure AD/Google/Okta) |
| **Paid services / Tokens** *(required)* | `None` |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Docker` (recommended) / `Local process` |
| **Started by MCP client** *(required)* | `No` |
| **Started independently** *(optional)* | `Yes` |
| **Env vars used** *(optional)* | `Yes` (see § 7) |
| **Config files used** *(optional)* | `Yes` (`.env`, `docker-compose.yml`) |
| **CLI flags used** *(optional)* | `No` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP SDK, Express, tRPC |
| **Architecture notes** *(optional)* | - MetaMCP builds a virtual MCP server that proxies tool/prompt/resource calls to upstream MCP servers.
- Middleware can filter or override tools before they are exposed.
- Public endpoints are hosted via SSE/Streamable HTTP and an OpenAPI façade.

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `No` |
| `http` / `streamable-http` *(optional)* | `Yes` |
| `sse` *(optional)* | `Yes` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `Yes` (for public endpoints) |
| **Mechanism** *(optional)* | `token` (API key), optional OAuth/OIDC |
| **Secrets / Env vars** *(optional)* | `BETTER_AUTH_SECRET`, `OIDC_CLIENT_SECRET` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `Yes` (configuration and logs via container/runtime) |
| **Uses local cache** *(optional)* | `Yes` (in-memory caches for tool sync) |
| **Uses external DB** *(optional)* | `Yes` (Postgres) |
| **Retains user code** *(required)* | `No` (stores tool metadata/config, not user code) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `MetaMCPToolName` |

Tool names are dynamic and follow the `serverPrefix__toolName` pattern; the index uses `MetaMCPToolName` to represent this pattern.

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `MetaMCPToolName` | `serverPrefix__toolName` where the first `__` splits the server prefix from the upstream tool name. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CallToolResult` | MCP SDK `CompatibilityCallToolResultSchema` (standard MCP tool response envelope). |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `relative` (tool names are logical identifiers; server prefix is sanitized) |
| **Rate limits / retries** | `Unknown` (not documented) |
| **File size limits** | `Unknown` |
| **Resource constraints** | Configurable MCP timeouts via server configuration (reset timeout on progress, max total timeout) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Unknown` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `MetaMCPToolName`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>MetaMCPToolName</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Proxied MCP tool provided by an upstream MCP server registered in MetaMCP. MetaMCP prefixes the tool name with the server namespace and forwards tool execution to the originating server, applying middleware (filtering/overrides) as configured.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `arguments` | `object` | ✅ | — | JSON arguments forwarded to the upstream tool’s `inputSchema`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "arguments": {
    "path": "/repo/README.md",
    "encoding": "utf-8"
  }
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "arguments": {
    "path": "/repo/README.md",
    "encoding": "utf-8"
  }
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "content": [
    { "type": "text", "text": "File contents as text." }
  ]
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "content": [
    { "type": "text", "text": "# Project Title\n\nThis is the README content." }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Hybrid` (depends on upstream tool) |
| **Classification** *(required)* | `Other` |
| **Side effects** *(required)* | `Depends on upstream tool` |
| **Determinism** *(optional)* | `Depends` |
| **Idempotency** *(optional)* | `Depends` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Upstream MCP server must be registered and available in the namespace. |
| **Postconditions** | Tool response is returned from the upstream server; MetaMCP may apply middleware filtering/overrides. |
| **Limits** | Configurable MCP timeouts; tool list may be paginated upstream. |
| **Security & privacy** | Tool execution may involve external network calls and secrets as defined by upstream servers; MetaMCP forwards API keys/tokens where configured. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `createServer()` MCP request handlers (MetaMCP server proxy) |
| **Core implementation** | Tool routing in MetaMCP proxy (tool name parsing, upstream MCP request forwarding) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | Dynamic (proxied from upstream MCP servers; names are prefixed like tools) |
| **MCP prompts exposed** *(optional)* | Dynamic (proxied from upstream MCP servers; names are prefixed like tools) |
| **Other RPC endpoints** *(optional)* | OpenAPI façade endpoints for tools; public health and listing endpoints. |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `NODE_ENV` | ✅ | — | `production` | Node environment. |
| `POSTGRES_HOST` | ✅ | — | `postgres` | Postgres host. |
| `POSTGRES_PORT` | ✅ | — | `5432` | Postgres port. |
| `POSTGRES_USER` | ✅ | — | `metamcp_user` | Postgres user. |
| `POSTGRES_PASSWORD` | ✅ | 🔒 | `m3t4mcp` | Postgres password. |
| `POSTGRES_DB` | ✅ | — | `metamcp_db` | Postgres database name. |
| `DATABASE_URL` | ✅ | 🔒 | derived | Postgres connection string. |
| `APP_URL` | ✅ | — | `http://localhost:12008` | Public base URL for MetaMCP. |
| `NEXT_PUBLIC_APP_URL` | ✅ | — | `http://localhost:12008` | Public base URL for frontend. |
| `BETTER_AUTH_SECRET` | ✅ | 🔒 | — | Auth secret for Better Auth. |
| `OIDC_CLIENT_ID` | ❌ | — | — | OIDC client ID. |
| `OIDC_CLIENT_SECRET` | ❌ | 🔒 | — | OIDC client secret. |
| `OIDC_DISCOVERY_URL` | ❌ | — | — | OIDC discovery URL. |
| `OIDC_AUTHORIZATION_URL` | ❌ | — | — | OIDC authorization URL. |
| `OIDC_PROVIDER_ID` | ❌ | — | `oidc` | OIDC provider ID. |
| `OIDC_SCOPES` | ❌ | — | `openid email profile` | OIDC scopes. |
| `OIDC_PKCE` | ❌ | — | `true` | OIDC PKCE enablement. |
| `TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL` | ❌ | — | `true` | Docker networking fix for localhost. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `.env` | Runtime configuration (DB, auth, URLs, OIDC). |
| `docker-compose.yml` | Docker deployment with Postgres. |



### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `N/A` | No documented CLI flags. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `cp example.env .env` |
| 2 | `docker compose up -d` |

### 8.2 Typical Run Commands *(optional)*

```bash
# Docker (recommended)
docker compose up -d

# Local dev
pnpm install
pnpm dev
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console logging in backend services. |
| **Tracing / Metrics** | `None` (not documented) |

### 8.4 Performance Considerations *(optional)*

- Tool list and tool routing are dynamic; large tool sets may impact list latency.
- Session management differs between SSE and Streamable HTTP (sessions are created/cleaned per transport).

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `Dynamic (depends on upstream MCP servers)` |
| **Read-only** | `Unknown` |
| **Write-only** | `Unknown` |
| **Hybrid** | `Unknown` |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Tool input/output schemas | Defined by upstream MCP servers and not fixed in MetaMCP. |
| Error envelope details | Depends on upstream MCP servers and MCP SDK defaults. |

---

<div align="center">

*— End of Report —*

</div>
