# Universal Log Compression System

> **Status:** Phases 1–4 ✅ Production-verified (2026-02-22) · Phase 5 ❌ Not started · Phase 6 ❌ Deferred

## Problem Statement

The codebase has a powerful log compression library (logpare — Drain algorithm) already installed and partially wired up, but it is severely underutilized:

1. **Terminal tools require opt-in.** `terminal_execute` and `terminal_read` have a `logFormat` parameter, but compression only fires when Copilot explicitly passes it. By default, raw output is dumped into context — often thousands of repetitive lines.

2. **Output channel tool has zero compression.** `output_read` reads VS Code log files (extension host, Git, TypeScript server, MCP server, etc.) and returns raw content. A single `exthost` read can dump 400KB+ into context.

3. **Console read ignores its own parameter.** `console_read` declares `logFormat` in its input interface but the handler never uses it. Dead code.

4. **MCP server has an unused consolidation module.** `mcp-server/src/log-consolidator.ts` wraps logpare with a clean API (`consolidateLines()`, `consolidateOutput()`) but only the MCP `console` tool imports it. The MCP `file_read` tool doesn't use it at all.

5. **File read has no log awareness.** When Copilot reads `.log`, `.jsonl`, `.txt`, or other log-bearing file types through `file_read`, it gets raw content. The symbolic compression system (skeleton, auto-compression) was designed for code files, not repetitive log data.

6. **Duplicated logic.** The extension's `terminalLmTools.ts` has its own inline copy of logpare wrapping code, separate from the MCP server's `log-consolidator.ts`. Two implementations of the same thing.

### Impact

Without universal compression, Copilot's context window fills with thousands of repetitive log lines like:

```
2026-02-22T05:47:04.194Z [client-pipe] file.highlightReadRange → \\.\pipe\vscode-devtools-client (timeout=5000ms)
2026-02-22T05:47:04.194Z [client-pipe] file.highlightReadRange connected — sending request (id=file.highlightReadRange-1771739232865-3qomam)
2026-02-22T05:47:04.197Z [client-pipe] file.highlightReadRange ✓ success
2026-02-22T05:47:12.865Z [client-pipe] file.highlightReadRange → \\.\pipe\vscode-devtools-client (timeout=5000ms)
... (249 more identical lines with different timestamps and IDs)
```

With logpare, this compresses to:

```
[249x] [client-pipe] file.highlightReadRange → <*> (timeout=<*>)
[249x] [client-pipe] file.highlightReadRange connected — sending request (id=<*>)
[249x] [client-pipe] file.highlightReadRange ✓ success
```

**~99% token reduction** for repetitive logs.

### Demo Results (Real VS Code Logs)

| Log File | Size | Lines | Templates | Compression | Summary Chars | Time |
|----------|------|-------|-----------|-------------|---------------|------|
| TypeScript LS | 753 KB | 10,755 | 293 | **97.3%** | 1,082 | 145ms |
| Copilot Chat | 295 KB | 2,527 | 712 | **71.8%** | 1,891 | 42ms |
| ESLint | 2.9 KB | 37 | 5 | **86.5%** | 767 | 0.5ms |

**Key demo observations:**
- Summary format always fits within 3000 token budget, even for 10K+ line files
- Severity detection correctly identified errors vs warnings vs info
- Stack trace detection works (`isStackFrame: true`)
- Duration extraction caught values like `38.1458ms`, `1.2327991s`
- Correlation ID extraction found UUIDs like `aa498d20-7468-4b6f-bbca-30240dc4de12`
- Template IDs are simple sequential strings: `t001`, `t048`, `t152`

---

## Design Principles

1. **Always-on compression.** No opt-in parameter. Every tool that returns log-like content automatically compresses it. The `logFormat` parameter is removed entirely.

2. **Progressive depth traversal.** Mirrors the `file_read` approach: enforce a **3000 token limit** (configurable via extension settings) at every level. Copilot navigates deeper by providing drill-down parameters until it reaches content that fits within the limit or reaches the lowest possible granularity.

3. **Single shared package.** One `packages/log-consolidation/` module used by both the extension (LM tools) and the MCP server. No duplicate code.

4. **Async worker thread processing.** CPU-bound compression runs on an async worker thread (`await compressInWorker(lines)`) to keep the extension host and MCP server responsive for other tool calls. Falls back to inline processing on failure.

5. **File type allowlist.** Only files with known log-bearing extensions get automatic compression via `file_read`. Code files (.ts, .js, .md, etc.) continue using the existing symbolic compression system.

6. **Composable filter layering.** New parameters on existing tools (not new tools) allow Copilot to progressively navigate into compressed log data — by template ID, severity, time range, duration threshold, correlation ID, stack frame toggle, or pattern. All filters combine with AND logic.

7. **Log entry boundary detection.** A pre-processing step recognizes multi-line log entries (JSON dumps, multi-line messages) by detecting timestamp/severity prefixes at line starts. Continuation lines are grouped with their parent entry before logpare processes them, fixing the root cause of junk templates like `},` and `<*>,`.

8. **Custom logpare strategy.** Extended pattern set on top of logpare's defaults to improve template quality for VS Code logs: extension IDs, semantic versions, process/thread IDs, memory sizes, session timestamps.

---

## Architecture

### Shared Package: `packages/log-consolidation/`

A standalone TypeScript module in `packages/` that both the extension and MCP server import via path aliases. esbuild resolves the imports at bundle time — no separate build step.

```
packages/
└── log-consolidation/
    ├── package.json          # Module metadata (name, version, main/types)
    ├── tsconfig.json         # TypeScript config
    └── src/
        ├── index.ts          # Public API exports
        ├── engine.ts         # Core compression engine
        ├── boundary.ts       # Log entry boundary detector (multi-line grouping)
        ├── strategy.ts       # Custom logpare strategy (extended patterns)
        ├── filters.ts        # Composable filter functions
        ├── worker.ts         # Worker thread entry point
        ├── worker-pool.ts    # Worker thread pool manager
        ├── types.ts          # Shared types and interfaces
        └── format.ts         # Output formatting (summary, detail views)
```

#### Integration

Both `tsconfig.json` files (extension root + `mcp-server/`) add a path alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@packages/log-consolidation": ["../packages/log-consolidation/src/index.ts"]
    }
  }
}
```

Both `esbuild` configs resolve the alias at bundle time. The package has no runtime dependencies beyond `logpare` (already installed).

#### Moving Existing Code

The existing `mcp-server/src/log-consolidator.ts` becomes the starting point for `packages/log-consolidation/src/engine.ts`. The inline logpare code in `services/terminalLmTools.ts` is deleted. Both consumers import from the shared package.

---

### Log Entry Boundary Detector (`boundary.ts`)

**Root cause of junk templates:** Logpare processes line-by-line. When logs contain multi-line entries (JSON config dumps, multi-line error messages, formatted tables), each physical line becomes an independent template. This produces noise like `},`, `],`, `<*>,` with hundreds of occurrences.

**The fix:** A pre-processing step that groups physical lines into logical log entries before logpare sees them.

#### Algorithm

1. Scan each line for a **timestamp/severity header pattern** (ISO 8601 timestamps, syslog format, common prefixes like `[info]`, `[error]`, etc.)
2. Lines that START with a recognized header are "entry headers" — they begin a new log entry
3. Lines that do NOT start with a header are "continuation lines" — they belong to the preceding entry
4. Group continuation lines with their parent entry (join with `\n` or collapse to a descriptor like `[+N continuation lines]`)

```
Input (5 physical lines):
  2026-02-21T22:15:00Z [info] Server config:
  {
    "target": "ES2022",
    "strict": true
  }

Output (1 logical entry):
  2026-02-21T22:15:00Z [info] Server config: { "target": "ES2022", "strict": true }
```

This fixes ALL multi-line content at the source — JSON dumps, multi-line exceptions, formatted tables, YAML output — not just one edge case.

---

### Custom Logpare Strategy (`strategy.ts`)

Logpare's `defineStrategy()` lets us extend the default pattern recognizers. The defaults already wildcardize timestamps, UUIDs, IPs, URLs, numbers, file paths. We add VS Code-specific patterns:

```typescript
import { defineStrategy, DEFAULT_PATTERNS } from 'logpare';

const vsCodeStrategy = defineStrategy({
  patterns: {
    ...DEFAULT_PATTERNS,
    // VS Code extension IDs: publisher.extensionName
    extensionId: /\b[a-zA-Z][\w-]*\.[a-zA-Z][\w-]*/,
    // Semantic versions: 1.96.0, v22.13.1-beta.1
    semver: /\bv?\d+\.\d+\.\d+(-[\w.]+)?\b/,
    // Process/thread IDs: PID:12345, Worker #3, Thread-12
    processId: /\b(?:PID|pid|Worker|Thread)[\s:#-]*\d+\b/,
    // Memory sizes: 128MB, 1.5GB, 4096KB
    memorySize: /\b\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB|bytes?)\b/i,
    // VS Code log session timestamps: 20260221T211915
    logSessionId: /\b\d{8}T\d{6}\b/,
  }
});
```

**What gets wildcardized (replaced with `<*>`):**

| Pattern | Example | Result |
|---------|---------|--------|
| `extensionId` | `TypeScriptTeam.native-preview` | `<*>` |
| `semver` | `v1.96.0` | `<*>` |
| `processId` | `PID:12345` | `<*>` |
| `memorySize` | `128MB` | `<*>` |
| `logSessionId` | `20260221T211915` | `<*>` |

**What is NOT wildcardized (preserved as meaningful tokens):**
- HTTP methods (`GET`, `POST`, `DELETE`)
- Log levels/severity (`[info]`, `[error]`, `[warning]`)
- Channel names
- Tool names (`file.highlightReadRange`, `checkForChanges`)

---

### Composable Filter System (`filters.ts`)

All filters combine with AND logic and work at the template level. The existing parameters (pattern, limit, afterLine, beforeLine, lineLimit) are preserved. New filters leverage logpare's already-extracted metadata:

| Filter | Type | Description | Based On |
|--------|------|-------------|----------|
| `templateId` | `string` | Show raw lines matching this template ID | Template matching |
| `severity` | `string` | Filter by severity: `error`, `warning`, `info` | `template.severity` |
| `timeRange` | `string` | Time window: `HH:MM-HH:MM` or `HH:MM:SS-HH:MM:SS` | Timestamp parsing |
| `minDuration` | `string` | Slow request threshold: `1s`, `500ms` | `template.durationSamples` |
| `correlationId` | `string` | Trace a specific request UUID | `template.correlationIdSamples` |
| `includeStackFrames` | `boolean` | Show/hide stack trace templates (default: true) | `template.isStackFrame` |
| `pattern` | `string` | Regex filter (existing) | Line content matching |
| `limit` | `number` | Max lines to return (existing) | Truncation |
| `afterLine` | `number` | Lines after this number (existing) | Offset |
| `beforeLine` | `number` | Lines before this number (existing) | Offset |
| `lineLimit` | `number` | Max chars per line (existing) | Truncation |

#### Filter Pipeline

```
Raw Log Lines
      │
      ▼
1. Existing filters (pattern, afterLine, beforeLine, limit)
   → Narrow the line set
      │
      ▼
2. Boundary detection
   → Group multi-line entries into atomic entries
      │
      ▼
3. Logpare compression (with custom strategy)
   → Extract templates
      │
      ▼
4. Template-level filters (severity, minDuration, correlationId, includeStackFrames)
   → Narrow the template set
      │
      ▼
5. Template selection (templateId)
   → If specified, expand to raw lines of that template
      │
      ▼
6. Token limit enforcement (3000 tokens)
   → If still too large, re-compress or truncate
      │
      ▼
7. Format as summary output
```

**Critical:** Even filtered/drill-down results get compressed again if they exceed the token limit. The engine recursively compresses until the output fits or logpare can find no more patterns.

---

### Core Engine: Progressive Depth Traversal

The engine enforces the same **3000 token limit** concept used by `file_read`'s auto-compression. Every log output goes through this pipeline:

```
Raw Log Content
      │
      ▼
┌─────────────────────────────────┐
│  1. Pre-filter (existing params)│
│     pattern, afterLine, limit   │
└─────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  2. Boundary detection          │
│     Group multi-line entries    │
└─────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  3. Run logpare (Drain algo)    │
│     Custom VS Code strategy     │
│     Extract templates, stats    │
└─────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  4. Apply composable filters    │
│     severity, minDuration,      │
│     correlationId, stackFrames  │
└─────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  5. Template expansion          │
│     If templateId specified,    │
│     show raw matching lines     │
└─────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│  6. Check token limit           │
│     Is output ≤ 3000 tokens?    │
└─────────┬───────────┬───────────┘
          │           │
     YES  │      NO   │
          ▼           ▼
   Return as-is    Re-compress:
                   - Top N templates
                   - Aggregate low-freq
                   - Drill-down hints
```

#### Level 0: Overview (Default — No Drill-Down Parameters)

When a log tool is called with no drill-down parameters, the engine returns a compressed overview:

```markdown
## Log Overview (3,420 lines → 12 unique patterns)

**Severity:** 3 errors, 7 warnings, 3,410 info
**Time span:** 23:19:19 — 00:13:07 (53m 48s)
**Compression:** 97.2% token reduction

| ID | Pattern | Count | Severity |
|----|---------|-------|----------|
| t1 | [client-pipe] <*> → <*> (timeout=<*>) | 847 | info |
| t2 | [client-pipe] <*> connected — sending request (id=<*>) | 847 | info |
| t3 | [client-pipe] <*> ✓ success | 847 | info |
| t4 | [host-pipe] checkForChanges → <*> (timeout=<*>) | 423 | info |
| t5 | [host] MCP restart expected — mcpStatus will block | 3 | warning |
| ... | (7 more patterns) | ... | ... |

**Drill-down:** Use `templateId`, `severity`, `minDuration`, `correlationId`, `includeStackFrames`, or `pattern` to explore.
```

This always fits within 3000 tokens regardless of the original log size.

#### Level 1: Drill-Down (With Parameters)

Copilot provides composable filter parameters to see more detail:

- `templateId: "t1"` — Show all raw lines matching template t1
- `severity: "error"` — Show only error-level templates
- `minDuration: "1s"` — Show only templates with durations ≥ 1s
- `correlationId: "aa498d20-..."` — Trace a specific request
- `includeStackFrames: false` — Hide stack trace templates
- `timeRange: "00:12:00-00:13:00"` — Logs in a time window
- `pattern: "failed|error"` — Regex filter (existing)

**All filters compose with AND logic.** Example: `severity: "error", minDuration: "1s"` shows only error templates that have slow durations.

**Critical:** Even drill-down results get logpare compression if they exceed the token limit. The engine recursively compresses until the output fits or logpare can find no more patterns.

#### Level N: Maximum Depth

Drilling continues until one of:
- Output fits within 3000 tokens naturally (no compression needed)
- Logpare can find no more patterns (all lines are unique)
- A single log entry is selected (atomic — can't compress further)

Even a single enormous log entry (e.g., a serialized JSON blob or stack trace) should be navigable — potentially using structural compression for JSON or line-range windowing for very long entries.

---

### Drill-Down Parameters (Added to Existing Tools)

These parameters are added to the existing tool schemas. They work identically across all log-bearing tools and compose with AND logic:

#### New Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `templateId` | `string` | Show raw lines matching this template ID from the overview |
| `severity` | `string` | Filter by severity level: `error`, `warning`, `info` |
| `timeRange` | `string` | Time window: `HH:MM-HH:MM` or `HH:MM:SS-HH:MM:SS` |
| `minDuration` | `string` | Show templates with durations ≥ threshold: `1s`, `500ms`, `100ms` |
| `correlationId` | `string` | Trace a specific request by UUID |
| `includeStackFrames` | `boolean` | Show/hide stack frame templates (default: `true`) |

#### Existing Parameters (Preserved)

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` | Regex filter on raw line content |
| `limit` | `number` | Max lines/templates to return |
| `afterLine` | `number` | Only lines after this line number |
| `beforeLine` | `number` | Only lines before this line number |
| `lineLimit` | `number` | Max characters per line |

The `logFormat` parameter is **removed** from all tools. Compression is always automatic.

---

### Worker Thread Architecture (Async)

Both the extension host and MCP server are single-threaded JavaScript runtimes. Logpare's Drain algorithm processes ~10K lines in ~145ms (demo result), but larger files (100K+ lines) could block the event loop significantly. The worker model keeps the main thread responsive:

```
┌─────────────────────────────┐
│  Main Thread                │
│  (Extension / MCP Server)   │
│                             │
│  await compressInWorker()   │
│     ↓               ↑      │
│  postMessage(data) ────────►│  Worker Thread
│  onmessage(result) ◄───────│  (runs logpare)
│                             │
│  Pool: 1-2 async workers    │
│  Promise-based return       │
│  Inline fallback on failure │
└─────────────────────────────┘
```

- **Async model:** `await compressInWorker(lines)` returns a Promise. Main thread continues handling other tool calls while logpare runs.
- **Pool size:** 1-2 workers (configurable via settings)
- **Timeout:** 10 seconds per compression call (configurable)
- **Fallback:** If worker fails or times out, runs logpare inline on main thread
- **Size guard:** Files > 50MB are streamed through the worker in chunks

---

### File Type Allowlist

For the `file_read` MCP tool, automatic log compression is applied only to files with these extensions:

#### Always-Compress (High Confidence)

These are always log files:

| Extension | Description |
|-----------|-------------|
| `.log` | Standard log file |
| `.out` | Standard output capture |
| `.err` | Standard error capture |
| `.trace` | Trace output |
| `.syslog` | System log |
| `.access` | HTTP access log |
| `.audit` | Audit log |

#### Structured Log Formats

Structured logs with line-per-entry format:

| Extension | Description |
|-----------|-------------|
| `.jsonl` | JSON Lines (one JSON object per line) |
| `.ndjson` | Newline Delimited JSON |

#### Diagnostic Files

Debug and diagnostic output:

| Extension | Description |
|-----------|-------------|
| `.dump` | Memory/process dump output |
| `.diag` | Diagnostic output |
| `.debug` | Debug output |

#### Experimental (Text Files)

Text files are not always logs, but logpare's minimum-compression-ratio check (10%) acts as a natural guard — if the content has no patterns, logpare returns the raw text unchanged:

| Extension | Description |
|-----------|-------------|
| `.txt` | Plain text (experimental — logpare decides if compressible) |
| `.csv` | CSV data (experimental — logpare decides if compressible) |

#### Excluded (Symbolic Compression Handles These)

These file types use the existing symbolic compression system and are **never** processed by the log compression engine:

`.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`, `.jsonc`, `.md`, `.markdown`, `.html`, `.css`, `.scss`, `.less`, `.yaml`, `.yml`, `.xml`, `.toml`, etc.

---

## Tool Updates

### 1. `terminal_execute` / `terminal_read` (Extension LM Tools)

**Current state:** Has `logFormat` opt-in parameter. Uses inline logpare code.

**Changes:**
- Remove `logFormat` parameter from schema and code
- Import from `@packages/log-consolidation`
- Always compress terminal output through the engine
- Add `templateId`, `severity`, `timeRange`, `minDuration`, `correlationId`, `includeStackFrames` parameters for drill-down
- `pattern` already exists (keep as-is)
- All output enforces 3000 token limit

### 2. `output_read` (Extension LM Tool)

**Current state:** Reads raw VS Code log files. No compression. Has `limit`, `pattern`, `afterLine`, `beforeLine`, `lineLimit` parameters.

**Changes:**
- Import from `@packages/log-consolidation`
- Always compress channel content through the engine
- Add `templateId`, `severity`, `timeRange`, `minDuration`, `correlationId`, `includeStackFrames` parameters
- Keep existing `pattern`, `afterLine`, `beforeLine`, `limit` parameters
- `lineLimit` may become redundant since compression handles size
- All output enforces 3000 token limit

### 3. `console_read` (Extension LM Tool)

**Current state:** Has `logFormat` in interface but completely ignores it. Uses structured JSON output.

**Changes:**
- Remove dead `logFormat` parameter
- Format console messages as log lines, then compress through the engine
- Add `templateId`, `severity`, `minDuration`, `correlationId`, `includeStackFrames` parameters
- All output enforces 3000 token limit

### 4. `console_read` (MCP Server Tool — `mcp-server/src/tools/console.ts`)

**Current state:** Imports `consolidateLines` from `log-consolidator.ts`. Has `logFormat` parameter.

**Changes:**
- Import from `@packages/log-consolidation` instead
- Remove `logFormat` parameter
- Always compress through the engine
- Add drill-down parameters
- All output enforces 3000 token limit

### 5. `file_read` (MCP Server Tool — `mcp-server/src/tools/file/file-read.ts`)

**Current state:** Has auto-compression for symbolic files (code, markdown, JSON). No awareness of log files.

**Changes:**
- Import from `@packages/log-consolidation`
- Detect file extension against allowlist before symbolic parsing
- For allowlisted files: skip symbolic parsing, run logpare compression instead
- Add drill-down parameters (`templateId`, `severity`, `timeRange`, `minDuration`, `correlationId`, `includeStackFrames`, `pattern`)
- Use `startLine`/`endLine` for line-range windowing on log files
- All output enforces 3000 token limit

---

## Configuration

New extension settings in `package.json`:

```json
{
  "devtools.logCompression.tokenLimit": {
    "type": "number",
    "default": 3000,
    "description": "Maximum token count for compressed log output. Lower values produce more compressed overviews."
  },
  "devtools.logCompression.workerThreads": {
    "type": "number",
    "default": 1,
    "minimum": 0,
    "maximum": 4,
    "description": "Number of worker threads for log compression. 0 disables worker threads (inline processing)."
  },
  "devtools.logCompression.maxFileSize": {
    "type": "number",
    "default": 52428800,
    "description": "Maximum file size in bytes for log compression (default: 50MB). Larger files are processed in chunks."
  }
}
```

---

## Phased Implementation Plan

### Phase 1: Shared Package Foundation ✅

> **Verified 2026-02-22:** Package exists at `packages/log-consolidation/` with all modules (engine, boundary, strategy, filters, format, types, index). Both esbuild configs resolve `@packages/log-consolidation`. Boundary detector includes degenerate-case guard for non-timestamped input.

**Goal:** Create `packages/log-consolidation/` with the core engine, boundary detector, custom strategy, composable filters, move existing code, set up path aliases.

**Tasks:**
1. Create `packages/log-consolidation/` directory structure
2. Create `types.ts` with shared interfaces (CompressionRequest, CompressionResult, FilterOptions)
3. Move `mcp-server/src/log-consolidator.ts` → `packages/log-consolidation/src/engine.ts`
4. Create `boundary.ts` — log entry boundary detector that groups multi-line entries
5. Create `strategy.ts` — custom logpare strategy with extended patterns (extensionId, semver, processId, memorySize, logSessionId)
6. Create `filters.ts` — composable filter functions (severity, minDuration, correlationId, includeStackFrames, templateId, timeRange)
7. Add progressive depth traversal logic (token limit enforcement, recursive compression)
8. Add drill-down parameter handling
9. Create `format.ts` with overview and detail formatting
10. Create `index.ts` with public API exports
11. Set up path aliases in both `tsconfig.json` files
12. Configure both esbuild configs to resolve the alias
13. Wire up `logpare` dependency

**Testing:**
- Unit test: boundary detector groups multi-line entries correctly
- Unit test: custom strategy wildcardizes extension IDs, semver, etc.
- Unit test: compress a sample log file, verify token limit enforced
- Unit test: each filter works independently (severity, minDuration, correlationId, stackFrames)
- Unit test: filters compose with AND logic
- Unit test: drill-down by templateId returns matching lines
- Unit test: recursive compression when drill-down still exceeds limit
- Integration test: import from both extension and MCP server code

### Phase 2: Wire Up Terminal Tools ✅

> **Verified 2026-02-22:** 73 repetitive lines → 5 patterns (93% reduction). Drill-down tested: `severity` (error/warning/info), `templateId` (raw line expansion), `timeRange` (temporal filtering). Small output passthrough (<5 lines) returns raw content. All working.

**Goal:** Replace inline logpare code in `terminalLmTools.ts` with the shared package.

**Tasks:**
1. Remove `logFormat` parameter from terminal tool schemas in `package.json`
2. Remove inline `consolidateOutput()` and logpare imports from `terminalLmTools.ts`
3. Import from `@packages/log-consolidation`
4. Wire `formatTerminalResult()` to always run through compression engine
5. Add `templateId`, `severity`, `timeRange`, `minDuration`, `correlationId`, `includeStackFrames` parameters to terminal tool schemas
6. Handle all drill-down filters in the terminal tool handlers

**Testing:**
- Run a command that produces repetitive output (e.g., `npm test` with many passing tests)
- Verify overview is compressed within token limit
- Verify drill-down by templateId shows matching lines
- Verify drill-down results are also compressed if over limit

### Phase 3: Wire Up Output Read Tool ✅

> **Verified 2026-02-22:** exthost channel (2,886 lines) → 59 patterns (98% reduction, 130ms). Drill-down tested: `severity: error` (1 error template), `templateId` (raw expansion with first/last 50 lines), `pattern` (pre-filter + compressed). Combined filters compose with AND logic. All working.

**Goal:** Add compression to the output_read LM tool.

**Tasks:**
1. Import from `@packages/log-consolidation`
2. Add `templateId`, `severity`, `timeRange`, `minDuration`, `correlationId`, `includeStackFrames` parameters to tool schema in `package.json`
3. In `readChannel()`, pipe content through compression engine before returning
4. Update `IReadOutputChannelsParams` interface
5. Handle all drill-down filter parameters

**Testing:**
- Read the MCP server log (~460KB, 3400+ lines) — verify compressed overview
- Drill into a specific template — verify detail view
- Read extension host log — verify compression
- Verify existing `pattern`, `afterLine`, `beforeLine` still work alongside new params

### Phase 4: Wire Up Console Tools ✅

> **Verified 2026-02-22:** 500 console messages → 19 patterns (96% reduction, 18ms). Required boundary detector fix: console messages use `#ID [type] text` format with no timestamps — degenerate case guard added to `boundary.ts`. Drill-down tested: `templateId`, `pattern`, `severity`, `types` filter. MCP `console.ts` and `log-consolidator.ts` source files removed (shared package replaces them). All working.

**Goal:** Fix the dead `logFormat` in extension's console_read and update MCP console tool.

**Tasks:**
1. Extension `console_read`: Remove dead `logFormat`, format messages as lines, compress
2. MCP `console.ts`: Replace `log-consolidator.ts` import with shared package
3. Add drill-down parameters to both tools' schemas
4. Remove `mcp-server/src/log-consolidator.ts` (now in shared package)

**Testing:**
- Read console messages from a page with many log entries
- Verify compression on repetitive console.log patterns
- Verify drill-down works

### Phase 5: Wire Up File Read for Log Files ❌

> **Status:** Not started. `mcp-server/src/tools/file/file-read.ts` has no log file detection or compression.

**Goal:** Add log file detection and compression to the MCP file_read tool.

**Tasks:**
1. Add file extension allowlist check in file_read handler
2. For allowlisted files: skip symbolic parsing, use logpare compression
3. Add drill-down parameters to file_read schema
4. Handle `startLine`/`endLine` as line-range windowing for log files
5. Handle `pattern` as regex filter before compression

**Testing:**
- Read a `.log` file — verify compressed overview
- Read a `.jsonl` file — verify compressed overview
- Read a `.txt` file — verify logpare decides if compressible
- Verify `.ts` files still use symbolic compression (not affected)
- Verify drill-down works on log files
- Test large log files (>1MB) for performance

### Phase 6: Worker Thread Support ❌ (Deferred)

> **Status:** Deferred. Inline compression is fast enough for current workloads (18ms–145ms). Will revisit if 100K+ line files become common.

**Goal:** Move compression off the main thread.

**Tasks:**
1. Create `worker.ts` entry point that runs logpare in a worker thread
2. Create `worker-pool.ts` for pool management
3. Wire up the engine to use worker pool with inline fallback
4. Add timeout and error handling
5. Add extension settings for pool size and timeout
6. Handle large files (>50MB) with chunked processing

**Testing:**
- Verify compression still works correctly via worker
- Verify fallback to inline when worker fails
- Performance test with large log files
- Verify extension host stays responsive during compression

---

## Resolved Decisions (From Demo & Discussion)

### 1. Default Output Format
**Decision:** Summary format. Consistently fits within 3000 token budget even for 10K+ line files (1,082 chars for 10,755 lines).

### 2. Drill-Down Interface
**Decision:** Composable filter layering. All existing filters (pattern, limit, afterLine, beforeLine, lineLimit) preserved. New filters (templateId, severity, timeRange, minDuration, correlationId, includeStackFrames) added as composable dimensions. All combine with AND logic.

### 3. Worker Thread Model
**Decision:** Async workers. `await compressInWorker(lines)` returns a Promise, keeping the main thread responsive. Inline fallback on failure.

### 4. Multi-Line Log Entry Noise
**Decision:** Log entry boundary detector. Pre-processing step recognizes timestamp/severity header patterns and groups continuation lines with their parent entry. Fixes JSON dumps, multi-line errors, and all other multi-line content at the source.

### 5. Custom Logpare Strategy
**Decision:** Extended pattern set — 5 additional patterns (extensionId, semver, processId, memorySize, logSessionId) on top of logpare's 12 defaults. HTTP methods and channel names are NOT wildcardized (preserved as meaningful tokens).

### 6. SQLite
**Decision:** Deferred. In-memory logpare results are fast enough (~145ms for 10K lines). SQLite could be a future enhancement for cross-session querying if the need arises.

### 7. Time Range Parsing
**Decision:** Short form: `HH:MM-HH:MM` or `HH:MM:SS-HH:MM:SS`. Parse timestamps from log lines to enable temporal filtering.

### 8. Template Stability Across Calls
Logpare assigns template IDs sequentially. As long as the same input is processed, IDs are stable. **Risk:** If new log lines are written between calls, IDs could shift. **Mitigation:** Cache the last compression result per source (channel, terminal, file) with a content hash for staleness detection.

### 9. Filter vs Compression Order
**Decision:** Filter first (existing params like pattern, afterLine), then compress. This preserves existing behavior and produces the most useful results.

## Open Questions

### 1. MCP Sampling for Extremely Deep Content
For cases where even logpare can't compress meaningfully (all lines are unique), should we use MCP sampling or VS Code's language model API to have GPT-4.1 summarize the content before returning it?

**Status:** Deferred. Start with logpare as the only compression layer. Add LM-based summarization as a future enhancement if testing reveals gaps.

### 2. Template ID Caching Implementation
How should we implement template caching for stable drill-down IDs? Options: in-memory LRU cache, disposal on source change, or hash-based invalidation.

**Status:** To be resolved during Phase 1 implementation.

### 3. Future: SQLite for Cross-Session Queries
SQLite could enable complex queries across multiple log files and sessions (e.g., "show me all errors from the last 3 sessions"). Persistent template databases would enable stable template IDs across restarts.

**Status:** Footnoted for future consideration. Not planned for current implementation phases.

---

## File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `packages/log-consolidation/package.json` | Package metadata |
| `packages/log-consolidation/tsconfig.json` | TypeScript config |
| `packages/log-consolidation/src/index.ts` | Public API exports |
| `packages/log-consolidation/src/engine.ts` | Core compression engine (from log-consolidator.ts) |
| `packages/log-consolidation/src/boundary.ts` | Log entry boundary detector (multi-line grouping) |
| `packages/log-consolidation/src/strategy.ts` | Custom logpare strategy (extended patterns) |
| `packages/log-consolidation/src/filters.ts` | Composable filter functions |
| `packages/log-consolidation/src/types.ts` | Shared types |
| `packages/log-consolidation/src/format.ts` | Output formatting |
| `packages/log-consolidation/src/worker.ts` | Worker thread entry (Phase 6) |
| `packages/log-consolidation/src/worker-pool.ts` | Worker pool manager (Phase 6) |

### Modified Files

| File | Changes |
|------|---------|
| `tsconfig.json` | Add `@packages/log-consolidation` path alias |
| `mcp-server/tsconfig.json` | Add `@packages/log-consolidation` path alias |
| `esbuild.js` | Resolve `@packages/log-consolidation` alias |
| `mcp-server/esbuild.mjs` | Resolve `@packages/log-consolidation` alias |
| `package.json` | Update tool schemas (remove logFormat, add drill-down params, add settings) |
| `services/terminalLmTools.ts` | Replace inline logpare with shared package import |
| `services/readHostOutputTool.ts` | Add compression engine integration |
| `services/clientDevTools.ts` | Wire up console_read with compression |
| `mcp-server/src/tools/console.ts` | Replace log-consolidator import |
| `mcp-server/src/tools/file/file-read.ts` | Add log file detection + compression |

### Deleted Files

| File | Reason |
|------|--------|
| `mcp-server/src/log-consolidator.ts` | Moved to shared package |

---

## Success Criteria

1. **No tool returns raw uncompressed log data** unless the data naturally fits within the token limit
2. **Copilot can navigate any log source** in 2-3 calls: overview → drill-down → detail
3. **Zero duplicated compression code** — everything uses the shared package
4. **Extension host stays responsive** during large log compression (async worker threads)
5. **Existing tool behavior preserved** for non-log file types
6. **Token limit configurable** via extension settings
7. **All tests pass** at each phase before moving to the next
8. **Multi-line log entries** correctly grouped by boundary detector (no junk templates)
9. **All filters composable** with AND logic — any combination works

---

## Logpare API Reference

This section documents the logpare library API as discovered during the demo, for reference during implementation.

### Core Functions

```typescript
// Batch compression — takes array of lines
compress(lines: string[], options?: CompressOptions): CompressionResult

// Raw text compression — splits on newlines internally
compressText(text: string, options?: CompressOptions): CompressionResult

// Streaming — process lines incrementally
createDrain(options?: DrainOptions): Drain // returns a Drain instance

// Custom strategy definition
defineStrategy(overrides: StrategyOverrides): Strategy
```

### Drain Class Methods

```typescript
class Drain {
  addLogLine(line: string): void       // Add single line
  addLogLines(lines: string[]): void   // Add batch of lines
  getTemplates(): Template[]            // Raw templates
  getResult(options: { format: OutputFormat }): CompressionResult
  calculateStats(): CompressionStats
  totalLines(): number
  totalClusters(): number
}
```

### Template Interface

```typescript
interface Template {
  id: string                    // Sequential: "t001", "t048", etc.
  pattern: string               // Template with <*> wildcards
  occurrences: number           // How many lines matched
  severity: string              // "error" | "warning" | "info"
  isStackFrame: boolean         // true if stack trace line
  sampleVariables: string[][]   // Variable values from wildcard slots
  firstSeen: number             // 0-indexed line number
  lastSeen: number              // 0-indexed line number
  urlSamples: string[]          // Extracted domain names
  fullUrlSamples: string[]      // Full URLs with paths/params
  statusCodeSamples: number[]   // HTTP status codes
  correlationIdSamples: string[] // UUIDs/trace IDs
  durationSamples: string[]     // Duration values: "234ms", "1.5s"
}
```

### Output Formats

```typescript
type OutputFormat = 'summary' | 'detailed' | 'json' | 'json-stable'
```

| Format | Size (10K lines) | Use Case |
|--------|-------------------|----------|
| `summary` | ~1K chars | Default overview. `[Nx] pattern` listing. |
| `detailed` | ~4K chars | Per-template metadata (durations, correlation IDs, samples) |
| `json` | ~10K chars | Machine-readable. Full template objects. |
| `json-stable` | ~10K chars | JSON with deterministic ordering |

### Standalone Utility Functions

```typescript
detectSeverity(line: string): string      // Returns "error", "warning", or "info"
extractDurations(line: string): string[]  // ["234ms", "1.5s"]
extractStatusCodes(line: string): number[] // [200, 404]
extractUrls(line: string): string[]       // ["api.github.com"]
extractFullUrls(line: string): string[]   // ["https://api.github.com/repos/..."]
extractCorrelationIds(line: string): string[] // ["aa498d20-7468-..."]
isStackFrame(line: string): boolean       // true for "at func (file:line)"
```

### DEFAULT_PATTERNS (Object — Keys)

```
isoTimestamp, uuid, unixTimestamp, ipv4, ipv6, port,
hexId, blockId, filePath, url, numericId, numbers
```

### STACK_FRAME_PATTERNS (5 patterns)

```
/^\s*at\s+/                        // JavaScript: at func (file:line)
/^\s*@\s*\S+:\d+/                  // Firefox: @file:line
/^\s*\w+@\S+:\d+/                  // Safari: func@file:line
/^\s*\(anonymous\)\s*@/            // Chrome anonymous
/^\s*[A-Za-z_$][\w$]*\s+@\s+\S+:\d+/  // Named@file:line
```

### SEVERITY_PATTERNS (Object — Keys)

```
error, warning
```

### Known Quirks

- `result.stats.templateCount` returns `undefined` — use `result.templates.length` instead
- `firstSeen`/`lastSeen` are 0-indexed line numbers
- `sampleVariables` can contain `<*>` when the variable itself was wildcarded (double-wildcarding)
- Template IDs are sequential (`t001`, `t002`, ...) and stable for identical input
- `createDrain()` returns a `Drain` instance — method is `addLogLine()`, not `addLine()` or `process()`
