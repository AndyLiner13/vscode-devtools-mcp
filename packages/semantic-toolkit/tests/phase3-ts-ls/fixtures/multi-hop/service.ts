/**
 * Multi-hop fixture: service.ts
 *
 * Middle layer 2. Called by middleware.process(), calls helper.normalize().
 */
import { normalize } from './helper';

export function execute(input: string): string {
	return normalize(input);
}
