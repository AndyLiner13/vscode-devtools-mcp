# codebase_map Schema Options: File-Type-Specific Symbols

This document compares different approaches for making the `show.symbols` parameter file-type-specific, allowing each file type to have its own set of valid symbol kinds.

---

## Problem Statement

The current schema uses generic symbol kinds that don't map well to all file types:

```json
{
  "show": { "symbols": ["classes", "functions"] }
}
```

**Issues:**
- `classes` and `functions` make sense for TypeScript, but not for CSS or HTML
- CSS has `selectors`, `at-rules`, `custom-properties` — different concepts
- HTML has `semantic-tags`, `forms`, `headings` — different concepts
- JSON has `keys`, `arrays`, `objects` — different concepts

---

## Symbol Kinds by File Type

### TypeScript/JavaScript
- `functions`, `classes`, `interfaces`, `types`, `enums`, `constants`
- `methods`, `properties`, `parameters`, `exports`, `imports`

### CSS
- `selectors`, `at-rules`, `custom-properties`
- `keyframes`, `media-queries`, `layers`

### HTML
- `semantic-tags`, `headings`, `forms`, `tables`, `media`, `scripts`

### JSON/YAML/TOML
- `keys`, `arrays`, `objects`, `strings`, `numbers`, `booleans`

### Markdown
- `headings`, `code-blocks`, `links`, `lists`, `tables`

### XML
- `elements`, `attributes`, `namespaces`, `processing-instructions`

---

## Option A: Nested by File Type

### Schema
```typescript
show: {
  folders?: boolean;
  files?: boolean;
  typescript?: ("functions" | "classes" | "interfaces" | "types" | ...)[];
  css?: ("selectors" | "at-rules" | "custom-properties" | ...)[];
  html?: ("semantic-tags" | "headings" | "forms" | ...)[];
  json?: ("keys" | "arrays" | "objects" | ...)[];
  yaml?: ("keys" | "arrays" | "objects" | ...)[];
  markdown?: ("headings" | "code-blocks" | "links" | ...)[];
  xml?: ("elements" | "attributes" | ...)[];
}
```

### Example Input
```json
{
  "scope": { "include": ["src/**", "**/*.css", "**/*.md"] },
  "show": {
    "folders": true,
    "files": true,
    "typescript": ["classes", "functions"],
    "css": ["selectors", "at-rules"],
    "markdown": ["headings"]
  },
  "detail": "signatures"
}
```

### Example Output
```
src/
  services/
    AuthService.ts
      class AuthService
      function createToken(...)
styles/
  main.css
    .button
    .card
    @media screen and (min-width: 768px)
docs/
  README.md
    # Project Overview
      ## Installation
      ## Usage
```

### Pros
- Clean, flat structure
- Clear separation by file type
- IntelliSense can suggest valid options per key
- Omitting a key = no symbols for that type

### Cons
- Many top-level keys in `show`
- What if user wants all symbols for a type? Need `"typescript": ["*"]`

---

## Option B: Symbols Object with File Type Keys

### Schema
```typescript
show: {
  folders?: boolean;
  files?: boolean;
  symbols?: {
    typescript?: ("functions" | "classes" | ...)[]; 
    css?: ("selectors" | "at-rules" | ...)[];
    html?: ("semantic-tags" | ...)[];
    json?: ("keys" | ...)[];
    yaml?: ("keys" | ...)[];
    markdown?: ("headings" | ...)[];
    xml?: ("elements" | ...)[];
  };
}
```

### Example Input
```json
{
  "scope": { "include": ["src/**", "**/*.css"] },
  "show": {
    "folders": true,
    "files": true,
    "symbols": {
      "typescript": ["classes", "interfaces"],
      "css": ["selectors"]
    }
  },
  "detail": "names"
}
```

### Example Output
```
src/
  models/
    User.ts
      class User
      interface UserProfile
styles/
  main.css
    .button
    #header
    [data-theme]
```

### Pros
- Keeps `symbols` as a single key (familiar structure)
- Clear grouping of all symbol configuration
- Allows `symbols: {}` to mean "no symbols"

### Cons
- Deeper nesting
- Slightly more verbose

---

## Option C: Separate Top-Level Params

### Schema
```typescript
{
  scope: { ... };
  show: { folders?: boolean; files?: boolean };
  showTypescript?: ("functions" | "classes" | ...)[];
  showCss?: ("selectors" | "at-rules" | ...)[];
  showHtml?: ("semantic-tags" | ...)[];
  showJson?: ("keys" | ...)[];
  showYaml?: ("keys" | ...)[];
  showMarkdown?: ("headings" | ...)[];
  showXml?: ("elements" | ...)[];
  detail: "minimal" | "names" | "signatures" | "full";
}
```

### Example Input
```json
{
  "scope": { "include": "**" },
  "show": { "folders": true, "files": true },
  "showTypescript": ["classes", "functions"],
  "showCss": ["selectors", "custom-properties"],
  "showHtml": ["semantic-tags"],
  "detail": "signatures"
}
```

### Example Output
```
src/
  App.ts
    class App
    function main(...)
styles/
  theme.css
    .primary
    --color-primary
pages/
  index.html
    <html>
      <head>
      <body>
```

### Pros
- Very flat structure
- Each file type is a separate, independent param
- Easy to understand: "I want these symbols from TypeScript files"

### Cons
- Many top-level params (cluttered schema)
- Repetitive naming (`showTypescript`, `showCss`, ...)
- Harder to set a universal default

---

## Option D: Wildcard with Overrides (Hybrid)

### Schema
```typescript
show: {
  folders?: boolean;
  files?: boolean;
  symbols?: ("*" | "none") | {
    default?: ("*" | "none");
    typescript?: ("functions" | "classes" | ...)[];
    css?: ("selectors" | ...)[];
    // ... other file types
  };
}
```

### Example Input: All Symbols Everywhere
```json
{
  "scope": { "include": "**" },
  "show": {
    "files": true,
    "symbols": "*"
  }
}
```

### Example Input: All Symbols with CSS Override
```json
{
  "scope": { "include": ["src/**", "**/*.css"] },
  "show": {
    "files": true,
    "symbols": {
      "default": "*",
      "css": ["selectors"]
    }
  }
}
```

### Example Input: No Symbols Except TypeScript
```json
{
  "scope": { "include": "**" },
  "show": {
    "files": true,
    "symbols": {
      "default": "none",
      "typescript": ["classes", "functions"]
    }
  }
}
```

### Pros
- Flexible: simple `"*"` for all, or fine-grained control
- `default` key handles "everything else"
- Backward compatible with simple use case

### Cons
- More complex schema
- Two modes: string or object
- Slightly harder to understand

---

## Option E: Filter by Kind (Current + Extensions)

### Schema
Keep the current approach but expand symbol kinds to be file-type-aware:

```typescript
show: {
  folders?: boolean;
  files?: boolean;
  symbols?: (
    // Universal
    | "*" | "none"
    
    // TypeScript/JS
    | "ts:classes" | "ts:functions" | "ts:interfaces" | "ts:types"
    | "ts:methods" | "ts:properties" | "ts:exports"
    
    // CSS
    | "css:selectors" | "css:at-rules" | "css:custom-properties"
    
    // HTML
    | "html:semantic-tags" | "html:headings" | "html:forms"
    
    // JSON/YAML
    | "json:keys" | "json:arrays" | "yaml:keys"
    
    // Markdown
    | "md:headings" | "md:code-blocks" | "md:links"
    
    // XML
    | "xml:elements" | "xml:attributes"
  )[];
}
```

### Example Input
```json
{
  "scope": { "include": ["src/**", "**/*.css", "**/*.md"] },
  "show": {
    "files": true,
    "symbols": ["ts:classes", "ts:functions", "css:selectors", "md:headings"]
  },
  "detail": "signatures"
}
```

### Example Output
```
src/
  App.ts
    class App
    function main(...)
styles/
  main.css
    .button
    .card
docs/
  README.md
    # Project Overview
      ## Installation
```

### Pros
- Single flat array (familiar)
- Prefix makes file type explicit
- Can mix and match freely
- Backward compatible: `"*"` still works

### Cons
- Long enum values
- Prefix syntax may feel verbose
- Namespace collision risk (mitigated by prefix)

---

## Comparison Summary

| Option | Schema Style | Example Input | Verbosity | Flexibility |
|--------|--------------|---------------|-----------|-------------|
| **A** | `show: { typescript: [...], css: [...] }` | Nested | Medium | High |
| **B** | `show: { symbols: { typescript: [...] } }` | Nested | Medium | High |
| **C** | `showTypescript: [...], showCss: [...]` | Flat | High | High |
| **D** | `symbols: "*"` or `{ default: "*", css: [...] }` | Hybrid | Low-Medium | Very High |
| **E** | `symbols: ["ts:classes", "css:selectors"]` | Flat array | Medium | High |

---

## Recommendation

**Option D (Hybrid)** or **Option E (Prefixed)** seem most practical:

- **Option D** is best if you want a simple default case (`"*"`) with optional overrides
- **Option E** is best if you want a single flat array that's explicit about file types

Both maintain backward compatibility with the current `symbols: ["*"]` pattern.

---

*Choose the approach that best fits your mental model for the tool's API.*
