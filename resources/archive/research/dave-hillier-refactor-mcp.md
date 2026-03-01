<div align="center">

# 📋 MCP Server Report

## `refactor-mcp`
### [`dave-hillier/refactor-mcp`](https://github.com/dave-hillier/refactor-mcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/dave-hillier/refactor-mcp` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `main` |
| **Commit URL** | `N/A` |
| **License** | `MPL-2.0` |
| **Version** | `N/A` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | refactor-mcp MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` — file and solution paths appear to be absolute; rename-symbol line/column is documented as 1-based |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `absolute` |
| **Line/column indexing** | `1-based` (documented for `rename-symbol` line/column; `selectionRange` indexing not specified) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `Unknown` |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes automated refactoring operations as tools.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | `Unknown` |

### 1.3 Primary Capabilities

- [x] Automated refactorings and safe deletes
- [x] Symbol extraction/rename/move operations
- [x] Solution/project load management

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can launch stdio servers. |
| **Documented integrations** | VS Code, Cursor, Claude Desktop, JetBrains MCP plugins |
| **Notes / constraints** | Requires .NET runtime and C# solution context. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | C# |
| **How to extend** | Add Roslyn-based refactorings. |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Open-source` |
| **License details** | MPL-2.0 |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | C# (.NET) |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | .NET runtime/SDK, ModelContextProtocol.Server, Roslyn (Microsoft.CodeAnalysis) |
| **External / System** | C# solution (.sln) and project files |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Unknown` |
| **Config files used** | `Unknown` |
| **CLI flags used** | `Unknown` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | Roslyn + ModelContextProtocol server framework |
| **Architecture notes** | Operates on C# solutions via Roslyn APIs. |

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
| **Writes local files** | `Yes` (applies refactors) |
| **Uses local cache** | `Yes` (solution cache) |
| **Uses external DB** | `No` |
| **Retains user code** | `Yes` (solution data loaded in memory) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `add-observer` |
| 2 | `clear-solution-cache` |
| 3 | `cleanup-usings` |
| 4 | `convert-to-constructor-injection` |
| 5 | `convert-to-extension-method` |
| 6 | `convert-to-static-with-instance` |
| 7 | `convert-to-static-with-parameters` |
| 8 | `create-adapter` |
| 9 | `extract-decorator` |
| 10 | `extract-interface` |
| 11 | `extract-method` |
| 12 | `feature-flag-refactor` |
| 13 | `inline-method` |
| 14 | `introduce-field` |
| 15 | `introduce-parameter` |
| 16 | `introduce-variable` |
| 17 | `list-tools-command` |
| 18 | `load-solution` |
| 19 | `make-field-readonly` |
| 20 | `make-static-then-move` |
| 21 | `move-instance-method` |
| 22 | `move-multiple-methods-instance` |
| 23 | `move-multiple-methods-static` |
| 24 | `move-static-method` |
| 25 | `move-to-separate-file` |
| 26 | `rename-symbol` |
| 27 | `reset-move-history` |
| 28 | `safe-delete-field` |
| 29 | `safe-delete-method` |
| 30 | `safe-delete-parameter` |
| 31 | `safe-delete-variable` |
| 32 | `transform-setter-to-init` |
| 33 | `unload-solution` |
| 34 | `use-interface` |
| 35 | `version` |

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `solutionPath` | Absolute path to a `.sln` file. |
| `filePath` | Path to a C# source file; examples use absolute paths. |
| `selectionRange` | String range in format `startLine:startColumn-endLine:endColumn` (base indexing not explicitly stated; line/column for `rename-symbol` is documented as 1-based). |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `status_message` | Human-readable string indicating success or error. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | Uses file paths from tool arguments; traversal protections not documented. |
| **Rate limits / retries** | Not documented. |
| **File size limits** | Not documented. |
| **Resource constraints** | Not documented. |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Yes` (tools return string messages, including error strings) |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | Not documented |

---

## 🔨 § 5 — MCP Tools Reference

> 📝 **One subsection per tool.** Tool schemas/examples are copied from the source report.

---

### 🔹 Tool: `add-observer`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>add-observer</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Introduces a new public event on a class and appends a statement to raise that event from a chosen method, then writes the updated file to disk and updates solution/file caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `className` | `string` | ✅ | — | Name of the class containing the method. |
| `methodName` | `string` | ✅ | — | Name of the method to raise the event from. |
| `eventName` | `string` | ✅ | — | Name of the event to create. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"className": {"type": "string", "description": "Name of the class containing the method"},
		"methodName": {"type": "string", "description": "Name of the method to raise the event from"},
		"eventName": {"type": "string", "description": "Name of the event to create"}
	},
	"required": ["solutionPath", "filePath", "className", "methodName", "eventName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/MyClass.cs",
	"className": "MyClass",
	"methodName": "DoWork",
	"eventName": "WorkDone"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Added observer WorkDone to C:/repo/src/MyClass.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates in-memory solution/file caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | File/class/method must exist; solution context improves accuracy (solution mode). |
| **Postconditions** | Adds an event declaration and appends an invocation at end of method body. |
| **Limits** | In event payload generation, uses the first method parameter (if any) for generic `Action<T>`. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `cleanup-usings`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>cleanup-usings</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Removes unused <code>using</code> directives from a C# file (solution mode uses Roslyn diagnostics; single-file mode uses best-effort compilation), then writes the updated file to disk and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string \| null` | ❌ | — | Optional absolute path to solution; if omitted/blank uses single-file mode. |
| `filePath` | `string` | ✅ | — | Path to the C# file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": ["string", "null"], "description": "Absolute path to the solution file (.sln). Optional; if omitted/blank, uses single-file mode."},
		"filePath": {"type": "string", "description": "Path to the C# file"}
	},
	"required": ["filePath"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/MyClass.cs"
}
```
</details>

<details>
<summary><strong>Example Input Instance (single-file mode)</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": null,
	"filePath": "C:/repo/src/MyClass.cs"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Removed unused usings in C:/repo/src/MyClass.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates in-memory caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | File must exist; optional solutionPath enables solution mode. |
| **Postconditions** | Unused using directives removed. |
| **Limits** | Uses Roslyn diagnostic CS8019 in solution mode; single-file mode uses best-effort references. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `clear-solution-cache`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>clear-solution-cache</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Clears all in-memory caches the server maintains for loaded solutions and per-file state (does not modify source files).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | This tool takes no arguments. |

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
	"description": "A human-readable status message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Cleared all cached solutions
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Mutates server state by clearing caches |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | All cached solutions and file caches cleared. |
| **Limits** | Not documented. |
| **Security & privacy** | In-memory state only; no network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `convert-to-constructor-injection`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>convert-to-constructor-injection</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Converts one or more method parameters into constructor-injected dependencies by rewriting the class to store the dependency as a private field (default) or public property (when <code>useProperty=true</code>), then writes updated code to disk and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodParameters` | `array` | ✅ | — | List of `{ methodName, parameterName }` pairs to convert. |
| `useProperty` | `boolean` | ❌ | `false` | Use a public property instead of a private field. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"methodParameters": {
			"type": "array",
			"description": "List of method/parameter pairs to convert",
			"items": {
				"type": "object",
				"properties": {
					"methodName": {"type": "string"},
					"parameterName": {"type": "string"}
				},
				"required": ["methodName", "parameterName"]
			}
		},
		"useProperty": {"type": "boolean", "description": "Use a public property instead of a private field", "default": false}
	},
	"required": ["solutionPath", "filePath", "methodParameters"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/MyService.cs",
	"methodParameters": [
		{"methodName": "Handle", "parameterName": "logger"},
		{"methodName": "Handle", "parameterName": "clock"}
	],
	"useProperty": false
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully injected parameters via constructor in C:/repo/src/MyService.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates in-memory caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Parameters must exist on the specified methods. |
| **Postconditions** | Methods no longer take those parameters; class gains injected member(s) and constructor updates. |
| **Limits** | Not documented. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `convert-to-extension-method`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>convert-to-extension-method</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Converts an instance method into an extension method on a generated (or existing) static extension class, preserving call sites via a wrapper method; writes updated code to disk and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the instance method to convert. |
| `extensionClass` | `string \| null` | ❌ | — | Optional extension class name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"methodName": {"type": "string", "description": "Name of the instance method to convert"},
		"extensionClass": {"type": ["string", "null"], "description": "Optional extension class name"}
	},
	"required": ["solutionPath", "filePath", "methodName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/MyClass.cs",
	"methodName": "Normalize",
	"extensionClass": "MyClassExtensions"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully converted method 'Normalize' to extension method in C:/repo/src/MyClass.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; may create a new extension class; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method must exist in file; extension class may be created if missing. |
| **Postconditions** | Extension method exists; wrapper may remain to preserve call sites. |
| **Limits** | Single-file mode uses syntactic heuristics for member references. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `convert-to-static-with-instance`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>convert-to-static-with-instance</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Transforms an instance method into a static method by introducing an explicit instance parameter (default name <code>instance</code>) and rewriting member accesses to use that parameter; writes updated code to disk and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the method to convert. |
| `instanceParameterName` | `string` | ❌ | `instance` | Name for the instance parameter. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"methodName": {"type": "string", "description": "Name of the method to convert"},
		"instanceParameterName": {"type": "string", "description": "Name for the instance parameter", "default": "instance"}
	},
	"required": ["solutionPath", "filePath", "methodName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/MyType.cs",
	"methodName": "Calculate",
	"instanceParameterName": "self"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully converted method 'Calculate' to static with instance parameter in C:/repo/src/MyType.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method must exist; solution mode preferred for accurate member resolution. |
| **Postconditions** | Method becomes static and references updated to use instance parameter. |
| **Limits** | Single-file mode performs AST rewrite without full semantic model. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `convert-to-static-with-parameters`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>convert-to-static-with-parameters</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Transforms an instance method into a static method by lifting referenced instance fields/properties into new parameters and rewriting member accesses; writes updated code to disk and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the method to convert. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"methodName": {"type": "string", "description": "Name of the method to convert"}
	},
	"required": ["solutionPath", "filePath", "methodName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/MyType.cs",
	"methodName": "ComputeScore"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully converted method 'ComputeScore' to static with parameters in C:/repo/src/MyType.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method must exist. |
| **Postconditions** | Method becomes static; new parameters represent lifted instance dependencies. |
| **Limits** | Single-file mode may be less accurate than solution mode for member detection/types. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `create-adapter`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>create-adapter</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates a simple adapter class that delegates to an existing method on another class, appending the new class to the file and updating caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `className` | `string` | ✅ | — | Name of the class containing the method. |
| `methodName` | `string` | ✅ | — | Name of the method to adapt. |
| `adapterName` | `string` | ✅ | — | Name of the adapter class to create. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"className": {"type": "string", "description": "Name of the class containing the method"},
		"methodName": {"type": "string", "description": "Name of the method to adapt"},
		"adapterName": {"type": "string", "description": "Name of the adapter class to create"}
	},
	"required": ["solutionPath", "filePath", "className", "methodName", "adapterName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/Payments/PaymentClient.cs",
	"className": "PaymentClient",
	"methodName": "Charge",
	"adapterName": "PaymentClientAdapter"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Created adapter PaymentClientAdapter in C:/repo/src/Payments/PaymentClient.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; appends generated class; updates caches |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `className`/`methodName` must be found in file. |
| **Postconditions** | Adapter class appended (same namespace if present). |
| **Limits** | Not documented. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `extract-decorator`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>extract-decorator</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Generates a simple decorator class for a specific method, delegating calls to an inner instance, appending the new class to the file, and updating caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `className` | `string` | ✅ | — | Name of the class containing the method. |
| `methodName` | `string` | ✅ | — | Name of the method to decorate. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"className": {"type": "string", "description": "Name of the class containing the method"},
		"methodName": {"type": "string", "description": "Name of the method to decorate"}
	},
	"required": ["solutionPath", "filePath", "className", "methodName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/Payments/PaymentClient.cs",
	"className": "PaymentClient",
	"methodName": "Charge"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Created decorator for PaymentClient.Charge in C:/repo/src/Payments/PaymentClient.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; appends generated class; updates caches |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `className`/`methodName` must be found in file. |
| **Postconditions** | Decorator class appended (same namespace if present). |
| **Limits** | Not documented. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `extract-interface`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>extract-interface</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extracts a new public interface from a class by selecting a set of methods/properties, writes a new interface file to <code>interfaceFilePath</code>, updates the class to implement it, and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the class. |
| `className` | `string` | ✅ | — | Name of the class to extract from. |
| `memberList` | `string` | ✅ | — | Comma-separated list of member names to include. |
| `interfaceFilePath` | `string` | ✅ | — | Path to write the generated interface file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file containing the class"},
		"className": {"type": "string", "description": "Name of the class to extract from"},
		"memberList": {"type": "string", "description": "Comma separated list of member names to include"},
		"interfaceFilePath": {"type": "string", "description": "Path to write the generated interface file"}
	},
	"required": ["solutionPath", "filePath", "className", "memberList", "interfaceFilePath"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/Payments/PaymentClient.cs",
	"className": "PaymentClient",
	"memberList": "Charge, Refund",
	"interfaceFilePath": "C:/repo/src/Payments/IPaymentClient.cs"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully extracted interface 'IPaymentClient' to C:/repo/src/Payments/IPaymentClient.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Creates a new interface file; updates original class file; updates caches |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Class and members must be found; interfaceFilePath must be writable. |
| **Postconditions** | Interface file created; class implements interface. |
| **Limits** | Only methods/properties supported; may overwrite existing base list per source report notes. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `extract-method`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>extract-method</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Extracts a selected block of statements into a new method and replaces the selection with a call to that method (requires a <code>selectionRange</code>), then writes updated code to disk and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `selectionRange` | `string` | ✅ | — | Range in format <code>startLine:startColumn-endLine:endColumn</code>. |
| `methodName` | `string` | ✅ | — | Name for the new method. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"selectionRange": {"type": "string", "description": "Range in format 'startLine:startColumn-endLine:endColumn'"},
		"methodName": {"type": "string", "description": "Name for the new method"}
	},
	"required": ["solutionPath", "filePath", "selectionRange", "methodName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/OrderService.cs",
	"selectionRange": "42:9-48:10",
	"methodName": "ValidateOrder"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully extracted method 'ValidateOrder' from 42:9-48:10 in C:/repo/src/OrderService.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Selection must be within a block-bodied method; expression-bodied methods not supported. |
| **Postconditions** | New method created; selected statements replaced with call to new method. |
| **Limits** | Extracts statements intersecting selection span. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `feature-flag-refactor`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>feature-flag-refactor</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Refactors a feature-flag conditional into a strategy-pattern style structure by rewriting code related to <code>flagName</code> and appending generated members; in solution mode may also append a JSON line to <code>refactor-report.json</code> (best-effort).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `flagName` | `string` | ✅ | — | Feature flag name. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"flagName": {"type": "string", "description": "Feature flag name"}
	},
	"required": ["solutionPath", "filePath", "flagName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/Features/Checkout.cs",
	"flagName": "NewCheckoutFlow"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Refactored feature flag 'NewCheckoutFlow' in C:/repo/src/Features/Checkout.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches; may append to `refactor-report.json` (best-effort) |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Feature flag must be found; otherwise returns error. |
| **Postconditions** | Code rewritten and generated members appended. |
| **Limits** | Logging to `refactor-report.json` is best-effort and failures are silently ignored. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `inline-method`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>inline-method</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Inlines a method at its call sites and removes the original method declaration; in solution mode may update multiple documents across the solution.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the method. |
| `methodName` | `string` | ✅ | — | Name of the method to inline. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file containing the method"},
		"methodName": {"type": "string", "description": "Name of the method to inline"}
	},
	"required": ["solutionPath", "filePath", "methodName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/Utils/StringHelpers.cs",
	"methodName": "TrimAndLower"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully inlined method 'TrimAndLower' in C:/repo/src/Utils/StringHelpers.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; may update multiple documents; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method must exist. |
| **Postconditions** | Call sites rewritten; method removed. |
| **Limits** | In single-file mode, only supports methods with zero parameters. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `introduce-field`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>introduce-field</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Introduces a new field initialized from a selected expression (via <code>selectionRange</code>) and replaces that expression with a reference to the new field, then writes the updated file and updates caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `selectionRange` | `string` | ✅ | — | Range in format <code>startLine:startColumn-endLine:endColumn</code>. |
| `fieldName` | `string` | ✅ | — | Name for the new field. |
| `accessModifier` | `string` | ❌ | `private` | Access modifier (`private`, `public`, `protected`, `internal`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"selectionRange": {"type": "string", "description": "Range in format 'startLine:startColumn-endLine:endColumn'"},
		"fieldName": {"type": "string", "description": "Name for the new field"},
		"accessModifier": {"type": "string", "description": "Access modifier (private, public, protected, internal)", "default": "private"}
	},
	"required": ["solutionPath", "filePath", "selectionRange", "fieldName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/OrderService.cs",
	"selectionRange": "120:20-120:45",
	"fieldName": "_validator",
	"accessModifier": "private"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully introduced private field '_validator' from 120:20-120:45 in C:/repo/src/OrderService.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Selection must correspond to a valid expression; field name must not already exist on class. |
| **Postconditions** | Field added and expression replaced. |
| **Limits** | Solution mode infers expression type; uses `var` if unknown. |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `introduce-parameter`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>introduce-parameter</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Introduces a new method parameter from a selected expression (via <code>selectionRange</code> and <code>methodName</code>) and replaces that expression with a reference to the new parameter, then writes updates and refreshes caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the method to add parameter to. |
| `selectionRange` | `string` | ✅ | — | Range in format <code>startLine:startColumn-endLine:endColumn</code>. |
| `parameterName` | `string` | ✅ | — | Name for the new parameter. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"methodName": {"type": "string", "description": "Name of the method to add parameter to"},
		"selectionRange": {"type": "string", "description": "Range in format 'startLine:startColumn-endLine:endColumn'"},
		"parameterName": {"type": "string", "description": "Name for the new parameter"}
	},
	"required": ["solutionPath", "filePath", "methodName", "selectionRange", "parameterName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/OrderService.cs",
	"methodName": "Submit",
	"selectionRange": "88:25-88:40",
	"parameterName": "orderId"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully introduced parameter 'orderId' from 88:25-88:40 in method 'Submit' in C:/repo/src/OrderService.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method must exist; selection must correspond to an expression. |
| **Postconditions** | Parameter added; expression replaced with parameter reference. |
| **Limits** | Solution mode infers type via semantic model (falls back to `object`). |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `introduce-variable`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>introduce-variable</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Introduces a new local variable from a selected expression (via <code>selectionRange</code>), inserts a local declaration statement, replaces the selected expression with the new variable identifier, then writes updates and refreshes caches.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `selectionRange` | `string` | ✅ | — | Range in format <code>startLine:startColumn-endLine:endColumn</code>. |
| `variableName` | `string` | ✅ | — | Name for the new variable. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {"type": "string", "description": "Absolute path to the solution file (.sln)"},
		"filePath": {"type": "string", "description": "Path to the C# file"},
		"selectionRange": {"type": "string", "description": "Range in format 'startLine:startColumn-endLine:endColumn'"},
		"variableName": {"type": "string", "description": "Name for the new variable"}
	},
	"required": ["solutionPath", "filePath", "selectionRange", "variableName"]
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/repo/MySolution.sln",
	"filePath": "C:/repo/src/OrderService.cs",
	"selectionRange": "75:18-75:52",
	"variableName": "normalizedId"
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
	"description": "Success or error message"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully introduced variable 'normalizedId' from 75:18-75:52 in C:/repo/src/OrderService.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; updates caches |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Selection must correspond to an expression. |
| **Postconditions** | Variable declared and expression replaced. |
| **Limits** | Solution mode infers type via semantic model (falls back to `var`). |
| **Security & privacy** | Operates on local code; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `list-tools-command`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list-tools-command</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns a newline-delimited list of all available MCP tool names exposed by the server (computed via reflection and converted to kebab-case; sorted alphabetically).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | This tool takes no arguments. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {},
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
	"description": "Newline-delimited list of tool names"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
add-observer
cleanup-usings
convert-to-constructor-injection
...
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | No external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `load-solution`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>load-solution</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Loads a .NET solution file (<code>.sln</code>) into the server's in-memory solution cache (clearing caches first), sets the process current directory to the solution folder, and initializes per-solution logging under a <code>.refactor-mcp</code> folder.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": {
			"type": "string",
			"description": "Absolute path to the solution file (.sln)"
		}
	},
	"required": ["solutionPath"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln"
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
	"description": "Human-readable success message including solution filename and project list"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully loaded solution 'MyApp.sln' with 3 projects: MyApp.Core, MyApp.Api, MyApp.Tests
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Mutates server session state and caches; sets current directory; creates `.refactor-mcp` directories |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `solutionPath` must exist. |
| **Postconditions** | Caches cleared; solution loaded/cached; `.refactor-mcp` folders created. |
| **Limits** | Not documented. |
| **Security & privacy** | Reads local solution and creates local directories; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `make-field-readonly`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>make-field-readonly</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Makes a field <code>readonly</code> when it is only assigned during initialization; may move a field initializer into constructors in solution mode.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `fieldName` | `string` | ✅ | — | Name of the field to make readonly. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"fieldName": { "type": "string", "description": "Name of the field to make readonly" }
	},
	"required": ["solutionPath", "filePath", "fieldName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"fieldName": "_bar"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully made field '_bar' readonly in C:/src/MyApp/MyApp/Services/Foo.cs (single file mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Modifies files on disk |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Field must exist and be eligible for readonly conversion. |
| **Postconditions** | Field marked readonly; initialization may be moved into constructors in solution mode. |
| **Limits** | Not documented. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `make-static-then-move`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>make-static-then-move</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Convenience tool that converts an instance method to a static method with an injected instance parameter, then moves the resulting static method to another class (delegates to <code>convert-to-static-with-instance</code> and <code>move-static-method</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the method. |
| `methodName` | `string` | ✅ | — | Name of the method to convert and move. |
| `targetClass` | `string` | ✅ | — | Name of the target class. |
| `instanceParameterName` | `string` | ❌ | `instance` | Name for the instance parameter. |
| `targetFilePath` | `string \| null` | ❌ | — | Path to the target file (optional; may create if missing/unspecified). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the method" },
		"methodName": { "type": "string", "description": "Name of the method to convert and move" },
		"targetClass": { "type": "string", "description": "Name of the target class" },
		"instanceParameterName": { "type": "string", "description": "Name for the instance parameter (optional)", "default": "instance" },
		"targetFilePath": { "type": ["string", "null"], "description": "Path to the target file (optional, will create if doesn't exist or unspecified)" }
	},
	"required": ["solutionPath", "filePath", "methodName", "targetClass"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"methodName": "Compute",
	"targetClass": "FooHelpers",
	"instanceParameterName": "foo",
	"targetFilePath": "C:/src/MyApp/MyApp/Services/FooHelpers.cs"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully moved static method 'Compute' to FooHelpers in C:/src/MyApp/MyApp/Services/FooHelpers.cs. A delegate method remains in the original class to preserve the interface.
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Performs refactoring edits and writes files |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method must exist; target class/file may be created if missing. |
| **Postconditions** | Method converted and moved; delegate remains in original class to preserve interface. |
| **Limits** | Not documented. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `move-instance-method`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>move-instance-method</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Moves one or more instance methods from a source class to a target class; original methods are replaced by delegating wrappers to preserve the public API.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the method. |
| `sourceClass` | `string` | ✅ | — | Name of the source class containing the method(s). |
| `methodNames` | `array` | ✅ | — | Names of the methods to move. |
| `targetClass` | `string` | ✅ | — | Name of the target class. |
| `targetFilePath` | `string \| null` | ❌ | — | Path to the target file (optional; may create if missing/unspecified). |
| `constructorInjections` | `array` | ❌ | — | Dependencies to inject via the constructor. |
| `parameterInjections` | `array` | ❌ | — | Dependencies to keep as parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the method" },
		"sourceClass": { "type": "string", "description": "Name of the source class containing the method" },
		"methodNames": { "type": "array", "items": { "type": "string" }, "description": "Names of the methods to move (required)" },
		"targetClass": { "type": "string", "description": "Name of the target class" },
		"targetFilePath": { "type": ["string", "null"], "description": "Path to the target file (optional, will create if doesn't exist or unspecified)" },
		"constructorInjections": { "type": "array", "items": { "type": "string" }, "description": "Dependencies to inject via the constructor" },
		"parameterInjections": { "type": "array", "items": { "type": "string" }, "description": "Dependencies to keep as parameters" }
	},
	"required": ["solutionPath", "filePath", "sourceClass", "methodNames", "targetClass"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"sourceClass": "Foo",
	"methodNames": ["M1", "M2"],
	"targetClass": "FooMoved",
	"targetFilePath": "C:/src/MyApp/MyApp/Services/FooMoved.cs",
	"constructorInjections": ["_logger"],
	"parameterInjections": []
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully moved 2 methods from Foo to FooMoved in C:/src/MyApp/MyApp/Services/FooMoved.cs. Delegate methods remain in the original class to preserve the interface.
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated source/target files |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Method(s) must exist; moving same method twice requires `reset-move-history`. |
| **Postconditions** | Methods moved; delegate wrappers remain in source class. |
| **Limits** | May suggest static when no instance dependencies are found (per output message hint). |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `move-multiple-methods-instance`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>move-multiple-methods-instance</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Moves multiple methods to a target class, keeping them as instance methods in the target class. This tool is solution-mode only.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the methods. |
| `sourceClass` | `string` | ✅ | — | Name of the source class containing the methods. |
| `methodNames` | `array` | ✅ | — | Names of the methods to move. |
| `targetClass` | `string` | ✅ | — | Name of the target class. |
| `targetFilePath` | `string \| null` | ❌ | — | Target file path (optional; may create). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the methods" },
		"sourceClass": { "type": "string", "description": "Name of the source class containing the methods" },
		"methodNames": { "type": "array", "items": { "type": "string" }, "description": "Names of the methods to move" },
		"targetClass": { "type": "string", "description": "Name of the target class" },
		"targetFilePath": { "type": ["string", "null"], "description": "Path to the target file (optional, target class will be automatically created if it doesnt exist or its unspecified)" }
	},
	"required": ["solutionPath", "filePath", "sourceClass", "methodNames", "targetClass"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"sourceClass": "Foo",
	"methodNames": ["A", "B"],
	"targetClass": "FooMoved",
	"targetFilePath": null
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
{ "type": "string", "description": "Newline-delimited per-method move results" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully moved ...
Successfully moved ...
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated files and updates solution cache |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Solution must be loaded; file must be found in loaded solution. |
| **Postconditions** | Methods moved to target class. |
| **Limits** | Solution-mode only. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `move-multiple-methods-static`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>move-multiple-methods-static</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Moves multiple methods to a target class and transforms them to static methods with an injected <code>this</code> parameter. This tool is solution-mode only.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the methods. |
| `sourceClass` | `string` | ✅ | — | Name of the source class containing the methods. |
| `methodNames` | `array` | ✅ | — | Names of the methods to move. |
| `targetClass` | `string` | ✅ | — | Name of the target class. |
| `targetFilePath` | `string \| null` | ❌ | — | Target file path (optional; may create). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the methods" },
		"sourceClass": { "type": "string", "description": "Name of the source class containing the methods" },
		"methodNames": { "type": "array", "items": { "type": "string" }, "description": "Names of the methods to move" },
		"targetClass": { "type": "string", "description": "Name of the target class" },
		"targetFilePath": { "type": ["string", "null"], "description": "Path to the target file (optional, target class will be automatically created if it doesnt exist or its unspecified)" }
	},
	"required": ["solutionPath", "filePath", "sourceClass", "methodNames", "targetClass"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"sourceClass": "Foo",
	"methodNames": ["A", "B"],
	"targetClass": "FooMoved",
	"targetFilePath": "C:/src/MyApp/MyApp/Services/FooMoved.cs"
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
{ "type": "string", "description": "Newline-delimited per-method move results" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully moved ...
Successfully moved ...
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated files and updates solution cache |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Solution must be loaded; file must be found in loaded solution. |
| **Postconditions** | Methods moved and converted to static methods. |
| **Limits** | Solution-mode only. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `move-static-method`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>move-static-method</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Moves a static method from its current class to a target class (creating the class/file if needed) and leaves a delegating method in the original class to preserve the interface.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the method. |
| `methodName` | `string` | ✅ | — | Name of the static method to move. |
| `targetClass` | `string` | ✅ | — | Name of the target class. |
| `targetFilePath` | `string \| null` | ❌ | — | Path to the target file (optional; may create). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the method" },
		"methodName": { "type": "string", "description": "Name of the static method to move" },
		"targetClass": { "type": "string", "description": "Name of the target class" },
		"targetFilePath": { "type": ["string", "null"], "description": "Path to the target file (optional, will create if doesn't exist or unspecified)" }
	},
	"required": ["solutionPath", "filePath", "methodName", "targetClass"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"methodName": "Helper",
	"targetClass": "FooHelpers",
	"targetFilePath": null
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully moved static method 'Helper' to FooHelpers in C:/src/MyApp/MyApp/Services/FooHelpers.cs. A delegate method remains in the original class to preserve the interface.
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated files |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Prevents moving the same method twice during a session unless `reset-move-history` is called; errors if target class exists elsewhere in solution. |
| **Postconditions** | Method moved; delegate remains in original class. |
| **Limits** | Not documented. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `move-to-separate-file`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>move-to-separate-file</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Moves a top-level type (class/struct/record/interface/enum/delegate) into a new file named <code>&lt;TypeName&gt;.cs</code> alongside the source file, propagating using directives and preserving the type's namespace.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the type. |
| `typeName` | `string` | ✅ | — | Name of the type to move. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the type" },
		"typeName": { "type": "string", "description": "Name of the type to move" }
	},
	"required": ["solutionPath", "filePath", "typeName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/ManyTypes.cs",
	"typeName": "Foo"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully moved type 'Foo' to C:/src/MyApp/MyApp/Services/Foo.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Creates a new file and updates the original file |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Errors if `<TypeName>.cs` already exists. |
| **Postconditions** | Type moved into its own file; source file updated. |
| **Limits** | Single-file mode clears solution cache after writing. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `rename-symbol`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>rename-symbol</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Renames a symbol across the solution using Roslyn's rename engine. You provide old/new names and optionally a 1-based line/column to disambiguate which symbol occurrence to rename.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file containing the symbol. |
| `oldName` | `string` | ✅ | — | Current name of the symbol. |
| `newName` | `string` | ✅ | — | New name for the symbol. |
| `line` | `integer \| null` | ❌ | — | Line number of the symbol (1-based, optional). |
| `column` | `integer \| null` | ❌ | — | Column number of the symbol (1-based, optional). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file containing the symbol" },
		"oldName": { "type": "string", "description": "Current name of the symbol" },
		"newName": { "type": "string", "description": "New name for the symbol" },
		"line": { "type": ["integer", "null"], "description": "Line number of the symbol (1-based, optional)" },
		"column": { "type": ["integer", "null"], "description": "Column number of the symbol (1-based, optional)" }
	},
	"required": ["solutionPath", "filePath", "oldName", "newName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"oldName": "FooService",
	"newName": "BarService",
	"line": 42,
	"column": 15
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully renamed 'FooService' to 'BarService'
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes all changed documents back to disk; updates solution cache |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Symbol must exist; optional line/column disambiguates occurrence. |
| **Postconditions** | All affected documents updated on disk. |
| **Limits** | Not documented. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `reset-move-history`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>reset-move-history</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Clears the server's in-memory record of methods moved during the current session so those methods can be moved again.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | This tool takes no arguments. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {},
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Cleared move history
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Mutates server in-memory state |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | Previously moved methods can be moved again. |
| **Limits** | Source report notes this tool warns not to use unless asked. |
| **Security & privacy** | In-memory state only; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `safe-delete-field`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>safe-delete-field</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Safely deletes a field if it is unused (solution mode uses semantic search across the solution; single-file mode uses best-effort heuristics).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `fieldName` | `string` | ✅ | — | Name of the field to delete. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"fieldName": { "type": "string", "description": "Name of the field to delete" }
	},
	"required": ["solutionPath", "filePath", "fieldName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"fieldName": "_unused"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully deleted field '_unused' in C:/src/MyApp/MyApp/Services/Foo.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Refuses to delete if references exist (solution mode). |
| **Postconditions** | Field removed if unused. |
| **Limits** | Single-file mode uses best-effort AST reference count. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `safe-delete-method`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>safe-delete-method</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Safely deletes a method if it is unused (solution mode uses symbol reference search across the solution; single-file mode checks invocation expressions in-file).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the method to delete. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"methodName": { "type": "string", "description": "Name of the method to delete" }
	},
	"required": ["solutionPath", "filePath", "methodName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"methodName": "UnusedHelper"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully deleted method 'UnusedHelper' in C:/src/MyApp/MyApp/Services/Foo.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Refuses if referenced (solution mode). |
| **Postconditions** | Method removed if unused. |
| **Limits** | Single-file mode checks for invocation expressions. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `safe-delete-parameter`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>safe-delete-parameter</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Safely deletes a parameter from a method; in solution mode updates the method declaration and all call sites across the solution.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the method containing the parameter. |
| `parameterName` | `string` | ✅ | — | Name of the parameter to delete. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"methodName": { "type": "string", "description": "Name of the method containing the parameter" },
		"parameterName": { "type": "string", "description": "Name of the parameter to delete" }
	},
	"required": ["solutionPath", "filePath", "methodName", "parameterName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"methodName": "DoThing",
	"parameterName": "unused"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully deleted parameter 'unused' from method 'DoThing' in C:/src/MyApp/MyApp/Services/Foo.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk; may update multiple documents |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Parameter must exist. |
| **Postconditions** | Parameter removed and call sites updated (solution mode). |
| **Limits** | Single-file mode is best-effort within a single file. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `safe-delete-variable`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>safe-delete-variable</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Safely deletes a local variable declaration selected by a range in the file (solution mode checks solution-wide references; single-file mode uses best-effort identifier-count heuristics).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `selectionRange` | `string` | ✅ | — | Range of the variable declaration in format <code>startLine:startCol-endLine:endCol</code>. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"selectionRange": { "type": "string", "description": "Range of the variable declaration in format 'startLine:startCol-endLine:endCol'" }
	},
	"required": ["solutionPath", "filePath", "selectionRange"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"selectionRange": "12:9-12:20"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully deleted variable 'temp' in C:/src/MyApp/MyApp/Services/Foo.cs
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Selection must identify a variable declaration. |
| **Postconditions** | Variable removed if unused. |
| **Limits** | Single-file mode uses best-effort heuristic; solution mode checks solution-wide references. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `transform-setter-to-init`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>transform-setter-to-init</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Converts a property setter (<code>set</code>) to an init-only setter (<code>init</code>) for a specified property name.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `propertyName` | `string` | ✅ | — | Name of the property to transform. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"propertyName": { "type": "string", "description": "Name of the property to transform" }
	},
	"required": ["solutionPath", "filePath", "propertyName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Models/Foo.cs",
	"propertyName": "Name"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully converted setter to init for 'Name' in C:/src/MyApp/MyApp/Models/Foo.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk |
| **Determinism** | `Depends` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Property must exist and have a setter. |
| **Postconditions** | Setter becomes init-only. |
| **Limits** | Not documented. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `unload-solution`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>unload-solution</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Unloads a solution from the in-memory solution cache (identified by its absolute <code>.sln</code> path).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" }
	},
	"required": ["solutionPath"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{ "solutionPath": "C:/src/MyApp/MyApp.sln" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `text` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Unloaded solution 'MyApp.sln' from cache
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Mutates server in-memory cache |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Depends` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Solution must be cached to unload; behavior when not cached is not documented. |
| **Postconditions** | Cached solution removed. |
| **Limits** | Not documented. |
| **Security & privacy** | In-memory state only; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `use-interface`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>use-interface</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Changes a method parameter type to a specified interface type name.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `solutionPath` | `string` | ✅ | — | Absolute path to the solution file (`.sln`). |
| `filePath` | `string` | ✅ | — | Path to the C# file. |
| `methodName` | `string` | ✅ | — | Name of the method containing the parameter. |
| `parameterName` | `string` | ✅ | — | Name of the parameter to change. |
| `interfaceName` | `string` | ✅ | — | Interface type name to use. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {
		"solutionPath": { "type": "string", "description": "Absolute path to the solution file (.sln)" },
		"filePath": { "type": "string", "description": "Path to the C# file" },
		"methodName": { "type": "string", "description": "Name of the method containing the parameter" },
		"parameterName": { "type": "string", "description": "Name of the parameter to change" },
		"interfaceName": { "type": "string", "description": "Interface type name to use" }
	},
	"required": ["solutionPath", "filePath", "methodName", "parameterName", "interfaceName"],
	"additionalProperties": false
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"solutionPath": "C:/src/MyApp/MyApp.sln",
	"filePath": "C:/src/MyApp/MyApp/Services/Foo.cs",
	"methodName": "Run",
	"parameterName": "client",
	"interfaceName": "IClient"
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
{ "type": "string" }
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Successfully changed parameter 'client' to interface 'IClient' in method 'Run' in C:/src/MyApp/MyApp/Services/Foo.cs (solution mode)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes updated file(s) to disk |
| **Determinism** | `Depends` |
| **Idempotency** | `Non-idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Parameter must exist; interfaceName must be valid in context (not validated in report). |
| **Postconditions** | Parameter type changed. |
| **Limits** | Single-file mode is best-effort. |
| **Security & privacy** | Writes local files; no external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

### 🔹 Tool: `version`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>version</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Returns the server's version and build timestamp derived from the executing assembly.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| *(none)* | — | — | — | This tool takes no arguments. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"type": "object",
	"properties": {},
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
	"description": "Version string including build timestamp"
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```text
Version: 1.2.3.0 (Build 2026-01-31 12:34:56Z)
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |
| **Determinism** | `Deterministic` |
| **Idempotency** | `Idempotent` |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | None. |
| **Postconditions** | None. |
| **Limits** | Not documented. |
| **Security & privacy** | No external network calls documented. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | `Unknown` |
| **Core implementation** | `Unknown` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `None documented` |
| **MCP prompts exposed** | `None documented` |
| **Other RPC endpoints** | `None documented` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `None documented` | — | — | — | — |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `None documented` | — |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `None documented` | — |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Install .NET runtime / SDK (version not specified in source report). |
| 2 | Run server as a local stdio MCP server (see 8.2). |

### 8.2 Typical Run Commands

```bash
dotnet run --project RefactorMCP.ConsoleApp
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | Source report notes `load-solution` initializes logging under `<solutionDir>/.refactor-mcp` and creates `<solutionDir>/.refactor-mcp/metrics`. |
| **Tracing / Metrics** | `Unknown` |

### 8.4 Performance Considerations

- Many tools prefer/require solution mode for accurate semantic behavior.
- Some tools may write multiple documents (e.g., `inline-method`, `rename-symbol`, `safe-delete-parameter`) in solution mode.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Category | Count |
|:---------|------:|
| **Total tools** | `35` |
| **Read-only** | `2` |
| **Write-only** | `14` |
| **Hybrid** | `19` |

### 9.2 Known Gaps / Unknowns

| Gap / Unknown | Notes |
|:--------------|:------|
| Analyzed ref / commit URL | Not provided in source report. |
| MCP output envelope | Source report documents logical tool return values (strings) but not the MCP protocol envelope shape. |
| Implementation anchors | File paths/symbol names not provided in source report. |

---

<div align="center">

*— End of Report —*

</div>
