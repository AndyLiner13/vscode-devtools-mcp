import * as vscode from 'vscode';

import { getUserActionTracker } from './userActionTracker';

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

		if (!filePath || !newPath) {
			return textResult({ error: 'filePath and newPath are required', filesAffected: [], success: false });
		}

		const oldUri = resolveFileUri(filePath);
		const newUri = resolveFileUri(newPath);

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(oldUri);
		if (!workspaceFolder) {
			return textResult({ error: `Path is outside the workspace: ${filePath}`, filesAffected: [], success: false });
		}

		getUserActionTracker().trackFileAccess(oldUri.fsPath);

		let sourceStat: vscode.FileStat;
		try {
			sourceStat = await vscode.workspace.fs.stat(oldUri);
		} catch {
			return textResult({ error: `Source not found: ${filePath}`, filesAffected: [], success: false });
		}

		try {
			await vscode.workspace.fs.stat(newUri);
			return textResult({ error: `Target already exists: ${newPath}`, filesAffected: [], success: false });
		} catch (err) {
			if (err instanceof Error && err.message.startsWith('Target already exists')) {
				return textResult({ error: err.message, filesAffected: [], success: false });
			}
		}

		const isDirectory = sourceStat.type === vscode.FileType.Directory;

		// Activate the language service so it participates in rename events.
		// For files, open the file directly. For directories, open the first
		// code file inside the folder to trigger lazy language activation.
		if (isDirectory) {
			const pattern = new vscode.RelativePattern(oldUri, '**/*');
			const childFiles = await vscode.workspace.findFiles(pattern, undefined, 1);
			if (childFiles.length > 0) {
				await vscode.window.showTextDocument(childFiles[0], { preview: true, preserveFocus: true });
			}
		} else {
			await vscode.window.showTextDocument(oldUri, { preview: true, preserveFocus: true });
		}

		const dirtyBefore = new Set<string>();
		for (const doc of vscode.workspace.textDocuments) {
			if (doc.isDirty) {
				dirtyBefore.add(doc.uri.toString());
			}
		}

		const edit = new vscode.WorkspaceEdit();
		edit.renameFile(oldUri, newUri);
		const applied = await vscode.workspace.applyEdit(edit);

		if (!applied) {
			return textResult({ error: 'VS Code rejected the rename edit', filesAffected: [], success: false });
		}

		// Language extensions process rename events asynchronously.
		await waitForDirtyDocuments(dirtyBefore, 5000, 100);

		const filesAffected: string[] = [];
		for (const doc of vscode.workspace.textDocuments) {
			if (doc.isDirty) {
				filesAffected.push(vscode.workspace.asRelativePath(doc.uri));
				try {
					await doc.save();
				} catch {
					/* best-effort save */
				}
			}
		}

		return textResult({
			filesAffected,
			newPath: vscode.workspace.asRelativePath(newUri),
			oldPath: vscode.workspace.asRelativePath(oldUri),
			success: true
		});
	}
}

async function waitForDirtyDocuments(knownDirtyBefore: Set<string>, maxWaitMs: number, pollIntervalMs: number): Promise<string[]> {
	const deadline = Date.now() + maxWaitMs;
	let newDirtyFiles: string[] = [];

	while (Date.now() < deadline) {
		await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

		newDirtyFiles = [];
		for (const doc of vscode.workspace.textDocuments) {
			if (doc.isDirty && !knownDirtyBefore.has(doc.uri.toString())) {
				newDirtyFiles.push(vscode.workspace.asRelativePath(doc.uri));
			}
		}

		if (newDirtyFiles.length > 0) {
			return newDirtyFiles;
		}
	}

	return newDirtyFiles;
}

function resolveFileUri(filePath: string): vscode.Uri {
	if (filePath.match(/^[a-zA-Z]:\\/)) {
		return vscode.Uri.file(filePath);
	}
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders && workspaceFolders.length > 0) {
		return vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
	}
	return vscode.Uri.file(filePath);
}

function textResult(data: Record<string, unknown>): vscode.LanguageModelToolResult {
	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(data, null, 2))]);
}
