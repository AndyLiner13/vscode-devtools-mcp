import type { CallToolResult, ConnectionState, ServerCapabilities, ServerInfo, ToolDefinition } from './types';

type StateChangeHandler = (state: ConnectionState, error?: string) => void;

const MCP_ENDPOINT = 'http://localhost:6274/mcp';
const PROTOCOL_VERSION = '2025-03-26';

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * Lightweight MCP client using raw fetch + JSON-RPC over Streamable HTTP.
 * Connects directly to the MCP server's HTTP endpoint — no proxy needed.
 */
export class McpInspectorClient {
  private sessionId: string | null = null;
  private requestId = 0;
  private onStateChange: StateChangeHandler;

  serverInfo: ServerInfo | null = null;
  capabilities: ServerCapabilities | null = null;
  tools: ToolDefinition[] = [];

  constructor(onStateChange: StateChangeHandler) {
    this.onStateChange = onStateChange;
  }

  get isConnected(): boolean {
    return this.sessionId !== null;
  }

  /**
   * Connect to the MCP server with automatic retries.
   * Handles the case where the server is rebuilding/restarting after code
   * changes — keeps retrying until it comes up or the max attempts are hit.
   */
  async connect(maxAttempts = 15, retryDelayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.onStateChange('connecting');

      try {
        const initResult = await this.sendRequest('initialize', {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: 'devtools-inspector',
            version: '1.0.0',
          },
        });

        this.serverInfo = (initResult.serverInfo as ServerInfo) ?? null;
        this.capabilities = (initResult.capabilities as ServerCapabilities) ?? null;

        await this.sendNotification('notifications/initialized');
        await this.refreshTools();

        this.onStateChange('connected');
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.sessionId = null;

        // Last attempt — give up
        if (attempt >= maxAttempts) {
          this.onStateChange('error', message);
          throw err;
        }

        // Server is restarting or not yet up — retry after delay
        console.log(`[mcp-client] Connect attempt ${attempt}/${maxAttempts} failed: ${message} — retrying in ${retryDelayMs}ms`);
        this.onStateChange('connecting');
        await this.delay(retryDelayMs);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async refreshTools(): Promise<ToolDefinition[]> {
    const result = await this.sendRequest('tools/list', {});
    this.tools = (result.tools as ToolDefinition[]) ?? [];
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    const result = await this.sendRequest('tools/call', { name, arguments: args });
    return result as unknown as CallToolResult;
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(MCP_ENDPOINT, {
          method: 'DELETE',
          headers: { 'mcp-session-id': this.sessionId },
        });
      } catch {
        // Best effort — server may already be gone
      }
    }

    this.sessionId = null;
    this.serverInfo = null;
    this.capabilities = null;
    this.tools = [];
    this.onStateChange('disconnected');
  }

  private async sendRequest(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const id = ++this.requestId;
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await fetch(MCP_ENDPOINT, { method: 'POST', headers, body });

    const responseSessionId = response.headers.get('mcp-session-id');
    if (responseSessionId) {
      this.sessionId = responseSessionId;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('text/event-stream')) {
      return this.parseSSEResponse(response);
    }

    const json: JsonRpcResponse = await response.json();

    if (json.error) {
      throw new Error(`MCP Error [${json.error.code}]: ${json.error.message}`);
    }

    return json.result ?? {};
  }

  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      ...(params ? { params } : {}),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    await fetch(MCP_ENDPOINT, { method: 'POST', headers, body });
  }

  private async parseSSEResponse(response: Response): Promise<Record<string, unknown>> {
    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data) {
          continue;
        }

        try {
          const json: JsonRpcResponse = JSON.parse(data);

          if (json.result !== undefined) {
            return json.result;
          }

          if (json.error) {
            throw new Error(`MCP Error [${json.error.code}]: ${json.error.message}`);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            continue;
          }
          throw e;
        }
      }
    }

    throw new Error('No valid JSON-RPC response found in SSE stream');
  }
}
