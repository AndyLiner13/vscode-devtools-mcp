<div align="center">

# 📋 MCP Server Report

## CodeSeeker MCP
### [mixelpixx/CodeSeeker-MCP](https://github.com/mixelpixx/CodeSeeker-MCP)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/mixelpixx/CodeSeeker-MCP |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 899a611c5f397a6e237511d46e293a509657aba5 |
| **Commit URL** *(optional)* | https://github.com/mixelpixx/CodeSeeker-MCP/commit/899a611c5f397a6e237511d46e293a509657aba5 |
| **License** *(required)* | MIT License |
| **Version** *(optional)* | 0.1.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (TypeScript MCP server) |
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
| **Path model** *(required)* | Relative to server working directory (path argument passed to ugrep) |
| **Line/column indexing** *(required)* | Unknown (ugrep JSON output) |
| **Encoding model** *(optional)* | UTF-8 bytes (ugrep input/output) |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

CodeSeeker is a Node.js MCP server that wraps ugrep to provide advanced code search and replacement capabilities for AI assistants. It exposes multiple search modes (basic, boolean, fuzzy, archive, code-structure) and safe replace/refactor tools with dry-run and backup support.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop |

### 1.3 Primary Capabilities *(required)*

- [x] Code/text search using ugrep with structured JSON output
- [x] Safe search-and-replace with dry-run previews and backups
- [x] Code-structure oriented search/refactor with language-specific patterns

### 1.4 Non-Goals / Exclusions *(optional)*

- Interactive TUI search cannot be run through MCP (terminal required)
- Requires ugrep installed locally

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs on any OS with Node.js 18+ and ugrep installed (Windows/macOS/Linux). |
| **Documented integrations** *(optional)* | Claude Desktop |
| **Notes / constraints** *(optional)* | ugrep must be available on PATH; interactive search requires a terminal. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | File types supported by ugrep; code-structure tools target js, ts, py, java, cpp |
| **How to extend** *(optional)* | Add/extend ugrep file types or update language enum in the code. |

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
| **Runtime** *(required)* | Node.js 18+, @modelcontextprotocol/sdk, zod |
| **External / System** *(optional)* | ugrep (>= 7.4) |
| **Optional** *(optional)* | None documented |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | No |
| **Env vars used** *(optional)* | No |
| **Config files used** *(optional)* | No |
| **CLI flags used** *(optional)* | No (server uses MCP stdio transport) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | ugrep, MCP SDK |
| **Architecture notes** *(optional)* | - MCP stdio server implemented with @modelcontextprotocol/sdk
- Executes ugrep via child_process and returns formatted results
- Replace operations use dry-run/backup logic and filesystem writes |

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
| **Writes local files** *(required)* | Yes (replace operations and backups) |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes (reads files and can create backup copies) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `archive_search` |
| 2 | `basic_search` |
| 3 | `boolean_search` |
| 4 | `bulk_replace` |
| 5 | `check_ugrep_installation` |
| 6 | `code_refactor` |
| 7 | `code_structure_search` |
| 8 | `fuzzy_search` |
| 9 | `get_search_stats` |
|10 | `interactive_search` |
|11 | `list_file_types` |
|12 | `search_and_replace` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchPath` | Optional file or directory path; defaults to current working directory. |
| `FileTypes` | Comma-separated file type list for ugrep filtering. |
| `MaxResults` | Result limit applied to ugrep `--max-count`. |
| `DryRun` | Boolean to preview changes without modifying files. |
| `Backup` | Boolean to create backup files before modifications. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `SearchTextResult` | Text response containing ugrep JSON results or formatted stats. |
| `ReplaceSummary` | Text response describing modified files, replacements, or dry-run output. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Relative/absolute paths passed directly to ugrep (no safe-join) |
| **Rate limits / retries** | None documented |
| **File size limits** | None documented |
| **Resource constraints** | None documented; max results controlled via `maxResults` |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes (set on failures) |
| **Error as text** | Yes |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | ugrep missing, command execution failures, file permission errors |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `archive_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>archive_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches inside compressed files and archives using ugrep’s archive mode and returns matching results.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Search pattern. |
| `path` | `string` | ❌ | `.` | Directory path containing archives. |
| `archiveTypes` | `string` | ❌ | — | Comma-separated archive types (zip, tar, gz, 7z, etc.). |
| `maxResults` | `number` | ❌ | `100` | Maximum number of results to return. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "TODO",
  "path": "./artifacts",
  "archiveTypes": "zip,tar",
  "maxResults": 100
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
    {
      "type": "text",
      "text": "🔍 **Archive Search Results**\n\nPattern: `TODO`\nPath: `./artifacts`\n\n{\"files\":[{\"path\":\"artifacts/logs.zip:logs/app.log\",\"matches\":[{\"line\":42,\"column\":7,\"text\":\"TODO: remove debug\"}]}]}"
    }
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
| **Entry point / registration** | src/index.ts (`server.setRequestHandler(ListToolsRequestSchema)`) |
| **Core implementation** | src/index.ts (`buildUgrepCommand`, archive case in tool handler) |

---

### 🔹 Tool: `basic_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>basic_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs a standard ugrep search with optional filters, context lines, and result limits.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Search pattern or regular expression. |
| `path` | `string` | ❌ | `.` | Directory or file path to search. |
| `caseSensitive` | `boolean` | ❌ | `false` | Case-sensitive search toggle. |
| `recursiveDepth` | `number` | ❌ | — | Maximum recursion depth for directory search. |
| `fileTypes` | `string` | ❌ | — | Comma-separated file types to include. |
| `excludeTypes` | `string` | ❌ | — | Comma-separated file types to exclude. |
| `contextLines` | `number` | ❌ | — | Lines of context around matches. |
| `maxResults` | `number` | ❌ | `100` | Maximum number of results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "function",
  "path": "./src",
  "fileTypes": "js,ts",
  "caseSensitive": false,
  "contextLines": 2,
  "maxResults": 100
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
    {
      "type": "text",
      "text": "🔍 **Basic Search Results**\n\nPattern: `function`\nPath: `./src`\n\n{\"files\":[{\"path\":\"src/index.ts\",\"matches\":[{\"line\":12,\"column\":1,\"text\":\"function start() {\"}]}]}"
    }
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
| **Entry point / registration** | src/index.ts (`server.setRequestHandler(ListToolsRequestSchema)`) |
| **Core implementation** | src/index.ts (`buildUgrepCommand`, `basic_search` handler) |

---

### 🔹 Tool: `boolean_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>boolean_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs a Boolean query search (AND/OR/NOT) with ugrep’s boolean mode.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Boolean query (AND, OR, NOT, parentheses). |
| `path` | `string` | ❌ | `.` | Directory or file path to search. |
| `fileTypes` | `string` | ❌ | — | Comma-separated file types. |
| `maxResults` | `number` | ❌ | `100` | Maximum number of results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "TODO AND urgent -NOT completed",
  "path": "./src",
  "fileTypes": "js,ts",
  "maxResults": 100
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
    {
      "type": "text",
      "text": "🔍 **Boolean Search Results**\n\nQuery: `TODO AND urgent -NOT completed`\nPath: `./src`\n\n{\"files\":[{\"path\":\"src/tasks.md\",\"matches\":[{\"line\":8,\"column\":3,\"text\":\"- TODO urgent: fix parser\"}]}]}"
    }
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

---

### 🔹 Tool: `bulk_replace`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>bulk_replace</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs multiple search-and-replace operations in one request, with optional dry-run and backups.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `replacements` | `array` | ✅ | — | Array of `{ pattern, replacement, description? }` objects. |
| `path` | `string` | ❌ | `.` | Directory or file path to process. |
| `fileTypes` | `string` | ❌ | — | Comma-separated file types. |
| `dryRun` | `boolean` | ❌ | `true` | Preview mode without writing files. |
| `caseSensitive` | `boolean` | ❌ | `false` | Case-sensitive replacements. |
| `backup` | `boolean` | ❌ | `true` | Create backup files before modifications. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "replacements": [
    { "pattern": "var ", "replacement": "const ", "description": "var to const" },
    { "pattern": "==", "replacement": "===", "description": "strict equality" }
  ],
  "path": "./src",
  "fileTypes": "js,ts",
  "dryRun": true,
  "backup": true
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
    {
      "type": "text",
      "text": "✅ Bulk replace completed (dry-run). Files scanned: 3, files changed: 0, replacements planned: 12."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes files and backups when `dryRun` is false |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `check_ugrep_installation`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_ugrep_installation</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Checks whether ugrep is installed and returns installation guidance if missing.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

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
    {
      "type": "text",
      "text": "✅ ugrep is installed and available!"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |

---

### 🔹 Tool: `code_refactor`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>code_refactor</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Refactors code structures (functions, classes, imports, variables) using language-aware patterns, optionally previewing changes.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `structureType` | `string` | ✅ | — | `function`, `class`, `method`, `import`, or `variable`. |
| `oldPattern` | `string` | ✅ | — | Pattern to find (e.g., old name). |
| `newPattern` | `string` | ✅ | — | Replacement pattern. |
| `language` | `string` | ✅ | — | `js`, `ts`, `py`, `java`, `cpp`. |
| `path` | `string` | ❌ | `.` | Directory or file path to refactor. |
| `dryRun` | `boolean` | ❌ | `true` | Preview changes without applying. |
| `backup` | `boolean` | ❌ | `true` | Create backups before modifications. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "structureType": "function",
  "oldPattern": "getUserData",
  "newPattern": "fetchUserData",
  "language": "ts",
  "path": "./src",
  "dryRun": true
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
    {
      "type": "text",
      "text": "✅ Code refactor completed (dry-run). Files scanned: 2, symbols renamed: 4, backups created: 0."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes files and backups when `dryRun` is false |

---

### 🔹 Tool: `code_structure_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>code_structure_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches for code structures (functions, classes, methods, imports, variables) in a specific language and path.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `structureType` | `string` | ✅ | — | `function`, `class`, `method`, `import`, or `variable`. |
| `name` | `string` | ❌ | — | Optional name pattern to search for. |
| `language` | `string` | ✅ | — | `js`, `ts`, `py`, `java`, `cpp`. |
| `path` | `string` | ❌ | `.` | Directory or file path to search. |
| `maxResults` | `number` | ❌ | `100` | Maximum number of results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "structureType": "variable",
  "language": "ts",
  "path": "./src",
  "maxResults": 10
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
    {
      "type": "text",
      "text": "🔍 **Code Structure Search Results**\n\nStructure: variable\nLanguage: ts\n\nMatches:\n- src/config.ts:12 `const MAX_RETRIES = 3`\n- src/config.ts:27 `const DEFAULT_TIMEOUT = 5000`"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Semantic Research |
| **Side effects** *(required)* | None |

---

### 🔹 Tool: `fuzzy_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>fuzzy_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds approximate matches with a configurable edit-distance tolerance using ugrep fuzzy search.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Pattern to search for. |
| `maxErrors` | `number` | ❌ | `2` | Maximum character errors allowed (1–9). |
| `path` | `string` | ❌ | `.` | Directory or file path to search. |
| `fileTypes` | `string` | ❌ | — | Comma-separated file types. |
| `maxResults` | `number` | ❌ | `100` | Maximum number of results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "function",
  "maxErrors": 2,
  "path": "./src",
  "fileTypes": "js,ts"
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
    {
      "type": "text",
      "text": "🔍 **Fuzzy Search Results**\n\nPattern: `function`\nMax Errors: 2\n\n{\"files\":[{\"path\":\"src/utils.ts\",\"matches\":[{\"line\":44,\"column\":1,\"text\":\"functoin normalizePath(path: string)\"}]}]}"
    }
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

---

### 🔹 Tool: `get_search_stats`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_search_stats</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns detailed statistics for a search operation, using the same parameters as basic search.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Search pattern or regular expression. |
| `path` | `string` | ❌ | `.` | Directory or file path to search. |
| `caseSensitive` | `boolean` | ❌ | `false` | Case-sensitive search toggle. |
| `recursiveDepth` | `number` | ❌ | — | Maximum recursion depth. |
| `fileTypes` | `string` | ❌ | — | Comma-separated file types. |
| `excludeTypes` | `string` | ❌ | — | Comma-separated file types to exclude. |
| `contextLines` | `number` | ❌ | — | Lines of context around matches. |
| `maxResults` | `number` | ❌ | `100` | Maximum number of results. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "TODO",
  "path": "./src",
  "maxResults": 100
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
    {
      "type": "text",
      "text": "📊 Search statistics: files=28, matches=7, durationMs=142, maxResults=100"
    }
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

---

### 🔹 Tool: `interactive_search`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>interactive_search</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns instructions to run ugrep’s interactive TUI search in a terminal.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `initialPattern` | `string` | ❌ | — | Initial search pattern for TUI mode. |
| `path` | `string` | ❌ | `.` | Directory to start interactive search in. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "initialPattern": "TODO",
  "path": "./src"
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
    {
      "type": "text",
      "text": "🔍 **Interactive Search Mode**\n\nTo start interactive search, run this command in your terminal: ugrep --interactive --fixed-strings \"TODO\" ./src"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None (provides instructions only) |

---

### 🔹 Tool: `list_file_types`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_file_types</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists file types/extensions supported by ugrep for filtering.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

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
    {
      "type": "text",
      "text": "Supported file types: c, cpp, cs, go, java, js, json, md, py, rs, ts"
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |

---

### 🔹 Tool: `search_and_replace`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_and_replace</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds and replaces text patterns with optional dry-run previews and backup creation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ✅ | — | Search pattern or regex. |
| `replacement` | `string` | ✅ | — | Replacement text (supports capture groups). |
| `path` | `string` | ❌ | `.` | Directory or file path to process. |
| `fileTypes` | `string` | ❌ | — | Comma-separated file types. |
| `caseSensitive` | `boolean` | ❌ | `false` | Case-sensitive matching. |
| `dryRun` | `boolean` | ❌ | `true` | Preview changes without writing. |
| `maxFiles` | `number` | ❌ | `50` | Maximum number of files to process. |
| `backup` | `boolean` | ❌ | `true` | Create backups before modifications. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "oldFunctionName",
  "replacement": "newFunctionName",
  "path": "./src",
  "fileTypes": "js,ts",
  "dryRun": true,
  "backup": true
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
    {
      "type": "text",
      "text": "✅ Search and replace completed (dry-run). Files scanned: 5, matches: 18, replacements planned: 18, backups: enabled."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes files and backups when `dryRun` is false |

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
| None | — | — | — | None documented |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | None documented |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| None | None documented for server runtime |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install ugrep via system package manager. |
| 2 | Install Node.js 18+, then run `npm install` and `npm run build`. |

### 8.2 Typical Run Commands *(optional)*

```bash
node build/index.js
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console output / stderr from Node.js process |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- ugrep is fast, but archive search and large result sets can be slower.
- `maxResults` limits output size and runtime.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 12 |
| **Read-only** | 9 |
| **Write-only** | 0 |
| **Hybrid** | 3 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| None | N/A |

---

<div align="center">

*— End of Report —*

</div>
