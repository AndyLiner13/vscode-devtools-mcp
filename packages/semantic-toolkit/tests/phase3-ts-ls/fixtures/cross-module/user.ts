/**
 * Cross-module fixture — concrete class and functions.
 *
 * Has both named exports and a default export for barrel testing.
 */
import { Entity, EntityId, Status, BaseService } from './types';

export interface User extends Entity {
	name: string;
	email: string;
	status: Status;
}

export class UserService extends BaseService<User> {
	private users: Map<EntityId, User> = new Map();

	findById(id: EntityId): User | undefined {
		this.log(`Finding user ${id}`);
		return this.users.get(id);
	}

	save(user: User): void {
		this.log(`Saving user ${user.id}`);
		this.users.set(user.id, user);
	}

	activate(id: EntityId): void {
		const user = this.findById(id);
		if (user) {
			user.status = Status.Active;
			this.save(user);
		}
	}
}

export function createDefaultUser(name: string): User {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date(),
		name,
		email: `${name.toLowerCase()}@example.com`,
		status: Status.Active,
	};
}

function internalHelper(): string {
	return 'internal';
}

export default function createUser(name: string, email: string): User {
	internalHelper();
	return {
		id: crypto.randomUUID(),
		createdAt: new Date(),
		name,
		email,
		status: Status.Inactive,
	};
}
