declare module 'express' {
	interface Request {
		userId?: string;
		sessionId: string;
	}
}

declare module '*.svg' {
	const content: string;
	export default content;
}

declare global {
	interface Window {
		__APP_VERSION__: string;
	}

	function __DEV_LOG__(message: string): void;
}

declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production' | 'test';
		PORT?: string;
	}
}

declare class ExternalLib {
	constructor(config: Record<string, unknown>);
	init(): Promise<void>;
}

declare function fetchData(url: string): Promise<unknown>;

declare const API_BASE: string;
