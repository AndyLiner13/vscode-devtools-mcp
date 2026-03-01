import type { CallToolResult, ExecutionRecord, RecordRating } from '../types';
import type * as monaco from 'monaco-editor';

import { rpc } from '../bridge';
import { createOutputEditor } from '../monaco-setup';
import { addRecord, deleteRecord, getRecords, onStorageChange, updateComment, updateRating, updateRecordOutput } from '../storage';

let currentTool = '';
let renderGeneration = 0;

const expandedEntries = new Set<string>();
const entryEditors = new Map<string, monaco.editor.IStandaloneCodeEditor>();

// Track which sections are collapsed (Archived starts collapsed)
const collapsedSections = new Set<string>(['Archived']);

// Track in-flight addToChat calls to avoid duplicate RPCs
const addToChatPending = new Set<string>();

const ICON_PATHS = {
	chevronDown:
		'M3.14598 5.85423L7.64598 10.3542C7.84098 10.5492 8.15798 10.5492 8.35298 10.3542L12.853 5.85423C13.048 5.65923 13.048 5.34223 12.853 5.14723C12.658 4.95223 12.341 4.95223 12.146 5.14723L7.99998 9.29323L3.85398 5.14723C3.65898 4.95223 3.34198 4.95223 3.14698 5.14723C2.95198 5.34223 2.95098 5.65923 3.14598 5.85423Z',
	chevronRight:
		'M6.14601 3.14579C5.95101 3.34079 5.95101 3.65779 6.14601 3.85279L10.292 7.99879L6.14601 12.1448C5.95101 12.3398 5.95101 12.6568 6.14601 12.8518C6.34101 13.0468 6.65801 13.0468 6.85301 12.8518L11.353 8.35179C11.548 8.15679 11.548 7.83979 11.353 7.64478L6.85301 3.14479C6.65801 2.94979 6.34101 2.95079 6.14601 3.14579Z',
	sync: 'M7.14645 0.646447C7.34171 0.451184 7.65829 0.451184 7.85355 0.646447L9.35355 2.14645C9.54882 2.34171 9.54882 2.65829 9.35355 2.85355L7.85355 4.35355C7.65829 4.54882 7.34171 4.54882 7.14645 4.35355C6.95118 4.15829 6.95118 3.84171 7.14645 3.64645L7.7885 3.00439C5.12517 3.11522 3 5.30943 3 8C3 9.56799 3.72118 10.9672 4.85185 11.8847C5.06627 12.0587 5.09904 12.3736 4.92503 12.588C4.75103 12.8024 4.43615 12.8352 4.22172 12.6612C2.86712 11.5619 2 9.88205 2 8C2 4.75447 4.57689 2.1108 7.79629 2.00339L7.14645 1.35355C6.95118 1.15829 6.95118 0.841709 7.14645 0.646447ZM11.075 3.41199C11.249 3.19756 11.5639 3.1648 11.7783 3.3388C13.1329 4.43806 14 6.11795 14 8C14 11.2455 11.4231 13.8892 8.20371 13.9966L8.85355 14.6464C9.04882 14.8417 9.04882 15.1583 8.85355 15.3536C8.65829 15.5488 8.34171 15.5488 8.14645 15.3536L6.64645 13.8536C6.55268 13.7598 6.5 13.6326 6.5 13.5C6.5 13.3674 6.55268 13.2402 6.64645 13.1464L8.14645 11.6464C8.34171 11.4512 8.65829 11.4512 8.85355 11.6464C9.04882 11.8417 9.04882 12.1583 8.85355 12.3536L8.2115 12.9956C10.8748 12.8848 13 10.6906 13 8C13 6.43201 12.2788 5.03283 11.1482 4.1153C10.9337 3.94129 10.901 3.62641 11.075 3.41199Z',
	thumbsdown:
		'M13 1H4.838C3.274 1 2.717 2.202 2.435 3.105L1.092 7.404C1.031 7.6 1 7.801 1 8.002C1 9.104 1.897 10 3.001 10H5.328L4.794 11.781C4.723 12.016 4.687 12.26 4.687 12.504C4.687 13.88 5.809 15.001 7.189 15.001C7.571 15.001 7.915 14.789 8.087 14.446L10.171 10.277C10.256 10.107 10.427 10.001 10.618 10.001H13C14.103 10.001 15 9.104 15 8.001V3C15 1.897 14.103 1 13 1ZM9.276 9.829L7.193 13.996L7.188 13.999C6.36 13.999 5.686 13.328 5.686 12.502C5.686 12.356 5.707 12.21 5.75 12.067L6.478 9.642C6.524 9.491 6.495 9.327 6.401 9.2C6.306 9.073 6.158 8.998 6 8.998H3.001C2.449 8.998 2 8.551 2 8C2 7.9 2.016 7.799 2.047 7.699L3.39 3.401C3.753 2.236 4.232 1.998 4.838 1.998H11V8.998H10.618C10.046 8.998 9.531 9.316 9.276 9.827V9.829ZM14 8C14 8.551 13.552 9 13 9H12V2H13C13.552 2 14 2.449 14 3V8Z',
	thumbsup:
		'M12.999 6.00002H10.672L11.207 4.21802C11.278 3.98102 11.314 3.73902 11.314 3.49602C11.314 2.12002 10.192 0.999023 8.81298 0.999023C8.42998 0.999023 8.08498 1.21202 7.91398 1.55402L5.82998 5.72202C5.74498 5.89202 5.57398 5.99802 5.38298 5.99802H3.00098C1.89798 5.99802 1.00098 6.89502 1.00098 7.99802V12.998C1.00098 14.101 1.89798 14.998 3.00098 14.998H11.163C12.727 14.998 13.283 13.796 13.565 12.893L14.908 8.59602C14.969 8.40102 15 8.19902 15 7.99602C15 6.89402 14.103 5.99802 12.999 5.99802V6.00002ZM1.99998 13V8.00002C1.99998 7.44902 2.44898 7.00002 2.99998 7.00002H3.99998V14H2.99998C2.44898 14 1.99998 13.551 1.99998 13ZM13.954 8.29802L12.611 12.596C12.247 13.761 11.769 13.999 11.163 13.999H5.00098V6.99902H5.38298C5.95498 6.99902 6.46898 6.68102 6.72498 6.17002L8.80898 2.00202C8.80898 2.00202 8.81098 2.00002 8.81298 2.00002C9.64098 2.00002 10.314 2.67102 10.314 3.49702C10.314 3.64202 10.292 3.78802 10.249 3.93202L9.52098 6.35702C9.47598 6.50802 9.50398 6.67202 9.59898 6.79902C9.69398 6.92602 9.84198 7.00102 9.99998 7.00102H12.999C13.551 7.00102 14 7.44802 14 7.99902C14 8.10002 13.984 8.20102 13.954 8.30002V8.29802Z',
	trash:
		'M14 2H10C10 0.897 9.103 0 8 0C6.897 0 6 0.897 6 2H2C1.724 2 1.5 2.224 1.5 2.5C1.5 2.776 1.724 3 2 3H2.54L3.349 12.708C3.456 13.994 4.55 15 5.84 15H10.159C11.449 15 12.543 13.993 12.65 12.708L13.459 3H13.999C14.275 3 14.499 2.776 14.499 2.5C14.499 2.224 14.275 2 13.999 2H14ZM8 1C8.551 1 9 1.449 9 2H7C7 1.449 7.449 1 8 1ZM11.655 12.625C11.591 13.396 10.934 14 10.16 14H5.841C5.067 14 4.41 13.396 4.346 12.625L3.544 3H12.458L11.656 12.625H11.655ZM7 5.5V11.5C7 11.776 6.776 12 6.5 12C6.224 12 6 11.776 6 11.5V5.5C6 5.224 6.224 5 6.5 5C6.776 5 7 5.224 7 5.5ZM10 5.5V11.5C10 11.776 9.776 12 9.5 12C9.224 12 9 11.776 9 11.5V5.5C9 5.224 9.224 5 9.5 5C9.776 5 10 5.224 10 5.5Z',
	warning: 'M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28 2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z',
	add: 'M14 7v1H8v6H7V8H1V7h6V1h1v6h6z',
	check: 'M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z'
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

let rerunHandler: ((input: string, recordId: string) => void) | null = null;

export function onRerun(handler: (input: string, recordId: string) => void): void {
	rerunHandler = handler;
}

// Cross-tab sync: re-render when another tab mutates
onStorageChange((toolName) => {
	if (toolName === currentTool || toolName === '*') {
		renderHistory().catch(() => { /* error sent via RPC */ });
	}
});

export function createHistoryContainer(): HTMLElement {
	const container = document.createElement('div');
	container.id = 'history-container';
	container.className = 'history-container';
	return container;
}

export async function setCurrentTool(toolName: string): Promise<void> {
	currentTool = toolName;
	disposeAllEditors();
	expandedEntries.clear();
	await renderHistory();
}

export async function addExecution(toolName: string, input: string, result: CallToolResult, durationMs: number): Promise<void> {
	await addRecord(toolName, input, result.content, result.isError ?? false, durationMs);
	await renderHistory();
}

export async function updateExecution(toolName: string, recordId: string, result: CallToolResult, durationMs: number): Promise<void> {
	await updateRecordOutput(toolName, recordId, result.content, result.isError ?? false, durationMs);
	await renderHistory();
}

function disposeAllEditors(): void {
	for (const editor of entryEditors.values()) {
		editor.dispose();
	}
	entryEditors.clear();
}

async function renderHistory(): Promise<void> {
	const container = document.getElementById('history-container');
	if (!container) {
		return;
	}

	const thisGeneration = ++renderGeneration;

	// Preserve focus state for inline comment fields during re-render
	const activeEl = document.activeElement;
	let focusedRecordId: null | string = null;
	let focusedValue = '';
	let focusedCursorPos = 0;
	if (activeEl instanceof HTMLInputElement && activeEl.dataset.recordId) {
		focusedRecordId = activeEl.dataset.recordId;
		focusedValue = activeEl.value;
		focusedCursorPos = activeEl.selectionStart ?? 0;
	}

	disposeAllEditors();
	container.innerHTML = '';

	const records = await getRecords(currentTool);

	// A newer render was queued while we were fetching — let it take over
	if (thisGeneration !== renderGeneration) {
		return;
	}
	if (records.length === 0) {
		return;
	}

	const flagged = records.filter((r) => r.rating === 'bad');
	const unrated = records.filter((r) => r.rating === null);
	const archived = records.filter((r) => r.rating === 'good');

	if (flagged.length > 0) {
		container.appendChild(renderSection('Flagged', flagged));
	}
	if (unrated.length > 0) {
		container.appendChild(renderSection('Recent', unrated));
	}
	if (archived.length > 0) {
		container.appendChild(renderSection('Archived', archived));
	}

	// Restore focus after rebuild
	if (focusedRecordId) {
		const input = container.querySelector(`input[data-record-id="${focusedRecordId}"]`);
		if (input) {
			input.value = focusedValue;
			input.focus();
			input.setSelectionRange(focusedCursorPos, focusedCursorPos);
		}
	}
}

function renderSection(title: string, records: ExecutionRecord[]): HTMLElement {
	const section = document.createElement('div');
	section.className = 'history-section';

	const isCollapsed = collapsedSections.has(title);

	const header = document.createElement('button');
	header.className = 'history-section-header clickable';

	const titleSpan = document.createElement('span');
	titleSpan.textContent = title;
	titleSpan.style.flex = '1';
	titleSpan.style.textAlign = 'left';
	header.appendChild(titleSpan);

	const count = document.createElement('span');
	count.className = 'section-count';
	count.textContent = String(records.length);
	header.appendChild(count);

	const list = document.createElement('div');
	if (isCollapsed) {
		list.className = 'hidden';
	}

	header.addEventListener('click', () => {
		if (collapsedSections.has(title)) {
			collapsedSections.delete(title);
		} else {
			collapsedSections.add(title);
		}
		renderHistory().catch(() => { /* error sent via RPC */ });
	});

	section.appendChild(header);

	for (const record of records) {
		list.appendChild(renderEntry(record));
	}

	section.appendChild(list);
	return section;
}

function createRatingButton(record: ExecutionRecord, direction: 'bad' | 'good'): HTMLElement {
	const btn = document.createElement('button');
	const isActive = record.rating === direction;

	btn.className = `history-rating-btn${isActive ? ' checked' : ''}`;
	btn.title = direction === 'good' ? 'Good output' : 'Bad output — flag for review';

	const iconPath = direction === 'good' ? ICON_PATHS.thumbsup : ICON_PATHS.thumbsdown;
	btn.appendChild(createSvgIcon(iconPath));

	btn.addEventListener('click', (e) => {
		e.stopPropagation();
		const newRating: RecordRating = record.rating === direction ? null : direction;
		updateRating(currentTool, record.id, newRating)
			.then(async () => renderHistory())
			.catch(() => { /* error sent via RPC */ });
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
		rerunHandler?.(record.input, record.id);
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
		deleteRecord(currentTool, record.id)
			.then(async () => renderHistory())
			.catch(() => { /* error sent via RPC */ });
	});

	return btn;
}

function createAddToChatButton(record: ExecutionRecord): HTMLElement {
	const btn = document.createElement('button');
	btn.className = 'history-rating-btn';
	btn.title = 'Add to Copilot Chat as context';
	const addIcon = createSvgIcon(ICON_PATHS.add);
	btn.appendChild(addIcon);

	btn.addEventListener('click', (e) => {
		e.stopPropagation();
		if (addToChatPending.has(record.id)) return;
		addToChatPending.add(record.id);

		btn.classList.add('disabled');

		rpc<{ ok: boolean }>('context/addToChat', {
			comment: record.comment,
			createdAt: record.createdAt,
			durationMs: record.durationMs,
			id: record.id,
			input: record.input,
			isError: record.isError,
			output: record.output,
			rating: record.rating,
			toolName: record.toolName
		}).then(() => {
			// Swap to checkmark icon with green color for 3 seconds
			const checkIcon = createSvgIcon(ICON_PATHS.check);
			btn.replaceChild(checkIcon, btn.firstElementChild ?? addIcon);
			btn.style.color = 'var(--inspector-success)';
			setTimeout(() => {
				const restoreIcon = createSvgIcon(ICON_PATHS.add);
				btn.replaceChild(restoreIcon, btn.firstElementChild ?? checkIcon);
				btn.style.color = '';
			}, 3000);
		}).catch(() => {
			btn.style.color = 'var(--vscode-editorError-foreground, #f44)';
			setTimeout(() => btn.style.color = '', 2000);
		}).finally(() => {
			addToChatPending.delete(record.id);
			btn.classList.remove('disabled');
		});
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
	// Layout: [chevron] [time] [comment field] [duration] [action buttons]
	const row = document.createElement('div');
	row.className = 'history-entry-row';

	const chevron = document.createElement('span');
	chevron.className = 'history-chevron';
	chevron.appendChild(createSvgIcon(isExpanded ? ICON_PATHS.chevronDown : ICON_PATHS.chevronRight));

	const timeLabel = document.createElement('span');
	timeLabel.className = 'history-time';
	timeLabel.textContent = formatTime(record.lastRunAt ?? record.createdAt);

	// Inline-editable comment field (replaces the old tool name + popover)
	const commentField = document.createElement('input');
	commentField.type = 'text';
	commentField.className = 'history-comment-field';
	commentField.dataset.recordId = record.id;
	commentField.value = record.comment;
	commentField.placeholder = 'Add a note\u2026';
	commentField.setAttribute('draggable', 'false');
	commentField.addEventListener('click', (e) => {
		e.stopPropagation();
	});

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	commentField.addEventListener('input', () => {
		record.comment = commentField.value;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			updateComment(currentTool, record.id, commentField.value).catch(() => { /* error sent via RPC */ });
		}, 400);
	});

	const duration = document.createElement('span');
	duration.className = 'history-duration';
	duration.textContent = `${record.durationMs}ms`;

	const actions = document.createElement('span');
	actions.className = 'history-row-rating';
	actions.setAttribute('draggable', 'false');
	actions.appendChild(createRerunButton(record));
	actions.appendChild(createRatingButton(record, 'good'));
	actions.appendChild(createRatingButton(record, 'bad'));
	actions.appendChild(createDeleteButton(record));
	actions.appendChild(createAddToChatButton(record));

	row.appendChild(chevron);
	row.appendChild(timeLabel);

	// Stale warning icon — shown for flagged records that haven't been re-run since hot reload
	if (record.rating === 'bad' && record.isStale) {
		const staleIcon = createSvgIcon(ICON_PATHS.warning);
		staleIcon.style.color = 'var(--vscode-editorWarning-foreground, #cca700)';
		staleIcon.style.flexShrink = '0';
		staleIcon.setAttribute('title', 'Stale — code changed since last run, re-run to verify');
		row.appendChild(staleIcon);
	}

	row.appendChild(commentField);
	row.appendChild(duration);
	row.appendChild(actions);

	row.addEventListener('click', () => {
		if (expandedEntries.has(record.id)) {
			expandedEntries.delete(record.id);
		} else {
			expandedEntries.add(record.id);
		}
		renderHistory().catch(() => { /* error sent via RPC */ });
	});

	entry.appendChild(row);

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

	// Output — one editor per content block
	const outputSection = document.createElement('div');
	outputSection.className = 'history-detail-section';
	const outputLabel = document.createElement('div');
	outputLabel.className = 'history-detail-label';
	outputLabel.textContent = 'Output';
	outputSection.appendChild(outputLabel);

	const textBlocks = record.output.filter((b) => b.text);
	if (textBlocks.length === 0) {
		const wrapper = document.createElement('div');
		wrapper.className = 'tool-io-editor-wrapper';
		const editor = createOutputEditor(wrapper, '(no output)', 'plaintext');
		entryEditors.set(`${record.id}-output-0`, editor);
		outputSection.appendChild(wrapper);
	} else {
		for (const [i, block] of textBlocks.entries()) {
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
			entryEditors.set(`${record.id}-output-${i}`, editor);
			outputSection.appendChild(wrapper);
		}
	}

	detail.appendChild(outputSection);

	return detail;
}

function formatTime(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
