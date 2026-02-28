/**
 * Lookup test fixture — utils module.
 * Provides standalone functions and case-sensitivity test targets.
 */

export function formatDate(date: Date): string {
	return date.toISOString();
}

export function FormatDate(date: Date): string {
	return date.toLocaleDateString();
}

export const MAX_RETRIES = 3;

export type EventHandler = (event: string) => void;
