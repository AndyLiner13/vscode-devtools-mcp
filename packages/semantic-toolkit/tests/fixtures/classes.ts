/** Base service class */
export abstract class BaseService {
	protected readonly name: string;

	constructor(name: string) {
		this.name = name;
	}

	abstract process(): Promise<void>;
}

/** User service implementation */
export class UserService extends BaseService {
	private users: Map<string, string> = new Map();
	static readonly VERSION = '1.0';

	constructor() {
		super('UserService');
	}

	async process(): Promise<void> {
		for (const [id, name] of this.users) {
			console.log(id, name);
		}
	}

	get count(): number {
		return this.users.size;
	}

	set count(_value: number) {
		throw new Error('Cannot set count');
	}

	static create(): UserService {
		return new UserService();
	}
}
