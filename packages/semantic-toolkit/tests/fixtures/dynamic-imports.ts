// Tests dynamic import expressions inside functions
// Also includes export= syntax and more mixed patterns

import { existsSync } from 'fs';

export function loadPluginDynamically(pluginName: string): Promise<unknown> {
	return import(`./plugins/${pluginName}`);
}

export async function conditionalLoad(condition: boolean): Promise<unknown> {
	if (condition) {
		const module = await import('./optional-module');
		return module.default;
	}
	return null;
}

// Nested dynamic import inside arrow function
export const lazyLoader = async (name: string) => {
	const mod = await import(name);
	return mod;
};

// Dynamic import with destructuring
export async function loadUtils() {
	const { helper, formatter } = await import('./utils');
	return { helper, formatter };
}

// Using a local import to test relevantImports
export function checkPath(p: string): boolean {
	return existsSync(p);
}
