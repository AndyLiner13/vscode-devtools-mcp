/** Base interface for all entities. */
export interface Entity {
	id: string;
	createdAt: Date;
}

/** Serializable marker interface. */
export interface Serializable {
	toJSON(): string;
}

/** Auditable marker interface extending Entity. */
export interface Auditable extends Entity {
	updatedAt: Date;
	updatedBy: string;
}
