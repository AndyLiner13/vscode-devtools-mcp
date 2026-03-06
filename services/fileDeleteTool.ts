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
			return textResult({ blocked: false, message: `Path is outside the workspace: ${filePath}`, success: false });
		}

		getUserActionTracker().trackFileAccess(uri.fsPath);

		let isDirectory = false;
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			isDirectory = stat.type === vscode.FileType.Directory;
		} catch {
			return textResult({ blocked: false, message: `Path not found: ${filePath}`, success: false });
		}

		if (token.isCancellationRequested) {
			return textResult({ blocked: false, message: 'Cancelled', success: false });
		}

		if (isDirectory) {
			return this.deleteDirectory(uri, token);
		}
		return this.deleteFile(uri, token);
	}

	private async deleteFile(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const fileRelPath = vscode.workspace.asRelativePath(uri);
		const brokenReferences = await findExternalReferences(uri, new Set([fileRelPath]), token);

		if (token.isCancellationRequested) {
			return textResult({ blocked: false, message: 'Cancelled', success: false });
		}

		if (brokenReferences.length > 0) {
			throwBrokenRefsError(fileRelPath, brokenReferences);
		}

		await vscode.workspace.fs.delete(uri, { useTrash: true });

		return textResult({
			blocked: false,
			deletedFile: fileRelPath,
			success: true
		});
	}

	private async deleteDirectory(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const dirRelPath = vscode.workspace.asRelativePath(uri);

		const pattern = new vscode.RelativePattern(uri, '**/*');
		const childFiles = await vscode.workspace.findFiles(pattern);

		const dirFileSet = new Set(childFiles.map(f => vscode.workspace.asRelativePath(f)));
		dirFileSet.add(dirRelPath);

		const allBrokenRefs: Array<{
			symbol: string;
			kind: string;
			sourceFile: string;
			references: Array<{ file: string; line: number; character: number }>;
		}> = [];

		for (const childUri of childFiles) {
			if (token.isCancellationRequested) {
				return textResult({ blocked: false, message: 'Cancelled', success: false });
			}

			const refs = await findExternalReferences(childUri, dirFileSet, token);
			const childRelPath = vscode.workspace.asRelativePath(childUri);
			for (const ref of refs) {
				allBrokenRefs.push({ ...ref, sourceFile: childRelPath });
			}
		}

		if (allBrokenRefs.length > 0) {
			const totalRefs = allBrokenRefs.reduce((sum, b) => sum + b.references.length, 0);
			const details = allBrokenRefs.map(b =>
				`  ${b.sourceFile} → ${b.symbol} (${b.kind}): ${b.references.map(r => `${r.file}:${r.line}`).join(', ')}`
			).join('\n');
			throw new Error(
				`Cannot delete ${dirRelPath}: ${allBrokenRefs.length} symbol(s) with ${totalRefs} external reference(s) would break.\n\nRemove or update these references first:\n${details}`
			);
		}

		await vscode.workspace.fs.delete(uri, { useTrash: true, recursive: true });

		return textResult({
			blocked: false,
			deletedFile: dirRelPath,
			fileCount: childFiles.length,
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

interface BrokenRef {
	symbol: string;
	kind: string;
	references: Array<{ file: string; line: number; character: number }>;
}

async function findExternalReferences(
	uri: vscode.Uri,
	excludeSet: Set<string>,
	token: vscode.CancellationToken
): Promise<BrokenRef[]> {
	const doc = await vscode.workspace.openTextDocument(uri);
	const fileHasContent = doc.getText().trim().length > 0;
	let symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		uri
	);

	if (!symbols && fileHasContent) {
		const backoffDelays = [500, 1000, 2000, 3000];
		for (const delay of backoffDelays) {
			if (token.isCancellationRequested) return [];
			await new Promise(resolve => setTimeout(resolve, delay));
			symbols = await vscode.commands.executeCommand<undefined | vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider',
				uri
			);
			if (symbols) break;
		}
	}

	const brokenRefs: BrokenRef[] = [];

	if (symbols && symbols.length > 0) {
		const exportedSymbols = symbols.filter(sym => isExportedSymbol(doc, sym));

		for (const sym of exportedSymbols) {
			if (token.isCancellationRequested) return brokenRefs;

			const locations = await vscode.commands.executeCommand<undefined | vscode.Location[]>(
				'vscode.executeReferenceProvider',
				uri,
				sym.selectionRange.start
			);

			if (!locations) continue;

			const externalRefs = locations.filter(
				(loc) => !excludeSet.has(vscode.workspace.asRelativePath(loc.uri))
			);

			if (externalRefs.length > 0) {
				brokenRefs.push({
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

	return brokenRefs;
}

function isExportedSymbol(doc: vscode.TextDocument, sym: vscode.DocumentSymbol): boolean {
	const declarationLine = doc.lineAt(sym.range.start.line).text;
	if (declarationLine.trimStart().startsWith('export ')) return true;

	// Check the line before for a standalone `export` (e.g. `export\nfunction foo()`)
	if (sym.range.start.line > 0) {
		const prevLine = doc.lineAt(sym.range.start.line - 1).text.trim();
		if (prevLine === 'export' || prevLine === 'export default') return true;
	}

	return false;
}

function throwBrokenRefsError(targetPath: string, brokenReferences: BrokenRef[]): never {
	const totalRefs = brokenReferences.reduce((sum, b) => sum + b.references.length, 0);
	const details = brokenReferences.map(b =>
		`  ${b.symbol} (${b.kind}): ${b.references.map(r => `${r.file}:${r.line}`).join(', ')}`
	).join('\n');
	throw new Error(
		`Cannot delete ${targetPath}: ${brokenReferences.length} symbol(s) with ${totalRefs} external reference(s) would break.\n\nRemove or update these references first:\n${details}`
	);
}

function textResult(data: Record<string, unknown>): vscode.LanguageModelToolResult {
	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(data, null, 2))]);
}
