<div align="center">

	"description": "A human-readable report. If none: 'No code actions available for <relativePath>:<start>-<end>'. Otherwise: 'Code actions for src/cli/index.ts:12-18' and grouped sections like '=== Quick Fix ===' followed by action titles and metadata."

## `lsmcp`
### [`mizchi/lsmcp`](https://github.com/mizchi/lsmcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/mizchi/lsmcp` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `f2fb91d205c19ffff3be1d6f98bdc130b6e8868f` |
| **Commit URL** | `https://github.com/mizchi/lsmcp/commit/f2fb91d205c19ffff3be1d6f98bdc130b6e8868f` |
| **License** | `MIT` |
| **Version** | `v0.8.1` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | lsmcp MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` — line/column conventions are mixed (see below) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `mixed` — most tools take an absolute `root` plus paths `relative` to `root` (e.g., `relativePath`, `filePath`) |
| **Line/column indexing** | `mixed` — numeric line inputs are typically `1-based`; column/character inputs are typically `0-based`; some reports emit `1-based` character positions |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `mixed` (plain text, Markdown, and JSON-encoded strings depending on tool) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes LSP operations and additional symbol/index utilities.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Claude MCP client examples |

### 1.3 Primary Capabilities

- [ ] LSP hover/refs/definitions/completions
- [ ] Workspace symbol search & edits
- [ ] Memory & onboarding utilities

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can run stdio MCP servers (npx). |
| **Documented integrations** | Claude MCP client |
| **Notes / constraints** | Requires LSP servers installed. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | LSP-based; presets include TS/JS, Python, Rust, Go, F#, Haskell, OCaml, MoonBit |
| **How to extend** | Configure LSP servers/presets |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MIT |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | TypeScript |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Node.js >= 22, MCP SDK, Zod |
| **External / System** | LSP servers (per preset) |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Unknown` |
| **Config files used** | `Yes` (see § 7) |
| **CLI flags used** | `Yes` (npx options) |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | LSP + internal symbol index |
| **Architecture notes** | `Unknown` |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `No` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `None` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (editing tools, plus `.lsmcp/memories/*.md`) |
| **Uses local cache** | `Unknown` (internal symbol index exists; persistence/location not documented in the source report) |
| **Uses external DB** | `No` |
| **Retains user code** | `Unknown` (memory files are stored under `.lsmcp/memories`; other persistence not documented) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `delete_memory` |
| 2 | `get_available_external_symbols` |
| 3 | `get_compression_guidance` |
| 4 | `get_project_overview` |
| 5 | `get_symbol_details` |
| 6 | `get_symbol_search_guidance` |
| 7 | `get_symbols_overview` |
| 8 | `get_typescript_dependencies` |
| 9 | `index_external_libraries` |
| 10 | `index_onboarding` |
| 11 | `list_dir` |
| 12 | `list_memories` |
| 13 | `lsp_check_capabilities` |
| 14 | `lsp_delete_symbol` |
| 15 | `lsp_find_references` |
| 16 | `lsp_format_document` |
| 17 | `lsp_get_code_actions` |
| 18 | `lsp_get_completion` |
| 19 | `lsp_get_definitions` |
| 20 | `lsp_get_diagnostics` |
| 21 | `lsp_get_document_symbols` |
| 22 | `lsp_get_hover` |
| 23 | `lsp_get_signature_help` |
| 24 | `lsp_get_workspace_symbols` |
| 25 | `lsp_rename_symbol` |
| 26 | `parse_imports` |
| 27 | `read_memory` |
| 28 | `replace_range` |
| 29 | `replace_regex` |
| 30 | `resolve_symbol` |
| 31 | `search_external_library_symbols` |
| 32 | `search_symbols` |
| 33 | `write_memory` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `delete_memory`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>delete_memory</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Delete a named memory from the project’s <code>.lsmcp/memories</code> store.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `memoryName` | `string` | ✅ | — | Memory name (without `.md`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
	"result": "# Symbol Index Onboarding\n\n1) Create .lsmcp/config.json with a `files` glob (e.g., `src/**/*.ts`).\n2) Run `get_project_overview` to build the index.\n3) Use `search_symbols` and `get_symbol_details` to navigate results."
	"memoryName": "onboarding"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{}
```
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Deletes `<root>/.lsmcp/memories/<memoryName>.md`. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Limits** | Not documented. |
| **Security & privacy** | Operates on a project-local memory store under `<root>/.lsmcp/memories`. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `get_available_external_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_available_external_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List external-library symbols available in a given file due to its import statements (including local aliases).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `filePath` | `string` | ✅ | — | File path to analyze, relative to `root`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
	"filePath": "src/services/search/types.ts"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"file\": \"src/services/search/types.ts\",\n  \"totalSymbols\": 2,\n  \"symbols\": [\n    {\n      \"localName\": \"Result\",\n      \"importedName\": \"Result\",\n      \"sourceModule\": \"neverthrow\",\n      \"resolvedPath\": \"C:/projects/lsmcp/node_modules/neverthrow/dist/index.d.ts\"\n    }\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (returns data as a JSON string). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Security & privacy** | Reads import statements and best-effort module resolution information. |

---

### 🔹 Tool: `get_compression_guidance`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_compression_guidance</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return a pre-written prompt with token compression analysis and strategy guidance.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | Input is an empty JSON object. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "To analyze token compression effectiveness:\n\n1. Use measure_compression to check compression ratios:\n   - Provide file paths to analyze\n   - The tool shows original vs compressed token counts\n   - Typical compression ratios are 90-98%\n\n2. Compression is most effective for:\n   - Large source files with many symbols\n   - Files with detailed implementations\n   - Complex class hierarchies\n\n3. The compressed format includes:\n   - Symbol names and kinds\n   - Hierarchical structure\n   - Basic location information\n   - No implementation details\n\n4. Use cases for compression:\n   - Providing context to AI models\n   - Quick codebase overview\n   - Navigation and search\n   - Understanding code structure without details"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `get_project_overview`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_project_overview</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get a quick overview of project structure, key components, and statistics. Automatically creates a symbol index if needed and performs incremental updates on subsequent runs.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ❌ | `process.cwd()` | Root directory for the project. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

````json
{
	"result": "# Token Compression Guidance\n\nPrioritize public APIs, tool names, and parameters. Remove duplicate snippets, collapse large blocks into short bullet summaries, and keep filenames + line ranges for traceability. Preserve error messages and configuration keys verbatim."
}
```
````
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | May create/update an internal symbol index (does not modify user source files). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `get_symbol_details`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbol_details</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get a Markdown report about a symbol including type information (hover), definition, and references. Intended to be used after locating a symbol.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ❌ | `process.cwd()` | Root directory for the project. |
| `relativePath` | `string` | ✅ | — | File path containing the symbol (relative to `root`). |
| `line` | `number|string` | ✅ | — | 1-based line number (or a match string used to locate the line). |
| `symbol` | `string` | ✅ | — | Symbol name to get details for. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"relativePath": "src/services/graph/index.ts",
	"line": 42,
	"symbol": "createGraph"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

````json
{
	"result": "## Symbol Details: createGraph\n\n**Location:** src/services/graph/index.ts:42:17\n\n### Type Information\n```typescript\nfunction createGraph(options: GraphOptions): Graph\n```\n\n### Definition\n**File:** src/services/graph/index.ts:12:0\n```typescript\nexport function createGraph(options: GraphOptions) {\n  return new Graph(options);\n}\n```\n\n### References (3)\n- **src/extension.ts:88** - `createGraph({ directed: true })`\n- **src/gui/graph.ts:21** - `const g = createGraph(opts)`\n\n### Next Steps\n- Use `lsp_get_definitions` with `includeBody: true` to see full implementation\n- Use `lsp_find_references` to see all usages in detail\n- Use `lsp_rename_symbol` to rename this symbol across the codebase\n"
}
````
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Requires an LSP client available in context for hover/definition/references. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads code to compute hover/definition/references; returns Markdown. |

---

### 🔹 Tool: `get_symbol_search_guidance`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbol_search_guidance</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return a pre-written prompt with guidance on how to use symbol search tools and interpret results.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | Input is an empty JSON object. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "# Symbol Search Guidance\n\nTips:\n- Start with exact symbol names, then broaden with partial matches.\n- Use `kind` filters (Class, Function, Interface) to narrow results.\n- If results are empty, confirm `files` globs or preset configuration.\n- Use `get_symbol_details` after finding a target to inspect definitions and references."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `get_symbols_overview`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_symbols_overview</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get an overview of a file or directory by listing top-level symbols per file and returning a JSON mapping from relative path to symbol summaries.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relativePath` | `string` | ✅ | — | Relative path (from `process.cwd()`) to a file or directory to analyze. |
| `maxAnswerChars` | `number` | ❌ | `200000` | Maximum output length in characters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"relativePath": "src/services/graph",
	"maxAnswerChars": 200000
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"src/services/graph/index.ts\": [\n    { \"name_path\": \"createGraph\", \"kind\": \"function\" },\n    { \"name_path\": \"Graph/initialize\", \"kind\": \"method\" }\n  ],\n  \"src/services/graph/config.ts\": [\n    { \"name_path\": \"GraphConfig\", \"kind\": \"interface\" }\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | May update an internal index; returns `JSON.stringify(result)` output. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Limits** | Returns an error JSON string when output exceeds `maxAnswerChars`. |

---

### 🔹 Tool: `get_typescript_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_typescript_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List dependencies that provide TypeScript declarations and are candidates for external symbol indexing.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"totalDependencies\": 3,\n  \"dependencies\": [\n    \"@types/node\",\n    \"neverthrow\",\n    \"zod\"\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (returns data as a JSON string). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `index_external_libraries`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>index_external_libraries</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Index TypeScript declaration files (typically <code>node_modules/**/*.d.ts</code>) so external library symbols can be searched quickly (used by <code>search_external_library_symbols</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `maxFiles` | `number` | ❌ | — | Upper bound of `.d.ts` files to index (implementation-defined; docs mention 5000). |
| `includePatterns` | `string[]` | ❌ | — | Glob patterns to include. |
| `excludePatterns` | `string[]` | ❌ | — | Glob patterns to exclude. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"maxFiles": 5000,
	"includePatterns": ["node_modules/**/*.d.ts"],
	"excludePatterns": ["**/node_modules/**/test/**"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"librariesIndexed\": 12,\n  \"filesIndexed\": 1840,\n  \"totalSymbols\": 53210,\n  \"indexingTime\": \"912ms\",\n  \"libraries\": [\n    {\n      \"name\": \"@types/node\",\n      \"version\": \"22.15.0\",\n      \"filesCount\": 413\n    }\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Builds/updates an external-symbol index (does not modify user source files). |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Requires TypeScript language features enabled in the server config and an initialized LSP/index state (otherwise errors with “LSP client not initialized…”). |
| **Limits** | May be limited by `maxFiles` and include/exclude patterns. |

---

### 🔹 Tool: `index_onboarding`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>index_onboarding</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Return onboarding instructions for setting up and using lsmcp’s symbol index in a project.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "# Symbol Index Onboarding\n\n1) Create .lsmcp/config.json with a `files` glob (e.g., `src/**/*.ts`).\n2) Run `get_project_overview` to build the index.\n3) Use `search_symbols` and `get_symbol_details` to navigate results."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `list_dir`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_dir</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List non-gitignored files and directories in a directory (optionally recursive) using gitignore-aware globbing.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relativePath` | `string` | ✅ | — | Relative path to the directory to list (`"."` to scan project root). |
| `recursive` | `boolean` | ❌ | `false` | Whether to scan subdirectories recursively. |
| `maxAnswerChars` | `number` | ❌ | `200000` | Max output size; if exceeded returns an error JSON string. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"relativePath": ".",
	"recursive": false,
	"maxAnswerChars": 200000
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"directories\": [\n    \"src\",\n    \"scripts\",\n    \"reports\"\n  ],\n  \"files\": [\n    \"package.json\",\n    \"pnpm-lock.yaml\"\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (returns `JSON.stringify(result)` output). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Limits** | Returns `{ "error": "Output exceeds maxAnswerChars (200000)" }` as JSON string if output exceeds `maxAnswerChars`. |
| **Security & privacy** | Uses gitignore-aware listing and skips common ignored directories. |

---

### 🔹 Tool: `list_memories`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_memories</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List available memories for a project. Memories are stored as Markdown files under <code>&lt;root&gt;/.lsmcp/memories/*.md</code> and returned as names without the <code>.md</code> extension.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "[\"tool_development\",\"project_scope\",\"onboarding\"]"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (returns `JSON.stringify(string[])`). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_check_capabilities`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_check_capabilities</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Check LSP server capabilities and return a Markdown report indicating supported features, including a raw capabilities payload.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | Input is an empty JSON object. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A Markdown report starting with '# Language Server Capabilities', including feature support flags and a JSON code block of the raw server capabilities."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_delete_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_delete_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Delete a symbol and optionally all its references using LSP. Finds the symbol by resolving the provided line and locating the first <code>textTarget</code> occurrence; applies the result via a workspace edit.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory for resolving relative paths. |
| `relativePath` | `string` | ✅ | — | File path containing the symbol (relative to root). |
| `line` | `number|string` | ✅ | — | Line number (1-based) or string to match in the line. |
| `textTarget` | `string` | ✅ | — | Name of the symbol to delete. |
| `removeReferences` | `boolean` | ❌ | `true` | Also delete all references to the symbol. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Root directory for resolving relative paths" },
		"relativePath": { "type": "string", "description": "File path containing the symbol (relative to root)" },
		"line": { "type": ["integer", "string"], "description": "Line number (1-based) or string to match in the line" },
		"textTarget": { "type": "string", "description": "Name of the symbol to delete" },
		"removeReferences": { "type": "boolean", "default": true, "description": "Also delete all references to the symbol" }
	},
	"required": ["root", "relativePath", "line", "textTarget"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "Success: 'Successfully deleted symbol from <fileCount> file(s) with <occurrenceCount> occurrence(s)' followed by a Modified files list. Failure: 'Failed to delete symbol: <reason>'."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Applies workspace edits by writing updated files to disk. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

---

### 🔹 Tool: `lsp_find_references`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_find_references</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find all references to a symbol at a specific position using LSP.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Workspace root path. |
| `relativePath` | `string` | ✅ | — | File path relative to `root`. |
| `line` | `number|string` | ✅ | — | 1-based line number or a match string to locate the line. |
| `column` | `number` | ❌ | — | 0-based column index. |
| `symbolName` | `string` | ✅ | — | Symbol name used in reporting. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"relativePath": "src/services/search/searchManager.ts",
	"line": 18,
	"column": 9,
	"symbolName": "SearchManager"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "Found 3 reference(s) to \"SearchManager\"\n\nsrc/services/search/searchManager.ts:18:9\nclass SearchManager {\n  constructor(private readonly store: SearchStore) {}\n}\n\nsrc/cli/services/index.ts:7:21\nimport { SearchManager } from \"../services/search/searchManager\";\n\nsrc/extension.ts:44:15\nconst manager = new SearchManager(new SearchStore());"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_format_document`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_format_document</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Format an entire document using the language server’s formatting provider. Can optionally apply the resulting edits to the file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Absolute path to the workspace root. |
| `relativePath` | `string` | ✅ | — | Path to the file, relative to root. |
| `tabSize` | `number` | ❌ | `2` | Editor tab size used for formatting. |
| `insertSpaces` | `boolean` | ❌ | `true` | Prefer spaces over tabs. |
| `trimTrailingWhitespace` | `boolean` | ❌ | `true` | Trim trailing whitespace on lines. |
| `insertFinalNewline` | `boolean` | ❌ | `true` | Ensure file ends with a newline. |
| `trimFinalNewlines` | `boolean` | ❌ | `true` | Trim extra final newlines. |
| `applyChanges` | `boolean` | ❌ | `false` | If true, write the formatting edits back to the file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Absolute path to the workspace root." },
		"relativePath": { "type": "string", "description": "Path to the file, relative to root." },
		"tabSize": { "type": "integer", "default": 2, "description": "Editor tab size used for formatting." },
		"insertSpaces": { "type": "boolean", "default": true, "description": "Prefer spaces over tabs." },
		"trimTrailingWhitespace": { "type": "boolean", "default": true, "description": "Trim trailing whitespace on lines." },
		"insertFinalNewline": { "type": "boolean", "default": true, "description": "Ensure file ends with a newline." },
		"trimFinalNewlines": { "type": "boolean", "default": true, "description": "Trim extra final newlines." },
		"applyChanges": { "type": "boolean", "default": false, "description": "If true, write the formatting edits back to the file." }
	},
	"required": ["root", "relativePath"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable report starting with 'Formatting changes for <relativePath>:' listing per-edit summaries and a total change count. If applyChanges=true, includes 'Changes applied to file'; otherwise indicates how to apply the changes."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | If `applyChanges=true`, writes formatted edits back to the file. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

---

### 🔹 Tool: `lsp_get_code_actions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_code_actions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get available LSP code actions (quick fixes/refactors) for a specific file and line range. Resolves 1-based line numbers or match strings, gathers diagnostics in that range for context, and returns a grouped report.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory for resolving relative paths. |
| `relativePath` | `string` | ✅ | — | File path to get code actions for (relative to root). |
| `startLine` | `number|string` | ✅ | — | Start line number (1-based) or string to match. |
| `endLine` | `number|string` | ❌ | — | End line number (1-based) or string to match. |
| `includeKinds` | `string[]` | ❌ | — | Filter for specific code action kinds. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Root directory for resolving relative paths" },
		"relativePath": { "type": "string", "description": "File path to get code actions for (relative to root)" },
		"startLine": { "type": ["integer", "string"], "description": "Start line number (1-based) or string to match" },
		"endLine": { "type": ["integer", "string"], "description": "End line number (1-based) or string to match" },
		"includeKinds": { "type": "array", "items": { "type": "string" }, "description": "Filter for specific code action kinds (e.g., 'quickfix', 'refactor')" }
	},
	"required": ["root", "relativePath", "startLine"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable report. If none: 'No code actions available for <relativePath>:<start>-<end>'. Otherwise: 'Code actions for src/cli/index.ts:12-18' and grouped sections like '=== Quick Fix ===' followed by action titles and metadata."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_completion`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_completion</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get LSP completion items at a given file position. Can optionally resolve additional details/documentation per item and optionally include auto-import suggestions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Absolute path to the workspace root. |
| `relativePath` | `string` | ✅ | — | Path to the file, relative to root. |
| `line` | `number|string` | ✅ | — | 1-based line number (or a match string used to locate the line). |
| `column` | `number` | ❌ | — | 0-based column index. |
| `textTarget` | `string` | ❌ | — | Optional hint to locate the completion target on the line. |
| `resolve` | `boolean` | ❌ | `false` | Resolve completion items for extra details/docs where supported. |
| `includeAutoImport` | `boolean` | ❌ | `false` | Include auto-import completion items where supported. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Absolute path to the workspace root." },
		"relativePath": { "type": "string", "description": "Path to the file, relative to root." },
		"line": { "type": ["integer", "string"], "description": "1-based line number (or a match string used to locate the line)." },
		"column": { "type": "integer", "description": "0-based column index." },
		"textTarget": { "type": "string", "description": "Optional hint to locate the completion target on the line." },
		"resolve": { "type": "boolean", "default": false, "description": "If true, resolve completion items for extra detail/docs where supported." },
		"includeAutoImport": { "type": "boolean", "default": false, "description": "If true, include auto-import completion items where supported." }
	},
	"required": ["root", "relativePath", "line"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable, newline-delimited report starting with 'Completions at <path>:<line>:<col>:' followed by completion entries like 'label [Kind]' and optional detail/documentation text."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_definitions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_definitions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the definition(s) of a symbol at a specific position using LSP.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Workspace root path. |
| `relativePath` | `string` | ✅ | — | File path relative to `root`. |
| `line` | `number|string` | ✅ | — | 1-based line number or a match string to locate the line. |
| `column` | `number` | ❌ | — | 0-based column index. |
| `symbolName` | `string` | ✅ | — | Symbol name used in reporting. |
| `before` | `number` | ❌ | — | Context lines before. |
| `after` | `number` | ❌ | — | Context lines after. |
| `includeBody` | `boolean` | ❌ | — | Include full definition body where supported. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"relativePath": "src/cli/services/index.ts",
	"line": 12,
	"column": 24,
	"symbolName": "loadWorkspace",
	"before": 3,
	"after": 8,
	"includeBody": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "Found 1 definition(s) for \"loadWorkspace\"\n\nsrc/cli/services/workspace.ts:55:0 - loadWorkspace\n  52 | export interface WorkspaceInfo {\n  53 |   root: string;\n  54 | }\n  55 | export async function loadWorkspace(root: string): Promise<WorkspaceInfo> {\n  56 |   return { root };\n  57 | }"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_diagnostics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_diagnostics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get diagnostics (errors, warnings) for a specific file using LSP.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Absolute path to the workspace root. |
| `relativePath` | `string` | ✅ | — | Path to the file, relative to root. |
| `timeout` | `number` | ❌ | — | Optional timeout in milliseconds for the LSP request. |
| `forceRefresh` | `boolean` | ❌ | — | Optional flag to force a refresh/retry behavior before returning diagnostics. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Absolute path to the workspace root." },
		"relativePath": { "type": "string", "description": "Path to the file, relative to root." },
		"timeout": { "type": "number", "description": "Optional timeout in milliseconds for the LSP request." },
		"forceRefresh": { "type": "boolean", "description": "Optional flag to force a refresh/retry behavior before returning diagnostics." }
	},
	"required": ["root", "relativePath"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable, newline-delimited report containing a header line, a debug info line, and either 'No diagnostics found.' or a formatted list of diagnostics with severity, message, optional source, and location 'at line X:Y'."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_document_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_document_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get all symbols in a document using LSP and return a human-readable report of the symbol hierarchy.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Absolute path to the workspace root. |
| `relativePath` | `string` | ✅ | — | Path to the file, relative to root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Absolute path to the workspace root." },
		"relativePath": { "type": "string", "description": "Path to the file, relative to root." }
	},
	"required": ["root", "relativePath"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable, newline-delimited report. Starts with 'Document symbols in <relativePath>:' followed by a formatted symbol hierarchy (or symbol info per entry) returned by the LSP."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_hover`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_hover</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get hover information (type signature, documentation) at a specific position using LSP.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Workspace root path. |
| `relativePath` | `string` | ✅ | — | File path relative to `root`. |
| `line` | `number|string` | ❌ | — | 1-based line number or a match string to locate the line. |
| `character` | `number` | ❌ | — | 0-based character index (alternative to `column`). |
| `column` | `number` | ❌ | — | 0-based column index (alternative to `character`). |
| `textTarget` | `string` | ❌ | — | Additional hint for locating the hover target. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"relativePath": "src/services/graph/index.ts",
	"line": 42,
	"column": 17,
	"textTarget": "createGraph"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "Hover for src/services/graph/index.ts:42:17\n\n(createGraph) (param) options: GraphOptions\nCreates a new graph instance with the provided options."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_signature_help`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_signature_help</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get LSP signature help at a given file position (typically inside a function call argument list).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Absolute path to the workspace root. |
| `relativePath` | `string` | ✅ | — | Path to the file, relative to root. |
| `line` | `number|string` | ✅ | — | 1-based line number (or a match string used to locate the line). |
| `column` | `number` | ❌ | — | 0-based column index. |
| `textTarget` | `string` | ❌ | — | Optional hint to locate the signature-help target on the line. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Absolute path to the workspace root." },
		"relativePath": { "type": "string", "description": "Path to the file, relative to root." },
		"line": { "type": ["integer", "string"], "description": "1-based line number (or a match string used to locate the line)." },
		"column": { "type": "integer", "description": "0-based column index." },
		"textTarget": { "type": "string", "description": "Optional hint to locate the signature-help target on the line." }
	},
	"required": ["root", "relativePath", "line"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable, newline-delimited report starting with 'Signature help at <path>:<line>:<col>:' followed by the signature, documentation, and a parameter list indicating the active parameter."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_get_workspace_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_get_workspace_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search for symbols across the entire workspace using LSP (feature availability depends on language server support).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query` | `string` | ✅ | — | Symbol query text to search for across the workspace. |
| `root` | `string` | ❌ | — | Optional absolute path to the workspace root. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"query": { "type": "string", "description": "Symbol query text to search for across the workspace." },
		"root": { "type": "string", "description": "Optional absolute path to the workspace root. If omitted, the active workspace root may be used." }
	},
	"required": ["query"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable, newline-delimited report starting with 'Found N symbol(s) matching \"query\":'. Results are grouped by file with section headers like '=== <path> ===' and list entries include symbol kind, optional container, and range/location information. May throw if unsupported/disabled by the language server."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `lsp_rename_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lsp_rename_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Rename a symbol across the codebase using LSP rename. Locates the target by finding the first occurrence of <code>textTarget</code> on a resolved line (1-based numeric or match string) or first occurrence in the file when line is omitted. Applies resulting workspace edits by writing updated files.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory for resolving relative paths. |
| `relativePath` | `string` | ✅ | — | File path containing the symbol (relative to root). |
| `line` | `number|string` | ❌ | — | Line number (1-based) or a string to match in the line. |
| `textTarget` | `string` | ✅ | — | Symbol to rename. |
| `newName` | `string` | ✅ | — | New name for the symbol. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Root directory for resolving relative paths" },
		"relativePath": { "type": "string", "description": "File path containing the symbol (relative to root)" },
		"line": { "type": ["integer", "string"], "description": "Line number (1-based) or string to match in the line", "nullable": true },
		"textTarget": { "type": "string", "description": "Symbol to rename" },
		"newName": { "type": "string", "description": "New name for the symbol" }
	},
	"required": ["root", "relativePath", "textTarget", "newName"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable summary of the rename and per-file changes. Example: 'Successfully renamed symbol in X file(s) with Y change(s)' followed by a 'Changes:' section listing file + line + old/new text."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Applies workspace edits by writing updated files to disk. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

---

### 🔹 Tool: `parse_imports`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>parse_imports</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parse and summarize import statements in a TypeScript/JavaScript file, including per-import specifiers and best-effort module path resolution.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `filePath` | `string` | ✅ | — | File path to analyze, relative to `root`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"filePath": "src/services/search/types.ts"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"file\": \"src/services/search/types.ts\",\n  \"totalImports\": 1,\n  \"imports\": [\n    {\n      \"source\": \"neverthrow\",\n      \"resolvedPath\": \"C:/projects/lsmcp/node_modules/neverthrow/dist/index.d.ts\",\n      \"isTypeOnly\": false,\n      \"specifiers\": [\n        {\n          \"imported\": \"Result\",\n          \"local\": \"Result\",\n          \"isDefault\": false,\n          \"isNamespace\": false\n        }\n      ]\n    }\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (returns data as a JSON string). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `read_memory`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>read_memory</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Read the contents of a named memory file from the project’s <code>.lsmcp/memories</code> store.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `memoryName` | `string` | ✅ | — | Memory name (without `.md`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"memoryName": "project_scope"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "# Project Scope\n\nThis project focuses on LSP-backed code navigation, symbol indexing, and memory utilities for MCP clients. It prioritizes fast search and safe editing operations across supported languages."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None. |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `replace_range`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>replace_range</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Replace a specific range of text in a file with new content. The edit range uses 1-based line numbers and 0-based character offsets; supports multi-line replacements and optional indentation preservation.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory for resolving relative paths. |
| `relativePath` | `string` | ✅ | — | File path to edit (relative to root). |
| `startLine` | `number` | ✅ | — | Start line number (1-based, inclusive). |
| `startCharacter` | `number` | ✅ | — | Start character in the line (0-based). |
| `endLine` | `number` | ✅ | — | End line number (1-based, inclusive). |
| `endCharacter` | `number` | ✅ | — | End character in the line (0-based). |
| `newContent` | `string` | ✅ | — | New content to replace the range with (empty string for deletion). |
| `preserveIndentation` | `boolean` | ❌ | `true` | Preserve indentation of the first line. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Root directory for resolving relative paths" },
		"relativePath": { "type": "string", "description": "File path to edit (relative to root)" },
		"startLine": { "type": "integer", "description": "Start line number (1-based, inclusive)" },
		"startCharacter": { "type": "integer", "description": "Start character position in the line (0-based)" },
		"endLine": { "type": "integer", "description": "End line number (1-based, inclusive)" },
		"endCharacter": { "type": "integer", "description": "End character position in the line (0-based)" },
		"newContent": { "type": "string", "description": "New content to replace the range with (empty string for deletion)" },
		"preserveIndentation": { "type": "boolean", "default": true, "description": "Whether to preserve the indentation of the first line" }
	},
	"required": [
		"root",
		"relativePath",
		"startLine",
		"startCharacter",
		"endLine",
		"endCharacter",
		"newContent"
	],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A JSON-stringified result object: {success:boolean, filesChanged?:string[], error?:string}."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes the updated file to disk and marks it as modified for auto-indexing. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

---

### 🔹 Tool: `replace_regex`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>replace_regex</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Replace content in a file using a regular expression (dotall + multiline). Counts matches first and can fail when multiple matches exist and <code>allowMultipleOccurrences</code> is false.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory for resolving relative paths. |
| `relativePath` | `string` | ✅ | — | The relative path to the file. |
| `regex` | `string` | ✅ | — | Python-style regular expression to match. |
| `repl` | `string` | ✅ | — | Replacement string with backreferences like `$1`, `$2`. |
| `allowMultipleOccurrences` | `boolean` | ❌ | `false` | Replace all occurrences if true. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"root": { "type": "string", "description": "Root directory for resolving relative paths" },
		"relativePath": { "type": "string", "description": "The relative path to the file" },
		"regex": { "type": "string", "description": "Python-style regular expression to match" },
		"repl": { "type": "string", "description": "Replacement string with backreferences like $1, $2" },
		"allowMultipleOccurrences": { "type": "boolean", "default": false, "description": "Replace all occurrences if true" }
	},
	"required": ["root", "relativePath", "regex", "repl"],
	"additionalProperties": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A JSON-stringified result object: {success:boolean, filesChanged?:string[], error?:string}."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes the updated file to disk and marks it as modified for auto-indexing. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

---

### 🔹 Tool: `resolve_symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>resolve_symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Resolve an imported symbol from a TS/JS file to its external definition by analyzing the file’s imports and mapping them to resolved modules/paths.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `filePath` | `string` | ✅ | — | File path to analyze, relative to `root`. |
| `symbolName` | `string` | ✅ | — | Imported symbol name to resolve. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"filePath": "src/services/search/types.ts",
	"symbolName": "Result"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"symbolName\": \"Result\",\n  \"sourceModule\": \"neverthrow\",\n  \"resolvedPath\": \"C:/projects/lsmcp/node_modules/neverthrow/dist/index.d.ts\",\n  \"symbol\": {\n    \"name\": \"Result\",\n    \"kind\": \"TypeAlias\",\n    \"location\": \"C:/projects/lsmcp/node_modules/neverthrow/dist/index.d.ts\",\n    \"detail\": \"type Result<T, E> = { isOk: boolean; value?: T; error?: E }\"\n  }\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (returns result/error as a JSON string). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Limits** | Resolution is best-effort via import scanning/parsing; results can be partial. |

---

### 🔹 Tool: `search_external_library_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_external_library_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search symbols from previously indexed external libraries (created by <code>index_external_libraries</code>), with optional filtering by library, symbol name substring, and symbol kind.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `libraryName` | `string` | ❌ | — | Restrict search to a single library. |
| `symbolName` | `string` | ❌ | — | Case-insensitive substring filter. |
| `kind` | `string` | ❌ | — | One of `Class | Interface | Function | Variable | Constant | Enum | Module | Namespace | TypeParameter`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"libraryName": "@types/node",
	"symbolName": "Buffer",
	"kind": "Interface"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "{\n  \"totalResults\": 2,\n  \"displayed\": 2,\n  \"truncated\": false,\n  \"symbols\": [\n    {\n      \"name\": \"Buffer\",\n      \"kind\": \"Interface\",\n      \"container\": \"NodeJS\",\n      \"file\": \"C:/projects/lsmcp/node_modules/@types/node/buffer.d.ts\",\n      \"detail\": \"interface Buffer\"\n    }\n  ]\n}"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | None (uses external-symbol index created by `index_external_libraries`). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

---

### 🔹 Tool: `search_symbols`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_symbols</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search for symbols in the codebase using an indexed search. Creates/updates the symbol index as needed and returns a formatted string with up to 10 results and suggested next-step commands.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ❌ | `process.cwd()` | Root directory for the project. |
| `query` | `string` | ❌ | — | Symbol name/pattern to search for (alias for `name`). |
| `name` | `string` | ❌ | — | Symbol name/pattern to search for (alias for `query`). |
| `kind` | `any` | ❌ | — | Symbol kind filter (accepts names/arrays/numbers/JSON-encoded arrays). |
| `file` | `string` | ❌ | — | Restrict search to a single file (relative to root). |
| `containerName` | `string` | ❌ | — | Container name filter (e.g., class name for methods). |
| `includeChildren` | `boolean` | ❌ | `true` | Include child symbols in results. |
| `includeExternal` | `boolean` | ❌ | `false` | Include external library symbols (from `node_modules`). |
| `onlyExternal` | `boolean` | ❌ | `false` | Only return external library symbols. |
| `sourceLibrary` | `string` | ❌ | — | Filter by a specific external library name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"query": "SearchManager",
	"kind": "Class",
	"includeChildren": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "string",
	"description": "A human-readable report. On success begins with 'Found N symbol(s) matching your search:' then shows up to 10 results with location and guidance for get_symbol_details / LSP tools. On failure returns an error string (e.g., invalid kind, no files matched, no symbols found)."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | May create/update an internal symbol index (does not modify user source files). |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | On first run, requires index patterns from (1) `.lsmcp/config.json` `files`, else (2) server context config `context.config.files`, else (3) preset defaults derived from `context.config.preset`. If no patterns are configured, returns an error string telling you to set `files` or `preset`. |
| **Limits** | Returns up to 10 results in the formatted output. |

---

### 🔹 Tool: `write_memory`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>write_memory</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Create or update a named memory under the project’s <code>.lsmcp/memories</code> store.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `root` | `string` | ✅ | — | Root directory of the project. |
| `memoryName` | `string` | ✅ | — | Memory name (without `.md`). |
| `content` | `string` | ✅ | — | Full memory content to write. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"root": "c:\\hw-workspace\\hw-mcp-tools\\documentation\\graphrag.js\\eugene",
	"memoryName": "onboarding",
	"content": "# Onboarding\n\n- Run `npx -y @mizchi/lsmcp` to start the server.\n- Configure .lsmcp/config.json with your project file globs.\n- Use `get_project_overview` to confirm indexing is working."
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"result": "Memory 'onboarding' saved successfully"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes `<root>/.lsmcp/memories/<memoryName>.md`. |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `Not documented` |
| **MCP prompts exposed** | `Not documented` |
| **Other RPC endpoints** | `Not documented` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `Not documented` | — | — | — | No environment variables are described in the source report. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `.lsmcp/config.json` | Provides indexing configuration (e.g., `files` globs) used by symbol search/indexing. |
| `.lsmcp/memories/*.md` | Project memory store used by `list_memories`, `read_memory`, `write_memory`, `delete_memory`. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | CLI flags are not enumerated in the source report. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Node.js `>= 22`. |
| 2 | Install/ensure an LSP server appropriate to your chosen preset. |

### 8.2 Typical Run Commands

```bash
# Typical local stdio usage
npx -y @mizchi/lsmcp
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- Symbol search uses an internal index and may perform an initial indexing pass on first run.
- Some tools return JSON as a string (`JSON.stringify(result)`), which may be large for directory-wide operations.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `33` |
| **Read-only** | `26` |
| **Write-only** | `4` |
| **Hybrid** | `3` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Persistent storage for the symbol index | The source report describes an internal symbol indexing layer, but does not document persistence or on-disk location. |
| Environment variables, logging/telemetry | Not documented in the source report. |
| Tool schemas vs instances | Some tools show example instances where a formal JSON Schema is not provided. |

---

<div align="center">

*— End of Report —*

</div>
