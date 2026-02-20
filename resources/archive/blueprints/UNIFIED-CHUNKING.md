# Unified Chunking & Embedding Pipeline — Architecture Blueprint

> **Status:** Draft v1  
> **Created:** 2026-02-28  
> **Depends On:** [CODEBASE-TOOLS.md](../../resources/blueprints/CODEBASE-TOOLS.md), [FILE-TOOLS.md](../../resources/blueprints/FILE-TOOLS.md)  
> **Supersedes:** CODEBASE-TOOLS.md §10 (Embedding & Indexing Layer)

---

## 1. Problem Statement

Three tools need to understand the structural boundaries of code at a per-file level:

| Tool | What It Needs | Current Approach | Problem |
|------|--------------|-----------------|---------|
| `file_read` | Symbol targeting (dot-path) | VS Code DocumentSymbol API | Needs files open in editor, no JSON/MD support |
| `file_edit` | Symbol targeting + safety layer | VS Code DocumentSymbol API | Same limitations, plus diagnostics timing bugs |
| `codebase_search` | Semantic chunks for embeddings | Not built yet | No chunking system exists |

Each tool re-invents or will reinvent the same core question: **"What are the meaningful structural pieces of this file, and where exactly are they?"**

Additionally, the existing two parsing systems are disconnected:
- **Worker parsers** (ts-morph + custom parsers for JSON/MD/CSS/HTML/XML): Run in the codebase-worker thread, no VS Code dependency, used by `codebase_map`/`codebase_trace`/`codebase_lint`
- **VS Code DocumentSymbol API**: Used by `file_read`/`file_edit`, requires extension host, needs files open in editor

This document designs a unified system where **one parser layer → one chunker → feeds all three tools**.

---

## 2. Target Languages

Only three file types are in scope. More may be added later, but the architecture must work excellently for these before expanding.

| Language | Extensions | Parser | Symbol Depth |
|----------|-----------|--------|-------------|
| TypeScript/JavaScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` | ts-morph | Classes → methods → local vars |
| Markdown | `.md` | remark/unified | Frontmatter → headings → code blocks, tables |
| JSON | `.json`, `.jsonc`, `.jsonl` | jsonc-parser | Object → nested key → value |

---

## 3. Architecture Overview

```
                    Source Files (TS/JS, MD, JSON)
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│           LAYER 1: UNIFIED PARSER LAYER                   │
│           (existing code, with improvements)              │
│                                                           │
│  TS/JS:  ts-morph  ──→ SymbolNode[]                      │
│  JSON:   jsonc-parser ──→ SymbolNode[]                    │
│  MD:     remark/unified ──→ SymbolNode[]                  │
│                                                           │
│  All run in codebase-worker thread (no VS Code API)       │
│  All produce the same SymbolNode interface with ranges    │
└────────────────────────┬─────────────────────────────────┘
                         │  SymbolNode[] with accurate
                         │  line-level ranges
                         ▼
┌──────────────────────────────────────────────────────────┐
│           LAYER 2: HIERARCHICAL CHUNKER (NEW)             │
│                                                           │
│  Input:  SymbolNode[] + file content (string)             │
│  Output: Chunk[] with parent/child relationships          │
│                                                           │
│  • Walk symbol tree depth-first                           │
│  • Extract text content for each symbol using ranges      │
│  • Create overlapping chunks at every hierarchy level     │
│  • Enforce token budget (split oversized symbols)         │
│  • Enrich with metadata (path, kind, breadcrumb)          │
└────────────────────────┬─────────────────────────────────┘
                         │  Chunk[] with metadata
                         │  and parent/child refs
                         ▼
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌──────────────┐
   │ file_read │  │ file_edit │  │codebase_search│
   │           │  │           │  │               │
   │ Resolve   │  │ Resolve   │  │ Embed each    │
   │ dot-path  │  │ target →  │  │ chunk into    │
   │ → return  │  │ apply     │  │ LanceDB with  │
   │ chunk     │  │ edit to   │  │ parent refs   │
   │ content   │  │ range     │  │ for auto-     │
   │           │  │           │  │ merge         │
   └───────────┘  └───────────┘  └──────────────┘
```

### Key Design Decisions

**Decision 1: No tree-sitter.** The existing parsers (ts-morph, remark, jsonc-parser) outperform tree-sitter for these 3 languages. ts-morph gives full TypeScript type system semantics. remark gives richer Markdown structure (frontmatter, tables). jsonc-parser handles JSON with comments. Tree-sitter would be a third parsing system adding complexity without benefit for this scope.

**Decision 2: Chunker is the unifier, not the parser.** The parsers produce `SymbolNode[]` — the chunker converts that to `Chunk[]`. The same `Chunk[]` feeds all three consumers. This means parser improvements benefit all tools automatically.

**Decision 3: Remove VS Code DocumentSymbol dependency.** `file_read` and `file_edit` will switch from `vscode.executeDocumentSymbolProvider` to the worker-thread parsers. This eliminates bugs #1 (async timing), #3 (snapshot dump for missing files), #4 (misleading "no provider" error), #8 (errors only for open files), and #9 (limited language support).

**Decision 4: LanceDB replaces JSON-based index store.** The CODEBASE-TOOLS.md blueprint proposed storing embeddings as `embeddings.json` with base64 Float32Arrays. LanceDB provides proper vector search (ANN), incremental updates, and columnar storage without building a custom vector index.

---

## 4. Layer 1: Parser Improvements

The existing parsers in `extension/services/codebase/parsers.ts` and `overview-service.ts` are 90% there. Three targeted improvements are needed.

### 4.1 TypeScript/JavaScript: Add Depth

**Current state:** `getTypeScriptSymbols()` in `overview-service.ts` extracts only top-level declarations: functions, classes (with members), interfaces, type aliases, enums, variable statements, modules.

**VS Code's advantage:** Recurses into function bodies to find local variables, inner functions, closures. The drag race shows VS Code produces ~2x more symbols for the same TS file.

**Required change:** After extracting top-level and class-member symbols, recurse into function/method bodies to find:
- Variable declarations (const/let/var)
- Arrow function assignments
- Nested function declarations
- Class expressions

**Impact:** file_read can target `processPayment.result` (a local variable inside a function). codebase_search gets finer-grained chunks for large functions.

**What NOT to extract:** Expressions, control flow, operators — only named declarations. The goal is structural boundaries, not a full AST dump.

### 4.2 JSON: Add Line Positions

**Current state:** `parseJsonSymbols()` uses `JSON.parse()` which discards position information. All symbols have `startLine: 0, endLine: 0`.

**Required change:** Use `jsonc-parser.parseTree()` which returns AST nodes with `offset` and `length`. Walk the parse tree instead of the parsed value. Compute line numbers from offsets using a line-offset index built from the source text.

**Impact:** file_read/file_edit can target JSON keys by line range. codebase_search can embed specific JSON sections with accurate positions.

### 4.3 Markdown: Fix Frontmatter Positions

**Current state:** `parseMarkdownSymbols()` extracts frontmatter keys, but they all have `startLine: 1`. The YAML content is reparsed separately, losing remark's position data.

**Required change:** Use the YAML document's position info from remark (the `yaml` node has `position.start.line`/`position.end.line`), and for individual keys, either parse the YAML AST with position tracking or compute positions from the raw YAML text content.

**Impact:** Minor — frontmatter keys are rarely targeted individually. But correctness matters for the unified system.

---

## 5. Layer 2: Hierarchical Chunker

This is the core new component. It takes `SymbolNode[]` + file content and produces `Chunk[]` with parent-child relationships.

### 5.1 Design Philosophy

Inspired by LlamaIndex's `HierarchicalNodeParser`, but AST-aware instead of token-count-based:

- **LlamaIndex's approach:** Chunk at fixed token sizes [2048, 512, 128] with arbitrary split points
- **Our approach:** Chunk at **natural symbol boundaries** — classes, functions, interfaces, headings, JSON objects. The AST tells us where meaningful boundaries are. No arbitrary splitting needed unless a single symbol exceeds the token budget.

This is strictly superior for code because structural boundaries carry semantic meaning. A class boundary is a natural chunk boundary. A function boundary is a natural chunk boundary. LlamaIndex's `CodeSplitter` tries to approximate this using tree-sitter, but we already have the full symbol tree.

### 5.2 Chunking Algorithm

```
For each file:
  1. Parse file → SymbolNode[] (Layer 1)
  2. Build file line array (for extracting text by range)
  3. Walk SymbolNode tree depth-first:
     a. For each node, create a Chunk:
        - id: deterministic hash of file path + symbol name + range
        - content: extract text from startLine to endLine
        - metadata: { filePath, symbolName, symbolKind, depth, breadcrumb }
        - parentChunkId: the chunk ID of this node's parent (or null for top-level)
        - childChunkIds: accumulated as children are processed
        - tokenCount: counted from content
     b. If tokenCount > TOKEN_BUDGET:
        - If the symbol has children → keep parent as-is (the children ARE the splits)
        - If the symbol is a leaf (no children) → split at line boundaries with overlap
     c. Register chunk
  4. Return flat array of all chunks with parent/child pointers
```

### 5.3 Token Budget

The token budget for a single chunk should be guided by the embedding model's context window:

- `all-MiniLM-L6-v2`: 256 tokens max (the default local ONNX model from CODEBASE-TOOLS.md)
- `voyage-code-3`: 16,384 tokens max (the optional remote model)

**Recommendation:** Default to **512 tokens** as the budget. This exceeds MiniLM's 256-token context window, but the truncation can happen at the embedding stage. For retrieval display, longer chunks provide better context. The chunker should produce natural-boundary chunks regardless of embedding model limits; the embedding service truncates as needed.

Budget-exceeding symbols that have no children (e.g., a 200-line function with no inner declarations) should be split with ~15 lines of overlap, matching LlamaIndex's `CodeSplitter` default `chunk_lines_overlap`.

### 5.4 Chunk Metadata

Each chunk carries metadata that serves multiple purposes:

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique, deterministic | `sha256("src/service.ts::UserService.findById:281-300")[:16]` |
| `filePath` | File location | `src/service.ts` |
| `symbolName` | Human-readable target | `UserService.findById` |
| `symbolKind` | Enables kind-based filtering | `method` |
| `breadcrumb` | Full path from root | `UserService > findById` |
| `depth` | Hierarchy level | `2` (class=1, method=2) |
| `range` | Line range in file | `{ start: 281, end: 300 }` |
| `parentChunkId` | Auto-merge during retrieval | link to `UserService` chunk |
| `childChunkIds` | Navigate down | links to method chunks |
| `tokenCount` | Budget management | `145` |

### 5.5 How Each Tool Uses Chunks

**file_read:**
- User provides `target: "UserService.findById"`
- Chunker resolves dot-path through the SymbolNode tree (same logic as current `symbol-resolver.ts`)
- Returns the chunk content + metadata (siblings, parent, children names)
- No embedding needed — pure structural lookup

**file_edit:**
- User provides `target: "UserService.findById"` + `code: "..."`
- Chunker resolves target → gets chunk's exact line range
- Applies edit via `workspace.applyEdit` using the range
- Safety layer still uses VS Code APIs for rename propagation and code actions (those CAN'T be done without VS Code)
- Symbol diffing (before/after) uses the worker parser instead of DocumentSymbol API

**codebase_search:**
- On indexing: chunker produces Chunk[] for every file → embed each chunk → store in LanceDB
- On search: query embedding → ANN search in LanceDB → return matching chunks
- Auto-merge: if multiple chunks from the same parent are in the top-K, merge and return the parent chunk instead (LlamaIndex `AutoMergingRetriever` pattern)

---

## 6. Layer 3: Embedding Pipeline

### 6.1 Embedding Service

Unchanged from CODEBASE-TOOLS.md §10:
- **Local default:** `@huggingface/transformers` with `Xenova/all-MiniLM-L6-v2` (384-dimensional, ONNX)
- **Optional upgrade:** Voyage 3 Code API (`voyage-code-3`, 1024-dimensional)
- Runs on the MCP server side (CPU-bound, not in extension host)

### 6.2 LanceDB Storage (Replaces JSON Index)

**Why LanceDB over the JSON-based index store proposed in CODEBASE-TOOLS.md:**

| Factor | JSON Files | LanceDB |
|--------|-----------|---------|
| **Vector search** | Linear scan (O(n)) | ANN index (sub-linear) |
| **Incremental updates** | Reload entire file | Append/delete rows |
| **Memory** | Load all embeddings into RAM | Memory-mapped, lazy |
| **Scalability** | Degrades >10K symbols | Handles millions |
| **Dependencies** | None | `@lancedb/lancedb` npm package |
| **Storage format** | JSON (base64 Float32Array) | Apache Arrow (columnar, compressed) |

**Schema:**

```
codebase_index/ (LanceDB table)
├── chunk_id: string (primary key)
├── file_path: string
├── symbol_name: string
├── symbol_kind: string
├── breadcrumb: string
├── depth: int
├── start_line: int
├── end_line: int
├── content: string
├── parent_chunk_id: string (nullable)
├── token_count: int
├── file_hash: string (for incremental updates)
└── vector: float32[384] (or [1024] for voyage)
```

**Location:** `.devtools/codebase-index/` in the target workspace (same as CODEBASE-TOOLS.md proposal).

### 6.3 Indexing Strategy

**When to index:**
- First `codebase_search` call triggers auto-index of the workspace
- File changes detected by watcher → re-index affected files (incremental)
- Explicit `codebase_search --reindex` flag for full rebuild

**Incremental update flow:**
1. Compute file hash for each discovered file
2. Compare against stored `file_hash` in LanceDB
3. For changed files: delete old chunks → parse → chunk → embed → insert new chunks
4. For deleted files: delete all chunks for that file path

### 6.4 Search & Retrieval

**Search modes (from CODEBASE-TOOLS.md):**
- **Semantic:** Embed query → ANN search in LanceDB → re-rank
- **Literal:** Text/regex search (separate from embeddings, uses grep-like scan)
- **Hybrid:** Both, merged by reciprocal rank fusion

**Auto-merge retrieval:**
When the top-K results contain multiple chunks from the same parent:
1. Count how many children of each parent appear in top-K
2. If ≥ majority (>50% of children) → replace children with parent chunk
3. Return de-duplicated, merged results

This ensures: searching for "payment" finds `processPayment` and `refund` individually, but if both match, the LLM gets the entire `PaymentGateway` interface — fuller context without redundancy.

**Re-ranking signals (from CODEBASE-TOOLS.md, retained):**
1. Embedding similarity (0.6 weight)
2. Name matching (0.2 weight)
3. Kind boost (0.1 weight — functions/classes ranked higher than variables)
4. Export boost (0.1 weight — exported symbols ranked higher)

---

## 7. Migration: file_read/file_edit Away from DocumentSymbol API

### 7.1 What Changes

| Responsibility | Before (DocumentSymbol API) | After (Worker Parser) |
|---------------|---------------------------|---------------------|
| Symbol targeting | `vscode.executeDocumentSymbolProvider` via client-pipe | `getTypeScriptSymbols()` / `getCustomParser()` via codebase-worker |
| Dot-path resolution | `resolveSymbolTarget()` on DocumentSymbol tree | Same function, but on SymbolNode tree (interface is compatible) |
| Content reading | `fileReadContent()` via client-pipe | Direct `fs.readFile()` in worker |
| Edit application | `fileApplyEdit()` via `workspace.applyEdit` | **Unchanged** — still needs VS Code |
| Safety layer: symbol diff | DocumentSymbol before/after comparison | Worker parser before/after comparison |
| Safety layer: rename | `executeRenameProvider` via client-pipe | **Unchanged** — still needs VS Code |
| Safety layer: code actions | `executeCodeActionProvider` via client-pipe | **Unchanged** — still needs VS Code |
| Safety layer: diagnostics | `vscode.languages.getDiagnostics` via client-pipe | **Unchanged** — still needs VS Code |

### 7.2 What Stays in VS Code

The safety layer's **refactoring engine** must remain in the VS Code extension host:
- **Rename propagation:** Only VS Code's rename provider can find all references across the workspace and update them atomically
- **Code actions:** Quick fixes (add missing imports, fix typos) require the TypeScript language server
- **Diagnostics:** Getting live errors/warnings requires the language server to have analyzed the file
- **workspace.applyEdit:** Atomic multi-file edits with undo support

### 7.3 Bugs This Fixes

From the burnout test (9 bugs found), this migration directly addresses:

| Bug | Severity | How It's Fixed |
|-----|----------|---------------|
| #1 Safety layer broken (async timing) | 🔴 Critical | Symbol diffing moves to worker — instant, no settle delay needed |
| #3 Non-existent file dumps snapshot | 🟡 Important | Worker returns clean error, no VS Code URI confusion |
| #4 "No DocumentSymbol provider" message | 🟡 Important | Worker always has a parser for supported types; returns "unsupported file type" for others |
| #8 Errors only for open files | 🟢 Minor | Symbol targeting no longer depends on open editors |
| #9 Limited language support | 🟢 Minor | JSON, Markdown, CSS, HTML, XML all get symbol targeting via custom parsers |

**Bugs NOT fixed by this migration (still require separate fixes):**
- #1B Diagnostics case-sensitivity (`'Error'` vs `'error'`) — diagnostics still come from VS Code
- #2 Empty code silently deletes — validation logic issue
- #5 `startLine > endLine` returns empty — validation logic issue
- #6 Line-based editing can corrupt code — range validation issue
- #7 Wrong intent for deletions — intent detection logic issue

---

## 8. Component Layout

### New Files

```
extension/services/codebase/
  chunker.ts              # Hierarchical chunking engine
                          # Input: SymbolNode[] + string → Chunk[]
                          # Handles: depth-first walk, token budgets,
                          #          parent/child linkage, metadata enrichment

mcp-server/src/
  codebase-engine/
    embedding-service.ts  # ONNX local + Voyage API embeddings
    lancedb-store.ts      # LanceDB wrapper for chunk storage
    search-engine.ts      # Query → embed → ANN → re-rank → auto-merge
    indexer.ts            # File discovery → parse → chunk → embed → store
```

### Modified Files

```
extension/services/codebase/
  overview-service.ts     # Improve getTypeScriptSymbols() depth
  parsers.ts              # Fix JSON positions, MD frontmatter positions

mcp-server/src/tools/file/
  file-read.ts            # Switch from DocumentSymbol to worker parser
  file-edit.ts            # Switch symbol targeting to worker parser
  safety-layer.ts         # Switch symbol diffing to worker parser
  symbol-resolver.ts      # Adapt to work with SymbolNode[] (minimal change)

mcp-server/src/tools/codebase/
  search.ts               # New tool: codebase_search using the pipeline
```

---

## 9. Data Flow Diagrams

### 9.1 file_read Flow (After Migration)

```
User: file_read({ file: "src/service.ts", target: "UserService.findById" })

MCP Server                              Codebase Worker
    │                                        │
    ├─ RPC: codebase.getFileSymbolsAndContent ─→│
    │                                        ├─ fs.readFile("src/service.ts")
    │                                        ├─ getTypeScriptSymbols(text)
    │                                        │   → SymbolNode[] with ranges
    │                                        ├─ return { symbols, content }
    │←──────────────────────────────────────←─┤
    │                                        
    ├─ resolveSymbolTarget("UserService.findById", symbols)
    │   → match: { startLine: 350, endLine: 370 }
    │
    ├─ Extract lines 350-370 from content
    │
    └─ Return chunk content + metadata to model
```

### 9.2 codebase_search Flow

```
User: codebase_search({ query: "payment processing", mode: "semantic" })

MCP Server
    │
    ├─ Is index built? No → trigger indexing:
    │   │
    │   ├─ Discover files (respect .devtoolsignore)
    │   │
    │   ├─ For each file:
    │   │   ├─ RPC: codebase.getFileSymbolsAndContent → Worker
    │   │   │   → { symbols: SymbolNode[], content: string }
    │   │   │
    │   │   ├─ chunker.chunk(symbols, content)
    │   │   │   → Chunk[] with parent/child refs, metadata
    │   │   │
    │   │   ├─ embeddingService.embed(chunk.content)
    │   │   │   → Float32Array[384]
    │   │   │
    │   │   └─ lancedbStore.insert(chunk, embedding)
    │   │
    │   └─ Index built ✓
    │
    ├─ embeddingService.embed("payment processing")
    │   → query vector
    │
    ├─ lancedbStore.search(queryVector, topK: 20)
    │   → raw results
    │
    ├─ Re-rank (embedding sim + name + kind + export boost)
    │
    ├─ Auto-merge (replace sibling children with parent)
    │
    └─ Return ranked results with content + metadata
```

---

## 10. The "Interface Problem" — Hierarchical Chunking Strategy

This section directly answers the question: **Do we chunk the parent, the children, or both?**

### The Problem

Consider this TypeScript interface:

```typescript
interface PaymentGateway {
  processPayment(amount: number, currency: string): Promise<PaymentResult>;
  refund(transactionId: string, reason?: string): Promise<RefundResult>;
  getBalance(accountId: string): Promise<BalanceInfo>;
  validateCard(cardDetails: CardDetails): Promise<ValidationResult>;
}
```

If we only chunk the interface as a whole: we find it when searching for "payment", but not when searching for "card validation" — the embedding of the whole interface dilutes the signal.

If we only chunk individual methods: we find `validateCard` for "card validation", but lose the context that it belongs to `PaymentGateway`.

### The Solution: Overlapping Hierarchical Chunks

We create chunks at **every level** of the hierarchy, with parent-child relationships:

```
Chunk 1 (depth=0): "PaymentGateway" → entire interface (all 6 lines)
    ├── Chunk 2 (depth=1): "processPayment" → method signature (1 line)
    ├── Chunk 3 (depth=1): "refund" → method signature (1 line)
    ├── Chunk 4 (depth=1): "getBalance" → method signature (1 line)
    └── Chunk 5 (depth=1): "validateCard" → method signature (1 line)
```

Each chunk is embedded separately. During retrieval:
- "card validation" → matches Chunk 5 (`validateCard`) strongly
- If only Chunk 5 matches → return it with its breadcrumb metadata: `PaymentGateway > validateCard`
- If Chunks 2, 3, 4, AND 5 all match → auto-merge → return Chunk 1 (the parent) instead

### For Classes with Methods

```typescript
class UserService {
  private db: Database;
  
  constructor(db: Database) { this.db = db; }
  
  async findById(id: string): Promise<User> {
    const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!result) throw new UserNotFoundError(id);
    return new User(result);
  }
  
  async createUser(data: CreateUserDTO): Promise<User> { ... }
  async deleteUser(id: string): Promise<void> { ... }
}
```

Chunks:
```
Chunk: "UserService" → class body (15 lines)
    ├── Chunk: "UserService.db" → property (1 line)
    ├── Chunk: "UserService.constructor" → constructor (1 line)
    ├── Chunk: "UserService.findById" → method (5 lines)
    │       ├── Chunk: "UserService.findById.result" → local var (1 line)
    │       └── (only if depth extraction is enabled)
    ├── Chunk: "UserService.createUser" → method (...)
    └── Chunk: "UserService.deleteUser" → method (...)
```

### For Markdown

```markdown
## Installation
Guide text...

### Prerequisites
- Node.js 18+
- pnpm

### Quick Start
Run `pnpm install` ...
```

Chunks:
```
Chunk: "## Installation" → entire section (all lines under ##)
    ├── Chunk: "### Prerequisites" → subsection
    └── Chunk: "### Quick Start" → subsection
```

### For JSON

```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0"
  }
}
```

Chunks:
```
Chunk: root object → entire file
    ├── Chunk: "scripts" → { "build": "tsc", "test": "jest", "lint": "eslint ." }
    │       ├── Chunk: "scripts.build" → "tsc"
    │       ├── Chunk: "scripts.test" → "jest"
    │       └── Chunk: "scripts.lint" → "eslint ."
    └── Chunk: "dependencies" → { "express": ..., "pg": ... }
            ├── Chunk: "dependencies.express" → "^4.18.0"
            └── Chunk: "dependencies.pg" → "^8.11.0"
```

### Chunking Depth Control

Not all levels need to be embedded. For codebase_search, we should control how deep to chunk:

- **Depth 0:** File-level chunks (entire file as one chunk) — too coarse for search
- **Depth 1:** Top-level symbols (classes, interfaces, functions, exported variables) — good default
- **Depth 2:** Class/interface members (methods, properties) — recommended
- **Depth 3:** Local variables inside functions — only for very large codebases where method-level is too coarse

**Recommended default: Depth 2** — top-level declarations + their members. This gives good search precision without creating too many tiny chunks.

For `file_read` and `file_edit`, all depth levels are always available (they use the symbol tree directly, not the indexed chunks).

---

## 11. Open Questions

1. **Embedding model choice:** MiniLM's 256-token window is small for code chunks. Should we default to a larger model (e.g., `nomic-embed-text-v1.5`, 8192 tokens, 768 dimensions)? Trade-off: model download size vs chunk truncation.

2. **LanceDB Node.js maturity:** `@lancedb/lancedb` has a Node.js SDK. Need to verify: WASM or native binding? Worker thread compatible? Windows support?

3. **Index warm-up cost:** First `codebase_search` triggers indexing. For a 1000-file project, estimate: parsing ~5s (worker), embedding ~30-60s (ONNX CPU), LanceDB write ~2s. Should we show progress to the user? Background index on workspace open?

4. **Auto-merge threshold:** What percentage of children need to match before we replace with the parent? LlamaIndex defaults to "majority" (>50%). For code, should it be higher (e.g., >75%) to avoid losing precision?

5. **Chunk overlap for split leaves:** When a 200-line function with no inner declarations exceeds the token budget, how many lines of overlap between splits? LlamaIndex defaults to 15 lines. Is that appropriate for code?

6. **Custom LlamaIndex in TypeScript:** You mentioned potentially writing a custom LlamaIndex-like system in TypeScript. This blueprint designs the primitives (chunker, embedding service, vector store, retriever) as independent modules. They compose the same way LlamaIndex's components do, but without the LlamaIndex framework overhead. Is this sufficient, or do you want a more formal pipeline/transformation abstraction layer?

---

## 12. Implementation Phases

### Phase 1: Parser Improvements (Prerequisite)
- Fix TS/JS depth in `getTypeScriptSymbols()`
- Fix JSON positions in `parseJsonSymbols()`
- Fix MD frontmatter positions in `parseMarkdownSymbols()`
- Run drag race again to verify parity with VS Code DocumentSymbol API

### Phase 2: Hierarchical Chunker
- Build `chunker.ts` in `extension/services/codebase/`
- Produces `Chunk[]` from `SymbolNode[]` + file content
- Wire through codebase-worker

### Phase 3: file_read/file_edit Migration
- Switch symbol targeting from DocumentSymbol API to worker parser
- Adapt `symbol-resolver.ts` for `SymbolNode[]` interface
- Update safety layer to use worker for before/after symbol comparison
- Keep VS Code APIs for rename, code actions, diagnostics
- Verify all file_read/file_edit tests pass

### Phase 4: Embedding & Search
- Integrate `@lancedb/lancedb`
- Build embedding service (ONNX local + optional Voyage)
- Build indexer (file discovery → parse → chunk → embed → store)
- Build search engine (embed query → ANN → re-rank → auto-merge)
- Wire into `codebase_search` tool

### Phase 5: Production Hardening
- Incremental indexing (file watcher → re-index changed files)
- Progress reporting for initial indexing
- Index versioning (invalidate on schema changes)
- Performance benchmarking (target: <100ms per search query)
