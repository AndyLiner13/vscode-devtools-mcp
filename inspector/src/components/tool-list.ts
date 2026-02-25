import type { ToolDefinition } from '../types';

let toolSelectHandler: ((tool: ToolDefinition) => void) | null = null;
let allTools: ToolDefinition[] = [];

export function onToolSelect(handler: (tool: ToolDefinition) => void): void {
	toolSelectHandler = handler;
}

/** Creates the dropdown selector + collapsible description area */
export function createToolDropdown(): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'tool-selector';

	// Dropdown row
	const selectWrapper = document.createElement('div');
	selectWrapper.className = 'select-wrapper';

	const select = document.createElement('select');
	select.id = 'tool-select';
	select.className = 'tool-select';

	const placeholder = document.createElement('option');
	placeholder.value = '';
	placeholder.textContent = 'Reconnecting\u2026';
	placeholder.disabled = true;
	placeholder.selected = true;
	select.appendChild(placeholder);

	const chevron = document.createElement('span');
	chevron.className = 'select-chevron codicon codicon-chevron-down';

	selectWrapper.appendChild(select);
	selectWrapper.appendChild(chevron);

	// Annotation badges row
	const badgesRow = document.createElement('div');
	badgesRow.id = 'tool-badges-row';
	badgesRow.className = 'badges-row';

	wrapper.appendChild(selectWrapper);
	wrapper.appendChild(badgesRow);

	select.addEventListener('change', () => {
		const tool = allTools.find((t) => t.name === select.value);
		if (!tool) {
			return;
		}

		// Rebuild annotation badges
		badgesRow.innerHTML = '';
		const badges = tool.annotations ? buildBadges(tool.annotations) : [];
		if (badges.length > 0) {
		badgesRow.classList.add('visible');
			for (const badge of badges) {
				badgesRow.appendChild(badge);
			}
		} else {
		badgesRow.classList.remove('visible');
		}

		localStorage.setItem('mcp-inspector-selected-tool', tool.name);
		toolSelectHandler?.(tool);
	});

	return wrapper;
}

export function renderToolList(tools: ToolDefinition[]): void {
	allTools = tools;

	const select = document.getElementById('tool-select') as HTMLSelectElement | null;
	if (!select) {
		return;
	}

	select.innerHTML = '';

	if (tools.length === 0) {
		const opt = document.createElement('option');
		opt.value = '';
		opt.textContent = 'No tools available';
		opt.disabled = true;
		select.appendChild(opt);
		return;
	}

	for (const tool of tools) {
		const opt = document.createElement('option');
		opt.value = tool.name;
		opt.textContent = tool.name;
		select.appendChild(opt);
	}

	// Restore previously selected tool, or default to first
	const savedTool = localStorage.getItem('mcp-inspector-selected-tool');
	const restoreTool = savedTool && tools.some((t) => t.name === savedTool) ? savedTool : tools[0].name;
	select.value = restoreTool;
	select.dispatchEvent(new Event('change'));
}

function buildBadges(annotations: NonNullable<ToolDefinition['annotations']>): HTMLElement[] {
	const badges: HTMLElement[] = [];
	const defs: Array<[string, boolean | undefined, string]> = [
		['read-only', annotations.readOnlyHint, 'badge-success'],
		['destructive', annotations.destructiveHint, 'badge-error'],
		['idempotent', annotations.idempotentHint, 'badge-accent'],
		['open-world', annotations.openWorldHint, 'badge-warning']
	];

	for (const [label, value, color] of defs) {
		if (value !== true) {
			continue;
		}
		const badge = document.createElement('span');
		badge.className = `badge ${color}`;
		badge.textContent = label;
		badges.push(badge);
	}

	return badges;
}
