/**
 * Call-chain fixture: formatter.ts
 *
 * Middle layer. Called by service.processRequest().
 * Calls helper.sanitize() internally (shared dependency with validator).
 */
import { sanitize } from './helper';

export function format(input: string): string {
	const clean = sanitize(input);
	return `[formatted] ${clean}`;
}
