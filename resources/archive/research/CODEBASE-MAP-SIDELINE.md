## Deferred `codebase_map` Features

Features removed during the parameter simplification refactor (Feb 2026).
Each section documents what the feature did, how it worked, and where the
code lived so it can be re-implemented later if needed.

---

### `includeImports` — Per-File Import Specifiers

**What it did:**
When `includeImports: true`, the overview service parsed each TypeScript/JavaScript
file with ts-morph and extracted all import/require specifiers. The result was
attached to each `TreeNode` as `imports?: string[]`.

**Example output on a TreeNode:**
```json
{
  "name": "extension.ts",
  "type": "file",
  "imports": ["vscode", "./services/index", "ts-morph", "node:path"]
}
```

**Where the code lived:**
- `extension/services/codebase/overview-service.ts` — `extractImports()` function
  (lines 384–430). Used ts-morph to walk `import` declarations, `export` re-exports,
  and `require()` / dynamic `import()` calls.
- `extension/services/codebase/types.ts` — `TreeNode.imports?: string[]` field.
- `extension/services/codebase/types.ts` — `OverviewParams.includeImports: boolean`.
- `mcp-server/src/client-pipe.ts` — `CodebaseTreeNode.imports?: string[]` (mirrored type).
- `mcp-server/src/tools/codebase/codebase-map.ts` — passed through to `codebaseGetOverview()`.

**How it flowed through the pipeline:**
1. MCP tool set `requestImports = params.includeImports ?? false`
2. Passed to `codebaseGetOverview(..., requestImports, ...)` via client-pipe
3. Client-handlers mapped it to `OverviewParams.includeImports`
4. `overview-service.getOverview()` called `populateSymbols()` with `includeImports`
5. For each TS file, `extractImports()` was called to get specifiers
6. Result attached to `TreeNode.imports`

**Performance notes:**
- Added ~15s timeout factor (`TIMEOUT_IMPORT_FACTOR_MS`)
- Used ts-morph AST parsing per file (expensive for large codebases)

---

### `includeGraph` — Module Dependency Graph

**What it did:**
When `includeGraph: true`, the MCP tool made a second call to
`codebaseGetImportGraph()` to build a full module dependency graph. This
identified circular dependencies, orphan modules, and module-to-module edges.

**Example output (appended to the tree):**
```json
{
  "modules": [
    { "path": "src/index.ts", "imports": ["./utils", "./config"] },
    { "path": "src/utils.ts", "imports": ["./helpers"] }
  ],
  "circular": [
    { "chain": ["src/a.ts", "src/b.ts", "src/a.ts"] }
  ],
  "orphans": ["src/unused.ts"],
  "stats": { "totalModules": 42, "totalEdges": 87, "circularCount": 1, "orphanCount": 1 }
}
```

**Where the code lived:**
- `extension/services/codebase/import-graph-service.ts` — `getImportGraph()` function.
  Used ts-morph's `getWorkspaceProject()` to resolve module imports and build a
  directed graph. Detected cycles via DFS with "visiting" state. Found orphans as
  modules with no importers.
- `extension/services/codebase/types.ts` — `ImportGraphParams`, `ImportGraphModule`,
  `CircularChain`, `ImportGraphResult`.
- `mcp-server/src/client-pipe.ts` — `codebaseGetImportGraph()` and mirrored types.
- `mcp-server/src/tools/codebase/codebase-map.ts` — called after `codebaseGetOverview()`
  only if output was < 50% of token limit.
- `mcp-server/src/tools/codebase/codebase-lint.ts` — also used `codebaseGetImportGraph()`
  for circular dependency detection in the lint tool.

**Guard condition:**
Only fetched if `estimateTokens(output) < OUTPUT_TOKEN_LIMIT * 0.5` to avoid
exceeding the output budget.

**Performance notes:**
- Added ~30s timeout factor (`TIMEOUT_GRAPH_FACTOR_MS`)
- Required full ts-morph project resolution (expensive)

**Note:** The `codebase_lint` tool independently calls `codebaseGetImportGraph()`.
That tool's usage is unaffected by this deferral — only the `codebase_map` tool
stops requesting it.

---

### `includeStats` — Line Counts Per File/Folder

**What it did:**
When `includeStats: true`, the overview service counted the number of lines in
each file and attached the count to the `TreeNode`. The MCP tool could then
display aggregate stats per folder.

**Example output on a TreeNode:**
```json
{
  "name": "extension.ts",
  "type": "file",
  "lines": 247
}
```

**Folder display in the tree:**
```
src/  (42 files, 3847 lines)
  components/  (15 files, 1200 lines)
```

**Where the code lived:**
- `extension/services/codebase/overview-service.ts` — `populateSymbols()` and
  `populateFileMetadata()` both handled `includeStats`. Used `readFileText()` which
  returns `{ text, lineCount }` via optimized single-pass `charCodeAt` scan.
- `extension/services/codebase/types.ts` — `TreeNode.lines?: number` field.
- `extension/services/codebase/types.ts` — `OverviewParams.includeStats: boolean`.
- `mcp-server/src/client-pipe.ts` — `CodebaseTreeNode.lines?: number`.
- `mcp-server/src/tools/codebase/codebase-map.ts` — folder stats aggregation
  in `formatTree()`.

**Performance notes:**
- Added ~5s timeout factor (`TIMEOUT_STATS_FACTOR_MS`)
- Relatively cheap — piggy-backed on file reads already done for symbol extraction

---

### `scope.exclude` — Per-Request Exclusion Globs

**What it did:**
The `scope.exclude` parameter allowed callers to pass ad-hoc glob patterns to
exclude files from the map (e.g., `["**/*.test.ts", "node_modules"]`).

**Where the code lived:**
- `mcp-server/src/tools/codebase/codebase-map.ts` — extracted `params.scope?.exclude`
  and passed it through the pipeline.
- `extension/services/codebase/file-utils.ts` — `DiscoverFilesOptions.excludePatterns`
  and `callerExcludes` regex array in `walkDirectory()`.

**Replacement:** `.devtoolsignore` file at workspace root is now the only
exclusion mechanism.

---

### Per-File-Type Symbol Kind Filtering

**What it did:**
The `show` parameter had per-file-type symbol arrays that let callers request
specific symbol kinds. For example:
- `show.typescript: ["classes", "functions"]` — only show TS classes and functions
- `show.css: ["selectors"]` — only show CSS selectors
- `show.html: ["headings", "forms"]` — only show HTML headings and forms

**Symbol kind maps:**

| File Type   | Available Kinds                                                              |
|------------|-----------------------------------------------------------------------------|
| TypeScript | `functions`, `classes`, `interfaces`, `types`, `constants`, `enums`, `methods`, `properties` |
| CSS        | `selectors`, `at-rules`, `custom-properties`                                |
| HTML       | `semantic-tags`, `headings`, `forms`, `tables`, `media`, `scripts`          |
| JSON       | `keys`, `arrays`                                                            |
| YAML       | `keys`, `arrays`                                                            |
| Markdown   | `headings`, `code-blocks`, `tables`, `frontmatter`                          |
| XML        | `elements`                                                                  |

**Where the code lived:**
- `mcp-server/src/tools/codebase/codebase-map.ts` — `FileTypeSymbolConfig`,
  `TS_KIND_MAP`, `CSS_KIND_MAP`, `HTML_KIND_MAP`, etc., `shouldShowSymbol()`,
  `getSymbolFiltersForFile()`, `formatSymbols()`, `formatSymbolChildren()`.

**Replacement:** `symbols: true` now shows all symbol kinds for all file types.
The filtering was purely an output-layer concern (the extension always extracted
all symbols; the MCP tool filtered during formatting).

---

### `scope.include` — Glob-Based File Selection

**What it did:**
The `scope.include` parameter accepted glob patterns or arrays of patterns to
select which files to include. Supported patterns like `"src"`, `"**/*.ts"`,
`["src", "lib"]`.

**Smart directory detection:**
If a pattern looked like a directory (no glob chars, no file extension), it was
automatically suffixed with `/**` to match all files recursively.

**Where the code lived:**
- `mcp-server/src/tools/codebase/codebase-map.ts` — `rawPatterns` → `includePatterns`
  mapping, glob detection logic.
- Passed through as `includePatterns` to `codebaseGetOverview()`.

**Replacement:** `folderPath` + `recursive` + `fileTypes` replaces this with a
simpler directory-first model.

---

### `show.folders` / `show.files` — Visibility Toggles

**What they did:**
- `show.folders: false` — suppress directory entries, output flat file paths
- `show.files: false` — suppress file entries, show only directory structure

**Where the code lived:**
- `mcp-server/src/tools/codebase/codebase-map.ts` — `FormatOptions.showFolders`,
  `FormatOptions.showFiles`, used in `formatTree()`.

**Replacement:**
- `fileTypes: 'none'` replaces `show.files: false` (folders only)
- Folders are always shown when they contain matching content

---

### LM Tool — File/Exports Mode

**What it did:**
The `CodebaseMapTool` (Language Model Tool) had a dual-mode design. When `path`
pointed to a specific file (not a glob, has a file extension), it called
`getExports()` to list that file's exported symbols with full signatures,
JSDoc, re-export chains, and kind grouping.

**Parameters used:**
- `path` — file path to analyze
- `kind` — filter to specific export kinds (`'all'` | `'functions'` | `'classes'` etc.)
- `includeTypes` — include type information in export signatures
- `includeJSDoc` — include JSDoc comments on exports

**Where the code lived:**
- `extension/services/codebaseLmTools.ts` — `CodebaseMapTool.invoke()` had an
  `isFileMode` branch that called `getExports()` and formatted via
  `formatExportsResult()`.
- `extension/codebase-worker-proxy.ts` — `getExports()` function
- `extension/services/codebase/exports-service.ts` — underlying service
- Formatting included kind-grouped output with icons (`ƒ`, `◆`, `◇`, etc.),
  re-export tracking, and JSDoc display.

**Example output:**
```markdown
## Exports: src/utils.ts

**12 exports (8 functions, 3 types, 1 constant)**

### ƒ Functions
- **`calculateTotal`** — `(items: Item[]) => number` *(line 15)*
  > Calculates the total price of all items

### ◆ Classes
- **`UserService`** — `class UserService` *(line 42)*

### Re-exports
- `Config` from `./config`
```

**Pipeline:** LM tool → worker proxy `getExports()` → worker thread → exports-service
(uses ts-morph `SourceFile.getExportedDeclarations()`)

**The exports service itself is NOT removed** — it still exists for `codebase_trace`
and other tools. Only the LM tool's file-mode entry point was removed.
