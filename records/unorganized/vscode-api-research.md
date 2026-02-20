Beyond the standard symbol and definition commands, VS Code provides a suite of `vscode.execute...` commands that allow you to programmatically trigger language server features and retrieve their raw data (such as semantic tokens, folding ranges, and type hierarchies).

### 1. Semantic Highlighting & Tokens

These commands allow you to access the semantic classification of code (e.g., distinguishing a class from a variable) as computed by the language server.

* **`vscode.provideDocumentSemanticTokensLegend`**
* **Purpose:** Retrieves the legend (map of token types and modifiers) used by the extension to encode semantic tokens.


* **`vscode.provideDocumentSemanticTokens`**
* **Purpose:** Triggers the provider to compute semantic tokens for the entire document.
* **Returns:** `SemanticTokens` (an encoded Uint32Array of token data).


* **`vscode.provideDocumentRangeSemanticTokens`**
* **Purpose:** Computes semantic tokens for a specific range within the document.



### 2. Advanced Code Structure & Navigation

These APIs allow you to access deeper structural data like folding regions, selection ranges, and hierarchies.

* **`vscode.executeFoldingRangeProvider`**
* **Purpose:** Returns all folding ranges (collapsible blocks) in the document.
* **Returns:** `Thenable<FoldingRange[]>`.


* **`vscode.executeSelectionRangeProvider`**
* **Purpose:** Computes "smart" selection ranges for the given position (used for the "Expand Selection" feature).
* **Returns:** `Thenable<SelectionRange[]>`.


* **`vscode.prepareCallHierarchy`**
* **Purpose:** retrieves the root item to begin navigating the call hierarchy (callers/callees) of a symbol.
* **Returns:** `Thenable<CallHierarchyItem | CallHierarchyItem[]>`.


* **`vscode.prepareTypeHierarchy`**
* **Purpose:** Retrieves the root item to begin navigating the type hierarchy (supertypes/subtypes) of a symbol.
* **Returns:** `Thenable<TypeHierarchyItem | TypeHierarchyItem[]>`.



### 3. Diagnostics (Errors & Warnings)

Unlike other features accessed via commands, diagnostics are best accessed directly via the `languages` namespace API.

* **`vscode.languages.getDiagnostics(resource: Uri)`**
* **Purpose:** Retrieves all compiler errors, warnings, and hints for a specific file.
* **Returns:** `Diagnostic[]`.


* **`vscode.languages.getDiagnostics()`**
* **Purpose:** Retrieves all diagnostics for the entire workspace.
* **Returns:** `[Uri, Diagnostic[]][]`.



### 4. Code Intelligence & Metadata

These commands return semantic details about the code at a specific location.

* **`vscode.executeHoverProvider`**
* **Purpose:** Retrieves the hover information (tooltips with types/docs) for a position.
* **Returns:** `Thenable<Hover[]>`.


* **`vscode.executeSignatureHelpProvider`**
* **Purpose:** Retrieves signature help (parameter info) for a function call at a position.
* **Returns:** `Thenable<SignatureHelp>`.


* **`vscode.executeDocumentColorProvider`**
* **Purpose:** Retrieves all color symbols (e.g., `#ff0000` or `rgb(0,0,0)`) in the document to render color decorators.
* **Returns:** `Thenable<ColorInformation[]>`.


* **`vscode.executeColorPresentationProvider`**
* **Purpose:** Computes the text edit required to insert a specific color format.
* **Returns:** `Thenable<ColorPresentation[]>`.


* **`vscode.executeLinkProvider`**
* **Purpose:** Finds all clickable links (web URLs or file paths) in the document.
* **Returns:** `Thenable<DocumentLink[]>`.


* **`vscode.executeReferenceProvider`**
* **Purpose:** Finds all references to the symbol at the current position.
* **Returns:** `Thenable<Location[]>`.


* **`vscode.executeImplementationProvider`**
* **Purpose:** Finds implementations of the symbol (e.g., interface implementations).
* **Returns:** `Thenable<Location[] | LocationLink[]>`.



### 5. Inlay Hints

* **`vscode.executeInlayHintProvider`**
* **Purpose:** Retrieves inline hints (like parameter names or inferred types) for a given range.
* **Returns:** `Thenable<InlayHint[]>`.