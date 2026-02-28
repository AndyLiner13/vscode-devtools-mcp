/**
 * Ambient fixture — declare module (ambient module declarations).
 *
 * Declares ambient modules with members. This is a script file (no exports)
 * so `declare module 'xxx'` creates ambient module declarations.
 */

// Ambient module declaration for a fictional external package
declare module 'my-external-lib' {
	interface Request {
		userId?: string;
		sessionToken?: string;
	}

	interface Response {
		sendSuccess(data: unknown): void;
	}

	function createServer(port: number): void;
}

// Ambient module declaration for another fictional package
declare module 'my-config-lib' {
	interface Settings {
		debug: boolean;
		verbose: boolean;
	}

	const VERSION: string;
}
