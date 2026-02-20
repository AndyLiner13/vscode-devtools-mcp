Since you already have the "Engine" (Graphology + TS Compiler + Incremental Watcher), you have solved the hardest engineering problem: maintaining state.

Now you just need to implement the **"Binding Layer"**. This is the logic that translates AST nodes into Graphology nodes and creates the "Golden Edge" between them.

Here is the architectural spec for extending your existing graph to handle granular, bidirectional JSON-to-TS syncing.

### 1. The Schema: Granular Nodes

Your current graph likely maps `File`  `File`. You need to drill down. You don't need to graph *every* AST node, only the ones that cross the boundary.

**New Node Types:**

1. **`JSON_PROPERTY`**: Represents a specific key in a JSON file.
* **ID:** `filepath::json_path` (e.g., `src/data.json::["database","host"]`)
* **Attributes:** `keyName`, `valueType`, `startOffset`, `endOffset`.


2. **`TS_ACCESSOR`**: Represents the *exact usage* of that key in TypeScript.
* **ID:** `filepath::startOffset` (e.g., `src/app.ts::452`)
* **Attributes:** `kind` (PropertyAccess, ElementAccess, Destructuring), `text`.



**New Edge Type:**

* **`BINDS_TO`**: Directional edge from `TS_ACCESSOR`  `JSON_PROPERTY`.

---

### 2. The Logic: Parsing & Linking

You need two different strategies for ingestion.

#### A. Ingesting JSON (The "Source")

Don't use `JSON.parse`. It loses location data. Use **`jsonc-parser`** (Microsoft's own library used in VS Code).

* **Action:** When a `.json` file updates:
1. Parse it into a syntax tree using `jsonc-parser`.
2. Traverse the tree.
3. For every *Property* node, create/update a `JSON_PROPERTY` node in Graphology.
4. Store the **Path** (e.g., `['theme', 'colors', 'primary']`) as a critical attribute.



#### B. Ingesting TypeScript (The "Binder")

This is where the magic happens. You need to use the **TypeScript TypeChecker**.

* **Action:** When a `.ts` file updates:
1. Traverse the AST.
2. Look for nodes of type `PropertyAccessExpression` (`obj.prop`) or `BindingElement` (destructuring).
3. **The Check:**
```typescript
// 1. Get the symbol of the property being accessed
const symbol = typeChecker.getSymbolAtLocation(node.name);

// 2. Trace it back to its declaration
const declarations = symbol?.getDeclarations();
const sourceFile = declarations?.[0].getSourceFile();

// 3. IS IT JSON?
if (sourceFile.fileName.endsWith('.json')) {
     // 4. Calculate the JSON Path
     // You have to reconstruct the path by walking up the JSON AST
     // or by checking the symbol's parent chain.
     const jsonPath = getPathFromSymbol(symbol); 

     // 5. Create the Edge in Graphology
     graph.mergeEdgeWithKey(
         `binding::${tsNodeId}::${jsonNodeId}`, 
         tsNodeId, 
         jsonNodeId
     );
}

```





---

### 3. The Bi-Directional Sync Algorithm

Now that the graph is live, here is how you handle the updates.

#### Scenario A: Rename in TypeScript (`config.old`  `config.new`)

1. **Trigger:** User edits `.ts` file. Your watcher detects the AST change.
2. **Lookup:** Query Graphology: *"Does the modified AST node have an outgoing `BINDS_TO` edge?"*
3. **Target:** If yes, get the target `JSON_PROPERTY` node (the "Source of Truth").
4. **Action:**
* Read the JSON file.
* Use `jsonc-parser.applyEdits` to safely rename the key at the target path.
* Write the JSON file to disk.
* *Note:* This triggers the JSON watcher (Step B), but since the values match, it stabilizes.



#### Scenario B: Rename in JSON (`"old": "val"`  `"new": "val"`)

1. **Trigger:** User edits `.json` file. Watcher detects change.
2. **Diff:** Compare old vs. new JSON AST to detect that `["theme", "old"]` became `["theme", "new"]`.
3. **Lookup:** Query Graphology: *"Get all inbound `BINDS_TO` edges for the node `['theme', 'old']`."*
4. **Target:** You now have a list of every file and offset in your codebase that references this key.
5. **Action:**
* Loop through the specific TypeScript files.
* Create a "Text Replacement" for each range (Offset `X` to `Y`).
* Apply edits to the TS files.



### 4. The "Gotchas" You Will Face

Since you are building this, here are the three hardest edge cases you need to handle in your graph logic:

**1. The "Destructuring" Trap**

```typescript
const { theme } = require('./config.json');

```

* **Problem:** The AST node is a `BindingElement`, not a `PropertyAccessExpression`.
* **Fix:** You must explicitly handle `SyntaxKind.BindingElement`. The symbol resolution works the same, but the text replacement logic is different (you are renaming a destructured variable, which might require renaming *its* usages too if you aren't careful).

**2. The "Aliasing" Trap**

```typescript
import data from './data.json';
const d = data; // Aliased
console.log(d.theme);

```

* **Problem:** If you only track imports, you miss `d`.
* **Fix:** Rely strictly on the `TypeChecker`. It resolves `d` back to `data` automatically. As long as you check the *Symbol's Declaration SourceFile*, `d.theme` will correctly point back to the JSON file.

**3. Arrays**

* **Problem:** JSON Arrays (`items[0]`) are positional.
* **Advice:** For V1, **ignore arrays**. Only sync Object Keys. Syncing array indices is fragile and rarely what the user intends during a refactor.

### Summary

You have the infrastructure. You just need to add the **Translation Layer**:

1. **Node Generator:** `jsonc-parser` for JSON nodes.
2. **Edge Generator:** `TypeChecker.getSymbolAtLocation()` to verify if a TS node points to a JSON file.
3. **Controller:** A simplified "Reactor" that listens to graph events and dispatches file writes.