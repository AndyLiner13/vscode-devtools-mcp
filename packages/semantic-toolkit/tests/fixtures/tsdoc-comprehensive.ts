/**
 * Comprehensive TSDoc fixture covering every TSDoc tag and feature.
 *
 * @remarks
 * This file tests TSDoc-specific tags that go beyond JSDoc. TSDoc is the
 * documentation standard for TypeScript APIs, designed by Microsoft.
 *
 * @packageDocumentation
 */

/**
 * Represents the severity level of a log message.
 *
 * @public
 */
export enum LogLevel {
	/** Detailed debugging information */
	Debug = 0,
	/** General informational messages */
	Info = 1,
	/** Warning conditions */
	Warn = 2,
	/** Error conditions */
	Error = 3,
}

/**
 * Configuration for the logging system.
 *
 * @remarks
 * This interface uses {@link LogLevel} to determine minimum output level.
 * All properties are validated at construction time.
 *
 * @example
 * ```typescript
 * const config: LogConfig = {
 *   level: LogLevel.Info,
 *   prefix: '[APP]',
 *   timestamp: true,
 * };
 * ```
 *
 * @public
 */
export interface LogConfig {
	/** Minimum log level to output */
	level: LogLevel;
	/** Optional prefix for all messages */
	prefix?: string;
	/** Whether to include timestamps - {@defaultValue false} */
	timestamp: boolean;
}

/**
 * Event payload delivered when a log entry is created.
 *
 * @typeParam T - The type of the event data payload
 *
 * @sealed
 * @public
 */
export interface LogEvent<T = unknown> {
	/** The log level of this event */
	readonly level: LogLevel;
	/** The message text */
	readonly message: string;
	/** Optional structured data */
	readonly data?: T;
	/** ISO 8601 timestamp */
	readonly timestamp: string;
}

/**
 * Extract the data type from a LogEvent.
 *
 * @typeParam E - A LogEvent type to extract data from
 * @public
 */
export type ExtractEventData<E extends LogEvent> = E extends LogEvent<infer D> ? D : never;

/**
 * A high-performance logger with structured output.
 *
 * @remarks
 * The Logger class provides a fluent API for structured logging. It supports
 * child loggers, middleware, and multiple output targets.
 *
 * See {@link LogConfig} for configuration options.
 * See {@link Logger.(log:instance) | the log method} for basic usage.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const logger = new Logger({ level: LogLevel.Info, timestamp: true });
 * logger.info('Server started', { port: 3000 });
 * ```
 *
 * @example
 * Child loggers:
 * ```typescript
 * const child = logger.child('[HTTP]');
 * child.warn('Slow request', { duration: 5000 });
 * ```
 *
 * @typeParam TData - Default type for structured data in log entries
 *
 * @public
 */
export class Logger<TData = unknown> {
	/**
	 * The active configuration.
	 *
	 * @readonly
	 */
	readonly config: LogConfig;

	/**
	 * Total entries logged across all instances.
	 *
	 * @remarks
	 * This counter is shared across all Logger instances and can be used
	 * for metrics and monitoring.
	 *
	 * @internal
	 */
	static totalEntries = 0;

	/**
	 * Creates a new Logger instance.
	 *
	 * @param config - Logger configuration
	 *
	 * @throws {@link Error}
	 * Thrown if the config object is null or missing required fields.
	 */
	constructor(config: LogConfig) {
		this.config = config;
	}

	/**
	 * Logs a message at the specified level.
	 *
	 * @remarks
	 * This is the core logging method. Higher-level methods like
	 * {@link Logger.info} and {@link Logger.error} delegate to this method.
	 *
	 * @param level - The severity level
	 * @param message - The log message
	 * @param data - Optional structured data to attach
	 * @returns The created log event for chaining or inspection
	 *
	 * @beta
	 */
	log(level: LogLevel, message: string, data?: TData): LogEvent<TData> {
		Logger.totalEntries++;
		return {
			level,
			message: this.config.prefix ? `${this.config.prefix} ${message}` : message,
			data,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Logs an informational message.
	 *
	 * @param message - The info message
	 * @param data - Optional data payload
	 * @returns The log event
	 *
	 * @public
	 */
	info(message: string, data?: TData): LogEvent<TData> {
		return this.log(LogLevel.Info, message, data);
	}

	/**
	 * Logs an error message.
	 *
	 * @param message - The error message
	 * @param data - Optional data payload
	 * @returns The log event
	 *
	 * @public
	 */
	error(message: string, data?: TData): LogEvent<TData> {
		return this.log(LogLevel.Error, message, data);
	}

	/**
	 * Creates a child logger with a sub-prefix.
	 *
	 * @remarks
	 * Child loggers inherit the parent's configuration but prepend
	 * an additional prefix segment.
	 *
	 * @param childPrefix - Prefix for the child logger
	 * @returns A new Logger instance with the combined prefix
	 *
	 * @public
	 */
	child(childPrefix: string): Logger<TData> {
		const combinedPrefix = this.config.prefix
			? `${this.config.prefix}${childPrefix}`
			: childPrefix;
		return new Logger({ ...this.config, prefix: combinedPrefix });
	}

	/**
	 * Formats a log event for display.
	 *
	 * @virtual
	 * @param event - The event to format
	 * @returns Formatted string representation
	 *
	 * @override
	 */
	protected format(event: LogEvent<TData>): string {
		const parts = [LogLevel[event.level]];
		if (event.timestamp) parts.unshift(event.timestamp);
		parts.push(event.message);
		return parts.join(' | ');
	}
}

/**
 * Creates a pre-configured Logger for development use.
 *
 * @remarks
 * This factory function creates a logger with debug-level verbosity,
 * timestamps enabled, and a `[DEV]` prefix. Not recommended for production.
 *
 * @returns A Logger configured for development
 *
 * @example
 * ```typescript
 * const devLog = createDevLogger();
 * devLog.info('Hot reload triggered');
 * ```
 *
 * @deprecated Use {@link Logger} constructor with explicit config instead.
 * This function will be removed in version 3.0.
 *
 * @public
 */
export function createDevLogger(): Logger {
	return new Logger({
		level: LogLevel.Debug,
		prefix: '[DEV]',
		timestamp: true,
	});
}

/**
 * Type guard that checks if a value is a valid {@link LogEvent}.
 *
 * @param value - The value to check
 * @returns True if the value conforms to the LogEvent interface
 *
 * @public
 */
export function isLogEvent(value: unknown): value is LogEvent {
	return (
		typeof value === 'object' &&
		value !== null &&
		'level' in value &&
		'message' in value &&
		'timestamp' in value
	);
}
