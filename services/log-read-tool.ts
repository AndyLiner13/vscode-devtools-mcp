import type { FilterOptions, Severity } from '@packages/log-consolidation';

import { compressLogs, EXPERIMENTAL_LOG_EXTENSIONS, LOG_FILE_EXTENSIONS } from '@packages/log-consolidation';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface ILogReadParams {
	correlationId?: string;
	includeStackFrames?: boolean;
	minDuration?: string;
	path?: string;
	pattern?: string;
	severity?: string;
	templateId?: string;
	timeRange?: string;
}

const DISCOVERY_EXTENSIONS = new Set([...LOG_FILE_EXTENSIONS, ...EXPERIMENTAL_LOG_EXTENSIONS]);
DISCOVERY_EXTENSIONS.delete('.txt');

function isLogFile(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return DISCOVERY_EXTENSIONS.has(ext);
}

function getWorkspaceRoots(): string[] {
	return vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
}

function getConfiguredPaths(): { customPaths: string[]; globalPaths: string[] } {
	const config = vscode.workspace.getConfiguration('devtools.logReadTool');
	const globalPaths = config.get<string[]>('globalPaths', []);
	const customPaths = config.get<string[]>('customPaths', []);
	return { customPaths, globalPaths };
}

function resolveInputPath(inputPath: string): string {
	if (path.isAbsolute(inputPath)) {
		return inputPath;
	}
	const roots = getWorkspaceRoots();
	const root = roots[0] ?? process.cwd();
	return path.resolve(root, inputPath);
}

interface DiscoveredLogFile {
	extension: string;
	path: string;
	sizeBytes: number;
	source: string;
}

function discoverLogFilesInDirectory(dir: string, source: string, maxDepth = 15): DiscoveredLogFile[] {
	const results: DiscoveredLogFile[] = [];

	if (!fs.existsSync(dir)) {
		return results;
	}

	function walk(currentDir: string, depth: number): void {
		if (depth > maxDepth) return;

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(currentDir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);

			if (entry.isDirectory()) {
				if (entry.name === '.git') continue;
				walk(fullPath, depth + 1);
			} else if (entry.isFile() && isLogFile(entry.name)) {
				try {
					const stats = fs.statSync(fullPath);
					results.push({
						extension: path.extname(entry.name).toLowerCase(),
						path: fullPath,
						sizeBytes: stats.size,
						source
					});
				} catch {
					// Skip files we can't stat
				}
			}
		}
	}

	walk(dir, 0);
	return results;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getVsCodeLogsHint(): string {
	const { platform } = process;
	const homeDir = os.homedir();

	let logsPath: string;
	switch (platform) {
		case 'win32': {
			const appData = process.env.APPDATA ?? path.join(homeDir, 'AppData', 'Roaming');
			logsPath = path.join(appData, 'Code', 'logs');
			break;
		}
		case 'darwin':
			logsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'logs');
			break;
		case 'linux':
			logsPath = path.join(homeDir, '.config', 'Code', 'logs');
			break;
		default:
			logsPath = `<${platform ?? 'unknown'} platform — check VS Code docs>`;
			break;
	}

	return [
		'',
		'---',
		'**💡 Tip: VS Code Output Logs**',
		`VS Code stores its internal output logs at: \`${logsPath}\``,
		'Use the `output_read` tool to read VS Code output channels, or add this path to `devtools.logReadTool.globalPaths` to include them in discovery.',
		'',
		'**💡 Tip: Add Custom Log Paths**',
		'- `devtools.logReadTool.globalPaths` — Paths scanned for ALL workspaces (User Settings)',
		'- `devtools.logReadTool.customPaths` — Paths scanned for THIS workspace only (.vscode/settings.json)',
		'Both settings are additive — custom paths extend global paths, they never override them.'
	].join('\n');
}

function buildDiscoveryResponse(files: DiscoveredLogFile[], scopeDescription: string): string {
	if (files.length === 0) {
		return [
			`**No log files found** ${scopeDescription}`,
			'',
			`Searched for extensions: ${[...DISCOVERY_EXTENSIONS].join(', ')}`,
			getVsCodeLogsHint()
		].join('\n');
	}

	const bySource = new Map<string, DiscoveredLogFile[]>();
	for (const file of files) {
		const existing = bySource.get(file.source);
		if (existing) {
			existing.push(file);
		} else {
			bySource.set(file.source, [file]);
		}
	}

	const lines: string[] = [
		`**📂 Log File Discovery** ${scopeDescription}`,
		`Found **${files.length}** log file${files.length === 1 ? '' : 's'}`,
		''
	];

	for (const [source, sourceFiles] of bySource) {
		lines.push(`### ${source}`);
		lines.push('');

		const sorted = sourceFiles.sort((a, b) => a.path.localeCompare(b.path));
		for (const file of sorted) {
			lines.push(`- \`${file.path}\` (${formatFileSize(file.sizeBytes)})`);
		}
		lines.push('');
	}

	lines.push('---');
	lines.push(
		'**Usage:** Call this tool again with `path` set to any file path above to read its contents with log compression.'
	);
	lines.push(getVsCodeLogsHint());

	return lines.join('\n');
}

function isDirectory(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isDirectory();
	} catch {
		return false;
	}
}

function readLogFile(filePath: string, params: ILogReadParams): vscode.LanguageModelToolResult {
	if (!fs.existsSync(filePath)) {
		let msg = `**Error:** File not found: \`${filePath}\``;
		if (params.path && !path.isAbsolute(params.path)) {
			msg += `\nThe relative path \`${params.path}\` was resolved against the workspace root. Use an absolute path or a path relative to the workspace root.`;
		}
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(msg)]);
	}

	if (!isLogFile(filePath)) {
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(
				`**Error:** \`${path.basename(filePath)}\` is not a recognized log file type.\n\n` +
					`Supported extensions: ${[...DISCOVERY_EXTENSIONS].join(', ')}`
			)
		]);
	}

	const rawContent = fs.readFileSync(filePath, 'utf-8');
	const lines = rawContent.split('\n');

	const filters: FilterOptions = {};
	if (params.templateId) filters.templateId = params.templateId;
	if (params.severity) filters.severity = params.severity as Severity;
	if (params.timeRange) filters.timeRange = params.timeRange;
	if (params.pattern) filters.pattern = params.pattern;
	if (params.minDuration) filters.minDuration = params.minDuration;
	if (params.correlationId) filters.correlationId = params.correlationId;
	if (params.includeStackFrames !== undefined) filters.includeStackFrames = params.includeStackFrames;

	const hasFilters = Object.keys(filters).length > 0;
	const fileName = path.basename(filePath);

	const result = compressLogs({ label: fileName, lines }, hasFilters ? filters : undefined);

	return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(result.formatted)]);
}

export class LogReadTool implements vscode.LanguageModelTool<ILogReadParams> {
	prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<ILogReadParams>,
		_token: vscode.CancellationToken
	): undefined | vscode.PreparedToolInvocation {
		const inputPath = options.input.path;

		if (!inputPath) {
			return {
				confirmationMessages: {
					message: new vscode.MarkdownString('Discover all log files in the workspace and configured paths?'),
					title: 'Discover Log Files'
				},
				invocationMessage: 'Discovering log files...'
			};
		}

		const resolved = resolveInputPath(inputPath);
		if (isDirectory(resolved)) {
			return {
				confirmationMessages: {
					message: new vscode.MarkdownString(`Discover all log files in \`${inputPath}\`?`),
					title: 'Discover Log Files in Folder'
				},
				invocationMessage: `Discovering log files in: ${inputPath}`
			};
		}

		const filterParts: string[] = [];
		if (options.input.templateId) filterParts.push(`templateId: ${options.input.templateId}`);
		if (options.input.severity) filterParts.push(`severity: ${options.input.severity}`);
		if (options.input.pattern) filterParts.push(`pattern: "${options.input.pattern}"`);

		const filterDesc = filterParts.length > 0 ? ` with filters: ${filterParts.join(', ')}` : '';

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(`Read log file \`${inputPath}\`${filterDesc}?`),
				title: 'Read Log File'
			},
			invocationMessage: `Reading log file: ${inputPath}`
		};
	}

	invoke(
		options: vscode.LanguageModelToolInvocationOptions<ILogReadParams>,
		_token: vscode.CancellationToken
	): vscode.LanguageModelToolResult {
		const params = options.input;
		const inputPath = params.path;

		// Discovery mode: no path provided → scan workspace + configured paths
		if (!inputPath) {
			return this.discoverAll();
		}

		const resolved = resolveInputPath(inputPath);

		// Discovery mode: path is a directory → scan that directory recursively
		if (isDirectory(resolved)) {
			return this.discoverInFolder(resolved, inputPath);
		}

		// Read mode: path is a file → read with compression
		return readLogFile(resolved, params);
	}

	private discoverAll(): vscode.LanguageModelToolResult {
		const { customPaths, globalPaths } = getConfiguredPaths();
		const workspaceRoots = getWorkspaceRoots();
		const allFiles: DiscoveredLogFile[] = [];

		for (const root of workspaceRoots) {
			const folderName = path.basename(root);
			allFiles.push(...discoverLogFilesInDirectory(root, `Workspace: ${folderName}`));
		}

		for (const gp of globalPaths) {
			const resolved = path.isAbsolute(gp) ? gp : gp;
			if (fs.existsSync(resolved)) {
				allFiles.push(...discoverLogFilesInDirectory(resolved, `Global: ${gp}`));
			}
		}

		for (const cp of customPaths) {
			const resolved = resolveInputPath(cp);
			if (fs.existsSync(resolved)) {
				allFiles.push(...discoverLogFilesInDirectory(resolved, `Custom: ${cp}`));
			}
		}

		const deduped = deduplicateByPath(allFiles);
		const output = buildDiscoveryResponse(deduped, '(workspace + configured paths)');
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(output)]);
	}

	private discoverInFolder(resolvedPath: string, originalInput: string): vscode.LanguageModelToolResult {
		const files = discoverLogFilesInDirectory(resolvedPath, originalInput);
		const output = buildDiscoveryResponse(files, `in \`${originalInput}\``);
		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(output)]);
	}
}

function deduplicateByPath(files: DiscoveredLogFile[]): DiscoveredLogFile[] {
	const seen = new Set<string>();
	const result: DiscoveredLogFile[] = [];
	for (const file of files) {
		if (!seen.has(file.path)) {
			seen.add(file.path);
			result.push(file);
		}
	}
	return result;
}
