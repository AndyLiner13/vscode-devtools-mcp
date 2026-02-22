import type { CallToolResult, JsonSchema, ToolDefinition } from '../types';
import { createInputEditor } from '../monaco-setup';
import type * as monaco from 'monaco-editor';

import { addExecution, createHistoryContainer, setCurrentTool } from './history-list';

let executeHandler: ((toolName: string, args: Record<string, unknown>) => Promise<CallToolResult>) | null = null;

let activeInputEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeExecuteBtn: HTMLButtonElement | null = null;
let activeExecutionTime: HTMLElement | null = null;
let activeToolName = '';

export function onExecute(
  handler: (toolName: string, args: Record<string, unknown>) => Promise<CallToolResult>,
): void {
  executeHandler = handler;
}

function disposeEditors(): void {
  if (activeInputEditor) {
    activeInputEditor.dispose();
    activeInputEditor = null;
  }
  activeExecuteBtn = null;
  activeExecutionTime = null;
}

async function executeCurrentInput(): Promise<void> {
  if (!executeHandler || !activeInputEditor || !activeExecuteBtn || !activeExecutionTime) {
    return;
  }

  const inputText = activeInputEditor.getValue().trim();
  let args: Record<string, unknown> = {};
  if (inputText) {
    try {
      args = JSON.parse(inputText) as Record<string, unknown>;
    } catch {
      return;
    }
  }

  activeExecuteBtn.disabled = true;
  activeExecuteBtn.textContent = 'Running...';

  const startTime = performance.now();

  try {
    const result = await executeHandler(activeToolName, args);
    const elapsed = performance.now() - startTime;
    activeExecutionTime.textContent = `${elapsed.toFixed(0)}ms`;
    addExecution(activeToolName, inputText, result, Math.round(elapsed));
  } catch (err) {
    const elapsed = performance.now() - startTime;
    activeExecutionTime.textContent = `${elapsed.toFixed(0)}ms`;
    const message = err instanceof Error ? err.message : String(err);
    addExecution(
      activeToolName,
      inputText,
      { content: [{ type: 'text', text: `Error: ${message}` }], isError: true },
      Math.round(elapsed),
    );
  } finally {
    activeExecuteBtn.disabled = false;
    activeExecuteBtn.textContent = 'Execute';
  }
}

export function rerunWithInput(input: string): void {
  if (!activeInputEditor) {
    return;
  }
  activeInputEditor.setValue(input);
  executeCurrentInput();
}

export function createToolDetail(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'flex-1 flex flex-col overflow-hidden bg-vscode-bg';
  panel.id = 'tool-detail-panel';

  const emptyState = document.createElement('div');
  emptyState.className = 'flex-1 flex items-center justify-center text-vscode-text-dim';
  emptyState.id = 'tool-detail-empty';
  emptyState.innerHTML =
    '<div class="text-center"><p class="text-lg mb-2">Select a tool</p><p class="text-sm">Choose a tool from the list to inspect and execute it</p></div>';

  panel.appendChild(emptyState);
  return panel;
}

export function renderToolDetail(tool: ToolDefinition): void {
  const panel = document.getElementById('tool-detail-panel');
  if (!panel) {
    return;
  }

  disposeEditors();
  panel.innerHTML = '';

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'flex-1 overflow-y-auto p-4';

  // ── Tool Invocation Card (VS Code Copilot Chat style) ──
  const card = document.createElement('div');
  card.className = 'tool-invocation-card';
  card.id = 'tool-invocation-card';
  activeToolName = tool.name;
  setCurrentTool(tool.name);

  // ── Input Section ──
  const inputSection = document.createElement('div');
  inputSection.className = 'tool-io-section';

  const inputLabel = document.createElement('h3');
  inputLabel.textContent = 'Input';

  const inputEditorWrapper = document.createElement('div');
  inputEditorWrapper.className = 'tool-io-editor-wrapper';

  const initialValue = buildInitialInput(tool.inputSchema);

  activeInputEditor = createInputEditor(inputEditorWrapper, initialValue);

  inputSection.appendChild(inputLabel);
  inputSection.appendChild(inputEditorWrapper);
  card.appendChild(inputSection);

  // ── Execute Button Row ──
  const executeRow = document.createElement('div');
  executeRow.className = 'flex items-center gap-3 px-2 py-2';

  activeExecuteBtn = document.createElement('button');
  activeExecuteBtn.className = [
    'px-4 py-1.5 bg-vscode-accent text-white rounded text-sm font-medium',
    'hover:bg-vscode-accent-hover transition-colors cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'flex items-center gap-2',
  ].join(' ');
  activeExecuteBtn.textContent = 'Execute';

  activeExecutionTime = document.createElement('span');
  activeExecutionTime.className = 'tool-execution-time';

  executeRow.appendChild(activeExecuteBtn);
  executeRow.appendChild(activeExecutionTime);
  card.appendChild(executeRow);

  // ── History List ──
  const historyContainer = createHistoryContainer();
  card.appendChild(historyContainer);

  scrollContainer.appendChild(card);
  panel.appendChild(scrollContainer);

  // Trigger initial render of persisted records
  setCurrentTool(tool.name);

  // ── Execute Handler ──
  activeExecuteBtn.addEventListener('click', () => {
    executeCurrentInput();
  });
}

// ── Helpers ──

function buildInitialInput(schema: JsonSchema): string {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return '{}';
  }
  return JSON.stringify(buildObjectExample(schema), null, 2);
}

function buildObjectExample(schema: JsonSchema): Record<string, unknown> {
  if (!schema.properties) {
    return {};
  }

  const required = new Set(schema.required ?? []);
  const result: Record<string, unknown> = {};

  // Required properties first, then optional
  const sortedKeys = [
    ...Object.keys(schema.properties).filter(k => required.has(k)),
    ...Object.keys(schema.properties).filter(k => !required.has(k)),
  ];

  for (const key of sortedKeys) {
    const prop = schema.properties[key];
    if (!prop) {
      continue;
    }
    result[key] = buildValueExample(prop);
  }

  return result;
}

function buildValueExample(prop: JsonSchema): unknown {
  if (prop.default !== undefined) {
    return prop.default;
  }

  if (prop.enum && prop.enum.length > 0) {
    return prop.enum[0];
  }

  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array': {
      // If items have enum options, pre-fill with all available options so
      // the user can see what's available and remove what they don't need
      if (prop.items?.enum && prop.items.enum.length > 0) {
        return prop.items.enum;
      }
      return [];
    }
    case 'object':
      return prop.properties ? buildObjectExample(prop) : {};
    default:
      return null;
  }
}

