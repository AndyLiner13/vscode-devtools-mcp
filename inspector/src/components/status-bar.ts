import type { ConnectionStatus } from '../types';

export function createStatusBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'flex items-center justify-between px-4 py-1 bg-vscode-badge text-white text-xs';
  bar.id = 'status-bar';

  const left = document.createElement('div');
  left.className = 'flex items-center gap-3';
  left.id = 'status-left';
  left.textContent = 'Disconnected';

  const right = document.createElement('div');
  right.className = 'flex items-center gap-3';
  right.id = 'status-right';

  bar.appendChild(left);
  bar.appendChild(right);

  return bar;
}

export function updateStatusBar(status: ConnectionStatus): void {
  const bar = document.getElementById('status-bar');
  const left = document.getElementById('status-left');
  const right = document.getElementById('status-right');

  if (!bar || !left || !right) {
    return;
  }

  bar.classList.remove('bg-vscode-accent', 'bg-vscode-warning', 'bg-vscode-error', 'bg-vscode-badge');

  switch (status.state) {
    case 'connected':
      bar.classList.add('bg-vscode-accent');
      left.textContent = `${status.serverInfo?.name ?? 'MCP Server'} v${status.serverInfo?.version ?? '?'}`;
      right.textContent = `${status.toolCount} tools | Port 6274`;
      break;
    case 'connecting':
      bar.classList.add('bg-vscode-warning');
      left.textContent = 'Connecting...';
      right.textContent = '';
      break;
    case 'error':
      bar.classList.add('bg-vscode-error');
      left.textContent = `Error: ${status.error ?? 'Unknown'}`;
      right.textContent = '';
      break;
    case 'disconnected':
      bar.classList.add('bg-vscode-badge');
      left.textContent = 'Disconnected';
      right.textContent = '';
      break;
  }

  // Update header connection indicator
  const dot = document.getElementById('connection-dot');
  const label = document.getElementById('connection-label');

  if (dot) {
    dot.className = 'w-2 h-2 rounded-full';
    switch (status.state) {
      case 'connected':
        dot.classList.add('bg-vscode-success');
        break;
      case 'connecting':
        dot.classList.add('bg-vscode-warning', 'animate-pulse');
        break;
      case 'error':
        dot.classList.add('bg-vscode-error');
        break;
      case 'disconnected':
        dot.classList.add('bg-vscode-error');
        break;
    }
  }

  if (label) {
    switch (status.state) {
      case 'connected':
        label.textContent = 'Connected';
        break;
      case 'connecting':
        label.textContent = 'Connecting...';
        break;
      case 'error':
        label.textContent = 'Error';
        break;
      case 'disconnected':
        label.textContent = 'Disconnected';
        break;
    }
  }
}
