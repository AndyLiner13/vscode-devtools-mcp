/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolDefinition } from './tools/ToolDefinition.js';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { type CallToolResult, SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import process from 'node:process';
import { toJSONSchema } from 'zod/v4-mini';
import { z as zod } from 'zod';

import { ensureClientAvailable, getProcessLedger, type ProcessEntry, type ProcessLedgerSummary, registerClientRecoveryHandler } from './client-pipe.js';
import { getMcpServerRoot, loadConfig, type ResolvedConfig } from './config.js';
import { checkForChanges, readyToRestart } from './host-pipe.js';
import { logger } from './logger.js';
import { startMcpSocketServer, stopMcpSocketServer } from './mcp-socket-server.js';
import { McpResponse } from './McpResponse.js';
import { lifecycleService } from './services/index.js';
import { RequestPipeline } from './services/requestPipeline.js';
import { tools } from './tools/tools.js';

// Default timeout for tools (30 seconds)
const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

// ── MCP Server Root ──────────────────────────────────────
const mcpServerDir = getMcpServerRoot();

/**
 * Format child processes as indented tree lines for a parent process.
 */
function formatChildProcesses(entry: ProcessEntry, indent: string): string[] {
	if (!entry.children || entry.children.length === 0) return [];

	const lines: string[] = [];
	for (const child of entry.children) {
		const cmdLine = child.commandLine ? (child.commandLine.length > 60 ? `${child.commandLine.slice(0, 57)}...` : child.commandLine) : child.name;
		lines.push(`\n${indent}↳ PID ${child.pid} — ${child.name} — \`${cmdLine}\``);
	}
	return lines;
}

/**
 * Format the process ledger summary for inclusion in every MCP response.
 * Shows terminals as parent nodes with their processes as children,
 * giving Copilot full visibility into the terminal ↔ process relationship.
 */
function formatProcessLedger(ledger: ProcessLedgerSummary): string {
	const parts: string[] = [];
	const sessions = ledger.terminalSessions ?? [];

	// Orphaned processes (highest priority — from previous sessions, no terminal)
	if (ledger.orphaned.length > 0) {
		parts.push('\n---');
		parts.push(`\n⚠️ **Orphaned Processes (${ledger.orphaned.length}):**`);
		for (const p of ledger.orphaned) {
			const cmd = p.command.length > 50 ? `${p.command.slice(0, 47)}...` : p.command;
			parts.push(`\n• **PID ${p.pid}** (${p.terminalName}) — \`${cmd}\` — from previous session`);
			parts.push(...formatChildProcesses(p, '  '));
		}
	}

	// Terminal sessions as parent nodes with active processes as children
	if (sessions.length > 0 || ledger.active.length > 0) {
		// Track which active processes we've already shown under a terminal
		const shownPids = new Set<number>();

		parts.push('\n---');
		parts.push(`\n📺 **Terminal Sessions (${sessions.length}):**`);

		for (const session of sessions) {
			const shellLabel = session.shell ? ` [${session.shell}]` : '';
			const pidLabel = session.pid ? ` (PID ${session.pid})` : '';
			const activeIcon = session.isActive ? '▶️' : '📺';

			// Find the active process running in this terminal
			const matchedProcess = ledger.active.find((p) => (session.pid && p.pid === session.pid) || p.terminalName === session.name || (session.name === 'MCP Terminal' && p.terminalName === 'default') || session.name === `MCP: ${p.terminalName}`);

			if (matchedProcess) {
				shownPids.add(matchedProcess.pid);
				const cmd = matchedProcess.command.length > 45 ? `${matchedProcess.command.slice(0, 42)}...` : matchedProcess.command;
				const childCount = matchedProcess.children?.length ?? 0;
				const childLabel = childCount > 0 ? ` [${childCount} child${childCount > 1 ? 'ren' : ''}]` : '';
				parts.push(`\n${activeIcon} **${session.name}**${shellLabel}${pidLabel}`);
				parts.push(`\n  └─ ${matchedProcess.status}: \`${cmd}\`${childLabel}`);
				parts.push(...formatChildProcesses(matchedProcess, '     '));
			} else if (session.command) {
				const cmd = session.command.length > 40 ? `${session.command.slice(0, 37)}...` : session.command;
				parts.push(`\n${activeIcon} **${session.name}**${shellLabel}${pidLabel}`);
				parts.push(`\n  └─ ${session.status}: \`${cmd}\``);
			} else {
				parts.push(`\n${activeIcon} **${session.name}**${shellLabel}${pidLabel} — ${session.status}`);
			}
		}

		// Show any active processes not matched to a terminal session
		const unmatched = ledger.active.filter((p) => !shownPids.has(p.pid));
		if (unmatched.length > 0) {
			parts.push(`\n\n🟢 **Unmatched Active Processes (${unmatched.length}):**`);
			for (const p of unmatched) {
				const cmd = p.command.length > 50 ? `${p.command.slice(0, 47)}...` : p.command;
				const childCount = p.children?.length ?? 0;
				const childLabel = childCount > 0 ? ` [${childCount} child${childCount > 1 ? 'ren' : ''}]` : '';
				parts.push(`\n• **${p.terminalName}** (PID ${p.pid ?? 'pending'}) — \`${cmd}\` — ${p.status}${childLabel}`);
				parts.push(...formatChildProcesses(p, '  '));
			}
		}
	} else if (ledger.active.length > 0) {
		// Fallback: no terminal sessions data, show processes only
		parts.push('\n---');
		parts.push(`\n🟢 **Active Copilot Processes (${ledger.active.length}):**`);
		for (const p of ledger.active) {
			const cmd = p.command.length > 50 ? `${p.command.slice(0, 47)}...` : p.command;
			const childCount = p.children?.length ?? 0;
			const childLabel = childCount > 0 ? ` [${childCount} child${childCount > 1 ? 'ren' : ''}]` : '';
			parts.push(`\n• **${p.terminalName}** (PID ${p.pid ?? 'pending'}) — \`${cmd}\` — ${p.status}${childLabel}`);
			parts.push(...formatChildProcesses(p, '  '));
		}
	}

	// Recently completed (lower priority)
	const completed = ledger.recentlyCompleted.filter((p) => p.status === 'completed' || p.status === 'killed');
	if (completed.length > 0) {
		const shown = completed.slice(0, 3);
		parts.push('\n---');
		parts.push(`\n✅ **Recently Completed (${shown.length}/${completed.length}):**`);
		for (const p of shown) {
			const cmd = p.command.length > 40 ? `${p.command.slice(0, 37)}...` : p.command;
			const exitInfo = p.exitCode !== undefined ? `exit ${p.exitCode}` : p.status;
			parts.push(`\n• **${p.terminalName}** — \`${cmd}\` — ${exitInfo}`);
		}
	}

	// If nothing to report, return empty string (no notification)
	if (ledger.orphaned.length === 0 && sessions.length === 0 && ledger.active.length === 0 && completed.length === 0) {
		return '';
	}

	return parts.join('');
}

class ToolTimeoutError extends Error {
	constructor(toolName: string, timeoutMs: number) {
		super(`Tool "${toolName}" timed out after ${timeoutMs}ms. The operation took too long to complete.`);
		this.name = 'ToolTimeoutError';
	}
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, toolName: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new ToolTimeoutError(toolName, timeoutMs));
			}, timeoutMs);
		})
	]);
}

// If moved update release-please config
// x-release-please-start-version
const VERSION = '0.16.0';
// x-release-please-end

// Load config from .devtools/ config files (no CLI args — config files are the source of truth)
const /**
	 *
	 */
	config: ResolvedConfig = loadConfig();

// Initialize lifecycle service with MCP config (target workspace + extension path + launch flags)
lifecycleService.init({
	clientWorkspace: config.clientWorkspace,
	extensionPath: config.extensionBridgePath,
	launch: { ...config.launch },
	wasHotReloaded: false
});

// Start MCP socket server with tool dispatch so the Inspector and
// extension can send commands (listTools, callTool, detach-gracefully)
// The actual tool deps are wired after the pipeline is created below.
let socketDepsReady = false;

// Register process-level shutdown handlers (stdin end, SIGINT, etc.)
lifecycleService.registerShutdownHandlers();

// Wire up auto-recovery: when any tool detects the Client pipe is dead,
// the recovery handler asks the Host to restart the Client window.
registerClientRecoveryHandler(async () => {
	await lifecycleService.recoverClientConnection();
});

process.on('unhandledRejection', (reason, promise) => {
	logger('Unhandled promise rejection', promise, reason);
});

logger(`Starting VS Code DevTools MCP Server v${VERSION}`);
logger(`Config: hostWorkspace=${config.hostWorkspace}, clientWorkspace=${config.clientWorkspace}`);
logger(`Config: extensionBridgePath=${config.extensionBridgePath}`);
const server = new McpServer(
	{
		name: 'vscode_devtools',
		title: 'VS Code DevTools MCP server',
		version: VERSION
	},
	{ capabilities: { logging: {} } }
);
server.server.setRequestHandler(SetLevelRequestSchema, () => {
	return {};
});

/**
 * Ensure VS Code debug window is connected via Host pipe.
 */
async function ensureConnection(): Promise<void> {
	await lifecycleService.ensureConnection();
}

const logDisclaimers = () => {
	console.error(
		`mcp-server exposes content of the VS Code debug window to MCP clients,
allowing them to inspect, debug, and modify any data visible in the editor.
Avoid sharing sensitive or personal information that you do not want to share with MCP clients.`
	);
};

// ── Request Pipeline ─────────────────────────────────────
// Single unified FIFO queue for all tool calls (stdio + pipe).

const pipeline = new RequestPipeline({
	checkForChanges: async (mcpRoot, extPath) => checkForChanges(mcpRoot, extPath),
	extensionPath: config.extensionBridgePath,
	hotReloadEnabled: config.hotReload.enabled && config.explicitExtensionDevelopmentPath,
	mcpServerRoot: mcpServerDir,
	onShutdown: async () => {
		stopMcpSocketServer();
	},
	readyToRestart: async () => readyToRestart()
});

/**
 * Execute a tool by name through the pipeline. Used by both MCP SDK
 * registrations (stdio) and the named-pipe socket server (Inspector).
 */
async function executeTool(toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
	const tool = tools.find(t => t.name === toolName);
	if (!tool) {
		throw new Error(`Unknown tool: ${toolName}`);
	}

	const timeoutMs = tool.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;

	return pipeline.submit(tool.name, async () => {
		try {
			const executeBody = async (): Promise<CallToolResult> => {
				logger(`${tool.name} request: ${JSON.stringify(args, null, '  ')}`);

				const isStandalone = tool.annotations.conditions?.includes('standalone');

				if (!isStandalone) {
					await ensureConnection();
				}

				const needsClientPipe = tool.annotations.conditions?.includes('client-pipe');
				if (needsClientPipe) {
					await ensureClientAvailable();
				}

				const response = new McpResponse();
				await tool.handler({ params: args }, response, {} as never);

				const content: CallToolResult['content'] = [];
				for (const line of response.responseLines) {
					content.push({ text: line, type: 'text' });
				}
				for (const img of response.images) {
					content.push({ data: img.data, mimeType: img.mimeType, type: 'image' });
				}
				if (content.length === 0) {
					content.push({ text: '(no output)', type: 'text' });
				}

				if (!response.skipLedger) {
					const ledger = await getProcessLedger();
					const ledgerText = formatProcessLedger(ledger);
					if (ledgerText) {
						content.push({ text: ledgerText, type: 'text' });
					}
				}

				return { content };
			};

			const isCodebaseTool = tool.annotations.conditions?.includes('codebase-sequential');
			if (isCodebaseTool) {
				return await executeBody();
			}
			return await withTimeout(executeBody(), timeoutMs, tool.name);
		} catch (err) {
			const typedErr = err instanceof Error ? err : new Error(String(err));
			logger(`[tool:${tool.name}] ERROR: ${typedErr.message}`);
			if (typedErr.stack) {
				logger(`[tool:${tool.name}] Stack: ${typedErr.stack}`);
			}
			let errorText = typedErr.message;
			if ('cause' in typedErr && typedErr.cause instanceof Error) {
				errorText += `\nCause: ${typedErr.cause.message}`;
			}

			const buildFailureMatch = errorText.match(/Build failed:\n?([\s\S]*)/);
			if (buildFailureMatch) {
				const buildLogs = buildFailureMatch[1].trim();
				return {
					content: [{ text: `❌ **Extension build failed.** Full build output:\n\n\`\`\`\n${buildLogs}\n\`\`\``, type: 'text' }],
					isError: true
				};
			}

			return { content: [{ text: errorText, type: 'text' }], isError: true };
		}
	});
}

function registerTool(targetServer: McpServer, tool: ToolDefinition): void {
	targetServer.registerTool(
		tool.name,
		{
			annotations: tool.annotations,
			description: tool.description,
			inputSchema: tool.schema
		},
		async (params): Promise<CallToolResult> => executeTool(tool.name, params)
	);
}

// Build pre-converted JSON Schema list for the socket server
function getToolList(): Array<{ annotations?: Record<string, unknown>; description: string; inputSchema: Record<string, unknown>; name: string }> {
	return tools.map(tool => ({
		annotations: tool.annotations as unknown as Record<string, unknown>,
		description: tool.description,
		inputSchema: toJSONSchema(zod.object(tool.schema)) as Record<string, unknown>,
		name: tool.name
	}));
}

for (const tool of tools) {
	registerTool(server, tool);
}

// Wire up socket server with tool dispatch deps
startMcpSocketServer({
	executeTool,
	getToolList,
	version: VERSION
});

const transport = new StdioServerTransport();
await server.connect(transport);
logger('VS Code DevTools MCP Server connected to stdio transport');

// Best-effort auto-launch: try to start the VS Code debug window now, but
// don't crash the server if it fails (e.g., host VS Code not running yet).
// If this fails, ensureConnection() will retry on the first tool call.
try {
	logger('[startup] Auto-launching VS Code debug window...');
	await ensureConnection();
	logger('[startup] ✓ VS Code debug window is ready');
} catch (err) {
	const message = err && typeof err === 'object' && 'message' in err ? (err as Error).message : String(err);
	logger(`[startup] ✗ Startup connection failed — will retry on first tool call: ${message}`);
}

logDisclaimers();
