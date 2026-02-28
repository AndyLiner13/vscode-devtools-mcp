/**
 * Cycle fixture: beta.ts
 *
 * Mutual recursion: beta → alpha → beta (direct 2-node cycle).
 */
import { alpha } from './alpha';

export function beta(n: number): number {
	if (n <= 0) return 1;
	return alpha(n - 1);
}
