/**
 * Cycle fixture: self-recursive.ts
 *
 * Self-recursion: factorial calls itself.
 */

export function factorial(n: number): number {
	if (n <= 1) return 1;
	return n * factorial(n - 1);
}
