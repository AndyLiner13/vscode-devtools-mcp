<div align="center">

# 📋 MCP Server Report

## `codeql-mcp`
### [`JordyZomer/codeql-mcp`](https://github.com/JordyZomer/codeql-mcp)

</div>

---

> **Report Date:** `2026-01-31`

| Field | Value |
|:------|:------|
| **Repository** | `https://github.com/JordyZomer/codeql-mcp` |
| **Target Path** | `N/A` |
| **Analyzed Ref** | `Unknown` |
| **Commit URL** | `Unknown` |
| **License** | `Unknown` |
| **Version** | `1.0.0` |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** | codeql-mcp MCP server (full repo) |
| **Observed in source** | `Yes` |
| **Observed in docs** | `Yes` |
| **Inferred** | `Yes` (parameter types inferred from example schemas in source report) |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** | `absolute` (file paths) |
| **Line/column indexing** | `1-based` (per report) |
| **Encoding model** | `Unknown` |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** | `direct JSON` (string/object results) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is

> *MCP server that wraps CodeQL query server operations (register DB, evaluate queries, decode results).*

### 1.2 Primary Users / Clients

| Field | Value |
|:------|:------|
| **Intended clients** | `Any MCP client` |
| **Documented clients** | `Cursor` |

### 1.3 Primary Capabilities

- Register CodeQL databases.
- Evaluate queries and decode results.
- Locate class/predicate positions in QL files.

### 1.4 Non-Goals / Exclusions

- `Unknown`

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility

| Field | Value |
|:------|:------|
| **Compatibility statement** | Cross-platform (Python + CodeQL CLI). |
| **Documented integrations** | `Unknown` |
| **Notes / constraints** | Requires `codeql` binary on PATH. |

### 2.2 Supported Languages

| Field | Value |
|:------|:------|
| **Languages** | Any language supported by installed CodeQL distribution/databases |
| **How to extend** | Install CodeQL packs/databases |

### 2.3 License

| Field | Value |
|:------|:------|
| **Status** | `Unknown` |
| **License details** | `Unknown` |

### 2.4 Implementation Language(s)

| Field | Value |
|:------|:------|
| **Languages** | Python |

### 2.5 Dependencies

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** | Python 3, `fastmcp`, `httpx` |
| **External / System** | `codeql` CLI (on PATH) |
| **Optional** | `Unknown` |
| **Paid services / Tokens** | `None` |

### 2.6 Runtime Environment

| Field | Value |
|:------|:------|
| **Typical deployment** | `Local process` |
| **Started by MCP client** | `Yes` |
| **Started independently** | `No` |
| **Env vars used** | `Yes (PATH)` |
| **Config files used** | `No` |
| **CLI flags used** | `Yes (-t sse)` |

### 2.7 Underlying Engine / Framework

| Field | Value |
|:------|:------|
| **Engine(s)** | CodeQL query server (`query-server2`) |
| **Architecture notes** | FastMCP wraps CodeQL JSON-RPC server. |

### 2.8 Transports & Auth

| Transport | Supported |
|:----------|:---------:|
| `stdio` | `No` |
| `http` / `streamable-http` | `No` |
| `sse` | `Yes` |

| Auth Field | Value |
|:-----------|:------|
| **Required** | `No` |
| **Mechanism** | `none` |
| **Secrets / Env vars** | `None` |

### 2.9 Data & Storage

| Field | Value |
|:------|:------|
| **Writes local files** | `Yes` (bqrs output) |
| **Uses local cache** | `Unknown` |
| **Uses external DB** | `No` |
| **Retains user code** | `Unknown` |

---

## 🗂️ § 3 — Tool Index

| # | Tool Name |
|--:|:----------|
| 1 | `decode_bqrs` |
| 2 | `evaluate_query` |
| 3 | `find_class_position` |
| 4 | `find_predicate_position` |
| 5 | `quick_evaluate` |
| 6 | `register_database` |

---

## 🔨 § 5 — MCP Tools Reference

---

### 🔹 Tool: `decode_bqrs`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>decode_bqrs</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Decodes a CodeQL <code>.bqrs</code> results file via <code>codeql bqrs decode --format &lt;fmt&gt;</code> and returns the decoded text (docstring notes <code>csv</code> for problem queries or <code>json</code> for path-problems).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `bqrs_path` | `string` | ✅ | — | Path to an existing `.bqrs` file. |
| `fmt` | `string` | ✅ | — | Decode format (e.g., `json` or `csv`). |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"bqrs_path": "C:/temp/quickeval.bqrs",
	"fmt": "json"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (string containing decoded JSON or CSV text) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
"{\n  \"#select\": {\n    \"columns\": [],\n    \"tuples\": []\n  }\n}\n"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Other` |
| **Side effects** | Runs external `codeql` CLI to decode results; no persistent writes documented. |

---

### 🔹 Tool: `evaluate_query`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>evaluate_query</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Runs a CodeQL query on a given database and returns the output <code>.bqrs</code> path (or an error message string if evaluation fails).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `query_path` | `string` | ✅ | — | Path to the `.ql` query file. |
| `db_path` | `string` | ✅ | — | Path to the CodeQL database directory. |
| `output_path` | `string` | ✅ | — | Output path for the `.bqrs` file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"query_path": "C:/path/to/query.ql",
	"db_path": "C:/path/to/codeql-db",
	"output_path": "/tmp/eval.bqrs"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
"/tmp/eval.bqrs"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Executes a query and writes results to an output `.bqrs` file. |

---

### 🔹 Tool: `find_class_position`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_class_position</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds the 1-based start/end line/column of a class identifier in a QL file (for quick evaluation).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file` | `string` | ✅ | — | Path to the `.ql` file to scan. |
| `name` | `string` | ✅ | — | Class name to locate. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file": "C:/path/to/query.ql",
	"name": "MyClass"
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
	"start_line": 12,
	"start_col": 7,
	"end_line": 12,
	"end_col": 14
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Reads local file and computes identifier coordinates. |

---

### 🔹 Tool: `find_predicate_position`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>find_predicate_position</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Finds the 1-based start/end line/column of a predicate identifier in a QL file (for quick evaluation).</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file` | `string` | ✅ | — | Path to the `.ql` file to scan. |
| `name` | `string` | ✅ | — | Predicate name to locate. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file": "C:/path/to/query.ql",
	"name": "myPredicate"
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
	"start_line": 27,
	"start_col": 1,
	"end_line": 27,
	"end_col": 12
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Read Only` |
| **Classification** | `Semantic Research` |
| **Side effects** | Reads local file and computes identifier coordinates. |

---

### 🔹 Tool: `quick_evaluate`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>quick_evaluate</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Quick-evaluates a CodeQL class or predicate symbol in a <code>.ql</code> file against a registered database and writes results to a <code>.bqrs</code> file.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `file` | `string` | ✅ | — | Path to the `.ql` file to evaluate. |
| `db` | `string` | ✅ | — | Path to a registered CodeQL database directory. |
| `symbol` | `string` | ✅ | — | Class or predicate name to quick-evaluate. |
| `output_path` | `string` | ✅ | — | Output path for the `.bqrs` file. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"file": "C:/path/to/query.ql",
	"db": "C:/path/to/codeql-db",
	"symbol": "MyPredicateOrClass",
	"output_path": "C:/temp/quickeval.bqrs"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
"C:/temp/quickeval.bqrs"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Semantic Research` |
| **Side effects** | Reads local query/database; triggers query-server evaluation; writes `.bqrs` file to `output_path`. |

---

### 🔹 Tool: `register_database`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>register_database</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>Registers a CodeQL database given a filesystem path; validates the path exists and contains <code>src.zip</code>, then calls the CodeQL query server’s <code>evaluation/registerDatabases</code>.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `db_path` | `string` | ✅ | — | Filesystem path to the CodeQL database directory. |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
	"db_path": "C:/path/to/codeql-db"
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | `JSON` (string) |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
"Database registered: C:/path/to/codeql-db"
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | `Hybrid` |
| **Classification** | `Other` |
| **Side effects** | Reads local filesystem for validation; mutates query-server state by registering databases. |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `db_path` must exist and contain `src.zip`. |
| **Postconditions** | Database becomes available to the running query server for evaluation. |

---

## ⚙️ § 7 — Configuration Reference

### 7.1 Environment Variables

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `PATH` | ✅ | — | — | Must include the CodeQL CLI location for the `codeql` executable. |

<div align="center">

*— End of Report —*

</div>
