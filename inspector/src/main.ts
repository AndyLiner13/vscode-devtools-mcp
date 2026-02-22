import './styles.css';
import { McpInspectorClient } from './mcp-client';
import { createApp } from './components/app';
import { onRerun } from './components/history-list';
import { onToolSelect, renderToolList } from './components/tool-list';
import { onExecute, renderToolDetail, rerunWithInput } from './components/tool-detail';
import { pruneUnrated } from './storage';
import type { ConnectionState } from './types';

// Prune unrated records on load — only flagged/archived survive reloads
pruneUnrated();

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

// Wire rerun → set input editor value and trigger execution
onRerun((input) => {
  rerunWithInput(input);
});

// Auto-connect on load
client.connect().catch((err: unknown) => {
  console.error('Failed to connect to MCP server:', err);
});
