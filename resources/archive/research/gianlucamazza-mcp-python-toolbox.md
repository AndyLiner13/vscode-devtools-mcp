<div align="center">

# 📋 MCP Server Report

## MCP Python Toolbox
### [gianlucamazza/mcp_python_toolbox](https://github.com/gianlucamazza/mcp_python_toolbox)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/gianlucamazza/mcp_python_toolbox |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | f2896087cfceba50ac4cb7b34e13c7c49f914381 |
| **Commit URL** *(optional)* | https://github.com/gianlucamazza/mcp_python_toolbox/commit/f2896087cfceba50ac4cb7b34e13c7c49f914381 |
| **License** *(required)* | MIT (pyproject.toml) |
| **Version** *(optional)* | 0.1.0 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository analysis at the analyzed ref |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope is inferred from FastMCP behavior |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Mixed: file tools are workspace-root relative; other tools accept absolute/relative paths as provided |
| **Line/column indexing** *(required)* | 1-based (for `read_file` and lint output) |
| **Encoding model** *(optional)* | UTF-8 |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | mixed |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

MCP Python Toolbox is a FastMCP-based server that exposes a suite of Python development utilities to MCP clients such as Claude. It provides safe workspace-scoped file operations, Python AST analysis, formatting and linting, project dependency/venv management, and controlled code execution to enable AI-assisted Python development workflows.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Claude Desktop / Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop |

### 1.3 Primary Capabilities *(required)*

- [x] Workspace-scoped file read/write/delete and directory listing
- [x] Python code analysis via AST parsing
- [x] Code formatting (Black, autopep8) and linting (Pylint)
- [x] Virtual environment and dependency management
- [x] Controlled Python code execution with captured output

### 1.4 Non-Goals / Exclusions *(optional)*

- Not a general-purpose IDE or full language server
- No remote or multi-tenant execution model documented

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Cross-platform Python 3.7+ (Windows/macOS/Linux) |
| **Documented integrations** *(optional)* | Claude Desktop |
| **Notes / constraints** *(optional)* | Requires local filesystem access and Python tooling (pip/venv) |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |
| **How to extend** *(optional)* | Add new tools in `PythonToolboxServer.setup()` and supporting core modules |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT (declared in pyproject.toml) |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | Python |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | mcp, httpx, uvicorn, black, autopep8, pylint, pytest, mypy, rope, toml, packaging, types-setuptools, types-toml |
| **External / System** *(optional)* | Python >= 3.7, pip, venv |
| **Optional** *(optional)* | dev extras: pytest, black, mypy, pylint |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Local process |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes |
| **Env vars used** *(optional)* | Yes (optional client-provided env vars) |
| **Config files used** *(optional)* | Yes (requirements.txt, pyproject.toml) |
| **CLI flags used** *(optional)* | Yes (`--workspace`) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | MCP FastMCP, Python AST, Black, autopep8, Pylint, venv/pip |
| **Architecture notes** *(optional)* | - FastMCP registers tools on a single server instance
- Core modules implement filesystem, analysis, dependency, and execution operations
- Workspace root is injected into each core module |

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
| **Writes local files** *(required)* | Yes (workspace files, `.venv`, temp files) |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No |
| **Retains user code** *(required)* | Yes — writes to workspace and temporary execution files (deleted after run) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `analyze_python_file` |
| 2 | `check_conflicts` |
| 3 | `create_venv` |
| 4 | `delete_file` |
| 5 | `execute_python` |
| 6 | `format_code` |
| 7 | `install_dependencies` |
| 8 | `lint_code` |
| 9 | `list_directory` |
| 10 | `list_packages` |
| 11 | `read_file` |
| 12 | `write_file` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `WorkspacePath` | Path relative to workspace root for file tools |
| `CodeString` | Python source code as a UTF-8 string |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CodeAnalysis` | `{ imports, functions, classes, global_variables }` from AST analysis |
| `LintIssue` | `{ path, line, type, message }` from pylint parsing |
| `DirectoryEntry` | `{ name, type, size, modified, path }` for directory listings |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | workspace-root validation for file tools; other tools accept raw paths |
| **Rate limits / retries** | Not documented |
| **File size limits** | Not documented |
| **Resource constraints** | Not documented |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Unknown |
| **Error as `{ error: string }`** | Unknown |
| **Common error codes** | Not documented |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `analyze_python_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_python_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Parses a Python file and returns structural information about imports, functions, classes, and global variables using the Python AST.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Path to the Python file to analyze (absolute or relative) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src/example.py"
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
  "imports": [
    { "name": "os", "alias": null }
  ],
  "functions": [
    {
      "name": "main",
      "args": ["arg"],
      "decorators": ["decorator"],
      "docstring": "Run the main entry point"
    }
  ],
  "classes": [
    {
      "name": "MyClass",
      "bases": ["Base"],
      "methods": ["method"],
      "docstring": "Class responsible for orchestration"
    }
  ],
  "global_variables": ["VALUE"]
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
| **Preconditions** | File must exist and be readable |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | Reads local files; no workspace path validation in analyzer |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/code_analyzer.py — `CodeAnalyzer.parse_python_file()` |

---

### 🔹 Tool: `check_conflicts`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>check_conflicts</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Scans installed packages in the current environment and reports version conflicts between dependencies.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters |

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
[
  {
    "package": "pkg",
    "requires": "dependency>=2.0",
    "installed": "1.0"
  }
]
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
| **Preconditions** | Python environment must be available; typically uses the `.venv` environment |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | Reads installed package metadata |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/project_manager.py — `ProjectManager.check_dependency_conflicts()` |

---

### 🔹 Tool: `create_venv`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>create_venv</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Creates a Python virtual environment in the workspace `.venv` directory if it does not already exist.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters |

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
null
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Creates `.venv` directory and files |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Workspace must be writable |
| **Postconditions** | `.venv` created if absent |
| **Limits** | Not documented |
| **Security & privacy** | Writes local files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/project_manager.py — `ProjectManager.create_virtual_environment()` |

---

### 🔹 Tool: `delete_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>delete_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Deletes a file within the workspace root after validating the path.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Workspace-relative file path to delete |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "tmp/output.txt"
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
null
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Deletes local files |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Non-idempotent |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist and be within workspace root |
| **Postconditions** | File removed |
| **Limits** | Not documented |
| **Security & privacy** | Path validation prevents access outside workspace |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/file_operations.py — `FileOperations.delete_file()` |

---

### 🔹 Tool: `execute_python`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>execute_python</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Python code in a subprocess using the workspace virtual environment and returns stdout, stderr, and exit code.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Python source code to execute |
| `working_dir` | `string` | ❌ | — | Working directory for execution (defaults to workspace root) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "print('hello')",
  "working_dir": "."
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
  "stdout": "hello\n",
  "stderr": "",
  "exit_code": 0
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Hybrid |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Executes code in a subprocess; creates temporary file |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `.venv` must exist with Python executable; working directory must exist |
| **Postconditions** | Temporary file created and removed |
| **Limits** | Not documented |
| **Security & privacy** | Executes arbitrary code; use only in trusted workspaces |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/code_executor.py — `CodeExecutor.execute_code()` |

---

### 🔹 Tool: `format_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>format_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Formats Python code using Black (default) or autopep8 and returns the formatted code.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `code` | `string` | ✅ | — | Python source code to format |
| `style` | `string` | ❌ | `"black"` | Formatting style: `black` or `pep8` |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "code": "x=1\n",
  "style": "black"
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
"x = 1\n"
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
| **Preconditions** | Style must be `black` or `pep8` |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | None |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/code_analyzer.py — `CodeAnalyzer.format_code()` |

---

### 🔹 Tool: `install_dependencies`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>install_dependencies</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Installs dependencies using pip from a specified requirements file or from `requirements.txt` / `pyproject.toml` in the workspace.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `requirements_file` | `string` | ❌ | — | Path to requirements file; if omitted, uses workspace defaults |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "requirements_file": "requirements.txt"
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
null
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Installs packages into `.venv` using pip |
| **Determinism** *(optional)* | Depends |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | `.venv` must exist; requirements file must be present |
| **Postconditions** | Environment packages updated |
| **Limits** | Not documented |
| **Security & privacy** | Executes pip installs; uses network access |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/project_manager.py — `ProjectManager.install_dependencies()` |

---

### 🔹 Tool: `lint_code`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>lint_code</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs Pylint on a Python file and returns a list of lint issues.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Path to the Python file to lint |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src/example.py"
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
[
  {
    "path": "src/example.py",
    "line": "10",
    "type": "C0114",
    "message": "Missing module docstring"
  }
]
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
| **Preconditions** | File must exist and be readable |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | Reads local files |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/code_analyzer.py — `CodeAnalyzer.lint_code()` |

---

### 🔹 Tool: `list_directory`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_directory</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Lists files and subdirectories in a workspace directory with size and modification metadata.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ❌ | `"."` | Workspace-relative directory path to list |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src"
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
[
  {
    "name": "example.py",
    "type": "file",
    "size": 1234,
    "modified": 1700000000.0,
    "path": "src/example.py"
  }
]
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
| **Preconditions** | Path must be a directory within workspace |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | Path validation prevents traversal outside workspace |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/file_operations.py — `FileOperations.list_directory()` |

---

### 🔹 Tool: `list_packages`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_packages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a list of installed Python packages with their versions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | No parameters |

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
[
  { "name": "requests", "version": "2.31.0" }
]
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
| **Preconditions** | Environment must be available; typically uses `.venv` |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | Reads package metadata |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/project_manager.py — `ProjectManager.get_installed_packages()` |

---

### 🔹 Tool: `read_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>read_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Reads the contents of a file within the workspace, optionally returning a line range.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Workspace-relative file path to read |
| `start_line` | `integer` | ❌ | — | 1-based start line (inclusive) |
| `end_line` | `integer` | ❌ | — | 1-based end line (inclusive) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "src/example.py",
  "start_line": 1,
  "end_line": 20
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
"def main():\n    pass\n"
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
| **Preconditions** | File must exist within workspace root |
| **Postconditions** | None |
| **Limits** | Not documented |
| **Security & privacy** | Path validation prevents traversal outside workspace |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/file_operations.py — `FileOperations.read_file()` |

---

### 🔹 Tool: `write_file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>write_file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Writes content to a file in the workspace, creating parent directories if needed.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `path` | `string` | ✅ | — | Workspace-relative file path to write |
| `content` | `string` | ✅ | — | Content to write |
| `mode` | `string` | ❌ | `"w"` | File mode (`w` overwrite, `a` append) |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "path": "logs/output.txt",
  "content": "hello\n",
  "mode": "a"
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
null
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | Write Only |
| **Classification** *(required)* | Other |
| **Side effects** *(required)* | Writes local files |
| **Determinism** *(optional)* | Deterministic |
| **Idempotency** *(optional)* | Depends |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | Path must be within workspace root |
| **Postconditions** | File created or updated |
| **Limits** | Not documented |
| **Security & privacy** | Path validation prevents traversal outside workspace |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/mcp_python_toolbox/server.py — `PythonToolboxServer.setup()` |
| **Core implementation** | src/mcp_python_toolbox/core/file_operations.py — `FileOperations.write_file()` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | None documented |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `PYTHONPATH` | ❌ | — | — | Optional module path for running the server (client-provided) |
| `PATH` | ❌ | — | — | Optional PATH used by the client launching the server |
| `VIRTUAL_ENV` | ❌ | — | — | Optional virtual environment path (client-provided) |
| `PYTHONHOME` | ❌ | — | — | Optional Python home override (client-provided) |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| requirements.txt | Dependency installation source for `install_dependencies` |
| pyproject.toml | Dependency installation source for `install_dependencies` |

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--workspace` | Workspace root directory (defaults to current directory) |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `git clone https://github.com/gianlucamazza/mcp_python_toolbox.git` |
| 2 | `python -m venv .venv` and activate it |
| 3 | `pip install -e ".[dev]"` |

### 8.2 Typical Run Commands *(optional)*

```bash
python -m mcp_python_toolbox --workspace /path/to/project
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Not documented (no explicit logging in source) |
| **Tracing / Metrics** | None documented |

### 8.4 Performance Considerations *(optional)*

- Linting and dependency checks can be slow on large environments
- Code execution runs in a subprocess and may be constrained by system resources

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 12 |

### 9.2 Known Gaps *(optional)*

- MCP response envelope behavior is inferred from FastMCP, not explicitly documented in the repo
<div align="center">

*— End of Report —*

</div>
