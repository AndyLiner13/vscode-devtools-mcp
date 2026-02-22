// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.
// JSON Language Service — wraps parsers.ts JSON/JSONC/JSONL parsers in LanguageService interface.

import type { LanguageService } from '../language-service-registry';
import type { FileStructure, FileSymbol, FileSymbolRange, OrphanedItem } from '../types';
import type { SymbolNode } from '../types';

import * as jsoncParser from 'jsonc-parser';

import { readFileText } from '../file-utils';
import { getCustomParser } from '../parsers';

const JSON_EXTENSIONS = ['json', 'jsonc', 'json5', 'jsonl', 'webmanifest', 'geojson'] as const;

// Extensions that support JSONC-style comments (// and /* *)
const COMMENT_EXTS = new Set(['jsonc', 'json5']);

interface CommentRange {
  offset: number;
  length: number;
  startLine: number;
  endLine: number;
  text: string;
}

/**
 * Extract comments from JSONC/JSON5 text using the visitor API.
 * Returns comment ranges with 1-indexed line numbers.
 */
function extractJsoncComments(text: string): CommentRange[] {
  const comments: CommentRange[] = [];

  jsoncParser.visit(text, {
    onComment(offset: number, length: number, startLine: number) {
      const commentText = text.slice(offset, offset + length);
      // startLine from jsonc-parser is 0-indexed
      const oneLine = startLine + 1;
      const newlineCount = (commentText.match(/\n/g) ?? []).length;
      const endLine = oneLine + newlineCount;

      comments.push({
        offset,
        length,
        startLine: oneLine,
        endLine,
        text: commentText.trim(),
      });
    },
  }, { allowTrailingComma: true });

  return comments;
}

function classifyJsonComment(text: string): string {
  if (text.startsWith('/*')) {
    return 'block-comment';
  }
  if (/^\/\/\s*[─━═]+/.test(text)) {
    return 'section-header';
  }
  if (/^\/\/\s*(TODO|FIXME|HACK|NOTE|WARNING|IMPORTANT|BUG|REFACTOR|DEPRECATED)/i.test(text)) {
    return 'annotation';
  }
  return 'line-comment';
}

function extractJsonCommentTitle(text: string): string {
  // Section headers: "// ── Title ──────"
  const sectionMatch = text.match(/\/\/\s*[─━═]+\s*(.+?)\s*[─━═]+/);
  if (sectionMatch) {
    return sectionMatch[1].trim();
  }

  // Block comments: extract first line
  const blockMatch = text.match(/\/\*\s*\*?\s*(.+)/);
  if (blockMatch) {
    const firstLine = blockMatch[1].replace(/\*+\/$/, '').trim();
    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
  }

  // Line comments
  const lineMatch = text.match(/\/\/\s*(.+)/);
  if (lineMatch) {
    const content = lineMatch[1].trim();
    return content.length > 50 ? content.slice(0, 47) + '...' : content;
  }

  return text.slice(0, 50);
}

function convertSymbolNodeRange(range: { start: number; end: number }): FileSymbolRange {
  return {
    startLine: range.start,
    endLine: range.end,
    startChar: 0,
    endChar: 0,
  };
}

function convertSymbolNode(node: SymbolNode): FileSymbol {
  return {
    name: node.name,
    kind: node.kind,
    detail: node.detail,
    range: convertSymbolNodeRange(node.range),
    children: node.children ? node.children.map(convertSymbolNode) : [],
  };
}

function countSymbols(symbols: FileSymbol[]): number {
  let count = 0;
  for (const sym of symbols) {
    count += 1;
    if (sym.children.length > 0) {
      count += countSymbols(sym.children);
    }
  }
  return count;
}

function computeGaps(
  symbols: FileSymbol[],
  totalLines: number,
): Array<{ start: number; end: number; type: 'blank' | 'unknown' }> {
  const covered = new Set<number>();

  const markSymbol = (sym: FileSymbol): void => {
    for (let i = sym.range.startLine; i <= sym.range.endLine; i++) {
      covered.add(i);
    }
    for (const child of sym.children) {
      markSymbol(child);
    }
  };
  for (const sym of symbols) {
    markSymbol(sym);
  }

  const gaps: Array<{ start: number; end: number; type: 'blank' | 'unknown' }> = [];
  let gapStart: number | undefined;

  for (let line = 1; line <= totalLines; line++) {
    if (!covered.has(line)) {
      if (gapStart === undefined) {
        gapStart = line;
      }
    } else {
      if (gapStart !== undefined) {
        gaps.push({ start: gapStart, end: line - 1, type: 'blank' });
        gapStart = undefined;
      }
    }
  }
  if (gapStart !== undefined) {
    gaps.push({ start: gapStart, end: totalLines, type: 'blank' });
  }

  return gaps;
}

export class JsonLanguageService implements LanguageService {
  readonly id = 'json';
  readonly name = 'JSON / JSONC / JSONL';
  readonly extensions: readonly string[] = JSON_EXTENSIONS;

  async extractStructure(filePath: string): Promise<FileStructure> {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const parser = getCustomParser(ext);

    if (!parser) {
      // Fallback for unrecognized extension that somehow matched
      return this.emptyStructure('');
    }

    const { text, lineCount } = readFileText(filePath);
    const symbolNodes = parser(text, Infinity);
    const symbols = symbolNodes.map(convertSymbolNode);

    // Extend first/last symbol ranges to absorb root container braces.
    // JSON files always have a root {} or [] whose braces aren't properties,
    // so they'd otherwise appear as gaps. This makes coverage consistent
    // with TS/JS (declarations start at line 1) and Markdown (sections span all).
    if (symbols.length > 0) {
      symbols[0].range.startLine = 1;
      symbols[symbols.length - 1].range.endLine = lineCount;
    }

    const gaps = computeGaps(symbols, lineCount);

    // Extract JSONC/JSON5 comments as orphaned content
    const orphanedItems: OrphanedItem[] = [];
    if (COMMENT_EXTS.has(ext)) {
      const comments = extractJsoncComments(text);
      for (const comment of comments) {
        orphanedItems.push({
          name: extractJsonCommentTitle(comment.text),
          kind: classifyJsonComment(comment.text),
          range: { start: comment.startLine, end: comment.endLine },
          category: 'comment',
        });
      }
    }

    const blankLines = text.split('\n').filter(l => l.trim() === '').length;
    const totalSymbols = countSymbols(symbols);

    // Coverage: lines covered by symbols vs total
    const covered = new Set<number>();
    const markCovered = (sym: FileSymbol): void => {
      for (let i = sym.range.startLine; i <= sym.range.endLine; i++) {
        covered.add(i);
      }
      for (const child of sym.children) {
        markCovered(child);
      }
    };
    for (const sym of symbols) {
      markCovered(sym);
    }
    const coveragePercent = lineCount > 0 ? Math.round((covered.size / lineCount) * 100) : 100;

    return {
      symbols,
      content: text,
      totalLines: lineCount,
      fileType: 'json',
      orphaned: { items: orphanedItems },
      gaps,
      stats: {
        totalSymbols,
        totalOrphaned: orphanedItems.length,
        totalBlankLines: blankLines,
        coveragePercent,
      },
    };
  }

  private emptyStructure(content: string): FileStructure {
    return {
      symbols: [],
      content,
      totalLines: content.split('\n').length,
      fileType: 'json',
      orphaned: { items: [] },
      gaps: [],
      stats: {
        totalSymbols: 0,
        totalOrphaned: 0,
        totalBlankLines: 0,
        coveragePercent: 0,
      },
    };
  }
}
