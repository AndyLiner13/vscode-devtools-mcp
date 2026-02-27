export interface Box {
	width: number;
	height: number;
}

export interface Box {
	color: string;
	label?: string;
}

export class EventEmitter {
	on(event: string, listener: Function): void {
		// register
	}
}

export namespace EventEmitter {
	export interface Options {
		maxListeners: number;
	}

	export function create(opts?: Options): EventEmitter {
		return new EventEmitter();
	}
}

export function logger(message: string): void {
	console.log(message);
}

export namespace logger {
	export let level: 'debug' | 'info' | 'warn' | 'error' = 'info';

	export function setLevel(newLevel: typeof level): void {
		level = newLevel;
	}
}
