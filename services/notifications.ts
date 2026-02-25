/**
 * Notification utility for the VS Code DevTools extension.
 *
 * Reads the `devtools.notifications.duration` setting to control
 * how long completion notifications stay visible:
 *   -1  → show until manually dismissed
 *    0  → suppress all notifications
 *   >0  → auto-dismiss after N seconds
 *
 * Only affects "completion" notifications (success, error results).
 * Progress/loading notifications are unaffected.
 */

import * as vscode from 'vscode';

import { log } from './logger';

function getDurationSeconds(): number {
	return vscode.workspace.getConfiguration('devtools.notifications').get<number>('duration', 3);
}

/**
 * Show a completion notification that respects the configured duration.
 *
 * Notifications with action buttons (items) are always excluded from
 * auto-dismiss — they stay until the user interacts.
 */
export function showCompletionNotification(
	message: string,
	severity: 'error' | 'info' | 'warning' = 'info',
): void {
	const duration = getDurationSeconds();

	if (duration === 0) {
		log(`[notify] Suppressed (duration=0): ${message}`);
		return;
	}

	if (duration === -1) {
		showWithSeverity(message, severity);
		return;
	}

	// Auto-dismiss by using withProgress + a timer
	void vscode.window.withProgress(
		{
			cancellable: false,
			location: vscode.ProgressLocation.Notification,
			title: message,
		},
		(_progress) =>
			new Promise<void>((resolve) => {
				setTimeout(resolve, duration * 1000);
			}),
	);
}

function showWithSeverity(message: string, severity: 'error' | 'info' | 'warning'): void {
	switch (severity) {
		case 'error':
			void vscode.window.showErrorMessage(message);
			break;
		case 'warning':
			void vscode.window.showWarningMessage(message);
			break;
		default:
			void vscode.window.showInformationMessage(message);
			break;
	}
}

/**
 * Write an error log to `.devtools/context/` as a markdown file
 * and attach it to Copilot Chat.
 */
export async function attachErrorToChat(errorMessage: string, stack?: string): Promise<void> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
	if (!workspaceFolder) {
		log('[notify] No workspace folder — cannot attach error to chat');
		void vscode.window.showErrorMessage(errorMessage);
		return;
	}

	const contextDir = vscode.Uri.joinPath(workspaceFolder, '.devtools', 'context');
	await vscode.workspace.fs.createDirectory(contextDir);

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const fileName = `error-${timestamp}.md`;
	const fileUri = vscode.Uri.joinPath(contextDir, fileName);

	const lines = [
		'# DevTools Error',
		'',
		'| Field | Value |',
		'|-------|-------|',
		`| Timestamp | ${new Date().toISOString()} |`,
		`| Type | Fatal Error |`,
		'',
		'## Error Message',
		'```',
		errorMessage,
		'```',
	];

	if (stack) {
		lines.push('', '## Stack Trace', '```', stack, '```');
	}

	const content = new TextEncoder().encode(lines.join('\n'));
	await vscode.workspace.fs.writeFile(fileUri, content);
	log(`[notify] Wrote error context: ${fileName}`);

	try {
		await vscode.commands.executeCommand('workbench.action.chat.open', {
			attachFiles: [fileUri],
		});
		log(`[notify] Attached error to chat: ${fileUri.fsPath}`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		log(`[notify] Failed to attach error to chat: ${msg} — opening file`);
		await vscode.commands.executeCommand('vscode.open', fileUri);
	}
}
