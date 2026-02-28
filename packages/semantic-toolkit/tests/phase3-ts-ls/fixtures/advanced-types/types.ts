// Advanced Types fixture — all patterns

// ── Conditional types ───────────────────────────────────────

export type IsString<T> = T extends string ? true : false;

export type TypeName<T> =
	T extends string ? 'string' :
	T extends number ? 'number' :
	T extends boolean ? 'boolean' :
	'other';

export type UnpackPromise<T> = T extends Promise<infer R> ? R : T;

export type UnpackArray<T> = T extends Array<infer E> ? E : never;

export type FunctionReturnType<T> = T extends (...args: infer A) => infer R ? R : never;

// ── Mapped types ────────────────────────────────────────────

export type Nullable<T> = { [K in keyof T]: T[K] | null };

export type ReadonlyDeep<T> = { readonly [K in keyof T]: T[K] };

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type RequiredFields<T> = { [K in keyof T]-?: T[K] };

export type Getters<T> = {
	[K in keyof T as  `get${Capitalize<string & K>}`]: () => T[K]
};

// ── Template literal types ──────────────────────────────────

export type EventName = `on${string}`;

export type PropGetter<T extends string> = `get${Capitalize<T>}`;

export type CssProperty = `${string}-${string}`;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ApiPath = `/${string}`;
export type ApiEndpoint = `${HttpMethod} ${ApiPath}`;

// ── Utility types ───────────────────────────────────────────

interface User {
	id: number;
	name: string;
	email: string;
	age?: number;
}

export type PartialUser = Partial<User>;
export type RequiredUser = Required<User>;
export type ReadonlyUser = Readonly<User>;
export type UserRecord = Record<string, User>;
export type UserNameEmail = Pick<User, 'name' | 'email'>;
export type UserWithoutEmail = Omit<User, 'email'>;
export type NonNullString = NonNullable<string | null | undefined>;

export type FnReturn = ReturnType<typeof parseInt>;
export type FnParams = Parameters<typeof parseInt>;

// ── Union and intersection types ────────────────────────────

export type StringOrNumber = string | number;
export type WithTimestamp = User & { timestamp: Date };

// ── Indexed access types ────────────────────────────────────

export type UserName = User['name'];
export type UserIdOrName = User['id' | 'name'];

// ── keyof types ─────────────────────────────────────────────

export type UserKeys = keyof User;

// ── Nested / complex types ──────────────────────────────────

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

export type IsArray<T> = T extends Array<infer E>
	? E extends string
		? 'string-array'
		: 'other-array'
	: 'not-array';

// ── Simple type alias (control) ─────────────────────────────

export type UserId = number;
export type Callback = () => void;
