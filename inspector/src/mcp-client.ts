import type { CallToolResult, ConnectionState, ServerInfo, ToolDefinition } from './types';

import { rpc } from './bridge';

type StateChangeHandler = (state: ConnectionState, error?: string) => void;

/**
 * Send log messages to the extension host output panel.
 * Fire-and-forget, non-blocking.
 */
function log(message: string): void {
	rpc('log', { message }).catch(() => {
		// Silently ignore if extension host is unavailable
	});
}

/**
 * MCP Inspector client that talks to the extension backend via postMessage bridge.
 * The backend proxies requests to the MCP server via named pipes.
 */
export class McpInspectorClient {
	private readonly onStateChange: StateChangeHandler;
	private connected = false;

	serverInfo: null | ServerInfo = null;
	tools: ToolDefinition[] = [];

	constructor(onStateChange: StateChangeHandler) {
		this.onStateChange = onStateChange;
	}

	get isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Connect by loading the tool list from the backend.
	 * The backend ensures the MCP server is running and talks to it via pipe.
	 */
	async connect(maxAttempts = 15, retryDelayMs = 2000): Promise<void> {
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			this.onStateChange('connecting');

			try {
				const result = await rpc<{ error?: string; serverInfo?: ServerInfo; tools?: ToolDefinition[] }>('mcp/tools');

				if (result.error) {
					throw new Error(result.error);
				}

				this.serverInfo = result.serverInfo ?? null;
				this.tools = result.tools ?? [];
				this.connected = true;
				this.onStateChange('connected');
				log(`[mcp-client] Connected — ${this.tools.length} tools available`);
				return;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);

				if (attempt >= maxAttempts) {
					this.onStateChange('error', message);
					throw err;
				}

				log(`[mcp-client] Connect attempt ${attempt}/${maxAttempts} failed: ${message} — retrying in ${retryDelayMs}ms`);
				this.onStateChange('connecting');
				await this.delay(retryDelayMs);
			}
		}
	}

	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async refreshTools(): Promise<ToolDefinition[]> {
		const result = await rpc<{ tools?: ToolDefinition[] }>('mcp/tools');
		this.tools = result.tools ?? [];
		return this.tools;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		return rpc<CallToolResult>('mcp/call', { arguments: args, name });
	}

	async disconnect(): Promise<void> {
		this.connected = false;
		this.serverInfo = null;
		this.tools = [];
		this.onStateChange('disconnected');
	}
}
