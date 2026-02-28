/** User-defined types for type flow resolution tests. */

export interface User {
	id: number;
	name: string;
	email: string;
	role: Role;
}

export interface Role {
	id: number;
	name: string;
	permissions: Permission[];
}

export interface Permission {
	action: string;
	resource: string;
}

export interface Token {
	value: string;
	expiresAt: number;
}

export interface AuditEntry {
	userId: number;
	action: string;
	timestamp: number;
}

export type UserId = number;

export enum Status {
	Active = 'active',
	Inactive = 'inactive',
	Suspended = 'suspended',
}
