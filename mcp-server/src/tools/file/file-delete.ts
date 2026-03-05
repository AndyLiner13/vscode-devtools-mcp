import path from 'node:path';

import { z as zod } from 'zod';

import { fileDeleteFile } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

function resolveFilePath(userPath: string): string {
	const normalized = path.normalize(userPath);
	return path.isAbsolute(normalized) ? normalized : path.resolve(getClientWorkspace(), normalized);
}

export const fileDelete = defineTool({
	annotations: {
		category: ToolCategory.CODEBASE_ANALYSIS,
		conditions: ['client-pipe'],
		destructiveHint: true,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'File Delete'
	},
	description:
		'Delete a file from the workspace after verifying no external references would break.\n\n' +
		'Before deleting, this tool checks all exported symbols in the file for external references ' +
		'(imports, usages, re-exports) in other files. If any references are found, the deletion is ' +
		'blocked and a detailed report of all broken references is returned so they can be fixed first.\n\n' +
		'Args:\n' +
		'  - filePath (string): Path of the file to delete (absolute or relative to workspace)',
	handler: async (request, response) => {
		const resolved = resolveFilePath(request.params.filePath);

		const result = await fileDeleteFile(resolved);

		if (!result.success && result.blocked) {
			response.appendResponseLine(`## Deletion blocked\n`);
			response.appendResponseLine(result.message ?? 'File has external references that would break.');
			response.appendResponseLine('');

			if (result.brokenReferences && result.brokenReferences.length > 0) {
				response.appendResponseLine('### Symbols with external references\n');
				for (const broken of result.brokenReferences) {
					response.appendResponseLine(`#### \`${broken.symbol}\` (${broken.kind}) — ${broken.references.length} reference(s)\n`);
					for (const ref of broken.references) {
						response.appendResponseLine(`- ${ref.file}:${ref.line}:${ref.character}`);
					}
					response.appendResponseLine('');
				}
				response.appendResponseLine('Fix or remove these references before deleting the file.');
			}
			return;
		}

		if (!result.success) {
			response.appendResponseLine(`## Delete failed\n\n${result.message ?? 'Unknown error'}`);
			return;
		}

		response.appendResponseLine(`## File deleted successfully\n`);
		response.appendResponseLine(`- **Deleted:** ${result.deletedFile}`);
	},
	name: 'file_delete',
	schema: {
		filePath: zod.string().describe('Path of the file to delete (absolute or relative to workspace).'),
	},
	timeoutMs: 30_000,
});
