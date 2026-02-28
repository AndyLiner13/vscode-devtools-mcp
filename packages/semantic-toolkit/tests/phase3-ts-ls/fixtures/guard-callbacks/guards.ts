// Guard Callbacks fixture — guards and usages

import type { User, Admin, Guest, Person, Animal, Cat, Dog } from './types';

// ── Type guard functions ────────────────────────────────────

export function isUser(value: Person): value is User {
	return value.kind === 'user';
}

export function isAdmin(value: Person): value is Admin {
	return value.kind === 'admin';
}

export function isCat(value: Animal): value is Cat {
	return value.type === 'cat';
}

export function assertDefined<T>(value: T | null | undefined): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error('Value is null or undefined');
	}
}

export function assertUser(value: Person): asserts value is User {
	if (value.kind !== 'user') {
		throw new Error('Not a user');
	}
}

// ── Non-guard function (control) ────────────────────────────

export function formatPerson(p: Person): string {
	return p.kind;
}

// ── Array .filter() with type guard → narrowed array ────────

const people: Person[] = [
	{ kind: 'user', name: 'Alice', email: 'alice@example.com' },
	{ kind: 'admin', name: 'Bob', permissions: ['read'] },
	{ kind: 'guest' },
];

export const users = people.filter(isUser);
export const admins = people.filter(isAdmin);

const animals: Animal[] = [];
export const cats = animals.filter(isCat);

// ── Array .forEach() with assertion guard ───────────────────

const maybeNames: (string | null)[] = ['a', null, 'b'];
maybeNames.forEach(assertDefined);

// ── Array .find() with type guard ───────────────────────────

export const firstUser = people.find(isUser);

// ── Custom HOF that accepts a type predicate ────────────────

export function filterByGuard<T, S extends T>(
	arr: T[],
	guard: (item: T) => item is S,
): S[] {
	return arr.filter(guard);
}

export const customFiltered = filterByGuard(people, isUser);

// ── Custom HOF with assertion predicate parameter ───────────

export function assertAll<T>(
	arr: (T | null | undefined)[],
	assertion: (item: T | null | undefined) => asserts item is T,
): void {
	for (const item of arr) {
		assertion(item);
	}
}

assertAll(maybeNames, assertDefined);

// ── Non-HOF function (control — no predicate params) ────────

export function processPeople(people: Person[], formatter: (p: Person) => string): string[] {
	return people.map(formatter);
}
