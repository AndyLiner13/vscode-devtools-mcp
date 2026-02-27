export const TAG: unique symbol = Symbol('tag');

export const BRAND: unique symbol = Symbol('brand');

export interface Tagged {
	readonly [TAG]: true;
}

export type Branded<T, B extends symbol> = T & { readonly [K in B]: true };

export class Registry {
	static readonly KEY: unique symbol = Symbol('registry-key');
	private data = new Map<symbol, unknown>();

	register(key: symbol, value: unknown): void {
		this.data.set(key, value);
	}
}
