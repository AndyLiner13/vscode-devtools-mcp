**The core pipeline**

The TF-IDF system sits as a separate service layer that your read tool calls when it encounters a node that has no natural named identity. It takes raw text content as input and produces a stable semantic identifier as output. It operates entirely independently of the language server and the AST parser — it's purely a text analysis service that any part of your system can call.

The pipeline has three sequential stages: corpus building, scoring, and identifier generation. Each stage feeds the next and they run in order whenever a file is indexed or re-indexed.

**Stage 1: Corpus building**

Before you can score any individual node, you need to know the distribution of terms across the whole document. This means first doing a full pass through every addressable node in the file — every paragraph, every comment, every import, every code block — and building a frequency map of every term across all of them.

A term at this stage is a raw token after basic normalization: lowercase, stripped of punctuation, with stop words removed. Stop words for code-adjacent content should include both standard English stop words and common programming stop words like "function", "return", "const", "let", "var", "the", "this", "that" — words that appear everywhere and carry no distinctive meaning.

For TypeScript files the corpus is all non-symbol nodes in the file. For Markdown files the corpus is all content nodes — paragraphs, code blocks, table cells, list items. The corpus is scoped to the file, not across your entire project, because you want identifiers that are distinctive within the document, not globally unique across all documents.

**Stage 2: Scoring**

With the corpus built you score each node individually. For each term in a node you compute its TF score — how often it appears in that node relative to the node's total term count — and its IDF score — the log of the total number of nodes divided by the number of nodes containing that term. Multiply them together to get the TF-IDF score for that term in that node.

You then rank all terms in the node by their TF-IDF score and take the top two or three. These are the terms that are both frequent within this specific node and rare across the rest of the document — exactly what makes a good identifier.

For code blocks you apply a slightly different scoring pass before TF-IDF. You extract the language tag first since that's always part of the identifier, then you apply TF-IDF only to the meaningful tokens in the code itself — identifiers, function names, string literals — rather than to keywords and syntax.

For TypeScript comment nodes you want to weight proper nouns and technical terms more heavily. A comment mentioning "OAuth" or "PostgreSQL" or a specific class name should have those terms surface to the top regardless of frequency, because they're the most semantically meaningful signals. You can achieve this by applying a multiplier to any term that appears as a named symbol elsewhere in the same file.

**Stage 3: Identifier generation**

Once you have the top terms for a node you compose them into an identifier using a consistent slug format — lowercase, hyphen-separated, type-prefixed. The type prefix comes from the AST node type: `comment.`, `paragraph.`, `import.`, `directive.`, `table.`, `list.`.

The terms are joined in TF-IDF score order, highest first. So a comment heavily featuring "authentication" and "timeout" becomes `comment.authentication-timeout`. A paragraph about installing PostgreSQL dependencies becomes `paragraph.postgresql-dependencies`.

After composing the candidate identifier you run a collision check against the current document's identifier registry. If no collision exists the identifier is registered and returned. If a collision exists you pass the candidate, the colliding identifier, and the node's full content to your LLM summarization service with an instruction to generate a semantically adjacent alternative that doesn't conflict with anything in the registry. This is the only point in the pipeline where an LLM is involved, and it only triggers on collision which should be rare for a well-tuned TF-IDF implementation.

**The identifier registry**

The registry is the persistent sidecar index that lives alongside each file. It maps identifier to AST node position, and it's updated after every edit operation. When a node's content changes its identifier is recomputed and the registry is updated. When a new node is inserted it gets a new identifier added to the registry. When a node is deleted its identifier is retired from the registry.

The registry also stores a content hash alongside each identifier — not as the identifier itself, but as a validity check. When your read tool resolves a dot notation path it checks that the content hash at that position still matches what the registry expects. If it doesn't, the file has been modified outside your system and you trigger a re-index before proceeding.

**How this integrates with your existing read tool**

Your read tool already produces a tree of addressable nodes. The TF-IDF service is called during the indexing pass for any node that doesn't have a natural named identity from the language server or the structural parser. The resulting identifier is attached to the node in the tree exactly like a symbol name would be. From Copilot's perspective every node in the tree has a dot notation address regardless of whether that address came from the language server, the structural parser, or the TF-IDF service. The origin of the identifier is invisible to Copilot.

**Re-indexing strategy**

You don't want to re-run the full TF-IDF pipeline on every edit because corpus rebuilding is the expensive part. Instead you use an incremental strategy. On edit, you update only the nodes that changed and any nodes whose TF-IDF scores might be affected by the change — which is any node that contained terms that appeared in the edited content. In practice this is usually a small subset of the document. You only do a full corpus rebuild when the structural shape of the document changes significantly, like when large sections are added or deleted.

**The separation of concerns**

The important architectural point is that TF-IDF is a fallback service, not a primary addressing mechanism. Your system has a clear priority chain: named identity from the language server or structural parser first, TF-IDF for anonymous nodes second. The TF-IDF service doesn't need to know anything about TypeScript or Markdown — it just receives text and returns an identifier. The language-specific logic lives in the indexing layer that decides which nodes need TF-IDF identifiers and which already have natural ones. That separation keeps the TF-IDF service simple, testable, and reusable across every file type your system supports.