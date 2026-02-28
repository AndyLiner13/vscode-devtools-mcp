/**
 * Multi-hop fixture: middleware.ts
 *
 * Middle layer 1. Called by entry.handle(), calls service.execute().
 */
import { execute } from './service';

export function process(input: string): string {
	return execute(input);
}
