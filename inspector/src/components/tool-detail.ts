import type { CallToolResult, ContentBlock, JsonSchema, ToolDefinition } from '../types';
import type * as monaco from 'monaco-editor';

import { setupJsonInteractivity, setupLockedEditing } from '../json-interactivity';
import { createInputEditor, createOutputEditor } from '../monaco-setup';
import { addExecution, createHistoryContainer, setCurrentTool, updateExecution } from './history-list';

let executeHandler: ((toolName: string, args: Record<string, unknown>) => Promise<CallToolResult>) | null = null;

let activeInputEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeOutputEditors: monaco.editor.IStandaloneCodeEditor[] = [];
let isExecuting = false;
let activeOutputSection: HTMLElement | null = null;
let activeOutputContainer: HTMLElement | null = null;
let activeToolName = '';
let inputSaveTimer: ReturnType<typeof setTimeout> | null = null;
let activeInteractivity: { dispose(): void } | null = null;

const INPUT_STORAGE_PREFIX = 'mcp-inspector-input:';
const OUTPUT_STORAGE_PREFIX = 'mcp-inspector-output:';

interface SavedOutputBlock {
	isImage: boolean;
	languageId: string;
	text: string;
}

interface SavedOutput {
	blocks: SavedOutputBlock[];
	isError: boolean;
}

function saveInputState(toolName: string, value: string): void {
	localStorage.setItem(`${INPUT_STORAGE_PREFIX}${toolName}`, value);
}

function loadInputState(toolName: string): string | null {
	return localStorage.getItem(`${INPUT_STORAGE_PREFIX}${toolName}`);
}

function saveOutputState(toolName: string, blocks: SavedOutputBlock[], isError: boolean): void {
	const data: SavedOutput = { blocks, isError };
	localStorage.setItem(`${OUTPUT_STORAGE_PREFIX}${toolName}`, JSON.stringify(data));
}

function loadOutputState(toolName: string): SavedOutput | null {
	const raw = localStorage.getItem(`${OUTPUT_STORAGE_PREFIX}${toolName}`);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		if (!('blocks' in parsed) || !Array.isArray(parsed.blocks)) {
			// Old format — discard instead of migrating
			localStorage.removeItem(`${OUTPUT_STORAGE_PREFIX}${toolName}`);
			return null;
		}
		return parsed as SavedOutput;
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
	for (const editor of activeOutputEditors) {
		editor.dispose();
	}
	activeOutputEditors = [];
	activeOutputContainer = null;
	isExecuting = false;
	activeOutputSection = null;
}

let pendingRerunRecordId: null | string = null;

async function executeCurrentInput(): Promise<void> {
	if (!executeHandler || !activeInputEditor || isExecuting) {
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

	const startTime = performance.now();

	try {
		const result = await executeHandler(activeToolName, args);
		const elapsed = performance.now() - startTime;
		renderLiveOutput(result.content, result.isError ?? false);
		if (rerunId) {
			await updateExecution(activeToolName, rerunId, result, Math.round(elapsed));
		} else {
			await addExecution(activeToolName, inputText, result, Math.round(elapsed));
		}
	} catch (err) {
		const elapsed = performance.now() - startTime;
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
	panel.className = 'tool-detail-panel';
	panel.id = 'tool-detail-panel';

	const emptyState = document.createElement('div');
	emptyState.className = 'empty-state';
	emptyState.id = 'tool-detail-empty';

	const iconUri = (globalThis as Record<string, unknown>).__EXTENSION_ICON_URI__ as string | undefined;
	if (iconUri) {
		const img = document.createElement('img');
		img.src = iconUri;
		img.alt = '';
		img.className = 'empty-state-icon';
		img.draggable = false;
		emptyState.appendChild(img);
	} else {
		emptyState.innerHTML = '<div><p class="empty-state-title">Select a tool</p><p class="empty-state-subtitle">Choose a tool from the list to inspect and execute it</p></div>';
	}

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
	scrollContainer.className = 'tool-detail-scroll';

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
	const initialValue = syncInputWithSchema(savedInput, tool.inputSchema);

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
	outputHeader.className = 'output-header';

	const outputLabel = document.createElement('h3');
	outputLabel.id = 'live-output-label';
	outputLabel.textContent = 'Output';

	outputHeader.appendChild(outputLabel);
	activeOutputSection.appendChild(outputHeader);

	activeOutputContainer = document.createElement('div');
	activeOutputContainer.className = 'output-block-list';

	const savedOutput = loadOutputState(tool.name);
	if (savedOutput && savedOutput.blocks.length > 0) {
		outputLabel.style.color = savedOutput.isError ? 'var(--vscode-editorError-foreground, #f44747)' : '';
		for (const block of savedOutput.blocks) {
			const wrapper = document.createElement('div');
			wrapper.className = 'tool-io-editor-wrapper';
			const editor = createOutputEditor(wrapper, block.text, block.languageId);
			activeOutputEditors.push(editor);
			activeOutputContainer.appendChild(wrapper);
		}
	} else {
		const wrapper = document.createElement('div');
		wrapper.className = 'tool-io-editor-wrapper';
		const editor = createOutputEditor(wrapper, '', 'plaintext');
		activeOutputEditors.push(editor);
		activeOutputContainer.appendChild(wrapper);
	}

	activeOutputSection.appendChild(activeOutputContainer);

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
	if (!activeOutputContainer) return;

	// Dispose old editors
	for (const editor of activeOutputEditors) {
		editor.dispose();
	}
	activeOutputEditors = [];
	activeOutputContainer.innerHTML = '';

	const textBlocks = content.filter((b) => b.text);
	const blocks: SavedOutputBlock[] = [];

	if (textBlocks.length === 0) {
		const wrapper = document.createElement('div');
		wrapper.className = 'tool-io-editor-wrapper';
		const editor = createOutputEditor(wrapper, '(no output)', 'plaintext');
		activeOutputEditors.push(editor);
		activeOutputContainer.appendChild(wrapper);
		blocks.push({ isImage: false, languageId: 'plaintext', text: '(no output)' });
	} else {
		for (const block of textBlocks) {
			const text = block.text ?? '';
			let languageId = 'plaintext';
			try {
				JSON.parse(text);
				languageId = 'json';
			} catch {
				// Not JSON
			}

			const wrapper = document.createElement('div');
			wrapper.className = 'tool-io-editor-wrapper';
			const editor = createOutputEditor(wrapper, text, languageId);
			activeOutputEditors.push(editor);
			activeOutputContainer.appendChild(wrapper);
			blocks.push({ isImage: false, languageId, text });
		}
	}

	const label = document.getElementById('live-output-label');
	if (label) {
		label.style.color = isError ? 'var(--vscode-editorError-foreground, #f44747)' : '';
	}

	if (activeToolName) {
		saveOutputState(activeToolName, blocks, isError);
	}
}

// ── Helpers ──

/**
 * Sync saved input JSON with the current tool schema.
 * Removes keys no longer in the schema, adds new keys with defaults.
 * Preserves existing values for keys that still exist.
 */
function syncInputWithSchema(savedInput: string | null, schema: JsonSchema): string {
	if (!savedInput) return buildInitialInput(schema);
	if (!schema.properties || Object.keys(schema.properties).length === 0) return '{}';

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(savedInput) as Record<string, unknown>;
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return buildInitialInput(schema);
		}
	} catch {
		return buildInitialInput(schema);
	}

	const schemaKeys = new Set(Object.keys(schema.properties));
	const merged: Record<string, unknown> = {};

	// Schema keys in order: required first, then optional
	const required = new Set(schema.required ?? []);
	const sortedKeys = [
		...Object.keys(schema.properties).filter((k) => required.has(k)),
		...Object.keys(schema.properties).filter((k) => !required.has(k))
	];

	for (const key of sortedKeys) {
		if (key in parsed) {
			merged[key] = parsed[key];
		} else {
			const prop = schema.properties[key];
			if (prop) merged[key] = buildValueExample(prop);
		}
	}

	// Check if anything changed
	const savedKeys = new Set(Object.keys(parsed));
	const keysMatch = savedKeys.size === schemaKeys.size && [...savedKeys].every((k) => schemaKeys.has(k));
	if (keysMatch) return savedInput;

	return JSON.stringify(merged, null, 2);
}

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
		case 'string': {
			if (typeof prop.default === 'string') return prop.default;
			// Pre-fill query fields that use "symbol = " syntax
			if (prop.description && /symbol\s*=\s/.test(prop.description)) {
				return 'symbol = ';
			}
			return '';
		}
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
