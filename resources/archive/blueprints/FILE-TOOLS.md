# File Tools Blueprint — Draft v1

> **Status**: Draft v1  
> **Author**: AI Assistant  
> **Created**: 2025-01-25  
> **Scope**: Semantic file content operations and file system operations

---

## 1. Vision

A complete suite of file operations that combine semantic content access with file system management. All content operations use semantic targeting (symbols, paths, selectors) rather than line numbers. All file system operations automatically propagate changes (import updates, symbol renames) across the workspace.

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **Semantic Targeting** | Access content by symbol, JSON path, CSS selector — not line numbers |
| **AST-Precise Edits** | Edit via AST manipulation, not string replacement |
| **Auto-Propagation** | File moves/renames automatically update all imports |
| **Multi-Format** | Support TS/JS, JSON, YAML, HTML, CSS, XML, Markdown |
| **VS Code Integration** | Leverage VS Code refactoring engine for multi-file changes |

### 1.2 Tool Summary

| Tool | Verb | Purpose | Complexity |
|------|------|---------|------------|
| `file_read` | Read | Semantic content reading | Medium |
| `file_edit` | Change | Semantic editing + refactors | High |
| `file_create` | Create | Create files with templates | Low |
| `file_delete` | Delete | Delete with import cleanup | Low |
| `file_move` | Move | Move + update imports | Medium |
| `file_rename` | Rename | Rename + update symbols | Medium |
| `file_duplicate` | Copy | Duplicate with symbol mapping | Low |

### 1.3 Content vs File Operations

| Type | Tools | Scope |
|------|-------|-------|
| **Content Operations** | `file_read`, `file_edit` | Modify WITHIN a file |
| **File Operations** | `file_create`, `file_delete`, `file_move`, `file_rename`, `file_duplicate` | Modify FILES themselves |

### 1.4 What This Replaces

| Native Tool | Replaced By | Why Ours Is Better |
|-------------|-------------|-------------------|
| `read_file` | `file_read` | Semantic targeting — no line guessing |
| `replace_string_in_file` | `file_edit` | AST-precise edits + VS Code refactors |
| `create_file` | `file_create` | Templates, structured initialization |
| (manual) | `file_move` | Auto-updates all imports |
| (manual) | `file_rename` | Auto-updates imports + symbols |

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MCP Server                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   File Tool Handlers                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐      │    │
│  │  │file_read│ │file_edit│ │file_create│ │file_delete...│     │    │
│  │  └────┬────┘ └────┬────┘ └────┬─────┘ └──────┬───────┘      │    │
│  │       └───────────┴───────────┴──────────────┘               │    │
│  │                           │ RPC                               │    │
│  └───────────────────────────┼───────────────────────────────────┘   │
│                              │ Named Pipe                            │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│    VS Code Extension         │                                        │
│  ┌───────────────────────────┴──────────────────────┐                │
│  │                  FileService                      │                │
│  │   ┌─────────────────┐  ┌─────────────────────┐   │                │
│  │   │  Content Engine  │  │  Refactoring Engine │   │                │
│  │   │  · ts-morph      │  │  · rename provider  │   │                │
│  │   │  · JSON parser   │  │  · code actions     │   │                │
│  │   │  · CSS parser    │  │  · workspace.applyEdit │                │
│  │   │  · XML/XPath     │  │  · workspace.fs     │   │                │
│  │   │  · MD parser     │  │                     │   │                │
│  │   └─────────────────┘  └─────────────────────┘   │                │
│  └──────────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 File Structure

```
extension/
  services/
    fileService.ts           # Core file operations engine
    fileLmTools.ts           # LM Tool registrations
    parsers/
      typescript-parser.ts   # ts-morph for TS/JS
      json-parser.ts         # JSONPath for JSON/YAML
      css-parser.ts          # CSS selector engine
      xml-parser.ts          # XPath for XML
      markdown-parser.ts     # Heading parser for MD
mcp-server/
  src/
    tools/
      file/
        index.ts             # Tool exports
        file-read.ts         # file_read handler
        file-edit.ts         # file_edit handler
        file-create.ts       # file_create handler
        file-delete.ts       # file_delete handler
        file-move.ts         # file_move handler
        file-rename.ts       # file_rename handler
        file-duplicate.ts    # file_duplicate handler
```

### 2.3 RPC Methods

| RPC Method | Purpose |
|------------|---------|
| `file/read` | Read file content via semantic targeting |
| `file/edit` | Apply semantic edit or refactor |
| `file/create` | Create new file with template |
| `file/delete` | Delete file(s) with import cleanup |
| `file/move` | Move file + update imports |
| `file/rename` | Rename file + update imports/symbols |
| `file/duplicate` | Copy file with symbol mapping |

---

## 3. Supported File Types

### 3.1 Targeting by File Type

| File Type | Extensions | Targeting Mode | Engine |
|-----------|------------|----------------|--------|
| TypeScript | `.ts`, `.tsx`, `.mts`, `.cts` | Symbol | ts-morph |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | Symbol | ts-morph |
| JSON | `.json`, `.jsonc`, `.jsonl` | JSONPath | json-path |
| YAML | `.yaml`, `.yml` | JSONPath | yaml + json-path |
| HTML | `.html`, `.htm` | CSS Selector | htmlparser2 |
| CSS | `.css`, `.scss`, `.less` | CSS Selector | css-tree |
| XML | `.xml`, `.svg`, `.xsd`, `.xaml`, `.csproj` | XPath | fast-xml-parser |
| Markdown | `.md`, `.mdx` | Heading | remark |

### 3.2 Targeting Examples

| File Type | Target Syntax | Example |
|-----------|---------------|---------|
| TypeScript | `symbol` | `"UserService"`, `"UserService.findById"` |
| JSON | `path` (JSONPath) | `"$.scripts.build"`, `"$.dependencies"` |
| HTML | `selector` (CSS) | `"div.container"`, `"#header"`, `"nav ul li"` |
| CSS | `selector` | `".button"`, `"@media screen"` |
| XML | `xpath` | `"//configuration/appSettings"`, `"//Project/PropertyGroup"` |
| Markdown | `heading` | `"## Installation"`, `"Getting Started"` |

---

## 4. Tool Specifications

### 4.1 `file_read`

> Semantic content reading for ANY structured file type. Replace line-based reading with semantic targeting.

**Verb:** Read — "Show me THIS specific content"

**Replaces:** `read_file` (line-based)

**Question patterns Copilot uses this for:**
- "Show me the UserService class" → symbol targeting
- "What's in the dependencies section of package.json?" → JSON path
- "Show me the .button styles" → CSS selector
- "Read the Installation section of README" → markdown heading
- "Show me the configuration element in web.config" → XPath

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | string | ✓ | — | Path to file (relative or absolute) |
| **Targeting (use one based on file type)** |
| `symbol` | string | ✗ | — | TS/JS: Symbol — `"ClassName"`, `"Class.method"` |
| `symbols` | string[] | ✗ | — | TS/JS: Multiple symbols |
| `path` | string | ✗ | — | JSON/YAML: JSONPath — `"$.dependencies"` |
| `selector` | string | ✗ | — | HTML/CSS: CSS selector — `".button"` |
| `xpath` | string | ✗ | — | XML: XPath — `"//configuration"` |
| `heading` | string | ✗ | — | Markdown: Heading text |
| **Options** |
| `around` | object | ✗ | — | Read with context: `{ target, context: N }` |
| `region` | enum | ✗ | — | Structural region: `"imports"`, `"exports"`, etc. |
| `format` | enum | ✗ | `"full"` | `"full"`, `"signature"`, `"body"`, `"summary"` |
| `includeMetadata` | boolean | ✗ | true | Include range, kind, dependencies |
| `maxLines` | number | ✗ | — | Limit output lines |

**Returns:**

```typescript
interface FileReadResult {
  file: string;
  target: {
    type: 'symbol' | 'path' | 'selector' | 'xpath' | 'heading' | 'region';
    value: string;
  };
  content: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  kind?: string;           // For symbols: 'class', 'function', etc.
  signature?: string;      // For TS/JS: Type signature
  dependencies?: Array<{   // For TS/JS: Imports used
    symbol: string;
    from: string;
  }>;
}
```

**Output Examples:**

**Symbol read (TypeScript):**
```json
{
  "file": "src/services/UserService.ts",
  "target": { "type": "symbol", "value": "UserService" },
  "content": "export class UserService {\n  private db: Database;\n  \n  constructor(db: Database) {\n    this.db = db;\n  }\n  \n  async findById(id: string): Promise<User | null> {\n    return this.db.users.findUnique({ where: { id } });\n  }\n}",
  "range": { "start": { "line": 5, "column": 0 }, "end": { "line": 15, "column": 1 } },
  "kind": "class",
  "signature": "class UserService",
  "dependencies": [
    { "symbol": "Database", "from": "../db" },
    { "symbol": "User", "from": "../types" }
  ]
}
```

**JSON path read:**
```json
{
  "file": "package.json",
  "target": { "type": "path", "value": "$.scripts" },
  "content": "{\n  \"build\": \"tsc\",\n  \"test\": \"vitest\"\n}",
  "range": { "start": { "line": 8, "column": 2 }, "end": { "line": 11, "column": 3 } }
}
```

**CSS selector read:**
```json
{
  "file": "src/styles/button.css",
  "target": { "type": "selector", "value": ".button" },
  "content": ".button {\n  padding: 8px 16px;\n  background: var(--primary);\n}",
  "range": { "start": { "line": 15, "column": 0 }, "end": { "line": 18, "column": 1 } }
}
```

---

### 4.2 `file_edit`

> Semantic content editing powered by AST precision + VS Code refactoring.

**Verb:** Change — "Modify content + refactor"

**Replaces:** `replace_string_in_file`

**Question patterns Copilot uses this for:**
- "Replace the body of this function" → direct edit
- "Add a method to this class" → insert operation
- "Rename UserService to AuthService everywhere" → VS Code refactor
- "Extract this logic into a function" → VS Code refactor
- "Organize imports in this file" → VS Code refactor

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| **Direct Edit Mode** |
| `file` | string | ✗ | — | File to edit |
| `target` | string | ✗ | — | What to edit (symbol, path, selector) |
| `operation` | enum | ✗ | — | `"replace"`, `"replace_body"`, `"insert_before"`, `"insert_after"`, `"insert_into"`, `"wrap"`, `"delete"` |
| `content` | string | ✗ | — | Content for replace/insert |
| `wrapper` | object | ✗ | — | For wrap: `{ before, after }` |
| `position` | enum | ✗ | `"last"` | For insert_into: `"first"`, `"last"`, `"sorted"` |
| **VS Code Refactor Mode** |
| `refactor` | enum | ✗ | — | Refactoring operation (see below) |
| `symbol` | string | ✗ | — | Symbol name for refactor |
| `newName` | string | ✗ | — | New name for rename |
| `scope` | enum | ✗ | `"workspace"` | `"file"` or `"workspace"` |
| `selectionRange` | object | ✗ | — | For extract: `{ startLine, startColumn, endLine, endColumn }` |
| `extractedName` | string | ✗ | — | Name for extracted symbol |
| **Options** |
| `dryRun` | boolean | ✗ | false | Preview without applying |
| `preview` | boolean | ✗ | false | Return detailed preview |

**Available Refactors:**

| Refactor | Description |
|----------|-------------|
| `rename_symbol` | Rename across all files |
| `extract_function` | Extract to function |
| `extract_method` | Extract to method (in class) |
| `extract_variable` | Extract to variable |
| `extract_constant` | Extract to constant |
| `extract_type` | Extract type alias |
| `inline_variable` | Inline variable usages |
| `inline_function` | Inline function calls |
| `organize_imports` | Sort and clean imports |
| `add_import` | Add missing import |
| `remove_unused_imports` | Remove unused imports |
| `convert_to_arrow` | Convert to arrow function |
| `convert_to_async` | Convert to async/await |

**Returns:**

```typescript
interface FileEditResult {
  success: boolean;
  operation?: string;
  refactor?: string;
  filesAffected: number | string[];
  totalEdits: number;
  changes: Array<{
    file: string;
    edits: Array<{
      type: 'replace' | 'insert' | 'delete';
      range: { start: [number, number]; end: [number, number] };
      oldContent?: string;
      newContent?: string;
    }>;
  }>;
  summary: string;
}
```

**Output Examples:**

**Replace body:**
```json
{
  "success": true,
  "operation": "replace_body",
  "file": "src/utils.ts",
  "target": "calculateTotal",
  "filesAffected": 1,
  "totalEdits": 1,
  "summary": "Replaced body of calculateTotal"
}
```

**Multi-file rename:**
```json
{
  "success": true,
  "refactor": "rename_symbol",
  "symbol": "UserService",
  "newName": "AuthService",
  "filesAffected": ["src/services/UserService.ts", "src/index.ts", "src/controllers/AuthController.ts"],
  "totalEdits": 6,
  "summary": "Renamed UserService → AuthService (3 files, 6 edits)"
}
```

---

### 4.3 `file_create`

> Create new files with optional content or templates.

**Verb:** Create — "Make a new file"

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✓ | — | Path for new file |
| `content` | string | ✗ | — | Initial content |
| `template` | enum | ✗ | `"empty"` | Template name (see below) |
| `templateVars` | object | ✗ | — | Variables: `{ name: "UserService" }` |
| `overwrite` | boolean | ✗ | false | Overwrite if exists |
| `createDirectories` | boolean | ✗ | true | Create parent dirs |
| `openInEditor` | boolean | ✗ | false | Open after creation |

**Templates:**

| Category | Templates |
|----------|-----------|
| TypeScript | `typescript-module`, `typescript-class`, `typescript-interface`, `typescript-function`, `typescript-test` |
| React | `react-component`, `react-hook`, `react-context` |
| Node | `express-controller`, `express-middleware`, `node-cli` |
| Data | `json`, `yaml` |
| Docs | `markdown`, `markdown-readme` |

**Returns:**

```json
{
  "success": true,
  "path": "src/services/PaymentService.ts",
  "created": true,
  "template": "typescript-class",
  "size": 245,
  "directoriesCreated": ["src/services"],
  "summary": "Created src/services/PaymentService.ts (245 bytes)"
}
```

---

### 4.4 `file_delete`

> Delete files or directories with optional import cleanup.

**Verb:** Delete — "Remove file(s)"

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✗ | — | Single path to delete |
| `paths` | string[] | ✗ | — | Multiple paths |
| `recursive` | boolean | ✗ | false | Delete directory contents |
| `updateImports` | boolean | ✗ | true | Remove imports from other files |
| `dryRun` | boolean | ✗ | false | Preview only |

**Returns:**

```json
{
  "success": true,
  "deleted": ["src/services/OldService.ts"],
  "updatedFiles": [
    {
      "file": "src/index.ts",
      "removedImports": [{ "symbol": "OldService", "from": "./services/OldService" }]
    }
  ],
  "totalDeleted": 1,
  "totalImportsRemoved": 2,
  "summary": "Deleted 1 file, removed 2 imports"
}
```

---

### 4.5 `file_move`

> Move files or directories with automatic import path updates.

**Verb:** Move — "Move file + update imports"

**Uses:** `vscode.executeRenameProvider()` for import updates

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source` | string | ✓ | — | Current file path |
| `destination` | string | ✓ | — | New file path |
| `updateImports` | boolean | ✗ | true | Update imports across workspace |
| `overwrite` | boolean | ✗ | false | Overwrite if destination exists |
| `dryRun` | boolean | ✗ | false | Preview only |

**Returns:**

```json
{
  "success": true,
  "source": "src/services/UserService.ts",
  "destination": "src/auth/services/UserService.ts",
  "moved": true,
  "importsUpdated": [
    {
      "file": "src/controllers/AuthController.ts",
      "changes": [{ "old": "../services/UserService", "new": "../auth/services/UserService" }]
    }
  ],
  "totalFilesUpdated": 3,
  "summary": "Moved file, updated 3 imports"
}
```

---

### 4.6 `file_rename`

> Rename files with automatic import and symbol updates.

**Verb:** Rename — "Rename file + update imports"

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✓ | — | Current file path |
| `newName` | string | ✓ | — | New filename (not full path) |
| `updateImports` | boolean | ✗ | true | Update imports |
| `renameExports` | boolean | ✗ | false | Rename main export to match |
| `exportMapping` | object | ✗ | — | Custom symbol renames: `{ "Old": "New" }` |
| `dryRun` | boolean | ✗ | false | Preview only |

**Returns:**

```json
{
  "success": true,
  "oldPath": "src/services/UserService.ts",
  "newPath": "src/services/AuthService.ts",
  "renamed": true,
  "importsUpdated": [
    { "file": "src/index.ts", "changes": [{ "old": "./UserService", "new": "./AuthService" }] }
  ],
  "exportsRenamed": [
    { "file": "src/services/AuthService.ts", "changes": [{ "old": "class UserService", "new": "class AuthService" }] }
  ],
  "summary": "Renamed file, updated 1 import, renamed 4 symbols"
}
```

---

### 4.7 `file_duplicate`

> Copy a file to a new location with optional symbol renaming.

**Verb:** Copy — "Copy file to new location"

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source` | string | ✓ | — | File to duplicate |
| `destination` | string | ✓ | — | Path for the copy |
| `renameSymbols` | boolean | ✗ | false | Rename main export to match |
| `symbolMapping` | object | ✗ | — | Custom renames: `{ "Old": "New" }` |
| `overwrite` | boolean | ✗ | false | Overwrite if exists |

**Returns:**

```json
{
  "success": true,
  "source": "src/services/UserService.ts",
  "destination": "src/services/AdminService.ts",
  "duplicated": true,
  "size": 1245,
  "symbolsRenamed": [{ "old": "UserService", "new": "AdminService", "occurrences": 5 }],
  "summary": "Duplicated file with 5 symbol renames"
}
```

---

## 5. LM Tool Registration

### 5.1 Tool Definitions

```typescript
// extension/services/fileLmTools.ts

export function registerFileLmTools(context: vscode.ExtensionContext) {

  // file_read
  vscode.lm.registerTool('file_read', {
    displayName: 'Read File Content',
    description: 'Read file content using semantic targeting (symbols, JSON paths, selectors)',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'File path' },
        symbol: { type: 'string', description: 'TS/JS symbol name' },
        path: { type: 'string', description: 'JSON/YAML JSONPath expression' },
        selector: { type: 'string', description: 'HTML/CSS selector' },
        xpath: { type: 'string', description: 'XML XPath expression' },
        heading: { type: 'string', description: 'Markdown heading text' },
        format: { type: 'string', enum: ['full', 'signature', 'body', 'summary'] }
      },
      required: ['file']
    }
  });

  // file_edit
  vscode.lm.registerTool('file_edit', {
    displayName: 'Edit File Content',
    description: 'Edit file content using AST-precise operations or VS Code refactoring',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'File path' },
        target: { type: 'string', description: 'Symbol, path, or selector to edit' },
        operation: { type: 'string', enum: ['replace', 'replace_body', 'insert_before', 'insert_after', 'insert_into', 'wrap', 'delete'] },
        content: { type: 'string', description: 'New content' },
        refactor: { type: 'string', description: 'VS Code refactoring operation' },
        newName: { type: 'string', description: 'New name for rename' },
        dryRun: { type: 'boolean', description: 'Preview without applying' }
      }
    }
  });

  // file_create
  vscode.lm.registerTool('file_create', {
    displayName: 'Create File',
    description: 'Create a new file with optional template',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path for new file' },
        content: { type: 'string', description: 'Initial content' },
        template: { type: 'string', description: 'Template name' },
        templateVars: { type: 'object', description: 'Template variables' }
      },
      required: ['path']
    }
  });

  // file_delete
  vscode.lm.registerTool('file_delete', {
    displayName: 'Delete File',
    description: 'Delete files with optional import cleanup',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File to delete' },
        paths: { type: 'array', items: { type: 'string' } },
        updateImports: { type: 'boolean', description: 'Remove imports from other files' },
        dryRun: { type: 'boolean' }
      }
    }
  });

  // file_move
  vscode.lm.registerTool('file_move', {
    displayName: 'Move File',
    description: 'Move file and update all imports',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Current path' },
        destination: { type: 'string', description: 'New path' },
        updateImports: { type: 'boolean' },
        dryRun: { type: 'boolean' }
      },
      required: ['source', 'destination']
    }
  });

  // file_rename
  vscode.lm.registerTool('file_rename', {
    displayName: 'Rename File',
    description: 'Rename file and update imports/symbols',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Current file path' },
        newName: { type: 'string', description: 'New filename' },
        updateImports: { type: 'boolean' },
        renameExports: { type: 'boolean' },
        dryRun: { type: 'boolean' }
      },
      required: ['path', 'newName']
    }
  });

  // file_duplicate
  vscode.lm.registerTool('file_duplicate', {
    displayName: 'Duplicate File',
    description: 'Copy file with optional symbol renaming',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'File to copy' },
        destination: { type: 'string', description: 'Destination path' },
        renameSymbols: { type: 'boolean' },
        symbolMapping: { type: 'object' }
      },
      required: ['source', 'destination']
    }
  });
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation
- [ ] `fileService.ts` — Core service with parser integration
- [ ] `file_create` — Simplest tool, validates service architecture
- [ ] `file_delete` — Basic deletion (no import cleanup yet)
- [ ] `file_duplicate` — Basic copy (no symbol renaming yet)

### Phase 2: Content Operations
- [ ] TypeScript parser integration (ts-morph)
- [ ] `file_read` with symbol targeting
- [ ] `file_read` with JSON path targeting
- [ ] `file_edit` direct edit mode (replace, insert)

### Phase 3: Multi-Format Support
- [ ] CSS selector parser
- [ ] XML/XPath parser
- [ ] Markdown heading parser
- [ ] `file_read` for all formats

### Phase 4: Refactoring Integration
- [ ] VS Code rename provider integration
- [ ] `file_edit` refactor mode
- [ ] `file_move` with import updates
- [ ] `file_rename` with import + symbol updates
- [ ] `file_delete` with import cleanup

### Phase 5: Advanced Features
- [ ] Templates for `file_create`
- [ ] `file_duplicate` with symbol renaming
- [ ] LM tool registrations
- [ ] Documentation

---

## 7. Performance Considerations

### 7.1 Caching

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| AST parse results | 30 seconds | File save |
| Project structure | 60 seconds | File create/delete |
| Import graph | 5 minutes | Any TS/JS change |

### 7.2 Large File Handling

- **Read**: Stream with `maxLines` limit for files > 10k lines
- **Edit**: Warn for files > 1MB before applying
- **Delete**: Batch deletions to avoid workspace.fs overload

---

## 8. Error Handling

### 8.1 Error Types

| Error | Cause | Response |
|-------|-------|----------|
| `FileNotFound` | Path doesn't exist | Suggest similar paths |
| `TargetNotFound` | Symbol/path/selector not found | Show available targets |
| `ParseError` | Invalid file syntax | Show line number |
| `RefactorFailed` | VS Code refactor rejected | Show VS Code message |
| `OverwriteBlocked` | Destination exists, overwrite=false | Prompt for confirmation |

---

## 9. Integration with Other Blueprints

### 9.1 CODEBASE-TOOLS.md

| Codebase Tool | File Tool Complement |
|---------------|---------------------|
| `codebase_map` (find file) | `file_read` (read content) |
| `codebase_trace` (find usages) | `file_edit` (refactor all usages) |
| `codebase_search` (find pattern) | `file_read` (read matching content) |
| `codebase_lint` (find issues) | `file_edit` (fix issues) |

### 9.2 GIT-TOOLS.md

| Git Tool | File Tool Complement |
|----------|---------------------|
| `git_show` (read at version) | `file_read` (read current version) |
| `git_diff` (see changes) | `file_edit` (make changes) |
| `git_blame` (find author) | `file_read` (get content) |

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] All 7 tools implemented and tested
- [ ] Symbol targeting works for TS/JS files
- [ ] JSONPath targeting works for JSON/YAML
- [ ] CSS selector targeting works for HTML/CSS
- [ ] XPath targeting works for XML
- [ ] Heading targeting works for Markdown
- [ ] VS Code refactors propagate across workspace
- [ ] Import updates work for move/rename/delete

### 10.2 Performance Requirements

| Metric | Target |
|--------|--------|
| `file_read` (small file) | < 100ms |
| `file_read` (10k lines) | < 500ms |
| `file_edit` (single file) | < 200ms |
| `file_edit` (refactor, 10 files) | < 2s |
| `file_create` | < 50ms |
| `file_move` (with imports) | < 1s |

### 10.3 Quality Requirements

- [ ] Zero data loss on edits
- [ ] Graceful degradation for unsupported file types
- [ ] Accurate error messages with suggestions
- [ ] Dry run mode works for all editing operations

---

## 11. Open Questions

1. **Template System**: Should templates be user-extensible (custom templates in workspace)?

2. **Binary Files**: How should binary files be handled for read/duplicate?

3. **Conflict Resolution**: What if a rename creates a conflict with an existing file?

4. **Undo Support**: Should edits be undoable via VS Code's undo stack?

5. **Symlink Support**: How should symbolic links be handled?

---

## 12. References

- [GIT-TOOLS.md](../../resources/blueprints/GIT-TOOLS.md) — Version control operations
- [CODEBASE-TOOLS.md](../../resources/blueprints/CODEBASE-TOOLS.md) — Code analysis tools (to be trimmed)
- [ts-morph Documentation](https://ts-morph.com/)
- [JSONPath Syntax](https://goessner.net/articles/JsonPath/)
- [VS Code Refactoring API](https://code.visualstudio.com/api/references/commands)
