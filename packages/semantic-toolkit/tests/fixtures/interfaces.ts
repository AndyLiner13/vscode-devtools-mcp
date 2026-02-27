export interface Printable {
	toString(): string;
}

export interface Config {
	readonly host: string;
	port?: number;
	callback(event: string): void;
	[key: string]: unknown;
}

export interface Repository<T> extends Printable {
	findById(id: string): Promise<T | null>;
	save(entity: T): Promise<void>;
	delete(id: string): Promise<boolean>;
}

export interface Factory {
	new (name: string): Printable;
	(config: Config): void;
}
