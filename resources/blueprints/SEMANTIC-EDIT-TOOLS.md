# Semantic Edit Tools Blueprint

**Status:** Proposed  
**Decision:** Build custom MCP tools that bypass VS Code's native CodeMapper (GPT-4.1 middleware) and apply edits directly from the selected model with an intelligent safety layer  
**Architecture:** MCP server tools → client pipe → VS Code extension → VS Code stable APIs  
**Related:** `FILE-TOOLS.md` (original vision, partially superseded), `CUSTOM-PARSER-TO-VSCODE-API.md` (codebase_map migration)

---

## 1. Executive Summary

Build two MCP tools — `file_read` and `file_edit` — that replace VS Code's native file editing workflow with a superior system where:

1. **The model you select generates code → our tool applies it DIRECTLY** — no GPT-4.1 CodeMapper reinterpreting your model's output
2. **An intelligent safety layer** detects intent from code diffs, auto-propagates renames across the codebase, auto-fixes cascading errors via VS Code Code Actions, and reports what it couldn't fix
3. **Pure VS Code stable APIs** — DocumentSymbols, FoldingRanges, diagnostics, rename provider, Code Actions — no custom parsers, no proposed APIs

### Why This Is Better Than Native

| Factor | Native EditFile (GPT-4.1 CodeMapper) | Our System (Direct Apply + Safety) |
|--------|--------------------------------------|-------------------------------------|
| **Model fidelity** | Selected model's code is RE-INTERPRETED by GPT-4.1 | Selected model's code is applied AS-IS |
| **Speed** | Extra LLM round-trip for every edit | Instant application via deterministic diff |
| **Cost** | Double LLM calls (your model + GPT-4.1) | Single LLM call only |
| **Accuracy** | Two AI layers = compounding errors ("telephone game") | One AI layer + deterministic application |
| **Safety** | No intent detection, no auto-propagation | DocumentSymbol diff, rename propagation, auto-fix |
| **Model choice** | GPT-4.1 is hardcoded for code mapping | Uses whichever model you selected |

### Discovery: How Native EditFile Actually Works

Research into `microsoft/vscode` and `microsoft/vscode-copilot-chat` revealed:

```
Native flow:
  Your model (e.g., Claude Opus) generates code
    → EditTool sends { explanation, filePath, code } to vscode_editFile_internal
      → codeMapperService.mapCode() delegates to AIMappedEditsProvider2 (PROPOSED API)
        → Fast edit attempt → if fails →
          → Slow rewrite: calls GPT-4.1 to figure out where to place the changes
            → Model outputs TextEdits which are streamed back and applied
```

Key findings:
- `registerMappedEditsProvider2` is a **proposed API** — we cannot use it
- The CodeMapper's "slow rewrite" literally calls **GPT-4.1** regardless of which model you selected
- The "fast edit" path does simple string matching; the fallback is a full AI round-trip

---

## 2. Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Copilot / LLM                       │
│  Uses file_read to understand code, file_edit to change  │
└──────────────────────┬──────────────────────────────────┘
                       │ MCP Tool Calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                            │
│  tools/file/file-read.ts    tools/file/file-edit.ts     │
│  ┌──────────┐               ┌───────────────────────┐   │
│  │ file_read │               │ file_edit              │   │
│  │ targeting │               │ diff + safety layer    │   │
│  └──────────┘               └───────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ Named Pipe RPC
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  VS Code Extension                       │
│  services/fileService.ts                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │  DocumentSymbols │ FoldingRanges │ Diagnostics     │  │
│  │  Rename Provider │ Code Actions  │ workspace.fs    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 RPC Methods

| RPC Method | Direction | Purpose |
|------------|-----------|---------|
| `file.getSymbols` | MCP → Extension | Get DocumentSymbols for a file |
| `file.getFoldingRanges` | MCP → Extension | Get FoldingRanges for a file |
| `file.readContent` | MCP → Extension | Read file content by line range |
| `file.applyEdit` | MCP → Extension | Apply a WorkspaceEdit |
| `file.getDiagnostics` | MCP → Extension | Get diagnostics for file(s) |
| `file.executeRename` | MCP → Extension | Execute rename provider |
| `file.getCodeActions` | MCP → Extension | Get available code actions for a range |
| `file.applyCodeAction` | MCP → Extension | Apply a specific code action |
| `file.getReferences` | MCP → Extension | Find all references to a symbol |

### 2.3 File Structure

```
extension/
  services/
    fileService.ts              # VS Code API orchestrator
    fileService.handlers.ts     # RPC handler registration
mcp-server/
  src/
    tools/
      file/
        index.ts                # Tool exports
        file-read.ts            # file_read MCP tool
        file-edit.ts            # file_edit MCP tool
        safety-layer.ts         # Intent detection + propagation + auto-fix
        symbol-diff.ts          # DocumentSymbol snapshot comparison
        types.ts                # Shared types
```

---

## 3. Tool Specifications

### 3.1 `file_read`

> Semantic content reading powered by VS Code DocumentSymbols. Read any symbol by name instead of by line number.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | string | ✓ | — | Path to file (relative or absolute) |
| `target` | string | ✗ | — | Symbol name: `"UserService"`, `"UserService.findById"` |
| `startLine` | number | ✗ | — | Fallback: line-based range start (1-indexed) |
| `endLine` | number | ✗ | — | Fallback: line-based range end (1-indexed) |
| `includeMetadata` | boolean | ✗ | true | Include symbol kind, range, children list |
| `maxDepth` | number | ✗ | — | Max nesting depth for children list |

**Targeting Priority:** `target` > `startLine/endLine` > full file

**How It Works:**

```
1. file.getSymbols(filePath) → DocumentSymbol[]
2. If target param: traverse symbol tree to find matching name
   - "UserService" → find top-level symbol named "UserService"
   - "UserService.findById" → find "UserService", then child "findById"
3. file.readContent(filePath, startLine, endLine) → actual source text
4. Return: content + metadata (kind, range, children names)
```

**Returns:**

```typescript
interface FileReadResult {
  file: string;
  content: string;
  range: { startLine: number; endLine: number };
  totalLines: number;
  // When symbol targeting is used:
  symbol?: {
    name: string;
    kind: string;           // 'class', 'function', 'method', 'interface', etc.
    children?: string[];    // Names of child symbols (methods, properties)
  };
}
```

**Output Examples:**

Symbol read:
```
## file_read: src/services/UserService.ts → UserService.findById

**Symbol:** `findById` (method)
**Range:** lines 8-12 of 45
**Parent:** UserService (class)

```typescript
async findById(id: string): Promise<User | null> {
  return this.db.users.findUnique({ where: { id } });
}
```​

**Siblings:** constructor, findAll, create, update, delete
```

---

### 3.2 `file_edit`

> Direct model-to-code editing with an intelligent safety layer. The model you selected writes the code, our tool applies it directly and catches issues.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | string | ✓ | — | Path to file |
| `code` | string | ✓ | — | The complete new content for the targeted region |
| `target` | string | ✗ | — | Symbol name to scope the edit: `"UserService.findById"` |
| `startLine` | number | ✗ | — | Fallback: line-based range start (1-indexed) |
| `endLine` | number | ✗ | — | Fallback: line-based range end (1-indexed) |

**Targeting Priority:** `target` > `startLine/endLine` > full file

**How It Works (The Safety Layer):**

```
┌──────────────────────────────────────────────────────────┐
│  PHASE 1: VIRTUAL PRE-CHECK (invisible, no file changes) │
├──────────────────────────────────────────────────────────┤
│  1. Get DocumentSymbols for the REAL file → oldSymbols    │
│  2. Resolve target: find the symbol range to replace      │
│  3. Create virtual document with the edit applied         │
│  4. Get DocumentSymbols for VIRTUAL doc → newSymbols      │
│  5. Compare oldSymbols ↔ newSymbols → detect intents:     │
│     - Same range, different name → RENAME                 │
│     - Symbol gone → DELETE                                │
│     - New symbol appeared → ADD                           │
│     - Same name, different range → BODY CHANGE            │
│  6. For detected renames: count references (impact scope) │
│  7. Build change plan                                     │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│  PHASE 2: ATOMIC APPLY                                    │
├──────────────────────────────────────────────────────────┤
│  1. Apply primary edit via workspace.applyEdit()          │
│  2. For detected renames:                                 │
│     a. Find a reference to old name in another file       │
│     b. executeRenameProvider → propagate across workspace │
│  3. Wait for language server to settle (~500ms)           │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│  PHASE 3: AUTO-FIX + REPORT                               │
├──────────────────────────────────────────────────────────┤
│  1. Get workspace diagnostics → find new errors           │
│  2. For each error:                                       │
│     a. executeCodeActionProvider → get quick fixes         │
│     b. If fix available: apply it automatically            │
│  3. Build result report:                                  │
│     - What was changed                                    │
│     - What was auto-propagated (renames, imports)          │
│     - What was auto-fixed (code actions)                  │
│     - What errors remain (Copilot needs to address)       │
└──────────────────────────────────────────────────────────┘
```

**Returns:**

```typescript
interface FileEditResult {
  success: boolean;
  file: string;
  target?: string;
  // What the safety layer detected
  detectedIntents: Array<{
    type: 'rename' | 'delete' | 'add' | 'body_change';
    symbol: string;
    details?: string;  // e.g., "renamed to AuthService"
  }>;

  // What was auto-propagated
  propagated: Array<{
    type: 'rename' | 'import_update';
    filesAffected: string[];
    totalEdits: number;
  }>;

  // What was auto-fixed via Code Actions
  autoFixed: Array<{
    file: string;
    fix: string;       // e.g., "Updated import path"
  }>;

  // What errors remain
  remainingErrors: Array<{
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
  }>;

  summary: string;
}
```

**Output Examples:**

Simple body change (no propagation needed):
```
## file_edit: Applied edit to UserService.findById

✅ **Success** — body change applied

**Changes:**
- Replaced body of `findById` (method) in src/services/UserService.ts

**Safety Check:** 0 new errors detected
```

Rename auto-detected and propagated:
```
## file_edit: Applied edit to UserService (rename detected)

✅ **Success** — rename detected and propagated

**Detected Intent:** Rename `UserService` → `AuthService`

**Auto-Propagated:**
- Renamed symbol across 12 files (34 edits)

**Auto-Fixed:**
- src/index.ts: Updated import path

**Safety Check:** 0 remaining errors
```

Edit with cascading errors:
```
## file_edit: Applied edit to UserService.findById (errors detected)

⚠️ **Partial Success** — edit applied, 3 errors remain

**Changes:**
- Replaced `findById` → now requires 2 parameters

**Auto-Fixed:**
- src/tests/UserService.test.ts: Added missing argument (Code Action)

**Remaining Errors (3):**
1. src/controllers/UserController.ts:15 — Expected 2 arguments, but got 1
2. src/services/AuthService.ts:22 — Expected 2 arguments, but got 1
3. src/controllers/AdminController.ts:8 — Expected 2 arguments, but got 1

**Suggestion:** Update the 3 callers of `findById` to pass the new `includeInactive` parameter.
```

---

## 4. Safety Layer: Intent Detection Algorithm

### 4.1 DocumentSymbol Diff

The core of the safety layer is comparing DocumentSymbol snapshots before and after an edit.

```
Input: oldSymbols[], newSymbols[] (flat list within the edited scope)
Output: DetectedIntent[]

Algorithm:
  1. Index old symbols by name → oldByName
  2. Index new symbols by name → newByName
  3. Index old symbols by range → oldByRange
  4. Index new symbols by range → newByRange

  // Pass 1: Match by name (exact matches = body changes)
  for each symbol in newByName:
    if oldByName has same name:
      mark as BODY_CHANGE (same symbol, content changed)
      remove from both indexes

  // Pass 2: Match by position (range overlap = renames)
  for each remaining new symbol:
    find old symbol with overlapping range:
      if found:
        mark as RENAME (old.name → new.name)
        remove from both indexes

  // Pass 3: Unmatched = adds and deletes
  remaining old symbols → mark as DELETE
  remaining new symbols → mark as ADD
```

### 4.2 What Each Intent Triggers

| Detected Intent | Safety Layer Action |
|-----------------|---------------------|
| **BODY_CHANGE** | No propagation. Check diagnostics only. |
| **RENAME** | Find old name reference in another file → `executeRenameProvider` → propagate across workspace |
| **DELETE** | `executeReferenceProvider` on old name → report affected files |
| **ADD** | No action needed. |

### 4.3 Rename Propagation Strategy

After detecting a rename (e.g., `UserService` → `AuthService`):

```
1. Primary edit already applied (file now says "AuthService")
2. Search workspace for files importing from this file
3. Find a reference to the OLD name ("UserService") in another file
4. Call executeRenameProvider at that reference position with newName="AuthService"
5. VS Code's TypeScript language server handles the full propagation:
   - Updates all imports
   - Updates all usages
   - Handles re-exports
```

### 4.4 Auto-Fix via Code Actions

After all edits are applied, check workspace diagnostics:

```
1. Get diagnostics for all affected files
2. Filter for NEW errors (not pre-existing)
3. For each new error:
   a. executeCodeActionProvider(uri, errorRange) → CodeAction[]
   b. Filter for "preferred" or "quick fix" actions
   c. Apply the fix via workspace.applyEdit
4. Re-check diagnostics → report any remaining errors
```

---

## 5. Virtual Document Strategy

To detect intent WITHOUT modifying the real file first, we create a virtual document:

```typescript
// Extension-side implementation sketch:

async function createVirtualPreview(
  filePath: string,
  targetRange: Range,
  newContent: string
): Promise<DocumentSymbol[]> {
  // Read current file content
  const doc = await workspace.openTextDocument(URI.file(filePath));
  const fullText = doc.getText();

  // Apply edit in memory
  const before = fullText.substring(0, doc.offsetAt(targetRange.start));
  const after = fullText.substring(doc.offsetAt(targetRange.end));
  const virtualContent = before + newContent + after;

  // Create virtual document
  const virtualDoc = await workspace.openTextDocument({
    content: virtualContent,
    language: doc.languageId
  });

  // Get symbols for virtual document
  const symbols = await commands.executeCommand<DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    virtualDoc.uri
  );

  return symbols ?? [];
}
```

The virtual document is:
- Created in memory (never saved to disk)
- Not visible in the editor (no tab opens)
- Processed by the language server for symbol analysis
- Disposed after comparison

---

## 6. Supported File Types

### 6.1 Initial Focus: TypeScript / JavaScript

Full safety layer support:
- DocumentSymbol targeting (functions, classes, methods, interfaces, types, enums, constants)
- Rename propagation via TypeScript language server
- Auto-fix via TypeScript Code Actions
- Full diagnostic coverage (syntax + type errors)

### 6.2 Future: Other File Types

DocumentSymbol targeting works for all languages with a language server:

| File Type | DocumentSymbols Available? | Rename Provider? | Diagnostics? |
|-----------|---------------------------|------------------|---------------|
| TypeScript/JavaScript | ✅ Full hierarchy | ✅ Cross-file | ✅ Full type checking |
| JSON/JSONC | ✅ Key hierarchy | ❌ | ✅ Syntax only |
| YAML | ✅ Key hierarchy | ❌ | ✅ Schema validation |
| CSS/SCSS/Less | ✅ Selectors | ❌ | ✅ Syntax + lint |
| HTML | ✅ Elements | ❌ | ✅ Syntax |
| Markdown | ✅ Headings | ❌ | ❌ |
| TOML | ✅ Key hierarchy | ❌ | ✅ Syntax |

The safety layer degrades gracefully:
- No rename provider → skip propagation, report potential impacts
- No diagnostics → skip validation, warn about unchecked edit

---

## 7. Implementation Phases

### Phase 0: Foundation (RPC Infrastructure)
- [ ] Define RPC methods in extension `client-handlers.ts`
- [ ] `file.getSymbols` — wrapper around `executeDocumentSymbolProvider`
- [ ] `file.getFoldingRanges` — wrapper around `executeFoldingRangeProvider`
- [ ] `file.readContent` — read file content by line range
- [ ] `file.applyEdit` — apply `WorkspaceEdit`
- [ ] `file.getDiagnostics` — get current diagnostics for a file
- [ ] Client pipe functions in `client-pipe.ts`

### Phase 1: file_read (Semantic Reading)
- [ ] MCP tool definition with schema
- [ ] Symbol name resolution (traverse DocumentSymbol tree)
- [ ] Dot-path navigation: `"Class.method"` → parent → child
- [ ] Fallback to line-range when no target specified
- [ ] Metadata formatting (kind, children list, sibling info)

### Phase 2: file_edit (Direct Apply)
- [ ] MCP tool definition with schema
- [ ] Target resolution (reuse file_read's symbol finder)
- [ ] Simple diff: compare old range content with new `code` → produce TextEdits
- [ ] Apply via `workspace.applyEdit()`
- [ ] Return basic result (success/failure, range applied)

### Phase 3: Safety Layer — Intent Detection
- [ ] DocumentSymbol snapshot before edit
- [ ] Virtual document creation + symbol extraction
- [ ] Symbol diff algorithm (name match → position match → add/delete)
- [ ] Intent classification (RENAME, DELETE, ADD, BODY_CHANGE)

### Phase 4: Safety Layer — Propagation & Auto-Fix
- [ ] `file.executeRename` RPC method
- [ ] `file.getCodeActions` + `file.applyCodeAction` RPC methods
- [ ] Rename propagation via `executeRenameProvider`
- [ ] Post-edit diagnostic collection
- [ ] Auto-fix via Code Action application
- [ ] Result reporting (propagated files, auto-fixes, remaining errors)

### Phase 5: Polish
- [ ] Multi-symbol edit handling (batch intent detection)
- [ ] Error recovery (rollback on catastrophic failure)
- [ ] Performance optimization (caching, batching)
- [ ] Documentation and examples

---

## 8. Performance Considerations

### 8.1 Latency Budget

| Operation | Target | Method |
|-----------|--------|--------|
| file_read (symbol lookup) | < 100ms | DocumentSymbols are cached by language server |
| file_edit (apply) | < 200ms | Single WorkspaceEdit |
| Safety: symbol diff | < 50ms | In-memory array comparison |
| Safety: virtual doc symbols | < 300ms | Language server processes virtual doc |
| Safety: rename propagation | < 2s | executeRenameProvider (depends on workspace size) |
| Safety: auto-fix | < 1s per error | executeCodeActionProvider + apply |
| **Total file_edit** | **< 3s typical** | Most time in propagation + diagnostics settling |

### 8.2 Language Server Warm-Up

DocumentSymbolProvider requires the language server to be initialized. For files that haven't been opened:
- `workspace.openTextDocument(uri)` triggers language server initialization
- First call may be slower (~500ms additional)
- Subsequent calls are fast (symbols are cached)

### 8.3 Diagnostic Settling

After applying edits, VS Code's TypeScript language server needs time to recompute diagnostics:
- Small files: ~200-500ms
- Large projects: up to ~2s
- We poll diagnostics with exponential backoff until they stabilize

---

## 9. Open Questions

1. **Virtual Document Diagnostics**: Can we get full type-checking diagnostics for a virtual (untitled) document, or only syntax-level? If only syntax-level, we do the full diagnostic check AFTER applying the real edit.

2. **Rename Provider Ordering**: After applying our primary edit (file now says "AuthService"), can we still find references to the OLD name "UserService" in other files to trigger the rename? Need to verify the reference provider behavior.

3. **Code Action Aggressiveness**: Which Code Actions should auto-apply and which should just be reported? Strategy: auto-apply "preferred" fixes (marked by VS Code), report others.

4. **Multiple Renames in One Edit**: If Copilot renames a class AND one of its methods in a single edit, we need to handle both renames sequentially. Order matters (rename parent first, then children).

5. **Edit Conflicts**: If Copilot's edit touches a range that has unsaved changes, should we warn or proceed?

6. **File Creation**: The native EditFile tool supports creating new files (when `old_string` is empty and file doesn't exist). Should file_edit support this, or should that be a separate `file_create` tool?

---

## 10. Comparison with Original FILE-TOOLS.md

| Aspect | FILE-TOOLS.md (original) | This Blueprint |
|--------|--------------------------|----------------|
| **Tools** | 7 tools (read, edit, create, delete, move, rename, duplicate) | 2 tools (read, edit) — focused |
| **Targeting** | JSONPath, CSS selectors, XPath, headings | DocumentSymbol names, line ranges |
| **Parsers** | ts-morph, json-path, htmlparser2, css-tree, fast-xml-parser, remark | Zero custom parsers — pure VS Code APIs |
| **Edit application** | Custom per-language (AST manipulation) | Simple diff + WorkspaceEdit |
| **Safety** | None specified | Full safety layer (intent detection, propagation, auto-fix) |
| **Registration** | VS Code LM Tools | MCP Tools |
| **CodeMapper** | Not considered | Explicitly bypassed (we discovered it uses GPT-4.1) |

The original FILE-TOOLS.md is not obsolete — its vision for file_create, file_move, file_rename, file_delete, and file_duplicate can be implemented as separate MCP tools later. This blueprint focuses on the two core tools (file_read + file_edit) with the safety layer innovation.

---

## 11. References

- `theboof.md` — Research on native ReadFile/EditFile tool internals (microsoft/vscode-copilot-chat)
- `codeMapper.md` — Research on CodeMapper/MappedEditsProvider2 internals (proposed API + GPT-4.1 fallback)
- `FILE-TOOLS.md` — Original 7-tool vision (partially superseded)
- `CUSTOM-PARSER-TO-VSCODE-API.md` — codebase_map migration to VS Code APIs
- VS Code API: `executeDocumentSymbolProvider`, `executeFoldingRangeProvider`, `executeRenameProvider`, `executeCodeActionProvider`
