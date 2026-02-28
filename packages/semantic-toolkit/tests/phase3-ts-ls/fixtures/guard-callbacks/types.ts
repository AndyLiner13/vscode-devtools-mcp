// Guard Callbacks fixture — types

export interface User {
	kind: 'user';
	name: string;
	email: string;
}

export interface Admin {
	kind: 'admin';
	name: string;
	permissions: string[];
}

export interface Guest {
	kind: 'guest';
}

export type Person = User | Admin | Guest;

export interface Cat {
	type: 'cat';
	meow(): void;
}

export interface Dog {
	type: 'dog';
	bark(): void;
}

export type Animal = Cat | Dog;
