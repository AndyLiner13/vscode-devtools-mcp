/**
 * Interactive JSON Editor Enhancements
 *
 * Adds click-based interactivity to the Monaco JSON input editor:
 * - Boolean toggle: click true↔false
 * - Integer select: click selects the whole number for easy replacement
 * - Enum array toggle: grayed-out inline options that toggle on click
 *
 * These features make the JSON input feel more like an interactive form
 * while keeping the visual appearance of standard JSON.
 */

import type { JsonSchema } from './types';

import * as monacoNs from 'monaco-editor';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Wire up all interactive JSON behaviors on a Monaco editor.
 * Call once after the editor is created for the tool's input panel.
 * Returns a disposable that cleans up all listeners.
 */
export function setupJsonInteractivity(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const disposables: monacoNs.IDisposable[] = [];

	disposables.push(setupBooleanToggle(editor));
	disposables.push(setupIntegerSelect(editor));
	disposables.push(setupFilePathIntellisense(editor, schema));
	disposables.push(setupEnumArrayToggle(editor, schema));

	return {
		dispose() {
			for (const d of disposables) {
				d.dispose();
			}
		}
	};
}

// ── Feature 1: Boolean Toggle ────────────────────────────────────────────────

/**
 * Single-click on `true` or `false` toggles the value.
 * Uses a mouseUp handler with a microtask defer so Monaco finishes
 * its own click processing first.
 */
function setupBooleanToggle(editor: monacoNs.editor.IStandaloneCodeEditor): monacoNs.IDisposable {
	return editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;

		const model = editor.getModel();
		if (!model) return;

		const word = model.getWordAtPosition(position);
		if (!word) return;

		if (word.word !== 'true' && word.word !== 'false') return;

		const newValue = word.word === 'true' ? 'false' : 'true';
		const range = new monacoNs.Range(
			position.lineNumber, word.startColumn,
			position.lineNumber, word.endColumn
		);

		editor.executeEdits('boolean-toggle', [{
			forceMoveMarkers: true,
			range,
			text: newValue
		}]);
	});
}

// ── Feature 2: Integer Select on Click ───────────────────────────────────────

/**
 * Single-click on a number value selects the entire number,
 * so the user can immediately start typing a replacement.
 */
function setupIntegerSelect(editor: monacoNs.editor.IStandaloneCodeEditor): monacoNs.IDisposable {
	return editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;

		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(position.lineNumber);
		const numRange = findNumberRange(line, position.column);
		if (!numRange) return;

		// Defer selection so Monaco's default click handling finishes first
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				position.lineNumber, numRange.start,
				position.lineNumber, numRange.end
			));
		});
	});
}

/**
 * Find the full extent of a JSON number at a column position.
 * Handles integers and negative numbers (no floats needed for our use case).
 * Returns 1-based column range { start, end } or null.
 */
function findNumberRange(line: string, column: number): null | { end: number; start: number } {
	// column is 1-based; convert to 0-based index
	const idx = column - 1;
	if (idx < 0 || idx >= line.length) return null;

	const ch = line[idx];
	// Must be on a digit or a leading minus sign
	if (!/[\d-]/.test(ch)) return null;

	// Walk backward to find start
	let start = idx;
	while (start > 0 && /[\d]/.test(line[start - 1])) {
		start--;
	}
	// Include leading minus
	if (start > 0 && line[start - 1] === '-') {
		start--;
	}

	// Walk forward to find end
	let end = idx;
	while (end < line.length - 1 && /[\d]/.test(line[end + 1])) {
		end++;
	}

	// Verify we actually have at least one digit
	const candidate = line.substring(start, end + 1);
	if (!/^-?\d+$/.test(candidate)) return null;

	// Make sure this isn't inside a quoted string (JSON property name or string value)
	// Simple heuristic: count unescaped quotes before the number
	const prefix = line.substring(0, start);
	const quoteCount = (prefix.match(/(?<!\\)"/g) ?? []).length;
	if (quoteCount % 2 !== 0) return null; // Inside a string

	// Convert back to 1-based columns (end is exclusive for Monaco)
	return { end: end + 2, start: start + 1 };
}

// ── Feature 3: File/Dir Path Intellisense ────────────────────────────────────

const FILE_DIR_PROPERTY_NAMES = new Set(['file', 'dir', 'directory', 'path', 'filePath', 'dirPath']);
const BROWSE_ENDPOINT = '/api/browse';

interface BrowseEntry {
	name: string;
	type: 'dir' | 'file';
}

interface BrowseResponse {
	entries: BrowseEntry[];
	root: string;
}

/**
 * Click on a file/dir string value selects it and triggers
 * Monaco's suggest widget with filesystem completions.
 */
function setupFilePathIntellisense(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const fileProps = findFilePathProperties(schema);
	if (fileProps.size === 0) {
		return { dispose: noop };
	}

	const disposables: monacoNs.IDisposable[] = [];

	// Register a completion provider that fetches filesystem items
	disposables.push(
		monacoNs.languages.registerCompletionItemProvider('json', {
			provideCompletionItems: async (model, position) => {
				return providePathCompletions(model, position, fileProps);
			},
			triggerCharacters: ['/', '\\', '"']
		})
	);

	// Click handler: select string value and trigger suggestions
	disposables.push(editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;
		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(position.lineNumber);
		const stringRange = findStringValueRange(line, position.column, fileProps);
		if (!stringRange) return;

		// Select the string content (excluding quotes) and trigger suggest
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				position.lineNumber, stringRange.contentStart,
				position.lineNumber, stringRange.contentEnd
			));
			editor.trigger('file-intellisense', 'editor.action.triggerSuggest', {});
		});
	}));

	return {
		dispose() {
			for (const d of disposables) {
				d.dispose();
			}
		}
	};
}

/**
 * Find schema properties that represent file or directory paths.
 */
function findFilePathProperties(schema: JsonSchema): Set<string> {
	const result = new Set<string>();
	if (!schema.properties) return result;

	for (const name of Object.keys(schema.properties)) {
		if (FILE_DIR_PROPERTY_NAMES.has(name)) {
			result.add(name);
		}
	}
	return result;
}

/**
 * If the cursor is inside a string value for a file/dir property,
 * return the 1-based column range of the string content (excluding quotes).
 */
function findStringValueRange(
	line: string,
	column: number,
	fileProps: Set<string>
): null | { contentEnd: number; contentStart: number; propertyName: string } {
	// Match "propName": "value" patterns
	const regex = /"([^"\\]*)"\s*:\s*"([^"\\]*)"/g;
	let match;
	while ((match = regex.exec(line)) !== null) {
		const propName = match[1];
		if (!fileProps.has(propName)) continue;

		// Find the value string's position (the second quoted string)
		const colonIdx = line.indexOf(':', match.index + match[1].length + 2);
		if (colonIdx === -1) continue;

		const valueQuoteStart = line.indexOf('"', colonIdx + 1);
		if (valueQuoteStart === -1) continue;

		const valueQuoteEnd = line.indexOf('"', valueQuoteStart + 1);
		if (valueQuoteEnd === -1) continue;

		// Content is between the quotes (1-based, exclusive end)
		const contentStart = valueQuoteStart + 2; // 1-based, after opening quote
		const contentEnd = valueQuoteEnd + 1; // 1-based, at closing quote

		if (column >= contentStart && column <= contentEnd) {
			return { contentEnd, contentStart, propertyName: propName };
		}
	}
	return null;
}

/**
 * Provide file/directory completions by fetching from the browse API.
 */
async function providePathCompletions(
	model: monacoNs.editor.ITextModel,
	position: monacoNs.IPosition,
	fileProps: Set<string>
): Promise<monacoNs.languages.CompletionList> {
	const empty: monacoNs.languages.CompletionList = { suggestions: [] };

	const line = model.getLineContent(position.lineNumber);
	const stringRange = findStringValueRange(line, position.column, fileProps);
	if (!stringRange) return empty;

	// Extract the current path value
	const currentValue = line.substring(stringRange.contentStart - 1, position.column - 1);

	// Determine the directory to browse
	const lastSlash = Math.max(currentValue.lastIndexOf('/'), currentValue.lastIndexOf('\\'));
	const dirPath = lastSlash >= 0 ? currentValue.substring(0, lastSlash) : '';
	const prefix = lastSlash >= 0 ? currentValue.substring(lastSlash + 1) : currentValue;

	try {
		const response = await fetch(`${BROWSE_ENDPOINT}?path=${encodeURIComponent(dirPath)}`);
		if (!response.ok) return empty;

		const data = await response.json() as BrowseResponse;

		const replaceRange = new monacoNs.Range(
			position.lineNumber, stringRange.contentStart,
			position.lineNumber, stringRange.contentEnd
		);

		const suggestions: monacoNs.languages.CompletionItem[] = data.entries
			.filter((entry) => entry.name.toLowerCase().startsWith(prefix.toLowerCase()))
			.map((entry, idx) => {
				const insertPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
				return {
					insertText: entry.type === 'dir' ? `${insertPath}/` : insertPath,
					kind: entry.type === 'dir'
						? monacoNs.languages.CompletionItemKind.Folder
						: monacoNs.languages.CompletionItemKind.File,
					label: entry.name,
					range: replaceRange,
					sortText: `${entry.type === 'dir' ? '0' : '1'}${String(idx).padStart(4, '0')}`
				};
			});

		return { suggestions };
	} catch {
		return empty;
	}
}

// ── Feature 4: Enum Array Inline Toggle ──────────────────────────────────────

function noop(): void { /* required by IDisposable */ }

interface EnumArrayInfo {
	enumValues: string[];
	propertyName: string;
}

/**
 * For array parameters with enum items, shows all available options
 * inline in the JSON. Active items are normal; inactive items appear
 * as grayed-out decorations that can be clicked to toggle.
 */
function setupEnumArrayToggle(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const enumArrays = findEnumArrayProperties(schema);
	if (enumArrays.length === 0) {
		return { dispose: noop };
	}

	const decorationCollection = editor.createDecorationsCollection([]);
	const disposables: monacoNs.IDisposable[] = [];

	// Update decorations whenever content changes
	const updateDecorations = (): void => {
		const model = editor.getModel();
		if (!model) return;

		const allDecorations: monacoNs.editor.IModelDeltaDecoration[] = [];

		for (const enumArr of enumArrays) {
			const decos = buildEnumDecorations(model, enumArr);
			allDecorations.push(...decos);
		}

		decorationCollection.set(allDecorations);
	};

	disposables.push(editor.onDidChangeModelContent(updateDecorations));

	// Initial decoration pass
	updateDecorations();

	// Click handler for toggling enum items
	disposables.push(editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;

		const model = editor.getModel();
		if (!model) return;

		for (const range of decorationCollection.getRanges()) {
			if (!range.containsPosition(position)) continue;

			const lineContent = model.getLineContent(position.lineNumber);
			for (const enumArr of enumArrays) {
				if (handleEnumToggle(model, enumArr, position, lineContent)) return;
			}
		}
	}));

	return {
		dispose() {
			decorationCollection.clear();
			for (const d of disposables) {
				d.dispose();
			}
		}
	};
}

/**
 * Handle a click toggle on an enum item. Reformats the JSON after toggling.
 * Returns true if a toggle happened.
 */
function handleEnumToggle(
	model: monacoNs.editor.ITextModel,
	info: EnumArrayInfo,
	position: monacoNs.IPosition,
	lineContent: string
): boolean {
	const toggled = tryToggleEnumItem(model, info, position, lineContent);
	if (!toggled) return false;

	const fullText = model.getValue();
	try {
		const parsed = JSON.parse(fullText);
		const formatted = JSON.stringify(parsed, null, 2);
		if (formatted !== fullText) {
			model.setValue(formatted);
		}
	} catch {
		// JSON might be temporarily invalid during edit
	}
	return true;
}

/**
 * Walk the JSON schema and find all properties that are arrays with enum items.
 */
function findEnumArrayProperties(schema: JsonSchema): EnumArrayInfo[] {
	const results: EnumArrayInfo[] = [];

	if (!schema.properties) return results;

	for (const [name, prop] of Object.entries(schema.properties)) {
		const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
		if (type === 'array' && prop.items?.enum && prop.items.enum.length > 0) {
			results.push({
				enumValues: prop.items.enum.map(String),
				propertyName: name
			});
		}
	}

	return results;
}

/**
 * Build decorations for inactive (grayed-out) enum values.
 * Active items in the array are left alone; unselected options
 * are shown as after-decorations on the array's closing bracket line.
 */
function buildEnumDecorations(
	model: monacoNs.editor.ITextModel,
	info: EnumArrayInfo
): monacoNs.editor.IModelDeltaDecoration[] {
	const text = model.getValue();

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(text);
	} catch {
		return [];
	}

	const currentValues = Array.isArray(parsed[info.propertyName])
		? (parsed[info.propertyName] as unknown[]).map(String)
		: [];

	const inactiveValues = info.enumValues.filter((v) => !currentValues.includes(v));
	if (inactiveValues.length === 0) return [];

	const arrayEndLine = findArrayClosingBracket(model, info.propertyName);
	if (!arrayEndLine) return [];

	const lineContent = model.getLineContent(arrayEndLine);

	return [{
		options: {
			after: {
				content: inactiveValues.map((v) => `"${v}"`).join('  '),
				inlineClassName: 'enum-inactive-options',
				inlineClassNameAffectsLetterSpacing: true
			},
			before: {
				content: '\u200B',
				inlineClassName: 'enum-toggle-zone'
			}
		},
		range: new monacoNs.Range(arrayEndLine, 1, arrayEndLine, lineContent.length + 1)
	}];
}

/**
 * Find the line number of the closing `]` for a given property's array value.
 */
function findArrayClosingBracket(model: monacoNs.editor.ITextModel, propertyName: string): null | number {
	const lineCount = model.getLineCount();

	// Find the line with the property key
	let keyLine: null | number = null;
	const keyPattern = `"${propertyName}"`;
	for (let i = 1; i <= lineCount; i++) {
		if (model.getLineContent(i).includes(keyPattern)) {
			keyLine = i;
			break;
		}
	}
	if (!keyLine) return null;

	// Walk lines from the key looking for the matching `]`
	let bracketDepth = 0;
	let foundOpen = false;
	for (let i = keyLine; i <= lineCount; i++) {
		const line = model.getLineContent(i);
		for (const ch of line) {
			if (ch === '[') {
				bracketDepth++;
				foundOpen = true;
			} else if (ch === ']') {
				bracketDepth--;
				if (foundOpen && bracketDepth === 0) {
					return i;
				}
			}
		}
	}

	return null;
}

/**
 * Try to toggle an enum value at the given click position.
 * If the click is on a grayed-out (inactive) option, add it to the array.
 * If the click is on an active (existing) option, remove it from the array.
 * Returns true if a toggle happened.
 */
function tryToggleEnumItem(
	model: monacoNs.editor.ITextModel,
	info: EnumArrayInfo,
	position: monacoNs.IPosition,
	_lineContent: string
): boolean {
	const text = model.getValue();

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(text);
	} catch {
		return false;
	}

	const currentValues: string[] = Array.isArray(parsed[info.propertyName])
		? (parsed[info.propertyName] as unknown[]).map(String)
		: [];

	// Check if the click is on the closing bracket line (inactive items zone)
	const closingLine = findArrayClosingBracket(model, info.propertyName);
	if (position.lineNumber === closingLine) {
		// Parse which inactive value was clicked based on column position
		const inactiveValues = info.enumValues.filter((v) => !currentValues.includes(v));
		const clickedValue = findClickedInactiveValue(inactiveValues, position, model);
		if (clickedValue) {
			// Add the value to the array
			currentValues.push(clickedValue);
			parsed[info.propertyName] = currentValues;
			model.setValue(JSON.stringify(parsed, null, 2));
			return true;
		}
	}

	// Check if clicking on an active value in the array (to remove it)
	const lineContent = model.getLineContent(position.lineNumber);
	const clickedActiveValue = findClickedActiveValue(lineContent, position.column, info.enumValues, currentValues);
	if (clickedActiveValue) {
		const idx = currentValues.indexOf(clickedActiveValue);
		if (idx !== -1) {
			currentValues.splice(idx, 1);
			parsed[info.propertyName] = currentValues;
			model.setValue(JSON.stringify(parsed, null, 2));
			return true;
		}
	}

	return false;
}

/**
 * Determine which inactive value was clicked based on the after-decoration layout.
 * The decoration content is: "value1"  "value2"  "value3"
 */
function findClickedInactiveValue(
	inactiveValues: string[],
	position: monacoNs.IPosition,
	model: monacoNs.editor.ITextModel
): null | string {
	if (inactiveValues.length === 0) return null;

	// The inline after-decoration appends text after the line content.
	// We can estimate which value was clicked based on character offsets.
	const lineContent = model.getLineContent(position.lineNumber);
	const lineLen = lineContent.length;

	// After-decoration starts after the line content
	const afterStart = lineLen + 1;
	const relativeCol = position.column - afterStart;
	if (relativeCol < 0) return null;

	// Build position map: each value occupies `"value"` + 2 spaces
	let offset = 0;
	for (const value of inactiveValues) {
		const tokenLen = value.length + 2; // quotes
		if (relativeCol >= offset && relativeCol < offset + tokenLen + 2) {
			return value;
		}
		offset += tokenLen + 2; // 2 spaces separator
	}

	return inactiveValues.length > 0 ? inactiveValues[inactiveValues.length - 1] : null;
}

/**
 * Find if the click position is on a quoted string value that matches
 * one of the active enum values in the array.
 */
function findClickedActiveValue(
	lineContent: string,
	column: number,
	allEnumValues: string[],
	activeValues: string[]
): null | string {
	// Find all quoted strings on this line
	const regex = /"([^"\\]*)"/g;
	let match;
	while ((match = regex.exec(lineContent)) !== null) {
		const matchStart = match.index + 1; // 0-based, start of opening quote
		const matchEnd = match.index + match[0].length; // 0-based, after closing quote

		// Convert to 1-based columns for Monaco
		const colStart = matchStart + 1;
		const colEnd = matchEnd + 1;

		if (column >= colStart && column < colEnd) {
			const value = match[1];
			if (allEnumValues.includes(value) && activeValues.includes(value)) {
				return value;
			}
		}
	}

	return null;
}
