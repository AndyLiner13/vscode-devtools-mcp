import { formatDate, type DateString } from './utils';

export function generateReport(start: Date, end: Date): string {
	const startStr: DateString = formatDate(start);
	const endStr: DateString = formatDate(end);
	return `Report: ${startStr} to ${endStr}`;
}
