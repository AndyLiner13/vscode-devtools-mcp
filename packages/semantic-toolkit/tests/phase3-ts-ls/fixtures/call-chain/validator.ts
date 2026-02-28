/**
 * Call-chain fixture: validator.ts
 *
 * Middle layer. Called by service.processRequest().
 * Calls helper.sanitize() internally.
 */
import { sanitize } from './helper';

export function validate(input: string): string {
	if (!input) {
		throw new Error('Input is required');
	}
	return sanitize(input);
}
