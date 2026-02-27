---
name: log-drilldown
description: Guide for efficiently reading compressed logs from terminal_read, output_read, and logFile_read tools. Use when running terminal commands, reading VS Code output panels, reading log files, debugging test failures, analyzing build output, or any time you receive a compressed log overview table with pattern template IDs. Covers the drill-down workflow for extracting specific information without dumping raw logs into context.
---

# Log Drill-Down

The `terminal_read`, `output_read`, and `logFile_read` tools compress log output into deduplicated pattern tables. This is by design — raw logs waste context window. Use the drill-down mechanism to extract only the information you need.

## How Compression Works

First call returns a **compressed overview**:

| ID | Pattern | Count | Severity |
|----|---------|-------|----------|
| t003 | Tests <*> passed (<*>) | 21 | info |
| t009 | Tests <*> failed \| <*> passed (<*>) | 2 | error |
| t019 | ✓ Parser: data-driven fixtures > <*> | 85 | info |

Each `<*>` is a variable that differs across instances. The template ID, count, and severity give you a high-level picture without reading hundreds of lines.

## Drill-Down Parameters

All three tools (`terminal_read`, `output_read`, `logFile_read`) accept these drill-down parameters:

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `templateId` | Expand a specific pattern to see raw instances | `"t009"` |
| `severity` | Filter by severity level | `"error"` |
| `pattern` | Free-text search within output | `"FAIL"`, `"expected"` |
| `minDuration` | Filter by execution time | For slow operations |
| `timeRange` | Filter by time window | For temporal debugging |
| `correlationId` | Filter by correlation | For distributed tracing |
| `includeStackFrames` | Include stack traces | For error debugging |

## Core Workflow

### Step 1: Run and read the overview

```
terminal_execute("npx vitest run", ephemeral: false)
```

Check: exit code, severity distribution, pattern table.

**Important:** Use `ephemeral: false` when you need to drill down. Ephemeral terminals clear their buffer after completion and drill-down will return nothing.

### Step 2: Drill into what matters

For test failures:
```
terminal_read(severity: "error")        → see only error lines
terminal_read(pattern: "FAIL")          → find which tests failed
terminal_read(pattern: "expected")      → find assertion details
terminal_read(templateId: "t009")       → expand the "Tests failed" pattern
```

For build errors:
```
terminal_read(severity: "error")        → see compiler errors
terminal_read(pattern: "TS\\d+")        → find TypeScript error codes
```

For performance:
```
terminal_read(minDuration: "1000")      → find slow operations
terminal_read(templateId: "t005")       → expand duration-related patterns
```

### Step 3: Iterate if needed

Drill into a second template or refine with a narrower pattern. Each call is cheap — much cheaper than dumping 500+ raw lines.

## Anti-Patterns — Never Do These

1. **Redirecting to file to bypass compression:** `npx vitest run > output.txt` then `read_file("output.txt")` — defeats the purpose, wastes context.
2. **Ignoring the overview:** Seeing compressed output and assuming it's broken — it's working as designed.
3. **Using `ephemeral: true` then trying to drill down:** The buffer is gone. Use `ephemeral: false` when you need drill-down.
4. **Dumping raw logs:** Reading hundreds of lines via `read_file` on a log file instead of using `logFile_read` with drill-down.

## Quick Reference by Scenario

| Scenario | First Drill-Down |
|----------|-----------------|
| Test suite — did it pass? | Check exit code + `severity` counts in overview |
| Test suite — which tests failed? | `severity: "error"` or `pattern: "FAIL"` |
| Test suite — what was the assertion error? | `pattern: "expected\|AssertionError"` |
| Build — what errors? | `severity: "error"` |
| Runtime — why did it crash? | `includeStackFrames: true` + `severity: "error"` |
| Performance — what's slow? | `minDuration` or time-related `templateId` |
| Confirmation — all green? | Exit code 0 + only `info` severity = all good |
