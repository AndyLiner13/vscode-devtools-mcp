/**
 * Ambient fixture — core module that gets augmented.
 *
 * This file is the target of `declare module './core'` in module-augment.ts.
 */

export interface AppService {
	start(): Promise<void>;
	getStatus(): string;
}

export function createAppService(): AppService {
	return {
		start: async () => { /* noop */ },
		getStatus: () => 'running',
	};
}
