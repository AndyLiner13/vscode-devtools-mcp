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
		'  - uid (string): Element uid from page snapshot',
	handler: async (request, response) => {
		const { uid } = request.params;

		const { summary: changes } = await browserExecuteWithDiff('hover', { uid });

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine('Hovered over the element');
	},
	name: 'mouse_hover',
	schema: {
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
	},
});
