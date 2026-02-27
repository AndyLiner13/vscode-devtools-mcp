/** Simple named function */
export function greet(name: string): string {
	return `Hello, ${name}!`;
}

/** Async function with multiple params */
export async function fetchUser(id: number, _token: string): Promise<string> {
	await new Promise(resolve => setTimeout(resolve, id));
	return `user-${id}`;
}

/** Generator function */
export function* range(start: number, end: number): Generator<number> {
	for (let i = start; i < end; i++) {
		yield i;
	}
}

/** Default export function */
export default function main(): void {
	console.log('main');
}

/** Function with nested function */
export function outer(x: number): number {
	function inner(y: number): number {
		return y * 2;
	}
	return inner(x) + 1;
}

/** Function with rest params and generic */
export function merge<T extends object>(...objects: T[]): T {
	return Object.assign({} as T, ...objects);
}
