/**
 * Phase 3, Item 19 — Unicode / Confusable Identifiers resolver.
 *
 * Detects identifiers containing non-ASCII characters and analyzes them for:
 * - Mixed-script usage (e.g. Latin + Cyrillic)
 * - Bidi override characters (U+202A–U+202E, U+2066–U+2069)
 * - Zero-width characters (U+200B–U+200D, U+2060, U+FEFF)
 * - Confusable/homoglyph pairs within the same file
 * - Scope-aware analysis
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import * as path from 'node:path';

import type {
	UnicodeIdentifierEntry,
	UnicodeIdentifierAnalysis,
	UnicodeIdentifierSeverity,
	ConfusablePair,
} from './types';

export type {
	UnicodeIdentifierEntry,
	UnicodeIdentifierAnalysis,
	UnicodeIdentifierSeverity,
	ConfusablePair,
} from './types';

// ---------------------------------------------------------------------------
// Bidi override and zero-width character sets
// ---------------------------------------------------------------------------

const BIDI_OVERRIDES = new Set([
	0x202A, // LEFT-TO-RIGHT EMBEDDING
	0x202B, // RIGHT-TO-LEFT EMBEDDING
	0x202C, // POP DIRECTIONAL FORMATTING
	0x202D, // LEFT-TO-RIGHT OVERRIDE
	0x202E, // RIGHT-TO-LEFT OVERRIDE
	0x2066, // LEFT-TO-RIGHT ISOLATE
	0x2067, // RIGHT-TO-LEFT ISOLATE
	0x2068, // FIRST STRONG ISOLATE
	0x2069, // POP DIRECTIONAL ISOLATE
]);

const ZERO_WIDTH_CHARS = new Set([
	0x200B, // ZERO WIDTH SPACE
	0x200C, // ZERO WIDTH NON-JOINER
	0x200D, // ZERO WIDTH JOINER
	0x2060, // WORD JOINER
	0xFEFF, // ZERO WIDTH NO-BREAK SPACE (BOM)
]);

// ---------------------------------------------------------------------------
// Common confusable mappings (Latin ↔ Cyrillic/Greek)
//
// Maps code points to their Latin "skeleton" equivalent for comparison.
// Subset covering the most commonly exploited homoglyphs.
// ---------------------------------------------------------------------------

const CONFUSABLE_TO_LATIN: ReadonlyMap<number, { latin: string; scriptLabel: string }> = new Map([
	// Cyrillic lookalikes
	[0x0430, { latin: 'a', scriptLabel: 'Cyrillic а' }],  // а → a
	[0x0435, { latin: 'e', scriptLabel: 'Cyrillic е' }],  // е → e
	[0x043E, { latin: 'o', scriptLabel: 'Cyrillic о' }],  // о → o
	[0x0440, { latin: 'p', scriptLabel: 'Cyrillic р' }],  // р → p
	[0x0441, { latin: 'c', scriptLabel: 'Cyrillic с' }],  // с → c
	[0x0443, { latin: 'y', scriptLabel: 'Cyrillic у' }],  // у → y
	[0x0445, { latin: 'x', scriptLabel: 'Cyrillic х' }],  // х → x
	[0x0410, { latin: 'A', scriptLabel: 'Cyrillic А' }],  // А → A
	[0x0412, { latin: 'B', scriptLabel: 'Cyrillic В' }],  // В → B
	[0x0415, { latin: 'E', scriptLabel: 'Cyrillic Е' }],  // Е → E
	[0x041A, { latin: 'K', scriptLabel: 'Cyrillic К' }],  // К → K
	[0x041C, { latin: 'M', scriptLabel: 'Cyrillic М' }],  // М → M
	[0x041D, { latin: 'H', scriptLabel: 'Cyrillic Н' }],  // Н → H
	[0x041E, { latin: 'O', scriptLabel: 'Cyrillic О' }],  // О → O
	[0x0420, { latin: 'P', scriptLabel: 'Cyrillic Р' }],  // Р → P
	[0x0421, { latin: 'C', scriptLabel: 'Cyrillic С' }],  // С → C
	[0x0422, { latin: 'T', scriptLabel: 'Cyrillic Т' }],  // Т → T
	[0x0425, { latin: 'X', scriptLabel: 'Cyrillic Х' }],  // Х → X
	[0x0427, { latin: 'u', scriptLabel: 'Cyrillic ч' }],  // Special case

	// Greek lookalikes
	[0x03B1, { latin: 'a', scriptLabel: 'Greek α' }],     // α → a (alpha)
	[0x03BF, { latin: 'o', scriptLabel: 'Greek ο' }],     // ο → o (omicron)
	[0x03C1, { latin: 'p', scriptLabel: 'Greek ρ' }],     // ρ → p (rho)
	[0x0391, { latin: 'A', scriptLabel: 'Greek Α' }],     // Α → A
	[0x0392, { latin: 'B', scriptLabel: 'Greek Β' }],     // Β → B
	[0x0395, { latin: 'E', scriptLabel: 'Greek Ε' }],     // Ε → E
	[0x0397, { latin: 'H', scriptLabel: 'Greek Η' }],     // Η → H
	[0x0399, { latin: 'I', scriptLabel: 'Greek Ι' }],     // Ι → I
	[0x039A, { latin: 'K', scriptLabel: 'Greek Κ' }],     // Κ → K
	[0x039C, { latin: 'M', scriptLabel: 'Greek Μ' }],     // Μ → M
	[0x039D, { latin: 'N', scriptLabel: 'Greek Ν' }],     // Ν → N
	[0x039F, { latin: 'O', scriptLabel: 'Greek Ο' }],     // Ο → O
	[0x03A1, { latin: 'P', scriptLabel: 'Greek Ρ' }],     // Ρ → P (Rho)
	[0x03A4, { latin: 'T', scriptLabel: 'Greek Τ' }],     // Τ → T
	[0x03A5, { latin: 'Y', scriptLabel: 'Greek Υ' }],     // Υ → Y
	[0x03A7, { latin: 'X', scriptLabel: 'Greek Χ' }],     // Χ → X
	[0x03B5, { latin: 'e', scriptLabel: 'Greek ε' }],     // ε → e (epsilon)
]);

// ---------------------------------------------------------------------------
// Unicode script detection (simplified range-based)
// ---------------------------------------------------------------------------

interface ScriptRange {
	start: number;
	end: number;
	script: string;
}

const SCRIPT_RANGES: readonly ScriptRange[] = [
	// Basic Latin
	{ start: 0x0000, end: 0x007F, script: 'Latin' },
	// Latin Extended (Supplement, Extended-A, Extended-B, Extended Additional)
	{ start: 0x0080, end: 0x024F, script: 'Latin' },
	{ start: 0x1E00, end: 0x1EFF, script: 'Latin' },
	// Latin Extended Additional ranges
	{ start: 0x2C60, end: 0x2C7F, script: 'Latin' },
	{ start: 0xA720, end: 0xA7FF, script: 'Latin' },

	// Greek and Coptic
	{ start: 0x0370, end: 0x03FF, script: 'Greek' },
	{ start: 0x1F00, end: 0x1FFF, script: 'Greek' },

	// Cyrillic
	{ start: 0x0400, end: 0x04FF, script: 'Cyrillic' },
	{ start: 0x0500, end: 0x052F, script: 'Cyrillic' },

	// Armenian
	{ start: 0x0530, end: 0x058F, script: 'Armenian' },

	// Arabic
	{ start: 0x0600, end: 0x06FF, script: 'Arabic' },
	{ start: 0x0750, end: 0x077F, script: 'Arabic' },

	// Devanagari
	{ start: 0x0900, end: 0x097F, script: 'Devanagari' },

	// CJK Unified Ideographs
	{ start: 0x4E00, end: 0x9FFF, script: 'CJK' },
	{ start: 0x3400, end: 0x4DBF, script: 'CJK' },

	// Hiragana
	{ start: 0x3040, end: 0x309F, script: 'Hiragana' },

	// Katakana
	{ start: 0x30A0, end: 0x30FF, script: 'Katakana' },

	// Hangul
	{ start: 0xAC00, end: 0xD7AF, script: 'Hangul' },

	// Emoji and symbols
	{ start: 0x1F300, end: 0x1F9FF, script: 'Emoji' },
	{ start: 0x2600, end: 0x26FF, script: 'Symbol' },
	{ start: 0x2700, end: 0x27BF, script: 'Symbol' },

	// Combining Diacritical Marks
	{ start: 0x0300, end: 0x036F, script: 'Combining' },
];

function getScript(codePoint: number): string {
	for (const range of SCRIPT_RANGES) {
		if (codePoint >= range.start && codePoint <= range.end) {
			return range.script;
		}
	}
	return 'Unknown';
}

function getScripts(name: string): Set<string> {
	const scripts = new Set<string>();
	for (const char of name) {
		const cp = char.codePointAt(0);
		if (cp === undefined) continue;
		// Skip common characters that appear in any script context
		if (cp === 0x5F /* _ */ || cp === 0x24 /* $ */) continue;
		const script = getScript(cp);
		if (script !== 'Combining') {
			scripts.add(script);
		}
	}
	return scripts;
}

// ---------------------------------------------------------------------------
// NFC normalization
// ---------------------------------------------------------------------------

function normalizeNFC(name: string): string {
	return name.normalize('NFC');
}

// ---------------------------------------------------------------------------
// Bidi / zero-width detection
// ---------------------------------------------------------------------------

function containsBidi(name: string): boolean {
	for (const char of name) {
		const cp = char.codePointAt(0);
		if (cp !== undefined && BIDI_OVERRIDES.has(cp)) return true;
	}
	return false;
}

function containsZeroWidth(name: string): boolean {
	for (const char of name) {
		const cp = char.codePointAt(0);
		if (cp !== undefined && ZERO_WIDTH_CHARS.has(cp)) return true;
	}
	return false;
}

// ---------------------------------------------------------------------------
// Skeleton computation for confusable detection
// ---------------------------------------------------------------------------

/**
 * Compute a "skeleton" of an identifier by replacing known confusable
 * characters with their Latin equivalents, then NFC-normalizing.
 * Two identifiers with the same skeleton are visually confusable.
 */
function computeSkeleton(name: string): string {
	let skeleton = '';
	for (const char of name) {
		const cp = char.codePointAt(0);
		if (cp === undefined) {
			skeleton += char;
			continue;
		}
		const mapping = CONFUSABLE_TO_LATIN.get(cp);
		if (mapping) {
			skeleton += mapping.latin;
		} else {
			skeleton += char;
		}
	}
	return skeleton.normalize('NFC');
}

/**
 * Given two identifiers that share the same skeleton, build a human-readable reason.
 */
function buildConfusableReason(a: string, b: string): string {
	const differences: string[] = [];
	const aChars = [...a];
	const bChars = [...b];

	const maxLen = Math.max(aChars.length, bChars.length);
	for (let i = 0; i < maxLen; i++) {
		const aCh = aChars[i];
		const bCh = bChars[i];
		if (aCh === bCh) continue;
		if (!aCh || !bCh) continue;

		const aCp = aCh.codePointAt(0);
		const bCp = bCh.codePointAt(0);
		if (aCp === undefined || bCp === undefined) continue;

		const aMap = CONFUSABLE_TO_LATIN.get(aCp);
		const bMap = CONFUSABLE_TO_LATIN.get(bCp);

		if (aMap) {
			differences.push(`${aMap.scriptLabel} vs Latin ${aMap.latin}`);
		} else if (bMap) {
			differences.push(`${bMap.scriptLabel} vs Latin ${bMap.latin}`);
		}
	}

	if (differences.length === 0) {
		return `"${a}" and "${b}" are visually confusable`;
	}
	return differences.join(', ');
}

// ---------------------------------------------------------------------------
// Severity classification
// ---------------------------------------------------------------------------

function classifySeverity(
	isMixedScript: boolean,
	hasBidi: boolean,
	hasZeroWidth: boolean,
	isConfusable: boolean,
): UnicodeIdentifierSeverity {
	// Critical: Bidi overrides, zero-width chars, or confusable with another identifier
	if (hasBidi || hasZeroWidth) return 'critical';
	if (isConfusable) return 'critical';

	// Warning: mixed scripts
	if (isMixedScript) return 'warning';

	// Info: non-ASCII but single-script (legitimate internationalization)
	return 'info';
}

// ---------------------------------------------------------------------------
// Scope resolution
// ---------------------------------------------------------------------------

function resolveScope(node: Node): string {
	let current = node.getParent();

	while (current) {
		if (Node.isFunctionDeclaration(current)) {
			const name = current.getName();
			return name ? `function:${name}` : 'function:<anonymous>';
		}
		if (Node.isMethodDeclaration(current)) {
			const className = current.getParent()
				&& Node.isClassDeclaration(current.getParent()!)
				? (current.getParent() as ReturnType<SourceFile['getClass']>)?.getName()
				: undefined;
			const methodName = current.getName();
			return className ? `method:${className}.${methodName}` : `method:${methodName}`;
		}
		if (Node.isClassDeclaration(current)) {
			const name = current.getName();
			return name ? `class:${name}` : 'class:<anonymous>';
		}
		if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
			// Check if assigned to a variable
			const parent = current.getParent();
			if (parent && Node.isVariableDeclaration(parent)) {
				return `function:${parent.getName()}`;
			}
			return 'function:<anonymous>';
		}
		if (Node.isInterfaceDeclaration(current)) {
			const name = current.getName();
			return `interface:${name}`;
		}
		if (Node.isBlock(current)) {
			// Could be an if/for/while block — keep walking up
			current = current.getParent();
			continue;
		}
		if (Node.isSourceFile(current)) {
			return 'file';
		}
		current = current.getParent();
	}

	return 'file';
}

// ---------------------------------------------------------------------------
// Check if an identifier is non-ASCII
// ---------------------------------------------------------------------------

function isNonAsciiIdentifier(name: string): boolean {
	for (const char of name) {
		const cp = char.codePointAt(0);
		if (cp !== undefined && cp > 0x7F) return true;
	}
	return false;
}

function hasSpecialChars(name: string): boolean {
	return containsBidi(name) || containsZeroWidth(name);
}

// ---------------------------------------------------------------------------
// Identifier collection from AST
// ---------------------------------------------------------------------------

interface RawIdentifier {
	name: string;
	node: Node;
	line: number;
	isNonAscii: boolean;
}

function collectAllIdentifiers(sourceFile: SourceFile): RawIdentifier[] {
	const identifiers: RawIdentifier[] = [];
	const seen = new Set<string>();

	sourceFile.forEachDescendant((node) => {
		if (node.getKind() === SyntaxKind.Identifier) {
			const parent = node.getParent();
			if (!parent) return;

			const isDeclaration =
				Node.isVariableDeclaration(parent) ||
				Node.isFunctionDeclaration(parent) ||
				Node.isClassDeclaration(parent) ||
				Node.isInterfaceDeclaration(parent) ||
				Node.isTypeAliasDeclaration(parent) ||
				Node.isParameterDeclaration(parent) ||
				Node.isPropertyDeclaration(parent) ||
				Node.isPropertySignature(parent) ||
				Node.isMethodDeclaration(parent) ||
				Node.isMethodSignature(parent) ||
				Node.isEnumDeclaration(parent) ||
				Node.isEnumMember(parent);

			if (!isDeclaration) return;

			const name = node.getText();
			const nonAscii = isNonAsciiIdentifier(name) || hasSpecialChars(name);

			// Deduplicate by name for skeleton purposes
			if (!seen.has(name)) {
				seen.add(name);
				identifiers.push({
					name,
					node: parent,
					line: node.getStartLineNumber(),
					isNonAscii: nonAscii,
				});
			}
		}
	});

	return identifiers;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve Unicode identifier analysis for a source file.
 *
 * Scans all identifier declarations for non-ASCII characters and reports:
 * - Script composition (single vs mixed)
 * - Bidi override characters
 * - Zero-width characters
 * - Confusable/homoglyph pairs between identifiers
 * - Scope-aware severity classification
 *
 * @param project       - ts-morph Project.
 * @param filePath      - Absolute path of the file to analyze.
 * @param workspaceRoot - Workspace root for computing relative paths.
 */
export function resolveUnicodeIdentifiers(
	project: Project,
	filePath: string,
	workspaceRoot: string,
): UnicodeIdentifierAnalysis {
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');

	const allIdentifiers = collectAllIdentifiers(sourceFile);

	// Build skeleton map from ALL identifiers (ASCII + non-ASCII)
	const skeletonMap = new Map<string, string[]>();
	for (const raw of allIdentifiers) {
		const skeleton = computeSkeleton(raw.name);
		const existing = skeletonMap.get(skeleton);
		if (existing) {
			if (!existing.includes(raw.name)) {
				existing.push(raw.name);
			}
		} else {
			skeletonMap.set(skeleton, [raw.name]);
		}
	}

	// Detect confusable pairs from skeleton map
	const confusablePairs: ConfusablePair[] = [];
	const confusableNames = new Set<string>();

	for (const [_skeleton, names] of skeletonMap) {
		if (names.length < 2) continue;
		for (let i = 0; i < names.length; i++) {
			for (let j = i + 1; j < names.length; j++) {
				if (names[i] !== names[j]) {
					confusableNames.add(names[i]);
					confusableNames.add(names[j]);
					confusablePairs.push({
						a: names[i],
						b: names[j],
						reason: buildConfusableReason(names[i], names[j]),
					});
				}
			}
		}
	}

	// Build entries only from non-ASCII identifiers
	const entries: UnicodeIdentifierEntry[] = [];

	for (const raw of allIdentifiers) {
		if (!raw.isNonAscii) continue;

		const normalizedName = normalizeNFC(raw.name);
		const scripts = getScripts(raw.name);
		const scriptArray = [...scripts].sort();
		const isMixedScript = scripts.size > 1;
		const hasBidiOverride = containsBidi(raw.name);
		const hasZeroWidthChars = containsZeroWidth(raw.name);
		const scope = resolveScope(raw.node);
		const isConfusable = confusableNames.has(raw.name);

		entries.push({
			name: raw.name,
			normalizedName,
			scripts: scriptArray,
			isMixedScript,
			hasBidiOverride,
			hasZeroWidth: hasZeroWidthChars,
			severity: classifySeverity(isMixedScript, hasBidiOverride, hasZeroWidthChars, isConfusable),
			scope,
			line: raw.line,
		});
	}

	return {
		filePath: relativePath,
		identifiers: entries,
		confusablePairs,
	};
}
