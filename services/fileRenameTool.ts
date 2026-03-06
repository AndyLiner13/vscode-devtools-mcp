import * as vscode from 'vscode';

import { renameWorkspacePath } from './fileRenameService';

interface IFileRenameParams {
	filePath: string;
	newPath: string;
}

export class FileRenameTool implements vscode.LanguageModelTool<IFileRenameParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IFileRenameParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const { filePath, newPath } = options.input;

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(`Rename **${filePath}** → **${newPath}**? This will update all imports and references.`),
				title: 'File Rename'
			},
			invocationMessage: `Renaming ${filePath} → ${newPath}`
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<IFileRenameParams>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const { filePath, newPath } = options.input;

		return textResult(await renameWorkspacePath(filePath, newPath));
	}
}

function textResult(data: Record<string, unknown>): vscode.LanguageModelToolResult {
	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(data, null, 2))]);
}
