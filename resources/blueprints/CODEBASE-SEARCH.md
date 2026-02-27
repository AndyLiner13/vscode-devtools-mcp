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

Each chunk embeds a **metadata preamble + full source code** (with children collapsed). The code-trained embedding model (Voyage Code 3) gets the actual code to understand semantic intent, patterns, and relationships — not a text summary that throws away the code semantics.

```
[TypeScript] src/auth/tokenService.ts > TokenService > validateToken
Purpose: Validates a JWT token and returns the decoded payload
Signature: async validateToken(token: string): Promise<JwtPayload | null>
Dependencies: jsonwebtoken, ../models/auth

Referenced symbols:
- JwtPayload: interface { userId: string; exp: number; iat: number; }

---
async validateToken(token: string): Promise<JwtPayload | null> {
  try {
    return jwt.verify(token, this.secret) as JwtPayload;
  } catch {
    return null;
  }
}
```

For parent/container chunks (e.g., a class), the embedding text includes the declaration + collapsed method signatures — giving the embedding model the structural overview while staying within Voyage Code 3's 32K token-per-document limit.

**Key rules:**
- Include *signatures* of referenced symbols (one hop only), not their full source
- The `embeddingText` field (metadata + source with collapsed children) is separate from `fullSource` (raw complete source)
- The embedding model always receives actual code, never just text summaries

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
- Each gets its own chunk with the standard metadata preamble + source code
- Example: `export const TOKEN_EXPIRY = 3600` → one chunk

**Non-symbol content at root** (imports, expressions, re-exports, control flow):
- Each individual statement gets its own chunk with a metadata preamble
- `import jwt from 'jsonwebtoken'` → one chunk
- `app.use(cors())` → one chunk
- `export { X } from './x'` → one chunk
- Top-level `if`, `for`, `try/catch` blocks → each one chunk

**Why individual chunks instead of groups:** Grouping semantically unrelated content (e.g., merging all imports) adds noise to embeddings. Voyage Code 3 is trained on code and handles small chunks well — even a single import line embeds accurately enough for the reranker to evaluate relevance. Individual chunks mean precise retrieval: searching "jsonwebtoken" finds exactly the import for `jwt`, not an entire block of 15 unrelated imports.

**Metadata preamble** for root-level items follows the same pattern as body-bearing symbols:
```
[TypeScript] src/auth/tokenService.ts > import:jsonwebtoken
---
import jwt from 'jsonwebtoken';
```

The `relevantImports` field on each body-bearing chunk still tracks which imports that symbol uses, enabling the smart structural snapshot to include relevant imports in the output.

Files that are entirely non-symbolic (e.g., `server.ts` with only `app.use(...)` calls and imports) produce individual chunks for each statement.

---

## LanceDB Schema

```typescript
interface CodeChunk {
  id: string;                    // hash of filePath + nodeKind + name + parentChain
  filePath: string;
  relativePath: string;
  nodeKind: string;              // 'function' | 'method' | 'class' | 'interface' | 'type' | 'enum' | 'component' | 'variable' | 'const' | 'import' | 'expression' | 're-export'
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
  embeddingText: string;         // metadata preamble + source with children collapsed
  vector: Float32Array;          // 1024-dim Voyage Code 3 embedding
  contentHash: string;           // SHA-256 of file contents for change detection
  lastModified: number;          // file mtime for incremental invalidation trigger
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
4. **Outgoing calls:** immediate symbols this result calls (1 hop)
5. **Incoming callers:** immediate symbols that call this result (1 hop)
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

The connection graph is a centralized structural overview of all results — plain text, no decorative characters. It contains all the metadata the TS Language Services resolved for each result, plus cross-result patterns. Individual source code results contain NO inline metadata; all structural context lives here.

**Multi-result example:**

```
Search: "authentication token validation" | 5 results across 4 files | 3,240/8,000 tokens

[1] TokenService.validateToken
 src/auth/tokenService.ts
 async method | exported | refs: 8 files
 Signature: async validateToken(token: string): Promise<JwtPayload | null>
 Extends: BaseValidator (src/base.ts)
 Calls: jwt.verify, AuthConfig.getSecret ◆
 Called by: AuthMiddleware.verify ★, LoginController.handle ★
 Types in: token (string) | Types out: JwtPayload ◆ (src/models/auth.ts)

[2] AuthMiddleware.verify
 src/middleware/auth.ts
 async method | exported | refs: 12 files
 Signature: async verify(req: Request, res: Response, next: NextFunction): Promise<void>
 Calls: TokenService.validateToken ★, AuthConfig.getSecret ◆
 Called by: Router.use (src/routes/index.ts)
 Types in: Request (express), Response (express)

[3] LoginController.handle
 src/controllers/login.ts
 async method | exported | refs: 3 files
 Signature: async handle(req: LoginRequest): Promise<AuthResponse>
 Calls: TokenService.validateToken ★, UserService.findByEmail
 Types in: LoginRequest (src/models/auth.ts) | Types out: AuthResponse ◆

[4] AuthConfig
 src/config/auth.ts
 class | exported | refs: 14 files
 Implements: ConfigProvider (src/interfaces/config.ts)
 Members: getSecret(), getExpiry(), getIssuer()
 Called by: TokenService.validateToken ★, AuthMiddleware.verify ★

[5] AUTH_TOKEN_EXPIRY
 src/config/constants.ts
 const | exported | refs: 6 files
 Type: number (value: 3600)
 Used by: AuthConfig.getExpiry ★

★ = in results  ◆ = shared across 2+ results

Shared dependencies not in results:
 JwtPayload (src/models/auth.ts) — type used by 3/5 results
 AuthResponse (src/models/auth.ts) — return type for 2/5 results
 BaseValidator (src/base.ts) — parent class of TokenService
```

**Single-result example:**

```
Search: "jwt token validation" | 1 result | 820/8,000 tokens

TokenService.validateToken
 src/auth/tokenService.ts
 async method | exported | refs: 8 files
 Signature: async validateToken(token: string): Promise<JwtPayload | null>
 Extends: BaseValidator (src/base.ts)
 Calls: jwt.verify, AuthConfig.getSecret (src/config/auth.ts)
 Called by: AuthMiddleware.verify (src/middleware/auth.ts), LoginController.handle (src/controllers/login.ts)
 Types in: token (string) | Types out: JwtPayload (src/models/auth.ts)
```

**Why a centralized graph instead of per-result metadata:**
- Individual source code results stay clean — just code, no metadata noise
- Cross-result patterns (★ and ◆ markers) are visible in one place instead of scattered
- Shared dependencies stated once instead of repeated across multiple results
- Copilot reads the graph first for structural overview, then reads individual results for code
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

1. **Full coverage:** Every non-blank, non-comment line in the source file is covered by at least one chunk. No code is "lost" between chunks.
2. **No overlap:** No line is covered by two sibling chunks at the same depth level. (Parent chunks CAN cover the same lines as their children — that's the collapsed-children model.)
3. **Source fidelity:** The `fullSource` of each chunk, when extracted from the original file using the chunk's line range, matches exactly. No off-by-one errors.
4. **Hierarchy consistency:** Every chunk with a `parentChunkId` has a parent chunk that lists it in `childChunkIds`. Every root chunk has `parentChunkId: null`.
5. **Token limit:** No chunk's `embeddingText` exceeds 32,000 tokens (estimated at 4 chars/token).
6. **Collapsed children correctness:** For any chunk with body-bearing children, the chunk's content should show those children as signature-only stubs (no bodies). The children's `fullSource` should contain the complete bodies.
7. **Breadcrumb accuracy:** Each chunk's breadcrumb matches `file > parent > ... > name` built from the actual hierarchy.
8. **Deterministic IDs:** Running the parser twice on the same file produces identical chunk IDs.
9. **Root-level isolation:** Each import, expression, and re-export at root level produces exactly one chunk. No merging of unrelated root-level statements.
10. **relevantImports tracking:** For body-bearing chunks, `relevantImports` contains only the imports that the chunk's source code actually references (identifiers match).

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

**Goal:** Transform the parser's symbol tree into `CodeChunk[]` with the "content with children collapsed" rule, metadata preamble, `embeddingText`, `fullSource`, and `relevantImports`.

**Input:** `ParsedSymbol[]` + source file content
**Output:** `CodeChunk[]` per the LanceDB schema (minus `vector`, `contentHash`, `lastModified` which come from later phases)

**Key behaviors:**
- Body-bearing children are collapsed to signature-only stubs in the parent chunk
- Each root-level statement (import, expression, re-export) becomes its own chunk
- `embeddingText` = metadata preamble + source with collapsed children
- `fullSource` = raw complete source of the node
- `relevantImports` = only the imports this chunk actually references

**Test fixtures:** Same 20 files, but now each `.expected.json` includes `chunks` and `rootItems` arrays with:
- `embeddingText` samples (at least the metadata preamble prefix)
- `hasCollapsedChildren` flag
- `relevantImports` list
- Verification that `fullSource` extracted from original file at `[startLine, endLine]` matches exactly

**Validation gate:**
- All global rules pass (1-10)
- For every parent chunk with body-bearing children: its `embeddingText` contains collapsed child signatures, NOT their bodies
- For every leaf chunk: `embeddingText` contains the full source (no collapsing)
- `relevantImports` for each chunk only contains imports where at least one identifier from the import is used in the chunk's source code
- No chunk's `embeddingText` exceeds 32K tokens
- Metadata preamble format matches: `[Language] path > parent > name\nPurpose: ...\nSignature: ...\nDependencies: ...\n---\n<code>`

**Dependencies:** Phase 1 (Parser)

---

### Phase 3 — TypeScript Language Services Integration

**Goal:** Use the TS compiler's language services to resolve structural metadata for any given symbol: full signatures, type hierarchy, outgoing calls, incoming callers, reference count, type flows, and class members.

**Input:** Symbol name + file path + ts-morph project
**Output:** `SymbolMetadata` containing:
- `signature` (complete type signature)
- `modifiers` (async, static, exported, etc.)
- `typeHierarchy` (extends, implements, subtypes)
- `outgoingCalls` (immediate symbols this symbol calls, 1 hop)
- `incomingCallers` (immediate symbols that call this symbol, 1 hop)
- `referenceCount` (how many files reference this symbol)
- `typeFlows` (where parameter types come from, where return types go)
- `members` (for classes/interfaces: methods + properties list)

**Test fixtures:** New set of multi-file fixtures (not single-file like Phase 1-2):

- **`ts-ls/call-chain/`** — 3-4 files with A calling B calling C. Verify outgoing/incoming calls resolve correctly.
- **`ts-ls/type-hierarchy/`** — interface → class → subclass chain. Verify extends/implements/subtypes.
- **`ts-ls/references/`** — symbol used across 5 files. Verify reference count and file list.
- **`ts-ls/type-flows/`** — function parameter types imported from file A, return type used in file B. Verify flow resolution.
- **`ts-ls/members/`** — class with methods/properties. Verify member listing.
- **`ts-ls/cross-module/`** — re-exports, barrel files, declaration merging. Verify resolution through indirection.

**Validation gate:**
- Call hierarchy matches expected for all test scenarios (1-hop outgoing + incoming)
- Type hierarchy resolves extends/implements/subtypes correctly
- Reference counts are accurate (±0 tolerance)
- Type flows trace parameter origins and return type destinations correctly
- Member listings are complete and ordered

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

**Goal:** Given a set of result symbols (post-retrieval), assemble a connection graph showing each result's metadata and cross-result patterns (★ = in results, ◆ = shared across 2+ results).

**Input:** Result `CodeChunk[]` + `SymbolMetadata` for each result (from Phase 3)
**Output:** Plain text connection graph matching the format defined in the blueprint

**Key behaviors:**
- Each result gets a numbered entry with kind, modifiers, signature, type hierarchy, calls, callers, types, reference count
- Cross-result connections marked with ★
- Shared dependencies (referenced by 2+ results but not in results themselves) marked with ◆
- "Shared dependencies not in results" section at the bottom
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

---

### Phase 6 — Symbol Lookup

**Goal:** Detect `symbol = ...` prefix in queries and resolve to matching symbols without using vector search or re-ranking.

**Input:** Query string (e.g., `symbol = TokenService > validateToken`)
**Output:** Matching `CodeChunk[]` with connection graph + smart snapshot (same output format as full pipeline)

**Key behaviors:**
- Parse `symbol = ` prefix → extract symbol path
- Split on ` > ` to get hierarchy: `[file?, parent?, name]`
- Search through parsed symbol trees for matches (exact name match)
- If file path is specified, scope to that file
- Return same output format as full pipeline (connection graph + smart snapshots)

**Test cases:**

- `symbol = validateToken` → find in any file
- `symbol = TokenService > validateToken` → find within TokenService
- `symbol = src/auth/tokenService.ts > TokenService > validateToken` → file-scoped
- `symbol = nonExistentSymbol` → empty result
- `symbol = ambiguousName` (exists in multiple files) → return all matches
- Query without `symbol = ` prefix → returns `null` (not a symbol lookup)

**Validation gate:**
- Exact name matches only (no fuzzy matching)
- File-scoped lookups find only in the specified file
- Hierarchical lookups verify parent chain
- Empty results returned gracefully (no errors)
- Output format matches full pipeline output

**Dependencies:** Phase 1 (Parser)

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

**Dependencies:** Phase 4 (Snapshots) + Phase 5 (Connection Graph) + Phase 8 (Retrieval)