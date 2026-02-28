/**
 * Multi-hop fixture: entry.ts
 *
 * Top-level entry point. Calls middleware.process().
 * Chain: entry.handle → middleware.process → service.execute → helper.normalize
 */
import { process } from './middleware';

export function handle(input: string): string {
	return process(input);
}
