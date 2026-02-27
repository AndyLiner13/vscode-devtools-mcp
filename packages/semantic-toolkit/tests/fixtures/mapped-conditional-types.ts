export type DeepReadonly<T> = {
	readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ExtractByType<T, U> = {
	[K in keyof T as T[K] extends U ? K : never]: T[K];
};

export type InferPromise<T> = T extends Promise<infer U>
	? U extends Promise<infer V>
		? V
		: U
	: T;

export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
	x: infer I,
) => void
	? I
	: never;

export type Getters<T> = {
	[K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

export type RemovePrefix<S extends string, P extends string> = S extends `${P}${infer Rest}`
	? Rest
	: S;
