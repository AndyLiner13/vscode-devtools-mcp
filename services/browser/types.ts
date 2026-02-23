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
    backendDOMNodeId?: number;
    childIds?: string[];
    children?: AXNode[];
    description?: { type: string; value: string };
    frameId?: string;
    frameName?: string;
    ignored?: boolean;
    name?: { type: string; value: string };
    nodeId: string;
    parentId?: string;

    properties?: AXProperty[];
    role: { type: string; value: string };
    // Extension-managed fields (not from CDP)
    uid?: string;
    value?: { type: string; value: unknown };
}

export interface FrameInfo {
    id: string;
    name?: string;
    parentId?: string;
    sessionId?: string;
    url?: string;
}

export interface NodeSignature {
    childCount: number;
    name: string;
    role: string;
}

// ── Screenshot Types ─────────────────────────────────────────────────────────

export interface ScreenshotOptions {
    format?: 'jpeg' | 'png' | 'webp';
    fullPage?: boolean;
    quality?: number;
    uid?: string;
}

// ── Console Types ────────────────────────────────────────────────────────────

export interface ConsoleStackFrame {
    columnNumber: number;
    functionName: string;
    lineNumber: number;
    url: string;
}

export interface ConsoleMessageArg {
    className?: string;
    description?: string;
    objectId?: string;
    subtype?: string;
    type: string;
    value?: unknown;
}

export interface ConsoleMessage {
    args: ConsoleMessageArg[];
    id: number;
    stackTrace?: ConsoleStackFrame[];
    text: string;
    timestamp: number;
    type: string;
}

export interface ConsoleFilterOptions {
    afterId?: number;
    beforeId?: number;
    fields?: string[];
    limit?: number;
    pattern?: string;
    sourcePattern?: string;
    stackDepth?: number;
    textLimit?: number;
    types?: string[];
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
    after: string;
    before: string;
    hasChanges: boolean;
    summary: string;
}
