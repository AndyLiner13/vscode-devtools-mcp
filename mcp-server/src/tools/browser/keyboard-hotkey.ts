import { z as zod } from 'zod';

import { browserExecuteWithDiff, browserFetchAXTree, browserPressKey } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const keyboardHotkey = defineTool({
	annotations: {
		category: ToolCategory.INPUT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'Keyboard Hotkey'
	},
	description:
		'Press a key or key combination. Use when other input methods cannot be used.\n\n' +
		'Args:\n' +
		'  - key (string): Key or combination (e.g., "Enter", "Control+A", "Control+Shift+R")\n' +
		'  - includeSnapshot (boolean): Include full snapshot. Default: false\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { key, includeSnapshot, response_format: format } = request.params;

		let changes: string | undefined;
		if (includeSnapshot) {
			await browserPressKey(key);
			const { formatted } = await browserFetchAXTree(false);
			changes = formatted;
		} else {
			const result = await browserExecuteWithDiff('pressKey', { key });
			changes = result.summary;
		}

		if (format === 'json') {
			response.appendResponseLine(JSON.stringify({ success: true, action: 'hotkey', key, ...(changes ? { changes } : {}) }, null, 2));
			return;
		}

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(`Pressed key: ${key}`);
	},
	name: 'keyboard_hotkey',
	schema: {
		includeSnapshot: zod.boolean().optional().describe('Include full snapshot. Default: false.'),
		key: zod.string().describe('A key or combination (e.g., "Enter", "Control+A"). Modifiers: Control, Shift, Alt, Meta.'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
	},
});
