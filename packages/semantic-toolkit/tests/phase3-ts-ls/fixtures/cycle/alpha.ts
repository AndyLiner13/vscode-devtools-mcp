/**
 * Cycle fixture: alpha.ts
 *
 * Mutual recursion: alpha → beta → alpha (direct 2-node cycle).
 */
import { beta } from './beta';

export function alpha(n: number): number {
	if (n <= 0) return 0;
	return beta(n - 1);
}
