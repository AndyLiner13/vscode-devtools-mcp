import type { FilterOptions, Severity } from '@packages/log-consolidation';

import { compressLogs } from '@packages/log-consolidation';
import { z as zod } from 'zod';

import { browserGetConsoleMessageById, browserGetConsoleMessages } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const consoleRead = defineTool({
	annotations: {
		category: ToolCategory.DEBUGGING,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
		readOnlyHint: true,
		title: 'Console Read'
	},
	description:
		'Read console messages with full control over filtering and detail level.\n\n' +
		'**FILTERING:**\n' +
		'- limit (number): Get N most recent messages\n' +
		'- types (string[]): Filter by log type\n' +
		'- pattern (string): Regex to match message text\n' +
		'- sourcePattern (string): Regex to match source URLs\n' +
		'- afterId / beforeId (number): Range filters\n' +
		'- msgid (number): Get a specific message by ID\n\n' +
		'**DETAIL CONTROL:**\n' +
		'- fields (string[]): Default: ["id","type","text"]\n' +
		'- textLimit (number): Max chars per message\n' +
		'- stackDepth (number): Max stack frames. Default: 1\n\n' +
		'**DRILL-DOWN:**\n' +
		'- templateId, severity, timeRange, minDuration, correlationId, includeStackFrames',
	handler: async (request, response) => {
		const {
			afterId, beforeId, correlationId, fields = ['id', 'type', 'text'],
			includeStackFrames, limit, minDuration, msgid, pattern,
			response_format: format, severity, sourcePattern, stackDepth = 1,
			templateId, textLimit, timeRange, types,
		} = request.params;

		if (msgid !== undefined) {
			const result = await browserGetConsoleMessageById(msgid);
			if (!result.found || !result.message) {
				response.appendResponseLine(`Console message with id ${msgid} not found.`);
				return;
			}
			const msg = result.message;
			response.appendResponseLine(JSON.stringify({
				id: msg.id,
				text: msg.text,
				timestamp: new Date(msg.timestamp).toISOString(),
				type: msg.type,
				...(msg.args.length > 0 ? { args: msg.args } : {}),
				...(msg.stackTrace?.length ? { stackTrace: msg.stackTrace } : {}),
			}, null, 2));
			return;
		}

		let textRegex: null | RegExp = null;
		if (pattern) {
			try {
				textRegex = new RegExp(pattern, 'i');
			} catch {
				response.appendResponseLine(`Invalid regex pattern: ${pattern}`);
				return;
			}
		}

		let sourceRegex: null | RegExp = null;
		if (sourcePattern) {
			try {
				sourceRegex = new RegExp(sourcePattern, 'i');
			} catch {
				response.appendResponseLine(`Invalid source pattern: ${sourcePattern}`);
				return;
			}
		}

		const { messages: allMessages } = await browserGetConsoleMessages({});
		let filtered = allMessages.filter(m => {
			if (types?.length && !types.includes(m.type)) return false;
			if (textRegex && !textRegex.test(m.text)) return false;
			if (sourceRegex) {
				const hasMatch = m.stackTrace?.some(frame => sourceRegex!.test(frame.url));
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
			response.appendResponseLine(
				format === 'json'
					? JSON.stringify({ hasMore: false, messages: [], returned: 0, total: 0 }, null, 2)
					: 'No console messages found matching the specified filters.'
			);
			return;
		}

		const oldestId = filtered[0]?.id;
		const newestId = filtered[filtered.length - 1]?.id;

		const fieldSet = new Set(fields);
		const includeStackTrace = fieldSet.has('stackTrace') && stackDepth > 0;
		const includeArgs = fieldSet.has('args');

		const outputMessages = filtered.map(msg => {
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
			messages: outputMessages,
		};

		const filters: FilterOptions = {};
		if (templateId) filters.templateId = templateId;
		if (severity) filters.severity = severity as Severity;
		if (timeRange) filters.timeRange = timeRange;
		if (minDuration) filters.minDuration = minDuration;
		if (correlationId) filters.correlationId = correlationId;
		if (includeStackFrames !== undefined) filters.includeStackFrames = includeStackFrames;

		if (format === 'json') {
			const raw = JSON.stringify(structuredOutput, null, 2);
			const hasFilters = Object.keys(filters).length > 0;
			const result = compressLogs({ label: 'Console Messages (JSON)', text: raw }, hasFilters ? filters : undefined);
			response.appendResponseLine(result.formatted);
			return;
		}

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

		const hasFilters = Object.keys(filters).length > 0;
		const compressed = compressLogs({ label: 'Console Messages', lines }, hasFilters ? filters : undefined);
		response.appendResponseLine(`${header}\n\n${compressed.formatted}`);
	},
	name: 'console_read',
	schema: {
		afterId: zod.number().optional().describe('Only return messages with ID greater than this.'),
		beforeId: zod.number().optional().describe('Only return messages with ID less than this.'),
		correlationId: zod.string().optional().describe('Trace a specific request by UUID/correlation ID.'),
		fields: zod.array(zod.string()).optional().describe('Which fields to include. Default: ["id","type","text"].'),
		includeStackFrames: zod.boolean().optional().describe('Show/hide stack frame templates. Default: true.'),
		limit: zod.number().optional().describe('Get the N most recent messages.'),
		minDuration: zod.string().optional().describe('Show templates with durations >= threshold.'),
		msgid: zod.number().optional().describe('Get a specific message by ID with full details.'),
		pattern: zod.string().optional().describe('Regex pattern to match against message text.'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		severity: zod.enum(['error', 'warning', 'info']).optional().describe('Filter by severity level.'),
		sourcePattern: zod.string().optional().describe('Regex to match against source URLs in stack traces.'),
		stackDepth: zod.number().optional().describe('Max stack frames. Default: 1. Set 0 to exclude.'),
		templateId: zod.string().optional().describe('Show raw lines matching this template ID.'),
		textLimit: zod.number().optional().describe('Max characters per message text.'),
		timeRange: zod.string().optional().describe('Time window filter: HH:MM-HH:MM.'),
		types: zod.array(zod.string()).optional().describe('Filter by log types.'),
	},
});
