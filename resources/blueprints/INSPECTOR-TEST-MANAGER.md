# Inspector Test Manager Blueprint

> **Status**: Draft v1  
> **Created**: 2025-02-22  
> **Scope**: MCP Inspector execution history, feedback system, and Copilot integration

---

## 1. Vision

Transform the MCP Inspector from a single-shot execute/view tool into a **test case manager** with a Copilot feedback loop. Every tool execution creates a persistent record. Users rate outputs with thumbs up/down, write comments explaining what went wrong or what was good, and arrange flagged items by priority. Copilot reads these records via an LM tool to understand exactly which behaviors need fixing — without needing to re-execute the tools itself.

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **Execution History** | Every tool call creates a persistent, collapsible record |
| **Feedback System** | Thumbs up/down rating with freeform comments on each record |
| **Rerun-in-Place** | One-click re-execute of a saved input, updating the record's output |
| **Smart Persistence** | Flagged records survive page reloads; unflagged records are cleared |
| **Priority Ordering** | Drag-to-reorder flagged items so Copilot knows what to fix first |
| **Copilot Integration** | LM tool that lets Copilot read all records, see priorities, and analyze failures |

### 1.2 Core Workflow

```
User selects tool → writes input → clicks Execute
                                        ↓
                              New history entry appears (collapsed)
                              Shows: tool name, timestamp, status
                                        ↓
                              User expands entry → sees input + output
                              User rates with 👍 or 👎
                                        ↓
                    ┌─── 👍 Good ──────────────────── 👎 Bad ───────────┐
                    │                                                    │
              Archived (hidden)                              Stays in active list
              Comment: why it was good                       Comment: what went wrong +
                                                             expected behavior
                                                                    │
                                                             User drags to set priority
                                                                    │
                                                             User clicks "Rerun" →
                                                             re-executes saved input →
                                                             output updates in-place
                                                                    │
                                                             Copilot reads via LM tool →
                                                             sees flagged items + comments →
                                                             fixes the issue in source code
                                                                    │
                                                             User reruns → output improves →
                                                             flips to 👍 → archived
```

---

## 2. Data Model

### 2.1 Execution Record

```typescript
interface ExecutionRecord {
  /** Unique ID (UUID or timestamp-based) */
  id: string;

  /** Which MCP tool was called */
  toolName: string;

  /** The JSON input that was sent */
  input: string;

  /** The raw output content blocks */
  output: ContentBlock[];

  /** Whether the MCP response had isError: true */
  isError: boolean;

  /** ISO timestamp of original execution */
  createdAt: string;

  /** ISO timestamp of most recent rerun (null if never rerun) */
  lastRunAt: string | null;

  /** User rating */
  rating: 'good' | 'bad' | null;

  /** User comment explaining the rating */
  comment: string;

  /** Priority order within the tool's flagged list (lower = higher priority) */
  priority: number;

  /** Execution time in ms */
  durationMs: number;
}
```

### 2.2 Storage Schema

```typescript
interface InspectorStorage {
  /** Per-tool history, keyed by tool name */
  records: Record<string, ExecutionRecord[]>;

  /** Schema version for future migrations */
  version: number;
}
```

**localStorage key**: `mcp-inspector-records`

### 2.3 Persistence Rules

| Event | Behavior |
|-------|----------|
| New execution | Record created with `rating: null` |
| Page reload | **Unrated** records are **cleared**. Rated records (👍 or 👎) are **kept**. |
| Thumbs up (👍) | Record marked `good`, moved to archived section |
| Thumbs down (👎) | Record marked `bad`, stays in active flagged list |
| Rerun | Updates `output`, `lastRunAt`, `durationMs` on the same record. Does **not** reset the rating or comment. |
| Delete | Permanently removes the record |

---

## 3. UI Design

### 3.1 Layout Change

**Before** (current):
```
┌──────────────────────────────┐
│ [Tool Dropdown ▾]            │
│ ┌──────────────────────────┐ │
│ │ Input                    │ │
│ │ Monaco editor (editable) │ │
│ └──────────────────────────┘ │
│ [Execute]           12ms     │
│ ┌──────────────────────────┐ │
│ │ Output                   │ │
│ │ Monaco editor (readonly) │ │
│ └──────────────────────────┘ │
│ [Copy]                       │
└──────────────────────────────┘
```

**After** (new):
```
┌──────────────────────────────┐
│ [Tool Dropdown ▾]            │
│ ┌──────────────────────────┐ │
│ │ Input                    │ │
│ │ Monaco editor (editable) │ │
│ └──────────────────────────┘ │
│ [Execute]                    │
├──────────────────────────────┤
│ History                      │
│ ┌──────────────────────────┐ │
│ │ ▶ file_read  2:31 PM  👎 │◄── collapsed row (flagged, priority 1)
│ ├──────────────────────────┤ │
│ │ ▶ file_read  2:28 PM     │◄── collapsed row (unrated)
│ ├──────────────────────────┤ │
│ │ ▼ file_read  2:25 PM  👎 │◄── expanded row
│ │  ┌────────────────────┐  │ │
│ │  │ Input (saved)      │  │ │
│ │  │ { "path": "..." }  │  │ │
│ │  ├────────────────────┤  │ │
│ │  │ Output             │  │ │
│ │  │ { "content": ... } │  │ │
│ │  └────────────────────┘  │ │
│ │  Comment: "Missing the   │ │
│ │  helper functions..."    │ │
│ │  [Rerun] [Copy] [Delete] │ │
│ └──────────────────────────┘ │
│                              │
│ Archived (2) ▶               │◄── collapsed section for 👍 items
└──────────────────────────────┘
```

### 3.2 Collapsed Row

Each history entry as a collapsed row shows:

| Element | Description |
|---------|-------------|
| Expand chevron (▶/▼) | Click to toggle expanded view |
| Tool name | `file_read`, `codebase_map`, etc. |
| Timestamp | `2:31 PM` (relative or absolute) |
| Duration | `124ms` |
| Rating badge | 👍 (green), 👎 (red), or empty (neutral) |
| Error indicator | Red dot if `isError: true` |

### 3.3 Expanded Row

When expanded, the row shows:

| Element | Description |
|---------|-------------|
| **Input** | Read-only Monaco editor showing the saved JSON input |
| **Output** | Read-only Monaco editor showing the output |
| **Rating buttons** | 👍 👎 toggle buttons (like Copilot Chat feedback) |
| **Comment field** | Text area for explaining the rating |
| **Rerun button** | Loads input into the main editor, executes, updates this record's output |
| **Copy button** | Copies tool name + input + output + comment to clipboard |
| **Delete button** | Removes this record permanently |

### 3.4 Drag-to-Reorder

- Only flagged (👎) items are draggable
- Drag handle appears on the left of each flagged row
- Reordering updates the `priority` field on each record
- Priority 1 = most important (top of list)
- Copilot sees this priority order via the LM tool

### 3.5 Sections

The history list is divided into sections per the selected tool:

| Section | Contents | Default State |
|---------|----------|---------------|
| **Active (flagged)** | 👎 records, ordered by priority | Expanded |
| **Unrated** | New records with no rating | Expanded |
| **Archived** | 👍 records | Collapsed (shows count) |

When the user switches tools via the dropdown, the history list updates to show only records for that tool. 

---

## 4. Copilot Integration — LM Tool

### 4.1 Tool Definition

A new VS Code Language Model tool (registered via `vscode.lm.registerTool`) that gives Copilot direct read access to the inspector records.

```typescript
name: 'inspector_records'
description: 'Read MCP Inspector test records — flagged failures, good outputs, and priority ordering. Use to understand which tool behaviors need fixing without re-executing tools.'
```

### 4.2 Input Schema

```typescript
{
  /** Filter by tool name. Omit for all tools. */
  toolName?: string;

  /** Filter by rating: 'bad' (flagged), 'good' (archived), 'all'. Default: 'bad' */
  rating?: 'bad' | 'good' | 'all';

  /** Include full input/output bodies, or just summaries. Default: true */
  includeBody?: boolean;

  /** Max number of records to return. Default: 20 */
  limit?: number;
}
```

### 4.3 Output Format

```typescript
{
  totalRecords: number;
  records: Array<{
    priority: number;
    toolName: string;
    rating: 'good' | 'bad' | null;
    comment: string;
    input: string;          // JSON input
    output: string;         // Combined text output
    isError: boolean;
    createdAt: string;
    lastRunAt: string | null;
    durationMs: number;
  }>;
}
```

### 4.4 How Copilot Uses It

1. User flags outputs and writes comments like _"Missing helper functions from the import chain"_
2. User sets priority order by dragging
3. User asks Copilot: _"Fix the flagged inspector issues"_
4. Copilot calls `inspector_records` with `rating: 'bad'` → sees all failures sorted by priority
5. Copilot reads each record's input, output, and comment → understands what went wrong
6. Copilot fixes the source code → user reruns flagged items → flips to 👍 when fixed

---

## 5. Implementation Phases

### Phase 1: History List + Feedback

**Goal**: Replace single output with a per-tool execution history. Thumbs up/down + comments. localStorage persistence.

| Task | File(s) | Description |
|------|---------|-------------|
| 1.1 | `inspector/src/types.ts` | Add `ExecutionRecord` and `InspectorStorage` interfaces |
| 1.2 | `inspector/src/storage.ts` | New file: localStorage CRUD for records (load, save, delete, clear unrated) |
| 1.3 | `inspector/src/components/history-list.ts` | New file: Render collapsed/expanded history rows, rating buttons, comment field |
| 1.4 | `inspector/src/components/tool-detail.ts` | Refactor: Remove single output section. Execute creates a record and adds to history. |
| 1.5 | `inspector/src/styles.css` | Styles for history rows, rating buttons, comment areas |

**Deliverable**: Execute → collapsible history entry with 👍/👎 and comments. Flagged items persist across reloads. Unrated items are cleared on reload.

### Phase 2: Rerun + In-Place Update

**Goal**: One-click rerun of flagged items. Output updates on the same record.

| Task | File(s) | Description |
|------|---------|-------------|
| 2.1 | `history-list.ts` | Rerun button: loads saved input, calls execute handler, updates record output |
| 2.2 | `storage.ts` | `updateRecord()` method to replace output + `lastRunAt` |
| 2.3 | `history-list.ts` | Visual indicator when a record has been rerun (shows both original and latest) |

**Deliverable**: Click Rerun on a flagged item → tool executes with saved input → output updates in the same history entry.

### Phase 3: Priority Drag-to-Reorder

**Goal**: Drag-to-reorder flagged items. Priority order saved to localStorage.

| Task | File(s) | Description |
|------|---------|-------------|
| 3.1 | `history-list.ts` | HTML5 drag-and-drop on flagged rows |
| 3.2 | `storage.ts` | `reorderRecords()` method to update priority fields |
| 3.3 | `styles.css` | Drag handle, drop target indicator, drag ghost styles |

**Deliverable**: Drag flagged items to set priority order. Order persists across reloads.

### Phase 4: Copilot LM Tool

**Goal**: Copilot can read inspector records directly.

| Task | File(s) | Description |
|------|---------|-------------|
| 4.1 | `services/inspectorRecordsTool.ts` | New LM tool: `inspector_records`. Reads from same storage the Inspector uses. |
| 4.2 | `extension.ts` | Register the LM tool |
| 4.3 | Storage bridge | Mechanism for the extension to read the Inspector's localStorage data (message passing via webview, or shared file-based storage) |

**Deliverable**: Copilot can call `inspector_records` to see all flagged/good records with priority ordering, inputs, outputs, and user comments.

---

## 6. Storage Bridge (Phase 4 Detail)

The Inspector runs in a browser (Vite dev server), not a VS Code webview. The extension process can't read the browser's localStorage directly. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **A: File-based storage** | Extension reads a JSON file from disk. Inspector writes to same file instead of localStorage. | File I/O, need file watcher |
| **B: HTTP endpoint** | Inspector exposes records via its Vite dev server. LM tool fetches from `localhost:6275/api/records`. | Extra endpoint, coupling |
| **C: Dual storage** | Inspector writes to both localStorage AND a JSON file. Extension reads the file. | Redundant writes, but simple + decoupled |

**Recommended**: Option C — dual storage. The Inspector keeps using localStorage for its own UI state and also writes a `inspector-records.json` file that the LM tool reads. Simple, no coupling, works even if the Inspector isn't running.

### 6.1 File Location

```
<workspace-root>/.vscode/inspector-records.json
```

---

## 7. Open Questions

| # | Question | Options |
|---|----------|---------|
| 1 | Should archived (👍) records have a max count before auto-pruning? | 50 records? Unlimited? |
| 2 | Should the comment field support markdown? | Plain text is simpler |
| 3 | Should there be a "Clear All" button for each section? | Useful for cleanup |
| 4 | Should the history show across all tools with a filter, or strictly per-tool? | Decided: per-tool |
| 5 | Should the LM tool be read-only, or also allow Copilot to mark items as resolved? | Read-only is safer |

---

## 8. Non-Goals (Out of Scope)

- Auto-running all flagged items in batch (future consideration)
- Sharing records across machines / team members
- Visual diff between original output and rerun output (future consideration)
- Integration with VS Code's native test explorer
