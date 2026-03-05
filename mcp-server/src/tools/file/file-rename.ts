import path from 'node:path';

import { z as zod } from 'zod';

import { fileRenameFile } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

function resolveFilePath(userPath: string): string {
	const normalized = path.normalize(userPath);
	return path.isAbsolute(normalized) ? normalized : path.resolve(getClientWorkspace(), normalized);
}

export const fileRename = defineTool({
	annotations: {
		category: ToolCategory.CODEBASE_ANALYSIS,
		conditions: ['client-pipe'],
		destructiveHint: true,
		idempotentHint: false,
		openWorldHint: false,
		readOnlyHint: false,
		title: 'File Rename'
	},
	description:
		'Rename or move a file, automatically updating all imports and references across the codebase.\n\n' +
		'Uses VS Code\'s refactoring API to ensure all import paths, re-exports, and references ' +
		'are updated to reflect the new file location.\n\n' +
		'Args:\n' +
		'  - filePath (string): Current path of the file to rename (absolute or relative to workspace)\n' +
		'  - newPath (string): New path for the file (absolute or relative to workspace)',
	handler: async (request, response) => {
		const oldResolved = resolveFilePath(request.params.filePath);
		const newResolved = resolveFilePath(request.params.newPath);

		const result = await fileRenameFile(oldResolved, newResolved);

		if (!result.success) {
			response.appendResponseLine(`## Rename failed\n\n${result.error ?? 'Unknown error'}`);
			return;
		}

		response.appendResponseLine(`## File renamed successfully\n`);
		response.appendResponseLine(`- **From:** ${result.oldPath}`);
		response.appendResponseLine(`- **To:** ${result.newPath}`);

		if (result.filesAffected.length > 0) {
			response.appendResponseLine(`\n### Files with updated references (${result.filesAffected.length})\n`);
			for (const file of result.filesAffected) {
				response.appendResponseLine(`- ${file}`);
			}
		}
	},
	name: 'file_rename',
	schema: {
		filePath: zod.string().describe('Current path of the file to rename (absolute or relative to workspace).'),
		newPath: zod.string().describe('New path for the file (absolute or relative to workspace).'),
	},
	timeoutMs: 30_000,
});
