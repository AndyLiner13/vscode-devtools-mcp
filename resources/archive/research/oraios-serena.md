<div align="center">

# 📋 MCP Server Report

## Serena
### [oraios/serena](https://github.com/oraios/serena)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/oraios/serena |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 1e68e2c1c6d795481aab7caf455c2aaa84f79bac |
| **Commit URL** *(optional)* | https://github.com/oraios/serena/commit/1e68e2c1c6d795481aab7caf455c2aaa84f79bac |
| **License** *(required)* | MIT License |
| **Version** *(optional)* | 0.1.4 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (Serena MCP server and toolchain) |
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
| **Path model** *(required)* | Relative paths are relative to active project root |
| **Line/column indexing** *(required)* | 0-based (file edit tools); other tools use LSP conventions |
| **Encoding model** *(optional)* | UTF-8 bytes |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | content[].text JSON string |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

Serena is a coding-agent toolkit that exposes IDE-like semantic code retrieval and editing tools via MCP. It can integrate with language servers or a JetBrains plugin backend to provide symbol-aware operations, file editing, project memory, and workflow guidance for coding agents and LLM clients.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Code, Claude Desktop, Codex, Gemini-CLI, VS Code, Cursor, IntelliJ, OpenWebUI, Jan, Agno |

### 1.3 Primary Capabilities *(required)*

- [x] Semantic symbol search/edit operations via LSP or JetBrains backend
- [x] Project-aware file editing and pattern search tools
- [x] Workflow tooling (onboarding, modes, instructions, summaries)

### 1.4 Non-Goals / Exclusions *(optional)*

- Interactive agent capabilities are provided by external LLMs, not Serena itself

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Python 3.11 runtime; supports stdio and HTTP/SSE transports via MCP server. |
| **Documented integrations** *(optional)* | Claude Code, Claude Desktop, Codex, JetBrains plugin, VS Code, Cursor |
| **Notes / constraints** *(optional)* | Some language servers require extra dependencies; JetBrains backend requires plugin. |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | 30+ languages via LSP (C/C++, Python, Java, TS, etc.); JetBrains backend supports IDE language coverage |
| **How to extend** *(optional)* | Add new language server configs or use JetBrains backend with supported IDEs. |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT License |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | mcp (Python SDK), pydantic, requests, flask, solidlsp (LSP tooling) |
| **External / System** *(optional)* | Language servers per language; JetBrains IDE + plugin (optional) |
| **Optional** *(optional)* | anthropic, agno, google-genai (integration extras) |
| **Paid services / Tokens** *(required)* | None required; optional API keys for LLM integrations |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process (or Docker) |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (CLI start) |
| **Env vars used** *(optional)* | Yes (API keys, optional) |
| **Config files used** *(optional)* | Yes (Serena config/project files) |
| **CLI flags used** *(optional)* | Yes (`serena start-mcp-server` options) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | LSP (via solidlsp), JetBrains plugin backend, MCP Python SDK |
| **Architecture notes** *(optional)* | - FastMCP server constructs tools from Serena Tool classes
- Tool registry discovers subclasses and exposes them via MCP
- Language backends (LSP/JetBrains) provide symbol operations |

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
| **Secrets / Env vars** *(optional)* | GOOGLE_API_KEY, ANTHROPIC_API_KEY (optional) |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | Yes (editing tools, memories, backups) |
| **Uses local cache** *(optional)* | Yes (LSP caches) |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes (reads/writes project files, stores memories) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `activate_project` |
| 2 | `check_onboarding_performed` |
| 3 | `create_text_file` |
| 4 | `delete_lines` |
| 5 | `delete_memory` |
| 6 | `edit_memory` |
| 7 | `execute_shell_command` |
| 8 | `find_file` |
| 9 | `find_referencing_symbols` |
|10 | `find_symbol` |
|11 | `get_current_config` |
|12 | `get_symbols_overview` |
|13 | `initial_instructions` |
|14 | `insert_after_symbol` |
|15 | `insert_at_line` |
|16 | `insert_before_symbol` |
|17 | `jetbrains_find_referencing_symbols` |
|18 | `jetbrains_find_symbol` |
|19 | `jetbrains_get_symbols_overview` |
|20 | `jetbrains_type_hierarchy` |
|21 | `list_dir` |
|22 | `list_memories` |
|23 | `onboarding` |
|24 | `open_dashboard` |
|25 | `prepare_for_new_conversation` |
|26 | `read_file` |
|27 | `read_memory` |
|28 | `remove_project` |
|29 | `rename_symbol` |
|30 | `replace_content` |
|31 | `replace_lines` |
|32 | `replace_symbol_body` |
|33 | `restart_language_server` |
|34 | `search_for_pattern` |
|35 | `summarize_changes` |
|36 | `switch_modes` |
|37 | `think_about_collected_information` |
|38 | `think_about_task_adherence` |
|39 | `think_about_whether_you_are_done` |
|40 | `write_memory` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `RelativePath` | Path relative to active project root. |
| `MaxAnswerChars` | Character limit for tool output; -1 uses default from config. |
| `NamePath` | Symbol name path (e.g., `Class/method`) used by symbol tools. |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `JsonText` | JSON string returned as tool output text. |
| `StatusText` | Human-readable status message (e.g., `OK`). |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | Project-relative path validation for file tools |
| **Rate limits / retries** | Not documented; LSP retries may occur on failure |
| **File size limits** | Outputs limited by `max_answer_chars` and config defaults |
| **Resource constraints** | Tool execution timeout configurable (`tool_timeout`) |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Yes (errors returned as strings) |
| **Error as `{ error: string }`** | Sometimes (JSON error objects for list_dir) |
| **Common error codes** | File not found, tool not active, language server errors |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `activate_project`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>activate_project</code></td></tr>
<tr><td><strong>Description</strong></td><td>Activates a project by name or path and loads its Serena configuration.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project` | `string` | ✅ | — | Project name or path to activate. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "project": "/path/to/project" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Project activated..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Changes active project state |

#### 🔗 Implementation Anchors
| Field | Value |
|:------|:------|
| **Entry point / registration** | src/serena/tools/config_tools.py (`ActivateProjectTool`) |
| **Core implementation** | src/serena/tools/config_tools.py (`ActivateProjectTool.apply`) |

---

### 🔹 Tool: `check_onboarding_performed`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>check_onboarding_performed</code></td></tr>
<tr><td><strong>Description</strong></td><td>Checks whether project onboarding has been performed by inspecting memories.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Onboarding not performed yet..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `create_text_file`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>create_text_file</code></td></tr>
<tr><td><strong>Description</strong></td><td>Creates or overwrites a file in the project directory.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | Project-relative path for the file. |
| `content` | `string` | ✅ | — | Content to write. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "notes.md", "content": "Hello" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "File created: notes.md." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Writes/overwrites files |

---

### 🔹 Tool: `delete_lines`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>delete_lines</code></td></tr>
<tr><td><strong>Description</strong></td><td>Deletes a range of lines in a file.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | Project-relative file path. |
| `start_line` | `integer` | ✅ | — | 0-based start line index. |
| `end_line` | `integer` | ✅ | — | 0-based end line index (inclusive). |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "start_line": 10, "end_line": 12 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Deletes file content |

---

### 🔹 Tool: `delete_memory`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>delete_memory</code></td></tr>
<tr><td><strong>Description</strong></td><td>Deletes a memory entry from the project memory store.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `memory_file_name` | `string` | ✅ | — | Memory name to delete. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "memory_file_name": "onboarding.md" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Deleted memory..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Removes memory file |

---

### 🔹 Tool: `edit_memory`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>edit_memory</code></td></tr>
<tr><td><strong>Description</strong></td><td>Replaces content inside a memory using literal or regex matching.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `memory_file_name` | `string` | ✅ | — | Memory to edit. |
| `needle` | `string` | ✅ | — | Literal or regex pattern to match. |
| `repl` | `string` | ✅ | — | Replacement text. |
| `mode` | `string` | ✅ | — | `literal` or `regex`. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "memory_file_name": "onboarding.md", "needle": "foo", "repl": "bar", "mode": "literal" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Updates memory file |

---

### 🔹 Tool: `execute_shell_command`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>execute_shell_command</code></td></tr>
<tr><td><strong>Description</strong></td><td>Executes a shell command in the project context and returns stdout/stderr.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `command` | `string` | ✅ | — | Shell command to execute. |
| `cwd` | `string` | ❌ | project root | Working directory. |
| `capture_stderr` | `boolean` | ❌ | `true` | Include stderr in output. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output size limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "command": "ls", "cwd": ".", "capture_stderr": true }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"stdout\": ...}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Executes external commands |

---

### 🔹 Tool: `find_file`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_file</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds files matching a mask within a directory.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_mask` | `string` | ✅ | — | Filename or glob mask (e.g., `*.py`). |
| `relative_path` | `string` | ✅ | — | Directory path to search. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "file_mask": "*.ts", "relative_path": "src" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"files\":[...]}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |

---

### 🔹 Tool: `find_referencing_symbols`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_referencing_symbols</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds symbols that reference a given symbol using the language server backend.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Symbol name path to find references for. |
| `relative_path` | `string` | ✅ | — | File containing the symbol. |
| `include_info` | `boolean` | ❌ | `false` | Include hover info for referencing symbols. |
| `include_kinds` | `array` | ❌ | `[]` | LSP symbol kinds to include. |
| `exclude_kinds` | `array` | ❌ | `[]` | LSP symbol kinds to exclude. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output size limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "MyClass/my_method", "relative_path": "src/app.py" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "[{...references...}]" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `find_symbol`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>find_symbol</code></td></tr>
<tr><td><strong>Description</strong></td><td>Searches for symbols by name path using the language server backend.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path_pattern` | `string` | ✅ | — | Name path pattern to search for. |
| `depth` | `integer` | ❌ | `0` | Descendant depth to include. |
| `relative_path` | `string` | ❌ | `""` | Restrict search to path. |
| `include_body` | `boolean` | ❌ | `false` | Include symbol body. |
| `include_info` | `boolean` | ❌ | `false` | Include symbol hover info. |
| `include_kinds` | `array` | ❌ | `[]` | LSP kinds to include. |
| `exclude_kinds` | `array` | ❌ | `[]` | LSP kinds to exclude. |
| `substring_matching` | `boolean` | ❌ | `false` | Substring match on last element. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output size limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path_pattern": "MyClass/my_method", "depth": 1 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "[{...symbols...}]" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `get_current_config`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_current_config</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns current Serena configuration including projects, tools, contexts, and modes.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Current config..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `get_symbols_overview`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>get_symbols_overview</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns a compact overview of top-level symbols in a file using LSP.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | File path to inspect. |
| `depth` | `integer` | ❌ | `0` | Descendant depth. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output size limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "depth": 1 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"Function\":[...]}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `initial_instructions`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>initial_instructions</code></td></tr>
<tr><td><strong>Description</strong></td><td>Returns the Serena instructions manual for clients that do not read system prompts.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Serena Instructions Manual..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `insert_after_symbol`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>insert_after_symbol</code></td></tr>
<tr><td><strong>Description</strong></td><td>Inserts content after a symbol definition via language server coordinates.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Name path of the symbol. |
| `relative_path` | `string` | ✅ | — | File containing the symbol. |
| `body` | `string` | ✅ | — | Content to insert after symbol. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "MyClass", "relative_path": "src/app.py", "body": "\nclass NewClass: pass\n" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Semantic Research |
| **Side effects** | Inserts code into file |

---

### 🔹 Tool: `insert_at_line`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>insert_at_line</code></td></tr>
<tr><td><strong>Description</strong></td><td>Inserts content at a specific line index in a file.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | File path. |
| `line` | `integer` | ✅ | — | 0-based line index. |
| `content` | `string` | ✅ | — | Content to insert. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "line": 5, "content": "print('hello')\n" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Inserts text into file |

---

### 🔹 Tool: `insert_before_symbol`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>insert_before_symbol</code></td></tr>
<tr><td><strong>Description</strong></td><td>Inserts content before a symbol definition using language server coordinates.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Name path of the symbol. |
| `relative_path` | `string` | ✅ | — | File containing the symbol. |
| `body` | `string` | ✅ | — | Content to insert before symbol. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "MyClass", "relative_path": "src/app.py", "body": "\nimport os\n" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Semantic Research |
| **Side effects** | Inserts code into file |

---

### 🔹 Tool: `jetbrains_find_referencing_symbols`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>jetbrains_find_referencing_symbols</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds references using the JetBrains backend (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Symbol name path. |
| `relative_path` | `string` | ✅ | — | File containing the symbol. |
| `include_info` | `boolean` | ❌ | `false` | Include extra info. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "MyClass/my_method", "relative_path": "src/app.py" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "[{...references...}]" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `jetbrains_find_symbol`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>jetbrains_find_symbol</code></td></tr>
<tr><td><strong>Description</strong></td><td>Finds symbols using the JetBrains backend (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path_pattern` | `string` | ✅ | — | Symbol name path pattern. |
| `depth` | `integer` | ❌ | `0` | Descendant depth. |
| `relative_path` | `string` | ❌ | `null` | Restrict search path. |
| `include_body` | `boolean` | ❌ | `false` | Include symbol body. |
| `include_info` | `boolean` | ❌ | `false` | Include documentation/quick info. |
| `search_deps` | `boolean` | ❌ | `false` | Include project dependencies. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path_pattern": "MyClass", "depth": 1 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "[{...symbols...}]" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `jetbrains_get_symbols_overview`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>jetbrains_get_symbols_overview</code></td></tr>
<tr><td><strong>Description</strong></td><td>Gets a symbol overview for a file using the JetBrains backend (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | File path to inspect. |
| `depth` | `integer` | ❌ | `0` | Descendant depth. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |
| `include_file_documentation` | `boolean` | ❌ | `false` | Include file docstring. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "depth": 1 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"symbols\":{...}}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `jetbrains_type_hierarchy`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>jetbrains_type_hierarchy</code></td></tr>
<tr><td><strong>Description</strong></td><td>Retrieves type hierarchy (super/sub types) using JetBrains backend (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Symbol name path. |
| `relative_path` | `string` | ✅ | — | File path. |
| `hierarchy_type` | `string` | ❌ | `both` | `super`, `sub`, or `both`. |
| `depth` | `integer` | ❌ | `1` | Depth limit. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "BaseClass", "relative_path": "src/app.py", "hierarchy_type": "both" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"supertypes\":...,\"subtypes\":...}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Semantic Research |
| **Side effects** | None |

---

### 🔹 Tool: `list_dir`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>list_dir</code></td></tr>
<tr><td><strong>Description</strong></td><td>Lists directory contents, optionally recursively.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | Directory to list. |
| `recursive` | `boolean` | ✅ | — | Whether to recurse. |
| `skip_ignored_files` | `boolean` | ❌ | `false` | Skip ignored files/dirs. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": ".", "recursive": false }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"dirs\":[...],\"files\":[...]}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |

---

### 🔹 Tool: `list_memories`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>list_memories</code></td></tr>
<tr><td><strong>Description</strong></td><td>Lists available memory entries for the project.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "[\"onboarding.md\", ...]" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `onboarding`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>onboarding</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates onboarding instructions for gathering project context.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Onboarding instructions..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `open_dashboard`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>open_dashboard</code></td></tr>
<tr><td><strong>Description</strong></td><td>Opens the Serena web dashboard in the default browser (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Serena web dashboard has been opened..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Opens browser |

---

### 🔹 Tool: `prepare_for_new_conversation`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>prepare_for_new_conversation</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides instructions for preparing context to continue in a new conversation.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Prepare for new conversation..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `read_file`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>read_file</code></td></tr>
<tr><td><strong>Description</strong></td><td>Reads a file or a line range from the project.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | File path. |
| `start_line` | `integer` | ❌ | `0` | 0-based start line. |
| `end_line` | `integer` | ❌ | `null` | 0-based end line (inclusive). |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "start_line": 0, "end_line": 20 }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "def main():..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |

---

### 🔹 Tool: `read_memory`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>read_memory</code></td></tr>
<tr><td><strong>Description</strong></td><td>Reads a named memory from the project memory store.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `memory_file_name` | `string` | ✅ | — | Memory name to read. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "memory_file_name": "onboarding.md" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Memory content..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `remove_project`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>remove_project</code></td></tr>
<tr><td><strong>Description</strong></td><td>Removes a project from Serena configuration (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `project_name` | `string` | ✅ | — | Project name to remove. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "project_name": "my-project" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Successfully removed project..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Updates config |

---

### 🔹 Tool: `rename_symbol`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>rename_symbol</code></td></tr>
<tr><td><strong>Description</strong></td><td>Renames a symbol across the codebase using the language server backend.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Symbol name path. |
| `relative_path` | `string` | ✅ | — | File containing the symbol. |
| `new_name` | `string` | ✅ | — | New symbol name. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "MyClass/my_method", "relative_path": "src/app.py", "new_name": "new_method" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Rename completed" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Semantic Research |
| **Side effects** | Refactors codebase |

---

### 🔹 Tool: `replace_content`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>replace_content</code></td></tr>
<tr><td><strong>Description</strong></td><td>Replaces content in a file using literal or regex matching.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | File path. |
| `needle` | `string` | ✅ | — | String/regex to replace. |
| `repl` | `string` | ✅ | — | Replacement text. |
| `mode` | `string` | ✅ | — | `literal` or `regex`. |
| `allow_multiple_occurrences` | `boolean` | ❌ | `false` | Replace multiple matches. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "needle": "foo", "repl": "bar", "mode": "literal" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Modifies file content |

---

### 🔹 Tool: `replace_lines`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>replace_lines</code></td></tr>
<tr><td><strong>Description</strong></td><td>Replaces a range of lines with new content.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `relative_path` | `string` | ✅ | — | File path. |
| `start_line` | `integer` | ✅ | — | 0-based start line. |
| `end_line` | `integer` | ✅ | — | 0-based end line. |
| `content` | `string` | ✅ | — | Replacement content. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "relative_path": "src/app.py", "start_line": 1, "end_line": 2, "content": "print('hi')\n" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Modifies file content |

---

### 🔹 Tool: `replace_symbol_body`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>replace_symbol_body</code></td></tr>
<tr><td><strong>Description</strong></td><td>Replaces the body of a symbol using the language server backend.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name_path` | `string` | ✅ | — | Symbol name path. |
| `relative_path` | `string` | ✅ | — | File containing the symbol. |
| `body` | `string` | ✅ | — | New symbol body. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "name_path": "MyClass/my_method", "relative_path": "src/app.py", "body": "def my_method(): pass" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Semantic Research |
| **Side effects** | Modifies code symbols |

---

### 🔹 Tool: `restart_language_server`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>restart_language_server</code></td></tr>
<tr><td><strong>Description</strong></td><td>Restarts the language server backend (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "OK" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Restarts language server |

---

### 🔹 Tool: `search_for_pattern`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>search_for_pattern</code></td></tr>
<tr><td><strong>Description</strong></td><td>Searches for regex patterns across project files with flexible filters.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `substring_pattern` | `string` | ✅ | — | Regex pattern to search for. |
| `context_lines_before` | `integer` | ❌ | `0` | Lines before match. |
| `context_lines_after` | `integer` | ❌ | `0` | Lines after match. |
| `paths_include_glob` | `string` | ❌ | `""` | Glob for files to include. |
| `paths_exclude_glob` | `string` | ❌ | `""` | Glob for files to exclude. |
| `relative_path` | `string` | ❌ | `""` | Restrict search to subpath. |
| `restrict_search_to_code_files` | `boolean` | ❌ | `false` | Only search code files. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Output limit. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "substring_pattern": "TODO", "relative_path": "src" }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "{\"file.py\":[...]}" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | General Research |
| **Side effects** | None |

---

### 🔹 Tool: `summarize_changes`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>summarize_changes</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides instructions for summarizing code changes (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Summarize changes..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `switch_modes`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>switch_modes</code></td></tr>
<tr><td><strong>Description</strong></td><td>Activates a list of Serena modes (optional).</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `modes` | `array` | ✅ | — | List of mode names to activate. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "modes": ["editing", "planning"] }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Active modes: editing, planning..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Changes active modes/tools |

---

### 🔹 Tool: `think_about_collected_information`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>think_about_collected_information</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides a prompt to assess completeness of collected information.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Think about collected information..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `think_about_task_adherence`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>think_about_task_adherence</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides a prompt to verify adherence to the current task.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Think about task adherence..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `think_about_whether_you_are_done`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>think_about_whether_you_are_done</code></td></tr>
<tr><td><strong>Description</strong></td><td>Provides a prompt to confirm whether the task is complete.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| (none) | — | — | — | No parameters. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{}
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Think about whether you are done..." }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Read Only |
| **Classification** | Other |
| **Side effects** | None |

---

### 🔹 Tool: `write_memory`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>write_memory</code></td></tr>
<tr><td><strong>Description</strong></td><td>Writes a named memory entry to the project memory store.</td></tr>
</table>

#### ⬇️ Inputs
| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `memory_file_name` | `string` | ✅ | — | Memory name to write. |
| `content` | `string` | ✅ | — | Memory content. |
| `max_answer_chars` | `integer` | ❌ | `-1` | Max content length. |

<details><summary><strong>Example Input Schema</strong></summary>

```json
{ "memory_file_name": "onboarding.md", "content": "Project overview..." }
```
</details>

#### ⬆️ Outputs
| Field | Value |
|:------|:------|
| **Format** | text |

<details><summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "Memory saved" }] }
```
</details>

#### 🧠 Semantics
| Field | Value |
|:------|:------|
| **Read / Write** | Write Only |
| **Classification** | Other |
| **Side effects** | Writes memory file |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None documented |
| **MCP prompts exposed** *(optional)* | System prompt via `initial_instructions` |
| **Other RPC endpoints** *(optional)* | None |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `GOOGLE_API_KEY` | ❌ | 🔒 | — | Optional Google GenAI integration key. |
| `ANTHROPIC_API_KEY` | ❌ | 🔒 | — | Optional Anthropic integration key. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| .serena/project.yml | Project-specific Serena configuration. |
| .serena/*.yml | Custom modes/contexts and settings. |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `serena start-mcp-server --transport` | Select stdio/sse/streamable-http transport. |
| `--host`, `--port` | Bind host/port for HTTP/SSE. |
| `--project`, `--project-from-cwd` | Project selection and auto-detection. |
| `--context`, `--mode`, `--language-backend` | Context/mode/backend configuration. |
| `--enable-web-dashboard`, `--open-web-dashboard`, `--enable-gui-log-window` | Dashboard and GUI logging options. |
| `--log-level`, `--trace-lsp-communication`, `--tool-timeout` | Logging and tool runtime tuning. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install uv and run `uvx --from git+https://github.com/oraios/serena serena start-mcp-server --help`. |
| 2 | Configure MCP client to launch `serena start-mcp-server` with desired options. |

### 8.2 Typical Run Commands *(optional)*

```bash
serena start-mcp-server --transport stdio
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Stderr + log file via SerenaPaths (mcp logs) |
| **Tracing / Metrics** | LSP trace optional via CLI flag |

### 8.4 Performance Considerations *(optional)*

- LSP-backed tools can be slower on large codebases or when language servers restart.
- Tool outputs are capped by `max_answer_chars` and tool timeout settings.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 40 |
| **Read-only** | 22 |
| **Write-only** | 12 |
| **Hybrid** | 6 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| None | No known gaps at the time of review. |

---

<div align="center">

*— End of Report —*

</div>
