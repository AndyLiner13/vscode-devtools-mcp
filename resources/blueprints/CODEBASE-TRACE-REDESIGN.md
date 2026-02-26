# Codebase Trace — Tool Redesign Blueprint

> **Status:** Draft v1
> **Created:** 2026-02-26
> **Replaces:** Current `codebase_trace` tool (monolithic, confusing `include` param)

---

## 1. Vision

One tool with a dead-simple interface that gives Copilot the complete semantic story of any symbol — the things it **cannot** learn from just reading files.

### Design Principle: codebase_map for Symbols

Just like `codebase_map` has simple booleans (`recursive`, `symbols`, `metadata`) that control granularity, `codebase_trace` has simple booleans that control what semantic analysis to include. Copilot never has to think about analysis modes or configuration — just toggle booleans.

### What This Tool IS For

- Cross-file relationships that aren't visible from reading a single file
- Import resolution chains (barrel files, re-exports)
- Reference sites across the entire codebase
- Call chains (who calls what, transitively)
- Type hierarchy and type flow connections
- Answering "what does this symbol do?" without navigating to the source

### What This Tool Is NOT For

- Reading file content — use `file_read`
- Viewing file/folder structure — use `codebase_map`
- Finding code by concept/text — use `codebase_search`
- Checking code quality — use `codebase_lint`
- Line-based navigation — all results use symbol names, not line numbers

---

## 2. Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `symbol` | string | **Yes** | — | Name of the symbol to trace |
| `file` | string | No | — | File where Copilot encountered the symbol (helps narrow search) |
| `references` | boolean | No | `false` | All usage sites + re-export chains across the codebase |
| `calls` | boolean | No | `false` | Incoming + outgoing call hierarchy (full depth, hierarchical) |
| `types` | boolean | No | `false` | Type hierarchy + type flows + type guards + declaration merging |

### No Other Params

No `depth`, `maxReferences`, `timeout`, `include`, `includeImpact`, `includePatterns`, `excludePatterns`, or `forceRefresh`.

The tool is **fully automatic**:
- Always fresh (no caching — invalidates project cache on every request)
- Full depth by default (with internal adaptive token budget to prevent runaway results)
- File filtering via `.devtoolsignore` only
- Dynamic timeout calculated from project size

### Why No `impact` Boolean

Impact analysis (blast radius) was considered but removed. With `references: true` + `calls: true`, Copilot already sees:
- Every file that uses the symbol (references)
- The full transitive call chain of everything that depends on it (hierarchical incoming calls)

Impact's only unique addition was a crude risk label (`high`/`medium`/`low`) based on reference count thresholds. Copilot can derive this from the reference totals already present in the output.

---

## 3. Output Format

Output is YAML-structured text. No line numbers or column numbers anywhere — Copilot navigates by symbol name using `file_read`.

### 3.1 Definition (always included)

The baseline response. Returned on every call regardless of boolean flags. Provides the semantic identity of the symbol — everything Copilot needs to understand **what it IS** without reading the source file.

```yaml
definition:
  symbol: traceSymbol
  kind: function
  file: services/codebase/trace-symbol-service.ts
  exported: true
  modifiers: [async]
  signature: "(params: TraceSymbolParams) => Promise<TraceSymbolResult>"
  generics: "<T extends BaseEntity>"          # only when present
  jsdoc: "Traces a symbol's lifecycle across the codebase"  # only when present
  parameters:
    - params: TraceSymbolParams
    - timeout: number = 30000                 # includes default values
  returns: Promise<TraceSymbolResult>
  overloads:                                  # only when present
    - "(name: string): Symbol"
    - "(name: string, file: string): Symbol"
  resolvedFrom:                               # import chain resolution
    - client-handlers.ts → imports from "../codebase/client-pipe"
    - client-pipe.ts → re-exports from "./trace-symbol-service"
    - trace-symbol-service.ts → defined here
  members:                                    # only for classes/interfaces
    - startGame(): void (method)
    - endGame(): void (method)
    - currentRound: number (property)
    - players: Map<string, Player> (property)
```

#### Definition fields

| Field | When included | Description |
|-------|---------------|-------------|
| `symbol` | Always | Symbol name |
| `kind` | Always | function, class, interface, type, enum, variable, method, property, etc. |
| `file` | Always | Relative file path where the symbol is defined |
| `exported` | Always | Whether the symbol is exported |
| `modifiers` | When present | `async`, `static`, `private`, `protected`, `abstract`, `readonly`, `const`, `override` |
| `signature` | Always | Clean resolved type signature |
| `generics` | When present | Generic type parameters with constraints |
| `jsdoc` | When present | JSDoc comment text |
| `parameters` | Functions/methods | Parameter names with types and default values |
| `returns` | Functions/methods | Return type |
| `overloads` | When present | All overload signatures (rare, ~5% of functions) |
| `resolvedFrom` | When symbol was found via import | Import chain from encounter site to source definition |
| `members` | Classes/interfaces | Method and property names with types and kinds |

#### What definition does NOT include (and why)

| Excluded | Reason |
|----------|--------|
| Line numbers | Copilot navigates by symbol name, not lines |
| Source code | `file_read` already provides this |
| `extends`/`implements` | Covered by `types` section to avoid duplication |
| `parentScope` | `file_read` already shows the symbol hierarchy |
| `decorators` | Framework-specific, niche. Not applicable to most TS codebases. |
| `constValue` | Low value. Copilot can read the file for literal values. |

---

### 3.2 References (`references: true`)

Every place the symbol is used across the codebase, plus how it's re-exported through module chains.

```yaml
references:
  total: 5
  files: 3
  byFile:
    - file: services/client-handlers.ts
      usages: [call, import]
    - file: mcp-server/src/codebase/client-pipe.ts
      usages: [call]
    - file: tests/trace-symbol.test.ts
      test: true
      usages: [call, call]
  reExports:
    - file: mcp-server/src/codebase/index.ts
      exportedAs: traceSymbol
      from: ./trace-symbol-service
```

#### Reference fields

| Field | Description |
|-------|-------------|
| `total` | Total number of references across all files |
| `files` | Number of distinct files containing references |
| `byFile` | References grouped by file |
| `byFile[].file` | Relative file path |
| `byFile[].test` | `true` when file matches test patterns (`*.test.*`, `*.spec.*`, `__tests__/*`) |
| `byFile[].usages` | Inline array of usage kinds |
| `reExports` | Re-export chains through barrel files |

#### Usage kinds

| Kind | Meaning | Example |
|------|---------|---------|
| `call` | Symbol is invoked | `traceSymbol(params)` |
| `import` | Symbol is imported | `import { traceSymbol } from '...'` |
| `read` | Value is accessed but not invoked | `const fn = traceSymbol` |
| `write` | Value is assigned/modified | `traceSymbol = newImpl` |
| `type-ref` | Used as a type annotation | `param: TraceSymbolParams` |

---

### 3.3 Calls (`calls: true`)

Hierarchical call chain showing who calls this symbol and what it calls, at full depth.

```yaml
calls:
  incoming:
    - codebaseTraceSymbol (client-pipe.ts)
      - handleTrace (client-handlers.ts)
        - codebaseTraceHandler (codebase-trace.ts)
  outgoing:
    - findSymbolNode (trace-symbol-service.ts)
    - traceReferences (trace-symbol-service.ts)
      - languageService.findReferencesAsNodes
    - traceCallHierarchy (trace-symbol-service.ts)
      - getOutgoingCalls (trace-symbol-service.ts)
      - getIncomingCalls (trace-symbol-service.ts)
```

#### Call chain fields

| Field | Description |
|-------|-------------|
| `incoming` | Functions that call this symbol, nested hierarchy (caller → caller's caller → ...) |
| `outgoing` | Functions this symbol calls, nested hierarchy (callee → callee's callee → ...) |

**Depth:** Full depth by default. Internal adaptive token budget automatically reduces depth if the call chain exceeds ~12,000 characters to prevent runaway results.

**Only for callable symbols:** Classes, interfaces, types, variables show empty call chains. Functions, methods, constructors, getters, setters show full chains.

---

### 3.4 Types (`types: true`)

Type hierarchy, type flows, type guards, and declaration merging.

```yaml
types:
  hierarchy:
    extends: Component (framework/component.ts, class)
    implements: [GameInterface (types.ts, interface)]
    subtypes:
      - TriviaGame (TriviaGame.ts, class)
      - MockGame (tests/mock-game.ts, class)
  flows:
    parameters:
      - params → TraceSymbolParams (types.ts)
      - count → number
    returns: Promise<TraceSymbolResult> (types.ts)
    properties:
      - currentRound → number
      - players → Map<string, Player> (types.ts)
  typeGuard: x → User (types.ts)
  mergedDeclarations:
    - Config (config.ts)
    - Config (config.extended.ts)
```

#### Type fields

| Field | When included | Description |
|-------|---------------|-------------|
| `hierarchy.extends` | Classes/interfaces that extend something | Supertype with file and kind |
| `hierarchy.implements` | Classes that implement interfaces | Implemented interfaces |
| `hierarchy.subtypes` | Types that extend/implement this symbol | All subtypes in the project |
| `flows.parameters` | Functions/methods with typed params | Parameter types with cross-file resolution |
| `flows.returns` | Functions/methods with return types | Return type with cross-file resolution |
| `flows.properties` | Classes/interfaces with typed properties | Property types with cross-file resolution |
| `typeGuard` | Functions with type predicates | Type narrowing target |
| `mergedDeclarations` | Interfaces declared in multiple files | All declaration sites |

#### Type flow cross-file resolution

- Cross-file types include the file path: `→ TraceSymbolParams (types.ts)`
- In-file / primitive types omit the file path: `→ number`
- This keeps output self-contained while showing which types come from other files

---

## 4. Internal Behavior

### 4.1 Always Fresh

Every request invalidates the ts-morph project cache and rebuilds from disk. No stale data.

### 4.2 Adaptive Token Budget

Call chains are rendered at full depth, then retroactively reduced if the character count exceeds the internal budget (~12,000 chars). Reduction strategy:
1. Strip `.d.ts` and `node_modules` references
2. Collapse outgoing calls to counts
3. Collapse type flow `traceTo` locations
4. Reduce call hierarchy depth

### 4.3 File Filtering

Only `.devtoolsignore` rules are used for filtering. No `includePatterns` or `excludePatterns` params.

### 4.4 Import Resolution

When Copilot traces a symbol it encountered via import:
1. The tool identifies the import statement
2. Follows the import specifier to the source file
3. If the source file re-exports from another file, follows that chain
4. Continues until reaching the actual definition
5. Returns the complete resolution chain in `resolvedFrom`

### 4.5 Symbol Discovery

When `file` is provided:
1. Search the specified file for a matching declaration
2. If found, resolve imports to the actual definition

When `file` is omitted:
1. Search all project source files for a matching declaration
2. Use the first match found
3. Resolve imports to the actual definition

### 4.6 Dynamic Timeout

Timeout is calculated based on project size (source file count), enabled analysis sections, and internal depth. No user-facing timeout param.

---

## 5. Example Usage Scenarios

### "What is this symbol?"
```
codebase_trace(symbol: "TraceSymbolParams", file: "client-handlers.ts")
```
Result: Definition only. Copilot sees the resolved type, signature, members, JSDoc, and where it's actually defined via the `resolvedFrom` chain. Zero follow-up needed.

### "Where is this used?"
```
codebase_trace(symbol: "traceSymbol", references: true)
```
Result: Definition + all reference sites grouped by file, plus re-export chains. Copilot knows every file that touches this symbol and how.

### "Show me the complete call chain"
```
codebase_trace(symbol: "traceSymbol", calls: true)
```
Result: Definition + hierarchical incoming/outgoing call chains. Copilot sees the full execution path from entry point to leaf function.

### "Give me the full semantic picture"
```
codebase_trace(symbol: "traceSymbol", references: true, calls: true, types: true)
```
Result: Everything. Definition + references + call chains + type hierarchy + type flows. The complete story of this symbol in the codebase.

### "I see this import — what IS it?"
```
codebase_trace(symbol: "codebaseTraceSymbol", file: "client-handlers.ts")
```
Result: The tool resolves the import through `client-pipe.ts` to the actual definition in `trace-symbol-service.ts`. Copilot gets the full story without navigating anywhere.

---

## 6. What Changed from the Current Tool

| Aspect | Current | New |
|--------|---------|-----|
| Analysis control | `include` array with 7 string modes | 3 boolean flags: `references`, `calls`, `types` |
| Impact analysis | Separate `includeImpact` boolean | Removed — redundant with references + calls |
| Depth control | `depth` param (1-10) | Automatic — full depth with adaptive budget |
| Max references | `maxReferences` param | Automatic — internal limit with adaptive reduction |
| Timeout | `timeout` param | Automatic — dynamic calculation from project size |
| Cache | `forceRefresh` previously existed | Always fresh — no caching ever |
| File filtering | `includePatterns`/`excludePatterns` previously existed | `.devtoolsignore` only |
| Line numbers | In all output | Removed everywhere |
| Column numbers | In all output | Removed everywhere |
| Definition | Basic (signature, kind, file, line) | Rich (modifiers, jsdoc, generics, overloads, resolvedFrom, members, parameters with defaults) |
| References | Flat list with context lines | Grouped by file, inline usage kinds, test file markers, no context lines |
| Call chains | Flat list | Hierarchical nested tree |
| Type flows | Separate from hierarchy | Combined into one `types` section |
| Output format | JSON | YAML-structured text |
| Type guards | Not included | Included when present |
| Declaration merging | Not included | Included when present |

---

## 7. Implementation Plan

### Phase 1: Types and Schema
- Update `TraceSymbolParams` in `types.ts` — new boolean params, remove old params
- Update `TraceSymbolResult` in `types.ts` — new output structure
- Update tool schema in `codebase-trace.ts` — new Zod schema

### Phase 2: Definition Enhancement
- Build rich definition output (modifiers, jsdoc, generics, overloads, defaults, members)
- Implement import chain resolution for `resolvedFrom`

### Phase 3: References Formatting
- Group references by file with inline usage kinds
- Add test file detection
- Bundle re-exports

### Phase 4: Hierarchical Call Chains
- Modify call chain output to produce nested hierarchy instead of flat lists
- Implement adaptive depth reduction for token budget

### Phase 5: Types Section
- Merge type flows and type hierarchy into one section
- Add type guard detection
- Add declaration merging detection
- Implement cross-file vs in-file type resolution markers

### Phase 6: Output Formatter
- Build YAML renderer for the new result structure
- Implement progressive detail reduction

### Phase 7: Orchestrator Rewrite
- Rewrite `traceSymbol()` function to use boolean-driven flow
- Remove all old params and include/analysis logic
- Wire up adaptive timeout and token budget

### Phase 8: Client Pipe and Handlers
- Update `client-pipe.ts` function signatures
- Update `client-handlers.ts` handler
- Remove old param forwarding

---

## 8. Deferred Decisions

| Decision | Status | Notes |
|----------|--------|-------|
| Rename file_read/map `symbol` param to `target` | Deferred | Avoid naming conflict with trace's `symbol`. Do after trace tool is complete. |
| Switch map tool output to YAML | Deferred | Currently Markdown tree. Evaluate after trace tool ships. |
| Support for non-TS languages | Deferred | Design for extensibility but only implement TS/JS for now. |
