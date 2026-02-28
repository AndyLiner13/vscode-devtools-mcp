// Fixture: all symbol kinds for Item 9 signature + modifiers testing.

// --- Functions ---
export async function fetchData(url: string, retries?: number): Promise<string> {
	return url;
}

function helperFn(a: number, b: number): number {
	return a + b;
}

export function genericFn<T extends object>(items: T[], ...extra: string[]): T | null {
	return items[0] ?? null;
}

// --- Variables ---
export const MAX_RETRIES: number = 3;
let counter = 0;

// --- Type aliases ---
export type UserId = string;
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// --- Enums ---
export enum Direction {
	Up = 'UP',
	Down = 'DOWN',
	Left = 'LEFT',
	Right = 'RIGHT',
}

export const enum LogLevel {
	Debug,
	Info,
	Warn,
	Error,
}

// --- Interfaces ---
export interface Serializable {
	toJSON(): string;
}

export interface Repository<T extends object> extends Serializable {
	findById(id: string): Promise<T | null>;
	readonly name: string;
}

// --- Classes ---
export abstract class BaseService {
	abstract init(): void;
}

export class UserService extends BaseService implements Serializable {
	public readonly id: number;
	private secret: string;
	protected static count: number = 0;

	constructor(id: number, secret: string) {
		super();
		this.id = id;
		this.secret = secret;
	}

	public async fetchUser(userId: UserId): Promise<string> {
		return `User-${userId}`;
	}

	private static reset(): void {
		UserService.count = 0;
	}

	override init(): void {
		// no-op
	}

	get isActive(): boolean {
		return this.id > 0;
	}

	set threshold(value: number) {
		UserService.count = value;
	}

	toJSON(): string {
		return JSON.stringify({ id: this.id });
	}
}
