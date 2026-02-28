# AST-Native Semantic Codebase Search System — Blueprint

## Problem Statement

VS Code's native semantic search and read tools have three core deficiencies:
- Chunking is character-count-based with no awareness of code structure, producing irrelevant results
- The embedding model used is low quality, producing low-fidelity semantic vectors
- Read tools require Copilot to read files in small increments rather than getting full symbol context

**Goal:** A single MCP tool that returns surgically precise, concern-level code context — only the specific symbols relevant to Copilot's current task, enriched with their structural connections, and free of noise. This eliminates manual file reads, grep searches, and context-window waste, allowing Copilot to spend its effort on strategy and logic rather than filtering irrelevant code.

**Long-term vision:** This tool replaces both `file_read` (for code files) and `codebase_trace` entirely. Search once, get exactly what you need — full symbol context, structural connections, and enough metadata for follow-up queries — then make the edit.

**Package:** Core logic lives in `packages/semantic-toolkit/` — a standalone npm workspace package importable by both the VS Code extension and the MCP server. The MCP tool registration lives in `mcp-server`, which imports from `semantic-toolkit`. The existing `services/codebase/` infrastructure is NOT reused — `semantic-toolkit` is a ground-up implementation based on this blueprint.

---

## Stack

- **Language:** TypeScript (Node-based, end to end)
- **AST Parser:** TypeScript Compiler API (`typescript` npm package) — full type resolution, not Tree-sitter
- **File Support:** `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs`, `.cts`, `.cjs` (matches existing `TS_PARSEABLE_EXTS`)
- **Embedding Model:** Voyage Code 3 (1024-dimensional vectors)
- **Vector Store:** LanceDB (`@lancedb/lancedb` v-next SDK)
- **Re-ranking:** Voyage Rerank 2.5
- **Structural Analysis:** TypeScript Language Services (post-rerank metadata enrichment)
- **Index Update Strategy:** Incremental re-index of dirty files on each tool call

---

## MCP Tool Interface

```typescript
interface CodebaseSearchInput {
  /** Natural language query OR symbol path (e.g., "TokenService > validateToken").
   *  Symbol paths use > notation: "ParentSymbol > ChildSymbol".
   *  When a symbol path is detected, the system does direct lookup (skips vector/rerank). */
  query: string;

  /** Optional path filters. Supports files, directories, and glob patterns.
   *  Examples: ["src/auth/"], ["*.ts"], ["config/constants.ts"] */
  path?: string[];

  /** Optional language filter. TS/JS only in initial implementation.
   *  Future: ["typescript", "markdown", "json"] */
  languages?: string[];
}
```

**Query mode detection:**
- Starts with `symbol = ` → direct symbol lookup with same connection graph + smart snapshot output
- Anything else → natural language, full three-stage pipeline (vector → rerank → metadata enrichment)

**Symbol lookup notation** uses `symbol = ` prefix with `>` for hierarchy:
- `symbol = validateToken` → find symbol named `validateToken` in any file
- `symbol = TokenService > validateToken` → find `validateToken` within `TokenService`
- `symbol = src/auth/tokenService.ts > TokenService > validateToken` → file-scoped lookup

**Long-term vision:** This tool interface is designed to eventually replace `file_read` for code files and partially replace `codebase_trace` for common structural queries. The `symbol` lookup mode provides direct symbol access, and the connection graph metadata provides structural context that covers many `codebase_trace` use cases.

---

## Design Philosophy

### Parser First
The AST parser and chunking system must be built and validated BEFORE any embedding or search work begins. The parser determines what chunks look like, which determines what gets embedded. Get parsing right on real-world code (tested against large files like 6,000+ line classes), then build the search pipeline on top of proven chunks.

### Concern-Level Retrieval
The search tool returns only the specific symbols relevant to the query — not files, not full classes. If Copilot is working on authentication and a file has 50 constants, only the 1 constant related to auth is returned. The 49 others are never seen. Every returned symbol is COMPLETE (never partial), but irrelevant symbols at the file/class level are excluded entirely.

### Separation of Concerns (Current Architecture)
- **This tool:** Finds relevant code symbols via semantic search, enriches them with structural metadata (connection graph), and returns smart structural snapshots
- **Replaces:** `codebase_trace` (structural exploration) and `file_read` (symbol-scoped navigation) — the connection graph covers structural connections, and smart snapshots cover code reading

### Quality Over Speed
When there is a tradeoff between result quality and response speed, prefer correctness. Every token in the output should be relevant to Copilot's current task.

---

## Chunking Strategy

### Core Principle: AST-Level Chunking (file_read style)

Every AST symbol is chunked consistently at every level of the hierarchy using the same rule: **show this symbol's content with its body-bearing children collapsed.** This mirrors the existing `file_read` tool's symbol-scoped output system.

- **Class chunk:** Class declaration + property declarations + method signatures (method bodies collapsed)
- **Method chunk:** Method body with nested function definitions collapsed to signatures
- **Nested function chunk:** Function body with its children collapsed (if any)
- Every level gets the same treatment — no special-casing for "large" vs "small"

This means:
- Searching "TriviaGame class" finds the class overview with all 90 method signatures
- Searching "validateToken" finds the specific method's full body
- Searching "answer buttons" finds the specific UI section within `initializeUI`
- The granularity is consistent at every level

### Embedding Text Construction

Each chunk's `embeddingText` contains **raw source code only** (with body-bearing children collapsed to signature stubs). No metadata preamble, no file path, no breadcrumb — just the actual code. The code-trained embedding model (Voyage Code 3) derives semantic meaning directly from source code patterns, not from boilerplate metadata.

```typescript
// embeddingText for a class with methods:
export class TokenService {
  private secret: string;
  
  constructor(secret: string);
  async validateToken(token: string): Promise<JwtPayload | null>;
  refreshToken(token: string): string;
}

// embeddingText for the validateToken method (leaf, no children):
async validateToken(token: string): Promise<JwtPayload | null> {
  try {
    return jwt.verify(token, this.secret) as JwtPayload;
  } catch {
    return null;
  }
}
```

For parent/container chunks (e.g., a class), the embedding text includes the declaration + collapsed method signatures (each body-bearing child replaced by `signature;`). For leaf chunks, `embeddingText` equals `fullSource`.

**Key rules:**
- `embeddingText` = raw source with body-bearing children collapsed to signature stubs
- `fullSource` = complete unmodified source of the node
- **No metadata preamble** — all metadata (file path, breadcrumb, depth, etc.) is stored in separate LanceDB schema fields
- The embedding model receives actual code, maximizing semantic signal per token

### Handling Large Symbols

Tested against real codebase data (e.g., `TriviaGame` class: 6,138 lines, 90+ methods, `initializeUI()`: ~1,958 lines):

**Token limits:** Voyage Code 3 and Voyage Rerank 2.5 both support **32K tokens per document**. Even in the worst-case stress-test codebase:

- `initializeUI()` (~1,958 lines) ≈ 10,000–16,000 tokens → **under 32K, fits as single chunk**
- `TriviaGame` class (6,138 lines) ≈ 30,000–50,000 tokens → class as whole exceeds 32K, but we already chunk as summary + individual methods, so each chunk is well under the limit
- Every individual method/function in the entire test codebase → **under 32K**

**No arbitrary splitting needed.** The AST-level chunking (each symbol with body-bearing children collapsed) naturally keeps every chunk under 32K without any special size-based splitting rules. The hierarchy IS the splitting strategy:

- **Class chunk:** Declaration + method signatures (collapsed bodies) → well under 32K
- **Individual method chunks:** Full method body with nested functions collapsed → well under 32K
- **Nested function chunks:** Full body → trivially small

This was validated against the most extreme real-world code available (6,138-line class, 1,958-line method).

### Parser Requirements

The parser must be built and validated before embeddings work begins:
1. Parse all `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs`, `.cts`, `.cjs` files using the TypeScript Compiler API
2. Extract hierarchical symbol trees matching the `file_read` tool's symbol model
3. Apply the "content with children collapsed" rule at every level
4. Handle edge cases: massive methods, deeply nested UI trees, arrow functions, etc.
5. Handle React/JSX component declarations with proper chunking (part of initial parser, not deferred)
6. Validate on real-world code (TriviaGame.ts, TriviaPhone.ts) before proceeding

### Non-Body-Bearing and Root-Level Content

Not all code lives inside body-bearing symbols. Every individual item at the file root gets its own chunk — no artificial grouping:

**Named symbols at root** (constants, variables, type aliases, interfaces, enums):
- Each gets its own chunk containing just the source code
- Example: `export const TOKEN_EXPIRY = 3600` → one chunk

**Non-symbol content at root** (imports, expressions, re-exports, control flow):
- Each individual statement gets its own chunk
- `import jwt from 'jsonwebtoken'` → one chunk
- `app.use(cors())` → one chunk
- `export { X } from './x'` → one chunk
- Top-level `if`, `for`, `try/catch` blocks → each one chunk

**Standalone comments at root** (comments not attached to any AST node):
- Each standalone comment or contiguous comment block gets its own chunk with `nodeKind: 'comment'`
- `// Section header comment` → one chunk
- A multi-line `/* ... */` block comment → one chunk
- JSDoc comments attached to a declaration are NOT standalone — they are part of that declaration's range
- Only comments that exist between declarations (or at the start/end of a file with no adjacent declaration) become standalone comment chunks
- `relevantImports` is always `[]` for comment chunks (comments don't reference imports)

**Full coverage rule:** Every non-blank line in a source file must be covered by at least one root-level chunk (depth 0). Blank lines between symbols do not require coverage. Standalone comments that would otherwise be uncovered are extracted as their own chunks to satisfy this rule.

**Why individual chunks instead of groups:** Grouping semantically unrelated content (e.g., merging all imports) adds noise to embeddings. Voyage Code 3 is trained on code and handles small chunks well — even a single import line embeds accurately enough for the reranker to evaluate relevance. Individual chunks mean precise retrieval: searching "jsonwebtoken" finds exactly the import for `jwt`, not an entire block of 15 unrelated imports.

The `relevantImports` field on each body-bearing chunk tracks which imports that symbol uses, enabling the smart structural snapshot to include relevant imports in the output.

Files that are entirely non-symbolic (e.g., `server.ts` with only `app.use(...)` calls and imports) produce individual chunks for each statement.

---

## LanceDB Schema

```typescript
interface CodeChunk {
  id: string;                    // hash of filePath + nodeKind + name + startLine + parentChain
  filePath: string;
  relativePath: string;
  nodeKind: string;              // 'function' | 'method' | 'class' | 'interface' | 'type' | 'enum' | 'component' | 'variable' | 'const' | 'import' | 'expression' | 're-export' | 'comment'
  name: string;
  parentName?: string;           // class name if this is a method
  parentChunkId?: string;        // ID of parent chunk for hierarchical navigation
  childChunkIds?: string[];      // IDs of child chunks
  depth: number;                 // nesting depth (0 = top-level)
  signature: string;
  fullSource: string;            // complete source of the node — returned to Copilot
  startLine: number;
  endLine: number;
  jsdoc?: string;
  relevantImports: string[];     // import statements actually used by this chunk
  embeddingText: string;         // raw source with body-bearing children collapsed to signature stubs
  breadcrumb: string;            // "file > parent > ... > name" for display/debugging
  vector: Float32Array;          // 1024-dim Voyage Code 3 embedding (Phase 3)
  contentHash: string;           // SHA-256 of file contents for change detection (Phase 3)
  lastModified: number;          // file mtime for incremental invalidation trigger (Phase 3)
}
```

> **Note on graph edges:** Dedicated graph edge fields (`callsIds`, `calledByIds`, etc.) are NOT stored in this schema. The TypeScript Language Services provide real-time structural analysis during the post-rerank enrichment stage (Stage 3), using live compiler data rather than stale cached edges. This avoids maintaining duplicate structural data and ensures connections are always accurate.

---

## Incremental Indexing

On each `semantic_search` tool call:

1. Enumerate all `.ts`/`.tsx`/`.js`/`.jsx`/`.mts`/`.mjs`/`.cts`/`.cjs` workspace files
2. Compare each file's `mtime` against `lastModified` stored in LanceDB
3. For files where `mtime` has changed: read the file and compute a content hash (SHA-256 of file contents)
4. Compare the content hash against `contentHash` stored in LanceDB
5. **If content hash matches:** Update `lastModified` only — skip re-parsing and re-embedding (the file was touched by git but not actually changed)
6. **If content hash differs (or file is new):** Delete existing chunks by `filePath`, re-parse and re-embed, store the new content hash
7. **Signature change detection:** if a re-indexed chunk's signature differs from its previous version, find all chunks whose `embeddingText` referenced that signature and re-embed those too (their embedding text referenced the old signature)
8. Run the search query against the now-fresh index

**Why mtime + content hash:** Using `mtime` alone causes unnecessary re-indexing after git operations (branch switches, rebases, pulls) that touch file timestamps without changing content. The two-phase approach uses `mtime` as a cheap trigger, then validates with a content hash before doing expensive re-parsing and re-embedding. This keeps indexing fast for git-heavy workflows.

**Why the cascade is bounded:** Only signature changes (not implementation changes) trigger neighbor re-embedding. Signature changes are rare. TypeScript rename refactors touch all import sites simultaneously, so those files are already dirty and re-indexed naturally.

---

## Three-Stage Retrieval Pipeline

### Stage 1 — Vector Search (Broad Net)
- Query Voyage Code 3 for embedding of the natural language query
- ANN search in LanceDB → top 40 candidates (configurable)
- Optional: `WHERE` filter on `filePath` or `nodeKind` if query implies scope

### Stage 2 — Re-ranking (Precision Filter)
- Run top 40 through Voyage Rerank 2.5
- Re-ranker sees query + chunk text together (not independent embeddings) → much higher precision
- Compute final blended score for each candidate:

```
finalScore = (rerankScore * 0.65) + (vectorSimilarity * 0.35)
```

Re-ranker dominates because it evaluates query-chunk relevance jointly. Vector similarity adds a diversity/recall signal to prevent the re-ranker from being too narrow.

### Stage 3 — Metadata Enrichment via TypeScript Language Services

After re-ranking produces the final results, use the TypeScript Language Services to enrich each result with comprehensive structural metadata. Stage 3 does NOT add new results — it annotates the existing results with connection data that Copilot uses to understand the structural landscape and make targeted follow-up searches.

For each result, resolve via the TS compiler:
1. **Kind and modifiers:** async, static, exported, etc.
2. **Full signature:** complete type signature with parameter types and return type
3. **Type hierarchy:** extends, implements, subtypes
4. **Outgoing calls:** recursive tree of symbols this result calls (configurable `callDepth`, default 1 hop; cycle detection with `[cycle]` markers; `[depth limit]` markers at boundary)
5. **Incoming callers:** recursive tree of symbols that call this result (same `callDepth` config, includes constructor call resolution via `new Foo()`)
6. **Reference count:** how many files reference this symbol
7. **Type flows:** where parameter types come from and return types go (with file paths)
8. **Members:** for classes/interfaces, the list of methods and properties

Additionally, analyze cross-result patterns:
- **Shared dependencies:** symbols referenced by 2+ results that were NOT included in the results themselves (marked with `◆`)
- **Inter-result connections:** when one result calls or references another result (marked with `★`)

This metadata is assembled into a **connection graph** — a centralized structural overview returned as the first content item in the MCP response. Individual source code results contain no inline metadata; all structural context lives in the graph.

**Why this runs AFTER the re-ranker, not before:**
- Voyage Rerank 2.5 doesn't natively understand custom structural metadata — feeding it edges would add noise
- TS analysis on precision-filtered results is cheaper than on 40 fuzzy candidates
- You need to know which results are high-confidence FIRST before resolving their structural connections

**Why metadata enrichment instead of hub elevation:**
- Including full source of hub symbols that didn't pass the semantic relevance gate adds hundreds of tokens of potentially irrelevant code
- Lightweight metadata (a few dozen tokens per result) provides the same structural insight at a fraction of the token cost
- The metadata serves as *clues for follow-up searches* — Copilot can immediately see shared dependencies and make a targeted second query rather than falling back to brute-force grep/regex searches
- The collective metadata across all results naturally covers 2+ hops of structural connections without explicitly requesting deep traversals

**What this bridges:** Embedding models understand what code MEANS (semantic similarity). The TS language server understands how code CONNECTS (type resolution, references, call chains). By annotating semantically-validated results with structural metadata, we bridge the gap — giving Copilot the full picture of both what the code does and how it's connected, without bloating the response with additional source code.

---

## Result Selection — Dual Constraint

Results are selected using two constraints applied simultaneously:

1. **Relevance Gate:** Only include results where `finalScore >= minimumRelevanceThreshold`
   - Default: `0.5` (configurable)
   - Prevents padding results with low-quality matches

2. **Token Budget:** Iterate through passing results by score descending, include until token budget is exhausted
   - Default: `8,000` tokens (configurable)
   - Naturally adapts: short functions → more results, long classes → fewer results

**Behavior:** If only 2 results pass the relevance gate, return 2 — never pad with noise. A high-confidence query about `validateToken` might return 3 precise results at 2,000 tokens. A broad query about "authentication flow" might return 8 results at the full budget.

### Configuration

All scoring and selection parameters are configurable via settings:

| Parameter | Default | Description |
|---|---|---|
| `rerankWeight` | 0.65 | Weight for Voyage Rerank 2.5 score in final blend |
| `vectorWeight` | 0.35 | Weight for vector similarity in final blend |
| `minimumRelevanceThreshold` | 0.5 | Minimum score to include a result (0.0–1.0) |
| `maxTokenBudget` | 8000 | Maximum tokens in combined result output |
| `maxVectorCandidates` | 40 | Number of candidates from Stage 1 |

---

## Result Format Returned to Copilot

### MCP Multi-Content Response

Results use MCP's native multi-content response format. The first content item is the **connection graph** (structural metadata overview), followed by **smart structural snapshots** — one per file (same-file results merged). Each content item has priority annotations mapped from the `finalScore`:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Search: \"authentication token validation\" | 5 results across 4 files | 3,240/8,000 tokens\n\n[1] TokenService.validateToken\n src/auth/tokenService.ts\n ...",
      "annotations": {
        "audience": ["assistant"],
        "priority": 1.0
      }
    },
    {
      "type": "text",
      "text": "// src/auth/tokenService.ts\n\nimport jwt from 'jsonwebtoken';\nimport { JwtPayload } from '../models/auth';\n\nexport class TokenService extends BaseValidator {\n  private secret: string;\n\n  async validateToken(token: string): Promise<JwtPayload | null> {\n    ...\n  }\n}",
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.95
      }
    },
    {
      "type": "text",
      "text": "// src/middleware/auth.ts\n\nimport { TokenService } from '../auth/tokenService';\n\nexport class AuthMiddleware {\n  ...\n}",
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.80
      }
    }
  ]
}
```

### Connection Graph (First Content Item)

The connection graph is a centralized structural overview of all results — plain text, no decorative characters. It uses a **graph-first topology** layout: the call/dependency topology comes first (so Copilot understands relationships immediately), followed by structural patterns, then per-symbol details. Individual source code results contain NO inline metadata; all structural context lives here.

**Layout order:**
1. **Graph section** — compact topology showing how results connect (call chains, dependencies)
2. **Patterns section** — explicit structural insights (hubs, shared deps, diamonds)
3. **Details section** — per-symbol metadata (kind, modifiers, signature, types, reference count)

**Multi-result example:**

```
Search: "authentication token validation" | 5 results across 4 files | 3,240/8,000 tokens

Graph:
  [2] AuthMiddleware.verify → [1] TokenService.validateToken → [4] AuthConfig.getSecret
  [3] LoginController.handle → [1] TokenService.validateToken
  [5] AUTH_TOKEN_EXPIRY (standalone constant)

Patterns:
  Hub: [1] TokenService.validateToken — called by [2], [3]
  Shared dep: [4] AuthConfig.getSecret — used by [1], [2]
  Shared type: JwtPayload (src/models/auth.ts) — used by 3/5 results

[1] TokenService.validateToken — src/auth/tokenService.ts
    async method | exported | refs: 8 files
    Signature: async validateToken(token: string): Promise<JwtPayload | null>
    Extends: BaseValidator (src/base.ts)
    Types in: token (string) | Types out: JwtPayload (src/models/auth.ts)

[2] AuthMiddleware.verify — src/middleware/auth.ts
    async method | exported | refs: 12 files
    Signature: async verify(req: Request, res: Response, next: NextFunction): Promise<void>
    Types in: Request (express), Response (express)

[3] LoginController.handle — src/controllers/login.ts
    async method | exported | refs: 3 files
    Signature: async handle(req: LoginRequest): Promise<AuthResponse>
    Types in: LoginRequest (src/models/auth.ts) | Types out: AuthResponse (src/models/auth.ts)

[4] AuthConfig — src/config/auth.ts
    class | exported | refs: 14 files
    Implements: ConfigProvider (src/interfaces/config.ts)
    Members: getSecret(), getExpiry(), getIssuer()

[5] AUTH_TOKEN_EXPIRY — src/config/constants.ts
    const | exported | refs: 6 files
    Type: number (value: 3600)
```

**Multi-hop call tree example (callDepth: 2):**

When `callDepth > 1`, the Graph section shows the recursive call tree:
```
Graph:
  [1] processRequest (service.ts)
    → validate (validator.ts) ★
      → sanitize (helper.ts) ◆
    → format (formatter.ts) ★
      → sanitize (helper.ts) ◆
```

With cycle detection:
```
Graph:
  [1] alpha (alpha.ts)
    → beta (beta.ts)
      → alpha (alpha.ts) [cycle]
```

With depth limit markers:
```
Graph:
  [1] handle (entry.ts)
    → process (middleware.ts) [depth limit]
```

**Single-result example:**

```
Search: "jwt token validation" | 1 result | 820/8,000 tokens

TokenService.validateToken — src/auth/tokenService.ts
    async method | exported | refs: 8 files
    Signature: async validateToken(token: string): Promise<JwtPayload | null>
    Extends: BaseValidator (src/base.ts)
    Calls: jwt.verify, AuthConfig.getSecret (src/config/auth.ts)
    Called by: AuthMiddleware.verify (src/middleware/auth.ts), LoginController.handle (src/controllers/login.ts)
    Types in: token (string) | Types out: JwtPayload (src/models/auth.ts)
```

**Why graph-first topology:**
- Copilot reads the topology first and immediately understands how results connect
- When reading per-symbol details afterward, each symbol is contextualized by its role in the topology
- Cross-result patterns (hubs, shared deps, diamonds) are explicit — no mental assembly needed
- Individual source code results stay clean — just code, no metadata noise
- Fewer total tokens than repeating metadata headers on each result

### Source Code Results: Smart Structural Snapshots

Each source code result is a **smart structural snapshot** of its file — not an isolated symbol rip. The snapshot shows the target symbol expanded, plus only the file-level and parent-level content that the target symbol actually references. Everything else is omitted entirely (no collapse indicators, no clutter). The connection graph separately provides the full structural picture.

**How it works:** The TS compiler resolves all identifiers within the target symbol to their declarations. If a declaration lives in the same file (import, constant, class property, type alias), it's included in the snapshot. If it doesn't, it's omitted.

**Single-result example — searching "JWT validation":**

```
// src/auth/tokenService.ts

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/auth';

const TOKEN_EXPIRY = 3600;

export class TokenService extends BaseValidator {
  private secret: string;

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch {
      return null;
    }
  }
}
```

**What's shown and why:**
- `import jwt` — target calls `jwt.verify`
- `import { JwtPayload }` — target references the type
- `const TOKEN_EXPIRY` — target references this constant
- `private secret: string` — target accesses `this.secret`
- `class TokenService extends BaseValidator` — class declaration provides inheritance context
- Target method — fully expanded

**What's omitted (no indicators):**
- 3 imports not used by this method
- 2 root constants not referenced
- 4 class properties not accessed by this method
- 89 sibling methods — not shown at all (connection graph already lists the class members)

**Same-file merging:** When multiple results come from the same file, they merge into ONE snapshot with ALL relevant methods expanded and their combined dependencies shown:

```
// src/auth/tokenService.ts

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/auth';
import { RefreshTokenStore } from './refreshStore';

const TOKEN_EXPIRY = 3600;

export class TokenService extends BaseValidator {
  private secret: string;
  private store: RefreshTokenStore;

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch {
      return null;
    }
  }

  async refreshToken(token: string): Promise<string> {
    const payload = await this.validateToken(token);
    if (!payload) throw new AuthError('Invalid token');
    return jwt.sign({ userId: payload.userId }, this.secret, { expiresIn: TOKEN_EXPIRY });
  }
}
```

Both methods are expanded. The import of `RefreshTokenStore` is included because `refreshToken` uses `this.store`. The `store` property is shown because `refreshToken` accesses it. One file, one snapshot, zero duplication.

**Why smart snapshots instead of isolated symbols:**
- Imports are naturally visible — Copilot sees exactly where dependencies come from
- Root-level constants and class properties used by the method are right there in context
- Reads like actual source code — structurally accurate, just without irrelevant content
- No risk of Copilot missing a dependency that lives in the same file
- Copilot edits via `oldString/newString` replacement — hidden code can never be accidentally overwritten since it would need exact text match
- The connection graph handles everything the snapshot doesn't show (sibling methods, reference counts, cross-file connections)

---

## Why Each Stage Catches What the Others Miss

| Signal | Strengths | Blind Spots |
|---|---|---|
| Vector search | Semantic equivalence, natural language → code, broad recall | Exact terminology, false positives on superficially similar code |
| Voyage Rerank 2.5 | Precise query-chunk relevance, exact symbol names, joint evaluation | No structural awareness, no connection context |
| TS Language Services (metadata) | Real structural connections, cross-result patterns, type resolution | No semantic query understanding — needs high-quality seeds from Stage 2 |

The ordering (vector → rerank → TS metadata enrichment) is intentional: vector search casts a wide net, reranking sharpens to high-confidence results, TS enrichment annotates those results with structural metadata that embeddings can't see. Each stage compensates for the previous stage's blind spots.

---

## Comparison to Existing Tools

| | This System | GitHub Blackbird (Copilot Native) | Sourcegraph / Cody |
|---|---|---|---|
| Chunking | TypeScript AST, hierarchical symbol-level | Character-count arbitrary | Tree-sitter syntactic |
| Type resolution | Full (TS compiler API) | No | No |
| File support | .ts, .tsx, .js, .jsx + CJS/ESM variants | Multi-language | Multi-language |
| Embedding model | Voyage Code 3 | Low-grade internal model | Varies |
| Re-ranking | Voyage Rerank 2.5 + TS metadata enrichment | None known | None in standard path |
| Structural enrichment | TS Language Services (connection graph metadata) | No | Separate navigation tool |
| Result selection | Dual constraint (relevance gate + token budget) | Fixed count | Fixed count |
| Result granularity | Concern-level (specific symbols only) | File/chunk level | File/chunk level |
| Scale target | Single workspace, high fidelity | Millions of repos, breadth | Large multi-language repos |
| Update strategy | Incremental on-query | Pre-built cached index | Pre-built persistent index |

**Key differentiators:**
1. TypeScript compiler API gives full type resolution unavailable to Tree-sitter-based tools
2. Three-stage pipeline (vector → rerank → TS metadata enrichment) bridges semantic and structural understanding
3. Connection graph provides structural context as lightweight metadata instead of bloating results with additional source code
4. Concern-level retrieval returns only relevant symbols, not files or arbitrary chunks
5. Hierarchical AST chunking mirrors the `file_read` tool's proven symbol-scoped navigation model

---

## Known Limitations / Future Work

- Very large monorepos may hit TS compiler memory/time limits — mitigable with background file watcher maintaining a hot index rather than on-query re-indexing
- Scoring weights (0.65 / 0.35) and relevance threshold (0.5) are starting points — tune based on observed result quality

### Future: Intelligent Retrieval Agent (MCP Sampling)

A planned enhancement is an intelligent intermediary that uses MCP `sampling/createMessage` to improve result quality before returning to Copilot. This agent would:

1. Evaluate the quality and relevance of search results against the original query intent
2. Detect low-fidelity results where the pipeline returned suboptimal matches
3. Autonomously reformulate the query and re-run the search pipeline to find better results
4. Return an enriched, higher-quality result set that includes context the initial query missed

The agent would have a **configurable retry limit** for additional query attempts. This feature is deferred from the initial implementation but the tool interface should be designed to accommodate it.

### Future: Sub-Symbol Context Extraction

A more advanced concept under consideration: returning only the specific LINES within a symbol that are relevant to the query (not the full symbol), with semantic markers explaining what was excluded and why. This would dramatically reduce noise but requires:

- Extremely precise per-line relevance determination
- Semantic markers so Copilot understands partial context is intentional
- Safety guarantees that excluded lines won't cause bad edits
- Likely requires the MCP sampling sub-agent to make intelligent exclusion decisions

This is deferred until the full-symbol approach is proven reliable. The partial context extraction approach carries risk of Copilot mistaking partial results for complete methods and overwriting excluded code.

---

## Parser Validation Criteria

### Test Infrastructure

- **Framework:** Vitest
- **Approach:** Data-driven testing — each fixture is a real code file paired with a sidecar JSON file containing expected parser output
- **Location:** `packages/semantic-toolkit/tests/fixtures/` (flat, one folder)
- **Runner logic:** Glob all fixture files, find matching `.expected.json`, parse fixture, assert output matches expected

### Fixture File Plan

Each fixture is a code file + a `.expected.json` sidecar. The JSON contains the expected symbol tree, chunk list, and metadata. Fixture names indicate their primary test target.

#### 1. `functions.ts`
Named functions, anonymous default export, async, generator, overloaded signatures, rest params, generic type params

#### 2. `arrow-functions.ts`
`const` assigned arrows (single-line, multi-line, generic), arrow returning object literal, arrow with destructured params

#### 3. `classes.ts`
Class with constructor, methods (async, static, abstract, private, protected), properties (readonly, static, private `#field`), getters/setters, `extends`, `implements`, nested class

#### 4. `interfaces.ts`
Interface with properties (optional, readonly), method signatures, call signatures, construct signatures, index signatures, `extends` (single and multiple), generic interface

#### 5. `types.ts`
Simple type alias, union, intersection, mapped type, conditional type, template literal type, generic type alias, `infer` keyword

#### 6. `enums.ts`
Numeric enum (auto-increment), string enum, `const enum`, computed member, enum with explicit values

#### 7. `variables.ts`
`const` primitive, `let` with object literal (methods, getters), array destructuring, object destructuring, `as const` assertion, multiple declarators in one statement (`const a = 1, b = 2`)

#### 8. `imports.ts`
Named import, default import, namespace import (`* as`), side-effect import (`import 'polyfill'`), type-only import (`import type`), dynamic import (`import()`), re-export (`export { x } from`), barrel exports (`export * from`), `export type` re-export

#### 9. `root-expressions.ts`
Top-level function calls (`app.use(cors())`), top-level `if`/`for`/`try-catch`, IIFE, top-level `await` (ESM), assignment expressions (`process.env.NODE_ENV = 'test'`)

#### 10. `nesting-deep.ts`
4+ levels: `function > inner function > inner inner > callback`. Verifies correct parent-child relationships and depth tracking at every level

#### 11. `class-nesting.ts`
Class with method containing nested arrow functions, callbacks, and inner class declarations. Tests hierarchy: `class > method > nested arrow > deeper callback`

#### 12. `component-function.tsx`
React function component (`const MyComponent: React.FC<Props> = ...`), `forwardRef`, hooks (`useState`, `useEffect`, `useMemo`), JSX return, component with children prop

#### 13. `component-class.tsx`
React class component (`extends React.Component`), lifecycle methods, `state` property, `render()` with JSX, `static defaultProps`

#### 14. `commonjs.cjs`
`module.exports = { ... }`, `module.exports = function()`, `exports.foo = ...`, `require()` calls, mixed with `const x = require('y')`

#### 15. `namespaces.ts`
`namespace Foo { ... }`, `declare module 'x' { ... }`, nested namespaces, module augmentation (`declare module './existing' { ... }`)

#### 16. `large-class.ts`
Simulates TriviaGame scale: class with 50+ methods, 10+ properties, constructor. Verifies:
- All 50+ methods are extracted as individual chunks
- Class chunk contains declaration + collapsed method signatures
- No chunk exceeds 32K tokens
- Correct parent-child IDs for all methods

#### 17. `expressions-only.ts`
File with zero named symbols — only imports and expression statements (simulates `server.ts` entry point). Verifies:
- Each import → individual chunk
- Each expression → individual chunk
- No artificial grouping

#### 18. `mixed-patterns.ts`
Declaration merging (interface + class same name), overloaded function, ambient declaration (`declare function`), `export =`, dynamic import inside a function

#### 19. `minimal.ts`
Empty file, file with only comments, file with a single `export {}`, file with syntax errors. Verifies graceful handling / empty results.

#### 20. `esm-specific.mts`
Top-level `await`, `import.meta.url`, `import.meta.resolve()`. Verifies ESM-specific constructs parse correctly.

### Validation Assertions Per Fixture

Each `.expected.json` asserts:

```typescript
interface FixtureExpectation {
  /** Expected flat list of all symbols with hierarchy */
  symbols: Array<{
    name: string;
    kind: string;           // 'function' | 'class' | 'method' | 'variable' | 'const' | 'import' | 'expression' | etc.
    depth: number;          // 0 = root, 1 = class member, 2 = nested, etc.
    parentName?: string;    // null for root-level
    hasChildren: boolean;
    exported?: boolean;
    modifiers?: string[];   // 'async', 'static', 'abstract', 'private', 'readonly', etc.
    lineRange: [number, number]; // [startLine, endLine]
  }>;

  /** Expected chunks (one per symbol + one per root-level statement) */
  chunks: Array<{
    breadcrumb: string;     // e.g., "TokenService > validateToken"
    nodeKind: string;
    /** Whether the chunk content contains collapsed children (signatures only) */
    hasCollapsedChildren: boolean;
    /** Whether the chunk includes the full source (no collapsed children) */
    isLeaf: boolean;
    /** Approximate line count of the chunk content */
    lineCount: number;
  }>;

  /** Expected root-level items (imports, expressions, re-exports) */
  rootItems: Array<{
    kind: string;           // 'import' | 'expression' | 're-export' | 'const' | 'variable'
    name: string;           // e.g., 'import:jsonwebtoken', 'app.use(cors())'
    lineRange: [number, number];
  }>;

  /** Aggregate metrics */
  stats: {
    totalSymbols: number;
    totalChunks: number;
    totalRootItems: number;
    maxDepth: number;
    /** Every source line in the file must be covered by exactly one chunk */
    fullCoverage: boolean;
    /** No chunk should exceed 32K tokens (Voyage Code 3 limit) */
    allChunksUnder32K: boolean;
  };
}
```

### Global Validation Rules (applied to ALL fixtures)

These rules are verified by the test runner on every fixture, in addition to the per-fixture expected output:

1. **Full coverage:** Every line in the source file (including comments and blank lines) is covered by at least one root-level chunk. No content is "lost" between chunks. This ensures the chunked representation is a complete view of the file.
2. **No overlap:** No line is covered by two sibling chunks at the same depth level. (Parent chunks CAN cover the same lines as their children — that's the collapsed-children model.)
3. **Source fidelity:** The `fullSource` of each chunk, when extracted from the original file using the chunk's line range, matches exactly. No off-by-one errors.
4. **Hierarchy consistency:** Every chunk with a `parentChunkId` has a parent chunk that lists it in `childChunkIds`. Every root chunk has `parentChunkId: null`.
5. **Token limit:** No chunk's `embeddingText` exceeds 32,000 tokens (estimated at 4 chars/token).
6. **Collapsed children correctness:** For any chunk with body-bearing children, the chunk's `embeddingText` shows those children as signature-only stubs (ending with `;`, no body braces). The children's `fullSource` contains the complete bodies.
7. **Breadcrumb accuracy:** Each chunk's breadcrumb matches `file > parent > ... > name` built from the actual hierarchy.
8. **Deterministic IDs:** Running the parser twice on the same file produces identical chunk IDs.
9. **Root-level isolation:** Each import, expression, and re-export at root level produces exactly one chunk. No merging of unrelated root-level statements.
10. **relevantImports tracking:** For body-bearing chunks, `relevantImports` contains only the imports that the chunk's source code actually references (identifier word boundary match).

### Metrics Dashboard

After all fixtures pass, the test runner should print a summary:

```
Parser Validation Summary
═══════════════════════════════════
Fixtures: 20 passed, 0 failed
Total symbols extracted: 847
Total chunks produced: 923
Coverage: 100% (no uncovered lines)
Max chunk token count: 14,200 (large-class.ts > LargeClass)
Max depth observed: 5 (nesting-deep.ts)
Determinism: ✓ (all IDs stable across 2 runs)
```

---

## Implementation Phases

Each phase must pass its validation gate before the next phase begins. No phase may be considered complete until all tests pass and the metrics dashboard shows green.

### Phase 1 — AST Parser

**Goal:** Parse any TS/JS file into a hierarchical symbol tree with accurate ranges, kinds, modifiers, signatures, and JSDoc.

**Input:** Source file (`.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs`, `.cts`, `.cjs`)
**Output:** `ParsedSymbol[]` — hierarchical tree of symbols with:
- `name`, `kind`, `depth`, `parentName`
- `range` (1-indexed start/end lines)
- `signature` (full type signature with params + return type)
- `modifiers` (async, static, abstract, private, protected, readonly, exported)
- `jsdoc` (extracted JSDoc comment text, if present)
- `children` (nested symbols)
- `exported` (boolean)

**Fixtures:** 1-20 from the Fixture File Plan above (all 20 fixtures test the parser)

**Validation gate:**
- All 20 fixtures pass symbol extraction assertions
- Global rules 1 (full coverage), 2 (no overlap), 3 (source fidelity), 4 (hierarchy consistency), 7 (breadcrumb accuracy), 8 (deterministic IDs), 9 (root-level isolation) all pass
- Every symbol's `signature` matches expected (tested via dedicated fields in `.expected.json`)
- Every symbol's `modifiers` match expected
- JSDoc is extracted where present and matches expected

**Dependencies:** None (foundation layer)

---

### Phase 2 — Chunker

**Goal:** Transform the parser's symbol tree into `CodeChunk[]` with the "content with children collapsed" rule, `embeddingText`, `fullSource`, and `relevantImports`. No metadata preamble — `embeddingText` contains raw source code only.

**Input:** `ParsedSymbol[]` + source file content
**Output:** `CodeChunk[]` per the LanceDB schema (minus `vector`, `contentHash`, `lastModified` which come from Phase 3)

**Key behaviors:**
- Body-bearing children are collapsed to signature-only stubs in the parent chunk's `embeddingText`
- Each root-level statement (import, expression, re-export) becomes its own chunk
- `embeddingText` = raw source with body-bearing children collapsed (signature + `;`)
- `fullSource` = raw complete source of the node
- `relevantImports` = only the imports this chunk actually references (identifier word boundary match)
- Same-line children (line range matches parent exactly) are folded into the parent, not separate chunks

**Test fixtures:** Same fixture files with `.chunker-expected.json` sidecars containing:
- `hasCollapsedChildren` flag
- `isLeaf` flag
- `lineCount`
- `relevantImports` list
- Verification that `fullSource` extracted from original file at `[startLine, endLine]` matches exactly

**Validation gate:**
- All global rules pass (1-10)
- For every parent chunk with body-bearing children: its `embeddingText` contains collapsed child signatures (ending with `;`), NOT their bodies
- For every leaf chunk: `embeddingText` equals `fullSource`
- `relevantImports` for each chunk only contains imports where at least one identifier from the import is used in the chunk's source code
- No chunk's `embeddingText` exceeds 32K tokens
- **No metadata preamble** — `embeddingText` is raw source code only

**Dependencies:** Phase 1 (Parser)

---

### Phase 3 — TypeScript Language Services Integration

**Goal:** Use the TS compiler's language services to resolve structural metadata for any given symbol: full signatures, type hierarchy, outgoing calls (multi-hop recursive tree), incoming callers (multi-hop recursive tree), reference count, type flows, and class members.

**Input:** Symbol name + file path + ts-morph project + `TsLsConfig` (configurable `callDepth`)
**Output:** `SymbolMetadata` containing:
- `signature` (complete type signature)
- `modifiers` (async, static, exported, etc.)
- `typeHierarchy` (extends, implements, subtypes)
- `outgoingCalls` (recursive tree of symbols this symbol calls — depth controlled by `callDepth`)
- `incomingCallers` (recursive tree of symbols that call this symbol — depth controlled by `callDepth`)
- `referenceCount` (how many files reference this symbol)
- `typeFlows` (where parameter types come from, where return types go)
- `members` (for classes/interfaces: methods + properties list)

**Call depth configuration (`callDepth`):**
- `1` (default) — immediate callers/callees only (backward compatible with single-hop behavior)
- `2`, `3`, etc. — that many hops of recursive traversal
- `-1` — full transitive traversal (follow all hops, with cycle detection)

**Recursive tree structure:** Each `OutgoingCall` entry contains a nested `outgoingCalls: OutgoingCall[]` array, forming a tree. Each `IncomingCaller` entry contains a nested `incomingCallers: IncomingCaller[]` array. This preserves full path context (which symbol calls which through which chain).

**Cycle detection:** When a target symbol appears as an ancestor in the current call chain (back-edge), the entry is marked `cyclic: true` with empty children. Rendered as `[cycle]` in the connection graph. Handles self-recursion, mutual recursion, and multi-level cycles.

**Depth limit markers:** When traversal stops at the `callDepth` boundary and the target has further resolvable calls, the entry is marked `depthLimited: true`. This tells consumers there are unexpanded calls beyond what's shown.

**Constructor call resolution:** `new Foo()` expressions are resolved to `Foo`'s explicit constructor declaration. Constructor calls appear in outgoing call trees alongside regular function/method calls.

**Type hierarchy resolution:** `resolveTypeHierarchy()` takes a class/interface name and returns a `TypeHierarchy` with:
- `extends?` — parent class (classes only). SymbolRef to the declaration.
- `implements[]` — interfaces the class implements, or parent interfaces an interface extends. Array of SymbolRef.
- `subtypes[]` — all classes/interfaces in the project that extend or implement this symbol. Resolved by scanning all project source files and verifying heritage clauses resolve to the exact target declaration (prevents same-name collisions across files).
- `isAbstract?` — true when the queried class is abstract. Undefined for concrete classes and interfaces.
- `typeParameters[]` — rich generic type parameter list. Each entry has `name` (e.g. 'T'), optional `constraint` (e.g. 'Entity'), optional `default` (e.g. 'string'). Empty array for non-generic types.

SymbolRef entries in heritage references (extends, implements, subtypes) carry `isAbstract?: boolean` when the referenced class is abstract, enabling consumers to immediately identify abstract parents/subtypes without additional lookups.

For standalone classes/interfaces with no hierarchy, all arrays are empty and `extends` is undefined.

**Cross-file reference resolution:** `resolveReferences()` takes any named symbol (function, class, interface, type alias, enum, variable, method, property) and returns a `References` object:
- `totalCount` — total number of reference occurrences across all files.
- `fileCount` — number of distinct files referencing the symbol.
- `files[]` — per-file breakdown (`filePath` + `lines[]`), sorted by file path, lines sorted ascending.

The definition itself is excluded from references (consumers already know the definition location from `SymbolMetadata.symbol`). Same-file usages ARE included (e.g., a function calling itself or another symbol in the same file). References from `.d.ts` and `node_modules` are filtered out.

**Future enhancements (TODO in code):**
- Mixin detection: functions returning class expressions extending their base parameter.
- Full generic instantiation tracking: find all sites where generic types are instantiated with concrete type arguments.

**Type flow resolution:** `resolveTypeFlows()` takes a function, method, or class name (for constructors) and returns a `TypeFlow` with:
- `symbol` — SymbolRef identifying the callable.
- `parameters[]` — each parameter has `name`, raw `type` text (from annotation), and `resolvedTypes[]` (user-defined types extracted from the annotation).
- `returnType` — same structure as a parameter but named 'return'. Undefined for constructors and void functions without explicit annotation.
- `referencedTypes[]` — deduplicated union of all user-defined types across params and return, sorted by filePath then line.

Resolution uses a hybrid approach:
1. **TypeNode-based** extraction catches type aliases and enum names that TypeScript's type checker expands (e.g., `UserId = number` → node has `UserId`, checker has `number`). Import specifiers are followed through to the original declaration file, including through multi-level barrel re-export chains (`export *`, named re-exports).
2. **Type-based** deep traversal handles unions, intersections, tuples, arrays, nested generics, and function-typed parameters using the TypeChecker's semantic model.
3. Both paths share a visited set keyed by `filePath:line` for cycle detection and deduplication.

Type categories handled: simple type references, type aliases, enums, union types (`string | User`), intersection types (`User & { admin: boolean }`), generic types with unlimited nesting (`Map<UserId, Set<Permission>>`), tuple types (`[User, Token]`), array types (`User[]`), function-typed parameters (`(entry: AuditEntry) => Token`). Anonymous types (`__type`) from intersection with object literals are filtered out. Primitives and built-in types (Promise, Array, Map, Set, Record, etc.) are skipped.

**Member resolution:** `resolveMembers()` takes a class or interface name and returns `MemberInfo[]` — an ordered list of all members, sorted by source position. Each `MemberInfo` contains:
- `name` — member name (empty string for index/call/construct signatures).
- `kind` — one of: `method`, `property`, `getter`, `setter`, `constructor`, `indexSignature`, `callSignature`, `constructSignature`.
- `line` — 1-indexed line number of the declaration.
- `type` — type text (return type for methods/getters, parameter type for setters, parameter signature for constructors, full signature text for index/call/construct signatures). Undefined when no annotation exists.
- `modifiers[]` — visibility and other modifiers: `public`, `private`, `protected`, `static`, `abstract`, `readonly`, `async`, `override`.

Supported for both classes and interfaces. Class members include: constructors (with parameter signature), properties (including ECMAScript private `#field`), methods, get/set accessors, and index signatures. Interface members include: property signatures, method signatures, index signatures, call signatures, and construct signatures.

**Signature + Modifier resolution:** `resolveSignature()` takes any named symbol and returns a `SignatureInfo` with:
- `signature` — complete type signature text, format varies by kind:
  - Functions/methods: `name<T>(param: Type): ReturnType` (includes type parameters, parameter types, return type)
  - Classes: `class Name<T> extends Base implements IFace` (includes heritage clauses)
  - Interfaces: `interface Name<T> extends Parent` (includes heritage clauses)
  - Type aliases: `type Name<T> = UnderlyingType` (includes type parameter and full type body)
  - Enums: `enum Name` or `const enum Name`
  - Variables: `const/let/var name: Type`
  - Properties: `name: Type`
  - Get accessors: `get name(): Type`
  - Set accessors: `set name(value: Type)`
- `modifiers[]` — keyword modifiers plus semantic `exported` flag: `public`, `private`, `protected`, `static`, `abstract`, `readonly`, `async`, `override`, `declare`, `default`, `exported`.

Supported symbol kinds: functions, methods (class + interface), classes, interfaces, type aliases, enums, variables, properties (class + interface), get/set accessors. Declaration lookup searches top-level declarations first, then scans all classes and interfaces for nested members, then scans namespace/module declarations for namespace-scoped symbols.

The `exported` modifier is a semantic flag (not a keyword modifier) — derived from `isExported()` for most declarations and from the parent `VariableStatement` for variable declarations.

**Same-name disambiguation:** Outgoing calls are grouped by `filePath:name:line` to avoid merging same-named methods in different classes within the same file.

**User code filtering:** Declarations from `.d.ts` files and `node_modules` are excluded from call resolution.

**Test fixtures:** Multi-file fixtures:

- **`ts-ls/call-chain/`** — 4 files: service → validator/formatter → helper. Verify 1-hop outgoing/incoming calls. ✅ Implemented
- **`ts-ls/multi-hop/`** — 4 files: entry → middleware → service → helper. Verify callDepth 1/2/3/-1, depthLimited markers. ✅ Implemented
- **`ts-ls/cycle/`** — Mutual recursion (alpha ↔ beta) + self-recursion (factorial). Verify cycle detection at all depths. ✅ Implemented
- **`ts-ls/constructor/`** — Class with constructor calling helper. Verify `new Foo()` resolves as outgoing call. ✅ Implemented
- **`ts-ls/type-hierarchy/`** — 5 files: interfaces (Entity, Serializable, Auditable) → models (abstract BaseModel, User, AdminUser) → diamond (AuditedModel) → standalone → generics (Repository\<T extends Entity, ID = string\>, Container\<T\>, Queryable\<T extends Entity\>). Verify extends, implements, subtypes, diamond pattern, standalone, isAbstract on TypeHierarchy and SymbolRef, rich generic type parameters (name+constraint+default), error cases. ✅ Implemented
- **`ts-ls/references/`** — 5 files: utils (formatDate, formatTime, DateString, Timestamped) → user-service, order-service, report → isolated. Verify cross-file reference count, per-file line breakdown, same-file usage inclusion, definition exclusion, type alias references, interface implements references, zero-reference symbols, class references, error handling. ✅ Implemented
- **`ts-ls/type-flows/`** — 3 files: types (User, Role, Token, AuditEntry, Permission, UserId, Status) → functions (14 functions covering simple, union, intersection, generic, nested generic, tuple, array, function-typed params) → service (UserService class with constructor and methods). Verify parameter type provenance, return type provenance, type alias resolution through imports, enum resolution, `__type` anonymous filtering, function-typed callback extraction, deduplication across params/return, constructor handling (no return type), deeply nested generic unwrapping (Map<UserId, Set<Permission>>), union inside generic (Promise<User | null>), error handling. ✅ Implemented
- **`ts-ls/members/`** — class with methods/properties. Verify member listing. ✅ Implemented
  - 2 files: user-service (abstract class UserService extending BaseService with constructor, public/private/protected/static/readonly/abstract/override/async methods, properties, ECMAScript private fields, getters, setters, index signature) + repository (generic interface Repository with readonly/regular properties, method signatures, index signature, call signature, construct signature). Also tests Empty interface (zero members) and Config interface (properties only). 36 tests covering all member kinds, modifiers, types, error handling.
- **`ts-ls/signature/`** — 1 file: all-kinds (exported/non-exported functions, generic functions, async functions, classes with heritage, interfaces with extends, type aliases, const enums, regular enums, const/let/var variables, class methods, class properties, get/set accessors, interface methods, interface properties). Verify complete signature text and modifier extraction for every symbol kind. ✅ Implemented
  - 34 tests covering: function signatures (params + return type), generic type parameters, class heritage clauses (extends + implements), interface extends clauses, type alias bodies, enum const detection, variable declaration kinds, accessor signatures, modifier detection (async, static, exported, abstract, readonly, override, declare, default, private, protected), exported detection for all declaration types, error handling for non-existent symbols.
- **`ts-ls/cross-module/`** — re-exports, barrel files, declaration merging. Verify resolution through indirection. ✅ Implemented
  - 7 files: types (Entity, EntityId, Status, BaseService) → user (User, UserService, createDefaultUser, default export createUser) → config (declaration merging: Config interface + Config namespace) → config-ext (cross-file augmentation via `declare module`) → sub-barrel (`export *` wildcard + named re-exports) → index (multi-level barrel: `export *` from sub-barrel, namespace re-export `export * as configNs`, default-as-named `export { default as createUser }`, type-only renamed re-export `export type { Entity as IEntity }`) → consumer (imports everything through top-level barrel). 38 tests verifying all 6 resolvers through multi-level barrel indirection: call hierarchy (outgoing/incoming through barrel, multi-hop), type hierarchy (extends/implements through imports, abstract, type parameters), references (cross-file counts through wildcard and named re-exports), type flows (type alias resolution through barrel chain, type-only re-exports), members (class/interface members), signature (all symbol kinds), declaration merging (interface+namespace, cross-file augmentation), namespace re-export (namespace member signature and references), and default-as-named re-export (call hierarchy through barrel).
- **`ts-ls/aliases/`** — alias tracking fixture. Verify import/export alias graph resolution. ✅ Implemented
  - 9 files: core (Widget, WidgetId, createWidget, WidgetService, default export defaultFactory) → import-rename (Widget→UIWidget, createWidget→makeWidget, WidgetService→Svc) → export-rename (Widget→Component, createWidget→buildComponent, WidgetId→ComponentId type-only, default→createDefaultWidget) → barrel (Component→Element, buildComponent→createElement multi-hop rename) → consumer (imports through barrel using final alias names) → namespace-import (`import * as CoreWidgets`) → type-only (Widget→ReadonlyWidget, WidgetId→ReadonlyId type-only import renames) → default-import (consumer-chosen name `makeDefault`) → namespace-alias (`import SW = WidgetNS.SpecialWidget`). 23 tests covering: import renames, export renames, multi-hop export renames, type-only export renames, type-only import renames, default-as-named re-exports, namespace imports (direct and through barrels), namespace alias (import = syntax), multi-hop alias chains (Widget→Component→Element, createWidget→buildComponent→createElement), bidirectional lookup, deduplication, sort order, canonical reference, error handling.
- **`ts-ls/ambients/`** — ambient and global augmentation fixture. Verify declare global, declare module, .d.ts ambient detection. ✅ Implemented
  - 5 files: global-augment (declare global with function, variable, interface, namespace members) → global-augment-2 (second declare global block with function, interface members) → module-augment (declare module 'my-external-lib' with interfaces + function, declare module 'my-config-lib' with interface + variable) → ambient-types.d.ts (ambient function, variable, interface, type alias, class, enum, namespace declarations) → core (module that could be augmented). 25 tests covering: global block discovery (multiple blocks across files), member extraction and kind classification, function signatures in global blocks, module augmentation discovery and module name extraction, member listing in module augmentations, .d.ts ambient declarations (all kinds: function, variable, interface, type, class, enum, namespace), sort order, node_modules exclusion, regular namespace filtering, line numbers, member ordering within blocks.
- **`ts-ls/multi-project/`** — multi-project / tsconfig structure fixture. Verify solution-style config detection, composite flags, project references, source file discovery, outDir/rootDir resolution, and reverse dependency graph. ✅ Implemented
  - 3 tsconfig.json files: root (solution-style with references to shared + app), shared (composite with outDir, exports types and utility), app (composite with outDir, references shared, imports from shared). 5 source files across 2 sub-projects. 29 tests covering: tsconfig discovery (count, paths, sort order), solution-style detection (root flagged, sub-projects not), composite flag resolution, project reference resolution (root→shared+app, app→shared, shared→none), source file discovery (per-project, no .d.ts, no node_modules, solution-style has zero), outDir/rootDir resolution, reverse dependency graph (shared referenced by root+app, app referenced by root, sorted), extends chain, edge cases (non-existent workspace, empty references).
- **`ts-ls/type-guards/`** — type guard and narrowing construct fixture. Verify detection of all guard kinds in function bodies. ✅ Implemented
  - 2 files: types (User, Admin, Guest, Shape discriminated union, Result generic union) → guards (all guard patterns: user-defined type guard `isUser`, assertion function `assertAdmin`, assertDefined without target type, typeof guards in processInput, instanceof guards in handleError, in-operator guard in describeAnimal, switch-based discriminated union in getArea with exhaustiveness check, if-based discriminant in handleResult, nullish guards `!= null` and `!== null`, equality narrowing, Array.isArray, early-return guard clauses with return and throw, standalone exhaustiveness check, compound || guard combining typeof checks, compound && guard combining nullish + instanceof). 24 tests covering: user-defined return-type guards (narrowedTo, isReturnTypeGuard flag), assertion functions (with and without target type), typeof (multiple in one function), instanceof (multiple), in-operator, discriminated unions via switch (all 3 cases), exhaustiveness checks (switch default + standalone), discriminant via if (boolean literal), nullish guards (`!=` and `!==`), equality narrowing, Array.isArray, early-return guard clauses (return and throw), compound guards (|| and &&), symbol reference accuracy, sort order by line, error handling.

**Validation gate:**
- Call hierarchy matches expected for all test scenarios at all configured depths
- Cycle detection terminates correctly without infinite loops
- Depth limit markers appear only on targets with further resolvable calls
- Constructor calls resolve correctly through `new` expressions
- Type hierarchy resolves extends/implements/subtypes correctly
- Reference counts are accurate (±0 tolerance)
- Type flows trace parameter origins and return type destinations correctly, including type aliases, enums, nested generics, function-typed params, and deduplication ✅  
- Member listings are complete and ordered ✅
- Signature text is accurate for every supported symbol kind, modifier lists are complete ✅
- All resolvers work correctly through multi-level barrel re-exports, wildcard re-exports, namespace re-exports, default-as-named re-exports, declaration merging, and type-only re-exports ✅
- Alias tracking resolves import renames, export renames, type-only aliases, default-as-named, namespace imports, namespace aliases, multi-hop chains, bidirectional lookup, deduplication ✅
- Ambient resolution detects declare global blocks, declare module blocks, .d.ts ambient declarations, member extraction and classification, sort order, node_modules filtering ✅
- Project structure resolves tsconfig discovery, solution-style detection, composite flags, project references, source files per project, outDir/rootDir, reverse dependency graph, extends chains ✅
- Type guard detection resolves all 12 guard kinds: user-defined, assertion, typeof, instanceof, in-operator, discriminant (switch + if), nullish, equality, Array.isArray, early-return, exhaustive, compound. Boolean literal discriminants supported. Early-return only triggers on negative guard clauses ✅
- **`ts-ls/callbacks/`** — callback / higher-order function tracking fixture. Verify callback detection, HOF parameter analysis, function-returning HOFs, .bind(this) unwrapping, and cross-file callback discovery. ✅ Implemented
  - 2 files: main (pure named functions: double, isEven, toUpper, logError, parseJSON; array method usages: map, filter; promise chain usages: then, catch; custom HOFs: retry, debounce, compose, withLogging; event-style API: EventBus.on; .bind(this) pattern: Processor.format; function-returning HOFs: multiplier, debounce, compose; multi-callback-param function: onResult) → consumer (cross-file imports and callback usages of double, isEven, logError, parseJSON through array methods, promise chains, and custom HOFs). 28 tests covering: array method callbacks (map, filter — parameter index 0), promise chain callbacks (then, catch — parameter index 0), custom HOF callbacks (retry, debounce, on — correct parameter indices), HOF parameter detection (retry 1 param, debounce 1 param, compose 2 params, onResult 2 params, withLogging 1 param, non-HOF returns empty), function-returning HOFs (multiplier returns function with type text, debounce returns function, compose returns function, non-returning function returns false), .bind(this) detection (boundWithBind flag, calledBy forEach, parameterIndex 0), cross-file callback detection (double in consumer map/retry, isEven in consumer filter, parseJSON in consumer then, logError in consumer catch, double in consumer retry), symbol metadata accuracy, error handling for non-existent symbols, aggregated usage counts across both files.
- Callback tracking detects project-wide callback usages through array methods, promise chains, custom HOFs, event-style APIs, .bind(this) wrappers, handles `as` type assertion unwrapping, identifies HOF callback parameters and function-returning HOFs ✅
- **`ts-ls/guard-callbacks/`** — guard callback tracking fixture. Verify detection of type guard functions used as callbacks, with narrowing metadata, HOF predicate parameter detection, and cross-file discovery. ✅ Implemented
  - 4 files: types (Person = User | Admin | Guest discriminated union, Animal = Cat | Dog discriminated union) → guards (type guards: isUser, isAdmin, isCat with `is` predicates; assertDefined, assertUser with `asserts` predicates; non-guard formatPerson control; array .filter() usages with isUser/isAdmin/isCat; .forEach() with assertDefined; .find() with isUser; custom HOFs: filterByGuard with `item is S` predicate param, assertAll with `asserts item is T` predicate param; non-HOF processPeople control) → consumer (cross-file imports and guard callback usages: .filter with isUser/isAdmin/isCat, .find with isUser, .forEach with assertDefined, filterByGuard with isUser). 24 tests covering: guard .filter() detection (isUser/isAdmin/isCat — predicateKind 'is', predicateType, parameterIndex), guard .find() detection, assertion guard .forEach() detection (predicateKind 'asserts'), assertUser not-as-callback control, custom HOF guard passing (filterByGuard parameterIndex 1, assertAll parameterIndex 1), narrowed output type capture (.filter(isUser) → User[], input type contains union), HOF predicate parameter detection (filterByGuard hasTypePredicate + predicateType, assertAll assertion parameter, processPeople non-predicate control), non-guard function empty results, cross-file detection (isUser filter/find/filterByGuard in consumer, isAdmin filter, isCat filter, assertDefined forEach), symbol metadata accuracy, error handling, aggregated counts (isUser ≥ 5 sites, assertDefined ≥ 3 sites).
- Guard-callback tracking detects type guard functions (is/asserts predicates) used as callbacks in .filter/.find/.forEach/custom HOFs, captures predicateKind/predicateType/inputType/narrowedOutputType, identifies HOF parameters accepting type predicates, works project-wide across files ✅
- **`ts-ls/advanced-types/`** — advanced type structure extraction fixture. Verify detection and structural analysis of conditional types, mapped types, template literal types, utility types, union/intersection types, indexed access types, keyof/typeof operators, infer types, and simple type aliases. ✅ Implemented
  - 1 file: types (conditional: IsString, TypeName nested multi-branch, UnpackPromise/UnpackArray/FunctionReturnType with infer; mapped: Nullable, ReadonlyDeep +readonly, Mutable -readonly, RequiredFields -?, Getters with as-clause key remapping; template literal: EventName, PropGetter with Capitalize, CssProperty, ApiEndpoint multi-span; utility: PartialUser Partial, RequiredUser Required, ReadonlyUser Readonly, UserRecord Record, UserNameEmail Pick, UserWithoutEmail Omit, NonNullString NonNullable, FnReturn ReturnType, FnParams Parameters; union: StringOrNumber, HttpMethod string literal union; intersection: WithTimestamp; indexed access: UserName, UserIdOrName; keyof: UserKeys; nested: DeepPartial recursive conditional+mapped, IsArray nested conditional; simple: UserId, Callback). 44 tests covering: conditional type detection (checkType/extendsType/trueType/falseType/inferTypes for IsString, TypeName, UnpackPromise, UnpackArray, FunctionReturnType), depth expansion (children at depth 2, no children at depth 1), mapped type detection (keyName/constraint/valueType, +readonly/-readonly, -? optional modifier, as-clause nameType), template literal detection (spans, type interpolation, Capitalize), utility type detection (all 9 known utilities with name and typeArguments), union/intersection detection (children expansion at depth 2, no children at depth 1), indexed access detection, keyof detection, simple type classification (number, function type), nested type depth control (DeepPartial mapped child at depth 3, IsArray conditional at depth 2), symbol metadata accuracy (name/filePath/line, typeText content), error handling for non-existent aliases, typeParameters extraction.
- Advanced type analysis extracts internal structure of type alias declarations: conditional types (check/extends/true/false branches, infer types), mapped types (key/constraint/value, readonly/optional modifiers, as-clause remapping), template literal types (spans with type and literal text), utility types (name + type arguments from known set of 26 utilities), union/intersection/indexed-access/keyof/typeof/infer/simple classification, configurable nesting depth via typeDepth parameter ✅
- **`ts-ls/enum-members/`** — enum member extraction fixture. Verify detection and value resolution for all enum patterns: numeric auto-increment, numeric explicit, string, const, mixed/heterogeneous, computed, ambient (declare), negative values, auto-increment after explicit reset, empty enum, single-member enum. ✅ Implemented
  - 1 file: enums (Direction numeric auto-inc 0–3, HttpStatus explicit 200/404/500, Color string "RED"/"GREEN"/"BLUE", Flags const enum 0/1/2/4, Mixed heterogeneous 0 + "hello", Computed computed expressions 1+2/"hello".length + literal 10, External declare enum auto-inc 0–2, Temperature negative -10/0/20/40, Sequence auto-inc reset A=0 B=1 C=100 D=101 E=102, Empty no members, SingleMember "ONLY"). 24 tests covering: auto-increment values (0/1/2/3), explicit numeric values, string values with quotes, isConst detection (true for const enum), isComputed detection (true for expressions, false for literals), isDeclare detection (true for ambient), negative value handling (PrefixUnaryExpression), auto-increment reset after explicit value, empty enum (0 members), single-member enum, symbol metadata (name/filePath/line), member line ordering, error handling for non-existent enums.
- Enum member resolution extracts member names, values (as source text), isComputed flag (true for non-literal initializers), isConst/isDeclare on the enum declaration, handles numeric auto-increment tracking including reset after explicit values, negative numeric literals via PrefixUnaryExpression detection ✅
- **`ts-ls/unicode-identifiers/`** — Unicode/confusable identifier detection fixture. Verify detection of non-ASCII identifiers, script analysis, mixed-script warnings, homoglyph/confusable pair detection, zero-width character detection, Bidi awareness, NFC normalization, scope-aware analysis, and severity classification. ✅ Implemented
  - 1 file: identifiers (pure ASCII controls: normalVar/normalFunc/NormalClass/NormalInterface; single-script Latin Extended: café/résumé/naïve; Cyrillic-only: функция/данные; mixed-script Latin+Cyrillic: pаyment; mixed-script Latin+Greek: αlpha_value/Δx; confusable pairs: score vs sсore (Cyrillic с), port vs рort (Cyrillic р); zero-width ZWNJ U+200C: foo‌bar; zero-width ZWJ U+200D: test‍name; scope-aware: résultat in function:processData, état in class:DataService, näme in interface:Configurätion; Greek-only: π; CJK-only: 世界; combining diacritical marks: café_two via e+U+0301; enum with accented name: État). 41 tests covering: basic structure (filePath, arrays, pure ASCII exclusion), single-script non-ASCII detection (café/résumé/naïve — Latin scripts, info severity), Cyrillic-only detection (функция/данные — Cyrillic scripts, info severity), mixed-script detection (pаyment Latin+Cyrillic, αlpha_value Latin+Greek, Δx Latin+Greek — warning+ severity), confusable pair detection (score/sсore with Cyrillic reason, port/рort — critical severity, pair reason contains 'Cyrillic'), zero-width character detection (ZWNJ/ZWJ — hasZeroWidth true, critical severity), scope detection (file/function:processData/class:DataService/interface:Configurätion), NFC normalization (precomposed café, combining diacritical café_two), CJK detection (世界 — CJK scripts, info severity), Greek-only detection (π — Greek scripts, info severity), enum with Unicode name (État — info severity), no false positives (no hasBidiOverride on normal identifiers, no hasZeroWidth on accented identifiers, pure ASCII excluded), line numbers validation, count sanity (≥10 non-ASCII identifiers, ≥2 confusable pairs).
- Unicode/confusable identifier analysis scans all identifier declarations for non-ASCII characters, classifies by Unicode script (Latin/Cyrillic/Greek/CJK/Hangul/Arabic/Devanagari/Emoji/Symbol), detects mixed-script usage, identifies confusable/homoglyph pairs via skeleton normalization (Latin↔Cyrillic/Greek mappings), detects zero-width characters (ZWNJ/ZWJ) in identifiers, provides scope-aware analysis (file/function/class/interface), NFC-normalizes identifiers, classifies severity (info for single-script non-ASCII, warning for mixed-script, critical for confusable/zero-width/Bidi) ✅
- **`ts-ls/side-effects/`** — Module-level side effect detection fixture. Verify detection of all side effect kinds: side-effect imports, top-level function calls, IIFEs, top-level assignments to globals, top-level await expressions, and conditionality tracking. ✅ Implemented
  - 3 TS files (effects.ts, polyfill.ts, setup.ts) + 1 JS file (effects.js). effects.ts covers: side-effect imports (`import './polyfill'`, `import './setup'`), top-level calls (console.log, console.warn, process.stdout.write), IIFEs (classic function IIFE, arrow IIFE), global assignments (process.env.NODE_ENV, process.env.DEBUG), top-level await (const config = await fetch, await new Promise), conditional side effects in if/try/catch/for-of blocks. effects.js covers: side-effect import (`import './polyfill'`), console.log call, IIFE, globalThis assignment, JSDoc support. 44 tests covering: basic structure (filePath for TS/JS, effects array), side-effect imports (polyfill/setup detection, no false positives on normal imports, JS detection, not conditional), top-level function calls (console.log/warn, process.stdout.write, JS detection, source text), IIFEs (classic/arrow/JS detection, not conditional), top-level assignments (process.env.NODE_ENV/DEBUG, globalThis in JS, full text), top-level await (await fetch, await Promise, not conditional — handles both ExpressionStatement and VariableStatement with await initializer), conditional effects (if-block/try-block/catch-block/for-of loop all marked conditional), non-side-effects (function/class/interface/type/enum/normal-import declarations excluded), line number validation (positive/source order), count sanity (≥2 imports, ≥3 calls, ≥2 IIFEs, ≥2 assignments, ≥2 awaits, ≥3 conditional, JS detection, all 5 effect kinds across both files).
- Module-level side effect analysis detects all module-scope side effects: side-effect imports (bare `import 'x'` without bindings), top-level function calls (console/process/custom), IIFEs (classic function and arrow), global/process.env assignments, top-level await (both standalone expressions and variable declarations with await initializer), with conditionality tracking (if/try/catch/for/while/switch bodies marked conditional). Returns SideEffectAnalysis with filePath and effects array, each entry having kind, text, line, optional targetName, and isConditional flag ✅

**Dependencies:** Phase 1 (Parser creates ts-morph project)

---

### Phase 4 — Smart Structural Snapshots

**Goal:** Given a set of target symbols in a file, produce a dependency-aware snapshot that shows only the target symbols (expanded) plus the file-level content they actually reference (imports, constants, class properties, type aliases). Merge multiple targets from the same file into one snapshot.

**Input:** Target `CodeChunk[]` (from one file) + parsed symbol tree + TS LS reference resolution
**Output:** String snapshot — valid source code with only referenced content shown, unreferenced content omitted entirely (no collapse indicators)

**Key behaviors:**
- TS compiler resolves all identifiers within target symbols to their declarations
- Same-file declarations are included; cross-file declarations are omitted
- Multiple targets from the same file merge into one snapshot
- Class declaration wrapper is included when targets are class members
- No collapse indicators or `...` — just clean code

**Test fixtures:**

- **`snapshot/single-method.ts`** — Class with 10 methods. Target: 1 method. Verify only that method + its referenced imports/properties shown.
- **`snapshot/two-methods.ts`** — Class with 10 methods. Target: 2 methods that share some imports. Verify merged snapshot with both methods + union of their imports.
- **`snapshot/root-constant.ts`** — File with imports + constants + functions. Target: 1 function that uses 2 of 5 constants. Verify only those 2 constants + relevant imports shown.
- **`snapshot/no-dependencies.ts`** — Function that uses no imports or constants. Verify just the function (+ class wrapper if applicable).
- **`snapshot/cross-reference.ts`** — Method A calls method B in same class. Both are targets. Verify both shown, dependencies are union of both.
- **`snapshot/expressions-file.ts`** — Target is a root expression. Verify just that expression + its imports shown.

**Validation gate:**
- Every identifier in each target symbol that resolves to a same-file declaration has that declaration present in the snapshot
- No unreferenced declarations appear in the snapshot
- Merged snapshots contain no duplicate content
- Snapshot is syntactically valid source code (parseable by TypeScript)
- File header comment (`// src/path/file.ts`) is present

**Dependencies:** Phase 1 (Parser) + Phase 3 (TS LS)

---

### Phase 5 — Connection Graph

**Goal:** Given a set of result symbols (post-retrieval), assemble a graph-first connection graph showing topology, patterns, and per-symbol details. Uses ★ for in-result symbols and ◆ for shared dependencies across 2+ results.

**Input:** Result `CodeChunk[]` + `SymbolMetadata` for each result (from Phase 3)
**Output:** Plain text connection graph in graph-first topology format:
1. **Graph section** — call chain topology (rendered from recursive `OutgoingCall` tree)
2. **Patterns section** — hubs, shared deps, diamonds, cycles
3. **Details section** — per-symbol metadata (kind, modifiers, signature, types)

**Key behaviors:**
- Graph section renders the recursive call tree (multi-hop when `callDepth > 1`)
- Cycle entries rendered with `[cycle]` marker
- Depth-limited entries rendered with `[depth limit]` marker
- Constructor calls (`new Foo()`) appear in the call tree
- Cross-result connections marked with ★ in the graph section
- Shared dependencies (referenced by 2+ results but not in results) marked with ◆
- Patterns section explicitly names structural insights (hubs, shared deps, diamonds)
- Summary line: `Search: "query" | N results across M files | T/B tokens`

**Test fixtures:**

- **`graph/single-result.json`** — One result symbol + its TS LS metadata. Verify single-result format.
- **`graph/multi-result.json`** — 5 results with inter-connections. Verify ★ markers, ◆ markers, shared dependencies section.
- **`graph/no-connections.json`** — 3 results with no cross-references. Verify clean output with no markers.
- **`graph/shared-type.json`** — 4 results that all reference the same type. Verify ◆ on type references + shared dependencies section.

Input fixtures are JSON (pre-computed metadata), not source files — connection graph assembly is pure data transformation.

**Validation gate:**
- ★ markers appear on exactly the symbols that are in the result set
- ◆ markers appear on exactly the symbols referenced by 2+ results that are NOT in the result set
- Shared dependencies section lists all ◆ symbols with correct usage counts
- Summary line token count matches actual output length
- Output matches the exact format from the blueprint examples

**Dependencies:** Phase 3 (TS LS)

**Implementation decisions:**

- **Module structure:** `src/graph/` with `types.ts` (input/output interfaces), `topology.ts` (call tree walking, ★/◆ assignment), `patterns.ts` (hub/shared dep/shared type/diamond/cycle detection), `render.ts` (text rendering in blueprint format), `index.ts` (main entry point)
- **Token counting:** Simple estimation via `Math.ceil(output.length / 4)` — dependency-free, sufficient for budget tracking
- **Two rendering formats:** Single-result format (compact inline: symbol + file, kind/modifiers/refs, Calls/Called by, Types in/out) and multi-result format (Summary → Graph → Patterns → Details). Single-result omits empty Graph/Patterns sections to save tokens.
- **callDepth:** Not a parameter on the graph API. The renderer traverses whatever depth exists in the `SymbolMetadata.outgoingCalls` tree, which was already built by Phase 3 using the user's configured `callDepth` extension setting.
- **Diamond detection:** Traverses the full depth of the outgoing/incoming call trees in the metadata. Scales naturally with the user's configured call depth.
- **Shared type detection:** Uses `typeFlows.referencedTypes` from each result's metadata to identify types referenced by multiple results.

---

### Phase 6 — Symbol Lookup

**Goal:** Detect `symbol = ...` prefix in queries and resolve to matching symbols without using vector search or re-ranking.

**Input:** Query string (e.g., `symbol = TokenService > validateToken`)
**Output:** Matching `CodeChunk[]` with connection graph + smart snapshot (same output format as full pipeline)

**Implementation decisions:**

- **Parsing strategy:** Uses fresh parsing (`parseFiles` + `chunkFile`) for now. **TODO: Replace with indexed lookup in Phase 7.** Once the LanceDB index exists (Phase 7), the fresh parsing path must be replaced entirely with indexed chunk retrieval — there should be only one code path, not two parallel systems. Code will include explicit `// TODO(Phase 7): Replace fresh parsing with indexed chunk retrieval` markers.
- **Case sensitivity:** Strict exact case matching. On zero results, a case-insensitive re-search is performed. If near-matches are found, the error includes a helpful hint (e.g., `No symbol "validatetoken" found. Did you mean "validateToken" (src/auth/tokenService.ts:20)?`). If nothing matches case-insensitively either, a clean "symbol not found" error is returned.
- **File path matching:** Strict exact relative path matching. On zero results, partial matching (basename/suffix) is performed. If near-matches are found, the error includes hints (e.g., `No file "tokenService.ts" found. Similar paths: src/auth/tokenService.ts, src/legacy/tokenService.ts`). This prevents Copilot from needing manual file searches.
- **Output format:** Same as the full search pipeline — connection graph + smart snapshot rendered text. No wrapper type. Internal callers that need raw `CodeChunk[]` can call the resolve step directly.

**Key behaviors:**
- Parse `symbol = ` prefix → extract symbol path
- Split on ` > ` to get hierarchy: `[file?, parent?, name]`
- Search through parsed symbol trees for matches (exact name match, case-sensitive)
- If file path is specified, scope to that file (exact match first, partial fallback with hints)
- On no exact match: case-insensitive fallback search → return helpful hints, not silent failure
- On no file match: partial path fallback search → return path suggestions
- Enrich matched chunks with Phase 3 TS LS metadata
- Generate Phase 5 connection graph + Phase 4 smart snapshot
- Return same output format as full pipeline (connection graph + smart snapshots)

**Module structure:**
- `src/lookup/types.ts` — Input/output interfaces, parsed symbol path types
- `src/lookup/parse-query.ts` — Parse `symbol = ` prefix, split ` > ` hierarchy, detect lookup vs natural language
- `src/lookup/resolve.ts` — Walk parsed symbol trees for exact matches, handle file/parent scoping, case/path fallback hints
- `src/lookup/index.ts` — Entry point: parse → resolve → enrich → render → return

**Test cases:**

- `symbol = validateToken` → find in any file
- `symbol = TokenService > validateToken` → find within TokenService
- `symbol = src/auth/tokenService.ts > TokenService > validateToken` → file-scoped
- `symbol = nonExistentSymbol` → empty result with clean error
- `symbol = ambiguousName` (exists in multiple files) → return all matches
- Query without `symbol = ` prefix → returns `null` (not a symbol lookup)
- `symbol = validatetoken` (wrong case) → error with hint: "Did you mean validateToken?"
- `symbol = tokenService.ts > validateToken` (partial path) → error with hint: "Similar paths: src/auth/tokenService.ts"
- `symbol = TokenService > nonExistent` → error (parent exists, child doesn't)
- `symbol = NonExistentClass > validateToken` → error (parent doesn't exist)

**Validation gate:**
- Exact name matches only (no fuzzy matching) — case fallback is hint-only, not auto-resolve
- File-scoped lookups find only in the specified file
- Hierarchical lookups verify parent chain
- Empty results returned gracefully with helpful hints (no crashes)
- Case mismatch hints show the correct casing and location
- Path mismatch hints show similar file paths
- Output format matches full pipeline output
- Fresh parsing is used now; explicit TODO markers for Phase 7 indexed replacement

**Dependencies:** Phase 1 (Parser), Phase 2 (Chunker), Phase 3 (TS LS), Phase 4 (Snapshot), Phase 5 (Connection Graph)

---

### Phase 6.5 — Prototype MCP Tool (Symbol Lookup Only)

**Goal:** Create a working `codebase_search` MCP tool registered in the MCP server that exposes the Phase 1–6 symbol lookup pipeline as a callable tool. This allows end-to-end testing of the semantic toolkit from the Inspector webapp before the vector search pipeline (Phases 7–8) exists. Only the `symbol = ` query mode is functional; natural language queries return a clear "not yet implemented" message.

**Location:** `mcp-server/src/tools/codebase/codebase-search.ts`

**Package:** The tool handler lives in `mcp-server/` and imports from `semantic-toolkit` (which is an npm workspace dependency). All parsing, chunking, enrichment, snapshot generation, and connection graph rendering is delegated to `semantic-toolkit` — the MCP tool is a thin adapter that maps MCP input params to `lookupSymbol()` and formats the response.

#### Input Schema

Two required params and three optional config params:

```typescript
schema: {
  file: zod
    .string()
    .describe('Workspace-relative path to the target file. Required. Supports files, directories, and glob patterns.'),
  query: zod
    .string()
    .describe('Symbol lookup query. Use "symbol = Name" for direct lookup, "symbol = Parent > Child" for hierarchy. Natural language search not yet available.'),
  callDepth: zod
    .number()
    .int()
    .optional()
    .default(1)
    .describe('Max call depth for outgoing/incoming call resolution. 1 = immediate only (default). -1 = full transitive.'),
  typeDepth: zod
    .number()
    .int()
    .optional()
    .default(1)
    .describe('Max nesting depth for advanced type structure extraction. 1 = top-level only (default).'),
  maxTokenBudget: zod
    .number()
    .int()
    .optional()
    .default(8000)
    .describe('Maximum token budget for the combined output (connection graph + snapshots). Default: 8000.'),
}
```

**Required params:**
- `file` — Workspace-relative file path. The tool scopes file discovery to this path. When a single file, only that file is parsed. When a directory or glob, all matching supported files are parsed. The Inspector provides file-path IntelliSense for this field.
- `query` — Must start with `symbol = ` for this prototype. The Inspector pre-fills this field with `symbol = ` so the user only needs to type the symbol name. IntelliSense for the symbol name is provided by the Inspector (server-side filtered to body-bearing and root-level symbols from the semantic toolkit parser).

**Optional config params (functional in this phase):**
- `callDepth` — Passed through to `TsLsConfig.callDepth`. Controls recursive call tree depth in enrichment.
- `typeDepth` — Passed through to `TsLsConfig.typeDepth`. Controls nested type structure depth.
- `maxTokenBudget` — Passed through to `lookupSymbol()` as the token budget for rendered output.

**Pipeline params deferred to Phase 8:** `rerankWeight`, `vectorWeight`, `minimumRelevanceThreshold`, `maxVectorCandidates` are NOT input params on this prototype. They will be added when the vector search pipeline is implemented in Phase 8.

#### Handler Logic

```
1. Resolve workspace root via getClientWorkspace()
2. Resolve file paths:
   - If `file` is a single file: validate it exists, collect as [absolutePath]
   - If `file` is a directory: enumerate all PARSEABLE_EXTENSIONS files recursively
   - If `file` is a glob: expand glob against workspace
3. Validate `query` starts with "symbol = "
   - If not: return "Natural language search is not yet available. Use 'symbol = Name' for direct symbol lookup."
4. Build TsLsConfig from optional params (callDepth, typeDepth)
5. Call lookupSymbol(query, workspaceRoot, filePaths, maxTokenBudget)
6. Format response:
   - On success (found: true): append connection graph + snapshots via response.appendResponseLine()
   - On not found: append the hint or error message
   - On error: append error details
7. Set response.setSkipLedger() (output is structured text, not conversational)
```

#### Tool Registration

Export as `search` from `mcp-server/src/tools/codebase/codebase-search.ts` and add to the codebase barrel export in `mcp-server/src/tools/codebase/index.ts`:

```typescript
export { search } from './codebase-search.js';
```

The existing `tools.ts` auto-discovers all exports from the codebase and file index modules, so no changes needed there.

**Tool metadata:**
- `name`: `codebase_search`
- `category`: `ToolCategory.CODEBASE_ANALYSIS`
- `readOnlyHint`: `true`
- `destructiveHint`: `false`
- `idempotentHint`: `true`
- `openWorldHint`: `false`
- `title`: `Codebase Search`

#### Inspector IntelliSense Integration

The Inspector auto-discovers tools from the MCP server and renders JSON input editors with Monaco. Two IntelliSense features must work for `codebase_search`:

**File path completions (already works):**
The `file` param name is already in the Inspector's `FILE_DIR_PROPERTY_NAMES` set (used by `setupFilePathIntellisense`). No changes needed — the Inspector recognizes `file` as a file-path property and provides filesystem browse completions via the `fs/browse` RPC.

**Symbol completions for the `query` field (new):**
The existing `setupSymbolIntellisense` only recognizes properties literally named `symbol`. For `codebase_search`, the symbol name lives inside the `query` string value (after the `symbol = ` prefix). This requires a new IntelliSense handler:

1. **New RPC endpoint: `editor/semantic-symbols`** — Registered in `services/inspector-backend.ts`. Unlike the existing `editor/symbols` (which uses VS Code's document symbol provider), this endpoint imports from `semantic-toolkit` and:
   - Parses the target file with `parseFile()` from `semantic-toolkit`
   - Filters to body-bearing symbols and root-level named symbols (constants, variables, type aliases, interfaces, enums) — excludes imports, expressions, re-exports, and comments since those cannot be individually looked up via `symbol = `
   - Returns `{ symbols: Array<{ name: string; kind: string; parentName?: string }> }` with hierarchy-aware names (e.g., `TokenService > validateToken`) matching the `symbol = ` query format

2. **New completion provider in `json-interactivity.ts`** — A `setupQuerySymbolIntellisense` function that:
   - Detects when the cursor is inside the `query` string value
   - Reads the `file` property value from the same JSON model
   - Calls `rpc<SemanticSymbolsResponse>('editor/semantic-symbols', { file })` to fetch symbols
   - Filters suggestions based on what the user has typed after `symbol = `
   - Each suggestion inserts `symbol = SymbolName` (or `symbol = Parent > Child` for nested symbols)
   - Trigger characters: `"`, `=`, `>`, ` `

3. **Pre-fill behavior:** When the Inspector generates the default JSON input for `codebase_search`, the `query` field should be pre-filled with `"symbol = "` so the user's cursor lands right after the prefix and IntelliSense can immediately offer symbol suggestions. This is achieved by setting `default` in the zod schema or by the Inspector's JSON template generator recognizing a tool-specific hint.

#### File Discovery

The `file` param must support three input shapes. File discovery logic lives in the MCP tool handler (not in `semantic-toolkit`):

1. **Single file:** `"src/auth/tokenService.ts"` — Resolve against workspace root, validate exists, return `[absolutePath]`.
2. **Directory:** `"src/auth/"` or `"src/auth"` — Recursively enumerate all files matching `PARSEABLE_EXTENSIONS` (`.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs`, `.cts`, `.cjs`).
3. **Glob pattern:** `"src/**/*.ts"` — Expand glob against workspace root, filter to supported extensions.

Use Node.js `fs` and `path` for file resolution. Use a glob library (or simple recursive readdir with extension filter) for directory/glob expansion. Respect `.gitignore` and standard ignore patterns via the existing `ignore-context.ts` helpers if available.

#### Error Handling

- **File not found:** `"File not found: src/auth/missing.ts"` — include workspace root for context.
- **No supported files:** `"No supported source files found in: src/docs/"` — when directory/glob matches zero parseable files.
- **Empty query:** `"Query is required. Use 'symbol = Name' for direct symbol lookup."` — if query is empty or whitespace.
- **Non-symbol query:** `"Natural language search is not yet available. Use 'symbol = Name' for direct symbol lookup."` — clear message explaining the prototype limitation.
- **Symbol not found:** Delegated to `lookupSymbol()` which already provides case-insensitive hints and path suggestions (Phase 6).
- **Parse errors:** If `semantic-toolkit` throws during parsing, catch and return `"Failed to parse file: {path}: {error}"`.

#### Validation

No automated tests for this phase. The tool is validated by direct usage through the Inspector:

1. Open Inspector webapp
2. Select `codebase_search` from the tool list
3. Enter a file path (verify file IntelliSense works)
4. Type a symbol name after `symbol = ` in the query field (verify symbol IntelliSense works)
5. Execute and verify:
   - Connection graph renders correctly
   - Smart snapshots show the right code
   - Config params (callDepth, typeDepth, maxTokenBudget) affect the output
   - Error messages are clear for invalid inputs

**Dependencies:** Phase 1 (Parser), Phase 2 (Chunker), Phase 3 (TS LS), Phase 4 (Snapshot), Phase 5 (Connection Graph), Phase 6 (Symbol Lookup)

---

### Phase 7 — Indexing + Sync

**Goal:** Store `CodeChunk[]` in LanceDB with content-hash-based incremental re-indexing. Detect file changes efficiently and only re-parse/re-embed when content actually changes.

**Input:** Workspace file set + LanceDB database
**Output:** Up-to-date LanceDB index with all CodeChunks + vectors

**Key behaviors:**
- Enumerate all supported files in workspace
- mtime-triggered change detection (cheap stat check)
- Content hash validation (SHA-256 of file contents)
- Skip re-indexing when mtime changed but content hash matches (git operations)
- Full re-parse + re-embed when content hash differs
- Signature change cascade: re-embed chunks that referenced changed signatures
- Delete chunks for removed files

**Test fixtures:**

- **`index/initial-build/`** — Fresh workspace with 5 files. Verify all files indexed, all chunks created.
- **`index/no-change/`** — Run indexer twice on same files. Verify zero re-parses on second run.
- **`index/mtime-only/`** — Touch file mtime without changing content (simulate git checkout). Verify mtime updated but no re-parsing.
- **`index/content-change/`** — Modify file content. Verify old chunks deleted, new chunks created.
- **`index/file-added/`** — Add new file to workspace. Verify new file indexed, existing files untouched.
- **`index/file-removed/`** — Remove file from workspace. Verify its chunks deleted.
- **`index/signature-cascade/`** — Change function signature in file A. File B references file A's signature in its embeddingText. Verify file B's affected chunks are re-embedded.

**Validation gate:**
- Content hash correctly identifies unchanged files after git operations
- Zero unnecessary re-parses when content hasn't changed
- Signature cascade triggers re-embedding for exactly the chunks that referenced the changed signature
- No orphaned chunks (every chunk belongs to an existing file)
- LanceDB schema matches the blueprint's `CodeChunk` interface exactly

**Dependencies:** Phase 2 (Chunker)

---

### Phase 8 — Retrieval Pipeline

**Goal:** Implement the three-stage pipeline: vector search (Voyage Code 3) → re-ranking (Voyage Rerank 2.5) → dual-constraint result selection.

**Input:** Natural language query + LanceDB index
**Output:** Ranked `CodeChunk[]` passing both relevance gate and token budget

**Key behaviors:**
- Stage 1: Embed query via Voyage Code 3, ANN search in LanceDB → top 40 candidates
- Stage 2: Send candidates to Voyage Rerank 2.5, compute blended score: `(rerank * 0.65) + (vector * 0.35)`
- Result selection: filter by `minimumRelevanceThreshold`, iterate by score descending until `maxTokenBudget` exhausted
- Path/language filtering via LanceDB `WHERE` clauses

**Test approach:** Mock the Voyage API for unit tests. Integration tests hit the real API with a small fixture set.

**Test cases:**

- **Score blending:** Given mock rerank + vector scores, verify `finalScore` calculation
- **Relevance gate:** 10 candidates, only 3 pass threshold → return 3
- **Token budget:** 10 candidates pass threshold, but budget fits only 5 → return 5
- **Combined constraint:** 10 candidates, 4 pass threshold, budget fits 3 → return 3
- **Path filter:** 40 candidates, path filter `src/auth/` → only auth-scoped results in Stage 1
- **Empty results:** Query with no matches → graceful empty response
- **Single result:** Only 1 candidate passes all constraints → return 1

**Validation gate:**
- Score blending formula produces correct values for all test scenarios
- Relevance gate correctly filters below threshold
- Token budget correctly limits output
- Path filtering works at the LanceDB query level (not post-filter)
- Configurable parameters (weights, thresholds, budget) are respected

**Dependencies:** Phase 7 (Indexing)

---

### Phase 9 — Output Formatting + MCP Integration

**Goal:** Assemble the final MCP multi-content response: connection graph (first item) + smart structural snapshots (one per file), with priority annotations.

**Input:** Ranked results (Phase 8) + SymbolMetadata (Phase 3) + smart snapshots (Phase 4) + connection graph (Phase 5)
**Output:** MCP response matching the blueprint's format specification

**Key behaviors:**
- Connection graph is first content item with `priority: 1.0`
- Per-file smart snapshots follow, priority mapped from finalScore
- Same-file results merged into single snapshot
- `audience: ["assistant"]` on all content items
- Summary line includes result count, file count, token usage

**Test cases:**

- **Single result:** Verify connection graph (single-result format) + one snapshot
- **Multi-file results:** Verify one snapshot per file, connection graph with ★/◆
- **Same-file merge:** 2 results from same file → 1 snapshot with both expanded
- **Empty results:** Verify clean "no results" response
- **Symbol lookup response:** Verify same output format as full pipeline

**Validation gate:**
- MCP response structure matches the spec (content array, type, text, annotations)
- Connection graph appears first, snapshots follow in score order
- Priority values decrease monotonically after the graph
- Token count in summary matches actual response size
- All content items have `audience: ["assistant"]`

**Settings migration:** Phase 6.5 introduces `callDepth`, `typeDepth`, and `maxTokenBudget` as optional MCP tool input params. Phase 8 adds `rerankWeight`, `vectorWeight`, `minimumRelevanceThreshold`, and `maxVectorCandidates`. In this phase, ALL configurable params must be migrated from MCP tool input params to the VS Code extension's settings page (`contributes.configuration` in `package.json`). The MCP tool input schema is simplified: config params are removed, and their values are read from `vscode.workspace.getConfiguration()` at tool invocation time. The tool's optional input params become extension settings with the same defaults. This keeps the tool interface clean for Copilot while giving users a persistent settings UI for tuning.

**Glob support:** Phase 6.5 defers glob pattern support for the `file` param. In this phase, add glob expansion support so `file` accepts patterns like `"src/**/*.ts"`. Use Node.js glob resolution against the workspace root, filtering to `PARSEABLE_EXTENSIONS`.

**Architecture deduplication:** Phase 6.5 introduces a direct `semantic-toolkit` import in the MCP server process (creating a fresh ts-morph Project per call). The existing `codebase_trace` and other tools use the `client-pipe → extension host → worker thread` pattern with a cached ts-morph Project. In this phase, unify these two code paths into a single route so that all codebase tools (including `codebase_search`) share the same Project cache and communication pattern. This eliminates the redundant ts-morph instantiation and ensures consistent behavior across tools.

**Dependencies:** Phase 4 (Snapshots) + Phase 5 (Connection Graph) + Phase 8 (Retrieval) + Phase 6.5 (Prototype MCP Tool)