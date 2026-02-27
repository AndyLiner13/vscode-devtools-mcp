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
- **Structural Analysis:** TypeScript Language Services (post-rerank hub elevation)
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

### Stage 3 — Structural Enrichment via TypeScript Language Services (Hub Elevation)

After re-ranking produces the top 15 high-confidence results, use the TypeScript Language Services to discover structurally important symbols that the embedding model missed:

1. For each of the top 15 results, resolve all type references, imports, callers, and callees via the TS compiler
2. **Connection analysis:** Find symbols that appear as connections to MULTIPLE high-scoring results but didn't score high themselves in vector search
3. **Hub elevation:** A symbol connected to 8/15 results is clearly critical even if embedding similarity was low (e.g., a generic middleware function that doesn't mention "authentication" but is the hub of the auth system)
4. **Re-score:** Combine semantic score + structural connectedness for the enriched result set

**Why this runs AFTER the re-ranker, not before:**
- Voyage Rerank 2.5 doesn't natively understand custom structural metadata — feeding it edges would add noise
- TS analysis on 15 precision-filtered results is 3x cheaper than on 40 fuzzy candidates
- Hub discovery from top 15 outward to the ENTIRE codebase is MORE powerful than connections within 40 vector candidates — it finds symbols that weren't even in the original vector results
- You need to know which results are high-confidence FIRST before you can find their structural connections

**What this bridges:** Embedding models understand what code MEANS (semantic similarity). The TS language server understands how code CONNECTS (type resolution, references, call chains). By running the language server on semantically-validated results, we bridge the gap — discovering structurally important symbols that are semantically non-obvious.

---

## Result Selection — Dual Constraint

Results (including any hub-elevated symbols from Stage 3) are selected using two constraints applied simultaneously:

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

Results use MCP's native multi-content response format. Each result is its own discrete content item with priority annotations mapped from the `finalScore`:

```json
{
  "content": [
    {
      "type": "text",
      "text": "// src/auth/tokenService.ts > TokenService.validateToken\n\nasync validateToken(token: string)...",
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.95
      }
    },
    {
      "type": "text",
      "text": "// src/config/constants.ts > AUTH_SECRET\n\nconst AUTH_SECRET = ...",
      "annotations": {
        "audience": ["assistant"],
        "priority": 0.80
      }
    }
  ]
}
```

This is cleaner than concatenating results into one markdown string — the LLM processes each result independently.

### Content Format: Clean Source Code

Each content item contains clean source code — no line numbers, no artificial separators. The code reads as if copied directly from the source file:

```
// src/auth/tokenService.ts > TokenService.validateToken

async validateToken(token: string): Promise<JwtPayload | null> {
  try {
    return jwt.verify(token, this.secret) as JwtPayload;
  } catch {
    return null;
  }
}
```

### Collapsed Children: VS Code Folding Style

Irrelevant body-bearing children within a result are collapsed using block-comment style, preserving the method signature for type context:

```
async start() {
  const hasExistingState = (this.world as any).triviaGameState !== undefined;
  if (hasExistingState) {
    this.handlePreviewModeTransition();
  }
  
  private async initializePhoneManagement(): Promise<void> { /* 38 lines collapsed */ }
  
  await this.preloadGameAssets();
  await this.loadTriviaQuestions();
  
  private setupNetworkEvents(): void { /* 48 lines collapsed */ }
}
```

### Intelligent Parent-Child Merging

When both a parent symbol and its child symbol are relevant to the query, they are returned as ONE combined result — the parent's source code with the relevant child EXPANDED inline (not collapsed). The output looks like the raw source code:

| Situation | Result |
|---|---|
| Parent relevant, child also relevant | Parent with that child expanded inline (one result) |
| Parent relevant, child not relevant | Parent with child collapsed: `signature() { /* N lines collapsed */ }` |
| Child relevant, parent not relevant | Child as standalone result |
| Both parent and child scored high | Merged into one result, no duplicates |

**Example — Query: "How does game asset preloading work?"**

Relevant parent (`start`) with relevant child (`preloadGameAssets`) expanded inline:

```
// src/game/TriviaGame.ts > TriviaGame > start

async start() {
  const hasExistingState = (this.world as any).triviaGameState !== undefined;
  if (hasExistingState) {
    this.handlePreviewModeTransition();
  }
  
  private async initializePhoneManagement(): Promise<void> { /* 38 lines collapsed */ }
  
  await this.preloadGameAssets();
  await this.loadTriviaQuestions();
  
  private setupNetworkEvents(): void { /* 48 lines collapsed */ }
}

private async preloadGameAssets(): Promise<void> {
  const allQuestions = this.triviaQuestions;
  const questionImageIds: string[] = [];
  for (const question of allQuestions) {
    if (question.image) {
      const textureId = this.getTextureIdForImage(question.image);
      if (textureId) {
        questionImageIds.push(textureId);
      }
    }
  }
  if (questionImageIds.length > 0) {
    await this.assetManager.preloadImages(questionImageIds);
  }
}
```

Irrelevant children are collapsed. Relevant children appear in full. The result reads like natural source code.

---

## Why Each Stage Catches What the Others Miss

| Signal | Strengths | Blind Spots |
|---|---|---|
| Vector search | Semantic equivalence, natural language → code, broad recall | Exact terminology, false positives on superficially similar code |
| Voyage Rerank 2.5 | Precise query-chunk relevance, exact symbol names, joint evaluation | No structural awareness, can miss structurally critical hubs |
| TS Language Services | Real structural connections, hub discovery, type resolution | No semantic query understanding — needs high-quality seeds from Stage 2 |

The ordering (vector → rerank → TS enrichment) is intentional: vector search casts a wide net, reranking sharpens to high-confidence seeds, TS enrichment discovers structural connections that embeddings can't see. Each stage compensates for the previous stage's blind spots.

---

## Comparison to Existing Tools

| | This System | GitHub Blackbird (Copilot Native) | Sourcegraph / Cody |
|---|---|---|---|
| Chunking | TypeScript AST, hierarchical symbol-level | Character-count arbitrary | Tree-sitter syntactic |
| Type resolution | Full (TS compiler API) | No | No |
| File support | .ts, .tsx, .js, .jsx | Multi-language | Multi-language |
| Embedding model | Voyage Code 3 | Low-grade internal model | Varies |
| Re-ranking | Voyage Rerank 2.5 + TS hub elevation | None known | None in standard path |
| Structural enrichment | TS Language Services (post-rerank) | No | Separate navigation tool |
| Result selection | Dual constraint (relevance gate + token budget) | Fixed count | Fixed count |
| Result granularity | Concern-level (specific symbols only) | File/chunk level | File/chunk level |
| Scale target | Single workspace, high fidelity | Millions of repos, breadth | Large multi-language repos |
| Update strategy | Incremental on-query | Pre-built cached index | Pre-built persistent index |

**Key differentiators:**
1. TypeScript compiler API gives full type resolution unavailable to Tree-sitter-based tools
2. Three-stage pipeline (vector → rerank → TS structural enrichment) bridges semantic and structural understanding
3. Concern-level retrieval returns only relevant symbols, not files or arbitrary chunks
4. Hierarchical AST chunking mirrors the `file_read` tool's proven symbol-scoped navigation model

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

### Context Completeness Guarantee
How do we ensure that the symbols returned by the search tool provide ALL the context Copilot needs to make correct edits? If Copilot receives 3 symbols but needs a 4th to understand a dependency, the edit may be wrong. The TS structural enrichment (Stage 3) partially addresses this by auto-including connected symbols, but the completeness guarantee needs further validation.

### Structural Enrichment Scoring
How should hub-elevated symbols from Stage 3 be scored relative to direct vector/rerank results? A hub connected to 8/15 results is clearly important, but it wasn't semantically matched to the query — how should its `finalScore` be computed?

### Parser Validation Criteria
What specific tests and metrics should the AST parser pass before we proceed to embedding? Needs concrete validation criteria against TriviaGame.ts (6,138 lines, 235 symbols) and similar real-world files.