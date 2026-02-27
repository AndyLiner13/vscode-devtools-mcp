export namespace Validation {
	export interface Rule {
		name: string;
		validate(value: unknown): boolean;
	}

	export function createRule(name: string, fn: (v: unknown) => boolean): Rule {
		return { name, validate: fn };
	}

	export namespace Errors {
		export class ValidationError extends Error {
			constructor(public readonly rule: string) {
				super(`Validation failed: ${rule}`);
			}
		}
	}
}

declare module 'express' {
	interface Request {
		userId?: string;
	}
}
