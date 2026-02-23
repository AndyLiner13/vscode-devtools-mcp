/**
 * Language Model Tool: output_read
 *
 * A read-only LM tool that allows Copilot to read VS Code output logs
 * from ALL active sessions (Host and Client/Extension Development Host).
 *
 * Host logs: %APPDATA%/Code/logs/ (or platform equivalent)
 * Client logs: <workspaceStorage>/user-data/logs/ (or fallback .devtools/user-data/logs/)
 */

import type { FilterOptions, Severity } from '@packages/log-consolidation';

import { compressLogs } from '@packages/log-consolidation';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

// ============================================================================
// Module State
// ============================================================================

let clientLogsStoragePath: null | string = null;
let hostLogUri: null | string = null;

export function setClientLogsStoragePath(storagePath: string): void {
	clientLogsStoragePath = storagePath;
}

export function setHostLogUri(logUri: string): void {
	hostLogUri = logUri;
}

function getClientLogsStoragePath(): null | string {
	return clientLogsStoragePath;
}

// ============================================================================
// Input Schema Interface
// ============================================================================

export interface IReadOutputChannelsParams {
	afterLine?: number;
	beforeLine?: number;
	channel?: string;
	correlationId?: string;
	includeStackFrames?: boolean;
	limit?: number;
	lineLimit?: number;
	minDuration?: string;
	pattern?: string;
	session?: 'client' | 'host';
	severity?: string;
	templateId?: string;
	timeRange?: string;
}

// ============================================================================
// Log File Discovery Types
// ============================================================================

type SessionType = 'client' | 'host';

interface LogFileInfo {
	category: string;
	name: string;
	path: string;
	session: SessionType;
	size: number;
}

const categoryLabels: Record<string, string> = {
	extension: 'Extension Logs',
	exthost: 'Extension Host',
	output: 'Output Channels',
	root: 'Main Logs',
	window: 'Window Logs'
};

// ============================================================================
// Utility Functions
// ============================================================================

function getUserDataDir(): null | string {
	const { platform } = process;
	const homeDir = os.homedir();

	switch (platform) {
		case 'win32': {
			const appData = process.env.APPDATA;
			if (appData) {
				return path.join(appData, 'Code');
			}
			return path.join(homeDir, 'AppData', 'Roaming', 'Code');
		}
		case 'darwin':
			return path.join(homeDir, 'Library', 'Application Support', 'Code');
		case 'linux':
			return path.join(homeDir, '.config', 'Code');
		default:
			return null;
	}
}

function findLogFiles(dir: string, session: SessionType, category = 'root'): LogFileInfo[] {
	const results: LogFileInfo[] = [];

	if (!fs.existsSync(dir)) {
		return results;
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return results;
	}

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			let newCategory = category;
			if (entry.name.startsWith('window')) {
				newCategory = 'window';
			} else if (entry.name === 'exthost') {
				newCategory = 'exthost';
			} else if (entry.name.startsWith('output_')) {
				newCategory = 'output';
			} else if (entry.name.startsWith('vscode.')) {
				newCategory = 'extension';
			}
			results.push(...findLogFiles(fullPath, session, newCategory));
		} else if (entry.name.endsWith('.log')) {
			try {
				const stats = fs.statSync(fullPath);
				results.push({
					category,
					name: entry.name.replace('.log', ''),
					path: fullPath,
					session,
					size: stats.size
				});
			} catch {
				// Skip files we can't stat
			}
		}
	}

	return results;
}

const MAX_SESSION_SCAN = 10;
const MAX_DIRS_TO_CHECK = 50;

/**
 * Walk up from context.logUri to find the session root directory.
 * context.logUri = <session>/window1/exthost/<extensionId>/
 * Session root = the directory whose parent is named 'logs'.
 */
function findSessionRootFromLogUri(logUri: string): null | string {
	let current = logUri;
	for (let i = 0; i < 6; i++) {
		const parent = path.dirname(current);
		if (parent === current) break;
		if (path.basename(parent) === 'logs') {
			return current;
		}
		current = parent;
	}
	return null;
}

function hasWindowLogs(sessionDir: string): boolean {
	try {
		const entries = fs.readdirSync(sessionDir, { withFileTypes: true });
		return entries.some((e) => e.isDirectory() && e.name.startsWith('window'));
	} catch {
		return false;
	}
}

function getRecentSessionDirs(logsRoot: string, max = MAX_SESSION_SCAN): string[] {
	if (!fs.existsSync(logsRoot)) {
		return [];
	}
	try {
		const names = fs
			.readdirSync(logsRoot, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => d.name)
			.sort()
			.reverse()
			.slice(0, MAX_DIRS_TO_CHECK);

		const result: string[] = [];
		for (const name of names) {
			if (result.length >= max) break;
			const sessionDir = path.join(logsRoot, name);
			if (hasWindowLogs(sessionDir)) {
				result.push(sessionDir);
			}
		}
		return result;
	} catch {
		return [];
	}
}

function getHostLogsDirs(): string[] {
	const dirs: string[] = [];

	// Primary: derive current session root from context.logUri
	if (hostLogUri) {
		const sessionRoot = findSessionRootFromLogUri(hostLogUri);
		if (sessionRoot && fs.existsSync(sessionRoot)) {
			dirs.push(sessionRoot);
		}
	}

	// Secondary: scan userDataDir/logs for recent window sessions
	const userDataDir = getUserDataDir();
	if (userDataDir) {
		for (const dir of getRecentSessionDirs(path.join(userDataDir, 'logs'))) {
			if (!dirs.includes(dir)) {
				dirs.push(dir);
			}
		}
	}

	return dirs;
}

function getClientLogsDirs(): string[] {
	const { workspaceFolders } = vscode.workspace;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return [];
	}

	const root = workspaceFolders[0].uri.fsPath;
	const candidates: string[] = [];

	const storagePath = getClientLogsStoragePath();
	if (storagePath) {
		candidates.push(path.join(storagePath, 'user-data', 'logs'));
	}

	candidates.push(path.join(root, '.devtools', 'user-data', 'logs'));

	try {
		const rootEntries = fs.readdirSync(root, { withFileTypes: true });
		for (const entry of rootEntries) {
			if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
				candidates.push(path.join(root, entry.name, '.devtools', 'user-data', 'logs'));
			}
		}
	} catch {
		// Can't read root dir
	}

	// Find the candidate root with the most recent session
	let bestRoot: null | string = null;
	let bestTimestamp = '';

	for (const candidate of candidates) {
		if (!fs.existsSync(candidate)) {
			continue;
		}
		try {
			const sessions = fs
				.readdirSync(candidate, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)
				.sort()
				.reverse();
			if (sessions.length > 0 && sessions[0] > bestTimestamp) {
				bestTimestamp = sessions[0];
				bestRoot = candidate;
			}
		} catch {
			continue;
		}
	}

	if (!bestRoot) {
		return [];
	}
	return getRecentSessionDirs(bestRoot);
}

/**
 * Discover log files from all active VS Code sessions.
 * Scans multiple recent session directories per log root and merges results.
 * Deduplicates by channel name per session type, keeping the newest file.
 */
function discoverAllLogFiles(sessionFilter?: SessionType): LogFileInfo[] {
	const allFiles: LogFileInfo[] = [];
	const seen = new Set<string>();

	if (!sessionFilter || sessionFilter === 'host') {
		for (const dir of getHostLogsDirs()) {
			for (const file of findLogFiles(dir, 'host')) {
				const key = `host:${file.name}`;
				if (!seen.has(key)) {
					seen.add(key);
					allFiles.push(file);
				}
			}
		}
	}

	if (!sessionFilter || sessionFilter === 'client') {
		for (const dir of getClientLogsDirs()) {
			for (const file of findLogFiles(dir, 'client')) {
				const key = `client:${file.name}`;
				if (!seen.has(key)) {
					seen.add(key);
					allFiles.push(file);
				}
			}
		}
	}

	return allFiles;
}

// ============================================================================
// Language Model Tool Implementation
// ============================================================================

export class OutputReadTool implements vscode.LanguageModelTool<IReadOutputChannelsParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IReadOutputChannelsParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const params = options.input;

		let messageText: string;
		if (params.channel) {
			const filterParts: string[] = [];
			if (params.session) filterParts.push(`session: ${params.session}`);
			if (params.limit !== undefined) filterParts.push(`limit: ${params.limit}`);
			if (params.pattern) filterParts.push(`pattern: "${params.pattern}"`);
			if (params.afterLine !== undefined) filterParts.push(`afterLine: ${params.afterLine}`);
			if (params.beforeLine !== undefined) filterParts.push(`beforeLine: ${params.beforeLine}`);

			const filterDesc = filterParts.length > 0 ? ` with filters: ${filterParts.join(', ')}` : '';
			messageText = `Read output channel "${params.channel}"${filterDesc}?`;
		} else {
			const sessionDesc = params.session ? ` (${params.session} only)` : '';
			messageText = `List all available VS Code output channels${sessionDesc}?`;
		}

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(messageText),
				title: 'Read Output Channels'
			},
			invocationMessage: params.channel ? `Reading output channel: ${params.channel}` : 'Listing output channels'
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<IReadOutputChannelsParams>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const params = options.input;
		const sessionFilter = params.session;

		const logFiles = discoverAllLogFiles(sessionFilter);
		if (logFiles.length === 0) {
			const sessionHint = sessionFilter ? ` for session "${sessionFilter}"` : '';
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`No log files found${sessionHint}. Make sure VS Code has created log files.`)]);
		}

		// If no channel specified, list all available channels
		if (!params.channel) {
			return this.listChannels(logFiles);
		}

		// Find matching channels across sessions
		const needle = params.channel.toLowerCase();
		let matches = logFiles.filter((f) => f.name.toLowerCase() === needle);
		if (matches.length === 0) {
			matches = logFiles.filter((f) => f.name.toLowerCase().includes(needle));
		}

		if (matches.length === 0) {
			const availableChannels = [...new Set(logFiles.map((f) => f.name))].join(', ');
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Channel "${params.channel}" not found. Available channels: ${availableChannels}`)]);
		}

		// If the channel exists in multiple sessions, return all of them
		const parts: vscode.LanguageModelTextPart[] = [];
		for (const match of matches) {
			const result = this.readChannel(match, params);
			const textParts = result.content.filter((p): p is vscode.LanguageModelTextPart => p instanceof vscode.LanguageModelTextPart);
			for (const tp of textParts) {
				parts.push(tp);
			}
		}

		return new vscode.LanguageModelToolResult(parts);
	}

	private listChannels(logFiles: LogFileInfo[]): vscode.LanguageModelToolResult {
		// Group files by session, then by category
		const bySessions = new Map<SessionType, Map<string, LogFileInfo[]>>();
		for (const file of logFiles) {
			let sessionMap = bySessions.get(file.session);
			if (!sessionMap) {
				sessionMap = new Map();
				bySessions.set(file.session, sessionMap);
			}
			const catFiles = sessionMap.get(file.category);
			if (catFiles) {
				catFiles.push(file);
			} else {
				sessionMap.set(file.category, [file]);
			}
		}

		const sessionLabels: Record<SessionType, string> = {
			client: 'Client Session (Extension Development Host)',
			host: 'Host Session'
		};

		const lines: string[] = ['## Available Output Channels\n'];

		for (const sessionType of ['host', 'client'] as const) {
			const sessionMap = bySessions.get(sessionType);
			if (!sessionMap) continue;

			lines.push(`### ${sessionLabels[sessionType]}\n`);

			for (const [category, files] of sessionMap) {
				lines.push(`#### ${categoryLabels[category] ?? category}\n`);
				for (const file of files) {
					const sizeKb = (file.size / 1024).toFixed(1);
					lines.push(`- **${file.name}** (${sizeKb} KB)`);
				}
				lines.push('');
			}
		}

		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(lines.join('\n'))]);
	}

	private readChannel(targetFile: LogFileInfo, params: IReadOutputChannelsParams): vscode.LanguageModelToolResult {
		let content: string;
		try {
			content = fs.readFileSync(targetFile.path, 'utf-8');
		} catch (err) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Error reading log file: ${(err as Error).message}`)]);
		}

		const { afterLine, beforeLine, limit, lineLimit, pattern } = params;

		interface LineEntry {
			line: number;
			text: string;
		}

		const allLines = content.split('\n');
		let indexedLines: LineEntry[] = allLines.map((text, idx) => ({
			line: idx + 1,
			text
		}));

		// Apply cursor filters (afterLine/beforeLine)
		if (afterLine !== undefined) {
			indexedLines = indexedLines.filter((l) => l.line > afterLine);
		}
		if (beforeLine !== undefined) {
			indexedLines = indexedLines.filter((l) => l.line < beforeLine);
		}

		// Apply pattern filter
		if (pattern) {
			try {
				const regex = new RegExp(pattern, 'i');
				indexedLines = indexedLines.filter((l) => regex.test(l.text));
			} catch (err) {
				return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Invalid regex pattern "${pattern}": ${(err as Error).message}`)]);
			}
		}

		const totalMatching = indexedLines.length;
		let hasMore = false;

		// Apply limit (tail-style: take last N)
		if (limit !== undefined && indexedLines.length > limit) {
			hasMore = true;
			indexedLines = indexedLines.slice(-limit);
		}

		// Apply lineLimit (truncate long lines)
		if (lineLimit !== undefined) {
			indexedLines = indexedLines.map((l) => ({
				line: l.line,
				text: l.text.length > lineLimit ? `${l.text.slice(0, lineLimit)}...` : l.text
			}));
		}

		// Build filter description for output
		const filterParts: string[] = [];
		if (pattern) filterParts.push(`pattern: ${pattern}`);
		if (afterLine !== undefined) filterParts.push(`afterLine: ${afterLine}`);
		if (beforeLine !== undefined) filterParts.push(`beforeLine: ${beforeLine}`);
		if (limit !== undefined) filterParts.push(`limit: ${limit}`);
		if (lineLimit !== undefined) filterParts.push(`lineLimit: ${lineLimit}`);
		const filtersDesc = filterParts.length > 0 ? filterParts.join(' | ') : undefined;

		const oldestLine = indexedLines.length > 0 ? indexedLines[0].line : undefined;
		const newestLine = indexedLines.length > 0 ? indexedLines[indexedLines.length - 1].line : undefined;

		// Build markdown output
		const sessionLabel = targetFile.session === 'host' ? 'Host' : 'Client';
		const outputLines: string[] = [`## Output: ${targetFile.name} [${sessionLabel}]\n`];

		let summary = `**Returned:** ${indexedLines.length} of ${totalMatching} total`;
		if (hasMore) {
			summary += ` (use \`afterLine: ${oldestLine !== undefined ? oldestLine - 1 : 0}\` or increase \`limit\` to see more)`;
		}
		outputLines.push(summary);

		if (oldestLine !== undefined && newestLine !== undefined) {
			outputLines.push(`**Line range:** ${oldestLine} - ${newestLine}`);
		}

		if (filtersDesc) {
			outputLines.push(`**Filters:** ${filtersDesc}`);
		}

		if (indexedLines.length === 0) {
			outputLines.push('\n(no matching lines)');
		} else {
			const rawText = indexedLines.map((l) => l.text);
			const drillDown: FilterOptions = {};
			if (params.templateId) drillDown.templateId = params.templateId;
			if (params.severity) drillDown.severity = params.severity as Severity;
			if (params.timeRange) drillDown.timeRange = params.timeRange;
			if (params.minDuration) drillDown.minDuration = params.minDuration;
			if (params.correlationId) drillDown.correlationId = params.correlationId;
			if (params.includeStackFrames !== undefined) drillDown.includeStackFrames = params.includeStackFrames;

			const compressed = compressLogs({ label: `${targetFile.name} [${sessionLabel}]`, lines: rawText }, drillDown);
			outputLines.push(`\n${compressed.formatted}`);
		}

		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(outputLines.join('\n'))]);
	}
}
