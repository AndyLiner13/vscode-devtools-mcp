import * as vscode from 'vscode';

import { renameWorkspacePath } from './fileRenameService';

interface IFileRenameParams {
	filePath: string;
	newPath: string;
	updateRefs: boolean;
}

export class FileRenameTool implements vscode.LanguageModelTool<IFileRenameParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IFileRenameParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const { filePath, newPath, updateRefs } = options.input;
		const refMode = updateRefs ? 'update all imports and references' : 'move without updating imports or references';

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(`Rename **${filePath}** → **${newPath}**? This will ${refMode}.`),
				title: 'File Rename'
			},
			invocationMessage: `Renaming ${filePath} → ${newPath}`
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<IFileRenameParams>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const { filePath, newPath, updateRefs } = options.input;

		return textResult(await renameWorkspacePath(filePath, newPath, { updateRefs }));
	}
}

function textResult(data: Record<string, unknown>): vscode.LanguageModelToolResult {
	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(data, null, 2))]);
}
