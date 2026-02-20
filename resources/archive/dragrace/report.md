# 🏁 AST Drag Race Report

**VS Code Native Semantic APIs** vs **Custom AST Parsers**

> Generated: 2026-02-17T11:15:17.504Z
> Total Duration: 0.07s

## How It Works

- **VS Code side**: Uses `vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri)` via client pipe
- **Custom side**: Uses custom AST parsers (parse5, css-tree, fast-xml-parser, remark, ts-morph, etc.) via `codebase.getOverview`

## 📊 Overall Summary

| Language | File Lines | VS Code Symbols | Custom Symbols | VS Code Depth | Custom Depth | VS Code Time | Custom Time | Winner |
|----------|-----------|----------------|---------------|--------------|-------------|-------------|-------------|--------|

**Totals:** VS Code = 0 symbols, Custom = 0 symbols
**Wins:** VS Code 0 | Custom 0 | Tie 0

---

## 🔍 Per-Language Breakdown

## 📂 Folding Ranges (VS Code Only)

`vscode.executeFoldingRangeProvider` returns collapsible regions — code blocks, comment groups, imports, and user-defined regions.

| Language | Total Ranges | Comment | Imports | Region | Other | Time | Error |
|----------|-------------|---------|---------|--------|-------|------|-------|

## 🎨 Semantic Tokens (VS Code Only)

`vscode.provideDocumentSemanticTokens` classifies every token in the file (variables, types, keywords, comments, etc.).
These are the tokens the language server uses for semantic highlighting.

| Language | Total Tokens | Top Types | Time | Error |
|----------|-------------|-----------|------|-------|

## 📋 Language Server Requirements

For full VS Code semantic API coverage, these extensions are needed:

| Language | Built-in | Extension Required |
|----------|----------|--------------------|
| HTML | ✅ Yes | — |
| CSS | ✅ Yes | — |
| JSON | ✅ Yes | — |
| TypeScript | ✅ Yes | — |
| JavaScript | ✅ Yes | — |
| Markdown | ✅ Partial | `yzhang.markdown-all-in-one` for enhanced |
| YAML | ❌ No | `redhat.vscode-yaml` |
| TOML | ❌ No | `tamasfe.even-better-toml` |
| XML | ❌ No | `redhat.vscode-xml` |
