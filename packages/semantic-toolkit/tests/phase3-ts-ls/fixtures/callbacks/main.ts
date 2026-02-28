// Callback / Higher-Order Function fixture — main module
//
// Contains pure named functions used as callbacks, custom HOFs,
// event-style APIs, .bind() patterns, and function-returning HOFs.

// ── Pure named functions used as callbacks ──────────────────

export function double(n: number): number {
	return n * 2;
}

export function isEven(n: number): boolean {
	return n % 2 === 0;
}

export function toUpper(s: string): string {
	return s.toUpperCase();
}

export function logError(err: Error): void {
	console.error(err.message);
}

export function parseJSON(raw: string): unknown {
	return JSON.parse(raw);
}

// ── Array method callback usages ────────────────────────────

const numbers = [1, 2, 3, 4];
const doubled = numbers.map(double);
const evens = numbers.filter(isEven);
const names = ['a', 'b'].map(toUpper);

// ── Promise chain callback usages ───────────────────────────

declare function fetchData(): Promise<string>;

const result = fetchData()
	.then(parseJSON)
	.catch(logError);

// ── Custom Higher-Order Functions ───────────────────────────

export function retry(fn: () => void, times: number): void {
	for (let i = 0; i < times; i++) {
		try { fn(); return; } catch { /* retry */ }
	}
}

export function debounce(fn: (...args: unknown[]) => void, ms: number): (...args: unknown[]) => void {
	let timer: ReturnType<typeof setTimeout>;
	return (...args: unknown[]) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}

export function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C {
	return (a: A) => f(g(a));
}

// usages of custom HOFs with named functions
const retryDouble = retry(double as unknown as () => void, 3);
const debouncedLog = debounce(logError as unknown as (...args: unknown[]) => void, 200);

// ── Event-style API ─────────────────────────────────────────

export class EventBus {
	private handlers = new Map<string, Array<(...args: unknown[]) => void>>();

	on(event: string, handler: (...args: unknown[]) => void): void {
		const list = this.handlers.get(event) ?? [];
		list.push(handler);
		this.handlers.set(event, list);
	}

	emit(event: string, ...args: unknown[]): void {
		for (const h of this.handlers.get(event) ?? []) h(...args);
	}
}

const bus = new EventBus();
bus.on('error', logError as unknown as (...args: unknown[]) => void);

// ── .bind(this) pattern ─────────────────────────────────────

export class Processor {
	private label = 'proc';

	format(n: number): string {
		return `${this.label}:${n}`;
	}

	setup(): void {
		const nums = [1, 2, 3];
		nums.forEach(this.format.bind(this));
	}
}

// ── Function-returning HOF (returnsFunction) ────────────────

export function multiplier(factor: number): (n: number) => number {
	return (n: number) => n * factor;
}

export function withLogging<T extends (...args: unknown[]) => unknown>(
	fn: T,
): T {
	return ((...args: unknown[]) => {
		console.log('call', args);
		return fn(...args);
	}) as unknown as T;
}

// ── Function with multiple callback parameters ──────────────

export function onResult(
	onSuccess: (data: string) => void,
	onError: (err: Error) => void,
): void {
	try {
		onSuccess('ok');
	} catch (e) {
		onError(e as Error);
	}
}
