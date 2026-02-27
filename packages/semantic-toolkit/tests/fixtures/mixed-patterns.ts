import { EventEmitter } from 'events';
import type { Readable } from 'stream';

export { EventEmitter as EE } from 'events';

const VERSION = '1.0.0';
let counter = 0;

export function initialize(config: Record<string, unknown>): void {
	counter++;
}

export const handler = async (event: unknown): Promise<void> => {
	console.log(event);
};

interface Config {
	host: string;
	port: number;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export enum Level {
	Low = 'low',
	Medium = 'medium',
	High = 'high',
}

export class Service extends EventEmitter {
	private name: string;

	constructor(name: string) {
		super();
		this.name = name;
	}

	getName(): string {
		return this.name;
	}

	static create(name: string): Service {
		return new Service(name);
	}
}

namespace Internal {
	export function helper(): void {}
}

console.log('loaded');
