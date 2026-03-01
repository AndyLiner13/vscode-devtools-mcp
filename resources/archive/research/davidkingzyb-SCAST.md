<div align="center">

# 📋 MCP Server Report

## SCAST
### [davidkingzyb/SCAST](https://github.com/davidkingzyb/SCAST)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/davidkingzyb/SCAST |
| **Target Path** *(optional)* | mcp |
| **Analyzed Ref** *(required)* | b156758028dfee354e375aee2fd2d1ed731cb4b3 |
| **Commit URL** *(optional)* | https://github.com/davidkingzyb/SCAST/commit/b156758028dfee354e375aee2fd2d1ed731cb4b3 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 0.1.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | `mcp/` MCP server implementation at the analyzed commit |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope and limits inferred from implementation |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | absolute or relative; restricted to allowed directories provided at startup |
| **Line/column indexing** *(required)* | 1-based (code slicing uses `line-1` and `line+1`) |
| **Encoding model** *(optional)* | UTF-8 (file reads use `utf-8`) |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | `content[].text` JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

SCAST is a static code analysis and visualization tool that converts codebases into ASTs, UML diagrams, and flowcharts. The MCP server wraps the analysis pipeline to let MCP clients request analysis or retrieve definitions by keyword, returning textual summaries and browser links to visual outputs.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop (example configuration) |

### 1.3 Primary Capabilities *(required)*

- [x] Analyze a source directory and generate AST/diagram data
- [x] Return keyword index and browser link to visualization
- [x] Retrieve code definitions by keyword

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a code execution environment
- Visualization UI served separately via the built-in HTTP server

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js environment supporting ES modules |
| **Documented integrations** *(optional)* | MCP clients via stdio (config examples in README) |
| **Notes / constraints** *(optional)* | Requires allowed directories passed as CLI args; starts local HTTP server on port 5305 |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | JavaScript, TypeScript, Python, C# (current support list in README) |
| **How to extend** *(optional)* | Extend parser logic in `js/` and AST traversal functions |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | JavaScript (Node.js) |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | @modelcontextprotocol/sdk, glob, minimatch, multiparty, uglify-js, zod-to-json-schema |
| **External / System** *(optional)* | Node.js |
| **Optional** *(optional)* | None documented |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (node `mcp/index.js` or `npm run server`) |
| **Env vars used** *(optional)* | No |
| **Config files used** *(optional)* | No |
| **CLI flags used** *(optional)* | Yes (allowed directory arguments) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Custom AST processing; ESTree parsing and SCAST-specific traversal |
| **Architecture notes** *(optional)* | - MCP server validates allowed paths
- Generates AST data and stores temp JSON
- Starts local HTTP server for visualization |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | No (separate HTTP server for visualization) |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (writes temp JSON under `tmp/`) |
| **Uses local cache** *(optional)* | Yes (reuses previous JSON analysis results) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes (stores parsed code snapshots in temp JSON) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `scast_anaylisis` |
| 2 | `scast_retriever` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `DirectoryPath` | Path to a source directory inside allowed directories |
| `KeywordList` | Array of strings used to find definitions |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TextResult` | MCP `content` array with a single `text` response |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Only allowed directories; realpath checks prevent symlink escape |
| **Rate limits / retries** | None documented |
| **File size limits** | None documented |
| **Resource constraints** | Processing scales with number of files in directory |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes |
| **Error as text** | Yes (`content[].text` starts with `Error:`) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | Invalid arguments, access denied outside allowed directories, missing directories |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `scast_anaylisis`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>scast_anaylisis</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Performs static analysis over a source directory, generates visualization artifacts, and returns a keyword list plus a browser link to view results.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `dir` | `string` | ✅ | — | Source directory to analyze (must be inside allowed directories) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "dir": "/path/to/project"
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
      "text": "### file.js\n- MyClass (ClassDefine) ...\n--------\nOpen http://localhost:5305?file=/tmp/project.json ..."
    }
  ]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Writes temp JSON; may start local HTTP server; may open browser on Windows |
| **Determinism** *(optional)* | Depends (analysis can be affected by prior cached results) |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Directory must exist and be within allowed paths |
| **Postconditions** | Temp JSON stored under `tmp/` with AST data |
| **Limits** | Only file extensions in supported list (`.js`, `.py`, `.cs`, `.ts`) |
| **Security & privacy** | Reads and stores code locally; access controlled by allowed directories |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `mcp/index.js` → `server.setRequestHandler` for tool list |
| **Core implementation** | `mcp/index.js` → `scastAnalysis`, `startServer` |

---

### 🔹 Tool: `scast_retriever`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>scast_retriever</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieves code definitions and analysis snippets for specific keywords from a previously analyzed directory.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `dir` | `string` | ✅ | — | Source directory to search (must be inside allowed directories) |
| `keywords` | `string[]` | ✅ | — | Keywords to retrieve definitions for |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "dir": "/path/to/project",
  "keywords": ["MyClass", "myFunction"]
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
      "text": "MyClass ...\n```js\nclass MyClass {}\n```\n--------"
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
| **Side effects** *(required)* | None (may trigger analysis if cache is missing) |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Directory must exist and be within allowed paths |
| **Postconditions** | None |
| **Limits** | Keyword matches are derived from AST keyword extraction logic |
| **Security & privacy** | Reads local temp JSON and source content within allowed paths |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | `mcp/index.js` → `server.setRequestHandler` for tool list |
| **Core implementation** | `mcp/index.js` → `scastRetriever`, `getKeyword` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | Local HTTP visualization server in `mcp/server.js` (serves `SCAST.html`, `/save`, `/rawtext`) |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| None | — | — | — | No environment variables documented |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| None | No config files documented |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `node mcp/index.js <allowed-dir> [extra-dirs...]` | Allowed directories list for MCP server |
| `npm run server` | Starts visualization HTTP server on port 5305 |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `git clone https://github.com/davidkingzyb/SCAST.git` |
| 2 | `cd SCAST` |
| 3 | `npm install` |

### 8.2 Typical Run Commands *(optional)*

```bash
# MCP server (stdio)
node mcp/index.js /YOUR_WORKSPACE /ANOTHER_ALLOWED_DIR

# Visualization HTTP server
npm run server
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console output to stderr/stdout |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Analysis time increases with number of files in the target directory
- Writes and reads JSON snapshots for caching

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 2 |
| **Read-only** | 1 |
| **Write-only** | 0 |
| **Hybrid** | 1 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Line/column indexing consistency | Only inferred for Python/JS handling based on code slicing |
| Rate limits | None documented in source |

---

<div align="center">

*— End of Report —*

</div>
