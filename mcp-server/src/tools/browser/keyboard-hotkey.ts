import { z as zod } from 'zod';

import { browserExecuteWithDiff } from '../../host-pipe.js';
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
		'  - key (string): Key or combination (e.g., "Enter", "Control+A", "Control+Shift+R")',
	handler: async (request, response) => {
		const { key } = request.params;

		const { summary: changes } = await browserExecuteWithDiff('pressKey', { key });

		if (changes && changes !== 'No visible changes detected.') {
			response.appendResponseLine(`## Changes detected\n${changes}`);
		}
		response.appendResponseLine(`Pressed key: ${key}`);
	},
	name: 'keyboard_hotkey',
	schema: {
		key: zod.string().describe('A key or combination (e.g., "Enter", "Control+A"). Modifiers: Control, Shift, Alt, Meta.'),
	},
});
