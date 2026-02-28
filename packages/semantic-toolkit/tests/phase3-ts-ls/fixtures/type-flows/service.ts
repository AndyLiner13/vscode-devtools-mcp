/** Class with constructor and methods for type flow tests. */
import { User, Role, Token, AuditEntry, Status } from './types';

export class UserService {
	private users: User[];
	private readonly defaultRole: Role;

	constructor(defaultRole: Role, initialUsers: User[]) {
		this.defaultRole = defaultRole;
		this.users = initialUsers;
	}

	getById(id: number): User | undefined {
		return this.users.find(u => u.id === id);
	}

	authenticate(user: User, secret: string): Token {
		return { value: secret, expiresAt: Date.now() + 3600000 };
	}

	audit(user: User, action: string): AuditEntry {
		return { userId: user.id, action, timestamp: Date.now() };
	}

	listByStatus(status: Status): User[] {
		return this.users;
	}
}
