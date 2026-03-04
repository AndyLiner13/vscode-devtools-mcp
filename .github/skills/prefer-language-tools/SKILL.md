---
name: prefer-language-tools
description: "Enforces preferring semantic language tools (Usages, Rename) over grep/regex/edit-based searching and renaming for all coding tasks. Use on EVERY coding task that involves finding references, navigating code, understanding symbol usage, renaming symbols, or exploring the codebase. This skill applies to ALL coding work — not just explicit search requests."
---

# Prefer Language Tools Over Grep/Regex

## Core Rule

**ALWAYS prefer #tool:search/usages and #tool:edit/rename over #tool:search/textSearch, regex-based searching, or manual #tool:edit/editFiles editing.**

These tools use the VS Code language server — they are semantically aware, handle aliases, re-exports, and cross-file references with zero false positives. Grep and regex are pattern-matching heuristics that miss context, return false positives, and cannot understand language semantics.

## When to Use #tool:search/usages

Use **before** resorting to grepor regex whenever you need to:

- Find all references to a function, class, variable, type, or interface
- Understand where a symbol is used across the codebase
- Check if something is safe to modify or delete
- Trace call chains or data flow through symbols
- Discover implementations of an interface or overrides of a method
- Verify the impact of a change before making it

### How It Works

#tool:search/usages takes a file URI and a position (line/character, 0-based) pointing to any symbol occurrence. It returns every usage across the workspace with exact file, line, and column — grouped by file. No guessing, no regex patterns, no missed results.

### Example: Checking Usages Before a Change

Instead of:
```
#tool:search/textSearch(query: "processData", isRegexp: false)  // ❌ Finds string matches, not semantic usages
```

Do:
```
#tool:search/usages(uri: "file:///path/to/file.ts", line: 42, character: 10)  // ✅ Finds all real usages
```

## When to Use #tool:edit/rename

Use **instead of** #tool:edit/editFiles, or manual string replacement whenever you need to:

- Rename a function, variable, class, type, parameter, or property
- Rename across the entire codebase in one atomic operation
- Ensure imports, re-exports, and string references update correctly

### How It Works

#tool:edit/rename takes a file URI, a position pointing to the symbol, and the new name. It renames every occurrence workspace-wide — including imports, type references, and destructured usages — in one operation. No missed references, no broken imports.

### Example: Renaming a Symbol

Instead of:
```
#tool:edit/editFiles(query: "oldName")           // ❌ Find occurrences
replace_string_in_file(old: "oldName")  // ❌ Replace one at a time, miss imports
```

Do:
```
#tool:edit/rename(uri: "file:///path/to/file.ts", line: 5, character: 16, newName: "newName")  // ✅ All-at-once semantic rename
```

## Decision Hierarchy

For any codebase exploration or modification task, follow this order:

1. **#tool:search/usages** — Use first for finding references, understanding usage, impact analysis
2. **#tool:edit/rename** — Use for any symbol renaming across files
3. **Grep/regex** — Use ONLY as a fallback when:
   - Searching for plain text strings, comments, or non-code content
   - Searching for patterns that aren't language symbols (log messages, URLs, config values)
   - The language server doesn't support the file type
   - You need fuzzy/partial matching (e.g., all functions starting with "handle")

## Supported Languages

These tools work with the full range of VS Code language server supported types: TypeScript, JavaScript, TSX, JSX, CSS, SCSS, LESS, Markdown, JSON, and more. If the file is open or part of the workspace and has language support, prefer these tools.

## Anti-Patterns to Avoid

- **Grepping for a function name** when you could use #tool:search/usages on it directly
- **Using #tool:edit/editFiles multiple times** to rename a symbol across files when #tool:edit/rename does it atomically
- **Running #tool:search/codebase** to find where a class is used when #tool:search/usages gives exact results
- **Guessing search terms** and iterating on grep patterns when a single #tool:search/usages call returns complete results
- **Making changes without checking usages first** — always verify impact with #tool:search/usages before editing
