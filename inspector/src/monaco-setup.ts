import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

// Custom theme that matches our VS Code dark UI colors exactly
monaco.editor.defineTheme('vscode-inspector', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#3c3c3c',
    'editor.lineHighlightBackground': '#3c3c3c',
    'editorGutter.background': '#3c3c3c',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#3c3c3c',
    'editorWidget.background': '#3c3c3c',
    'scrollbarSlider.background': '#79797966',
    'scrollbarSlider.hoverBackground': '#646464b3',
    'scrollbarSlider.activeBackground': '#bfbfbf66',
  },
});

const SHARED_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  theme: 'vscode-inspector',
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  scrollbar: {
    vertical: 'hidden',
    horizontal: 'hidden',
    handleMouseWheel: false,
  },
  renderLineHighlight: 'none',
  selectionHighlight: false,
  occurrencesHighlight: 'off',
  matchBrackets: 'never',
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  folding: false,
  lineNumbers: 'off',
  glyphMargin: false,
  lineDecorationsWidth: 8,
  lineNumbersMinChars: 0,
  padding: { top: 5, bottom: 5 },

  wordWrap: 'on',
  contextmenu: false,
  links: false,
  guides: { indentation: false },
  renderWhitespace: 'none',
  tabSize: 2,
  automaticLayout: true,
  stickyScroll: { enabled: false },
};

/**
 * Creates an editable Monaco editor for JSON input.
 * Matches the VS Code Copilot Chat tool invocation "Input" block.
 */
export function createInputEditor(
  container: HTMLElement,
  initialValue: string,
): monaco.editor.IStandaloneCodeEditor {
  const editor = monaco.editor.create(container, {
    ...SHARED_EDITOR_OPTIONS,
    value: initialValue,
    language: 'json',
    readOnly: false,
    domReadOnly: false,
    ariaLabel: 'Tool input parameters (JSON)',
  });

  autoSizeEditor(editor, container);
  return editor;
}

/**
 * Creates a read-only Monaco editor for displaying results.
 * Matches the VS Code Copilot Chat tool invocation "Output" block.
 */
export function createOutputEditor(
  container: HTMLElement,
  content: string,
  languageId = 'json',
): monaco.editor.IStandaloneCodeEditor {
  const editor = monaco.editor.create(container, {
    ...SHARED_EDITOR_OPTIONS,
    value: content,
    language: languageId,
    readOnly: true,
    domReadOnly: true,
    ariaLabel: 'Tool output result',
    cursorStyle: 'line-thin',
    cursorBlinking: 'solid',
  });

  autoSizeEditor(editor, container);
  return editor;
}

/**
 * Auto-sizes a Monaco editor vertically to fit its content,
 * capped at MAX_HEIGHT_LINES lines (matching VS Code's maxHeightInLines: 13).
 */
function autoSizeEditor(
  editor: monaco.editor.IStandaloneCodeEditor,
  container: HTMLElement,
): void {
  const updateHeight = () => {
    const contentHeight = editor.getContentHeight();
    container.style.height = `${contentHeight}px`;
    editor.layout();
  };

  editor.onDidChangeModelContent(updateHeight);
  editor.onDidContentSizeChange(updateHeight);
  updateHeight();
}
