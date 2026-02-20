# Parser System Blueprint

## Overview

This blueprint defines the architecture for a unified parsing system that extracts hierarchical symbol information from non-code file types (Markdown, YAML, TOML, HTML, CSS, XML/XAML). The system integrates with the existing `codebaseService.ts` and provides consistent symbol hierarchy data for the `codebase_overview` tool.

## Goals

1. **Accuracy over Speed**: Prioritize correct parsing and deep symbol extraction
2. **Graceful Degradation**: Handle broken/malformed files without crashing
3. **Consistent Output**: All parsers produce the same `CodebaseSymbolNode` structure
4. **Depth Control**: Respect the `depth` parameter for all file types
5. **Extensibility**: Easy to add new file types in the future

---

## Library Selection

| File Type | Library | Rationale |
|-----------|---------|-----------|
| **Markdown** | `remark-parse` + `unified` + plugins | True mdast AST, GFM tables, frontmatter, code blocks |
| **YAML** | `yaml` | Full Document AST with node types, position info |
| **TOML** | `smol-toml` | TOML 1.1.0, fastest, TypeScript native |
| **HTML** | `parse5` | WHATWG HTML5 compliant, accurate tree, error recovery |
| **CSS** | `css-tree` | True AST, selectors/declarations/values, W3C validation |
| **XML/XAML** | `fast-xml-parser` | Fast, handles large files, built-in validation |

### Error Handling Capabilities

| Library | Broken File Behavior |
|---------|---------------------|
| `remark-parse` | Graceful - processes what it can, wraps unparseable in raw nodes |
| `yaml` | Configurable - can collect errors without throwing, returns partial |
| `smol-toml` | Throws on syntax errors - wrap in try/catch, return partial |
| `parse5` | **WHATWG mandated recovery** - browsers must not fail, same here |
| `css-tree` | Tolerant by design - wraps invalid content in `Raw` nodes |
| `fast-xml-parser` | Has validation mode - can disable strict for recovery |

---

## Architecture

### Component Hierarchy

```
codebaseService.ts
├── getOverview()
│   ├── buildTree()              # File system tree
│   └── populateSymbols()        # Dispatches to appropriate parser
│       ├── VS Code API          # TypeScript, JavaScript, Python, etc.
│       ├── parseJsonSymbols()   # Existing (built-in JSON.parse)
│       └── parseFileSymbols()   # NEW: Unified parser dispatcher
│           ├── parseMarkdown()
│           ├── parseYaml()
│           ├── parseToml()
│           ├── parseHtml()
│           ├── parseCss()
│           └── parseXml()
```

### Parser Interface

All parsers implement this common interface:

```typescript
interface FileParser {
  /**
   * Parse a file and extract hierarchical symbols
   * @param content - Raw file content as string
   * @param depth - Maximum depth to extract (0=none, 1=top-level, 2=nested, etc.)
   * @returns Array of symbol nodes or null on complete failure
   */
  parse(content: string, depth: number): CodebaseSymbolNode[] | null;
  
  /**
   * File extensions this parser handles
   */
  extensions: string[];
}
```

### Symbol Node Structure (existing)

```typescript
interface CodebaseSymbolNode {
  name: string;       // Symbol name (heading text, key name, selector, etc.)
  kind: string;       // Symbol kind (see mapping below)
  start: number;      // 1-based line number
  end: number;        // 1-based line number
  children: CodebaseSymbolNode[];
}
```

---

## Symbol Kind Mapping

Each file type maps its AST nodes to appropriate VS Code `SymbolKind` values for consistency:

### Markdown → Symbol Kinds

| AST Node | Symbol Kind | Example |
|----------|-------------|---------|
| `heading` (level 1) | `Module` | `# Main Title` |
| `heading` (level 2) | `Class` | `## Section` |
| `heading` (level 3-6) | `Method` | `### Subsection` |
| `code` (fenced) | `Property` | ````typescript ... ``` |
| `table` | `Struct` | `| col | col |` |
| `yaml` (frontmatter) | `Namespace` | `---\ntitle: ...\n---` |
| `list` | `Array` | `- item\n- item` |
| `blockquote` | `String` | `> quote text` |

### YAML → Symbol Kinds

| AST Node | Symbol Kind | Example |
|----------|-------------|---------|
| `YAMLMap` (root) | `Namespace` | Top-level object |
| `Pair` (string value) | `Property` | `key: "value"` |
| `Pair` (object value) | `Object` | `key:\n  nested: val` |
| `Pair` (array value) | `Array` | `key:\n  - item` |
| `YAMLSeq` | `Array` | `- a\n- b\n- c` |
| `Scalar` (when standalone) | `Constant` | `---\nplain value` |

### TOML → Symbol Kinds

| Pattern | Symbol Kind | Example |
|---------|-------------|---------|
| `[section]` | `Class` | `[database]` |
| `[[array]]` | `Array` | `[[servers]]` |
| key = string | `Property` | `name = "value"` |
| key = number | `Number` | `port = 8080` |
| key = boolean | `Boolean` | `enabled = true` |
| key = array | `Array` | `ports = [80, 443]` |
| key = inline table | `Object` | `point = { x = 1, y = 2 }` |

### HTML → Symbol Kinds

| AST Node | Symbol Kind | Example |
|----------|-------------|---------|
| `<html>` | `Module` | Document root |
| `<head>` | `Namespace` | Head section |
| `<body>` | `Namespace` | Body section |
| `<div>`, `<section>`, `<article>` | `Class` | Structural elements |
| `<h1>` - `<h6>` | `Method` | Headings |
| `<script>` | `Function` | Script blocks |
| `<style>` | `Property` | Style blocks |
| `<form>` | `Struct` | Form elements |
| `<table>` | `Struct` | Tables |
| Other elements | `Variable` | Generic elements |

### CSS → Symbol Kinds

| AST Node | Symbol Kind | Example |
|----------|-------------|---------|
| `Rule` (type selector) | `Class` | `body { }` |
| `Rule` (class selector) | `Class` | `.container { }` |
| `Rule` (ID selector) | `Constant` | `#header { }` |
| `Atrule` (@media) | `Namespace` | `@media screen { }` |
| `Atrule` (@keyframes) | `Event` | `@keyframes fade { }` |
| `Atrule` (@import) | `Package` | `@import url(...)` |
| `Declaration` | `Property` | `color: red;` |
| `Value` | `String` | `red`, `#fff`, `10px` |

### XML/XAML → Symbol Kinds

| AST Node | Symbol Kind | Example |
|----------|-------------|---------|
| Root element | `Module` | `<Root>` |
| Element with children | `Class` | `<Parent><Child/></Parent>` |
| Element (leaf) | `Variable` | `<LeafElement />` |
| Attribute | `Property` | `attr="value"` |
| CDATA section | `String` | `<![CDATA[...]]>` |
| Processing instruction | `Event` | `<?xml ... ?>` |

---

## Depth Control Behavior

The `depth` parameter controls how deep we extract symbols:

| Depth | Behavior |
|-------|----------|
| 0 | No symbols (file tree only) |
| 1 | Top-level symbols only (H1 headings, root keys, top-level selectors) |
| 2 | First-level nesting (H2 under H1, nested objects, nested selectors) |
| 3+ | Deeper nesting (H3+, deeply nested structures) |

### Example: Markdown at Different Depths

**Input:**
```markdown
# Overview
## Installation
### Prerequisites
## Usage
### Basic
### Advanced
```

**Depth 1:**
```
└── Overview (Module)
```

**Depth 2:**
```
└── Overview (Module)
    ├── Installation (Class)
    └── Usage (Class)
```

**Depth 3:**
```
└── Overview (Module)
    ├── Installation (Class)
    │   └── Prerequisites (Method)
    └── Usage (Class)
        ├── Basic (Method)
        └── Advanced (Method)
```

---

## Parser Implementation Details

### 1. Markdown Parser (`remark-parse`)

**Dependencies:**
```json
{
  "unified": "^11.0.0",
  "remark-parse": "^11.0.0",
  "remark-gfm": "^4.0.0",
  "remark-frontmatter": "^5.0.0"
}
```

**Implementation Strategy:**
1. Configure unified processor with plugins
2. Parse to mdast (Markdown AST)
3. Walk tree, building symbol hierarchy
4. Frontmatter parsed via `remark-frontmatter` → delegate to YAML parser
5. Code blocks capture language in name: `code (typescript)`
6. Tables capture column count: `table (3 columns)`

**Error Handling:**
- `remark-parse` is lenient by design
- Malformed syntax becomes plain text or raw nodes
- Always returns some AST, never throws on parse

### 2. YAML Parser (`yaml`)

**Dependencies:**
```json
{
  "yaml": "^2.8.0"
}
```

**Implementation Strategy:**
1. Use `parseDocument()` for AST access (not `parse()`)
2. Access `doc.contents` for root YAMLMap/YAMLSeq
3. Walk using `visit()` utility from the library
4. Preserve key ordering (YAML library supports this)
5. Handle multi-document files via `parseAllDocuments()`

**Error Handling:**
- Configure `{ prettyErrors: true, logLevel: 'silent' }`
- Access `doc.errors` and `doc.warnings` arrays
- Continue processing even with errors (partial results)
- Return null only on catastrophic failures

### 3. TOML Parser (`smol-toml`)

**Dependencies:**
```json
{
  "smol-toml": "^1.6.0"
}
```

**Implementation Strategy:**
1. Parse returns plain object (no AST)
2. Build symbols by traversing the result object
3. Infer structure: sections become `Class`, keys become properties
4. For section detection: `[section]` → entries under that key
5. Array of tables: `[[array]]` → detect arrays at top level

**Error Handling:**
- `smol-toml` throws on parse errors
- Wrap in try/catch
- On error: return null (no partial parsing available)
- Good error messages include line/column

### 4. HTML Parser (`parse5`)

**Dependencies:**
```json
{
  "parse5": "^8.0.0"
}
```

**Implementation Strategy:**
1. Use `parse()` for full document or `parseFragment()` for snippets
2. Parse5 returns a tree of nodes with `nodeName`, `childNodes`, `attrs`
3. Walk tree recursively, mapping elements to symbols
4. Semantic elements get priority: `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`
5. Include element ID/class in name when present: `div#main.container`

**Error Handling:**
- Parse5 follows WHATWG spec for error recovery
- Malformed HTML is corrected (missing close tags, etc.)
- Use `onParseError` callback to log issues silently
- Always returns a valid tree

### 5. CSS Parser (`css-tree`)

**Dependencies:**
```json
{
  "css-tree": "^3.1.0"
}
```

**Implementation Strategy:**
1. Use `csstree.parse()` with `{ tolerant: true }`
2. Walk AST with `csstree.walk()`
3. Focus on `Rule` (selectors) and `Atrule` (@-rules)
4. Extract selector text as symbol name
5. Nest declarations under rules when depth allows
6. Handle @media nesting properly

**Error Handling:**
- `tolerant: true` wraps errors in `Raw` nodes
- Invalid CSS doesn't crash parser
- Partial stylesheets still produce useful symbols

### 6. XML Parser (`fast-xml-parser`)

**Dependencies:**
```json
{
  "fast-xml-parser": "^5.3.0"
}
```

**Implementation Strategy:**
1. Configure parser with `{ ignoreAttributes: false, attributeNamePrefix: "@_" }`
2. Enable `{ preserveOrder: true }` for consistent structure
3. Walk resulting object to build symbol hierarchy
4. Element names are symbol names
5. Attributes shown as children when depth allows

**Error Handling:**
- Use `{ allowBooleanAttributes: true }` for HTML-style attrs
- Disable strict validation when parsing potentially broken XML
- Catch parse errors, return null on failure
- Optionally: validate first, parse with recovery second

---

## File Extension Mapping

```typescript
const PARSER_EXTENSIONS: Record<string, string> = {
  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdx': 'markdown',
  
  // YAML
  '.yaml': 'yaml',
  '.yml': 'yaml',
  
  // TOML
  '.toml': 'toml',
  
  // HTML
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  
  // CSS
  '.css': 'css',
  
  // XML/XAML
  '.xml': 'xml',
  '.xaml': 'xml',
  '.svg': 'xml',
  '.xsl': 'xml',
  '.xslt': 'xml',
  '.rss': 'xml',
  '.atom': 'xml',
  '.plist': 'xml',
  '.csproj': 'xml',
  '.fsproj': 'xml',
  '.vbproj': 'xml',
  '.props': 'xml',
  '.targets': 'xml',
};
```

---

## Integration Points

### 1. CodebaseService Changes

```typescript
// In populateSymbols():
const symbols = await this.getSymbolsForFile(document);
if (!symbols || symbols.length === 0) {
  // Fallback to custom parsers
  const ext = path.extname(filePath).toLowerCase();
  const parserType = PARSER_EXTENSIONS[ext];
  
  if (parserType) {
    const content = document.getText();
    const customSymbols = await this.parseFileSymbols(content, parserType, depth);
    if (customSymbols) {
      node.symbols = customSymbols;
      return;
    }
  }
}
```

### 2. Parser Module Structure

```
extension/
  services/
    codebaseService.ts      # Main service
    parsers/
      index.ts              # Parser dispatcher
      markdownParser.ts
      yamlParser.ts
      tomlParser.ts
      htmlParser.ts
      cssParser.ts
      xmlParser.ts
      types.ts              # Shared types
```

### 3. Dependency Installation

```bash
# In extension directory
pnpm add unified remark-parse remark-gfm remark-frontmatter
pnpm add yaml
pnpm add smol-toml
pnpm add parse5
pnpm add css-tree
pnpm add fast-xml-parser

# Type definitions (for packages without built-in types)
pnpm add -D @types/css-tree
```

---

## Testing Strategy

### Test Categories

1. **Unit Tests per Parser**
   - Valid file parsing at each depth level
   - Edge cases (empty files, single-node files)
   - Broken/malformed file recovery
   - Large file handling

2. **Integration Tests**
   - End-to-end codebase_overview with mixed file types
   - Depth parameter respected across all parsers
   - Symbol kind consistency

3. **Test Files Location**

```
client-workspace/
  docs/
    simple.md           # Basic headings
    complex.md          # Tables, code blocks, frontmatter
    broken.md           # Malformed markdown
  config/
    app.yaml            # Valid YAML
    broken.yaml         # Invalid YAML (partial parse)
    config.toml         # Valid TOML
    pyproject.toml      # Real-world TOML
  markup/
    index.html          # Valid HTML
    broken.html         # Missing close tags
    styles.css          # Valid CSS
    broken.css          # Invalid selectors
    data.xml            # Valid XML
    broken.xml          # Malformed XML
```

---

## Performance Considerations

1. **Lazy Loading**: Import parsers only when needed for specific file types
2. **Caching**: Consider caching parsed symbols for unchanged files
3. **Timeout**: Implement parsing timeout for extremely large files
4. **Memory**: Stream large XML files if possible (fast-xml-parser supports this)

---

## Future Enhancements

1. **Additional File Types**
   - INI files (simple key-value)
   - Properties files (Java)
   - Dockerfile
   - Makefile
   - GraphQL schemas

2. **Enhanced Symbol Extraction**
   - Link targets in Markdown
   - CSS custom properties (--variables)
   - XML namespace awareness

3. **Source Maps**
   - Track exact character positions for better navigation
   - Support "go to definition" in non-code files

---

## Appendix: AST Examples

### Markdown mdast

```javascript
{
  type: 'root',
  children: [
    {
      type: 'heading',
      depth: 1,
      children: [{ type: 'text', value: 'Title' }],
      position: { start: { line: 1 }, end: { line: 1 } }
    },
    {
      type: 'code',
      lang: 'typescript',
      value: 'const x = 1;',
      position: { start: { line: 3 }, end: { line: 5 } }
    }
  ]
}
```

### YAML Document AST

```javascript
Document {
  contents: YAMLMap {
    items: [
      Pair {
        key: Scalar { value: 'name' },
        value: Scalar { value: 'my-project' }
      },
      Pair {
        key: Scalar { value: 'dependencies' },
        value: YAMLMap { items: [...] }
      }
    ]
  }
}
```

### Parse5 HTML Tree

```javascript
{
  nodeName: 'html',
  childNodes: [
    {
      nodeName: 'head',
      childNodes: [
        { nodeName: 'title', childNodes: [{ nodeName: '#text', value: 'Page' }] }
      ]
    },
    {
      nodeName: 'body',
      childNodes: [...]
    }
  ]
}
```

### CSS-Tree AST

```javascript
{
  type: 'StyleSheet',
  children: [
    {
      type: 'Rule',
      prelude: {
        type: 'SelectorList',
        children: [{ type: 'Selector', children: [...] }]
      },
      block: {
        type: 'Block',
        children: [
          { type: 'Declaration', property: 'color', value: {...} }
        ]
      }
    }
  ]
}
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-XX | Initial blueprint |
