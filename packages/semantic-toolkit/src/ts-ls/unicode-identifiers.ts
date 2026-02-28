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
import { confusablesMap } from 'confusables';

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
// Confusable detection uses the `confusables` npm package which provides
// the full Unicode confusables.txt data (3300+ entries) via confusablesMap.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Unicode script detection via property escapes.
// Uses the V8 engine's built-in Unicode Character Database, which
// is always current with the platform's Unicode version.
// ---------------------------------------------------------------------------

const SCRIPT_PATTERNS: ReadonlyArray<[RegExp, string]> = [
	[/\p{Script=Latin}/u, 'Latin'],
	[/\p{Script=Greek}/u, 'Greek'],
	[/\p{Script=Cyrillic}/u, 'Cyrillic'],
	[/\p{Script=Armenian}/u, 'Armenian'],
	[/\p{Script=Arabic}/u, 'Arabic'],
	[/\p{Script=Devanagari}/u, 'Devanagari'],
	[/\p{Script=Han}/u, 'CJK'],
	[/\p{Script=Hiragana}/u, 'Hiragana'],
	[/\p{Script=Katakana}/u, 'Katakana'],
	[/\p{Script=Hangul}/u, 'Hangul'],
	[/\p{Script=Thai}/u, 'Thai'],
	[/\p{Script=Hebrew}/u, 'Hebrew'],
	[/\p{Script=Georgian}/u, 'Georgian'],
	[/\p{Script=Bengali}/u, 'Bengali'],
	[/\p{Script=Tamil}/u, 'Tamil'],
	[/\p{Script=Telugu}/u, 'Telugu'],
	[/\p{Script=Ethiopic}/u, 'Ethiopic'],
];

const COMMON_SCRIPT_RE = /\p{Script=Common}|\p{Script=Inherited}/u;
const COMBINING_MARK_RE = /\p{General_Category=Mark}/u;

function getScript(codePoint: number): string {
	const char = String.fromCodePoint(codePoint);

	if (COMMON_SCRIPT_RE.test(char)) return 'Common';
	if (COMBINING_MARK_RE.test(char)) return 'Combining';

	for (const [pattern, script] of SCRIPT_PATTERNS) {
		if (pattern.test(char)) {
			return script;
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
		if (script !== 'Combining' && script !== 'Common') {
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
 * characters with their canonical equivalents, then NFC-normalizing.
 * Two identifiers with the same skeleton are visually confusable.
 * Uses the full Unicode confusables.txt data via the confusables package.
 */
function computeSkeleton(name: string): string {
	let skeleton = '';
	for (const char of name) {
		const mapped = confusablesMap.get(char);
		skeleton += mapped ?? char;
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

		const aMapping = confusablesMap.get(aCh);
		const bMapping = confusablesMap.get(bCh);

		if (aMapping) {
			const aCp = aCh.codePointAt(0);
			const script = aCp !== undefined ? getScript(aCp) : 'Unknown';
			differences.push(`${script} ${aCh} vs Latin ${aMapping}`);
		} else if (bMapping) {
			const bCp = bCh.codePointAt(0);
			const script = bCp !== undefined ? getScript(bCp) : 'Unknown';
			differences.push(`${script} ${bCh} vs Latin ${bMapping}`);
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
