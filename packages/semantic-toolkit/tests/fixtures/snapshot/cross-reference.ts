/**
 * Test fixture: snapshot/cross-reference.ts
 *
 * Method A (validate) calls method B (sanitize) in the same class.
 * Both are targets. Verify both shown with their combined dependencies.
 */

import { Logger } from './logger';
import type { ValidationResult } from './validation-types';

const MAX_INPUT_LENGTH = 10000;
const FORBIDDEN_PATTERNS = ['<script', 'javascript:', 'onerror='];
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em'];

export class InputValidator {
	private logger: Logger;
	private strictMode: boolean;

	constructor(logger: Logger, strictMode: boolean = false) {
		this.logger = logger;
		this.strictMode = strictMode;
	}

	/** TARGET A: validate — calls this.sanitize (target B) and uses MAX_INPUT_LENGTH */
	validate(input: string): ValidationResult {
		this.logger.info('Validating input');

		if (input.length > MAX_INPUT_LENGTH) {
			return { valid: false, error: 'Input too long' };
		}

		const sanitized = this.sanitize(input);

		for (const pattern of FORBIDDEN_PATTERNS) {
			if (sanitized.toLowerCase().includes(pattern)) {
				return { valid: false, error: `Forbidden pattern: ${pattern}` };
			}
		}

		return { valid: true, sanitized };
	}

	/** TARGET B: sanitize — uses ALLOWED_TAGS and this.strictMode */
	sanitize(input: string): string {
		let result = input.trim();

		if (this.strictMode) {
			result = result.replace(/<[^>]+>/g, '');
		} else {
			const tagPattern = new RegExp(
				`<(?!\\/?(?:${ALLOWED_TAGS.join('|')})\\b)[^>]+>`,
				'gi',
			);
			result = result.replace(tagPattern, '');
		}

		return result;
	}

	isValidLength(input: string): boolean {
		return input.length <= MAX_INPUT_LENGTH;
	}

	getStrictMode(): boolean {
		return this.strictMode;
	}

	setStrictMode(mode: boolean): void {
		this.strictMode = mode;
		this.logger.info(`Strict mode set to ${mode}`);
	}

	getAllowedTags(): string[] {
		return [...ALLOWED_TAGS];
	}
}
