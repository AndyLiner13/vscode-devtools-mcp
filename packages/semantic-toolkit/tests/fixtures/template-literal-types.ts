export type EventName = `on${Capitalize<string>}`;

export type CssProperty = `${string}-${string}`;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ApiRoute = `/${string}`;

export type Endpoint = `${Lowercase<HttpMethod>} ${ApiRoute}`;

export type Color = 'red' | 'green' | 'blue';
export type Size = 'small' | 'medium' | 'large';
export type Variant = `${Color}-${Size}`;

export type PropKey<T extends string> = `${T}Changed`;

export type Split<S extends string, D extends string> = S extends `${infer H}${D}${infer T}`
	? [H, ...Split<T, D>]
	: [S];

export type Join<T extends string[], D extends string> = T extends []
	? ''
	: T extends [infer F extends string]
		? F
		: T extends [infer F extends string, ...infer R extends string[]]
			? `${F}${D}${Join<R, D>}`
			: never;

export type DotPath<T, Prefix extends string = ''> = T extends object
	? {
			[K in keyof T & string]: T[K] extends object
				? DotPath<T[K], `${Prefix}${K}.`>
				: `${Prefix}${K}`;
		}[keyof T & string]
	: Prefix;
