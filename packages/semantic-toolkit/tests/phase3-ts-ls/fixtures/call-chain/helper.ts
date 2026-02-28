/**
 * Call-chain fixture: helper.ts
 *
 * Leaf layer. Called by both validator.validate() and formatter.format().
 * Calls no other project functions (only built-in String methods).
 */

export function sanitize(input: string): string {
	return input.trim().toLowerCase();
}
