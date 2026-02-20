# Tool Blueprint: `codebase_overview`

> **Status:** Ready to build  
> **Build Order:** 1 of N (foundational — bootstraps all subsequent tools)  
> **Category:** `CODEBASE_ANALYSIS`

---

## 1. Purpose

Give Copilot (and any MCP client) a **complete structural map** of a codebase in a single call, using a recursive tree structure that mirrors VS Code's file explorer. The depth parameter provides granular control over how many levels of symbol nesting to include per file.

### Replaces
- VS Code's built-in `#codebase` LM tool (which only does shallow token-level search)
- Manual `list_dir` → `read_file` loops that Copilot currently does to understand project structure

### Use Cases
1. **First-contact orientation** — "What does this project do? How is it structured?"
2. **Module discovery** — "Where do the tools live? What are the entry points?"
3. **Interface understanding** — "What methods does this class expose?"
4. **Change planning** — "Before I add a feature, where should it go?"

---

## 2. Interface

### Schema

```typescript
{
  rootDir: z.string()
    .optional()
    .describe('Absolute path to the project root. Defaults to the workspace root.'),

  depth: z.number()
    .int()
    .min(0)
    .max(6)
    .optional()
    .default(1)
    .describe(
      'How many levels of symbol nesting to include per file. ' +
      '0: file tree only (no symbols). ' +
      '1: top-level symbols (functions, classes, interfaces, enums, constants). ' +
      '2: members inside containers (class methods, interface fields, enum members). ' +
      '3+: deeper nesting (parameters, inner types, nested definitions). ' +
      'Each level progressively reveals more detail about each file\'s internal structure.'
    ),

  filter: z.string()
    .optional()
    .describe('Glob pattern to include only matching files/directories (e.g., "src/tools/**").'),

  includeImports: z.boolean()
    .optional()
    .default(false)
    .describe('Include import module specifiers per file.'),

  includeStats: z.boolean()
    .optional()
    .default(false)
    .describe('Include line counts per file and diagnostic counts.'),

  response_format: responseFormatSchema,
}
```

### Depth Levels Explained

```
depth: 0  — File tree only
  📁 src/
  ├── 📁 tools/
  │   ├── 📄 ToolDefinition.ts
  │   ├── 📄 console.ts
  │   └── 📄 terminal.ts
  └── 📄 main.ts

depth: 1  — Top-level symbols per file
  📁 src/
  ├── 📁 tools/
  │   ├── 📄 ToolDefinition.ts
  │   │   ├── defineTool [function]
  │   │   ├── ToolDefinition [interface]
  │   │   ├── ResponseFormat [enum]
  │   │   └── CHARACTER_LIMIT [constant]
  │   ├── 📄 console.ts
  │   │   └── readConsole [variable]
  │   └── 📄 terminal.ts
  │       ├── run [variable]
  │       ├── input [variable]
  │       └── kill [variable]
  └── 📄 main.ts
      ├── registerTool [function]
      └── startServer [function]

depth: 2  — Members inside containers
  📁 src/tools/
  ├── 📄 ToolDefinition.ts
  │   ├── ToolDefinition [interface]
  │   │   ├── name: string
  │   │   ├── description: string
  │   │   ├── annotations [object]
  │   │   ├── schema [generic]
  │   │   └── handler: (request, response) => Promise<void>
  │   ├── defineTool [function]
  │   └── ResponseFormat [enum]
  │       ├── MARKDOWN
  │       └── JSON

depth: 3+ — Deeper nesting (parameters, inner types, etc.)
  ... progressively reveals nested symbols within methods, etc.
```

### Output Shape

```typescript
interface CodebaseOverviewResult {
  projectRoot: string;
  tree: TreeNode[];
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSymbols: number;
    diagnosticCounts?: { errors: number; warnings: number };
  };
}

/** Recursive tree node — can be a directory, file, or symbol */
interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: TreeNode[];          // Subdirectories and files (for directories)
  symbols?: SymbolNode[];         // Symbol tree (for files, when depth > 0)
  imports?: string[];             // Import specifiers (when includeImports=true)
  lines?: number;                 // Line count (when includeStats=true)
}

/** Recursive symbol node — mirrors VS Code's DocumentSymbol hierarchy */
interface SymbolNode {
  name: string;
  kind: string;                   // 'function' | 'class' | 'interface' | 'enum' | 'variable' | 'constant' | 'method' | 'property' | 'namespace' | ...
  detail?: string;                // Type signature or value hint from DocumentSymbol.detail
  range: { start: number; end: number };  // Line range (1-based)
  children?: SymbolNode[];        // Nested symbols (methods, properties, inner types)
}
```

### Example JSON Output (depth: 2, filter: "src/tools/**")

```json
{
  "projectRoot": "c:/workspace/mcp-server",
  "tree": [
    {
      "name": "src",
      "type": "directory",
      "children": [
        {
          "name": "tools",
          "type": "directory",
          "children": [
            {
              "name": "ToolDefinition.ts",
              "type": "file",
              "symbols": [
                {
                  "name": "CHARACTER_LIMIT",
                  "kind": "constant",
                  "detail": "25000",
                  "range": { "start": 16, "end": 16 }
                },
                {
                  "name": "ResponseFormat",
                  "kind": "enum",
                  "range": { "start": 21, "end": 24 },
                  "children": [
                    { "name": "MARKDOWN", "kind": "enum-member", "range": { "start": 22, "end": 22 } },
                    { "name": "JSON", "kind": "enum-member", "range": { "start": 23, "end": 23 } }
                  ]
                },
                {
                  "name": "ToolDefinition",
                  "kind": "interface",
                  "range": { "start": 39, "end": 84 },
                  "children": [
                    { "name": "name", "kind": "property", "detail": "string", "range": { "start": 43, "end": 43 } },
                    { "name": "description", "kind": "property", "detail": "string", "range": { "start": 44, "end": 44 } },
                    { "name": "annotations", "kind": "property", "range": { "start": 50, "end": 74 } },
                    { "name": "schema", "kind": "property", "detail": "Schema", "range": { "start": 75, "end": 75 } },
                    { "name": "handler", "kind": "property", "range": { "start": 77, "end": 80 } }
                  ]
                },
                {
                  "name": "defineTool",
                  "kind": "function",
                  "range": { "start": 98, "end": 102 }
                }
              ]
            },
            {
              "name": "console.ts",
              "type": "file",
              "symbols": [
                {
                  "name": "readConsole",
                  "kind": "variable",
                  "range": { "start": 81, "end": 250 }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "summary": {
    "totalFiles": 8,
    "totalDirectories": 2,
    "totalSymbols": 42
  }
}
```

### Example Markdown Output (depth: 1, filter: "src/tools/**")

```
## Codebase Overview: c:/workspace/mcp-server

📁 src/
└── 📁 tools/
    ├── 📄 ToolDefinition.ts
    │   ├── CHARACTER_LIMIT [constant]
    │   ├── ResponseFormat [enum]
    │   ├── ToolDefinition [interface]
    │   ├── defineTool [function]
    │   ├── responseFormatSchema [constant]
    │   ├── checkCharacterLimit [function]
    │   └── createPaginationMetadata [function]
    ├── 📄 categories.ts
    │   ├── ToolCategory [enum]
    │   └── labels [constant]
    ├── 📄 console.ts
    │   └── readConsole [variable]
    ├── 📄 terminal.ts
    │   ├── run [variable]
    │   ├── input [variable]
    │   ├── read [variable]
    │   └── kill [variable]
    └── 📄 tools.ts
        └── tools [constant]

---
**Summary:** 8 files, 2 directories, 18 symbols
```

---

## 3. Architecture

### Data Flow

```
MCP Client (Copilot)
    │
    ▼
┌────────────────────────────────────────┐
│ MCP Server: codebase_overview tool     │
│ (mcp-server/src/tools/codebase/)       │
│                                        │
│ 1. Parse params (zod)                  │
│ 2. Call bridge: codebase.getOverview   │
│ 3. Format response (md tree / json)    │
└────────────────┬───────────────────────┘
                 │ JSON-RPC via named pipe
                 ▼
┌────────────────────────────────────────┐
│ Extension: codebase.getOverview handler│
│ (extension/client-handlers.ts)         │
│                                        │
│ 1. workspace.findFiles() → file list   │
│ 2. Build directory tree from paths     │
│ 3. Per-file: executeDocumentSymbol     │
│    Provider(uri) → symbol tree         │
│ 4. Prune symbol tree to requested depth│
│ 5. Return recursive tree structure     │
└────────────────────────────────────────┘
```

### VS Code APIs Used

| API | Purpose |
|-----|---------|
| `workspace.findFiles(include, exclude)` | File discovery with gitignore support |
| `vscode.commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uri)` | Hierarchical symbol tree per file |
| `workspace.openTextDocument(uri)` | Count lines, extract imports |
| `languages.getDiagnostics()` | Error/warning counts (optional) |

### Key Design: DocumentSymbol → SymbolNode

VS Code's `DocumentSymbol` is already recursive (a class has children: methods, properties). We simply:
1. Get the `DocumentSymbol[]` array for a file
2. Recursively traverse, converting to `SymbolNode`
3. Prune at the requested depth

```
DocumentSymbol tree:         depth=1 output:         depth=2 output:
  Class Foo                    Foo [class]            Foo [class]
    Method bar()                                        bar [method]
    Property baz                                        baz [property]
  Function qux               qux [function]           qux [function]
```

---

## 4. Files to Create/Modify

### 4.1 New Files

| File | Purpose |
|------|---------|
| `mcp-server/src/tools/codebase/index.ts` | Re-export all codebase tools |
| `mcp-server/src/tools/codebase/codebase-overview.ts` | MCP tool definition |
| `extension/services/codebaseService.ts` | Core analysis engine |

### 4.2 Modified Files

| File | Change |
|------|--------|
| `mcp-server/src/tools/categories.ts` | Add `CODEBASE_ANALYSIS` enum value + label |
| `mcp-server/src/tools/tools.ts` | Import and spread `codebaseTools` |
| `mcp-server/src/client-pipe.ts` | Add `codebaseGetOverview()` RPC method + types |
| `extension/client-handlers.ts` | Add `codebase.getOverview` handler + `CodebaseService` init |

---

## 5. Implementation Details

### 5.1 Extension: `codebaseService.ts`

```typescript
// extension/services/codebaseService.ts

import * as vscode from 'vscode';

// ── Serializable Types (for JSON-RPC transport) ──────────

export interface OverviewParams {
  rootDir?: string;
  depth: number;
  filter?: string;
  includeImports: boolean;
  includeStats: boolean;
}

export interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: TreeNode[];
  symbols?: SymbolNode[];
  imports?: string[];
  lines?: number;
}

export interface SymbolNode {
  name: string;
  kind: string;
  detail?: string;
  range: { start: number; end: number };
  children?: SymbolNode[];
}

export interface OverviewResult {
  projectRoot: string;
  tree: TreeNode[];
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSymbols: number;
    diagnosticCounts?: { errors: number; warnings: number };
  };
}

// ── CodebaseService ──────────────────────────────────────

export class CodebaseService {

  async getOverview(params: OverviewParams): Promise<OverviewResult> {
    const rootDir = params.rootDir
      ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootDir) throw new Error('No workspace folder found');

    const rootUri = vscode.Uri.file(rootDir);

    // Step 1: Find all source files
    const include = params.filter
      ? new vscode.RelativePattern(rootUri, params.filter)
      : new vscode.RelativePattern(rootUri, '**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}');

    const exclude = new vscode.RelativePattern(
      rootUri,
      '{**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/.devtools/**}'
    );

    const fileUris = await vscode.workspace.findFiles(include, exclude, 5000);

    // Step 2: Build recursive directory tree
    const tree = this.buildTree(rootDir, fileUris);

    // Step 3: Populate symbols per file (if depth > 0)
    let totalSymbols = 0;
    if (params.depth > 0) {
      totalSymbols = await this.populateSymbols(tree, params.depth, params.includeImports, params.includeStats);
    } else if (params.includeStats) {
      await this.populateStats(tree);
    }

    // Step 4: Diagnostics (optional)
    let diagnosticCounts: { errors: number; warnings: number } | undefined;
    if (params.includeStats) {
      diagnosticCounts = this.getDiagnosticCounts();
    }

    // Count directories
    const totalDirectories = this.countDirectories(tree);

    return {
      projectRoot: rootDir,
      tree,
      summary: {
        totalFiles: fileUris.length,
        totalDirectories,
        totalSymbols,
        diagnosticCounts,
      },
    };
  }

  /** Build a recursive tree from a flat list of file URIs */
  private buildTree(rootDir: string, fileUris: vscode.Uri[]): TreeNode[] {
    const root: Map<string, TreeNode> = new Map();

    for (const uri of fileUris) {
      const relativePath = vscode.workspace.asRelativePath(uri, false);
      const parts = relativePath.split('/');

      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        if (!current.has(dirName)) {
          const dirNode: TreeNode = { name: dirName, type: 'directory', children: [] };
          current.set(dirName, dirNode);
        }
        const dirNode = current.get(dirName)!;
        if (!dirNode.children) dirNode.children = [];

        // Use the children array as a pseudo-map for the next level
        const childMap = new Map<string, TreeNode>();
        for (const child of dirNode.children) {
          childMap.set(child.name, child);
        }
        current = childMap;

        // Sync back to the dirNode.children array
        dirNode.children = [...childMap.values()];
      }

      // Add the file node
      const fileName = parts[parts.length - 1];
      if (!current.has(fileName)) {
        const fileNode: TreeNode = { name: fileName, type: 'file' };
        current.set(fileName, fileNode);
      }
    }

    // Convert root map to sorted array
    return this.sortTree([...root.values()]);
  }

  /** Sort tree: directories first, then files, both alphabetical */
  private sortTree(nodes: TreeNode[]): TreeNode[] {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        node.children = this.sortTree(node.children);
      }
    }
    return nodes;
  }

  /** Walk tree and populate symbols for file nodes */
  private async populateSymbols(
    nodes: TreeNode[],
    maxDepth: number,
    includeImports: boolean,
    includeStats: boolean,
  ): Promise<number> {
    let totalSymbols = 0;

    for (const node of nodes) {
      if (node.type === 'directory' && node.children) {
        totalSymbols += await this.populateSymbols(node.children, maxDepth, includeImports, includeStats);
      } else if (node.type === 'file') {
        const uri = this.resolveFileUri(node);
        if (!uri) continue;

        // Get symbols from VS Code language service
        const docSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
          'vscode.executeDocumentSymbolProvider', uri
        );

        if (docSymbols) {
          node.symbols = this.convertSymbols(docSymbols, maxDepth, 1);
          totalSymbols += this.countSymbols(node.symbols);
        }

        if (includeImports || includeStats) {
          const doc = await vscode.workspace.openTextDocument(uri);
          if (includeImports) {
            node.imports = this.extractImports(doc.getText());
          }
          if (includeStats) {
            node.lines = doc.lineCount;
          }
        }
      }
    }

    return totalSymbols;
  }

  /** Recursively convert DocumentSymbol[] to SymbolNode[], pruning at maxDepth */
  private convertSymbols(
    symbols: vscode.DocumentSymbol[],
    maxDepth: number,
    currentDepth: number,
  ): SymbolNode[] {
    return symbols.map(symbol => {
      const node: SymbolNode = {
        name: symbol.name,
        kind: this.mapSymbolKind(symbol.kind),
        range: {
          start: symbol.range.start.line + 1,
          end: symbol.range.end.line + 1,
        },
      };

      if (symbol.detail) {
        node.detail = symbol.detail;
      }

      if (symbol.children.length > 0 && currentDepth < maxDepth) {
        node.children = this.convertSymbols(symbol.children, maxDepth, currentDepth + 1);
      }

      return node;
    });
  }

  /** Walk tree and add line counts to file nodes */
  private async populateStats(nodes: TreeNode[]): Promise<void> {
    for (const node of nodes) {
      if (node.type === 'directory' && node.children) {
        await this.populateStats(node.children);
      } else if (node.type === 'file') {
        const uri = this.resolveFileUri(node);
        if (!uri) continue;
        const doc = await vscode.workspace.openTextDocument(uri);
        node.lines = doc.lineCount;
      }
    }
  }

  /** Resolve a file node to its URI by walking up the tree path */
  private resolveFileUri(node: TreeNode): vscode.Uri | undefined {
    // Implementation note: During the tree walk in populateSymbols,
    // we need to reconstruct the full path. We pass the root URI
    // through the traversal context. See actual implementation below.
    // This is a placeholder — actual implementation tracks full path
    // during the tree walk.
    return undefined;
  }

  /** Extract import specifiers from source text */
  private extractImports(text: string): string[] {
    const imports: string[] = [];
    const importRegex = /(?:import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    let match;
    while ((match = importRegex.exec(text)) !== null) {
      const specifier = match[1] ?? match[2];
      if (specifier && !imports.includes(specifier)) {
        imports.push(specifier);
      }
    }
    return imports;
  }

  /** Map VS Code SymbolKind to a readable string */
  private mapSymbolKind(kind: vscode.SymbolKind): string {
    const map: Record<number, string> = {
      [vscode.SymbolKind.File]: 'file',
      [vscode.SymbolKind.Module]: 'module',
      [vscode.SymbolKind.Namespace]: 'namespace',
      [vscode.SymbolKind.Package]: 'package',
      [vscode.SymbolKind.Class]: 'class',
      [vscode.SymbolKind.Method]: 'method',
      [vscode.SymbolKind.Property]: 'property',
      [vscode.SymbolKind.Field]: 'field',
      [vscode.SymbolKind.Constructor]: 'constructor',
      [vscode.SymbolKind.Enum]: 'enum',
      [vscode.SymbolKind.Interface]: 'interface',
      [vscode.SymbolKind.Function]: 'function',
      [vscode.SymbolKind.Variable]: 'variable',
      [vscode.SymbolKind.Constant]: 'constant',
      [vscode.SymbolKind.String]: 'string',
      [vscode.SymbolKind.Number]: 'number',
      [vscode.SymbolKind.Boolean]: 'boolean',
      [vscode.SymbolKind.Array]: 'array',
      [vscode.SymbolKind.Object]: 'object',
      [vscode.SymbolKind.Key]: 'key',
      [vscode.SymbolKind.Null]: 'null',
      [vscode.SymbolKind.EnumMember]: 'enum-member',
      [vscode.SymbolKind.Struct]: 'struct',
      [vscode.SymbolKind.Event]: 'event',
      [vscode.SymbolKind.Operator]: 'operator',
      [vscode.SymbolKind.TypeParameter]: 'type-parameter',
    };
    return map[kind] ?? 'unknown';
  }

  /** Count total symbols in a tree */
  private countSymbols(symbols: SymbolNode[]): number {
    let count = symbols.length;
    for (const s of symbols) {
      if (s.children) count += this.countSymbols(s.children);
    }
    return count;
  }

  /** Count directories in a tree */
  private countDirectories(nodes: TreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'directory') {
        count++;
        if (node.children) count += this.countDirectories(node.children);
      }
    }
    return count;
  }

  /** Get workspace diagnostic counts */
  private getDiagnosticCounts(): { errors: number; warnings: number } {
    const allDiagnostics = vscode.languages.getDiagnostics();
    let errors = 0;
    let warnings = 0;
    for (const [, diagnostics] of allDiagnostics) {
      for (const d of diagnostics) {
        if (d.severity === vscode.DiagnosticSeverity.Error) errors++;
        else if (d.severity === vscode.DiagnosticSeverity.Warning) warnings++;
      }
    }
    return { errors, warnings };
  }
}
```

**Implementation note:** The `resolveFileUri` placeholder above will be replaced in the actual implementation. During the tree walk in `populateSymbols`, the full path is tracked by passing the root URI and building relative paths during traversal. The actual approach will reconstruct URIs by walking the tree structure alongside the known `rootDir`.

### 5.2 Extension: Handler Registration (`client-handlers.ts`)

```typescript
// Add imports at top:
import { CodebaseService } from './services/codebaseService';

// Add module state:
let codebaseService: CodebaseService | null = null;

function getCodebaseService(): CodebaseService {
  if (!codebaseService) {
    codebaseService = new CodebaseService();
  }
  return codebaseService;
}

// Add handler function:
async function handleCodebaseGetOverview(params: Record<string, unknown>) {
  const service = getCodebaseService();
  return service.getOverview({
    rootDir: params.rootDir as string | undefined,
    depth: (params.depth as number) ?? 1,
    filter: params.filter as string | undefined,
    includeImports: (params.includeImports as boolean) ?? false,
    includeStats: (params.includeStats as boolean) ?? false,
  });
}

// In registerClientHandlers(), add:
register('codebase.getOverview', handleCodebaseGetOverview);
```

### 5.3 MCP Server: `client-pipe.ts` Additions

```typescript
// ── Codebase Types ───────────────────────────────────────

export interface CodebaseSymbolNode {
  name: string;
  kind: string;
  detail?: string;
  range: { start: number; end: number };
  children?: CodebaseSymbolNode[];
}

export interface CodebaseTreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: CodebaseTreeNode[];
  symbols?: CodebaseSymbolNode[];
  imports?: string[];
  lines?: number;
}

export interface CodebaseOverviewResult {
  projectRoot: string;
  tree: CodebaseTreeNode[];
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSymbols: number;
    diagnosticCounts?: { errors: number; warnings: number };
  };
}

// ── Codebase Methods ─────────────────────────────────────

/**
 * Get a structural overview of the codebase as a recursive tree.
 */
export async function codebaseGetOverview(
  rootDir?: string,
  depth?: number,
  filter?: string,
  includeImports?: boolean,
  includeStats?: boolean,
): Promise<CodebaseOverviewResult> {
  const result = await sendClientRequest(
    'codebase.getOverview',
    { rootDir, depth, filter, includeImports, includeStats },
    30_000,
  );
  return result as CodebaseOverviewResult;
}
```

### 5.4 MCP Server: Tool Definition (`codebase-overview.ts`)

```typescript
// mcp-server/src/tools/codebase/codebase-overview.ts

import {
  codebaseGetOverview,
  type CodebaseTreeNode,
  type CodebaseSymbolNode,
} from '../../client-pipe.js';
import { ensureClientConnection } from '../../main.js';
import { zod } from '../../third_party/index.js';
import { ToolCategory } from '../categories.js';
import {
  defineTool,
  ResponseFormat,
  responseFormatSchema,
  checkCharacterLimit,
} from '../ToolDefinition.js';

export const overview = defineTool({
  name: 'codebase_overview',
  description: `Get a structural overview of the codebase as a file tree with optional symbol nesting.

Shows the project's directory structure with progressively deeper detail controlled by the
\`depth\` parameter:
- \`depth: 0\` — File tree only (directories and filenames)
- \`depth: 1\` — Top-level symbols per file (functions, classes, interfaces, enums, constants)
- \`depth: 2\` — Members inside containers (class methods, interface fields, enum members)
- \`depth: 3+\` — Deeper nesting (parameters, inner types, nested definitions)

Use this as the FIRST tool call when exploring an unfamiliar codebase. It provides the
structural orientation needed to know what exists and where before using more targeted
tools like codebase_trace_symbol or codebase_exports.

**Examples:**
- Full project map with top-level symbols: \`{}\`
- Focus on a subdirectory: \`{ filter: "src/tools/**" }\`
- Deep dive into class internals: \`{ filter: "src/tools/**", depth: 3 }\`
- Quick file listing: \`{ depth: 0 }\`
- With imports and line counts: \`{ includeImports: true, includeStats: true }\``,
  timeoutMs: 60_000,
  annotations: {
    title: 'Codebase Overview',
    category: ToolCategory.CODEBASE_ANALYSIS,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    conditions: ['client-pipe'],
  },
  schema: {
    response_format: responseFormatSchema,
    rootDir: zod
      .string()
      .optional()
      .describe('Absolute path to the project root. Defaults to the workspace root.'),
    depth: zod
      .number()
      .int()
      .min(0)
      .max(6)
      .optional()
      .default(1)
      .describe(
        'Symbol nesting depth per file. 0=files only, 1=top-level symbols, ' +
        '2=class members, 3+=deeper nesting.'
      ),
    filter: zod
      .string()
      .optional()
      .describe('Glob pattern to include only matching files (e.g., "src/tools/**").'),
    includeImports: zod
      .boolean()
      .optional()
      .default(false)
      .describe('Include import module specifiers per file.'),
    includeStats: zod
      .boolean()
      .optional()
      .default(false)
      .describe('Include line counts per file and diagnostic counts.'),
  },
  handler: async (request, response) => {
    await ensureClientConnection();

    const result = await codebaseGetOverview(
      request.params.rootDir,
      request.params.depth,
      request.params.filter,
      request.params.includeImports,
      request.params.includeStats,
    );

    if (request.params.response_format === ResponseFormat.JSON) {
      const json = JSON.stringify(result, null, 2);
      checkCharacterLimit(json, 'codebase_overview', {
        filter: 'Glob pattern to narrow scope (e.g., "src/tools/**")',
        depth: 'Lower number = less detail (0 for file tree only)',
      });
      response.appendResponseLine(json);
      return;
    }

    // Markdown tree format
    const lines: string[] = [];
    lines.push(`## Codebase Overview: ${result.projectRoot}\n`);
    renderTree(result.tree, lines, '', true, request.params.includeStats, request.params.includeImports);

    lines.push('');
    lines.push('---');
    lines.push(`**Summary:** ${result.summary.totalFiles} files, ${result.summary.totalDirectories} directories, ${result.summary.totalSymbols} symbols`);

    if (result.summary.diagnosticCounts) {
      const { errors, warnings } = result.summary.diagnosticCounts;
      lines.push(`**Diagnostics:** ${errors} errors, ${warnings} warnings`);
    }

    const markdown = lines.join('\n');
    checkCharacterLimit(markdown, 'codebase_overview', {
      filter: 'Glob pattern to narrow scope (e.g., "src/tools/**")',
      depth: 'Lower number = less detail (0 for file tree only)',
    });
    response.appendResponseLine(markdown);
  },
});

/** Render a tree of nodes as a VS Code-style markdown tree */
function renderTree(
  nodes: CodebaseTreeNode[],
  lines: string[],
  prefix: string,
  isRoot: boolean,
  includeStats: boolean,
  includeImports: boolean,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
    const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

    if (node.type === 'directory') {
      lines.push(`${prefix}${connector}📁 ${node.name}/`);
      if (node.children) {
        renderTree(node.children, lines, childPrefix, false, includeStats, includeImports);
      }
    } else {
      const lineInfo = includeStats && node.lines !== undefined ? ` (${node.lines} lines)` : '';
      lines.push(`${prefix}${connector}📄 ${node.name}${lineInfo}`);

      // Render symbols
      if (node.symbols) {
        renderSymbols(node.symbols, lines, childPrefix);
      }

      // Render imports
      if (includeImports && node.imports && node.imports.length > 0) {
        lines.push(`${childPrefix}  imports: ${node.imports.map(i => `"${i}"`).join(', ')}`);
      }
    }
  }
}

/** Render symbol nodes as tree entries */
function renderSymbols(
  symbols: CodebaseSymbolNode[],
  lines: string[],
  prefix: string,
): void {
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const isLast = i === symbols.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    const detail = symbol.detail ? `: ${symbol.detail}` : '';
    lines.push(`${prefix}${connector}${symbol.name} [${symbol.kind}]${detail}`);

    if (symbol.children) {
      renderSymbols(symbol.children, lines, childPrefix);
    }
  }
}
```

### 5.5 Category Addition (`categories.ts`)

```typescript
export enum ToolCategory {
  INPUT = 'input',
  NAVIGATION = 'navigation',
  DEBUGGING = 'debugging',
  EDITOR_TABS = 'editor_tabs',
  UI_CONTEXT = 'ui_context',
  DEV_DIAGNOSTICS = 'dev_diagnostics',
  CODEBASE_ANALYSIS = 'codebase_analysis',   // NEW
}

export const labels = {
  // ...existing...
  [ToolCategory.CODEBASE_ANALYSIS]: 'Codebase analysis',   // NEW
};
```

### 5.6 Tool Registration (`tools.ts`)

```typescript
import * as codebaseTools from './codebase/index.js';  // NEW

const tools = [
  ...Object.values(consoleTools),
  ...Object.values(debugEvaluateTools),
  ...Object.values(inputTools),
  ...Object.values(outputPanelTools),
  ...Object.values(screenshotTools),
  ...Object.values(snapshotTools),
  ...Object.values(terminalTools),
  ...Object.values(waitTools),
  ...Object.values(codebaseTools),  // NEW
] as unknown as ToolDefinition[];
```

### 5.7 Codebase Index (`index.ts`)

```typescript
// mcp-server/src/tools/codebase/index.ts
export { overview } from './codebase-overview.js';
```

---

## 6. Test Plan

### Test Philosophy
Tests run against **this actual codebase** so they validate real behavior.

### 6.1 Extension-Side Tests (CodebaseService)

```typescript
// Test: depth 0 returns file tree without symbols
test('depth 0 returns file tree only', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 0,
    includeImports: false,
    includeStats: false,
  });

  expect(result.tree.length).toBeGreaterThan(0);
  expect(result.summary.totalFiles).toBeGreaterThan(10);
  expect(result.summary.totalSymbols).toBe(0);

  // Verify tree structure
  const srcDir = result.tree.find(n => n.name === 'src');
  expect(srcDir?.type).toBe('directory');
  expect(srcDir?.children?.some(c => c.name === 'tools')).toBe(true);

  // No symbols at depth 0
  const allFiles = flattenFiles(result.tree);
  for (const file of allFiles) {
    expect(file.symbols).toBeUndefined();
  }
});

// Test: depth 1 shows top-level symbols
test('depth 1 shows top-level symbols without nesting', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 1,
    filter: 'src/tools/ToolDefinition.ts',
    includeImports: false,
    includeStats: false,
  });

  const file = findFile(result.tree, 'ToolDefinition.ts');
  expect(file?.symbols).toBeDefined();
  expect(file!.symbols!.some(s => s.name === 'defineTool')).toBe(true);
  expect(file!.symbols!.some(s => s.name === 'ResponseFormat')).toBe(true);

  // At depth 1, no children should be present
  for (const symbol of file!.symbols!) {
    expect(symbol.children).toBeUndefined();
  }
});

// Test: depth 2 shows class/interface members
test('depth 2 shows members inside containers', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 2,
    filter: 'src/tools/ToolDefinition.ts',
    includeImports: false,
    includeStats: false,
  });

  const file = findFile(result.tree, 'ToolDefinition.ts');
  const toolDefInterface = file?.symbols?.find(s => s.name === 'ToolDefinition');
  expect(toolDefInterface?.kind).toBe('interface');
  expect(toolDefInterface?.children).toBeDefined();
  expect(toolDefInterface!.children!.some(c => c.name === 'name')).toBe(true);
  expect(toolDefInterface!.children!.some(c => c.name === 'handler')).toBe(true);
});

// Test: filter restricts scope
test('filter glob restricts file scope', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 0,
    filter: 'src/tools/*.ts',
    includeImports: false,
    includeStats: false,
  });

  const allFiles = flattenFiles(result.tree);
  expect(allFiles.length).toBeGreaterThan(0);
  expect(allFiles.length).toBeLessThan(20);

  // All files should be .ts files
  for (const file of allFiles) {
    expect(file.name).toMatch(/\.ts$/);
  }
});

// Test: includeImports populates import specifiers
test('includeImports shows module specifiers', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 0,
    filter: 'src/tools/terminal.ts',
    includeImports: true,
    includeStats: false,
  });

  const file = findFile(result.tree, 'terminal.ts');
  expect(file?.imports).toBeDefined();
  expect(file!.imports!.some(i => i.includes('client-pipe'))).toBe(true);
  expect(file!.imports!.some(i => i.includes('zod'))).toBe(true);
});

// Test: includeStats shows line counts
test('includeStats populates line counts', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 0,
    filter: 'src/tools/ToolDefinition.ts',
    includeImports: false,
    includeStats: true,
  });

  const file = findFile(result.tree, 'ToolDefinition.ts');
  expect(file?.lines).toBeGreaterThan(100);
});

// Test: node_modules excluded
test('excludes node_modules and build directories', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 0,
    includeImports: false,
    includeStats: false,
  });

  const allDirs = flattenDirectories(result.tree);
  for (const dir of allDirs) {
    expect(dir.name).not.toBe('node_modules');
    expect(dir.name).not.toBe('dist');
    expect(dir.name).not.toBe('.git');
  }
});

// Test: tree is properly sorted (dirs first, then alpha)
test('tree is sorted: directories first, then alphabetical', async () => {
  const service = new CodebaseService();
  const result = await service.getOverview({
    rootDir: mcpServerRoot,
    depth: 0,
    includeImports: false,
    includeStats: false,
  });

  for (const dir of flattenDirectories(result.tree)) {
    if (dir.children && dir.children.length > 1) {
      const dirs = dir.children.filter(c => c.type === 'directory');
      const files = dir.children.filter(c => c.type === 'file');
      const allSorted = [...dirs, ...files];
      expect(dir.children.map(c => c.name)).toEqual(allSorted.map(c => c.name));
    }
  }
});
```

### 6.2 MCP Tool Integration Tests

```typescript
// Test: valid markdown tree output
test('codebase_overview produces VS Code-style tree', async () => {
  const result = await callTool('codebase_overview', {
    filter: 'src/tools/**',
    depth: 1,
  });

  expect(result).toContain('## Codebase Overview');
  expect(result).toContain('📁');
  expect(result).toContain('📄');
  expect(result).toContain('ToolDefinition.ts');
  expect(result).toContain('[function]');
  expect(result).toContain('Summary:');
});

// Test: JSON output is parseable
test('codebase_overview JSON is valid and structured', async () => {
  const result = await callTool('codebase_overview', {
    response_format: 'json',
    depth: 1,
    filter: 'src/tools/**',
  });

  const parsed = JSON.parse(result);
  expect(parsed.projectRoot).toBeDefined();
  expect(parsed.tree).toBeInstanceOf(Array);
  expect(parsed.summary.totalFiles).toBeGreaterThan(0);
  expect(parsed.summary.totalSymbols).toBeGreaterThan(0);
});
```

---

## 7. Implementation Order

```
Step 1:  categories.ts          — Add CODEBASE_ANALYSIS enum value
Step 2:  codebaseService.ts     — CodebaseService class (getOverview + helpers)
Step 3:  client-handlers.ts     — Add handler + CodebaseService init
Step 4:  client-pipe.ts         — Add types + codebaseGetOverview() RPC method
Step 5:  codebase-overview.ts   — MCP tool definition with tree rendering
Step 6:  codebase/index.ts      — Re-export
Step 7:  tools.ts               — Import codebase tools
Step 8:  Manual test            — Run against this codebase, verify tree output
Step 9:  Automated tests        — Write test suite
```

---

## 8. Known Limitations

1. **Symbol detection vs export detection** — `executeDocumentSymbolProvider` returns ALL symbols, not just exported ones. This is by design for the overview tool (you want to see the internal structure). Precise export-only filtering is the job of the `codebase_exports` tool.

2. **Import extraction uses regex** — Handles standard `import`/`require()` but may miss dynamic `import()` or unusual formatting. Acceptable for overview; `codebase_dependencies` uses ts-morph.

3. **No caching** — Each call re-scans workspace. The `codebase_index` tool adds caching.

4. **File URI reconstruction** — The `buildTree` method creates a tree structure but loses the original file URIs. The actual implementation needs to track URIs alongside tree nodes (via a parallel Map or by storing the relative path on each node).
