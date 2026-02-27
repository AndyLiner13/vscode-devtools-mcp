export type ID = string;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type Nullable<T> = T | null | undefined;

export type Keys<T> = keyof T;

export type ReadonlyRecord<K extends string, V> = Readonly<Record<K, V>>;

export type EventName = `on${Capitalize<string>}`;

export type InferArray<T> = T extends Array<infer U> ? U : never;
