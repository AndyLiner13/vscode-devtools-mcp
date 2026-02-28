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

/**
 * Build the parent chain (breadcrumb ancestors) for a symbol.
 * Returns an array of ancestor names from root to immediate parent.
 */
export function buildParentChain(
	parentName: string | null,
	parentChains: Map<string, string[]>,
): string[] {
	if (parentName === null) return [];
	const ancestorChain = parentChains.get(parentName) ?? [];
	return [...ancestorChain, parentName];
}

/**
 * Build the breadcrumb string: "relativePath > parent > ... > name".
 */
export function buildBreadcrumb(
	relativePath: string,
	name: string,
	parentChain: string[],
): string {
	const parts = [relativePath, ...parentChain, name];
	return parts.join(' > ');
}
