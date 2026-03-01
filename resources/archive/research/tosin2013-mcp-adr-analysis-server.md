<div align="center">

# 📋 MCP Server Report

## MCP ADR Analysis Server
### [tosin2013/mcp-adr-analysis-server](https://github.com/tosin2013/mcp-adr-analysis-server)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/tosin2013/mcp-adr-analysis-server` |
| **Target Path** *(optional)* | `N/A` |
| **Analyzed Ref** *(required)* | `b5d7fc525441886ca7015ce8fa977a92afa8fdee` |
| **Commit URL** *(optional)* | https://github.com/tosin2013/mcp-adr-analysis-server/commit/b5d7fc525441886ca7015ce8fa977a92afa8fdee |
| **License** *(required)* | `MIT` |
| **Version** *(optional)* | `2.1.28` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | README.md, package.json, docs/reference/*, src/tools/* (selected). |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — some tool parameters inferred from docs where source not fully enumerated. |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `absolute` (PROJECT_PATH must be absolute) |
| **Line/column indexing** *(required)* | `1-based` (per docs/examples) |
| **Encoding model** *(optional)* | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `content[].text JSON string` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

MCP ADR Analysis Server is an MCP server that provides AI-powered architectural analysis and ADR management. It analyzes project structure and technology choices, suggests and validates ADRs, performs security and deployment readiness checks, and integrates with external services such as OpenRouter and ADR Aggregator.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, Cline, Cursor, Windsurf, Continue.dev, Aider, Gemini |

### 1.3 Primary Capabilities *(required)*

- [x] Project architecture analysis with AI and tree-sitter
- [x] ADR generation, validation, and progress tracking
- [x] Security content scanning and masking
- [x] Deployment readiness validation
- [x] ADR Aggregator sync and governance integrations

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js 20+ runtime; works on macOS, Linux, and Windows. |
| **Documented integrations** *(optional)* | Claude Desktop, Cline, Cursor, Windsurf, Continue.dev, Aider |
| **Notes / constraints** *(optional)* | Requires absolute PROJECT_PATH and OpenRouter API key for AI execution mode. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Determined by tree-sitter grammars (JS/TS, Python, Go, Rust, Java, etc.) |
| **How to extend** *(optional)* | Add additional tree-sitter parsers and analysis rules. |

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
| **Runtime** *(required)* | `@modelcontextprotocol/sdk`, `tree-sitter` (+ language grammars), `zod`, `fast-glob`, `@mendable/firecrawl-js` |
| **External / System** *(optional)* | Node.js 20+, npm 9+ |
| **Optional** *(optional)* | Firecrawl, ADR Aggregator |
| **Paid services / Tokens** *(required)* | OpenRouter API key (AI execution), ADR Aggregator API key (optional) |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI start) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | No mandatory files |
| **CLI flags used** *(optional)* | `--test` (health check) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP SDK, tree-sitter, OpenRouter, Firecrawl (optional) |
| **Architecture notes** *(optional)* | Tools orchestrate analysis, run optional AI prompts, and return structured responses. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Unknown |
| `sse` *(optional)* | Unknown |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | Yes (for AI features) |
| **Mechanism** *(optional)* | API keys via environment variables |
| **Secrets / Env vars** *(optional)* | `OPENROUTER_API_KEY`, `ADR_AGGREGATOR_API_KEY`, `FIRECRAWL_API_KEY` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (ADRs, TODOs, cache) |
| **Uses local cache** *(optional)* | Yes (`.mcp-adr-cache`) |
| **Uses external DB** *(optional)* | Optional ADR Aggregator cloud |
| **Retains user code** *(required)* | Yes (local analysis and cache) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `analyze_content_security` |
| 2 | `analyze_environment` |
| 3 | `analyze_project_ecosystem` |
| 4 | `apply_basic_content_masking` |
| 5 | `compare_adr_progress` |
| 6 | `deployment_readiness` |
| 7 | `discover_existing_adrs` |
| 8 | `generate_adr_bootstrap` |
| 9 | `generate_adr_from_decision` |
| 10 | `generate_adr_todo` |
| 11 | `generate_adrs_from_prd` |
| 12 | `generate_content_masking` |
| 13 | `generate_deployment_guidance` |
| 14 | `generate_research_questions` |
| 15 | `get_adr_context` |
| 16 | `get_adr_templates` |
| 17 | `get_knowledge_graph` |
| 18 | `get_staleness_report` |
| 19 | `get_workflow_guidance` |
| 20 | `interactive_adr_planning` |
| 21 | `memory_loading` |
| 22 | `perform_research` |
| 23 | `review_existing_adrs` |
| 24 | `smart_score` |
| 25 | `suggest_adrs` |
| 26 | `sync_to_aggregator` |
| 27 | `validate_adr` |
| 28 | `validate_all_adrs` |
| 29 | `validate_content_masking` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ProjectPath` | Absolute project path (`PROJECT_PATH` or parameter). |
| `AdrDirectory` | ADR directory path, defaults to `./adrs` or `docs/adrs`. |
| `ExecutionMode` | `full` or `prompt-only`. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `McpTextResponse` | MCP `content[].text` JSON string output. |
| `AdrSuggestion` | Suggested ADR items with rationale and confidence. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Absolute paths required for `PROJECT_PATH` |
| **Rate limits / retries** | Not documented; external API limits apply |
| **File size limits** | `MAX_FILE_SIZE` environment config (bytes) |
| **Resource constraints** | `MAX_FILES_PER_ANALYSIS`, `MAX_RECURSION_DEPTH` |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes |
| **Error as text** | Yes (content text) |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Invalid input, missing API keys, missing project path |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `analyze_content_security`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>analyze_content_security</code></td></tr>
<tr><td><strong>Description</strong></td><td>Analyzes content for secrets, sensitive data, and security vulnerabilities.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `content` | `string` | ✅ | — | Content to analyze. |
| `contentType` | `string` | ❌ | — | `code`, `configuration`, `logs`, `documentation`, `mixed`. |
| `enhancedMode` | `boolean` | ❌ | — | Enable AI analysis. |
| `enableTreeSitterAnalysis` | `boolean` | ❌ | — | AST-based analysis. |
| `userDefinedPatterns` | `array<string>` | ❌ | — | Custom security patterns. |
| `strictValidation` | `boolean` | ❌ | — | Strict validation mode. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "content": "...", "contentType": "code" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "securityIssues": [], "riskLevel": "low" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `analyze_environment`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>analyze_environment</code></td></tr>
<tr><td><strong>Description</strong></td><td>Analyzes deployment environment, containerization, and infrastructure configuration.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `includeSecurityAnalysis` | `boolean` | ❌ | — | Include security analysis. |
| `checkContainerization` | `boolean` | ❌ | — | Check Docker/container usage. |
| `environmentType` | `string` | ❌ | — | `development`, `staging`, `production`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "includeSecurityAnalysis": true }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "environment": { "platform": "..." }, "deployment": { "readiness": true } }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `analyze_project_ecosystem`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>analyze_project_ecosystem</code></td></tr>
<tr><td><strong>Description</strong></td><td>Comprehensive project analysis across architecture, technology stack, and practices.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root path. |
| `analysisType` | `string` | ❌ | `standard` | `quick`, `standard`, `comprehensive`. |
| `enhancedMode` | `boolean` | ❌ | — | Enable AI analysis. |
| `includeEnvironment` | `boolean` | ❌ | — | Include environment analysis. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": "/path/to/project", "analysisType": "comprehensive" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "technologyStack": { "languages": [] }, "recommendations": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `apply_basic_content_masking`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>apply_basic_content_masking</code></td></tr>
<tr><td><strong>Description</strong></td><td>Applies simple masking patterns to content for quick sanitization.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `content` | `string` | ✅ | — | Content to mask. |
| `patterns` | `array<string>` | ❌ | — | Specific regex patterns. |
| `maskingChar` | `string` | ❌ | `x` | Mask character. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "content": "API_KEY=sk-...", "patterns": ["sk-[a-zA-Z0-9]+"] }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "maskedContent": "API_KEY=xxxxxxxx" }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

### 🔹 Tool: `compare_adr_progress`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>compare_adr_progress</code></td></tr>
<tr><td><strong>Description</strong></td><td>Compares ADRs and implementation progress with task tracking.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `adrDirectory` | `string` | ✅ | — | ADR directory. |
| `todoPath` | `string` | ❌ | — | TODO file path. |
| `projectPath` | `string` | ❌ | — | Project root. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "adrDirectory": "./adrs", "todoPath": "todo.md" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "summary": { "overallProgress": 0 } }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `deployment_readiness`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deployment_readiness</code></td></tr>
<tr><td><strong>Description</strong></td><td>Validates deployment readiness with security, performance, and compliance checks.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `operation` | `string` | ✅ | — | `validate`, `security_audit`, `performance_check`, `compliance_check`. |
| `projectPath` | `string` | ❌ | — | Project root. |
| `environment` | `string` | ❌ | `production` | Target environment. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "operation": "validate", "environment": "production" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "readinessScore": 0, "isReady": false }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `discover_existing_adrs`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>discover_existing_adrs</code></td></tr>
<tr><td><strong>Description</strong></td><td>Discovers and indexes existing ADR files in the project.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `adrDirectory` | `string` | ❌ | `./adrs` | ADR directory. |
| `includeMetadata` | `boolean` | ❌ | `true` | Include metadata. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "adrDirectory": "./adrs" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "adrs": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `generate_adr_bootstrap`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_adr_bootstrap</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates ADR bootstrap and validation scripts for deployment compliance.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ❌ | — | Project root. |
| `adrDirectory` | `string` | ❌ | `docs/adrs` | ADR directory. |
| `scriptType` | `string` | ❌ | `both` | `bootstrap`, `validate`, `both`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": "/path/to/project", "scriptType": "both" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "instructions": "...", "scripts": { "bootstrap": "..." } }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Script generation guidance (no direct writes unless client applies). |

---

### 🔹 Tool: `generate_adr_from_decision`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_adr_from_decision</code></td></tr>
<tr><td><strong>Description</strong></td><td>Creates ADR document content from structured decision data.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `decisionData` | `object` | ✅ | — | ADR decision content (title, context, decision, etc.). |
| `template` | `string` | ❌ | `madr` | ADR template. |
| `outputPath` | `string` | ❌ | — | Output file path. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "decisionData": { "title": "...", "context": "..." }, "template": "madr" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "adrContent": "...", "metadata": { "id": "..." } }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | None (content generation only). |

---

### 🔹 Tool: `generate_adr_todo`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_adr_todo</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates TODO tasks from ADRs and implementation phases.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `adrDirectory` | `string` | ❌ | `./adrs` | ADR directory. |
| `phase` | `string` | ❌ | `both` | `planning`, `implementation`, `both`. |
| `outputPath` | `string` | ❌ | — | Output TODO file. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "adrDirectory": "./adrs", "phase": "both" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "todos": [], "summary": { "totalTasks": 0 } }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | None (content generation only). |

---

### 🔹 Tool: `generate_adrs_from_prd`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_adrs_from_prd</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates ADRs from a Product Requirements Document.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `prdContent` | `string` | ✅ | — | PRD content. |
| `outputDirectory` | `string` | ❌ | `./adrs` | ADR output directory. |
| `adrTemplate` | `string` | ❌ | `nygard` | Template to use. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "prdContent": "...", "outputDirectory": "./adrs" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "generatedAdrs": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | None (content generation only). |

---

### 🔹 Tool: `generate_content_masking`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_content_masking</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates masked content and a masking report.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `content` | `string` | ✅ | — | Content to mask. |
| `maskingLevel` | `string` | ❌ | `standard` | `basic`, `standard`, `strict`, `paranoid`. |
| `maskingStrategy` | `string` | ❌ | — | `replacement`, `redaction`, `tokenization`, `hashing`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "content": "...", "maskingLevel": "standard" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "maskedContent": "...", "maskingReport": {} }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

### 🔹 Tool: `generate_deployment_guidance`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_deployment_guidance</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides deployment guidance based on project analysis and readiness checks.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ❌ | — | Project root. |
| `environment` | `string` | ❌ | — | Target environment. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "environment": "production" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "guidance": "..." }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

### 🔹 Tool: `generate_research_questions`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_research_questions</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates targeted research questions for architectural decisions.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `context` | `string` | ✅ | — | Research context. |
| `scope` | `string` | ❌ | — | Research scope. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "context": "...", "scope": "architecture" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "questions": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `get_adr_context`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_adr_context</code></td></tr>
<tr><td><strong>Description</strong></td><td>Retrieves ADR context from ADR Aggregator for a repository.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `include_diagrams` | `boolean` | ❌ | — | Include Mermaid diagrams. |
| `include_timeline` | `boolean` | ❌ | `true` | Include timeline. |
| `projectPath` | `string` | ❌ | — | Project root (for repo detection). |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "include_timeline": true }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "summary": { "total_adrs": 0 }, "adrs": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Network call to ADR Aggregator |

---

### 🔹 Tool: `get_adr_templates`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_adr_templates</code></td></tr>
<tr><td><strong>Description</strong></td><td>Fetches ADR templates by domain from ADR Aggregator.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `domain` | `string` | ❌ | — | Domain filter. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "domain": "web_application" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "templates": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Network call to ADR Aggregator |

---

### 🔹 Tool: `get_knowledge_graph`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_knowledge_graph</code></td></tr>
<tr><td><strong>Description</strong></td><td>Retrieves cross-repository knowledge graph data from ADR Aggregator.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `scope` | `string` | ❌ | `repository` | `repository` or `organization`. |
| `include_analytics` | `boolean` | ❌ | — | Include analytics. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "scope": "repository" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "graph": {} }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Network call to ADR Aggregator |

---

### 🔹 Tool: `get_staleness_report`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_staleness_report</code></td></tr>
<tr><td><strong>Description</strong></td><td>Gets ADR staleness report from ADR Aggregator.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `threshold` | `number` | ❌ | `90` | Staleness days threshold. |
| `projectPath` | `string` | ❌ | — | Project root. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "threshold": 90 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "report_date": "...", "summary": {} }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Network call to ADR Aggregator |

---

### 🔹 Tool: `get_workflow_guidance`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_workflow_guidance</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides workflow guidance based on project state and preferences.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root. |
| `currentPhase` | `string` | ❌ | — | Development phase. |
| `teamSize` | `number` | ❌ | — | Team size. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": ".", "currentPhase": "design" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "guidance": "..." }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

### 🔹 Tool: `interactive_adr_planning`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>interactive_adr_planning</code></td></tr>
<tr><td><strong>Description</strong></td><td>Guided ADR planning session for prioritizing architectural decisions.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root. |
| `sessionMode` | `string` | ❌ | — | `guided` or `free-form`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": "/path/to/project", "sessionMode": "guided" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "plan": "..." }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `memory_loading`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>memory_loading</code></td></tr>
<tr><td><strong>Description</strong></td><td>Loads architectural memory to support context-aware analysis.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ❌ | — | Project root. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": "." }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "memory": {} }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

### 🔹 Tool: `perform_research`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>perform_research</code></td></tr>
<tr><td><strong>Description</strong></td><td>Answers questions using cascading data sources and optional web research.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `question` | `string` | ✅ | — | Research question. |
| `scope` | `string` | ❌ | — | Research scope. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "question": "..." }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "answer": "...", "sources": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Network calls when Firecrawl enabled |

---

### 🔹 Tool: `review_existing_adrs`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>review_existing_adrs</code></td></tr>
<tr><td><strong>Description</strong></td><td>Analyzes ADR compliance, completeness, and implementation evidence.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `adrDirectory` | `string` | ✅ | — | ADR directory. |
| `includeTreeSitter` | `boolean` | ❌ | — | Enable code analysis. |
| `analysisDepth` | `string` | ❌ | — | `basic`, `comprehensive`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "adrDirectory": "./adrs", "analysisDepth": "comprehensive" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "summary": { "totalAdrs": 0 }, "recommendations": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `smart_score`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>smart_score</code></td></tr>
<tr><td><strong>Description</strong></td><td>Calculates project health and architecture quality scores.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root. |
| `includeDetails` | `boolean` | ❌ | `true` | Include details. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": "/path/to/project" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "score": 0, "details": {} }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `suggest_adrs`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>suggest_adrs</code></td></tr>
<tr><td><strong>Description</strong></td><td>Suggests ADRs based on project analysis or code changes.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ❌ | — | Project root. |
| `analysisType` | `string` | ❌ | `comprehensive` | `implicit_decisions`, `code_changes`, `comprehensive`. |
| `existingAdrs` | `array<string>` | ❌ | — | Existing ADR summaries. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "projectPath": ".", "analysisType": "comprehensive" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "suggestions": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `sync_to_aggregator`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>sync_to_aggregator</code></td></tr>
<tr><td><strong>Description</strong></td><td>Syncs local ADRs to ADR Aggregator platform.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `full_sync` | `boolean` | ❌ | `false` | Replace all ADRs. |
| `adr_paths` | `array<string>` | ❌ | — | Specific ADR paths. |
| `projectPath` | `string` | ❌ | — | Project root. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "full_sync": true }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "synced_count": 0, "repository": "..." }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Network write to ADR Aggregator |

---

### 🔹 Tool: `validate_adr`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>validate_adr</code></td></tr>
<tr><td><strong>Description</strong></td><td>Validates a specific ADR against current project state.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `adrPath` | `string` | ✅ | — | ADR file path. |
| `projectPath` | `string` | ❌ | — | Project root. |
| `confidenceThreshold` | `number` | ❌ | `0.6` | Minimum confidence. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "adrPath": "docs/adrs/0001-foo.md" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "isValid": true, "findings": [] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `validate_all_adrs`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>validate_all_adrs</code></td></tr>
<tr><td><strong>Description</strong></td><td>Validates all ADRs in a directory for compliance and drift.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ❌ | — | Project root. |
| `adrDirectory` | `string` | ❌ | `docs/adrs` | ADR directory. |
| `minConfidence` | `number` | ❌ | `0.6` | Minimum confidence. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "adrDirectory": "docs/adrs" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "totalAdrs": 0, "validAdrs": 0 }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | `None` |

---

### 🔹 Tool: `validate_content_masking`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>validate_content_masking</code></td></tr>
<tr><td><strong>Description</strong></td><td>Validates effectiveness of content masking.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `originalContent` | `string` | ✅ | — | Original content. |
| `maskedContent` | `string` | ✅ | — | Masked content. |
| `validationLevel` | `string` | ❌ | `basic` | `basic`, `comprehensive`, `forensic`. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "originalContent": "...", "maskedContent": "..." }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "isValid": true, "validationScore": 1 }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | `None` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `adr://project-status`, `adr://project-metrics`, `adr://code-quality`, `adr://deployment-status`, `adr://deployment-history`, `adr://environment-analysis`, `adr://adr/{id}`, `adr://todo-list` |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | None documented |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `PROJECT_PATH` | ✅ | — | — | Absolute path to project root. |
| `OPENROUTER_API_KEY` | ⚡ | 🔒 | — | AI execution API key. |
| `EXECUTION_MODE` | ⚡ | — | `prompt-only` | `full` for AI execution. |
| `AI_MODEL` | ❌ | — | `anthropic/claude-3-sonnet` | AI model identifier. |
| `ADR_DIRECTORY` | ❌ | — | `./adrs` | ADR directory. |
| `LOG_LEVEL` | ❌ | — | `INFO` | Logging level. |
| `FIRECRAWL_ENABLED` | ❌ | — | `false` | Enable Firecrawl. |
| `FIRECRAWL_API_KEY` | ❌ | 🔒 | — | Firecrawl key. |
| `ADR_AGGREGATOR_API_KEY` | ❌ | 🔒 | — | ADR Aggregator key. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | N/A |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--test` | Health check startup. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `npm install -g mcp-adr-analysis-server` |
| 2 | Set `PROJECT_PATH` and `OPENROUTER_API_KEY` |

### 8.2 Typical Run Commands *(optional)*

```bash
mcp-adr-analysis-server
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Standard output with log levels (INFO/WARN/ERROR) |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Adjust `MAX_FILES_PER_ANALYSIS` and `MAX_RECURSION_DEPTH` for large repos.
- Enable caching via `AI_CACHE_ENABLED` for repeated analyses.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `29` |

### 9.2 Known Gaps *(optional)*

- Tool list derived from docs and selected source files; additional internal tools may exist in source beyond this report.
<div align="center">

# 📋 MCP Server Report

## `[SERVER_NAME]`
### [`tosin2013/mcp-adr-analysis-server`](https://github.com/tosin2013/mcp-adr-analysis-server)

</div>

---

> **Report Date:** `[YYYY-MM-DD]`

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/tosin2013/mcp-adr-analysis-server` |
| **Target Path** *(optional)* | `[subdir path]` or `N/A` |
| **Analyzed Ref** *(required)* | `[branch/tag/commit]` |
| **Commit URL** *(optional)* | `[URL]` or `N/A` |
| **License** *(required)* | `[LICENSE]` or `Unknown` |
| **Version** *(optional)* | `[VERSION]` or `N/A` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | What was reviewed (repo, subfolder, specific version) |
| **Observed in source** *(required)* | `Yes` / `No` |
| **Observed in docs** *(required)* | `Yes` / `No` |
| **Inferred** *(optional)* | `Yes` / `No` — explain what is inferred |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `absolute` / `relative` (relative to what?) |
| **Line/column indexing** *(required)* | `1-based` / `0-based` / `mixed` |
| **Encoding model** *(optional)* | `UTF-16` / `bytes` / `codepoints` / `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `direct JSON` / `content[].text JSON string` / `plain text` / `mixed` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

> *One-paragraph summary of what the server does and why it exists.*

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | `VS Code` / `Cursor` / `JetBrains` / `Claude Desktop` / `CLI` / `Any MCP client` / `Unknown` |
| **Documented clients** *(optional)* | [list] or `None` |

### 1.3 Primary Capabilities *(required)*

- [ ] Capability 1
- [ ] Capability 2
- [ ] Capability 3

### 1.4 Non-Goals / Exclusions *(optional)*

- Explicit limitation 1
- Explicit limitation 2

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | [text] |
| **Documented integrations** *(optional)* | [list] |
| **Notes / constraints** *(optional)* | [text] |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | [list] or `Determined by underlying engine` |
| **How to extend** *(optional)* | [text] |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | `Open-source` / `Proprietary` / `Mixed` / `Unknown` |
| **License details** *(optional)* | [text] |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | [list] |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | [list] |
| **External / System** *(optional)* | [list] |
| **Optional** *(optional)* | [list] |
| **Paid services / Tokens** *(required)* | `None` or [list] |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local process` / `Docker` / `Remote` / `Mixed` / `Unknown` |
| **Started by MCP client** *(required)* | `Yes` / `No` |
| **Started independently** *(optional)* | `Yes` / `No` |
| **Env vars used** *(optional)* | `Yes` / `No` (see § 7) |
| **Config files used** *(optional)* | `Yes` / `No` (name/location) |
| **CLI flags used** *(optional)* | `Yes` / `No` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | `LSP` / `tree-sitter` / `Joern` / `Semgrep` / `GitHub API` / `Neo4j` / etc. |
| **Architecture notes** *(optional)* | [bullet list describing key components and data flow] |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` / `No` |
| `http` / `streamable-http` *(optional)* | `Yes` / `No` |
| `sse` *(optional)* | `Yes` / `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `Yes` / `No` |
| **Mechanism** *(optional)* | `token` / `OAuth` / `basic auth` / `none` / `Unknown` |
| **Secrets / Env vars** *(optional)* | [list] or `None` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `Yes` / `No` |
| **Uses local cache** *(optional)* | `Yes` / `No` (location) |
| **Uses external DB** *(optional)* | `Yes` / `No` (which) |
| **Retains user code** *(required)* | `Yes` / `No` / `Unknown` (describe) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `tool_name_1` |
| 2 | `tool_name_2` |
| 3 | `tool_name_3` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TypeName` | [brief definition] |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TypeName` | [brief definition] |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` / `relative` / `safe-join` / `traversal protection` |
| **Rate limits / retries** | `429` / backoff behavior |
| **File size limits** | [limits] |
| **Resource constraints** | [timeouts, max results] |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Yes` / `No` / `Unknown` |
| **Error as text** | `Yes` / `No` / `Unknown` |
| **Error as `{ error: string }`** | `Yes` / `No` / `Unknown` |
| **Common error codes** | [list] |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `[tool_name]`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>[tool_name]</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>[What it does in 1–3 sentences.]</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` / `text` / `other` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `param1` | `string` | ✅ | — | [description] |
| `param2` | `number` | ❌ | `10` | [description] |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "param1": "...",
  "param2": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "param1": "example",
  "param2": 42
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` / `text` / `other` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "result": "..."
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "result": "example"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` / `Write Only` / `Hybrid` / `Unknown` |
| **Classification** *(required)* | `Semantic Research` / `General Research` / `Other` / `Unknown` |
| **Side effects** *(required)* | `None` or [list] |
| **Determinism** *(optional)* | `Deterministic` / `Non-deterministic` / `Depends` / `Unknown` |
| **Idempotency** *(optional)* | `Idempotent` / `Non-idempotent` / `Depends` / `Unknown` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | [e.g., must call `start_server` first] |
| **Postconditions** | [what changes] |
| **Limits** | [max results, timeouts] |
| **Security & privacy** | [PII, secrets, path traversal, network calls] |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [file path / symbol name] or `Unknown` |
| **Core implementation** | [file path / symbol name] or `Unknown` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `None` or [list] |
| **MCP prompts exposed** *(optional)* | `None` or [list] |
| **Other RPC endpoints** *(optional)* | [text] |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `ENV_VAR_1` | ✅ | 🔒 | — | [description] |
| `ENV_VAR_2` | ❌ | — | `default` | [description] |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `[path/name]` | [text] |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "key": "value"
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--flag` | [description] |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | [command or action] |
| 2 | [command or action] |

### 8.2 Typical Run Commands *(optional)*

```bash
# Example startup command
[command]
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | [where/how] |
| **Tracing / Metrics** | `OpenTelemetry` / `None` / [other] |

### 8.4 Performance Considerations *(optional)*

- [consideration 1]
- [consideration 2]

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `[N]` |
| **Read-only** | `[N]` |
| **Write-only** | `[N]` |
| **Hybrid** | `[N]` |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| [Unknown field 1] | [why it's unknown] |
| [Unknown field 2] | [why it's unknown] |

---

<div align="center">

*— End of Report —*

</div>
