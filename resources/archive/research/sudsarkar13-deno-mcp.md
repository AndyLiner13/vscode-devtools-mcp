<div align="center">

# 📋 MCP Server Report

## Deno MCP Tools
### [`sudsarkar13/deno-mcp`](https://github.com/sudsarkar13/deno-mcp)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | `https://github.com/sudsarkar13/deno-mcp` |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 0c8b6b41bea0c3ccf2ba2d5ff0fdf35e411f3086 |
| **Commit URL** *(optional)* | https://github.com/sudsarkar13/deno-mcp/commit/0c8b6b41bea0c3ccf2ba2d5ff0fdf35e411f3086 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 1.0.9 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Repository root at commit 0c8b6b41; stdio + HTTP MCP implementations and tool handlers |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — file write side effects depend on executed Deno command |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | relative to `workingDirectory` (absolute paths supported) |
| **Line/column indexing** *(required)* | Unknown |
| **Encoding model** *(optional)* | bytes |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | direct JSON (`content[]` payloads) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Deno MCP Tools is a comprehensive MCP server that exposes the Deno CLI toolchain to MCP clients. It provides standardized access to execution, formatting, linting, testing, dependency management, compilation, and utility commands through MCP over stdio or HTTP (SSE), enabling AI assistants and IDEs to run Deno workflows securely.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Cline/Claude Dev extension, Claude Desktop, HTTP MCP clients |

### 1.3 Primary Capabilities *(required)*

- [x] Deno execution tools (run, serve, task, repl, eval)
- [x] Development tools (fmt, lint, check, test, bench, coverage)
- [x] Dependency and project management (add/remove/install/outdated/init)
- [x] Compilation and utility tooling (compile/doc/info/types/upgrade/version/completions)
- [x] MCP over stdio and HTTP SSE

### 1.4 Non-Goals / Exclusions *(optional)*

- None documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js >= 18; requires Deno CLI installed (>= 1.40) |
| **Documented integrations** *(optional)* | MCP IDE configs; HTTP endpoint for web clients; Docker images |
| **Notes / constraints** *(optional)* | Deno must be in PATH; permissions must be explicitly granted |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript/JavaScript (Deno runtime) |
| **How to extend** *(optional)* | Use Deno CLI flags and permissions; add new tool handlers in `src/tools` |

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
| **Runtime** *(required)* | @modelcontextprotocol/sdk |
| **External / System** *(optional)* | Deno CLI, Node.js |
| **Optional** *(optional)* | Docker/Render deployment |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Mixed (local process, Docker, remote Render service) |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (HTTP server / Render) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | Yes (render.yaml) |
| **CLI flags used** *(optional)* | No |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Deno CLI, Node.js child_process, HTTP/SSE |
| **Architecture notes** *(optional)* | - MCP stdio server dispatches tools to Deno CLI
- Render wrapper provides HTTP MCP endpoint and health/metrics
- Tool handlers share input schemas and command execution helpers |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | Yes |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None documented |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (depends on Deno command, e.g., fmt, add, compile) |
| **Uses local cache** *(optional)* | Yes (Deno cache directory, configurable via `DENO_DIR`) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes (reads and may modify local project files) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `deno_add` |
| 2 | `deno_bench` |
| 3 | `deno_check` |
| 4 | `deno_compile` |
| 5 | `deno_completions` |
| 6 | `deno_coverage` |
| 7 | `deno_doc` |
| 8 | `deno_eval` |
| 9 | `deno_fmt` |
| 10 | `deno_info` |
| 11 | `deno_init` |
| 12 | `deno_install` |
| 13 | `deno_lint` |
| 14 | `deno_outdated` |
| 15 | `deno_remove` |
| 16 | `deno_repl` |
| 17 | `deno_run` |
| 18 | `deno_serve` |
| 19 | `deno_task` |
| 20 | `deno_test` |
| 21 | `deno_types` |
| 22 | `deno_uninstall` |
| 23 | `deno_upgrade` |
| 24 | `deno_version` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `DenoCommandOptions` | `{ workingDirectory?, permissions?, envVars?, timeout? }` used by most tools |
| `DenoPermissionDescriptor` | Permission names (read/write/net/env/run/ffi/hrtime/sys) |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `DenoCommandResult` | `{ success, stdout, stderr, code, duration }` from command execution |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | relative paths resolved against `workingDirectory` via `validateAndNormalizePath` |
| **Rate limits / retries** | None documented; commands run locally |
| **File size limits** | None documented |
| **Resource constraints** | Default command timeout 30s; permissions must be explicitly provided |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes (tool handlers set `isError`) |
| **Error as text** | Yes (stderr included in `content[].text`) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | MCP `InvalidParams`, `MethodNotFound`, `InternalError` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `deno_add`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_add</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Adds dependencies to deno.json (optionally as dev dependencies).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `packages` | `array` | ✅ | — | Packages to add. |
| `dev` | `boolean` | ❌ | `false` | Add as dev dependency. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "packages": ["string"],
  "dev": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Modifies deno.json and Deno cache |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno must be installed; `packages` required |
| **Postconditions** | Updates dependency entries in deno.json |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes Deno CLI with provided permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_add` handler) |

---

### 🔹 Tool: `deno_bench`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_bench</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Deno benchmarks with optional filters and JSON output.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ❌ | — | Benchmark pattern. |
| `filter` | `string` | ❌ | — | Filter benchmarks. |
| `json` | `boolean` | ❌ | `false` | JSON output. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "string",
  "filter": "string",
  "json": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes benchmark code |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno must be installed |
| **Postconditions** | None (output only) |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes arbitrary benchmark code |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_bench` handler) |

---

### 🔹 Tool: `deno_check`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_check</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Type-checks Deno/TypeScript code without executing it.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `array` | ❌ | — | Files to type check. |
| `all` | `boolean` | ❌ | `false` | Check all dependencies. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "files": ["string"],
  "all": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno must be installed |
| **Postconditions** | None |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Reads local files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_check` handler) |

---

### 🔹 Tool: `deno_compile`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_compile</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Compiles a Deno script into a standalone executable.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `script` | `string` | ✅ | — | Script to compile. |
| `output` | `string` | ❌ | — | Output file name. |
| `target` | `string` | ❌ | — | Target platform. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "script": "string",
  "output": "string",
  "target": "string",
  "permissions": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Creates executable files |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno must be installed; `script` required |
| **Postconditions** | Writes output executable |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes Deno CLI with permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`compilationTools`) |
| **Core implementation** | src/tools/compilation.ts (`deno_compile` handler) |

---

### 🔹 Tool: `deno_completions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_completions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates shell completion scripts for Deno.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `shell` | `string` | ❌ | — | Shell type (bash, zsh, fish, powershell, elvish). |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "shell": "bash",
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
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
| **Preconditions** | Deno must be installed |
| **Postconditions** | None |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Outputs shell completion text |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`utilityTools`) |
| **Core implementation** | src/tools/utilities.ts (`deno_completions` handler) |

---

### 🔹 Tool: `deno_coverage`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_coverage</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates test coverage reports in text, HTML, or LCOV formats.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `coverageDir` | `string` | ❌ | — | Coverage directory to analyze. |
| `html` | `boolean` | ❌ | `false` | Generate HTML report. |
| `lcov` | `boolean` | ❌ | `false` | Generate LCOV report. |
| `output` | `string` | ❌ | — | Output file path. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "coverageDir": "string",
  "html": false,
  "lcov": false,
  "output": "string",
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Writes coverage report files when output specified |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Coverage data must exist; Deno installed |
| **Postconditions** | Writes report files if requested |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Reads coverage directory contents |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_coverage` handler) |

---

### 🔹 Tool: `deno_doc`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_doc</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates documentation for Deno modules, optionally as JSON or HTML.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `source` | `string` | ❌ | — | Source file or module. |
| `filter` | `string` | ❌ | — | Filter by symbol name. |
| `json` | `boolean` | ❌ | `false` | JSON output. |
| `html` | `boolean` | ❌ | `false` | HTML output. |
| `output` | `string` | ❌ | — | Output directory for HTML docs. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "source": "string",
  "filter": "string",
  "json": false,
  "html": false,
  "output": "string",
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Writes HTML output when requested |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno must be installed |
| **Postconditions** | Writes output directory if HTML enabled |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Reads local module source |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`compilationTools`) |
| **Core implementation** | src/tools/compilation.ts (`deno_doc` handler) |

---

### 🔹 Tool: `deno_eval`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_eval</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Evaluates TypeScript/JavaScript code directly with optional permissions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Code to evaluate. |
| `print` | `boolean` | ❌ | `false` | Print result. |
| `typescript` | `boolean` | ❌ | `false` | Treat code as TS. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "string",
  "print": false,
  "typescript": false,
  "permissions": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes arbitrary code |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; `code` required |
| **Postconditions** | None (output only) |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes code with specified permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`executionTools`) |
| **Core implementation** | src/tools/execution.ts (`deno_eval` handler) |

---

### 🔹 Tool: `deno_fmt`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_fmt</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Formats code according to Deno standards, optionally in check/diff mode.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `array` | ❌ | — | Files or directories to format. |
| `check` | `boolean` | ❌ | `false` | Check formatting only. |
| `diff` | `boolean` | ❌ | `false` | Show diff output. |
| `singleQuote` | `boolean` | ❌ | `false` | Use single quotes. |
| `indentWidth` | `number` | ❌ | — | Indentation width. |
| `lineWidth` | `number` | ❌ | — | Line width. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "files": ["string"],
  "check": false,
  "diff": false,
  "singleQuote": false,
  "indentWidth": 2,
  "lineWidth": 80,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Modifies files unless `check` is true |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Formats files if not in check mode |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Reads/writes local files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_fmt` handler) |

---

### 🔹 Tool: `deno_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Displays information about modules and dependencies.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `module` | `string` | ❌ | — | Module specifier. |
| `json` | `boolean` | ❌ | `false` | JSON output. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "module": "string",
  "json": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | None |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Reads local cache and module graph |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`compilationTools`) |
| **Core implementation** | src/tools/compilation.ts (`deno_info` handler) |

---

### 🔹 Tool: `deno_init`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_init</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Initializes a new Deno project with optional templates.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ❌ | — | Project name. |
| `lib` | `boolean` | ❌ | `false` | Initialize as library. |
| `serve` | `boolean` | ❌ | `false` | Initialize with server template. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "string",
  "lib": false,
  "serve": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Creates project files |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Writes new project structure |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Writes to local filesystem |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_init` handler) |

---

### 🔹 Tool: `deno_install`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_install</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Installs a Deno script globally or locally.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `script` | `string` | ✅ | — | Script URL or path to install. |
| `global` | `boolean` | ❌ | `false` | Install globally. |
| `name` | `string` | ❌ | — | Installed name. |
| `root` | `string` | ❌ | — | Installation root. |
| `force` | `boolean` | ❌ | `false` | Force install. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "script": "string",
  "global": false,
  "name": "string",
  "root": "string",
  "force": false,
  "permissions": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Installs scripts to local/global locations |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; `script` required |
| **Postconditions** | Writes to installation directory |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes Deno CLI with permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_install` handler) |

---

### 🔹 Tool: `deno_lint`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_lint</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lints code for issues and style violations, with optional auto-fix.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `array` | ❌ | — | Files/directories to lint. |
| `rules` | `array` | ❌ | — | Specific rule tags. |
| `fix` | `boolean` | ❌ | `false` | Auto-fix issues. |
| `json` | `boolean` | ❌ | `false` | JSON output. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "files": ["string"],
  "rules": ["string"],
  "fix": false,
  "json": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Modifies files if `fix` is true |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Writes fixes when enabled |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Reads/writes local files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_lint` handler) |

---

### 🔹 Tool: `deno_outdated`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_outdated</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Checks for outdated dependencies and optionally updates them.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `update` | `boolean` | ❌ | `false` | Update outdated dependencies. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "update": false,
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Updates dependencies when `update` is true |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Updates dependency versions if enabled |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes Deno CLI |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_outdated` handler) |

---

### 🔹 Tool: `deno_remove`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_remove</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Removes dependencies from deno.json.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `packages` | `array` | ✅ | — | Packages to remove. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "packages": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Modifies deno.json |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; `packages` required |
| **Postconditions** | Updates dependency list |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes Deno CLI |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_remove` handler) |

---

### 🔹 Tool: `deno_repl`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_repl</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Starts an interactive Deno REPL session with optional eval and permissions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `eval` | `string` | ❌ | — | Code to evaluate in REPL. |
| `unstable` | `boolean` | ❌ | `false` | Enable unstable APIs. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "eval": "string",
  "unstable": false,
  "permissions": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes REPL session |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | None |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes code with permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`executionTools`) |
| **Core implementation** | src/tools/execution.ts (`deno_repl` handler) |

---

### 🔹 Tool: `deno_run`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_run</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes a Deno script with permissions and runtime options.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `script` | `string` | ✅ | — | Script path to run. |
| `args` | `array` | ❌ | — | Script arguments. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `watch` | `boolean` | ❌ | `false` | Watch mode. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "script": "string",
  "args": ["string"],
  "permissions": ["string"],
  "watch": false,
  "workingDirectory": "string",
  "envVars": {}
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes script with permissions |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; `script` required |
| **Postconditions** | None |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes code with permissions; can access system resources |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`executionTools`) |
| **Core implementation** | src/tools/execution.ts (`deno_run` handler) |

---

### 🔹 Tool: `deno_serve`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_serve</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Starts a Deno HTTP server with optional port/host and permissions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `script` | `string` | ✅ | — | Server script path. |
| `port` | `number` | ❌ | — | Port to listen on. |
| `host` | `string` | ❌ | — | Host to bind. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "script": "string",
  "port": 8000,
  "host": "0.0.0.0",
  "permissions": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Starts a server process |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; `script` required |
| **Postconditions** | Server process runs until terminated |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes server with permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`executionTools`) |
| **Core implementation** | src/tools/execution.ts (`deno_serve` handler) |

---

### 🔹 Tool: `deno_task`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_task</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs a Deno task defined in deno.json (or lists tasks if no task provided).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `task` | `string` | ❌ | — | Task name to run. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "task": "string",
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes task commands |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; task must exist if provided |
| **Postconditions** | Task-specific side effects |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes task command with permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`executionTools`) |
| **Core implementation** | src/tools/execution.ts (`deno_task` handler) |

---

### 🔹 Tool: `deno_test`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_test</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Deno tests with optional coverage and reporting settings.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `pattern` | `string` | ❌ | — | Test pattern. |
| `coverage` | `boolean` | ❌ | `false` | Generate coverage. |
| `parallel` | `boolean` | ❌ | `false` | Run in parallel. |
| `failFast` | `boolean` | ❌ | `false` | Stop on first failure. |
| `filter` | `string` | ❌ | — | Filter tests by name. |
| `permissions` | `array` | ❌ | — | Permissions to grant. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "pattern": "string",
  "coverage": false,
  "parallel": false,
  "failFast": false,
  "filter": "string",
  "permissions": ["string"],
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes test code; may create coverage artifacts |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Coverage output when enabled |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes code with permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_test` handler) |

---

### 🔹 Tool: `deno_types`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_types</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Outputs TypeScript type definitions for the Deno runtime.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `output` | `string` | ❌ | — | Output file path for type definitions. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "output": "string",
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Writes output file when specified |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Writes type definition file if `output` provided |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Writes to local filesystem |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`compilationTools`) |
| **Core implementation** | src/tools/compilation.ts (`deno_types` handler) |

---

### 🔹 Tool: `deno_uninstall`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_uninstall</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Uninstalls a globally installed Deno script.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Script name to uninstall. |
| `global` | `boolean` | ❌ | `false` | Uninstall globally. |
| `root` | `string` | ❌ | — | Installation root. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "name": "string",
  "global": false,
  "root": "string",
  "workingDirectory": "string"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Removes installed scripts |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed; `name` required |
| **Postconditions** | Removes installed script |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Writes to install directories |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_uninstall` handler) |

---

### 🔹 Tool: `deno_upgrade`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_upgrade</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Upgrades Deno to the latest or specified version.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `version` | `string` | ❌ | — | Specific version to upgrade to. |
| `canary` | `boolean` | ❌ | `false` | Upgrade to canary builds. |
| `dryRun` | `boolean` | ❌ | `false` | Show what would be upgraded. |
| `force` | `boolean` | ❌ | `false` | Force upgrade. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "version": "string",
  "canary": false,
  "dryRun": false,
  "force": false
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Updates Deno installation |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno installed |
| **Postconditions** | Updates Deno binary |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Downloads and replaces Deno binaries |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`utilityTools`) |
| **Core implementation** | src/tools/utilities.ts (`deno_upgrade` handler) |

---

### 🔹 Tool: `deno_version`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_version</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Checks whether Deno is installed and returns its version.</td>
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
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
| **Preconditions** | None; returns error if Deno missing |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | Returns local Deno version info |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`utilityTools`) |
| **Core implementation** | src/tools/utilities.ts (`deno_version` handler) |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | HTTP MCP endpoint `/mcp` with SSE streaming; health/metrics endpoints |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `PORT` | ❌ | — | `3000` | HTTP server port (Render) |
| `NODE_ENV` | ❌ | — | `production` | Node environment setting |
| `LOG_LEVEL` | ❌ | — | `info` | Logging verbosity for HTTP server |
| `MCP_SERVER_NAME` | ❌ | — | `deno-mcp-render` | Service name for HTTP status output |
| `DENO_DIR` | ❌ | — | system default | Deno cache directory |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| render.yaml | Render deployment configuration |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| None documented | — |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | npm install -g @sudsarkar13/deno-mcp |
| 2 | Ensure Deno is installed and on PATH |

### 8.2 Typical Run Commands *(optional)*

```bash
# MCP stdio server
deno-mcp

# HTTP server (Render)
node build/render-server.js
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console output to stdout/stderr |
| **Tracing / Metrics** | HTTP metrics endpoint (`/metrics`) |

### 8.4 Performance Considerations *(optional)*

- Commands spawn Deno processes; long-running tasks may hit the default 30s timeout.
- HTTP MCP uses SSE streaming; clients must handle event-stream responses.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 24 |
| **Read-only** | 5 |
| **Write-only** | 7 |
| **Hybrid** | 12 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Tool option coverage | Several CLI flags are supported in code but not surfaced in TOOL_SCHEMAS |
| Line/column indexing | Tool outputs are CLI text; no standardized line/column indexing documented |

---

<div align="center">

*— End of Report —*

</div>
---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/sudsarkar13/deno-mcp |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 0c8b6b41bea0c3ccf2ba2d5ff0fdf35e411f3086 |
| **Commit URL** *(optional)* | https://github.com/sudsarkar13/deno-mcp/commit/0c8b6b41bea0c3ccf2ba2d5ff0fdf35e411f3086 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 1.0.9 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository analysis (stdio + HTTP server, tools, types, docs) |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — path model and operational behaviors inferred from command utilities |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Relative to `workingDirectory` (or CWD), normalized to absolute paths |
| **Line/column indexing** *(required)* | Unknown (Deno CLI outputs) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | direct JSON (`content[]` payloads) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Deno MCP Tools is a comprehensive MCP server that exposes the Deno CLI toolchain to MCP clients. It provides standardized access to execution, formatting, linting, testing, dependency management, compilation, and utility commands through MCP over stdio or HTTP (SSE), enabling AI assistants and IDEs to run Deno workflows securely.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Cline/Claude Dev extension, Claude Desktop, HTTP MCP clients |

### 1.3 Primary Capabilities *(required)*

- [x] Deno execution tools (run, serve, task, repl, eval)
- [x] Development tools (fmt, lint, check, test, bench, coverage)
- [x] Dependency and project management (add/remove/install/outdated/init)
- [x] Compilation and utility tooling (compile/doc/info/types/upgrade/version/completions)
- [x] MCP over stdio and HTTP SSE

### 1.4 Non-Goals / Exclusions *(optional)*

- None documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js >= 18; requires Deno CLI installed (>= 1.40) |
| **Documented integrations** *(optional)* | MCP IDE configs; HTTP endpoint for web clients; Docker images |
| **Notes / constraints** *(optional)* | Deno must be in PATH; permissions must be explicitly granted |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript/JavaScript (Deno runtime) |
| **How to extend** *(optional)* | Use Deno CLI flags and permissions; add new tool handlers in src/tools |

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
| **Runtime** *(required)* | @modelcontextprotocol/sdk |
| **External / System** *(optional)* | Deno CLI, Node.js |
| **Optional** *(optional)* | Docker/Render deployment |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Mixed (local process, Docker, remote Render service) |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (HTTP server / Render) |
| **Env vars used** *(optional)* | Yes (see § 7) |
| **Config files used** *(optional)* | Yes (render.yaml) |
| **CLI flags used** *(optional)* | No |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Deno CLI, Node.js child_process, HTTP/SSE |
| **Architecture notes** *(optional)* | - MCP stdio server dispatches tools to Deno CLI
- Render wrapper provides HTTP MCP endpoint and health/metrics
- Tool handlers share input schemas and command execution helpers |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | Yes |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | Yes |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None documented |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (depends on Deno command, e.g., fmt, add, compile) |
| **Uses local cache** *(optional)* | Yes (Deno cache directory, configurable via DENO_DIR) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes (reads and may modify local project files) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `deno_add` |
| 2 | `deno_bench` |
| 3 | `deno_check` |
| 4 | `deno_compile` |
| 5 | `deno_completions` |
| 6 | `deno_coverage` |
| 7 | `deno_doc` |
| 8 | `deno_eval` |
| 9 | `deno_fmt` |
| 10 | `deno_info` |
| 11 | `deno_init` |
| 12 | `deno_install` |
| 13 | `deno_lint` |
| 14 | `deno_outdated` |
| 15 | `deno_remove` |
| 16 | `deno_repl` |
| 17 | `deno_run` |
| 18 | `deno_serve` |
| 19 | `deno_task` |
| 20 | `deno_test` |
| 21 | `deno_types` |
| 22 | `deno_uninstall` |
| 23 | `deno_upgrade` |
| 24 | `deno_version` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `DenoCommandOptions` | `{ workingDirectory?, permissions?, envVars?, timeout? }` used by most tools |
| `DenoPermissionDescriptor` | Permission names (read/write/net/env/run/ffi/hrtime/sys) |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `DenoCommandResult` | `{ success, stdout, stderr, code, duration }` from command execution |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | relative paths resolved against `workingDirectory` via `validateAndNormalizePath` |
| **Rate limits / retries** | None documented; commands run locally |
| **File size limits** | None documented |
| **Resource constraints** | Default command timeout 30s; permissions must be explicitly provided |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Yes (tool handlers set `isError`) |
| **Error as text** | Yes (stderr included in `content[].text`) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | MCP `InvalidParams`, `MethodNotFound`, `InternalError` |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `deno_add`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_add</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Adds dependencies to deno.json (optionally as dev dependencies).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `packages` | `array` | ✅ | — | Packages to add. |
| `dev` | `boolean` | ❌ | `false` | Add as dev dependency. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "packages": ["std@0.208.0"],
  "dev": false,
  "workingDirectory": "."
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Modifies deno.json and Deno cache |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Deno must be installed; `packages` required |
| **Postconditions** | Updates dependency entries in deno.json |
| **Limits** | Command timeout (default 30s) |
| **Security & privacy** | Executes Deno CLI with provided permissions |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/index.ts (`dependencyTools`) |
| **Core implementation** | src/tools/dependencies.ts (`deno_add` handler) |

---

### 🔹 Tool: `deno_bench`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_bench</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Deno benchmarks with optional filters and JSON output.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `filter` | `string` | ❌ | — | Filter benchmark names. |
| `json` | `boolean` | ❌ | `false` | Output JSON benchmark data. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "filter": "math",
  "json": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes benchmark processes |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/tools/development.ts (`developmentTools`) |
| **Core implementation** | src/tools/development.ts (`deno_bench` handler) |

---

### 🔹 Tool: `deno_check`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_check</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Type-checks TypeScript/JavaScript modules with optional diagnostics.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `array` | ✅ | — | Files or entry points to check. |
| `reload` | `boolean` | ❌ | `false` | Reload cache before checking. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "files": ["main.ts"],
  "reload": false
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None (may download dependencies to cache) |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_compile`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_compile</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Compiles a Deno program into a standalone executable.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `script` | `string` | ✅ | — | Entry script file or URL. |
| `output` | `string` | ❌ | — | Output binary name/path. |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "script": "cli.ts",
  "output": "my-tool",
  "permissions": ["--allow-read"]
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Produces a compiled executable on disk |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_completions`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_completions</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate shell completions for Deno CLI.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `shell` | `string` | ❌ | — | Shell type (bash/zsh/fish/powershell/elvish). |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "shell": "bash"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None (prints completion script) |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `deno_coverage`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_coverage</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate test coverage reports in HTML or LCOV formats.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `coverageDir` | `string` | ❌ | "coverage" | Coverage directory to analyze. |
| `html` | `boolean` | ❌ | `false` | Generate HTML report. |
| `lcov` | `boolean` | ❌ | `false` | Generate LCOV report. |
| `output` | `string` | ❌ | — | Output file path. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "coverageDir": "coverage",
  "html": true,
  "output": "coverage.html"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes coverage artifacts to disk |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_doc`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_doc</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generate documentation for a module with output formats and filters.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file` | `string` | ✅ | — | Entry file path or URL. |
| `json` | `boolean` | ❌ | `false` | Output JSON instead of text. |
| `private` | `boolean` | ❌ | `false` | Include private symbols. |
| `html` | `boolean` | ❌ | `false` | Output HTML documentation. |
| `output` | `string` | ❌ | — | Output file path. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "file": "mod.ts",
  "json": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | Writes output file if specified |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_eval`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_eval</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Evaluate JavaScript/TypeScript code in the Deno runtime.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Code snippet to execute. |
| `print` | `boolean` | ❌ | `false` | Print result to stdout. |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "console.log('hello')",
  "print": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes code with provided permissions |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Non-idempotent |

---

### 🔹 Tool: `deno_fmt`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_fmt</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Format files using Deno's formatter.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `string[]` | ✅ | — | Files or globs to format. |
| `check` | `boolean` | ❌ | `false` | Check formatting without writing. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "files": ["src/**/*.ts"],
  "check": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Rewrites formatted files (unless check) |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `deno_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Inspect module dependencies and type information for files/URLs.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file` | `string` | ✅ | — | File or module URL. |
| `json` | `boolean` | ❌ | `false` | Output JSON format. |
| `includeDeps` | `boolean` | ❌ | `false` | Include dependency tree. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "file": "main.ts",
  "json": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | General Research |
| **Side effects** *(required)* | None (may download deps to cache) |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_init`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_init</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Initialize a new Deno project with starter config.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `dir` | `string` | ❌ | — | Target directory. |
| `framework` | `string` | ❌ | — | Init template (e.g., fresh). |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "dir": "./my-app",
  "framework": "fresh"
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes project files to disk |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_install`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_install</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Install a script as a Deno executable.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `entry` | `string` | ✅ | — | Entry point URL or file. |
| `name` | `string` | ❌ | — | Binary name. |
| `root` | `string` | ❌ | — | Install directory. |
| `force` | `boolean` | ❌ | `false` | Overwrite if exists. |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "entry": "main.ts",
  "name": "my-cli",
  "permissions": ["--allow-net"]
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Installs binaries to disk |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_lint`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_lint</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Run Deno linter with optional rules and output formats.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `string[]` | ✅ | — | Files or globs to lint. |
| `rules` | `string[]` | ❌ | — | Rule selection (include/exclude). |
| `fix` | `boolean` | ❌ | `false` | Apply auto-fixes. |
| `json` | `boolean` | ❌ | `false` | Output JSON format. |
| `compact` | `boolean` | ❌ | `false` | Compact output. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "files": ["src/**/*.ts"],
  "fix": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes fixes when fix enabled |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

---

### 🔹 Tool: `deno_outdated`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_outdated</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Check for outdated dependencies in a Deno project.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `json` | `boolean` | ❌ | `false` | Output JSON format. |
| `workingDirectory` | `string` | ❌ | — | Working directory. |
| `envVars` | `object` | ❌ | — | Environment variables. |
| `timeout` | `number` | ❌ | `30000` | Command timeout. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "json": true
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
  "content": [{"type": "text", "text": "string"}],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Read Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | None (reads deno.json/imports) |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

---

### 🔹 Tool: `deno_remove`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_remove</code></td></tr>
<tr><td><strong>Description</strong></td><td>Remove dependencies from deno.json.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `packages` | `string[]` | ✅ | — | Packages to remove |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "packages": ["@std/path"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Updates deno.json and lock files |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/tools/dependencies.ts `dependencyTools.deno_remove` |
| **Core implementation** | src/tools/dependencies.ts `denoRemove()` |

---

### 🔹 Tool: `deno_repl`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_repl</code></td></tr>
<tr><td><strong>Description</strong></td><td>Start a Deno REPL session (optionally evaluate code).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `eval` | `string` | ❌ | — | Code to evaluate in REPL |
| `unstable` | `boolean` | ❌ | `false` | Enable unstable APIs |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "eval": "Deno.version",
  "unstable": false
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Starts interactive process; executes code |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/tools/execution.ts `executionTools.deno_repl` |
| **Core implementation** | src/tools/execution.ts `denoRepl()` |

---

### 🔹 Tool: `deno_run`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_run</code></td></tr>
<tr><td><strong>Description</strong></td><td>Execute a Deno script with permissions and runtime options.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `script` | `string` | ✅ | — | Path to script |
| `args` | `string[]` | ❌ | `[]` | Script arguments |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions |
| `watch` | `boolean` | ❌ | `false` | Watch mode |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "script": "main.ts",
  "args": ["--flag"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Executes program with permissions |
| **Determinism** | Depends |
| **Idempotency** | Non-idempotent |

---

### 🔹 Tool: `deno_serve`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_serve</code></td></tr>
<tr><td><strong>Description</strong></td><td>Serve a Deno module over HTTP.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file` | `string` | ✅ | — | Entry module to serve |
| `port` | `number` | ❌ | `8000` | Port to listen on |
| `host` | `string` | ❌ | — | Host to bind |
| `watch` | `boolean` | ❌ | `false` | Restart on file changes |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "file": "main.ts",
  "port": 8000,
  "watch": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Starts HTTP server for module |
| **Determinism** | Depends |
| **Idempotency** | Non-idempotent |

---

### 🔹 Tool: `deno_task`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_task</code></td></tr>
<tr><td><strong>Description</strong></td><td>Run a named task from deno.json scripts.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `task` | `string` | ✅ | — | Task name to run |
| `args` | `string[]` | ❌ | `[]` | Arguments passed to task |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "task": "dev",
  "args": ["--unstable"]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Runs task command |
| **Determinism** | Depends |
| **Idempotency** | Non-idempotent |

---

### 🔹 Tool: `deno_test`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_test</code></td></tr>
<tr><td><strong>Description</strong></td><td>Run Deno tests with filters and coverage options.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `files` | `string[]` | ❌ | — | Test files or globs |
| `filter` | `string` | ❌ | — | Test name filter |
| `shuffle` | `boolean` | ❌ | `false` | Randomize test order |
| `concurrency` | `number` | ❌ | — | Max parallel tests |
| `coverage` | `boolean` | ❌ | `false` | Collect coverage data |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "filter": "my test",
  "coverage": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Executes tests and writes coverage data |
| **Determinism** | Depends |
| **Idempotency** | Non-idempotent |

---

### 🔹 Tool: `deno_types`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_types</code></td></tr>
<tr><td><strong>Description</strong></td><td>Print TypeScript type definitions used by Deno.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `lib` | `string` | ❌ | — | Comma-separated lib names |
| `unstable` | `boolean` | ❌ | `false` | Include unstable APIs |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "lib": "dom,dom.iterable",
  "unstable": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |
| **Determinism** | Deterministic |
| **Idempotency** | Idempotent |

---

### 🔹 Tool: `deno_uninstall`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_uninstall</code></td></tr>
<tr><td><strong>Description</strong></td><td>Remove a previously installed Deno executable.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Executable name |
| `workingDirectory` | `string` | ❌ | — | Working directory |
| `envVars` | `object` | ❌ | — | Environment variables |
| `timeout` | `number` | ❌ | `30000` | Command timeout |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "name": "my-cli"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Deletes installed binary |
| **Determinism** | Deterministic |
| **Idempotency** | Depends |

---

### 🔹 Tool: `deno_upgrade`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>deno_upgrade</code></td></tr>
<tr><td><strong>Description</strong></td><td>Upgrade Deno to latest or specified version.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `version` | `string` | ❌ | — | Version to install (default latest) |
| `permissions` | `string[]` | ❌ | `[]` | Deno permissions |
| `workingDirectory` | `string` | ❌ | — | Working directory |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "version": "1.41.0"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Updates Deno installation |
| **Determinism** | Depends |
| **Idempotency** | Depends |

---

### 🔹 Tool: `deno_version`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>deno_version</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Checks whether Deno is installed and returns its version.</td>
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
  "content": [{ "type": "text", "text": "string" }],
  "isError": false
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
| **Preconditions** | None; returns error if Deno missing |
| **Postconditions** | None |
| **Limits** | None documented |
| **Security & privacy** | Returns local Deno version info |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | None documented |
| **Other RPC endpoints** *(optional)* | HTTP MCP endpoint `/mcp` with SSE streaming; health/metrics endpoints |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `PORT` | ❌ | — | `3000` | HTTP server port (Render) |
| `NODE_ENV` | ❌ | — | `production` | Node environment setting |
| `LOG_LEVEL` | ❌ | — | `info` | Logging verbosity for HTTP server |
| `MCP_SERVER_NAME` | ❌ | — | `deno-mcp-render` | Service name for HTTP status output |
| `DENO_DIR` | ❌ | — | system default | Deno cache directory |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| render.yaml | Render deployment configuration |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| None documented | — |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | npm install -g @sudsarkar13/deno-mcp |
| 2 | Ensure Deno is installed and on PATH |

### 8.2 Typical Run Commands *(optional)*

```bash
# MCP stdio server
deno-mcp

# HTTP server (Render)
node build/render-server.js
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console output to stdout/stderr |
| **Tracing / Metrics** | HTTP metrics endpoint (`/metrics`) |

### 8.4 Performance Considerations *(optional)*

- Commands spawn Deno processes; long-running tasks may hit the default 30s timeout.
- HTTP MCP uses SSE streaming; clients must handle event-stream responses.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 24 |
| **Read-only** | 5 |
| **Write-only** | 7 |
| **Hybrid** | 12 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Tool option coverage | Several CLI flags are supported in code but not surfaced in TOOL_SCHEMAS |
| Line/column indexing | Tool outputs are CLI text; no standardized line/column indexing documented |

---

<div align="center">

*— End of Report —*

</div>

