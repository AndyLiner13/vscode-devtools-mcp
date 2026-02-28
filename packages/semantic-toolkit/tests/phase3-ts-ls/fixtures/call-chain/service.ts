/**
 * Call-chain fixture: service.ts
 *
 * Top-level entry point. Calls validator.validate() and formatter.format().
 */
import { validate } from './validator';
import { format } from './formatter';

export function processRequest(input: string): string {
	const cleaned = validate(input);
	return format(cleaned);
}
