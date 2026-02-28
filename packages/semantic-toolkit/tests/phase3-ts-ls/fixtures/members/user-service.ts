// Fixture: class with every member kind for Item 8 testing.

export class BaseService {
	toString(): string {
		return 'BaseService';
	}
}

export abstract class UserService extends BaseService {
	// Properties
	public name: string;
	private secret: string;
	protected count: number;
	static instance: UserService | null;
	readonly version: number;
	#internalFlag: boolean;

	// Constructor
	constructor(name: string, secret: string) {
		super();
		this.name = name;
		this.secret = secret;
		this.count = 0;
		this.version = 1;
		this.#internalFlag = false;
		UserService.instance = null;
	}

	// Regular methods
	public async fetchUser(id: number): Promise<string> {
		return `User-${id}`;
	}

	private hashSecret(): string {
		return this.secret.split('').reverse().join('');
	}

	protected resetCount(): void {
		this.count = 0;
	}

	static create(name: string): UserService {
		throw new Error('Abstract');
	}

	abstract validate(input: string): boolean;

	override toString(): string {
		return `UserService(${this.name})`;
	}

	// Getters and setters
	get isActive(): boolean {
		return this.count > 0;
	}

	set threshold(value: number) {
		this.count = value;
	}

	// Index signature
	[key: string]: unknown;
}
