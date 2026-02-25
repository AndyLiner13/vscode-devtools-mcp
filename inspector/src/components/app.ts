import { createToolDetail } from './tool-detail';
import { createToolDropdown } from './tool-list';

export function createApp(): HTMLElement {
	const container = document.createElement('div');
	container.className = 'app-root';

	// Tool selector (dropdown + collapsible description)
	const selectorArea = document.createElement('div');
	selectorArea.className = 'selector-area';
	selectorArea.appendChild(createToolDropdown());

	// Detail panel (params, execute, results) — scrollable
	const detail = document.createElement('div');
	detail.className = 'detail-area';
	detail.appendChild(createToolDetail());

	container.appendChild(selectorArea);
	container.appendChild(detail);

	return container;
}
