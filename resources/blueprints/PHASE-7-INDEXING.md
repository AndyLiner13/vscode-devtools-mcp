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
| Database tables | Two tables: `file_metadata` (per-file) + `code_chunks` (per-chunk) | Normalized; per-file values (contentHash, lastModified) stored once, not duplicated per chunk |
| LanceDB dependency | `semantic-toolkit` package.json | Only semantic-toolkit uses it |
| Vector column | Deferred to Phase 8 | No embedding integration yet |
| `stale` field | Boolean per chunk row | `true` when chunk needs processing; set `false` only after vector is stored successfully |
| File I/O | Sequential processing | Incremental runs touch 0-5 files; simplicity over parallelism |
| Change detection | mtime fast filter → per-file contentHash accuracy check | mtime catches changes fast; contentHash avoids false positives from git stage, permissions, etc. |
| Re-indexing granularity | Re-parse entire file, smart-update individual chunks | Re-parse is cheap (ms); only chunks with actual content changes are marked stale |
| Change detection field | Direct `chunkContent` string comparison (no per-chunk hash) | String compare short-circuits at first difference; hashing must process entire string — less efficient for one-time comparisons |
| Chunk matching identity | `symbolPath` (structural identity via kind-annotated path) | Collision-proof even for same-name symbols with different ancestor kinds |
| Cross-file signature cascade | Skipped | `chunkContent` only contains a node's own source (no external signatures); TypeScript rename updates all referencing files naturally |
| Chunk ID algorithm | No separate ID field; `filePath + symbolPath` is the natural composite key | Eliminates redundant hash computation; both fields already stored and uniquely identify each chunk |
| Ignore system | Rewrite existing `.devtoolsignore` using `ignore` npm package | Replace custom globToRegex with standard gitignore-compatible matching |
| Ignore location | Move to `semantic-toolkit` | Shared by all codebase tools (map, trace, search indexer) |
| Per-tool scoping | Preserved | `# tool:codebase_search` sections still work |
| ts-morph Project | Fresh per index run | Simple, decoupled; Phase 9 unifies with the cached Project pattern |
| Sync trigger | Per `codebase_search` tool call | Ensures index is always fresh before search |
| Sync stats | Separate debug content block in MCP output | Temporary, for development visibility |
| Schema: `fullSource` | Removed | `chunkContent` serves as both Copilot output and embedding input; fullSource is redundant |
| Schema: `depth` | Removed | Derivable from `symbolPath` (count `.` separators) |
| Schema: `jsdoc` | Removed | Already inside `chunkContent` (ts-morph includes JSDoc in node text) |
| Schema: `relevantImports` | Removed from stored schema | Computed at embedding time (Phase 8) if needed; not stored in DB |
| Schema: `parentName` | Replaced by `symbolPath` | Kind-annotated materialized path encodes name, kind, and parent-child relationships in a single string |
| Schema: `childChunkIds` | Removed | Derivable via prefix query on `symbolPath` (`WHERE symbolPath LIKE 'parent.%'`) |
| Schema: `nodeKind`, `name`, `chunkPath`, `parentChunkId` | Replaced by `symbolPath` | Single unified field encodes full hierarchy; all components derivable via parser module |
| Hierarchy representation | Unified `symbolPath` (kind-annotated materialized path) | Graph-like relationship traversal in a flat table via prefix matching; no joins needed |
| Symbol path format | `Kind:Name.Kind:Name` at each level | Self-describing, parseable, collision-proof, supports all traversal queries |
| Query syntax update | `symbol = AuthService.validateToken` (replaces `>` separator) | Adapter converts clean dot-notation queries to `symbolPath` filters |
| Embedding input | Raw code only (`chunkContent`) | Voyage Code 3 was trained on raw code; semantic context added by reranker and live enrichment |
| Single vector per chunk | JSDoc included in `chunkContent` | Voyage Code 3 handles code + docs well; separate vectors double cost with marginal gain |

---

## LanceDB Schema (Phase 7)

Two tables in one LanceDB database. Normalized: per-file metadata stored once, not duplicated across chunk rows.

### `file_metadata` Table (per-file, 3 fields)

```typescript
interface FileMetadata {
  filePath: string;      // Absolute file path (primary key)
  contentHash: string;   // SHA-256 of the file's full contents
                         // Used as accuracy check: when mtime changes, compare this to fresh file hash
                         // If hashes match → non-content change (git stage, permissions); skip re-parsing
                         // If hashes differ → actual content change; re-parse and diff chunks
  lastModified: number;  // File mtime (ms since epoch) — fast filter for change detection
}
```

### `code_chunks` Table (per-chunk, 6 fields)

```typescript
interface IndexedChunk {
  filePath: string;        // Absolute file path (foreign reference to file_metadata)
  symbolPath: string;      // Kind-annotated materialized path encoding the full hierarchy
                           // Format: "Kind:Name.Kind:Name" at each level
                           // Example: "ClassDeclaration:AuthService.MethodDeclaration:validateToken"
                           // Encodes: name, kind, parent-child relationships, and depth in a single string
                           // All hierarchy queries reduce to prefix matching (no joins needed)
                           // Composite key: filePath + symbolPath uniquely identifies every chunk
  startLine: number;       // 1-indexed start line in source file
  endLine: number;         // 1-indexed end line in source file
  chunkContent: string;    // Source code with body-bearing children collapsed to stubs (display + embedding input)
  stale: boolean;          // true = needs (re-)embedding. Set false ONLY after vector is stored successfully.
}
```

**Total: 9 fields across 2 tables (3 + 6).** No redundancy — per-file values stored once in `file_metadata`.

**Not included (deferred to Phase 8):**
- `vector: Float32Array` — 1024-dim Voyage Code 3 embedding

**Removed from original CODEBASE-SEARCH.md schema:**
- `fullSource` — redundant; `chunkContent` serves as both output and embedding input
- `depth` — derivable from `symbolPath` (count `.` separators)
- `jsdoc` — already part of `chunkContent` (ts-morph includes JSDoc in node text)
- `relevantImports` — computed at embedding time if needed; not stored
- `parentName` — encoded in `symbolPath` (drop last segment)
- `childChunkIds` — derivable via prefix query (`WHERE symbolPath LIKE 'parent.%'`)
- `contentHash` — stored in `file_metadata` table, not per-chunk
- `lastModified` — stored in `file_metadata` table, not per-chunk
- `signature` — extractable from `chunkContent` via header slicing
- `breadcrumb` — assemblable from `symbolPath` + `filePath` at render time
- `nodeKind` — encoded in `symbolPath` (last segment's kind prefix)
- `name` — encoded in `symbolPath` (last segment's name part)
- `chunkPath` — replaced by `symbolPath` (clean path derivable by stripping kinds)
- `parentChunkId` — replaced by `symbolPath` (parent = drop last segment; no joins needed)

### `symbolPath` Format and Examples

**Format:** `Kind:Name` segments joined by `.` (dot) for each hierarchy level.

| Symbol | `symbolPath` (stored) | Derived clean path |
|---|---|---|
| Top-level function `validateToken` | `FunctionDeclaration:validateToken` | `validateToken` |
| Method `validate` inside class `AuthService` | `ClassDeclaration:AuthService.MethodDeclaration:validate` | `AuthService.validate` |
| Deeply nested: namespace `Auth` → class `Service` → method `run` | `ModuleDeclaration:Auth.ClassDeclaration:Service.MethodDeclaration:run` | `Auth.Service.run` |
| Non-symbol root content (import statement) | `ImportDeclaration:ImportDeclaration` | `ImportDeclaration` |
| Type alias `Config` vs namespace `Config` (same level) | `TypeAliasDeclaration:Config` vs `ModuleDeclaration:Config` | both: `Config` (but distinct symbolPaths → distinct IDs) |

### `symbolPath` Derivation Functions (Parser/Adapter Module)

A small `symbol-path.ts` module provides pure functions to extract components:

```typescript
// "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "validateToken"
function parseName(symbolPath: string): string;

// "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "MethodDeclaration"
function parseKind(symbolPath: string): string;

// "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "AuthService.validateToken"
function parseCleanPath(symbolPath: string): string;

// "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "ClassDeclaration:AuthService"
function parseParentPath(symbolPath: string): string | null;

// "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → 2
function parseDepth(symbolPath: string): number;

// Build symbolPath from ts-morph node traversal
function buildSymbolPath(node: Node, ancestors: Node[]): string;
```

### LanceDB Query Patterns Using `symbolPath`

| Query | LanceDB filter |
|---|---|
| Find by exact symbol | `WHERE symbolPath = 'ClassDeclaration:AuthService.MethodDeclaration:validate'` |
| Find all children of AuthService | `WHERE symbolPath LIKE 'ClassDeclaration:AuthService.%'` |
| Find all ClassDeclarations in a file | `WHERE filePath = '...' AND symbolPath LIKE 'ClassDeclaration:%'` |
| Find root-level symbols | `WHERE filePath = '...' AND symbolPath NOT LIKE '%.%'` |
| User query: `AuthService.validate` | Adapter converts to `symbolPath LIKE '%:AuthService.%:validate'` |

### `stale` Flag Semantics

- **Set to `true`:** When a chunk is newly created or its `chunkContent` has changed.
- **Set to `false`:** Only after Phase 8's embedding pipeline has successfully stored the vector for this chunk.
- **In Phase 7:** All chunks are `stale = true` because no vectors exist yet.

---

## `CodeChunk` Interface Changes

The `CodeChunk` interface in `packages/semantic-toolkit/src/chunker/types.ts` must be updated to match the new schema:

**Fields removed from `CodeChunk`:**
- `fullSource` → replaced by `chunkContent` (renamed from `embeddingText`)
- `depth` → removed (derivable from `symbolPath`)
- `jsdoc` → removed (inside `chunkContent`)
- `relevantImports` → removed from stored type (computed at embedding time)
- `parentName` → replaced by `symbolPath`
- `childChunkIds` → removed (derivable from prefix query on `symbolPath`)
- `nodeKind` → encoded in `symbolPath`
- `name` → encoded in `symbolPath`

**Fields renamed:**
- `embeddingText` → `chunkContent`

**Fields added:**
- `symbolPath` — kind-annotated materialized path (e.g., `ClassDeclaration:AuthService.MethodDeclaration:validate`)

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
    types.ts       — SyncResult, FileClassification, ChunkDiff, IndexedChunk, FileMetadata
    symbol-path.ts — parser/adapter: parseName, parseKind, parseCleanPath, parseParentPath, parseDepth, buildSymbolPath
  ignore/
    index.ts       — rewritten .devtoolsignore system (using 'ignore' npm package)
    types.ts       — IgnoreConfig, per-tool scope interfaces
  chunker/         — (existing, updated: CodeChunk schema changes + symbolPath)
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
3. On first run: create the database directory and both tables (`file_metadata` + `code_chunks`)
4. On subsequent runs: open the existing database and tables
5. Expose helpers:
   - **file_metadata:** `getFileMetadata(filePath)`, `getAllFileMetadata()`, `upsertFileMetadata(meta)`, `deleteFileMetadata(filePath)`
   - **code_chunks:** `getChunksByFile(filePath)`, `deleteChunksByFile(filePath)`, `upsertChunks(chunks[])`, `updateChunkPositions(updates[])`

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
4. Query `file_metadata` table for stored `lastModified` and `contentHash` per `filePath`
5. Classify each file:
   - **Not in DB** → `new-file`
   - **In DB, same mtime** → `unchanged` (skip entirely — fast path)
   - **In DB, different mtime** → read file, compute SHA-256 of full file contents:
     - **Hash matches stored `contentHash`** → `mtime-only` (non-content change like git stage, permissions; update `lastModified` in DB, skip re-parsing)
     - **Hash differs from stored `contentHash`** → `content-changed` (actual code change; needs re-parse + chunk diff)
6. Files in DB but not on disk → `removed`

**Two-tier detection rationale:** mtime changes on any metadata update (git stage, chmod, touch). Computing the file content hash is cheap (O(filesize)) and catches false positives. This avoids unnecessary re-parsing of files that were merely staged or had permissions changed.

**Output:** `FileClassification[]` — array of `{ filePath, status, mtime, contentHash? }`

**`PARSEABLE_EXTENSIONS`** is moved from `mcp-server/src/tools/codebase/codebase-search.ts` to `semantic-toolkit` (shared constant).

---

## Part 3: Symbol-Level Chunk Diffing (`diff.ts`)

**Responsibility:** Compare new chunks (from re-parsing) against old chunks (from LanceDB) and produce a minimal set of DB operations.

**Algorithm:**
For each `content-changed` or `new-file`:
1. Re-parse the file: `chunkFile(sourceFile)` → new `CodeChunk[]`
2. Fetch old chunks from LanceDB by `filePath` → old `IndexedChunk[]` (empty for new files)
3. Build maps keyed by `symbolPath` (unique within a file):
   - `oldMap: Map<symbolPath, IndexedChunk>` (from LanceDB)
   - `newMap: Map<symbolPath, CodeChunk>` (from fresh parse)
4. For each entry in newMap:
   - **Matched in oldMap, same `chunkContent`** → `position-only` (update `startLine`/`endLine`/`lastModified` only; keep existing vector; `stale` stays `false`)
   - **Matched in oldMap, different `chunkContent`** → `updated` (update all fields, set `stale = true`)
   - **Not in oldMap** → `added` (insert row, set `stale = true`)
5. For each entry in oldMap not in newMap → `removed` (delete row)

**Output:** `ChunkDiff { added: CodeChunk[], updated: CodeChunk[], positionOnly: CodeChunk[], removed: string[], unchanged: number }`

**Smart update principle:** Re-parse is cheap (single-digit ms per file). The expensive operation is embedding (costs credits). So we always re-parse the entire changed file but only mark chunks `stale` when their `chunkContent` actually differs. Chunks that only shifted position get their line numbers updated without triggering re-embedding.

**Why `chunkContent` for change detection:** The `chunkContent` field has body-bearing children collapsed. This means:
- A body-only change in a child method → the parent class chunk's `chunkContent` is unchanged → parent is NOT marked stale → no wasted re-embedding
- A signature change in a child method → the parent class chunk's collapsed stub changes → parent IS marked stale → correct re-embedding
- A leaf symbol's body change → its `chunkContent` equals its full source → detected as changed → correct re-embedding

**Why direct string comparison (no per-chunk hash):** String comparison short-circuits at the first differing character, making it faster than hashing for one-time comparisons. Hashing must process the entire string regardless. Since each chunk is compared exactly once (new vs stored), direct string comparison does strictly less work.

**ID stability:** The composite key is `filePath + symbolPath`, where symbolPath encodes each ancestor's kind and name (e.g., `ClassDeclaration:AuthService.MethodDeclaration:validateToken`). This means:
- **Line shifts don't change the ID** — a symbol added above pushes other symbols down, but their identity (name + kind + parent chain) is unchanged → same ID → position-only update
- **Same-name, different-kind symbols are always distinct** — even if parents share a name, different parent kinds produce different symbolPaths → different IDs
- **Content changes preserve the ID** — same structural position, different content → detected as `updated`
- **Renames produce a new ID** — detected as `added` (new name) + `removed` (old name)

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
  chunksUpdated: number;      // content changed → stale = true
  chunksPositionOnly: number; // line shift only → stale stays false, vector preserved
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
4. For each `removed` file: delete chunks from `code_chunks` + delete row from `file_metadata`
5. For each `mtime-only` file: update `lastModified` in `file_metadata`
6. For each `new-file` or `content-changed` file:
   a. Create ts-morph SourceFile (fresh Project per sync run)
   b. `chunkFile(sourceFile)` → new chunks
   c. Diff against old chunks in DB (`diff.ts`):
      - Match new chunks to stored chunks by `symbolPath` (unique within a file since it encodes the full kind-annotated hierarchy)
      - Compare `chunkContent` strings directly (short-circuits at first difference)
      - If content unchanged but position shifted → update `startLine`/`endLine` only, preserve vector
      - If content changed → update all fields, set `stale = true`
      - New chunks → insert with `stale = true`
      - Missing chunks → delete
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

This aligns the user-facing query format with the stored `symbolPath` format in LanceDB and with TypeScript's native member access syntax. The query parser in `packages/semantic-toolkit/src/lookup/parse-query.ts` must be updated accordingly. The `symbol-path.ts` adapter converts clean user queries (e.g., `AuthService.validate`) into the corresponding `symbolPath` filter.

---

## Validation Gates

- [ ] Fresh workspace: all files indexed, all chunks created with `stale = true`
- [ ] Second run on same files: zero re-parses, zero DB writes (all files `unchanged`)
- [ ] File mtime touched but content identical: `lastModified` updated, zero re-parses
- [ ] File content changed (one symbol body modified): only that leaf chunk marked stale; parent chunk unchanged (collapsed stub didn't change); other chunks get position-only updates if lines shifted
- [ ] File content changed (one symbol signature modified): that chunk + parent chunk marked stale (collapsed stub changed)
- [ ] Symbol moved (line shift only, no content change): `startLine`/`endLine` updated, `stale` stays `false`, existing vector preserved
- [ ] New file added: only new file indexed, existing files untouched
- [ ] File removed: its chunks deleted, no other files affected
- [ ] Symbol added to existing file: one chunk inserted, other chunks in file unchanged
- [ ] Symbol removed from existing file: one chunk deleted, other chunks in file unchanged
- [ ] All `stale` flags set `true` on added/updated chunks
- [ ] No orphaned chunks (every chunk belongs to an existing file)
- [ ] `.devtoolsignore` rules respected (ignored files not indexed)
- [ ] `SyncResult` stats are accurate
- [ ] `symbolPath` is correct for all nesting levels (kind-annotated, dot-separated)
- [ ] `symbolPath` parser correctly derives name, kind, clean path, parent, and depth
- [ ] Query parser accepts `symbol = AuthService.validate` syntax (dot notation) and adapter maps to symbolPath filter
- [ ] LanceDB database has two tables: `file_metadata` (3 fields) and `code_chunks` (6 fields)
- [ ] Per-file metadata (contentHash, lastModified) stored once in file_metadata, not duplicated per chunk

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
