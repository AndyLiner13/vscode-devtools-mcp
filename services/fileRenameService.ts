import path from 'node:path';

import * as vscode from 'vscode';

import { getUserActionTracker } from './userActionTracker';

export interface FileRenameResult {
	error?: string;
	filesAffected: string[];
	newPath?: string;
	oldPath?: string;
	success: boolean;
}

interface RenameWorkspacePathOptions {
	updateRefs: boolean;
}

const MAX_PROJECT_WARM_FILES = 200;
const PROJECT_CONFIG_FILES = ['tsconfig.json', 'jsconfig.json'];
const SKIPPED_DIRECTORIES = new Set(['.git', '.hg', '.svn', 'dist', 'node_modules', 'out']);

export async function renameWorkspacePath(filePath: string, newPath: string, options: RenameWorkspacePathOptions): Promise<FileRenameResult> {
	if (!filePath || !newPath) {
		return { error: 'filePath, newPath, and updateRefs are required', filesAffected: [], success: false };
	}

	const oldUri = resolveFileUri(filePath);
	const newUri = resolveFileUri(newPath);
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(oldUri);

	if (!workspaceFolder) {
		return { error: `Path is outside the workspace: ${filePath}`, filesAffected: [], success: false };
	}

	getUserActionTracker().trackFileAccess(oldUri.fsPath);

	let sourceStat: vscode.FileStat;
	try {
		sourceStat = await vscode.workspace.fs.stat(oldUri);
	} catch {
		return { error: `Source not found: ${filePath}`, filesAffected: [], success: false };
	}

	try {
		await vscode.workspace.fs.stat(newUri);
		return { error: `Target already exists: ${newPath}`, filesAffected: [], success: false };
	} catch (err) {
		if (err instanceof Error && err.message.startsWith('Target already exists')) {
			return { error: err.message, filesAffected: [], success: false };
		}
	}

	const isDirectory = sourceStat.type === vscode.FileType.Directory;
	if (!options.updateRefs) {
		try {
			await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: false });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return { error: `Failed to rename path: ${message}`, filesAffected: [], success: false };
		}

		return {
			filesAffected: [],
			newPath: vscode.workspace.asRelativePath(newUri),
			oldPath: vscode.workspace.asRelativePath(oldUri),
			success: true
		};
	}

	await activateLanguageServices(oldUri, isDirectory);

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
		return { error: 'VS Code rejected the rename edit', filesAffected: [], success: false };
	}

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

	return {
		filesAffected,
		newPath: vscode.workspace.asRelativePath(newUri),
		oldPath: vscode.workspace.asRelativePath(oldUri),
		success: true
	};
}

async function activateLanguageServices(uri: vscode.Uri, isDirectory: boolean): Promise<void> {
	const warmRoot = await findWarmRoot(isDirectory ? uri : vscode.Uri.file(path.dirname(uri.fsPath)));
	const urisToOpen = warmRoot ? await collectProjectFiles(warmRoot, MAX_PROJECT_WARM_FILES) : await collectProjectFiles(isDirectory ? uri : vscode.Uri.file(path.dirname(uri.fsPath)), MAX_PROJECT_WARM_FILES);

	if (!isDirectory && urisToOpen.every((candidate) => candidate.toString() !== uri.toString())) {
		urisToOpen.unshift(uri);
	}

	for (const candidate of urisToOpen) {
		try {
			await vscode.workspace.openTextDocument(candidate);
		} catch {
			/* skip non-text or transient files */
		}
	}

	await delay(250);
}

async function findWarmRoot(startDir: vscode.Uri): Promise<vscode.Uri | undefined> {
	let currentDir = startDir;

	while (true) {
		for (const configFile of PROJECT_CONFIG_FILES) {
			const configUri = vscode.Uri.joinPath(currentDir, configFile);
			try {
				await vscode.workspace.fs.stat(configUri);
				return currentDir;
			} catch {
				/* keep walking upward */
			}
		}

		const parentPath = path.dirname(currentDir.fsPath);
		if (parentPath === currentDir.fsPath) {
			return undefined;
		}

		currentDir = vscode.Uri.file(parentPath);
	}
}

async function collectProjectFiles(root: vscode.Uri, maxFiles: number): Promise<vscode.Uri[]> {
	const results: vscode.Uri[] = [];
	const directories: vscode.Uri[] = [root];

	while (directories.length > 0 && results.length < maxFiles) {
		const currentDir = directories.shift();
		if (!currentDir) {
			continue;
		}

		let entries: [string, vscode.FileType][];
		try {
			entries = await vscode.workspace.fs.readDirectory(currentDir);
		} catch {
			continue;
		}

		for (const [name, type] of entries) {
			if (results.length >= maxFiles) {
				break;
			}

			const entryUri = vscode.Uri.joinPath(currentDir, name);
			if (type === vscode.FileType.Directory) {
				if (!SKIPPED_DIRECTORIES.has(name)) {
					directories.push(entryUri);
				}
				continue;
			}

			if (type === vscode.FileType.File) {
				results.push(entryUri);
			}
		}
	}

	return results;
}

async function waitForDirtyDocuments(knownDirtyBefore: Set<string>, maxWaitMs: number, pollIntervalMs: number): Promise<string[]> {
	const deadline = Date.now() + maxWaitMs;
	let newDirtyFiles: string[] = [];

	while (Date.now() < deadline) {
		await delay(pollIntervalMs);

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

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
