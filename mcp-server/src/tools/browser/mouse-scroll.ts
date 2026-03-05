import { z as zod } from 'zod';

import { browserExecuteWithDiff, browserFetchAXTree, browserScrollElement } from '../../host-pipe.js';
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
		'  - amount (number): Scroll distance in pixels. Default: 300\n' +
		'  - includeSnapshot (boolean): Include full snapshot. Default: false\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { uid, direction, amount, includeSnapshot, response_format: format } = request.params;

		let changes: string | undefined;
		if (includeSnapshot) {
			await browserScrollElement(uid, direction, amount);
			const { formatted } = await browserFetchAXTree(false);
			changes = formatted;
		} else {
			const result = await browserExecuteWithDiff('scroll', { uid, direction, amount });
			changes = result.summary;
		}

		const actionText = direction
			? `Scrolled ${direction} by ${amount ?? 300}px within the element`
			: 'Scrolled element into view';

		if (format === 'json') {
			response.appendResponseLine(JSON.stringify({
				success: true,
				action: 'scroll',
				...(direction ? { direction } : {}),
				...(amount ? { amount } : {}),
				...(changes ? { changes } : {}),
			}, null, 2));
			return;
		}

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(actionText);
	},
	name: 'mouse_scroll',
	schema: {
		amount: zod.number().optional().describe('Scroll distance in pixels. Default: 300.'),
		direction: zod.enum(['up', 'down', 'left', 'right']).optional().describe('Direction to scroll. If omitted, element is scrolled into view.'),
		includeSnapshot: zod.boolean().optional().describe('Include full snapshot. Default: false.'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		uid: zod.string().describe('The uid of an element on the page from the page content snapshot.'),
	},
});
