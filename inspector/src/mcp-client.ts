import type { CallToolResult, ConnectionState, ServerInfo, ToolDefinition } from './types';

type StateChangeHandler = (state: ConnectionState, error?: string) => void;

const LOG_ENDPOINT = '/api/log';

/**
 * Send log messages to the server to appear in VS Code output panel.
 * Fire-and-forget, non-blocking. Falls back silently if server unavailable.
 */
function log(message: string): void {
	fetch(LOG_ENDPOINT, {
		body: JSON.stringify({ message }),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST'
	}).catch(() => {
		// Silently ignore if server is unavailable
	});
}

/**
 * MCP Inspector client that talks to the Vite backend REST API.
 * The backend proxies requests to the MCP server via its named pipe —
 * no direct browser → MCP HTTP connection, no CORS, no port discovery.
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
				const response = await fetch('/api/mcp/tools', { method: 'POST' });
				if (!response.ok) {
					const text = await response.text();
					throw new Error(`HTTP ${response.status}: ${text}`);
				}

				const result = await response.json() as { error?: string; serverInfo?: ServerInfo; tools?: ToolDefinition[] };

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
		const response = await fetch('/api/mcp/tools', { method: 'POST' });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${await response.text()}`);
		}
		const result = await response.json() as { tools?: ToolDefinition[] };
		this.tools = result.tools ?? [];
		return this.tools;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		const response = await fetch('/api/mcp/call', {
			body: JSON.stringify({ arguments: args, name }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`HTTP ${response.status}: ${text}`);
		}

		return await response.json() as CallToolResult;
	}

	async disconnect(): Promise<void> {
		this.connected = false;
		this.serverInfo = null;
		this.tools = [];
		this.onStateChange('disconnected');
	}
}
