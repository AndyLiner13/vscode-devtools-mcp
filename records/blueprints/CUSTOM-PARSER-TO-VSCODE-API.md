# Custom Parser → VS Code API Migration Blueprint

**Status:** Proposed  
**Decision:** Pure VS Code APIs, accept tradeoffs  
**Architecture:** MCP tool calls VS Code APIs via client pipe, bypassing codebase worker for symbols  
**Related:** `VSCODE-API-MIGRATION.md` (completed migration of file I/O away from VS Code APIs — opposite direction)

---

## Executive Summary

Replace all custom AST parsers in `extension/services/codebase/parsers.ts` (746 lines, 12 npm dependencies) with VS Code's built-in language APIs (`DocumentSymbolProvider`, `FoldingRangeProvider`, `SemanticTokensProvider`). The drag race results show VS Code APIs produce **equal or better** symbols for 7 of 9 tested languages, with the only clear loss being Markdown (frontmatter/code blocks/tables). This trade eliminates a massive dependency surface area in exchange for a small, documented reduction in Markdown symbol granularity.

### Impact at a Glance

| Metric | Before (Custom) | After (VS Code APIs) |
|--------|-----------------|---------------------|
| Parser code | 746 lines | 0 lines (deleted) |
| npm dependencies removed | — | 11 packages (~1.6MB) |
| npm dependencies kept | 12 packages | ts-morph stays (used by 6 other services) |
| Bundle size reduction | — | ~1.6MB (ts-morph's ~27MB stays) |
| TS/JS symbol quality | Misses constructors, local vars, 60-88% of properties | Full coverage via language server |
| Markdown quality | Frontmatter, code blocks, tables, columns | Headings only (loss accepted) |

---

## Drag Race Results (Evidence Base)

Full drag race run across 9 languages comparing VS Code native APIs vs custom parsers:

| Language | VS Code Symbols | Custom Symbols | Winner | Folding Ranges | Semantic Tokens |
|----------|----------------|---------------|--------|----------------|----------------|
| TypeScript | 445 | 245 | **VS Code** (1.8×) | 202 | 1,879 |
| JavaScript | 436 | 147 | **VS Code** (3.0×) | 221 | 1,301 |
| HTML | 899 | 325 | **VS Code** (2.8×) | 296 | 26 |
| CSS | 419 | 354 | **VS Code** (1.2×) | 235 | 0 |
| JSON | 586 | 584 | **Tie** | 111 | 0 |
| TOML | 269 | 274 | **Tie** | 51 | 30 |
| YAML | 734 | 451 | **VS Code** (1.6×) | 231 | 0 |
| XML | 296 | 238 | **VS Code** (1.2×) | 103 | 0 |
| Markdown | 22 | 85 | **Custom** (3.9×) | 94 | 0 |
| **TOTAL** | **4,106** | **2,703** | **VS Code** (1.5×) | **1,544** | **3,236** |

---

## Per-Language Analysis

### TypeScript / JavaScript — VS Code CLEARLY BETTER

**What custom parser (ts-morph) provides:**
- Top-level declarations: function, class, interface, type, enum, constant, variable, namespace
- Class members: method, property, getter, setter
- Interface members: method, property
- Enum members: enumMember

**What VS Code provides that custom misses:**
- Constructors
- Local variables inside functions
- 60% of TS properties, 88% of JS properties (due to ts-morph only parsing class declarations, not object literals)
- Semantic tokens (1,879 TS / 1,301 JS) classify every identifier with type+modifiers

**What custom provides that VS Code misses:**
- Distinct `getter`/`setter`/`constant`/`type`/`namespace` kinds → VS Code maps these to generic `property`/`variable`/`class`/`module`
- Semantic tokens **recover all of these** via token types: `property.readonly` (getter), `variable.readonly` (constant), `type` (type alias), `namespace` (namespace)

**Verdict:** VS Code `DocumentSymbolProvider` alone is better. Adding `SemanticTokensProvider` makes it strictly superior.

### HTML — VS Code BETTER for quantity, Custom BETTER for semantic kinds

**What custom parser (parse5) provides:**
- Filters to semantic tags only (`HTML_SEMANTIC_TAGS` set of 30 tags)
- Semantic kind classification: `landmark`, `heading`, `form`, `table`, `resource`, `metadata`, `interactive`, `media`, `element`
- Rich detail: `#id`, `.classes`, attributes like `type=`, `src=`, `href=`

**What VS Code provides:**
- ALL elements, not just semantic ones (899 vs 325)
- All tag names in symbol name field
- Generic `field` kind for everything

**What's lost:**
- Semantic kind labels (`landmark`, `heading`, `form`, etc.)
- VS Code uses `field` for all HTML elements

**Mitigation:** Add a lightweight 10-line `htmlTagToKind()` lookup function (no dependencies) to post-process VS Code symbols:

```typescript
function htmlTagToKind(tagName: string): string {
  const tag = tagName.replace(/^<|>$/g, '').toLowerCase();
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'].includes(tag)) return 'landmark';
  if (['form', 'fieldset'].includes(tag)) return 'form';
  if (['table', 'thead', 'tbody', 'tfoot'].includes(tag)) return 'table';
  if (['script', 'style', 'link'].includes(tag)) return 'resource';
  if (['meta', 'title'].includes(tag)) return 'metadata';
  if (['dialog', 'details', 'summary', 'template'].includes(tag)) return 'interactive';
  if (['iframe', 'video', 'audio', 'canvas', 'svg'].includes(tag)) return 'media';
  return 'element';
}
```

**Verdict:** VS Code wins on breadth. Semantic kinds recoverable with a trivial lookup table. Net positive.

### CSS — VS Code BETTER

**What custom parser (css-tree) provides:**
- `selector` kind for rules (with full selector text as name)
- `at-rule` kind for `@media`, `@keyframes`, etc.
- `custom-property` kind for CSS variables (`--var-name`)

**What VS Code provides:**
- All of the above, plus nested rules, more declarations
- 419 vs 354 symbols

**What's lost:**
- Custom `selector`/`at-rule`/`custom-property` kind labels → VS Code uses `class`/`method`/`property`
- Recoverable with a symbol name based heuristic (names starting with `@` → at-rule, names starting with `--` → custom-property, everything else → selector)

**Verdict:** VS Code wins. Kind label mapping is trivial post-processing.

### JSON — TIE

**Custom (jsonc-parser):** 584 symbols. Object keys as names, `string`/`number`/`boolean`/`null`/`array`/`object` as kinds.  
**VS Code:** 586 symbols. Nearly identical structure.

**Verdict:** No difference worth noting. VS Code API is a clean replacement.

### YAML — VS Code BETTER

**Custom (yaml lib):** 451 symbols. Reuses `jsonValueToSymbols` after parsing.  
**VS Code (redhat.vscode-yaml):** 734 symbols. Richer structure from the YAML language server.

**Caveat:** Requires `redhat.vscode-yaml` extension installed. Without it, VS Code returns 0 symbols for YAML files.

**Verdict:** VS Code wins significantly, but depends on extension being installed.

### TOML — TIE

**Custom (@iarna/toml):** 274 symbols.  
**VS Code (tamasfe.even-better-toml):** 269 symbols.

**Caveat:** Requires `tamasfe.even-better-toml` extension. Without it, 0 symbols.

**Verdict:** Functional tie. Extension dependency added.

### XML — VS Code BETTER

**Custom (fast-xml-parser):** 238 symbols with `element` kind.  
**VS Code (redhat.vscode-xml):** 296 symbols with standard SymbolKind values.

**Caveat:** Requires `redhat.vscode-xml` extension. Without it, 0 symbols.

**Verdict:** VS Code wins. Extension dependency added.

### Markdown — Custom CLEARLY BETTER (Loss Accepted)

**What custom parser (remark) provides (85 symbols):**
- `frontmatter` with child `key` nodes for YAML frontmatter fields
- `heading` with hierarchical nesting (sections contain their children)
- `code` blocks with language detail (`code block (typescript)`)
- `table` with column children

**What VS Code provides (22 symbols):**
- Headings only (with hierarchical nesting)
- No frontmatter, no code blocks, no tables

**No VS Code API recovers this.** FoldingRangeProvider gives folding regions (94 ranges) but without semantic meaning. SemanticTokensProvider returns 0 tokens for Markdown.

**Decision:** Accept the loss. Markdown frontmatter/code blocks/tables are a nice-to-have for `codebase_map` but not critical. The 22 heading-based symbols provide adequate navigation structure.

**Future option:** If Markdown richness is needed later, keep a minimal Markdown parser (~100 lines with remark) as an optional enhancement.

---

## Architecture Change

### Current Architecture (Custom Parsers in Worker)

```
MCP Tool (codebase_map)
  └─ sendClientRequest('codebase.getOverview', { symbols: true })
       └─ Extension Main Thread
            └─ postMessage to Worker Thread
                 └─ getOverview() → populateSymbols()
                      ├─ TS/JS files → getTypeScriptSymbols() [ts-morph]
                      ├─ JSON files  → getCustomParser('json') → parseJsonSymbols() [jsonc-parser]
                      ├─ YAML files  → getCustomParser('yaml') → parseYamlSymbols() [yaml]
                      ├─ CSS files   → getCustomParser('css')  → parseCssSymbols() [css-tree]
                      ├─ HTML files  → getCustomParser('html') → parseHtmlSymbols() [parse5]
                      ├─ XML files   → getCustomParser('xml')  → parseXmlSymbols() [fast-xml-parser]
                      ├─ TOML files  → getCustomParser('toml') → parseTomlSymbols() [@iarna/toml]
                      └─ MD files    → getCustomParser('md')   → parseMarkdownSymbols() [remark]
```

**Properties:** Synchronous, zero-latency in worker, 12 dependencies bundled.

### Proposed Architecture (VS Code APIs via Client Pipe)

```
MCP Tool (codebase_map)
  ├─ sendClientRequest('codebase.getOverview', { symbols: false })
  │    └─ Worker Thread → file tree only (no symbol extraction)
  │
  └─ For each file needing symbols:
       └─ sendClientRequest('dragrace.getDocumentSymbols', { uri })
            └─ Extension Main Thread (client-handlers.ts)
                 └─ vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri)
                      └─ VS Code Language Server → symbols
```

**Properties:** Async (1-5s per file), zero custom dependencies, richer symbols, requires extension host.

### Key Architectural Decisions

1. **Symbol extraction moves out of the worker thread.** The worker continues to handle file discovery, tree building, and file reading. Symbols are populated by the MCP tool after receiving the tree.

2. **Reuse existing dragrace infrastructure.** The `dragrace.getDocumentSymbols` handler in `client-handlers.ts` and `dragraceGetDocumentSymbols()` in `client-pipe.ts` already exist and work. Rename to a general-purpose name.

3. **Batch API calls.** Instead of one request per file, send a batch request with all file URIs. The handler processes them and returns all results in one round-trip.

4. **Graceful degradation.** If a VS Code API returns 0 symbols (no language extension installed), the symbol field is simply empty. No crash, no fallback.

---

## Implementation Plan

### Phase 1: Generalize Client Pipe Symbols API

**Files changed:** `extension/client-handlers.ts`, `mcp-server/src/client-pipe.ts`

Rename and expand the dragrace handlers to general-purpose symbol extraction:

```
dragrace.getDocumentSymbols → symbols.getDocumentSymbols
dragrace.getFoldingRanges   → symbols.getFoldingRanges (optional, keep for future)
dragrace.getSemanticTokens  → symbols.getSemanticTokens (optional, keep for future)
```

Add a batch variant:

```typescript
// New handler: symbols.getDocumentSymbolsBatch
// Input: { uris: string[] }
// Output: { results: Array<{ uri: string; symbols: SerializedSymbol[]; error?: string }> }
```

Add a new client-pipe function:

```typescript
export async function getDocumentSymbolsBatch(
  uris: string[]
): Promise<Map<string, DocumentSymbolResult>> {
  const response = await sendClientRequest('symbols.getDocumentSymbolsBatch', { uris }, 30000);
  // Convert array to Map keyed by URI
  return new Map(response.results.map(r => [r.uri, r]));
}
```

**Estimated effort:** ~50 lines changed, ~30 lines new.

### Phase 2: Add Symbol Post-Processing

**Files changed:** New file `mcp-server/src/tools/codebase/symbol-mapping.ts`

Create a lightweight module that converts VS Code `DocumentSymbol` kind numbers to our string kinds, with optional semantic enrichment:

```typescript
// VS Code SymbolKind enum values → string labels
const SYMBOL_KIND_NAMES: Record<number, string> = {
  0: 'file', 1: 'module', 2: 'namespace', 3: 'package',
  4: 'class', 5: 'method', 6: 'property', 7: 'field',
  8: 'constructor', 9: 'enum', 10: 'interface', 11: 'function',
  12: 'variable', 13: 'constant', 14: 'string', 15: 'number',
  16: 'boolean', 17: 'array', 18: 'object', 19: 'key',
  20: 'null', 21: 'enumMember', 22: 'struct', 23: 'event',
  24: 'operator', 25: 'typeParameter',
};

// HTML tag → semantic kind (recovers custom parser value)
function htmlTagToSemanticKind(symbolName: string): string | undefined {
  const tag = symbolName.replace(/^<|>$/g, '').toLowerCase();
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'].includes(tag)) return 'landmark';
  if (['form', 'fieldset'].includes(tag)) return 'form';
  if (['table', 'thead', 'tbody', 'tfoot'].includes(tag)) return 'table';
  if (['script', 'style', 'link'].includes(tag)) return 'resource';
  if (['meta', 'title'].includes(tag)) return 'metadata';
  if (['dialog', 'details', 'summary', 'template'].includes(tag)) return 'interactive';
  if (['iframe', 'video', 'audio', 'canvas', 'svg'].includes(tag)) return 'media';
  return undefined;
}

// CSS symbol name → semantic kind
function cssSymbolToSemanticKind(symbolName: string): string | undefined {
  if (symbolName.startsWith('@')) return 'at-rule';
  if (symbolName.startsWith('--')) return 'custom-property';
  return 'selector';
}

export function convertVscodeSymbol(
  symbol: SerializedVscodeSymbol,
  fileExtension: string,
): CodebaseSymbolNode {
  let kind = SYMBOL_KIND_NAMES[symbol.kind] ?? 'unknown';

  // Language-specific kind enrichment
  if (['html', 'htm', 'xhtml'].includes(fileExtension)) {
    kind = htmlTagToSemanticKind(symbol.name) ?? kind;
  } else if (['css', 'scss', 'less'].includes(fileExtension)) {
    kind = cssSymbolToSemanticKind(symbol.name) ?? kind;
  }

  const node: CodebaseSymbolNode = {
    name: symbol.name,
    kind,
    range: { start: symbol.range.startLine + 1, end: symbol.range.endLine + 1 },
  };

  if (symbol.detail) {
    node.detail = symbol.detail;
  }

  if (symbol.children && symbol.children.length > 0) {
    node.children = symbol.children.map(c => convertVscodeSymbol(c, fileExtension));
  }

  return node;
}
```

**Estimated effort:** ~80 lines, new file.

### Phase 3: Modify `codebase_map` Tool

**Files changed:** `mcp-server/src/tools/codebase/codebase-map.ts`

Update the tool to:
1. Request overview with `symbols: false`
2. Collect all file paths from the tree
3. Call `getDocumentSymbolsBatch()` for all files
4. Convert and attach symbols to tree nodes
5. Render as before

```typescript
// Pseudocode for the new flow in codebase_map handler
const overviewResult = await codebaseGetOverview({
  ...params,
  symbols: false, // Tree only — no custom parsers
});

if (params.symbols) {
  // Collect all file paths from the tree
  const filePaths = collectFilePaths(overviewResult.tree, overviewResult.projectRoot);

  // Batch call VS Code API
  const symbolMap = await getDocumentSymbolsBatch(
    filePaths.map(fp => pathToFileUri(fp))
  );

  // Attach converted symbols to tree nodes
  enrichTreeWithSymbols(overviewResult.tree, symbolMap, overviewResult.projectRoot);
}
```

**Estimated effort:** ~60 lines changed in codebase-map.ts.

### Phase 4: Remove Custom Parsers and Dependencies

**Files deleted:**
- `extension/services/codebase/parsers.ts` (746 lines) — entire file

**Files modified:**
- `extension/services/codebase/overview-service.ts` — remove `populateSymbols()`, `getTypeScriptSymbols()`, `getClassMembers()`, `getInterfaceMembers()`, `getEnumMembers()` (approximately 230 lines removed)
- `extension/services/codebase/overview-service.ts` — remove import of `getCustomParser` and `getTsProject`
- `extension/package.json` — remove 12 dependencies

**Dependencies removed from `extension/package.json`:**

| Package | Size | Used By | Removable? |
|---------|------|---------|------------|
| `ts-morph` | ~27MB | `getTypeScriptSymbols()` in parsers, BUT also trace/exports/duplicates/import-graph/AST webview | **NO** — keep dependency, only remove parsers.ts usage |
| `unified` | ~200KB | Markdown parser pipeline | **YES** |
| `remark-parse` | ~150KB | Markdown parser | **YES** |
| `remark-frontmatter` | ~10KB | Markdown frontmatter | **YES** |
| `remark-gfm` | ~30KB | Markdown GFM tables | **YES** |
| `yaml` | ~300KB | `parseYamlSymbols()` + Markdown frontmatter key extraction | **YES** (only used in parsers.ts) |
| `@iarna/toml` | ~50KB | `parseTomlSymbols()` | **YES** |
| `css-tree` | ~400KB | `parseCssSymbols()` | **YES** |
| `@types/css-tree` | ~20KB | CSS parser types | **YES** |
| `parse5` | ~300KB | `parseHtmlSymbols()` | **YES** |
| `fast-xml-parser` | ~100KB | `parseXmlSymbols()` | **YES** |
| `jsonc-parser` | ~50KB | `parseJsonSymbols()` | **YES** |

**Total removable bundle reduction:** ~1.6MB (11 packages). ts-morph (~27MB) stays because other services depend on it.

**Also removed:**
- `extension/services/parsers/types.ts` — `FileParser` interface, `PARSER_EXTENSIONS`, `ParserType`, `getParserType()` (73 lines)
- All `mdast` type imports and the `@types/mdast` devDependency (if separate)

### Phase 5: Update Dependent Code

**Files to check for references to removed code:**

| Consumer | Import | Action |
|----------|--------|--------|
| `overview-service.ts` | `getCustomParser` from `./parsers` | Remove import + usage in `populateSymbols()` |
| `overview-service.ts` | `getTsProject` from `./ts-project` | Remove if only used for symbol extraction |
| `codebase-worker.ts` | `getOverview` from `./overview-service` | No change (still used for tree building) |
| `codebaseLmTools.ts` | `renderSymbolNode` | No change (still renders `SymbolNode[]`) |

**Note on `ts-morph` and `ts-project.ts`:** Check whether ts-morph is still used by other services (trace, exports, dead-code, duplicate detection, import graph). If so, only remove it from `parsers.ts` usage, keep the dependency. If ts-morph is used elsewhere, this phase removes only the `getTypeScriptSymbols()` function, not the ts-morph dependency itself.

---

## Type Changes

### `SymbolNode` (unchanged)

```typescript
interface SymbolNode {
  name: string;
  kind: string;       // Now populated from VS Code SymbolKind + post-processing
  detail?: string;     // From VS Code DocumentSymbol.detail
  range: { start: number; end: number };
  children?: SymbolNode[];
}
```

No change needed — the interface is already generic enough to hold VS Code API results.

### `OverviewParams` change

```typescript
interface OverviewParams {
  // ... existing fields
  symbols: boolean;  // NOW: when true, caller is responsible for populating symbols after getOverview
}
```

When `symbols: true`, the overview service returns the tree with `symbols` arrays empty. The MCP tool populates them via VS Code APIs. This is a semantic change but not a type change.

---

## Speed Impact

### Before (Custom Parsers)

| Operation | Latency | Location |
|-----------|---------|----------|
| File tree discovery | 10-50ms | Worker thread |
| Symbol extraction per file | 0-1ms | Worker thread (synchronous) |
| Total for 100-file project | 50-150ms | Worker thread |

### After (VS Code APIs)

| Operation | Latency | Location |
|-----------|---------|----------|
| File tree discovery | 10-50ms | Worker thread |
| Symbol batch request (100 files) | 2-8 seconds | Client pipe → Extension Host → Language Servers |
| Total for 100-file project | 2-9 seconds | Mixed |

### Mitigation Strategies

1. **Only request symbols when `symbols: true`.** Most `codebase_map` calls don't request symbols. The overhead only applies when the user explicitly asks for symbol skeleton.

2. **Batch all files in one request.** A single JSON-RPC round trip with 100 URIs is faster than 100 individual requests.

3. **Limit symbol depth.** VS Code's `DocumentSymbolProvider` returns the full hierarchy. Apply `maxDepth` trimming on the MCP tool side after receiving results.

4. **Progress reporting.** For large projects, send intermediate progress to the user ("Extracting symbols... 45/100 files").

5. **Parallel API calls.** If batch is too slow, split into chunks of 10-20 and call in parallel (but respect Extension Host throughput).

6. **Caching.** Cache symbol results by file path + mtime. Invalidate when files change.

---

## Extension Dependencies

VS Code's built-in language support covers:
- ✅ TypeScript / JavaScript (built-in)
- ✅ HTML (built-in)
- ✅ CSS / SCSS / LESS (built-in)
- ✅ JSON / JSONC (built-in)
- ✅ Markdown (built-in)

External extensions required for full coverage:
- ⚠️ YAML → `redhat.vscode-yaml` (95M+ installs)
- ⚠️ TOML → `tamasfe.even-better-toml` (10M+ installs)
- ⚠️ XML → `redhat.vscode-xml` (20M+ installs)

**Graceful degradation:** If an extension is not installed, `executeDocumentSymbolProvider` returns an empty array. The tree node simply has no symbols — the same behavior as an unsupported file type today.

**Recommendation:** Document these optional extension dependencies in the tool's README/docs. Consider adding a diagnostic hint when a supported file type returns 0 symbols ("Install `redhat.vscode-yaml` for YAML symbol support").

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| VS Code API latency makes `codebase_map` slow | High | Medium | Batch calls, only when `symbols: true`, caching |
| Missing extension = 0 symbols for YAML/TOML/XML | Medium | Low | Graceful degradation, user hint, document requirements |
| Markdown loses frontmatter/code blocks/tables | Certain | Low | Accept loss; headings provide adequate structure |
| Extension Host overloaded with large batch | Low | Medium | Chunk batch requests, add timeout handling |
| `ts-morph` still needed by other services | Likely | None | Only remove from parsers.ts, keep dependency if needed elsewhere |
| Breaking change for LM tools using `codebaseLmTools.ts` | Low | Low | `SymbolNode` interface unchanged; only data source changes |
| HTML/CSS kind labels change in output | Medium | Low | Post-processing lookup tables recover semantic kinds |

---

## What We Keep From Custom Parsers

### Markdown: Accept Loss

- **Frontmatter**, **code blocks**, **tables** — not available from any VS Code API
- VS Code Markdown provides only headings (22 vs 85 symbols)
- FoldingRangeProvider gives region boundaries but no semantic meaning
- SemanticTokensProvider returns 0 tokens for Markdown
- **Decision:** Accept the loss. If needed later, a minimal Markdown parser (~100 lines) can be added back

### HTML: Recover via Lookup Table

- `htmlTagToSemanticKind()` — 10-line function, zero dependencies
- Preserves `landmark`, `heading`, `form`, `table`, `resource`, `metadata`, `interactive`, `media` kind labels
- Applied as post-processing on VS Code symbol results

### CSS: Recover via Name Heuristic

- `cssSymbolToSemanticKind()` — 5-line function, zero dependencies
- Names starting with `@` → `at-rule`, `--` → `custom-property`, else → `selector`
- Applied as post-processing on VS Code symbol results

---

## Migration Order of Operations

```
Phase 1: Generalize client-pipe symbol APIs       [~2 hours]
  ├─ Rename dragrace.* handlers → symbols.*
  ├─ Add batch handler for document symbols
  └─ Add getDocumentSymbolsBatch() client-pipe function

Phase 2: Create symbol post-processing module     [~1 hour]
  ├─ Create symbol-mapping.ts
  ├─ VS Code SymbolKind → string kind mapping
  └─ HTML/CSS semantic kind enrichment

Phase 3: Modify codebase_map tool                  [~2 hours]
  ├─ Overview with symbols: false (tree only)
  ├─ Batch VS Code API call for all file URIs
  ├─ Convert + attach symbols to tree nodes
  └─ Test with full drag race comparison

Phase 4: Remove custom parsers + dependencies      [~1 hour]
  ├─ Delete parsers.ts (746 lines)
  ├─ Delete parsers/types.ts (73 lines)
  ├─ Remove populateSymbols() from overview-service.ts (~100 lines)
  ├─ Remove getTypeScriptSymbols() + member helpers (~130 lines)
  ├─ Update package.json (remove 12 dependencies)
  └─ npm install (clean lockfile)

Phase 5: Update dependent code + tests             [~1 hour]
  ├─ Check trace, exports, dead-code, duplicate services for ts-morph usage
  ├─ Remove unused imports
  ├─ Update any tests referencing custom parser output
  └─ Verify codebaseLmTools.ts still works (unchanged interface)

Phase 6: Documentation + verification              [~30 min]
  ├─ Update tool-reference.md
  ├─ Update README.md with extension recommendations
  ├─ Run full drag race comparison to verify parity
  └─ Test with symbols:true on a real project
```

**Total estimated effort:** ~7.5 hours

---

## Verification Criteria

After migration, run the drag race tool to verify:

1. **No regression for TS/JS:** Symbol count should be ≥ custom parser baseline (445+ for TS, 436+ for JS)
2. **No regression for JSON/YAML/TOML/CSS/XML:** Symbol counts should match or exceed custom baselines
3. **HTML semantic kinds preserved:** Output should show `landmark`, `heading`, `form`, etc. (from post-processing)
4. **Markdown reduced but functional:** Should show ~22 heading-based symbols (down from 85)
5. **No crashes on missing extensions:** YAML/TOML/XML files without extensions should return empty symbol arrays gracefully
6. **`codebase_map` output format unchanged:** Same `kind name` format, same tree indentation
7. **Performance acceptable:** `codebase_map` with `symbols: true` on a 100-file project completes within 15 seconds

---

## Open Questions

1. **~~Should we keep `ts-morph` as a dependency?~~** **CONFIRMED: YES.** ts-morph is imported by 6 services: trace-symbol-service, exports-service, duplicate-detection-service, import-graph-service, overview-service, and AST webview. Only remove its usage from `getTypeScriptSymbols()` in overview-service.ts. The `yaml` package, however, is ONLY used in `parsers.ts` and can be fully removed.

2. **Should we add a Markdown fallback?** If Markdown frontmatter/code blocks/tables are important for LLM context, keep a minimal remark-based parser (~100 lines, 4 packages: unified, remark-parse, remark-frontmatter, remark-gfm) as an optional fallback when VS Code returns < N symbols.

3. **Should we expose FoldingRanges and SemanticTokens in `codebase_map`?** The infrastructure already exists from the drag race. FoldingRanges could enhance the tree with collapsible region info. SemanticTokens could provide identifier classification. Both would add latency.

4. **Should we add extension install recommendations?** When YAML/TOML/XML files return 0 symbols, the tool could suggest installing the appropriate extension. Would require knowing which extensions are installed (via `vscode.extensions.all`).
