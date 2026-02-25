export interface ToolDefinition {
	annotations?: ToolAnnotations;
	description?: string;
	inputSchema: JsonSchema;
	name: string;
}

export interface ToolAnnotations {
	conditions?: string[];
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
	readOnlyHint?: boolean;
	title?: string;
}

export interface JsonSchema {
	[key: string]: unknown;
	default?: unknown;
	description?: string;
	enum?: unknown[];
	items?: JsonSchema;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	type?: string;
}

export interface ContentBlock {
	data?: string;
	mimeType?: string;
	text?: string;
	type: 'image' | 'text';
}

export interface CallToolResult {
	content: ContentBlock[];
	isError?: boolean;
}

export interface ServerInfo {
	name: string;
	title?: string;
	version: string;
}

interface ServerCapabilities {
	logging?: Record<string, unknown>;
	prompts?: Record<string, unknown>;
	resources?: Record<string, unknown>;
	tools?: Record<string, unknown>;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionStatus {
	error?: string;
	serverInfo?: ServerInfo;
	state: ConnectionState;
	toolCount: number;
}

// ── Inspector Test Manager ──

export type RecordRating = 'bad' | 'good' | null;

export interface ExecutionRecord {
	comment: string;
	createdAt: string;
	durationMs: number;
	id: string;
	input: string;
	isError: boolean;
	isStale: boolean;
	lastRunAt: null | string;
	output: ContentBlock[];
	priority: number;
	rating: RecordRating;
	toolName: string;
}

interface InspectorStorage {
	records: Record<string, ExecutionRecord[]>;
	version: number;
}
