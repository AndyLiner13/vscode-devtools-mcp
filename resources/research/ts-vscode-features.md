Based on the VS Code API documentation, here are the APIs for the requested file actions. These are primarily found in the `vscode.workspace.fs` (FileSystem) namespace, which handles file operations programmatically.

### 1. Read File
*   **API:** `vscode.workspace.fs.readFile(uri)`
*   **Description:** Reads the entire contents of a file. It returns a `Thenable<Uint8Array>`, so you will typically need to decode the result using `TextDecoder` if you want a string.
*   **Example:**
    ```typescript
    const fileUri = vscode.Uri.file('/path/to/file.txt');
    const readData = await vscode.workspace.fs.readFile(fileUri);
    const readStr = new TextDecoder('utf-8').decode(readData);
    ```

### 2. Delete File
*   **API:** `vscode.workspace.fs.delete(uri, options)`
*   **Description:** Deletes a file or folder. You can provide options to control recursion (for folders) and whether to use the system trash,.
*   **Alternative:** `WorkspaceEdit.deleteFile(uri, options)` can be used if you want the deletion to be undoable by the user as part of a larger edit operation.

### 3. Rename File
*   **API:** `vscode.workspace.fs.rename(source, target, options)`
*   **Description:** Renames a file or folder. Use the `overwrite` option to determine behavior if the target already exists.
*   **Alternative:** `WorkspaceEdit.renameFile(oldUri, newUri, options)` is available for undoable rename operations.

### 4. Move File
*   **API:** `vscode.workspace.fs.rename(source, target, options)`
*   **Description:** In the VS Code API (and most file systems), a **move** operation is performed using the **rename** command. You simply specify a `target` Uri that changes the file's path (directory) while keeping or changing the name,.

### 5. Clone File (Copy)
*   **API:** `vscode.workspace.fs.copy(source, target, options)`
*   **Description:** Copies files or folders from a source Uri to a destination Uri. This effectively "clones" the file. You can set `overwrite: true` if you want to replace an existing file at the destination,.

### Summary Table

| Action | Primary API (`vscode.workspace.fs`) | Undoable Alternative (`vscode.WorkspaceEdit`) |
| :--- | :--- | :--- |
| **Read** | `readFile(uri)` | N/A |
| **Delete** | `delete(uri, options)` | `deleteFile(uri, options)` |
| **Rename** | `rename(source, target, options)` | `renameFile(oldUri, newUri, options)` |
| **Move** | `rename(source, target, options)` | `renameFile(oldUri, newUri, options)` |
| **Clone** | `copy(source, target, options)` | N/A (Manual create/write flow required) |

---

Based on the sources, here is the information regarding folder operations and LM tool names:

### Folder Operations in the API

**1. Creating, Moving, Copying, and Deleting Folders**
You generally use the same **`vscode.workspace.fs`** (FileSystem) API for folders as you do for files, with the exception of creation.

*   **Create Folder:** You use **`vscode.workspace.fs.createDirectory(uri)`**. This is distinct from creating files (which uses `writeFile`).
*   **Move Folder:** You use **`vscode.workspace.fs.rename(source, target, options)`**, just like for files.
*   **Copy Folder:** You use **`vscode.workspace.fs.copy(source, target, options)`**. This API works for folders and creates a copy at the destination.
*   **Delete Folder:** You use **`vscode.workspace.fs.delete(uri, options)`**. For folders, you typically set the `recursive: true` option to delete the folder and its contents,.

**2. Auto-Updating References (Refactoring)**
The `vscode.workspace.fs` API itself does **not** contain logic to scan your code and update import paths. However, using this API **does** fire the `onDidRenameFiles` and `onDidDeleteFiles` events.

*   **How it works:** Language extensions (like TypeScript or Python) listen to these events. If you have settings enabled (such as `javascript.updateImportsOnFileMove.enabled` or `markdown.updateLinksOnFileMove.enabled`), those extensions will detect the move and prompt you (or automatically) update the references,.
*   **Recommendation:** If you want to ensure a refactoring (updating imports) happens as part of a single transactional workspace edit, it is often better to use `WorkspaceEdit.renameFile` instead of the raw `fs` API, as `WorkspaceEdit` allows collecting resulting text edits (refactorings) from other extensions before applying the change.

### Language Model (LM) Tool Names

Based on the provided documentation for the `LanguageModelTool` and `LanguageModelToolInformation`:

*   **Character Count:** The sources do not define an explicit maximum character count for tool names. The `name` property is defined simply as a **`string`** representing the "unique name for the tool".
*   **Using Periods:** The sources do not explicitly forbid periods in tool names. However, standard examples in the documentation typically use **camelCase** (e.g., `runTask`, `fetch`, `runInTerminal`) rather than dot notation,. While command IDs in VS Code often use periods (e.g., `git.commit`), tool names are often used by the LLM as function calls, so simpler alphanumeric identifiers are generally preferred to ensure the model invokes them correctly.

**Summary Table**

| Operation | API Method | Notes |
| :--- | :--- | :--- |
| **Create Folder** | `fs.createDirectory(uri)` | Distinct from file creation. |
| **Move Folder** | `fs.rename(source, target)` | Same as files. |
| **Copy Folder** | `fs.copy(source, target)` | Same as files. |
| **Delete Folder** | `fs.delete(uri, { recursive: true })` | Use `recursive` for non-empty folders. |

---

Based on the sources, to build Language Model (LM) tools that utilize the full potential of VS Code's refactoring capabilities for the languages you listed (TypeScript, Python, Markdown, JSON, YAML, JavaScript, PowerShell), you must interact with the **Programmatic Language Features** APIs.

Because you are building tools to *consume* these features (rather than provide new ones), you will primarily use the `vscode.commands.executeCommand` API to invoke the built-in language services.

Here are the specific APIs and commands your LM tools should utilize, followed by the specific refactoring capabilities available for your target languages.

### 1. Core Refactoring APIs (For your LM Tools)

To access refactorings programmatically, your LM tools should execute the following specific commands. These return data (like `WorkspaceEdit` objects) that your agent can apply, rather than just opening a UI menu.

*   **Get Code Actions (Refactorings & Quick Fixes):**
    *   **API Command:** `vscode.executeCodeActionProvider`
    *   **Arguments:** `uri`, `rangeOrSelection`, `kind` (optional), `itemResolveCount` (optional).
    *   **Usage:** Returns an array of `Command` or `CodeAction` instances. Your tool can filter these by `kind` (e.g., `refactor.extract`, `refactor.move`, `source.organizeImports`) to find specific refactoring opportunities available at a specific cursor position or selection.
    *   **Application:** Once a `CodeAction` is returned, your tool can apply the `edit` property (a `WorkspaceEdit`) using `vscode.workspace.applyEdit`,.

*   **Rename Symbols:**
    *   **API Command:** `vscode.executeDocumentRenameProvider`
    *   **Arguments:** `uri`, `position`, `newName`.
    *   **Usage:** Returns a `Promise<WorkspaceEdit>`. This allows your tool to rename a symbol (variable, function, class) across the entire project (not just the current file).
    *   **Pre-check:** You can use `vscode.prepareRename` to verify if the symbol at the current position is valid for renaming.

*   **Organize Imports:**
    *   This is often exposed as a `CodeAction` with the kind `source.organizeImports`. You can invoke it via `vscode.executeCodeActionProvider` or triggering the specific editor action `editor.action.organizeImports` if you want the side-effect immediately.

*   **Formatting:**
    *   **API Command:** `vscode.executeFormatDocumentProvider` or `vscode.executeFormatRangeProvider`.
    *   **Usage:** Returns `TextEdit[]`. Useful for "clean up" tools.

---

### 2. Available Refactorings by Language

Your LM tools will define the *intent* (e.g., "Extract function"), but the *availability* depends on the language extension installed. Here is the "power" you can expose for each language you use:

#### **TypeScript & JavaScript**
VS Code (via the built-in TypeScript language service) offers the richest set of refactorings for these languages. Your tools can request `CodeActionKind.Refactor` to access:
*   **Extraction:**
    *   `refactor.extract.function`: Extract to method or function.
    *   `refactor.extract.constant`: Extract to constant.
    *   `refactor.extract.type`: Extract type to interface or type alias.
*   **Movement:**
    *   `refactor.move`: Move to new file (infers file name from symbol).
*   **Conversion:**
    *   Convert between named imports and namespace imports.
    *   Convert between default export and named export.
    *   Convert parameters to destructured object.
    *   Add/remove braces from arrow function.
    *   Generate get and set accessors.
    *   Infer function return types.
*   **Imports:**
    *   `source.organizeImports`: Removes unused imports and sorts them.

#### **Python**
Refactoring capabilities are primarily provided by the **Pylance** extension (which powers the Python extension).
*   **Extraction:**
    *   Extract Variable: Replaces occurrences of an expression with a new variable.
    *   Extract Method: extracts selected expressions/blocks to a method call.
*   **Movement:**
    *   Move Symbol: Moves a symbol to a different file or creates a new file for it.
*   **Refactoring:**
    *   Rename Module: Renames files/modules and updates references.
    *   Implement all inherited abstract classes.
*   **Imports:**
    *   `source.organizeImports`: Sorts and cleans imports (supports `isort` and `Ruff`).

#### **Markdown**
Markdown support allows for refactoring the structure of documentation.
*   **Rename:** Renaming headers automatically updates all links to that header within the current file and across the workspace.
*   **File Operations:** If `markdown.updateLinksOnFileMove.enabled` is active, moving/renaming files updates relative links.
*   **Extraction:** You can use "Smart selection" commands (expand/shrink) to select blocks, though specific "extract" refactorings are less common than in code.

#### **PowerShell**
Refactoring in PowerShell is provided by the PowerShell extension and `PSScriptAnalyzer`.
*   **Formatting:** Robust document formatting via `PSScriptAnalyzer`.
*   **Rename:** Symbol-based renaming is supported for variables and functions.
*   **Analysis:** Code quality checks (linting) are provided, which often serve as "Quick Fixes" rather than structural refactorings.

#### **JSON & YAML**
These data languages utilize schemas for validation rather than structural refactoring.
*   **Formatting:** `vscode.executeFormatDocumentProvider` is the primary tool here.
*   **Sorting:** Extensions often provide "Sort Keys" via `executeCommand`, but it is not a native `CodeAction` in the core JSON extension.
*   **Validation:** You can use `vscode.getDiagnostics` to find errors (like schema violations) and potentially look for `quickfix` code actions to resolve them.

### Summary Checklist for Your LM Tools
To maximize potential, ensure your LM tools are programmed to:
1.  **Select:** Determine the correct `Selection` or `Range` for the code to be refactored.
2.  **Query:** Call `vscode.executeCodeActionProvider` with the `vscode.CodeActionKind.Refactor` filter.
3.  **Execute:** If a valid `CodeAction` is returned, apply the `action.edit` (WorkspaceEdit) to perform the refactoring physically.
4.  **Rename:** Use `vscode.executeDocumentRenameProvider` specifically for rename operations, as these are handled separately from general Code Actions.

---

To provide **type-safe** capabilities that allow an AI agent to navigate a project's structure, gather context like JSDocs/types, and ensure safety across files without loading the entire project text, you should utilize VS Code's **Programmatic Language Features**. These APIs expose the semantic understanding of the underlying Language Server (e.g., `tsserver` for TypeScript) rather than just the text.

Here are the powerful APIs available for your goals:

### 1. Navigating the AST & Project Structure
VS Code does not expose the raw Abstract Syntax Tree (AST) of the TypeScript compiler directly to extensions. However, it provides a **Symbol Hierarchy** API which acts as a semantic, high-level AST. This allows your tool to "see" the code structure (classes, methods, variables) without parsing text.

*   **`vscode.executeDocumentSymbolProvider(uri)`**:
    *   **Goal:** Navigate the file structure (AST traversal).
    *   **Returns:** A hierarchical tree of `DocumentSymbol` objects. Each symbol contains the `kind` (Class, Method, Variable), the `range` (full scope), the `selectionRange` (identifier name), and `children`,.
    *   **Value:** Your agent can request this to map out a file's structure, identifying exactly where methods start/end without reading the file line-by-line.

*   **`vscode.executeWorkspaceSymbolProvider(query)`**:
    *   **Goal:** Find symbols across the entire workspace (Global awareness).
    *   **Returns:** An array of `SymbolInformation` from all files (even those not open).
    *   **Value:** Allows the agent to find where a specific Class or Interface is defined anywhere in the project to load only that relevant file.

*   **`vscode.prepareTypeHierarchy` / `provideSupertypes` / `provideSubtypes`**:
    *   **Goal:** Traverse inheritance trees.
    *   **Value:** Allows the agent to understand relationships (e.g., "Find all classes implementing `IUser`") without text searching for "implements",.

### 2. Gathering Context (JSDocs & Types)
Instead of asking the LLM to parse comments or infer types from raw text, use these APIs to retrieve the exact data the Language Server has already computed.

*   **`vscode.executeHoverProvider(uri, position)`**:
    *   **Goal:** Get JSDocs and Type Signatures.
    *   **Returns:** A `Hover` object containing the markdown content displayed to users,.
    *   **Value:** This returns the fully resolved **JSDoc/TSDoc** comments and the **inferred type signature** for any symbol at a specific position. This is the "valuable data" you requested, pre-processed by TypeScript.

*   **`vscode.executeDefinitionProvider` & `vscode.executeTypeDefinitionProvider`**:
    *   **Goal:** Locate source of truth.
    *   **Value:** If the agent sees a variable `currentUser`, it can use these APIs to jump immediately to the interface definition to understand the available properties, rather than hallucinating them.

### 3. Safety Nets & Global Impact Analysis
These APIs are critical for preventing breaking changes (like deleting used code) in files the agent hasn't read.

*   **`vscode.executeReferenceProvider(uri, position)`**:
    *   **Goal:** Global usage analysis (The primary safety net).
    *   **Value:** Before your tool performs a refactor (like deleting a function or changing its signature), it should call this API.
    *   **Mechanism:** It returns **all locations** in the entire workspace where that symbol is used.
    *   **Safety Check:** If the list is not empty, the agent knows deleting the symbol will break code in other files (even files not currently loaded in the LLM's context context).

*   **`vscode.executeDocumentRenameProvider(uri, position, newName)`**:
    *   **Goal:** Safe mutation.
    *   **Value:** Instead of using a text find-and-replace (which is dangerous), call this provider. It returns a `WorkspaceEdit` that describes exactly which files need to change to safely rename a symbol, automatically updating imports and references across the entire project.

### 4. Handling File Operations Safely
When moving or deleting files, simply deleting the file via the file system API breaks imports. Use `WorkspaceEdit` to tap into VS Code's refactoring events.

*   **`WorkspaceEdit.renameFile` / `WorkspaceEdit.deleteFile`**:
    *   **Goal:** Transactional file operations.
    *   **Value:** When you perform a rename/move via a `WorkspaceEdit`, VS Code fires `onWillRenameFiles`. The TypeScript extension listens to this and automatically calculates the necessary **import updates** in all other files.
    *   **Safety:** This ensures that moving a file doesn't leave "dead links" in the rest of the project,.

### Summary Workflow for a Custom "Type-Safe" Tool
If you are building a tool for CoPilot to "Refactor a Method", your agentic loop should roughly follow this API usage:

1.  **Analyze**: Call `executeDocumentSymbolProvider` to find the method's range.
2.  **Context**: Call `executeHoverProvider` on the method name to get its JSDocs and full signature.
3.  **Safety Check**: Call `executeReferenceProvider`. If references exist outside the current file, either abort or load those files for modification.
4.  **Execute**: If renaming, use `executeDocumentRenameProvider`. If extracting/moving, use `executeCodeActionProvider` with specific kinds like `refactor.move` or `refactor.extract`,.

---

To provide **type-safe** capabilities that allow an AI agent to navigate a project's structure, gather context like JSDocs/types, and ensure safety across files without loading the entire project text, you should utilize VS Code's **Programmatic Language Features**. These APIs expose the semantic understanding of the underlying Language Server (e.g., `tsserver` for TypeScript) rather than just the text.

Here are the powerful APIs available for your goals:

### 1. Navigating the AST & Project Structure
VS Code does not expose the raw Abstract Syntax Tree (AST) of the TypeScript compiler directly to extensions. However, it provides a **Symbol Hierarchy** API which acts as a semantic, high-level AST. This allows your tool to "see" the code structure (classes, methods, variables) without parsing text.

*   **`vscode.executeDocumentSymbolProvider(uri)`**:
    *   **Goal:** Navigate the file structure (AST traversal).
    *   **Returns:** A hierarchical tree of `DocumentSymbol` objects. Each symbol contains the `kind` (Class, Method, Variable), the `range` (full scope), the `selectionRange` (identifier name), and `children`,.
    *   **Value:** Your agent can request this to map out a file's structure, identifying exactly where methods start/end without reading the file line-by-line.

*   **`vscode.executeWorkspaceSymbolProvider(query)`**:
    *   **Goal:** Find symbols across the entire workspace (Global awareness).
    *   **Returns:** An array of `SymbolInformation` from all files (even those not open).
    *   **Value:** Allows the agent to find where a specific Class or Interface is defined anywhere in the project to load only that relevant file.

*   **`vscode.prepareTypeHierarchy` / `provideSupertypes` / `provideSubtypes`**:
    *   **Goal:** Traverse inheritance trees.
    *   **Value:** Allows the agent to understand relationships (e.g., "Find all classes implementing `IUser`") without text searching for "implements",.

### 2. Gathering Context (JSDocs & Types)
Instead of asking the LLM to parse comments or infer types from raw text, use these APIs to retrieve the exact data the Language Server has already computed.

*   **`vscode.executeHoverProvider(uri, position)`**:
    *   **Goal:** Get JSDocs and Type Signatures.
    *   **Returns:** A `Hover` object containing the markdown content displayed to users,.
    *   **Value:** This returns the fully resolved **JSDoc/TSDoc** comments and the **inferred type signature** for any symbol at a specific position. This is the "valuable data" you requested, pre-processed by TypeScript.

*   **`vscode.executeDefinitionProvider` & `vscode.executeTypeDefinitionProvider`**:
    *   **Goal:** Locate source of truth.
    *   **Value:** If the agent sees a variable `currentUser`, it can use these APIs to jump immediately to the interface definition to understand the available properties, rather than hallucinating them.

### 3. Safety Nets & Global Impact Analysis
These APIs are critical for preventing breaking changes (like deleting used code) in files the agent hasn't read.

*   **`vscode.executeReferenceProvider(uri, position)`**:
    *   **Goal:** Global usage analysis (The primary safety net).
    *   **Value:** Before your tool performs a refactor (like deleting a function or changing its signature), it should call this API.
    *   **Mechanism:** It returns **all locations** in the entire workspace where that symbol is used.
    *   **Safety Check:** If the list is not empty, the agent knows deleting the symbol will break code in other files (even files not currently loaded in the LLM's context context).

*   **`vscode.executeDocumentRenameProvider(uri, position, newName)`**:
    *   **Goal:** Safe mutation.
    *   **Value:** Instead of using a text find-and-replace (which is dangerous), call this provider. It returns a `WorkspaceEdit` that describes exactly which files need to change to safely rename a symbol, automatically updating imports and references across the entire project.

### 4. Handling File Operations Safely
When moving or deleting files, simply deleting the file via the file system API breaks imports. Use `WorkspaceEdit` to tap into VS Code's refactoring events.

*   **`WorkspaceEdit.renameFile` / `WorkspaceEdit.deleteFile`**:
    *   **Goal:** Transactional file operations.
    *   **Value:** When you perform a rename/move via a `WorkspaceEdit`, VS Code fires `onWillRenameFiles`. The TypeScript extension listens to this and automatically calculates the necessary **import updates** in all other files.
    *   **Safety:** This ensures that moving a file doesn't leave "dead links" in the rest of the project,.

### Summary Workflow for a Custom "Type-Safe" Tool
If you are building a tool for CoPilot to "Refactor a Method", your agentic loop should roughly follow this API usage:

1.  **Analyze**: Call `executeDocumentSymbolProvider` to find the method's range.
2.  **Context**: Call `executeHoverProvider` on the method name to get its JSDocs and full signature.
3.  **Safety Check**: Call `executeReferenceProvider`. If references exist outside the current file, either abort or load those files for modification.
4.  **Execute**: If renaming, use `executeDocumentRenameProvider`. If extracting/moving, use `executeCodeActionProvider` with specific kinds like `refactor.move` or `refactor.extract`,.

---

