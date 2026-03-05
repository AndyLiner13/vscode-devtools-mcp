import * as vscode from 'vscode';

import { getUserActionTracker } from './userActionTracker';

interface IFileDeleteParams {
	filePath: string;
}

export class FileDeleteTool implements vscode.LanguageModelTool<IFileDeleteParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IFileDeleteParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const { filePath } = options.input;

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(`Delete **${filePath}**? This will check for external references first and block if any exist.`),
				title: 'File Delete'
			},
			invocationMessage: `Checking references before deleting ${filePath}`
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<IFileDeleteParams>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const { filePath } = options.input;

		if (!filePath) {
			return textResult({ blocked: false, message: 'filePath is required', success: false });
		}

		const uri = resolveFileUri(filePath);
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if (!workspaceFolder) {
			return textResult({ blocked: false, message: `File is outside the workspace: ${filePath}`, success: false });
		}

		getUserActionTracker().trackFileAccess(uri.fsPath);

		try {
			const stat = await vscode.workspace.fs.stat(uri);
			if (stat.type === vscode.FileType.Directory) {
				return textResult({ blocked: false, message: `Path is a directory, not a file: ${filePath}`, success: false });
			}
		} catch {
			return textResult({ blocked: false, message: `File not found: ${filePath}`, success: false });
		}

		if (token.isCancellationRequested) {
			return textResult({ blocked: false, message: 'Cancelled', success: false });
		}

		const doc = await vscode.workspace.openTextDocument(uri);
		const fileHasContent = doc.getText().trim().length > 0;
		let symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			uri
		);

		// The LS may need time to register its DocumentSymbolProvider after didOpen
		if (!symbols && fileHasContent) {
			const backoffDelays = [500, 1000, 2000, 3000];
			for (const delay of backoffDelays) {
				if (token.isCancellationRequested) {
					return textResult({ blocked: false, message: 'Cancelled', success: false });
				}
				await new Promise(resolve => setTimeout(resolve, delay));
				symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[]>(
					'vscode.executeDocumentSymbolProvider',
					uri
				);
				if (symbols) break;
			}
		}

		const brokenReferences: Array<{
			symbol: string;
			kind: string;
			references: Array<{ file: string; line: number; character: number }>;
		}> = [];

		const fileRelPath = vscode.workspace.asRelativePath(uri);

		if (symbols && symbols.length > 0) {
			for (const sym of symbols) {
				if (token.isCancellationRequested) {
					return textResult({ blocked: false, message: 'Cancelled', success: false });
				}

				const locations = await vscode.commands.executeCommand<undefined | vscode.Location[]>(
					'vscode.executeReferenceProvider',
					uri,
					sym.selectionRange.start
				);

				if (!locations) continue;

				const externalRefs = locations.filter(
					(loc) => vscode.workspace.asRelativePath(loc.uri) !== fileRelPath
				);

				if (externalRefs.length > 0) {
					brokenReferences.push({
						kind: vscode.SymbolKind[sym.kind],
						references: externalRefs.map((loc) => ({
							character: loc.range.start.character,
							file: vscode.workspace.asRelativePath(loc.uri),
							line: loc.range.start.line + 1
						})),
						symbol: sym.name
					});
				}
			}
		}

		if (brokenReferences.length > 0) {
			const totalRefs = brokenReferences.reduce((sum, b) => sum + b.references.length, 0);
			return textResult({
				blocked: true,
				brokenReferences,
				message: `Cannot delete ${fileRelPath}: ${brokenReferences.length} symbol(s) with ${totalRefs} external reference(s) would break.`,
				success: false
			});
		}

		await vscode.workspace.fs.delete(uri, { useTrash: true });

		return textResult({
			blocked: false,
			deletedFile: fileRelPath,
			success: true
		});
	}
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
