# Blueprint: Structured Line-Range Reading & Enhanced Skeleton

## Vision

Eliminate arbitrary line-range reads from the `file_read` tool. When an LLM reads a file range, it should see **non-symbol content as raw source** and **symbols collapsed into stubs**. This forces structured interaction: to read a symbol, use `target: "SymbolName"`. The goal is to make the read tool structure-aware at every level, preparing the foundation for a future edit tool with the same granularity.

## Problem Statement

Today, `startLine`/`endLine` returns raw text — a dumb dump of lines with no awareness of code structure. The LLM gets raw symbol bodies mixed into arbitrary ranges, leading to:

1. **Wasted context**: The LLM reads full symbol bodies when it only needs to know they exist
2. **No structural boundary awareness**: Edits based on arbitrary line numbers can break symbol boundaries
3. **No path to structured editing**: There's no mechanism to read only the "connective tissue" between symbols

## Design Decisions (Agreed)

| Decision | Answer |
|----------|--------|
| `startLine`/`endLine` behavior | Repurpose existing params — new structured behavior replaces raw dump |
| Symbols in range | Collapsed to stubs with instruction to use `target` |
| Non-symbols in range | Raw source code (imports, exports, comments, gaps) |
| Non-TS/JS files | Raw content (no symbols = no stubs, universal fallback) |
| `target` + `startLine/endLine` | Mutually exclusive — error if both provided |
| `recursive` + `startLine/endLine` | `recursive` has no effect — ignored silently |
| `skeleton` + `startLine/endLine` | Optional enhancement: also collapses import/export/comment blocks into stubs |
| Entire range = one symbol | Still show stub (consistency for LLM learning) |
| Gap content in skeleton | Show full raw content (gaps are tiny after all categories are accounted for) |
| Scope | Read-side only. Edit-side is a future phase. |

## Architecture

### Data Available from `UnifiedFileResult`

```
UnifiedFileResult {
  symbols: UnifiedFileSymbol[]          // name, kind, range {startLine, endLine}, children
  imports: OrphanedSymbolNode[]         // name, kind, range {start, end}
  exports: OrphanedSymbolNode[]         // name, kind, range {start, end}
  orphanComments: OrphanedSymbolNode[]  // name, kind, range {start, end}
  directives: OrphanedSymbolNode[]      // name, kind, range {start, end}
  gaps: Array<{start, end, type}>       // lines NOT covered by ANY category
  content: string                       // full file text
  totalLines: number
}
```

**Key insight**: The union of `symbols` + `imports` + `exports` + `orphanComments` + `directives` + `gaps` covers 100% of lines in the file. Every line belongs to exactly one category.

### Two Features, One System

#### Feature 1: Structured Line-Range (`startLine`/`endLine`)

When `startLine`/`endLine` is provided (on a TS/JS file):

1. Walk through lines `startLine..endLine` sequentially
2. For each line, determine its category:
   - **Symbol** → emit a stub: `--- symbol: NAME (KIND, lines X-Y) ---` + `Use { target: "NAME" } to read this symbol`
   - **Anything else** (import, export, comment, directive, gap) → emit raw source line
3. When a symbol spans multiple lines in the range, emit the stub once and skip remaining symbol lines

When `skeleton` is ALSO true (`startLine/endLine + skeleton`):

- Same as above, but imports/exports/comments/directives ALSO get collapsed into stubs
- Only gap content remains as raw source

When the file is NOT TS/JS:

- Return raw content for the range (identical to current behavior — no symbols to collapse)

#### Feature 2: Enhanced Skeleton (`skeleton: true`, no targets, no `startLine/endLine`)

Current skeleton shows:
- Import list (name + line)
- Export list (name + line)
- Comment list (name + line)
- Symbol list (name + kind + range)

Enhanced skeleton adds:
- **Gap content**: Lines that don't belong to any category are shown as raw source
- This makes skeleton a **complete file map** — nothing is hidden

### Output Formats

#### Structured Line-Range (startLine/endLine only)

```
## file_read: src/config.ts

**Range:** lines 1-30 of 100

import { foo } from 'bar';
import { baz } from 'qux';

--- symbol: CONFIG (constant, lines 5-8) ---
Use { target: "CONFIG" } to read this symbol

const logger = createLogger();

--- symbol: initializeApp (function, lines 12-28) ---
Use { target: "initializeApp" } to read this symbol

// Footer comment
export default app;
```

#### Structured Line-Range + Skeleton (startLine/endLine + skeleton)

```
## file_read: src/config.ts

**Range:** lines 1-30 of 100

--- imports (2 items, lines 1-2) ---
--- symbol: CONFIG (constant, lines 5-8) ---
Use { target: "CONFIG" } to read this symbol

const logger = createLogger();

--- symbol: initializeApp (function, lines 12-28) ---
Use { target: "initializeApp" } to read this symbol

--- comment (line 29) ---
--- export (line 30) ---
```

#### Enhanced Skeleton (file-wide)

```
## file_read: src/config.ts

**Skeleton Mode** (5 symbols)

**Imports (2):**
  [1] default-import: foo
  [2] named-import: { baz }

**Exports (1):**
  [30] inline-export: app

**Comments (1):**
  [29] line-comment: Footer comment

**Symbols (5):**
  [5-8] constant: CONFIG
  [10-10] variable: logger
  [12-28] function: initializeApp
  ...

**Gaps:**
  [4] (blank)
  [9] const logger = createLogger();
  [11] (blank)
```

Wait — this last format needs refinement. The gap at line 9 contains `const logger = createLogger();` but that should be a symbol. Let me reconsider...

Actually, `const logger = createLogger();` IS a symbol (a variable/constant). So it would already be in the symbols list. The gaps would only contain truly uncategorized content — which in practice is almost exclusively blank lines and perhaps stray semicolons or bracket-only lines.

So the enhanced skeleton gap display is really just:
- Showing that blank lines exist at specific positions (for completeness)
- Showing any rare uncategorized content verbatim

## Non-Symbol Block Snapping

Non-symbol content is grouped into **atomic blocks** by consecutive type:

- Consecutive imports → one "import block"
- Consecutive exports → one "export block"
- Consecutive comments → one "comment block"
- Gap segments from `UnifiedFileResult.gaps` → already atomic

If the requested range touches ANY line of an atomic block, the **entire block** is included. But adjacent blocks of different types are NOT pulled in.

**Example:** Lines 6-10 between two symbols:
```
Line 6: import A          ← import block (lines 6-7)
Line 7: import B          ← import block (lines 6-7)
Line 8: (blank)           ← gap (line 8)
Line 9: // comment        ← comment block (line 9)
Line 10: (blank)          ← gap (line 10)
```

If Copilot requests line 7 → output includes lines 6-7 (full import block) but NOT lines 8-10.

## Symbol Stub Spacing

Symbol stubs always have a blank line above and below them, mirroring natural file spacing:

```
const x = 42;

--- symbol: handleRequest (function, lines 12-28) ---
Use { target: "handleRequest" } to read this symbol

export default app;
```

## Implementation Plan

### Phase A: Core Infrastructure — Line Classification & Block Grouping

**File**: `mcp-server/src/tools/file/file-read.ts`

**Step 1**: Create a type-aware block grouper that merges consecutive items of the same non-symbol type:

```typescript
interface NonSymbolBlock {
  type: 'import' | 'export' | 'comment' | 'directive' | 'gap';
  startLine: number;
  endLine: number;
  items: OrphanedSymbolNode[];  // empty for gaps
}
```

**Step 2**: Create a line classifier that maps every line to its owning entity:

```typescript
type LineOwner =
  | { type: 'symbol'; symbol: UnifiedFileSymbol }
  | { type: 'block'; block: NonSymbolBlock };

function classifyLines(
  structure: UnifiedFileResult,
  startLine: number,
  endLine: number,
): Map<number, LineOwner>
```

**Step 3**: Create a range expander that snaps the requested range to block boundaries:

```typescript
function expandToBlockBoundaries(
  requestedStart: number,
  requestedEnd: number,
  lineOwners: Map<number, LineOwner>,
): { expandedStart: number; expandedEnd: number }
```

If `requestedStart` falls inside a non-symbol block, expand backward to the block's start.
If `requestedEnd` falls inside a non-symbol block, expand forward to the block's end.
Symbols are NOT expanded — they're stubs regardless of partial overlap.

### Phase B: Structured Line-Range Renderer

**File**: `mcp-server/src/tools/file/file-read.ts`

Create a renderer that walks the expanded range and emits output:

```typescript
function renderStructuredRange(
  structure: UnifiedFileResult,
  allLines: string[],
  startLine: number,
  endLine: number,
  collapseSkeleton: boolean, // true when skeleton+startLine/endLine combo
): string
```

Algorithm:
1. Classify lines using `classifyLines()`
2. Snap range to block boundaries via `expandToBlockBoundaries()`
3. Walk lines `expandedStart` to `expandedEnd` sequentially
4. Track "currently emitting" state to avoid duplicate stubs:
   - When hitting a `symbol` line → if this is the symbol's first line in range, emit blank line + stub + blank line; skip remaining lines of this symbol
   - When hitting a non-symbol `block` line → if `collapseSkeleton`, emit stub on first line; else emit raw source
   - Always emit gap content as raw source
5. Return assembled output string

### Phase C: Enhanced Skeleton (Gap Display)

**File**: `mcp-server/src/tools/file/file-read.ts`

After the existing skeleton sections (Imports, Exports, Comments, Directives, Symbols), add a **Gaps** section:

```
**Gaps:**
  [4] (blank)
  [11] (blank)
  [29] const strayLine = true;
```

- `blank` gaps → show `(blank)` or `(N blank lines)` for multi-line blank gaps
- `unknown` gaps → show raw content inline

### Phase D: Validation & Error Handling

Add to the handler's parameter validation:

```typescript
// Mutual exclusivity: target + startLine/endLine
if (targets.length > 0 && (params.startLine !== undefined || params.endLine !== undefined)) {
  // Return error message
}
```

Handle edge cases:
- `startLine` without `endLine` → read to end of file
- `endLine` without `startLine` → read from start of file
- `startLine > endLine` → error
- `startLine > totalLines` → error
- Values clamped to valid range (1..totalLines)

### Phase E: Wire Into Handler

Modify the handler's control flow:

```
Current flow:
  1. skeleton + no targets → skeleton mode
  2. no targets → legacy raw dump (startLine/endLine or full file)
  3. targets → target mode

New flow:
  1. target + startLine/endLine → ERROR (mutually exclusive)
  2. skeleton + no targets + no startLine/endLine → ENHANCED skeleton mode (with gaps)
  3. startLine/endLine + no targets → STRUCTURED line-range mode
  4. no targets, no startLine/endLine → full file raw dump (unchanged)
  5. targets → target mode (unchanged)
```

### Phase F: Update Tool Description

Update the `description` string and `schema` descriptions to reflect new behavior:

- Remove "Legacy" from `startLine`/`endLine` descriptions
- Add documentation about structured line-range behavior
- Document mutual exclusivity with `target`
- Add examples of the new behavior

## File Changes Summary

| File | Change |
|------|--------|
| `mcp-server/src/tools/file/file-read.ts` | Main implementation: `classifyLines()`, `renderStructuredRange()`, enhanced skeleton, validation, handler rewiring, updated descriptions |

All changes are contained within a single file. No new files needed. No type changes to `UnifiedFileResult` or the extension layer.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Range covers only part of a symbol | Stub still emitted (the stub shows the FULL symbol range, not just the visible portion) |
| Range starts/ends mid-symbol | Stub emitted at the first line of the symbol that falls within the range |
| Multiple symbols adjacent (no gap between them) | Back-to-back stubs |
| Symbol with 0-line range (single line) | Stub emitted normally |
| File has no symbols (only imports/gaps) | No stubs at all — entire range is raw content |
| Non-TS/JS file | Raw content, identical to current behavior |
| Empty range (startLine === endLine) | Single line — raw or stub depending on category |
| `startLine` only (no `endLine`) | Read from startLine to end of file |
| `endLine` only (no `startLine`) | Read from line 1 to endLine |

## Stub Format

Standard stub (symbol only):
```
--- symbol: CONFIG (constant, lines 5-8) ---
Use { target: "CONFIG" } to read this symbol
```

Skeleton-combo stubs (when skeleton + startLine/endLine):
```
--- imports (3 items, lines 1-3) ---
--- export (line 30) ---  
--- comment (line 29) ---
--- directive (line 1) ---
```

## Testing Strategy

1. **Unit tests for `classifyLines()`**: Verify correct categorization with mock `UnifiedFileResult` data
2. **Unit tests for `renderStructuredRange()`**: Verify output format with known inputs
3. **Integration tests via tool invocation**: Use client-workspace files to verify end-to-end
4. **Edge case tests**: Partial symbol ranges, empty files, non-TS/JS files, mutual exclusivity errors

## Future: Edit Tool Foundation

Once this read-side is complete, the edit tool gains:
- **Structural awareness**: It knows which lines are symbols and which aren't
- **Safety-net validation**: Before applying an edit, verify it doesn't modify symbol boundaries
- **Same granularity**: Edit non-symbol content by range, edit symbols by `target`

The only additional work for the edit tool is the safety-net layer that rejects edits crossing symbol boundaries.
