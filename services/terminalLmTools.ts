/**
 * Language Model Tools: Terminal Operations
 *
 * LM tools that allow Copilot to interact with VS Code terminals.
 * Each VS Code instance gets its own local terminal controller.
 *
 * Architecture:
 * - LM tools control terminals in the ACTIVE WORKSPACE where the extension runs
 * - MCP tools (in client-handlers.ts) have their own separate controller
 * - This allows both host and client to run terminal tools independently
 *
 * Tools:
 * - terminal_read: Read current terminal state and output
 * - terminal_execute: Run a command or send input to a terminal
 */

import type { FilterOptions, Severity } from '@packages/log-consolidation';

import { compressLogs, consolidateText } from '@packages/log-consolidation';
import * as vscode from 'vscode';

import { SingleTerminalController, type TerminalRunResult } from './singleTerminalController';
import { getUserActionTracker } from './userActionTracker';

// ============================================================================
// Local Controller (lazy initialization)
// ============================================================================

let localController: null | SingleTerminalController = null;

function getController(): SingleTerminalController {
	if (!localController) {
		console.log('[devtools:LM-tools] Initializing local terminal controller');
		localController = new SingleTerminalController();
	}
	return localController;
}

// ============================================================================
// Input Interfaces
// ============================================================================

export interface IReadTerminalParams {
	correlationId?: string;
	includeStackFrames?: boolean;
	limit?: number;
	minDuration?: string;
	name?: string;
	pattern?: string;
	severity?: string;
	templateId?: string;
	timeRange?: string;
}

export interface ITerminalRunParams {
	addNewline?: boolean;
	command?: string;
	correlationId?: string;
	cwd?: string;
	ephemeral: boolean;
	force?: boolean;
	includeStackFrames?: boolean;
	keys?: string[];
	minDuration?: string;
	name?: string;
	severity?: string;
	templateId?: string;
	timeout?: number;
	timeRange?: string;
}

// ============================================================================
// Log Compression Helpers
// ============================================================================

function extractDrillDownFilters(params: IReadTerminalParams | ITerminalRunParams): FilterOptions {
	const filters: FilterOptions = {};
	if (params.templateId) filters.templateId = params.templateId;
	if (params.severity) filters.severity = params.severity as Severity;
	if (params.timeRange) filters.timeRange = params.timeRange;
	if (params.minDuration) filters.minDuration = params.minDuration;
	if (params.correlationId) filters.correlationId = params.correlationId;
	if (params.includeStackFrames !== undefined) filters.includeStackFrames = params.includeStackFrames;
	return filters;
}

function compressOutput(text: string, filters: FilterOptions, label?: string): string {
	const lines = text.split('\n');
	const result = compressLogs({ label: label ?? 'Terminal Output', lines }, filters);
	return result.formatted;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatTerminalResult(result: TerminalRunResult, limit?: number, pattern?: string, filters?: FilterOptions): string {
	const lines: string[] = [];

	// Inject user action alerts at the top so Copilot notices immediately
	const userActionDigest = getUserActionTracker().formatForInjection();
	if (userActionDigest) {
		lines.push(userActionDigest);
	}

	lines.push(`## Terminal: ${result.name ?? 'default'}`);
	lines.push('');
	lines.push(`**Status:** ${result.status}`);
	if (result.shell) lines.push(`**Shell:** ${result.shell}`);
	if (result.cwd) lines.push(`**CWD:** ${result.cwd}`);
	if (result.pid !== undefined) lines.push(`**PID:** ${result.pid}`);
	if (result.exitCode !== undefined) lines.push(`**Exit Code:** ${result.exitCode}`);
	if (result.durationMs !== undefined) lines.push(`**Duration:** ${result.durationMs}ms`);
	if (result.prompt) lines.push(`**Prompt:** \`${result.prompt}\``);
	lines.push('');

	let output = result.output ?? '';

	if (pattern) {
		try {
			// Don't use 'g' flag — it causes test() to maintain state (lastIndex)
			// which breaks filtering when the same regex tests multiple lines
			const regex = new RegExp(pattern, 'i');
			const outputLines = output.split('\n');
			const matchingLines = outputLines.filter((line) => regex.test(line));
			output = matchingLines.join('\n');
			lines.push(`**Filtered by:** \`${pattern}\` (${matchingLines.length} matching lines)`);
		} catch {
			lines.push(`**Warning:** Invalid regex pattern "${pattern}"`);
		}
	}

	if (limit !== undefined && limit > 0) {
		const outputLines = output.split('\n');
		if (outputLines.length > limit) {
			output = outputLines.slice(-limit).join('\n');
			lines.push(`**Showing:** last ${limit} of ${outputLines.length} lines`);
		}
	}

	if (output.trim()) {
		const finalOutput = compressOutput(output, filters ?? {}, result.name ?? 'Terminal Output');
		lines.push('');
		lines.push('**Output:**');
		lines.push(finalOutput);
	} else {
		lines.push('');
		lines.push('*(no output)*');
	}

	if (result.terminalSessions && result.terminalSessions.length > 0) {
		lines.push('');
		lines.push('**All Terminal Sessions:**');
		for (const session of result.terminalSessions) {
			const marker = session.isActive ? '→ ' : '  ';
			const statusTag = session.status === 'running' ? '🔄' : session.status === 'completed' ? '✓' : '○';
			lines.push(`${marker}${statusTag} **${session.name}** (${session.status})`);
		}
	}

	return lines.join('\n');
}

// ============================================================================
// ReadTerminalTool
// ============================================================================

export class TerminalReadTool implements vscode.LanguageModelTool<IReadTerminalParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IReadTerminalParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const params = options.input;
		const terminalName = params.name ?? 'default';

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(`Read current output and state from terminal "${terminalName}"?`),
				title: 'Read Terminal'
			},
			invocationMessage: `Reading terminal "${terminalName}" state`
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<IReadTerminalParams>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const params = options.input;
		const controller = getController();

		const result = await controller.getState(params.name);
		const filters = extractDrillDownFilters(params);
		const formatted = formatTerminalResult(result, params.limit, params.pattern, filters);

		return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(formatted)]);
	}
}

// ============================================================================
// TerminalRunTool (unified: run commands + send input)
// ============================================================================

export class TerminalExecuteTool implements vscode.LanguageModelTool<ITerminalRunParams> {
	async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<ITerminalRunParams>, _token: vscode.CancellationToken): Promise<undefined | vscode.PreparedToolInvocation> {
		const params = options.input;
		const terminalName = params.name ?? 'default';

		// Keys mode: interactive TUI navigation
		if (params.keys && params.keys.length > 0) {
			return {
				confirmationMessages: {
					message: new vscode.MarkdownString(`Send key sequences to terminal "${terminalName}"?\n\n` + `**Keys:** ${params.keys.map((k) => `\`${k}\``).join(' → ')}`),
					title: 'Send Keys'
				},
				invocationMessage: `Sending keys [${params.keys.join(', ')}] to terminal "${terminalName}"`
			};
		}

		const isInputMode = !params.cwd;

		if (isInputMode) {
			const cmd = params.command ?? '';
			const displayText = cmd.length > 50 ? `${cmd.slice(0, 50)}...` : cmd;
			return {
				confirmationMessages: {
					message: new vscode.MarkdownString(`Send input to terminal "${terminalName}"?\n\n` + `**Input:** \`${displayText}\`\n\n` + `**Add newline:** ${params.addNewline !== false ? 'yes' : 'no'}`),
					title: 'Terminal Input'
				},
				invocationMessage: `Sending input to terminal "${terminalName}"`
			};
		}

		return {
			confirmationMessages: {
				message: new vscode.MarkdownString(
					`Execute PowerShell command in terminal "${terminalName}"?\n\n` +
						`**Command:**\n\`\`\`powershell\n${params.command}\n\`\`\`\n\n` +
						`**Working Directory:** \`${params.cwd}\`${params.force ? '\n\n⚠️ **Force:** Will kill any running process first' : ''}`
				),
				title: 'Run Command'
			},
			invocationMessage: `Running command in terminal "${terminalName}"`
		};
	}

	async invoke(options: vscode.LanguageModelToolInvocationOptions<ITerminalRunParams>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
		const params = options.input;
		const controller = getController();

		// Keys mode: send key sequences for interactive TUI navigation
		if (params.keys && params.keys.length > 0) {
			try {
				const result = await controller.sendKeys(params.keys, params.name, params.timeout);
				const filters = extractDrillDownFilters(params);
				const formatted = formatTerminalResult(result, undefined, undefined, filters);

				if (params.ephemeral && (result.status === 'completed' || result.status === 'timeout')) {
					controller.destroyTerminal(params.name);
				}

				return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(formatted)]);
			} catch (err) {
				return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Error: ${(err as Error).message}`)]);
			}
		}

		if (!params.command || typeof params.command !== 'string') {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('Error: command is required and must be a string (or use keys for interactive navigation)')]);
		}

		const { command } = params;
		const isInputMode = !params.cwd;

		try {
			let result: TerminalRunResult;

			if (isInputMode) {
				// Input mode: send text to existing terminal
				result = await controller.sendInput(command, params.addNewline !== false, params.timeout, params.name);
			} else if (params.cwd) {
				// Run mode: execute command in terminal with cwd
				result = await controller.run(command, params.cwd, params.timeout, params.name, params.force ?? false);
			} else {
				// This shouldn't happen due to isInputMode logic, but TypeScript needs it
				return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('Error: cwd is required in run mode')]);
			}

			const filters = extractDrillDownFilters(params);
			const formatted = formatTerminalResult(result, undefined, undefined, filters);

			// Ephemeral terminals are destroyed after completed commands return output.
			// Running/waiting terminals are kept alive for continued interaction.
			if (params.ephemeral && (result.status === 'completed' || result.status === 'timeout')) {
				controller.destroyTerminal(params.name);
			}

			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(formatted)]);
		} catch (err) {
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Error: ${(err as Error).message}`)]);
		}
	}
}
