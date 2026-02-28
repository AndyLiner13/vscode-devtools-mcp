import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'node:path';

import { resolveEnumMembers } from '../../src/ts-ls/enum-members';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'enum-members');

function abs(filename: string): string {
	return path.resolve(FIXTURES_DIR, filename);
}

describe('Phase 3 — Enum Members (Item 18)', () => {
	let project: Project;
	const workspaceRoot = FIXTURES_DIR;

	beforeAll(() => {
		project = new Project({
			tsConfigFilePath: path.resolve(FIXTURES_DIR, 'tsconfig.json'),
		});
	});

	// ===================================================================
	// Numeric auto-increment
	// ===================================================================

	describe('Numeric auto-increment (Direction)', () => {
		it('should detect 4 members', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			expect(result.members).toHaveLength(4);
		});

		it('should assign auto-incremented values 0-3', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			expect(result.members[0]).toMatchObject({ name: 'Up', value: '0' });
			expect(result.members[1]).toMatchObject({ name: 'Down', value: '1' });
			expect(result.members[2]).toMatchObject({ name: 'Left', value: '2' });
			expect(result.members[3]).toMatchObject({ name: 'Right', value: '3' });
		});

		it('should not mark auto-incremented as computed', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			for (const m of result.members) {
				expect(m.isComputed).toBe(false);
			}
		});

		it('should not be const or declare', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			expect(result.isConst).toBe(false);
			expect(result.isDeclare).toBe(false);
		});
	});

	// ===================================================================
	// Numeric explicit values
	// ===================================================================

	describe('Numeric explicit values (HttpStatus)', () => {
		it('should extract correct numeric values', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'HttpStatus', workspaceRoot);
			expect(result.members[0]).toMatchObject({ name: 'OK', value: '200' });
			expect(result.members[1]).toMatchObject({ name: 'NotFound', value: '404' });
			expect(result.members[2]).toMatchObject({ name: 'InternalServerError', value: '500' });
		});

		it('should not mark numeric literals as computed', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'HttpStatus', workspaceRoot);
			for (const m of result.members) {
				expect(m.isComputed).toBe(false);
			}
		});
	});

	// ===================================================================
	// String enum
	// ===================================================================

	describe('String enum (Color)', () => {
		it('should extract string values', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Color', workspaceRoot);
			expect(result.members[0]).toMatchObject({ name: 'Red', value: '"RED"' });
			expect(result.members[1]).toMatchObject({ name: 'Green', value: '"GREEN"' });
			expect(result.members[2]).toMatchObject({ name: 'Blue', value: '"BLUE"' });
		});

		it('should not mark string literals as computed', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Color', workspaceRoot);
			for (const m of result.members) {
				expect(m.isComputed).toBe(false);
			}
		});
	});

	// ===================================================================
	// Const enum
	// ===================================================================

	describe('Const enum (Flags)', () => {
		it('should detect isConst as true', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Flags', workspaceRoot);
			expect(result.isConst).toBe(true);
		});

		it('should extract member values correctly', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Flags', workspaceRoot);
			expect(result.members).toHaveLength(4);
			expect(result.members[0]).toMatchObject({ name: 'None', value: '0' });
			expect(result.members[1]).toMatchObject({ name: 'Read', value: '1' });
			expect(result.members[2]).toMatchObject({ name: 'Write', value: '2' });
			expect(result.members[3]).toMatchObject({ name: 'Execute', value: '4' });
		});
	});

	// ===================================================================
	// Mixed (heterogeneous) enum
	// ===================================================================

	describe('Mixed enum (Mixed)', () => {
		it('should extract numeric and string values', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Mixed', workspaceRoot);
			expect(result.members[0]).toMatchObject({ name: 'Zero', value: '0' });
			expect(result.members[1]).toMatchObject({ name: 'Hello', value: '"hello"' });
		});
	});

	// ===================================================================
	// Computed members
	// ===================================================================

	describe('Computed members (Computed)', () => {
		it('should mark computed expressions as isComputed', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Computed', workspaceRoot);
			expect(result.members[0].isComputed).toBe(true);
			expect(result.members[0].value).toBe('1 + 2');
			expect(result.members[1].isComputed).toBe(true);
			expect(result.members[1].value).toBe('"hello".length');
		});

		it('should not mark simple numeric literal as computed', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Computed', workspaceRoot);
			expect(result.members[2].isComputed).toBe(false);
			expect(result.members[2].value).toBe('10');
		});
	});

	// ===================================================================
	// Ambient (declare) enum
	// ===================================================================

	describe('Ambient enum (External)', () => {
		it('should detect isDeclare as true', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'External', workspaceRoot);
			expect(result.isDeclare).toBe(true);
		});

		it('should extract auto-incremented members', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'External', workspaceRoot);
			expect(result.members).toHaveLength(3);
			expect(result.members[0]).toMatchObject({ name: 'Foo', value: '0' });
			expect(result.members[1]).toMatchObject({ name: 'Bar', value: '1' });
			expect(result.members[2]).toMatchObject({ name: 'Baz', value: '2' });
		});
	});

	// ===================================================================
	// Negative values
	// ===================================================================

	describe('Negative values (Temperature)', () => {
		it('should handle negative numeric initializer', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Temperature', workspaceRoot);
			expect(result.members[0]).toMatchObject({ name: 'Freezing', value: '-10' });
			expect(result.members[0].isComputed).toBe(false);
		});

		it('should extract all Temperature members correctly', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Temperature', workspaceRoot);
			expect(result.members).toHaveLength(4);
			expect(result.members[1]).toMatchObject({ name: 'Cold', value: '0' });
			expect(result.members[2]).toMatchObject({ name: 'Warm', value: '20' });
			expect(result.members[3]).toMatchObject({ name: 'Hot', value: '40' });
		});
	});

	// ===================================================================
	// Mixed auto-increment after explicit value
	// ===================================================================

	describe('Auto-increment after explicit (Sequence)', () => {
		it('should auto-increment from 0 then reset at 100', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Sequence', workspaceRoot);
			expect(result.members).toHaveLength(5);
			expect(result.members[0]).toMatchObject({ name: 'A', value: '0' });
			expect(result.members[1]).toMatchObject({ name: 'B', value: '1' });
			expect(result.members[2]).toMatchObject({ name: 'C', value: '100' });
			expect(result.members[3]).toMatchObject({ name: 'D', value: '101' });
			expect(result.members[4]).toMatchObject({ name: 'E', value: '102' });
		});
	});

	// ===================================================================
	// Edge cases
	// ===================================================================

	describe('Edge cases', () => {
		it('should handle empty enum', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Empty', workspaceRoot);
			expect(result.members).toHaveLength(0);
			expect(result.isConst).toBe(false);
			expect(result.isDeclare).toBe(false);
		});

		it('should handle single-member enum', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'SingleMember', workspaceRoot);
			expect(result.members).toHaveLength(1);
			expect(result.members[0]).toMatchObject({ name: 'Only', value: '"ONLY"' });
		});
	});

	// ===================================================================
	// Symbol metadata
	// ===================================================================

	describe('Symbol metadata', () => {
		it('should include correct symbol ref for Direction', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			expect(result.symbol.name).toBe('Direction');
			expect(result.symbol.filePath).toBe('enums.ts');
			expect(result.symbol.line).toBeGreaterThan(0);
		});

		it('should include line numbers for each member', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			for (const m of result.members) {
				expect(m.line).toBeGreaterThan(0);
			}
		});

		it('should maintain member ordering', () => {
			const result = resolveEnumMembers(project, abs('enums.ts'), 'Direction', workspaceRoot);
			const lines = result.members.map(m => m.line);
			for (let i = 1; i < lines.length; i++) {
				expect(lines[i]).toBeGreaterThan(lines[i - 1]);
			}
		});
	});

	// ===================================================================
	// Error handling
	// ===================================================================

	describe('Error handling', () => {
		it('should throw for non-existent enum', () => {
			expect(() => {
				resolveEnumMembers(project, abs('enums.ts'), 'NonExistent', workspaceRoot);
			}).toThrow('Enum "NonExistent" not found');
		});
	});
});
