# codebase_map Redesign Proposal v3

> A granular, flexible API with Markdown output for maximum readability and token efficiency.

---

## Design Goals

1. **Full Granularity** — Control folders, files, and symbols independently
2. **Unified Scoping** — Single `scope` object with include/exclude patterns
3. **Named Detail Levels** — No numeric depth confusion
4. **Markdown Output** — Natural tree structure via indentation, ~25% more compact than JSON
5. **Minimal Token Usage** — No quotes, brackets, or redundant keys
6. **Remove File Mode** — Separate tool handles single-file reading

---

## Output Format — Markdown Tree

```
folder/
  file.ext
    symbol(params): return
```

- **Folders**: End with `/`
- **Files**: Have an extension (`.ts`, `.js`, etc.)
- **Symbols**: Indented under files with TypeScript syntax

### Example: Folders + Files (No Symbols)
```
src/
  index.ts
  config.ts
  utils.ts
  services/
    CdpService.ts
    LifecycleService.ts
  tools/
    map.ts
    trace.ts
    lint.ts
test/
  map.test.ts
  trace.test.ts
```

### Example: Folders + Files + Symbols
```
src/
  index.ts
    main(args: string[]): Promise<void>
  services/
    CdpService.ts
      class CdpService
        constructor(config: Config)
        connect(url: string): Promise<void>
        send(method: string, params?: object): Promise<unknown>
        count: number
      const cdpService: CdpService
    LifecycleService.ts
      class LifecycleService
        start(): void
        stop(): void
```

### Example: Folders Only (No Files)
```
src/
test/
docs/
scripts/
```

### Example: Flat Files (No Nesting)
```
src/index.ts
src/config.ts
src/services/CdpService.ts
src/tools/map.ts
test/map.test.ts
```

### Example: With Stats
```
src/                        (42 files, 8500 lines)
  services/                 (8 files, 1800 lines)
  tools/                    (12 files, 2400 lines)
test/                       (25 files, 3200 lines)
```

---

## Symbol Syntax

Symbols use familiar TypeScript/JSDoc syntax:

| Symbol Type | Syntax |
|-------------|--------|
| Function | `functionName(params): returnType` |
| Class | `class ClassName` (members indented below) |
| Interface | `interface InterfaceName` (members indented below) |
| Type | `type TypeName = definition` |
| Constant | `const CONST_NAME: type` or `const CONST_NAME = value` |
| Enum | `enum EnumName { Value1, Value2 }` |
| Method | `methodName(params): returnType` (indented under class) |
| Property | `propertyName: type` (indented under class) |

### Full Example with All Symbol Types
```
src/
  types.ts
    interface Config
      apiKey: string
      timeout: number
      retries?: number
    type Result = Success | Failure
    enum Status { Pending, Active, Done }
    const DEFAULT_TIMEOUT: number = 5000
  services/
    CdpService.ts
      class CdpService
        private ws: WebSocket
        constructor(config: Config)
        connect(url: string): Promise<void>
        send<T>(method: string, params?: object): Promise<T>
        disconnect(): void
      const cdpService: CdpService
      function createService(config: Config): CdpService
```

---

## New Schema

```typescript
schema: {
  // ═══════════════════════════════════════════════════════════
  // SCOPING — What parts of the codebase to analyze
  // ═══════════════════════════════════════════════════════════
  scope: zod.object({
    include: zod.union([zod.string(), zod.array(zod.string())])
      .describe('Glob pattern(s) to include. Examples: "src", "**/*.ts", ["src", "lib"]'),
    exclude: zod.array(zod.string()).optional()
      .describe('Glob patterns to exclude. Examples: ["**/*.test.ts", "node_modules"]'),
  }).optional().default({ include: '**' })
    .describe('Scope of the map. Defaults to entire workspace.'),

  // ═══════════════════════════════════════════════════════════
  // VISIBILITY — What entities to show in the output
  // ═══════════════════════════════════════════════════════════
  show: zod.object({
    folders: zod.boolean().optional().default(true)
      .describe('Include folder structure. If false, returns flat file paths.'),
    files: zod.boolean().optional().default(true)
      .describe('Include files in output'),
    symbols: zod.array(
      zod.enum(['functions', 'classes', 'interfaces', 'types', 'constants', 'enums', 'methods', 'properties', '*'])
    ).optional()
      .describe('Which symbol kinds to include. Omit for no symbols. Use ["*"] for all.'),
  }).optional().default({ folders: true, files: true })
    .describe('Control what entity types appear'),

  // ═══════════════════════════════════════════════════════════
  // DETAIL — How much information per symbol
  // ═══════════════════════════════════════════════════════════
  detail: zod.enum(['minimal', 'names', 'signatures', 'full']).optional().default('names')
    .describe(`Detail level:
      • minimal    — structure only (just folder/file names)
      • names      — symbol names with type keywords (function, class, interface)
      • signatures — full TypeScript signatures with params and return types
      • full       — signatures + JSDoc documentation comments`),

  // ═══════════════════════════════════════════════════════════
  // EXTRAS
  // ═══════════════════════════════════════════════════════════
  includeImports: zod.boolean().optional().default(false)
    .describe('Include import specifiers per file'),
  includeGraph: zod.boolean().optional().default(false)
    .describe('Include module dependency graph with circular detection'),
  includeStats: zod.boolean().optional().default(false)
    .describe('Include line counts per file and diagnostic summary'),
}
```

---

## Example Queries

### 1. Top-Level Folders Only
```json
{
  "scope": { "include": "*" },
  "show": { "folders": true, "files": false }
}
```
**Output:**
```
src/
test/
docs/
scripts/
```

---

### 2. All Files in src (No Symbols)
```json
{
  "scope": { "include": "src" },
  "show": { "folders": true, "files": true }
}
```
**Output:**
```
src/
  index.ts
  config.ts
  services/
    CdpService.ts
    LifecycleService.ts
  tools/
    map.ts
    trace.ts
```

---

### 3. Files + Functions (Signatures)
```json
{
  "scope": { "include": "src/tools" },
  "show": { "folders": true, "files": true, "symbols": ["functions"] },
  "detail": "signatures"
}
```
**Output:**
```
src/
  tools/
    map.ts
      flattenTree(nodes: TreeNode[], prefix?: string): Entry[]
      estimateTokens(obj: unknown): number
    trace.ts
      applyReduction(result: TraceResult): TraceResult
```

---

### 4. Classes + Interfaces with JSDoc
```json
{
  "scope": { "include": "**/*.ts", "exclude": ["**/*.test.ts"] },
  "show": { "files": true, "symbols": ["classes", "interfaces"] },
  "detail": "full"
}
```
**Output:**
```
src/
  services/
    CdpService.ts
      /** Service for Chrome DevTools Protocol communication. */
      class CdpService
        /** Establish connection to Chrome. */
        connect(url: string): Promise<void>
```

---

### 5. Flat File List (No Folders)
```json
{
  "scope": { "include": "**" },
  "show": { "folders": false, "files": true },
  "detail": "minimal"
}
```
**Output:**
```
src/index.ts
src/config.ts
src/services/CdpService.ts
src/tools/map.ts
test/map.test.ts
```

---

### 6. Folder Summary with Stats
```json
{
  "scope": { "include": "**" },
  "show": { "folders": true, "files": false },
  "includeStats": true
}
```
**Output:**
```
src/                        (42 files, 8500 lines)
  services/                 (8 files, 1800 lines)
  tools/                    (12 files, 2400 lines)
test/                       (25 files, 3200 lines)
```

---

## Detail Levels (Markdown Examples)

Symbols use TypeScript/JSDoc syntax with indentation-based nesting:

```
file.ts
  class ClassName
    constructor(params)
    methodName(params): returnType
    propertyName: type
  interface InterfaceName
    propertyName: type
  type TypeName = definition
  enum EnumName { Value1, Value2, Value3 }
  function functionName(params): returnType
  const CONSTANT_NAME: type = value
```

---

## Detail Levels

### minimal
Files listed, no symbol details:
```
src/
  index.ts
  config.ts
```

### names
Symbol names and type keywords only:
```
src/
  index.ts
    function main
    interface Config
```

### signatures
Full type signatures:
```
src/
  index.ts
    main(args: string[]): Promise<void>
    interface Config
      apiKey: string
      timeout: number
```

### full
Signatures + JSDoc comments:
```
src/
  index.ts
    /** Application entry point. */
    main(args: string[]): Promise<void>
    /** Configuration options. */
    interface Config
      apiKey: string
      timeout: number
```

---

## Comparison: Old vs New

| Aspect | Old (JSON) | New (Markdown) |
|--------|------------|----------------|
| Format | JSON with quotes, brackets | Plain text tree |
| Type field | `"type": "directory"` | Implied by `/` suffix |
| Name field | `"name": "src"` | Just `src/` |
| Nesting | `{ "children": [...] }` | Indentation |
| Symbols | `"symbols": [{ "name": "x" }]` | Inline TypeScript syntax |
| Token usage | ~180 chars | ~100 chars (~45% smaller) |

### Old Format (JSON)
```json
{
  "tree": [
    {
      "name": "src",
      "type": "directory",
      "children": [
        { "name": "index.ts", "type": "file", "symbols": [
          { "name": "main", "kind": "function" }
        ]}
      ]
    }
  ]
}
```

### New Format (Markdown)
```
src/
  index.ts
    main(args: string[]): Promise<void>
```

---

## Adaptive Compression

When output exceeds token budget, progressively reduce:

1. **Reduce detail**: `full` → `signatures` → `names` → `minimal`
2. **Remove symbols**: Just show file names
3. **Remove file names**: Just show folders
4. **Flatten**: Tree → flat path list
5. **Summarize**: Paths → folder counts

Example compression chain:
```
# Level 1: Full
src/
  index.ts
    /** Entry point. */
    main(args: string[]): void

# Level 2: Signatures
src/
  index.ts
    main(args: string[]): void

# Level 3: Names
src/
  index.ts
    function main

# Level 4: Minimal
src/
  index.ts

# Level 5: Folders only
src/

# Level 6: Flat paths
src/index.ts
src/config.ts

# Level 7: Summary
src/ (42 files)
test/ (10 files)
```

---

## Migration Path

| Old Param | New Equivalent |
|-----------|----------------|
| `path` (directory) | `scope.include` |
| `path` (file) | ❌ Use `read_file` tool |
| `filter` | `scope.include` |
| `depth: 0` | `detail: "minimal"` |
| `depth: 1` | `show: {symbols: ["*"]}, detail: "names"` |
| `depth: 2` | `show: {symbols: ["*"]}, detail: "signatures"` |
| `depth: 3+` | `show: {symbols: ["*"]}, detail: "full"` |
| `kind: "functions"` | `show: {symbols: ["functions"]}` |
| `includePatterns` | `scope.include` (array) |
| `excludePatterns` | `scope.exclude` |

---

*Ready for implementation approval*
