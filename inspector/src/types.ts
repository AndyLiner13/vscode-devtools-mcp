export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  annotations?: ToolAnnotations;
}

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  conditions?: string[];
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  [key: string]: unknown;
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface CallToolResult {
  content: ContentBlock[];
  isError?: boolean;
}

export interface ServerInfo {
  name: string;
  version: string;
  title?: string;
}

export interface ServerCapabilities {
  tools?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
  resources?: Record<string, unknown>;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionStatus {
  state: ConnectionState;
  serverInfo?: ServerInfo;
  toolCount: number;
  error?: string;
}
