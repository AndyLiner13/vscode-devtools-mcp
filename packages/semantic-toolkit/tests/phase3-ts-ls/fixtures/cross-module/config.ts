/**
 * Cross-module fixture — declaration merging.
 *
 * Interface + namespace with same name in one file,
 * testing that members/signature see both the interface
 * properties and the namespace functions.
 */

export interface Config {
	host: string;
	port: number;
	debug: boolean;
}

export namespace Config {
	export function defaults(): Config {
		return { host: 'localhost', port: 3000, debug: false };
	}

	export function fromEnv(): Config {
		return {
			host: process.env.HOST ?? 'localhost',
			port: Number(process.env.PORT ?? 3000),
			debug: process.env.DEBUG === 'true',
		};
	}
}
