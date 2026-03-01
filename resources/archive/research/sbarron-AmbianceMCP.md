<div align="center">

# 📋 MCP Server Report

## Ambiance MCP Server
### [`sbarron/AmbianceMCP`](https://github.com/sbarron/AmbianceMCP)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/sbarron/AmbianceMCP` |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | main |
| **Commit URL** *(optional)* | N/A |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 0.2.5 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Repository root at main; MCP server implementation, tool definitions, and README guidance |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — runtime behaviors for cloud/AI tools inferred from handlers and environment gates |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | relative to workspace folder (absolute paths recommended and accepted) |
| **Line/column indexing** *(required)* | 1-based |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Ambiance MCP Server provides compressed, semantically rich code context for IDE and CLI workflows. It combines local AST analysis, optional embeddings, and AI/cloud integrations to generate concise context, project hints, file summaries, and debug insights while reducing token usage. It is designed to work offline by default, with optional OpenAI-compatible and Ambiance GitHub App features for enhanced analysis and repository context.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Cursor/IDE MCP configuration examples; CLI usage |

### 1.3 Primary Capabilities *(required)*

- [x] Local semantic context compaction with AST parsing and optional embeddings
- [x] Project hints, file summaries, and debug context extraction
- [x] AI-assisted context, code explanations, and project insights (OpenAI-compatible)
- [x] GitHub repository context search and graph-based retrieval via Ambiance cloud

### 1.4 Non-Goals / Exclusions *(optional)*

- None documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js >= 18; MCP server designed for local or IDE-integrated execution |
| **Documented integrations** *(optional)* | MCP IDE configuration examples; CLI usage via npm/npx |
| **Notes / constraints** *(optional)* | AI tools require OpenAI-compatible keys; cloud tools require AMBIANCE_API_KEY |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript, JavaScript, Python, Go, Rust (plus broader AST-grep language support) |
| **How to extend** *(optional)* | Add parsers or AST-grep language support; configure embeddings/models via env vars |

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
| **Runtime** *(required)* | @modelcontextprotocol/sdk, tree-sitter, @ast-grep/cli, better-sqlite3, globby, axios, openai, @xenova/transformers, zod |
| **External / System** *(optional)* | Node.js 18+, ast-grep CLI runtime (bundled via npm) |
| **Optional** *(optional)* | Ambiance cloud API, OpenAI-compatible providers, VoyageAI embeddings |
| **Paid services / Tokens** *(required)* | OpenAI-compatible API keys; Ambiance API key (GitHub App integration) |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | No (not documented) |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | tree-sitter, AST-grep, OpenAI-compatible APIs, GitHub App (Ambiance cloud) |
| **Architecture notes** *(optional)* | - Local AST parsing and semantic compaction
- Optional embedding storage (SQLite) with background indexing
- Optional AI analysis via OpenAI-compatible providers
- Optional GitHub repository context retrieval via Ambiance cloud |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | No |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No (core tools) |
| **Mechanism** *(optional)* | token (API keys via env vars) |
| **Secrets / Env vars** *(optional)* | OPENAI_API_KEY, AMBIANCE_API_KEY, provider-specific keys |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (embedding DB, temp directories, lock files) |
| **Uses local cache** *(optional)* | Yes (SQLite-based embedding storage) |
| **Uses external DB** *(optional)* | Yes when Ambiance cloud is enabled (GitHub App backend) |
| **Retains user code** *(required)* | Yes (local embeddings/analysis; cloud tools access GitHub repositories via API) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `ai_code_explanation` |
| 2 | `ai_debug` |
| 3 | `ai_get_context` |
| 4 | `ai_project_insights` |
| 5 | `ambiance_get_context` |
| 6 | `ambiance_get_graph_context` |
| 7 | `ambiance_list_github_repos` |
| 8 | `ambiance_search_github_repos` |
| 9 | `ast_grep_search` |
| 10 | `frontend_insights` |
| 11 | `local_context` |
| 12 | `local_debug_context` |
| 13 | `local_file_summary` |
| 14 | `local_project_hints` |
| 15 | `manage_embeddings` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ProjectPath` | String path to a project root; absolute or workspace-relative |
| `FilePath` | String path to a file; absolute or workspace-relative |
| `ExcludePatterns` | Array of glob patterns to omit from analysis |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `DebugContextReport` | `{ errors: ParsedError[], matches: SearchMatch[], summary: {...} }` from `local_debug_context` |
| `CloudToolResponse` | `{ success: boolean, data?: any, error?: string, metadata?: {...} }` for Ambiance cloud tools |
| `AstGrepResult` | `{ matches: AstGrepMatch[], totalMatches: number, executionTime: number, pattern: string }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | absolute paths preferred; workspace-relative resolved via `validateAndResolvePath` |
| **Rate limits / retries** | Cloud/AI calls rely on provider behavior; no explicit retry policy documented |
| **File size limits** | Project hints and embeddings enforce max file size (e.g., 50–200 KB); ast-grep respects `.gitignore` |
| **Resource constraints** | AI tools use timeouts; ast-grep has a 120-second timeout; max results configurable per tool |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (thrown errors converted to MCP error) |
| **Error as `{ error: string }`** | Yes (many handlers return `{ success: false, error }`) |
| **Common error codes** | Missing path/API keys, timeouts, invalid patterns |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `ai_code_explanation`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ai_code_explanation</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates an AI explanation for a code snippet or file, optionally using project context and a specified audience/focus.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ❌ | — | Code snippet to explain (required if `filePath` is not provided). |
| `filePath` | `string` | ❌ | — | File path to explain (absolute or workspace-relative). |
| `projectPath` | `string` | ❌ | — | Project root for additional context. |
| `focus` | `string` | ❌ | — | Focus area (e.g., security, performance). |
| `audience` | `string` | ❌ | `intermediate` | Target audience level. |
| `includeImprovement` | `boolean` | ❌ | `true` | Include improvement suggestions. |
| `language` | `string` | ❌ | — | Explicit language override. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "string",
  "filePath": "string",
  "projectPath": "string",
  "focus": "string",
  "audience": "intermediate",
  "includeImprovement": true,
  "language": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "filePath": "src/index.ts",
  "projectPath": ".",
  "audience": "intermediate",
  "includeImprovement": true
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
  "success": true,
  "explanation": "string",
  "metadata": {
    "language": "string",
    "audience": "string",
    "focus": "string",
    "includeImprovement": true,
    "codeLength": 0,
    "tokenUsage": 0,
    "processingTime": 0,
    "provider": "string",
    "model": "string"
  }
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "explanation": "The module initializes the server and registers MCP tools...",
  "metadata": {
    "language": "typescript",
    "audience": "intermediate",
    "focus": "general",
    "includeImprovement": true,
    "codeLength": 1200,
    "tokenUsage": 2100,
    "processingTime": 4200,
    "provider": "openai",
    "model": "gpt-5"
  }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Network calls to AI provider |
| **Determinism** *(optional)* | Non-deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `OPENAI_API_KEY` (or provider key) must be set; either `code` or `filePath` required |
| **Postconditions** | None |
| **Limits** | Timeout controlled by `AI_CODE_EXPLANATION_TIMEOUT_MS` |
| **Security & privacy** | Sends code/context to external AI provider |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`openaiCompatibleTools`) |
| **Core implementation** | src/tools/aiTools/aiCodeExplanation.ts (`aiCodeExplanationTool`, `handleAICodeExplanation`) |

---

### 🔹 Tool: `ai_debug`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ai_debug</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes a debug context report (from `local_debug_context`) and returns root-cause analysis with fix suggestions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `debugContext` | `object` | ✅ | — | Debug context report with `errors` and `matches`. |
| `analysisType` | `string` | ❌ | `comprehensive` | Analysis mode (`comprehensive`, `quick_fix`, `root_cause`, `prevention`). |
| `includeCodeExamples` | `boolean` | ❌ | `true` | Include code examples in fixes. |
| `maxSuggestions` | `number` | ❌ | `5` | Max number of fix suggestions (1–10). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "debugContext": {
    "errors": [],
    "matches": [],
    "summary": {}
  },
  "analysisType": "comprehensive",
  "includeCodeExamples": true,
  "maxSuggestions": 5
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "debugContext": {
    "errors": [{"filePath": "src/app.ts", "line": 42, "raw": "TypeError"}],
    "matches": [],
    "summary": {"errorCount": 1, "matchCount": 0, "uniqueFiles": 1}
  },
  "analysisType": "root_cause"
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
  "summary": {
    "primaryIssue": "string",
    "severity": "low",
    "confidence": 0.0,
    "affectedFiles": []
  },
  "rootCause": {
    "description": "string",
    "contributingFactors": [],
    "codePatterns": []
  },
  "fixSuggestions": [],
  "prevention": {
    "bestPractices": [],
    "toolingSuggestions": [],
    "testingStrategies": []
  },
  "nextSteps": []
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "summary": {
    "primaryIssue": "Null reference in request handler",
    "severity": "high",
    "confidence": 0.74,
    "affectedFiles": ["src/app.ts"]
  },
  "rootCause": {
    "description": "Missing null guard for request payload",
    "contributingFactors": ["Unvalidated input"],
    "codePatterns": ["Direct property access"]
  },
  "fixSuggestions": [],
  "prevention": {
    "bestPractices": ["Validate inputs"],
    "toolingSuggestions": [],
    "testingStrategies": ["Add null-path tests"]
  },
  "nextSteps": ["Add guard clause"]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Network calls to AI provider |
| **Determinism** *(optional)* | Non-deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `OPENAI_API_KEY` required; `debugContext` must include `errors` and `matches` |
| **Postconditions** | None |
| **Limits** | Max suggestions 10; response must be JSON |
| **Security & privacy** | Sends debug context to external AI provider |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`openaiCompatibleTools`) |
| **Core implementation** | src/tools/debug/aiDebug.ts (`aiDebugTool`, `handleAIDebug`) |

---

### 🔹 Tool: `ai_get_context`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ai_get_context</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates AI-enhanced project context with optional embeddings, formatted output, and task-specific analysis.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root to analyze. |
| `query` | `string` | ❌ | — | Focused analysis query. |
| `maxTokens` | `number` | ❌ | `6000` | Token budget for output. |
| `taskType` | `string` | ❌ | `understand` | Task category (`debug`, `implement`, etc.). |
| `includeExplanations` | `boolean` | ❌ | `true` | Include AI explanations. |
| `focusFiles` | `array` | ❌ | — | Files to prioritize. |
| `complexity` | `string` | ❌ | `detailed` | Analysis depth. |
| `format` | `string` | ❌ | `structured` | Output format (`xml`, `markdown`, `structured`, `json`). |
| `modelPreference` | `string` | ❌ | `auto` | Model selection hint. |
| `useEmbeddings` | `boolean` | ❌ | `true` | Use local embeddings if available. |
| `embeddingSimilarityThreshold` | `number` | ❌ | `0.2` | Similarity cutoff. |
| `maxSimilarChunks` | `number` | ❌ | `10` | Max similar chunks. |
| `excludePatterns` | `array` | ❌ | — | Additional exclusions. |
| `generateEmbeddingsIfMissing` | `boolean` | ❌ | `true` | Generate embeddings if missing. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "projectPath": "string",
  "query": "string",
  "maxTokens": 6000,
  "taskType": "understand",
  "includeExplanations": true,
  "focusFiles": ["string"],
  "complexity": "detailed",
  "format": "structured",
  "modelPreference": "auto",
  "useEmbeddings": true,
  "embeddingSimilarityThreshold": 0.2,
  "maxSimilarChunks": 10,
  "excludePatterns": ["*.md"],
  "generateEmbeddingsIfMissing": true
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "projectPath": ".",
  "query": "authentication flow",
  "format": "markdown",
  "taskType": "understand"
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
  "success": true,
  "content": "string",
  "metadata": {
    "tokenCount": 0,
    "format": "string",
    "embeddingsUsed": false
  },
  "usage": "string"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "content": "# Context\n...",
  "metadata": {
    "tokenCount": 3200,
    "format": "markdown",
    "embeddingsUsed": true
  },
  "usage": "AI context analysis complete"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Network calls to AI provider; optional embedding generation |
| **Determinism** *(optional)* | Non-deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `OPENAI_API_KEY` required for AI analysis; `projectPath` required |
| **Postconditions** | May generate embeddings if enabled |
| **Limits** | Token budget enforced via `maxTokens` |
| **Security & privacy** | Sends project context to external AI provider |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`openaiCompatibleTools`) |
| **Core implementation** | src/tools/aiTools/aiSemanticCompact.ts (`aiSemanticCompactTool`, `handleAISemanticCompact`) |

---

### 🔹 Tool: `ai_project_insights`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ai_project_insights</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs AI-driven analysis of project architecture, quality, security, or performance with optional recommendations.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root to analyze. |
| `analysisType` | `string` | ❌ | `comprehensive` | Analysis mode (`architecture`, `quality`, etc.). |
| `includeRecommendations` | `boolean` | ❌ | `true` | Include recommended actions. |
| `focusAreas` | `array` | ❌ | — | Focused areas (`patterns`, `dependencies`, etc.). |
| `outputFormat` | `string` | ❌ | `structured` | Output format (`structured`, `markdown`, `executive-summary`). |
| `excludePatterns` | `array` | ❌ | — | Additional exclusions. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "projectPath": "string",
  "analysisType": "comprehensive",
  "includeRecommendations": true,
  "focusAreas": ["patterns"],
  "outputFormat": "structured",
  "excludePatterns": ["*.md"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "projectPath": ".",
  "analysisType": "architecture",
  "outputFormat": "markdown"
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
  "success": true,
  "insights": "string",
  "analysis": {
    "type": "string",
    "focusAreas": [],
    "format": "string"
  },
  "projectOverview": {},
  "metadata": {
    "tokenUsage": 0,
    "processingTime": 0,
    "provider": "string",
    "model": "string",
    "includeRecommendations": true
  }
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "insights": "Project follows a layered architecture...",
  "analysis": {"type": "architecture", "focusAreas": ["patterns"], "format": "markdown"},
  "projectOverview": {"totalFiles": 120, "languages": ["typescript"]},
  "metadata": {"tokenUsage": 3100, "processingTime": 18000, "provider": "openai", "model": "gpt-5", "includeRecommendations": true}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Network calls to AI provider |
| **Determinism** *(optional)* | Non-deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `OPENAI_API_KEY` required; `projectPath` required |
| **Postconditions** | None |
| **Limits** | Dynamic timeout based on project size |
| **Security & privacy** | Sends project context to external AI provider |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`openaiCompatibleTools`) |
| **Core implementation** | src/tools/aiTools/aiProjectInsights.ts (`aiProjectInsightsTool`, `handleAIProjectInsights`) |

---

### 🔹 Tool: `ambiance_get_context`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ambiance_get_context</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetches a context bundle from a GitHub repository indexed via the Ambiance GitHub App.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Context query. |
| `github_repo` | `string` | ✅ | — | Repository in `owner/repo` format. |
| `branch` | `string` | ❌ | `main` | Branch to search. |
| `hints` | `array` | ❌ | — | Optional hints (files/symbols). |
| `token_budget` | `number` | ❌ | `4000` | Max tokens for context bundle. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "github_repo": "string",
  "branch": "main",
  "hints": ["string"],
  "token_budget": 4000
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "authentication flow",
  "github_repo": "microsoft/vscode",
  "branch": "main"
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
  "success": true,
  "data": {
    "snippets": [],
    "budget": {},
    "metadata": {}
  },
  "metadata": {
    "operation": "get_github_context_bundle",
    "timestamp": "string",
    "source": "github_repos"
  }
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "data": {"snippets": [], "budget": {"requested": 4000, "used": 1200}, "metadata": {"query": "authentication flow"}},
  "metadata": {"operation": "get_github_context_bundle", "timestamp": "2026-02-03T00:00:00Z", "source": "github_repos"}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Network calls to Ambiance cloud |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `AMBIANCE_API_KEY` required and validated |
| **Postconditions** | None |
| **Limits** | `token_budget` controls bundle size |
| **Security & privacy** | Accesses GitHub data via Ambiance cloud service |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`cloudToolDefinitions`) |
| **Core implementation** | src/tools/cloudTools/toolHandlers.ts (`handleGetGithubContextBundle`) |

---

### 🔹 Tool: `ambiance_get_graph_context`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ambiance_get_graph_context</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves graph-based context across one or more GitHub repositories using Ambiance cloud graph traversal.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Context query. |
| `github_repos` | `array` | ❌ | — | Array of `owner/repo` strings. |
| `github_repo` | `string` | ❌ | — | Single repository alternative. |
| `branch` | `string` | ❌ | `main` | Branch to search. |
| `max_nodes` | `number` | ❌ | `20` | Max graph nodes. |
| `max_tokens` | `number` | ❌ | `8000` | Token budget. |
| `include_related_files` | `boolean` | ❌ | `true` | Include related files. |
| `focus_areas` | `array` | ❌ | — | Focus areas (functions/classes/imports). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "github_repos": ["string"],
  "github_repo": "string",
  "branch": "main",
  "max_nodes": 20,
  "max_tokens": 8000,
  "include_related_files": true,
  "focus_areas": ["functions"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "error handling patterns",
  "github_repos": ["owner/repo"],
  "max_nodes": 10
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
  "success": true,
  "data": {},
  "metadata": {
    "operation": "get_graph_context",
    "timestamp": "string",
    "source": "github_repos"
  }
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "data": {"nodes": [], "edges": []},
  "metadata": {"operation": "get_graph_context", "timestamp": "2026-02-03T00:00:00Z", "source": "github_repos"}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Network calls to Ambiance cloud |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `AMBIANCE_API_KEY` required and validated |
| **Postconditions** | None |
| **Limits** | `max_nodes` and `max_tokens` limit scope |
| **Security & privacy** | Accesses GitHub data via Ambiance cloud service |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`cloudToolDefinitions`) |
| **Core implementation** | src/tools/cloudTools/toolHandlers.ts (`handleGetGraphContext`) |

---

### 🔹 Tool: `ambiance_list_github_repos`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ambiance_list_github_repos</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists GitHub repositories accessible via the Ambiance GitHub App integration.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No input parameters. |

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
{
  "success": true,
  "data": {
    "repositories": [],
    "count": 0
  },
  "metadata": {
    "operation": "list_github_repos",
    "timestamp": "string",
    "source": "github_repos"
  }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Network calls to Ambiance cloud |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `AMBIANCE_API_KEY` required and validated |
| **Postconditions** | None |
| **Limits** | Provider-defined pagination limits |
| **Security & privacy** | Accesses GitHub account data via Ambiance cloud service |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`cloudToolDefinitions`) |
| **Core implementation** | src/tools/cloudTools/toolHandlers.ts (`handleListGithubRepos`) |

---

### 🔹 Tool: `ambiance_search_github_repos`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ambiance_search_github_repos</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches code within a specified GitHub repository indexed by Ambiance.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Search query. |
| `github_repo` | `string` | ✅ | — | Repository in `owner/repo` format. |
| `branch` | `string` | ❌ | `main` | Branch to search. |
| `k` | `number` | ❌ | `12` | Max results to return. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "github_repo": "string",
  "branch": "main",
  "k": 12
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "token compaction",
  "github_repo": "owner/repo",
  "k": 5
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
  "success": true,
  "data": {
    "results": [],
    "count": 0,
    "query": "string",
    "github_repo": "string",
    "branch": "string"
  },
  "metadata": {
    "operation": "search_github_repos",
    "timestamp": "string",
    "source": "github_repos"
  }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Network calls to Ambiance cloud |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `AMBIANCE_API_KEY` required and validated; `github_repo` required |
| **Postconditions** | None |
| **Limits** | `k` controls max results |
| **Security & privacy** | Accesses GitHub data via Ambiance cloud service |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`cloudToolDefinitions`) |
| **Core implementation** | src/tools/cloudTools/toolHandlers.ts (`handleSearchGithubRepos`) |

---

### 🔹 Tool: `ast_grep_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ast_grep_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs structural AST-grep searches across a project using pattern or rule inputs.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ❌ | — | AST pattern (when not using rule mode). |
| `rulePath` | `string` | ❌ | — | Path to rule file. |
| `ruleYaml` | `string` | ❌ | — | Inline YAML rule. |
| `ruleJson` | `object` | ❌ | — | Inline JSON rule object. |
| `projectPath` | `string` | ✅ | — | Project root. |
| `language` | `string` | ❌ | — | Language hint (js/ts/py/etc.). |
| `filePattern` | `string` | ❌ | — | Restrict search scope. |
| `maxMatches` | `number` | ❌ | `100` | Max matches to return. |
| `includeContext` | `boolean` | ❌ | `true` | Include surrounding context lines. |
| `contextLines` | `number` | ❌ | `3` | Number of context lines. |
| `respectGitignore` | `boolean` | ❌ | `true` | Honor `.gitignore`. |
| `excludePatterns` | `array` | ❌ | — | Extra exclude patterns. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "string",
  "projectPath": "string",
  "language": "ts",
  "filePattern": "src/**/*.ts",
  "maxMatches": 100,
  "includeContext": true,
  "contextLines": 3,
  "respectGitignore": true,
  "excludePatterns": ["test/**"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "pattern": "function $NAME($ARGS) { $BODY }",
  "projectPath": ".",
  "language": "ts",
  "filePattern": "src/**/*.ts"
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
  "matches": [],
  "totalMatches": 0,
  "executionTime": 0,
  "pattern": "string",
  "language": "string",
  "error": "string"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Spawns ast-grep CLI process |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `projectPath` required; pattern or rule required |
| **Postconditions** | None |
| **Limits** | 120-second timeout; `maxMatches` cap |
| **Security & privacy** | Searches local files; respects `.gitignore` by default |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`astGrepTool`) |
| **Core implementation** | src/tools/localTools/astGrep.ts (`astGrepTool`, `handleAstGrep`) |

---

### 🔹 Tool: `frontend_insights`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>frontend_insights</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyzes Next.js/React-style frontend code for routes, components, data flow, and risks.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root. |
| `format` | `string` | ❌ | `structured` | Output format (`structured`, `json`, `compact`, `markdown`). |
| `includeContent` | `boolean` | ❌ | `true` | Include content analysis. |
| `subtree` | `string` | ❌ | `web/app` | Frontend directory to analyze. |
| `maxFiles` | `number` | ❌ | `2000` | Max files to analyze. |
| `useEmbeddings` | `boolean` | ❌ | `true` | Use embeddings for similarity analysis. |
| `embeddingSimilarityThreshold` | `number` | ❌ | `0.3` | Similarity cutoff. |
| `maxSimilarComponents` | `number` | ❌ | `5` | Similar components per component. |
| `analyzePatterns` | `boolean` | ❌ | `true` | Detect anti-patterns/risks. |
| `generateEmbeddingsIfMissing` | `boolean` | ❌ | `false` | Generate embeddings if missing. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "projectPath": "string",
  "format": "structured",
  "includeContent": true,
  "subtree": "web/app",
  "maxFiles": 2000,
  "useEmbeddings": true,
  "embeddingSimilarityThreshold": 0.3,
  "maxSimilarComponents": 5,
  "analyzePatterns": true,
  "generateEmbeddingsIfMissing": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "projectPath": ".",
  "format": "markdown",
  "subtree": "src/app"
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
  "content": [
    {"type": "text", "text": "string"}
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Optional embedding generation |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `projectPath` required |
| **Postconditions** | May generate embeddings if enabled |
| **Limits** | `maxFiles` cap; auto-detects app directory |
| **Security & privacy** | Reads local frontend files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`frontendInsightsTool`) |
| **Core implementation** | src/tools/localTools/frontendInsights.ts (`frontendInsightsTool`, `handleFrontendInsights`) |

---

### 🔹 Tool: `local_context`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>local_context</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates enhanced local context using AST analysis with optional embeddings, producing ranked jump targets and compact bundles.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Query to focus analysis. |
| `projectPath` | `string` | ✅ | — | Project root. |
| `taskType` | `string` | ❌ | `understand` | Task type (`understand`, `debug`, etc.). |
| `maxSimilarChunks` | `number` | ❌ | `20` | Max similar chunks. |
| `maxTokens` | `number` | ❌ | `3000` | Token budget. |
| `generateEmbeddingsIfMissing` | `boolean` | ❌ | `false` | Generate embeddings if missing. |
| `useProjectHintsCache` | `boolean` | ❌ | `true` | Reuse project hints cache. |
| `astQueries` | `array` | ❌ | — | Custom AST queries. |
| `attackPlan` | `string` | ❌ | `auto` | Analysis strategy. |
| `folderPath` | `string` | ❌ | — | Restrict analysis to a folder. |
| `format` | `string` | ❌ | `enhanced` | Output format (`enhanced`, `system-map`, etc.). |
| `excludePatterns` | `array` | ❌ | — | Additional exclusions. |
| `useEmbeddings` | `boolean` | ❌ | `false` | Legacy embeddings flag. |
| `embeddingSimilarityThreshold` | `number` | ❌ | `0.2` | Similarity cutoff. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "string",
  "projectPath": "string",
  "taskType": "understand",
  "maxSimilarChunks": 20,
  "maxTokens": 3000,
  "generateEmbeddingsIfMissing": false,
  "useProjectHintsCache": true,
  "attackPlan": "auto",
  "format": "enhanced",
  "excludePatterns": ["*.md"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "database connection logic",
  "projectPath": ".",
  "format": "enhanced"
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
  "success": true,
  "compactedContent": "string",
  "metadata": {
    "compactedTokens": 0,
    "format": "string",
    "embeddingsUsed": false
  },
  "usage": "string"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Optional embedding generation and temp directory creation |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `projectPath` and `query` required; local embeddings optional |
| **Postconditions** | May update embedding storage |
| **Limits** | Token cap via `maxTokens`; max chunks via `maxSimilarChunks` |
| **Security & privacy** | Reads local files; embeddings stored locally |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`localSemanticCompactTool`) |
| **Core implementation** | src/tools/localTools/semanticCompact.ts (`localSemanticCompactTool`, `handleSemanticCompact`) |

---

### 🔹 Tool: `local_debug_context`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>local_debug_context</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses log text and scans the codebase to build a ranked debug context report, optionally using embeddings.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `logText` | `string` | ✅ | — | Error logs or stack traces. |
| `projectPath` | `string` | ✅ | — | Project root. |
| `maxMatches` | `number` | ❌ | `20` | Max matches to return. |
| `format` | `string` | ❌ | `structured` | Output format. |
| `useEmbeddings` | `boolean` | ❌ | `true` | Use embeddings for similarity. |
| `embeddingSimilarityThreshold` | `number` | ❌ | `0.2` | Similarity cutoff. |
| `maxSimilarChunks` | `number` | ❌ | `5` | Max similar chunks. |
| `generateEmbeddingsIfMissing` | `boolean` | ❌ | `false` | Generate embeddings if missing. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "logText": "string",
  "projectPath": "string",
  "maxMatches": 20,
  "format": "structured",
  "useEmbeddings": true,
  "embeddingSimilarityThreshold": 0.2,
  "maxSimilarChunks": 5,
  "generateEmbeddingsIfMissing": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "logText": "TypeError: undefined is not a function\n at src/app.ts:42:13",
  "projectPath": "."
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
  "errors": [],
  "matches": [],
  "summary": {
    "errorCount": 0,
    "matchCount": 0,
    "uniqueFiles": 0
  }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | Optional embedding generation |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `logText` and `projectPath` required |
| **Postconditions** | May update embedding storage |
| **Limits** | `maxMatches` and `maxSimilarChunks` caps |
| **Security & privacy** | Reads local files; embeddings stored locally |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`localDebugContextTool`) |
| **Core implementation** | src/tools/debug/localDebugContext.ts (`localDebugContextTool`, `handleLocalDebugContext`) |

---

### 🔹 Tool: `local_file_summary`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>local_file_summary</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates a quick AST-based summary of a file with key symbols and complexity metadata.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filePath` | `string` | ✅ | — | File to analyze. |
| `includeSymbols` | `boolean` | ❌ | `true` | Include symbol details. |
| `maxSymbols` | `number` | ❌ | `20` | Max symbols to return. |
| `format` | `string` | ❌ | `structured` | Output format (`xml`, `structured`, `compact`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "filePath": "string",
  "includeSymbols": true,
  "maxSymbols": 20,
  "format": "structured"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "filePath": "src/index.ts",
  "includeSymbols": true
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
  "success": true,
  "summary": "string",
  "quickAnalysis": "string",
  "metadata": {
    "format": "string",
    "symbolCount": 0,
    "complexity": "string",
    "language": "string"
  }
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

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `filePath` required |
| **Postconditions** | None |
| **Limits** | `maxSymbols` cap; format selection |
| **Security & privacy** | Reads local file content |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`localFileSummaryTool`) |
| **Core implementation** | src/tools/localTools/fileSummary.ts (`localFileSummaryTool`, `handleFileSummary`) |

---

### 🔹 Tool: `local_project_hints`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>local_project_hints</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates project navigation hints, folder analysis, and architecture insights in multiple formats.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectPath` | `string` | ✅ | — | Project root. |
| `format` | `string` | ❌ | `compact` | Output format (`structured`, `compact`, `json`, `markdown`, `html`). |
| `maxFiles` | `number` | ❌ | `100` | Max files to analyze. |
| `folderPath` | `string` | ❌ | — | Analyze a specific folder. |
| `includeContent` | `boolean` | ❌ | `false` | Include deeper content analysis. |
| `useAI` | `boolean` | ❌ | `true` | Use AI-powered folder analysis. |
| `maxFileSizeForSymbols` | `number` | ❌ | `50000` | Max file size for symbol extraction. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "projectPath": "string",
  "format": "compact",
  "maxFiles": 100,
  "folderPath": "string",
  "includeContent": false,
  "useAI": true,
  "maxFileSizeForSymbols": 50000
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "projectPath": ".",
  "format": "markdown",
  "maxFiles": 200
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
  "success": true,
  "hints": "string",
  "type": "string",
  "metadata": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Optional AI calls if `useAI=true` |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `projectPath` required |
| **Postconditions** | None |
| **Limits** | `maxFiles` cap; file size limits for symbol extraction |
| **Security & privacy** | Reads local files; optional AI if enabled |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`localProjectHintsTool`) |
| **Core implementation** | src/tools/localTools/projectHints.ts (`localProjectHintsTool`, `handleProjectHints`) |

---

### 🔹 Tool: `manage_embeddings`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>manage_embeddings</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Manages embedding lifecycle, workspace configuration, and project-level embedding operations.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `action` | `string` | ❌ | `status` | Operation (status, create, update, validate, list_projects, delete_project, etc.). |
| `projectPath` | `string` | ❌ | — | Project root for workspace/embedding actions. |
| `projectIdentifier` | `string` | ❌ | — | Project ID for list/delete/detail actions. |
| `format` | `string` | ❌ | `structured` | Output format for status. |
| `autoFix` | `boolean` | ❌ | `false` | Auto-fix during health checks. |
| `maxFixTime` | `number` | ❌ | `15` | Max minutes for auto-fix. |
| `force` | `boolean` | ❌ | `false` | Force regeneration. |
| `batchSize` | `number` | ❌ | `10` | Embedding batch size. |
| `includeStats` | `boolean` | ❌ | `true` | Include stats during validation. |
| `checkIntegrity` | `boolean` | ❌ | `false` | Deep integrity checks. |
| `confirmDeletion` | `boolean` | ❌ | `false` | Required for deletions. |
| `maxFiles` | `number` | ❌ | `5000` | Max files for workspace validation. |
| `excludePatterns` | `array` | ❌ | `[]` | Exclude patterns for file counting. |
| `allowHiddenFolders` | `boolean` | ❌ | `false` | Include hidden folders. |
| `autoGenerate` | `boolean` | ❌ | `false` | Auto-generate embeddings on set_workspace. |
| `files` | `array` | ❌ | — | Specific files for update. |
| `limit` | `number` | ❌ | `20` | Limit for recent files. |
| `autoUpdate` | `boolean` | ❌ | `false` | Auto-update stale files. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "action": "status",
  "projectPath": "string",
  "projectIdentifier": "string",
  "format": "structured",
  "autoFix": false,
  "maxFixTime": 15,
  "force": false,
  "batchSize": 10,
  "includeStats": true,
  "checkIntegrity": false,
  "confirmDeletion": false,
  "maxFiles": 5000,
  "excludePatterns": [],
  "allowHiddenFolders": false,
  "autoGenerate": false,
  "files": ["string"],
  "limit": 20,
  "autoUpdate": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "action": "create",
  "projectPath": ".",
  "force": true
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
  "success": true,
  "message": "string",
  "data": {}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Creates/updates/deletes embedding data and workspace configuration |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends on action |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Local embeddings must be enabled to use storage actions |
| **Postconditions** | Updates embedding DB and/or workspace config |
| **Limits** | Batch size and file limits apply to embedding generation |
| **Security & privacy** | Stores embeddings locally (SQLite) |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`manageEmbeddingsTool`) |
| **Core implementation** | src/tools/localTools/embeddingManagement.ts (`manageEmbeddingsTool`, `handleManageEmbeddings`) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | None documented |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `WORKSPACE_FOLDER` | ✅ | — | auto-detect | Project root used for path resolution |
| `USE_LOCAL_EMBEDDINGS` | ❌ | — | `false` | Enable local embedding storage and related tools |
| `USE_LOCAL_STORAGE` | ❌ | — | `false` | Legacy alias for local embeddings |
| `LOCAL_EMBEDDING_MODEL` | ❌ | — | `all-MiniLM-L6-v2` | Local embedding model name |
| `OPENAI_API_KEY` | ❌ | 🔒 | — | OpenAI-compatible API key for AI tools |
| `OPENAI_PROVIDER` | ❌ | — | `openai` | Provider selector (openai, anthropic, openrouter, groq, etc.) |
| `OPENAI_BASE_URL` | ❌ | — | `https://api.openai.com/v1` | Base URL for OpenAI-compatible APIs |
| `OPENAI_BASE_MODEL` | ❌ | — | `gpt-5` | Primary model name |
| `OPENAI_MINI_MODEL` | ❌ | — | `gpt-5-mini` | Smaller model for lighter tasks |
| `OPENAI_EMBEDDINGS_MODEL` | ❌ | — | `text-embedding-3-small` | Embeddings model name |
| `OPENAI_ORG_ID` | ❌ | 🔒 | — | OpenAI organization ID |
| `ANTHROPIC_API_KEY` | ❌ | 🔒 | — | Anthropic provider key (when OPENAI_PROVIDER=anthropic) |
| `OPENROUTER_API_KEY` | ❌ | 🔒 | — | OpenRouter provider key |
| `GROQ_API_KEY` | ❌ | 🔒 | — | Groq provider key |
| `XAI_API_KEY` | ❌ | 🔒 | — | Grok/XAI provider key |
| `QWEN_API_KEY` | ❌ | 🔒 | — | Qwen provider key |
| `DASHSCOPE_API_KEY` | ❌ | 🔒 | — | DashScope provider key |
| `AZURE_OPENAI_API_KEY` | ❌ | 🔒 | — | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | ❌ | — | — | Azure OpenAI endpoint |
| `AMBIANCE_API_KEY` | ❌ | 🔒 | — | Ambiance GitHub App API key for cloud tools |
| `AI_CODE_EXPLANATION_TIMEOUT_MS` | ❌ | — | `60000` | Timeout for AI code explanation |
| `OPENAI_PROBE_TIMEOUT_MS` | ❌ | — | `3000` | Timeout for OpenAI connectivity probe |
| `SKIP_OPENAI_PROBE` | ❌ | — | `false` | Skip OpenAI connectivity probe |
| `SKIP_AMBIANCE_PROBE` | ❌ | — | `false` | Skip Ambiance API health check |
| `AMBIANCE_SKIP_INDEXING` | ❌ | — | `false` | Skip background embedding generation |
| `AI_COMPARE_MODELS` | ❌ | — | — | CLI compare list (`provider:model` pairs) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None documented | — |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--project-path` | Override project path for CLI commands |
| `--format` | Output format (tool-dependent) |
| `--output` | Write output to a file |
| `--verbose` | Enable verbose logging |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | npm install -g @jackjackstudios/ambiance-mcp |
| 2 | Configure MCP client with command/args and env vars |

### 8.2 Typical Run Commands *(optional)*

```bash
# Example startup command
npx -y @jackjackstudios/ambiance-mcp@latest
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console-style logger output to stdout/stderr |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Embedding generation can take minutes on first run; background indexing runs periodically.
- AI tools are network-bound and may time out based on configured limits.
- Use ast-grep `filePattern` for large repositories to reduce search scope.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 15 |
| **Read-only** | 12 |
| **Write-only** | 0 |
| **Hybrid** | 3 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Graph context response schema | `ambiance_get_graph_context` output shape not fully documented in public README |
| Embedding storage paths | Exact filesystem location for embedding DB not explicitly documented |

---

<div align="center">

*— End of Report —*

</div>
