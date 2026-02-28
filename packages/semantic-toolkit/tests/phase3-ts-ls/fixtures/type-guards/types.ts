/**
 * Type guard fixture — types used across guard examples.
 */

export interface User {
	id: string;
	name: string;
	email: string;
	role: 'admin' | 'user' | 'guest';
}

export interface Admin extends User {
	role: 'admin';
	permissions: string[];
}

export interface Guest extends User {
	role: 'guest';
	sessionId: string;
}

// Discriminated union
export type Shape =
	| { kind: 'circle'; radius: number }
	| { kind: 'square'; side: number }
	| { kind: 'triangle'; base: number; height: number };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
