/**
 * Multi-project fixture — shared/types.
 *
 * Canonical type declarations used by both shared utilities and the app.
 */

export interface Entity {
	id: string;
	createdAt: Date;
}

export type EntityId = string;

export enum Priority {
	Low = 'LOW',
	Medium = 'MEDIUM',
	High = 'HIGH',
}
