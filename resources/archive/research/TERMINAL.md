# Tracked Terminal System Blueprint

A complete implementation plan for capturing terminal I/O through VS Code's Pseudoterminal interface, enabling MCP tools to read terminal output regardless of panel visibility.

## Problem Statement

Current limitations with VS Code's terminal API:
- `vscode.window.terminals` only exposes metadata (name, PID), not buffer content
- Cannot read output from terminals after they've been created
- `run_in_terminal` only captures output for commands WE start
- No way to read output from terminals created by users or other extensions

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  VS Code Extension                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Terminal Profile Provider                                      │ │
│  │  Registers "Tracked Terminal" as a terminal type               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                          │                                          │
│                          ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  TrackedPseudoterminal                                          │ │
│  │  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐│ │
│  │  │  VS Code     │◄───►│  PTY Proxy   │◄───►│  Real Shell      ││ │
│  │  │  Terminal UI │     │  (node-pty)  │     │  (pwsh/bash/zsh) ││ │
│  │  └──────────────┘     └──────────────┘     └──────────────────┘│ │
│  │         │                    │                                  │ │
│  │         │                    │                                  │ │
│  │         ▼                    ▼                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │  TerminalBufferService (Singleton)                          ││ │
│  │  │  - terminalBuffers: Map<id, {output[], input[], metadata}>  ││ │
│  │  │  - activeProcesses: Map<id, {pid, cwd, running}>            ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────┘ │
│                          │                                          │
│                          │ (bridge.js socket)                       │
└─────────────────────────│───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MCP Server                                                          │
├─────────────────────────────────────────────────────────────────────┤
│  New Tools:                                                          │
│  - create_tracked_terminal(shell?, cwd?, name?)                     │
│  - get_terminal_buffer(id, options?)                                │
│  - list_tracked_terminals()                                         │
│  - send_to_terminal(id, text)                                       │
│  - close_terminal(id)                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Extension Dependencies

**Goal**: Add node-pty for real shell process spawning

#### Step 1.1: Install node-pty

```bash
cd extension
pnpm add node-pty
pnpm add -D @types/node
```

#### Step 1.2: Update esbuild configuration

Modify `esbuild.js` to handle native modules:

```javascript
// node-pty is a native module, mark as external
external: ['vscode', 'node-pty'],
```

#### Step 1.3: Package native bindings

Update `package.json` to include node-pty bindings in VSIX:

```json
{
  "scripts": {
    "postinstall": "node-gyp rebuild"
  }
}
```

> **Note**: node-pty requires platform-specific binaries. For development, pnpm will handle this. For distribution, we may need electron-rebuild or prebuilt binaries.

---

### Phase 2: TerminalBufferService

**Goal**: Centralized storage for terminal I/O with efficient buffer management

#### Step 2.1: Create service file

**File**: `extension/services/terminalBufferService.ts`

```typescript
import * as vscode from 'vscode';

export interface TerminalMetadata {
  id: string;
  name: string;
  shellPath: string;
  cwd: string;
  createdAt: number;
  pid?: number;
  exitCode?: number;
  isRunning: boolean;
}

export interface TerminalBuffer {
  metadata: TerminalMetadata;
  output: string[];        // Raw output chunks
  input: string[];         // Commands sent
  totalBytes: number;      // For buffer size limiting
}

export interface BufferOptions {
  maxBufferSize?: number;     // Max bytes to retain (default: 1MB)
  maxOutputLines?: number;    // Max lines to retain (default: 10000)
}

export class TerminalBufferService {
  private static instance: TerminalBufferService;
  private buffers = new Map<string, TerminalBuffer>();
  private options: Required<BufferOptions>;

  private constructor(options?: BufferOptions) {
    this.options = {
      maxBufferSize: options?.maxBufferSize ?? 1024 * 1024,  // 1MB
      maxOutputLines: options?.maxOutputLines ?? 10000,
    };
  }

  static getInstance(options?: BufferOptions): TerminalBufferService {
    if (!TerminalBufferService.instance) {
      TerminalBufferService.instance = new TerminalBufferService(options);
    }
    return TerminalBufferService.instance;
  }

  createBuffer(metadata: TerminalMetadata): void {
    this.buffers.set(metadata.id, {
      metadata,
      output: [],
      input: [],
      totalBytes: 0,
    });
  }

  appendOutput(id: string, data: string): void {
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    buffer.output.push(data);
    buffer.totalBytes += data.length;

    // Trim if exceeds limits
    this.trimBuffer(buffer);
  }

  appendInput(id: string, command: string): void {
    const buffer = this.buffers.get(id);
    if (!buffer) return;
    buffer.input.push(command);
  }

  updateMetadata(id: string, updates: Partial<TerminalMetadata>): void {
    const buffer = this.buffers.get(id);
    if (!buffer) return;
    Object.assign(buffer.metadata, updates);
  }

  getBuffer(id: string): TerminalBuffer | undefined {
    return this.buffers.get(id);
  }

  getOutput(id: string, options?: { lastN?: number; asString?: boolean }): string | string[] | undefined {
    const buffer = this.buffers.get(id);
    if (!buffer) return undefined;

    const output = options?.lastN 
      ? buffer.output.slice(-options.lastN)
      : buffer.output;

    return options?.asString ? output.join('') : output;
  }

  listTerminals(): TerminalMetadata[] {
    return Array.from(this.buffers.values()).map(b => b.metadata);
  }

  listRunningTerminals(): TerminalMetadata[] {
    return this.listTerminals().filter(t => t.isRunning);
  }

  removeBuffer(id: string): void {
    this.buffers.delete(id);
  }

  private trimBuffer(buffer: TerminalBuffer): void {
    // Trim by size
    while (buffer.totalBytes > this.options.maxBufferSize && buffer.output.length > 1) {
      const removed = buffer.output.shift()!;
      buffer.totalBytes -= removed.length;
    }

    // Trim by lines
    while (buffer.output.length > this.options.maxOutputLines) {
      const removed = buffer.output.shift()!;
      buffer.totalBytes -= removed.length;
    }
  }
}
```

---

### Phase 3: TrackedPseudoterminal

**Goal**: Implement the PTY proxy that intercepts all I/O

#### Step 3.1: Create TrackedPseudoterminal class

**File**: `extension/services/trackedPseudoterminal.ts`

```typescript
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { TerminalBufferService } from './terminalBufferService';

// node-pty types
interface IPty {
  pid: number;
  cols: number;
  rows: number;
  process: string;
  onData: (callback: (data: string) => void) => void;
  onExit: (callback: (exitCode: { exitCode: number; signal?: number }) => void) => void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
}

interface IPtyForkOptions {
  name?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: { [key: string]: string | undefined };
  encoding?: string | null;
}

// Dynamic import for node-pty (native module)
let nodePty: {
  spawn(file: string, args: string[], options: IPtyForkOptions): IPty;
} | undefined;

async function loadNodePty(): Promise<typeof nodePty> {
  if (!nodePty) {
    nodePty = await import('node-pty');
  }
  return nodePty;
}

export interface TrackedTerminalOptions {
  id: string;
  name?: string;
  shellPath?: string;
  shellArgs?: string[];
  cwd?: string;
  env?: { [key: string]: string | undefined };
}

export class TrackedPseudoterminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number | void>();
  private nameEmitter = new vscode.EventEmitter<string>();

  onDidWrite = this.writeEmitter.event;
  onDidClose = this.closeEmitter.event;
  onDidChangeName = this.nameEmitter.event;

  private pty: IPty | undefined;
  private bufferService: TerminalBufferService;
  private options: TrackedTerminalOptions;
  private inputBuffer = '';

  constructor(options: TrackedTerminalOptions) {
    this.options = options;
    this.bufferService = TerminalBufferService.getInstance();
  }

  async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
    const pty = await loadNodePty();
    if (!pty) {
      this.writeEmitter.fire('Error: node-pty not available\r\n');
      this.closeEmitter.fire(1);
      return;
    }

    const shell = this.options.shellPath ?? this.getDefaultShell();
    const args = this.options.shellArgs ?? [];
    const cwd = this.options.cwd ?? process.cwd();

    // Register buffer before spawning
    this.bufferService.createBuffer({
      id: this.options.id,
      name: this.options.name ?? 'Tracked Terminal',
      shellPath: shell,
      cwd,
      createdAt: Date.now(),
      isRunning: true,
    });

    try {
      this.pty = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: initialDimensions?.columns ?? 80,
        rows: initialDimensions?.rows ?? 24,
        cwd,
        env: { ...process.env, ...this.options.env } as { [key: string]: string },
      });

      // Update with PID
      this.bufferService.updateMetadata(this.options.id, {
        pid: this.pty.pid,
      });

      // Capture output
      this.pty.onData((data: string) => {
        this.bufferService.appendOutput(this.options.id, data);
        this.writeEmitter.fire(data);
      });

      // Handle exit
      this.pty.onExit(({ exitCode }) => {
        this.bufferService.updateMetadata(this.options.id, {
          isRunning: false,
          exitCode,
        });
        this.closeEmitter.fire(exitCode);
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.writeEmitter.fire(`Error spawning shell: ${message}\r\n`);
      this.closeEmitter.fire(1);
    }
  }

  close(): void {
    if (this.pty) {
      this.pty.kill();
    }
  }

  handleInput(data: string): void {
    if (!this.pty) return;

    // Track command input (detect Enter key)
    if (data.includes('\r') || data.includes('\n')) {
      const command = this.inputBuffer.trim();
      if (command) {
        this.bufferService.appendInput(this.options.id, command);
      }
      this.inputBuffer = '';
    } else if (data === '\x7f') {
      // Backspace
      this.inputBuffer = this.inputBuffer.slice(0, -1);
    } else {
      this.inputBuffer += data;
    }

    // Forward to real PTY
    this.pty.write(data);
  }

  setDimensions(dimensions: vscode.TerminalDimensions): void {
    this.pty?.resize(dimensions.columns, dimensions.rows);
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC ?? 'powershell.exe';
    }
    return process.env.SHELL ?? '/bin/bash';
  }
}
```

---

### Phase 4: Terminal Profile Provider

**Goal**: Register "Tracked Terminal" as a terminal type in VS Code

#### Step 4.1: Update package.json contributes

Add terminal profile contribution:

```json
{
  "contributes": {
    "terminal": {
      "profiles": [
        {
          "id": "vscdt.trackedTerminal",
          "title": "Tracked Terminal"
        }
      ]
    }
  }
}
```

#### Step 4.2: Register provider in runtime.ts

```typescript
import { TrackedPseudoterminal, TrackedTerminalOptions } from './services/trackedPseudoterminal';
import { TerminalBufferService } from './services/terminalBufferService';
import { randomUUID } from 'crypto';

// Terminal Profile Provider
const terminalProfileProvider: vscode.TerminalProfileProvider = {
  provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
    const id = randomUUID();
    const pty = new TrackedPseudoterminal({
      id,
      name: 'Tracked Terminal',
    });
    return new vscode.TerminalProfile({
      name: 'Tracked Terminal',
      pty,
    });
  },
};

track(vscode.window.registerTerminalProfileProvider('vscdt.trackedTerminal', terminalProfileProvider));
```

---

### Phase 5: Bridge Integration

**Goal**: Expose terminal buffer operations through the bridge socket

#### Step 5.1: Add bridge actions

Modify `bridge.js` to handle terminal buffer requests:

```javascript
// Inside handleConnection's request handler, add new actions:

else if (req.action === 'list-tracked-terminals') {
  const bufferService = require('./dist/services/terminalBufferService').TerminalBufferService.getInstance();
  const terminals = bufferService.listTerminals();
  conn.write(JSON.stringify({ id: req.id, ok: true, result: terminals }) + '\n');
}

else if (req.action === 'get-terminal-buffer') {
  const { terminalId, lastN, asString } = req.payload || {};
  const bufferService = require('./dist/services/terminalBufferService').TerminalBufferService.getInstance();
  const output = bufferService.getOutput(terminalId, { lastN, asString });
  conn.write(JSON.stringify({ id: req.id, ok: true, result: output }) + '\n');
}

else if (req.action === 'create-tracked-terminal') {
  const { name, shellPath, cwd } = req.payload || {};
  const id = require('crypto').randomUUID();
  const pty = new (require('./dist/services/trackedPseudoterminal').TrackedPseudoterminal)({
    id,
    name: name || 'Tracked Terminal',
    shellPath,
    cwd,
  });
  const terminal = vscode.window.createTerminal({ name: name || 'Tracked Terminal', pty });
  terminal.show();
  conn.write(JSON.stringify({ id: req.id, ok: true, result: { terminalId: id, name: terminal.name } }) + '\n');
}

else if (req.action === 'send-to-terminal') {
  const { terminalId, text } = req.payload || {};
  // Find the terminal and send text
  const terminal = vscode.window.terminals.find(t => t.name.includes(terminalId));
  if (terminal) {
    terminal.sendText(text, false);
    conn.write(JSON.stringify({ id: req.id, ok: true, result: { sent: true } }) + '\n');
  } else {
    conn.write(JSON.stringify({ id: req.id, ok: false, error: 'Terminal not found' }) + '\n');
  }
}
```

> **Note**: Bridge.js is pure JavaScript for stability. We may need to create a separate TypeScript module that bridge.js can require after compilation.

#### Step 5.2: Alternative - Create bridge actions module

Since bridge.js is "do not edit", create a separate module:

**File**: `extension/services/terminalBridgeActions.ts`

```typescript
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { TerminalBufferService } from './terminalBufferService';
import { TrackedPseudoterminal } from './trackedPseudoterminal';

const bufferService = TerminalBufferService.getInstance();
const ptyMap = new Map<string, TrackedPseudoterminal>();
const terminalMap = new Map<string, vscode.Terminal>();

export interface BridgeRequest {
  id: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export async function handleTerminalAction(req: BridgeRequest): Promise<BridgeResponse | null> {
  switch (req.action) {
    case 'list-tracked-terminals': {
      const terminals = bufferService.listTerminals();
      return { id: req.id, ok: true, result: terminals };
    }

    case 'get-terminal-buffer': {
      const { terminalId, lastN, asString } = (req.payload || {}) as {
        terminalId?: string;
        lastN?: number;
        asString?: boolean;
      };
      if (!terminalId) {
        return { id: req.id, ok: false, error: 'terminalId required' };
      }
      const output = bufferService.getOutput(terminalId, { lastN, asString: asString ?? true });
      const metadata = bufferService.getBuffer(terminalId)?.metadata;
      return { id: req.id, ok: true, result: { output, metadata } };
    }

    case 'create-tracked-terminal': {
      const { name, shellPath, cwd } = (req.payload || {}) as {
        name?: string;
        shellPath?: string;
        cwd?: string;
      };
      const id = randomUUID();
      const pty = new TrackedPseudoterminal({
        id,
        name: name ?? 'Tracked Terminal',
        shellPath,
        cwd,
      });
      ptyMap.set(id, pty);
      
      const terminal = vscode.window.createTerminal({
        name: name ?? 'Tracked Terminal',
        pty,
      });
      terminalMap.set(id, terminal);
      terminal.show();
      
      return { id: req.id, ok: true, result: { terminalId: id, name: terminal.name } };
    }

    case 'send-to-terminal': {
      const { terminalId, text, addNewline } = (req.payload || {}) as {
        terminalId?: string;
        text?: string;
        addNewline?: boolean;
      };
      if (!terminalId || text === undefined) {
        return { id: req.id, ok: false, error: 'terminalId and text required' };
      }
      const terminal = terminalMap.get(terminalId);
      if (!terminal) {
        return { id: req.id, ok: false, error: 'Terminal not found' };
      }
      terminal.sendText(text, addNewline ?? true);
      return { id: req.id, ok: true, result: { sent: true } };
    }

    case 'close-tracked-terminal': {
      const { terminalId } = (req.payload || {}) as { terminalId?: string };
      if (!terminalId) {
        return { id: req.id, ok: false, error: 'terminalId required' };
      }
      const terminal = terminalMap.get(terminalId);
      if (terminal) {
        terminal.dispose();
        terminalMap.delete(terminalId);
        ptyMap.delete(terminalId);
        bufferService.removeBuffer(terminalId);
      }
      return { id: req.id, ok: true, result: { closed: true } };
    }

    default:
      return null; // Not a terminal action
  }
}
```

---

### Phase 6: MCP Server Tools

**Goal**: Create MCP tools that use the bridge to access terminal buffers

#### Step 6.1: Create tracked-terminal.ts tool file

**File**: `mcp-server/src/tools/tracked-terminal.ts`

```typescript
import { zod } from '../third_party/index.js';
import { bridgeExec } from '../bridge-client.js';
import { getDevhostBridgePath } from '../vscode.js';
import { ToolCategory } from './categories.js';
import { defineTool, ResponseFormat, responseFormatSchema } from './ToolDefinition.js';

function ensureBridge(): string {
  const bridgePath = getDevhostBridgePath();
  if (!bridgePath) {
    throw new Error('Bridge not available. Ensure debug window is running.');
  }
  return bridgePath;
}

// ─────────────────────────────────────────────────────────────────────────────
// list_tracked_terminals
// ─────────────────────────────────────────────────────────────────────────────

export const listTrackedTerminals = defineTool({
  name: 'list_tracked_terminals',
  description: `List all tracked terminals with their metadata and status.

Returns terminals created via create_tracked_terminal with:
- Terminal ID, name, shell path
- Current working directory
- Process ID and running status
- Exit code (if exited)

These terminals have full output capture - use get_terminal_buffer to read their content.`,
  timeoutMs: 5000,
  annotations: {
    category: ToolCategory.DEV_DIAGNOSTICS,
    readOnlyHint: true,
  },
  schema: {
    response_format: responseFormatSchema,
    runningOnly: zod.boolean().optional().describe('Only show running terminals'),
  },
  handler: async (request, response) => {
    const bridgePath = ensureBridge();
    
    const result = await bridgeExec(bridgePath, `
      const service = require('./services/terminalBufferService').TerminalBufferService.getInstance();
      return payload.runningOnly ? service.listRunningTerminals() : service.listTerminals();
    `, { runningOnly: request.params.runningOnly ?? false });

    if (request.params.response_format === ResponseFormat.JSON) {
      response.appendResponseLine(JSON.stringify({ terminals: result ?? [] }, null, 2));
      return;
    }

    const terminals = (result ?? []) as Array<{
      id: string;
      name: string;
      shellPath: string;
      cwd: string;
      pid?: number;
      isRunning: boolean;
      exitCode?: number;
    }>;

    response.appendResponseLine('## Tracked Terminals');
    response.appendResponseLine('');
    
    if (terminals.length === 0) {
      response.appendResponseLine('_No tracked terminals. Use create_tracked_terminal to create one._');
      return;
    }

    for (const t of terminals) {
      const status = t.isRunning ? '🟢' : '⚫';
      response.appendResponseLine(`### ${status} ${t.name}`);
      response.appendResponseLine(`- **ID:** \`${t.id}\``);
      response.appendResponseLine(`- **Shell:** ${t.shellPath}`);
      response.appendResponseLine(`- **CWD:** ${t.cwd}`);
      if (t.pid) response.appendResponseLine(`- **PID:** ${t.pid}`);
      if (!t.isRunning && t.exitCode !== undefined) {
        response.appendResponseLine(`- **Exit Code:** ${t.exitCode}`);
      }
      response.appendResponseLine('');
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// create_tracked_terminal
// ─────────────────────────────────────────────────────────────────────────────

export const createTrackedTerminal = defineTool({
  name: 'create_tracked_terminal',
  description: `Create a new tracked terminal with full I/O capture.

Unlike standard terminals, tracked terminals store all output in a buffer
that can be read via get_terminal_buffer even when the terminal is not visible.

Returns the terminal ID for use with other tracked terminal tools.`,
  timeoutMs: 10000,
  annotations: {
    category: ToolCategory.AUTOMATION,
    destructiveHint: false,
  },
  schema: {
    response_format: responseFormatSchema,
    name: zod.string().optional().describe('Terminal display name'),
    shellPath: zod.string().optional().describe('Path to shell executable (default: system shell)'),
    cwd: zod.string().optional().describe('Working directory (default: workspace root)'),
  },
  handler: async (request, response) => {
    const bridgePath = ensureBridge();
    const { name, shellPath, cwd } = request.params;

    const result = await bridgeExec(bridgePath, `
      const { randomUUID } = require('crypto');
      const { TrackedPseudoterminal } = require('./services/trackedPseudoterminal');
      
      const id = randomUUID();
      const pty = new TrackedPseudoterminal({
        id,
        name: payload.name ?? 'Tracked Terminal',
        shellPath: payload.shellPath,
        cwd: payload.cwd,
      });
      
      const terminal = vscode.window.createTerminal({
        name: payload.name ?? 'Tracked Terminal',
        pty,
      });
      terminal.show();
      
      // Store reference for later access
      if (!global.__trackedTerminals) global.__trackedTerminals = new Map();
      global.__trackedTerminals.set(id, { terminal, pty });
      
      return { terminalId: id, name: terminal.name };
    `, { name, shellPath, cwd });

    if (request.params.response_format === ResponseFormat.JSON) {
      response.appendResponseLine(JSON.stringify(result, null, 2));
      return;
    }

    const { terminalId, name: terminalName } = result as { terminalId: string; name: string };
    response.appendResponseLine(`✅ Created tracked terminal: **${terminalName}**`);
    response.appendResponseLine('');
    response.appendResponseLine(`Terminal ID: \`${terminalId}\``);
    response.appendResponseLine('');
    response.appendResponseLine('Use `get_terminal_buffer` to read output, or `send_to_terminal` to send commands.');
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// get_terminal_buffer
// ─────────────────────────────────────────────────────────────────────────────

export const getTerminalBuffer = defineTool({
  name: 'get_terminal_buffer',
  description: `Read the output buffer from a tracked terminal.

Retrieves all captured output from the terminal, regardless of whether
it's currently visible or selected in the panel.

Options:
- lastN: Only get the last N output chunks
- asString: Return as single string (default) or array of chunks`,
  timeoutMs: 5000,
  annotations: {
    category: ToolCategory.DEV_DIAGNOSTICS,
    readOnlyHint: true,
  },
  schema: {
    response_format: responseFormatSchema,
    terminalId: zod.string().describe('The terminal ID from create_tracked_terminal'),
    lastN: zod.number().optional().describe('Only return last N output chunks'),
    includeMetadata: zod.boolean().optional().describe('Include terminal metadata'),
  },
  handler: async (request, response) => {
    const bridgePath = ensureBridge();
    const { terminalId, lastN, includeMetadata } = request.params;

    const result = await bridgeExec(bridgePath, `
      const service = require('./services/terminalBufferService').TerminalBufferService.getInstance();
      const buffer = service.getBuffer(payload.terminalId);
      if (!buffer) return null;
      
      const output = service.getOutput(payload.terminalId, { 
        lastN: payload.lastN, 
        asString: true 
      });
      
      return {
        output,
        metadata: payload.includeMetadata ? buffer.metadata : undefined,
        inputHistory: buffer.input,
      };
    `, { terminalId, lastN, includeMetadata: includeMetadata ?? false });

    if (!result) {
      throw new Error(`Terminal ${terminalId} not found. Use list_tracked_terminals to see available terminals.`);
    }

    if (request.params.response_format === ResponseFormat.JSON) {
      response.appendResponseLine(JSON.stringify(result, null, 2));
      return;
    }

    const { output, metadata, inputHistory } = result as {
      output: string;
      metadata?: { name: string; cwd: string; isRunning: boolean };
      inputHistory: string[];
    };

    if (metadata) {
      response.appendResponseLine(`## Terminal: ${metadata.name}`);
      response.appendResponseLine(`- **CWD:** ${metadata.cwd}`);
      response.appendResponseLine(`- **Status:** ${metadata.isRunning ? '🟢 Running' : '⚫ Stopped'}`);
      response.appendResponseLine('');
    }

    response.appendResponseLine('### Output');
    response.appendResponseLine('```');
    response.appendResponseLine(output || '(no output)');
    response.appendResponseLine('```');

    if (inputHistory.length > 0) {
      response.appendResponseLine('');
      response.appendResponseLine('### Command History');
      for (const cmd of inputHistory.slice(-10)) {
        response.appendResponseLine(`- \`${cmd}\``);
      }
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// send_to_terminal
// ─────────────────────────────────────────────────────────────────────────────

export const sendToTerminal = defineTool({
  name: 'send_to_terminal',
  description: `Send text/commands to a tracked terminal.

The text will be typed into the terminal as if the user typed it.
Set addNewline to true (default) to execute the command immediately.`,
  timeoutMs: 5000,
  annotations: {
    category: ToolCategory.AUTOMATION,
    destructiveHint: true,
  },
  schema: {
    response_format: responseFormatSchema,
    terminalId: zod.string().describe('The terminal ID'),
    text: zod.string().describe('Text to send to the terminal'),
    addNewline: zod.boolean().optional().describe('Add newline to execute command (default: true)'),
  },
  handler: async (request, response) => {
    const bridgePath = ensureBridge();
    const { terminalId, text, addNewline } = request.params;

    await bridgeExec(bridgePath, `
      if (!global.__trackedTerminals) throw new Error('No tracked terminals');
      const entry = global.__trackedTerminals.get(payload.terminalId);
      if (!entry) throw new Error('Terminal not found');
      entry.terminal.sendText(payload.text, payload.addNewline ?? true);
      return { sent: true };
    `, { terminalId, text, addNewline });

    if (request.params.response_format === ResponseFormat.JSON) {
      response.appendResponseLine(JSON.stringify({ success: true, terminalId, text }, null, 2));
      return;
    }

    response.appendResponseLine(`✅ Sent to terminal \`${terminalId}\`:`);
    response.appendResponseLine('```');
    response.appendResponseLine(text);
    response.appendResponseLine('```');
  },
});
```

#### Step 6.2: Register tools in tools.ts

```typescript
import * as trackedTerminalTools from './tracked-terminal.js';

export const tools: ToolLike[] = [
  // ... existing tools
  ...Object.values(trackedTerminalTools),
];
```

---

### Phase 7: Testing & Validation

#### Step 7.1: Build Extension

```bash
cd extension
pnpm run compile
```

#### Step 7.2: Build MCP Server

```bash
cd mcp-server
pnpm run build
```

#### Step 7.3: Manual Testing Checklist

- [ ] Create tracked terminal via MCP tool
- [ ] Run a command in the terminal
- [ ] Read output via get_terminal_buffer (terminal visible)
- [ ] Switch to different tab, read output again (terminal hidden)
- [ ] List tracked terminals
- [ ] Send command via send_to_terminal
- [ ] Close terminal and verify cleanup
- [ ] Create multiple tracked terminals
- [ ] Verify buffer size limits work

#### Step 7.4: Edge Cases to Test

- [ ] Shell spawn failure (invalid shell path)
- [ ] Large output handling (> 1MB)
- [ ] Terminal crash/unexpected exit
- [ ] Reading buffer from non-existent terminal ID
- [ ] Concurrent terminal operations

---

## File Summary

| File | Purpose |
|------|---------|
| `extension/services/terminalBufferService.ts` | Centralized buffer storage singleton |
| `extension/services/trackedPseudoterminal.ts` | PTY proxy implementation |
| `extension/services/terminalBridgeActions.ts` | Bridge action handlers |
| `extension/runtime.ts` | Terminal profile provider registration |
| `extension/package.json` | Terminal profile contribution |
| `mcp-server/src/tools/tracked-terminal.ts` | MCP tools for terminal access |
| `mcp-server/src/tools/tools.ts` | Tool registry |

---

## Dependencies

### Extension
- `node-pty` - Native PTY spawning

### MCP Server
- No new dependencies (uses existing bridge communication)

---

## Limitations

1. **Only tracks terminals we create** - Cannot read output from standard terminals
2. **node-pty platform requirements** - Requires native compilation per platform
3. **Buffer memory** - Large outputs consume extension memory (mitigated by limits)
4. **No shell integration** - Command detection is basic (Enter key parsing)

---

## Future Enhancements

1. **Default terminal profile** - Prompt user to set Tracked Terminal as default
2. **Shell integration** - Use VS Code's shell integration for better command detection
3. **Persistent buffers** - Save terminal history to disk for session persistence
4. **ANSI stripping** - Option to strip ANSI codes for cleaner output
5. **Search in buffer** - Tool to search terminal output for patterns
