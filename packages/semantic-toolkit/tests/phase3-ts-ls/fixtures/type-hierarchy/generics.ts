import { Entity } from './interfaces';

/** Generic repository with constrained and defaulted type parameters. */
export class Repository<T extends Entity, ID = string> {
	private items: Map<ID, T> = new Map();

	add(id: ID, item: T): void {
		this.items.set(id, item);
	}

	get(id: ID): T | undefined {
		return this.items.get(id);
	}
}

/** Unconstrained generic container. */
export class Container<T> {
	constructor(public value: T) {}
}

/** Generic interface with constraint. */
export interface Queryable<T extends Entity> {
	findAll(): T[];
	findById(id: string): T | undefined;
}

/** Non-generic class for comparison. */
export class SimpleService {
	run(): void { /* no-op */ }
}
