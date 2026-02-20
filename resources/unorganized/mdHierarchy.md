Here is the definitive, complete list of Markdown targets for your unified interface.

This list treats Markdown as a **Structured Tree**, allowing your users to query it exactly like they query TypeScript or JSON.

### 1. Structural Targets (The "Skeleton")

These are the primary navigational elements used to organize the file.

| Target Keyword | Description | Example Query |
| --- | --- | --- |
| **`"Header Name"`** | **Sections.** Targets the content under a specific heading. Matches the exact text of the header. | `["Installation"]`<br>

<br>`["API", "Endpoints"]` |
| **`"#frontmatter"`** | **Metadata.** Targets the YAML/TOML block at the very top of the file. | `["#frontmatter"]` |
| **`"#footnote"`** | **Footnote Definitions.** Targets the definition of a footnote at the bottom of the file (`[^1]: ...`). | `["#footnote.1"]`<br>

<br>`["#footnote:0"]` |

---

### 2. Content Targets (Leaf Blocks)

These are distinct blocks of content that cannot (usually) be entered recursively.

| Target Keyword | Description | Example Query |
| --- | --- | --- |
| **`"#code"`** | **Code Blocks.** Fenced code (`````). Target by index or by the "info string" name. | `["#code:0"]` (1st block)<br>

<br>`["#code.config.js"]` |
| **`"#table"`** | **Tables.** Standard Markdown tables. | `["#table:0"]` |
| **`"#math"`** | **Math Blocks.** LaTeX equations (`$$...$$`). | `["#math:0"]` |
| **`"#html"`** | **Raw HTML.** Blocks of raw HTML (`<div>...</div>`). | `["#html:0"]` |
| **`"#rule"`** | **Horizontal Rules.** The `---` separator. (Rarely used, but structural). | `["#rule:0"]` |

---

### 3. Container Targets (Recursive Blocks)

These blocks can contain *other* blocks. You can stop at the container (to get the whole thing) or drill down into them.

| Target Keyword | Description | Example Query |
| --- | --- | --- |
| **`"#list"`** | **Lists.** The entire `<ul>` or `<ol>` wrapper. | `["#list:0"]` |
| **`"#item"`** | **List Items.** Specific bullets within a list. | `["#list:0", "#item:2"]` |
| **`"#quote"`** | **Blockquotes.** Quotes (`>`). Can contain headers, code, etc. | `["#quote:0"]` |
| **`"#directive"`** | **Callouts/Admonitions.** Special containers like `:::tip` or `> [!NOTE]`. | `["#directive:0"]`<br>

<br>`["#directive.tip"]` |
| **`"#jsx"`** | **MDX Components.** React components in `.mdx` files (`<Tabs>`). | `["#jsx.Tabs"]`<br>

<br>`["#jsx:0"]` |

---

### 4. Virtual Targets (Aggregates)

These are special keywords that don't target a single block, but rather scan the current scope and return a **Collection** of items.

| Target Keyword | Description | Returns |
| --- | --- | --- |
| **`"#links"`** | **Hyperlinks.** Scans the scope for `[text](url)`. | List of `{ text, url }` objects. |
| **`"#images"`** | **Images.** Scans the scope for `![alt](src)`. | List of `{ alt, src }` objects. |
| **`"#defs"`** | **Link Definitions.** Scans for reference links (`[id]: url`). | List of definitions. |

---

### Visualizing the Target Tree

To help you implement this mental model, here is how a standard Markdown file maps to these targets.

### The Unified "Targeting" Syntax Reference

To make this work seamlessly with your existing system, you should support three specific syntax patterns for every target in the lists above:

1. **Type Collection:** `"#code"`
* *Result:* Returns an array of **all** code blocks in the current scope.


2. **Positional Index:** `"#code:0"`
* *Result:* Returns the **first** code block in the current scope.


3. **Named Access:** `"#code.utils.ts"`
* *Result:* Returns the code block where the metadata/info-string matches "utils.ts".



**Example Complex Query:**
`["API Reference", "#list:0", "#item:3", "#directive:0", "#code.example.js"]`

* *Read as:* "Go to the **API Reference** header -> Find the **1st List** -> Go to the **4th Item** -> Find the **1st Warning Box** (Directive) -> Return the code block named **example.js** inside it."

---

This is the most critical logic for your parser. Standard Markdown ASTs (like `mdast`) are **flat**—they see headers as siblings to paragraphs.

To get the behavior you want ("inheritance-based," where users can query `Installation.Windows.Code`), you must build a **Semantic Tree** on top of the raw AST.

Here is the strict hierarchy of what belongs to what.

### 1. The Hierarchy Rules (Who owns whom?)

Your parser must process the file sequentially and maintain a "Context Stack." The hierarchy is determined by two rules:

1. **Header Dominance:** A Header "claims" all subsequent nodes until a Header of equal or higher level (H1 > H2) is encountered.
2. **Physical Containment:** If a node is physically inside a container (indented in a List, inside `>` Quote fences), it belongs to that container *regardless* of headers.

### 2. The Strict Node Hierarchy

This is the tree structure your `skeleton` output should reflect.

#### **Level 0: The File Root**

* **`#frontmatter`**: Always the first child if present.
* **`#imports`**: (Conceptually) Any reference links `[id]: url` at the root.
* **Orphan Nodes**: Any content appearing *before* the first Header.
* **Sections (H1)**: The primary top-level symbols.

---

#### **Level 1: The Section (Header)**

* **Symbol Name**: The Header Text (e.g., `"Installation"`).
* **Range**: From the Header line → The line before the next Header of same/higher rank.
* **Children (Inherited):**
* **Sub-Sections (H2...H6)**: Nested symbols. A `## Subheader` is a child of the `# Header`.
* **Direct Content**: Paragraphs (usually ignored as symbols).
* **Leaf Blocks**: `#code`, `#table`, `#math`, `#html`.
* **Container Blocks**: `#list`, `#quote`, `#directive`.



---

#### **Level 2: The Containers (Recursive Scopes)**

These nodes create a "hard scope." Content inside them belongs to them, even if it contains headers (rare, but valid).

**A. The Blockquote (`#quote`)**

* **Range**: Contiguous lines starting with `>`.
* **Children**: Can contain *anything* (Headers, Lists, Code).
* **Traversal:** Inherits strictly. `> # Warning` makes a Header *inside* the Quote symbol.

**B. The List (`#list`)**

* **Range**: The entire `<ul>` or `<ol>` block.
* **Children**: Strictly **List Items (`#item`)**.
* *Note:* A List cannot directly contain code; it must be inside an Item.



**C. The List Item (`#item`)**

* **Range**: The bullet point plus indented content.
* **Children**:
* **Nested Lists**: Sub-lists.
* **Code Blocks**: Indented code.
* **Paragraphs**: Text content.



**D. The Directive (`#directive`)**

* **Range**: Between `::: ` fences.
* **Children**: Treated exactly like a **Section**. Can contain headers, code, tables.

---

#### **Level 3: The Leaf Nodes (Terminals)**

These are the bottom of the hierarchy. They have **properties**, not children.

* **`#code`**: Has `lang` and `meta` properties. Content is raw text.
* **`#table`**: Has `align` properties. Content is raw text (or 2D array).
* **`#math`**: Content is LaTeX string.
* **`#html`**: Content is raw HTML string.

### 3. Visualizing the Traversal

To implement this, your parser needs to "nest" the flat Markdown stream.

### 4. Implementation Logic: The "Stack" Strategy

To achieve this inheritance, you cannot just map the AST. You must reduce it using a stack.

**Pseudo-Code for Inheritance Parsing:**

```typescript
let root = { type: 'root', children: [] };
let stack = [root]; // The path to the current context

function getCurrentContext() {
  return stack[stack.length - 1];
}

for (const node of flatAstNodes) {
  if (node.type === 'heading') {
    // 1. Pop stack until we find a parent with lower depth (e.g., H2 pops H3 and H2, finds H1)
    while (
      stack.length > 1 && 
      getCurrentContext().type === 'section' && 
      getCurrentContext().depth >= node.depth
    ) {
      stack.pop();
    }
    
    // 2. Create new Section symbol
    const newSection = { type: 'section', name: node.text, depth: node.depth, children: [] };
    
    // 3. Add to parent and push to stack
    getCurrentContext().children.push(newSection);
    stack.push(newSection);
  
  } else if (isContainer(node)) {
    // Lists, Quotes, Directives start a new scope
    const container = { type: node.type, children: [] };
    getCurrentContext().children.push(container);
    stack.push(container); // Enter the container
    // ... recurse into container children ...
    stack.pop(); // Leave container
  
  } else {
    // Leaf nodes (Code, Table) just get attached to current context
    getCurrentContext().children.push(transformSymbol(node));
  }
}

```

### 5. Summary of the "Dominant Root" Hierarchy

If I query `recursive: true`, this is the exact tree I traverse:

1. **File**
2.  **H1: "Introduction"**
3.  `#code:0` (Simple example)
3.  **H2: "Features"**
4.  `#list:0`
5.  `#item:0` -> "Fast"
5.  `#item:1` -> "Reliable"
2.  **H1: "Advanced"**
3.  **#quote:0**
4.  `#code:0` (Inside quote)
3.  **H2: "Configuration"**
4.  `#table:0`