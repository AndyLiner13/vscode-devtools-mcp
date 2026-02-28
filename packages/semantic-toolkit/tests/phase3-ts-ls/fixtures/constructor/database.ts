/**
 * Constructor fixture: database.ts
 *
 * Class with an explicit constructor that calls helper.createPool().
 */
import { createPool } from './pool';

export class Database {
	private pool: unknown;

	constructor(connectionString: string) {
		this.pool = createPool(connectionString);
	}

	query(sql: string): string {
		return `result of: ${sql}`;
	}
}
