/**
 * Multi-project fixture — shared/utils.
 *
 * Utility functions exported from the shared project.
 */
import { Entity, EntityId } from './types';

export function validateEntity(entity: Entity): boolean {
	return entity.id.length > 0 && entity.createdAt instanceof Date;
}

export function formatId(id: EntityId): string {
	return `ENT-${id.toUpperCase()}`;
}
