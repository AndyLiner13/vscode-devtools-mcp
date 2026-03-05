import { z as zod } from 'zod';

import { browserExecuteWithDiff } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const mouseHover = defineTool({
	annotations: {
		category: ToolCategory.INPUT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'Mouse Hover'
	},
	description:
		'Hover over the provided element.\n\n' +
		'Args:\n' +
		'  - uid (string): Element uid from page snapshot\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { uid, response_format: format } = request.params;

		const { summary: changes } = await browserExecuteWithDiff('hover', { uid });

		if (format === 'json') {
			response.appendResponseLine(JSON.stringify({ success: true, action: 'hover', ...(changes ? { changes } : {}) }, null, 2));
			return;
		}

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine('Hovered over the element');
	},
	name: 'mouse_hover',
	schema: {
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
	},
});
