<div align="center">

# 📋 MCP Server Report

## MCP Server Chart
### [antvis/mcp-server-chart](https://github.com/antvis/mcp-server-chart)

</div>

---

> **Report Date:** 2026-02-03

| Field | Value |
|:------|:------|
| **Repository** *(required)* | https://github.com/antvis/mcp-server-chart |
| **Target Path** *(optional)* | N/A |
| **Analyzed Ref** *(required)* | 13c3268eecd78c2bcbe5e15112c14c406ec40817 |
| **Commit URL** *(optional)* | https://github.com/antvis/mcp-server-chart/commit/13c3268eecd78c2bcbe5e15112c14c406ec40817 |
| **License** *(required)* | MIT |
| **Version** *(optional)* | 0.9.9 |

---

<details>
<summary><strong>📖 § 0 — Report Conventions</strong> <em>(optional)</em></summary>

<br>

| Convention | Value |
|:-----------|:------|
| **Scope** *(required)* | Full repository (README, TypeScript source, manifest) |
| **Observed in source** *(required)* | Yes |
| **Observed in docs** *(required)* | Yes |
| **Inferred** *(optional)* | Yes — output envelope for map tools depends on external service response |

#### Transport Terminology
| Term | Meaning |
|:-----|:--------|
| `stdio` | JSON-RPC over stdin/stdout |
| `sse` / `streamable-http` / `http` | HTTP-based MCP transport |

#### Path & Position Conventions

| Convention | Value |
|:-----------|:------|
| **Path model** *(required)* | Relative (no file path inputs) |
| **Line/column indexing** *(required)* | Unknown (no file path inputs) |
| **Encoding model** *(optional)* | Unknown |

#### MCP Output Envelope

| Convention | Value |
|:-----------|:------|
| **Output shape** *(required)* | mixed (charts return `content[].text` + `_meta`; map tools return service-defined MCP result) |

</details>

---

## 📌 § 1 — Initial Overview

### 1.1 What It Is *(required)*

MCP Server Chart is a TypeScript-based Model Context Protocol server that generates AntV charts and visualizations from structured inputs. It exposes a large set of chart-generation tools (26+ chart types plus spreadsheet/pivot tables) and can run over stdio or HTTP transports. It also supports private deployment by redirecting chart rendering to a custom HTTP endpoint.

### 1.2 Primary Users / Clients *(required)*

| Field | Value |
|:------|:------|
| **Intended clients** *(required)* | Any MCP client |
| **Documented clients** *(optional)* | Claude Desktop, VS Code, Cursor, Cline, Cherry Studio, Dify |

### 1.3 Primary Capabilities *(required)*

- [x] Generate 26+ AntV chart types via MCP tools
- [x] Provide map visualizations (district, path, pin) for China
- [x] Generate spreadsheet/pivot table visualizations
- [x] Support stdio, SSE, and streamable HTTP transports
- [x] Tool filtering via environment variables
- [x] Private deployment via custom chart rendering endpoint

### 1.4 Non-Goals / Exclusions *(optional)*

- Geographic visualization tools are limited to China
- Private deployment does not support the three geographic map tools

---

## 🔧 § 2 — MCP Server Metadata

### 2.1 Platform Compatibility *(required)*

| Field | Value |
|:------|:------|
| **Compatibility statement** *(required)* | Node.js-based MCP server; runs locally or via Docker with stdio/SSE/HTTP transports |
| **Documented integrations** *(optional)* | MCP clients: Claude Desktop, VS Code, Cursor, Cline, Cherry Studio, Dify |
| **Notes / constraints** *(optional)* | Map tools are China-only; external rendering service required |

### 2.2 Supported Languages *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | N/A (chart generation, not code analysis) |
| **How to extend** *(optional)* | Add new chart tool modules under src/charts and export in src/charts/index.ts |

### 2.3 License *(required)*

| Field | Value |
|:------|:------|
| **Status** *(required)* | Open-source |
| **License details** *(optional)* | MIT |

### 2.4 Implementation Language(s) *(required)*

| Field | Value |
|:------|:------|
| **Languages** *(required)* | TypeScript |

### 2.5 Dependencies *(required)*

| Category | Dependencies |
|:---------|:-------------|
| **Runtime** *(required)* | @modelcontextprotocol/sdk, axios, cors, express, zod |
| **External / System** *(optional)* | HTTP chart rendering service (default: antv-studio.alipay.com) |
| **Optional** *(optional)* | Docker (for container deployment) |
| **Paid services / Tokens** *(required)* | None |

### 2.6 Runtime Environment *(required)*

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | Mixed (local process or Docker) |
| **Started by MCP client** *(required)* | Yes |
| **Started independently** *(optional)* | Yes (SSE/HTTP modes) |
| **Env vars used** *(optional)* | Yes (VIS_REQUEST_SERVER, SERVICE_ID, DISABLED_TOOLS) |
| **Config files used** *(optional)* | Yes (manifest.json, server.json for catalogs) |
| **CLI flags used** *(optional)* | Yes (transport, host, port, endpoint, help) |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | AntV chart rendering service (HTTP), MCP SDK |
| **Architecture notes** *(optional)* | - Tools map to chart modules in src/charts
- Tool calls validate input with Zod and forward payloads to a rendering service
- Map tools call a different API path with serviceId metadata |

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
| **Secrets / Env vars** *(optional)* | SERVICE_ID (optional for map record tracking) |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | No |
| **Uses local cache** *(optional)* | No |
| **Uses external DB** *(optional)* | No (uses external HTTP rendering service) |
| **Retains user code** *(required)* | No (inputs forwarded to external service; not persisted locally) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `generate_area_chart` |
| 2 | `generate_bar_chart` |
| 3 | `generate_boxplot_chart` |
| 4 | `generate_column_chart` |
| 5 | `generate_district_map` |
| 6 | `generate_dual_axes_chart` |
| 7 | `generate_fishbone_diagram` |
| 8 | `generate_flow_diagram` |
| 9 | `generate_funnel_chart` |
| 10 | `generate_histogram_chart` |
| 11 | `generate_line_chart` |
| 12 | `generate_liquid_chart` |
| 13 | `generate_mind_map` |
| 14 | `generate_network_graph` |
| 15 | `generate_organization_chart` |
| 16 | `generate_path_map` |
| 17 | `generate_pie_chart` |
| 18 | `generate_pin_map` |
| 19 | `generate_radar_chart` |
| 20 | `generate_sankey_chart` |
| 21 | `generate_scatter_chart` |
| 22 | `generate_spreadsheet` |
| 23 | `generate_treemap_chart` |
| 24 | `generate_venn_chart` |
| 25 | `generate_violin_chart` |
| 26 | `generate_waterfall_chart` |
| 27 | `generate_word_cloud_chart` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `Theme` | "default" \| "academy" \| "dark" (spreadsheet uses "default" \| "dark") |
| `Dimensions` | `width?: number`, `height?: number` |
| `Titles` | `title?: string`, `axisXTitle?: string`, `axisYTitle?: string` |
| `Style` | `backgroundColor?: string`, `palette?: string[]`, `texture?: "default" \| "rough"` |
| `Node` | `{ name: string }` |
| `Edge` | `{ source: string; target: string; name?: string }` |
| `TreeNode` | Hierarchical tree with depth ≤ 3 (mind map, fishbone, treemap, org) |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `CallToolResult` | MCP tool result with `content[]` (text URL) and optional `_meta` spec |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | N/A (no file paths) |
| **Rate limits / retries** | Not specified (relies on external service behavior) |
| **File size limits** | Not specified |
| **Resource constraints** | Not specified |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | Unknown |
| **Error as text** | Unknown |
| **Error as `{ error: string }`** | No (uses MCP error codes) |
| **Common error codes** | -32601 (MethodNotFound), -32602 (InvalidParams), -32603 (InternalError) |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

---

### 🔹 Tool: `generate_area_chart`

<table>
<tr>
<td width="150"><strong>Name</strong></td>
<td><code>generate_area_chart</code></td>
</tr>
<tr>
<td><strong>Description</strong></td>
<td>Generates an area chart from time-series data, optionally stacked by group, and returns a renderable AntV chart spec URL.</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ time: string; value: number; group?: string }>` | ✅ | — | Time-series points; `group` required for stacking. |
| `stack` | `boolean` | ❌ | `false` | Enable stacked areas (requires `group`). |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`, `lineWidth`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [{ "time": "2015", "value": 23, "group": "A" }],
  "stack": false,
  "width": 600,
  "height": 400
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }],
  "_meta": {
    "description": "Area chart spec rendered by AntV service",
    "spec": { "type": "area" }
  }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `data` must be non-empty; `group` required when `stack` is true. |
| **Postconditions** | Returns a chart URL and spec metadata. |
| **Limits** | Service-specific rate limits not defined in repo. |
| **Security & privacy** | Input data is sent to VIS_REQUEST_SERVER over HTTP. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/area.ts (`tool`) via src/server.ts (`ListToolsRequestSchema`) |
| **Core implementation** | src/utils/callTool.ts (`callTool`) + src/utils/generate.ts (`generateChartUrl`) |

---

### 🔹 Tool: `generate_bar_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_bar_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates horizontal bar charts for categorical comparison, optionally grouped or stacked.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value: number; group?: string }>` | ✅ | — | Category/value pairs; `group` needed for grouped/stacked. |
| `group` | `boolean` | ❌ | `false` | Enable grouped bars (requires `group`). |
| `stack` | `boolean` | ❌ | `true` | Enable stacked bars (requires `group`). |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [{ "category": "A", "value": 10 }],
  "group": false,
  "stack": true
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }],
  "_meta": { "spec": { "type": "bar" } }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `data` non-empty; `group` required when `stack` or `group` enabled. |
| **Postconditions** | Returns chart URL and spec metadata. |
| **Limits** | External service constraints. |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/bar.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_boxplot_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_boxplot_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates box-and-whisker plots for distribution summaries across categories.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value: number; group?: string }>` | ✅ | — | Category/value pairs. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `startAtZero`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [{ "category": "A", "value": 10 }]
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }],
  "_meta": { "spec": { "type": "boxplot" } }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/boxplot.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_column_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_column_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates vertical column charts for categorical comparisons, with optional grouping or stacking.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value: number; group?: string }>` | ✅ | — | Category/value pairs; `group` required for grouped/stacked. |
| `group` | `boolean` | ❌ | `true` | Enable grouped columns. |
| `stack` | `boolean` | ❌ | `false` | Enable stacked columns. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [{ "category": "A", "value": 10 }],
  "group": true,
  "stack": false
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }],
  "_meta": { "spec": { "type": "column" } }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/column.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_district_map`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_district_map</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates administrative district maps for China with optional subdistrict data and styling.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `title` | `string` | ✅ | — | Map title (<=16 chars). |
| `data` | `object` | ✅ | — | Administrative region data and subdistricts. |
| `width` | `number` | ❌ | `1600` | Map width. |
| `height` | `number` | ❌ | `1000` | Map height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "title": "陕西省地级市分布图",
  "data": { "name": "陕西省", "showAllSubdistricts": true },
  "width": 1000,
  "height": 1000
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/map.png" }]
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends map payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Region name must be a valid China administrative unit. |
| **Limits** | China-only; external service determines response schema. |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/district-map.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts (`generateMap`) + src/utils/generate.ts |

---

### 🔹 Tool: `generate_dual_axes_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_dual_axes_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a dual-axes chart combining column and line series on shared categories.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `categories` | `string[]` | ✅ | — | Shared X-axis categories. |
| `series` | `Array<{ type: "column" \| "line"; data: number[]; axisYTitle?: string }>` | ✅ | — | Series definitions. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `startAtZero`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "categories": ["2015", "2016"],
  "series": [{ "type": "column", "data": [91.9, 99.1] }]
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }],
  "_meta": { "spec": { "type": "dual-axes" } }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/dual-axes.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_fishbone_diagram`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_fishbone_diagram</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a fishbone diagram from a hierarchical tree (depth ≤ 3) to visualize causes or effects.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `TreeNode` | ✅ | — | Hierarchical tree with unique node names. |
| `style` | `object` | ❌ | — | `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": { "name": "Root", "children": [{ "name": "Cause A" }] }
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
  "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/diagram.png" }],
  "_meta": { "spec": { "type": "fishbone-diagram" } }
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Node names must be unique (validated). |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/fishbone-diagram.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_flow_diagram`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_flow_diagram</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a flow diagram from nodes and edges, validating node/edge uniqueness.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `{ nodes: Array<{ name: string }>; edges: Array<{ source: string; target: string; name?: string }> }` | ✅ | — | Node-edge graph data. |
| `style` | `object` | ❌ | — | `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": {
    "nodes": [{ "name": "A" }, { "name": "B" }],
    "edges": [{ "source": "A", "target": "B" }]
  }
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
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/diagram.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | Node names must be unique; edges must reference existing nodes. |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/flow-diagram.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_funnel_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_funnel_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a funnel chart to visualize stage drop-off.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value: number }>` | ✅ | — | Stage/value pairs. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "category": "Visit", "value": 50000 }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/funnel.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_histogram_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_histogram_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a histogram from numeric data, with optional bin count.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `number[]` | ✅ | — | Numeric values to bin. |
| `binNumber` | `number` | ❌ | — | Number of bins. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [78, 88, 60, 100, 95], "binNumber": 5 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/histogram.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_line_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_line_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a line chart from time-series data with optional grouping.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ time: string; value: number; group?: string }>` | ✅ | — | Time-series points. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`, `startAtZero`, `lineWidth`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "time": "2015", "value": 23 }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/line.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_liquid_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_liquid_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a liquid/gauge chart for a single percentage value.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `percent` | `number` | ✅ | — | Value between 0 and 1. |
| `shape` | `"circle" \| "rect" \| "pin" \| "triangle"` | ❌ | `"circle"` | Liquid shape. |
| `style` | `object` | ❌ | — | `backgroundColor`, `texture`, `color`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "percent": 0.75, "shape": "circle" }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/liquid.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_mind_map`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_mind_map</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a mind map from a hierarchical tree (depth ≤ 3).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `TreeNode` | ✅ | — | Hierarchical tree with unique names. |
| `style` | `object` | ❌ | — | `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": { "name": "Root", "children": [{ "name": "Idea" }] } }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/mindmap.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/mind-map.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_network_graph`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_network_graph</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a network graph from nodes and edges.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `{ nodes: Array<{ name: string }>; edges: Array<{ source: string; target: string; name?: string }> }` | ✅ | — | Node-edge graph data. |
| `style` | `object` | ❌ | — | `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": {
    "nodes": [{ "name": "A" }, { "name": "B" }],
    "edges": [{ "source": "A", "target": "B" }]
  }
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
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/graph.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/network-graph.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_organization_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_organization_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates an organization chart from a hierarchical tree (depth ≤ 3).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `TreeNode` | ✅ | — | Hierarchical tree with optional descriptions. |
| `orient` | `"horizontal" \| "vertical"` | ❌ | `"vertical"` | Layout orientation. |
| `style` | `object` | ❌ | — | `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": { "name": "CEO", "children": [{ "name": "CTO" }] } }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/org.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/organization-chart.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_path_map`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_path_map</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a route/path map from POI sequences (China-only).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `title` | `string` | ✅ | — | Map title. |
| `data` | `Array<{ data: string[] }>` | ✅ | — | Route groups of POI names (Chinese). |
| `width` | `number` | ❌ | `1600` | Map width. |
| `height` | `number` | ❌ | `1000` | Map height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "title": "西安行程",
  "data": [{ "data": ["西安钟楼", "西安大雁塔"] }]
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
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/map.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends map payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | POI names must be Chinese locations within China. |
| **Limits** | China-only; external service determines response schema. |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/path-map.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts (`generateMap`) + src/utils/generate.ts |

---

### 🔹 Tool: `generate_pie_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_pie_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a pie or donut chart from category/value pairs.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value: number }>` | ✅ | — | Category/value pairs. |
| `innerRadius` | `number` | ❌ | `0` | Donut radius in [0,1]. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "category": "A", "value": 27 }], "innerRadius": 0.6 }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/pie.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_pin_map`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_pin_map</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a pin map for POI distributions (China-only).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `title` | `string` | ✅ | — | Map title. |
| `data` | `string[]` | ✅ | — | POI names in Chinese. |
| `markerPopup` | `object` | ❌ | — | Image popup configuration. |
| `width` | `number` | ❌ | `1600` | Map width. |
| `height` | `number` | ❌ | `1000` | Map height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "title": "景点分布", "data": ["西安钟楼", "西安大雁塔"] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/map.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends map payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | POI names must be Chinese locations within China. |
| **Limits** | China-only; external service determines response schema. |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/pin-map.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts (`generateMap`) + src/utils/generate.ts |

---

### 🔹 Tool: `generate_radar_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_radar_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a radar chart for multi-dimensional comparisons.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ name: string; value: number; group?: string }>` | ✅ | — | Dimension/value points. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`, `lineWidth`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "name": "Design", "value": 70 }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/radar.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_sankey_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_sankey_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a sankey diagram for flow quantities between stages.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ source: string; target: string; value: number }>` | ✅ | — | Flow links. |
| `nodeAlign` | `"left" \| "right" \| "justify" \| "center"` | ❌ | `"center"` | Node alignment. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [{ "source": "A", "target": "B", "value": 10 }],
  "nodeAlign": "center"
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
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/sankey.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_scatter_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_scatter_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a scatter plot from x/y points, optionally grouped.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ x: number; y: number; group?: string }>` | ✅ | — | Scatter points. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "x": 10, "y": 15, "group": "A" }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/chart.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/scatter.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_spreadsheet`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_spreadsheet</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a spreadsheet or pivot table visualization from row data.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<Record<string, string | number | null>>` | ✅ | — | Row-based table data. |
| `rows` | `string[]` | ❌ | — | Row fields for pivot table. |
| `columns` | `string[]` | ❌ | — | Column ordering or grouping. |
| `values` | `string[]` | ❌ | — | Value fields for pivot table. |
| `theme` | `"default" \| "dark"` | ❌ | `"default"` | Spreadsheet theme. |
| `width` | `number` | ❌ | `600` | Table width. |
| `height` | `number` | ❌ | `400` | Table height. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [{ "name": "John", "age": 30 }],
  "rows": ["name"],
  "values": ["age"]
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
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/table.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends table payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/spreadsheet.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_treemap_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_treemap_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a treemap from hierarchical data (depth ≤ 3).</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<TreeNode>` | ✅ | — | Hierarchical nodes with values. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "name": "Design", "value": 70 }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/treemap.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/treemap.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_venn_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_venn_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a Venn diagram from set intersection data.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ label?: string; value: number; sets: string[] }>` | ✅ | — | Set memberships and sizes. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "label": "A", "value": 10, "sets": ["A"] }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/venn.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/venn.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_violin_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_violin_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a violin plot for distribution comparison across categories.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value: number; group?: string }>` | ✅ | — | Category/value points. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `startAtZero`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "category": "A", "value": 10 }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/violin.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/violin.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_waterfall_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_waterfall_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a waterfall chart with optional intermediate and total markers.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ category: string; value?: number; isIntermediateTotal?: boolean; isTotal?: boolean }>` | ✅ | — | Waterfall steps; `value` required for non-total points. |
| `style` | `object` | ❌ | — | `backgroundColor`, `texture`, `palette` colors for positive/negative/total. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |
| `axisXTitle` | `string` | ❌ | `""` | X-axis title. |
| `axisYTitle` | `string` | ❌ | `""` | Y-axis title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{
  "data": [
    { "category": "Initial", "value": 100 },
    { "category": "Subtotal", "isIntermediateTotal": true },
    { "category": "Total", "isTotal": true }
  ]
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
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/waterfall.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 📋 Behavioral Notes

| Field | Value |
|:------|:------|
| **Preconditions** | `value` required for non-total items. |
| **Security & privacy** | Input data sent to VIS_REQUEST_SERVER. |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/waterfall.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

### 🔹 Tool: `generate_word_cloud_chart`

<table>
<tr><td width="150"><strong>Name</strong></td><td><code>generate_word_cloud_chart</code></td></tr>
<tr><td><strong>Description</strong></td><td>Generates a word cloud based on text frequency weights.</td></tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `data` | `Array<{ text: string; value: number }>` | ✅ | — | Word text and weight values. |
| `style` | `object` | ❌ | — | `backgroundColor`, `palette`, `texture`. |
| `theme` | `"default" \| "academy" \| "dark"` | ❌ | `"default"` | Theme selection. |
| `width` | `number` | ❌ | `600` | Chart width. |
| `height` | `number` | ❌ | `400` | Chart height. |
| `title` | `string` | ❌ | `""` | Chart title. |

<details>
<summary><strong>Example Input Schema</strong></summary>

```json
{ "data": [{ "text": "形成", "value": 4.272 }] }
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** | JSON |

<details>
<summary><strong>Example Output Schema</strong></summary>

```json
{ "content": [{ "type": "text", "text": "https://antv-studio.alipay.com/api/render/wordcloud.png" }] }
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** | Hybrid |
| **Classification** | Other |
| **Side effects** | Sends chart payload to external rendering service |
| **Determinism** | Depends |
| **Idempotency** | Depends |

#### 🔗 Implementation Anchors

| Field | Value |
|:------|:------|
| **Entry point / registration** | src/charts/word-cloud.ts (`tool`) |
| **Core implementation** | src/utils/callTool.ts + src/utils/generate.ts |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | None |
| **MCP prompts exposed** *(optional)* | None |
| **Other RPC endpoints** *(optional)* | HTTP `/sse`, `/mcp`, and `/messages` endpoints for SSE/streamable transports |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `VIS_REQUEST_SERVER` | ❌ | — | `https://antv-studio.alipay.com/api/gpt-vis` | Custom chart rendering service URL. |
| `SERVICE_ID` | ❌ | 🔒 | — | Service identifier for map record generation. |
| `DISABLED_TOOLS` | ❌ | — | — | Comma-separated list of tool names to disable. |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| manifest.json | MCP catalog metadata (name, version, tool list). |
| server.json | MCP registry metadata (server definition). |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "mcpServers": {
    "mcp-server-chart": {
      "command": "npx",
      "args": ["-y", "@antv/mcp-server-chart"],
      "env": { "DISABLED_TOOLS": "generate_fishbone_diagram" }
    }
  }
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--transport, -t` | Transport protocol: stdio, sse, streamable. |
| `--host, -h` | Host for SSE/streamable transports. |
| `--port, -p` | Port for SSE/streamable transports. |
| `--endpoint, -e` | Endpoint path (default `/sse` or `/mcp`). |
| `--help, -H` | Show CLI help. |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | `npm install -g @antv/mcp-server-chart` |
| 2 | Or run directly via `npx -y @antv/mcp-server-chart` |

### 8.2 Typical Run Commands *(optional)*

```bash
# stdio (default)
node build/index.js

# sse
node build/index.js -t sse

# streamable HTTP
node build/index.js -t streamable
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | Console logging via a simple logger (stdout/stderr depending on transport) |
| **Tracing / Metrics** | None |

### 8.4 Performance Considerations *(optional)*

- External rendering service latency affects response time.
- Map tools depend on third-party POI lookups and may be slower.

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | 27 |
| **Read-only** | 0 |
| **Write-only** | 0 |
| **Hybrid** | 27 |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| Map tool output schema | Depends on external VIS_REQUEST_SERVER response payload. |
| Service rate limits | Not specified in repository. |

---

<div align="center">

*— End of Report —*

</div>

| Field | Value |
|:------|:------|
| **Typical deployment** *(required)* | `Local process` / `Docker` / `Remote` / `Mixed` / `Unknown` |
| **Started by MCP client** *(required)* | `Yes` / `No` |
| **Started independently** *(optional)* | `Yes` / `No` |
| **Env vars used** *(optional)* | `Yes` / `No` (see § 7) |
| **Config files used** *(optional)* | `Yes` / `No` (name/location) |
| **CLI flags used** *(optional)* | `Yes` / `No` |

### 2.7 Underlying Engine / Framework *(required)*

| Field | Value |
|:------|:------|
| **Engine(s)** *(required)* | `LSP` / `tree-sitter` / `Joern` / `Semgrep` / `GitHub API` / `Neo4j` / etc. |
| **Architecture notes** *(optional)* | [bullet list describing key components and data flow] |

### 2.8 Transports & Auth *(required)*

| Transport | Supported |
|:----------|:---------:|
| `stdio` *(required)* | `Yes` / `No` |
| `http` / `streamable-http` *(optional)* | `Yes` / `No` |
| `sse` *(optional)* | `Yes` / `No` |

| Auth Field | Value |
|:-----------|:------|
| **Required** *(required)* | `Yes` / `No` |
| **Mechanism** *(optional)* | `token` / `OAuth` / `basic auth` / `none` / `Unknown` |
| **Secrets / Env vars** *(optional)* | [list] or `None` |

### 2.9 Data & Storage *(required)*

| Field | Value |
|:------|:------|
| **Writes local files** *(required)* | `Yes` / `No` |
| **Uses local cache** *(optional)* | `Yes` / `No` (location) |
| **Uses external DB** *(optional)* | `Yes` / `No` (which) |
| **Retains user code** *(required)* | `Yes` / `No` / `Unknown` (describe) |

---

## 🗂️ § 3 — Tool Index *(required)*

> 📝 **Tool names only** (stable TOC). Alphabetical order preferred.

| # | Tool Name |
|--:|:----------|
| 1 | `tool_name_1` |
| 2 | `tool_name_2` |
| 3 | `tool_name_3` |

---

## 🧩 § 4 — Shared Types & Conventions *(optional)*

### 4.1 Shared Input Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TypeName` | [brief definition] |

### 4.2 Shared Output Types *(optional)*

| Type Name | Definition |
|:----------|:-----------|
| `TypeName` | [brief definition] |

### 4.3 Validation & Security Rules *(optional)*

| Rule | Value |
|:-----|:------|
| **Path handling** | `absolute` / `relative` / `safe-join` / `traversal protection` |
| **Rate limits / retries** | `429` / backoff behavior |
| **File size limits** | [limits] |
| **Resource constraints** | [timeouts, max results] |

### 4.4 Error Model *(optional)*

| Signal | Value |
|:-------|:------|
| **MCP `isError`** | `Yes` / `No` / `Unknown` |
| **Error as text** | `Yes` / `No` / `Unknown` |
| **Error as `{ error: string }`** | `Yes` / `No` / `Unknown` |
| **Common error codes** | [list] |

---

## 🔨 § 5 — MCP Tools Reference *(required)*

> 📝 **One subsection per tool.** Use this exact structure for every tool.

---

### 🔹 Tool: `[tool_name]`

<table>
<tr>
<td width="150"><strong>Name</strong> <em>(required)</em></td>
<td><code>[tool_name]</code></td>
</tr>
<tr>
<td><strong>Description</strong> <em>(required)</em></td>
<td>[What it does in 1–3 sentences.]</td>
</tr>
</table>

#### ⬇️ Inputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` / `text` / `other` |

| Parameter | Type | Required | Default | Description |
|:----------|:-----|:--------:|:--------|:------------|
| `param1` | `string` | ✅ | — | [description] |
| `param2` | `number` | ❌ | `10` | [description] |

<details>
<summary><strong>Example Input Schema</strong> <em>(required)</em></summary>

```json
{
  "param1": "...",
  "param2": 10
}
```
</details>

<details>
<summary><strong>Example Input Instance</strong> <em>(optional)</em></summary>

```json
{
  "param1": "example",
  "param2": 42
}
```
</details>

#### ⬆️ Outputs

| Field | Value |
|:------|:------|
| **Format** *(required)* | `JSON` / `text` / `other` |

<details>
<summary><strong>Example Output Schema</strong> <em>(required)</em></summary>

```json
{
  "result": "..."
}
```
</details>

<details>
<summary><strong>Example Output Instance</strong> <em>(optional)</em></summary>

```json
{
  "result": "example"
}
```
</details>

#### 🧠 Semantics

| Field | Value |
|:------|:------|
| **Read / Write** *(required)* | `Read Only` / `Write Only` / `Hybrid` / `Unknown` |
| **Classification** *(required)* | `Semantic Research` / `General Research` / `Other` / `Unknown` |
| **Side effects** *(required)* | `None` or [list] |
| **Determinism** *(optional)* | `Deterministic` / `Non-deterministic` / `Depends` / `Unknown` |
| **Idempotency** *(optional)* | `Idempotent` / `Non-idempotent` / `Depends` / `Unknown` |

#### 📋 Behavioral Notes *(optional)*

| Field | Value |
|:------|:------|
| **Preconditions** | [e.g., must call `start_server` first] |
| **Postconditions** | [what changes] |
| **Limits** | [max results, timeouts] |
| **Security & privacy** | [PII, secrets, path traversal, network calls] |

#### 🔗 Implementation Anchors *(optional)*

| Field | Value |
|:------|:------|
| **Entry point / registration** | [file path / symbol name] or `Unknown` |
| **Core implementation** | [file path / symbol name] or `Unknown` |

---

## 📚 § 6 — Resources / Prompts / Additional MCP Surfaces *(optional)*

| Field | Value |
|:------|:------|
| **MCP resources exposed** *(optional)* | `None` or [list] |
| **MCP prompts exposed** *(optional)* | `None` or [list] |
| **Other RPC endpoints** *(optional)* | [text] |

---

## ⚙️ § 7 — Configuration Reference *(optional)*

### 7.1 Environment Variables *(optional)*

| Name | Required | Secret | Default | Description |
|:-----|:--------:|:------:|:--------|:------------|
| `ENV_VAR_1` | ✅ | 🔒 | — | [description] |
| `ENV_VAR_2` | ❌ | — | `default` | [description] |

### 7.2 Config Files *(optional)*

| File | Purpose |
|:-----|:--------|
| `[path/name]` | [text] |

<details>
<summary><strong>Example Config</strong></summary>

```json
{
  "key": "value"
}
```
</details>

### 7.3 CLI Flags *(optional)*

| Flag | Description |
|:-----|:------------|
| `--flag` | [description] |

---

## 🚀 § 8 — Operational Notes *(optional)*

### 8.1 Installation *(optional)*

| Step | Command / Action |
|:-----|:-----------------|
| 1 | [command or action] |
| 2 | [command or action] |

### 8.2 Typical Run Commands *(optional)*

```bash
# Example startup command
[command]
```

### 8.3 Logging & Telemetry *(optional)*

| Field | Value |
|:------|:------|
| **Logs** | [where/how] |
| **Tracing / Metrics** | `OpenTelemetry` / `None` / [other] |

### 8.4 Performance Considerations *(optional)*

- [consideration 1]
- [consideration 2]

---

## 📊 § 9 — Appendix *(optional)*

### 9.1 Tool Count Summary *(optional)*

| Category | Count |
|:---------|------:|
| **Total tools** | `[N]` |
| **Read-only** | `[N]` |
| **Write-only** | `[N]` |
| **Hybrid** | `[N]` |

### 9.2 Known Gaps / Unknowns *(optional)*

| Gap / Unknown | Notes |
|:--------------|:------|
| [Unknown field 1] | [why it's unknown] |
| [Unknown field 2] | [why it's unknown] |

---

<div align="center">

*— End of Report —*

</div>
