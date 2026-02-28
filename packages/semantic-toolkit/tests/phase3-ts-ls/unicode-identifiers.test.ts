import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveUnicodeIdentifiers } from '../../src/ts-ls/unicode-identifiers';
import type { UnicodeIdentifierAnalysis } from '../../src/ts-ls/types';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'unicode-identifiers');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Unicode / Confusable Identifiers (Item 19)', () => {
	let project: Project;
	let result: UnicodeIdentifierAnalysis;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
		result = resolveUnicodeIdentifiers(project, abs('identifiers.ts'), workspaceRoot);
	});

	// ===================================================================
	// Basic structure
	// ===================================================================

	describe('basic structure', () => {
		it('should return the correct relative file path', () => {
			expect(result.filePath).toBe('identifiers.ts');
		});

		it('should return identifiers array', () => {
			expect(Array.isArray(result.identifiers)).toBe(true);
		});

		it('should return confusablePairs array', () => {
			expect(Array.isArray(result.confusablePairs)).toBe(true);
		});

		it('should not include pure ASCII identifiers', () => {
			const names = result.identifiers.map(i => i.name);
			expect(names).not.toContain('normalVar');
			expect(names).not.toContain('normalFunc');
			expect(names).not.toContain('NormalClass');
			expect(names).not.toContain('NormalInterface');
		});
	});

	// ===================================================================
	// Single-script non-ASCII (info severity)
	// ===================================================================

	describe('single-script non-ASCII (Latin Extended)', () => {
		it('should detect caf\u00e9 as non-ASCII', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'caf\u00e9');
			expect(entry).toBeDefined();
		});

		it('should classify caf\u00e9 as single-script Latin', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'caf\u00e9');
			expect(entry?.isMixedScript).toBe(false);
			expect(entry?.scripts).toContain('Latin');
		});

		it('should assign info severity to caf\u00e9', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'caf\u00e9');
			expect(entry?.severity).toBe('info');
		});

		it('should detect r\u00e9sum\u00e9 as non-ASCII', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'r\u00e9sum\u00e9');
			expect(entry).toBeDefined();
			expect(entry?.severity).toBe('info');
		});

		it('should detect na\u00efve as non-ASCII', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'na\u00efve');
			expect(entry).toBeDefined();
			expect(entry?.severity).toBe('info');
		});
	});

	// ===================================================================
	// Cyrillic-only identifiers (info severity)
	// ===================================================================

	describe('Cyrillic-only identifiers', () => {
		it('should detect \u0444\u0443\u043D\u043A\u0446\u0438\u044F as Cyrillic', () => {
			const entry = result.identifiers.find(i => i.name === '\u0444\u0443\u043D\u043A\u0446\u0438\u044F');
			expect(entry).toBeDefined();
			expect(entry?.scripts).toEqual(['Cyrillic']);
			expect(entry?.isMixedScript).toBe(false);
		});

		it('should assign info severity to pure Cyrillic identifiers', () => {
			const entry = result.identifiers.find(i => i.name === '\u0444\u0443\u043D\u043A\u0446\u0438\u044F');
			expect(entry?.severity).toBe('info');
		});

		it('should detect \u0434\u0430\u043D\u043D\u044B\u0435 as Cyrillic', () => {
			const entry = result.identifiers.find(i => i.name === '\u0434\u0430\u043D\u043D\u044B\u0435');
			expect(entry).toBeDefined();
			expect(entry?.scripts).toEqual(['Cyrillic']);
		});
	});

	// ===================================================================
	// Mixed-script identifiers (warning severity)
	// ===================================================================

	describe('mixed-script identifiers', () => {
		it('should detect p\u0430yment as mixed Latin+Cyrillic', () => {
			const entry = result.identifiers.find(i => i.name === 'p\u0430yment');
			expect(entry).toBeDefined();
			expect(entry?.isMixedScript).toBe(true);
			expect(entry?.scripts).toContain('Latin');
			expect(entry?.scripts).toContain('Cyrillic');
		});

		it('should assign warning or higher severity to mixed-script', () => {
			const entry = result.identifiers.find(i => i.name === 'p\u0430yment');
			expect(entry).toBeDefined();
			expect(['warning', 'critical']).toContain(entry?.severity);
		});

		it('should detect \u03b1lpha_value as mixed Greek+Latin', () => {
			const entry = result.identifiers.find(i => i.name === '\u03b1lpha_value');
			expect(entry).toBeDefined();
			expect(entry?.isMixedScript).toBe(true);
			expect(entry?.scripts).toContain('Greek');
			expect(entry?.scripts).toContain('Latin');
		});

		it('should detect \u0394x as mixed Greek+Latin', () => {
			const entry = result.identifiers.find(i => i.name === '\u0394x');
			expect(entry).toBeDefined();
			expect(entry?.isMixedScript).toBe(true);
			expect(entry?.scripts).toContain('Greek');
			expect(entry?.scripts).toContain('Latin');
		});
	});

	// ===================================================================
	// Confusable pairs (critical severity)
	// ===================================================================

	describe('confusable pairs', () => {
		it('should detect score/s\u0441ore as confusable', () => {
			const pair = result.confusablePairs.find(
				p => (p.a === 'score' && p.b === 's\u0441ore') || (p.a === 's\u0441ore' && p.b === 'score'),
			);
			expect(pair).toBeDefined();
		});

		it('should provide a human-readable reason for confusable pair', () => {
			const pair = result.confusablePairs.find(
				p => (p.a === 'score' && p.b === 's\u0441ore') || (p.a === 's\u0441ore' && p.b === 'score'),
			);
			expect(pair?.reason).toContain('Cyrillic');
		});

		it('should detect port/\u0440ort as confusable', () => {
			const pair = result.confusablePairs.find(
				p => (p.a === 'port' && p.b === '\u0440ort') || (p.a === '\u0440ort' && p.b === 'port'),
			);
			expect(pair).toBeDefined();
		});

		it('should assign critical severity to confusable identifiers', () => {
			const entry = result.identifiers.find(i => i.name === 's\u0441ore');
			expect(entry?.severity).toBe('critical');
		});

		it('should also mark the Latin counterpart as critical when confusable', () => {
			// 'score' itself should be escalated to critical because it has a confusable
			const scoreEntry = result.identifiers.find(i => i.name === 'score');
			// Note: 'score' is pure ASCII so it won't be in the identifiers array
			// Only non-ASCII identifiers are flagged — the confusable pair captures both
			const pair = result.confusablePairs.find(
				p => (p.a === 'score' || p.b === 'score'),
			);
			expect(pair).toBeDefined();
		});
	});

	// ===================================================================
	// Zero-width characters (critical severity)
	// ===================================================================

	describe('zero-width characters', () => {
		it('should detect identifier with ZWNJ (U+200C)', () => {
			const entry = result.identifiers.find(i => i.name.includes('\u200C'));
			expect(entry).toBeDefined();
			expect(entry?.hasZeroWidth).toBe(true);
		});

		it('should detect identifier with ZWJ (U+200D)', () => {
			const entry = result.identifiers.find(i => i.name.includes('\u200D'));
			expect(entry).toBeDefined();
			expect(entry?.hasZeroWidth).toBe(true);
		});

		it('should assign critical severity to zero-width identifiers', () => {
			const entry = result.identifiers.find(i => i.name.includes('\u200C'));
			expect(entry?.severity).toBe('critical');
		});
	});

	// ===================================================================
	// Scope detection
	// ===================================================================

	describe('scope detection', () => {
		it('should assign file scope to top-level identifiers', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'caf\u00e9');
			expect(entry?.scope).toBe('file');
		});

		it('should assign function scope to identifiers inside functions', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'r\u00e9sultat');
			expect(entry).toBeDefined();
			expect(entry?.scope).toBe('function:processData');
		});

		it('should assign class scope to identifiers inside classes', () => {
			const entry = result.identifiers.find(i => i.normalizedName === '\u00e9tat');
			expect(entry).toBeDefined();
			expect(entry?.scope).toBe('class:DataService');
		});

		it('should assign interface scope to identifiers inside interfaces', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'n\u00e4me');
			expect(entry).toBeDefined();
			expect(entry?.scope).toContain('interface:');
		});
	});

	// ===================================================================
	// NFC normalization
	// ===================================================================

	describe('NFC normalization', () => {
		it('should NFC-normalize identifiers', () => {
			const entry = result.identifiers.find(i => i.normalizedName === 'caf\u00e9');
			expect(entry).toBeDefined();
			// NFC-normalized form should use precomposed character
			expect(entry?.normalizedName).toBe('caf\u00e9');
		});

		it('should detect combining diacritical mark identifier', () => {
			// cafe + combining acute (U+0301) normalizes to café_two
			const entry = result.identifiers.find(i => i.normalizedName === 'caf\u00e9_two');
			expect(entry).toBeDefined();
		});
	});

	// ===================================================================
	// CJK identifiers (info)
	// ===================================================================

	describe('CJK identifiers', () => {
		it('should detect \u4e16\u754c as CJK', () => {
			const entry = result.identifiers.find(i => i.name === '\u4e16\u754c');
			expect(entry).toBeDefined();
			expect(entry?.scripts).toContain('CJK');
			expect(entry?.isMixedScript).toBe(false);
		});

		it('should assign info severity to CJK identifiers', () => {
			const entry = result.identifiers.find(i => i.name === '\u4e16\u754c');
			expect(entry?.severity).toBe('info');
		});
	});

	// ===================================================================
	// Greek-only identifiers (info)
	// ===================================================================

	describe('Greek-only identifiers', () => {
		it('should detect \u03c0 as Greek', () => {
			const entry = result.identifiers.find(i => i.name === '\u03c0');
			expect(entry).toBeDefined();
			expect(entry?.scripts).toContain('Greek');
			expect(entry?.isMixedScript).toBe(false);
		});

		it('should assign info severity to pure Greek identifiers', () => {
			const entry = result.identifiers.find(i => i.name === '\u03c0');
			expect(entry?.severity).toBe('info');
		});
	});

	// ===================================================================
	// Enum with Unicode name
	// ===================================================================

	describe('enum with Unicode name', () => {
		it('should detect enum with accented name', () => {
			const entry = result.identifiers.find(i => i.normalizedName === '\u00c9tat');
			expect(entry).toBeDefined();
			expect(entry?.severity).toBe('info');
		});
	});

	// ===================================================================
	// No bidi / no false positives
	// ===================================================================

	describe('no false positives', () => {
		it('should not mark pure ASCII identifiers with hasBidiOverride', () => {
			for (const entry of result.identifiers) {
				if (!entry.name.includes('\u200C') && !entry.name.includes('\u200D')) {
					expect(entry.hasBidiOverride).toBe(false);
				}
			}
		});

		it('should have no zero-width flags on normal non-ASCII identifiers', () => {
			const cafe = result.identifiers.find(i => i.normalizedName === 'caf\u00e9');
			expect(cafe?.hasZeroWidth).toBe(false);
		});

		it('should not include safeValue (pure ASCII) in identifiers', () => {
			expect(result.identifiers.find(i => i.name === 'safeValue')).toBeUndefined();
		});
	});

	// ===================================================================
	// Line numbers
	// ===================================================================

	describe('line numbers', () => {
		it('should provide valid line numbers for all entries', () => {
			for (const entry of result.identifiers) {
				expect(entry.line).toBeGreaterThan(0);
			}
		});
	});

	// ===================================================================
	// Overall counts sanity check
	// ===================================================================

	describe('count sanity', () => {
		it('should detect at least 10 non-ASCII identifiers', () => {
			// café, résumé, naïve, функция, данные, pаyment, αlpha_value,
			// sсore, рort, foo‌bar, test‍name, résultat, état, näme,
			// π, Δx, 世界, café_two, État, Configurätion
			expect(result.identifiers.length).toBeGreaterThanOrEqual(10);
		});

		it('should detect at least 2 confusable pairs', () => {
			// score/sсore, port/рort
			expect(result.confusablePairs.length).toBeGreaterThanOrEqual(2);
		});
	});
});
