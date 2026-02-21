# Codebase Intelligence — Architecture Blueprint

> **Status:** Draft v8  
> **Created:** 2026-02-14  
> **Revised:** 2026-02-25 — Extracted file tools to FILE-TOOLS.md, focused on 4 analysis tools  
> **Replaces:** `#codebase`, `#file`, `grep_search`, `file_search`, `list_dir`, `list_code_usages`, `get_errors`
> **See Also:** [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md), [GIT-TOOLS.md](./../blueprints/GIT-TOOLS.md)

---

## 1. Vision

**Compiler-accurate codebase intelligence** that gives Copilot deep understanding of TypeScript/JavaScript project structure, symbols, and quality. Every structural query maps to exactly one tool — no overlap, no confusion, no wasted context.

### Design Principle: Minimum Context, Maximum Precision

Copilot should find what it needs in **one well-targeted tool call** instead of making multiple exploratory calls or parsing raw text. The TypeScript compiler already knows everything about a project — these tools expose that knowledge directly.

### 4 Tools, 1 Category, Zero Overlap

| Tool | Verb | Question Type |
|------|------|---------------|
| `codebase_map` | **Read** | "What EXISTS here?" |
| `codebase_trace` | **Follow** | "How does X CONNECT?" |
| `codebase_search` | **Find** | "WHERE is [concept]?" |
| `codebase_lint` | **Check** | "What PROBLEMS exist?" |

Every question about codebase **structure and analysis** falls into exactly one of these categories.

**For file content and operations**, see [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md).  
**For version control**, see [GIT-TOOLS.md](./../blueprints/GIT-TOOLS.md).

### What This Replaces

| VS Code Native Tool | Replaced By | Why Ours Is Better |
|---------------------|-------------|-------------------|
| `#codebase` | `codebase_map` | Compiler-accurate symbols, not token search |
| `#file` | `codebase_map` (depth: 2+) | Full signatures, JSDoc, re-exports — not raw text |
| Built-in semantic search | `codebase_search` | Local embeddings + multi-signal re-ranking |
| `grep_search` | `codebase_search` (mode: 'literal') | Structured results with context, same exact matching |
| `file_search` | `codebase_map` (filter: glob) | Glob-based file discovery with symbol metadata |
| `list_dir` | `codebase_map` (depth: 0) | File listing with optional symbol depth |
| `list_code_usages` | `codebase_trace` (include: ['references']) | Full symbol tracing, not just usages |
| `get_errors` | `codebase_lint` (checks: ['errors']) | Unified quality tool with diagnostics + analysis |

**Note:** File content and file system operations are handled by [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md).

### What This Is NOT

- NOT standalone — requires the VS Code extension (client pipe bridge)
- NOT CDP-dependent — uses the extension bridge, not Chrome DevTools Protocol
- NOT just a wrapper — deep compiler-powered analysis that native tools can't do
- NOT line-based — all content access is via semantic targeting, not line numbers

### Consolidation History

**Internal consolidation** — 8 original codebase tools → 4 tools with zero capability loss:

| Original Tool | → Absorbed Into | Via |
|---------------|-----------------|-----|
| `codebase_overview` | `codebase_map` | Renamed |
| `codebase_exports` | `codebase_map` | `depth: 2+` for full signatures/JSDoc |
| `codebase_dependencies` | `codebase_map` | `includeGraph: true` for module graph |
| `codebase_trace_symbol` | `codebase_trace` | Renamed |
| `codebase_type_hierarchy` | `codebase_trace` | `include: ['hierarchy']` |
| `codebase_impact` | `codebase_trace` | `include: ['impact']` |
| `codebase_dead_code` | `codebase_lint` | `checks: ['dead-code']` |
| `codebase_duplicates` | `codebase_lint` | `checks: ['duplicates']` |

**Native tool replacement** — VS Code/Copilot tools → absorbed into codebase tools:

| Native Tool | → Absorbed Into | Via |
|-------------|-----------------|-----|
| `grep_search` | `codebase_search` | `mode: 'literal'` with regex support |
| `get_errors` | `codebase_lint` | `checks: ['errors', 'warnings']` |
| `list_code_usages` | `codebase_trace` | `include: ['references']` |
| `file_search` | `codebase_map` | `filter` glob parameter |
| `list_dir` | `codebase_map` | `depth: 0` for file tree |
| `#file` | `codebase_map` | `depth: 2+` for module API |

**Note:** File content and file system operations are in [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md).

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VS Code (Host)                              │
│                                                                       │
│  Copilot ──→ Native LM Tools (REPLACED by codebase tools)           │
│              · #codebase     ──→  codebase_map / codebase_search     │
│              · #file         ──→  codebase_map (depth: 2+)           │
│              · semantic      ──→  codebase_search (embeddings)       │
│              · (file ops)    ──→  See FILE-TOOLS.md                  │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                VS Code Extension (Client Role)                       │
│                                                                       │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐    │
│  │ LM Tool Registration │    │ Client RPC Handlers (bridge)     │    │
│  │ vscode.lm.registerTool    │ JSON-RPC via named pipe          │    │
│  │ · codebase_map       │    │                                  │    │
│  │ · codebase_trace     │    │ codebase.getSymbols              │    │
│  │ · codebase_search    │    │ codebase.getReferences           │    │
│  │ · codebase_lint      │    │ codebase.getDefinitions          │    │
│  │                      │    │ codebase.getCallHierarchy        │    │
│  │ (file tools in       │    │ codebase.getTypeHierarchy        │    │
│  │  FILE-TOOLS.md)      │    │ codebase.getDiagnostics          │    │
│  └─────────────────────┘    └──────────────────────────────────┘    │
│            │                                                         │
│            ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │ Codebase Service     │                                             │
│  │ (shared engine)      │                                             │
│  │ · VS Code API calls  │                                             │
│  │ · ts-morph analysis  │                                             │
│  │ · Symbol extraction  │                                             │
│  │ · AST editing        │                                             │
│  │ · Dependency graph   │                                             │
│  └──────────┬──────────┘                                             │
│             │                                                        │
│             ▼                                                        │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐    │
│  │ VS Code Lang Svcs   │    │ VS Code Refactoring Engine        │    │
│  │ · Document Symbols   │    │ · executeRenameProvider           │    │
│  │ · References         │    │ · executeCodeActionProvider       │    │
│  │ · Definitions        │    │ · workspace.applyEdit             │    │
│  │ · Type Definitions   │    │ · workspace.fs                    │    │
│  │ · Diagnostics        │    │ · (auto import updates)           │    │
│  │ · Call Hierarchy     │    │                                   │    │
│  │ · Type Hierarchy     │    │                                   │    │
│  └─────────────────────┘    └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                │
                     Named Pipe │ (JSON-RPC 2.0)
                     (existing) │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     MCP Server (Front-End)                            │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Existing MCP Tools│  │ Codebase Intelligence (4 TOOLS)          │  │
│  │ · take_snapshot   │  │                                          │  │
│  │ · console_read    │  │ · codebase_map                           │  │
│  │ · terminal_run    │  │ · codebase_trace                         │  │
│  │ · mouse_click     │  │ · codebase_search                        │  │
│  │ · ...             │  │ · codebase_lint                          │  │
│  └──────────────────┘  │                                          │  │
│                         │ (See FILE-TOOLS.md for file operations) │  │
│                         │ (See GIT-TOOLS.md for version control)  │  │
│                         └────────────┬─────────────────────────────┘  │
│                         ┌────────────▼─────────────────────────────┐  │
│                         │   Indexing & Embedding Layer              │  │
│                         │   · Embedding Service (ONNX/Node.js)     │  │
│                         │   · Search Engine (vector + re-rank)     │  │
│                         │   · Index Store (.devtools/codebase-idx/) │  │
│                         └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **MCP tool called** → MCP server sends `codebase.*` or `file.*` RPC to extension via named pipe
2. **Extension receives RPC** → Codebase Service calls VS Code APIs + ts-morph
3. **For refactors** → Extension uses `executeRenameProvider`, `executeCodeActionProvider`, `workspace.applyEdit`
4. **Extension returns results** → MCP server enriches with embeddings/search/index
5. **Results returned to Copilot** via MCP response

For **LM tools** (direct Copilot access without MCP):
1. **Copilot calls LM tool** → Extension's CodebaseService handles directly
2. **Same engine, no bridge hop** → Lower latency for simple queries

---

## 3. Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tool count** | 4 codebase intelligence tools | Focused on code analysis; file ops in FILE-TOOLS.md |
| **Read-only** | All codebase tools are read-only | Analysis tools don't modify code |
| Extension required | Yes — via client pipe bridge | Access to VS Code language services |
| CDP required | No | Language/code tools, not browser/DOM tools |
| Dual registration | LM Tools + MCP Tools | LM tools for direct Copilot; MCP tools for external clients |
| VS Code APIs used | `executeDocumentSymbolProvider`, `executeReferenceProvider`, `executeDefinitionProvider`, `executeTypeDefinitionProvider`, `executeCallHierarchyProvider`, `executeTypeHierarchyProvider`, `languages.getDiagnostics` | VS Code's most powerful semantic code APIs |
| ts-morph supplement | Yes — for analysis beyond VS Code APIs | Import graph, call chains, re-exports, dead code, similarity |
| Embeddings location | MCP server (CPU-bound) | Shouldn't block extension host |
| Index location | `.devtools/codebase-index/` in target workspace | Respects `.devtoolsignore`; JSON files on disk |

---

## 4. File Structure

### Extension Side (VS Code)

```
extension/
├── services/
│   ├── codebaseService.ts           # Core analysis engine (shared by LM tools & bridge)
│   ├── codebaseEditService.ts       # AST editing and refactoring engine
│   ├── fileOperationsService.ts     # File create/delete/move/rename/duplicate
│   ├── codebaseLmTools.ts           # LM Tool registrations for Copilot
│   └── ...existing services...
├── client-handlers.ts               # ADD new codebase.* and file.* RPC handlers
└── runtime.ts                       # ADD LM tool registrations
```

### MCP Server Side

```
mcp-server/src/
├── tools/
│   ├── codebase/                     # All 4 codebase MCP tools
│   │   ├── index.ts                  # Re-exports all tools
│   │   ├── codebase-map.ts           # Tool: codebase_map
│   │   ├── codebase-trace.ts         # Tool: codebase_trace
│   │   ├── codebase-search.ts        # Tool: codebase_search
│   │   └── codebase-lint.ts          # Tool: codebase_lint
│   ├── file/                         # See FILE-TOOLS.md for file tools
│   ├── categories.ts                 # ADD CODEBASE_ANALYSIS category
│   └── tools.ts                      # ADD codebase imports
│
├── codebase-engine/                  # Indexing & embedding (MCP-side)
│   ├── index.ts                      # Public API
│   ├── embedding-service.ts          # Local ONNX embeddings (@huggingface/transformers)
│   ├── search-engine.ts              # Vector search + re-ranking
│   ├── index-store.ts                # Persistent JSON index
│   ├── ignore-filter.ts              # .devtoolsignore (shared utility)
│   └── types.ts                      # Shared type definitions
│
├── client-pipe.ts                    # ADD new codebase.* RPC methods
└── ...existing files...
```

---

## 5. Extension Bridge: RPC Methods

Methods added to `client-pipe.ts` (MCP side) and `client-handlers.ts` (extension side):

### 5.1 VS Code API Wrapper Methods

These wrap VS Code's built-in language provider APIs:

| RPC Method | VS Code API | Returns |
|------------|------------|---------|
| `codebase.getDocumentSymbols` | `vscode.executeDocumentSymbolProvider(uri)` | Hierarchical symbol tree for a file |
| `codebase.getWorkspaceSymbols` | `vscode.executeWorkspaceSymbolProvider(query)` | Symbols matching a query across workspace |
| `codebase.getReferences` | `vscode.executeReferenceProvider(uri, position)` | All references to a symbol |
| `codebase.getDefinitions` | `vscode.executeDefinitionProvider(uri, position)` | Definition location(s) of a symbol |
| `codebase.getTypeDefinition` | `vscode.executeTypeDefinitionProvider(uri, position)` | Type definition of a symbol |
| `codebase.getCallHierarchy` | `vscode.prepareCallHierarchy(uri, pos)` → `incoming/outgoing` | Call chain for a function |
| `codebase.getTypeHierarchy` | `vscode.prepareTypeHierarchy(uri, pos)` → `supertypes/subtypes` | Type inheritance tree |
| `codebase.getDiagnostics` | `vscode.languages.getDiagnostics()` | All errors/warnings in workspace |
| `codebase.findFiles` | `vscode.workspace.findFiles(pattern, exclude)` | Glob-based file discovery |

### 5.2 ts-morph Deep Analysis Methods

These use ts-morph in the extension for analysis beyond VS Code APIs:

| RPC Method | Analysis | Returns |
|------------|----------|---------|
| `codebase.analyzeProject` | Full project analysis via ts-morph | Complete symbol table, dependency graph, exports map |
| `codebase.traceSymbol` | Symbol tracing through definitions, references, re-exports, type flows | Full symbol lifecycle |
| `codebase.getImportGraph` | Import/export dependency analysis | Module graph with circular detection |
| `codebase.getExports` | Detailed export analysis for a module | Exports with types, signatures, JSDoc |
| `codebase.findDeadCode` | Identify unused exports and unreachable functions | Dead code report |
| `codebase.findDuplicates` | AST-structural similarity detection | Similarity groups with suggestions |

### 5.3 Semantic Content Methods

These provide semantic reading and editing capabilities:

| RPC Method | Operation | Returns |
|------------|-----------|---------|
| `codebase.readSymbol` | Read symbol content by name | Symbol content with range, metadata |
| `codebase.readByPath` | Read JSON/YAML by JSONPath | Content at path with context |
| `codebase.readBySelector` | Read HTML/CSS by selector | Matched elements/rules |
| `codebase.readByXPath` | Read XML by XPath | Matched nodes |
| `codebase.readByHeading` | Read Markdown by heading | Section under heading |
| `codebase.readRegion` | Read structural region (imports, exports, etc.) | Region content |
| `codebase.applyEdit` | Apply AST-precise edit | Edit result with changes |
| `codebase.executeRefactor` | Execute VS Code refactoring | Multi-file refactoring result |

### 5.4 File Operations Methods

These handle file-level operations with optional import updates:

| RPC Method | Operation | Returns |
|------------|-----------|---------|
| `file.create` | Create file with content/template | Create result |
| `file.delete` | Delete file(s) with import cleanup | Delete result |
| `file.move` | Move file with import updates | Move result with updated imports |
| `file.rename` | Rename file with import/symbol updates | Rename result with all changes |
| `file.duplicate` | Duplicate file with symbol renaming | Duplicate result |

### 5.5 API → Tool Mapping

| VS Code API | What It Provides | Used By |
|-------------|-----------------|---------|
| `vscode.executeDocumentSymbolProvider(uri)` | Hierarchical symbols in a file | `codebase_map` |
| `vscode.executeWorkspaceSymbolProvider(query)` | Fuzzy symbol search across workspace | `codebase_search` (fallback) |
| `vscode.executeReferenceProvider(uri, pos)` | All references to a symbol | `codebase_trace` |
| `vscode.executeDefinitionProvider(uri, pos)` | Symbol definition location | `codebase_trace` |
| `vscode.executeTypeDefinitionProvider(uri, pos)` | Type definition location | `codebase_trace` |
| `vscode.prepareCallHierarchy(uri, pos)` | Call hierarchy root | `codebase_trace` |
| `vscode.executeCallHierarchyIncomingCalls(item)` | Who calls this function | `codebase_trace` |
| `vscode.executeCallHierarchyOutgoingCalls(item)` | What this function calls | `codebase_trace` |
| `vscode.prepareTypeHierarchy(uri, pos)` | Type hierarchy root | `codebase_trace` |
| `languages.getDiagnostics()` | All workspace errors/warnings | `codebase_lint` |
| `workspace.findFiles(pattern, exclude)` | File discovery with globs | All tools |
| `workspace.openTextDocument(uri)` | Open a document for analysis | All tools |

**Note:** File operation APIs (`executeRenameProvider`, `executeCodeActionProvider`, `workspace.applyEdit`, `workspace.fs.*`) are documented in [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md).

### Why These APIs Over Raw TS Compiler?

- **They work with the running TS Language Server** — no re-parsing needed
- **They respect VS Code's workspace configuration** (tsconfig paths, project references)
- **They include results from all language providers** (not just TS — also JSON, markdown, etc.)
- **They handle incremental updates automatically** — the TS language server maintains state

---

## 6. Tool Specifications

### Tool Registration: Dual Mode

Each tool exists in **two places**:

1. **LM Tool** (in `extension/services/codebaseLmTools.ts`) — registered via `vscode.lm.registerTool()` for direct Copilot access
2. **MCP Tool** (in `mcp-server/src/tools/codebase/*.ts`) — registered via `defineTool()` for MCP client access

Both use the same underlying services in the extension. The MCP tools call through the client pipe bridge; the LM tools call the service directly.

### Tool Categories

```typescript
// categories.ts
export enum ToolCategory {
  // ...existing...
  CODEBASE_ANALYSIS = 'codebase_analysis',
  FILE_OPERATIONS = 'file_operations',
}
```

- **Codebase tools** (map, trace, search, lint): `{ readOnlyHint: true, category: CODEBASE_ANALYSIS }`

**Note:** File operation tool hints are documented in [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md).

All tools require extension connection (no `standalone` — not CDP-based).

---

### 6.1 Indexing Layer (Internal — Not a User-Facing Tool)

The index is built/refreshed **automatically and transparently** on the first `codebase_search` call. Explicit rebuild is available via the `devtools.reindexCodebase` VS Code command.

**Extension side:** Calls `codebase.analyzeProject` RPC → ts-morph full analysis.  
**MCP side:** Receives results, generates embeddings, persists to `.devtools/codebase-index/`.

```typescript
// Internal API (not exposed as a tool)
interface IndexService {
  build(rootDir: string): Promise<IndexStats>;
  rebuild(rootDir: string): Promise<IndexStats>;
  getStatus(rootDir: string): Promise<IndexStats | null>;
  ensureFresh(rootDir: string): Promise<void>; // Auto-called by codebase_search
}

interface IndexStats {
  indexed: true;
  rootDir: string;
  stats: {
    files: number;
    symbols: number;
    edges: number;
    embeddingsGenerated: number;
    indexSizeBytes: number;
    lastIndexedAt: string;
    indexDurationMs: number;
    staleFiles: number;
  };
}
```

---

### 6.2 `codebase_map`

**Purpose:** Bird's-eye view of the codebase structure at any granularity.

**Verb:** Read — "What EXISTS in this codebase/file/module?"

**Absorbs:** `codebase_overview`, `codebase_exports`, `codebase_dependencies`

**Question patterns Copilot uses this for:**
- "What files are in this project?"
- "What does this module export?"
- "Show me the module dependency graph"
- "What's the architecture of this codebase?"
- "Are there circular dependencies?"
- "What are the function signatures in this file?"

**Extension side:**
- `vscode.workspace.findFiles()` for file listing
- `vscode.executeDocumentSymbolProvider()` for each file's symbol tree
- ts-morph for import/export analysis, signatures, JSDoc
- ts-morph `getImportGraph` for module dependency graph when `includeGraph: true`
- Tarjan's algorithm for circular dependency detection when `detectCircular: true`

```typescript
// Schema
{
  path: z.string().optional()
    .describe("File, directory, or glob to map. Defaults to entire workspace."),
  rootDir: z.string().optional()
    .describe("Project root. Defaults to workspace root."),
  depth: z.number().int().min(0).max(3).default(1)
    .describe("Detail level: 0=files only, 1=top-level symbols, 2=symbols with signatures, 3=full detail (signatures + JSDoc + re-exports)"),
  filter: z.string().optional()
    .describe("Glob pattern to include only matching files"),
  includeImports: z.boolean().default(false)
    .describe("Include import specifiers per file"),
  includeGraph: z.boolean().default(false)
    .describe("Include module dependency graph"),
  detectCircular: z.boolean().default(false)
    .describe("Detect circular dependencies (requires includeGraph)"),
  findOrphans: z.boolean().default(false)
    .describe("Find modules with no importers"),
  includeStats: z.boolean().default(false)
    .describe("Include line counts and diagnostic counts"),
  kind: z.enum(['all', 'functions', 'classes', 'interfaces', 'types', 'constants', 'enums']).default('all')
    .describe("Filter exports by kind"),
  includeTypes: z.boolean().default(true)
    .describe("Include type signatures (depth >= 2)"),
  includeJSDoc: z.boolean().default(true)
    .describe("Include JSDoc descriptions (depth >= 3)"),
  format: z.enum(['tree', 'flat']).default('tree')
    .describe("Output structure format"),
}
```

#### Output Examples

**depth: 0 — File tree only**
```json
{
  "projectRoot": "/workspace",
  "structure": [
    { "path": "src/", "files": ["main.ts", "config.ts", "index.ts"] },
    { "path": "src/tools/", "files": ["ToolDefinition.ts", "categories.ts", "tools.ts"] }
  ],
  "summary": { "totalFiles": 42, "totalDirs": 8 }
}
```

**depth: 1 — Top-level symbols (default)**
```json
{
  "projectRoot": "/workspace",
  "structure": [
    {
      "path": "src/tools/",
      "files": [
        {
          "file": "ToolDefinition.ts",
          "exports": [
            { "name": "defineTool", "kind": "function" },
            { "name": "ToolDefinition", "kind": "interface" },
            { "name": "CHARACTER_LIMIT", "kind": "constant" }
          ],
          "imports": ["zod", "./categories.js"],
          "lines": 178
        }
      ]
    }
  ],
  "summary": { "totalFiles": 42, "totalExports": 289 }
}
```

**depth: 2 — Symbols with signatures**
```json
{
  "module": "src/tools/ToolDefinition.ts",
  "exports": [
    {
      "name": "defineTool",
      "kind": "function",
      "signature": "<Schema extends ZodRawShape>(definition: ToolDefinition<Schema>) => ToolDefinition<Schema>",
      "line": 98,
      "isDefault": false,
      "isReExport": false
    }
  ],
  "reExports": [{ "name": "ResponseFormat", "from": "./ResponseFormat.js" }],
  "summary": "9 exports (3 functions, 2 interfaces, 1 enum, 3 constants)"
}
```

**depth: 3 — Full detail (signatures + JSDoc)**
Same as depth 2, plus `jsdoc` field on every export.

**includeGraph: true — Module dependency graph**
```json
{
  "graph": {
    "modules": {
      "main.ts": { "imports": ["./config.js", "./tools/tools.js"], "importedBy": ["./index.ts"], "depth": 1 },
      "config.ts": { "imports": ["./logger.js"], "importedBy": ["./main.ts"], "depth": 2 }
    },
    "circular": [{ "chain": ["a.ts", "b.ts", "a.ts"], "severity": "warning" }],
    "orphans": ["utils/unused.ts"],
    "stats": { "totalModules": 34, "totalEdges": 89, "circularCount": 1 }
  }
}
```

---

### 6.3 `codebase_trace`

**Purpose:** Trace all relationships of a specific symbol through the entire codebase.

**Verb:** Follow — "How does symbol X CONNECT to everything?"

**Absorbs:** `codebase_trace_symbol`, `codebase_type_hierarchy`, `codebase_impact`

**Question patterns Copilot uses this for:**
- "Who calls this function?"
- "What does this function call?"
- "Where is this symbol defined?"
- "If I change this, what breaks?"
- "What implements this interface?"
- "Show me the type hierarchy for this class"
- "How does data flow through this parameter?"

**Extension side:**
- `vscode.executeDefinitionProvider()` for definition
- `vscode.executeReferenceProvider()` for all references
- `vscode.prepareCallHierarchy()` + `incoming/outgoing` for call chains
- `vscode.prepareTypeHierarchy()` + `supertypes/subtypes` for type hierarchy
- ts-morph for re-export chains and type flow analysis
- When `include` contains `'impact'`: transitive dependency walk + risk assessment

```typescript
// Schema
{
  symbol: z.string()
    .describe("Name of the symbol to trace"),
  file: z.string().optional()
    .describe("File where the symbol is defined (helps disambiguation)"),
  line: z.number().optional()
    .describe("Line number of the symbol (1-based)"),
  column: z.number().optional()
    .describe("Column number of the symbol (0-based)"),
  rootDir: z.string().optional()
    .describe("Project root. Defaults to workspace root."),
  depth: z.number().int().min(1).max(10).default(3)
    .describe("Call hierarchy traversal depth"),
  include: z.enum([
    'all',
    'definitions',   // Where is this symbol defined?
    'references',    // Where is this symbol used?
    'reexports',     // Re-export chains
    'calls',         // Incoming/outgoing call hierarchy
    'types',         // Type flows (parameter types, return types, inheritance)
    'hierarchy',     // Type hierarchy (supertypes/subtypes)
    'impact',        // Blast radius / breaking change analysis
  ]).array().default(['all'])
    .describe("Which analyses to include"),
  maxReferences: z.number().int().min(10).max(5000).default(500)
    .describe("Maximum number of references to return"),
}
```

#### Output

```json
{
  "symbol": "defineTool",
  "definition": {
    "file": "src/tools/ToolDefinition.ts",
    "line": 98,
    "kind": "function",
    "signature": "<Schema extends ZodRawShape>(definition: ToolDefinition<Schema>) => ToolDefinition<Schema>"
  },
  "references": [
    { "file": "src/tools/console.ts", "line": 82, "context": "export const readConsole = defineTool({", "kind": "call" },
    { "file": "src/tools/terminal.ts", "line": 92, "context": "export const terminalRun = defineTool({", "kind": "call" }
  ],
  "reExports": [],
  "calls": {
    "incoming": [
      { "caller": "registerTool", "file": "src/main.ts", "line": 318 }
    ],
    "outgoing": []
  },
  "types": [
    {
      "direction": "parameter",
      "type": "ToolDefinition<Schema>",
      "traceTo": { "symbol": "ToolDefinition", "file": "src/tools/ToolDefinition.ts", "line": 39 }
    }
  ],
  "hierarchy": {
    "root": { "name": "ToolDefinition", "file": "ToolDefinition.ts", "line": 39, "kind": "interface" },
    "supertypes": [],
    "subtypes": []
  },
  "impact": {
    "directDependents": [
      { "symbol": "readConsole", "file": "src/tools/console.ts", "line": 82, "kind": "variable" },
      { "symbol": "registerAllTools", "file": "tools.ts", "line": 25, "kind": "function" }
    ],
    "transitiveDependents": [],
    "summary": {
      "directFiles": 3,
      "transitiveFiles": 12,
      "totalSymbolsAffected": 34,
      "riskLevel": "high"
    }
  },
  "summary": { "totalReferences": 11, "totalFiles": 8, "maxCallDepth": 2 }
}
```

> **Note:** Each `include` mode returns only its section. When `include: ['all']`, all sections are returned. When `include: ['calls', 'impact']`, only `calls` and `impact` are returned. This lets Copilot request exactly what it needs.

---

### 6.4 `codebase_search`

**Purpose:** Find code by semantic meaning OR exact text. Unified search replaces both semantic search and grep.

**Verb:** Find — "WHERE is something that does [X]?" or "WHERE is this exact text?"

**Absorbs:** `grep_search` (via `mode: 'literal'`), built-in semantic search

**Question patterns Copilot uses this for:**
- "Find the rate limiting logic" → semantic search
- "Where is user authentication handled?" → semantic search
- "Find functions that validate input" → semantic search
- "Find all occurrences of 'TODO: refactor'" → literal search
- "Where is 'API_KEY' hardcoded?" → literal search
- "Find error message 'TypeError: Cannot read'" → literal search

**MCP side:** Embedding generation + vector search + multi-signal re-ranking.  
**Extension side:** Provides symbol metadata for the index via `codebase.analyzeProject` RPC.

```typescript
// Schema
{
  query: z.string()
    .describe("What to search for — natural language (semantic) or exact text (literal)"),
  mode: z.enum(['semantic', 'literal', 'hybrid']).default('semantic')
    .describe("Search mode: semantic (embeddings), literal (exact text/regex like grep), hybrid (both merged)"),
  rootDir: z.string().optional()
    .describe("Project root. Defaults to workspace root."),
  limit: z.number().int().min(1).max(50).default(10)
    .describe("Maximum results to return"),
  scope: z.string().optional()
    .describe("Glob pattern to limit search scope"),
  kind: z.enum(['all', 'functions', 'classes', 'interfaces', 'types', 'constants', 'files']).default('all')
    .describe("Filter results by symbol kind"),
  minScore: z.number().min(0).max(1).default(0.3)
    .describe("Minimum similarity/relevance score threshold"),
  // Literal mode options
  isRegex: z.boolean().default(false)
    .describe("Treat query as regex pattern (literal/hybrid modes only)"),
  caseSensitive: z.boolean().default(false)
    .describe("Case-sensitive matching (literal/hybrid modes only)"),
}
```

#### Output

**Semantic mode (default):**
```json
{
  "query": "validate command syntax for shell type",
  "mode": "semantic",
  "results": [
    {
      "rank": 1,
      "score": 0.89,
      "symbol": "validateCommandSyntax",
      "kind": "function",
      "file": "src/tools/terminal.ts",
      "line": 95,
      "signature": "(command: string, shell: ShellType) => string | null",
      "context": "Validate that a command's syntax is compatible with the chosen shell."
    }
  ],
  "totalCandidates": 3847,
  "searchTimeMs": 45
}
```

**Literal mode (like grep_search):**
```json
{
  "query": "TODO: refactor",
  "mode": "literal",
  "results": [
    {
      "rank": 1,
      "file": "src/utils.ts",
      "line": 123,
      "column": 5,
      "match": "// TODO: refactor this to use async/await",
      "context": {
        "before": "function processData(data: unknown) {",
        "line": "  // TODO: refactor this to use async/await",
        "after": "  return new Promise((resolve) => {"
      }
    }
  ],
  "totalMatches": 7,
  "searchTimeMs": 12
}
```

**Hybrid mode (both merged):**
```json
{
  "query": "rate limiting",
  "mode": "hybrid",
  "results": [
    {
      "rank": 1,
      "score": 0.92,
      "source": "semantic",
      "symbol": "RateLimiter",
      "kind": "class",
      "file": "src/middleware/rateLimiter.ts",
      "line": 15
    },
    {
      "rank": 2,
      "score": 0.85,
      "source": "literal",
      "file": "src/config.ts",
      "line": 45,
      "match": "rateLimitRequests: 1000"
    }
  ],
  "totalCandidates": 3847,
  "searchTimeMs": 58
}
```

#### Search Strategies by Mode

**Semantic mode** (4 signals):
1. **Embedding similarity** (0.6 weight) — cosine similarity between query and symbol embedding
2. **Name matching** (0.2 weight) — fuzzy substring match, camelCase-aware
3. **Kind boost** (0.1 weight) — if symbol kind matches query intent
4. **Export boost** (0.1 weight) — exported symbols rank higher

**Literal mode** (grep replacement):
- Exact text or regex matching across all files
- Returns line context (before/match/after)
- Respects `isRegex` and `caseSensitive` options
- Respects `.devtoolsignore` exclusions

**Hybrid mode** (best of both):
- Runs both semantic and literal searches
- Merges results with de-duplication
- Re-ranks based on combined score: `0.5 * semantic_score + 0.5 * literal_relevance`
- Results tagged with `source: 'semantic' | 'literal'`

---

### 6.5 `codebase_lint`

**Purpose:** Unified quality and problems tool — live diagnostics + static analysis.

**Verb:** Check — "What PROBLEMS exist?"

**Absorbs:** `codebase_dead_code`, `codebase_duplicates`, `get_errors`

**Question patterns Copilot uses this for:**
- "Are there any errors in the workspace?" → `checks: ['errors']`
- "What TypeScript errors exist?" → `checks: ['errors']`
- "Is there any unused code?" → `checks: ['dead-code']`
- "Are there duplicated functions?" → `checks: ['duplicates']`
- "Are there circular dependencies?" → `checks: ['circular-deps']`
- "Show me all problems" → `checks: ['all']`

**Extension side:**
- Live diagnostics: `vscode.languages.getDiagnostics()` — fast, reads current VS Code state
- Static analysis: ts-morph for dead code, duplicates, circular deps — intensive, on-demand

```typescript
// Schema
{
  checks: z.enum([
    'all',
    // Live diagnostics (cheap — reads VS Code state)
    'errors',         // Compile/TypeScript errors
    'warnings',       // Warnings (deprecations, etc.)
    'hints',          // Hints and suggestions
    // Static analysis (expensive — full project scan)
    'dead-code',      // Unused exports, unreachable functions
    'duplicates',     // Duplicate/similar code
    'circular-deps',  // Circular import dependencies
  ]).array().default(['all'])
    .describe("Which quality checks to run"),
  rootDir: z.string().optional()
    .describe("Project root. Defaults to workspace root."),
  scope: z.string().optional()
    .describe("Glob pattern to limit scope"),
  excludeTests: z.boolean().default(true)
    .describe("Exclude test files from static analysis"),
  limit: z.number().int().min(1).max(100).default(50)
    .describe("Maximum results per check"),

  // Dead code options
  deadCodeKinds: z.enum(['all', 'exports', 'functions', 'variables', 'types']).array().default(['all'])
    .describe("Filter dead code by symbol kind"),

  // Duplicate detection options
  duplicateThreshold: z.number().min(0.5).max(1.0).default(0.75)
    .describe("Minimum similarity score for duplicate detection"),
  duplicateKinds: z.enum(['all', 'functions', 'classes', 'methods']).default('functions')
    .describe("Filter duplicates by symbol kind"),

  // Diagnostics options
  severityFilter: z.enum(['all', 'error', 'warning', 'info', 'hint']).array().default(['all'])
    .describe("Filter diagnostics by severity"),
}
```

#### Output

```json
{
  "diagnostics": [
    {
      "file": "src/config.ts",
      "line": 45,
      "column": 12,
      "severity": "error",
      "code": "TS2322",
      "message": "Type 'string' is not assignable to type 'number'.",
      "source": "typescript"
    },
    {
      "file": "src/utils.ts",
      "line": 23,
      "column": 5,
      "severity": "warning",
      "code": "@typescript-eslint/no-unused-vars",
      "message": "'tempValue' is defined but never used.",
      "source": "eslint"
    }
  ],
  "deadCode": [
    {
      "symbol": "oldHelper",
      "kind": "function",
      "file": "src/utils.ts",
      "line": 234,
      "reason": "exported but never imported by any module",
      "confidence": "high"
    },
    {
      "symbol": "TempConfig",
      "kind": "interface",
      "file": "src/config.ts",
      "line": 89,
      "reason": "unexported and unreferenced within the file",
      "confidence": "high"
    }
  ],
  "duplicates": [
    {
      "similarity": 0.92,
      "members": [
        { "symbol": "parseIgnoreRules", "file": "extension-watcher.ts", "line": 45, "hash": "abc123" },
        { "symbol": "parseIgnoreRules", "file": "mcp-server-watcher.ts", "line": 52, "hash": "abc456" }
      ],
      "suggestion": "Extract into shared utility in ignore-filter.ts"
    }
  ],
  "circularDeps": [
    {
      "chain": ["config.ts", "logger.ts", "utils.ts", "config.ts"],
      "severity": "warning",
      "suggestion": "Break cycle by extracting shared types to a common module"
    }
  ],
  "summary": {
    "totalErrors": 3,
    "totalWarnings": 12,
    "totalHints": 5,
    "totalDeadCode": 8,
    "totalDuplicateGroups": 5,
    "totalCircularDeps": 1,
    "bySeverity": { "error": 3, "warning": 12, "info": 0, "hint": 5 },
    "deadCodeByKind": { "exports": 3, "functions": 4, "variables": 1 }
  }
}
```

> **Note:** Only requested checks are included in output. `checks: ['errors']` returns only `diagnostics` and `summary`.

---

### File Tools (Moved to FILE-TOOLS.md)

The following tools have been moved to a separate blueprint for better organization:

| Tool | Purpose | Blueprint |
|------|---------|-----------|
| `file_read` | Semantic content reading | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |
| `file_edit` | Semantic editing + refactors | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |
| `file_create` | Create files with templates | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |
| `file_delete` | Delete with import cleanup | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |
| `file_move` | Move + update imports | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |
| `file_rename` | Rename + update symbols | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |
| `file_duplicate` | Duplicate with symbol mapping | [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) |

---

## 7. Extension: CodebaseService

The core engine that both LM tools and bridge RPC handlers share:

```typescript
// extension/services/codebaseService.ts

export class CodebaseService {
  private project: Project | null = null; // ts-morph Project (lazy-initialized)

  // --- VS Code API wrappers ---

  /** Get document symbols for a file */
  async getDocumentSymbols(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]>;

  /** Get all workspace symbols matching a query */
  async getWorkspaceSymbols(query: string): Promise<vscode.SymbolInformation[]>;

  /** Get all references to a symbol at a position */
  async getReferences(uri: vscode.Uri, position: vscode.Position): Promise<vscode.Location[]>;

  /** Get definition of a symbol */
  async getDefinitions(uri: vscode.Uri, position: vscode.Position): Promise<vscode.Location[]>;

  /** Get call hierarchy for a function */
  async getCallHierarchy(uri: vscode.Uri, position: vscode.Position, depth: number): Promise<CallHierarchyResult>;

  /** Get type hierarchy for a type */
  async getTypeHierarchy(uri: vscode.Uri, position: vscode.Position): Promise<TypeHierarchyResult>;

  // --- ts-morph deep analysis ---

  /** Full project analysis via ts-morph */
  async analyzeProject(rootDir: string): Promise<ProjectAnalysis>;

  /** Trace a symbol through the codebase */
  async traceSymbol(symbol: string, file?: string, depth?: number): Promise<SymbolTrace>;

  /** Get detailed exports from a module */
  async getExports(path: string): Promise<ExportAnalysis>;

  /** Get import dependency graph */
  async getImportGraph(rootDir: string): Promise<DependencyGraph>;

  /** Find dead/unused code */
  async findDeadCode(rootDir: string): Promise<DeadCodeReport>;

  /** Find duplicate/near-duplicate code */
  async findDuplicates(rootDir: string, threshold: number): Promise<SimilarityReport>;
}
```

The service uses **lazy initialization** for ts-morph — the `Project` instance is created on first deep analysis call and cached for subsequent calls. Stale detection uses the existing `.devtoolsignore`-aware mtime scanning.

---

## 8. Client Pipe: RPC Methods

### MCP Server Side (`client-pipe.ts`)

```typescript
/** Get document symbols for a file */
export async function codebaseGetDocumentSymbols(uri: string): Promise<DocumentSymbolResult>;

/** Get all references to a symbol at a position */
export async function codebaseGetReferences(uri: string, line: number, column: number): Promise<ReferenceResult>;

/** Get definition(s) of a symbol */
export async function codebaseGetDefinitions(uri: string, line: number, column: number): Promise<DefinitionResult>;

/** Get call hierarchy for a symbol */
export async function codebaseGetCallHierarchy(uri: string, line: number, column: number, depth: number): Promise<CallHierarchyResult>;

/** Get type hierarchy for a symbol */
export async function codebaseGetTypeHierarchy(uri: string, line: number, column: number, direction: string): Promise<TypeHierarchyResult>;

/** Get workspace diagnostics */
export async function codebaseGetDiagnostics(): Promise<DiagnosticsResult>;

/** Find files matching a glob pattern */
export async function codebaseFindFiles(pattern: string, exclude?: string): Promise<string[]>;

/** Full project analysis via ts-morph */
export async function codebaseAnalyzeProject(rootDir: string): Promise<ProjectAnalysis>;

/** Trace a symbol completely */
export async function codebaseTraceSymbol(symbol: string, file?: string, depth?: number): Promise<SymbolTrace>;

/** Get import dependency graph */
export async function codebaseGetImportGraph(rootDir: string): Promise<DependencyGraph>;

/** Get detailed exports from a module */
export async function codebaseGetExports(path: string): Promise<ExportAnalysis>;

/** Find dead/unused code */
export async function codebaseFindDeadCode(rootDir: string): Promise<DeadCodeReport>;

/** Find duplicate/near-duplicate code */
export async function codebaseFindDuplicates(rootDir: string, threshold: number): Promise<SimilarityReport>;
```

### Extension Side (`client-handlers.ts`)

```typescript
// Handler registrations:
register('codebase.getDocumentSymbols', handleCodebaseGetDocumentSymbols);
register('codebase.getReferences', handleCodebaseGetReferences);
register('codebase.getDefinitions', handleCodebaseGetDefinitions);
register('codebase.getCallHierarchy', handleCodebaseGetCallHierarchy);
register('codebase.getTypeHierarchy', handleCodebaseGetTypeHierarchy);
register('codebase.getDiagnostics', handleCodebaseGetDiagnostics);
register('codebase.findFiles', handleCodebaseFindFiles);
register('codebase.analyzeProject', handleCodebaseAnalyzeProject);
register('codebase.traceSymbol', handleCodebaseTraceSymbol);
register('codebase.getImportGraph', handleCodebaseGetImportGraph);
register('codebase.getExports', handleCodebaseGetExports);
register('codebase.findDeadCode', handleCodebaseFindDeadCode);
register('codebase.findDuplicates', handleCodebaseFindDuplicates);
```

---

## 9. LM Tool Registration

In `extension/runtime.ts`:

```typescript
// Semantic File System (11 tools — complete codebase intelligence + file operations)
const codebaseService = new CodebaseService(context);
const codebaseService = new CodebaseService(context);

// Codebase Intelligence (4 tools)
track(vscode.lm.registerTool('codebase_map', new CodebaseMapLmTool(codebaseService)));
track(vscode.lm.registerTool('codebase_trace', new CodebaseTraceLmTool(codebaseService)));
track(vscode.lm.registerTool('codebase_search', new CodebaseSearchLmTool(codebaseService)));
track(vscode.lm.registerTool('codebase_lint', new CodebaseLintLmTool(codebaseService)));

// File tools are registered in fileLmTools.ts — see FILE-TOOLS.md
```

In `extension/package.json` under `contributes.languageModelTools`:

```json
[
  {
    "name": "codebase_map",
    "displayName": "Codebase Map",
    "toolReferenceName": "codebase_map",
    "icon": "$(symbol-structure)",
    "canBeReferencedInPrompt": true,
    "userDescription": "Map the codebase structure: files, symbols, exports, imports, and module dependencies",
    "modelDescription": "Get a structural map of the codebase at any granularity. Use depth 0 for file tree (replaces list_dir), 1 for symbols, 2 for signatures, 3 for full detail with JSDoc (replaces #file). Use filter for glob-based file discovery (replaces file_search). Enable includeGraph for module dependency analysis. Use this when you need to understand what EXISTS — what files, symbols, exports, imports, or dependencies are in a project or module."
  },
  {
    "name": "codebase_trace",
    "displayName": "Codebase Trace",
    "toolReferenceName": "codebase_trace",
    "icon": "$(symbol-reference)",
    "canBeReferencedInPrompt": true,
    "userDescription": "Trace a symbol through definitions, references, call chains, type hierarchy, and impact analysis",
    "modelDescription": "Trace all relationships of a specific symbol through the codebase. Use include: ['references'] to find all usages (replaces list_code_usages). Use this when you need to understand how a symbol CONNECTS — who calls it, what it calls, where it's defined, what implements it, what its type hierarchy is, and what would break if you changed it. Choose include modes: definitions, references, calls, types, hierarchy, impact."
  },
  {
    "name": "codebase_search",
    "displayName": "Codebase Search",
    "toolReferenceName": "codebase_search",
    "icon": "$(search)",
    "canBeReferencedInPrompt": true,
    "userDescription": "Search code by meaning (semantic) or exact text (literal)",
    "modelDescription": "Unified search: semantic (embeddings) for conceptual queries like 'rate limiting logic', or literal (exact text/regex) for finding specific strings like 'TODO: refactor' or error messages (replaces grep_search). Use mode: 'semantic' for meaning-based search, 'literal' for exact matching, 'hybrid' for both merged. Returns ranked results with context."
  },
  {
    "name": "codebase_lint",
    "displayName": "Codebase Lint",
    "toolReferenceName": "codebase_lint",
    "icon": "$(warning)",
    "canBeReferencedInPrompt": true,
    "userDescription": "Check for errors, warnings, dead code, duplicates, and circular dependencies",
    "modelDescription": "Unified quality and problems tool. Use checks: ['errors', 'warnings'] for live diagnostics (replaces get_errors). Use checks: ['dead-code'] for unused exports/functions. Use checks: ['duplicates'] for similar code. Use checks: ['circular-deps'] for import cycles. Use checks: ['all'] for comprehensive analysis. Returns structured findings with locations and suggestions."
  },
  // File tool definitions (file_read, file_edit, file_create, file_delete, 
  // file_move, file_rename, file_duplicate) are specified in FILE-TOOLS.md
]
```

---

## 10. Embedding & Indexing Layer (MCP Server)

The MCP server handles compute-heavy operations that shouldn't run in the extension host:

### Embedding Service
- **Runtime:** `@huggingface/transformers` (100% Node.js, ONNX)
- **Model:** `Xenova/all-MiniLM-L6-v2` (22MB, 384-dimensional)
- **Cache:** `.devtools/models/` in target workspace

### Index Store
```
.devtools/codebase-index/
├── metadata.json      # Version, timestamp, file list
├── symbols.json       # All symbol info from extension analysis
├── references.json    # All reference relationships
├── graph.json         # Module dependency graph
├── embeddings.json    # Symbol ID → Float32Array (base64)
└── file-hashes.json   # File → hash (incremental updates)
```

### Ignore Filter
Shared utility replacing duplicated logic in `extension-watcher.ts` and `mcp-server-watcher.ts`:

```typescript
// mcp-server/src/codebase-engine/ignore-filter.ts
export function createIgnoreFilter(rootDir: string): IgnoreFilter;
```

---

## 11. Dependencies

### Extension (`extension/package.json`)
```json
{
  "dependencies": {
    "ts-morph": "^24.0.0"
  }
}
```

### MCP Server (`mcp-server/package.json`)
```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.0.0"
  }
}
```

---

## 12. Implementation Phases

### Phase 1: Foundation (MVP — 4 Codebase Intelligence Tools)

| # | Component | Location | Effort | Status |
|---|-----------|----------|--------|--------|
| 1 | `ignore-filter.ts` — shared utility | MCP server | Small | |
| 2 | `types.ts` — shared interfaces | MCP server | Small | |
| 3 | `CodebaseService` — core engine | Extension | Large | Partial (overview done) |
| 4 | Bridge RPC handlers | Extension (`client-handlers.ts`) | Medium | Partial (getOverview done) |
| 5 | Bridge RPC callers | MCP server (`client-pipe.ts`) | Medium | Partial (getOverview done) |
| 6 | **`codebase_map`** tool + LM Tool | Both | Medium | ✅ Partial (overview mode) |
| 7 | **`codebase_trace`** tool + LM Tool | Both | Large | |
| 8 | Indexing layer (internal, auto-triggered) | MCP server | Medium | |
| 9 | `embedding-service.ts` | MCP server | Medium | |
| 10 | `search-engine.ts` + re-ranking | MCP server | Medium | |
| 11 | **`codebase_search`** tool + LM Tool | Both | Medium | |
| 12 | `index-store.ts` — JSON persistence | MCP server | Medium | |
| 13 | Category + tools.ts + package.json | Both | Small | |
| 14 | **`codebase_lint`** tool + LM Tool | Both | Medium | |

### Phase 2 & 3: File Tools (see FILE-TOOLS.md)

File tool implementation phases (file_read, file_edit, file_create, file_delete, file_move, file_rename, file_duplicate) are specified in [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md).

---

## 13. Auto-Indexing Strategy

Indexing is fully internal — there is no user-facing index tool. The index is managed transparently.

- **First `codebase_search` call**: If no index exists, automatically build it with a progress status message
- **Subsequent calls**: Check staleness via mtime scanning; do incremental update if stale
- **Explicit rebuild**: Available via `devtools.reindexCodebase` VS Code command (not a tool)
- **Index version**: `metadata.json` includes a version stamp; auto-rebuild on version mismatch

---

## 14. Success Criteria

### Native Tool Replacements (Codebase Tools — 4 tools)

**Codebase Intelligence:**
- [x] `codebase_map` replaces `#codebase` — gives Copilot a complete project map in one call ✅ (partial)
- [ ] `codebase_map` replaces `#file` — gives Copilot a module's public API via `depth: 2+`
- [ ] `codebase_map` replaces `list_dir` — file listing via `depth: 0`
- [ ] `codebase_map` replaces `file_search` — glob-based file discovery via `filter` parameter
- [ ] `codebase_trace` replaces `list_code_usages` — via `include: ['references']`
- [ ] `codebase_search` replaces `grep_search` — via `mode: 'literal'` for exact text matching
- [ ] `codebase_lint` replaces `get_errors` — via `checks: ['errors', 'warnings']`

### File Tool Success Criteria

See [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) for success criteria for:
- `file_read` (replaces `read_file`)
- `file_edit` (replaces `replace_string_in_file`)
- `file_create` (replaces `create_file`)
- `file_delete`, `file_move`, `file_rename`, `file_duplicate` (new capabilities)

### Tool Capabilities

**Codebase Intelligence:**
- [ ] `codebase_map` provides module dependency graph via `includeGraph: true`
- [ ] `codebase_trace` follows a symbol through ≥3 levels of call chain in one call
- [ ] `codebase_trace` provides type hierarchy via `include: ['hierarchy']`
- [ ] `codebase_trace` provides blast radius/impact via `include: ['impact']`
- [ ] `codebase_search` returns semantically relevant results using local embeddings
- [ ] `codebase_search` supports hybrid mode (semantic + literal merged)
- [ ] `codebase_lint` detects dead code, duplicates, and circular dependencies
- [ ] `codebase_lint` surfaces live VS Code diagnostics (errors/warnings/hints)

**File Tools:**
See [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) for detailed file tool capability success criteria.

### Architecture
- [ ] All 4 codebase tools go through the extension bridge (no standalone, no CDP)
- [ ] LM Tools are registered and usable by Copilot directly (no MCP needed)
- [ ] MCP Tools work through the existing client pipe bridge
- [ ] `.devtoolsignore` is respected for all file operations
- [ ] Auto-indexing is transparent — first `codebase_search` call triggers it

### Quality
- [ ] All tools work on the DevTools codebase itself for dog-fooding
- [ ] **Zero tool overlap across all blueprints** — every question maps to exactly one tool
- [ ] **10 native tools replaced** by 16 semantic tools across 3 blueprints (CODEBASE, FILE, GIT)
- [ ] **Zero line-number dependencies** — all content access is semantic
- [ ] **Multi-file refactoring** — edits propagate automatically (see FILE-TOOLS.md)

---

## 15. Open Questions

1. **Should we disable VS Code's native `#codebase` and `#file` tools?** Or let them coexist? Recommend: coexist initially, replace via Copilot instructions that prefer our tools.

2. **ts-morph bundle size in extension:** ts-morph bundles the full TS compiler (~15MB). This increases the extension's `.vsix` size. Recommend: acceptable since the extension already uses ts-morph in `astGraphWebview.ts`.

3. **Should embeddings also be generated in the extension?** Currently planned for MCP side. But if we also want LM tools to do semantic search without MCP, the extension would need embedding capability too. Recommend: Phase 1 does semantic search only via MCP; add extension-side embeddings in Phase 2 if needed.

See [FILE-TOOLS.md](./../blueprints/FILE-TOOLS.md) for open questions related to file tools (confirmations, auto-save, refactor preview).
