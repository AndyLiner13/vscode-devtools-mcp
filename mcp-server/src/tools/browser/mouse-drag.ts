import { z as zod } from 'zod';

import { browserExecuteWithDiff } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const mouseDrag = defineTool({
	annotations: {
		category: ToolCategory.INPUT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'Mouse Drag'
	},
	description:
		'Drag an element onto another element.\n\n' +
		'Args:\n' +
		'  - from_uid (string): Element uid to drag\n' +
		'  - to_uid (string): Element uid to drop onto',
	handler: async (request, response) => {
		const { from_uid, to_uid } = request.params;

		const { summary: changes } = await browserExecuteWithDiff('drag', { from_uid, to_uid });

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine('Dragged the element');
	},
	name: 'mouse_drag',
	schema: {
		from_uid: zod.string().describe('The uid of the element to drag.'),
		to_uid: zod.string().describe('The uid of the element to drop into.'),
	},
});
