import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

window.MonacoEnvironment = {
	getWorker(_workerId: string, label: string) {
		if (label === 'json') {
			return new jsonWorker();
		}
		return new editorWorker();
	}
};

// Disable Monaco's built-in JSON completion suggestions — we provide our own
// targeted completions for file paths and symbols only.
monaco.languages.json.jsonDefaults.setModeConfiguration({
	completionItems: false,
	diagnostics: true,
	documentFormattingEdits: true,
	documentRangeFormattingEdits: true,
	documentSymbols: true,
	foldingRanges: true,
	hovers: true,
	selectionRanges: true,
	tokens: true
});

// Custom theme that matches our VS Code dark UI colors exactly
monaco.editor.defineTheme('vscode-inspector', {
	base: 'vs-dark',
	colors: {
		'editor.background': '#3c3c3c',
		'editor.inactiveSelectionBackground': '#3c3c3c',
		'editor.lineHighlightBackground': '#3c3c3c',
		'editor.selectionBackground': '#264f78',
		'editorGutter.background': '#3c3c3c',
		'editorWidget.background': '#3c3c3c',
		'scrollbarSlider.activeBackground': '#bfbfbf66',
		'scrollbarSlider.background': '#79797966',
		'scrollbarSlider.hoverBackground': '#646464b3'
	},
	inherit: true,
	rules: []
});

const SHARED_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
	automaticLayout: true,
	contextmenu: false,
	fixedOverflowWidgets: true,
	folding: false,
	fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
	fontSize: 13,
	glyphMargin: false,
	guides: { indentation: false },
	hideCursorInOverviewRuler: true,
	lineDecorationsWidth: 8,
	lineHeight: 20,
	lineNumbers: 'off',
	lineNumbersMinChars: 0,
	links: false,
	matchBrackets: 'never',
	minimap: { enabled: false },
	occurrencesHighlight: 'off',
	overviewRulerBorder: false,
	overviewRulerLanes: 0,
	padding: { bottom: 5, top: 5 },
	renderLineHighlight: 'none',

	renderWhitespace: 'none',
	scrollbar: {
		handleMouseWheel: false,
		horizontal: 'hidden',
		vertical: 'hidden'
	},
	scrollBeyondLastLine: false,
	selectionHighlight: false,
	stickyScroll: { enabled: false },
	// Disable word-based suggestions to prevent editor suggesting tokens from doc
	wordBasedSuggestions: 'off',
	tabSize: 2,
	theme: 'vscode-inspector',
	wordWrap: 'on'
};

/**
 * Creates an editable Monaco editor for JSON input.
 * Matches the VS Code Copilot Chat tool invocation "Input" block.
 */
export function createInputEditor(container: HTMLElement, initialValue: string): monaco.editor.IStandaloneCodeEditor {
	const editor = monaco.editor.create(container, {
		...SHARED_EDITOR_OPTIONS,
		ariaLabel: 'Tool input parameters (JSON)',
		domReadOnly: false,
		language: 'json',
		// Only our explicit triggers (file paths, symbols) should open the suggest
		// widget — block Monaco's automatic per-keystroke triggering.
		quickSuggestions: false,
		readOnly: false,
		value: initialValue
	});

	autoSizeEditor(editor, container);
	return editor;
}

/**
 * Creates a read-only Monaco editor for displaying results.
 * Matches the VS Code Copilot Chat tool invocation "Output" block.
 */
export function createOutputEditor(container: HTMLElement, content: string, languageId = 'json'): monaco.editor.IStandaloneCodeEditor {
	const editor = monaco.editor.create(container, {
		...SHARED_EDITOR_OPTIONS,
		ariaLabel: 'Tool output result',
		cursorBlinking: 'solid',
		cursorStyle: 'line-thin',
		domReadOnly: true,
		language: languageId,
		readOnly: true,
		value: content
	});

	autoSizeEditor(editor, container);
	return editor;
}

/**
 * Changes the language mode of an existing editor model.
 * Exposed so other modules can switch language without a runtime monaco import.
 */
export function setModelLanguage(model: monaco.editor.ITextModel, languageId: string): void {
	monaco.editor.setModelLanguage(model, languageId);
}

/**
 * Auto-sizes a Monaco editor vertically to fit its content,
 * capped at MAX_HEIGHT_LINES lines (matching VS Code's maxHeightInLines: 13).
 */
function autoSizeEditor(editor: monaco.editor.IStandaloneCodeEditor, container: HTMLElement): void {
	const updateHeight = () => {
		const contentHeight = editor.getContentHeight();
		container.style.height = `${contentHeight}px`;
		editor.layout();
	};

	editor.onDidChangeModelContent(updateHeight);
	editor.onDidContentSizeChange(updateHeight);
	updateHeight();

	// The container is always sized to exactly fit the content, so Monaco's
	// internal scrollTop must always be 0. Monaco's revealCursor() (triggered
	// by any setSelection/setPosition call, including arrow-key navigation)
	// can push scrollTop to a non-zero value without firing a content/size
	// change event, causing the top of the content to be clipped.
	// Intercept every scroll change and snap it back immediately.
	let suppressScrollReset = false;
	editor.onDidScrollChange((e) => {
		if (suppressScrollReset || !e.scrollTopChanged || e.scrollTop === 0) return;
		suppressScrollReset = true;
		editor.setScrollTop(0);
		suppressScrollReset = false;
	});
}
