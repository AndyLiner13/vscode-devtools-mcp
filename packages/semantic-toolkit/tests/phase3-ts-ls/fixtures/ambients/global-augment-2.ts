/**
 * Ambient fixture — second declare global block (tests multiple blocks in project).
 *
 * Adds additional globals from a different file.
 */

export {};

declare global {
	function globalLogger(level: string, message: string): void;

	interface Window {
		__APP_STATE__: Record<string, unknown>;
	}
}
