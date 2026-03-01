<div align="center">

# 📋 MCP Server Report

## MCP Code Executor Server
### [mouadenna/mcp-code-executor-server](https://github.com/mouadenna/mcp-code-executor-server)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/mouadenna/mcp-code-executor-server |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 61bc099e44bbeecc8c54090c48c4241c73493334 |
| **Commit URL** *(optional)* | https://github.com/mouadenna/mcp-code-executor-server/commit/61bc099e44bbeecc8c54090c48c4241c73493334 |
| **License** *(required)* | MIT License |
| **Version** *(optional)* | 0.0.1-SNAPSHOT |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository at commit 61bc099e44bbeecc8c54090c48c4241c73493334 |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — MCP output envelope is inferred from Spring AI MCP defaults |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | absolute (temporary execution files use absolute OS paths) |
| **Line/column indexing** *(required)* | Unknown (no position-based APIs observed) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string (Spring AI MCP server default; inferred) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

This project is a Spring Boot–based MCP server that exposes a single code-execution tool for AI agents. Clients submit source code and a language identifier, the server runs the code in a local sandbox-like process with compilation steps for compiled languages, then returns the captured output or error details. It is intended as a unified MCP endpoint for multi-language code execution with timeouts and temporary file cleanup.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | MCP-compatible AI client (generic) |

### 1.3 Primary Capabilities *(required)*

- [x] Execute code snippets in multiple languages (Java, Python, JavaScript, TypeScript, C++).
- [x] Compile-and-run workflow for Java, C++, and TypeScript.
- [x] Return stdout and error output with basic timeouts and cleanup.

### 1.4 Non-Goals / Exclusions *(optional)*

- No explicit non-goals documented.

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Runs on platforms that support Java 17+ and the required language runtimes/compilers. |
| **Documented integrations** *(optional)* | MCP-compatible clients (generic). |
| **Notes / constraints** *(optional)* | Requires local language runtimes (Python, Node.js, Java JDK) and a C++ compiler. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Java, Python, JavaScript, TypeScript, C++ |
| **How to extend** *(optional)* | Add a new language configuration in `CodeExecutionService` and provide a `ProcessBuilder` + optional preparation step. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License (2025 Mouad En-nasiry). |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Java |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | Java 17+, Spring Boot 3.4.x, Spring AI MCP server WebFlux starter |
| **External / System** *(optional)* | Python 3.8+, Node.js + npm (npx/ts-node), Java JDK tools (javac), C++ compiler (g++/clang++), filesystem access |
| **Optional** *(optional)* | Docker, Docker Compose |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Mixed (local process or Docker container) |
| **Started by MCP client** *(required)* | No |
| **Started independently** *(optional)* | Yes |
| **Env vars used** *(optional)* | Yes (see § 7: `TS_NODE_PATH`) |
| **Config files used** *(optional)* | Yes (src/main/resources/application.properties) |
| **CLI flags used** *(optional)* | No |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | Spring AI MCP Server (WebFlux), Spring Boot |
| **Architecture notes** *(optional)* | - `@Tool`-annotated method in `CodeExecutionService` registered via `MethodToolCallbackProvider`.\
- Uses temporary files and `ProcessBuilder` for language execution.\
- Enforces a 15-second execution timeout and deletes temp directories. |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | No |
| `http` / `streamable-http` *(optional)* | Yes |
| `sse` *(optional)* | No |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | No |
| **Mechanism** *(optional)* | none |
| **Secrets / Env vars** *(optional)* | None |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (temporary code files in OS temp directory) |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | No (temporary files are deleted after execution) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `executeCode` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ExecuteCodeRequest` | JSON object with `language` and `code` fields, both strings. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `ExecutionResult` | Plain text output string containing stdout or error text. |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | absolute (temp directory paths are created and deleted internally) |
| **Rate limits / retries** | Not documented |
| **File size limits** | Not documented |
| **Resource constraints** | 15-second execution timeout; compilation timeouts for Java/C++ (30 seconds) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (error messages returned as plain text) |
| **Error as `{ error: string }`** | No |
| **Common error codes** | Not documented |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `executeCode`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>executeCode</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Executes a code snippet in the requested language and returns stdout or error output as text. This tool performs optional compilation for Java, C++, and TypeScript before running the program. The README refers to this as the “code-execution” tool.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ✅ | — | Programming language identifier: `java`, `python`, `javascript`, `typescript`, or `cpp`. |
| `code` | `string` | ✅ | — | Source code to compile and/or execute. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "language": "python",
  "code": "print('Hello, world!')"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | text |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```text
<stdout or error text>
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Creates temporary files, spawns OS processes, and executes user-provided code. |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Required runtime tools must be installed (Python, Node.js, JDK, C++ compiler). |
| **Postconditions** | Temporary files are deleted after execution. |
| **Limits** | 15-second execution timeout; compilation timeout up to 30 seconds for Java/C++. |
| **Security & privacy** | Executes untrusted code on the host; should be isolated (e.g., containerized) for safety. |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/main/java/org/springframework/ai/mcp/sample/server/McpServerApplication.java — `codeExecutionTools` bean |
| **Core implementation** | src/main/java/org/springframework/ai/mcp/sample/server/CodeExecutionService.java — `executeCode` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | None documented beyond MCP HTTP server endpoints. |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `TS_NODE_PATH` | ❌ | — | — | Optional override for the `ts-node` executable used for TypeScript execution. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| src/main/resources/application.properties | MCP server settings, logging, and Spring Boot configuration. |

<details>
<summary><strong>Example Config</strong></summary>

```properties
spring.main.banner-mode=off
spring.ai.mcp.server.name=my-weather-server
spring.ai.mcp.server.version=0.0.1
logging.file.name=./model-context-protocol/weather/starter-webflux-server/target/starter-webflux-server.log
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| None | No CLI flags are documented. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install Java 17+, Python 3.8+, Node.js + npm, and a C++ compiler. |
| 2 | ./mvnw clean package |

### 8.2 Typical Run Commands *(optional)*

```bash
./mvnw spring-boot:run
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Spring Boot logging; file path configured in application.properties. |
| **Tracing / Metrics** | None documented. |

### 8.4 Performance Considerations *(optional)*

- Compilation steps for Java/C++/TypeScript add startup latency.
- Execution timeout is 15 seconds per request; long-running code is terminated.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 1 |
| **Read-only** | 0 |
| **Write-only** | 0 |
| **Hybrid** | 1 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Exact MCP output envelope | Handled by Spring AI MCP server; response envelope not shown in this repo. |
| Transport details for SSE/stdio | Dependency is WebFlux; stdio/SSE support not documented in this repo. |

---

<div align="center">

*— End of Report —*

</div>

---
