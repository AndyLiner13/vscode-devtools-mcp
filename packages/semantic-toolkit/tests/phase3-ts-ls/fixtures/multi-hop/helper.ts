/**
 * Multi-hop fixture: helper.ts
 *
 * Leaf layer. Called by service.execute().
 * Calls no other project functions (only built-in String methods).
 */

export function normalize(input: string): string {
	return input.trim().toLowerCase();
}
