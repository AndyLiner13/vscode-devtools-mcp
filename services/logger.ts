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
 * Debug Mode:
 *   When devtools.debug.enabled is true, all logs are also written to
 *   devtools.debug.log in the workspace root for offline debugging.
 *
 * Call initMainChannel() during extension activation. On the Client side,
 * also call initInspectorChannel() to create the dedicated inspector channel.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

import type * as vscode from 'vscode';

let mainChannel: undefined | vscode.OutputChannel;
let inspectorChannel: undefined | vscode.OutputChannel;
let debugLogPath: null | string = null;
let debugEnabled = false;
let sessionTimestamp: null | string = null;

function formatLine(message: string): string {
	return `[${new Date().toISOString()}] ${message}`;
}

function writeToDebugFile(line: string): void {
	if (!debugEnabled || !debugLogPath) return;
	try {
		appendFileSync(debugLogPath, `${line}\n`);
	} catch {
		// Best-effort — don't crash if file write fails
	}
}

function generateSessionTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureLogsDirectory(workspaceRoot: string): string {
	const logsDir = path.join(workspaceRoot, '.devtools', 'logs');
	if (!existsSync(logsDir)) {
		mkdirSync(logsDir, { recursive: true });
	}
	return logsDir;
}

/** Initialize the main output channel. Call once during activation. */
export function initMainChannel(channel: vscode.OutputChannel): void {
	mainChannel = channel;
}

/** Initialize the inspector output channel. Call on the Client side. */
export function initInspectorChannel(channel: vscode.OutputChannel): void {
	inspectorChannel = channel;
}

/**
 * Initialize debug file logging. Call once during activation after reading settings.
 * Creates a unique session log file in .devtools/logs/ directory.
 * @param workspaceRoot - The workspace root folder path
 * @param enabled - Whether debug mode is enabled
 */
export function initDebugLogging(workspaceRoot: null | string, enabled: boolean): void {
	debugEnabled = enabled;
	if (enabled && workspaceRoot) {
		sessionTimestamp = generateSessionTimestamp();
		const logsDir = ensureLogsDirectory(workspaceRoot);
		debugLogPath = path.join(logsDir, `session-${sessionTimestamp}.log`);
		try {
			const header = `========== DevTools Debug Log ==========\nSession: ${sessionTimestamp}\nStarted: ${new Date().toISOString()}\nPID: ${process.pid}\nWorkspace: ${workspaceRoot}\n=========================================\n`;
			writeFileSync(debugLogPath, header);
		} catch {
			// Best-effort
		}
	} else {
		debugLogPath = null;
	}
}

/**
 * Update debug logging state dynamically (e.g., when setting changes).
 * If a session log already exists, continues writing to it. Otherwise creates a new one.
 */
export function setDebugEnabled(enabled: boolean, workspaceRoot: null | string): void {
	debugEnabled = enabled;
	if (enabled && workspaceRoot && !debugLogPath) {
		if (!sessionTimestamp) {
			sessionTimestamp = generateSessionTimestamp();
		}
		const logsDir = ensureLogsDirectory(workspaceRoot);
		debugLogPath = path.join(logsDir, `session-${sessionTimestamp}.log`);
		try {
			const header = `========== DevTools Debug Log ==========\nSession: ${sessionTimestamp}\nResumed: ${new Date().toISOString()}\nPID: ${process.pid}\nWorkspace: ${workspaceRoot}\n=========================================\n`;
			appendFileSync(debugLogPath, header);
		} catch {
			// Best-effort
		}
	}
	if (!enabled) {
		debugLogPath = null;
	}
}

/** Returns whether debug logging is currently active. */
export function isDebugEnabled(): boolean {
	return debugEnabled;
}

/** Log to the main output channel. */
export function log(message: string): void {
	const line = formatLine(message);
	mainChannel?.appendLine(line);
	writeToDebugFile(line);
}

/** Log a warning to the main output channel. */
export function warn(message: string): void {
	const line = formatLine(`[WARN] ${message}`);
	mainChannel?.appendLine(line);
	writeToDebugFile(line);
}

/** Log an error to the main output channel. */
export function error(message: string): void {
	const line = formatLine(`[ERROR] ${message}`);
	mainChannel?.appendLine(line);
	writeToDebugFile(line);
}

/** Log to the inspector output channel (falls back to main if not initialized). */
export function inspectorLog(message: string): void {
	const line = formatLine(message);
	const channel = inspectorChannel ?? mainChannel;
	channel?.appendLine(line);
	writeToDebugFile(`[inspector] ${line}`);
}

/**
 * Debug-only log — only written when debug mode is enabled.
 * Use for verbose tracing that you don't want in the output channel normally.
 */
export function debug(message: string): void {
	if (!debugEnabled) return;
	const line = formatLine(`[DEBUG] ${message}`);
	mainChannel?.appendLine(line);
	writeToDebugFile(line);
}
