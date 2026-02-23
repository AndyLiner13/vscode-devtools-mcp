/**
 * Type declarations for bootstrap.js (Safe Mode core).
 * bootstrap.js is intentionally plain JavaScript — see bootstrap.js header comment.
 */

export function registerHandler(method: string, fn: (params: Record<string, unknown>) => Promise<unknown> | unknown): void;
export function unregisterHandler(method: string): void;
export function startServer(socketPath: string): Promise<{ socketPath: string }>;
export function stopServer(): void;
export function getSocketPath(): null | string;
