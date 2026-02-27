# AST-Native Semantic Codebase Search System — Blueprint

## Problem Statement

VS Code's native semantic search and read tools have three core deficiencies:
- Chunking is character-count-based with no awareness of code structure, producing irrelevant results
- The embedding model used is low quality, producing low-fidelity semantic vectors
- Read tools require Copilot to read files in small increments rather than getting full symbol context

**Goal:** A single MCP tool that returns surgically precise, concern-level code context — only the specific symbols relevant to Copilot's current task, enriched with their structural connections, and free of noise. This eliminates manual file reads, grep searches, and context-window waste, allowing Copilot to spend its effort on strategy and logic rather than filtering irrelevant code.

**Long-term vision:** This tool should be so effective that Copilot never needs to manually read file contents. It should fully replace the need for `file_read` when working with code — search once, get exactly what you need, make the edit.

**Integration:** This tool lives in the existing `mcp-server` package as a new MCP tool. Structural exploration (call chains, type hierarchy, references) is handled separately by the existing `codebase_trace` tool — this tool focuses on semantic search, structural enrichment, and retrieval.

---

## Stack

- **Language:** TypeScript (Node-based, end to end)
- **AST Parser:** TypeScript Compiler API (`typescript` npm package) — full type resolution, not Tree-sitter
- **File Support:** `.ts`, `.tsx`, `.js`, `.jsx` (full web project support)
- **Embedding Model:** Voyage Code 3 (1024-dimensional vectors)
- **Vector Store:** LanceDB (`@lancedb/lancedb` v-next SDK)
- **Re-ranking:** Voyage Rerank 2.5
- **Structural Analysis:** TypeScript Language Services (post-rerank metadata enrichment)
- **Index Update Strategy:** Incremental re-index of dirty files on each `semantic_search` tool call

---

## Design Philosophy

### Parser First
The AST parser and chunking system must be built and validated BEFORE any embedding or search work begins. The parser determines what chunks look like, which determines what gets embedded. Get parsing right on real-world code (tested against large files like 6,000+ line classes), then build the search pipeline on top of proven chunks.

### Concern-Level Retrieval
The search tool returns only the specific symbols relevant to the query — not files, not full classes. If Copilot is working on authentication and a file has 50 constants, only the 1 constant related to auth is returned. The 49 others are never seen. Every returned symbol is COMPLETE (never partial), but irrelevant symbols at the file/class level are excluded entirely.

### Separation of Concerns (Current Architecture)
- **This tool:** Finds relevant code symbols via semantic search + structural enrichment
- **`codebase_trace` tool:** Explores structural connections (call chains, type hierarchy, references) on-demand
- **`file_read` tool:** Symbol-scoped navigation with hierarchical collapsing (long-term: this tool aims to absorb file_read's code-reading responsibilities)

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
1. Parse all `.ts`, `.tsx`, `.js`, `.jsx` files using the TypeScript Compiler API
2. Extract hierarchical symbol trees matching the `file_read` tool's symbol model
3. Apply the "content with children collapsed" rule at every level
4. Handle edge cases: massive methods, deeply nested UI trees, arrow functions, etc.
5. Handle React/JSX component declarations with proper chunking (part of initial parser, not deferred)
6. Validate on real-world code (TriviaGame.ts, TriviaPhone.ts) before proceeding

### Non-Body-Bearing Content

Not all code lives inside body-bearing symbols. The chunking strategy handles each category:

- **Named symbols** (constants, variables, type aliases, interfaces, enums) — each gets its own chunk regardless of whether it has a body. A `const API_URL = '...'` is a 1-line chunk.
- **File-level root chunk** — everything that ISN'T a named symbol (imports, top-level expressions, export re-exports, side-effect code) gets aggregated into a single chunk at depth 0. This is the "module initialization" code.
- **Imports tracked per-chunk** — the `relevantImports` field on each chunk records which imports that specific symbol uses. The smart structural snapshot output uses this to include only the imports relevant to the target symbol.

Files that are entirely non-symbolic (e.g., `server.ts` with only `app.use(...)` calls and imports) produce a single file-level root chunk.

---

## LanceDB Schema

```typescript
interface CodeChunk {
  id: string;                    // hash of filePath + nodeKind + name + parentChain
  filePath: string;
  relativePath: string;
  nodeKind: string;              // 'function' | 'method' | 'class' | 'interface' | 'type' | 'enum' | 'component'
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
  lastModified: number;          // file mtime for incremental invalidation
}
```

> **Note on graph edges:** Dedicated graph edge fields (`callsIds`, `calledByIds`, etc.) are NOT stored in this schema. The TypeScript Language Services provide real-time structural analysis during the post-rerank enrichment stage (Stage 3), using live compiler data rather than stale cached edges. This avoids maintaining duplicate structural data and ensures connections are always accurate.

---

## Incremental Indexing

On each `semantic_search` tool call:

1. Enumerate all `.ts`/`.tsx`/`.js`/`.jsx` workspace files
2. Compare each file's `mtime` against `lastModified` stored in LanceDB
3. For dirty/new files: delete existing chunks by `filePath`, re-parse and re-embed
4. **Signature change detection:** if a re-indexed chunk's signature differs from its previous version, find all chunks whose `embeddingText` referenced that signature and re-embed those too (their embedding text referenced the old signature)
5. Run the search query against the now-fresh index

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
| File support | .ts, .tsx, .js, .jsx | Multi-language | Multi-language |
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

## Open Design Questions

### Context Completeness Strategy
The tool aims to provide enough context in a single search that Copilot rarely needs to fall back to brute-force grep/regex. The connection graph metadata provides the "clues" for Copilot to make targeted follow-up searches rather than blind exploration. Validation needed: does the collective metadata across 5-8 results consistently provide enough structural hints to guide follow-up queries? Test against real multi-file workflows.

### Parser Validation Criteria
What specific tests and metrics should the AST parser pass before we proceed to embedding? Needs concrete validation criteria against TriviaGame.ts (6,138 lines, 235 symbols) and similar real-world files.