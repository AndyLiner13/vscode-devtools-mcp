/**
 * Centralized logging for the VS Code DevTools extension.
 *
 * All extension-side code should import from this module instead of
 * using console.log/warn/error directly. Output goes to VS Code
 * output channels — never to the debug console.
 *
 * Channels:
 *   - Main channel ("devtools") — extension lifecycle, host/client handlers
 *   - Inspector channel ("DevTools Inspector") — inspector webview UI logs
 *
 * Call initMainChannel() during extension activation. On the Client side,
 * also call initInspectorChannel() to create the dedicated inspector channel.
 */

import type * as vscode from 'vscode';

let mainChannel: undefined | vscode.OutputChannel;
let inspectorChannel: undefined | vscode.OutputChannel;

function formatLine(message: string): string {
	return `[${new Date().toISOString()}] ${message}`;
}

/** Initialize the main output channel. Call once during activation. */
export function initMainChannel(channel: vscode.OutputChannel): void {
	mainChannel = channel;
}

/** Initialize the inspector output channel. Call on the Client side. */
export function initInspectorChannel(channel: vscode.OutputChannel): void {
	inspectorChannel = channel;
}

/** Log to the main output channel. */
export function log(message: string): void {
	mainChannel?.appendLine(formatLine(message));
}

/** Log a warning to the main output channel. */
export function warn(message: string): void {
	mainChannel?.appendLine(formatLine(`[WARN] ${message}`));
}

/** Log an error to the main output channel. */
export function error(message: string): void {
	mainChannel?.appendLine(formatLine(`[ERROR] ${message}`));
}

/** Log to the inspector output channel (falls back to main if not initialized). */
export function inspectorLog(message: string): void {
	const channel = inspectorChannel ?? mainChannel;
	channel?.appendLine(formatLine(message));
}
