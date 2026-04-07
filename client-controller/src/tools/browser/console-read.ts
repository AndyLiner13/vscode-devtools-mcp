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
		'Returns matching console messages directly as JSON.',
	handler: async (request, response) => {
		const {
			afterId,
			beforeId,
			fields = ['id', 'type', 'text'],
			limit,
			msgid,
			pattern,
			sourcePattern,
			stackDepth = 1,
			textLimit,
			types
		} = request.params;

		if (msgid !== undefined) {
			const result = await browserGetConsoleMessageById(msgid);
			if (!result.found || !result.message) {
				response.appendResponseLine(`Console message with id ${msgid} not found.`);
				return;
			}
			const msg = result.message;
			response.appendResponseLine(
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

		if (filtered.length === 0) {
			response.appendResponseLine('No console messages found matching the specified filters.');
			return;
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

		const output: Record<string, unknown> = {
			messages: outputMessages,
			returned,
			total
		};

		if (total > returned) {
			output.hasMore = true;
			output.note = 'Increase limit to include more messages.';
		}

		if (oldestId !== undefined || newestId !== undefined) {
			const idRange: Record<string, number> = {};
			if (oldestId !== undefined) idRange.oldest = oldestId;
			if (newestId !== undefined) idRange.newest = newestId;
			output.idRange = idRange;
		}

		response.appendResponseLine(JSON.stringify(output, null, 2));
	},
	name: 'console_read',
	schema: {
		afterId: zod.number().optional().describe('Only return messages with ID greater than this.'),
		beforeId: zod.number().optional().describe('Only return messages with ID less than this.'),
		fields: zod.array(zod.string()).optional().describe('Which fields to include. Default: ["id","type","text"].'),
		limit: zod.number().optional().describe('Get the N most recent messages.'),
		msgid: zod.number().optional().describe('Get a specific message by ID with full details.'),
		pattern: zod.string().optional().describe('Regex pattern to match against message text.'),
		sourcePattern: zod.string().optional().describe('Regex to match against source URLs in stack traces.'),
		stackDepth: zod.number().optional().describe('Max stack frames. Default: 1. Set 0 to exclude.'),
		textLimit: zod.number().optional().describe('Max characters per message text.'),
		types: zod.array(zod.string()).optional().describe('Filter by log types.')
	}
});
