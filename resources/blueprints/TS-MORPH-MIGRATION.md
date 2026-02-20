# Blueprint: ts-morph Migration & Invariant Testing

## Status: PLANNING

## Goal

Replace VS Code's `DocumentSymbolProvider` with ts-morph as the **sole parsing engine** for
`file_read` AND the symbol resolution step of `file_edit`. Restrict `file_read` to TS/JS family
files only (.ts, .tsx, .js, .jsx, .cjs, .mjs, .cts, .mts). Add automated invariant testing
using industry conformance test suites as inputs.

## Architectural Principles

### Tool Boundary Rules

| Tool | Purpose | What It Returns |
|---|---|---|
| **file_read** | Read what's literally IN a file | Symbol structure, file content, imports/exports/comments (all physically in the file) |
| **file_edit** | Edit a file with safety checks | Edit result + auto-propagation + error report |
| **codebase_trace** | Rich TypeScript analysis | References, call hierarchy, type flows, type info (computed, cross-file) |

**file_read MUST NOT return:**
- Computed signatures (that's trace territory)
- Type-level information (return types, parameter types)
- Cross-file references (extends external types, implements external interfaces)
- JSDoc as symbol metadata (already available via `#comments`)

**file_read MUST return:**
- What's literally written in the file: symbol names, kinds, ranges, children
- Keywords that are physically present: `export`, `async`, `static`, `abstract`
- File organizational metadata: imports, exports, comments, directives, gaps

### Read → Edit Consistency

Both `file_read` and `file_edit` MUST use the same symbol provider. If file_read shows
a symbol named `UserService.findById`, file_edit's `target: "UserService.findById"` must
resolve to the same thing. Switching file_read to ts-morph means file_edit's symbol
resolution also switches to ts-morph.

The file_edit **safety layer** (rename propagation, code actions, diagnostics) stays on
VS Code APIs — those features require VS Code and ts-morph cannot replace them.

## Motivation

### Problems with VS Code's DocumentSymbolProvider

1. **Unreliable naming**: Returns `<unknown>` for CJS `module.exports` assignments
2. **Split source of truth**: Symbols come from VS Code, orphaned content comes from ts-morph — two
   different engines parsing the same file creates inconsistency bugs
3. **Two round trips**: `fileGetSymbols()` + `fileExtractOrphanedContent()` = two client-pipe calls
4. **Untestable**: Requires VS Code Extension Host running, can't test in CI with Vitest
5. **No export awareness**: Symbol tree doesn't know if symbols are exported
6. **Inconsistent line indexing**: FileSymbol uses 0-indexed lines, OrphanedContent uses 1-indexed

### What ts-morph Gives Us

- Wraps the **same TypeScript compiler** that powers VS Code's TS server
- Full AST access with typed node APIs
- Zero VS Code API dependencies (`orphaned-content.ts` already proves this)
- Native export/modifier awareness: `.isExported()`, `.isAsync()`, `.isAbstract()`
- Synchronous, deterministic, testable

---

## Architecture

### Before (Current)

```
file_read (MCP Server)
  │
  ├─ fileGetSymbols()                 ──→ client-pipe ──→ VS Code Extension Host
  │    Returns: FileSymbol[] (0-indexed)       │            └─ vscode.executeDocumentSymbolProvider
  │                                             │
  ├─ fileExtractOrphanedContent()     ──→ client-pipe ──→ VS Code Extension Host
  │    Returns: OrphanedContentResult (1-indexed)           └─ ts-morph
  │
  └─ fileReadContent()                ──→ client-pipe ──→ VS Code Extension Host
       Returns: FileReadContentResult                       └─ vscode.workspace.openTextDocument
```

Three separate client-pipe calls. Two different parsing engines. Two different line indexing schemes.

### After (Migration Complete)

```
file_read (MCP Server)
  │
  └─ fileExtractStructure()           ──→ client-pipe ──→ VS Code Extension Host
       Returns: UnifiedFileResult (1-indexed)               └─ ts-morph ONLY
         ├── symbols: FileSymbol[]                              (file-structure-extractor.ts)
         ├── content: string                                    - Zero VS Code APIs
         ├── imports: SymbolNode[]                              - Fully testable with Vitest
         ├── exports: SymbolNode[]                              - Reads files via fs
         ├── orphanComments: SymbolNode[]
         ├── directives: SymbolNode[]
         ├── gaps: GapInfo[]
         └── stats: Stats
```

One call. One engine. One line indexing scheme. Fully testable.

---

## Interface Design (Tactical Upgrade)

### FileSymbol (upgraded)

```typescript
interface FileSymbolRange {
  startLine: number;   // 1-indexed (was 0-indexed)
  startChar: number;   // 0-indexed (column)
  endLine: number;     // 1-indexed (was 0-indexed)
  endChar: number;     // 0-indexed (column)
}

interface FileSymbol {
  name: string;
  kind: string;              // "function" | "class" | "interface" | "type" | "enum" | "variable"
                             // | "method" | "property" | "constructor" | "getter" | "setter"
                             // | "module" | "namespace" | "constant"
  detail?: string;           // e.g. return type, variable type
  range: FileSymbolRange;
  // REMOVED: selectionRange   — never used by file_read
  children: FileSymbol[];
  exported?: boolean;        // NEW: true if symbol is exported (ts-morph knows this)
  modifiers?: string[];      // NEW: ["async", "static", "abstract", "readonly", "private", etc.]
}
```

### Changes from current FileSymbol

| Field | Before | After | Impact |
|---|---|---|---|
| `range.startLine` | 0-indexed | 1-indexed | Update formatSkeletonEntry, formatContentWithPlaceholders, handler |
| `range.endLine` | 0-indexed | 1-indexed | Same |
| `selectionRange` | Present (unused) | Removed | No impact — never read by file_read |
| `exported` | Not available | Optional boolean | Additive — no breaking changes |
| `modifiers` | Not available | Optional string array | Additive — no breaking changes |

### OrphanedSymbolNode (unchanged)

Already 1-indexed. No changes needed:

```typescript
interface OrphanedSymbolNode {
  name: string;
  kind: string;
  detail?: string;
  range: { start: number; end: number };  // 1-indexed
  children?: OrphanedSymbolNode[];
}
```

### UnifiedFileResult (new)

```typescript
interface UnifiedFileResult {
  /** ts-morph symbol tree — replaces VS Code DocumentSymbolProvider */
  symbols: FileSymbol[];
  /** File content (full text) */
  content: string;
  /** Total line count */
  totalLines: number;
  /** Import declarations with line ranges */
  imports: OrphanedSymbolNode[];
  /** Export declarations with line ranges */
  exports: OrphanedSymbolNode[];
  /** Standalone comments */
  orphanComments: OrphanedSymbolNode[];
  /** Shebangs, prologue directives */
  directives: OrphanedSymbolNode[];
  /** Gap ranges */
  gaps: Array<{ start: number; end: number; type: 'blank' | 'unknown' }>;
  /** Statistics */
  stats: {
    totalImports: number;
    totalExports: number;
    totalOrphanComments: number;
    totalDirectives: number;
    totalBlankLines: number;
    coveragePercent: number;
  };
}
```

---

## Files Changed

### New Files

| File | Purpose |
|---|---|
| `extension/services/codebase/file-structure-extractor.ts` | Core extraction: ts-morph → FileSymbol[] + OrphanedContent. Zero VS Code imports. |
| `documentation/blueprints/TS-MORPH-MIGRATION.md` | This blueprint (reference throughout refactor) |

### Modified Files

| File | Changes |
|---|---|
| `extension/client-handlers.ts` | New handler `file.extractStructure` calling the new extractor. `handleFileGetSymbols` kept but deprecated for file_read path. |
| `mcp-server/src/client-pipe.ts` | New `fileExtractStructure()` function + `UnifiedFileResult` type. Old `fileGetSymbols` + `fileExtractOrphanedContent` kept for other consumers but deprecated for file_read. |
| `mcp-server/src/tools/file/file-read.ts` | Update handler to use `fileExtractStructure()` instead of two separate calls. Adjust for 1-indexed ranges. |
| `mcp-server/src/tools/file/file-edit.ts` | Update symbol resolution to use `fileExtractStructure()` instead of `fileGetSymbols()`. Safety layer unchanged (stays on VS Code APIs). |
| `mcp-server/src/tools/file/symbol-resolver.ts` | Adjust for 1-indexed `FileSymbol.range` (if needed — check usage). |
| `mcp-server/src/tools/file/file-read.ts` :: `formatSkeletonEntry` | Adjust range display for 1-indexed (may be a no-op if already converting). |
| `mcp-server/src/tools/file/file-read.ts` :: `formatContentWithPlaceholders` | Adjust line arithmetic for 1-indexed. |

### Unmodified Files

| File | Why |
|---|---|
| `extension/services/codebase/orphaned-content.ts` | Existing orphaned content extraction stays — the new extractor will call into it |
| `extension/services/codebase/ts-project.ts` | Project management stays exactly as-is |
| `mcp-server/src/tools/file/symbol-resolver.ts` :: `resolveSymbolTarget` | Uses `range.startLine`/`range.endLine` — may need adjustment for 1-indexed but logic stays the same |

---

## Implementation Phases

### Phase 1: Build ts-morph Symbol Extractor

**Goal**: Create `file-structure-extractor.ts` that produces `FileSymbol[]` from ts-morph.

**New file**: `extension/services/codebase/file-structure-extractor.ts`

**Core function**:
```typescript
function extractSymbols(sourceFile: SourceFile): FileSymbol[]
```

**ts-morph API mapping**:

| ts-morph API | → FileSymbol kind |
|---|---|
| `sourceFile.getFunctions()` | `"function"` |
| `sourceFile.getClasses()` | `"class"` |
| `sourceFile.getInterfaces()` | `"interface"` |
| `sourceFile.getTypeAliases()` | `"type"` |
| `sourceFile.getEnums()` | `"enum"` |
| `sourceFile.getVariableStatements()` → `.getDeclarations()` | `"variable"` or `"constant"` |
| `sourceFile.getModules()` | `"module"` or `"namespace"` |
| `class.getMethods()` | `"method"` (child) |
| `class.getProperties()` | `"property"` (child) |
| `class.getConstructors()` | `"constructor"` (child) |
| `class.getGetAccessors()` | `"getter"` (child) |
| `class.getSetAccessors()` | `"setter"` (child) |
| `interface.getProperties()` | `"property"` (child) |
| `interface.getMethods()` | `"method"` (child) |
| `enum.getMembers()` | `"property"` (child) |

**CJS-specific patterns** (detected via AST node inspection):

| Pattern | Detection |
|---|---|
| `module.exports = { ... }` | ExpressionStatement → BinaryExpression → PropertyAccessExpression where left is `module.exports` |
| `module.exports.foo = ...` | Same pattern with `.foo` |
| `exports.foo = ...` | ExpressionStatement → BinaryExpression → `exports.foo` |
| `const x = require('...')` | VariableDeclaration → CallExpression where callee is `require` |

**Acceptance criteria**:
- Produces `FileSymbol[]` with 1-indexed ranges
- All top-level declarations extracted with correct names and kinds
- Class/interface/enum children extracted recursively
- CJS patterns handled (module.exports, exports.x)
- `exported` flag set correctly
- `modifiers` array populated (async, static, abstract, etc.)

### Phase 2: Unify with Orphaned Content

**Goal**: Create `extractFileStructure()` — one call that returns everything.

**Function signature**:
```typescript
function extractFileStructure(filePath: string): UnifiedFileResult
```

**Implementation**:
1. Get/create ts-morph SourceFile (reuse `getWorkspaceProject`)
2. Call `extractSymbols(sourceFile)` → `FileSymbol[]`
3. Call existing `extractImports(sourceFile)` → imports
4. Call existing `extractExports(sourceFile)` → exports
5. Call existing `extractDirectives(sourceFile)` → directives
6. Call existing `extractOrphanComments(sourceFile, symbolRanges, ...)` → comments
   - Symbol ranges now come from our own symbols (step 2), not VS Code
7. Call existing `computeGaps(...)` → gaps
8. Read file content: `sourceFile.getFullText()` or `fs.readFileSync(filePath, 'utf-8')`
9. Return unified result

**Key change**: In `extractOrphanComments`, the `symbolRanges` parameter currently comes from
VS Code's DocumentSymbolProvider (via the `handleExtractOrphanedContent` handler). After migration,
it comes from our own `extractSymbols()` output. Same data, better source.

### Phase 3: New Client-Pipe Handler

**Goal**: Wire up `file.extractStructure` handler in the extension.

**Changes**:

1. **`extension/client-handlers.ts`**: Add new handler:
```typescript
async function handleFileExtractStructure(params: Record<string, unknown>) {
  const filePath = paramStr(params, 'filePath');
  if (!filePath) throw new Error('filePath is required');
  return extractFileStructure(filePath);
}
```
Register as `'file.extractStructure'`.

2. **`mcp-server/src/client-pipe.ts`**: Add new function:
```typescript
export async function fileExtractStructure(filePath: string): Promise<UnifiedFileResult> {
  const result = await sendClientRequest('file.extractStructure', { filePath }, 30_000);
  assertResult<UnifiedFileResult>(result, 'file.extractStructure');
  return result;
}
```

### Phase 4: Update file-read.ts AND file-edit.ts

**Goal**: Make `file_read` and `file_edit` use the new unified call.

**Changes in handler**:

1. Replace:
```typescript
const symbolsResult = await fileGetSymbols(filePath);
```
With:
```typescript
const structure = await fileExtractStructure(filePath);
```

2. Replace all `symbolsResult.symbols` references with `structure.symbols`

3. Replace all `fileExtractOrphanedContent(filePath)` calls with `structure` (already have it)

4. Replace all `fileReadContent(filePath, start, end)` with:
```typescript
const lines = structure.content.split('\n');
const content = lines.slice(startLine - 1, endLine).join('\n');
```

5. Adjust range arithmetic for 1-indexed:
   - `symbol.range.startLine` is now 1-indexed (was 0-indexed)
   - No more `startLine + 1` in display formatting
   - `params.startLine` (user input) is already 1-indexed → no conversion needed
   - `formatContentWithPlaceholders` line math changes

6. Remove `fileHighlightReadRange` calls (optional — this is editor UI, not parsing)
   - Decision: keep for UX but it's no longer required for correctness

**Changes in file-edit.ts handler:**

1. Replace:
```typescript
const symbolsResult = await fileGetSymbols(filePath);
```
With:
```typescript
const structure = await fileExtractStructure(filePath);
```

2. Replace `symbolsResult.symbols` with `structure.symbols`

3. Adjust `editStartLine`/`editEndLine` for 1-indexed (symbol ranges are now 1-indexed):
```typescript
// Before: editStartLine = match.symbol.range.startLine; (0-indexed)
// After:  editStartLine = match.symbol.range.startLine - 1; (convert 1-indexed to 0-indexed for safety layer)
```

4. **Safety layer stays unchanged** — it still uses `fileGetSymbols` for before/after diffing,
   `fileExecuteRename` for propagation, etc. These are VS Code-only features.
   - NOTE: Consider migrating safety layer's before/after diffing to ts-morph in a future phase

### Phase 5: Vitest + Invariant Testing

**Goal**: Automated invariant testing against hand-crafted + industry test files.

**Setup**:
- Add `vitest` as devDependency in `mcp-server/package.json` (or a test-specific package.json)
- Add `ts-morph` as devDependency for tests (needed to import the extractor directly)
- Create `vitest.config.ts`

**Test structure**:
```
tests/
  invariants/
    file-structure.invariants.test.ts    ← Define all 16 invariants
    fixtures/
      test262/                           ← Curated subset of tc39/test262-parser-tests/pass
      ts-conformance/                    ← Curated subset of microsoft/TypeScript conformance
  unit/
    symbol-resolver.test.ts              ← Pure function tests (no ts-morph needed)
    format-skeleton.test.ts              ← Pure function tests
    format-content.test.ts               ← Pure function tests
```

**Invariant definitions** (16 universal truths):

```typescript
// Range invariants
1. ∀ symbol:  1 ≤ symbol.range.startLine ≤ symbol.range.endLine ≤ result.totalLines
2. ∀ child of parent:  parent.range.startLine ≤ child.range.startLine
                        ≤ child.range.endLine ≤ parent.range.endLine
3. ∀ sibling pair (a, b) where indexOf(a) < indexOf(b):
     a.range.endLine < b.range.startLine  (no overlap)
4. ∀ import:  1 ≤ range.start ≤ range.end ≤ result.totalLines
5. ∀ export:  1 ≤ range.start ≤ range.end ≤ result.totalLines
6. ∀ comment: 1 ≤ range.start ≤ range.end ≤ result.totalLines

// Naming invariants
7. ∀ symbol: symbol.name.length > 0
8. ∀ symbol: symbol.kind ∈ KNOWN_SYMBOL_KINDS
9. ∀ comment: comment.kind ∈ KNOWN_COMMENT_KINDS (11 kinds)

// Consistency invariants
10. stats.totalImports === imports.length
11. stats.totalExports === exports.length
12. stats.totalOrphanComments === orphanComments.length
13. stats.totalDirectives === directives.length
14. 0 ≤ stats.coveragePercent ≤ 100

// Non-overlap invariants
15. No line appears in both a symbol range AND a gap range
16. Function completes without throwing for any valid TS/JS file (crash invariant)
```

**Industry test suite acquisition**:
```bash
# Curated subsets — not the full 30k files
git clone --depth=1 https://github.com/nicolo-ribaudo/tc39-test262-parser-tests tests/fixtures/test262
# Take only /pass directory — valid JS files

git clone --depth=1 --filter=blob:none --sparse https://github.com/nicolo-ribaudo/TypeScript
cd TypeScript && git sparse-checkout set tests/cases/conformance
# Copy conformance/ to tests/fixtures/ts-conformance
```

### Phase 6: Cleanup

**Goal**: Remove deprecated VS Code DocumentSymbolProvider dependency from file_read flow.

**Changes**:
1. ~~`handleFileGetSymbols`~~ — Keep for other consumers (codebase tools), but file_read no longer
   uses it
2. ~~`serializeDocSymbol`~~ — Same, keep but no longer on file_read path
3. Remove the `<unknown>` → `module.exports` workaround (no longer needed — ts-morph handles CJS
   natively)
4. Update `handleExtractOrphanedContent` to no longer call VS Code DocumentSymbolProvider for symbol
   ranges — use the new extractor's own symbols instead

---

## Verification Plan

### Per-Phase Verification

| Phase | Verification Method |
|---|---|
| Phase 1 | Manual: Run `extractSymbols()` against `ast-parser-test.ts`, compare symbol count and names against current `file_read` skeleton output |
| Phase 2 | Manual: Run `extractFileStructure()` against all 6 test files, verify unified result structure |
| Phase 3 | Manual: Call `file_read` tool, verify output matches pre-migration output |
| Phase 4 | Manual: Full burnout test — all 6 test files × all 4 modes (skeleton × recursive) × all targets (#imports, #exports, #comments, symbol names) |
| Phase 5 | Automated: Vitest runs invariant checks against hundreds/thousands of files |
| Phase 6 | Manual: Verify no regressions in other codebase tools that still use DocumentSymbolProvider |

### Rollback Plan

Each phase is independently deployable. If a phase introduces regressions:
1. Revert to previous phase's code
2. The old handlers (`file.getSymbols`, `file.extractOrphanedContent`) remain available throughout
   the migration
3. `file_read` can be switched back to old calls with a single-line change

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ts-morph produces different symbol tree than VS Code provider | Medium | High | Phase 1 verification: compare side-by-side before switching |
| CJS patterns not fully detected by ts-morph AST inspection | Medium | Medium | Existing `orphaned-content.ts` already handles CJS imports/exports — leverage same patterns |
| Performance regression (ts-morph slower than VS Code provider) | Low | Medium | ts-morph is synchronous — no round-trip overhead. Single call vs two calls. Likely faster. |
| Breaking other tools that depend on `fileGetSymbols` | Low | High | Keep old handlers — only file_read switches to new path |
| Industry test files include invalid syntax that crashes ts-morph | Medium | Low | Wrap in try/catch, report crashes as invariant violations |

---

## Dependencies

### Runtime Dependencies

- `ts-morph` ^27.0.2 (already in extension)
- `fs`, `path` (Node.js builtins)

### Dev Dependencies (new)

- `vitest` (test runner)
- `ts-morph` (needed in test project to import extractor directly)

### No New Runtime Dependencies

The migration adds zero new runtime dependencies. ts-morph is already installed in the extension.

---

## Success Criteria

- [ ] `file_read` produces identical output for all 6 client-workspace files (pre/post migration)
- [ ] Single client-pipe round trip instead of two (or three)
- [ ] All 16 invariants pass for hand-crafted test files
- [ ] All 16 invariants pass for ≥90% of industry conformance test files
- [ ] `file_read` rejects non-TS/JS files with a clear error message
- [ ] Zero VS Code API imports in the critical path
- [ ] Tests run in Vitest without VS Code Extension Host
