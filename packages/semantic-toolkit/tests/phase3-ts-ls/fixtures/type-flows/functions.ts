/** Functions with various type flow patterns for testing. */
import { User, Role, Token, AuditEntry, UserId, Status, Permission } from './types';

// Simple: one user-defined param, user-defined return
export function getUser(id: UserId): User {
	return { id, name: '', email: '', role: { id: 0, name: '', permissions: [] } };
}

// Simple: primitive params only, user-defined return
export function createToken(userId: number, secret: string): Token {
	return { value: secret, expiresAt: Date.now() };
}

// No user-defined types at all — only primitives
export function add(a: number, b: number): number {
	return a + b;
}

// Void return, no annotation
export function logMessage(message: string): void {
	console.log(message);
}

// Union type in param: string | User
export function displayName(input: string | User): string {
	return typeof input === 'string' ? input : input.name;
}

// Intersection type in param: User & { admin: boolean }
export function promoteUser(user: User & { admin: boolean }): Role {
	return user.role;
}

// Generic wrapper: Promise<User>
export function fetchUser(id: number): Promise<User> {
	return Promise.resolve({ id, name: '', email: '', role: { id: 0, name: '', permissions: [] } });
}

// Nested generics: Map<string, Array<Token>>
export function getTokenMap(users: Map<string, Array<Token>>): number {
	return users.size;
}

// Tuple type: [User, Token]
export function getUserWithToken(id: number): [User, Token] {
	return [
		{ id, name: '', email: '', role: { id: 0, name: '', permissions: [] } },
		{ value: '', expiresAt: 0 },
	];
}

// Array type: User[]
export function listUsers(status: Status): User[] {
	return [];
}

// Function-typed parameter: callback with user-defined types
export function processUser(
	user: User,
	callback: (entry: AuditEntry) => Token,
): Token {
	return callback({ userId: user.id, action: 'process', timestamp: Date.now() });
}

// Multiple user-defined params, user-defined return
export function assignRole(user: User, role: Role): AuditEntry {
	return { userId: user.id, action: `assigned ${role.name}`, timestamp: Date.now() };
}

// Same type in param and return — tests deduplication in referencedTypes
export function cloneUser(user: User): User {
	return { ...user };
}

// Deeply nested generic: Map<UserId, Set<Permission>>
export function permissionIndex(
	data: Map<UserId, Set<Permission>>,
): number {
	return data.size;
}

// Multiple generics + union return: Promise<User | null>
export function findUser(id: number): Promise<User | null> {
	return Promise.resolve(null);
}
