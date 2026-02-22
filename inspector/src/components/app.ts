import { createToolDetail } from './tool-detail';
import { createToolDropdown } from './tool-list';

export function createApp(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full';

  // Tool selector (dropdown + collapsible description)
  const selectorArea = document.createElement('div');
  selectorArea.className = 'flex-shrink-0 border-b border-vscode-border';
  selectorArea.appendChild(createToolDropdown());

  // Detail panel (params, execute, results) — scrollable
  const detail = document.createElement('div');
  detail.className = 'flex-1 overflow-hidden flex flex-col';
  detail.appendChild(createToolDetail());

  container.appendChild(selectorArea);
  container.appendChild(detail);

  return container;
}
