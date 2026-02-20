# VS Code API → Node.js Migration Analysis

This document outlines every VS Code API used across the codebase services (under `extension/services/codebase/`), the proposed Node.js replacement, and a per-API analysis of why the migration is better, worse, or neutral for the extension.

The goal is to **completely remove the VS Code API dependency from all semantic/codebase analysis features** so they can run on a dedicated worker thread with a persistent ts-morph `Project` instance in memory.

---

## Executive Summary

| VS Code API | Used In | Replacement | Difficulty |
|---|---|---|---|
| `vscode.workspace.findFiles()` | overview, exports | `fs.readdirSync` + glob matching | Medium |
| `vscode.workspace.openTextDocument()` | overview, exports | `fs.readFileSync()` | Easy |
| `vscode.workspace.fs.stat()` | exports | `fs.statSync()` | Easy |
| `vscode.workspace.workspaceFolders` | trace, duplicates, imports, overview, exports | Pass `rootDir` explicitly | Trivial |
| `vscode.RelativePattern` | overview, exports | Standard glob matching (already have `globToRegex`) | Easy |
| `vscode.Uri.file()` | overview, exports | Plain `string` file paths | Easy |
| `vscode.languages.getDiagnostics()` | overview | Omit or caller provides | Easy |
| `vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider')` | exports | Custom AST parsers (already exist) | Easy |
| `vscode.SymbolKind` (enum) | types | Inline string literal map | Trivial |

**Bottom line:** Every API has a viable Node.js replacement. Most replacements are **net-positive** because they eliminate async overhead, remove VS Code runtime coupling, and enable worker thread isolation.

---

## Per-API Analysis

### 1. `vscode.workspace.findFiles(include, exclude, maxResults)`

**Current usage:**
- `overview-service.ts` line 42 — Discovers all files in the workspace tree
- `exports-service.ts` line 150 — Discovers TS/JS files in a directory for batch export scanning

**What it does:**
Uses VS Code's file indexer to glob-match files across the workspace, respecting `files.exclude` and `search.exclude` settings. Returns `vscode.Uri[]`.

**Proposed replacement:**
Recursive `fs.readdirSync()` (or `fs.opendirSync()`) with manual glob matching via the existing `globToRegex()` helper in `ignore-rules.ts`. Apply `.gitignore` / `.devtoolsignore` rules during traversal.

**✅ Why this is BETTER:**
- **No async penalty:** `findFiles` is async and goes through the extension host IPC bridge. A synchronous `readdirSync` in a worker thread has zero IPC overhead.
- **Predictable behavior:** `findFiles` respects the user's `files.exclude` and `search.exclude` settings, which can silently hide files the tool needs. Direct filesystem access gives us full control.
- **Worker-compatible:** `fs` works in worker threads; `vscode.workspace` does not.
- **Consistency:** The MCP server already lists files via the filesystem (for the remote/client session). Using the same approach in the extension means identical behavior regardless of where the code runs.

**⚠️ What we lose:**
- **VS Code's file index cache:** `findFiles` uses an in-memory index that VS Code maintains. Our replacement must walk the filesystem each time (mitigated by the worker thread caching file lists in memory).
- **`files.exclude` respect:** Users who have custom exclude patterns in their VS Code settings will not see those patterns applied. This is acceptable because our tools already have their own `includePatterns`/`excludePatterns` parameters.

**Mitigation for performance:**
The worker thread will persist a file tree cache that is invalidated on filesystem change events (forwarded from the main thread via `postMessage`).

---

### 2. `vscode.workspace.openTextDocument(uri)`

**Current usage:**
- `overview-service.ts` lines 385, 401, 423 — Reads file contents for symbol extraction and metadata
- `exports-service.ts` line 53 — Reads file contents for export parsing

**What it does:**
Opens a `TextDocument` model in VS Code's memory. Returns the full text content and provides line count. If the file is already open in an editor, returns the in-memory (possibly unsaved) version.

**Proposed replacement:**
`fs.readFileSync(filePath, 'utf-8')` with manual line counting via `text.split('\n').length`.

**✅ Why this is BETTER:**
- **Drastically faster:** `openTextDocument` is async, goes through the extension host, and creates a full `TextDocument` model with language detection, tokenization hooks, etc. `readFileSync` in a worker thread is a direct kernel call.
- **No document model overhead:** We only need the raw text. Creating a `TextDocument` allocates language service resources we never use.
- **Worker-compatible:** `fs` works everywhere; `vscode.workspace` does not.
- **Bulk reads:** When scanning hundreds of files (overview with symbols), the extension currently awaits each `openTextDocument` sequentially through the IPC bridge. Direct `readFileSync` in a worker eliminates that bottleneck entirely.

**⚠️ What we lose:**
- **Unsaved file contents:** `openTextDocument` returns the in-memory (dirty) version if the file is open in an editor with unsaved changes. `readFileSync` returns the disk version.
  - **Impact:** Low. Our codebase analysis tools are designed for project-level analysis, not live editing feedback. Users expect analysis of saved files.
- **Encoding detection:** `openTextDocument` handles encoding based on VS Code settings. We default to UTF-8, which covers >99% of source files.

**Mitigation:**
If "unsaved file" support becomes important later, the main thread can forward dirty document contents to the worker on-demand via `postMessage`.

---

### 3. `vscode.workspace.fs.stat(uri)`

**Current usage:**
- `exports-service.ts` line 28 — Checks whether a path is a file or directory before processing exports

**What it does:**
Returns a `FileStat` object with `type` (File, Directory, SymbolicLink), `size`, `ctime`, and `mtime`.

**Proposed replacement:**
`fs.statSync(filePath)` → check `stat.isDirectory()` / `stat.isFile()`.

**✅ Why this is BETTER:**
- **Synchronous in worker thread:** No IPC, no async overhead.
- **Standard Node.js:** `fs.statSync` is the canonical way to check file type.
- **Simpler code:** No need to construct `vscode.Uri` or handle `vscode.FileType` enum.

**⚠️ What we lose:**
- **Virtual filesystem support:** `vscode.workspace.fs` supports virtual filesystems (remote SSH, WSL, containers). `fs.statSync` only works on the local filesystem.
  - **Impact:** None for our use case. The extension runs on the same machine as the workspace. Remote development scenarios use the Extension Host on the remote side, where local `fs` calls are correct.

---

### 4. `vscode.workspace.workspaceFolders`

**Current usage:**
- `overview-service.ts` line 23 — Fallback for `rootDir`
- `exports-service.ts` line 19 — Fallback for `rootDir`
- `trace-symbol-service.ts` lines 199, 2405 — Fallback for `rootDir`
- `duplicate-detection-service.ts` — Fallback for `rootDir`
- `import-graph-service.ts` — Fallback for `rootDir`

**What it does:**
Returns the list of workspace folder URIs. Used exclusively as a fallback default value: `params.rootDir ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath`.

**Proposed replacement:**
Require `rootDir` as a mandatory parameter from the caller. The callers (LM tools and MCP tools) always know the workspace root and already pass it in nearly all cases.

**✅ Why this is BETTER:**
- **Explicit is better than implicit:** Services should not guess context from global state.
- **Worker-compatible:** Workers don't have access to `vscode.workspace`.
- **Multi-root workspace safe:** The fallback `[0]` silently picks the first folder, which may be wrong in multi-root workspaces. Requiring explicit `rootDir` forces correct behavior.
- **Testable:** Pure functions with explicit parameters are easier to unit test.

**⚠️ What we lose:**
- **Convenience:** Callers must always pass `rootDir`. This is already the case for MCP tool calls (they always include `rootDir` from the session context).

**Migration effort:** Trivial — change `rootDir` from optional to required in type definitions, update 5 fallback lines.

---

### 5. `vscode.RelativePattern`

**Current usage:**
- `overview-service.ts` lines 33-39 — Creates include/exclude patterns for `findFiles`
- `exports-service.ts` lines 149-150 — Creates patterns for directory export scanning

**What it does:**
A VS Code utility class that combines a base URI/folder with a glob pattern string. Only used as input to `vscode.workspace.findFiles()`.

**Proposed replacement:**
Eliminated entirely — once we replace `findFiles` with `fs.readdirSync` + `globToRegex()`, there is no need for `RelativePattern`. The existing `globToRegex()` in `ignore-rules.ts` already handles glob-to-regex conversion.

**✅ Why this is BETTER:**
- **Removed abstraction:** One less VS Code type to construct and pass around.
- **Already have the replacement:** `globToRegex()` is battle-tested in our codebase.

**⚠️ What we lose:**
- Nothing. `RelativePattern` is just a convenience wrapper.

---

### 6. `vscode.Uri.file(path)`

**Current usage:**
- `overview-service.ts` line 30 — Creates URI from `rootDir`
- `exports-service.ts` lines 28, 53, 149, 169 — Creates URIs for `stat`, `openTextDocument`, `findFiles`, `executeCommand`

**What it does:**
Converts a filesystem path string to a `vscode.Uri` object (the universal resource identifier used throughout the VS Code API).

**Proposed replacement:**
Plain `string` file paths. All Node.js `fs` APIs accept string paths directly.

**✅ Why this is BETTER:**
- **Simpler:** No URI construction/parsing overhead.
- **Worker-compatible:** Plain strings work everywhere.
- **Less memory:** `Uri` objects have internal structure (scheme, authority, path, query, fragment) that we never use.

**⚠️ What we lose:**
- **URI normalization:** `vscode.Uri.file()` handles path normalization (forward slashes, encoding). We handle this manually with `.replace(/\\/g, '/')` which is already done throughout the codebase.

---

### 7. `vscode.languages.getDiagnostics()`

**Current usage:**
- `overview-service.ts` line 520 — Counts workspace-wide errors and warnings for the `includeStats` option

**What it does:**
Returns all diagnostics (errors, warnings, info, hints) from all language services (TypeScript, ESLint, etc.) for all open/known files.

**Proposed replacement:**
Two options:

**Option A (Recommended): Omit from worker, provide from caller.**
The main thread calls `getDiagnostics()` and passes the counts to the worker as part of the request. The worker returns everything else, and the main thread enriches the response with diagnostic data.

**Option B: Use ts-morph's own diagnostics.**
`project.getPreEmitDiagnostics()` provides TypeScript-level diagnostics. This only covers TS/JS errors, not ESLint or other language service diagnostics.

**✅ Why Option A is BETTER:**
- **Separation of concerns:** Diagnostics are a VS Code concept (aggregated from many extension-provided language servers). Codebase analysis is a filesystem concept. Keeping them separate is architecturally cleaner.
- **Worker gets all the heavy work:** The only main-thread work is a single `getDiagnostics()` call, which is instant.
- **Full diagnostic coverage:** Retains access to all language server diagnostics, not just TypeScript.

**⚠️ What we lose:**
- **Slightly more complex call flow:** The main thread must gather diagnostics separately and merge them into the worker's response. Adds ~5 lines of code to the caller.

---

### 8. `vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri)`

**Current usage:**
- `exports-service.ts` line 171 — Fallback for non-TS/JS files (e.g., `.py`, `.go`) to get symbol information

**What it does:**
Invokes VS Code's built-in document symbol provider, which delegates to whichever language extension is installed for that file type. Returns `vscode.DocumentSymbol[]` with symbol name, kind, range, and children.

**Proposed replacement:**
Use our existing custom AST parsers in `parsers.ts`. These already handle:
- JSON, JSONC, JSONL
- YAML, TOML
- CSS, SCSS, LESS
- HTML, XML, SVG
- Markdown

For file types not covered by our custom parsers (e.g., `.py`, `.go`, `.rs`), the function currently returns an empty array since no VS Code language extension is guaranteed.

**✅ Why this is BETTER:**
- **Deterministic:** Custom parsers produce consistent results regardless of which VS Code extensions are installed. The `executeDocumentSymbolProvider` command returns different results (or nothing) depending on installed extensions.
- **Worker-compatible:** Custom parsers are pure Node.js functions.
- **Faster:** No IPC round-trip to the extension host and back, no language server involvement.
- **Already complete for our supported types:** The `parsers.ts` module covers all non-TS file types that our `codebase_map` tool officially supports.

**⚠️ What we lose:**
- **Language server symbols for unsupported types:** If a user has Python, Go, Rust, etc. extensions installed, `executeDocumentSymbolProvider` would return language-aware symbols for those files. Our custom parsers don't cover these languages.
  - **Impact:** Low. The `exports` tool is primarily designed for TS/JS modules. Non-TS exports from `.py` or `.go` files was always a best-effort fallback. The `codebase_map` tool already uses custom parsers for its supported file types.
  - **Future mitigation:** If we need Python/Go/Rust symbol extraction, we can add lightweight parsers (tree-sitter or regex-based) to `parsers.ts`.

---

### 9. `vscode.SymbolKind` (enum)

**Current usage:**
- `types.ts` lines 272-296 — `SYMBOL_KIND_MAP` maps `vscode.SymbolKind` enum values to string labels

**What it does:**
An enum with 26 symbol kind values (File, Module, Namespace, Class, Method, etc.). Used only in the `getNonTsExports()` fallback function to convert VS Code symbol kinds to our string labels.

**Proposed replacement:**
Since we're removing `executeDocumentSymbolProvider` (which returns `vscode.DocumentSymbol` with `vscode.SymbolKind`), this map becomes unused. Delete it.

If we ever need symbol kind mapping from other sources, use a plain `Record<number, string>` with the well-known integer values (they're stable across VS Code versions).

**✅ Why this is BETTER:**
- **Removes the only `vscode` import from `types.ts`:** This file defines pure data interfaces. It should not depend on the VS Code runtime.
- **Worker-compatible:** Plain strings work everywhere.

**⚠️ What we lose:**
- Nothing. The map is only used by the `executeDocumentSymbolProvider` fallback path which is also being removed.

---

## Service-by-Service Migration Difficulty

### 🟢 Trivial (no VS Code API, or only `workspaceFolders` fallback)

| Service | Lines | VS Code API Usage | Migration Work |
|---|---|---|---|
| `ts-project.ts` | 288 | None | Zero — already worker-ready |
| `parsers.ts` | 746 | None | Zero — already worker-ready |
| `ignore-rules.ts` | ~100 | None | Zero — already worker-ready |
| `trace-symbol-service.ts` | 2700 | `workspaceFolders` fallback (2 lines) | Change `rootDir` to required |
| `duplicate-detection-service.ts` | 259 | `workspaceFolders` fallback (1 line) | Change `rootDir` to required |
| `import-graph-service.ts` | 250 | `workspaceFolders` fallback (1 line) | Change `rootDir` to required |

### 🟡 Medium (requires API replacement)

| Service | Lines | VS Code APIs Used | Migration Work |
|---|---|---|---|
| `exports-service.ts` | 338 | `findFiles`, `openTextDocument`, `fs.stat`, `Uri`, `RelativePattern`, `executeCommand` | Replace 6 APIs with `fs` equivalents + custom parsers |
| `overview-service.ts` | 532 | `findFiles`, `openTextDocument`, `Uri`, `RelativePattern`, `getDiagnostics` | Replace 5 APIs with `fs` equivalents; diagnostics via caller |

### 🔵 Minor (enum removal)

| Service | Lines | VS Code APIs Used | Migration Work |
|---|---|---|---|
| `types.ts` | 396 | `vscode.SymbolKind` (enum in `SYMBOL_KIND_MAP`) | Delete unused map after `executeDocumentSymbolProvider` removal |

---

## Migration Order

### Phase 1 — Make `rootDir` Required
1. Update all `*Params` types to make `rootDir` non-optional
2. Remove `vscode.workspace.workspaceFolders` fallbacks from all 5 services
3. Ensure all callers (LM tools, MCP tools) always provide `rootDir`

### Phase 2 — Replace File I/O APIs
1. Create a `file-utils.ts` module in `extension/services/codebase/` with:
   - `discoverFiles(rootDir, includeGlob, excludeGlob, maxResults)` — replaces `findFiles`
   - `readFileText(filePath)` — replaces `openTextDocument` (returns `{ text, lineCount }`)
   - `getPathType(filePath)` — replaces `fs.stat` (returns `'file' | 'directory'`)
2. Refactor `overview-service.ts` to use `file-utils.ts`
3. Refactor `exports-service.ts` to use `file-utils.ts` + custom parsers for non-TS fallback
4. Delete `SYMBOL_KIND_MAP` from `types.ts`

### Phase 3 — Extract Diagnostics to Caller
1. Move `getDiagnosticCounts()` out of `overview-service.ts` into the main-thread caller
2. Pass diagnostic counts as an optional input parameter to the overview worker

### Phase 4 — Worker Thread Integration
1. Create `extension/services/codebase/codebase-worker.ts`
2. Worker holds persistent `Project` instances (both in-memory and workspace)
3. All services become callable via `postMessage` request/response
4. Main thread keeps a thin proxy that forwards calls to the worker

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| File discovery slower than VS Code's cached index | Medium | Low | Worker-side file tree cache with filesystem watcher invalidation |
| Missing unsaved file contents | Low | Low | Forward dirty documents from main thread on-demand |
| Missing non-TS language symbols in exports | Low | Low | Custom parsers cover all officially supported types |
| Breaking change for callers not providing `rootDir` | Low | Low | All current callers already provide `rootDir` |
| Worker thread crash takes down codebase analysis | Medium | Medium | Worker restart logic with exponential backoff |
| ts-morph memory growth in long-running worker | Medium | Medium | Periodic `Project` refresh on file count thresholds |

---

## Conclusion

Every VS Code API used in the codebase services has a straightforward Node.js replacement. The migration is **net-positive** on every axis:

- **Performance:** Eliminates async IPC overhead for file reads and pattern matching
- **Reliability:** Removes dependency on VS Code extension host availability
- **Testability:** Pure Node.js functions are trivially unit-testable
- **Architecture:** Clean separation between VS Code UI layer and analysis engine
- **Worker-ready:** All services become eligible for worker thread execution with persistent project caching
