<div align="center">

# 📋 MCP Server Report

## Code Auditor MCP
### [BenAHammond/code-auditor-mcp](https://github.com/BenAHammond/code-auditor-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/BenAHammond/code-auditor-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 6ac45170c27ae5da8b0af7259c9b1118aee5fe80 |
| **Commit URL** *(optional)* | https://github.com/BenAHammond/code-auditor-mcp/commit/6ac45170c27ae5da8b0af7259c9b1118aee5fe80 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 2.0.1 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository analysis at the commit ref listed above |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope and some error handling details inferred from MCP SDK defaults |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Relative paths are accepted and resolved against the server process working directory; many handlers call `path.resolve` |
| **Line/column indexing** *(required)* | 1-based (function metadata validation enforces `lineNumber >= 1`) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | Mixed — `listTools` returns direct JSON; tool calls return MCP `content[]` envelopes (typical MCP SDK behavior) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Code Auditor MCP is a Node.js MCP server and CLI that indexes multi-language codebases (TypeScript, JavaScript, and Go), runs static analysis audits (SOLID/DRY/security/documentation), and exposes searchable code intelligence to MCP clients. It builds a function/component index, supports advanced query operators, generates code maps, and can emit configuration files for popular AI coding assistants.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, Cursor, Continue, GitHub Copilot, Zed, Windsurf, Cody, Aider, Cline, PearAI |

### 1.3 Primary Capabilities *(required)*

- [x] Multi-language code indexing (TypeScript/JavaScript/Go)
- [x] Static analysis audits (SOLID/DRY/security/documentation)
- [x] Natural-language and operator-based code search
- [x] Code map generation with paginated sections
- [x] Analyzer configuration persistence
- [x] AI assistant config generation
- [x] Optional HTTP/UI dashboard mode
- [x] Database schema discovery and usage analysis tools

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented in the repository

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js >= 16 (per `package.json` engines) |
| **Documented integrations** *(optional)* | Claude Desktop (MCP), Cursor, Continue, GitHub Copilot, CLI | 
| **Notes / constraints** *(optional)* | UI mode requires HTTP port access; MCP stdio mode uses stdin/stdout |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript, JavaScript, Go |
| **How to extend** *(optional)* | Not documented |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript, JavaScript (Node.js) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | Node.js, MCP TypeScript SDK, project runtime dependencies (see `package.json`) |
| **External / System** *(optional)* | None documented |
| **Optional** *(optional)* | UI mode HTTP server dependencies (see `package.json`) |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI/UI mode) |
| **Env vars used** *(optional)* | Yes (see § 7.1) |
| **Config files used** *(optional)* | Yes (see § 7.2) |
| **CLI flags used** *(optional)* | Yes (see § 7.3) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP TypeScript SDK, custom code indexing/analyzer engine |
| **Architecture notes** *(optional)* | - Builds a local index of functions/components
- Runs analyzers over indexed metadata
- Optional HTTP UI layer for dashboards |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | No (HTTP endpoints are for UI, not MCP transport) |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (configs, whitelist entries, index artifacts) |
| **Uses local cache** *(optional)* | Yes (local index database; path not documented) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes — retains indexed metadata and references; source files remain on disk |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `find_table_usage` |
| 2 | `generate_ai_config` |
| 3 | `generate_schema_discovery_sql` |
| 4 | `get_analyzer_config` |
| 5 | `get_code_map_section` |
| 6 | `get_schemas` |
| 7 | `get_workflow_guide` |
| 8 | `list_code_map_sections` |
| 9 | `reset_analyzer_config` |
| 10 | `search_code` |
| 11 | `search_schema` |
| 12 | `set_analyzer_config` |
| 13 | `sync_index` |
| 14 | `validate_schema_consistency` |
| 15 | `whitelist_add` |
| 16 | `whitelist_detect` |
| 17 | `whitelist_get` |
| 18 | `whitelist_update_status` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `find_table_usage`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_table_usage</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds functions that interact with a specific database table.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `tableName` | `string` | ✅ | — | Table name to search for |
| `usageType` | `string` | ❌ | `all` | `query`, `insert`, `update`, `delete`, `reference`, or `all` |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "tableName": "users", "usageType": "query" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "tableName": "users", "matches": [ { "function": "getUserById", "file": "src/db/users.ts" } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `generate_ai_config`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_ai_config</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates configuration files for supported AI coding assistants.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `tools` | `array` | ✅ | — | AI tools to configure (cursor, continue, copilot, claude, zed, windsurf, cody, aider, cline, pearai) |
| `outputDir` | `string` | ❌ | `.` | Output directory for configuration files |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "tools": ["cursor", "claude"], "outputDir": "." }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "files": [".cursor/mcp.json", ".claude/mcp.json"] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes configuration files to disk |

---

### 🔹 Tool: `generate_schema_discovery_sql`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_schema_discovery_sql</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates SQL queries for extracting schema metadata for supported databases.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `databaseType` | `string` | ✅ | — | `postgresql`, `mysql`, `sqlite`, `sqlserver`, `oracle` |
| `includeIndexes` | `boolean` | ❌ | `true` | Include index discovery queries |
| `includeConstraints` | `boolean` | ❌ | `true` | Include foreign key constraint queries |
| `specificTables` | `array` | ❌ | — | Limit discovery to specific tables |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "databaseType": "postgresql", "includeIndexes": true, "includeConstraints": true }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "databaseType": "postgresql", "queries": { "tables": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" } }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `get_analyzer_config`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_analyzer_config</code></td></tr>
<tr><td><strong>Description</strong></td><td>Retrieves analyzer configuration for a specific analyzer or all analyzers.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `analyzerName` | `string` | ❌ | — | Analyzer name (omit for all configs) |
| `projectPath` | `string` | ❌ | — | Optional project-specific config scope |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "analyzerName": "solid" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "analyzerName": "solid", "config": { "maxUnrelatedResponsibilities": 3 }, "scope": "global" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `get_code_map_section`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_code_map_section</code></td></tr>
<tr><td><strong>Description</strong></td><td>Retrieves a specific section of a previously generated, paginated code map.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `mapId` | `string` | ✅ | — | Code map ID returned by `audit` or `audit_health` |
| `sectionType` | `string` | ✅ | — | Section type (overview, files, dependencies, documentation) |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "mapId": "map_123", "sectionType": "overview" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "mapId": "map_123", "sectionType": "overview", "content": "Overview: 128 files, 12 packages, 3 entry points. Use search_code for detailed symbols." }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `get_schemas`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_schemas</code></td></tr>
<tr><td><strong>Description</strong></td><td>Lists loaded database schemas and their metadata.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | — |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "schemas": [ { "schemaId": "schema_123", "name": "Main DB", "tableCount": 12 } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `get_workflow_guide`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_workflow_guide</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns recommended workflows and best practices for common scenarios.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `scenario` | `string` | ❌ | — | Scenario name (e.g., `initial-setup`, `code-review`, `maintenance`) |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "scenario": "initial-setup" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "name": "Initial Project Setup", "steps": [ { "tool": "audit" } ], "tips": ["Run an initial audit to seed the index before searching."] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `list_code_map_sections`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>list_code_map_sections</code></td></tr>
<tr><td><strong>Description</strong></td><td>Lists available sections for a previously generated code map.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `mapId` | `string` | ✅ | — | Code map ID |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "mapId": "map_123" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "mapId": "map_123", "sections": [ { "type": "overview", "size": 1024 } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `reset_analyzer_config`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>reset_analyzer_config</code></td></tr>
<tr><td><strong>Description</strong></td><td>Resets analyzer configuration to defaults.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `analyzerName` | `string` | ❌ | — | Analyzer to reset (omit to reset all) |
| `projectPath` | `string` | ❌ | — | Optional project scope |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "analyzerName": "solid" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "message": "Reset analyzer configuration" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Updates stored analyzer configs |

---

### 🔹 Tool: `search_code`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_code</code></td></tr>
<tr><td><strong>Description</strong></td><td>Searches indexed functions and components with natural language and advanced operators.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query with operators |
| `filters` | `object` | ❌ | — | Optional filters (language, filePath, componentType, searchMode) |
| `limit` | `number` | ❌ | `50` | Max results |
| `offset` | `number` | ❌ | `0` | Pagination offset |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "component:functional hook:useState", "limit": 25 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "functions": [ { "name": "UserTable", "score": 0.92 } ], "totalCount": 1, "executionTime": 12 }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None |

---

### 🔹 Tool: `search_schema`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_schema</code></td></tr>
<tr><td><strong>Description</strong></td><td>Searches for tables, columns, or relationships across loaded schemas.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search term for schema elements |
| `schemaId` | `string` | ❌ | — | Limit to a specific schema |
| `searchType` | `string` | ❌ | `all` | `tables`, `columns`, `relationships`, or `all` |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "query": "users", "searchType": "tables" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "matches": [ { "table": "users", "database": "main" } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `set_analyzer_config`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>set_analyzer_config</code></td></tr>
<tr><td><strong>Description</strong></td><td>Persists analyzer configuration for future audits.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `analyzerName` | `string` | ✅ | — | Analyzer name (e.g., `solid`, `dry`) |
| `config` | `object` | ✅ | — | Analyzer configuration object |
| `projectPath` | `string` | ❌ | — | Optional project-specific scope |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "analyzerName": "solid", "config": { "maxUnrelatedResponsibilities": 3 } }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "analyzerName": "solid", "scope": "global" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Updates stored analyzer configs |

---

### 🔹 Tool: `sync_index`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>sync_index</code></td></tr>
<tr><td><strong>Description</strong></td><td>Synchronizes the function index with the current codebase (sync, cleanup, or reset).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `mode` | `string` | ❌ | `sync` | `sync`, `cleanup`, or `reset` |
| `path` | `string` | ❌ | — | Optional path scope |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "mode": "cleanup" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "stats": { "added": 0, "updated": 3, "removed": 1 } }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Updates local index database |

---

### 🔹 Tool: `validate_schema_consistency`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>validate_schema_consistency</code></td></tr>
<tr><td><strong>Description</strong></td><td>Validates schema consistency and returns violations (e.g., missing keys, naming issues, circular refs).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `schemaId` | `string` | ❌ | — | Schema ID (omit to validate all) |
| `checkCircularDeps` | `boolean` | ❌ | `true` | Check for circular dependencies |
| `checkNamingConventions` | `boolean` | ❌ | `true` | Check naming conventions |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "schemaId": "schema_123", "checkCircularDeps": true }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "violations": [ { "severity": "warning", "message": "Table 'users' has no primary key" } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None |

---

### 🔹 Tool: `whitelist_add`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>whitelist_add</code></td></tr>
<tr><td><strong>Description</strong></td><td>Adds a new whitelist entry used by dependency and class-instantiation checks.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Class name or import path |
| `type` | `string` | ✅ | — | Entry type (`platform-api`, `framework-class`, `project-dep`, `shared-library`, `node-builtin`) |
| `description` | `string` | ❌ | — | Explanation |
| `patterns` | `array` | ❌ | — | Additional match patterns |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "name": "react", "type": "framework-class", "description": "Framework dependency" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "message": "Added react to whitelist" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes whitelist entry to local DB |

---

### 🔹 Tool: `whitelist_detect`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>whitelist_detect</code></td></tr>
<tr><td><strong>Description</strong></td><td>Detects candidate whitelist entries from project dependencies and usage patterns.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ❌ | current working directory | Project path |
| `includePackageJson` | `boolean` | ❌ | `true` | Include dependencies from `package.json` |
| `autoPopulate` | `boolean` | ❌ | `false` | Auto-add high-confidence entries |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "path": ".", "autoPopulate": false }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "count": 12, "suggestions": [ { "name": "react", "confidence": 0.95 } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Optionally writes whitelist entries when `autoPopulate` is true |

---

### 🔹 Tool: `whitelist_get`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>whitelist_get</code></td></tr>
<tr><td><strong>Description</strong></td><td>Retrieves whitelist entries filtered by type or status.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `type` | `string` | ❌ | — | Filter by entry type |
| `status` | `string` | ❌ | — | Filter by status (`active`, `pending`, `rejected`, `disabled`) |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "type": "framework-class", "status": "active" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "count": 2, "entries": [ { "name": "react", "type": "framework-class" } ] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

---

### 🔹 Tool: `whitelist_update_status`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>whitelist_update_status</code></td></tr>
<tr><td><strong>Description</strong></td><td>Updates the status of a whitelist entry.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Entry name |
| `status` | `string` | ✅ | — | New status (`active`, `pending`, `rejected`, `disabled`) |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "name": "react", "status": "active" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "success": true, "message": "Updated react status to active" }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Updates whitelist entry in local DB |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | UI resources in UI mode (e.g., `ui://code-auditor/dashboard/<session>` and `ui://code-auditor/codemap/<session>`) |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | HTTP UI server endpoints: `/api/audit-dashboard`, `/api/code-map-viewer`, `/health`, `/api/audit/:sessionKey` |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `MCP_UI_PORT` | ❌ | — | `3001` | Port for UI mode |
| `MCP_MODE` | ❌ | — | `stdio` | Force mode (`stdio` or `ui`) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `.codeauditor.json` | Analyzer defaults and overrides |
| `server.json` | MCP server metadata (name/version/transport) |
| `configs/hhra-compat.json` | Compatibility config for downstream integrations |
| `cursor-config.json` | Cursor integration configuration |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "enabledAnalyzers": ["dry"],
  "analyzerConfigs": { "dry": { "minLineThreshold": 3, "similarityThreshold": 0.75 } }
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--ui` | Start HTTP/UI mode |
| `--stdio` | Force stdio MCP mode |
| `--help` / `-h` | Show usage |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `npm install -g code-auditor-mcp` |
| 2 | `code-auditor-mcp` or `npx code-auditor-mcp` |

### 8.2 Typical Run Commands *(optional)*

```bash
# MCP stdio mode (default)
npx code-auditor-mcp

# UI mode
npx code-auditor-mcp --ui
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Writes `mcp-server.log` and uses stderr for runtime logs |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Code map responses are paginated to avoid oversized responses.
- Indexing during audits improves subsequent search performance but adds up-front cost.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 18 |
| **Read-only** | 11 |
| **Write-only** | 5 |
| **Hybrid** | 2 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Tool response envelope specifics | Full CallTool response formatting is inferred from MCP SDK defaults; source file was large and partially truncated in tooling output |
| UI tool list beyond `audit_dashboard` | UI tool definitions are in a large shared file; additional UI tools may exist |
| Schema usage analysis output format | Detailed output structure is inferred; tool handlers not fully visible |

---

<div align="center">

*— End of Report —*

</div>
