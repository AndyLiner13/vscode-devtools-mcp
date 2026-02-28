/**
 * Cross-module fixture — original type declarations.
 *
 * These are the "source of truth" types that get re-exported
 * through barrel files at multiple levels of indirection.
 */

export interface Entity {
	id: string;
	createdAt: Date;
}

export type EntityId = string;

export enum Status {
	Active = 'ACTIVE',
	Inactive = 'INACTIVE',
}

export abstract class BaseService<T extends Entity> {
	abstract findById(id: EntityId): T | undefined;
	abstract save(entity: T): void;

	protected log(message: string): void {
		console.log(message);
	}
}
