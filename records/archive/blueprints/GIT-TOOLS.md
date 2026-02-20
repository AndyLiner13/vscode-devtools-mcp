# Git Tools Blueprint — Draft v1

> **Status**: Draft v1  
> **Author**: AI Assistant  
> **Created**: 2025-01-25  
> **Scope**: Version control tools using VS Code Git Extension API

---

## 1. Vision

Provide intelligent git operations through VS Code's built-in Git Extension API, avoiding CLI parsing and leveraging the IDE's native version control integration.

### 1.1 Goals

| Goal | Description |
|------|-------------|
| **Native Integration** | Use VS Code Git Extension API, not CLI |
| **Symbol-Aware History** | Track commits affecting specific symbols, not just files |
| **Rich Blame Data** | Line-by-line attribution with commit context |
| **Unified Diff Output** | Standard diff format for easy parsing |
| **Cross-Tool Compatibility** | Complement CODEBASE-TOOLS.md without overlap |

### 1.2 Tool Summary

| Tool | Purpose | Complexity |
|------|---------|------------|
| `git_show` | Read file at specific version | Low |
| `git_blame` | Line-by-line commit attribution | Low |
| `git_diff` | Compare versions/working tree | Medium |
| `git_log` | Commit history with filters | Medium |
| `git_status` | Working tree status | Low |

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────┐
│                     MCP Server                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │               Git Tool Handlers                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │    │
│  │  │git_show  │ │git_blame │ │git_diff  │         │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘         │    │
│  │       │            │            │               │    │
│  │  ┌────┴────────────┴────────────┴────┐          │    │
│  │  │         Git RPC Bridge            │          │    │
│  │  └────────────────┬──────────────────┘          │    │
│  └───────────────────┼──────────────────────────────┘   │
│                      │ IPC                              │
└──────────────────────┼──────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│    VS Code Extension │                                   │
│  ┌───────────────────┴──────────────────────┐           │
│  │          Git Extension API               │           │
│  │   ┌─────────────────────────────┐        │           │
│  │   │   vscode.git Extension      │        │           │
│  │   │   ◆ repo.show()             │        │           │
│  │   │   ◆ repo.blame()            │        │           │
│  │   │   ◆ repo.diffWith()         │        │           │
│  │   │   ◆ repo.log()              │        │           │
│  │   │   ◆ repo.state              │        │           │
│  │   └─────────────────────────────┘        │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 File Structure

```
extension/
  services/
    gitService.ts           # Git Extension API wrapper
    gitLmTools.ts           # LM Tool registrations
mcp-server/
  src/
    tools/
      git/
        index.ts            # Tool exports
        git-show.ts         # git_show handler
        git-blame.ts        # git_blame handler
        git-diff.ts         # git_diff handler
        git-log.ts          # git_log handler
        git-status.ts       # git_status handler
```

---

## 3. VS Code Git Extension API

### 3.1 Accessing the API

```typescript
import * as vscode from 'vscode';

interface GitAPI {
  repositories: Repository[];
  getRepository(uri: vscode.Uri): Repository | null;
}

interface Repository {
  // File content at specific ref
  show(ref: string, path: string): Promise<string>;
  
  // Line-by-line blame
  blame(path: string): Promise<Blame>;
  
  // Diff operations
  diffWithHEAD(path: string): Promise<Change>;
  diffWith(ref: string, path: string): Promise<string>;
  diffBetween(ref1: string, ref2: string, path: string): Promise<string>;
  
  // History
  log(options?: LogOptions): Promise<Commit[]>;
  getCommit(ref: string): Promise<Commit>;
  
  // Current state
  state: RepositoryState;
}

// Get the API
function getGitAPI(): GitAPI | undefined {
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!gitExtension?.isActive) {
    return undefined;
  }
  return gitExtension.exports.getAPI(1);
}
```

### 3.2 RPC Methods

| RPC Method | Git API Call | Returns |
|------------|--------------|---------|
| `git/show` | `repo.show(ref, path)` | File content string |
| `git/blame` | `repo.blame(path)` | Blame data per line |
| `git/diff` | `repo.diffBetween(...)` | Unified diff string |
| `git/log` | `repo.log(options)` | Commit[] array |
| `git/status` | `repo.state` | Repository state |

---

## 4. Tool Specifications

### 4.1 `git_show`

> Read file content at a specific git ref (commit, branch, tag).

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✓ | — | File path (relative to repo root) |
| `ref` | string | ✓ | — | Git ref (SHA, branch, tag, HEAD~n) |
| `rootDir` | string | ✗ | workspace | Repository root path |

**Returns:**

```typescript
interface GitShowResult {
  path: string;
  ref: string;
  resolvedRef: string;  // Actual commit SHA
  content: string;
  encoding: 'utf-8' | 'base64';
  isBinary: boolean;
}
```

**Examples:**

```typescript
// Read file at specific commit
{ path: "src/main.ts", ref: "abc1234" }

// Read file from 3 commits ago
{ path: "src/main.ts", ref: "HEAD~3" }

// Read file from specific branch
{ path: "package.json", ref: "feature/new-api" }

// Read file at tag
{ path: "CHANGELOG.md", ref: "v1.2.0" }
```

**Markdown Output:**

```markdown
## File: src/main.ts @ abc1234def

**Commit:** abc1234def (2 days ago)

\`\`\`typescript
// File content here...
\`\`\`
```

---

### 4.2 `git_blame`

> Get line-by-line commit attribution for a file.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✓ | — | File path (relative to repo root) |
| `startLine` | number | ✗ | 1 | Start line (1-based) |
| `endLine` | number | ✗ | EOF | End line (1-based) |
| `rootDir` | string | ✗ | workspace | Repository root path |

**Returns:**

```typescript
interface GitBlameResult {
  path: string;
  lines: BlameEntry[];
  commits: Map<string, CommitInfo>;
}

interface BlameEntry {
  line: number;
  content: string;
  commitSha: string;
  author: string;
  date: string;  // ISO 8601
}

interface CommitInfo {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  message: string;
}
```

**Examples:**

```typescript
// Blame entire file
{ path: "src/main.ts" }

// Blame specific line range
{ path: "src/main.ts", startLine: 50, endLine: 75 }
```

**Markdown Output:**

```markdown
## Blame: src/main.ts (lines 50-75)

| Line | Author | Date | Commit | Content |
|------|--------|------|--------|---------|
| 50 | John Doe | 2024-01-15 | abc123 | `function init() {` |
| 51 | Jane Smith | 2024-01-20 | def456 | `  const cfg = {};` |
| ... | ... | ... | ... | ... |

### Commit Details

- **abc123**: "Add init function" (John Doe, 2024-01-15)
- **def456**: "Refactor configuration" (Jane Smith, 2024-01-20)
```

---

### 4.3 `git_diff`

> Get unified diff between git refs or working tree.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✗ | all files | File path to diff |
| `from` | string | ✗ | HEAD | Starting ref |
| `to` | string | ✗ | working tree | Ending ref |
| `context` | number | ✗ | 3 | Context lines around changes |
| `stat` | boolean | ✗ | false | Include diffstat summary |
| `rootDir` | string | ✗ | workspace | Repository root path |

**Returns:**

```typescript
interface GitDiffResult {
  from: string;
  to: string;
  resolvedFrom: string;
  resolvedTo: string;
  files: DiffFile[];
  stat?: DiffStat;
  unified: string;  // Full unified diff
}

interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: '+' | '-' | ' ';
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffStat {
  filesChanged: number;
  insertions: number;
  deletions: number;
}
```

**Examples:**

```typescript
// Diff working tree vs HEAD
{ path: "src/main.ts" }

// Diff between two commits
{ path: "src/main.ts", from: "abc123", to: "def456" }

// Diff between branches
{ from: "main", to: "feature/api" }

// Diff with stats
{ from: "HEAD~5", to: "HEAD", stat: true }
```

**Markdown Output:**

```markdown
## Diff: src/main.ts

**From:** abc123 (main)  
**To:** def456 (feature/api)

### Summary
- Files changed: 1
- Insertions: +15
- Deletions: -3

### Changes

\`\`\`diff
@@ -45,7 +45,19 @@ function processData(input: Input) {
   const result = [];
-  for (const item of input.items) {
+  for (const item of input.data.items) {
     result.push(transform(item));
+    
+    // Handle nested items
+    if (item.children) {
+      for (const child of item.children) {
+        result.push(transform(child));
+      }
+    }
   }
   return result;
 }
\`\`\`
```

---

### 4.4 `git_log`

> Get commit history with filtering options.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | ✗ | all files | Filter to specific file |
| `limit` | number | ✗ | 20 | Max commits to return |
| `ref` | string | ✗ | HEAD | Starting ref |
| `author` | string | ✗ | — | Filter by author (substring match) |
| `since` | string | ✗ | — | Filter commits after date (ISO 8601) |
| `until` | string | ✗ | — | Filter commits before date (ISO 8601) |
| `grep` | string | ✗ | — | Filter by commit message pattern |
| `symbol` | string | ✗ | — | Filter to commits affecting symbol (requires ts-morph) |
| `rootDir` | string | ✗ | workspace | Repository root path |

**Returns:**

```typescript
interface GitLogResult {
  ref: string;
  path?: string;
  commits: CommitEntry[];
  hasMore: boolean;
}

interface CommitEntry {
  sha: string;
  shortSha: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
  subject: string;  // First line
  body: string;     // Rest of message
  parents: string[];
  stats?: {
    additions: number;
    deletions: number;
    files: string[];
  };
}
```

**Examples:**

```typescript
// Recent commits for file
{ path: "src/main.ts", limit: 10 }

// Commits by author
{ author: "john@example.com", limit: 20 }

// Commits affecting a symbol (advanced)
{ path: "src/main.ts", symbol: "processData" }

// Commits in date range
{ since: "2024-01-01", until: "2024-01-31" }

// Search commit messages
{ grep: "fix|bug", limit: 50 }
```

**Markdown Output:**

```markdown
## Git Log: src/main.ts (last 10 commits)

| Commit | Author | Date | Message |
|--------|--------|------|---------|
| abc1234 | John Doe | 2024-01-25 | Refactor processData function |
| def5678 | Jane Smith | 2024-01-24 | Add error handling |
| 9ab0123 | John Doe | 2024-01-23 | Initial implementation |
| ... | ... | ... | ... |

### Commit Details

#### abc1234 — Refactor processData function

**Author:** John Doe <john@example.com>  
**Date:** 2024-01-25T10:30:00Z  
**Parents:** def5678

Full commit message body here...

---
```

---

### 4.5 `git_status`

> Get current working tree status.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `rootDir` | string | ✗ | workspace | Repository root path |
| `includeUntracked` | boolean | ✗ | true | Include untracked files |

**Returns:**

```typescript
interface GitStatusResult {
  branch: {
    name: string;
    upstream?: string;
    ahead: number;
    behind: number;
  };
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  conflicts: string[];
  stash: number;  // Count of stash entries
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string;  // For renames
}
```

**Examples:**

```typescript
// Full status
{}

// Without untracked files
{ includeUntracked: false }
```

**Markdown Output:**

```markdown
## Git Status

**Branch:** feature/new-api  
**Upstream:** origin/feature/new-api (↑2 ↓0)

### Staged Changes (3)
- ✅ **modified** src/main.ts
- ✅ **added** src/utils.ts
- ✅ **deleted** src/old-helper.ts

### Unstaged Changes (1)
- 📝 **modified** package.json

### Untracked Files (2)
- ❓ temp.log
- ❓ scratch.ts

### Merge Conflicts (0)
No conflicts

### Stash
2 stash entries
```

---

## 5. LM Tool Registration

### 5.1 Tool Definitions

```typescript
// extension/services/gitLmTools.ts

export function registerGitLmTools(context: vscode.ExtensionContext) {
  
  // git_show
  vscode.lm.registerTool('git_show', {
    displayName: 'Git Show File',
    description: 'Read file content at a specific git ref (commit, branch, tag)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        ref: { type: 'string', description: 'Git ref (SHA, branch, tag, HEAD~n)' },
        rootDir: { type: 'string', description: 'Repository root path' }
      },
      required: ['path', 'ref']
    }
  });

  // git_blame
  vscode.lm.registerTool('git_blame', {
    displayName: 'Git Blame',
    description: 'Get line-by-line commit attribution for a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        startLine: { type: 'number', description: 'Start line (1-based)' },
        endLine: { type: 'number', description: 'End line (1-based)' },
        rootDir: { type: 'string', description: 'Repository root path' }
      },
      required: ['path']
    }
  });

  // git_diff
  vscode.lm.registerTool('git_diff', {
    displayName: 'Git Diff',
    description: 'Get unified diff between git refs or working tree',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to diff (optional)' },
        from: { type: 'string', description: 'Starting ref (default: HEAD)' },
        to: { type: 'string', description: 'Ending ref (default: working tree)' },
        context: { type: 'number', description: 'Context lines (default: 3)' },
        stat: { type: 'boolean', description: 'Include diffstat summary' },
        rootDir: { type: 'string', description: 'Repository root path' }
      }
    }
  });

  // git_log
  vscode.lm.registerTool('git_log', {
    displayName: 'Git Log',
    description: 'Get commit history with filtering options',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Filter to specific file' },
        limit: { type: 'number', description: 'Max commits (default: 20)' },
        ref: { type: 'string', description: 'Starting ref (default: HEAD)' },
        author: { type: 'string', description: 'Filter by author' },
        since: { type: 'string', description: 'Commits after date (ISO 8601)' },
        until: { type: 'string', description: 'Commits before date (ISO 8601)' },
        grep: { type: 'string', description: 'Filter by commit message pattern' },
        symbol: { type: 'string', description: 'Filter to commits affecting symbol' },
        rootDir: { type: 'string', description: 'Repository root path' }
      }
    }
  });

  // git_status
  vscode.lm.registerTool('git_status', {
    displayName: 'Git Status',
    description: 'Get current working tree status',
    inputSchema: {
      type: 'object',
      properties: {
        rootDir: { type: 'string', description: 'Repository root path' },
        includeUntracked: { type: 'boolean', description: 'Include untracked files' }
      }
    }
  });
}
```

---

## 6. Implementation Phases

### Phase 1: Core Foundation
- [ ] `gitService.ts` — Git Extension API wrapper
- [ ] RPC bridge methods for git operations
- [ ] `git_status` tool (simplest, validates API access)

### Phase 2: Read Operations
- [ ] `git_show` tool with ref resolution
- [ ] `git_blame` tool with line range support
- [ ] Binary file detection and base64 encoding

### Phase 3: Diff & History
- [ ] `git_diff` tool with multiple comparison modes
- [ ] `git_log` tool with basic filtering
- [ ] Unified diff parsing

### Phase 4: Advanced Features
- [ ] Symbol-aware history (`git_log` with `symbol` param)
- [ ] LM tool registrations
- [ ] Documentation and examples

---

## 7. Error Handling

### 7.1 Error Types

| Error | Cause | Response |
|-------|-------|----------|
| `NoRepository` | Path not in a git repo | List available repos |
| `InvalidRef` | Ref doesn't exist | Suggest similar refs |
| `FileNotFound` | File doesn't exist at ref | Show files that exist |
| `BinaryFile` | Binary file content requested | Return base64 with warning |
| `GitExtensionNotActive` | Git extension not loaded | Prompt user to enable |

### 7.2 Error Response Format

```typescript
interface GitError {
  code: string;
  message: string;
  suggestions?: string[];
  context?: {
    repository?: string;
    ref?: string;
    path?: string;
  };
}
```

---

## 8. Performance Considerations

### 8.1 Caching Strategy

| Data | Cache Duration | Invalidation |
|------|---------------|--------------|
| Commit objects | Permanent | Never (immutable) |
| Blame data | 5 minutes | File save |
| Status | No cache | Always fresh |
| Branch refs | 30 seconds | Git operation |

### 8.2 Large File Handling

- **Blame**: Stream line-by-line for files > 10k lines
- **Diff**: Truncate with message for files > 100KB
- **Show**: Base64 encode binary, warn for files > 1MB

---

## 9. Integration with CODEBASE-TOOLS

### 9.1 Cross-Tool Workflows

| Workflow | Tools Used |
|----------|------------|
| "Who wrote this function?" | `codebase_trace` → `git_blame` |
| "What changed this symbol?" | `codebase_trace` → `git_log` with `symbol` |
| "Show me the old version" | `git_log` → `git_show` |
| "What's different from last week?" | `git_diff` with date filtering |

### 9.2 Shared Infrastructure

- Both use same RPC bridge
- Both return markdown or JSON
- Both support `rootDir` parameter
- Both follow same error format

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] All 5 tools implemented and tested
- [ ] Works with VS Code Git Extension API (no CLI)
- [ ] Handles edge cases (binary files, large repos, conflicts)
- [ ] Returns both markdown and JSON formats

### 10.2 Performance Requirements

| Metric | Target |
|--------|--------|
| `git_status` | < 100ms |
| `git_show` (small file) | < 200ms |
| `git_blame` (1000 lines) | < 500ms |
| `git_diff` (single file) | < 300ms |
| `git_log` (20 commits) | < 400ms |

### 10.3 Integration Requirements

- [ ] LM tools registered and discoverable
- [ ] RPC methods documented
- [ ] Error messages actionable
- [ ] Cross-tool workflows tested

---

## 11. Open Questions

1. **Symbol History**: Should `git_log` with `symbol` use ts-morph to track symbol location across commits, or just show file history?

2. **Multi-Repo Support**: How should tools behave in workspaces with multiple git repositories?

3. **Submodule Support**: Should tools traverse into submodules?

4. **Stash Operations**: Should we add `git_stash` for listing/showing stashes?

5. **Branch Operations**: Should we add `git_branch` for listing/comparing branches?

---

## 12. References

- [VS Code Git Extension API](https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts)
- [CODEBASE-TOOLS.md](../../../backups/blueprints/CODEBASE-TOOLS.md) — Companion blueprint
- [Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)
