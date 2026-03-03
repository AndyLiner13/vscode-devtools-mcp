import type { Node } from 'ts-morph';

/**
 * Check if a ts-morph node has a body (is body-bearing).
 * Runtime check — no static kind set needed.
 */
export function hasBody(node: Node): boolean {
	return 'getBody' in node
		&& typeof (node as Record<string, unknown>).getBody === 'function'
		&& (node as unknown as { getBody(): unknown }).getBody() !== undefined;
}

/**
 * Collapse a node's body, preserving the declaration header.
 * Uses ts-morph AST positions — no regex or string patterns.
 * Always includes the collapse message when body is present.
 */
export function collapseBody(node: Node): string {
	if (!hasBody(node)) return node.getText();

	const body = (node as unknown as { getBody(): Node }).getBody();
	const fullText = node.getText();
	const bodyStart = body.getStart() - node.getStart();

	const header = fullText.slice(0, bodyStart).trimEnd();

	const lineCount = body.getEndLineNumber() - body.getStartLineNumber() + 1;

	return `${header} {/** ${lineCount} lines collapsed */}`;
}

/**
 * Build embedding text for a node: its source with body-bearing
 * children collapsed to stubs.
 *
 * For leaf symbols (no body-bearing children), returns the source unchanged.
 * For containers (classes, interfaces, enums), each body-bearing member
 * is replaced with its collapsed stub.
 */
export function buildEmbeddingText(node: Node): string {
	const members = getMembers(node);
	if (members.length === 0) return node.getText();

	const bodyBearingMembers = members.filter(hasBody);
	if (bodyBearingMembers.length === 0) return node.getText();

	const fullText = node.getText();
	const nodeStart = node.getStart();

	interface Replacement {
		startOffset: number;
		endOffset: number;
		stub: string;
	}

	const replacements: Replacement[] = [];

	for (const member of bodyBearingMembers) {
		const memberStart = member.getStart() - nodeStart;
		const memberEnd = member.getEnd() - nodeStart;

		const stub = collapseBody(member);
		replacements.push({
			startOffset: memberStart,
			endOffset: memberEnd,
			stub,
		});
	}

	// Sort by offset descending so replacements don't shift positions
	replacements.sort((a, b) => b.startOffset - a.startOffset);

	let result = fullText;
	for (const { startOffset, endOffset, stub } of replacements) {
		result = result.slice(0, startOffset) + stub + result.slice(endOffset);
	}

	return result;
}

/**
 * Get members of a container node (class, interface, enum, etc.).
 * Returns empty array for non-container nodes.
 */
function getMembers(node: Node): Node[] {
	if ('getMembers' in node && typeof (node as Record<string, unknown>).getMembers === 'function') {
		return (node as unknown as { getMembers(): Node[] }).getMembers();
	}
	return [];
}
