import { z as zod } from 'zod';

import { browserFetchAXTree } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const takeSnapshot = defineTool({
	annotations: {
		category: ToolCategory.UI_CONTEXT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
		readOnlyHint: true,
		title: 'Take Snapshot'
	},
	description:
		'Take a text snapshot of the currently selected page based on the accessibility tree. ' +
		'Lists page elements with unique identifiers (uid) for interaction.\n\n' +
		'Args:\n' +
		'  - verbose (boolean): Include full a11y tree details. Default: false\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { verbose = false, response_format: format } = request.params;
		const { formatted, targetsSummary } = await browserFetchAXTree(verbose);

		if (format === 'json') {
			const output = JSON.stringify(
				{
					elementCount: formatted.split('\n').length,
					snapshot: formatted,
					success: true,
				},
				null,
				2,
			);
			response.appendResponseLine(output);
			return;
		}

		response.appendResponseLine(`## Latest page snapshot\n\n${formatted}`);
		if (targetsSummary) {
			response.appendResponseLine(`\n${targetsSummary}`);
		}
	},
	name: 'take_snapshot',
	schema: {
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		verbose: zod.boolean().optional().describe('Include full a11y tree details. Default: false.'),
	},
});
