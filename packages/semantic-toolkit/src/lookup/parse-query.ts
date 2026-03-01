/**
 * Phase 6 — Symbol Lookup: Query Parser.
 *
 * Parses a query string to detect the `symbol = ` prefix and extract
 * the structured symbol path (file?, parent?, name).
 *
 * Supported notations:
 *   symbol = validateToken                                      → name only
 *   symbol = TokenService.validateToken                         → parent.name (dot)
 *   symbol = auth-service.ts::validateToken                     → file::name
 *   symbol = auth-service.ts::TokenService.validateToken        → file::parent.name
 *   symbol = TokenService > validateToken                       → parent > name (arrow)
 *   symbol = src/auth/tokenService.ts > TokenService > name     → file > parent > name
 *
 * Optional kind filter (appended after the symbol path):
 *   symbol = validateToken, kind = function                     → filter by kind
 *   symbol = TokenService > validate, kind = method             → combined with hierarchy
 *
 * The prefix is flexible: "symbol=", "symbol =", "Symbol = " all work.
 */

import type { QueryParseResult, ParsedSymbolPath } from './types.js';

// Matches "symbol" followed by optional whitespace and "="
const SYMBOL_PREFIX_RE = /^symbol\s*=\s*/i;

// Matches ", kind = value" at the end of the path string (case-insensitive)
const KIND_SUFFIX_RE = /,\s*kind\s*=\s*(\S+)\s*$/i;

const HIERARCHY_SEPARATOR = ' > ';
const FILE_SEPARATOR = '::';

// File extension patterns recognized as file path segments
const FILE_EXT_PATTERN = /\.\w+$/;

/**
 * Parse a query string to detect symbol lookup mode and extract the path.
 *
 * @param query - The raw user query string.
 * @returns QueryParseResult indicating whether this is a symbol lookup and the parsed path.
 */
export function parseSymbolQuery(query: string): QueryParseResult {
	const trimmed = query.trim();
	const prefixMatch = SYMBOL_PREFIX_RE.exec(trimmed);

	if (!prefixMatch) {
		return { isSymbolLookup: false, path: null };
	}

	let pathStr = trimmed.slice(prefixMatch[0].length).trim();
	if (pathStr.length === 0) {
		return { isSymbolLookup: false, path: null };
	}

	// Extract optional ", kind = ..." suffix before parsing the symbol path
	let symbolKind: string | null = null;
	const kindMatch = KIND_SUFFIX_RE.exec(pathStr);
	if (kindMatch) {
		symbolKind = kindMatch[1].toLowerCase();
		pathStr = pathStr.slice(0, kindMatch.index).trim();
	}

	if (pathStr.length === 0) {
		return { isSymbolLookup: false, path: null };
	}

	const symbolPath = parseSymbolPath(pathStr);
	symbolPath.symbolKind = symbolKind;
	return { isSymbolLookup: true, path: symbolPath };
}

/**
 * Parse a symbol path string into its structured components.
 *
 * Parsing priority:
 *   1. `::` — file separator (left = file, right = symbol expression)
 *   2. ` > ` — hierarchy separator (arrow notation, legacy)
 *   3. `.` — parent.name separator (if neither `::` nor ` > ` present)
 *
 * Examples:
 *   "validateToken"                              → { file: null, parent: null, name: "validateToken" }
 *   "TokenService.validateToken"                 → { file: null, parent: "TokenService", name: "validateToken" }
 *   "auth.ts::validateToken"                     → { file: "auth.ts", parent: null, name: "validateToken" }
 *   "auth.ts::TokenService.validateToken"        → { file: "auth.ts", parent: "TokenService", name: "validateToken" }
 *   "TokenService > validateToken"               → { file: null, parent: "TokenService", name: "validateToken" }
 *   "src/auth.ts > TokenService > validateToken" → { file: "src/auth.ts", parent: "TokenService", name: "validateToken" }
 */
function parseSymbolPath(pathStr: string): ParsedSymbolPath {
	// Priority 1: file::symbol notation
	const colonIdx = pathStr.indexOf(FILE_SEPARATOR);
	if (colonIdx !== -1) {
		const filePart = pathStr.slice(0, colonIdx).trim();
		const symbolPart = pathStr.slice(colonIdx + FILE_SEPARATOR.length).trim();

		if (symbolPart.length === 0) {
			return { filePath: filePart.length > 0 ? filePart : null, parentName: null, symbolKind: null, symbolName: pathStr };
		}

		const parsed = parseSymbolExpression(symbolPart);
		return {
			filePath: filePart.length > 0 ? filePart : null,
			parentName: parsed.parentName,
			symbolKind: null,
			symbolName: parsed.symbolName,
		};
	}

	// Priority 2: ` > ` arrow notation
	if (pathStr.includes(HIERARCHY_SEPARATOR)) {
		return parseArrowNotation(pathStr);
	}

	// Priority 3: dot notation (Parent.method) or bare name
	return {
		filePath: null,
		symbolKind: null,
		...parseSymbolExpression(pathStr),
	};
}

/**
 * Parse a symbol expression that may contain a dot for parent.name.
 * Does NOT contain file paths or `::` separators at this level.
 */
function parseSymbolExpression(expr: string): { parentName: string | null; symbolName: string } {
	const dotIdx = expr.lastIndexOf('.');
	if (dotIdx === -1 || dotIdx === 0 || dotIdx === expr.length - 1) {
		return { parentName: null, symbolName: expr };
	}

	return {
		parentName: expr.slice(0, dotIdx),
		symbolName: expr.slice(dotIdx + 1),
	};
}

/**
 * Parse ` > ` arrow notation (the legacy format).
 */
function parseArrowNotation(pathStr: string): ParsedSymbolPath {
	const segments = pathStr.split(HIERARCHY_SEPARATOR).map(s => s.trim()).filter(s => s.length > 0);

	if (segments.length === 0) {
		return { filePath: null, parentName: null, symbolKind: null, symbolName: pathStr.trim() };
	}

	if (segments.length === 1) {
		return { filePath: null, parentName: null, symbolKind: null, symbolName: segments[0] };
	}

	const firstLooksLikeFile = isFilePathSegment(segments[0]);

	if (segments.length === 2) {
		if (firstLooksLikeFile) {
			return { filePath: segments[0], parentName: null, symbolKind: null, symbolName: segments[1] };
		}
		return { filePath: null, parentName: segments[0], symbolKind: null, symbolName: segments[1] };
	}

	// 3+ segments
	if (firstLooksLikeFile) {
		const parentSegments = segments.slice(1, -1);
		return {
			filePath: segments[0],
			parentName: parentSegments.join('.'),
			symbolKind: null,
			symbolName: segments[segments.length - 1],
		};
	}

	const parentSegments = segments.slice(0, -1);
	return {
		filePath: null,
		parentName: parentSegments.join('.'),
		symbolKind: null,
		symbolName: segments[segments.length - 1],
	};
}

/**
 * Test whether a segment looks like a file path (has a recognized extension
 * or contains path separators).
 */
function isFilePathSegment(segment: string): boolean {
	if (FILE_EXT_PATTERN.test(segment)) {
		return true;
	}
	if (segment.includes('/') || segment.includes('\\')) {
		return true;
	}
	return false;
}
