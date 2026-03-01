<div align="center">

# 📋 MCP Server Report

## `ast-grep-mcp`
### [`ast-grep/ast-grep-mcp`](https://github.com/ast-grep/ast-grep-mcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/ast-grep/ast-grep-mcp` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `674272f1adb56fd1fe48a546952c7ffbe72c09e6` |
| **Commit URL** | `https://github.com/ast-grep/ast-grep-mcp/commit/674272f1adb56fd1fe48a546952c7ffbe72c09e6` |
| **License** | `MIT` |
| **Version** | `Unknown` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Repo: ast-grep-mcp MCP server (full repository) |
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
| **Path model** | `absolute` (project_folder appears to be an absolute path) |
| **Line/column indexing** | `0-based` (tool output examples use line 0, column 0) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` (tool outputs are JSON values) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes ast-grep’s structural (AST-based) code search and rule-debugging capabilities to MCP clients.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | `Cursor`, `Claude Desktop` (via README) |

### 1.3 Primary Capabilities

- [x] Structural search via AST patterns
- [x] Rule testing/debugging and syntax tree dumping
- [x] Project-wide search with YAML rules

### 1.4 Non-Goals / Exclusions

- None documented in the repository.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any platform that can run Python and the `ast-grep` CLI; supports MCP `stdio` and `sse` transports. |
| **Documented integrations** | Cursor, Claude Desktop |
| **Notes / constraints** | Requires `ast-grep` binary on PATH. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Languages supported by ast-grep (tree-sitter based); built-ins include bash, c/cpp, csharp, css, elixir, go, haskell, html, java, javascript, json, jsx, kotlin, lua, nix, php, python, ruby, rust, scala, solidity, swift, tsx, typescript, yaml; custom via sgconfig.yaml |
| **How to extend** | Add custom languages via `sgconfig.yaml`. |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python, `mcp[cli]` (FastMCP), `pydantic`, `pyyaml` |
| **External / System** | `ast-grep` CLI on PATH |
| **Optional** | `uv` (documented for setup) |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `No` |
| **Config files used** | `Yes` (`sgconfig.yaml`) |
| **CLI flags used** | `Yes` (e.g., `--transport sse --port`) |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | `tree-sitter` via `ast-grep` |
| **Architecture notes** | Uses MCP FastMCP server; invokes ast-grep CLI via subprocess. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `No` |
| `sse` | `Yes` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `None` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `No` |
| **Uses local cache** | `No` |
| **Uses external DB** | `No` |
| **Retains user code** | `No` (processes content via CLI) |

---

## 🗂️ § 3 — Tool Index

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `dump_syntax_tree` |
| 2 | `find_code` |
| 3 | `find_code_by_rule` |
| 4 | `test_match_code_rule` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `AstGrepPatternQuery` | `{ code: string, language: string, format: "pattern" \| "cst" \| "ast" }` |
| `AstGrepProjectPatternQuery` | `{ project_folder: string, pattern: string, language?: string, max_results?: number, output_format?: "text" \| "json" }` |
| `AstGrepProjectRuleQuery` | `{ project_folder: string, yaml: string, max_results?: number, output_format?: "text" \| "json" }` |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `AstGrepRange` | `{ start: { line: number, column: number }, end: { line: number, column: number } }` (0-based) |
| `AstGrepMatch` | `{ text: string, range: AstGrepRange, file: string, metaVariables?: Record<string, { text: string, range?: AstGrepRange }> }` |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `project_folder` expects a path to a local folder (absolute). |
| **Rate limits / retries** | `Unknown` |
| **File size limits** | `Unknown` |
| **Resource constraints** | `Unknown` |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Yes` (documented behavior: tool raises an error with guidance like “Try adding stopBy: end…”) |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Unknown` |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `dump_syntax_tree`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>dump_syntax_tree</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Dumps ast-grep debug output describing the code’s syntax tree (CST/AST) or pattern interpretation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to analyze. |
| `language` | `string` | ✅ | — | Language identifier (e.g., `javascript`). |
| `format` | `string` | ✅ | — | One of `pattern`, `cst`, `ast`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "const x = 1",
  "language": "javascript",
  "format": "cst"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "code": "const x = 1",
  "language": "javascript",
  "format": "cst"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
"ROOT@0..11\n  program@0..11\n    expression_statement@0..11\n      assignment_expression@0..11\n        identifier@0..1\n        number@4..5"
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
"ROOT@0..11\n  program@0..11\n    expression_statement@0..11\n      assignment_expression@0..11\n        identifier@0..1\n        number@4..5"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `ast-grep` CLI available on PATH. |
| **Postconditions** | Returns ast-grep debug-query output captured from stderr (trimmed). |
| **Limits** | `format` must be one of `pattern`, `cst`, `ast`. |
| **Security & privacy** | Processes code locally via subprocess. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `main.py` (console script `ast-grep-server = main:run_mcp_server`) |
| **Core implementation** | Invokes `ast-grep run --pattern <code> --lang <language> --debug-query=<format>` and returns stderr. |

---

### 🔹 Tool: `test_match_code_rule`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>test_match_code_rule</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Tests an ast-grep YAML rule against a code snippet and returns JSON match objects.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to test. |
| `yaml` | `string` | ✅ | — | ast-grep rule in YAML format. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "def foo():\n    pass\n",
  "yaml": "id: test\nlanguage: python\nrule:\n  pattern: 'def $NAME(): $$$'\n"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "code": "def foo():\n    pass\n",
  "yaml": "id: test\nlanguage: python\nrule:\n  pattern: 'def $NAME(): $$$'\n"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (array) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  {
    "text": "def foo():\n    pass",
    "range": {"start": {"line": 0, "column": 0}, "end": {"line": 1, "column": 8}},
    "file": "<stdin>",
    "metaVariables": {"$NAME": {"text": "foo"}}
  }
]
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
[
  {
    "text": "def foo():\n    pass",
    "range": {"start": {"line": 0, "column": 0}, "end": {"line": 1, "column": 8}},
    "file": "<stdin>",
    "metaVariables": {"$NAME": {"text": "foo"}}
  }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `ast-grep` CLI available on PATH. |
| **Postconditions** | Returns JSON matches from ast-grep; if no matches, raises an error suggesting `stopBy: end`. |
| **Limits** | `Unknown` |
| **Security & privacy** | Processes code locally via subprocess. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `main.py` (console script `ast-grep-server = main:run_mcp_server`) |
| **Core implementation** | Invokes `ast-grep scan --inline-rules <yaml> --json --stdin`. |

---

### 🔹 Tool: `find_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches a project directory for matches to a single ast-grep pattern.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_folder` | `string` | ✅ | — | Path to project root. |
| `pattern` | `string` | ✅ | — | ast-grep pattern. |
| `language` | `string` | ❌ | — | Language identifier; if omitted, ast-grep infers. |
| `max_results` | `number` | ❌ | `0` | Result cap; `0` means unlimited. |
| `output_format` | `string` | ❌ | `text` | `text` or `json`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project_folder": "C:/path/to/repo",
  "pattern": "def $NAME($$$)",
  "language": "python",
  "max_results": 20,
  "output_format": "text"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "project_folder": "C:/path/to/repo",
  "pattern": "def $NAME($$$)",
  "language": "python",
  "max_results": 20,
  "output_format": "text"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (string or array) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
"Found 1 match:\n\nsrc/example.py:10-12\nmatch: def foo(bar):"
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
"Found 1 match:\n\nsrc/example.py:10-12\nmatch: def foo(bar):"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `ast-grep` CLI available on PATH. |
| **Postconditions** | Collects JSON matches internally; renders text output when `output_format=text`. |
| **Limits** | `max_results=0` means unlimited; when limiting, header reflects shown vs total. |
| **Security & privacy** | Reads local files in `project_folder`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `main.py` (console script `ast-grep-server = main:run_mcp_server`) |
| **Core implementation** | Invokes `ast-grep run --pattern <pattern> [--lang <language>] --json <project_folder>`. |

---

### 🔹 Tool: `find_code_by_rule`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_code_by_rule</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Searches a project directory using a full ast-grep YAML rule.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_folder` | `string` | ✅ | — | Path to project root. |
| `yaml` | `string` | ✅ | — | ast-grep rule in YAML. |
| `max_results` | `number` | ❌ | `0` | Result cap; `0` means unlimited. |
| `output_format` | `string` | ❌ | `json` | `text` or `json`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "project_folder": "C:/path/to/repo",
  "yaml": "id: async-with-await\nlanguage: javascript\nrule:\n  all:\n    - kind: function_declaration\n    - has: { pattern: async }\n    - has: { pattern: await $EXPR, stopBy: end }\n",
  "max_results": 50,
  "output_format": "json"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "project_folder": "C:/path/to/repo",
  "yaml": "id: async-with-await\nlanguage: javascript\nrule:\n  all:\n    - kind: function_declaration\n    - has: { pattern: async }\n    - has: { pattern: await $EXPR, stopBy: end }\n",
  "max_results": 50,
  "output_format": "json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (array or string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
[
  {
    "text": "async function demo() { await foo(); }",
    "range": {"start": {"line": 0, "column": 0}, "end": {"line": 0, "column": 10}},
    "file": "path/to/file"
  }
]
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
[
  {
    "text": "async function demo() { await foo(); }",
    "range": {"start": {"line": 0, "column": 0}, "end": {"line": 0, "column": 10}},
    "file": "path/to/file"
  }
]
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | `None` |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `ast-grep` CLI available on PATH. |
| **Postconditions** | Collects JSON matches internally; renders text output when `output_format=text`. |
| **Limits** | `max_results=0` means unlimited; relational rules may require `stopBy: end`. |
| **Security & privacy** | Reads local files in `project_folder`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `main.py` (console script `ast-grep-server = main:run_mcp_server`) |
| **Core implementation** | Invokes `ast-grep scan --inline-rules <yaml> --json <project_folder>`. |

---


## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `None` |
| **MCP prompts exposed** | `None` |
| **Other RPC endpoints** | `None` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `None` | — | — | — | No environment variables documented. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `sgconfig.yaml` | Custom languages/config for ast-grep (no example documented). |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `--transport` | Select `stdio` or `sse`. |
| `--port` | Port for `sse` transport. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install `ast-grep` CLI and add to PATH. |
| 2 | Install Python deps (`mcp[cli]`, `pydantic`, `pyyaml`). |

### 8.2 Typical Run Commands

```bash
# stdio (default)
ast-grep-server

# sse
ast-grep-server --transport sse --port <port>
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `None` |
| **Tracing / Metrics** | `None` |

### 8.4 Performance Considerations

- None documented.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `4` |
| **Read-only** | `4` |
| **Write-only** | `0` |
| **Hybrid** | `0` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Commit URL | https://github.com/ast-grep/ast-grep-mcp/commit/674272f1adb56fd1fe48a546952c7ffbe72c09e6 |
| Line/column indexing details beyond examples | Only 0-based indexing is shown in examples; other conventions not explicitly documented. |

---

<div align="center">

*— End of Report —*

</div>
