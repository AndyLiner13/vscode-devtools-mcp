<div align="center">

# 📋 MCP Server Report

## `biome-mcp-server`
### [`RyuzakiShinji/biome-mcp-server`](https://github.com/RyuzakiShinji/biome-mcp-server)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/RyuzakiShinji/biome-mcp-server` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `97c0fb2b488d3914bd767bd5d1c582642532a84c` |
| **Commit URL** | `https://github.com/RyuzakiShinji/biome-mcp-server/commit/97c0fb2b488d3914bd767bd5d1c582642532a84c` |
| **License** | `MIT` |
| **Version** | `Unknown` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | Biome MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `No` |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `absolute` (file paths passed to CLI) |
| **Line/column indexing** | `Unknown` |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `content[].text` (per MCP TS SDK) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *Small, single-purpose MCP server that exposes Biome CLI for linting and formatting over stdio.*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | VS Code, Cursor, Claude Desktop |

### 1.3 Primary Capabilities

- [ ] Linting via `biome lint`
- [ ] Formatting via `biome format`

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Any MCP client that can launch a local Node.js process over stdio. |
| **Documented integrations** | VS Code, Cursor, Claude Desktop |
| **Notes / constraints** | Requires Biome CLI on PATH. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Biome-supported file types; intended focus JS/TS |
| **How to extend** | Configure Biome and include additional file types in `paths`. |

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
| **Runtime** | Node.js 22+, `@modelcontextprotocol/sdk`, `zod` (imported directly; may be transitive unless added explicitly) |
| **External / System** | Biome CLI on PATH |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Unknown` |
| **Config files used** | `Yes` (Biome config) |
| **CLI flags used** | `Unknown` |

Notes: Runs via `tsx`; builds via `tsc`.

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | Biome CLI |
| **Architecture notes** | MCP SDK + child_process exec. |

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
| **Writes local files** | `Yes` (formatting writes) |
| **Uses local cache** | `Unknown` |
| **Uses external DB** | `No` |
| **Retains user code** | `No` |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `biome-format` |
| 2 | `biome-lint` |

---

## 🧩 § 4 — Shared Types & Conventions

### 4.1 Shared Input Types

| Type Name | Definition |
|:----------|:-----------|
| `paths` | Array of absolute file paths (passed through to Biome CLI). |
| `configPath` | Optional path to a Biome configuration file (passed to `--config-path`). |

### 4.2 Shared Output Types

| Type Name | Definition |
|:----------|:-----------|
| `McpTextResponse` | MCP SDK response object containing `content: [{ type: "text", text: string }]`. |

### 4.3 Validation & Security Rules

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` (file paths passed to CLI) |
| **Rate limits / retries** | `Not documented` |
| **File size limits** | `Not documented` |
| **Resource constraints** | `Not documented` |

### 4.4 Error Model

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Not documented` |
| **Error as text** | `Yes` (tool returns `content[].text` with an error prefix) |
| **Error as `{ error: string }`** | `Not documented` |
| **Common error codes** | `Not documented` |

---

## 🔨 § 5 — MCP Tools Reference

### 🔹 Tool: `biome-lint`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>biome-lint</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs <code>biome lint</code> on one or more paths and returns diagnostics output as text.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `paths` | `string[]` | ✅ | — | File paths to lint. |
| `configPath` | `string` | ❌ | — | Path to Biome config file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

Zod (conceptual):

```ts
{
	paths: z.array(z.string()),
	configPath: z.string().optional()
}
```

JSON Schema–style example:

```json
{
	"type": "object",
	"additionalProperties": false,
	"properties": {
		"paths": {
			"type": "array",
			"items": { "type": "string" },
			"description": "File paths to lint"
		},
		"configPath": {
			"type": "string",
			"description": "Path to the Biome configuration file"
		}
	},
	"required": ["paths"]
}
```

</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"paths": ["C:/repo/src/index.ts"],
	"configPath": "C:/repo/biome.json"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "<Biome stdout or stderr output>"
		}
	]
}
```

</details>

<details>
<summary><strong>Error Case Output Example</strong> <em>(optional)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "Error running Biome lint: <message>"
		}
	]
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | None |

#### ⚙️ Operational Details

- Executes: `biome lint [--config-path <configPath>] <paths...>`
- Uses Node.js `child_process.exec` and returns `stdout || stderr`.
- On non-zero exit status or exec failure, returns `content[].text` prefixed with `Error running Biome lint:`.

---

### 🔹 Tool: `biome-format`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>biome-format</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs <code>biome format</code> with <code>--write</code> and returns CLI output.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `paths` | `string[]` | ✅ | — | File paths to format. |
| `configPath` | `string` | ❌ | — | Path to Biome config file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

Zod (conceptual):

```ts
{
	paths: z.array(z.string()),
	configPath: z.string().optional()
}
```

JSON Schema–style example:

```json
{
	"type": "object",
	"additionalProperties": false,
	"properties": {
		"paths": {
			"type": "array",
			"items": { "type": "string" },
			"description": "File paths to format"
		},
		"configPath": {
			"type": "string",
			"description": "Path to the Biome configuration file"
		}
	},
	"required": ["paths"]
}
```

</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
	"paths": ["C:/repo/src/index.ts"],
	"configPath": "C:/repo/biome.json"
}
```

</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (MCP content array with text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "<Biome stdout or stderr output>"
		}
	]
}
```

</details>

<details>
<summary><strong>Error Case Output Example</strong> <em>(optional)</em></summary>

```json
{
	"content": [
		{
			"type": "text",
			"text": "Error running Biome format: <message>"
		}
	]
}
```

</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Write Only` |
| **Classification** | `Other` |
| **Side effects** | Writes formatted files to disk |

#### ⚙️ Operational Details

- Executes: `biome format [--config-path <configPath>] --write <paths...>`
- Uses Node.js `child_process.exec` and returns `stdout || stderr`.
- On non-zero exit status or exec failure, returns `content[].text` prefixed with `Error running Biome format:`.

---

## 🧠 § 6 — Resources / Prompts / Other MCP Surfaces

| Field | Value |
|:------|:------|
| **MCP resources exposed** | None |
| **MCP prompts exposed** | None |
| **Other RPC endpoints** | None |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| None | — | — | — | No environment variables are documented. |

### 7.2 Config Files

| File | Purpose |
|:-----|:--------|
| Biome config (e.g., `biome.json`) | Used when passed via `--config-path` through `configPath`. |

### 7.3 CLI Flags

| Flag | Description |
|:-----|:------------|
| `--config-path` | Optional; used when `configPath` is supplied. |

---

## 🏃 § 8 — Operational Notes

- Transport: MCP stdio (`StdioServerTransport`).
- Runtime prerequisites: Node.js 22+ and Biome CLI on PATH.
- Implementation shells out to the `biome` binary via `child_process.exec`.

---

<div align="center">

*— End of Report —*

</div>
