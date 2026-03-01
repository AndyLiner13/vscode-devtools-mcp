<div align="center">

# 📋 MCP Server Report

## `sonarqube-mcp-server`
### [`SonarSource/sonarqube-mcp-server`](https://github.com/SonarSource/sonarqube-mcp-server)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/SonarSource/sonarqube-mcp-server` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `bf0d0486cce3fe25e0dd75fbcd20d85426dc4e57` |
| **Commit URL** | `https://github.com/SonarSource/sonarqube-mcp-server/commit/bf0d0486cce3fe25e0dd75fbcd20d85426dc4e57` |
| **License** | `SSALv1` |
| **Version** | `1.7.0.1765` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | SonarQube MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Unknown` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `Unknown` |
| **Line/column indexing** | `Unknown` |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` (per tool examples) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that exposes SonarQube analysis, issues, quality gate, and admin APIs as tools.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot CLI, GitHub Copilot coding agent, Kiro, VS Code, Windsurf, Zed |

### 1.3 Primary Capabilities

- [x] Analyze code and list issues
- [x] Query projects, metrics, rules
- [x] Admin/system endpoints (server only)

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any platform with OCI/Docker or Java 21+ runtime; stdio MCP server. |
| **Documented integrations** | Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot CLI/agent, Kiro, VS Code, Windsurf, Zed |
| **Notes / constraints** | Requires SonarQube server or IDE bridge for some tools. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Determined by SonarQube analyzers (and SonarQube for IDE for file-based analysis) |
| **How to extend** | Install analyzers in SonarQube |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | Proprietary |
| **License details** | Sonar Source-Available License Version 1 |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Java |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Java 21 runtime; Docker/OCI runtime (recommended via `mcp/sonarqube`) |
| **External / System** | SonarQube Server or SonarQube Cloud |
| **Optional** | SonarQube for IDE bridge (`SONARQUBE_IDE_PORT`) |
| **Paid services / Tokens** | `SONARQUBE_TOKEN`, plus `SONARQUBE_URL` or `SONARQUBE_ORG` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` (Docker) |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `SONARQUBE_TOKEN`, `SONARQUBE_URL`, `SONARQUBE_ORG`, `SONARQUBE_IDE_PORT`, `SONARQUBE_READ_ONLY` |
| **Config files used** | `Unknown` |
| **CLI flags used** | `Unknown` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | SonarQube analyzers + HTTP APIs |
| **Architecture notes** | Java MCP server calling SonarQube Server/Cloud APIs; optional IDE bridge. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `Yes` |
| `http` / `streamable-http` | `No` |
| `sse` | `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `Yes` |
| **Mechanism** | `token` |
| **Secrets / Env vars** | `SONARQUBE_TOKEN`, `SONARQUBE_URL`, `SONARQUBE_ORG` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (temp files for some snippet analysis paths) |
| **Uses local cache** | `Unknown` |
| **Uses external DB** | `Yes` (SonarQube server) |
| **Retains user code** | `Yes` (temporarily, snippet/file content sent for analysis) |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `analyze_code_snippet` |
| 2 | `analyze_file_list` |
| 3 | `change_sonar_issue_status` |
| 4 | `create_webhook` |
| 5 | `get_component_measures` |
| 6 | `get_project_quality_gate_status` |
| 7 | `get_raw_source` |
| 8 | `get_scm_info` |
| 9 | `get_system_health` |
| 10 | `get_system_info` |
| 11 | `get_system_logs` |
| 12 | `get_system_status` |
| 13 | `list_languages` |
| 14 | `list_portfolios` |
| 15 | `list_quality_gates` |
| 16 | `list_rule_repositories` |
| 17 | `list_webhooks` |
| 18 | `ping_system` |
| 19 | `search_dependency_risks` |
| 20 | `search_metrics` |
| 21 | `search_my_sonarqube_projects` |
| 22 | `search_sonar_issues_in_projects` |
| 23 | `show_rule` |
| 24 | `toggle_automatic_analysis` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `projectKey` | SonarQube project key string used to scope rules/search. |
| `component key` | SonarQube component key (often `projectKey:path`, e.g. `my_project_key:src/main/java/com/acme/Foo.java`). |
| `branch` / `branchKey` | Branch name to scope requests. |
| `pullRequest` / `pullRequestId` / `pullRequestKey` | Pull request identifier (field name varies by tool). |
| `paging` | SonarQube paging object `{ pageIndex, pageSize, total }`. |
| `p` / `ps` | Page index and page size for SonarQube paging params (tool-specific). |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Read-only mode** | When `SONARQUBE_READ_ONLY=true`, write tools (e.g., `change_sonar_issue_status`) are filtered out and not exposed. |
| **IDE bridge gating** | `analyze_file_list` and `toggle_automatic_analysis` are only usable when a SonarQube for IDE bridge is reachable (configured via `SONARQUBE_IDE_PORT`). |
| **Server-only tools** | `ping_system`, `get_system_status`, `get_system_health`, `get_system_info`, `get_system_logs` are SonarQube Server-only (not available on SonarQube Cloud). |
| **Paging limits** | `search_sonar_issues_in_projects.ps` must be `> 0` and `<= 500`. |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Unknown` |
| **Error as text** | `Unknown` |
| **Error as `{ error: string }`** | `Unknown` |
| **Common error codes** | `Not documented` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `analyze_code_snippet`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_code_snippet</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze a code snippet (or full file content) with SonarQube analyzers to identify code quality and security issues. Requires a SonarQube project key to load the project’s active rules.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectKey` | `string` | ✅ | — | SonarQube project key to load active rules. |
| `codeSnippet` | `string` | ✅ | — | Code snippet or file content. |
| `language` | `string` | ❌ | — | Language key; fallback to “secrets” mode if missing/unknown. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"projectKey": "my_project",
	"codeSnippet": "function hello(name) {\n  return 'hi ' + name;\n}\n",
	"language": "javascript"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"issues": [
		{
			"ruleKey": "javascript:S1481",
			"primaryMessage": "Remove this unused function parameter \"name\".",
			"severity": "MAJOR",
			"cleanCodeAttribute": "CLEAR",
			"impacts": [{"softwareQuality": "MAINTAINABILITY", "severity": "MEDIUM"}],
			"hasQuickFixes": false,
			"textRange": {"startLine": 1, "endLine": 3}
		}
	],
	"issueCount": 1
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube APIs to load active rules; may write a temp file when `language` is omitted/unknown. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Valid SonarQube configuration (`SONARQUBE_TOKEN` and either `SONARQUBE_URL` or `SONARQUBE_ORG`) and access to `projectKey`. |
| **Postconditions** | Returns issue findings for the snippet/file content. |
| **Limits** | Analyzer/plugin initialization can take up to ~30 seconds on first use. |
| **Implementation details** | Waits for analyzer/plugin download to complete; on slow initialization, returns a friendly “try again” error. Loads the project’s active rules and applies them before analysis. Falls back to a “secrets” language mode and writes the snippet to a temp file with an inferred extension if `language` is omitted/unknown. |
| **Security & privacy** | Sends code snippet/file content for analysis. |

---

### 🔹 Tool: `analyze_file_list`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>analyze_file_list</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Analyze a list of files in the current working directory using SonarQube for IDE (SonarQube/SonarLint IDE integration). Requires the IDE bridge to be available.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file_absolute_paths` | `string[]` | ✅ | — | Absolute file paths to analyze. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file_absolute_paths": [
		"C:/repo/src/index.ts",
		"C:/repo/src/utils/format.ts"
	]
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"findings": [
		{
			"severity": "MAJOR",
			"message": "Remove this unused import.",
			"filePath": "C:/repo/src/index.ts",
			"textRange": {"startLine": 3, "endLine": 3}
		}
	],
	"findingsCount": 1
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Uses the SonarQube for IDE bridge for analysis. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube for IDE bridge is reachable (configured via `SONARQUBE_IDE_PORT`). |
| **Postconditions** | Returns file-based findings. |
| **Limits** | `file_absolute_paths` must be non-empty. |
| **Implementation details** | Only registered/usable when the server detects a reachable SonarQube for IDE bridge. Fails fast with a clear error if the bridge isn’t available or if the file list is empty. |
| **Security & privacy** | Provides local file paths to the IDE bridge for analysis. |

---

### 🔹 Tool: `change_sonar_issue_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>change_sonar_issue_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Change a SonarQube issue’s status by applying a transition (<code>accept</code>, <code>falsepositive</code>, or <code>reopen</code>).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `key` | `string` | ✅ | — | Issue key. |
| `status` | `string` | ✅ | — | Transition: `accept` \| `falsepositive` \| `reopen`. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"key": "AX-HMISMFixnZED",
	"status": "falsepositive"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"message": "The issue status was successfully changed.",
	"issueKey": "AX-HMISMFixnZED",
	"newStatus": "falsepositive"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Administrative` |
| **Side effects** | Mutates the status of an existing SonarQube issue. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Server must not be in read-only mode (`SONARQUBE_READ_ONLY=true` filters this tool out). |
| **Postconditions** | Issue status transition applied. |
| **Limits** | `status` must be one of `accept`, `falsepositive`, `reopen`. |
| **Implementation details** | Filtered out when `SONARQUBE_READ_ONLY=true` (server enforces read-only by only exposing tools marked with a read-only hint). Validates `status` against a fixed enum. |
| **Security & privacy** | Sends issue transition requests to SonarQube. |

---

### 🔹 Tool: `create_webhook`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>create_webhook</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Create a new webhook for the SonarQube organization or a specific project. Requires <code>Administer</code> permission globally or on the target project.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ✅ | — | Webhook name. |
| `url` | `string` | ✅ | — | Webhook URL. |
| `projectKey` | `string` | ❌ | — | Optional project scope. |
| `secret` | `string` | ❌ | — | Optional secret for HMAC signature. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"name": "CI Notifications",
	"url": "https://example.com/sonarqube/webhook",
	"projectKey": "my_project_key",
	"secret": "super-secret"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"key": "AYx...",
	"name": "CI Notifications",
	"url": "https://example.com/sonarqube/webhook",
	"hasSecret": true
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Administrative` |
| **Side effects** | Creates a webhook in SonarQube (organization-level or project-scoped). |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Caller must have `Administer` permissions globally or on the target project. |
| **Postconditions** | Webhook is created and returned. |
| **Limits** | `name` and `url` are required inputs. |
| **Implementation details** | Required inputs: `name`, `url`. Optional inputs: `projectKey`, `secret`. If `secret` is provided, SonarQube uses it to compute `X-Sonar-Webhook-HMAC-SHA256` (hex digest) on webhook requests. |
| **Security & privacy** | Stores webhook URL and (optionally) a secret in SonarQube. |

---

### 🔹 Tool: `get_component_measures`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_component_measures</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieve metric measures for a specific SonarQube component (project, directory, file, etc.), optionally including metric metadata.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `component` | `string` | ✅ | — | Component key. |
| `metricKeys` | `string[]` | ✅ | — | Metric keys. |
| `additionalFields` | `string[]` | ❌ | — | Optional fields like `metrics`. |
| `branch` | `string` | ❌ | — | Branch name. |
| `pullRequest` | `string` | ❌ | — | Pull request key. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"component": "my_project_key",
	"metricKeys": ["bugs", "vulnerabilities", "code_smells"],
	"additionalFields": ["metrics"],
	"branch": "main"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"component": {
		"id": "AYx...",
		"key": "my_project_key",
		"name": "My Project",
		"qualifier": "TRK",
		"language": "java",
		"path": null
	},
	"measures": [
		{
			"metric": "bugs",
			"value": "12",
			"bestValue": false,
			"periods": [
				{"index": 1, "value": "-1", "bestValue": true}
			]
		}
	],
	"metrics": [
		{
			"key": "bugs",
			"name": "Bugs",
			"description": "Bugs",
			"domain": "Reliability",
			"type": "INT",
			"direction": -1,
			"qualitative": true,
			"hidden": false,
			"custom": false
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube measures APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to the referenced component and metrics. |
| **Postconditions** | Returns component measures and optional metric metadata. |
| **Limits** | Payload size depends on `metricKeys` and `additionalFields`. |
| **Implementation details** | Uses SonarQube measures API: `component` is a component key; `metricKeys` limits the returned measures. `additionalFields` supports requesting extra payload fields (commonly `metrics`) to enrich measure values with metric metadata. Branch/PR scoping is supported via standard SonarQube parameters (e.g., `branch`). |
| **Security & privacy** | Reads project metrics from SonarQube. |

---

### 🔹 Tool: `get_project_quality_gate_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_project_quality_gate_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get a project’s Quality Gate status (overall status plus condition details). You must provide one of: <code>analysisId</code>, <code>projectId</code>, or <code>projectKey</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `analysisId` | `string` | ❌ | — | Analysis id (one of these required). |
| `projectId` | `string` | ❌ | — | Project id (one of these required). |
| `projectKey` | `string` | ❌ | — | Project key (one of these required). |
| `branch` | `string` | ❌ | — | Branch (not allowed with `projectId`). |
| `pullRequest` | `string` | ❌ | — | Pull request (not allowed with `projectId`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"projectKey": "my_project",
	"branch": "main"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"status": "OK",
	"conditions": [
		{
			"metricKey": "coverage",
			"status": "OK",
			"errorThreshold": "80",
			"actualValue": "85.3"
		}
	],
	"ignoredConditions": null
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube quality gate APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | One of `analysisId`, `projectId`, or `projectKey` must be provided. |
| **Postconditions** | Returns quality gate status and condition details. |
| **Limits** | `branch` and `pullRequest` are not allowed when using `projectId`. |
| **Implementation details** | Validation rules: if none of `analysisId`, `projectId`, `projectKey` are provided, the tool returns an error; if `projectId` is used, `branch` and `pullRequest` are not allowed. |
| **Security & privacy** | Reads quality gate status from SonarQube. |

---

### 🔹 Tool: `get_raw_source`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_raw_source</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetch the raw source code content for a file component from SonarQube.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `key` | `string` | ✅ | — | SonarQube file component key. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"key": "my_project_key:src/main/java/com/acme/Foo.java"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"fileKey": "my_project_key:src/main/java/com/acme/Foo.java",
	"sourceCode": "package com.acme;\n\npublic class Foo {\n  ...\n}\n"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube source APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Target file must exist as an indexed component in SonarQube. |
| **Postconditions** | Returns source as SonarQube indexed it. |
| **Limits** | Payload size depends on file size. |
| **Implementation details** | Intended for retrieving file text as SonarQube indexed it (useful for pairing with issues and SCM line mappings). |
| **Security & privacy** | Retrieves source code from SonarQube. |

---

### 🔹 Tool: `get_scm_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_scm_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieve SCM (blame) information for a file component in SonarQube, returning author/date/revision per line.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `key` | `string` | ✅ | — | SonarQube file component key. |
| `from` | `number` | ❌ | — | Start line. |
| `to` | `number` | ❌ | — | End line. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"key": "my_project_key:src/main/java/com/acme/Foo.java",
	"from": 1,
	"to": 200
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"scmLines": [
		{
			"lineNumber": 1,
			"author": "alice",
			"datetime": "2025-01-15T13:27:44+0000",
			"revision": "a1b2c3d4"
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube SCM APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SCM/blame must be available for the component in SonarQube. |
| **Postconditions** | Returns per-line SCM metadata. |
| **Limits** | Use `from`/`to` to limit payload size. |
| **Implementation details** | `key` must be a SonarQube file component key (often `projectKey:path`). `from`/`to` provide a line range to limit payload size. |
| **Security & privacy** | Returns author/date/revision metadata from SonarQube. |

---

### 🔹 Tool: `get_system_health`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_system_health</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get the overall health status of SonarQube Server (typically <code>GREEN</code>, <code>YELLOW</code>, or <code>RED</code>), optionally including causes and per-node health details.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"health": "GREEN",
	"causes": null,
	"nodes": [
		{
			"name": "sonarqube-web-1",
			"type": "APPLICATION",
			"health": "GREEN",
			"host": "127.0.0.1",
			"port": 9000,
			"startedAt": "2026-01-30T12:00:00+0000",
			"causes": null
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube Server system APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube Server (not Cloud). |
| **Postconditions** | Returns server health and optional node details. |
| **Limits** | `causes`/`nodes` may be omitted/null depending on server response. |
| **Implementation details** | SonarQube Server only (not available on SonarQube Cloud). `causes` and `nodes` are omitted/null when not present in the server response. |
| **Security & privacy** | Reads operational status from SonarQube Server. |

---

### 🔹 Tool: `get_system_info`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_system_info</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get detailed SonarQube Server configuration and runtime info grouped into named sections (system, database, plugins, JVM state, search, settings, etc.). Requires <code>Administer</code> permissions.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"sections": [
		{
			"name": "System",
			"attributes": {
				"Version": "2025.4",
				"Status": "UP"
			}
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube Server system APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube Server (not Cloud) and `Administer` permission. |
| **Postconditions** | Returns grouped system information. |
| **Limits** | The `attributes` map is free-form and varies by edition/version. |
| **Implementation details** | SonarQube Server only (not available on SonarQube Cloud). The `attributes` payload is a free-form key/value map derived from SonarQube’s system info endpoint. |
| **Security & privacy** | Returns detailed system configuration and runtime information. |

---

### 🔹 Tool: `get_system_logs`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_system_logs</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Retrieve SonarQube Server logs in plain-text form. Requires system administration permission.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `name` | `string` | ❌ | — | Log stream: `access`, `app`, `ce`, `deprecation`, `es`, `web` (default: `app`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"name": "app"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"logType": "app",
	"content": "2026.01.30 12:00:00 INFO ...\n..."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube Server system APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube Server (not Cloud) and system administration permission. |
| **Postconditions** | Returns requested log content. |
| **Limits** | Invalid `name` values fail fast with a validation error. |
| **Implementation details** | SonarQube Server only (not available on SonarQube Cloud). Optional `name` selects the log stream; invalid values fail fast. |
| **Security & privacy** | Returns operational log content, which may contain sensitive information. |

---

### 🔹 Tool: `get_system_status`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>get_system_status</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Get SonarQube Server lifecycle status (e.g., <code>UP</code>, <code>STARTING</code>, <code>DOWN</code>) plus instance id and version.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"status": "UP",
	"description": "SonarQube Server instance is up and running",
	"id": "202501301234",
	"version": "2025.4"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube Server system APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube Server (not Cloud). |
| **Postconditions** | Returns lifecycle status, instance id, and version. |
| **Limits** | None documented. |
| **Implementation details** | SonarQube Server only (not available on SonarQube Cloud). The tool adds a human-readable `description` derived from the raw `status` value. |
| **Security & privacy** | Reads operational lifecycle status from SonarQube Server. |

---

### 🔹 Tool: `list_languages`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_languages</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List programming languages supported by the connected SonarQube instance (optionally filtered by a query string).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `q` | `string` | ❌ | — | Query to filter languages (keys/names). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"q": "java"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"languages": [
		{"key": "java", "name": "Java"},
		{"key": "kotlin", "name": "Kotlin"}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube languages APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to the connected SonarQube instance. |
| **Postconditions** | Returns supported languages. |
| **Limits** | None documented. |
| **Implementation details** | `q` matches language keys/names server-side. |
| **Security & privacy** | Reads language metadata from SonarQube. |

---

### 🔹 Tool: `list_portfolios`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_portfolios</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List portfolios available in SonarQube. Supports both SonarQube Server portfolios and SonarQube Cloud enterprise portfolios (the input parameters differ slightly).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `enterpriseId` | `string` | ❌ | — | Cloud: enterprise scope. |
| `q` | `string` | ❌ | — | Query. |
| `favorite` | `boolean` | ❌ | — | Filter favorites. |
| `draft` | `boolean` | ❌ | — | Cloud-only draft flag. |
| `pageIndex` | `number` | ❌ | — | Page index (1-based). |
| `pageSize` | `number` | ❌ | — | Page size. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"q": "platform",
	"favorite": true,
	"pageIndex": 1,
	"pageSize": 50
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"portfolios": [
		{
			"key": "my-portfolio",
			"name": "My Portfolio",
			"qualifier": "VW",
			"visibility": "private",
			"isFavorite": true
		}
	],
	"paging": {"pageIndex": 1, "pageSize": 50, "total": 1}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube portfolios APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Portfolio support depends on Server/Cloud plan/edition. |
| **Postconditions** | Returns portfolios and paging metadata. |
| **Limits** | `pageSize` max 500 on SonarQube Server (default 100). |
| **Implementation details** | SonarQube Server params: `q`, `favorite`, `pageIndex` (1-based), `pageSize` (max 500; default 100). SonarQube Cloud params: `enterpriseId`, `q`, `favorite`, `draft`, `pageIndex`, `pageSize` with validation rules: either `enterpriseId` must be provided OR `favorite` must be `true`; `favorite=true` and `draft=true` are mutually exclusive. Output uses a polymorphic `portfolios` list (server vs cloud portfolio shapes). |
| **Security & privacy** | Reads portfolio metadata from SonarQube. |

---

### 🔹 Tool: `list_quality_gates`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_quality_gates</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List all quality gates configured in the connected SonarQube instance.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"qualityGates": [
		{
			"id": 1,
			"name": "Sonar way",
			"isDefault": true,
			"isBuiltIn": true,
			"conditions": [
				{"metric": "coverage", "op": "LT", "error": 80}
			],
			"caycStatus": "COMPLIANT",
			"hasStandardConditions": true,
			"hasMQRConditions": false,
			"isAiCodeSupported": true
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube quality gate APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to quality gates API. |
| **Postconditions** | Returns available quality gates. |
| **Limits** | Some fields may be nullable depending on SonarQube edition/version. |
| **Implementation details** | Some fields are nullable depending on SonarQube edition/version (e.g., conditions list, CAYC flags). |
| **Security & privacy** | Reads quality gate configuration from SonarQube. |

---

### 🔹 Tool: `list_rule_repositories`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_rule_repositories</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List rule repositories available in SonarQube, optionally filtered by language key and/or query string.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `language` | `string` | ❌ | — | Language filter. |
| `q` | `string` | ❌ | — | Query filter. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"language": "java",
	"q": "sonar"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"repositories": [
		{"key": "java", "name": "SonarJava", "language": "java"}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube rules APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to rules API. |
| **Postconditions** | Returns repositories. |
| **Limits** | None documented. |
| **Implementation details** | Filtering is applied server-side via the SonarQube rules API. |
| **Security & privacy** | Reads repository metadata from SonarQube. |

---

### 🔹 Tool: `list_webhooks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>list_webhooks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>List webhooks configured at the SonarQube organization level or for a specific project. Requires <code>Administer</code> permission globally or on the target project.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectKey` | `string` | ❌ | — | Optional project scope (omit to list org-level webhooks). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"projectKey": "my_project_key"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"webhooks": [
		{
			"key": "AYx...",
			"name": "CI Notifications",
			"url": "https://example.com/sonarqube/webhook",
			"hasSecret": true
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Administrative` |
| **Side effects** | Calls SonarQube webhooks APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Caller must have `Administer` permissions globally or on the target project. |
| **Postconditions** | Returns configured webhooks. |
| **Limits** | None documented. |
| **Implementation details** | `projectKey` is optional; omitting it lists organization-level webhooks. |
| **Security & privacy** | Returns webhook metadata (URLs). |

---

### 🔹 Tool: `ping_system`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>ping_system</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Ping the SonarQube Server system endpoint to verify it is alive.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| _none_ | — | — | — | No parameters. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"response": "pong"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube Server system APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube Server (not Cloud). |
| **Postconditions** | Returns the raw response text (typically `pong`). |
| **Limits** | None documented. |
| **Implementation details** | SonarQube Server only (not available on SonarQube Cloud). Calls the SonarQube system ping endpoint and returns the raw response text. |
| **Security & privacy** | Sends a healthcheck request to SonarQube Server. |

---

### 🔹 Tool: `search_dependency_risks`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_dependency_risks</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search Software Composition Analysis (SCA) dependency risks for a project (and optionally a branch or PR), returning dependency risk issues paired with the dependency release they relate to.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projectKey` | `string` | ✅ | — | Project key. |
| `branchKey` | `string` | ❌ | — | Branch key. |
| `pullRequestKey` | `string` | ❌ | — | Pull request key. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"projectKey": "my_project_key",
	"branchKey": "main"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"issuesReleases": [
		{
			"key": "SCA-123",
			"severity": "HIGH",
			"type": "VULNERABILITY",
			"quality": "SECURITY",
			"status": "OPEN",
			"createdAt": "2026-01-30T12:34:56+0000",
			"vulnerabilityId": "CVE-2024-12345",
			"cvssScore": "9.8",
			"release": {
				"packageName": "lodash",
				"version": "4.17.21",
				"packageManager": "npm",
				"newlyIntroduced": true,
				"directSummary": true,
				"productionScopeSummary": true
			},
			"assignee": {"name": "alice"}
		}
	]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube SCA APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Advanced Security + SCA must be enabled (availability depends on Server/Cloud plan/edition). |
| **Postconditions** | Returns SCA dependency risk issues. |
| **Limits** | Not available unless SCA feature is enabled. |
| **Implementation details** | Inputs: `projectKey` is required; `branchKey` and `pullRequestKey` are optional. Availability gating: SonarQube Server requires 2025.4 Enterprise+ and Advanced Security (SCA enabled); SonarQube Cloud requires Advanced Security enabled for the org and SCA enabled. |
| **Security & privacy** | Returns dependency and vulnerability metadata from SonarQube. |

---

### 🔹 Tool: `search_metrics`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_metrics</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search metrics available in SonarQube, with paging support.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `q` | `string` | ❌ | — | Query filter. |
| `p` | `number` | ❌ | — | Page index. |
| `ps` | `number` | ❌ | — | Page size. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"q": "coverage",
	"p": 1,
	"ps": 50
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"metrics": [
		{
			"id": "123",
			"key": "coverage",
			"name": "Coverage",
			"description": "Coverage",
			"domain": "Coverage",
			"type": "PERCENT",
			"direction": 1,
			"qualitative": true,
			"hidden": false,
			"custom": false
		}
	],
	"total": 1,
	"page": 1,
	"pageSize": 50
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube metrics APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to metrics API. |
| **Postconditions** | Returns metrics and paging metadata. |
| **Limits** | SonarQube paging behavior depends on `p` and `ps`. |
| **Implementation details** | `p` and `ps` map to SonarQube paging parameters (page index and page size). Metric objects include type and direction metadata useful for interpreting measure values. |
| **Security & privacy** | Reads metric metadata from SonarQube. |

---

### 🔹 Tool: `search_my_sonarqube_projects`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_my_sonarqube_projects</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Find SonarQube projects available in the authenticated user’s organization; returns paginated results.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `page` | `string` | ❌ | — | Page number (string input). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"page": "1"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"projects": [
		{"key": "my_project", "name": "My Project"}
	],
	"paging": {"pageIndex": 1, "pageSize": 100, "total": 1}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube projects APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Authenticated access to SonarQube org. |
| **Postconditions** | Returns projects visible to the token. |
| **Limits** | Paging parameter is provided as a string. |
| **Implementation details** | Takes `page` as a string input but parses it as an integer with a default of 1. |
| **Security & privacy** | Reads project metadata from SonarQube. |

---

### 🔹 Tool: `search_sonar_issues_in_projects`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>search_sonar_issues_in_projects</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Search for SonarQube issues across projects with optional filters (branch, files/components, severities, qualities, statuses, issue keys), returning paginated results.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `projects` | `string[]` | ✅ | — | Project keys. |
| `branch` | `string` | ❌ | — | Branch name. |
| `pullRequestId` | `string` | ❌ | — | Pull request id. |
| `files` | `string[]` | ❌ | — | Component keys. |
| `severities` | `string[]` | ❌ | — | Severity filters. |
| `issueStatuses` | `string[]` | ❌ | — | Status filters. |
| `issueKeys` | `string[]` | ❌ | — | Issue key filters. |
| `p` | `number` | ❌ | — | Page index. |
| `ps` | `number` | ❌ | — | Page size (1–500). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"projects": ["my_project"],
	"branch": "main",
	"severities": ["HIGH", "BLOCKER"],
	"issueStatuses": ["OPEN", "CONFIRMED"],
	"p": 1,
	"ps": 50
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"issues": [
		{
			"key": "AX-issueKey123",
			"rule": "java:S2259",
			"project": "my_project",
			"component": "my_project:src/main/java/com/acme/Foo.java",
			"severity": "BLOCKER",
			"status": "OPEN",
			"message": "Null pointers should not be dereferenced",
			"cleanCodeAttribute": "LOGICAL",
			"cleanCodeAttributeCategory": "INTENTIONAL",
			"author": "jdoe",
			"creationDate": "2026-01-01T12:34:56+0000",
			"textRange": {"startLine": 42, "endLine": 42}
		}
	],
	"paging": {"pageIndex": 1, "pageSize": 50, "total": 1}
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube issues APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to the listed projects and issues APIs. |
| **Postconditions** | Returns issue search results and paging info. |
| **Limits** | `ps` must be `> 0` and `<= 500`. |
| **Implementation details** | `ps` must be > 0 and ≤ 500 (server-side constraint documented in the tool schema). Supports filtering by `branch` and `pullRequestId` as well as by `files` (component keys). |
| **Security & privacy** | Returns issue metadata from SonarQube. |

---

### 🔹 Tool: `show_rule`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>show_rule</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Fetch detailed metadata for a SonarQube rule (severity, type, language, HTML description, and impact/description sections).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `key` | `string` | ✅ | — | Rule key. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"key": "javascript:EmptyBlock"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"key": "javascript:EmptyBlock",
	"name": "Empty block should be removed",
	"severity": "MAJOR",
	"type": "CODE_SMELL",
	"lang": "js",
	"langName": "JavaScript",
	"htmlDesc": "<p>...</p>",
	"impacts": [{"softwareQuality": "MAINTAINABILITY", "severity": "MEDIUM"}],
	"descriptionSections": [{"content": "<h2>Noncompliant Code Example</h2>..."}]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Calls SonarQube rule metadata APIs. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Access to rules API. |
| **Postconditions** | Returns rule details. |
| **Limits** | None documented. |
| **Implementation details** | `htmlDesc`, `impacts`, and `descriptionSections` may be null/empty depending on the rule. |
| **Security & privacy** | Returns rule metadata from SonarQube. |

---

### 🔹 Tool: `toggle_automatic_analysis`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>toggle_automatic_analysis</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Enable or disable SonarQube for IDE automatic analysis.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `enabled` | `boolean` | ✅ | — | Enable or disable automatic analysis. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"enabled": true
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (object) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"success": true,
	"enabled": true,
	"message": "Successfully toggled automatic analysis to true."
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Utility & Configuration` |
| **Side effects** | Changes runtime behavior by enabling/disabling automatic analysis (IDE bridge). |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | SonarQube for IDE bridge must be reachable. |
| **Postconditions** | Automatic analysis is enabled/disabled in the IDE bridge. |
| **Limits** | Not available without the IDE bridge. |
| **Implementation details** | Requires SonarQube for IDE bridge availability; otherwise returns a clear “not available” error. Changes runtime behavior even though it does not mutate SonarQube server state. |
| **Security & privacy** | Affects local/IDE analysis behavior. |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | `None` (not documented in the source report) |
| **MCP prompts exposed** | `None` (not documented in the source report) |
| **Other RPC endpoints** | `Not documented` |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `SONARQUBE_TOKEN` | ✅ | ✅ | `Not documented` | Authentication token for SonarQube Server/Cloud. |
| `SONARQUBE_URL` | ✅ (Server) | ❌ | `Not documented` | SonarQube Server base URL (used for Server mode). |
| `SONARQUBE_ORG` | ✅ (Cloud) | ❌ | `Not documented` | SonarQube Cloud organization key (used for Cloud mode). |
| `SONARQUBE_IDE_PORT` | ❌ | ❌ | `Not documented` | Port for the SonarQube for IDE bridge; required for `analyze_file_list` and `toggle_automatic_analysis`. |
| `SONARQUBE_READ_ONLY` | ❌ | ❌ | `Not documented` | If `true`, filters out write tools (e.g., `change_sonar_issue_status`). |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| `Not documented` | No config files were described in the source report. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `Not documented` | No CLI flags were described in the source report. |

---

## 🚀 § 8 — Operational Notes

### 8.1 Installation

| Step | Command / Action |
|:-----|:-----------------|
| 1 | Ensure Docker/OCI is available (recommended) or a Java 21+ runtime. |
| 2 | Configure environment variables (`SONARQUBE_TOKEN` and either `SONARQUBE_URL` or `SONARQUBE_ORG`). |

### 8.2 Typical Run Commands

```bash
docker run -i --rm ... mcp/sonarqube
```

### 8.3 Logging & Telemetry

| Field | Value |
|:------|:------|
| **Logs** | `Not documented` |
| **Tracing / Metrics** | `Not documented` |

### 8.4 Performance Considerations

- Initial analyzer/plugin downloads for `analyze_code_snippet` can take up to ~30 seconds.

---

## 📊 § 9 — Appendix

### 9.1 Tool Count Summary

| Field | Value |
|:------|:------|
| **Total tools documented** | `24` |

---

<div align="center">

*— End of Report —*

</div>
