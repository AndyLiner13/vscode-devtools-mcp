import type { CallToolResult, ContentBlock, JsonSchema, ToolDefinition } from '../types';
import type * as monaco from 'monaco-editor';

import { setupJsonInteractivity, setupLockedEditing } from '../json-interactivity';
import { createInputEditor, createOutputEditor, setModelLanguage } from '../monaco-setup';
import { addExecution, createHistoryContainer, setCurrentTool, updateExecution } from './history-list';

let executeHandler: ((toolName: string, args: Record<string, unknown>) => Promise<CallToolResult>) | null = null;

let activeInputEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeOutputEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeExecutionTime: HTMLElement | null = null;
let isExecuting = false;
let activeOutputSection: HTMLElement | null = null;
let activeToolName = '';
let inputSaveTimer: ReturnType<typeof setTimeout> | null = null;
let activeInteractivity: { dispose(): void } | null = null;

const INPUT_STORAGE_PREFIX = 'mcp-inspector-input:';
const OUTPUT_STORAGE_PREFIX = 'mcp-inspector-output:';

interface SavedOutput {
	isError: boolean;
	languageId: string;
	text: string;
}

function saveInputState(toolName: string, value: string): void {
	localStorage.setItem(`${INPUT_STORAGE_PREFIX}${toolName}`, value);
}

function loadInputState(toolName: string): string | null {
	return localStorage.getItem(`${INPUT_STORAGE_PREFIX}${toolName}`);
}

function saveOutputState(toolName: string, text: string, isError: boolean, languageId: string): void {
	const data: SavedOutput = { isError, languageId, text };
	localStorage.setItem(`${OUTPUT_STORAGE_PREFIX}${toolName}`, JSON.stringify(data));
}

function loadOutputState(toolName: string): SavedOutput | null {
	const raw = localStorage.getItem(`${OUTPUT_STORAGE_PREFIX}${toolName}`);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SavedOutput;
	} catch {
		return null;
	}
}

export function onExecute(handler: (toolName: string, args: Record<string, unknown>) => Promise<CallToolResult>): void {
	executeHandler = handler;
}

function disposeEditors(): void {
	if (inputSaveTimer) {
		clearTimeout(inputSaveTimer);
		inputSaveTimer = null;
	}
	if (activeInteractivity) {
		activeInteractivity.dispose();
		activeInteractivity = null;
	}
	if (activeInputEditor) {
		if (activeToolName) {
			saveInputState(activeToolName, activeInputEditor.getValue());
		}
		activeInputEditor.dispose();
		activeInputEditor = null;
	}
	if (activeOutputEditor) {
		activeOutputEditor.dispose();
		activeOutputEditor = null;
	}
	isExecuting = false;
	activeExecutionTime = null;
	activeOutputSection = null;
}

let pendingRerunRecordId: null | string = null;

async function executeCurrentInput(): Promise<void> {
	if (!executeHandler || !activeInputEditor || isExecuting || !activeExecutionTime) {
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

	const rerunId = pendingRerunRecordId;
	pendingRerunRecordId = null;

	isExecuting = true;
	activeExecutionTime.textContent = 'Running…';

	const startTime = performance.now();

	try {
		const result = await executeHandler(activeToolName, args);
		const elapsed = performance.now() - startTime;
		activeExecutionTime.textContent = `${elapsed.toFixed(0)}ms`;
		renderLiveOutput(result.content, result.isError ?? false);
		if (rerunId) {
			await updateExecution(activeToolName, rerunId, result, Math.round(elapsed));
		} else {
			await addExecution(activeToolName, inputText, result, Math.round(elapsed));
		}
	} catch (err) {
		const elapsed = performance.now() - startTime;
		activeExecutionTime.textContent = `${elapsed.toFixed(0)}ms`;
		const message = err instanceof Error ? err.message : String(err);
		const errorResult = { content: [{ text: `Error: ${message}`, type: 'text' as const }], isError: true };
		renderLiveOutput(errorResult.content, true);
		if (rerunId) {
			await updateExecution(activeToolName, rerunId, errorResult, Math.round(elapsed));
		} else {
			await addExecution(activeToolName, inputText, errorResult, Math.round(elapsed));
		}
	} finally {
		isExecuting = false;
	}
}

export function rerunWithInput(input: string, recordId: string): void {
	if (!activeInputEditor) {
		return;
	}
	activeInputEditor.setValue(input);
	pendingRerunRecordId = recordId;
	void executeCurrentInput();
}

export function createToolDetail(): HTMLElement {
	const panel = document.createElement('div');
	panel.className = 'flex-1 flex flex-col overflow-hidden bg-vscode-bg';
	panel.id = 'tool-detail-panel';

	const emptyState = document.createElement('div');
	emptyState.className = 'flex-1 flex items-center justify-center text-vscode-text-dim';
	emptyState.id = 'tool-detail-empty';
	emptyState.innerHTML = '<div class="text-center"><p class="text-lg mb-2">Select a tool</p><p class="text-sm">Choose a tool from the list to inspect and execute it</p></div>';

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

	// ── Input Section ──
	const inputSection = document.createElement('div');
	inputSection.className = 'tool-io-section';

	const inputLabel = document.createElement('h3');
	inputLabel.textContent = 'Input';

	const inputEditorWrapper = document.createElement('div');
	inputEditorWrapper.className = 'tool-io-editor-wrapper';

	const savedInput = loadInputState(tool.name);
	const initialValue = savedInput ?? buildInitialInput(tool.inputSchema);

	activeInputEditor = createInputEditor(inputEditorWrapper, initialValue);

	// Wire up interactive JSON features and structural edit lock
	const interactivity = setupJsonInteractivity(activeInputEditor, tool.inputSchema);
	const lockedEditing = setupLockedEditing(activeInputEditor);
	activeInteractivity = {
		dispose(): void {
			interactivity.dispose();
			lockedEditing.dispose();
		}
	};

	activeInputEditor.onDidChangeModelContent(() => {
		if (inputSaveTimer) clearTimeout(inputSaveTimer);
		inputSaveTimer = setTimeout(() => {
			if (activeInputEditor && activeToolName) {
				saveInputState(activeToolName, activeInputEditor.getValue());
			}
		}, 500);
	});

	inputSection.appendChild(inputLabel);
	inputSection.appendChild(inputEditorWrapper);
	card.appendChild(inputSection);

	// ── Live Output Section (visible by default, empty until execution) ──
	activeOutputSection = document.createElement('div');
	activeOutputSection.id = 'live-output-section';
	activeOutputSection.className = 'tool-io-section';

	const outputHeader = document.createElement('div');
	outputHeader.className = 'flex items-center gap-2';

	const outputLabel = document.createElement('h3');
	outputLabel.id = 'live-output-label';
	outputLabel.textContent = 'Output';

	activeExecutionTime = document.createElement('span');
	activeExecutionTime.className = 'tool-execution-time';

	outputHeader.appendChild(outputLabel);
	outputHeader.appendChild(activeExecutionTime);
	activeOutputSection.appendChild(outputHeader);

	const outputWrapper = document.createElement('div');
	outputWrapper.className = 'tool-io-editor-wrapper';

	const savedOutput = loadOutputState(tool.name);
	const initialOutputText = savedOutput?.text ?? '';
	const initialOutputLang = savedOutput?.languageId ?? 'plaintext';

	activeOutputEditor = createOutputEditor(outputWrapper, initialOutputText, initialOutputLang);

	if (savedOutput) {
		outputLabel.style.color = savedOutput.isError ? 'var(--vscode-editorError-foreground, #f44747)' : '';
	}

	activeOutputSection.appendChild(outputWrapper);

	card.appendChild(activeOutputSection);

	// ── History List ──
	const historyContainer = createHistoryContainer();
	card.appendChild(historyContainer);

	scrollContainer.appendChild(card);
	panel.appendChild(scrollContainer);

	// ── Enter key executes; setupLockedEditing handles blocking Shift+Enter ──
	activeInputEditor.onKeyDown((e) => {
		if (e.code !== 'Enter' || e.shiftKey) return;
		// Let Monaco's suggest widget accept a suggestion with Enter
		const dom = activeInputEditor?.getDomNode();
		if (dom?.querySelector('.suggest-widget.visible')) return;
		e.preventDefault();
		e.stopPropagation();
		void executeCurrentInput();
	});

	// Populate from SQLite after DOM is mounted
	void setCurrentTool(tool.name);
}

// ── Live Output ──

function renderLiveOutput(content: ContentBlock[], isError: boolean): void {
	if (!activeOutputEditor) return;

	const outputText = content
		.filter((b) => b.text)
		.map((b) => b.text)
		.join('\n');

	let languageId = 'plaintext';
	try {
		JSON.parse(outputText);
		languageId = 'json';
	} catch {
		// Not JSON
	}

	const model = activeOutputEditor.getModel();
	if (model) {
		setModelLanguage(model, languageId);
		activeOutputEditor.setValue(outputText);
	}

	const label = document.getElementById('live-output-label');
	if (label) {
		label.style.color = isError ? 'var(--vscode-editorError-foreground, #f44747)' : '';
	}

	if (activeToolName) {
		saveOutputState(activeToolName, outputText, isError, languageId);
	}
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
	const sortedKeys = [...Object.keys(schema.properties).filter((k) => required.has(k)), ...Object.keys(schema.properties).filter((k) => !required.has(k))];

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
	if (prop.enum && prop.enum.length > 0) {
		return prop.enum[0];
	}

	const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

	switch (type) {
		case 'string':
			return '';
		case 'number':
		case 'integer':
			return prop.default ?? 0;
		case 'boolean':
			return prop.default ?? false;
		case 'array': {
			// Pre-fill with all enum options so users can see what's available
			if (prop.items?.enum && prop.items.enum.length > 0) {
				return prop.items.enum;
			}
			return prop.default ?? [];
		}
		case 'object':
			return prop.properties ? buildObjectExample(prop) : {};
		default:
			return prop.default ?? null;
	}
}
