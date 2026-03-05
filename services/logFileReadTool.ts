/**
 * Language Model Tool: logFile_read
 *
 * A read-only LM tool that reads and analyzes log files with automatic
 * pattern compression and drill-down filtering via @packages/log-consolidation.
 */

import type { FilterOptions, Severity } from '@packages/log-consolidation';

import { compressLogs, EXPERIMENTAL_LOG_EXTENSIONS, LOG_FILE_EXTENSIONS } from '@packages/log-consolidation';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface ILogFileReadParams {
	correlationId?: string;
	file: string;
	includeStackFrames?: boolean;
	minDuration?: string;
	pattern?: string;
	severity?: string;
	templateId?: string;
	timeRange?: string;
}

function isLogCompatible(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return LOG_FILE_EXTENSIONS.has(ext) || EXPERIMENTAL_LOG_EXTENSIONS.has(ext);
}

function resolveFilePath(file: string): string {
	if (path.isAbsolute(file)) {
		return file;
	}
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const root = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
	return path.resolve(root, file);
}

export class LogFileReadTool implements vscode.LanguageModelTool<ILogFileReadParams> {
	async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<ILogFileReadParams>,
		_token: vscode.CancellationToken
	): Promise<undefined | vscode.PreparedToolInvocation> {
		const { file } = options.input;
		const filterParts: string[] = [];
		if (options.input.templateId) filterParts.push(`templateId: ${options.input.templateId}`);
		if (options.input.severity) filterParts.push(`severity: ${options.input.severity}`);
		if (options.input.pattern) filterParts.push(`pattern: "${options.input.pattern}"`);

		const filterDesc = filterParts.length > 0 ? ` with filters: ${filterParts.join(', ')}` : '';

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(`Read log file "${file}"${filterDesc}?`),
				title: 'Read Log File'
			},
			invocationMessage: `Reading log file: ${file}`
		};
	}

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<ILogFileReadParams>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const params = options.input;
		const filePath = resolveFilePath(params.file);

		if (!fs.existsSync(filePath)) {
			let msg = `**Error:** File not found: \`${filePath}\``;
			if (!path.isAbsolute(params.file)) {
				msg += `\nThe relative path \`${params.file}\` was resolved against the workspace root. Use an absolute path or a path relative to the workspace root.`;
			}
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(msg)]);
		}

		if (!isLogCompatible(filePath)) {
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart(
					`**Error:** \`${path.basename(filePath)}\` is not a recognized log file type.\n\n` +
						'Supported extensions: `.log`, `.out`, `.err`, `.trace`, `.syslog`, `.access`, `.audit`, ' +
						'`.jsonl`, `.ndjson`, `.dump`, `.diag`, `.debug`, `.txt`, `.csv`'
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
}
