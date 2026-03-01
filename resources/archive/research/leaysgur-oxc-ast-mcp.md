<div align="center">

# 📋 MCP Server Report

## OXC AST MCP Server
### [leaysgur/oxc-ast-mcp](https://github.com/leaysgur/oxc-ast-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/leaysgur/oxc-ast-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 354dd50b4715b4fb0bc432f0684fd6cc89c55d88 |
| **Commit URL** *(optional)* | https://github.com/leaysgur/oxc-ast-mcp/commit/354dd50b4715b4fb0bc432f0684fd6cc89c55d88 |
| **License** *(required)* | Unknown |
| **Version** *(optional)* | 0.2.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository at commit 354dd50b4715b4fb0bc432f0684fd6cc89c55d88 |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — line/column indexing and encoding model are not explicitly documented |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Not applicable (no file path inputs; code is provided as strings) |
| **Line/column indexing** *(required)* | Unknown (OXC diagnostics format not documented here) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Unofficial MCP server that exposes the OXC JavaScript/TypeScript parser and semantic checker. It lets MCP clients parse code into OXC ASTs, retrieve AST node documentation, and check code for syntactic or semantic diagnostics to support tooling and agent workflows around OXC.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | MCP clients via `.mcp.json` configuration (example provided) |

### 1.3 Primary Capabilities *(required)*

- [x] Parse JS/TS code into OXC AST
- [x] Query OXC AST node documentation with regex filtering
- [x] Check code for syntactic and semantic diagnostics

### 1.4 Non-Goals / Exclusions *(optional)*

- None documented.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Rust MCP server using stdio transport; runs as a local process started by an MCP client. |
| **Documented integrations** *(optional)* | `.mcp.json` example for MCP clients |
| **Notes / constraints** *(optional)* | Requires Rust toolchain to build; optional Node.js for generating AST docs. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | JavaScript, TypeScript, JSX, TSX (extensions: `js`, `mjs`, `cjs`, `jsx`, `ts`, `mts`, `cts`, `tsx`) |
| **How to extend** *(optional)* | Determined by OXC parser support; no extension mechanism documented. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Unknown |
| **License details** *(optional)* | No LICENSE file or license field found in metadata. |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Rust (server), Node.js (build-time AST doc generator) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | rust-mcp-sdk, tokio, serde, serde_json, async-trait, oxc_allocator, oxc_parser, oxc_semantic, oxc_span, regex |
| **External / System** *(optional)* | Rust toolchain |
| **Optional** *(optional)* | Node.js (for generating `ast-nodes.generated.json`), nightly Rust toolchain for rustdoc JSON |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes |
| **Env vars used** *(optional)* | No |
| **Config files used** *(optional)* | No |
| **CLI flags used** *(optional)* | No |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | OXC parser + OXC semantic analyzer |
| **Architecture notes** *(optional)* | - rust-mcp-sdk server over stdio
- `tool_box!` dispatch to three tools (`parse`, `docs`, `check`)
- AST docs loaded from embedded JSON |

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
| **Retains user code** *(required)* | No (code is processed in-memory only) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `check` |
| 2 | `docs` |
| 3 | `parse` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CodeInput` | Shared input pattern with `code` (string) and `ext` (string) for parsing/checking tools. |
| `ParseOptions` | Optional parser flags: `parse_regular_expression`, `allow_return_outside_function`, `preserve_parens`, `allow_v8_intrinsics`. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TextResult` | MCP `CallToolResult` containing `content[]` with text payloads. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Not applicable (no file paths accepted) |
| **Rate limits / retries** | None documented |
| **File size limits** | None documented |
| **Resource constraints** | None documented |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes |
| **Error as text** | Yes (string message from `CallToolError`) |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Invalid extension, regex parse error, parse errors, no docs match |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `check`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Validates JS/TS code using OXC, returning syntactic diagnostics and (optionally) semantic diagnostics. Parser options can be toggled via optional flags.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to check. |
| `ext` | `string` | ✅ | — | File extension: `js`, `mjs`, `cjs`, `jsx`, `ts`, `mts`, `cts`, `tsx`. |
| `check_semantic` | `boolean` | ❌ | `true` | Whether to run semantic checks. |
| `parse_regular_expression` | `boolean` | ❌ | `true` | Whether to parse regular expressions. |
| `allow_return_outside_function` | `boolean` | ❌ | `false` | Allow `return` outside of functions. |
| `preserve_parens` | `boolean` | ❌ | `true` | Emit parenthesized nodes in the AST. |
| `allow_v8_intrinsics` | `boolean` | ❌ | `false` | Allow V8 intrinsics in the AST. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "const x = 1",
  "ext": "ts",
  "check_semantic": true,
  "parse_regular_expression": true,
  "allow_return_outside_function": false,
  "preserve_parens": true,
  "allow_v8_intrinsics": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "code": "const x = 1",
  "ext": "ts"
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
"# Syntactic errors\nNo syntactic errors found.\n\n# Semantic errors\nNo semantic errors found."
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
"# Syntactic errors\nNo syntactic errors found.\n\n# Semantic errors\nNo semantic errors found."
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
| **Preconditions** | Valid `ext` and parsable `code`. |
| **Postconditions** | None; returns diagnostics text. |
| **Limits** | None documented. |
| **Security & privacy** | Processes in-memory code only; no filesystem or network access. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `MyTools` dispatch via `tool_box!` |
| **Core implementation** | `CheckTool::call()` |

---

### 🔹 Tool: `docs`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>docs</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns documentation for OXC AST nodes. If a regex is provided, it filters nodes by name and falls back to docs text if no name matches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ❌ | — | Regex string to filter AST nodes (optional). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "query": "JSX.*"
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "query": "JSX.*"
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
"```rs\n// JSXElement is ...\npub struct JSXElement { ... }\n```"
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
"```rs\n// JSXElement is ...\npub struct JSXElement { ... }\n```"
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
| **Preconditions** | If `query` is provided, it must be a valid regex. |
| **Postconditions** | None; returns formatted docs text. |
| **Limits** | None documented (returns all nodes when `query` is omitted). |
| **Security & privacy** | No filesystem or network access; reads embedded JSON. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `MyTools` dispatch via `tool_box!` |
| **Core implementation** | `DocsTool::call()` |

---

### 🔹 Tool: `parse`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses JS/TS code with OXC and returns the formatted AST. Optional parser flags control parsing behaviors such as regex handling and parenthesis preservation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Source code to parse. |
| `ext` | `string` | ✅ | — | File extension: `js`, `mjs`, `cjs`, `jsx`, `ts`, `mts`, `cts`, `tsx`. |
| `parse_regular_expression` | `boolean` | ❌ | `true` | Whether to parse regular expressions. |
| `allow_return_outside_function` | `boolean` | ❌ | `false` | Allow `return` outside of functions. |
| `preserve_parens` | `boolean` | ❌ | `true` | Emit parenthesized nodes in the AST. |
| `allow_v8_intrinsics` | `boolean` | ❌ | `false` | Allow V8 intrinsics in the AST. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "const x = 1",
  "ext": "js",
  "parse_regular_expression": true,
  "allow_return_outside_function": false,
  "preserve_parens": true,
  "allow_v8_intrinsics": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "code": "const x = 1",
  "ext": "js"
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
"Program { body: [ ... ] }"
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
"Program { body: [ ... ] }"
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
| **Preconditions** | Valid `ext` and parsable `code`. |
| **Postconditions** | None; returns AST text. |
| **Limits** | Parse fails with errors; use `check` for diagnostics. |
| **Security & privacy** | Processes in-memory code only; no filesystem or network access. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `MyTools` dispatch via `tool_box!` |
| **Core implementation** | `ParseTool::call()` |

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
| None | — | — | — | No environment variables documented. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | No config files documented. |

<details>
<summary><strong>Example Config</strong></summary>

```json
{}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| None | No CLI flags documented. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Generate AST docs: `node generate-oxc_ast-nodes.mjs > ast-nodes.generated.json` |
| 2 | Build: `cargo build --release` |

### 8.2 Typical Run Commands *(optional)*

```bash
./target/release/oxc-ast-mcp
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | None documented. |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- Parsing large files produces large AST output.
- Semantic checks add additional analysis cost.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 3 |
| **Read-only** | 3 |
| **Write-only** | 0 |
| **Hybrid** | 0 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| License details | No LICENSE file or license metadata found. |
| Line/column indexing | OXC diagnostics format not explicitly documented in repo. |

---

<div align="center">

*— End of Report —*

</div>
