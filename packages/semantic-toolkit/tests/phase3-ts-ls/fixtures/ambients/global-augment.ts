/**
 * Ambient fixture — declare global augmentations.
 *
 * Adds new properties and functions to the global scope.
 */

export {};

declare global {
	// Global function
	function globalHelper(msg: string): void;

	// Global variable
	var APP_VERSION: string;

	// Global interface
	interface GlobalConfig {
		debug: boolean;
		env: string;
	}

	// Global namespace extension
	namespace NodeJS {
		interface ProcessEnv {
			APP_NAME: string;
			APP_PORT: string;
		}
	}
}
