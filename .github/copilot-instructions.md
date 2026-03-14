# Instructions

Use the #tool:vscode/askQuestions tool often. Even for simple yes or no questions. If you want to ask how we should proceed, or if we should continue, please use the #tool:vscode/askQuestions tool.

## Rules for TypeScript

- Do not use `any` type.
- Do not use `as` keyword for type casting.
- Do not use `!` operator for type assertion.
- Do not use `// @ts-ignore` comments.
- Do not use `// @ts-nocheck` comments.
- Do not use `// @ts-expect-error` comments.
- Prefer `for..of` instead of `forEach`.

## CRITICAL: Use output_read for Debugging

- You have access to the literal VS Code output panels via the `output_read` tool.
- ALWAYS use `output_read` as your FIRST step when troubleshooting errors, crashes, unexpected behavior, or trying to understand why something isn't working.
- The output panels contain real-time logs from the extension host, MCP servers, and other VS Code subsystems — they are the most reliable source of truth for diagnosing issues.
- Use `output_read` with `channel: "mcp"` to see MCP server logs (startup, tool calls, hot-reload, pipeline activity, crashes).
- Use `output_read` with `channel: "exthost"` and `session: "client"` to see extension host logs from the client window.
- Do NOT guess or speculate about what went wrong. Read the actual output logs first.
- When a tool call fails, crashes, or returns unexpected results, immediately check the output logs before attempting any fix.
- When the user reports something isn't working, check the output logs before asking them what happened — the answer is usually right there.

## CRITICAL: Route Logs Through a VS Code Output Channel

- Do NOT rely on `console.log`, `console.warn`, or `console.error` as the primary logging mechanism for extension or MCP diagnostics.
- All meaningful runtime logs MUST be routed through a dedicated VS Code `OutputChannel` so they can be inspected with the `output_read` tool.
- Prefer a single custom output channel for the feature or subsystem you are implementing, rather than scattering logs across browser console output.
- If logging infrastructure does not exist yet, create a small shared logger utility that writes to the custom `OutputChannel` and use that instead of direct console logging.
- Keep browser console logging to an absolute minimum. Only use it for temporary local investigation when there is no viable `OutputChannel` path, and migrate that logging back into the custom output channel before considering the task complete.
- When adding new diagnostics, assume they will need to be read later via `output_read`, so log messages should be structured, stable, and human-readable.
- When debugging an existing issue, prefer reading the custom output channel with `output_read` over inspecting the Chrome DevTools console.

## CRITICAL: Log Drill-Down — Use Compressed Logs Properly

- `terminal_read`, `output_read`, and `logFile_read` all return **compressed log overviews** — a table of deduplicated pattern templates with IDs, counts, and severity levels. This is intentional. Do NOT treat compressed output as broken or incomplete.
- **Never** redirect terminal output to a file (`> output.txt`) to work around log compression. That defeats the purpose entirely and wastes context window.
- **Never** dump hundreds of raw log lines into context. Use the drill-down mechanism instead.
- Use `ephemeral: false` on `terminal_execute` when you need to drill down into the output afterward. Ephemeral terminals clear their buffer after completion.

### Drill-Down Workflow

1. **Read the overview first.** Check exit code, severity counts (any errors?), and the pattern table.
2. **Drill into what matters** using `terminal_read` (or `output_read` / `logFile_read`) with one of these parameters:
   - `severity: "error"` — show only error lines
   - `templateId: "t003"` — expand a specific pattern to see raw instances
   - `pattern: "FAIL"` — free-text search within the output
   - `minDuration`, `timeRange`, `correlationId` — for performance or tracing
3. **Iterate if needed.** Drill into a second template or refine with a narrower pattern.

### Example: Checking Test Results

```
Step 1: terminal_execute("npx vitest run", ephemeral: false)
        → Overview shows severity: 404 info, 2 error. Exit code 1.
Step 2: terminal_read(severity: "error")
        → Shows the 2 error lines: "AssertionError: expected 38 to be 39"
Step 3: terminal_read(pattern: "FAIL")
        → Shows which test file and test name failed
```

This extracts exactly the information needed in 2-3 targeted calls instead of dumping 500+ raw lines.

## CRITICAL: Ask Questions Formatting

- When using the ask_questions tool, keep the question text SHORT and PLAIN TEXT only.
- DO NOT put long explanations, markdown headers, bold text, bullet lists, code blocks, or multi-paragraph content inside the question field.
- The ask_questions UI does NOT render markdown properly — complex formatting is unreadable.
- If you need to explain context before asking a question, write the explanation in normal chat text FIRST, then follow up with a short, plain-text ask_questions call.
- Question text should be a single short sentence or two at most.
- Option labels and descriptions should also be short and plain text.

ASK QUESTIONS AS OFTEN AS YOU POSSIBLY CAN. DO NOT MAKE ANY ASSUMPTIONS ABOUT THE USERS INTENT OR PREFERENCES. IF THE USER HAS NOT EXPLICITLY PROVIDED CONSENT TO A CHANGE, DO NO PROCEED WITHOUT ASKING FIRST VIA THE #tool:vscode/askQuestions TOOL.