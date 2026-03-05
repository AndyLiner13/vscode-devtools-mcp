import { z as zod } from 'zod';

import { browserDragElement, browserExecuteWithDiff, browserFetchAXTree } from '../../host-pipe.js';
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
		'  - to_uid (string): Element uid to drop onto\n' +
		'  - includeSnapshot (boolean): Include full snapshot. Default: false\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { from_uid, to_uid, includeSnapshot, response_format: format } = request.params;

		let changes: string | undefined;
		if (includeSnapshot) {
			await browserDragElement(from_uid, to_uid);
			const { formatted } = await browserFetchAXTree(false);
			changes = formatted;
		} else {
			const result = await browserExecuteWithDiff('drag', { from_uid, to_uid });
			changes = result.summary;
		}

		if (format === 'json') {
			response.appendResponseLine(JSON.stringify({ success: true, action: 'drag', ...(changes ? { changes } : {}) }, null, 2));
			return;
		}

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine('Dragged the element');
	},
	name: 'mouse_drag',
	schema: {
		from_uid: zod.string().describe('The uid of the element to drag.'),
		includeSnapshot: zod.boolean().optional().describe('Include full snapshot. Default: false.'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		to_uid: zod.string().describe('The uid of the element to drop into.'),
	},
});
