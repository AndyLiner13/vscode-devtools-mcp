export function assertDefined<T>(value: T | null | undefined): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error('Value must be defined');
	}
}

export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function assertNonEmpty(arr: unknown[]): asserts arr is [unknown, ...unknown[]] {
	if (arr.length === 0) {
		throw new Error('Array must be non-empty');
	}
}

export interface TypeGuard<T> {
	(value: unknown): value is T;
}

export class Validator {
	assertValid(data: unknown): asserts data is Record<string, unknown> {
		if (typeof data !== 'object' || data === null) {
			throw new Error('Invalid data');
		}
	}

	isArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	}
}
