import type { CallToolResult, ContentBlock, ExecutionRecord, RecordRating } from '../types';
import type * as monaco from 'monaco-editor';

import { createOutputEditor } from '../monaco-setup';
import {
  addRecord,
  deleteRecord,
  getRecords,
  updateComment,
  updateRating,
} from '../storage';

let currentTool = '';

const expandedEntries = new Set<string>();
const entryEditors = new Map<string, monaco.editor.IStandaloneCodeEditor>();

const ICON_PATHS = {
  thumbsup: 'M12.999 6.00002H10.672L11.207 4.21802C11.278 3.98102 11.314 3.73902 11.314 3.49602C11.314 2.12002 10.192 0.999023 8.81298 0.999023C8.42998 0.999023 8.08498 1.21202 7.91398 1.55402L5.82998 5.72202C5.74498 5.89202 5.57398 5.99802 5.38298 5.99802H3.00098C1.89798 5.99802 1.00098 6.89502 1.00098 7.99802V12.998C1.00098 14.101 1.89798 14.998 3.00098 14.998H11.163C12.727 14.998 13.283 13.796 13.565 12.893L14.908 8.59602C14.969 8.40102 15 8.19902 15 7.99602C15 6.89402 14.103 5.99802 12.999 5.99802V6.00002ZM1.99998 13V8.00002C1.99998 7.44902 2.44898 7.00002 2.99998 7.00002H3.99998V14H2.99998C2.44898 14 1.99998 13.551 1.99998 13ZM13.954 8.29802L12.611 12.596C12.247 13.761 11.769 13.999 11.163 13.999H5.00098V6.99902H5.38298C5.95498 6.99902 6.46898 6.68102 6.72498 6.17002L8.80898 2.00202C8.80898 2.00202 8.81098 2.00002 8.81298 2.00002C9.64098 2.00002 10.314 2.67102 10.314 3.49702C10.314 3.64202 10.292 3.78802 10.249 3.93202L9.52098 6.35702C9.47598 6.50802 9.50398 6.67202 9.59898 6.79902C9.69398 6.92602 9.84198 7.00102 9.99998 7.00102H12.999C13.551 7.00102 14 7.44802 14 7.99902C14 8.10002 13.984 8.20102 13.954 8.30002V8.29802Z',
  thumbsdown: 'M13 1H4.838C3.274 1 2.717 2.202 2.435 3.105L1.092 7.404C1.031 7.6 1 7.801 1 8.002C1 9.104 1.897 10 3.001 10H5.328L4.794 11.781C4.723 12.016 4.687 12.26 4.687 12.504C4.687 13.88 5.809 15.001 7.189 15.001C7.571 15.001 7.915 14.789 8.087 14.446L10.171 10.277C10.256 10.107 10.427 10.001 10.618 10.001H13C14.103 10.001 15 9.104 15 8.001V3C15 1.897 14.103 1 13 1ZM9.276 9.829L7.193 13.996L7.188 13.999C6.36 13.999 5.686 13.328 5.686 12.502C5.686 12.356 5.707 12.21 5.75 12.067L6.478 9.642C6.524 9.491 6.495 9.327 6.401 9.2C6.306 9.073 6.158 8.998 6 8.998H3.001C2.449 8.998 2 8.551 2 8C2 7.9 2.016 7.799 2.047 7.699L3.39 3.401C3.753 2.236 4.232 1.998 4.838 1.998H11V8.998H10.618C10.046 8.998 9.531 9.316 9.276 9.827V9.829ZM14 8C14 8.551 13.552 9 13 9H12V2H13C13.552 2 14 2.449 14 3V8Z',
  sync: 'M7.14645 0.646447C7.34171 0.451184 7.65829 0.451184 7.85355 0.646447L9.35355 2.14645C9.54882 2.34171 9.54882 2.65829 9.35355 2.85355L7.85355 4.35355C7.65829 4.54882 7.34171 4.54882 7.14645 4.35355C6.95118 4.15829 6.95118 3.84171 7.14645 3.64645L7.7885 3.00439C5.12517 3.11522 3 5.30943 3 8C3 9.56799 3.72118 10.9672 4.85185 11.8847C5.06627 12.0587 5.09904 12.3736 4.92503 12.588C4.75103 12.8024 4.43615 12.8352 4.22172 12.6612C2.86712 11.5619 2 9.88205 2 8C2 4.75447 4.57689 2.1108 7.79629 2.00339L7.14645 1.35355C6.95118 1.15829 6.95118 0.841709 7.14645 0.646447ZM11.075 3.41199C11.249 3.19756 11.5639 3.1648 11.7783 3.3388C13.1329 4.43806 14 6.11795 14 8C14 11.2455 11.4231 13.8892 8.20371 13.9966L8.85355 14.6464C9.04882 14.8417 9.04882 15.1583 8.85355 15.3536C8.65829 15.5488 8.34171 15.5488 8.14645 15.3536L6.64645 13.8536C6.55268 13.7598 6.5 13.6326 6.5 13.5C6.5 13.3674 6.55268 13.2402 6.64645 13.1464L8.14645 11.6464C8.34171 11.4512 8.65829 11.4512 8.85355 11.6464C9.04882 11.8417 9.04882 12.1583 8.85355 12.3536L8.2115 12.9956C10.8748 12.8848 13 10.6906 13 8C13 6.43201 12.2788 5.03283 11.1482 4.1153C10.9337 3.94129 10.901 3.62641 11.075 3.41199Z',
  trash: 'M14 2H10C10 0.897 9.103 0 8 0C6.897 0 6 0.897 6 2H2C1.724 2 1.5 2.224 1.5 2.5C1.5 2.776 1.724 3 2 3H2.54L3.349 12.708C3.456 13.994 4.55 15 5.84 15H10.159C11.449 15 12.543 13.993 12.65 12.708L13.459 3H13.999C14.275 3 14.499 2.776 14.499 2.5C14.499 2.224 14.275 2 13.999 2H14ZM8 1C8.551 1 9 1.449 9 2H7C7 1.449 7.449 1 8 1ZM11.655 12.625C11.591 13.396 10.934 14 10.16 14H5.841C5.067 14 4.41 13.396 4.346 12.625L3.544 3H12.458L11.656 12.625H11.655ZM7 5.5V11.5C7 11.776 6.776 12 6.5 12C6.224 12 6 11.776 6 11.5V5.5C6 5.224 6.224 5 6.5 5C6.776 5 7 5.224 7 5.5ZM10 5.5V11.5C10 11.776 9.776 12 9.5 12C9.224 12 9 11.776 9 11.5V5.5C9 5.224 9.224 5 9.5 5C9.776 5 10 5.224 10 5.5Z',
};

function createSvgIcon(pathData: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

let rerunHandler: ((input: string) => void) | null = null;

export function onRerun(handler: (input: string) => void): void {
  rerunHandler = handler;
}

export function createHistoryContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'history-container';
  container.className = 'mt-2';
  return container;
}

export function setCurrentTool(toolName: string): void {
  currentTool = toolName;
  disposeAllEditors();
  expandedEntries.clear();
  renderHistory();
}

export function addExecution(
  toolName: string,
  input: string,
  result: CallToolResult,
  durationMs: number,
): void {
  const record = addRecord(toolName, input, result.content, result.isError ?? false, durationMs);
  expandedEntries.add(record.id);
  renderHistory();
}

function disposeAllEditors(): void {
  for (const editor of entryEditors.values()) {
    editor.dispose();
  }
  entryEditors.clear();
}

function renderHistory(): void {
  const container = document.getElementById('history-container');
  if (!container) {
    return;
  }

  disposeAllEditors();
  container.innerHTML = '';

  const records = getRecords(currentTool);
  if (records.length === 0) {
    return;
  }

  // Split into sections
  const flagged = records.filter(r => r.rating === 'bad').sort((a, b) => a.priority - b.priority);
  const unrated = records.filter(r => r.rating === null);
  const archived = records.filter(r => r.rating === 'good');

  if (flagged.length > 0) {
    container.appendChild(renderSection('Flagged', flagged, 'bad'));
  }

  if (unrated.length > 0) {
    container.appendChild(renderSection('Recent', unrated, null));
  }

  if (archived.length > 0) {
    container.appendChild(renderArchivedSection(archived));
  }
}

function renderSection(
  title: string,
  records: ExecutionRecord[],
  _rating: RecordRating,
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'history-section';

  const header = document.createElement('div');
  header.className = 'history-section-header';
  header.innerHTML = `<span>${title}</span><span class="text-vscode-text-dim text-[11px]">${records.length}</span>`;
  section.appendChild(header);

  for (const record of records) {
    section.appendChild(renderEntry(record));
  }

  return section;
}

function renderArchivedSection(records: ExecutionRecord[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'history-section';

  const header = document.createElement('button');
  header.className = 'history-section-header cursor-pointer w-full';
  header.innerHTML = `<span>Archived</span><span class="text-vscode-text-dim text-[11px]">${records.length}</span>`;

  const list = document.createElement('div');
  list.className = 'hidden';

  header.addEventListener('click', () => {
    list.classList.toggle('hidden');
  });

  section.appendChild(header);

  for (const record of records) {
    list.appendChild(renderEntry(record));
  }

  section.appendChild(list);
  return section;
}

// Track which record needs a popover after re-render
let pendingPopover: { recordId: string; direction: 'good' | 'bad'; location: 'row' | 'detail' } | null = null;

function createRatingButton(
  record: ExecutionRecord,
  direction: 'good' | 'bad',
  location: 'row' | 'detail',
): HTMLElement {
  const btn = document.createElement('button');
  const isActive = record.rating === direction;

  btn.className = `history-rating-btn${isActive ? ' checked' : ''}`;
  btn.title = direction === 'good' ? 'Good output' : 'Bad output — flag for review';

  const iconPath = direction === 'good' ? ICON_PATHS.thumbsup : ICON_PATHS.thumbsdown;
  btn.appendChild(createSvgIcon(iconPath));

  // If this button was flagged for a popover after re-render, show it now
  if (
    pendingPopover?.recordId === record.id
    && pendingPopover.direction === direction
    && pendingPopover.location === location
  ) {
    pendingPopover = null;
    requestAnimationFrame(() => {
      showCommentPopover(btn, record, direction);
    });
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const newRating: RecordRating = record.rating === direction ? null : direction;
    updateRating(currentTool, record.id, newRating);

    if (newRating !== null) {
      pendingPopover = { recordId: record.id, direction, location };
    } else {
      pendingPopover = null;
      dismissActivePopover();
    }
    renderHistory();
  });

  return btn;
}

function createRerunButton(record: ExecutionRecord): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'history-rating-btn';
  btn.title = 'Rerun with this input';
  btn.appendChild(createSvgIcon(ICON_PATHS.sync));

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (rerunHandler) {
      rerunHandler(record.input);
    }
  });

  return btn;
}

function createDeleteButton(record: ExecutionRecord): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'history-rating-btn';
  btn.title = 'Delete this record';
  btn.appendChild(createSvgIcon(ICON_PATHS.trash));

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    expandedEntries.delete(record.id);
    deleteRecord(currentTool, record.id);
    renderHistory();
  });

  return btn;
}

function renderEntry(record: ExecutionRecord): HTMLElement {
  const entry = document.createElement('div');
  entry.className = 'history-entry';
  if (record.isError) {
    entry.classList.add('history-entry-error');
  }

  const isExpanded = expandedEntries.has(record.id);

  // ── Collapsed Row ──
  const row = document.createElement('div');
  row.className = 'history-entry-row';

  const chevron = document.createElement('span');
  chevron.className = 'history-chevron';
  chevron.textContent = isExpanded ? '▼' : '▶';

  const toolLabel = document.createElement('span');
  toolLabel.className = 'history-tool-name';
  toolLabel.textContent = record.toolName;

  const timeLabel = document.createElement('span');
  timeLabel.className = 'history-time';
  timeLabel.textContent = formatTime(record.lastRunAt ?? record.createdAt);

  const duration = document.createElement('span');
  duration.className = 'history-duration';
  duration.textContent = `${record.durationMs}ms`;

  // Action buttons on collapsed row
  const rowRating = document.createElement('span');
  rowRating.className = 'history-row-rating';
  rowRating.appendChild(createRerunButton(record));
  rowRating.appendChild(createRatingButton(record, 'good', 'row'));
  rowRating.appendChild(createRatingButton(record, 'bad', 'row'));
  rowRating.appendChild(createDeleteButton(record));

  row.appendChild(chevron);
  row.appendChild(toolLabel);
  row.appendChild(timeLabel);
  row.appendChild(duration);
  row.appendChild(rowRating);

  row.addEventListener('click', () => {
    if (expandedEntries.has(record.id)) {
      expandedEntries.delete(record.id);
    } else {
      expandedEntries.add(record.id);
    }
    renderHistory();
  });

  entry.appendChild(row);

  // ── Expanded Detail ──
  if (isExpanded) {
    entry.appendChild(renderEntryDetail(record));
  }

  return entry;
}

function renderEntryDetail(record: ExecutionRecord): HTMLElement {
  const detail = document.createElement('div');
  detail.className = 'history-entry-detail';

  // Input (read-only)
  const inputSection = document.createElement('div');
  inputSection.className = 'history-detail-section';
  const inputLabel = document.createElement('div');
  inputLabel.className = 'history-detail-label';
  inputLabel.textContent = 'Input';
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'tool-io-editor-wrapper';

  const inputEditor = createOutputEditor(inputWrapper, record.input, 'json');
  entryEditors.set(`${record.id}-input`, inputEditor);

  inputSection.appendChild(inputLabel);
  inputSection.appendChild(inputWrapper);
  detail.appendChild(inputSection);

  // Output
  const outputSection = document.createElement('div');
  outputSection.className = 'history-detail-section';
  const outputLabel = document.createElement('div');
  outputLabel.className = 'history-detail-label';
  outputLabel.textContent = 'Output';

  const outputText = combineOutputText(record.output);
  let languageId = 'plaintext';
  try {
    JSON.parse(outputText);
    languageId = 'json';
  } catch {
    // Not JSON
  }

  const outputWrapper = document.createElement('div');
  outputWrapper.className = 'tool-io-editor-wrapper';
  const outputEditor = createOutputEditor(outputWrapper, outputText, languageId);
  entryEditors.set(`${record.id}-output`, outputEditor);

  outputSection.appendChild(outputLabel);
  outputSection.appendChild(outputWrapper);
  detail.appendChild(outputSection);

  // Rating buttons (expanded view, below output)
  const ratingRow = document.createElement('div');
  ratingRow.className = 'history-rating-row';

  ratingRow.appendChild(createRerunButton(record));
  ratingRow.appendChild(createRatingButton(record, 'good', 'detail'));
  ratingRow.appendChild(createRatingButton(record, 'bad', 'detail'));
  ratingRow.appendChild(createDeleteButton(record));
  detail.appendChild(ratingRow);

  return detail;
}

// ── Comment Popover ──
let activePopover: HTMLElement | null = null;

function dismissActivePopover(): void {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

function showCommentPopover(
  anchor: HTMLElement,
  record: ExecutionRecord,
  rating: 'good' | 'bad',
): void {
  dismissActivePopover();

  const popover = document.createElement('div');
  popover.className = 'comment-popover';

  const label = document.createElement('div');
  label.className = 'comment-popover-label';
  label.textContent = rating === 'bad'
    ? 'What went wrong?'
    : 'What was good about this?';
  popover.appendChild(label);

  const textarea = document.createElement('textarea');
  textarea.className = 'comment-popover-input';
  textarea.placeholder = 'Add a comment\u2026';
  textarea.value = record.comment;
  textarea.rows = 3;

  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  textarea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      updateComment(currentTool, record.id, textarea.value);
    }, 400);
  });

  // Stop clicks inside popover from toggling expansion
  popover.addEventListener('click', (e) => e.stopPropagation());

  popover.appendChild(textarea);

  // Position relative to anchor button
  anchor.style.position = 'relative';
  anchor.appendChild(popover);
  activePopover = popover;

  textarea.focus();

  // Dismiss on outside click
  const onOutsideClick = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node) && e.target !== anchor) {
      dismissActivePopover();
      document.removeEventListener('mousedown', onOutsideClick);
    }
  };
  // Defer so the current click doesn't immediately dismiss
  setTimeout(() => {
    document.addEventListener('mousedown', onOutsideClick);
  }, 0);
}

function combineOutputText(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.text)
    .map(b => b.text)
    .join('\n');
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
