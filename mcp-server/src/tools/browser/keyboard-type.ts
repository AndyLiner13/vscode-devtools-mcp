import { z as zod } from 'zod';

import { browserExecuteWithDiff } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const keyboardType = defineTool({
	annotations: {
		category: ToolCategory.INPUT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'Keyboard Type'
	},
	description:
		'Type text into an input, text area or select an option from a <select> element.\n\n' +
		'By default, text is inserted at the current cursor position. Set clear to true to replace all existing content.\n\n' +
		'Args:\n' +
		'  - uid (string): Element uid from page snapshot\n' +
		'  - value (string): Text to type or option to select\n' +
		'  - clear (boolean): Clear existing content before typing. Default: false\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { uid, value, clear, response_format: format } = request.params;

		const { summary: changes } = await browserExecuteWithDiff('type', { uid, value, clear });

		const actionText = clear ? 'Replaced content in element' : 'Typed into element';

		if (format === 'json') {
			response.appendResponseLine(JSON.stringify({ success: true, action: 'type', ...(changes ? { changes } : {}) }, null, 2));
			return;
		}

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(actionText);
	},
	name: 'keyboard_type',
	schema: {
		clear: zod.boolean().optional().describe('Clear existing content before typing. Default: false.'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
		value: zod.string().describe('The value to fill in.'),
	},
});
