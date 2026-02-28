/**
 * Lookup test fixture — data/repository module.
 * Provides symbols that partially overlap with auth-service for path disambiguation tests.
 */

export interface UserRecord {
	id: string;
	email: string;
}

export class UserRepository {
	private db: Map<string, UserRecord> = new Map();

	findById(id: string): UserRecord | undefined {
		return this.db.get(id);
	}

	save(record: UserRecord): void {
		this.db.set(record.id, record);
	}

	deleteById(id: string): boolean {
		return this.db.delete(id);
	}
}

export function createRepository(): UserRepository {
	return new UserRepository();
}

/** Helper with same name as auth-service's function to test disambiguation. */
export function validateToken(token: string): boolean {
	return token !== '';
}
