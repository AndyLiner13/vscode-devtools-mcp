import { Entity, Serializable, Auditable } from './interfaces';

/** Abstract base model: extends nothing, implements Entity + Serializable. */
export abstract class BaseModel implements Entity, Serializable {
	id: string = '';
	createdAt: Date = new Date();

	toJSON(): string {
		return JSON.stringify({ id: this.id, createdAt: this.createdAt });
	}
}

/** User extends BaseModel — single-level class hierarchy. */
export class User extends BaseModel {
	name: string = '';
	email: string = '';
}

/** AdminUser extends User — multi-level class hierarchy. */
export class AdminUser extends User {
	permissions: string[] = [];
}
