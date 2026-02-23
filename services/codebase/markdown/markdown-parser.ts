// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// Pure Node.js — remark-based Markdown parser producing FileSymbol[] hierarchy.

import type { FileSymbol, FileSymbolRange } from '../types';
import type { Blockquote, Code, Content, Heading, Html, List, ListItem, Root, Table, ThematicBreak, Yaml } from 'mdast';
import type { ContainerDirective, LeafDirective } from 'mdast-util-directive';
import type { Math as MathNode } from 'mdast-util-math';

import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import YAML from 'yaml';

import { CALLOUT_PATTERN, MD_KINDS } from './markdown-types';

// ── Unified Processors ───────────────────────────────────

const markdownProcessor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml', 'toml']).use(remarkGfm).use(remarkMath).use(remarkDirective);

// ── Public API ───────────────────────────────────────────

/**
 * Parse Markdown text into a FileSymbol[] hierarchy.
 * Uses heading-dominance model: headings own all subsequent content
 * until a sibling or parent heading is encountered.
 */
export function parseMarkdown(text: string): FileSymbol[] {
	const ast = markdownProcessor.parse(text);
	const totalLines = text.split('\n').length;
	return buildHierarchy(ast.children, totalLines);
}

// ── Hierarchy Builder ────────────────────────────────────

interface SectionFrame {
	level: number;
	symbol: FileSymbol;
}

function buildHierarchy(nodes: Content[], totalLines: number): FileSymbol[] {
	const result: FileSymbol[] = [];
	const sectionStack: SectionFrame[] = [];

	// Collect all heading positions for section range calculation
	const headingPositions = collectHeadingPositions(nodes);

	for (const node of nodes) {
		const startLine = node.position?.start.line ?? 1;
		const endLine = node.position?.end.line ?? startLine;

		switch (node.type) {
			case 'yaml': {
				const fmSymbol = buildFrontmatter(node);
				result.push(fmSymbol);
				break;
			}

			case 'heading': {
				const heading = node;
				const level = heading.depth;
				const title = extractText(heading);
				const sectionEnd = calculateSectionEnd(startLine, level, headingPositions, totalLines);

				const sectionSymbol: FileSymbol = {
					children: [],
					detail: '#'.repeat(level),
					kind: MD_KINDS.section,
					name: title,
					range: { endLine: sectionEnd, startLine }
				};

				// Pop stack until parent section found
				while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
					sectionStack.pop();
				}

				addToContext(result, sectionStack, sectionSymbol);
				sectionStack.push({ level, symbol: sectionSymbol });
				break;
			}

			case 'code': {
				const codeSymbol = buildCodeBlock(node, startLine, endLine);
				addToContext(result, sectionStack, codeSymbol);
				break;
			}

			case 'table': {
				const tableSymbol = buildTable(node, startLine, endLine);
				addToContext(result, sectionStack, tableSymbol);
				break;
			}

			case 'list': {
				const listSymbol = buildList(node, startLine, endLine);
				addToContext(result, sectionStack, listSymbol);
				break;
			}

			case 'blockquote': {
				const bqSymbol = buildBlockquote(node, startLine, endLine);
				addToContext(result, sectionStack, bqSymbol);
				break;
			}

			case 'html': {
				const htmlSymbol = buildHtmlBlock(node, startLine, endLine);
				if (htmlSymbol) {
					addToContext(result, sectionStack, htmlSymbol);
				}
				break;
			}

			case 'math': {
				const mathSymbol = buildMathBlock(node as unknown as MathNode, startLine, endLine);
				addToContext(result, sectionStack, mathSymbol);
				break;
			}

			case 'thematicBreak': {
				const ruleSymbol: FileSymbol = {
					children: [],
					kind: MD_KINDS.rule,
					name: '---',
					range: { endLine, startLine }
				};
				addToContext(result, sectionStack, ruleSymbol);
				break;
			}

			case 'containerDirective': {
				const dirSymbol = buildContainerDirective(node as unknown as ContainerDirective, startLine, endLine);
				addToContext(result, sectionStack, dirSymbol);
				break;
			}

			case 'leafDirective': {
				const leafDir = node as unknown as LeafDirective;
				const leafSymbol: FileSymbol = {
					children: [],
					kind: MD_KINDS.directive,
					name: leafDir.name ?? 'directive',
					range: { endLine, startLine }
				};
				addToContext(result, sectionStack, leafSymbol);
				break;
			}

			default:
				// Paragraphs, definitions, etc. — not symbols (covered by parent range)
				break;
		}
	}

	return result;
}

// ── Context Management ───────────────────────────────────

function addToContext(result: FileSymbol[], sectionStack: SectionFrame[], symbol: FileSymbol): void {
	if (sectionStack.length === 0) {
		result.push(symbol);
	} else {
		sectionStack[sectionStack.length - 1].symbol.children.push(symbol);
	}
}

// ── Heading Section Range ────────────────────────────────

interface HeadingPosition {
	depth: number;
	line: number;
}

function collectHeadingPositions(nodes: Content[]): HeadingPosition[] {
	const positions: HeadingPosition[] = [];
	for (const node of nodes) {
		if (node.type === 'heading') {
			const heading = node;
			positions.push({
				depth: heading.depth,
				line: node.position?.start.line ?? 1
			});
		}
	}
	return positions;
}

/**
 * Calculate the end line of a section.
 * A heading's range extends from its line to the line before the next
 * heading of equal or lesser depth (or EOF).
 */
function calculateSectionEnd(startLine: number, depth: number, headingPositions: HeadingPosition[], totalLines: number): number {
	for (const pos of headingPositions) {
		if (pos.line > startLine && pos.depth <= depth) {
			return pos.line - 1;
		}
	}
	return totalLines;
}

// ── Symbol Builders ──────────────────────────────────────

function buildFrontmatter(node: Yaml): FileSymbol {
	const startLine = node.position?.start.line ?? 1;
	const endLine = node.position?.end.line ?? startLine;

	const symbol: FileSymbol = {
		children: [],
		kind: MD_KINDS.frontmatter,
		name: 'frontmatter',
		range: { endLine, startLine }
	};

	if (node.value) {
		symbol.children = extractYamlKeys(node.value, startLine);
	}

	return symbol;
}

function buildCodeBlock(node: Code, startLine: number, endLine: number): FileSymbol {
	const lang = node.lang ?? '';
	return {
		children: [],
		detail: lang || undefined,
		kind: MD_KINDS.code,
		name: lang || 'code',
		range: { endLine, startLine }
	};
}

function buildTable(node: Table, startLine: number, endLine: number): FileSymbol {
	const headerRow = node.children[0];
	const headers = headerRow?.children.map((cell) => extractText(cell)) ?? [];

	const tableSymbol: FileSymbol = {
		children: [],
		detail: `${headers.length} cols`,
		kind: MD_KINDS.table,
		name: 'table',
		range: { endLine, startLine }
	};

	if (headers.length > 0) {
		tableSymbol.children = headers.map((h) => ({
			children: [],
			kind: MD_KINDS.column,
			name: h,
			range: { endLine: startLine, startLine } as FileSymbolRange
		}));
	}

	return tableSymbol;
}

function buildList(node: List, startLine: number, endLine: number): FileSymbol {
	const ordered = node.ordered ?? false;
	const listSymbol: FileSymbol = {
		children: [],
		detail: ordered ? 'ol' : 'ul',
		kind: MD_KINDS.list,
		name: ordered ? 'ordered list' : 'list',
		range: { endLine, startLine }
	};

	for (const item of node.children) {
		const itemSymbol = buildListItem(item, ordered);
		listSymbol.children.push(itemSymbol);
	}

	return listSymbol;
}

function buildListItem(node: ListItem, _ordered: boolean): FileSymbol {
	const itemStart = node.position?.start.line ?? 1;
	const itemEnd = node.position?.end.line ?? itemStart;
	const firstText = extractFirstLineText(node);

	const itemSymbol: FileSymbol = {
		children: [],
		kind: MD_KINDS.item,
		name: firstText || 'item',
		range: { endLine: itemEnd, startLine: itemStart }
	};

	// Recurse into container children (nested lists, code blocks)
	for (const child of node.children) {
		if (child.type === 'list') {
			const nestedList = buildList(child, child.position?.start.line ?? itemStart, child.position?.end.line ?? itemEnd);
			itemSymbol.children.push(nestedList);
		} else if (child.type === 'code') {
			const code = buildCodeBlock(child, child.position?.start.line ?? itemStart, child.position?.end.line ?? itemEnd);
			itemSymbol.children.push(code);
		} else if (child.type === 'table') {
			const table = buildTable(child, child.position?.start.line ?? itemStart, child.position?.end.line ?? itemEnd);
			itemSymbol.children.push(table);
		}
	}

	return itemSymbol;
}

function buildBlockquote(node: Blockquote, startLine: number, endLine: number): FileSymbol {
	// Check for GitHub callout pattern: > [!NOTE]
	const firstChild = node.children[0];
	if (firstChild?.type === 'paragraph') {
		const firstInline = firstChild.children[0];
		if (firstInline && 'value' in firstInline && typeof firstInline.value === 'string') {
			const calloutMatch = CALLOUT_PATTERN.exec(firstInline.value);
			if (calloutMatch) {
				const calloutType = calloutMatch[1].toUpperCase();
				return {
					children: [],
					detail: calloutType.toLowerCase(),
					kind: MD_KINDS.directive,
					name: calloutType,
					range: { endLine, startLine }
				};
			}
		}
	}

	const bqSymbol: FileSymbol = {
		children: [],
		kind: MD_KINDS.blockquote,
		name: 'blockquote',
		range: { endLine, startLine }
	};

	// Recurse into blockquote children for nested blocks
	for (const child of node.children) {
		const childStart = child.position?.start.line ?? startLine;
		const childEnd = child.position?.end.line ?? endLine;

		if (child.type === 'code') {
			bqSymbol.children.push(buildCodeBlock(child, childStart, childEnd));
		} else if (child.type === 'blockquote') {
			bqSymbol.children.push(buildBlockquote(child, childStart, childEnd));
		} else if (child.type === 'list') {
			bqSymbol.children.push(buildList(child, childStart, childEnd));
		} else if (child.type === 'table') {
			bqSymbol.children.push(buildTable(child, childStart, childEnd));
		}
	}

	return bqSymbol;
}

function buildHtmlBlock(node: Html, startLine: number, endLine: number): FileSymbol | undefined {
	const value = node.value.trim();
	// Skip HTML comments — they become orphaned content
	if (value.startsWith('<!--') && value.endsWith('-->')) {
		return {
			children: [],
			detail: 'comment',
			kind: MD_KINDS.html,
			name: 'comment',
			range: { endLine, startLine }
		};
	}

	return {
		children: [],
		kind: MD_KINDS.html,
		name: 'html',
		range: { endLine, startLine }
	};
}

function buildMathBlock(node: MathNode, startLine: number, endLine: number): FileSymbol {
	return {
		children: [],
		kind: MD_KINDS.math,
		name: 'math',
		range: { endLine, startLine }
	};
}

function buildContainerDirective(node: ContainerDirective, startLine: number, endLine: number): FileSymbol {
	// Extract the label from the directive's children or attributes
	const label = extractText(node as unknown as Content) || node.name;
	return {
		children: [],
		detail: node.name,
		kind: MD_KINDS.directive,
		name: label,
		range: { endLine, startLine }
	};
}

// ── Text Extraction ──────────────────────────────────────

/** Extract plain text from an mdast node (recursive). */
function extractText(node: Content): string {
	if ('value' in node && typeof node.value === 'string') {
		return node.value;
	}
	if ('children' in node && Array.isArray(node.children)) {
		return (node.children as Content[]).map((child) => extractText(child)).join('');
	}
	return '';
}

/** Extract the text from the first paragraph of a list item. */
function extractFirstLineText(node: ListItem): string {
	for (const child of node.children) {
		if (child.type === 'paragraph') {
			const text = extractText(child);
			// Truncate long text for the symbol name
			if (text.length > 60) {
				return `${text.substring(0, 57)}...`;
			}
			return text;
		}
	}
	return '';
}

// ── YAML Key Extraction ──────────────────────────────────

function extractYamlKeys(yamlText: string, fmStartLine: number): FileSymbol[] {
	try {
		const doc = YAML.parseDocument(yamlText, { version: '1.1' });
		const { contents } = doc;
		if (!contents || !('items' in contents)) {
			return [];
		}

		const results: FileSymbol[] = [];
		const yamlMap = contents as YAML.YAMLMap;
		for (const pair of yamlMap.items) {
			const { key } = pair;
			if (key === null || key === undefined) continue;

			const keyName = typeof key === 'object' && 'value' in key ? String((key as YAML.Scalar).value) : String(key);

			// YAML content starts on fmStartLine + 1
			let keyLine = fmStartLine + 1;
			if (typeof key === 'object' && key !== null && 'range' in key) {
				const { range } = key as YAML.Scalar;
				if (range && range.length >= 1) {
					const offset = range[0];
					let lineWithinYaml = 0;
					for (let i = 0; i < offset && i < yamlText.length; i++) {
						if (yamlText[i] === '\n') lineWithinYaml++;
					}
					keyLine = fmStartLine + 1 + lineWithinYaml;
				}
			}

			results.push({
				children: [],
				kind: MD_KINDS.key,
				name: keyName,
				range: { endLine: keyLine, startLine: keyLine }
			});
		}
		return results;
	} catch {
		return [];
	}
}
