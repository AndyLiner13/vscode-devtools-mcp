<div align="center">

# 📋 MCP Server Report

## Lucidity MCP
### [hyperb1iss/lucidity-mcp](https://github.com/hyperb1iss/lucidity-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/hyperb1iss/lucidity-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | cdcb184bf1e0b59f118fa41011d266d8f29fb4ff |
| **Commit URL** *(optional)* | https://github.com/hyperb1iss/lucidity-mcp/commit/cdcb184bf1e0b59f118fa41011d266d8f29fb4ff |
| **License** *(required)* | Apache-2.0 |
| **Version** *(optional)* | 0.1.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository analysis at the commit ref listed above |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope and some error details inferred from FastMCP behavior |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | `workspace_root` and optional `path` are treated as filesystem paths; git commands run relative to `workspace_root` |
| **Line/column indexing** *(required)* | 1-based (prompts instruct line-numbered reporting) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | Direct JSON from FastMCP tool return values |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Lucidity MCP is a Python MCP server that prepares git change sets for AI-driven code quality analysis. It extracts diffs and changed-file context, generates structured prompts across ten quality dimensions, and returns those prompts and diffs to MCP clients to guide consistent reviews. It supports both stdio and SSE transports and is designed to be lightweight and language-agnostic.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop and other MCP-compatible AI assistants |

### 1.3 Primary Capabilities *(required)*

- [x] Git-aware change extraction (staged + unstaged)
- [x] Prompt-based analysis across 10 quality dimensions
- [x] Language-agnostic diff preparation
- [x] Supports stdio and SSE transports
- [x] Structured, actionable output instructions for AI reviewers

### 1.4 Non-Goals / Exclusions *(optional)*

- Does not perform analysis itself; it prepares prompts and structured data for the AI to analyze.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.13+ |
| **Documented integrations** *(optional)* | MCP clients over stdio or SSE |
| **Notes / constraints** *(optional)* | Git repository required for `analyze_changes` |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Language-agnostic (diff-based) |
| **How to extend** *(optional)* | Add new prompt dimensions in `lucidity/prompts.py` or extend tool logic |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | Apache-2.0 |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | mcp[cli], httpx, starlette, sse-starlette, uvicorn, anyio, rich, dotenv |
| **External / System** *(optional)* | Git CLI |
| **Optional** *(optional)* | None documented |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI) |
| **Env vars used** *(optional)* | Yes (loads `.env` if present) |
| **Config files used** *(optional)* | `.env` optional |
| **CLI flags used** *(optional)* | `--transport`, `--host`, `--port`, `--debug`, `--log-level`, `--log-file` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | FastMCP; Starlette + SSE for network transport |
| **Architecture notes** *(optional)* | `analyze_changes` runs git commands to collect diffs and returns structured prompts and diff data |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Yes (SSE via Starlette) |
| `sse` *(optional)* | Yes |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None documented |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes — only when `--log-file` is provided |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | No — returns diffs and prompts in responses without persistence |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `analyze_changes` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `AnalyzeChangesRequest` | `{ workspace_root: string, path?: string }` |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `AnalyzeChangesResult` | `{ status, file_count, file_list, results, instructions }` |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `workspace_root` must be a git repository (checks for `.git`) |
| **Rate limits / retries** | None documented |
| **File size limits** | Skips tiny diffs (<10 characters) |
| **Resource constraints** | Skips lockfiles and binary-like artifacts by extension |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown (FastMCP handles tool errors) |
| **Error as text** | Yes (`status: "error"` + message) |
| **Error as `{ error: string }`** | No (uses `status`/`message`) |
| **Common error codes** | None documented |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `analyze_changes`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>analyze_changes</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Collects git diffs and changed-file context, then returns structured prompts and instructions for AI code review across quality dimensions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `workspace_root` | `string` | ✅ | — | Path to the git repository root |
| `path` | `string` | ❌ | — | Optional file path to filter the diff |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "workspace_root": "/repo", "path": "src/app.py" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "status": "success",
  "file_count": 1,
  "file_list": ["src/app.py"],
  "all_changed_files": ["src/app.py"],
  "results": {
    "src/app.py": {
      "status": "modified",
      "language": "python",
      "analysis_prompt": "# Git Change Analysis\nAnalyze the diff for correctness, safety, and maintainability.",
      "raw_diff": "diff --git a/src/app.py b/src/app.py\nindex 123..456 100644\n--- a/src/app.py\n+++ b/src/app.py\n@@ -1,3 +1,4 @@\n- print('hi')\n+ print('hello')",
      "original_code": "print('hi')",
      "modified_code": "print('hello')"
    }
  },
  "instructions": "Review the diff using the prompt and return a structured report."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `General Research` |
| **Side effects** | Runs `git` commands and changes working directory temporarily |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | `analyze_changes` prompt template |
| **Other RPC endpoints** *(optional)* | SSE endpoint at `/sse` and `/messages/` when using SSE transport |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

None documented.

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `.env` | Optional environment variables |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--transport {stdio,sse}` | Select transport mode |
| `--host` | Host to bind the SSE server |
| `--port` | Port for SSE server (default 6969) |
| `--debug` | Enable debug logging |
| `--log-level` | Logging level |
| `--log-file` | Log file path (required for stdio logging) |
| `--verbose` | Verbose HTTP logging |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `uv venv .venv` and activate |
| 2 | `uv sync` |

### 8.2 Typical Run Commands *(optional)*

```bash
# stdio
lucidity-mcp

# SSE
lucidity-mcp --transport sse --host 127.0.0.1 --port 6969
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Rich console logging; file logging via `--log-file` |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Git diff size affects response size and prompt length.
- Skips lockfiles and minimal diffs to reduce noise.

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
| Output envelope details | FastMCP wrapping not explicitly documented in repo |

---

<div align="center">

*— End of Report —*

</div>
