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
		'  - dblClick (boolean): Double click. Default: false',
	handler: async (request, response) => {
		const { uid, dblClick } = request.params;
		const clickCount = dblClick ? 2 : 1;

		const { summary: changes } = await browserExecuteWithDiff('click', { uid, clickCount });

		const actionText = dblClick ? 'Double clicked on the element' : 'Clicked on the element';

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(actionText);
	},
	name: 'mouse_click',
	schema: {
		dblClick: zod.boolean().optional().describe('Double click. Default: false.'),
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
	},
});
