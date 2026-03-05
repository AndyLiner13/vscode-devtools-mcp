import { z as zod } from 'zod';

import { browserCaptureScreenshot } from '../../host-pipe.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

export const takeScreenshot = defineTool({
	annotations: {
		category: ToolCategory.UI_CONTEXT,
		conditions: ['standalone'],
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
		readOnlyHint: true,
		title: 'Take Screenshot'
	},
	description:
		'Take a screenshot of the page or element.\n\n' +
		'Args:\n' +
		'  - format ("png"|"jpeg"|"webp"): Image format. Default: "png"\n' +
		'  - quality (number): Compression quality for JPEG/WebP (0-100)\n' +
		'  - uid (string): Element uid to screenshot. Omit for full viewport\n' +
		'  - fullPage (boolean): Screenshot full page instead of viewport\n' +
		'  - response_format ("markdown"|"json"): Output format. Default: "markdown"',
	handler: async (request, response) => {
		const { format = 'png', fullPage, quality, uid, response_format: responseFormat } = request.params;
		const result = await browserCaptureScreenshot({ format, fullPage, quality, uid });

		if (responseFormat === 'json') {
			response.appendResponseLine(
				JSON.stringify(
					{
						format,
						sizeBytes: result.size,
						success: true,
						type: 'inline',
					},
					null,
					2,
				),
			);
			return;
		}

		response.appendResponseLine(`Screenshot captured (${result.size} bytes, ${format})`);

		const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
		response.attachImage({ data: result.data, mimeType });
	},
	name: 'take_screenshot',
	schema: {
		format: zod.enum(['png', 'jpeg', 'webp']).optional().describe('Image format. Default: png.'),
		fullPage: zod.boolean().optional().describe('Screenshot full page instead of viewport.'),
		quality: zod.number().min(0).max(100).optional().describe('Compression quality for JPEG/WebP (0-100).'),
		response_format: zod.enum(['markdown', 'json']).optional().describe('Output format. Default: markdown.'),
		uid: zod.string().optional().describe('Element uid to screenshot. Omit for full page/viewport.'),
	},
});
