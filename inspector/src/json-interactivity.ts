/**
 * Interactive JSON Editor Enhancements
 *
 * Adds click-based interactivity to the Monaco JSON input editor:
 * - Boolean toggle: click true↔false
 * - Integer select: click selects the whole number for easy replacement
 * - File/dir intellisense: auto-triggers on cursor entering file path fields
 * - Enum array toggle: active/inactive items shown inline, cursor-aware
 * - Value auto-select: arrow keys adjacent to a value select entire value
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

	// Shared tracked active values for enum arrays.
	// When an enum array is expanded, the model text includes ALL values (active + inactive),
	// so we can't rely on JSON.parse to know which are active. This map is the authority.
	const trackedActiveValues = new Map<string, Set<string>>();

	disposables.push(setupBooleanToggle(editor));
	disposables.push(setupIntegerSelect(editor));
	disposables.push(setupFilePathIntellisense(editor, schema));
	disposables.push(setupEnumArrayToggle(editor, schema, trackedActiveValues));
	disposables.push(setupValueAutoSelect(editor, schema));
	disposables.push(setupClickableCursorDecorations(editor, schema));
	disposables.push(setupTabToggle(editor, schema, trackedActiveValues));
	disposables.push(setupFieldNavigation(editor, schema));

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

		// Place cursor inside the new value without selecting it
		queueMicrotask(() => {
			editor.setPosition({
				column: range.startColumn + 1,
				lineNumber: position.lineNumber
			});
		});
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
 * Auto-triggers filesystem intellisense when cursor enters a file/dir
 * string value (including empty values). Escape dismisses until the
 * cursor leaves the field and re-enters.
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

	// Track whether intellisense was dismissed via Escape for the current field.
	// Reset when cursor leaves the field.
	let dismissedAtLine = -1;
	let wasInFileField = false;

	// Register a completion provider that fetches filesystem items
	disposables.push(
		monacoNs.languages.registerCompletionItemProvider('json', {
			provideCompletionItems: async (model, position) => {
				return providePathCompletions(model, position, fileProps);
			},
			triggerCharacters: ['/', '\\', '"']
		})
	);

	// Listen for Escape key to suppress re-triggering until cursor moves out
	disposables.push(editor.onKeyDown((e) => {
		if (e.keyCode === monacoNs.KeyCode.Escape) {
			const pos = editor.getPosition();
			if (pos) {
				dismissedAtLine = pos.lineNumber;
			}
		}
	}));

	// Auto-trigger on cursor position change (handles arrow keys, click, tab, etc.)
	disposables.push(editor.onDidChangeCursorPosition((e) => {
		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(e.position.lineNumber);
		const stringRange = findStringValueRange(line, e.position.column, fileProps);

		if (!stringRange) {
			// Cursor left a file field — reset dismiss state
			if (wasInFileField) {
				wasInFileField = false;
				dismissedAtLine = -1;
			}
			return;
		}

		wasInFileField = true;

		// If dismissed at this line, don't re-trigger
		if (dismissedAtLine === e.position.lineNumber) return;

		queueMicrotask(() => {
			editor.trigger('file-intellisense', 'editor.action.triggerSuggest', {});
		});
	}));

	// Click handler: select string value content and trigger suggestions
	disposables.push(editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;
		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(position.lineNumber);
		const stringRange = findStringValueRange(line, position.column, fileProps);
		if (!stringRange) return;

		// Reset dismiss on explicit click
		dismissedAtLine = -1;

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
 * Works with both empty ("") and non-empty string values.
 */
function findStringValueRange(
	line: string,
	column: number,
	fileProps: Set<string>
): null | { contentEnd: number; contentStart: number; propertyName: string } {
	// Match "propName": "value" patterns (value can be empty)
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

		// For empty strings, contentStart === contentEnd — cursor between
		// the two quotes should also match
		const cursorInQuotes = contentStart === contentEnd
			? column === contentStart
			: column >= contentStart && column <= contentEnd;

		if (cursorInQuotes) {
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
 * For array parameters with enum items, shows all enum options inline
 * inside the array brackets when the cursor is within the array.
 * Active (selected) items appear normal and sorted alphabetically first;
 * inactive (unselected) items appear grayed-out after them, also sorted.
 *
 * Clicking any item toggles its active/inactive state.
 * When the cursor leaves the array, the text collapses back to only
 * active values in a compact single-line format.
 */
function setupEnumArrayToggle(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema,
	trackedActiveValues: Map<string, Set<string>>
): monacoNs.IDisposable {
	const enumArrays = findEnumArrayProperties(schema);
	if (enumArrays.length === 0) {
		return { dispose: noop };
	}

	const decorationCollection = editor.createDecorationsCollection([]);
	const disposables: monacoNs.IDisposable[] = [];
	// Tracks whether we are programmatically editing the model to avoid re-entrant updates
	let suppressUpdates = false;
	// Tracks which enum array is currently expanded
	let expandedInfo: EnumArrayInfo | null = null;
	let cursorInsideArray = false;

	/**
	 * Check if the cursor is within any enum array's brackets.
	 */
	const isCursorInEnumArray = (position: monacoNs.IPosition): EnumArrayInfo | null => {
		const model = editor.getModel();
		if (!model) return null;

		for (const info of enumArrays) {
			const bounds = findArrayBounds(model, info.propertyName);
			if (!bounds) continue;

			const afterOpen = bounds.openLine < position.lineNumber ||
				(bounds.openLine === position.lineNumber && position.column > bounds.openCol);
			const beforeClose = bounds.closeLine > position.lineNumber ||
				(bounds.closeLine === position.lineNumber && position.column <= bounds.closeCol);

			if (afterOpen && beforeClose) return info;
		}
		return null;
	};

	/**
	 * Get active values for a property. Uses tracked state when expanded,
	 * falls back to parsing the model when collapsed.
	 */
	const getActiveValues = (model: monacoNs.editor.ITextModel, propertyName: string): Set<string> => {
		const tracked = trackedActiveValues.get(propertyName);
		if (tracked) return new Set(tracked);

		try {
			const parsed = JSON.parse(model.getValue()) as Record<string, unknown>;
			if (Array.isArray(parsed[propertyName])) {
				return new Set((parsed[propertyName] as unknown[]).map(String));
			}
		} catch {
			// JSON may be temporarily invalid during expansion
		}
		return new Set();
	};

	/**
	 * Build the expanded array text with all enum values (active + inactive).
	 * Active items sorted alphabetically first, then inactive items sorted alphabetically.
	 */
	const buildExpandedArrayText = (info: EnumArrayInfo, activeSet: Set<string>): string => {
		const sortedActive = info.enumValues
			.filter((v) => activeSet.has(v))
			.sort((a, b) => a.localeCompare(b));
		const sortedInactive = info.enumValues
			.filter((v) => !activeSet.has(v))
			.sort((a, b) => a.localeCompare(b));
		const allItems = [...sortedActive, ...sortedInactive];
		return `[${allItems.map((v) => `"${v}"`).join(', ')}]`;
	};

	/**
	 * Build the collapsed array text with only active values.
	 */
	const buildCollapsedArrayText = (info: EnumArrayInfo, activeSet: Set<string>): string => {
		const sortedActive = info.enumValues
			.filter((v) => activeSet.has(v))
			.sort((a, b) => a.localeCompare(b));
		return `[${sortedActive.map((v) => `"${v}"`).join(', ')}]`;
	};

	/**
	 * Apply decorations that gray out inactive enum values inside the array.
	 */
	const updateInlineDecorations = (
		model: monacoNs.editor.ITextModel,
		info: EnumArrayInfo,
		activeSet: Set<string>
	): void => {
		const bounds = findArrayBounds(model, info.propertyName);
		if (!bounds) {
			decorationCollection.set([]);
			return;
		}

		const line = model.getLineContent(bounds.openLine);
		const inactiveSet = new Set(info.enumValues.filter((v) => !activeSet.has(v)));

		const decos: monacoNs.editor.IModelDeltaDecoration[] = [];

		// Find each quoted value in the array and decorate them
		const arraySlice = line.substring(bounds.openCol); // Text after '['
		const regex = /"([^"\\]*)"/g;
		let match;
		while ((match = regex.exec(arraySlice)) !== null) {
			const value = match[1];
			const startCol = bounds.openCol + match.index + 1; // 1-based col of opening quote
			const endCol = startCol + match[0].length; // 1-based col after closing quote

			if (inactiveSet.has(value)) {
				// Inactive items: grayed-out italic with pointer cursor
				decos.push({
					options: {
						inlineClassName: 'enum-inactive-options'
					},
					range: new monacoNs.Range(bounds.openLine, startCol, bounds.openLine, endCol)
				});
			} else if (info.enumValues.includes(value)) {
				// Active items: pointer cursor only
				decos.push({
					options: {
						inlineClassName: 'json-clickable-value'
					},
					range: new monacoNs.Range(bounds.openLine, startCol, bounds.openLine, endCol)
				});
			}
		}

		decorationCollection.set(decos);
	};

	/**
	 * Expand array text to include inactive enum values as grayed-out items.
	 */
	const showInlineEnums = (info: EnumArrayInfo): void => {
		const model = editor.getModel();
		if (!model) return;

		const activeSet = getActiveValues(model, info.propertyName);
		trackedActiveValues.set(info.propertyName, new Set(activeSet));
		const newArrayText = buildExpandedArrayText(info, activeSet);

		const bounds = findArrayBounds(model, info.propertyName);
		if (!bounds) return;

		const currentArrayRange = new monacoNs.Range(
			bounds.openLine, bounds.openCol,
			bounds.closeLine, bounds.closeCol + 1
		);

		const currentText = model.getValueInRange(currentArrayRange);
		if (currentText !== newArrayText) {
			suppressUpdates = true;
			editor.executeEdits('enum-expand', [{
				forceMoveMarkers: true,
				range: currentArrayRange,
				text: newArrayText
			}]);
			suppressUpdates = false;
		}

		updateInlineDecorations(model, info, activeSet);
	};

	/**
	 * Collapse array back to only active values.
	 */
	const hideInlineEnums = (info: EnumArrayInfo): void => {
		const model = editor.getModel();
		if (!model) return;

		decorationCollection.set([]);

		// Use tracked active values (authoritative while expanded), then clear tracking
		const tracked = trackedActiveValues.get(info.propertyName);
		const activeSet = tracked ? new Set(tracked) : getActiveValues(model, info.propertyName);
		trackedActiveValues.delete(info.propertyName);
		const newArrayText = buildCollapsedArrayText(info, activeSet);

		const bounds = findArrayBounds(model, info.propertyName);
		if (!bounds) return;

		const currentArrayRange = new monacoNs.Range(
			bounds.openLine, bounds.openCol,
			bounds.closeLine, bounds.closeCol + 1
		);

		const currentText = model.getValueInRange(currentArrayRange);
		if (currentText === newArrayText) return;

		suppressUpdates = true;
		editor.executeEdits('enum-collapse', [{
			forceMoveMarkers: true,
			range: currentArrayRange,
			text: newArrayText
		}]);
		suppressUpdates = false;
	};

	// Cursor position listener — show/hide inline enums based on cursor location
	disposables.push(editor.onDidChangeCursorPosition((e) => {
		if (suppressUpdates) return;

		const inArray = isCursorInEnumArray(e.position);

		if (inArray) {
			if (!cursorInsideArray || expandedInfo?.propertyName !== inArray.propertyName) {
				// Cursor entered an enum array — collapse any previously expanded and expand new
				if (expandedInfo && expandedInfo.propertyName !== inArray.propertyName) {
					hideInlineEnums(expandedInfo);
				}
				cursorInsideArray = true;
				expandedInfo = inArray;
				showInlineEnums(inArray);
			}
		} else if (cursorInsideArray && expandedInfo) {
			// Cursor left the enum array — collapse back
			cursorInsideArray = false;
			hideInlineEnums(expandedInfo);
			expandedInfo = null;
		}
	}));

	// Click handler for toggling enum items
	disposables.push(editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;
		const model = editor.getModel();
		if (!model) return;

		if (!expandedInfo || !cursorInsideArray) return;

		const bounds = findArrayBounds(model, expandedInfo.propertyName);
		if (!bounds || position.lineNumber !== bounds.openLine) return;

		const line = model.getLineContent(position.lineNumber);

		// Find which quoted value was clicked
		const arraySlice = line.substring(bounds.openCol);
		const regex = /"([^"\\]*)"/g;
		let match;
		while ((match = regex.exec(arraySlice)) !== null) {
			const startCol = bounds.openCol + match.index + 1;
			const endCol = startCol + match[0].length;

			if (position.column >= startCol && position.column < endCol) {
				const clickedValue = match[1];
				if (!expandedInfo.enumValues.includes(clickedValue)) continue;

				// Toggle: read active set, flip this value, rebuild array
				const activeSet = getActiveValues(model, expandedInfo.propertyName);

				if (activeSet.has(clickedValue)) {
					activeSet.delete(clickedValue);
				} else {
					activeSet.add(clickedValue);
				}

				// Update tracked state so subsequent toggles and collapse use correct values
				trackedActiveValues.set(expandedInfo.propertyName, new Set(activeSet));

				// Build new expanded array text with toggled state
				const newArrayText = buildExpandedArrayText(expandedInfo, activeSet);
				const currentBounds = findArrayBounds(model, expandedInfo.propertyName);
				if (!currentBounds) return;

				const arrayRange = new monacoNs.Range(
					currentBounds.openLine, currentBounds.openCol,
					currentBounds.closeLine, currentBounds.closeCol + 1
				);

				suppressUpdates = true;
				editor.executeEdits('enum-toggle', [{
					forceMoveMarkers: true,
					range: arrayRange,
					text: newArrayText
				}]);

				updateInlineDecorations(model, expandedInfo, activeSet);

				// Position cursor inside the toggled item (without selecting it)
				const updatedBounds = findArrayBounds(model, expandedInfo.propertyName);
				if (updatedBounds) {
					const updatedLine = model.getLineContent(updatedBounds.openLine);
					const updatedSlice = updatedLine.substring(updatedBounds.openCol);
					const findRegex = /"([^"\\]*)"/g;
					let findMatch;
					while ((findMatch = findRegex.exec(updatedSlice)) !== null) {
						if (findMatch[1] === clickedValue) {
							const itemCol = updatedBounds.openCol + findMatch.index + 2;
							editor.setPosition({ column: itemCol, lineNumber: updatedBounds.openLine });
							break;
						}
					}
				}

				suppressUpdates = false;
				return;
			}
		}
	}));

	// When content changes externally, refresh expanded state
	disposables.push(editor.onDidChangeModelContent(() => {
		if (suppressUpdates) return;
		if (cursorInsideArray && expandedInfo) {
			showInlineEnums(expandedInfo);
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

interface ArrayBounds {
	closeCol: number;
	closeLine: number;
	openCol: number;
	openLine: number;
}

/**
 * Find the opening '[' and closing ']' positions for a given property's array value.
 * Returns 1-based line/column positions.
 */
function findArrayBounds(model: monacoNs.editor.ITextModel, propertyName: string): ArrayBounds | null {
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

	// Walk from the key line to find '[' and then the matching ']'
	let bracketDepth = 0;
	let foundOpen = false;
	let openLine = 0;
	let openCol = 0;

	for (let i = keyLine; i <= lineCount; i++) {
		const line = model.getLineContent(i);
		for (let c = 0; c < line.length; c++) {
			const ch = line[c];
			if (ch === '[') {
				if (!foundOpen) {
					openLine = i;
					openCol = c + 1; // 1-based
					foundOpen = true;
				}
				bracketDepth++;
			} else if (ch === ']') {
				bracketDepth--;
				if (foundOpen && bracketDepth === 0) {
					return {
						closeCol: c + 1, // 1-based
						closeLine: i,
						openCol,
						openLine
					};
				}
			}
		}
	}

	return null;
}

// ── Feature 5: Value Auto-Select on Arrow Keys ──────────────────────────────

/**
 * When arrow keys move the cursor to a position adjacent to (or within)
 * a JSON value (string, number, boolean, null), automatically select
 * the entire value. This makes it easy to replace values by just
 * pressing arrow keys and typing.
 *
 * Skips values inside enum arrays (handled by Feature 4) and
 * property keys (left side of colon).
 */
function setupValueAutoSelect(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const enumArrayProps = new Set(findEnumArrayProperties(schema).map((e) => e.propertyName));

	// Prevent re-entrant selection from our own setSelection call
	let settingSelection = false;
	// Track whether a value was selected so arrow keys can escape without re-selecting
	let hadSelection = false;

	const disposables: monacoNs.IDisposable[] = [];

	disposables.push(editor.onDidChangeCursorSelection((e) => {
		if (settingSelection) return;
		const sel = editor.getSelection();
		hadSelection = sel !== null && !sel.isEmpty();
	}));

	disposables.push(editor.onDidChangeCursorPosition((e) => {
		if (settingSelection) return;

		// Only auto-select on keyboard-driven cursor moves
		if (e.source !== 'keyboard') return;

		// If the user just collapsed a selection via arrow keys, let them escape
		if (hadSelection) {
			hadSelection = false;
			return;
		}

		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(e.position.lineNumber);
		const col = e.position.column;

		// Skip if cursor is inside an enum array
		if (isCursorInEnumArraySimple(model, e.position, enumArrayProps)) return;

		// Skip if cursor is on a property key (only select values)
		if (isCursorOnPropertyKey(line, col)) return;

		const valueRange = findJsonValueRange(line, col);
		if (!valueRange) return;

		settingSelection = true;
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				e.position.lineNumber, valueRange.start,
				e.position.lineNumber, valueRange.end
			));
			settingSelection = false;
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
 * Check if cursor is on a JSON property key (left side of colon).
 */
function isCursorOnPropertyKey(line: string, column: number): boolean {
	const idx = column - 1; // 0-based
	const colonIdx = line.indexOf(':');
	if (colonIdx === -1) return false;
	return idx <= colonIdx;
}

/**
 * Simple check if cursor is inside any enum array brackets.
 */
function isCursorInEnumArraySimple(
	model: monacoNs.editor.ITextModel,
	position: monacoNs.IPosition,
	enumArrayProps: Set<string>
): boolean {
	for (const propName of enumArrayProps) {
		const bounds = findArrayBounds(model, propName);
		if (!bounds) continue;

		const afterOpen = bounds.openLine < position.lineNumber ||
			(bounds.openLine === position.lineNumber && position.column > bounds.openCol);
		const beforeClose = bounds.closeLine > position.lineNumber ||
			(bounds.closeLine === position.lineNumber && position.column <= bounds.closeCol);

		if (afterOpen && beforeClose) return true;
	}
	return false;
}

/**
 * Find the full range of a JSON value at or adjacent to a column position.
 * Handles: strings ("value"), numbers (123, -5), booleans (true, false), null.
 * Returns 1-based { start, end } range (end is exclusive) or null.
 */
function findJsonValueRange(line: string, column: number): null | { end: number; start: number } {
	// Check the current position and one position to each side
	const positions = [column, column - 1, column + 1];
	for (const col of positions) {
		if (col < 1 || col > line.length + 1) continue;

		const stringRange = findStringLiteralRange(line, col);
		if (stringRange) return stringRange;

		const numRange = findNumberRange(line, col);
		if (numRange) return numRange;

		const keywordRange = findKeywordRange(line, col);
		if (keywordRange) return keywordRange;
	}

	return null;
}

/**
 * Find the full range of a quoted string value at a column position.
 * Only matches value strings (right side of colon), not property keys.
 * Returns 1-based { start, end } range excluding quotes (content only), or null.
 * For empty strings, start === end (cursor position between quotes).
 */
function findStringLiteralRange(line: string, column: number): null | { end: number; start: number } {
	const idx = column - 1; // 0-based

	const regex = /"([^"\\]*)"/g;
	let match;
	while ((match = regex.exec(line)) !== null) {
		const matchStart = match.index; // 0-based, opening quote
		const matchEnd = match.index + match[0].length; // 0-based, after closing quote

		if (idx >= matchStart && idx < matchEnd) {
			// Make sure this is a value (right of colon), not a key
			const prefix = line.substring(0, matchStart).trimEnd();
			if (!prefix.endsWith(':')) continue;

			// Content range: after opening quote, before closing quote
			const contentStart = matchStart + 2; // 1-based, after opening quote
			const contentEnd = matchEnd; // 1-based, at closing quote (exclusive)

			return {
				end: contentEnd,
				start: contentStart
			};
		}
	}
	return null;
}

/**
 * Find the full range of a keyword (true, false, null) at a column position.
 * Only matches values (right side of colon).
 * Returns 1-based { start, end } range or null.
 */
function findKeywordRange(line: string, column: number): null | { end: number; start: number } {
	const keywords = ['true', 'false', 'null'];

	for (const keyword of keywords) {
		const regex = new RegExp(`\\b${keyword}\\b`, 'g');
		let match;
		while ((match = regex.exec(line)) !== null) {
			const matchStart = match.index; // 0-based
			const matchEnd = match.index + keyword.length; // 0-based

			const idx = column - 1;
			if (idx >= matchStart && idx <= matchEnd) {
				// Verify it's not inside a string
				const prefix = line.substring(0, matchStart);
				const quoteCount = (prefix.match(/(?<!\\)"/g) ?? []).length;
				if (quoteCount % 2 !== 0) continue;

				// Check it's on the value side (after a colon, comma, or opening bracket)
				const beforeValue = prefix.trimEnd();
				if (!beforeValue.endsWith(':') && !beforeValue.endsWith(',') && !beforeValue.endsWith('[')) continue;

				return {
					end: matchEnd + 1, // 1-based exclusive
					start: matchStart + 1 // 1-based
				};
			}
		}
	}

	return null;
}

// ── Feature 6: Clickable Value Cursor Decorations ────────────────────────────

/**
 * Adds pointer (hand) cursor decorations on boolean values so they
 * visually indicate clickability. Enum array items already get pointer
 * cursors from their own CSS class.
 */
function setupClickableCursorDecorations(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const enumArrayProps = new Set(findEnumArrayProperties(schema).map((e) => e.propertyName));
	const decorationCollection = editor.createDecorationsCollection([]);

	const updateDecorations = (): void => {
		const model = editor.getModel();
		if (!model) return;

		const decos: monacoNs.editor.IModelDeltaDecoration[] = [];
		const lineCount = model.getLineCount();

		for (let i = 1; i <= lineCount; i++) {
			const line = model.getLineContent(i);

			// Skip lines inside enum arrays (they have their own cursor styling)
			if (isLineInsideEnumArray(model, i, enumArrayProps)) continue;

			// Find boolean values (true/false) on the value side of a colon
			const boolRegex = /\b(true|false)\b/g;
			let match;
			while ((match = boolRegex.exec(line)) !== null) {
				const prefix = line.substring(0, match.index);
				const quoteCount = (prefix.match(/(?<!\\)"/g) ?? []).length;
				if (quoteCount % 2 !== 0) continue; // Inside a string

				const beforeValue = prefix.trimEnd();
				if (!beforeValue.endsWith(':')) continue;

				decos.push({
					options: { inlineClassName: 'json-clickable-value' },
					range: new monacoNs.Range(
						i, match.index + 1,
						i, match.index + match[0].length + 1
					)
				});
			}
		}

		decorationCollection.set(decos);
	};

	updateDecorations();
	const contentDisposable = editor.onDidChangeModelContent(() => updateDecorations());

	return {
		dispose() {
			decorationCollection.clear();
			contentDisposable.dispose();
		}
	};
}

/**
 * Check if a given line number is inside any enum array's brackets.
 */
function isLineInsideEnumArray(
	model: monacoNs.editor.ITextModel,
	lineNumber: number,
	enumArrayProps: Set<string>
): boolean {
	for (const propName of enumArrayProps) {
		const bounds = findArrayBounds(model, propName);
		if (!bounds) continue;

		if (lineNumber >= bounds.openLine && lineNumber <= bounds.closeLine) return true;
	}
	return false;
}

// ── Feature 7: Tab Toggle ────────────────────────────────────────────────────

/**
 * Tab key toggles the value under the cursor:
 * - Boolean values: true↔false
 * - Enum array items: toggle active/inactive
 */
function setupTabToggle(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema,
	trackedActiveValues: Map<string, Set<string>>
): monacoNs.IDisposable {
	const enumArrays = findEnumArrayProperties(schema);

	return editor.onKeyDown((e) => {
		if (e.keyCode !== monacoNs.KeyCode.Tab) return;

		const model = editor.getModel();
		if (!model) return;

		const position = editor.getPosition();
		if (!position) return;

		const line = model.getLineContent(position.lineNumber);

		// Check if on a boolean value
		const word = model.getWordAtPosition(position);
		if (word && (word.word === 'true' || word.word === 'false')) {
			// Verify it's a value (not inside a string or key)
			const prefix = line.substring(0, word.startColumn - 1);
			const quoteCount = (prefix.match(/(?<!\\)"/g) ?? []).length;
			if (quoteCount % 2 === 0) {
				const beforeValue = prefix.trimEnd();
				if (beforeValue.endsWith(':')) {
					e.preventDefault();
					e.stopPropagation();

					const newValue = word.word === 'true' ? 'false' : 'true';
					const range = new monacoNs.Range(
						position.lineNumber, word.startColumn,
						position.lineNumber, word.endColumn
					);
					editor.executeEdits('tab-toggle', [{
						forceMoveMarkers: true,
						range,
						text: newValue
					}]);
					return;
				}
			}
		}

		// Check if cursor is inside an enum array on a value
		for (const info of enumArrays) {
			const bounds = findArrayBounds(model, info.propertyName);
			if (!bounds) continue;

			const afterOpen = bounds.openLine < position.lineNumber ||
				(bounds.openLine === position.lineNumber && position.column > bounds.openCol);
			const beforeClose = bounds.closeLine > position.lineNumber ||
				(bounds.closeLine === position.lineNumber && position.column <= bounds.closeCol);

			if (!afterOpen || !beforeClose) continue;

			// Find which quoted value the cursor is on/in
			const arraySlice = line.substring(bounds.openCol);
			const regex = /"([^"\\]*)"/g;
			let match;
			while ((match = regex.exec(arraySlice)) !== null) {
				const startCol = bounds.openCol + match.index + 1;
				const endCol = startCol + match[0].length;

				if (position.column >= startCol && position.column < endCol) {
					const itemValue = match[1];
					if (!info.enumValues.includes(itemValue)) continue;

					e.preventDefault();
					e.stopPropagation();

					// Use tracked active values (authoritative while expanded)
					const tracked = trackedActiveValues.get(info.propertyName);
					const activeSet = tracked ? new Set(tracked) : new Set<string>();

					if (activeSet.has(itemValue)) {
						activeSet.delete(itemValue);
					} else {
						activeSet.add(itemValue);
					}

					// Update tracked state
					trackedActiveValues.set(info.propertyName, new Set(activeSet));

					const sortedActive = info.enumValues
						.filter((v) => activeSet.has(v))
						.sort((a, b) => a.localeCompare(b));
					const sortedInactive = info.enumValues
						.filter((v) => !activeSet.has(v))
						.sort((a, b) => a.localeCompare(b));
					const allItems = [...sortedActive, ...sortedInactive];
					const newArrayText = `[${allItems.map((v) => `"${v}"`).join(', ')}]`;

					const currentBounds = findArrayBounds(model, info.propertyName);
					if (!currentBounds) return;

					const arrayRange = new monacoNs.Range(
						currentBounds.openLine, currentBounds.openCol,
						currentBounds.closeLine, currentBounds.closeCol + 1
					);

					editor.executeEdits('tab-toggle-enum', [{
						forceMoveMarkers: true,
						range: arrayRange,
						text: newArrayText
					}]);
					return;
				}
			}
		}
	});
}

// ── Feature 8: Up/Down Field Navigation ──────────────────────────────────────

/**
 * Up/down arrow keys navigate between JSON property values on adjacent lines.
 * When pressed, the cursor moves to the value on the previous/next line and
 * selects it (content only, excluding quotes for strings).
 */
function setupFieldNavigation(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const enumArrayProps = new Set(findEnumArrayProperties(schema).map((e) => e.propertyName));

	return editor.onKeyDown((e) => {
		if (e.keyCode !== monacoNs.KeyCode.UpArrow && e.keyCode !== monacoNs.KeyCode.DownArrow) return;

		const model = editor.getModel();
		if (!model) return;

		const position = editor.getPosition();
		if (!position) return;

		// Don't intercept if cursor is inside an enum array (let Feature 4 handle it)
		if (isCursorInEnumArraySimple(model, position, enumArrayProps)) return;

		const direction = e.keyCode === monacoNs.KeyCode.UpArrow ? -1 : 1;
		const targetLine = position.lineNumber + direction;

		if (targetLine < 1 || targetLine > model.getLineCount()) return;

		const targetLineContent = model.getLineContent(targetLine);

		// Find a value on the target line
		const valueRange = findValueOnLine(targetLineContent);
		if (!valueRange) return;

		e.preventDefault();
		e.stopPropagation();

		// Select the value content on the target line
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				targetLine, valueRange.start,
				targetLine, valueRange.end
			));
			editor.revealLineInCenterIfOutsideViewport(targetLine);
		});
	});
}

/**
 * Find the first value on a line and return its content range
 * (excluding quotes for strings).
 */
function findValueOnLine(line: string): null | { end: number; start: number } {
	const colonIdx = line.indexOf(':');
	if (colonIdx === -1) return null;

	const afterColon = line.substring(colonIdx + 1).trimStart();
	const valueStartIdx = line.indexOf(afterColon, colonIdx + 1);

	if (afterColon.startsWith('"')) {
		// String value — select content between quotes (excluding quotes)
		const openQuote = valueStartIdx;
		const closeQuote = line.indexOf('"', openQuote + 1);
		if (closeQuote === -1) return null;

		// Content range (1-based), excluding quotes
		const contentStart = openQuote + 2; // After opening quote
		const contentEnd = closeQuote + 1; // At closing quote (exclusive)

		// If empty string, still return the position between quotes
		return { end: contentEnd, start: contentStart };
	}

	// Non-string: boolean, number, null, or array
	if (afterColon.startsWith('[')) {
		// Array — don't select, but place cursor inside
		return { end: valueStartIdx + 2, start: valueStartIdx + 2 };
	}

	// Boolean, number, null
	const valueMatch = afterColon.match(/^(true|false|null|-?\d+)/);
	if (valueMatch) {
		return {
			end: valueStartIdx + valueMatch[0].length + 1, // 1-based exclusive
			start: valueStartIdx + 1 // 1-based
		};
	}

	return null;
}