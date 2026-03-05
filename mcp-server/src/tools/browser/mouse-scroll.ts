import { z as zod } from 'zod';

import { browserExecuteWithDiff } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const mouseScroll = defineTool({
	annotations: {
		category: ToolCategory.NAVIGATION,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'Mouse Scroll'
	},
	description:
		'Scroll an element into view, or scroll within a scrollable element in a given direction.\n\n' +
		'Args:\n' +
		'  - uid (string): Element uid from page snapshot\n' +
		'  - direction ("up"|"down"|"left"|"right"): Scroll direction. Optional\n' +
		'  - amount (number): Scroll distance in pixels. Default: 300',
	handler: async (request, response) => {
		const { uid, direction, amount } = request.params;

		const { summary: changes } = await browserExecuteWithDiff('scroll', { uid, direction, amount });

		const actionText = direction
			? `Scrolled ${direction} by ${amount ?? 300}px within the element`
			: 'Scrolled element into view';

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(actionText);
	},
	name: 'mouse_scroll',
	schema: {
		amount: zod.number().optional().describe('Scroll distance in pixels. Default: 300.'),
		direction: zod.enum(['up', 'down', 'left', 'right']).optional().describe('Direction to scroll. If omitted, element is scrolled into view.'),
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
	},
});
