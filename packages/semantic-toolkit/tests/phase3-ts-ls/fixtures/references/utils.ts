/** Core utility function referenced across the project. */
export function formatDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

/** Helper used only within this file. */
export function formatTime(date: Date): string {
	return date.toISOString().split('T')[1];
}

/** Internal usage of formatDate within its own file. */
export function formatDateTime(date: Date): string {
	return `${formatDate(date)} ${formatTime(date)}`;
}

/** Type alias referenced from multiple files. */
export type DateString = string;

/** Interface referenced from multiple files. */
export interface Timestamped {
	createdAt: DateString;
	updatedAt: DateString;
}
