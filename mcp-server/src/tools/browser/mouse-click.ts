import { z as zod } from 'zod';

import { browserExecuteWithDiff } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const mouseClick = defineTool({
	annotations: {
		category: ToolCategory.INPUT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'Mouse Click'
	},
	description:
		'Click on the provided element.\n\n' +
		'Args:\n' +
		'  - uid (string): Element uid from page snapshot\n' +
		'  - dblClick (boolean): Double click. Default: false\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { uid, dblClick, response_format: format } = request.params;
		const clickCount = dblClick ? 2 : 1;

		const { summary: changes } = await browserExecuteWithDiff('click', { uid, clickCount });

		const actionText = dblClick ? 'Double clicked on the element' : 'Clicked on the element';

		if (format === 'json') {
			response.appendResponseLine(JSON.stringify({ success: true, action: dblClick ? 'double_click' : 'click', ...(changes ? { changes } : {}) }, null, 2));
			return;
		}

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(actionText);
	},
	name: 'mouse_click',
	schema: {
		dblClick: zod.boolean().optional().describe('Double click. Default: false.'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
	},
});
