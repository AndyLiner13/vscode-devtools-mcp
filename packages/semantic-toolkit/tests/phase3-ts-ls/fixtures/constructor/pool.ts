/**
 * Constructor fixture: pool.ts
 *
 * Leaf helper called by Database constructor.
 */

export function createPool(connectionString: string): object {
	return { connection: connectionString };
}
