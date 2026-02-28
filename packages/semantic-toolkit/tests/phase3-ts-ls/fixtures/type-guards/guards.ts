/**
 * Type guard fixture — all guard patterns in one file.
 */
import type { User, Admin, Guest, Shape, Result } from './types';

// -----------------------------------------------------------------------
// User-defined type guard (return type: x is T)
// -----------------------------------------------------------------------

export function isUser(value: unknown): value is User {
	return typeof value === 'object' && value !== null && 'name' in value;
}

export function isAdmin(value: unknown): value is Admin {
	return isUser(value) && value.role === 'admin';
}

// -----------------------------------------------------------------------
// Assertion function (return type: asserts x is T)
// -----------------------------------------------------------------------

export function assertAdmin(value: unknown): asserts value is Admin {
	if (!isUser(value) || value.role !== 'admin') {
		throw new Error('Not an admin');
	}
}

export function assertDefined<T>(value: T | null | undefined): asserts value {
	if (value == null) {
		throw new Error('Value is null or undefined');
	}
}

// -----------------------------------------------------------------------
// typeof guard
// -----------------------------------------------------------------------

export function processInput(input: string | number | boolean): string {
	if (typeof input === 'string') {
		return input.toUpperCase();
	}
	if (typeof input === 'number') {
		return input.toFixed(2);
	}
	return String(input);
}

// -----------------------------------------------------------------------
// instanceof guard
// -----------------------------------------------------------------------

export function handleError(err: unknown): string {
	if (err instanceof TypeError) {
		return `Type error: ${err.message}`;
	}
	if (err instanceof RangeError) {
		return `Range error: ${err.message}`;
	}
	return String(err);
}

// -----------------------------------------------------------------------
// in-operator guard
// -----------------------------------------------------------------------

export function describeAnimal(animal: { name: string } | { name: string; bark(): void }): string {
	if ('bark' in animal) {
		return `Dog: ${animal.name}`;
	}
	return `Animal: ${animal.name}`;
}

// -----------------------------------------------------------------------
// Discriminated union (switch on kind)
// -----------------------------------------------------------------------

export function getArea(shape: Shape): number {
	switch (shape.kind) {
		case 'circle':
			return Math.PI * shape.radius ** 2;
		case 'square':
			return shape.side ** 2;
		case 'triangle':
			return 0.5 * shape.base * shape.height;
		default: {
			const _exhaustive: never = shape;
			return _exhaustive;
		}
	}
}

// -----------------------------------------------------------------------
// Discriminant via if (not switch)
// -----------------------------------------------------------------------

export function handleResult(result: Result<string>): string {
	if (result.ok === true) {
		return result.value;
	}
	return result.error;
}

// -----------------------------------------------------------------------
// Nullish guard
// -----------------------------------------------------------------------

export function greet(name: string | null | undefined): string {
	if (name != null) {
		return `Hello, ${name}`;
	}
	return 'Hello, stranger';
}

export function greetStrict(name: string | null): string {
	if (name !== null) {
		return `Hello, ${name}`;
	}
	return 'Hello, stranger';
}

// -----------------------------------------------------------------------
// Equality narrowing
// -----------------------------------------------------------------------

export function describeStatus(status: 'active' | 'inactive' | 'pending'): string {
	if (status === 'active') {
		return 'User is active';
	}
	if (status === 'pending') {
		return 'User is pending';
	}
	return 'User is inactive';
}

// -----------------------------------------------------------------------
// Array.isArray
// -----------------------------------------------------------------------

export function flatten(input: string | string[]): string[] {
	if (Array.isArray(input)) {
		return input;
	}
	return [input];
}

// -----------------------------------------------------------------------
// Early-return guard clause
// -----------------------------------------------------------------------

export function processUser(user: User | null): string {
	if (!user) return 'no user';
	return user.name;
}

export function processWithThrow(user: User | undefined): string {
	if (!user) throw new Error('missing user');
	return user.name;
}

// -----------------------------------------------------------------------
// Exhaustiveness check (standalone, not in switch)
// -----------------------------------------------------------------------

export function describeShape(shape: Shape): string {
	if (shape.kind === 'circle') return `Circle r=${shape.radius}`;
	if (shape.kind === 'square') return `Square s=${shape.side}`;
	if (shape.kind === 'triangle') return `Triangle`;
	const _check: never = shape;
	return String(_check);
}

// -----------------------------------------------------------------------
// Compound guard (|| combining typeof guards)
// -----------------------------------------------------------------------

export function isStringOrNumber(value: unknown): boolean {
	if (typeof value === 'string' || typeof value === 'number') {
		return true;
	}
	return false;
}

// -----------------------------------------------------------------------
// Compound guard (&& combining guards)
// -----------------------------------------------------------------------

export function isNonNullAdmin(value: unknown): boolean {
	if (value !== null && value instanceof Object) {
		return true;
	}
	return false;
}
