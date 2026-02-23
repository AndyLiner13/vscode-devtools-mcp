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

import type { BrowserService } from './browser';
import type { FilterOptions, Severity } from '@packages/log-consolidation';

import { compressLogs } from '@packages/log-consolidation';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

// ── Shared State ─────────────────────────────────────────────────────────────

let activeBrowserService: BrowserService | null = null;
let reconnectCdpCallback: (() => Promise<boolean>) | null = null;

export function setBrowserService(service: BrowserService | null): void {
	activeBrowserService = service;
}

function getBrowserService(): BrowserService | null {
	return activeBrowserService;
}

/**
 * Register a callback that attempts CDP reconnection from a persisted session.
 * Called by host-handlers during registration so browser LM tools can
 * self-heal when activeBrowserService is null (e.g., after Host reload).
 */
export function setReconnectCdpCallback(callback: () => Promise<boolean>): void {
	reconnectCdpCallback = callback;
}

async function requireBrowserService(): Promise<BrowserService> {
	if (activeBrowserService) return activeBrowserService;

	// Lazy reconnection: try to restore CDP from a persisted session
	if (reconnectCdpCallback) {
		const reconnected = await reconnectCdpCallback();
		if (reconnected && activeBrowserService) {
			return activeBrowserService;
		}
	}

	throw new Error('Client DevTools not ready. The client VS Code window has not been spawned yet.');
}

// ── Factory ──────────────────────────────────────────────────────────────────

interface ClientToolConfig<TInput> {
	handler: (service: BrowserService, input: TInput) => Promise<vscode.LanguageModelToolResult>;
	invocationMessage: (input: TInput) => string;
	name: string;
}

function createClientTool<TInput>(config: ClientToolConfig<TInput>): vscode.LanguageModelTool<TInput> {
	return {
		async invoke(options: vscode.LanguageModelToolInvocationOptions<TInput>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
			try {
				const service = await requireBrowserService();
				return await config.handler(service, options.input);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Error: ${msg}`)]);
			}
		},

		async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<TInput>): Promise<undefined | vscode.PreparedToolInvocation> {
			return {
				invocationMessage: config.invocationMessage(options.input)
			};
		}
	};
}

function textResult(text: string): vscode.LanguageModelToolResult {
	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(text)]);
}

// ── Tool: take_snapshot ──────────────────────────────────────────────────────

interface SnapshotInput {
	filePath?: string;
	response_format?: 'json' | 'markdown';
	verbose?: boolean;
}

const takeSnapshotTool = createClientTool<SnapshotInput>({
	handler: async (service, input) => {
		const { filePath, response_format: format, verbose = false } = input;
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
			const output = JSON.stringify(
				{
					elementCount: formatted.split('\n').length,
					snapshot: formatted,
					success: true
				},
				null,
				2
			);
			return textResult(output);
		}

		let content = `## Latest page snapshot\n\n${formatted}`;
		if (targetsSummary) {
			content += `\n\n${targetsSummary}`;
		}
		return textResult(content);
	},
	invocationMessage: (input) => (input.verbose ? 'Taking verbose page snapshot...' : 'Taking page snapshot...'),
	name: 'take_snapshot'
});

// ── Tool: take_screenshot ────────────────────────────────────────────────────

interface ScreenshotInput {
	filePath?: string;
	format?: 'jpeg' | 'png' | 'webp';
	fullPage?: boolean;
	quality?: number;
	response_format?: 'json' | 'markdown';
	uid?: string;
}

const takeScreenshotTool = createClientTool<ScreenshotInput>({
	handler: async (service, input) => {
		const { filePath, format = 'png', fullPage, quality, response_format: responseFormat, uid } = input;
		const buffer = await service.captureScreenshot({ format, fullPage, quality, uid });

		const AUTO_SAVE_THRESHOLD = 2 * 1024 * 1024; // 2MB

		if (filePath || buffer.length > AUTO_SAVE_THRESHOLD) {
			const savePath = filePath ?? `screenshot-${Date.now()}.${format}`;
			const dir = path.dirname(savePath);
			if (dir && !fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.writeFileSync(savePath, buffer);

			if (responseFormat === 'json') {
				return textResult(
					JSON.stringify(
						{
							format,
							savedTo: savePath,
							sizeBytes: buffer.length,
							success: true,
							type: 'file'
						},
						null,
						2
					)
				);
			}
			return textResult(`Screenshot saved to ${savePath} (${buffer.length} bytes)`);
		}

		// Return inline as base64 image
		const base64 = buffer.toString('base64');
		const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

		if (responseFormat === 'json') {
			return textResult(
				JSON.stringify(
					{
						attached: true,
						format,
						sizeBytes: buffer.length,
						success: true,
						type: 'inline'
					},
					null,
					2
				)
			);
		}

		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Screenshot captured (${buffer.length} bytes, ${format})`), new vscode.LanguageModelTextPart(`![screenshot](data:${mimeType};base64,${base64})`)]);
	},
	invocationMessage: (input) => {
		if (input.uid) return `Taking screenshot of element ${input.uid}...`;
		if (input.fullPage) return 'Taking full page screenshot...';
		return 'Taking viewport screenshot...';
	},
	name: 'take_screenshot'
});

// ── Helper: executeWithChanges ───────────────────────────────────────────────

async function executeWithChanges(service: BrowserService, action: () => Promise<unknown>, includeSnapshot: boolean | undefined, responseFormat: string | undefined): Promise<{ changes?: string }> {
	if (includeSnapshot) {
		await action();
		const { formatted } = await service.fetchAXTree(false);
		return { changes: formatted };
	}

	const { summary } = await service.executeWithDiff(action, 1500);
	return { changes: summary };
}

function formatInputResult(actionText: string, changes: string | undefined, responseFormat: string | undefined, extraFields?: Record<string, unknown>): vscode.LanguageModelToolResult {
	if (responseFormat === 'json') {
		return textResult(
			JSON.stringify(
				{
					success: true,
					...extraFields,
					...(changes ? { changes } : {})
				},
				null,
				2
			)
		);
	}

	const parts: string[] = [];
	if (changes && changes !== 'No visible changes detected.') {
		parts.push(`## Changes detected\n${changes}`);
	}
	parts.push(actionText);
	return textResult(parts.join('\n\n'));
}

// ── Tool: mouse_click ────────────────────────────────────────────────────────

interface ClickInput {
	dblClick?: boolean;
	includeSnapshot?: boolean;
	response_format?: string;
	uid: string;
}

const mouseClickTool = createClientTool<ClickInput>({
	handler: async (service, input) => {
		const { dblClick, includeSnapshot, response_format: format, uid } = input;
		const clickCount = dblClick ? 2 : 1;
		const { changes } = await executeWithChanges(service, async () => service.clickElement(uid, clickCount), includeSnapshot, format);
		return formatInputResult(dblClick ? 'Double clicked on the element' : 'Clicked on the element', changes, format, { action: dblClick ? 'double_click' : 'click' });
	},
	invocationMessage: (input) => (input.dblClick ? `Double clicking element ${input.uid}` : `Clicking element ${input.uid}`),
	name: 'mouse_click'
});

// ── Tool: mouse_hover ────────────────────────────────────────────────────────

interface HoverInput {
	includeSnapshot?: boolean;
	response_format?: string;
	uid: string;
}

const mouseHoverTool = createClientTool<HoverInput>({
	handler: async (service, input) => {
		const { includeSnapshot, response_format: format, uid } = input;
		const { changes } = await executeWithChanges(service, async () => service.hoverElement(uid), includeSnapshot, format);
		return formatInputResult('Hovered over the element', changes, format, { action: 'hover' });
	},
	invocationMessage: (input) => `Hovering over element ${input.uid}`,
	name: 'mouse_hover'
});

// ── Tool: keyboard_type ──────────────────────────────────────────────────────

interface TypeInput {
	clear?: boolean;
	includeSnapshot?: boolean;
	response_format?: string;
	uid: string;
	value: string;
}

const keyboardTypeTool = createClientTool<TypeInput>({
	handler: async (service, input) => {
		const { clear, includeSnapshot, response_format: format, uid, value } = input;
		const action = clear ? async () => service.fillElement(uid, value) : async () => service.typeIntoElement(uid, value);
		const { changes } = await executeWithChanges(service, action, includeSnapshot, format);
		return formatInputResult(clear ? 'Replaced content in element' : 'Typed into element', changes, format, { action: 'type' });
	},
	invocationMessage: (input) => (input.clear ? `Replacing content in element ${input.uid}` : `Typing into element ${input.uid}`),
	name: 'keyboard_type'
});

// ── Tool: mouse_drag ─────────────────────────────────────────────────────────

interface DragInput {
	from_uid: string;
	includeSnapshot?: boolean;
	response_format?: string;
	to_uid: string;
}

const mouseDragTool = createClientTool<DragInput>({
	handler: async (service, input) => {
		const { from_uid, includeSnapshot, response_format: format, to_uid } = input;
		const { changes } = await executeWithChanges(service, async () => service.dragElement(from_uid, to_uid), includeSnapshot, format);
		return formatInputResult('Dragged the element', changes, format, { action: 'drag' });
	},
	invocationMessage: (input) => `Dragging element ${input.from_uid} to ${input.to_uid}`,
	name: 'mouse_drag'
});

// ── Tool: keyboard_hotkey ────────────────────────────────────────────────────

interface HotkeyInput {
	includeSnapshot?: boolean;
	key: string;
	response_format?: string;
}

const keyboardHotkeyTool = createClientTool<HotkeyInput>({
	handler: async (service, input) => {
		const { includeSnapshot, key, response_format: format } = input;
		const { changes } = await executeWithChanges(service, async () => service.pressKey(key), includeSnapshot, format);
		return formatInputResult(`Pressed key: ${key}`, changes, format, { action: 'hotkey', key });
	},
	invocationMessage: (input) => `Pressing key: ${input.key}`,
	name: 'keyboard_hotkey'
});

// ── Tool: mouse_scroll ───────────────────────────────────────────────────────

interface ScrollInput {
	amount?: number;
	direction?: 'down' | 'left' | 'right' | 'up';
	includeSnapshot?: boolean;
	response_format?: string;
	uid: string;
}

const mouseScrollTool = createClientTool<ScrollInput>({
	handler: async (service, input) => {
		const { amount, direction, includeSnapshot, response_format: format, uid } = input;
		const { changes } = await executeWithChanges(service, async () => service.scrollElement(uid, direction, amount), includeSnapshot, format);

		const actionText = direction ? `Scrolled ${direction} by ${amount ?? 300}px within the element` : 'Scrolled element into view';

		return formatInputResult(actionText, changes, format, {
			action: 'scroll',
			...(direction ? { direction } : {}),
			...(amount ? { amount } : {})
		});
	},
	invocationMessage: (input) => (input.direction ? `Scrolling ${input.direction} by ${input.amount ?? 300}px` : `Scrolling element ${input.uid} into view`),
	name: 'mouse_scroll'
});

// ── Tool: console_read ───────────────────────────────────────────────────────

interface ReadConsoleInput {
	afterId?: number;
	beforeId?: number;
	correlationId?: string;
	fields?: string[];
	includeStackFrames?: boolean;
	limit?: number;
	minDuration?: string;
	msgid?: number;
	pattern?: string;
	response_format?: string;
	severity?: Severity;
	sourcePattern?: string;
	stackDepth?: number;
	templateId?: string;
	textLimit?: number;
	timeRange?: string;
	types?: string[];
}

const readConsoleTool = createClientTool<ReadConsoleInput>({
	handler: async (service, input) => {
		const { afterId, beforeId, correlationId, fields = ['id', 'type', 'text'], includeStackFrames, limit, minDuration, msgid, pattern, response_format: format, severity, sourcePattern, stackDepth = 1, templateId, textLimit, timeRange, types } = input;

		// Single message by ID
		if (msgid !== undefined) {
			const msg = service.getConsoleMessageById(msgid);
			if (!msg) {
				return textResult(`Console message with id ${msgid} not found.`);
			}
			return textResult(
				JSON.stringify(
					{
						id: msg.id,
						text: msg.text,
						timestamp: new Date(msg.timestamp).toISOString(),
						type: msg.type,
						...(msg.args.length > 0 ? { args: msg.args } : {}),
						...(msg.stackTrace?.length ? { stackTrace: msg.stackTrace } : {})
					},
					null,
					2
				)
			);
		}

		// Build filters
		let textRegex: null | RegExp = null;
		if (pattern) {
			try {
				textRegex = new RegExp(pattern, 'i');
			} catch {
				return textResult(`Invalid regex pattern: ${pattern}`);
			}
		}

		let sourceRegex: null | RegExp = null;
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
				const hasMatch = m.stackTrace?.some((frame) => sourceRegex.test(frame.url));
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
			return textResult(format === 'json' ? JSON.stringify({ hasMore: false, messages: [], returned: 0, total: 0 }, null, 2) : 'No console messages found matching the specified filters.');
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
				let { text } = msg;
				if (textLimit !== undefined && text.length > textLimit) {
					text = `${text.slice(0, textLimit)}...`;
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
			hasMore,
			returned,
			total,
			...(oldestId !== undefined ? { oldestId } : {}),
			...(newestId !== undefined ? { newestId } : {}),
			messages: outputMessages
		};

		// Build drill-down filters
		const filters: FilterOptions = {};
		if (templateId) filters.templateId = templateId;
		if (severity) filters.severity = severity;
		if (timeRange) filters.timeRange = timeRange;
		if (minDuration) filters.minDuration = minDuration;
		if (correlationId) filters.correlationId = correlationId;
		if (includeStackFrames !== undefined) filters.includeStackFrames = includeStackFrames;

		if (format === 'json') {
			// Compress JSON output through the full pipeline
			const raw = JSON.stringify(structuredOutput, null, 2);
			const hasFilters = Object.keys(filters).length > 0;
			const result = compressLogs({ label: 'Console Messages (JSON)', text: raw }, hasFilters ? filters : undefined);
			return textResult(result.formatted);
		}

		// Markdown
		let header = `## Console Messages\n\n**Returned:** ${returned} of ${total} total`;
		if (hasMore) header += ` (use \`afterId: ${oldestId - 1}\` or increase \`limit\` to see more)`;
		if (newestId !== undefined) header += `\n**ID range:** ${oldestId} - ${newestId}`;

		const lines: string[] = [];
		for (const msg of outputMessages) {
			const parts: string[] = [];
			if (msg.id !== undefined) parts.push(`#${msg.id}`);
			if (msg.type !== undefined) parts.push(`[${msg.type}]`);
			if (msg.text !== undefined) parts.push(String(msg.text));
			lines.push(parts.join(' '));
		}

		const hasFilters = Object.keys(filters).length > 0;
		const compressed = compressLogs({ label: 'Console Messages', lines }, hasFilters ? filters : undefined);
		return textResult(`${header}\n\n${compressed.formatted}`);
	},
	invocationMessage: (input) => {
		if (input.msgid !== undefined) return `Reading console message #${input.msgid}`;
		if (input.types?.length) return `Reading ${input.types.join(', ')} console messages`;
		return 'Reading console messages';
	},
	name: 'console_read'
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
		{ name: 'console_read', tool: readConsoleTool as vscode.LanguageModelTool<unknown> }
	];
}
