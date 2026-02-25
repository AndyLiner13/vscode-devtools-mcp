# Instructions

Use the #tool:vscode/askQuestions tool often. Even for simple yes or no questions. If you want to ask how we should proceed, or if we should continue, please use the #tool:vscode/askQuestions tool.

## Monorepo Structure

This is an npm workspaces monorepo with the following structure:
- **Root** (`./`) — VS Code extension
- **mcp-server** — MCP server package  
- **packages/log-consolidation** — Shared log compression library
- **inspector** — Vite webapp for debugging

### TypeScript Configuration Rules

- ALL workspace `tsconfig.json` files MUST extend `tsconfig.base.json`
- Example: `"extends": "../tsconfig.base.json"` (for subfolders)
- Shared compiler options belong in `tsconfig.base.json`, NOT individual configs
- Workspace-specific options (target, lib, paths) go in that workspace's tsconfig
- DO NOT duplicate compiler options that are already in `tsconfig.base.json`

### Dependency Management Rules

- **Shared dependencies** (typescript, eslint, prettier, etc.) belong in ROOT `package.json`
- **Workspace-specific dependencies** stay in that workspace's `package.json`
- DO NOT add a dependency to a workspace if it already exists in root
- When adding a new shared dependency, add it to ROOT, not individual workspaces
- npm workspaces hoists dependencies automatically — duplicates cause version conflicts

### Workspace-Specific Dependencies

Only add dependencies to workspaces when they are:
1. Unique to that workspace (e.g., `@modelcontextprotocol/sdk` for mcp-server)
2. A different version than root (rare, avoid if possible)
3. A runtime dependency for a published package

## Rules for TypeScript

- Do not use `any` type.
- Do not use `as` keyword for type casting.
- Do not use `!` operator for type assertion.
- Do not use `// @ts-ignore` comments.
- Do not use `// @ts-nocheck` comments.
- Do not use `// @ts-expect-error` comments.
- Prefer `for..of` instead of `forEach`.

## CRITICAL: No VS Code Proposed APIs

- DO NOT use any VS Code proposed APIs anywhere in the codebase.
- DO NOT add `enabledApiProposals` to any `package.json`.
- DO NOT use the `--enable-proposed-api` CLI flag.
- DO NOT use APIs like `findTextInFiles`, `onDidWriteTerminalData`, or any other proposed API.
- We have NO access to proposed APIs. Using them causes the extension to crash into Safe Mode.
- If a feature requires a proposed API, find an alternative using stable APIs only.

## CRITICAL: Hot Reloading — DO NOT Manually Rebuild

- DO NOT manually run build, compile, install, reinstall, or reload commands.
- DO NOT ask the user to rebuild, reinstall, or reload anything.
- DO NOT run `npm run compile`, `npm run build`, or `ext:reinstall` tasks manually.
- EVERYTHING HAS HOT RELOADING BUILT IN.
- The MCP server automatically detects source changes and rebuilds on the next tool call.
- The Extension Development Host automatically picks up changes.
- Just TEST THE TOOLS DIRECTLY after making code changes.
- If tools aren't available yet, call any MCP tool — it will auto-reload and then work.
- Get straight to testing. Skip all rebuild/reinstall steps. It's all automatic.

## CRITICAL: Use output_read for Debugging

- You have access to the literal VS Code output panels via the `output_read` tool.
- ALWAYS use `output_read` as your FIRST step when troubleshooting errors, crashes, unexpected behavior, or trying to understand why something isn't working.
- The output panels contain real-time logs from the extension host, MCP servers, and other VS Code subsystems — they are the most reliable source of truth for diagnosing issues.
- Use `output_read` with `channel: "mcp"` to see MCP server logs (startup, tool calls, hot-reload, pipeline activity, crashes).
- Use `output_read` with `channel: "exthost"` and `session: "client"` to see extension host logs from the client window.
- Do NOT guess or speculate about what went wrong. Read the actual output logs first.
- When a tool call fails, crashes, or returns unexpected results, immediately check the output logs before attempting any fix.
- When the user reports something isn't working, check the output logs before asking them what happened — the answer is usually right there.

## CRITICAL: Ask Questions Formatting

- When using the ask_questions tool, keep the question text SHORT and PLAIN TEXT only.
- DO NOT put long explanations, markdown headers, bold text, bullet lists, code blocks, or multi-paragraph content inside the question field.
- The ask_questions UI does NOT render markdown properly — complex formatting is unreadable.
- If you need to explain context before asking a question, write the explanation in normal chat text FIRST, then follow up with a short, plain-text ask_questions call.
- Question text should be a single short sentence or two at most.
- Option labels and descriptions should also be short and plain text.

ASK QUESTIONS AS OFTEN AS YOU POSSIBLY CAN. DO NOT MAKE ANY ASSUMPTIONS ABOUT THE USERS INTENT OR PREFERENCES. IF THE USER HAS NOT EXPLICITLY PROVIDED CONSENT TO A CHANGE, DO NO PROCEED WITHOUT ASKING FIRST VIA THE #tool:vscode/askQuestions TOOL.