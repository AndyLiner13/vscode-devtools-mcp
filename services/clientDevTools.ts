/**
 * Client DevTools — LM tools for browser automation via CDP.
 *
 * Uses a factory pattern: each tool is a simple config object that maps
 * to a LanguageModelTool implementation. The factory handles the shared
 * concerns (BrowserService lookup, error handling, response formatting).
 *
 * Lifecycle:
 *   1. Tools are registered at extension activation (invoke returns error if no service)
 *   2. When host-handlers.ts spawns the client, it calls setBrowserService()
 *   3. Tools become functional
 *   4. When client closes, setBrowserService(null) is called
 */

import * as vscode from 'vscode';
import type { BrowserService } from './browser';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Shared State ─────────────────────────────────────────────────────────────

let activeBrowserService: BrowserService | null = null;

export function setBrowserService(service: BrowserService | null): void {
    activeBrowserService = service;
}

export function getBrowserService(): BrowserService | null {
    return activeBrowserService;
}

function requireBrowserService(): BrowserService {
    if (!activeBrowserService) {
        throw new Error(
            'Client DevTools not ready. The client VS Code window has not been spawned yet. ' +
            'Use the MCP server tools first to trigger client launch.',
        );
    }
    return activeBrowserService;
}

// ── Factory ──────────────────────────────────────────────────────────────────

interface ClientToolConfig<TInput> {
    name: string;
    invocationMessage: (input: TInput) => string;
    handler: (service: BrowserService, input: TInput) => Promise<vscode.LanguageModelToolResult>;
}

function createClientTool<TInput>(
    config: ClientToolConfig<TInput>,
): vscode.LanguageModelTool<TInput> {
    return {
        async prepareInvocation(
            options: vscode.LanguageModelToolInvocationPrepareOptions<TInput>,
        ): Promise<vscode.PreparedToolInvocation | undefined> {
            return {
                invocationMessage: config.invocationMessage(options.input),
            };
        },

        async invoke(
            options: vscode.LanguageModelToolInvocationOptions<TInput>,
            _token: vscode.CancellationToken,
        ): Promise<vscode.LanguageModelToolResult> {
            try {
                const service = requireBrowserService();
                return await config.handler(service, options.input);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(`Error: ${msg}`),
                ]);
            }
        },
    };
}

function textResult(text: string): vscode.LanguageModelToolResult {
    return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(text),
    ]);
}

// ── Tool: take_snapshot ──────────────────────────────────────────────────────

interface SnapshotInput {
    verbose?: boolean;
    filePath?: string;
    response_format?: 'markdown' | 'json';
}

const takeSnapshotTool = createClientTool<SnapshotInput>({
    name: 'take_snapshot',
    invocationMessage: (input) =>
        input.verbose ? 'Taking verbose page snapshot...' : 'Taking page snapshot...',
    handler: async (service, input) => {
        const { verbose = false, filePath, response_format: format } = input;
        const { formatted } = await service.fetchAXTree(verbose);

        const targetsSummary = await service.getTargetsSummary();

        if (filePath) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, formatted, 'utf8');
            return textResult(`Snapshot saved to ${filePath}`);
        }

        if (format === 'json') {
            const output = JSON.stringify({
                success: true,
                snapshot: formatted,
                elementCount: formatted.split('\n').length,
            }, null, 2);
            return textResult(output);
        }

        let content = '## Latest page snapshot\n\n' + formatted;
        if (targetsSummary) {
            content += '\n\n' + targetsSummary;
        }
        return textResult(content);
    },
});

// ── Tool: take_screenshot ────────────────────────────────────────────────────

interface ScreenshotInput {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    uid?: string;
    fullPage?: boolean;
    filePath?: string;
    response_format?: 'markdown' | 'json';
}

const takeScreenshotTool = createClientTool<ScreenshotInput>({
    name: 'take_screenshot',
    invocationMessage: (input) => {
        if (input.uid) return `Taking screenshot of element ${input.uid}...`;
        if (input.fullPage) return 'Taking full page screenshot...';
        return 'Taking viewport screenshot...';
    },
    handler: async (service, input) => {
        const { format = 'png', quality, uid, fullPage, filePath, response_format: responseFormat } = input;
        const buffer = await service.captureScreenshot({ format, quality, uid, fullPage });

        const AUTO_SAVE_THRESHOLD = 2 * 1024 * 1024; // 2MB

        if (filePath || buffer.length > AUTO_SAVE_THRESHOLD) {
            const savePath = filePath ?? `screenshot-${Date.now()}.${format}`;
            const dir = path.dirname(savePath);
            if (dir && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(savePath, buffer);

            if (responseFormat === 'json') {
                return textResult(JSON.stringify({
                    success: true,
                    type: 'file',
                    format,
                    savedTo: savePath,
                    sizeBytes: buffer.length,
                }, null, 2));
            }
            return textResult(`Screenshot saved to ${savePath} (${buffer.length} bytes)`);
        }

        // Return inline as base64 image
        const base64 = buffer.toString('base64');
        const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

        if (responseFormat === 'json') {
            return textResult(JSON.stringify({
                success: true,
                type: 'inline',
                format,
                sizeBytes: buffer.length,
                attached: true,
            }, null, 2));
        }

        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(`Screenshot captured (${buffer.length} bytes, ${format})`),
            new vscode.LanguageModelTextPart(`![screenshot](data:${mimeType};base64,${base64})`),
        ]);
    },
});

// ── Helper: executeWithChanges ───────────────────────────────────────────────

async function executeWithChanges(
    service: BrowserService,
    action: () => Promise<unknown>,
    includeSnapshot: boolean | undefined,
    responseFormat: string | undefined,
): Promise<{ changes?: string }> {
    if (includeSnapshot) {
        await action();
        const { formatted } = await service.fetchAXTree(false);
        return { changes: formatted };
    }

    const { summary } = await service.executeWithDiff(action, 1500);
    return { changes: summary };
}

function formatInputResult(
    actionText: string,
    changes: string | undefined,
    responseFormat: string | undefined,
    extraFields?: Record<string, unknown>,
): vscode.LanguageModelToolResult {
    if (responseFormat === 'json') {
        return textResult(JSON.stringify({
            success: true,
            ...extraFields,
            ...(changes ? { changes } : {}),
        }, null, 2));
    }

    const parts: string[] = [];
    if (changes && changes !== 'No visible changes detected.') {
        parts.push('## Changes detected\n' + changes);
    }
    parts.push(actionText);
    return textResult(parts.join('\n\n'));
}

// ── Tool: mouse_click ────────────────────────────────────────────────────────

interface ClickInput {
    uid: string;
    dblClick?: boolean;
    includeSnapshot?: boolean;
    response_format?: string;
}

const mouseClickTool = createClientTool<ClickInput>({
    name: 'mouse_click',
    invocationMessage: (input) =>
        input.dblClick ? `Double clicking element ${input.uid}` : `Clicking element ${input.uid}`,
    handler: async (service, input) => {
        const { uid, dblClick, includeSnapshot, response_format: format } = input;
        const clickCount = dblClick ? 2 : 1;
        const { changes } = await executeWithChanges(
            service,
            () => service.clickElement(uid, clickCount),
            includeSnapshot,
            format,
        );
        return formatInputResult(
            dblClick ? 'Double clicked on the element' : 'Clicked on the element',
            changes,
            format,
            { action: dblClick ? 'double_click' : 'click' },
        );
    },
});

// ── Tool: mouse_hover ────────────────────────────────────────────────────────

interface HoverInput {
    uid: string;
    includeSnapshot?: boolean;
    response_format?: string;
}

const mouseHoverTool = createClientTool<HoverInput>({
    name: 'mouse_hover',
    invocationMessage: (input) => `Hovering over element ${input.uid}`,
    handler: async (service, input) => {
        const { uid, includeSnapshot, response_format: format } = input;
        const { changes } = await executeWithChanges(
            service,
            () => service.hoverElement(uid),
            includeSnapshot,
            format,
        );
        return formatInputResult('Hovered over the element', changes, format, { action: 'hover' });
    },
});

// ── Tool: keyboard_type ──────────────────────────────────────────────────────

interface TypeInput {
    uid: string;
    value: string;
    clear?: boolean;
    includeSnapshot?: boolean;
    response_format?: string;
}

const keyboardTypeTool = createClientTool<TypeInput>({
    name: 'keyboard_type',
    invocationMessage: (input) =>
        input.clear ? `Replacing content in element ${input.uid}` : `Typing into element ${input.uid}`,
    handler: async (service, input) => {
        const { uid, value, clear, includeSnapshot, response_format: format } = input;
        const action = clear
            ? () => service.fillElement(uid, value)
            : () => service.typeIntoElement(uid, value);
        const { changes } = await executeWithChanges(service, action, includeSnapshot, format);
        return formatInputResult(
            clear ? 'Replaced content in element' : 'Typed into element',
            changes,
            format,
            { action: 'type' },
        );
    },
});

// ── Tool: mouse_drag ─────────────────────────────────────────────────────────

interface DragInput {
    from_uid: string;
    to_uid: string;
    includeSnapshot?: boolean;
    response_format?: string;
}

const mouseDragTool = createClientTool<DragInput>({
    name: 'mouse_drag',
    invocationMessage: (input) => `Dragging element ${input.from_uid} to ${input.to_uid}`,
    handler: async (service, input) => {
        const { from_uid, to_uid, includeSnapshot, response_format: format } = input;
        const { changes } = await executeWithChanges(
            service,
            () => service.dragElement(from_uid, to_uid),
            includeSnapshot,
            format,
        );
        return formatInputResult('Dragged the element', changes, format, { action: 'drag' });
    },
});

// ── Tool: keyboard_hotkey ────────────────────────────────────────────────────

interface HotkeyInput {
    key: string;
    includeSnapshot?: boolean;
    response_format?: string;
}

const keyboardHotkeyTool = createClientTool<HotkeyInput>({
    name: 'keyboard_hotkey',
    invocationMessage: (input) => `Pressing key: ${input.key}`,
    handler: async (service, input) => {
        const { key, includeSnapshot, response_format: format } = input;
        const { changes } = await executeWithChanges(
            service,
            () => service.pressKey(key),
            includeSnapshot,
            format,
        );
        return formatInputResult(
            `Pressed key: ${key}`,
            changes,
            format,
            { action: 'hotkey', key },
        );
    },
});

// ── Tool: mouse_scroll ───────────────────────────────────────────────────────

interface ScrollInput {
    uid: string;
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    includeSnapshot?: boolean;
    response_format?: string;
}

const mouseScrollTool = createClientTool<ScrollInput>({
    name: 'mouse_scroll',
    invocationMessage: (input) =>
        input.direction
            ? `Scrolling ${input.direction} by ${input.amount ?? 300}px`
            : `Scrolling element ${input.uid} into view`,
    handler: async (service, input) => {
        const { uid, direction, amount, includeSnapshot, response_format: format } = input;
        const { changes } = await executeWithChanges(
            service,
            () => service.scrollElement(uid, direction, amount),
            includeSnapshot,
            format,
        );

        const actionText = direction
            ? `Scrolled ${direction} by ${amount ?? 300}px within the element`
            : 'Scrolled element into view';

        return formatInputResult(actionText, changes, format, {
            action: 'scroll',
            ...(direction ? { direction } : {}),
            ...(amount ? { amount } : {}),
        });
    },
});

// ── Tool: read_console ───────────────────────────────────────────────────────

interface ReadConsoleInput {
    limit?: number;
    types?: string[];
    pattern?: string;
    sourcePattern?: string;
    afterId?: number;
    beforeId?: number;
    fields?: string[];
    textLimit?: number;
    stackDepth?: number;
    msgid?: number;
    logFormat?: string;
    response_format?: string;
}

const readConsoleTool = createClientTool<ReadConsoleInput>({
    name: 'read_console',
    invocationMessage: (input) => {
        if (input.msgid !== undefined) return `Reading console message #${input.msgid}`;
        if (input.types?.length) return `Reading ${input.types.join(', ')} console messages`;
        return 'Reading console messages';
    },
    handler: async (service, input) => {
        const {
            limit,
            types,
            pattern,
            sourcePattern,
            afterId,
            beforeId,
            fields = ['id', 'type', 'text'],
            textLimit,
            stackDepth = 1,
            msgid,
            response_format: format,
        } = input;

        // Single message by ID
        if (msgid !== undefined) {
            const msg = service.getConsoleMessageById(msgid);
            if (!msg) {
                return textResult(`Console message with id ${msgid} not found.`);
            }
            return textResult(JSON.stringify({
                id: msg.id,
                type: msg.type,
                text: msg.text,
                timestamp: new Date(msg.timestamp).toISOString(),
                ...(msg.args.length > 0 ? { args: msg.args } : {}),
                ...(msg.stackTrace?.length ? { stackTrace: msg.stackTrace } : {}),
            }, null, 2));
        }

        // Build filters
        let textRegex: RegExp | null = null;
        if (pattern) {
            try {
                textRegex = new RegExp(pattern, 'i');
            } catch {
                return textResult(`Invalid regex pattern: ${pattern}`);
            }
        }

        let sourceRegex: RegExp | null = null;
        if (sourcePattern) {
            try {
                sourceRegex = new RegExp(sourcePattern, 'i');
            } catch {
                return textResult(`Invalid source pattern: ${sourcePattern}`);
            }
        }

        const { messages: allMessages } = service.getConsoleMessages({});
        let filtered = allMessages.filter((m) => {
            if (types?.length && !types.includes(m.type)) return false;
            if (textRegex && !textRegex.test(m.text)) return false;
            if (sourceRegex) {
                const hasMatch = m.stackTrace?.some((frame) => sourceRegex!.test(frame.url));
                if (!hasMatch) return false;
            }
            if (afterId !== undefined && m.id <= afterId) return false;
            if (beforeId !== undefined && m.id >= beforeId) return false;
            return true;
        });

        const total = filtered.length;
        if (limit !== undefined && filtered.length > limit) {
            filtered = filtered.slice(-limit);
        }

        const returned = filtered.length;
        const hasMore = total > returned;

        if (filtered.length === 0) {
            return textResult(format === 'json'
                ? JSON.stringify({ total: 0, returned: 0, hasMore: false, messages: [] }, null, 2)
                : 'No console messages found matching the specified filters.',
            );
        }

        const oldestId = filtered[0]?.id;
        const newestId = filtered[filtered.length - 1]?.id;

        const fieldSet = new Set(fields);
        const includeStackTrace = fieldSet.has('stackTrace') && stackDepth > 0;
        const includeArgs = fieldSet.has('args');

        const outputMessages = filtered.map((msg) => {
            const out: Record<string, unknown> = {};
            if (fieldSet.has('id')) out.id = msg.id;
            if (fieldSet.has('type')) out.type = msg.type;
            if (fieldSet.has('text')) {
                let text = msg.text;
                if (textLimit !== undefined && text.length > textLimit) {
                    text = text.slice(0, textLimit) + '...';
                }
                out.text = text;
            }
            if (fieldSet.has('timestamp')) out.timestamp = msg.timestamp;
            if (includeStackTrace && msg.stackTrace?.length) {
                out.stackTrace = msg.stackTrace.slice(0, stackDepth);
            }
            if (includeArgs && msg.args.length > 0) out.args = msg.args;
            return out;
        });

        const structuredOutput = {
            total,
            returned,
            hasMore,
            ...(oldestId !== undefined ? { oldestId } : {}),
            ...(newestId !== undefined ? { newestId } : {}),
            messages: outputMessages,
        };

        if (format === 'json') {
            return textResult(JSON.stringify(structuredOutput, null, 2));
        }

        // Markdown
        let header = `## Console Messages\n\n**Returned:** ${returned} of ${total} total`;
        if (hasMore) header += ` (use \`afterId: ${oldestId! - 1}\` or increase \`limit\` to see more)`;
        if (newestId !== undefined) header += `\n**ID range:** ${oldestId} - ${newestId}`;

        const lines: string[] = [];
        for (const msg of outputMessages) {
            const parts: string[] = [];
            if (msg.id !== undefined) parts.push(`#${msg.id}`);
            if (msg.type !== undefined) parts.push(`[${msg.type}]`);
            if (msg.text !== undefined) parts.push(String(msg.text));
            lines.push(parts.join(' '));
        }

        return textResult(header + '\n\n' + lines.join('\n'));
    },
});

// ── Registry ─────────────────────────────────────────────────────────────────

export interface ClientToolEntry {
    name: string;
    tool: vscode.LanguageModelTool<unknown>;
}

export function getClientDevTools(): ClientToolEntry[] {
    return [
        { name: 'take_snapshot', tool: takeSnapshotTool as vscode.LanguageModelTool<unknown> },
        { name: 'take_screenshot', tool: takeScreenshotTool as vscode.LanguageModelTool<unknown> },
        { name: 'mouse_click', tool: mouseClickTool as vscode.LanguageModelTool<unknown> },
        { name: 'mouse_hover', tool: mouseHoverTool as vscode.LanguageModelTool<unknown> },
        { name: 'keyboard_type', tool: keyboardTypeTool as vscode.LanguageModelTool<unknown> },
        { name: 'mouse_drag', tool: mouseDragTool as vscode.LanguageModelTool<unknown> },
        { name: 'keyboard_hotkey', tool: keyboardHotkeyTool as vscode.LanguageModelTool<unknown> },
        { name: 'mouse_scroll', tool: mouseScrollTool as vscode.LanguageModelTool<unknown> },
        { name: 'read_console', tool: readConsoleTool as vscode.LanguageModelTool<unknown> },
    ];
}
