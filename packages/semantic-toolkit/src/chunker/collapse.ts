import type { ParsedSymbol } from '../parser/types.js';
import { BODY_BEARING_KINDS } from '../parser/types.js';

/**
 * Produce the embedding text for a symbol: its source code with
 * body-bearing children collapsed to signature-only stubs.
 *
 * For leaf symbols (no body-bearing children), returns the full source unchanged.
 * For container symbols (class, function with nested functions, etc.),
 * each body-bearing child's full text is replaced by its signature line.
 */
export function collapseChildren(
	fullSource: string,
	sourceStartLine: number,
	children: ParsedSymbol[],
	fileLines: string[],
): string {
	const bodyBearingChildren = children.filter(child => BODY_BEARING_KINDS.has(child.kind));
	if (bodyBearingChildren.length === 0) return fullSource;

	// Work on the lines within this symbol's source range
	const sourceLines = fullSource.split('\n');

	// Build replacement map: for each body-bearing child, replace its lines
	// with a single signature stub line (preserving the child's indentation)
	const replacements: Array<{
		startOffset: number;
		endOffset: number;
		replacement: string;
	}> = [];

	for (const child of bodyBearingChildren) {
		const childStartOffset = child.range.startLine - sourceStartLine;
		const childEndOffset = child.range.endLine - sourceStartLine;

		if (childStartOffset < 0 || childEndOffset >= sourceLines.length) continue;

		const firstLine = sourceLines[childStartOffset];
		const indent = firstLine.match(/^(\s*)/)?.[1] ?? '';

		const stub = `${indent}${child.signature};`;
		replacements.push({
			startOffset: childStartOffset,
			endOffset: childEndOffset,
			replacement: stub,
		});
	}

	if (replacements.length === 0) return fullSource;

	// Sort by start offset descending so replacements don't shift line indices
	replacements.sort((a, b) => b.startOffset - a.startOffset);

	const result = [...sourceLines];
	for (const { startOffset, endOffset, replacement } of replacements) {
		result.splice(startOffset, endOffset - startOffset + 1, replacement);
	}

	return result.join('\n');
}
