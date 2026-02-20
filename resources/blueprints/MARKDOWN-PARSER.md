# Markdown Structured Parser Blueprint

> Bring the full `exp_file_read` / `exp_file_edit` structured experience to Markdown files — skeleton mode, target-based navigation, structured line-range, highlight ranges, and the safety layer — with parity to TypeScript/JavaScript.

---

## Problem Statement

Today, `exp_file_read` and `exp_file_edit` provide a rich structured experience for TS/JS files:

- **Skeleton mode** — Symbol tree with line ranges, expandable hierarchy
- **Target mode** — Navigate by symbol name (`"UserService.findById"`)
- **Special targets** — `#imports`, `#exports`, `#comments`
- **Structured line-range** — Symbols collapse to stubs, non-symbols show raw content
- **Highlight range** — Yellow highlights, grey folds in the editor
- **Safety layer** — Symbol diff before/after edits, rename propagation, auto-fix

For Markdown files, **all of these features are blocked**:

```
Skeleton mode → "Skeleton mode requires a TypeScript or JavaScript file."
Target mode   → "Target-based reading requires a TypeScript or JavaScript file."
Line-range    → Falls back to raw content (no structured rendering)
Edit target   → Not supported
```

Meanwhile, `codebase_map` uses a custom Markdown parser (`parsers.ts`) that produces basic `SymbolNode[]` with heading hierarchy, code blocks, and tables — but this never feeds into `file_read` or `file_edit`.

---

## Design Goals

1. **Full Parity** — Every structured feature available for TS/JS should work for Markdown
2. **Same Mental Model** — Headings are like classes/functions, code blocks are like methods, sections have ranges
3. **Shared Interface** — A common type system that both TS/JS and Markdown (and future file types) implement
4. **Remark Foundation** — Keep `remark/unified` as the AST parser; build semantic hierarchy on top
5. **Extensible** — Architecture that makes adding Python, YAML, etc. straightforward later

---

## Architecture Overview

### Current Architecture (TS/JS Only)

```
exp_file_read / exp_file_edit
  → fileExtractStructure(filePath)              [client-pipe.ts]
    → sendClientRequest('file.extractStructure') [RPC to extension]
      → extractFileStructure(filePath)           [file-structure-extractor.ts]
        → ts-morph AST walk → ExtractedSymbol[]
        → orphanedContent() → imports/exports/comments/gaps
      → returns UnifiedFileResult

exp_codebase_map (symbols: true)
  → populateSymbols()                            [overview-service.ts]
    → getTypeScriptSymbols() → SymbolNode[]      [ts-morph]
    → getCustomParser() → SymbolNode[]           [parsers.ts - JSON/MD]
```

### Target Architecture (Multi-File-Type)

```
exp_file_read / exp_file_edit
  → fileExtractStructure(filePath)
    → sendClientRequest('file.extractStructure')           [RPC]
      → handleFileExtractStructure()                        [client-handlers.ts]
        → LanguageServiceRegistry.get(ext).extractStructure()
          → TS/JS  → TypeScriptLanguageService   → FileStructure
          → MD     → MarkdownLanguageService     → FileStructure
          → JSON   → JsonLanguageService         → FileStructure  (future)
          → *      → rawFallback()               → FileStructure  (minimal)

exp_codebase_map (symbols: true)
  → populateSymbols()
    → LanguageServiceRegistry.get(ext).extractStructure()
    → extract .symbols from FileStructure

Highlight / Folding (generic, derived from any FileStructure)
  → fileHighlightReadRange(filePath, start, end, collapsed, source)
    → handleFileHighlightReadRange()                        [client-handlers.ts]
      → apply decorations + register folding provider
      → works identically for ALL file types (language-agnostic)
```

---

## Language Service Registry

### Design Pattern

A singleton `LanguageServiceRegistry` maps file extensions to `LanguageService` implementations. Each language service provides a single capability: `extractStructure()`, which converts a file into a `FileStructure` object.

Highlight decorations and folding regions are **generic** — they are derived from the `FileStructure` output and work identically for all file types. There is no per-language highlight or folding logic.

### LanguageService Interface

```typescript
/** Contract that every language parser must implement. */
interface LanguageService {
  /** Unique identifier (e.g., 'typescript', 'markdown', 'json') */
  readonly id: string;

  /** Human-readable name (e.g., 'TypeScript / JavaScript') */
  readonly name: string;

  /** File extensions this service handles (e.g., ['md', 'markdown']) */
  readonly extensions: readonly string[];

  /** Extract structured file representation. */
  extractStructure(filePath: string): Promise<FileStructure>;
}
```

### LanguageServiceRegistry Class

```typescript
class LanguageServiceRegistry {
  private readonly services = new Map<string, LanguageService>();

  /**
   * Register a language service for its declared extensions.
   * Throws if an extension is already registered (no silent overrides).
   */
  register(service: LanguageService): void {
    for (const ext of service.extensions) {
      const key = ext.toLowerCase();
      if (this.services.has(key)) {
        throw new Error(
          `Extension '.${key}' already registered by '${this.services.get(key)!.id}'`
        );
      }
      this.services.set(key, service);
    }
  }

  /** Get the language service for a file extension, or undefined. */
  get(ext: string): LanguageService | undefined {
    return this.services.get(ext.toLowerCase());
  }

  /** Check if a file extension has a registered language service. */
  supports(ext: string): boolean {
    return this.services.has(ext.toLowerCase());
  }

  /** List all registered service IDs. */
  registeredIds(): string[] {
    const seen = new Set<string>();
    for (const svc of this.services.values()) {
      seen.add(svc.id);
    }
    return [...seen];
  }
}
```

### Registration Flow

All language services are registered at extension activation time, inside `registerClientHandlers()`:

```typescript
// In registerClientHandlers() or a dedicated init function
const registry = new LanguageServiceRegistry();

registry.register(new TypeScriptLanguageService());   // ts, tsx, js, jsx, mts, mjs, cts, cjs
registry.register(new MarkdownLanguageService());     // md, markdown
// registry.register(new JsonLanguageService());      // json, jsonc, jsonl (future)

// The registry is then used by handlers:
register('file.extractStructure', (params) => {
  const ext = path.extname(params.filePath).slice(1).toLowerCase();
  const service = registry.get(ext);
  if (!service) return rawFallback(params.filePath);
  return service.extractStructure(params.filePath);
});
```

### How Highlight + Folding Work (Generic)

The highlight and folding system is **not** part of the language service interface. It is a generic system that operates on `{startLine, endLine}` ranges derived from any `FileStructure`:

1. **MCP server** (`file-read.ts`) calls `fileExtractStructure(filePath)` → gets `FileStructure`
2. **MCP server** calculates which regions to highlight (source ranges) and which to fold (collapsed ranges) based on the symbol tree
3. **MCP server** calls `fileHighlightReadRange(filePath, start, end, collapsedRanges, sourceRanges)` fire-and-forget
4. **Extension** (`handleFileHighlightReadRange`) opens the document, applies yellow/grey decorations, registers a folding provider, and folds the collapsed ranges

This flow is identical regardless of whether the file is TypeScript, Markdown, JSON, or any future language. Adding a new language to the registry automatically enables highlight + folding for that language's structured features.

### File Location

```
extension/services/codebase/
  language-service-registry.ts     ← LanguageService interface + LanguageServiceRegistry class
  language-services/               ← NEW folder
    typescript-language-service.ts  ← Wraps existing file-structure-extractor.ts
    markdown-language-service.ts    ← Wraps markdown/ module
    index.ts                       ← Re-exports all services
```

### Adding a New Language

To add support for a new file type (e.g., YAML, Python):

1. Create `extension/services/codebase/language-services/yaml-language-service.ts`
2. Implement the `LanguageService` interface
3. Add one line to registration: `registry.register(new YamlLanguageService())`
4. Done — skeleton mode, target mode, structured line-range, highlight, and folding all work automatically

No changes needed in the MCP server, `file-read.ts`, `file-edit.ts`, or `client-handlers.ts`.

---

## Shared Context Optimization Layer

### Core Insight

The recursive depth optimization algorithm (`chunker.ts`) is **not** a `codebase_map`-specific utility — it is a core context optimization engine designed for all tools that work with symbol hierarchies. Its `Chunk` type is already annotated "for use across `file_read`, `file_edit`, and `codebase_search`."

Today, `file_read` uses a naive `CHARACTER_LIMIT` (25,000 chars) truncation — it renders the full output and then chops it with `substring(0, CHARACTER_LIMIT) + '⚠️ Truncated'`. This is wasteful:

- Content is parsed, rendered, and then thrown away
- The truncation point is arbitrary — it may cut mid-symbol or mid-line
- There's no intelligent depth reduction or context budgeting

The chunker's recursive depth algorithm solves this by working **within** a token budget from the start, using the symbol hierarchy to make intelligent cuts.

### Architecture: Three-Layer Pipeline

Every tool that reads or interacts with file content should flow through three layers:

```
Layer 1: Parse (LanguageServiceRegistry)
  → registry.get(ext).extractStructure(filePath)
  → Returns: FileStructure (complete symbol tree + content)

Layer 2: Optimize (Context Optimization Service)
  → Takes: FileStructure + budget constraints (tokenBudget, maxDepth)
  → Returns: Context-limited output (chunks, pruned skeleton, etc.)
  → Algorithm: Recursive depth-first with token budgeting, oversized splitting

Layer 3: Render (Tool-specific formatting)
  → Takes: Optimized output
  → Returns: Final text response (skeleton entries, numbered lines, etc.)
```

### How Each Tool Uses the Pipeline

| Tool | Layer 1 (Parse) | Layer 2 (Optimize) | Layer 3 (Render) |
|---|---|---|---|
| `codebase_map` | Registry → `FileStructure` | Chunk symbols within budget | Tree format `[range] kind name` |
| `file_read` skeleton | Registry → `FileStructure` | Depth-limited skeleton within budget | Skeleton entries |
| `file_read` target | Registry → `FileStructure` | Target subtree + children within budget | Content with placeholders |
| `file_read` line-range | Registry → `FileStructure` | Range extraction with structured stubs | Numbered lines |
| `file_edit` target | Registry → `FileStructure` | Resolve target symbol range | Apply edit to range |

### Changes to the Chunker

The chunker currently has its own parsing dispatch (`parseFileSymbols()` → `getTypeScriptSymbols()` or `getCustomParser()`). This should be replaced by accepting `FileSymbol[]` directly:

```typescript
// Current: chunker does its own parsing
function parseFileSymbols(text: string, filePath: string, ext: string): SymbolNode[] { ... }
export function chunkFile(params: ChunkFileParams): ChunkFileResult { ... }

// Target: chunker accepts parsed symbols from any source
export function chunkSymbols(params: ChunkSymbolsParams): ChunkResult {
  // No parsing — symbols come from the registry via the caller
}
```

The chunker becomes a **pure algorithm** — it takes `FileSymbol[]` and returns context-optimized output. The caller provides the symbols (via registry) and the budget constraints.

### Changes to `file_read`

Instead of rendering the full output and truncating:

```typescript
// Current: render everything, then truncate
const output = renderFullSkeleton(structure);
if (output.length > CHARACTER_LIMIT) {
  return output.substring(0, CHARACTER_LIMIT) + '\n\n⚠️ Truncated';
}

// Target: optimize BEFORE rendering
const optimized = contextOptimize(structure.symbols, { tokenBudget: 6000 });
const output = renderSkeleton(optimized);
// Output is guaranteed to fit — no truncation needed
```

### Integration with the Registry

The context optimization layer sits between parsing and rendering. It doesn't know or care about the file type — it works on any `FileSymbol[]` tree. This means:

1. Add a new language to the registry → context optimization works automatically
2. The optimization algorithm is tested once and works for all languages
3. Budget constraints can be tuned per-tool (e.g., `codebase_map` might use a tighter budget than `file_read`)

### File Location

The chunker already exists at `extension/services/codebase/chunker.ts`. The changes are:

1. Remove `parseFileSymbols()` — callers provide `FileSymbol[]` directly
2. Update input types from `SymbolNode` to `FileSymbol`
3. Export a clean `chunkSymbols()` API
4. `file_read` calls registry → chunk → render (instead of registry → render → truncate)

---

## Shared Interface Design

### The Problem

Two incompatible symbol types exist today:

```typescript
// file_read / file_edit (TS/JS only)
interface UnifiedFileSymbol {
  name: string;
  kind: string;
  range: { startLine: number; startChar: number; endLine: number; endChar: number };
  children: UnifiedFileSymbol[];
  exported?: boolean;
  modifiers?: string[];
}

// codebase_map (all file types)
interface SymbolNode {
  name: string;
  kind: string;
  range: { start: number; end: number };
  children?: SymbolNode[];
}
```

### The Solution: `FileSymbol` (Shared Base)

```typescript
/** Shared symbol interface for all file types. */
interface FileSymbol {
  name: string;
  kind: string;
  detail?: string;
  range: FileSymbolRange;
  children: FileSymbol[];   // Always an array (never optional)
}

interface FileSymbolRange {
  startLine: number;        // 1-indexed
  endLine: number;          // 1-indexed
  startChar?: number;       // 0-indexed column (optional — TS has it, MD doesn't need it)
  endChar?: number;         // 0-indexed column (optional)
}
```

### Unified File Structure

```typescript
/** Shared structure returned by all file-type extractors. */
interface FileStructure {
  /** Primary symbols (functions, classes, headings, code blocks, etc.) */
  symbols: FileSymbol[];

  /** Full file content as a string */
  content: string;

  /** Total number of lines in the file */
  totalLines: number;

  /** File type identifier used for rendering decisions */
  fileType: 'typescript' | 'markdown' | 'json' | 'unknown';

  /** Orphaned content — items that exist outside of any symbol's range */
  orphaned: OrphanedContent;

  /** Gap lines — blank lines or content not covered by symbols or orphaned items */
  gaps: Array<{ start: number; end: number; type: 'blank' | 'unknown' }>;

  /** Extraction statistics */
  stats: FileStructureStats;
}

interface OrphanedContent {
  /** Items categorized by their semantic role */
  items: OrphanedItem[];
}

interface OrphanedItem {
  name: string;
  kind: string;
  detail?: string;
  range: { start: number; end: number };
  children?: OrphanedItem[];
  /** Semantic category for the file_read special targets */
  category: OrphanedCategory;
}

/**
 * Categories map to special target keywords in exp_file_read.
 * TS/JS: #imports, #exports, #comments
 * Markdown: #comments (root-level HTML comments)
 * Note: Frontmatter is a named root-level symbol, NOT orphaned content.
 */
type OrphanedCategory =
  | 'import'      // TS/JS imports
  | 'export'      // TS/JS exports
  | 'comment'     // TS/JS orphan comments, MD HTML comments at root
  | 'directive'   // TS/JS shebangs/pragmas
  | 'footnote'    // MD footnote definitions [^1]: ...
  | 'linkdef';    // MD reference link definitions [id]: url

interface FileStructureStats {
  totalSymbols: number;
  totalOrphaned: number;
  totalBlankLines: number;
  coveragePercent: number;
}
```

### Migration Path

The new `FileSymbol` and `FileStructure` interfaces **replace** `UnifiedFileSymbol`, `UnifiedFileResult`, `ExtractedSymbol`, and `OrphanedSymbolNode`. The migration is:

1. Define `FileSymbol`, `FileStructure`, and `LanguageService` interface in shared types / registry files
2. Create `LanguageServiceRegistry` class and `language-services/` folder
3. Wrap existing `extractFileStructure()` (TS/JS) in `TypeScriptLanguageService`
4. Update `handleFileExtractStructure` to dispatch via registry
5. Create `MarkdownLanguageService` wrapping new markdown parser
6. Update `file-read.ts` and `file-edit.ts` to use `FileStructure` (remove `STRUCTURED_EXTS` gate)
7. Update `overview-service.ts` to use `FileSymbol` instead of `SymbolNode`
8. Update `symbol-resolver.ts` — `SymbolLike` becomes `FileSymbol`
9. Update `client-pipe.ts` RPC types

---

## Markdown Hierarchy Model

### Remark Plugin Stack

All AST parsing is delegated to remark plugins. Our parser builds the semantic hierarchy on top.

| Plugin | AST Node Types Produced | Phase |
|---|---|---|
| `remark-parse` | heading, paragraph, code, table, list, listItem, blockquote, html, thematicBreak, etc. | Phase 2 |
| `remark-frontmatter` | yaml, toml | Phase 2 |
| `remark-gfm` | table (enhanced), footnoteDefinition, footnoteReference, delete (strikethrough) | Phase 2 |
| `remark-math` | math (display), inlineMath | Phase 2 |
| `remark-directive` | containerDirective, leafDirective, textDirective (for `:::tip` syntax) | Phase 2 |
| `remark-github-blockquote-alert` | Transforms `> [!NOTE]` blockquotes into proper callout nodes | Phase 2 |

All plugins are `🟢` (stable, up-to-date with current remark/micromark).

### Core Principle: Heading Dominance

A heading **owns** all subsequent content until a heading of equal or higher level is encountered. This mirrors how a function owns its body in TS/JS.

```markdown
# Introduction              ← Section: lines 1–8
Some introductory text.     ← Implicit content (like statements in a function)

## Features                 ← Child section: lines 4–8
- Fast                      ← List child of ## Features
- Reliable

# Advanced                  ← New section: lines 9–...
```

### Symbol Kinds for Markdown

| Kind | Markdown Construct | Example | Has Children? |
|---|---|---|---|
| `section` | Heading (H1–H6) | `# Introduction` | Yes — sub-sections, blocks |
| `frontmatter` | YAML/TOML front matter | `---\ntitle: ...\n---` | Yes — top-level keys |
| `code` | Fenced code block | `` ```js ... ``` `` | No |
| `table` | GFM table | `\| col \| col \|` | Yes — column headers |
| `list` | Ordered/unordered list | `- item\n- item` | Yes — list items |
| `item` | List item | `- content` | Yes — nested lists, code |
| `blockquote` | Blockquote | `> text` | Yes — any block content |
| `html` | Raw HTML block | `<div>...</div>` | No |
| `math` | Math block | `$$...\n$$` | No |
| `rule` | Horizontal rule | `---` | No |
| `directive` | GitHub callout | `> [!NOTE]` | Yes — content inside |

### Section Range Calculation

**Critical**: A heading's range extends from its own line to the line before the next heading of equal or higher level (or EOF).

```markdown
1: # Introduction           ← section range: 1–8
2: Welcome to the docs.
3:
4: ## Getting Started        ← section range: 4–8 (child of #)
5: Install the package:
6:
7: ```bash
8: npm install
9: ```
10:
11: ## Usage                  ← section range: 11–14 (sibling of ##)
12: Import and use:
13:
14: ```js
15: import { foo } from 'bar';
16: ```
17:
18: # API Reference           ← section range: 18–EOF (sibling of #)
```

Calculation algorithm:
1. Collect all heading positions and depths
2. For each heading, scan forward for the next heading of equal or lesser depth
3. End range = (next heading line - 1) or EOF

### Container Scoping

Containers (lists, blockquotes, directives) create **hard scopes**. Content inside a container belongs to that container regardless of headings.

```markdown
# Section                    ← section owns everything below
> **Warning**                ← blockquote: hard scope
> This is important.
> ```js
> doSomething();             ← code block is child of blockquote, NOT sibling of section
> ```

- Item 1                     ← list item: hard scope
  - Nested item              ← nested list is child of item
  - ```js
    code()                   ← code block is child of nested item
    ```
```

### Hierarchy Rules (Stack-Based)

The parser processes mdast nodes sequentially with a context stack:

1. **Heading encountered**: Pop stack until a parent with lower depth is found. Create section, push to stack.
2. **Container encountered** (list, blockquote, directive): Create container, push to stack. Recurse children. Pop when done.
3. **Leaf encountered** (code, table, math, html, rule): Attach to current context.
4. **Paragraph encountered**: Implicit — covered by parent section's range. Not a symbol.

### Frontmatter Handling

Frontmatter is treated as its own **section-like symbol** at the root level (not orphaned content):

```typescript
{
  name: 'frontmatter',
  kind: 'frontmatter',
  range: { startLine: 1, endLine: 4 },
  children: [
    { name: 'title', kind: 'key', range: { startLine: 2, endLine: 2 }, children: [] },
    { name: 'description', kind: 'key', range: { startLine: 3, endLine: 3 }, children: [] },
  ]
}
```

### Orphaned Content (Root-Level Non-Section Content)

Content that appears **before the first heading** and isn't frontmatter is orphaned content:

```markdown
---
title: My Doc                ← frontmatter (own section)
---

This paragraph appears       ← orphaned: root-level content
before any heading.

[ref]: https://example.com    ← orphaned: linkdef

# First Section               ← first heading section
```

Footnote definitions (`[^1]: ...`) and reference link definitions (`[id]: url`) that appear at the root level (not inside any section) are also orphaned content.

---

## Target Addressing System

### Design Principle: One Syntax

The target system uses **exactly one syntax**: dot-path navigation by name. This is identical to how TS/JS targeting works (`"UserService.findById"`).

Markdown symbols fall into two categories:

1. **Named symbols** — Have natural, deterministic names. Targetable by dot-path.
2. **Unnamed blocks** — Positional content without inherent names. Accessed via `startLine`/`endLine`.

The skeleton view shows **both** kinds with descriptive metadata, so users can identify what's at each position and choose the appropriate access method.

### Named Symbol Targeting (Dot-Path)

| Target | What It Resolves To |
|---|---|
| `"frontmatter"` | The YAML/TOML front matter section |
| `"frontmatter.title"` | The `title` key within frontmatter |
| `"Installation"` | The `# Installation` heading section (full range) |
| `"Installation.Windows"` | The `## Windows` heading under `# Installation` |
| `"API Reference.Methods"` | The `## Methods` heading under `# API Reference` |

This works exactly like TS/JS: `resolveSymbolTarget()` walks the tree by dot-separated names.

### Unnamed Block Access (Line Range)

Code blocks, tables, lists, blockquotes, and other non-heading blocks do **not** have natural names. They are accessed via `startLine`/`endLine` parameters:

```
file_read: { file: "README.md", startLine: 8, endLine: 11 }
```

The skeleton view provides all the context needed to choose:

```
[1-4] frontmatter frontmatter        ← target: "frontmatter"
[6-20] section # Introduction         ← target: "Introduction"
  [8-11] code bash                    ← use: startLine: 8, endLine: 11
  [13-20] section ## Quick Start      ← target: "Introduction.Quick Start"
    [14-15] code bash                 ← use: startLine: 14, endLine: 15
    [17-19] table                     ← use: startLine: 17, endLine: 19
```

**Why not auto-name unnamed blocks?** Unnamed blocks (code, tables, lists) don't have deterministic names. Auto-generated names (like `"code (bash)"` or `"table [Name,Type]"`) would be:
- **Non-deterministic** — Duplicate languages/headers require disambiguation suffixes
- **Pseudo-structural** — Adding artificial names to inherently unnamed content
- **Fragile** — Names change when content changes, breaking targeting

Line ranges are the most honest and precise way to access positional content. The skeleton metadata (kind + detail like language or column headers) gives users the context to understand WHAT is at each position.

### Special Target Keywords (Orphaned Content)

For TS/JS compatibility, the `#` prefix targets orphaned content categories:

| Target | TS/JS | Markdown |
|---|---|---|
| `#imports` | Import declarations | Not applicable (returns empty) |
| `#exports` | Export declarations | Not applicable (returns empty) |
| `#comments` | Orphan comments | Root-level HTML comments |

Markdown-specific orphaned content does NOT get special targets — it's handled naturally:
- **Frontmatter** → Named symbol `"frontmatter"` (not orphaned)
- **Footnote definitions** → Orphaned content, visible in skeleton with line ranges
- **Link reference definitions** → Orphaned content, visible in skeleton with line ranges

### Workflow Example

**Step 1: Skeleton** — See the full structure

```
file_read: { file: "doc.md", skeleton: true }

[1-3] frontmatter frontmatter
[5-25] section # Getting Started
  [7-10] code bash
  [12-25] section ## Configuration
    [14-18] code yaml
    [20-23] table
    [24-25] code bash
[27-40] section # API Reference
  [29-35] section ## Methods
    [30-34] table
  [37-40] section ## Events
    [38-40] code typescript
```

**Step 2: Read named section**

```
file_read: { file: "doc.md", target: "Getting Started.Configuration" }

[12] ## Configuration
[13]
[14-18] code yaml           ← child placeholder
[19]
[20-23] table                ← child placeholder
[24-25] code bash            ← child placeholder
```

**Step 3: Read specific code block**

```
file_read: { file: "doc.md", startLine: 14, endLine: 18 }

[14] ```yaml
[15] port: 3000
[16] host: localhost
[17] debug: true
[18] ```
```

---

## Integration Points

### 1. `exp_file_read` Changes

**`file-read.ts`**:

- Remove `STRUCTURED_EXTS` gate — replace with RPC call that returns `FileStructure | undefined` (the registry on the extension side decides if the file type is supported)
- Change `fileExtractStructure()` to work for all registered extensions
- No changes to skeleton rendering — `formatSkeletonEntry()` already uses `SymbolLike` interface

**Extension handler (`client-handlers.ts`)**:

- Update `handleFileExtractStructure` to use the `LanguageServiceRegistry`:
  ```typescript
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const service = registry.get(ext);
  if (!service) return rawFallback(filePath);
  return service.extractStructure(filePath);
  ```
- No hardcoded `if ts then... else if md then...` dispatch

### 2. `exp_file_edit` Changes

**`file-edit.ts`**:

- Remove TS/JS-only restriction on target parameter
- Target resolution works unchanged (same `resolveSymbolTarget()`)

**`safety-layer.ts`** (deferred to Phase 4):

- Future: Replace `fileGetSymbols()` (VS Code native) with `fileExtractStructure()` (custom)
- Future: Diff operates on `FileSymbol[]` instead of `SerializedFileSymbol[]`
- For now, the safety layer continues using VS Code native symbols

### 3. `codebase_map` Changes

**`overview-service.ts`**:

- Replace `getTypeScriptSymbols()` + `getCustomParser()` dispatch with registry-based dispatch:
  ```typescript
  const service = registry.get(ext);
  if (service) {
    const structure = await service.extractStructure(filePath);
    fileNode.symbols = structure.symbols;
  }
  ```
- Or: keep separate paths for codebase_map performance (it only needs `FileSymbol[]`, not full `FileStructure`) but ensure both use the same parser underneath

**`parsers.ts`**:

- `getCustomParser()` still dispatches to the Markdown parser module
- The Markdown parser returns `FileSymbol[]` instead of `SymbolNode[]`
- JSON parser updated to return `FileSymbol[]` as well

### 4. Symbol Resolver Changes

**`symbol-resolver.ts`**:

- `SymbolLike` interface replaced by `FileSymbol` (or made to extend it)
- No changes to resolution logic — dot-path works identically for Markdown heading names
- Unnamed blocks (code, table, list) are NOT resolved by name — users access them via `startLine`/`endLine`

### 5. Highlight Range

**`client-handlers.ts` / `handleFileHighlightReadRange`**:

- No changes needed — already takes line ranges (0-indexed)
- Section highlight: when targeting a heading, highlight the entire section range (heading through content)

---

## File Organization

```
extension/services/codebase/
  language-service-registry.ts     ← NEW: LanguageService interface + registry class
  language-services/               ← NEW folder
    typescript-language-service.ts  ← Wraps file-structure-extractor.ts
    markdown-language-service.ts    ← Wraps markdown/ module
    index.ts                       ← Re-exports all services
  markdown/                        ← NEW folder
    markdown-parser.ts             ← Core hierarchy builder (remark AST → FileSymbol[])
    markdown-structure.ts          ← extractMarkdownStructure() → FileStructure
    markdown-types.ts              ← Markdown-specific types, kind constants
    index.ts                       ← Public API re-exports
  parsers.ts                       ← Updated: getCustomParser() delegates to markdown/
  file-structure-extractor.ts      ← Updated: returns FileStructure (renamed types)
  types.ts                         ← Updated: FileSymbol, FileStructure added
```

### File Responsibilities

| File | Lines (est.) | Purpose |
|---|---|---|
| `markdown-parser.ts` | ~400 | Remark AST → heading hierarchy, containers, leaves. Stack-based nesting. Section range calculation. |
| `markdown-structure.ts` | ~200 | Full `FileStructure` extraction: symbols + orphaned content + gaps + stats. Orchestrates parser + orphaned detection. |
| `markdown-types.ts` | ~60 | Kind constants, callout pattern matchers. |
| `index.ts` | ~15 | Re-exports `extractMarkdownStructure` and parser helpers. |
| `language-service-registry.ts` | ~80 | `LanguageService` interface, `LanguageServiceRegistry` class with register/get/supports. |
| `language-services/typescript-language-service.ts` | ~30 | Wraps `extractFileStructure()` in a `LanguageService` implementation. |
| `language-services/markdown-language-service.ts` | ~30 | Wraps `extractMarkdownStructure()` in a `LanguageService` implementation. |
| `language-services/index.ts` | ~10 | Re-exports all language services. |

---

## GitHub Callout Support

GitHub-flavored callouts (`> [!NOTE]`, `> [!WARNING]`, etc.) are parsed by the `remark-github-blockquote-alert` plugin, which transforms blockquotes with the alert syntax into proper AST nodes:

```markdown
> [!NOTE]
> This is a note callout.
> It can span multiple lines.
```

Represented as:

```typescript
{
  name: 'NOTE',
  kind: 'directive',
  detail: 'note',
  range: { startLine: 1, endLine: 3 },
  children: []   // Content is implicit (like paragraphs in sections)
}
```

Standard blockquotes (without callout syntax) remain kind `blockquote`.

### Generic Directive Support

The `remark-directive` plugin provides support for the `:::` fence syntax used by Docusaurus, Starlight, VitePress, and other documentation frameworks:

```markdown
:::tip Pro Tip
Always measure before optimizing!
:::
```

Represented as:

```typescript
{
  name: 'Pro Tip',
  kind: 'directive',
  detail: 'tip',
  range: { startLine: 1, endLine: 3 },
  children: []
}
```

Both callout styles produce the same `directive` kind, making them interchangeable in the hierarchy.

---

## Rendering Behavior

### Skeleton Mode (`skeleton: true`)

```
[1-4] frontmatter frontmatter
[6-15] section # Introduction
  [8-11] code example.js
  [13-15] section ## Quick Start
    [14-15] code bash
[17-30] section # API Reference
  [18-22] section ## Methods
    [19-21] table
  [24-30] section ## Examples
    [25-28] code typescript
    [29-30] list
```

This matches TS/JS skeleton output format: `[range] kind name`

### Skeleton Mode (`skeleton: true, recursive: false`)

```
[1-4] frontmatter frontmatter
[6-15] section # Introduction
[17-30] section # API Reference
```

Only top-level symbols shown (H1 sections + frontmatter).

### Target Mode (`target: "API Reference.Methods"`)

Shows content with child placeholders (same as TS/JS):

```
[18] ## Methods
[19-21] table
[22]
```

### Target Mode (`target: "API Reference.Methods", recursive: true`)

Shows full content including children:

```
[18] ## Methods
[19] | Method | Returns |
[20] | --- | --- |
[21] | `getData()` | `Promise<Data>` |
[22]
```

### Structured Line-Range Mode (`startLine: 17, endLine: 30`)

```
[17] # API Reference
  [18-22] section ## Methods
  [24-30] section ## Examples
```

Symbols collapse to stubs (same behavior as TS/JS).

---

## Implementation Plan

### Phase 1: Shared Types, Interface Layer & Language Service Registry

**Goal**: Define `FileSymbol` and `FileStructure`, create the `LanguageServiceRegistry`, and update TS/JS extractor to use them.

1. Add `FileSymbol`, `FileSymbolRange`, `FileStructure`, `OrphanedItem` to `types.ts`
2. Add `LanguageService` interface to `types.ts`
3. Create `language-service-registry.ts` with `LanguageServiceRegistry` class
4. Create `language-services/typescript-language-service.ts` wrapping existing `extractFileStructure()`
5. Create `language-services/index.ts` re-exporting all services
6. Update `extractFileStructure()` to return `FileStructure` (adapter over existing `UnifiedFileResult`)
7. Initialize registry and register `TypeScriptLanguageService` in `registerClientHandlers()`
8. Update `handleFileExtractStructure` to dispatch via registry instead of calling `extractFileStructure()` directly
9. Update `chunker.ts`: remove `parseFileSymbols()`, accept `FileSymbol[]` input directly, update from `SymbolNode` to `FileSymbol`
10. Update `client-pipe.ts` RPC types
11. Update `file-read.ts` rendering code to use `FileSymbol` interface
12. Update `symbol-resolver.ts` to use `FileSymbol`
13. Verify all TS/JS functionality unchanged (regression test)

**Risk**: This is a refactor across the full pipeline. Must not break existing functionality.

### Phase 2: Core Markdown Parser

**Goal**: Build the hierarchy parser that transforms remark AST into `FileSymbol[]`.

1. Install new remark plugins: `remark-math`, `remark-directive`, `remark-github-blockquote-alert`
2. Create `markdown/markdown-types.ts` — kind constants, helper types
3. Create `markdown/markdown-parser.ts` — stack-based hierarchy builder
4. Configure unified processor with full plugin chain
5. Implement: headings → sections with correct range calculation
6. Implement: code blocks, tables, lists → child symbols
7. Implement: blockquotes, horizontal rules, HTML blocks, math blocks
8. Implement: directives (`:::tip`) and GitHub callouts (`> [!NOTE]`)
9. Implement: frontmatter with key extraction
10. Create `markdown/index.ts` — public exports
11. Create `language-services/markdown-language-service.ts` wrapping the markdown parser
12. Register `MarkdownLanguageService` in the registry initialization
13. Update `parsers.ts` — delegate to new module
14. Test: `codebase_map` with `symbols: true` shows rich MD hierarchy

### Phase 3: Full Structure Extraction

**Goal**: Build `extractMarkdownStructure()` returning `FileStructure`.

1. Create `markdown/markdown-structure.ts` — orchestrator
2. Implement: orphaned content detection (root content, footnotes, link defs)
3. Implement: gap computation (blank lines between symbols)
4. Implement: stats calculation
5. `MarkdownLanguageService.extractStructure()` already dispatches through the registry (set up in Phase 2)
6. Remove `STRUCTURED_EXTS` gate in `file-read.ts` — the MCP server no longer decides which extensions are structured; the registry on the extension side handles that
7. Test: `exp_file_read` skeleton, target, line-range all work for `.md` files

### Phase 4: Edit & Safety Layer

**Goal**: `exp_file_edit` works for Markdown with safety diff.

1. Update `file-edit.ts` to support Markdown files
2. Update `safety-layer.ts` to use `FileStructure` symbols instead of VS Code native
3. Implement: section rename detection (heading text changed)
4. Test: edit a heading, section content via target; edit code block via `startLine`/`endLine`

---

## Testing Strategy

### Unit Tests (Vitest)

Test the parser in isolation with fixture Markdown files:

| Test Category | Coverage |
|---|---|
| Section ranges | H1 → H1, H1 > H2 > H3, empty sections |
| Frontmatter | YAML, TOML, empty, malformed |
| Code blocks | Fenced, with lang, with meta, indented |
| Tables | Simple, with alignment, nested in section |
| Lists | Ordered, unordered, nested, with code inside items |
| Blockquotes | Simple, nested, with callout syntax |
| Containers | List > Item > Code, Quote > Code, Quote > Heading |
| Orphaned content | Root text, footnotes, link defs |
| Named targeting | Dot-path headings, frontmatter, nested sections |
| Line-range access | Code blocks, tables via startLine/endLine |

### Integration Tests

| Test | Verification |
|---|---|
| `exp_file_read skeleton` on `.md` file | Correct hierarchy, ranges, indentation |
| `exp_file_read target` on heading | Correct section content with child placeholders |
| `exp_file_read target` on `"frontmatter"` | Returns frontmatter block |
| `exp_file_read startLine/endLine` on code block | Returns exact code block content |
| `exp_file_edit target` on heading | Edit applied to correct section range |
| `codebase_map symbols:true` | MD files show rich symbol tree |

### Regression Tests

All existing TS/JS tests must continue to pass after the `FileSymbol`/`FileStructure` migration.

### Registry Tests

| Test | Verification |
|---|---|
| Register + get by extension | `registry.get('ts')` returns TypeScriptLanguageService |
| Register + get by MD extension | `registry.get('md')` returns MarkdownLanguageService |
| Duplicate registration throws | `registry.register(duplicate)` throws Error |
| Unsupported extension | `registry.get('py')` returns `undefined` |
| `supports()` correctness | `registry.supports('tsx')` returns `true`, `registry.supports('py')` returns `false` |

---

## Open Questions

1. **Column precision for Markdown**: Should `startChar`/`endChar` be computed for Markdown symbols? Headings always start at column 0, but list items may be indented. For now, these fields are optional in `FileSymbolRange` — we can add them later if editor features need them.

2. **TOML frontmatter**: remark-frontmatter supports TOML (`+++...+++`). Should the key extractor handle TOML as well as YAML? Recommendation: low priority, defer.

3. **Link reference definitions in sections**: A `[id]: url` inside a section is technically scoped content, not orphaned. Should it be a child of the section or always root-level orphaned? Recommendation: if inside a section, it's a child; if at root, it's orphaned.

4. **Performance**: remark parsing + hierarchy building should be fast (< 50ms for typical docs). Profile during Phase 2 to ensure no bottlenecks.

5. **Unnamed block detail**: Skeleton shows `[8-11] code bash` — the `detail` field could include additional metadata (first line of table, list type). How much detail is useful without being noisy?

---

## References

- **User Blueprint**: `documentation/unorganized/mdHierarchy.md` — original hierarchy specification
- **TS/JS Extractor**: `extension/services/codebase/file-structure-extractor.ts` — existing ts-morph implementation
- **Current MD Parser**: `extension/services/codebase/parsers.ts` (lines 225–400) — remark-based, basic hierarchy
- **Symbol Resolver**: `mcp-server/src/tools/file/symbol-resolver.ts` — dot-path resolution
- **Orphaned Content**: `extension/services/codebase/orphaned-content.ts` — TS/JS orphaned content model
- **File Read Tool**: `mcp-server/src/tools/file/file-read.ts` — rendering pipeline
- **File Edit Tool**: `mcp-server/src/tools/file/file-edit.ts` — edit + safety layer
- **Safety Layer**: `mcp-server/src/tools/file/safety-layer.ts` — symbol diff, rename propagation
- **Chunker**: `extension/services/codebase/chunker.ts` — recursive depth optimization, token budgeting, oversized splitting
- **Chunk Types**: `extension/services/codebase/types.ts` (lines 278–345) — `Chunk`, `ChunkFileParams`, `ChunkFileResult`
