// Fixture: interface with all member kinds for Item 8 testing.

export interface Repository<T> {
	// Properties
	readonly tableName: string;
	version: number;

	// Method signatures
	findById(id: string): Promise<T | null>;
	save(entity: T): Promise<void>;

	// Index signature
	[key: string]: unknown;

	// Call signature — callable interface pattern
	(query: string): T[];

	// Construct signature — newable interface pattern
	new (data: Record<string, unknown>): T;
}

// Minimal interface with no members (edge case)
export interface Empty {}

// Interface with only properties
export interface Config {
	host: string;
	port: number;
	readonly debug: boolean;
}
