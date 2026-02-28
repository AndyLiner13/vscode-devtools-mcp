/**
 * Cross-module fixture — cross-file declaration merging.
 *
 * Augments the Config interface from config.ts with additional
 * properties, adding optional ssl and timeout settings.
 */
import { Config } from './config';

declare module './config' {
	interface Config {
		ssl?: boolean;
		timeout?: number;
	}
}

export function applyDefaults(config: Partial<Config>): Config {
	return {
		host: config.host ?? 'localhost',
		port: config.port ?? 3000,
		debug: config.debug ?? false,
		ssl: config.ssl ?? false,
		timeout: config.timeout ?? 5000,
	};
}
