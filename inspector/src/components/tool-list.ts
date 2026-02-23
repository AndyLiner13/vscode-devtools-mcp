import type { ToolDefinition } from '../types';

let toolSelectHandler: ((tool: ToolDefinition) => void) | null = null;
let allTools: ToolDefinition[] = [];

export function onToolSelect(handler: (tool: ToolDefinition) => void): void {
	toolSelectHandler = handler;
}

/** Creates the dropdown selector + collapsible description area */
export function createToolDropdown(): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'p-3 flex flex-col gap-2';

	// Dropdown row
	const selectWrapper = document.createElement('div');
	selectWrapper.className = 'relative';

	const select = document.createElement('select');
	select.id = 'tool-select';
	select.className = ['w-full px-2.5 py-1 pr-8 rounded border border-vscode-border', 'bg-vscode-input text-vscode-text text-[13px]', 'focus:border-vscode-accent focus:outline-none cursor-pointer appearance-none'].join(' ');

	const placeholder = document.createElement('option');
	placeholder.value = '';
	placeholder.textContent = 'Not connected\u2026';
	placeholder.disabled = true;
	placeholder.selected = true;
	select.appendChild(placeholder);

	const chevron = document.createElement('span');
	chevron.className = 'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-vscode-text-dim text-xs';
	chevron.textContent = '\u25be';

	selectWrapper.appendChild(select);
	selectWrapper.appendChild(chevron);

	// Annotation badges row
	const badgesRow = document.createElement('div');
	badgesRow.id = 'tool-badges-row';
	badgesRow.className = 'hidden flex-wrap gap-1';

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
			badgesRow.classList.remove('hidden');
			badgesRow.classList.add('flex');
			for (const badge of badges) {
				badgesRow.appendChild(badge);
			}
		} else {
			badgesRow.classList.add('hidden');
			badgesRow.classList.remove('flex');
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
		['read-only', annotations.readOnlyHint, 'bg-vscode-success/20 text-vscode-success'],
		['destructive', annotations.destructiveHint, 'bg-vscode-error/20 text-vscode-error'],
		['idempotent', annotations.idempotentHint, 'bg-vscode-accent/20 text-vscode-accent'],
		['open-world', annotations.openWorldHint, 'bg-vscode-warning/20 text-vscode-warning']
	];

	for (const [label, value, color] of defs) {
		if (value !== true) {
			continue;
		}
		const badge = document.createElement('span');
		badge.className = `text-[10px] px-1.5 py-0.5 rounded ${color}`;
		badge.textContent = label;
		badges.push(badge);
	}

	return badges;
}
