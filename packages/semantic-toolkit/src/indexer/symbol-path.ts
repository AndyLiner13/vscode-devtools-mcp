/**
 * Phase 7 — symbolPath parser/adapter.
 *
 * symbolPath is a kind-annotated materialized path encoding the full hierarchy.
 * Format: "Kind:Name.Kind:Name" at each level, dot-separated.
 *
 * Example: "ClassDeclaration:AuthService.MethodDeclaration:validateToken"
 */

import type { Node } from 'ts-morph';

const SEGMENT_SEPARATOR = '.';
const KIND_SEPARATOR = ':';

/**
 * Parse the symbol name from the last segment.
 * "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "validateToken"
 */
export function parseName(symbolPath: string): string {
	const lastSegment = symbolPath.slice(symbolPath.lastIndexOf(SEGMENT_SEPARATOR) + 1);
	const colonIdx = lastSegment.indexOf(KIND_SEPARATOR);
	return colonIdx === -1 ? lastSegment : lastSegment.slice(colonIdx + 1);
}

/**
 * Parse the node kind from the last segment.
 * "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "MethodDeclaration"
 */
export function parseKind(symbolPath: string): string {
	const lastSegment = symbolPath.slice(symbolPath.lastIndexOf(SEGMENT_SEPARATOR) + 1);
	const colonIdx = lastSegment.indexOf(KIND_SEPARATOR);
	return colonIdx === -1 ? lastSegment : lastSegment.slice(0, colonIdx);
}

/**
 * Strip kind annotations to produce a clean display path.
 * "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "AuthService.validateToken"
 */
export function parseCleanPath(symbolPath: string): string {
	return symbolPath
		.split(SEGMENT_SEPARATOR)
		.map(segment => {
			const colonIdx = segment.indexOf(KIND_SEPARATOR);
			return colonIdx === -1 ? segment : segment.slice(colonIdx + 1);
		})
		.join(SEGMENT_SEPARATOR);
}

/**
 * Get the parent's symbolPath by dropping the last segment.
 * "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → "ClassDeclaration:AuthService"
 * "FunctionDeclaration:validateToken" → null (root-level)
 */
export function parseParentPath(symbolPath: string): string | null {
	const dotIdx = symbolPath.lastIndexOf(SEGMENT_SEPARATOR);
	return dotIdx === -1 ? null : symbolPath.slice(0, dotIdx);
}

/**
 * Count the nesting depth (0-indexed).
 * "FunctionDeclaration:validateToken" → 0
 * "ClassDeclaration:AuthService.MethodDeclaration:validateToken" → 1
 */
export function parseDepth(symbolPath: string): number {
	let count = 0;
	for (const ch of symbolPath) {
		if (ch === SEGMENT_SEPARATOR[0]) count++;
	}
	return count;
}

/**
 * Get a label for a ts-morph node: named declarations use getName(), others use getKindName().
 */
function getNodeLabel(node: Node): string {
	if ('getName' in node && typeof (node as Record<string, unknown>).getName === 'function') {
		const name = (node as unknown as { getName(): string | undefined }).getName();
		if (name) return name;
	}
	return node.getKindName();
}

/**
 * Build a symbolPath from a ts-morph node and its ancestor chain.
 * ancestors should be ordered from root to immediate parent (outermost first).
 */
export function buildSymbolPath(node: Node, ancestors: Node[]): string {
	const segments: string[] = [];
	for (const ancestor of ancestors) {
		segments.push(`${ancestor.getKindName()}${KIND_SEPARATOR}${getNodeLabel(ancestor)}`);
	}
	segments.push(`${node.getKindName()}${KIND_SEPARATOR}${getNodeLabel(node)}`);
	return segments.join(SEGMENT_SEPARATOR);
}

/**
 * Build a symbolPath from raw kind/name components (no ts-morph dependency).
 * Used when constructing paths from stored data or tests.
 */
export function buildSymbolPathFromParts(
	...parts: Array<{ kind: string; name: string }>
): string {
	return parts
		.map(p => `${p.kind}${KIND_SEPARATOR}${p.name}`)
		.join(SEGMENT_SEPARATOR);
}
