/**
 * Shared types for the browser automation (CDP) subsystem.
 *
 * These mirror the types used in the MCP server's ax-tree.ts and cdp-events.ts
 * but are self-contained for the extension-side implementation.
 */

// ── AX Tree Types ────────────────────────────────────────────────────────────

export interface AXProperty {
    name: string;
    value: { type: string; value: unknown };
}

export interface AXNode {
    nodeId: string;
    backendDOMNodeId?: number;
    role: { type: string; value: string };
    name?: { type: string; value: string };
    description?: { type: string; value: string };
    value?: { type: string; value: unknown };
    properties?: AXProperty[];
    childIds?: string[];
    parentId?: string;
    ignored?: boolean;

    // Extension-managed fields (not from CDP)
    uid?: string;
    children?: AXNode[];
    frameId?: string;
    frameName?: string;
}

export interface FrameInfo {
    id: string;
    parentId?: string;
    url?: string;
    name?: string;
    sessionId?: string;
}

export interface NodeSignature {
    role: string;
    name: string;
    childCount: number;
}

// ── Screenshot Types ─────────────────────────────────────────────────────────

export interface ScreenshotOptions {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    uid?: string;
    fullPage?: boolean;
}

// ── Console Types ────────────────────────────────────────────────────────────

export interface ConsoleStackFrame {
    functionName: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
}

export interface ConsoleMessageArg {
    type: string;
    value?: unknown;
    description?: string;
    subtype?: string;
    className?: string;
    objectId?: string;
}

export interface ConsoleMessage {
    id: number;
    type: string;
    text: string;
    args: ConsoleMessageArg[];
    timestamp: number;
    stackTrace?: ConsoleStackFrame[];
}

export interface ConsoleFilterOptions {
    limit?: number;
    types?: string[];
    pattern?: string;
    sourcePattern?: string;
    afterId?: number;
    beforeId?: number;
    fields?: string[];
    textLimit?: number;
    stackDepth?: number;
}

// ── CDP Target Types ─────────────────────────────────────────────────────────

export interface CdpTarget {
    description: string;
    devtoolsFrontendUrl: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
}

// ── Diff Types ───────────────────────────────────────────────────────────────

export interface DiffResult {
    before: string;
    after: string;
    summary: string;
    hasChanges: boolean;
}
