# Parser Elimination & Chunker Simplification — Blueprint

> **Status:** Draft v1
> **Created:** 2025-07-15
> **Replaces:** The `parser/` module in `packages/semantic-toolkit/src/parser/`
> **Affects:** `chunker/`, `lookup/`, `shared/types.ts`, `shared/node-locator.ts` (deleted), `snapshot/`, `ts-ls/` (resolver signatures), `mcp-server/codebase-search.ts`, `semantic-toolkit/src/index.ts`, `graph/render.ts`

---

## 1. Problem Statement

The current `semantic-toolkit` pipeline has three layers between the TypeScript compiler and the final output:

```
ts-morph AST  →  Parser (ParsedSymbol[])  →  Chunker (CodeChunk[])  →  Lookup/Graph/Snapshot
```

The **parser layer is entirely redundant**. It walks the ts-morph AST to produce a custom `ParsedSymbol[]` intermediate format, which the chunker then consumes to produce `CodeChunk[]`. Every piece of data in `ParsedSymbol` is already available directly from ts-morph's typed accessor API:

| ParsedSymbol field | ts-morph equivalent |
|---|---|
| `name` | `node.getName()` |
| `kind` | `node.getKind()` → map to simplified kind |
| `range` | `node.getStartLineNumber()` / `node.getEndLineNumber()` |
| `signature` | Eliminated — body collapsing uses `node.getBody().getStart()` for AST slicing |
| `modifiers` | `node.getModifiers()` |
| `jsdoc` | `node.getJsDocs()` |
| `exported` | `node.isExported()` |
| `children` | `node.getMembers()`, etc. |
| `parentName` | `node.getParent()` navigation |
| `depth` | AST nesting level |

The parser adds ~1,500 lines of fragile, manually-maintained AST-walking code that duplicates what ts-morph already provides natively. It introduces instability because every edge case (arrow functions, class expressions, declaration merging, CommonJS) requires custom handler code that must track ts-morph's own evolution.

Additionally, the `BODY_BEARING_KINDS` set — a manually curated list of 11 node kinds — is redundant. ts-morph nodes either have a `.getBody()` method that returns content or they don't. "Body-bearing" literally means "has a body," and that's a single runtime check, not a static enum list.

---

## 2. Design Principles

1. **Use ts-morph directly.** ts-morph wraps the native TypeScript compiler. It is definitive, pre-packaged, and accurate. Adding another wrapper on top defeats its purpose.

2. **No intermediate representations.** The `ParsedSymbol` type is an unnecessary stop between the source of truth (ts-morph AST) and the required output (`CodeChunk`). Eliminate it.

3. **Body detection is a runtime check, not a static list.** A node is body-bearing if `'getBody' in node && node.getBody() !== undefined`. No `BODY_BEARING_KINDS` set needed.

4. **Two use cases, same chunk output:**
   - **Direct symbol lookup** (`symbol = Name`): ts-morph finds the symbol → chunker creates a `CodeChunk` for that symbol only → enrich → graph + snapshot. The output must be identical to what a LanceDB vector search would return.
   - **Batch indexing** (future LanceDB): ts-morph → chunker → `CodeChunk[]` for the entire file, stored for embedding.
   - Both paths produce `CodeChunk` objects. Direct lookup just produces one (for the found symbol) instead of all of them.

5. **Minimal custom logic.** Only write custom code for things ts-morph genuinely doesn't provide: collapsed embedding text, chunk IDs, relevant imports. Breadcrumbs and relative paths are computed at render/display time, not by the chunker.

---

## 3. What Gets Deleted

### 3.1 Parser Module (`packages/semantic-toolkit/src/parser/`)

Delete the entire directory:

| File | Lines | Purpose | Replacement |
|---|---|---|---|
| `index.ts` | ~120 | Entry point, `parseFile()`, `parseFiles()` | Chunker uses ts-morph directly |
| `extractors.ts` | ~400 | Manual AST walkers for each SyntaxKind | ts-morph typed accessors |
| `helpers.ts` | ~150 | Utility functions for parser | Not needed |
| `signatures.ts` | ~200 | Regex-based signature/body stripping | Eliminated — `collapseBody()` uses AST-based slicing via `getBody().getStart()` |
| `root-content.ts` | ~200 | Root-level content extraction | ts-morph `.getStatementsWithComments()` |
| `types.ts` | ~75 | `ParsedSymbol`, `ParsedFile`, `PARSEABLE_EXTENSIONS` | `PARSEABLE_EXTENSIONS` moves to shared |

**Total deleted:** ~1,150 lines of custom AST-walking code.

### 3.2 Parser Tests (`packages/semantic-toolkit/tests/phase1-parser/`)

Delete the entire directory. These tests validate the `ParsedSymbol` intermediate format, which no longer exists. Chunker tests will replace them.

### 3.3 Shared Types Cleanup (`packages/semantic-toolkit/src/shared/types.ts`)

Remove:
- `BODY_BEARING_KINDS` set — replaced by runtime `hasBody()` check
- **`NodeKind` type** — replaced by `node.getKindName()` from ts-morph (returns strings like `"FunctionDeclaration"`, `"MethodDeclaration"`, `"ClassDeclaration"`, etc.)
- **`CALLABLE_KINDS`** — replaced by runtime capability check (`'getParameters' in node` or just try call hierarchy resolution and handle empty results)
- **`TYPE_HIERARCHY_KINDS`** — replaced by attempting `node.getExtends()` / `node.getImplements()` directly; if the method doesn't exist on the node, it doesn't have type hierarchy
- **`SKIP_REFS_KINDS`** — removed; try reference resolution on all nodes; nodes without references naturally return empty
- **`PARENT_WRAPPER_KINDS`** — replaced by checking if a node has members (`'getMembers' in node`)

**Rationale:** Every one of these sets is a manual wrapper that restricts what ts-morph already provides. ts-morph's type system and runtime APIs already know which nodes are callable, which have type hierarchies, which have bodies, etc. Pre-filtering with custom lists adds fragility and artificially limits the tool's capability.

### 3.4 ts-ls Type Cleanup

Remove:
- **`MemberKind`** (`ts-ls/types.ts`) — custom union (`'method' | 'property' | 'getter' | ...`) that maps from ts-morph's kind system to simplified strings. Replace with `node.getKindName()` which is more precise (distinguishes `MethodDeclaration` from `MethodSignature`, etc.). Same pattern as `NodeKind`.
- **`DependencyKind`** (`snapshot/types.ts`) — custom union (`'import' | 'type-import' | 'constant' | ...`) that classifies same-file dependencies. Fully derivable from `node.getKindName()` plus `isTypeOnly()` for type imports and `getDeclarationKind()` for const/let/var. Same pattern as `NodeKind`.
- **`buildSymbolRef()` duplication** — identical function duplicated in `call-hierarchy.ts`, `type-hierarchy.ts`, `type-flows.ts`, and other resolvers. Extract to one shared utility in `ts-ls/paths.ts` or a new `ts-ls/symbol-ref.ts`.

**Also deleted — dead analysis modules (never called in production, never rendered in output):**

The following 10 resolver modules, their types, their implementation files, their test files, and their test fixtures are all deleted. None are called from any production code path (`lookup/index.ts` or `mcp-server/`). None produce data that is rendered in the graph output. The `SymbolMetadata` fields they would populate are typed but never assigned. The only callers are test files under `tests/phase3-ts-ls/`.

| Module | Implementation | Types to delete | SymbolMetadata field |
|---|---|---|---|
| `aliases` | `ts-ls/aliases.ts` | `AliasKind`, `AliasEntry`, `AliasGraph`, `AliasChain`, `AliasHop` | `aliases?` |
| `type-guards` | `ts-ls/type-guards.ts` | `TypeGuardKind`, `TypeGuardEntry`, `TypeGuardAnalysis` | `typeGuards?` |
| `advanced-types` | `ts-ls/advanced-types.ts` | `AdvancedTypeKind`, `ConditionalTypeInfo`, `MappedTypeInfo`, `TemplateLiteralInfo`, `TemplateLiteralSpan`, `UtilityTypeInfo`, `AdvancedTypeEntry`, `AdvancedTypeAnalysis` | `advancedType?` |
| `side-effects` | `ts-ls/side-effects.ts` | `SideEffectKind`, `SideEffectEntry`, `SideEffectAnalysis` | `sideEffects?` |
| `callbacks` | `ts-ls/callbacks.ts` | `CallbackUsage`, `CallbackParameter`, `CallbackAnalysis` | `callbacks?` |
| `guard-callbacks` | `ts-ls/guard-callbacks.ts` | `GuardCallbackSite`, `GuardHofParameter`, `GuardCallbackAnalysis` | `guardCallbacks?` |
| `enum-members` | `ts-ls/enum-members.ts` | `EnumMemberEntry`, `EnumAnalysis` | `enumMembers?` |
| `unicode-identifiers` | `ts-ls/unicode-identifiers.ts` | `UnicodeIdentifierSeverity`, `UnicodeIdentifierEntry`, `ConfusablePair`, `UnicodeIdentifierAnalysis` | `unicodeIdentifiers?` |
| `ambients` | `ts-ls/ambients.ts` | `AmbientMember`, `GlobalAugmentation`, `ModuleAugmentation`, `AmbientDeclaration`, `AmbientInfo` | (not on SymbolMetadata) |
| `project-structure` | `ts-ls/project-structure.ts` | `ProjectInfo`, `ProjectStructure` | (not on SymbolMetadata) |

**Rationale:** These modules provide pattern-labeling or structural decomposition that either:
1. Restates information visible in source code (Copilot can read the source directly)
2. Provides a subset of relationships already captured by call hierarchy, type flows, and references
3. Tracks naming provenance already resolved by the core resolvers through barrel/re-export following

The 6 core resolvers retained in the enrichment pipeline (`callHierarchy`, `typeHierarchy`, `references`, `typeFlows`, `members`, `signature`) provide all inter-symbol relationships the graph needs. No dead module adds a relationship the graph can't already express.

**Files to delete:**
- `ts-ls/aliases.ts`, `ts-ls/type-guards.ts`, `ts-ls/advanced-types.ts`, `ts-ls/side-effects.ts`
- `ts-ls/callbacks.ts`, `ts-ls/guard-callbacks.ts`, `ts-ls/enum-members.ts`, `ts-ls/unicode-identifiers.ts`
- `ts-ls/ambients.ts`, `ts-ls/project-structure.ts`
- `tests/phase3-ts-ls/aliases.test.ts`, `tests/phase3-ts-ls/type-guards.test.ts`, `tests/phase3-ts-ls/advanced-types.test.ts`, `tests/phase3-ts-ls/side-effects.test.ts`
- `tests/phase3-ts-ls/callbacks.test.ts`, `tests/phase3-ts-ls/guard-callbacks.test.ts`, `tests/phase3-ts-ls/enum-members.test.ts`, `tests/phase3-ts-ls/unicode-identifiers.test.ts`
- `tests/phase3-ts-ls/ambients.test.ts`, `tests/phase3-ts-ls/project-structure.test.ts`
- All fixture directories: `tests/phase3-ts-ls/fixtures/aliases/`, `fixtures/type-guards/`, `fixtures/advanced-types/`, `fixtures/side-effects/`, `fixtures/callbacks/`, `fixtures/guard-callbacks/`, `fixtures/enum-members/`, `fixtures/unicode-identifiers/`, `fixtures/ambients/`, `fixtures/multi-project/`

**Kept (not redundant):**
- `SymbolRef` — output DTO for display (name + location). Lightweight alternative to passing full `Node` objects through the rendering pipeline. **But** `SymbolRef.filePath` changes from `RelativePath` to absolute `string` (renderer handles relativization).
- `SymbolMetadata` — aggregates all analysis results. Output structure. **But** all 10 dead module fields removed from the interface.
- `CodeChunk` — LanceDB schema / embedding unit. **But** remove `signature`, `relativePath`, and `breadcrumb` fields; change `nodeKind` from `NodeKind` to `string`. The chunker stores absolute `filePath` only; `relativePath` and `breadcrumb` are computed at render time (and at LanceDB indexing time for the embedding pipeline).

Keep:
- `AbsolutePath`, `RelativePath` branded types (still useful for type-safe path handling at the renderer boundary — `RelativePath` is now used only by the renderer when converting absolute paths to display paths, not by chunkers or resolvers)

Delete:
- **`SymbolTarget`** — eliminated entirely. Every field except `relativePath` is directly derivable from the ts-morph `Node` itself (`node.getSourceFile()`, `node.getName()`, `node.getKindName()`, `node.getStartLineNumber()`, `node.getSourceFile().getFilePath()`). `relativePath` was only used by the renderer, not by the resolvers. Resolvers now take `(node: Node)` directly.
- **`node-locator.ts`** (`locateNode`, `createSymbolTarget`, `walkUpToDeclaration`, `DECLARATION_KINDS`, `hasMatchingName`) — eliminated entirely. The refactored pipeline already holds the ts-morph `Node` from the lookup/chunker stage. There is nothing to "relocate." The old system went `CodeChunk → createSymbolTarget → locateNode → walkUpToDeclaration → Node`, re-discovering a Node we already had.

---

## 4. Chunker Rewrite

### 4.1 New Entry Point

The chunker takes a ts-morph `SourceFile` directly instead of a `ParsedFile`:

```typescript
import type { SourceFile, Node, Symbol } from 'ts-morph';
import type { CodeChunk, ChunkedFile } from './types.js';

/**
 * Chunk a source file into embeddable CodeChunk[].
 * Uses the compiler's symbol table (getLocals) for named declarations,
 * plus getStatementsWithComments() for non-symbol root content
 * (imports, expressions, re-exports, standalone comments).
 * No custom AST walking. No workspaceRoot.
 */
export function chunkFile(sourceFile: SourceFile): ChunkedFile {
    const chunks: CodeChunk[] = [];
    const chunkedNodePositions = new Set<number>();
    
    // 1. Named symbols: use the compiler's symbol table directly.
    //    getLocals() returns every named binding in the file's scope —
    //    functions, classes, variables, interfaces, type aliases, enums —
    //    already unwrapped (VariableDeclaration, not VariableStatement).
    for (const sym of sourceFile.getLocals()) {
        for (const decl of sym.getDeclarations()) {
            chunks.push(chunkNode(decl, sourceFile));
            chunkedNodePositions.add(decl.getStart());
            // Recurse into members of containers (classes, interfaces, enums)
            if ('getMembers' in decl) {
                for (const member of (decl as { getMembers(): Node[] }).getMembers()) {
                    if (hasBody(member)) {
                        chunks.push(chunkNode(member, sourceFile));
                    }
                }
            }
        }
    }
    
    // 2. Non-symbol root content: imports, expressions, re-exports, standalone comments.
    //    These have no names and aren't in the symbol table,
    //    but must be chunked for vector search visibility.
    //    getStatementsWithComments() returns both real AST statements AND
    //    standalone comment nodes (SingleLineCommentTrivia, MultiLineCommentTrivia).
    for (const stmt of sourceFile.getStatementsWithComments()) {
        if (!chunkedNodePositions.has(stmt.getStart()) && !isChildOfChunkedNode(stmt, chunkedNodePositions)) {
            chunks.push(chunkNode(stmt, sourceFile));
        }
    }
    
    return { filePath: sourceFile.getFilePath(), chunks };
}
```

### 4.2 Body Detection

Replace the static `BODY_BEARING_KINDS` set with a runtime check:

```typescript
/**
 * Check if a ts-morph node has a body (is body-bearing).
 * If getBody exists on the node and returns something, it has a body.
 */
function hasBody(node: Node): boolean {
    return 'getBody' in node && node.getBody() !== undefined;
}
```

### 4.3 Chunking Children

For named symbols returned by `getLocals()`, members of containers (classes, interfaces, enums) are chunked by iterating `node.getMembers()`. For each member:
- **Has a body?** (`hasBody(member)`) → it becomes its own `CodeChunk`
- **No body?** → it stays inside the parent's embedding text (collapsed or inline)

This uses ts-morph's native `.getMembers()` accessor — no type-specific if-else chains, no `getChunkableChildren()` wrapper.

For non-symbol root statements (imports, expressions) and standalone comments, these are leaf chunks with no children to recurse into.

### 4.4 Body Collapsing (Single Function, AST-Based)

There is exactly **one body-stripping operation** in the system: `collapseBody()`. It always produces the collapse message. There is no separate "signature extraction" or "declaration header" function — those use cases don't exist:

- **Showing the full symbol** → use `node.getText()` (no stripping)
- **Collapsing a child inline** → use `collapseBody()` (always includes collapse message)
- **Displaying a label** → use `node.getName()` / `node.getKindName()` (no stripping needed)

The function uses ts-morph's `getBody()` and `getStart()` for **AST-based slicing** — no regex, no string splitting, no pattern matching. This handles all edge cases (multiline parameter lists, nested braces in type literals, decorators, generic type parameters) because the AST inherently knows which `{` is the body.

```typescript
/**
 * Collapse a node's body, preserving the declaration header.
 * Uses ts-morph AST positions — no regex or string patterns.
 * Always includes the collapse message when body is present.
 */
function collapseBody(node: Node): string {
    if (!hasBody(node)) return node.getText();
    
    const body = node.getBody()!;
    const fullText = node.getText();
    const bodyStart = body.getStart() - node.getStart();
    
    // AST-based slicing: everything before the body is the declaration header
    const header = fullText.slice(0, bodyStart).trimEnd();
    
    // Line count from AST positions (not string splitting)
    const lineCount = body.getEndLineNumber() - body.getStartLineNumber() + 1;
    
    return `${header} {/** ${lineCount} lines collapsed */}`;
}
```

**Why AST slicing is definitive:**
- `node.getBody()` returns the exact body AST node (Block, etc.)
- `getStart()` gives the exact byte offset of the body's opening `{`
- Nested braces in type literals (e.g., `options: { a: string; b: number }`) are NOT confused with the body — the AST structure inherently distinguishes them
- Multiline parameter lists, decorators, and generic type parameters are all preserved correctly because we're slicing by position, not by pattern

**Result examples:**
```typescript
// Input (15-line function with multiline params)
async function processUser(
  userId: string,
  options: { includeProfile: boolean; maxRetries: number },
  callback: (result: ProcessResult) => void
): Promise<UserData> {
  // ... 15 lines of implementation
}

// Output
async function processUser(
  userId: string,
  options: { includeProfile: boolean; maxRetries: number },
  callback: (result: ProcessResult) => void
): Promise<UserData> {/** 15 lines collapsed */}
```

**Why the collapse message is always present:**
- If we're stripping the body, content was removed — the reader must know
- Copilot sees the symbol exists and has content (not an empty function)
- The line count conveys the symbol's size without showing the content
- There is no use case for showing a declaration without its body AND without indicating the omission

**`extractSignature` is eliminated.** The old `extractSignature()` function (regex-based body stripping that returned just the declaration line without a collapse message) is deleted. It served no distinct use case — every body-stripping operation requires the collapse indicator.

### 4.6 No Custom Kind Mapping

**Deleted: `NodeKind` and `getNodeKind()`.** Use `node.getKindName()` from ts-morph directly. This returns PascalCase strings like `"FunctionDeclaration"`, `"MethodDeclaration"`, `"MethodSignature"`, `"ClassDeclaration"`, etc. These are used as-is everywhere — stored in `CodeChunk.nodeKind`, displayed in the graph output, and stored in LanceDB.

The suffix carries signal: `MethodDeclaration` = has an implementation body; `MethodSignature` = interface method with no body. Copilot benefits from this distinction.

No `getDisplayKind()` function. No formatting. No mapping. Just `node.getKindName()`.

### 4.7 Chunk Labeling

The chunker chunks **all root-level content** — named symbols AND non-symbol statements AND standalone comments. Named symbols are searchable via `symbol = X` queries. Non-symbol root content (imports, expressions, re-exports, standalone comments) isn't queryable by name but is vectorized for LanceDB embedding and reranking search, so it must be chunked or it'll be invisible to Copilot.

Because `getLocals()` returns the compiler's symbol table entries, the chunker receives nodes that always have `getName()` for named symbols. No unwrapping, no per-kind branching. Non-symbol content falls through to `getKindName()` from ts-morph.

| Root content type | Source | Label | Queryable via `symbol = X`? | Findable via vector search? |
|---|---|---|---|---|
| Named declarations | `sourceFile.getLocals()` → `sym.getDeclarations()` | `node.getName()` | Yes | Yes |
| Non-symbol statements | `sourceFile.getStatementsWithComments()` (filtered) | `node.getKindName()` | No | Yes (via `fullSource` embedding) |
| Standalone comments | `sourceFile.getStatementsWithComments()` (filtered) | `node.getKindName()` → `"SingleLineCommentTrivia"` or `"MultiLineCommentTrivia"` | No | Yes (via `fullSource` embedding) |

```typescript
function getChunkLabel(node: Node): string {
    // Named declarations: getName() works natively — no unwrapping needed.
    // getLocals() already returns VariableDeclaration (not VariableStatement),
    // FunctionDeclaration, ClassDeclaration, etc. directly.
    if ('getName' in node && typeof node.getName === 'function') {
        return node.getName() ?? node.getKindName();
    }
    
    // Non-symbol root content: kind name from ts-morph is the label.
    // For comment nodes, this returns 'SingleLineCommentTrivia' or 'MultiLineCommentTrivia'.
    return node.getKindName();
}
```

**No VariableStatement special case.** The old approach iterated `getStatements()` and manually unwrapped `VariableStatement → VariableDeclarationList → VariableDeclaration` to find the name. With `getLocals()`, the compiler already unwrapped that — it returns `VariableDeclaration` nodes with `getName()` natively.

**Examples:**
```typescript
// Named symbols (from getLocals) → getName()
function validateToken(...) { }         // → "validateToken"
class UserService { }                    // → "UserService"
interface Config { }                     // → "Config"
const MAX_RETRIES = 3;                   // → "MAX_RETRIES" (VariableDeclaration, not VariableStatement)
export const API_URL = '...';            // → "API_URL"

// Non-symbol root content (from getStatementsWithComments, filtered) → getKindName()
import { readFile } from 'fs/promises';  // → "ImportDeclaration"
export * from './utils';                  // → "ExportDeclaration"
app.listen(3000);                         // → "ExpressionStatement"
// Section header comment                  // → "SingleLineCommentTrivia"
/* Block comment explaining module */      // → "MultiLineCommentTrivia"
```

---

## 5. Direct Lookup Path (Chunk-Consistent)

For `symbol = Name` queries, use ts-morph to find the symbol, then produce a `CodeChunk` for it — ensuring the output is identical to what a LanceDB vector search would return.

### 5.1 Symbol Finding

```typescript
import { Project, Node, type SourceFile } from 'ts-morph';

interface FoundSymbol {
    node: Node;
    sourceFile: SourceFile;
    name: string;
    startLine: number;
}

/**
 * Find a named symbol in a source file using the compiler's symbol table.
 * No manual AST walking — getLocals() returns all named bindings directly.
 */
function findSymbol(
    sourceFile: SourceFile,
    symbolName: string,
    parentName?: string,
): FoundSymbol[] {
    const results: FoundSymbol[] = [];
    
    for (const sym of sourceFile.getLocals()) {
        if (parentName) {
            // Look inside a specific parent (class, interface, namespace)
            for (const decl of sym.getDeclarations()) {
                if (decl.getName?.() !== parentName) continue;
                if (!('getMembers' in decl)) continue;
                for (const member of (decl as { getMembers(): Node[] }).getMembers()) {
                    if (member.getName?.() === symbolName) {
                        results.push({
                            node: member,
                            sourceFile,
                            name: symbolName,
                            startLine: member.getStartLineNumber(),
                        });
                    }
                }
            }
        } else {
            // Direct name match at file scope
            if (sym.getName() === symbolName) {
                for (const decl of sym.getDeclarations()) {
                    results.push({
                        node: decl,
                        sourceFile,
                        name: symbolName,
                        startLine: decl.getStartLineNumber(),
                    });
                }
            }
            // Also check members of containers for the symbol
            for (const decl of sym.getDeclarations()) {
                if ('getMembers' in decl) {
                    for (const member of (decl as { getMembers(): Node[] }).getMembers()) {
                        if (member.getName?.() === symbolName) {
                            results.push({
                                node: member,
                                sourceFile,
                                name: symbolName,
                                startLine: member.getStartLineNumber(),
                            });
                        }
                    }
                }
            }
        }
    }
    
    return results;
}
```

### 5.2 Direct Lookup Flow

```
User: symbol = validateToken
  ↓
ts-morph: sourceFile → findSymbol("validateToken")
  ↓
Found: MethodDeclaration node at line 42
  ↓
Chunker: chunkNode(node) → CodeChunk for this symbol only
  ↓
Enrich: resolvers take Node directly (no SymbolTarget, no workspaceRoot)
  ↓
Graph: render connection graph from enrichment metadata (renderer relativizes paths)
  ↓
Snapshot: resolve same-file dependencies of the found node → render
  ↓
Output: [debugMeta, graph, snapshot]
```

**Key point:** The `chunkNode()` function produces the same `CodeChunk` that would be stored in LanceDB and returned by a vector search. This ensures:
- The direct lookup output is identical to vector search output
- Testing direct lookup validates the chunking logic for the embedding pipeline
- The enrichment and rendering stages receive the same data structure regardless of how the symbol was found

### 5.3 Single-Symbol Chunking

The chunker needs a function that chunks a single found node (not the whole file):

```typescript
/**
 * Create a CodeChunk for a single ts-morph node.
 * Used by direct lookup to produce the same output as batch indexing.
 * No workspaceRoot — stores absolute paths only; renderer/indexer relativizes.
 */
function chunkNode(node: Node, sourceFile: SourceFile): CodeChunk {
    const name = getChunkLabel(node);
    const parentNode = findParentDeclaration(node);
    const parentName = parentNode ? getChunkLabel(parentNode) : null;
    const parentChain = parentName ? [parentName] : [];
    
    const fullSource = node.getText();
    const embeddingText = buildEmbeddingText(node); // collapse body-bearing children
    const relevantImports = resolveRelevantImports(fullSource, sourceFile);
    
    return {
        id: generateChunkId(sourceFile.getFilePath(), node.getKindName(), name, node.getStartLineNumber(), parentChain),
        filePath: sourceFile.getFilePath(),  // absolute — renderer/indexer relativizes
        nodeKind: node.getKindName(),  // ts-morph native kind string
        name,
        parentName,
        parentChunkId: null, // not needed for lookup
        childChunkIds: [],   // not needed for lookup
        depth: computeDepth(node),
        fullSource,
        startLine: node.getStartLineNumber(),
        endLine: node.getEndLineNumber(),
        jsdoc: extractJsDoc(node),
        relevantImports,
        embeddingText,
    };
}
```

### 5.4 Enrichment — No Category Sets, No SymbolTarget, No workspaceRoot

Three simplifications to the enrichment stage:

**1. No category set pre-filtering.** The current enrichment logic checks `CALLABLE_KINDS.has(chunk.nodeKind)` before resolving call hierarchy, `TYPE_HIERARCHY_KINDS.has(chunk.nodeKind)` before resolving type hierarchy, etc. These gates are removed. Try each resolution and handle empty/failed results gracefully.

**2. No SymbolTarget.** Resolvers take a ts-morph `Node` directly instead of a `SymbolTarget` wrapper. Every field that `SymbolTarget` provided is already on the `Node`:
- `target.node` → is the node
- `target.sourceFile` → `node.getSourceFile()`
- `target.name` → `node.getName()` (or `getChunkLabel(node)` for non-symbol root content)
- `target.kind` → `node.getKindName()`
- `target.startLine` → `node.getStartLineNumber()`
- `target.filePath` → `node.getSourceFile().getFilePath()`

**3. No workspaceRoot in resolvers.** The TypeScript compiler operates entirely on absolute paths. Resolvers don't need workspace-relative paths — that's purely a display concern. Resolvers now return `SymbolRef` objects with **absolute paths only**. The **renderer** converts absolute paths to workspace-relative paths at the final output stage, using `workspaceRoot` that it receives once.

This eliminates `workspaceRoot` as a parameter from all 6+ resolvers and their recursive helper functions, where it was threaded through exclusively for `toRelativePosixPath()` calls.

```typescript
function enrichWithMetadata(node: Node): SymbolMetadata {
    const metadata: SymbolMetadata = { outgoingCalls: [], incomingCallers: [] };
    
    // Resolvers take Node directly — no SymbolTarget, no workspaceRoot
    // They return absolute paths; renderer relativizes at output time
    try { metadata.signature = resolveSignature(node); } catch { /* not all nodes have signatures */ }
    try { const calls = resolveCallHierarchy(node); metadata.outgoingCalls = calls.outgoing; metadata.incomingCallers = calls.incoming; } catch { /* ok */ }
    try { metadata.typeHierarchy = resolveTypeHierarchy(node); } catch { /* ok */ }
    try { metadata.members = resolveMembers(node); } catch { /* ok */ }
    try { metadata.references = resolveReferences(node); } catch { /* ok */ }
    try { metadata.typeFlows = resolveTypeFlows(node); } catch { /* ok */ }
    
    return metadata;
}
```

No pre-filtering. No wrapper types. No path formatting. The TypeScript compiler decides what's applicable for each node type. The renderer handles display.

---

## 6. Type Changes

### 6.1 ChunkedFile Simplification

The `ChunkedFile` type currently wraps `ParsedFile`. After removing the parser:

```typescript
// Before
export interface ChunkedFile {
    parsedFile: ParsedFile;  // ← dependency on parser types
    chunks: CodeChunk[];
}

// After
export interface ChunkedFile {
    filePath: string;  // absolute — renderer/indexer computes relative paths
    chunks: CodeChunk[];
}
```

### 6.2 CodeChunk.nodeKind

Change from custom `NodeKind` union type to `string`:

```typescript
// Before
nodeKind: NodeKind;  // custom union: 'function' | 'method' | 'class' | ...

// After
nodeKind: string;  // ts-morph's node.getKindName(): 'FunctionDeclaration', 'MethodDeclaration', etc.
```

### 6.3 SymbolTarget — Eliminated

`SymbolTarget` is deleted entirely. It was a 7-field wrapper around a single ts-morph `Node` where every field (except `relativePath`, which no resolver used) was trivially derivable from the `Node` itself. Resolvers now take `(node: Node)` directly.

```typescript
// Before: SymbolTarget wraps a Node with redundant cached fields
interface SymbolTarget {
    sourceFile: SourceFile;   // = node.getSourceFile()
    node: Node;               // the actual data
    name: string;             // = node.getName()
    kind: NodeKind;           // = node.getKindName()
    startLine: number;        // = node.getStartLineNumber()
    filePath: AbsolutePath;   // = node.getSourceFile().getFilePath()
    relativePath: RelativePath; // not used by any resolver
}

// After: just use Node directly
resolveCallHierarchy(node: Node): SymbolMetadata
resolveTypeHierarchy(node: Node): TypeHierarchyInfo
resolveReferences(node: Node): ReferenceInfo[]
resolveSignature(node: Node): SignatureInfo
resolveMembers(node: Node): MemberInfo[]
resolveTypeFlows(node: Node): TypeFlowInfo
```

### 6.4 node-locator.ts — Eliminated

`shared/node-locator.ts` is deleted entirely. It contained:
- `createSymbolTarget()` — constructed the now-eliminated SymbolTarget
- `locateNode()` — re-found a Node from file path + line number
- `walkUpToDeclaration()` — walked up AST to find declaration ancestor
- `DECLARATION_KINDS` — yet another manually curated SyntaxKind set (20 entries)
- `hasMatchingName()` — manually checked 14 node types for name matching

All of this existed to bridge from `CodeChunk` metadata back to a ts-morph `Node`. With the refactor, the lookup/chunker stage already holds the `Node` — there's nothing to re-locate.

### 6.5 SymbolRef.filePath — Absolute Paths

`SymbolRef.filePath` changes from `RelativePath` to `string` (absolute path). All resolvers now return absolute paths; the renderer converts to relative at output time.

```typescript
// Before
export interface SymbolRef {
    name: string;
    filePath: RelativePath;  // ← resolver computes relative paths internally
    line: number;
}

// After
export interface SymbolRef {
    name: string;
    filePath: string;  // ← absolute path from node.getSourceFile().getFilePath()
    line: number;
}
```

This also applies to any remaining types that embed `RelativePath` in resolver output (e.g., `FileReference.filePath`, `TypeFlowType.filePath`). Types from deleted modules (`AliasEntry`, `CallbackUsage`, `GuardCallbackSite`, `AmbientMember`, etc.) are eliminated entirely and do not need path migration.

### 6.6 MemberKind — Eliminated

Replace with `node.getKindName()` directly. ts-morph returns more precise strings:

| Our `MemberKind` | ts-morph `getKindName()` |
|---|---|
| `'method'` | `'MethodDeclaration'` or `'MethodSignature'` |
| `'property'` | `'PropertyDeclaration'` or `'PropertySignature'` |
| `'getter'` | `'GetAccessor'` |
| `'setter'` | `'SetAccessor'` |
| `'constructor'` | `'Constructor'` |
| `'indexSignature'` | `'IndexSignature'` |

The ts-morph kind names carry more signal — `MethodDeclaration` (has body) vs `MethodSignature` (interface, no body) is a meaningful distinction for Copilot.

### 6.7 DependencyKind — Eliminated

Replace with `node.getKindName()` plus boolean checks:
- `'import'` vs `'type-import'` → `ImportDeclaration` + `node.isTypeOnly()`
- `'constant'` vs `'variable'` → `VariableStatement` + `node.getDeclarationList().getDeclarationKind()`
- All others → `node.getKindName()` directly

### 6.8 CodeChunk.signature — Removed

The `signature` field is removed from `CodeChunk`. There are no use cases for a body-stripped declaration without a collapse indicator (see section 4.4). The field was populated by the now-eliminated `extractSignature()` function.

### 6.9 buildSymbolRef() — Deduplicated

The `buildSymbolRef()` function (builds a `SymbolRef` from a ts-morph declaration node) is currently copy-pasted across 4+ resolver files. Extract to a single shared utility:

```typescript
// ts-ls/symbol-ref.ts (new shared utility)
export function buildSymbolRef(declaration: Node): SymbolRef {
    const sourceFile = declaration.getSourceFile();
    const name = 'getName' in declaration
        ? (declaration as { getName(): string | undefined }).getName() ?? '<anonymous>'
        : '<anonymous>';
    return {
        name,
        filePath: sourceFile.getFilePath(),  // absolute — renderer relativizes
        line: declaration.getStartLineNumber(),
    };
}
```

### 6.10 workspaceRoot Removed from Resolvers

`workspaceRoot` was threaded through all 6 resolvers and their recursive helpers for one purpose: calling `toRelativePosixPath(workspaceRoot, absolutePath)` to format output paths.

**Before:** Every resolver imports `toRelativePosixPath`, takes `workspaceRoot: string`, and calls it on every discovered node's file path.

**After:** Resolvers return `SymbolRef` objects with absolute paths. The renderer receives `workspaceRoot` once and converts all paths to relative at output time.

```typescript
// Before (in call-hierarchy.ts, type-hierarchy.ts, references.ts, etc.):
const relativePath = toRelativePosixPath(workspaceRoot, node.getSourceFile().getFilePath());

// After: resolvers just return absolute paths
const filePath = node.getSourceFile().getFilePath();
// ... renderer does: toRelativePosixPath(workspaceRoot, ref.filePath)
```

This removes `workspaceRoot` from 6 resolver entry points and 20+ internal helper functions.

### 6.11 CodeChunk.relativePath — Removed

The `relativePath` field is removed from `CodeChunk`. The chunker stores only the absolute `filePath` from `node.getSourceFile().getFilePath()`. Relative paths are computed at two points:
- **Renderer:** converts absolute paths to workspace-relative display paths using `workspaceRoot`
- **LanceDB indexer:** computes `relativePath` at index time for embedding/search (users type relative paths in queries)

This eliminates `workspaceRoot` from the chunker's entry points (`chunkFile()`, `chunkNode()`).

### 6.12 CodeChunk.breadcrumb — Removed

The `breadcrumb` field (e.g., `src/auth/service.ts > TokenService > validateToken`) is removed from `CodeChunk`. Breadcrumbs are computed at render/display time from the absolute `filePath`, `name`, and `parentChain`. This keeps the chunker free of display concerns — it produces absolute paths and structural data only.

---

## 7. What Stays Unchanged

| Module | Why unchanged |
|---|---|
| `ts-ls/` | Resolver logic stays; signatures change from `(SymbolTarget, workspaceRoot)` to `(Node)` and return absolute paths |
| `snapshot/resolve.ts` | Already uses ts-morph for identifier resolution |
| `snapshot/render.ts` | Takes `ResolutionResult` + file lines, no parser dependency |
| `CodeChunk` type | Stays as the LanceDB schema; chunker still produces it. **Field changes:** `nodeKind` becomes `string`; `signature`, `relativePath`, and `breadcrumb` removed (see sections 6.2, 6.8, 6.11, 6.12) |

### 7.1 Graph Rendering Change: Unified Format

The graph module currently has two rendering paths:
- `renderSingleResult()` — compact inline format (Calls/Called by as flat lists)
- `renderMultiResult()` — full topology format (Graph → Patterns → Details)

**Change:** Always use the topology format, regardless of result count. Remove the compact single-result renderer. This ensures consistent output shape.

**Empty sections are omitted, not marked empty.** If there are no patterns, the Patterns section is excluded from the output entirely — no "Patterns: (none)" placeholder. Same for Graph section if there are no call chain edges.

**Single result with topology format:**
```
Search: "symbol = validateToken" | 1 result | 820/8,000 tokens

Graph:
  [1] TokenService.validateToken (src/auth/tokenService.ts)
    → jwt.verify (jsonwebtoken)
    → AuthConfig.getSecret (src/config/auth.ts)

[1] TokenService.validateToken — src/auth/tokenService.ts
    async method | exported | refs: 8 files
    Signature: async validateToken(token: string): Promise<JwtPayload | null>
    Types in: token (string) | Types out: JwtPayload (src/models/auth.ts)
```

---

## 8. Migration Order

### Phase A: Delete Parser, Rewrite Chunker

1. **Rewrite `chunker/index.ts`** to accept `SourceFile` instead of `ParsedFile`
2. **Add helper functions** in chunker or shared: `hasBody()`, `getChunkLabel()`, `collapseBody()`, `isChildOfChunkedNode()`
3. **Remove `BODY_BEARING_KINDS`** from `shared/types.ts` — replace all usages with `hasBody()` check
4. **Simplify `ChunkedFile`** type — remove `parsedFile` and `relativePath` fields (absolute `filePath` only)
5. **Delete `parser/`** directory
6. **Delete `tests/phase1-parser/`** directory
7. **Update `src/index.ts`** exports — remove all parser exports
8. **Move `PARSEABLE_EXTENSIONS`** from parser types to shared

### Phase A½: Delete Dead Analysis Modules

1. **Delete 10 implementation files** from `ts-ls/`:
   - `aliases.ts`, `type-guards.ts`, `advanced-types.ts`, `side-effects.ts`
   - `callbacks.ts`, `guard-callbacks.ts`, `enum-members.ts`, `unicode-identifiers.ts`
   - `ambients.ts`, `project-structure.ts`
2. **Delete 10 test files** from `tests/phase3-ts-ls/`:
   - `aliases.test.ts`, `type-guards.test.ts`, `advanced-types.test.ts`, `side-effects.test.ts`
   - `callbacks.test.ts`, `guard-callbacks.test.ts`, `enum-members.test.ts`, `unicode-identifiers.test.ts`
   - `ambients.test.ts`, `project-structure.test.ts`
3. **Delete 10 fixture directories** from `tests/phase3-ts-ls/fixtures/`:
   - `aliases/`, `type-guards/`, `advanced-types/`, `side-effects/`
   - `callbacks/`, `guard-callbacks/`, `enum-members/`, `unicode-identifiers/`
   - `ambients/`, `multi-project/`
4. **Remove 10 `export { resolve* }` lines** from `ts-ls/index.ts`
5. **Remove ~35 `export type` entries** from `ts-ls/index.ts` (all types for deleted modules)
6. **Remove 8 optional fields** from `SymbolMetadata` in `ts-ls/types.ts`:
   - `typeGuards?`, `callbacks?`, `guardCallbacks?`, `advancedType?`, `enumMembers?`, `unicodeIdentifiers?`, `sideEffects?`, `aliases?`
7. **Remove ~500 lines of type definitions** from `ts-ls/types.ts` (Items 11–20 type blocks)
8. **Update `CODEBASE-SEARCH.md`** — remove test fixture descriptions and validation gate entries for all 10 deleted modules

### Phase B: Simplify Direct Lookup & Eliminate SymbolTarget

1. **Rewrite `lookup/resolve.ts`** to use `findSymbol()` via ts-morph instead of searching `ChunkedFile[]`
2. **Rewrite `lookup/index.ts`** — for direct lookup, skip `parseAndChunkFiles()` entirely; use `findSymbol()` + `chunkNode()` for the matched symbol only
3. **Adapt snapshot stage** to accept `Node` references or line ranges instead of `CodeChunk[]`
4. **Delete `SymbolTarget` interface** from `shared/types.ts`
5. **Delete `shared/node-locator.ts`** entirely (`createSymbolTarget`, `locateNode`, `walkUpToDeclaration`, `DECLARATION_KINDS`, `hasMatchingName`)
6. **Update all resolver signatures** to take `(node: Node)` instead of `(target: SymbolTarget, workspaceRoot: string)`
7. **Remove `workspaceRoot` from resolvers** — resolvers return absolute paths; pass `workspaceRoot` to the renderer only
8. **Change `SymbolRef.filePath`** from `RelativePath` to `string` (absolute) across `ts-ls/types.ts` and all types that embed file paths
9. **Delete `MemberKind`** from `ts-ls/types.ts` — use `node.getKindName()` (change `MemberInfo.kind` to `string`)
10. **Delete `DependencyKind`** from `snapshot/types.ts` — use `node.getKindName()` + boolean checks (change `ResolvedDependency.kind` to `string`)
11. **Extract shared `buildSymbolRef()`** to `ts-ls/symbol-ref.ts` — remove duplicates from all resolver files
12. **Remove `CodeChunk.signature` field** from `chunker/types.ts`
13. **Remove `CodeChunk.relativePath` and `CodeChunk.breadcrumb` fields** from `chunker/types.ts` — chunker stores absolute `filePath` only; renderer/indexer computes these at display/index time
14. **Update `graph/render.ts`** to accept `workspaceRoot` and relativize all paths at render time (including computing breadcrumbs)

### Phase C: Unify Graph Format

1. **Remove `renderSingleResult()`** from `graph/render.ts`
2. **Update `renderMultiResult()`** to handle single results using the same topology format
3. **Omit empty sections** — if no patterns, skip the Patterns section entirely; if no call edges, skip the Graph section
4. **Rename** to just `renderGraph()` since there's only one format now

### Phase D: Update MCP Tool

1. **Update `codebase-search.ts`** handler to match new `lookupSymbol()` signature
2. **Test end-to-end** via the MCP tool against real workspace files

---

## 9. Risk Assessment

| Risk | Mitigation |
|---|---|
| Parser tests deleted with no replacement | Chunker tests + E2E MCP tool tests cover the same ground |
| Edge cases lost (arrow functions, CommonJS, etc.) | ts-morph handles these natively — they're only edge cases because the parser reimplemented AST walking |
| Snapshot stage expects CodeChunk targets | Adapt to accept Node references (line range is the key data) |
| NodeKind type removed from codebase | `CodeChunk.nodeKind` becomes `string` populated by `node.getKindName()` directly |
| MemberKind / DependencyKind removed | `MemberInfo.kind` and `ResolvedDependency.kind` become `string` from `getKindName()` |
| SymbolTarget removed from codebase | Resolvers take `Node` directly; all fields were derivable from the Node |
| node-locator.ts deleted | Lookup stage already holds the Node; nothing to re-locate |
| SymbolRef.filePath changed to absolute | All types that embed `RelativePath` in resolver output change to `string` (absolute); renderer relativizes |
| Downstream systems depend on parser exports | Only the chunker imports from parser; all downstream uses CodeChunk |
| 10 dead analysis modules deleted | Never called in production, never rendered in output; 6 core resolvers provide all graph relationships |
| 10 test suites + fixtures deleted | Tests validated dead code; no production behavior coverage lost |
| CodeChunk.relativePath/breadcrumb removed | Renderer computes at display time; LanceDB indexer computes at index time; no information lost |

---

## 10. Expected Outcome

| Metric | Before | After |
|---|---|---|
| Lines of custom AST code | ~1,500 (parser + extractors) | ~30 (helper functions: `hasBody`, `getChunkLabel`, `collapseBody`, `isChildOfChunkedNode`; no manual AST walking — `getLocals()` for named symbols, `getStatementsWithComments()` for non-symbol root content and standalone comments) |
| Intermediate types | `ParsedSymbol`, `ParsedFile`, `NodeKind`, `SymbolTarget`, `MemberKind`, `DependencyKind` + 35 types from 10 dead modules | None (ts-morph `Node` → CodeChunk directly; `getKindName()` for all kind classification) |
| Static kind/category lists | `BODY_BEARING_KINDS`, `CALLABLE_KINDS`, `TYPE_HIERARCHY_KINDS`, `SKIP_REFS_KINDS`, `PARENT_WRAPPER_KINDS` | `hasBody()` runtime check; no category sets |
| Duplicated utility functions | `buildSymbolRef()` copy-pasted in 4+ resolver files | Single shared `ts-ls/symbol-ref.ts` |
| Path handling in resolvers | Each resolver imports `toRelativePosixPath` and calls it inline | Resolvers return absolute paths; renderer relativizes once |
| Direct lookup path | Parse all symbols → chunk all → linear search → enrich → render | ts-morph find symbol → chunk that symbol → enrich → render |
| Enrichment gating | Pre-filtered by `CALLABLE_KINDS`, `TYPE_HIERARCHY_KINDS`, etc. | Try all enrichments, handle empty gracefully |
| Graph rendering | Two formats (single compact, multi topology) | One unified topology format, empty sections omitted |
| Pipeline layers | 3 (parser → chunker → output) | 2 (chunker → output) or 1 (direct lookup) |
| Fragility surface | Custom AST walkers, manual kind lists, parser edge cases, SymbolTarget/node-locator roundtrip | ts-morph's battle-tested compiler integration |
| workspaceRoot threading | Passed through chunker + 6 resolvers + 20 helpers for path display | Passed once to renderer; chunker and resolvers store absolute paths only |
| Dead analysis modules | 10 implementation files + 10 test files + 10 fixture dirs + ~500 lines of types + 8 SymbolMetadata fields | 0 — all deleted; 6 core resolvers provide complete graph data |
| ts-ls resolver count | 16 (6 core + 10 dead) | 6 (call hierarchy, type hierarchy, references, type flows, members, signature) |
