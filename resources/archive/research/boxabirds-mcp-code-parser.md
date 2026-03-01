<div align="center">

# 📋 MCP Server Report

## mcp-code-parser
### [boxabirds/mcp-code-parser](https://github.com/boxabirds/mcp-code-parser)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/boxabirds/mcp-code-parser |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | c699aaa17f151c893fff297f9c8c190d1d6f8e01 |
| **Commit URL** *(optional)* | https://github.com/boxabirds/mcp-code-parser/commit/c699aaa17f151c893fff297f9c8c190d1d6f8e01 |
| **License** *(required)* | Apache-2.0 |
| **Version** *(optional)* | 0.1.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository at commit c699aaa17f151c893fff297f9c8c190d1d6f8e01 |
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
| **Path model** *(required)* | Relative to server working directory; absolute paths supported |
| **Line/column indexing** *(required)* | Unknown (no line/column positions returned) |
| **Encoding model** *(optional)* | Mixed: UTF-8 with latin-1/ascii/utf-16 fallback for file reads |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | direct JSON (FastMCP tool result) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

An opinionated MCP server wrapper around tree-sitter that exposes structured AST parsing for AI agents. It provides MCP tools and a Python API to parse source code or files, returning filtered AST text and metadata across multiple languages for use in MCP clients such as Claude Desktop, Cursor, and Windsurf.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, Cursor, Windsurf, OpenAI Desktop (in development) |

### 1.3 Primary Capabilities *(required)*

- [x] Parse source code strings into filtered AST text
- [x] Parse files with optional language detection
- [x] List supported languages
- [x] Check language support and grammar availability

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.10+ environment required; OS compatibility not explicitly stated |
| **Documented integrations** *(optional)* | Claude Desktop, Cursor, Windsurf |
| **Notes / constraints** *(optional)* | Requires tree-sitter language packages (pre-installed via uv) |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python, JavaScript, TypeScript, Go (optional: C++) |
| **How to extend** *(optional)* | Add language config in mcp_code_parser.parsers.languages and grammar package dependency |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | Apache License 2.0 |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | tree-sitter, tree-sitter-python, tree-sitter-javascript, tree-sitter-typescript, tree-sitter-go, mcp, pydantic, click |
| **External / System** *(optional)* | None documented |
| **Optional** *(optional)* | tree-sitter-cpp |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI and optional REST server module) |
| **Env vars used** *(optional)* | Yes (logging) |
| **Config files used** *(optional)* | No |
| **CLI flags used** *(optional)* | Yes |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | tree-sitter |
| **Architecture notes** *(optional)* | FastMCP server calls parse_code/parse_file, which delegate to TreeSitterParser; language configs filter AST nodes |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | No (MCP); separate REST server exists |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (logs; cache directories) |
| **Uses local cache** *(optional)* | Yes (~/.cache/mcp-code-parser/grammars) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | No persistent storage; code read into memory for parsing |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | check_language |
| 2 | list_languages |
| 3 | parse_code |
| 4 | parse_file |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| ParseRequest | JSON object with language and either content or file_path |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| ParseResult | { success: boolean, language: string, ast: string, metadata: object, error: string | null } |
| LanguageList | { languages: string[], count: number } |
| LanguageCheck | { language: string, supported: boolean, grammar_available: boolean, message: string } |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Client-supplied paths; no explicit sanitization beyond file read errors |
| **Rate limits / retries** | None documented |
| **File size limits** | None documented |
| **Resource constraints** | None documented |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | No |
| **Error as `{ error: string }`** | Yes (error field in result payload) |
| **Common error codes** | Language not supported, grammar not installed, file read errors |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: check_language

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_language</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Check if a language is supported and whether its grammar is installed.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| language | string | ✅ | — | Language name to check (e.g., python, javascript) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "string"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "language": "python"
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
  "language": "string",
  "supported": true,
  "grammar_available": true,
  "message": "string"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "language": "python",
  "supported": true,
  "grammar_available": true,
  "message": "Grammar loaded"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Language grammar must be installed for availability check |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | No code content returned |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `mcp_code_parser/server.py` (FastMCP tool registry) |
| **Core implementation** | `mcp_code_parser/parsers/languages.py` (`LanguageDetector`) |

---

### 🔹 Tool: list_languages

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_languages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return the list of supported languages and their grammar availability.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| include_optional | boolean | ❌ | false | Include optional languages like C++ if grammar is installed |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "include_optional": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "include_optional": true
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
  "languages": ["string"],
  "count": 0
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "languages": ["python", "javascript", "typescript", "go"],
  "count": 4
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | None |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | Returns language metadata only |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `mcp_code_parser/server.py` (FastMCP tool registry) |
| **Core implementation** | `mcp_code_parser/parsers/languages.py` (`list_languages`) |

---

### 🔹 Tool: parse_code

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parse source code content and return filtered AST text and metadata.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| language | string | ✅ | — | Language of the source code (e.g., python, javascript) |
| content | string | ✅ | — | Source code to parse |
| max_depth | integer | ❌ | 6 | Maximum AST depth returned |
| include_fields | boolean | ❌ | true | Whether to include field names in AST output |
| line_limit | integer | ❌ | 300 | Maximum AST lines to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "string",
  "content": "string",
  "max_depth": 0,
  "include_fields": true,
  "line_limit": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "language": "python",
  "content": "def add(a, b):\n    return a + b",
  "max_depth": 6,
  "include_fields": true,
  "line_limit": 120
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
  "language": "string",
  "ast": "string",
  "metadata": {
    "node_count": 0,
    "tree_sitter_version": "13",
    "max_depth": 0,
    "line_limit": 0
  },
  "error": null
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "language": "python",
  "ast": "(module (function_definition ...))",
  "metadata": {
    "node_count": 42,
    "tree_sitter_version": "13",
    "max_depth": 6,
    "line_limit": 120
  },
  "error": null
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Grammar for the language must be installed |
| **Postconditions** | None |
| **Limits** | Output limited by max_depth and line_limit |
| **Security & privacy** | Parses in-memory content only |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `mcp_code_parser/server.py` (FastMCP tool registry) |
| **Core implementation** | `mcp_code_parser/parsers/parser.py` (`parse_code`) |

---

### 🔹 Tool: parse_file

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parse a source file from disk, detect language if missing, and return filtered AST output.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| file_path | string | ✅ | — | Path to the source file |
| language | string | ❌ | — | Language override (auto-detect if omitted) |
| max_depth | integer | ❌ | 6 | Maximum AST depth returned |
| include_fields | boolean | ❌ | true | Whether to include field names in AST output |
| line_limit | integer | ❌ | 300 | Maximum AST lines to return |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "file_path": "string",
  "language": "string",
  "max_depth": 0,
  "include_fields": true,
  "line_limit": 0
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "file_path": "src/main.py",
  "language": "python",
  "max_depth": 6,
  "include_fields": true,
  "line_limit": 120
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
  "language": "string",
  "ast": "string",
  "metadata": {
    "node_count": 0,
    "tree_sitter_version": "13",
    "max_depth": 0,
    "line_limit": 0
  },
  "error": null
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "success": true,
  "language": "python",
  "ast": "(module (function_definition ...))",
  "metadata": {
    "node_count": 42,
    "tree_sitter_version": "13",
    "max_depth": 6,
    "line_limit": 120
  },
  "error": null
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist and be readable |
| **Postconditions** | None |
| **Limits** | Output limited by max_depth and line_limit |
| **Security & privacy** | Reads local files; no network calls |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `mcp_code_parser/server.py` (FastMCP tool registry) |
| **Core implementation** | `mcp_code_parser/parsers/parser.py` (`parse_file`) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | REST server (`mcp_code_parser/rest.py`) |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| MCP_CODE_PARSER_LOG_LEVEL | ❌ | — | INFO | Logging level |
| MCP_CODE_PARSER_LOG_FILE | ❌ | — | — | Optional file path for logs |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | — |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| --log-level | Set log level |
| --log-file | Write logs to file |
| --max-depth | Override max AST depth |
| --line-limit | Override max AST line limit |
| --include-fields | Include field names in AST output |
| --rest | Start REST server in addition to MCP |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install dependencies with uv: uv sync |
| 2 | Optional C++ support: uv sync --extra cpp |

### 8.2 Typical Run Commands *(optional)*

```bash
# Start MCP server (stdio)
uv run mcp-code-parser serve

# Parse a file via CLI
uv run mcp-code-parser parse path/to/file.py
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Python logging to stderr and optional file in logs/ directory |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- AST formatting is proportional to AST size and file complexity
- Language grammars must be installed; missing packages cause parse errors

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 4 |
| **Read-only** | 4 |
| **Write-only** | 0 |
| **Hybrid** | 0 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| MCP output envelope | FastMCP response envelope not explicitly documented in repo |
| REST server integration | README mentions --rest flag, but CLI wiring not found in code |

---

<div align="center">

*— End of Report —*

</div><div align="center">

# 📋 MCP Server Report

 </div>
### boxabirds/mcp-code-parser
