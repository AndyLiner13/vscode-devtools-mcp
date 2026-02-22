# Structure Consistency Analysis: TS/JS vs Markdown vs JSON

## Executive Summary

The three language services share a **common interface** (`LanguageService` → `FileStructure`) but differ in how they model "coverage" — specifically what counts as a symbol, what's orphaned, and what are gaps. JSON has a unique structural quirk: the root container (`{}`/`[]`) braces are not part of any symbol, creating "phantom gaps" at the top and bottom of every file.

---

## 1. How Each Language Models Symbols

### TypeScript / JavaScript

**Symbol coverage model: Declaration-based**

Every top-level declaration (function, class, interface, type, enum, namespace, variable) becomes a symbol. Symbols have 1-indexed ranges that cover their **entire text span** — from the first keyword to the closing brace/semicolon.

```
Line 1:  // block comment                → orphaned (comment)
Line 10: type StringAlias = string;     → symbol: type StringAlias [10-10]
Line 12: export class UserService {     → symbol: class UserService [12-100]
Line 100: }                             → part of UserService (line 100)
Line 101:                               → gap (blank)
```

**Key property:** Every line of meaningful code is owned by a symbol or an orphaned item. The only gaps are blank lines, section-header comments, or content between declarations.

**Orphaned categories:** `import`, `export`, `comment`, `directive`

### Markdown

**Symbol coverage model: Heading-dominance (sections own everything)**

Each heading creates a "section" symbol whose range extends from the heading line to just before the next sibling/parent heading (or EOF). All content below a heading (paragraphs, lists, code blocks, tables) is **owned by the section symbol** as children.

```
Line 1:  ---                            → symbol: frontmatter frontmatter [1-18]
Line 18: ---
Line 20: <!-- comment -->                → orphaned (comment)
Line 28: # Title                         → symbol: section Title [28-29]
Line 30: ## Sub                          → symbol: section Sub [30-772]
Line 31: paragraph text...              → owned by section Sub (within range)
```

**Key property:** Sections are **all-encompassing** — a heading owns all subsequent content until the next heading. There are virtually no "unowned" lines except orphaned content before the first heading.

**Orphaned categories:** `comment`, `footnote`, `linkdef`

### JSON (Current)

**Symbol coverage model: Key-value property-based**

Each key-value pair in the root object becomes a top-level symbol. Nested objects/arrays create child symbols. **BUT: the root container braces (`{` and `}`) are not symbols themselves.** They're structural delimiters that become orphaned/gaps.

```
Line 1:  {                              → GAP (no symbol owns this)
Line 2:  "name": "test",               → symbol: string name [2-2]
Line 3:  "settings": {                  → symbol: object settings [3-5]
Line 5:  },
Line 6:  }                              → GAP (no symbol owns this)
Line 7:  (trailing newline)             → GAP
```

**The problem:** Lines 1, 6, and 7 are "gaps" because no symbol covers them. This causes:
1. `startLine/endLine` structured range mode shows them as extra lines (atomic block expansion)
2. `coveragePercent` is lower than expected (root braces aren't "covered")
3. Skeleton output starts at line 2, not line 1, which is confusing

---

## 2. Feature Comparison

| Feature | TypeScript | Markdown | JSON (Current) |
|---|---|---|---|
| **skeleton** | ✅ Shows orphans + symbols | ✅ Shows sections | ✅ Shows key-value pairs |
| **recursive** | ✅ Expands children | ✅ Expands section content | ✅ Expands nested objects |
| **target** | ✅ By symbol name | ✅ By section heading | ✅ By JSON key |
| **dot-path** | ✅ `Class.method` | ✅ `Section.Subsection` | ✅ `object.nestedKey` |
| **#imports** | ✅ | ❌ N/A | ❌ N/A |
| **#exports** | ✅ | ❌ N/A | ❌ N/A |
| **#comments** | ✅ Orphan comments | ✅ HTML comments | ✅ JSONC comments |
| **startLine/endLine** | ✅ Clean boundaries | ✅ Clean boundaries | ⚠️ Root braces create gaps |
| **file-edit target** | ✅ | ✅ | ✅ |
| **codebase_map symbols** | ✅ | N/A (uses headings) | ✅ |
| **Root coverage** | ✅ 100% (all lines owned) | ✅ ~100% (sections span all) | ⚠️ <100% (root braces unowned) |

---

## 3. The Root Coverage Problem

### Why TS/JS and Markdown Don't Have This Issue

**TypeScript:** Every declaration's range covers its complete text. A `class Foo { ... }` from line 10-50 includes both the opening `{` (line 10) and closing `}` (line 50). There are no "wrapper" braces outside of declarations.

**Markdown:** Sections use heading-dominance — a heading owns everything below it until the next heading. The first heading can start at line 1 (or frontmatter starts at line 1). There are no structural delimiters that need to be accounted for.

**JSON:** The root `{`/`}` or `[`/`]` are required syntax but don't correspond to any named key-value property. The parser correctly extracts properties as symbols, but the container itself has no representation.

### Examples of the Problem

**Structured range `startLine: 1, endLine: 10` on a 10-line JSONC file:**
```
[1] {                         ← unowned gap line
[2]   // JSONC supports comments
[3] string name               ← collapsed stub
[4] string version             ← collapsed stub
[5-8] object settings          ← collapsed stub
[9] string [0]                 ← collapsed stub
[10] }                         ← unowned gap line
[11]                           ← trailing blank (expanded because gap block 10-11 is atomic)
```

Lines 1, 10, and 11 are all gaps — they have no owning symbol.

**Equivalent TS file would NOT have this problem** because line 1 would be owned by the file's first declaration or an `import` statement, and the last line would be owned by the final symbol or an `export`.

---

## 4. Proposed Solution

### Approach: Extend Root Symbol Coverage

The JSON parser currently extracts children of the root node as top-level symbols. The fix is to **extend the first top-level symbol's range to include all preceding non-symbol lines** (like the root `{`) and **extend the last top-level symbol's range to include all trailing non-symbol lines** (like the root `}`).

This mirrors how TypeScript and Markdown naturally handle boundaries:
- TS: The first `import` or declaration starts at line 1
- MD: The first heading/frontmatter starts at line 1
- JSON (proposed): The first key-value pair's range starts at line 1

### What Changes

| Before | After |
|---|---|
| `[2-82] object primitiveTypes` | `[1-82] object primitiveTypes` |
| `[484-498] array exhaustiveTypeMatrix` | `[484-499] array exhaustiveTypeMatrix` |
| Gap at line 1 (`{`) | Line 1 owned by first symbol |
| Gap at last line (`}`) | Last line owned by last symbol |

### Why This Works

1. **Skeleton stays clean** — no root wrapper, no change to the tree structure
2. **Structured ranges work correctly** — no phantom gaps at file boundaries
3. **Coverage is 100%** — every line in the file is owned
4. **file-edit target still works** — replacing `primitiveTypes` would include the root `{`... which is actually correct because you'd edit the entire section including its context
5. **Consistent with TS/JS** — the first symbol absorbs the file header, the last absorbs the footer

### Edge Cases to Handle

| Case | Behavior |
|---|---|
| Root is `[]` (array file) | First `[0]` starts at line 1, last `[N]` ends at last line |
| Empty file `{}` | No symbols → entire file is a gap (acceptable, like an empty TS file) |
| Single key `{"key": "val"}` | That one symbol owns lines 1-N |
| Root is a primitive (rare) | No symbol → full file is raw content (acceptable) |
| JSONL (line-by-line) | Each line is already its own root → no wrapping braces |

---

## 5. Implementation Plan

**File to modify:** `services/codebase/language-services/json-language-service.ts`

**Logic:**
1. After `const symbols = symbolNodes.map(convertSymbolNode);`
2. If `symbols.length > 0`:
   - Set `symbols[0].range.startLine = 1`
   - Set `symbols[symbols.length - 1].range.endLine = lineCount`
3. This naturally absorbs root braces and trailing whitespace

**No other files need changes** — the fix is entirely within the JSON language service, maintaining the same `FileStructure` contract that `file-read.ts` and `file-edit.ts` already consume.
