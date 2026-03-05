/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { z as zod } from 'zod';

import { fileApplyEdit, fileExtractStructure, fileReadContent, fileShowEditDiff, type FileStructure, type FileSymbol } from '../../client-pipe.js';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';
import { BODY_BEARING_KINDS, CONTROL_FLOW_KINDS, RAW_CODE_KINDS } from './symbol-kinds.js';
import { resolveSymbolTarget } from './symbol-resolver.js';

function resolveFilePath(file: string): string {
	if (path.isAbsolute(file)) return file;
	return path.resolve(getClientWorkspace(), file);
}

function isStandaloneSymbol(symbol: FileSymbol): boolean {
	if (CONTROL_FLOW_KINDS.has(symbol.kind)) return false;
	if (RAW_CODE_KINDS.has(symbol.kind)) return false;
	return symbol.range.endLine > symbol.range.startLine;
}

/**
 * Whether a child symbol would be collapsed (body-bearing with grandchildren).
 * Deepest-leaf body-bearing symbols are NOT collapsed — their content is shown inline.
 */
function isCollapsedChild(child: FileSymbol): boolean {
	if (!BODY_BEARING_KINDS.has(child.kind)) return false;
	return child.children !== undefined && child.children.length > 0;
}

interface LineRange {
	startLine: number;
	endLine: number;
}

/**
 * Compute the "visible scope" lines for a symbol — lines NOT covered by collapsed children.
 * Mirrors what file_read shows when you request a symbol.
 */
function computeVisibleRanges(startLine: number, endLine: number, children: readonly FileSymbol[]): LineRange[] {
	const excludedRanges: LineRange[] = [];
	for (const child of children) {
		if (isCollapsedChild(child)) {
			excludedRanges.push({ startLine: child.range.startLine, endLine: child.range.endLine });
		}
	}
	excludedRanges.sort((a, b) => a.startLine - b.startLine);

	const visible: LineRange[] = [];
	let cursor = startLine;

	for (const excluded of excludedRanges) {
		if (excluded.startLine > cursor) {
			visible.push({ startLine: cursor, endLine: excluded.startLine - 1 });
		}
		cursor = Math.max(cursor, excluded.endLine + 1);
	}

	if (cursor <= endLine) {
		visible.push({ startLine: cursor, endLine });
	}

	return visible;
}

/**
 * Compute root-level visible ranges — lines NOT covered by standalone top-level symbols.
 * Mirrors what file_read shows at root level.
 */
function computeRootVisibleRanges(totalLines: number, symbols: readonly FileSymbol[]): LineRange[] {
	const excludedRanges: LineRange[] = [];
	for (const sym of symbols) {
		if (isStandaloneSymbol(sym)) {
			excludedRanges.push({ startLine: sym.range.startLine, endLine: sym.range.endLine });
		}
	}
	excludedRanges.sort((a, b) => a.startLine - b.startLine);

	const visible: LineRange[] = [];
	let cursor = 1;

	for (const excluded of excludedRanges) {
		if (excluded.startLine > cursor) {
			visible.push({ startLine: cursor, endLine: excluded.startLine - 1 });
		}
		cursor = Math.max(cursor, excluded.endLine + 1);
	}

	if (cursor <= totalLines) {
		visible.push({ startLine: cursor, endLine: totalLines });
	}

	return visible;
}

interface OffsetMapping {
	line: number;
	char: number;
}

/**
 * Build the visible text from line ranges, with a mapping from character offsets
 * back to absolute file positions.
 */
function buildVisibleText(allLines: string[], ranges: LineRange[]): { text: string; offsetToPosition: (offset: number) => OffsetMapping } {
	const segments: Array<{ text: string; startLine: number; startOffset: number }> = [];
	let totalOffset = 0;

	for (const range of ranges) {
		const lines = allLines.slice(range.startLine - 1, range.endLine);
		const text = lines.join('\n');
		segments.push({ text, startLine: range.startLine, startOffset: totalOffset });
		totalOffset += text.length + 1;
	}

	const fullText = segments.map(s => s.text).join('\n');

	function offsetToPosition(offset: number): OffsetMapping {
		for (let i = segments.length - 1; i >= 0; i--) {
			if (offset >= segments[i].startOffset) {
				const localOffset = offset - segments[i].startOffset;
				const segLines = segments[i].text.split('\n');
				let remaining = localOffset;
				for (let lineIdx = 0; lineIdx < segLines.length; lineIdx++) {
					if (remaining <= segLines[lineIdx].length) {
						return { line: segments[i].startLine + lineIdx, char: remaining };
					}
					remaining -= segLines[lineIdx].length + 1;
				}
				const lastLineIdx = segLines.length - 1;
				return { line: segments[i].startLine + lastLineIdx, char: segLines[lastLineIdx].length };
			}
		}
		return { line: segments[0]?.startLine ?? 1, char: 0 };
	}

	return { text: fullText, offsetToPosition };
}

function findAllOccurrences(haystack: string, needle: string): number[] {
	const offsets: number[] = [];
	let start = 0;
	for (;;) {
		const idx = haystack.indexOf(needle, start);
		if (idx === -1) break;
		offsets.push(idx);
		start = idx + 1;
	}
	return offsets;
}

export const /**
	 *
	 */
	edit = defineTool({
		annotations: {
			category: ToolCategory.CODEBASE_ANALYSIS,
			conditions: ['client-pipe'],
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
			readOnlyHint: false,
			title: 'File Edit'
		},
		description:
			'Symbol-scoped text replacement for precise code edits.\n\n' +
			'Scopes the `oldString` → `newString` replacement to the visible content of a specific symbol, ' +
			'matching only against the code you can see at that level of the hierarchy (collapsed children are excluded from matching). ' +
			'This eliminates ambiguity — the same string in two different methods will never collide.\n\n' +
			'**Parameters:**\n' +
			'- `file` (required) — Path to file\n' +
			'- `oldString` (required) — Exact text to find within the scoped region\n' +
			'- `newString` (required) — Replacement text\n' +
			'- `symbol` (optional) — Symbol to scope the edit to (dot notation for nested: "UserService.findById")\n\n' +
			'**Scoping behavior:**\n' +
			'- With `symbol`: matches only within that symbol\'s visible content (body-bearing children with grandchildren are excluded)\n' +
			'- Without `symbol`: matches only within root-level content (top-level collapsed symbols are excluded)\n' +
			'- If `oldString` matches 0 or 2+ times within scope → edit is rejected\n\n' +
			'**EXAMPLES:**\n' +
			'- Edit a method body: `{ file: "src/service.ts", symbol: "UserService.findById", oldString: "return null;", newString: "return undefined;" }`\n' +
			'- Edit root-level code: `{ file: "src/config.ts", oldString: "const PORT = 3000;", newString: "const PORT = 8080;" }`\n' +
			'- Edit a nested symbol: `{ file: "src/app.ts", symbol: "Geometry.Shapes.Circle", oldString: "...", newString: "..." }`',
		handler: async (request, response) => {
			const { params } = request;
			const filePath = resolveFilePath(params.file);
			const oldString = params.oldString.replaceAll('\r\n', '\n');
			const newString = params.newString.replaceAll('\r\n', '\n');
			const symbolTarget = params.symbol?.trim() || '';
			const relativePath = path.relative(getClientWorkspace(), filePath).replaceAll('\\', '/');

			// ── Input validation ──────────────────────────────────────────

			if (oldString.length === 0) {
				response.appendResponseLine('❌ `oldString` cannot be empty.');
				return;
			}

			if (oldString === newString) {
				response.appendResponseLine('❌ `oldString` and `newString` are identical — nothing to change.');
				return;
			}

			// ── Load file content and structure ──────────────────────────

			let structure: FileStructure | undefined;

			try {
				structure = await fileExtractStructure(filePath);
			} catch {
				// Non-structured file — fall through
			}

			const contentResult = await fileReadContent(filePath);
			const allLines = contentResult.content.replaceAll('\r\n', '\n').split('\n');

			// ── Compute visible scope ────────────────────────────────────

			let visibleRanges: LineRange[];
			let scopeLabel: string;

			if (symbolTarget.length > 0) {
				if (!structure) {
					response.appendResponseLine('❌ Symbol targeting requires structured file extraction. ' +
						'This file type does not support symbol-based editing.');
					return;
				}

				const match = resolveSymbolTarget(structure.symbols, symbolTarget);
				if (!match) {
					const available = structure.symbols
						.filter(s => BODY_BEARING_KINDS.has(s.kind) || s.range.endLine > s.range.startLine)
						.map(s => s.name)
						.slice(0, 20);
					response.appendResponseLine(`❌ Symbol "${symbolTarget}" not found in ${relativePath}.\n`);
					if (available.length > 0) {
						response.appendResponseLine(`Available symbols: ${available.join(', ')}`);
					}
					return;
				}

				const { symbol } = match;
				visibleRanges = computeVisibleRanges(
					symbol.range.startLine,
					symbol.range.endLine,
					symbol.children ?? [],
				);
				scopeLabel = symbolTarget;
			} else {
				if (structure) {
					visibleRanges = computeRootVisibleRanges(allLines.length, structure.symbols);
				} else {
					visibleRanges = [{ startLine: 1, endLine: allLines.length }];
				}
				scopeLabel = 'root';
			}

			// ── Search for oldString within visible scope ────────────────

			const visible = buildVisibleText(allLines, visibleRanges);
			const occurrences = findAllOccurrences(visible.text, oldString);

			if (occurrences.length === 0) {
				response.appendResponseLine(`❌ \`oldString\` not found within scope "${scopeLabel}".\n`);
				response.appendResponseLine('The text does not match any content in the visible region. ' +
					'Ensure `oldString` exactly matches the source (including whitespace and indentation).');
				return;
			}

			if (occurrences.length > 1) {
				response.appendResponseLine(`❌ \`oldString\` matched ${occurrences.length} times within scope "${scopeLabel}".\n`);
				response.appendResponseLine('Include more surrounding context in `oldString` to make the match unique.');
				return;
			}

			// ── Exactly one match — compute edit range ───────────────────

			const matchStart = visible.offsetToPosition(occurrences[0]);
			const matchEnd = visible.offsetToPosition(occurrences[0] + oldString.length);

			// fileApplyEdit uses 0-indexed lines
			const editStartLine = matchStart.line - 1;
			const editEndLine = matchEnd.line - 1;
			const editStartChar = matchStart.char;
			const editEndChar = matchEnd.char;

			// ── Apply the edit ───────────────────────────────────────────

			try {
				const result = await fileApplyEdit(
					filePath,
					editStartLine,
					editEndLine,
					newString,
					editStartChar,
					editEndChar,
				);

				if (result.success) {
					try {
						await fileShowEditDiff(filePath, editStartLine);
					} catch {
						// Non-critical — diff display is best-effort
					}

					const title = symbolTarget
						? `Applied edit to **${symbolTarget}** in ${relativePath}`
						: `Applied edit to ${relativePath}`;
					response.appendResponseLine(`✅ ${title}`);

					const oldLines = oldString.split('\n').length;
					const newLines = newString.split('\n').length;
					if (oldLines === 1 && newLines === 1) {
						response.appendResponseLine(`Line ${matchStart.line}: replaced inline text`);
					} else {
						response.appendResponseLine(`Lines ${matchStart.line}–${matchEnd.line}: replaced ${oldLines} line(s) with ${newLines} line(s)`);
					}
				} else {
					response.appendResponseLine('❌ Edit failed to apply.');
					if ('error' in result && typeof result.error === 'string') {
						response.appendResponseLine(result.error);
					}
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				response.appendResponseLine(`❌ Edit failed: ${msg}`);
			}
		},
		name: 'file_edit',
		schema: {
			file: zod.string().describe('Path to file (relative to workspace root or absolute).'),
			newString: zod.string().describe('The replacement text. Can be multi-line.'),
			oldString: zod.string().describe('Exact text to find within the scoped region. Must match exactly once. Include enough context (3+ lines) to ensure uniqueness.'),
			symbol: zod.string().optional().describe(
				'Symbol to scope the edit to. Use dot notation for nested symbols (e.g. "UserService.findById"). ' +
				'When omitted, the edit is scoped to root-level content (top-level collapsed symbols are excluded from matching).'
			),
		},
		timeoutMs: 15_000,
	});
