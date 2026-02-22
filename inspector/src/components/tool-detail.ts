import type { CallToolResult, ContentBlock, JsonSchema, ToolDefinition } from '../types';
import { createInputEditor, createOutputEditor } from '../monaco-setup';
import type * as monaco from 'monaco-editor';

let executeHandler: ((toolName: string, args: Record<string, unknown>) => Promise<CallToolResult>) | null = null;

let activeInputEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeOutputEditor: monaco.editor.IStandaloneCodeEditor | null = null;

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
  if (activeOutputEditor) {
    activeOutputEditor.dispose();
    activeOutputEditor = null;
  }
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

  // ── Input Section ──
  const inputSection = document.createElement('div');
  inputSection.className = 'tool-io-section';

  const inputLabel = document.createElement('h3');
  inputLabel.textContent = 'Input';

  const inputEditorWrapper = document.createElement('div');
  inputEditorWrapper.className = 'tool-io-editor-wrapper';

  const example = generateExample(tool.inputSchema);
  const initialValue = Object.keys(example).length > 0
    ? JSON.stringify(example, null, 2)
    : getPlaceholderJson(tool.inputSchema);

  activeInputEditor = createInputEditor(inputEditorWrapper, initialValue);

  inputSection.appendChild(inputLabel);
  inputSection.appendChild(inputEditorWrapper);
  card.appendChild(inputSection);

  // ── Execute Button Row ──
  const executeRow = document.createElement('div');
  executeRow.className = 'flex items-center gap-3 px-2 py-2';

  const executeBtn = document.createElement('button');
  executeBtn.className = [
    'px-4 py-1.5 bg-vscode-accent text-white rounded text-sm font-medium',
    'hover:bg-vscode-accent-hover transition-colors cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'flex items-center gap-2',
  ].join(' ');
  executeBtn.textContent = '▶ Execute';

  const executionTime = document.createElement('span');
  executionTime.className = 'tool-execution-time';

  executeRow.appendChild(executeBtn);
  executeRow.appendChild(executionTime);
  card.appendChild(executeRow);

  // ── Result Area (always visible) ──
  const resultArea = document.createElement('div');
  resultArea.className = 'tool-result-section';
  resultArea.id = 'tool-result-area';

  // Pre-render empty Output so it's always visible
  renderResult(resultArea, { content: [], isError: false });

  card.appendChild(resultArea);
  scrollContainer.appendChild(card);
  panel.appendChild(scrollContainer);

  // ── Execute Handler ──
  executeBtn.addEventListener('click', async () => {
    if (!executeHandler || !activeInputEditor) {
      return;
    }

    const inputText = activeInputEditor.getValue().trim();
    let args: Record<string, unknown> = {};
    if (inputText) {
      try {
        args = JSON.parse(inputText) as Record<string, unknown>;
      } catch {
        renderError(resultArea, 'Invalid JSON input');
        return;
      }
    }

    executeBtn.disabled = true;
    executeBtn.textContent = '⏳ Running...';

    const startTime = performance.now();

    try {
      const result = await executeHandler(tool.name, args);
      const elapsed = performance.now() - startTime;
      executionTime.textContent = `${elapsed.toFixed(0)}ms`;
      renderResult(resultArea, result);
    } catch (err) {
      const elapsed = performance.now() - startTime;
      executionTime.textContent = `${elapsed.toFixed(0)}ms`;
      const message = err instanceof Error ? err.message : String(err);
      renderError(resultArea, message);
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = '▶ Execute';
    }
  });
}

// ── Result Rendering ──

function renderResult(container: HTMLElement, result: CallToolResult): void {
  container.innerHTML = '';

  const card = document.getElementById('tool-invocation-card');
  if (result.isError && card) {
    card.classList.add('error-state');
  } else if (card) {
    card.classList.remove('error-state');
  }

  const outputSection = document.createElement('div');
  outputSection.className = 'tool-io-section';

  const outputLabel = document.createElement('h3');
  outputLabel.textContent = 'Output';
  outputSection.appendChild(outputLabel);

  // Collect text content and render in a Monaco editor
  const textParts: string[] = [];
  const imageParts: ContentBlock[] = [];

  for (const block of result.content) {
    if (block.type === 'image' && block.data) {
      imageParts.push(block);
    } else if (block.text) {
      textParts.push(block.text);
    }
  }

  const combinedText = textParts.join('\n');

  // Detect if the combined text is valid JSON for syntax highlighting
  let languageId = 'plaintext';
  try {
    JSON.parse(combinedText);
    languageId = 'json';
  } catch {
    // Not JSON — use plaintext
  }

  const outputEditorWrapper = document.createElement('div');
  outputEditorWrapper.className = 'tool-io-editor-wrapper';

  if (activeOutputEditor) {
    activeOutputEditor.dispose();
    activeOutputEditor = null;
  }

  activeOutputEditor = createOutputEditor(outputEditorWrapper, combinedText, languageId);
  outputSection.appendChild(outputEditorWrapper);

  // Render image blocks
  for (const img of imageParts) {
    const imgEl = document.createElement('img');
    imgEl.className = 'tool-output-image';
    imgEl.src = `data:${img.mimeType ?? 'image/png'};base64,${img.data}`;
    outputSection.appendChild(imgEl);
  }

  container.appendChild(outputSection);
}

function renderError(container: HTMLElement, message: string): void {
  container.innerHTML = '';

  const card = document.getElementById('tool-invocation-card');
  if (card) {
    card.classList.add('error-state');
  }

  const outputSection = document.createElement('div');
  outputSection.className = 'tool-io-section';

  const outputLabel = document.createElement('h3');
  outputLabel.textContent = 'Output';

  const errorDiv = document.createElement('div');
  errorDiv.className = 'tool-error-message';

  const label = document.createElement('span');
  label.className = 'error-label';
  label.textContent = 'Error: ';

  const msg = document.createElement('span');
  msg.textContent = message;

  errorDiv.appendChild(label);
  errorDiv.appendChild(msg);

  outputSection.appendChild(outputLabel);
  outputSection.appendChild(errorDiv);
  container.appendChild(outputSection);
}

// ── Helpers ──

function getPlaceholderJson(schema: JsonSchema): string {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return '{}';
  }

  const example: Record<string, string> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    const required = schema.required?.includes(key) ? ' (required)' : '';
    example[key] = `${prop.type ?? 'any'}${required}`;
  }

  return JSON.stringify(example, null, 2);
}

function generateExample(schema: JsonSchema): Record<string, unknown> {
  const example: Record<string, unknown> = {};
  if (!schema.properties) {
    return example;
  }

  const requiredKeys = schema.required ?? [];

  for (const key of requiredKeys) {
    const prop = schema.properties[key];
    if (!prop) {
      continue;
    }

    if (prop.default !== undefined) {
      example[key] = prop.default;
    } else if (prop.enum && prop.enum.length > 0) {
      example[key] = prop.enum[0];
    } else {
      switch (prop.type) {
        case 'string':
          example[key] = '';
          break;
        case 'number':
        case 'integer':
          example[key] = 0;
          break;
        case 'boolean':
          example[key] = false;
          break;
        case 'array':
          example[key] = [];
          break;
        case 'object':
          example[key] = {};
          break;
      }
    }
  }

  return example;
}

