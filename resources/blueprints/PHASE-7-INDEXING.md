# Phase 7 — Indexing + Sync — Implementation Blueprint

**Parent blueprint:** `CODEBASE-SEARCH.md` Phase 7
**Dependencies:** Phase 2 (Chunker) — completed

---

## Goal

Store `CodeChunk[]` in LanceDB with content-hash-based incremental re-indexing. Detect file changes efficiently and only re-parse/re-chunk when content actually changes. Symbol-level precision: only changed chunks within a file are updated, minimizing future re-embedding cost when vectors are added in Phase 8.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database location | `.devtools/storage/` in workspace root | Workspace-isolated, predictable location |
| LanceDB dependency | `semantic-toolkit` package.json | Only semantic-toolkit uses it |
| Vector column | Deferred to Phase 8 | No embedding integration yet |
| `stale` field | Boolean per chunk row | `true` when chunk needs processing; set `false` only after vector is stored successfully |
| File I/O | Sequential processing | Incremental runs touch 0-5 files; simplicity over parallelism |
| Change detection | mtime → content hash (two-phase) | Avoids unnecessary re-parsing after git operations |
| Re-indexing granularity | Symbol-level diff within each file | Only changed/new/removed chunks are touched; minimizes future re-embedding cost |
| Change detection field | `chunkContent` comparison (not fullSource) | A body-only change in a child doesn't trigger re-embedding of the parent; only structural changes matter |
| Cross-file signature cascade | Skipped | `chunkContent` only contains a node's own source (no external signatures); TypeScript rename updates all referencing files naturally |
| Ignore system | Rewrite existing `.devtoolsignore` using `ignore` npm package | Replace custom globToRegex with standard gitignore-compatible matching |
| Ignore location | Move to `semantic-toolkit` | Shared by all codebase tools (map, trace, search indexer) |
| Per-tool scoping | Preserved | `# tool:codebase_search` sections still work |
| ts-morph Project | Fresh per index run | Simple, decoupled; Phase 9 unifies with the cached Project pattern |
| Sync trigger | Per `codebase_search` tool call | Ensures index is always fresh before search |
| Sync stats | Separate debug content block in MCP output | Temporary, for development visibility |
| Schema: `fullSource` | Removed | `chunkContent` serves as both Copilot output and embedding input; fullSource is redundant |
| Schema: `depth` | Removed | Derivable from `parentChunkId` (null = top-level) |
| Schema: `jsdoc` | Removed | Already inside `chunkContent` (ts-morph includes JSDoc in node text) |
| Schema: `relevantImports` | Removed from stored schema | Computed at embedding time (Phase 8) if needed; not stored in DB |
| Schema: `parentName` | Replaced by `chunkPath` | Materialized path using dot notation (e.g., `AuthService.validateToken`) |
| Schema: `childChunkIds` | Removed | Derivable via `WHERE parentChunkId = X` query |
| Schema: `relativePath`, `signature`, `breadcrumb` | Not stored | Computed at query/render time |
| Hierarchy representation | Materialized path (`chunkPath`) with dot notation | Self-describing, queryable with prefix matching, matches TypeScript's member access syntax |
| Symbol path separator | Dot notation (`.`) | Standard for TypeScript (`AuthService.validateToken`); used consistently in DB and query syntax |
| Query syntax update | `symbol = AuthService.validateToken` (replaces `>` separator) | Aligns query parser with stored `chunkPath` format |
| Embedding input | Raw code only (`chunkContent`) | Voyage Code 3 was trained on raw code; semantic context added by reranker and live enrichment |
| Single vector per chunk | JSDoc included in `chunkContent` | Voyage Code 3 handles code + docs well; separate vectors double cost with marginal gain |

---

## LanceDB Schema (Phase 7)

The LanceDB table stores one row per code chunk. Lean schema — only fields that can't be derived at query time.

```typescript
interface IndexedChunk {
  id: string;              // SHA-256 hash of filePath + nodeKind + name + startLine + parentChain (truncated to 16 hex)
  filePath: string;        // Absolute file path
  nodeKind: string;        // ts-morph kind name (e.g. 'FunctionDeclaration', 'ClassDeclaration')
  name: string;            // Symbol name, or kind name for non-symbol content (e.g. 'ImportDeclaration')
  chunkPath: string;       // Materialized hierarchy path using dot notation (e.g. 'AuthService.validateToken')
  parentChunkId: string | null;  // ID of parent chunk, null for root-level symbols
  startLine: number;       // 1-indexed start line in source file
  endLine: number;         // 1-indexed end line in source file
  chunkContent: string;    // Source code with body-bearing children collapsed to stubs (display + embedding input)
  contentHash: string;     // SHA-256 of the file's full contents (per-file, denormalized)
  lastModified: number;    // File mtime (ms since epoch) for incremental invalidation trigger
  stale: boolean;          // true = needs (re-)embedding. Set false ONLY after vector is stored successfully.
}
```

**11 fields total.**

**Not included (deferred to Phase 8):**
- `vector: Float32Array` — 1024-dim Voyage Code 3 embedding

**Removed from original CODEBASE-SEARCH.md schema:**
- `fullSource` — redundant; `chunkContent` serves as both output and embedding input
- `depth` — derivable from `parentChunkId` (null = root)
- `jsdoc` — already part of `chunkContent` (ts-morph includes JSDoc in node text)
- `relevantImports` — computed at embedding time if needed; not stored
- `parentName` — replaced by `chunkPath` materialized path
- `childChunkIds` — derivable via query (`WHERE parentChunkId = X AND filePath = Y`)
- `relativePath` — computed from `filePath` + workspace root at query time
- `signature` — extractable from `chunkContent` via header slicing
- `breadcrumb` — assemblable from `chunkPath` + `filePath` at render time

### `chunkPath` Examples

| Symbol | `chunkPath` |
|---|---|
| Top-level function `validateToken` | `validateToken` |
| Method `validate` inside class `AuthService` | `AuthService.validate` |
| Deeply nested: namespace `Auth` → class `Service` → method `run` | `Auth.Service.run` |
| Non-symbol root content (import statement) | `ImportDeclaration` (uses kind name) |

### `stale` Flag Semantics

- **Set to `true`:** When a chunk is newly created or its `chunkContent` has changed.
- **Set to `false`:** Only after Phase 8's embedding pipeline has successfully stored the vector for this chunk.
- **In Phase 7:** All chunks are `stale = true` because no vectors exist yet.

---

## `CodeChunk` Interface Changes

The `CodeChunk` interface in `packages/semantic-toolkit/src/chunker/types.ts` must be updated to match the new schema:

**Fields removed from `CodeChunk`:**
- `fullSource` → replaced by `chunkContent` (renamed from `embeddingText`)
- `depth` → removed (derivable)
- `jsdoc` → removed (inside `chunkContent`)
- `relevantImports` → removed from stored type (computed at embedding time)
- `parentName` → replaced by `chunkPath`
- `childChunkIds` → removed (derivable from DB query)

**Fields renamed:**
- `embeddingText` → `chunkContent`

**Fields added:**
- `chunkPath` — materialized hierarchy path with dot notation

The `ChunkedFile` interface retains `nodeMap` for in-memory flows (not serialized to DB).

---

## Module Structure

```
packages/semantic-toolkit/src/
  indexer/
    index.ts       — public API: exports sync(), SyncResult
    db.ts          — LanceDB database open/create/table management
    scan.ts        — file enumeration + change detection (mtime, content hash)
    diff.ts        — symbol-level chunk diffing (old vs new chunks by chunkContent)
    sync.ts        — orchestrator: scan → parse → chunk → diff → store
    types.ts       — SyncResult, FileClassification, ChunkDiff, IndexedChunk
  ignore/
    index.ts       — rewritten .devtoolsignore system (using 'ignore' npm package)
    types.ts       — IgnoreConfig, per-tool scope interfaces
  chunker/         — (existing, updated: CodeChunk schema changes + chunkPath)
  ...              — (other existing modules unchanged)
```

The `semantic-toolkit` package.json gains:
- `@lancedb/lancedb` — LanceDB v-next SDK
- `ignore` — gitignore-compatible pattern matching

The existing `services/codebase/ignore-rules.ts` is replaced with imports from `semantic-toolkit/ignore`.

---

## Part 1: LanceDB Integration Setup (`db.ts`)

**Responsibility:** Open or create a LanceDB database and manage the chunks table.

**Behavior:**
1. Database path: `<workspaceRoot>/.devtools/storage/`
2. Table name: `code_chunks`
3. On first run: create the database directory and table with the `IndexedChunk` schema
4. On subsequent runs: open the existing database and table
5. Expose helpers: `getChunksByFile(filePath)`, `deleteChunksByFile(filePath)`, `upsertChunks(chunks[])`, `getAllFileMetadata()` (returns filePath → { contentHash, lastModified })

**Key constraints:**
- No vector column in Phase 7
- `stale` defaults to `true` for all new/updated chunks
- Table creation is idempotent (safe to call on every sync)

---

## Part 2: File Enumeration + Change Detection (`scan.ts`)

**Responsibility:** Enumerate workspace files and classify each as unchanged/mtime-only/content-changed/new/removed.

**Algorithm:**
1. Recursively enumerate all files in `workspaceRoot` matching `PARSEABLE_EXTENSIONS`
2. Apply `.devtoolsignore` rules (with `codebase_search` tool scope)
3. Stat each file for `mtime`
4. Query LanceDB for stored `lastModified` and `contentHash` per `filePath`
5. Classify each file:
   - **Not in DB** → `new-file`
   - **In DB, same mtime** → `unchanged` (skip entirely)
   - **In DB, different mtime** → read file, compute SHA-256 of contents:
     - **Hash matches DB** → `mtime-only` (update `lastModified`, skip re-parsing)
     - **Hash differs** → `content-changed` (needs re-index)
6. Files in DB but not on disk → `removed`

**Output:** `FileClassification[]` — array of `{ filePath, status, mtime, contentHash? }`

**`PARSEABLE_EXTENSIONS`** is moved from `mcp-server/src/tools/codebase/codebase-search.ts` to `semantic-toolkit` (shared constant).

---

## Part 3: Symbol-Level Chunk Diffing (`diff.ts`)

**Responsibility:** Compare new chunks (from re-parsing) against old chunks (from LanceDB) and produce a minimal set of DB operations.

**Algorithm:**
For each `content-changed` or `new-file`:
1. Re-parse the file: `chunkFile(sourceFile)` → new `CodeChunk[]`
2. Fetch old chunks from LanceDB by `filePath` → old `IndexedChunk[]` (empty for new files)
3. Build maps keyed by `id`:
   - `oldMap: Map<id, IndexedChunk>`
   - `newMap: Map<id, CodeChunk>`
4. Diff:
   - **IDs in both maps, same `chunkContent`** → `unchanged` (keep existing row, no DB write)
   - **IDs in both maps, different `chunkContent`** → `updated` (update row, set `stale = true`)
   - **IDs only in newMap** → `added` (insert row, set `stale = true`)
   - **IDs only in oldMap** → `removed` (delete row)

**Output:** `ChunkDiff { added: CodeChunk[], updated: CodeChunk[], removed: string[], unchanged: number }`

**Why `chunkContent` for change detection:** The `chunkContent` field has body-bearing children collapsed. This means:
- A body-only change in a child method → the parent class chunk's `chunkContent` is unchanged → parent is NOT marked stale → no wasted re-embedding
- A signature change in a child method → the parent class chunk's collapsed stub changes → parent IS marked stale → correct re-embedding
- A leaf symbol's body change → its `chunkContent` equals its full source → detected as changed → correct re-embedding

**ID stability:** The `id` is a hash of positional identity (file, kind, name, line, parents). If a symbol moves to a different line, it gets a new ID — detected as added (new position) + removed (old position). If the symbol stays in place but its content changes, same ID but different `chunkContent` → detected as updated.

---

## Part 4: Ignore System Rewrite (`ignore/`)

**Responsibility:** Replace the custom `globToRegex` in `services/codebase/ignore-rules.ts` with the `ignore` npm package while preserving per-tool scoping.

**What changes:**
1. New `packages/semantic-toolkit/src/ignore/index.ts`:
   - Parses `.devtoolsignore` files (same section syntax: `# global`, `# tool:name`)
   - Uses the `ignore` npm package for pattern matching instead of custom `globToRegex`
   - Exports `loadIgnoreRules(workspaceRoot)` and `isIgnored(relativePath, toolScope?)`
2. Default patterns (applied when no `.devtoolsignore` exists):
   - `node_modules/`, `.git/`, `dist/`, `build/`, `out/`, `coverage/`, `.devtools/`, `*.d.ts`
3. Existing `services/codebase/ignore-rules.ts`:
   - Replaced with a thin re-export from `semantic-toolkit/ignore`
   - All existing consumers (`codebase_map`, `codebase_trace`, `overview-service`, etc.) continue to work

**Per-tool scoping preserved:**
```
# global
node_modules/
dist/

# tool:codebase_search
**/*.test.ts
**/__tests__/

# tool:codebase_map
*.config.ts
```

---

## Part 5: Sync Orchestrator (`sync.ts`)

**Responsibility:** Top-level function called before each `codebase_search` tool call. Ties together scan → parse → chunk → diff → store.

**API:**
```typescript
interface SyncResult {
  filesScanned: number;
  filesSkipped: number;       // mtime unchanged
  filesMtimeOnly: number;     // mtime changed, content hash same
  filesReindexed: number;     // content changed or new
  filesRemoved: number;
  chunksAdded: number;
  chunksUpdated: number;
  chunksRemoved: number;
  chunksUnchanged: number;
  durationMs: number;
}

function sync(workspaceRoot: string): Promise<SyncResult>;
```

**Flow:**
1. Open LanceDB database at `.devtools/storage/` (`db.ts`)
2. Load `.devtoolsignore` rules with `codebase_search` scope (`ignore/`)
3. Enumerate + classify files (`scan.ts`)
4. For each `removed` file: delete chunks from DB
5. For each `mtime-only` file: update `lastModified` in DB
6. For each `new-file` or `content-changed` file:
   a. Create ts-morph SourceFile (fresh Project per sync run)
   b. `chunkFile(sourceFile)` → new chunks
   c. Diff against old chunks in DB (`diff.ts`) using `chunkContent` comparison
   d. Apply diff: insert added, update updated, delete removed
   e. `stale = true` on all added/updated chunks
7. Return `SyncResult` with timing

**ts-morph Project lifecycle:** Create one fresh Project at the start of sync, add all dirty files to it, chunk them, discard the Project when sync completes.

---

## Part 6: MCP Tool Integration + Query Parser Update

### Sync Integration

**Changes to `mcp-server/src/tools/codebase/codebase-search.ts`:**

1. Import `sync` from `semantic-toolkit/indexer`
2. At the top of the handler (before lookup): `const syncResult = await sync(rootDir)`
3. After the main response content, append a debug content block:
   ```
   --- Sync Stats (debug) ---
   Files: 142 scanned, 140 skipped, 1 mtime-only, 1 reindexed, 0 removed
   Chunks: 3 added, 1 updated, 2 removed, 45 unchanged
   Duration: 23ms
   ```
4. Import `PARSEABLE_EXTENSIONS` from `semantic-toolkit` instead of defining it locally

**Note:** The search itself still uses fresh parsing (via `lookupSymbol`) in Phase 7. The index is built but not yet queried for search results — that happens in Phase 8 when vector search is added. Phase 7's job is ensuring the index is always up-to-date so Phase 8 can query it immediately.

### Query Parser Update

The query syntax for nested symbols changes from `>` to `.` (dot notation):

**Before:** `symbol = AuthService > validateToken`
**After:** `symbol = AuthService.validateToken`

This aligns the user-facing query format with the stored `chunkPath` format in LanceDB and with TypeScript's native member access syntax. The query parser in `packages/semantic-toolkit/src/lookup/parse-query.ts` must be updated accordingly.

---

## Validation Gates

- [ ] Fresh workspace: all files indexed, all chunks created with `stale = true`
- [ ] Second run on same files: zero re-parses, zero DB writes (all files `unchanged`)
- [ ] File mtime touched but content identical: `lastModified` updated, zero re-parses
- [ ] File content changed (one symbol body modified): only that leaf chunk updated; parent chunk unchanged (collapsed stub didn't change)
- [ ] File content changed (one symbol signature modified): that chunk + parent chunk updated (collapsed stub changed)
- [ ] New file added: only new file indexed, existing files untouched
- [ ] File removed: its chunks deleted, no other files affected
- [ ] Symbol added to existing file: one chunk inserted, other chunks in file unchanged
- [ ] Symbol removed from existing file: one chunk deleted, other chunks in file unchanged
- [ ] All `stale` flags set `true` on added/updated chunks
- [ ] No orphaned chunks (every chunk belongs to an existing file)
- [ ] `.devtoolsignore` rules respected (ignored files not indexed)
- [ ] `SyncResult` stats are accurate
- [ ] `chunkPath` dot notation is correct for all nesting levels
- [ ] Query parser accepts `symbol = AuthService.validate` syntax (dot notation)
- [ ] LanceDB schema matches `IndexedChunk` interface exactly

---

## Dependencies Added

| Package | Added to | Purpose |
|---|---|---|
| `@lancedb/lancedb` | `semantic-toolkit` | Vector database for chunk storage |
| `ignore` | `semantic-toolkit` | gitignore-compatible pattern matching |

---

## What Phase 7 Does NOT Do

- **No vector embeddings** — deferred to Phase 8 (Voyage Code 3)
- **No search against the index** — the tool still uses fresh parsing via `lookupSymbol`; Phase 8 adds ANN search
- **No cross-file signature cascade** — `chunkContent` only contains a node's own source; unnecessary
- **No background/interval sync** — sync runs per tool call only
- **No glob patterns for `file` param** — deferred to Phase 9
- **No Project cache unification** — fresh Project per sync; Phase 9 unifies
- **No relevantImports in DB** — computed at embedding time in Phase 8 if needed
- **No fullSource storage** — `chunkContent` (collapsed source) is the single stored text field
