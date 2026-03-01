<div align="center">

# 📋 MCP Server Report

## code-to-tree
### [micl2e2/code-to-tree](https://github.com/micl2e2/code-to-tree)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/micl2e2/code-to-tree |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 700a234b7ff4ceeb2a8ae8d9980b0bbaf3aaef6d |
| **Commit URL** *(optional)* | https://github.com/micl2e2/code-to-tree/commit/700a234b7ff4ceeb2a8ae8d9980b0bbaf3aaef6d |
| **License** *(required)* | MIT License |
| **Version** *(optional)* | N/A |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (code-to-tree binary MCP server) |
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
| **Path model** *(required)* | Not applicable (no file paths in tool inputs/outputs) |
| **Line/column indexing** *(required)* | Not applicable |
| **Encoding model** *(optional)* | UTF-8 bytes (tree-sitter input) |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

code-to-tree is a standalone MCP server binary that converts source code into an Abstract Syntax Tree (AST) rendered as an S-expression. It embeds tree-sitter language parsers so MCP clients can request AST output for multiple languages without installing separate tools or dependencies.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop |

### 1.3 Primary Capabilities *(required)*

- [x] Parse source code into tree-sitter ASTs
- [x] Return AST output as S-expressions
- [x] Support multiple languages in a single standalone MCP server binary

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Standalone binary for Windows and macOS; run as a local MCP server. |
| **Documented integrations** *(optional)* | Claude Desktop |
| **Notes / constraints** *(optional)* | Requires prebuilt tree-sitter and language grammar libraries when compiling from source. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | C, C++, Rust, Ruby, Go, Java, Python |
| **How to extend** *(optional)* | Add additional tree-sitter language libraries and update the language detection list. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | C |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | mcpc, tree-sitter runtime |
| **External / System** *(optional)* | tree-sitter language grammar libraries (C, C++, Rust, Ruby, Go, Java, Python) |
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
| **CLI flags used** *(optional)* | Yes (input source selection) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | tree-sitter, mcpc |
| **Architecture notes** *(optional)* | - mcpc-based MCP server over stdio
- Tool callback parses source text with tree-sitter and emits AST S-expression
- Language selection handled via string mapping to tree-sitter language constructors |

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
| **Writes local files** *(required)* | No |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | No (processes code in memory and returns AST text) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `code-to-tree` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `LangString` | Language identifier string (e.g., `c`, `cpp`, `python`, `java`). |
| `SourceCode` | UTF-8 source code text to parse. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `AstSExpression` | AST rendered as a single S-expression text string. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Not applicable |
| **Rate limits / retries** | None documented |
| **File size limits** | Not documented; input is in-memory text buffers |
| **Resource constraints** | None documented |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (error message text added to response) |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Language not supported; parser or memory failure |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `code-to-tree`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>code-to-tree</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses provided source code with a tree-sitter language grammar and returns an AST serialized as an S-expression. The tool supports multiple languages such as C, C++, Rust, Ruby, Go, Java, and Python.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `lang` | `string` | ✅ | — | Language identifier string (e.g., `c`, `cpp`, `rust`, `python`, `java`, `ruby`, `go`). |
| `code` | `string` | ✅ | — | Source code to parse. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "lang": "python",
  "code": "def hello():\n    return 1"
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
      "text": "Abstract Syntax Tree(AST) for the source code as a S-expression: (module (function_definition name: (identifier) parameters: (parameters) body: (block (return_statement (integer)))))"
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
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `lang` must be one of the supported language aliases. |
| **Postconditions** | Returns S-expression AST text or an error message if unsupported. |
| **Limits** | Large ASTs may be truncated by internal buffer growth behavior. |
| **Security & privacy** | Processes code in memory; no filesystem or network access. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | code-to-tree.c (`new_tool_calc`) |
| **Core implementation** | code-to-tree.c (`cb_calc`, `doit`, `print_node_sexp`) |

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
| `-i -` | Read MCP input from stdin (default usage when launched by MCP client). |
| `-i <path>` | Read MCP input from a file path (diagnostic/testing). |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Download prebuilt binary from GitHub releases. |
| 2 | Or build from source with tree-sitter and mcpc installed. |

### 8.2 Typical Run Commands *(optional)*

```bash
code-to-tree
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | None documented |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- AST size grows quickly for large files; outputs can be large.
- Parsing cost scales with input size and grammar complexity.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 1 |
| **Read-only** | 1 |
| **Write-only** | 0 |
| **Hybrid** | 0 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| None documented | — |

---

<div align="center">

*— End of Report —*

</div>
