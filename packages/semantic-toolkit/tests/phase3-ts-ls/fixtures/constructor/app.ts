/**
 * Constructor fixture: app.ts
 *
 * Entry point that uses `new Database()` and calls Database.query().
 */
import { Database } from './database';

export function initApp(): string {
	const db = new Database('postgres://localhost/test');
	return db.query('SELECT 1');
}
