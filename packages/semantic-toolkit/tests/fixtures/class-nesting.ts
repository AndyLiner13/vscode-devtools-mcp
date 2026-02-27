export class EventEmitter {
	private handlers: Map<string, Array<() => void>> = new Map();

	on(event: string, handler: () => void): void {
		const existing = this.handlers.get(event) ?? [];
		existing.push(handler);
		this.handlers.set(event, existing);
	}

	emit(event: string): void {
		const handlers = this.handlers.get(event);
		if (handlers) {
			const process = (list: Array<() => void>): void => {
				for (const fn of list) {
					fn();
				}
			};
			process(handlers);
		}
	}

	createScoped(prefix: string): { on: (e: string, h: () => void) => void } {
		return {
			on: (e: string, h: () => void) => {
				this.on(`${prefix}:${e}`, h);
			},
		};
	}
}
