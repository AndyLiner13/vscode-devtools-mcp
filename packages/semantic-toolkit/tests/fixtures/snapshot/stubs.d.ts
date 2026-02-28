/**
 * Stub type declarations for snapshot test fixture external modules.
 * These provide minimal type info so ts-morph can resolve imports.
 */

// logger
declare module './logger' {
	export class Logger {
		info(msg: string): void;
		warn(msg: string): void;
		error(msg: string): void;
	}
}

// metrics
declare module './metrics' {
	export class MetricsClient {
		increment(key: string): void;
		gauge(key: string, value: number): void;
	}
}

// payment-gateway
declare module './payment-gateway' {
	export interface PaymentResult {
		id: string;
		amount: number;
		status: string;
	}
	export class PaymentGateway {
		charge(amount: number, currency: string): Promise<PaymentResult>;
		refund(id: string, amount: number): Promise<void>;
		lookup(id: string): Promise<PaymentResult>;
	}
}

// notifications
declare module './notifications' {
	export class NotificationService {
		send(message: string, target: string): Promise<void>;
	}
}

// audit
declare module './audit' {
	export class AuditTrail {
		log(id: string, action: string): Promise<void>;
	}
}

// token-validator
declare module './token-validator' {
	export class TokenValidator {
		verify(token: string): Promise<boolean>;
	}
}

// session-store
declare module './session-store' {
	export interface Session {
		id: string;
		createdAt: number;
		userId: string;
	}
	export class SessionStore {
		create(token: string): Promise<Session>;
		get(id: string): Promise<Session | null>;
		refresh(id: string): Promise<Session>;
		delete(id: string): Promise<void>;
		listActive(): Promise<Session[]>;
		findExpired(maxAge: number): Promise<Session[]>;
	}
}

// cache
declare module './cache' {
	export class CacheClient {
		get(key: string): Promise<string | null>;
		set(key: string, value: string, ttl: number): Promise<void>;
		del(key: string): Promise<void>;
	}
}

// rate-limiter
declare module './rate-limiter' {
	export class RateLimiter {
		check(identifier: string): Promise<boolean>;
	}
}

// validation-types
declare module './validation-types' {
	export interface ValidationResult {
		valid: boolean;
		error?: string;
		sanitized?: string;
	}
}

// database
declare module './database' {
	export interface Database {
		close(): Promise<void>;
	}
	export function connectDatabase(url: string): Promise<Database>;
}

// config
declare module './config' {
	export interface AppConfig {
		port: number;
		host: string;
		name: string;
	}
	export function loadConfig(): AppConfig;
}
