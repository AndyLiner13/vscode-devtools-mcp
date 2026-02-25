# TF-IDF Comment Identifier Implementation Blueprint

## Summary

Add a TF-IDF service that generates semantic identifiers for anonymous comment containers in TypeScript/JavaScript files. Currently, `buildContainerGroups` produces childless stubs all named `"comments"`, making multiple comment blocks indistinguishable by dot-notation. TF-IDF replaces these generic names with distinctive, content-derived identifiers like `comments.authentication-timeout` or `comments.database-pooling`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | TS/JS comments only (Phase 1) | Comments are the anonymous nodes; code symbols already have language-server names |
| Package location | `packages/tfidf/` | Full npm workspace package, same pattern as `log-consolidation` |
| Library | `natural` (npm) | Pre-built TF-IDF class, WordTokenizer, PorterStemmer, English stop words |
| Registry | In-memory `Map` with lazy rebuild | Zero-cost repeated reads; comment corpus per file is small |
| Integration point | Indexing time (pre-computed) | Baked into FileStructure during `extractStructure()` |
| Collision handling | Numeric suffix (`comment.auth-timeout-2`) | Simple, no LLM latency or cost |
| Identifier format | `comments.term1-term2-term3` | Type-prefixed, hyphen-separated, lowercase slug |
| Top terms | Configurable, default 3 | Balances specificity with brevity |
| Stemming | Porter stemmer | `authenticating` → `authent`, groups related terms |
| Stop words | `natural`'s built-in English stop words | Filters "the", "a", "is", etc. before scoring |
| Container children | Childless stubs (no change) | Containers stay as-is, only the name changes |
| Replaces | `extractCommentTitle` for comment containers | TF-IDF provides better semantic identifiers |
| Annotations | No special treatment | TODO/FIXME treated as regular terms |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  services/codebase/language-services/               │
│  typescript-language-service.ts                     │
│                                                     │
│  extractStructure()                                 │
│    ├── extractTsMorphStructure() → orphanComments   │
│    ├── buildContainerGroups('comments', ...)        │
│    └── NEW: tfidfService.nameContainers(containers, │
│             fileContent) → renamed containers       │
└────────────────────┬────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────┐
│  packages/tfidf/                                    │
│                                                     │
│  TfIdfService                                       │
│    ├── buildCorpus(commentTexts[])                  │
│    ├── scoreTerms() → per-container ranked terms    │
│    ├── generateIdentifiers() → slug names           │
│    └── resolveCollisions() → numeric suffix         │
│                                                     │
│  Registry (in-memory)                               │
│    └── Map<filePath, Map<identifier, NodeInfo>>     │
└─────────────────────────────────────────────────────┘
```

## Package Structure

```
packages/tfidf/
├── package.json          # @packages/tfidf, depends on natural
├── tsconfig.json         # extends ../../tsconfig.base.json
└── src/
    ├── index.ts          # public API exports
    ├── tfidf-service.ts  # core TF-IDF pipeline
    ├── registry.ts       # in-memory identifier registry
    └── types.ts          # interfaces
```

## Package Configuration

### packages/tfidf/package.json

```json
{
  "name": "@packages/tfidf",
  "version": "1.0.0",
  "private": true,
  "description": "TF-IDF semantic identifier service for anonymous AST nodes",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "natural": "^8.0.1"
  }
}
```

### packages/tfidf/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

## Core API

### Types (`src/types.ts`)

```typescript
export interface CommentNode {
  /** Raw comment text including delimiters (// or /* *\/) */
  text: string;
  /** 1-indexed line range in the source file */
  range: { startLine: number; endLine: number };
  /** Comment kind from classifyComment (jsdoc, block-comment, etc.) */
  kind: string;
}

export interface TfIdfIdentifier {
  /** Generated slug identifier, e.g. "authentication-timeout" */
  slug: string;
  /** Top N terms with their TF-IDF scores */
  terms: Array<{ term: string; score: number }>;
  /** The original comment node this was generated for */
  source: CommentNode;
}

export interface TfIdfConfig {
  /** Number of top terms to include in the identifier (default: 3) */
  topTerms?: number;
}

export interface RegistryEntry {
  /** Generated identifier slug */
  identifier: string;
  /** 1-indexed line range */
  range: { startLine: number; endLine: number };
  /** Hash of comment text for staleness detection */
  contentHash: string;
}
```

### Service (`src/tfidf-service.ts`)

```typescript
import natural from 'natural';

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

export function generateIdentifiers(
  comments: CommentNode[],
  config?: TfIdfConfig
): TfIdfIdentifier[] {
  const topN = config?.topTerms ?? 3;
  const tfidf = new natural.TfIdf();

  // Stage 1: Build corpus — each comment is a document
  for (const comment of comments) {
    const cleaned = stripCommentDelimiters(comment.text);
    tfidf.addDocument(cleaned);
  }

  // Stage 2: Score and generate identifiers
  const results: TfIdfIdentifier[] = [];
  const usedSlugs = new Map<string, number>();

  for (let i = 0; i < comments.length; i++) {
    const terms = tfidf.listTerms(i)
      .slice(0, topN)
      .map(t => ({ term: t.term, score: t.tfidf }));

    const baseSlug = terms.map(t => t.term).join('-');

    // Stage 3: Collision resolution with numeric suffix
    const count = usedSlugs.get(baseSlug) ?? 0;
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    usedSlugs.set(baseSlug, count + 1);

    results.push({ slug, terms, source: comments[i] });
  }

  return results;
}
```

### Registry (`src/registry.ts`)

```typescript
import crypto from 'node:crypto';

interface CacheEntry {
  identifiers: Map<string, RegistryEntry>;
  fileHash: string;
}

const cache = new Map<string, CacheEntry>();

export function getIdentifiers(
  filePath: string,
  fileContent: string,
  comments: CommentNode[],
  config?: TfIdfConfig
): TfIdfIdentifier[] {
  const fileHash = hashContent(fileContent);
  const cached = cache.get(filePath);

  if (cached && cached.fileHash === fileHash) {
    // Cache hit — return existing identifiers
    return reconstructFromCache(cached.identifiers, comments);
  }

  // Cache miss — recompute
  const identifiers = generateIdentifiers(comments, config);

  // Update cache
  const entries = new Map<string, RegistryEntry>();
  for (const id of identifiers) {
    entries.set(id.slug, {
      identifier: id.slug,
      range: id.source.range,
      contentHash: hashContent(id.source.text)
    });
  }
  cache.set(filePath, { identifiers: entries, fileHash });

  return identifiers;
}

export function invalidate(filePath: string): void {
  cache.delete(filePath);
}

export function invalidateAll(): void {
  cache.clear();
}

function hashContent(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}
```

## Integration Point

### `services/codebase/language-services/typescript-language-service.ts`

The change is in `extractStructure()` after building comment containers:

```typescript
// BEFORE:
containerSymbols.push(
  ...buildContainerGroups('comments', 'comments', result.orphanComments)
);

// AFTER:
const commentContainers = buildContainerGroups('comments', 'comments', result.orphanComments);

if (commentContainers.length > 0) {
  // Extract comment text for each container from file content
  const commentNodes = commentContainers.map(container => ({
    text: extractTextFromRange(result.content, container.range),
    range: { startLine: container.range.startLine, endLine: container.range.endLine },
    kind: container.kind
  }));

  // Generate TF-IDF identifiers
  const identifiers = getIdentifiers(filePath, result.content, commentNodes);

  // Rename containers with TF-IDF slugs
  for (let i = 0; i < commentContainers.length; i++) {
    if (identifiers[i]) {
      commentContainers[i].name = identifiers[i].slug;
    }
  }
}

containerSymbols.push(...commentContainers);
```

### Text Extraction Helper

```typescript
function extractTextFromRange(content: string, range: FileSymbolRange): string {
  const lines = content.split('\n');
  return lines.slice(range.startLine - 1, range.endLine).join('\n');
}
```

## TF-IDF Pipeline Detail

### Stage 1: Corpus Building

Each comment container's text becomes one "document" in the TF-IDF corpus. The corpus is **file-scoped** — identifiers are distinctive within the document, not globally.

**Preprocessing per document:**
1. Strip comment delimiters (`//`, `/*`, `*/`, `/**`, `*`)
2. Tokenize with `natural.WordTokenizer` → splits on whitespace/punctuation
3. `natural.TfIdf.addDocument()` handles stop word removal and Porter stemming internally

### Stage 2: Scoring

`natural.TfIdf` computes per-term scores automatically:
- **TF** (Term Frequency): How often a term appears in this comment relative to total terms
- **IDF** (Inverse Document Frequency): `log(totalDocuments / documentsContainingTerm)`
- **TF-IDF** = TF × IDF — high for terms that are frequent here but rare elsewhere

`tfidf.listTerms(docIndex)` returns terms sorted by score descending.

### Stage 3: Identifier Generation

1. Take top N terms (default 3)
2. Join with hyphens: `term1-term2-term3`
3. Collision check against `usedSlugs` map
4. Numeric suffix on collision: `term1-term2-term3-2`

### Example

Given a TS file with three comment blocks:

```typescript
// Handles OAuth2 authentication flow
// and token refresh logic

// Database connection pooling
// with automatic retry on failure

// Handles authentication timeout
// for expired sessions
```

**Corpus:** 3 documents
**After TF-IDF scoring:**
- Doc 0: `oauth2` (high), `token` (medium), `refresh` (medium) → `oauth2-token-refresh`
- Doc 1: `database` (high), `pooling` (high), `retry` (medium) → `database-pooling-retry`
- Doc 2: `timeout` (high), `expired` (medium), `sessions` (medium) → `timeout-expired-sessions`

Note: "authentication" and "handles" appear in multiple documents, so IDF reduces their score. The distinctive terms surface instead.

**Resulting symbols in the tree:**
```
[1-2]  comments oauth2-token-refresh
[4-5]  comments database-pooling-retry
[7-8]  comments timeout-expired-sessions
```

**Dot-notation access:**
```
file_read({ file: "service.ts", symbol: "oauth2-token-refresh" })
```

## Cache Invalidation Strategy

The **in-memory registry** uses a simple file-content hash for validity:

1. On `getIdentifiers(filePath, fileContent, ...)`:
   - Hash `fileContent` with MD5
   - If cache entry exists with matching hash → return cached identifiers
   - Otherwise → recompute TF-IDF, update cache
2. On file edit via `file_edit` tool:
   - The file structure is re-extracted (existing behavior)
   - New content hash won't match → cache auto-invalidates
3. On VS Code reload:
   - In-memory cache is empty → lazy rebuild on first read

No explicit invalidation calls needed in the normal flow — the content hash handles it.

## Workspace Registration

Add `@packages/tfidf` to the root `package.json` workspaces array:

```json
{
  "workspaces": [
    "mcp-server",
    "packages/log-consolidation",
    "packages/tfidf",
    "inspector"
  ]
}
```

## Future Expansion (Phase 2+)

Once validated on TS/JS comments:
- **Markdown**: Paragraphs, list items, table cells, code blocks
- **JSON/JSONC**: Anonymous object nodes, comment blocks
- **Other container types**: Imports/exports groups (if naming becomes an issue)
- **String distance**: Use `natural`'s Levenshtein/Jaro-Winkler for near-duplicate detection
- **LLM collision resolution**: Replace numeric suffix with LLM-generated semantic alternatives

## Testing Strategy

### Unit Tests (`packages/tfidf/src/__tests__/`)

1. **Tokenization**: Verify comment delimiters are stripped correctly
2. **Stop word filtering**: Common words don't appear in identifiers
3. **Stemming**: Related words map to same stem
4. **Scoring**: Distinctive terms rank higher than common terms
5. **Collision resolution**: Numeric suffix applied correctly
6. **Cache**: Hit/miss behavior, invalidation on content change

### Integration Tests

1. **TypeScript files**: Comment containers get semantic names
2. **Multiple comment blocks**: Each gets a distinctive identifier
3. **Single-line comments**: Standalone comments get named
4. **Adjacent comment groups**: Properly grouped and named
5. **File re-read**: Cache returns consistent identifiers
6. **File edit + re-read**: Identifiers update after content change

### Edge Cases

1. Empty comment (`// `) → fallback to generic name with position
2. Single-word comment → single-term slug
3. All identical comments → collision suffix applies
4. Very long comments → top terms still distinctive
5. Non-English comments → tokenizer handles Unicode, terms are whatever tokens surface
6. Comments with only stop words → fallback needed
