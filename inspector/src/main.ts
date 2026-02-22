import './styles.css';
import { McpInspectorClient } from './mcp-client';
import { createApp } from './components/app';
import { onToolSelect, renderToolList } from './components/tool-list';
import { onExecute, renderToolDetail } from './components/tool-detail';
import type { ConnectionState } from './types';

// Mount app
const appRoot = document.getElementById('app');
if (!appRoot) {
  throw new Error('Missing #app element');
}
appRoot.appendChild(createApp());

// MCP client with state change callback
const client = new McpInspectorClient((state: ConnectionState, _error?: string) => {
  if (state === 'connected') {
    renderToolList(client.tools);
  }
});

// Wire tool selection → render detail panel
onToolSelect((tool) => {
  renderToolDetail(tool);
});

// Wire tool execution → MCP client call
onExecute(async (toolName, args) => {
  return client.callTool(toolName, args);
});

// Auto-connect on load
client.connect().catch((err: unknown) => {
  console.error('Failed to connect to MCP server:', err);
});
