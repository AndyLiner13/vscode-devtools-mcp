/**
 * Ambient fixture — .d.ts ambient type declarations.
 *
 * Simulates a hand-written .d.ts file with ambient declarations
 * (no implementation, just type information).
 */

declare function formatCurrency(amount: number, currency: string): string;

declare const MAX_CONNECTIONS: number;

declare interface DatabaseConfig {
	host: string;
	port: number;
	database: string;
}

declare type ConnectionString = `${string}://${string}:${number}/${string}`;

declare class DatabaseDriver {
	connect(config: DatabaseConfig): Promise<void>;
	disconnect(): Promise<void>;
}

declare enum LogLevel {
	Debug = 0,
	Info = 1,
	Warn = 2,
	Error = 3,
}

declare namespace DBUtils {
	function escape(value: string): string;
	function quote(identifier: string): string;
}
