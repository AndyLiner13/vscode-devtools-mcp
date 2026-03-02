import { createHash } from 'node:crypto';

/**
 * Generate a deterministic chunk ID from the chunk's identity components.
 * Uses SHA-256 hash of filePath + nodeKind + name + startLine + parentChain.
 * startLine disambiguates declaration-merged symbols (e.g., two interfaces with the same name).
 */
export function generateChunkId(
	filePath: string,
	nodeKind: string,
	name: string,
	startLine: number,
	parentChain: string[],
): string {
	const input = [filePath, nodeKind, name, String(startLine), ...parentChain].join('::');
	return createHash('sha256').update(input).digest('hex').slice(0, 16);
}
