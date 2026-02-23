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

// ── Logging ──────────────────────────────────────────────────────────────────

const LOG_ENDPOINT = '/api/log';

/**
 * Send log messages to the server to appear in VS Code output panel.
 * Fire-and-forget, non-blocking. Falls back silently if server unavailable.
 */
function log(message: string): void {
	fetch(LOG_ENDPOINT, {
		body: JSON.stringify({ message }),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST'
	}).catch(() => {
		// Silently ignore if server is unavailable
	});
}

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
	disposables.push(setupSymbolIntellisense(editor, schema));
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
 * Single-click on `true` or `false` selects the value so the user can
 * immediately type a replacement. Tab toggles the value instead.
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

		// Verify it's a value (right side of colon)
		const line = model.getLineContent(position.lineNumber);
		const prefix = line.substring(0, word.startColumn - 1);
		const quoteCount = (prefix.match(/(?<!\\)"/g) ?? []).length;
		if (quoteCount % 2 !== 0) return;
		const beforeValue = prefix.trimEnd();
		if (!beforeValue.endsWith(':')) return;

		// Select the entire boolean value
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				position.lineNumber, word.startColumn,
				position.lineNumber, word.endColumn
			));
		});
	});
}

// ── Feature 2: Integer Select on Click ───────────────────────────────────────

/**
 * Single-click on a number value selects the entire number,
 * so the user can immediately start typing a replacement.
 * Also selects null keywords and handles edge-clicks on values
 * (when cursor is at the boundary of the value container).
 */
function setupIntegerSelect(editor: monacoNs.editor.IStandaloneCodeEditor): monacoNs.IDisposable {
	return editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;

		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(position.lineNumber);

		// Skip if on property key
		if (isCursorOnPropertyKey(line, position.column)) return;

		// Try to find any value at or adjacent to click position
		const valueRange = findJsonValueRange(line, position.column);
		if (!valueRange) return;

		// Don't interfere with boolean handler (already handles its own selection)
		const word = model.getWordAtPosition(position);
		if (word && (word.word === 'true' || word.word === 'false')) return;

		// Defer selection so Monaco's default click handling finishes first
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				position.lineNumber, valueRange.start,
				position.lineNumber, valueRange.end
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
	debug?: {
		requestedPath: string;
		targetDir: string;
		workspaceRoot: string;
	};
	entries: BrowseEntry[];
	error?: string;
	root: string;
}

/**
 * Registers filesystem path completions for file/dir string fields.
 * Completions are triggered manually (Tab in an empty field) rather than
 * auto-shown whenever the cursor enters the field.
 */
function setupFilePathIntellisense(
	_editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const fileProps = findFilePathProperties(schema);
	if (fileProps.size === 0) {
		return { dispose: noop };
	}

	return monacoNs.languages.registerCompletionItemProvider('json', {
		provideCompletionItems: async (model, position) => {
			return providePathCompletions(model, position, fileProps);
		},
		triggerCharacters: ['/', '\\', '"']
	});
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
	log(`[findStringValueRange] line: ${JSON.stringify(line)}`);
	log(`[findStringValueRange] column: ${column} fileProps: ${[...fileProps]}`);

	// Two-pass approach: first find the property key (keys never contain backslashes),
	// then locate the value boundaries by scanning for quotes while skipping \\ escapes.
	// This handles Windows paths (C:\\Users\\...) that break the single-regex approach.
	const keyRegex = /"([^"\\]*)"\s*:/g;
	let match;
	while ((match = keyRegex.exec(line)) !== null) {
		const propName = match[1];
		log(`[findStringValueRange]   Found property: ${JSON.stringify(propName)}`);
		if (!fileProps.has(propName)) {
			log(`[findStringValueRange]   → Not a file prop, skipping`);
			continue;
		}

		// Find the opening quote of the value (after the ':')
		const afterColonIdx = match.index + match[0].length;
		const openQuoteIdx = line.indexOf('"', afterColonIdx);
		if (openQuoteIdx === -1) continue;

		// Walk forward to find the closing quote, skipping \\-escaped characters
		let closeQuoteIdx = openQuoteIdx + 1;
		while (closeQuoteIdx < line.length) {
			if (line[closeQuoteIdx] === '\\') {
				closeQuoteIdx += 2; // skip the escaped character
				continue;
			}
			if (line[closeQuoteIdx] === '"') break;
			closeQuoteIdx++;
		}
		if (closeQuoteIdx >= line.length) continue;

		// Content is between the quotes (1-based columns)
		const contentStart = openQuoteIdx + 2; // 1-based, character after opening quote
		const contentEnd = closeQuoteIdx + 1;   // 1-based, at the closing quote

		log(`[findStringValueRange]   openQuoteIdx: ${openQuoteIdx} closeQuoteIdx: ${closeQuoteIdx}`);
		log(`[findStringValueRange]   contentStart: ${contentStart} contentEnd: ${contentEnd}`);

		// For empty strings contentStart === contentEnd — cursor exactly between quotes matches
		const cursorInQuotes = contentStart === contentEnd
			? column === contentStart
			: column >= contentStart && column <= contentEnd;

		log(`[findStringValueRange]   cursorInQuotes: ${cursorInQuotes} (column ${column} in range ${contentStart}-${contentEnd})`);

		if (cursorInQuotes) {
			log(`[findStringValueRange]   → MATCH!`);
			return { contentEnd, contentStart, propertyName: propName };
		}
	}
	log(`[findStringValueRange]   → No match found`);
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
	log(`[intellisense] providePathCompletions called`);
	log(`[intellisense]   line: ${JSON.stringify(line)}`);
	log(`[intellisense]   position: ${position.lineNumber} ${position.column}`);
	log(`[intellisense]   fileProps: ${[...fileProps]}`);

	const stringRange = findStringValueRange(line, position.column, fileProps);
	log(`[intellisense]   stringRange: ${JSON.stringify(stringRange)}`);
	if (!stringRange) {
		log(`[intellisense]   → No string range found, returning empty`);
		return empty;
	}

	// Extract the FULL path value (not just up to cursor) so folder navigation works
	const fullValue = line.substring(stringRange.contentStart - 1, stringRange.contentEnd - 1);
	log(`[intellisense]   fullValue: ${JSON.stringify(fullValue)}`);

	// Determine the directory to browse based on full path
	const lastSlash = Math.max(fullValue.lastIndexOf('/'), fullValue.lastIndexOf('\\'));
	const dirPath = lastSlash >= 0 ? fullValue.substring(0, lastSlash) : '';
	log(`[intellisense]   lastSlash: ${lastSlash} dirPath: ${JSON.stringify(dirPath)}`);

	// Prefix for filtering is everything after the last slash (what user is typing)
	const cursorOffset = position.column - stringRange.contentStart;
	const textBeforeCursor = fullValue.substring(0, cursorOffset);
	const lastSlashBeforeCursor = Math.max(textBeforeCursor.lastIndexOf('/'), textBeforeCursor.lastIndexOf('\\'));
	const prefix = lastSlashBeforeCursor >= 0 ? textBeforeCursor.substring(lastSlashBeforeCursor + 1) : textBeforeCursor;
	log(`[intellisense]   cursorOffset: ${cursorOffset} textBeforeCursor: ${JSON.stringify(textBeforeCursor)}`);
	log(`[intellisense]   lastSlashBeforeCursor: ${lastSlashBeforeCursor} prefix: ${JSON.stringify(prefix)}`);

	try {
		const url = `${BROWSE_ENDPOINT}?path=${encodeURIComponent(dirPath)}`;
		log(`[intellisense]   Fetching: ${url}`);
		const response = await fetch(url);
		log(`[intellisense]   Response status: ${response.status} ${response.ok}`);
		if (!response.ok) {
			log(`[intellisense]   → Response not OK, returning empty`);
			return empty;
		}

		const data = await response.json() as BrowseResponse;
		log(`[intellisense]   DEBUG from server: ${JSON.stringify(data.debug)}`);
		if (data.error) {
			log(`[intellisense]   Server error: ${data.error}`);
		}
		log(`[intellisense]   Entries count: ${data.entries.length}`);
		log(`[intellisense]   First 5 entries: ${JSON.stringify(data.entries.slice(0, 5))}`);

		const replaceRange = new monacoNs.Range(
			position.lineNumber, stringRange.contentStart,
			position.lineNumber, stringRange.contentEnd
		);
		log(`[intellisense]   replaceRange: ${replaceRange.startColumn} - ${replaceRange.endColumn}`);

		const filtered = data.entries.filter((entry) => {
			if (!entry.name.toLowerCase().startsWith(prefix.toLowerCase())) return false;
			// Don't offer a suggestion for the path that is already fully typed in the field
			const insertPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
			const insertText = entry.type === 'dir' ? `${insertPath}/` : insertPath;
			return insertText !== fullValue;
		});
		log(`[intellisense]   Filtered count (prefix=${JSON.stringify(prefix)}): ${filtered.length}`);

		const suggestions: monacoNs.languages.CompletionItem[] = filtered
			.map((entry, idx) => {
				const insertPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
				const insertText = entry.type === 'dir' ? `${insertPath}/` : insertPath;
				const item: monacoNs.languages.CompletionItem = {
					// filterText must match the whole path so Monaco's built-in word filter
					// doesn't hide suggestions. Monaco checks "does filterText start with the
					// text from range.startColumn to cursor?". Since insertText is always an
					// extension of the current value (e.g. "hw-workspace/src/" extends
					// "hw-workspace/"), this passes the filter for all matching entries.
					filterText: insertText,
					insertText,
					kind: entry.type === 'dir'
						? monacoNs.languages.CompletionItemKind.Folder
						: monacoNs.languages.CompletionItemKind.File,
					label: entry.name,
					range: replaceRange,
					sortText: `${entry.type === 'dir' ? '0' : '1'}${String(idx).padStart(4, '0')}`
				};
				// Re-trigger suggestions after accepting a directory so its contents appear
				if (entry.type === 'dir') {
					item.command = { id: 'editor.action.triggerSuggest', title: 'Browse' };
				}
				return item;
			});

		log(`[intellisense]   Returning ${suggestions.length} suggestions`);
		return { incomplete: true, suggestions };
	} catch (err) {
		log(`[intellisense]   ERROR: ${String(err)}`);
		return empty;
	}
}

// ── Feature 3b: Symbol Intellisense ──────────────────────────────────────────

const SYMBOLS_ENDPOINT = '/api/symbols';

interface SymbolEntry {
	kind: string;
	name: string;
}

interface SymbolsResponse {
	error?: string;
	symbols: SymbolEntry[];
}

/**
 * Find schema properties that represent code symbol names, paired with the
 * file-path property they read symbols from.
 * Returns a Map<symbolPropName, filePropName>.
 */
function findSymbolProperties(schema: JsonSchema): Map<string, string> {
	const result = new Map<string, string>();
	if (!schema.properties) return result;

	const propNames = Object.keys(schema.properties);
	// Only the literal property name "symbol" for now — covers file_read and file_edit
	const symbolProps = propNames.filter((n) => n === 'symbol');
	if (symbolProps.length === 0) return result;

	// Pair with the first file-path property found in the same schema
	const fileProp = propNames.find((n) => FILE_DIR_PROPERTY_NAMES.has(n));
	if (!fileProp) return result;

	for (const sp of symbolProps) {
		result.set(sp, fileProp);
	}
	return result;
}

/**
 * Read the current JSON string value of a named property from the model.
 * Handles basic JSON string escapes. Returns null if the property is missing
 * or its value is not a string.
 */
function readStringPropertyValue(model: monacoNs.editor.ITextModel, propertyName: string): null | string {
	const keyPattern = `"${propertyName}"`;
	for (let i = 1; i <= model.getLineCount(); i++) {
		const line = model.getLineContent(i);
		const keyIdx = line.indexOf(keyPattern);
		if (keyIdx === -1) continue;
		const afterKey = line.substring(keyIdx + keyPattern.length);
		const match = afterKey.match(/^\s*:\s*"((?:[^"\\]|\\.)*)"/);
		if (match) {
			return match[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
		}
	}
	return null;
}

/** Map a VS Code DocumentSymbol kind string to a Monaco CompletionItemKind. */
function symbolKindToCompletionKind(kind: string): monacoNs.languages.CompletionItemKind {
	switch (kind.toLowerCase()) {
		case 'class': return monacoNs.languages.CompletionItemKind.Class;
		case 'function': return monacoNs.languages.CompletionItemKind.Function;
		case 'method': return monacoNs.languages.CompletionItemKind.Method;
		case 'property': return monacoNs.languages.CompletionItemKind.Property;
		case 'field': return monacoNs.languages.CompletionItemKind.Field;
		case 'variable': return monacoNs.languages.CompletionItemKind.Variable;
		case 'constant': return monacoNs.languages.CompletionItemKind.Constant;
		case 'interface': return monacoNs.languages.CompletionItemKind.Interface;
		case 'enum': return monacoNs.languages.CompletionItemKind.Enum;
		case 'enummember': return monacoNs.languages.CompletionItemKind.EnumMember;
		case 'namespace':
		case 'module': return monacoNs.languages.CompletionItemKind.Module;
		case 'constructor': return monacoNs.languages.CompletionItemKind.Constructor;
		case 'struct': return monacoNs.languages.CompletionItemKind.Struct;
		case 'typeparameter': return monacoNs.languages.CompletionItemKind.TypeParameter;
		default: return monacoNs.languages.CompletionItemKind.Text;
	}
}

/**
 * Registers symbol completions for symbol string fields.
 * Completions are triggered manually (Tab in an empty field) rather than
 * auto-shown whenever the cursor enters the field.
 */
function setupSymbolIntellisense(
	_editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const symbolProps = findSymbolProperties(schema);
	if (symbolProps.size === 0) {
		return { dispose: noop };
	}

	const symbolPropNames = new Set(symbolProps.keys());

	// In-memory cache so we don't re-fetch on every keystroke
	let cachedFilePath: null | string = null;
	let cachedSymbols: SymbolEntry[] = [];

	return monacoNs.languages.registerCompletionItemProvider('json', {
		provideCompletionItems: async (model, position) => {
			const empty: monacoNs.languages.CompletionList = { suggestions: [] };

			const line = model.getLineContent(position.lineNumber);
			const valueRange = findStringValueRange(line, position.column, symbolPropNames);
			if (!valueRange) return empty;

			const fileProp = symbolProps.get(valueRange.propertyName);
			if (!fileProp) return empty;

			const filePath = readStringPropertyValue(model, fileProp);
			if (!filePath) return empty;

			if (filePath !== cachedFilePath) {
				try {
					const resp = await fetch(`${SYMBOLS_ENDPOINT}?file=${encodeURIComponent(filePath)}`);
					if (!resp.ok) return empty;
					const data = await resp.json() as SymbolsResponse;
					cachedFilePath = filePath;
					cachedSymbols = data.symbols ?? [];
				} catch {
					return empty;
				}
			}

			if (cachedSymbols.length === 0) return empty;

			const replaceRange = new monacoNs.Range(
				position.lineNumber, valueRange.contentStart,
				position.lineNumber, valueRange.contentEnd
			);

			// Don't offer a suggestion for the value that is already fully typed
			const currentValue = line.substring(valueRange.contentStart - 1, valueRange.contentEnd - 1);
			const visibleSymbols = cachedSymbols.filter((sym) => sym.name !== currentValue);

			const suggestions: monacoNs.languages.CompletionItem[] = visibleSymbols.map((sym, idx) => ({
				detail: sym.kind,
				filterText: sym.name,
				insertText: sym.name,
				kind: symbolKindToCompletionKind(sym.kind),
				label: sym.name,
				range: replaceRange,
				sortText: String(idx).padStart(6, '0')
			}));

			return { suggestions };
		},
		triggerCharacters: ['"', '.']
	});
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

	// Click handler for selecting enum items (Tab toggles them)
	disposables.push(editor.onMouseUp((e) => {
		if (e.target.type !== monacoNs.editor.MouseTargetType.CONTENT_TEXT) return;

		const { position } = e.target;
		const model = editor.getModel();
		if (!model) return;

		if (!expandedInfo || !cursorInsideArray) return;

		const bounds = findArrayBounds(model, expandedInfo.propertyName);
		if (!bounds || position.lineNumber !== bounds.openLine) return;

		const line = model.getLineContent(position.lineNumber);

		// Find which quoted value was clicked and select it
		const arraySlice = line.substring(bounds.openCol);
		const regex = /"([^"\\]*)"/g;
		let match;
		while ((match = regex.exec(arraySlice)) !== null) {
			const startCol = bounds.openCol + match.index + 1;
			const endCol = startCol + match[0].length;

			if (position.column >= startCol && position.column < endCol) {
				const clickedValue = match[1];
				if (!expandedInfo.enumValues.includes(clickedValue)) continue;

				// Select the content only (excluding quotes) to match findArrayItemsOnLine
				const contentStart = startCol + 1;
				const contentEnd = contentStart + match[1].length;
				queueMicrotask(() => {
					editor.setSelection(new monacoNs.Selection(
						position.lineNumber, contentStart,
						position.lineNumber, contentEnd
					));
				});
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
 * Inside enum arrays, selects the nearest quoted item. Left/right
 * arrows navigate between array items when one is selected.
 */
function setupValueAutoSelect(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	schema: JsonSchema
): monacoNs.IDisposable {
	const enumArrayProps = new Set(findEnumArrayProperties(schema).map((e) => e.propertyName));

	let settingSelection = false;
	let hadSelection = false;
	// Range the user escaped from — won't be re-selected until a different range is reached
	let escapedRange: { end: number; line: number; start: number } | null = null;
	let suppressAutoSelect = false;

	const disposables: monacoNs.IDisposable[] = [];

	disposables.push(editor.onDidChangeCursorSelection(() => {
		if (settingSelection) return;
		const sel = editor.getSelection();
		hadSelection = sel !== null && !sel.isEmpty();
	}));

	disposables.push(editor.onDidChangeModelContent(() => {
		if (settingSelection) return;
		suppressAutoSelect = true;
		escapedRange = null;
	}));

	disposables.push(editor.onDidChangeCursorPosition((e) => {
		if (settingSelection) return;

		if (suppressAutoSelect) {
			suppressAutoSelect = false;
			return;
		}

		const model = editor.getModel();
		if (!model) return;

		const line = model.getLineContent(e.position.lineNumber);
		const col = e.position.column;

		// When the user collapses a selection via arrow keys, record the escaped range
		// Arrays are exempt — Left/Right navigates between items, not escapes
		if (hadSelection) {
			hadSelection = false;
			if (findArrayItemsOnLine(line).length > 0) return;

			const valueRange = findJsonValueRange(line, col);
			if (valueRange) {
				escapedRange = { end: valueRange.end, line: e.position.lineNumber, start: valueRange.start };
			}
			return;
		}

		// Inside an enum array: select the nearest quoted item
		if (isCursorInEnumArraySimple(model, e.position, enumArrayProps)) {
			const itemRange = findEnumItemAtPosition(model, e.position, enumArrayProps);
			if (itemRange && !isEscapedRange(escapedRange, e.position.lineNumber, itemRange)) {
				escapedRange = null;
				settingSelection = true;
				queueMicrotask(() => {
					editor.setSelection(new monacoNs.Selection(
						e.position.lineNumber, itemRange.start,
						e.position.lineNumber, itemRange.end
					));
					settingSelection = false;
				});
			}
			return;
		}

		if (isCursorOnPropertyKey(line, col)) return;

		const valueRange = findJsonValueRange(line, col);
		if (!valueRange) return;

		if (isEscapedRange(escapedRange, e.position.lineNumber, valueRange)) return;

		escapedRange = null;
		settingSelection = true;
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				e.position.lineNumber, valueRange.start,
				e.position.lineNumber, valueRange.end
			));
			settingSelection = false;
		});
	}));

	// Left/right arrow navigation between array items
	disposables.push(editor.onKeyDown((e) => {
		if (e.keyCode !== monacoNs.KeyCode.LeftArrow && e.keyCode !== monacoNs.KeyCode.RightArrow) return;

		const model = editor.getModel();
		if (!model) return;

		const position = editor.getPosition();
		if (!position) return;

		const line = model.getLineContent(position.lineNumber);

		// Find all quoted items in any array on this line
		const items = findArrayItemsOnLine(line);
		if (items.length === 0) return;

		// Find which item the cursor is within (not exact match)
		const col = position.column;
		const currentIdx = items.findIndex((r) => col >= r.start && col <= r.end);
		if (currentIdx === -1) return;

		const direction = e.keyCode === monacoNs.KeyCode.LeftArrow ? -1 : 1;
		const nextIdx = currentIdx + direction;
		if (nextIdx < 0 || nextIdx >= items.length) return;

		e.preventDefault();
		e.stopPropagation();

		const nextItem = items[nextIdx];
		settingSelection = true;
		queueMicrotask(() => {
			editor.setSelection(new monacoNs.Selection(
				position.lineNumber, nextItem.start,
				position.lineNumber, nextItem.end
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

/** Returns true if the given range matches the currently escaped range. */
function isEscapedRange(
	escaped: { end: number; line: number; start: number } | null,
	lineNumber: number,
	range: { end: number; start: number }
): boolean {
	return escaped !== null &&
		escaped.line === lineNumber &&
		escaped.start === range.start &&
		escaped.end === range.end;
}

/**
 * Find the quoted enum item at or adjacent to the cursor's column position
 * inside an enum array. Returns the 1-based range of the full quoted value
 * (including quotes) or null.
 */
function findEnumItemAtPosition(
	model: monacoNs.editor.ITextModel,
	position: monacoNs.IPosition,
	enumArrayProps: Set<string>
): null | { end: number; start: number } {
	for (const propName of enumArrayProps) {
		const bounds = findArrayBounds(model, propName);
		if (!bounds) continue;

		const afterOpen = bounds.openLine < position.lineNumber ||
			(bounds.openLine === position.lineNumber && position.column > bounds.openCol);
		const beforeClose = bounds.closeLine > position.lineNumber ||
			(bounds.closeLine === position.lineNumber && position.column <= bounds.closeCol);

		if (!afterOpen || !beforeClose) continue;

		const line = model.getLineContent(bounds.openLine);
		const arraySlice = line.substring(bounds.openCol);
		const regex = /"([^"\\]*)"/g;
		let match;
		let bestMatch: null | { end: number; start: number } = null;
		let bestDist = Infinity;

		while ((match = regex.exec(arraySlice)) !== null) {
			// Full range (including quotes) for cursor hit-detection
			const fullStart = bounds.openCol + match.index + 1;
			const fullEnd = fullStart + match[0].length;
			// Content range (excluding quotes) for the selection
			const contentStart = fullStart + 1;
			const contentEnd = contentStart + match[1].length;

			// Direct hit or adjacent — use the full quoted range for detection
			if (position.column >= fullStart && position.column <= fullEnd) {
				return { end: contentEnd, start: contentStart };
			}

			// Find nearest item for adjacent navigation
			const dist = Math.min(
				Math.abs(position.column - fullStart),
				Math.abs(position.column - fullEnd)
			);
			if (dist < bestDist) {
				bestDist = dist;
				bestMatch = { end: contentEnd, start: contentStart };
			}
		}

		// Select the nearest item if cursor is within 2 chars
		if (bestMatch && bestDist <= 2) return bestMatch;
	}
	return null;
}

/**
 * Find all quoted enum item ranges inside the array at the given position.
 * Returns an array of 1-based { start, end } ranges sorted left-to-right.
 */
function findAllEnumItemRanges(
	model: monacoNs.editor.ITextModel,
	position: monacoNs.IPosition,
	enumArrayProps: Set<string>
): Array<{ end: number; start: number }> {
	for (const propName of enumArrayProps) {
		const bounds = findArrayBounds(model, propName);
		if (!bounds) continue;

		const afterOpen = bounds.openLine < position.lineNumber ||
			(bounds.openLine === position.lineNumber && position.column > bounds.openCol);
		const beforeClose = bounds.closeLine > position.lineNumber ||
			(bounds.closeLine === position.lineNumber && position.column <= bounds.closeCol);

		if (!afterOpen || !beforeClose) continue;

		const line = model.getLineContent(bounds.openLine);
		const arraySlice = line.substring(bounds.openCol);
		const regex = /"([^"\\]*)"/g;
		const items: Array<{ end: number; start: number }> = [];
		let match;

		while ((match = regex.exec(arraySlice)) !== null) {
			// Exclude surrounding quotes — highlight content only
			const startCol = bounds.openCol + match.index + 2;
			const endCol = startCol + match[1].length;
			items.push({ end: endCol, start: startCol });
		}

		return items;
	}
	return [];
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
 * Find the value on a line (after the colon), regardless of cursor position.
 * Used for up/down arrow navigation to find the selectable value on adjacent lines.
 * Returns 1-based { start, end } range or null.
 */
function findValueOnLine(line: string): null | { end: number; start: number } {
	const colonIdx = line.indexOf(':');
	if (colonIdx === -1) return null;

	// Look for a string value (most common case): "propName": "value"
	const afterColon = line.substring(colonIdx + 1);
	const stringMatch = afterColon.match(/^\s*"([^"\\]*)"/);
	if (stringMatch) {
		const valueStart = colonIdx + 1 + (afterColon.length - afterColon.trimStart().length);
		const contentStart = valueStart + 2; // 1-based, after opening quote
		const contentEnd = contentStart + stringMatch[1].length; // 1-based, at closing quote
		return { end: contentEnd, start: contentStart };
	}

	// Look for a number value: "propName": 123 or "propName": -5
	const numberMatch = afterColon.match(/^\s*(-?\d+)/);
	if (numberMatch) {
		const valueStart = colonIdx + 1 + (afterColon.length - afterColon.trimStart().length);
		return {
			end: valueStart + numberMatch[1].length + 1, // 1-based, exclusive
			start: valueStart + 1 // 1-based
		};
	}

	// Look for keywords: true, false, null
	const keywordMatch = afterColon.match(/^\s*(true|false|null)\b/);
	if (keywordMatch) {
		const valueStart = colonIdx + 1 + (afterColon.length - afterColon.trimStart().length);
		return {
			end: valueStart + keywordMatch[1].length + 1, // 1-based, exclusive
			start: valueStart + 1 // 1-based
		};
	}

	// Look for an array: "propName": ["item1", ...] - select first item content only
	const arrayMatch = afterColon.match(/^\s*\[\s*"([^"\\]*)"/);
	if (arrayMatch) {
		const bracketIdx = afterColon.indexOf('[');
		const firstQuoteIdx = afterColon.indexOf('"', bracketIdx);
		const valueStart = colonIdx + 1 + firstQuoteIdx;
		// Skip the opening quote to highlight content only
		const contentStart = valueStart + 2; // 1-based, after opening quote
		const contentEnd = contentStart + arrayMatch[1].length; // before closing quote
		return { end: contentEnd, start: contentStart };
	}

	return null;
}

/**
 * Returns true when the line contains an empty inline array: "key": []
 */
function isEmptyArrayLine(line: string): boolean {
	const colonIdx = line.indexOf(':');
	if (colonIdx === -1) return false;
	return /^\s*\[\s*\]/.test(line.substring(colonIdx + 1));
}

/**
 * Find all quoted string items in any array on a line.
 * Returns an array of 1-based { start, end } ranges sorted left-to-right.
 * Works for any array, not just enum arrays, to support up/down → left/right navigation.
 */
function findArrayItemsOnLine(line: string): Array<{ end: number; start: number }> {
	const colonIdx = line.indexOf(':');
	if (colonIdx === -1) return [];

	const afterColon = line.substring(colonIdx + 1);
	const bracketIdx = afterColon.indexOf('[');
	if (bracketIdx === -1) return [];

	// Find the closing bracket
	let depth = 0;
	let closeBracketIdx = -1;
	for (let i = bracketIdx; i < afterColon.length; i++) {
		if (afterColon[i] === '[') depth++;
		else if (afterColon[i] === ']') {
			depth--;
			if (depth === 0) {
				closeBracketIdx = i;
				break;
			}
		}
	}
	if (closeBracketIdx === -1) return [];

	// Extract just the array content between brackets
	const arrayContent = afterColon.substring(bracketIdx + 1, closeBracketIdx);
	const arrayStartInLine = colonIdx + 1 + bracketIdx + 1; // 0-based index of first char after '['

	// Find all quoted strings in the array content, highlighting content only (no quotes)
	const items: Array<{ end: number; start: number }> = [];
	const regex = /"([^"\\]*)"/g;
	let match;
	while ((match = regex.exec(arrayContent)) !== null) {
		const start = arrayStartInLine + match.index + 2; // 1-based, after opening quote
		const end = start + match[1].length; // ends before closing quote
		items.push({ end, start });
	}

	return items;
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
 * Boolean values no longer get pointer cursor decorations since
 * they are now selected on click and toggled with Tab.
 * This function is kept as a stub in case custom decorations are added later.
 */
function setupClickableCursorDecorations(
	_editor: monacoNs.editor.IStandaloneCodeEditor,
	_schema: JsonSchema
): monacoNs.IDisposable {
	return { dispose: noop };
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
 * Tab key toggles the value under the cursor and keeps it selected:
 * - Boolean values: true↔false (value stays selected)
 * - Enum array items: toggle active/inactive (item stays selected)
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

		// When the suggest widget is open, let Monaco handle Tab natively
		// (accepts the highlighted suggestion).
		if (isSuggestWidgetVisible(editor)) return;

		const line = model.getLineContent(position.lineNumber);

		// Also check selection — the cursor may be at one end of a selected value
		const sel = editor.getSelection();
		const checkPositions = [position];
		if (sel && !sel.isEmpty()) {
			checkPositions.push(sel.getStartPosition(), sel.getEndPosition());
		}

		// Check if on a boolean value (try all positions)
		for (const pos of checkPositions) {
			const word = model.getWordAtPosition(pos);
			if (word && (word.word === 'true' || word.word === 'false')) {
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

						// Re-select the new value
						queueMicrotask(() => {
							editor.setSelection(new monacoNs.Selection(
								position.lineNumber, word.startColumn,
								position.lineNumber, word.startColumn + newValue.length
							));
						});
						return;
					}
				}
			}
		}

		// Check if cursor/selection is inside an enum array on a value
		for (const info of enumArrays) {
			const bounds = findArrayBounds(model, info.propertyName);
			if (!bounds) continue;

			// Check all positions (cursor + selection endpoints)
			for (const pos of checkPositions) {
				const afterOpen = bounds.openLine < pos.lineNumber ||
					(bounds.openLine === pos.lineNumber && pos.column > bounds.openCol);
				const beforeClose = bounds.closeLine > pos.lineNumber ||
					(bounds.closeLine === pos.lineNumber && pos.column <= bounds.closeCol);

				if (!afterOpen || !beforeClose) continue;

				// Find which quoted value the cursor/selection is on/in
				const arraySlice = line.substring(bounds.openCol);
				const regex = /"([^"\\]*)"/g;
				let match;
				while ((match = regex.exec(arraySlice)) !== null) {
					const startCol = bounds.openCol + match.index + 1;
					const endCol = startCol + match[0].length;

					if (pos.column >= startCol && pos.column <= endCol) {
						const itemValue = match[1];
						if (!info.enumValues.includes(itemValue)) continue;

						e.preventDefault();
						e.stopPropagation();

						// Use tracked active values (authoritative while expanded)
						const tracked = trackedActiveValues.get(info.propertyName);
						const activeSet = tracked ? new Set(tracked) : new Set<string>();

						// Record which section (active/inactive) and position within that
						// section the cursor was at BEFORE the toggle, so we can land on
						// whatever fills that same slot after items re-sort.
						const preSortedActive = info.enumValues
							.filter((v) => activeSet.has(v))
							.sort((a, b) => a.localeCompare(b));
						const preSortedInactive = info.enumValues
							.filter((v) => !activeSet.has(v))
							.sort((a, b) => a.localeCompare(b));
						const wasActive = activeSet.has(itemValue);
						const sectionIndex = wasActive
							? preSortedActive.indexOf(itemValue)
							: preSortedInactive.indexOf(itemValue);

						if (wasActive) {
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

						// Decide which item to land on after the toggle:
						// Stay in the same section the cursor was in and pick the item that
						// now occupies the same slot. This way the cursor "stays put" and
						// selects whatever fills the gap rather than chasing the toggled item.
						const postSection = wasActive ? sortedActive : sortedInactive;
						let targetItem: string;
						if (postSection.length > 0) {
							targetItem = postSection[Math.min(sectionIndex, postSection.length - 1)];
						} else {
							// Section is now empty — fall back to the other section
							const fallback = wasActive ? sortedInactive : sortedActive;
							targetItem = fallback[fallback.length - 1] ?? itemValue;
						}

						const currentBounds = findArrayBounds(model, info.propertyName);
						if (!currentBounds) return;

						const arrayRange = new monacoNs.Range(
							currentBounds.openLine, currentBounds.openCol,
							currentBounds.closeLine, currentBounds.closeCol + 1
						);

						// Find which index the target item will be at in the new array
						const targetIndex = allItems.indexOf(targetItem);

						editor.executeEdits('tab-toggle-enum', [{
							forceMoveMarkers: true,
							range: arrayRange,
							text: newArrayText
						}]);

						// After the edit, re-expand (so inactive items stay visible) then
						// select the target item. setTimeout(0) lets Monaco finish its
						// internal handlers before we mutate again.
						setTimeout(() => {
							// Re-expand so all inactive items remain visible in the array.
							// This also handles the case where the array just became empty:
							// placing the cursor inside [] triggers the cursor-position
							// listener which calls showInlineEnums for us.
							const updatedLine = model.getLineContent(currentBounds.openLine);
							const items = findArrayItemsOnLine(updatedLine);
							if (items.length === 0) {
								// Array is empty after toggle — place cursor inside brackets.
								// The cursor-position listener will call showInlineEnums for us.
								const colonIdx2 = updatedLine.indexOf(':');
								const bracketIdx2 = updatedLine.indexOf('[', colonIdx2);
								if (bracketIdx2 !== -1) {
									editor.setPosition(new monacoNs.Position(currentBounds.openLine, bracketIdx2 + 2));
								}
								return;
							}
							const targetRange = items[Math.min(targetIndex, items.length - 1)];
							editor.setSelection(new monacoNs.Selection(
								currentBounds.openLine, targetRange.start,
								currentBounds.openLine, targetRange.end
							));
						}, 0);

						return;
					}
				}
			}
		}

		// Tab in an empty file-path field → open IntelliSense
		const fileProps = findFilePathProperties(schema);
		if (fileProps.size > 0) {
			const fileRange = findStringValueRange(line, position.column, fileProps);
			if (fileRange && fileRange.contentStart === fileRange.contentEnd) {
				e.preventDefault();
				e.stopPropagation();
				queueMicrotask(() => {
					editor.trigger('tab-intellisense', 'editor.action.triggerSuggest', {});
				});
				return;
			}
		}

		// Tab in an empty symbol field (when its linked file path is set) → open IntelliSense
		const symbolPropMap = findSymbolProperties(schema);
		if (symbolPropMap.size > 0) {
			const symbolPropNames = new Set(symbolPropMap.keys());
			const symRange = findStringValueRange(line, position.column, symbolPropNames);
			if (symRange && symRange.contentStart === symRange.contentEnd) {
				const fileProp = symbolPropMap.get(symRange.propertyName);
				if (fileProp) {
					const filePath = readStringPropertyValue(model, fileProp);
					if (filePath) {
						e.preventDefault();
						e.stopPropagation();
						queueMicrotask(() => {
							editor.trigger('tab-intellisense', 'editor.action.triggerSuggest', {});
						});
						return;
					}
				}
			}
		}

		// Block Tab from doing anything else (no field jump, no indent)
		e.preventDefault();
		e.stopPropagation();
	});
}

// ── Feature 8: Up/Down Field Navigation ──────────────────────────────────────

/**
 * Up/down arrow keys navigate between JSON property values.
 * Scans in the pressed direction past structural lines (braces, brackets,
 * blank lines) until a line with a navigable value is found, then selects it.
 * Always prevents the default arrow action so the cursor never lands on a
 * structural line and triggers a snap-back cycle.
 */
function setupFieldNavigation(
	editor: monacoNs.editor.IStandaloneCodeEditor,
	_schema: JsonSchema
): monacoNs.IDisposable {
	return editor.onKeyDown((e) => {
		// Only handle Up/Down arrows
		const isUp = e.keyCode === monacoNs.KeyCode.UpArrow;
		const isDown = e.keyCode === monacoNs.KeyCode.DownArrow;
		if (!isUp && !isDown) return;

		if (isSuggestWidgetVisible(editor)) return;

		const model = editor.getModel();
		if (!model) return;

		const position = editor.getPosition();
		if (!position) return;

		e.preventDefault();
		e.stopPropagation();

		const direction = isUp ? -1 : 1;
		const lineCount = model.getLineCount();

		// Scan for next navigable field, skipping the current line
		for (let line = position.lineNumber + direction; line >= 1 && line <= lineCount; line += direction) {
			const content = model.getLineContent(line);

			// Check for array items first (non-empty array)
			const inlineArrayItems = findArrayItemsOnLine(content);
			if (inlineArrayItems.length > 0) {
				const chosen = direction === 1
					? inlineArrayItems[0]
					: inlineArrayItems[inlineArrayItems.length - 1];
				queueMicrotask(() => {
					editor.setSelection(new monacoNs.Selection(
						line, chosen.start,
						line, chosen.end
					));
				});
				return;
			}

			// Check for empty array: place cursor inside the brackets
			if (isEmptyArrayLine(content)) {
				const colonIdx = content.indexOf(':');
				const afterColon = content.substring(colonIdx + 1);
				const bracketIdx = afterColon.indexOf('[');
				// Column just after '[' — cursor sits inside the empty brackets
				const cursorCol = colonIdx + 1 + bracketIdx + 2; // 1-based
				queueMicrotask(() => {
					editor.setPosition(new monacoNs.Position(line, cursorCol));
				});
				return;
			}

			// Check for regular value
			const valueRange = findValueOnLine(content);
			if (valueRange) {
				queueMicrotask(() => {
					editor.setSelection(new monacoNs.Selection(
						line, valueRange.start,
						line, valueRange.end
					));
				});
				return;
			}
		}
	});
}

// ── Shared widget-visibility helper ────────────────────────────────────────────

/**
 * Returns true when the Monaco suggest widget (autocomplete dropdown) is
 * currently visible inside the editor. Used to bail out of custom key
 * interceptors so IntelliSense can operate normally.
 */
function isSuggestWidgetVisible(editor: monacoNs.editor.IStandaloneCodeEditor): boolean {
	const dom = editor.getDomNode();
	if (!dom) return false;
	return !!dom.querySelector('.suggest-widget.visible');
}

// ── Feature 9: Locked Editing – Only value zones are editable ────────────────

interface ValueZone {
	endCol: number;
	endLine: number;
	startCol: number;
	startLine: number;
	type: 'boolean' | 'number' | 'string';
}

/**
 * Scan every line of the document and return the editable value zones.
 * Each zone covers only the content of a value (e.g. inside the quotes for
 * strings, or the digit sequence for numbers). Structural characters —
 * property keys, colons, brackets, quotes — are never included.
 */
function computeValueZones(model: monacoNs.editor.ITextModel): ValueZone[] {
	const result: ValueZone[] = [];
	const lineCount = model.getLineCount();

	for (let i = 1; i <= lineCount; i++) {
		const line = model.getLineContent(i);
		const colonIdx = line.indexOf(':');

		if (colonIdx !== -1) {
			// Inline array: "key": ["a", "b"] — each quoted item becomes its own zone
			const inlineItems = findArrayItemsOnLine(line);
			if (inlineItems.length > 0) {
				for (const item of inlineItems) {
					result.push({ endCol: item.end, endLine: i, startCol: item.start, startLine: i, type: 'string' });
				}
				continue;
			}

			const afterColon = line.substring(colonIdx + 1);
			const trimOffset = afterColon.length - afterColon.trimStart().length;

			// String: "key": "value"  →  zone covers content between the quotes
			const stringMatch = afterColon.match(/^\s*"([^"\\]*)"/);
			if (stringMatch) {
				const startCol = colonIdx + 1 + trimOffset + 2; // 1-based; skip opening quote
				result.push({ endCol: startCol + stringMatch[1].length, endLine: i, startCol, startLine: i, type: 'string' });
				continue;
			}

			// Number: "key": 42  →  zone covers the digit sequence
			const numberMatch = afterColon.match(/^\s*(-?\d+(?:\.\d+)?)/);
			if (numberMatch) {
				const startCol = colonIdx + 1 + trimOffset + 1; // 1-based
				result.push({ endCol: startCol + numberMatch[1].length, endLine: i, startCol, startLine: i, type: 'number' });
				continue;
			}

			// Boolean / null: "key": true | false | null  →  zone covers the literal
			const boolNullMatch = afterColon.match(/^\s*(true|false|null)/);
			if (boolNullMatch) {
				const startCol = colonIdx + 1 + trimOffset + 1; // 1-based
				result.push({ endCol: startCol + boolNullMatch[1].length, endLine: i, startCol, startLine: i, type: 'boolean' });
				continue;
			}
		} else {
			// No colon — may be a bare array item on its own line (multi-line array)
			const trimmed = line.trim();
			if (!trimmed) continue;
			// Skip structural lines
			if (/^[[\]{},]$/.test(trimmed) || /^[[\]{},]$/.test(trimmed.replace(/,$/, ''))) continue;

			// Quoted string item (possibly with trailing comma)
			const strItemMatch = trimmed.match(/^"([^"\\]*)"[,]?$/);
			if (strItemMatch) {
				const firstQuote = line.indexOf('"');
				const startCol = firstQuote + 2; // 1-based; skip opening quote
				result.push({ endCol: startCol + strItemMatch[1].length, endLine: i, startCol, startLine: i, type: 'string' });
				continue;
			}

			// Number item (possibly with trailing comma)
			const numItemMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[,]?$/);
			if (numItemMatch) {
				const firstNonSpace = line.search(/\S/);
				const startCol = firstNonSpace + 1; // 1-based
				result.push({ endCol: startCol + numItemMatch[1].length, endLine: i, startCol, startLine: i, type: 'number' });
				continue;
			}
		}
	}

	return result;
}

function findZoneAt(pos: monacoNs.Position, zones: ValueZone[]): ValueZone | null {
	for (const z of zones) {
		if (pos.lineNumber === z.startLine && pos.column >= z.startCol && pos.column <= z.endCol) {
			return z;
		}
	}
	return null;
}

function findNextZone(pos: monacoNs.Position, zones: ValueZone[]): ValueZone | null {
	let best: ValueZone | null = null;
	for (const z of zones) {
		const after = z.startLine > pos.lineNumber || (z.startLine === pos.lineNumber && z.startCol > pos.column);
		if (!after) continue;
		if (!best || z.startLine < best.startLine || (z.startLine === best.startLine && z.startCol < best.startCol)) {
			best = z;
		}
	}
	return best ?? (zones.length > 0 ? zones[zones.length - 1] : null);
}

function findPrevZone(pos: monacoNs.Position, zones: ValueZone[]): ValueZone | null {
	let best: ValueZone | null = null;
	for (const z of zones) {
		const before = z.endLine < pos.lineNumber || (z.endLine === pos.lineNumber && z.endCol < pos.column);
		if (!before) continue;
		if (!best || z.endLine > best.endLine || (z.endLine === best.endLine && z.endCol > best.endCol)) {
			best = z;
		}
	}
	return best ?? (zones.length > 0 ? zones[0] : null);
}

/** Returns true for key codes that produce or remove characters in the document. */
function isEditingCode(code: string): boolean {
	return (
		code === 'Backspace' || code === 'Delete' || code === 'Tab' ||
		code.startsWith('Key') || code.startsWith('Digit') || code.startsWith('Numpad') ||
		code === 'Space' || code === 'Minus' || code === 'Equal' ||
		code === 'BracketLeft' || code === 'BracketRight' ||
		code === 'Semicolon' || code === 'Quote' || code === 'Backquote' ||
		code === 'Comma' || code === 'Period' || code === 'Slash' || code === 'Backslash'
	);
}

/** Returns true for key codes acceptable inside a number value zone. */
function isNumericCode(code: string): boolean {
	return (
		code === 'Backspace' || code === 'Delete' ||
		code.startsWith('Digit') ||
		code === 'Numpad0' || code === 'Numpad1' || code === 'Numpad2' ||
		code === 'Numpad3' || code === 'Numpad4' || code === 'Numpad5' ||
		code === 'Numpad6' || code === 'Numpad7' || code === 'Numpad8' || code === 'Numpad9' ||
		code === 'Minus' || code === 'Period' || code === 'NumpadDecimal' || code === 'NumpadSubtract'
	);
}

/**
 * Constrains the Monaco editor so only value zones are editable.
 *
 * - Clicking or navigating outside a value zone snaps the cursor to the
 *   nearest zone boundary.
 * - Enter and Shift+Enter are blocked (Enter = execute via the parent
 *   handler; newlines are not meaningful in structured JSON input).
 * - Backspace / Delete cannot eat past the zone boundary into structural
 *   characters (quotes, brackets, key names).
 * - Number zones reject alphabetic and punctuation input.
 * - Cross-zone or out-of-zone selections are automatically collapsed to the
 *   active-cursor zone before an edit can proceed.
 */
export function setupLockedEditing(
	editor: monacoNs.editor.IStandaloneCodeEditor
): monacoNs.IDisposable {
	let zones: ValueZone[] = [];
	let isSnapping = false;
	let lastPos: null | monacoNs.Position = null;

	function refresh(): void {
		const m = editor.getModel();
		zones = m ? computeValueZones(m) : [];
	}
	refresh();

	// ── Snap cursor to the nearest zone when it lands outside all zones ──────
	const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
		if (isSnapping) return;
		// Don't fight IntelliSense cursor movement (suggest widget navigates by moving cursor)
		if (isSuggestWidgetVisible(editor)) return;
		// Programmatic setPosition / setSelection calls (reason = Explicit) come from our
		// own navigation code (setupFieldNavigation) which already placed the cursor/selection
		// exactly where it should be. Snapping those would collapse the selection to a cursor.
		if (e.reason === monacoNs.editor.CursorChangeReason.Explicit) {
			lastPos = e.position;
			return;
		}
		const pos = e.position;
		if (findZoneAt(pos, zones)) {
			lastPos = pos;
			return;
		}
		isSnapping = true;
		const prev = lastPos;
		const goingForward =
			!prev ||
			pos.lineNumber > prev.lineNumber ||
			(pos.lineNumber === prev.lineNumber && pos.column >= prev.column);
		const target = goingForward ? findNextZone(pos, zones) : findPrevZone(pos, zones);
		if (target) {
			const snapCol = goingForward ? target.startCol : target.endCol;
			const snapPos = new monacoNs.Position(target.startLine, snapCol);
			editor.setPosition(snapPos);
			lastPos = snapPos;
		}
		isSnapping = false;
	});

	// ── Block structural edits and enforce value-type constraints ────────────
	const keyDisposable = editor.onKeyDown((e) => {
		// Block Enter and Shift+Enter — no newlines allowed in the structured editor.
		// Exception: let Enter accept a suggestion when the suggest widget is open.
		if (e.code === 'Enter') {
			if (isSuggestWidgetVisible(editor)) return;
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		// Allow Ctrl / Meta shortcuts (undo, redo, copy, paste, select-all, etc.)
		if (e.ctrlKey || e.metaKey) return;

		if (!isEditingCode(e.code)) return;

		const pos = editor.getPosition();
		if (!pos) return;

		// If there is a non-empty selection, collapse it to the active position
		// before checking — prevents accidentally deleting structural content.
		const sel = editor.getSelection();
		if (sel && !sel.isEmpty()) {
			const startZone = findZoneAt(new monacoNs.Position(sel.startLineNumber, sel.startColumn), zones);
			const endZone   = findZoneAt(new monacoNs.Position(sel.endLineNumber,   sel.endColumn),   zones);
			const sameZone  = startZone && endZone &&
				startZone.startLine === endZone.startLine && startZone.startCol === endZone.startCol;
			if (!sameZone) {
				e.preventDefault();
				e.stopPropagation();
				// Collapse selection to whichever end is inside a zone
				const safeZone = endZone ?? startZone;
				if (safeZone) {
					queueMicrotask(() => { editor.setPosition(new monacoNs.Position(safeZone.startLine, safeZone.startCol)); });
				}
				return;
			}
		}

		const zone = findZoneAt(pos, zones);
		if (!zone) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		// Prevent Backspace from eating the opening quote / structural character
		if (e.code === 'Backspace' && pos.column <= zone.startCol) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		// Prevent Delete from eating the closing quote / structural character
		if (e.code === 'Delete' && pos.column >= zone.endCol) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		// Number zones: reject non-numeric characters
		if (zone.type === 'number' && !isNumericCode(e.code)) {
			e.preventDefault();
			e.stopPropagation();
		}
	});

	// Re-compute zones after every content change (values change length)
	const contentDisposable = editor.onDidChangeModelContent(() => { refresh(); });

	return {
		dispose(): void {
			cursorDisposable.dispose();
			keyDisposable.dispose();
			contentDisposable.dispose();
		}
	};
}