/**
 * Phase 3, Item 12 — Ambient and global augmentation resolver.
 *
 * Scans the project for:
 * - `declare global { ... }` blocks (global augmentations)
 * - `declare module 'xxx' { ... }` blocks (module augmentations / ambient modules)
 * - Ambient declarations in `.d.ts` files (excluding node_modules)
 */
import { Project, SyntaxKind } from 'ts-morph';
import type { SourceFile, ModuleDeclaration, Node } from 'ts-morph';
import * as path from 'node:path';

import type {
	AmbientInfo,
	GlobalAugmentation,
	ModuleAugmentation,
	AmbientDeclaration,
	AmbientMember,
} from './types';

export type {
	AmbientInfo,
	GlobalAugmentation,
	ModuleAugmentation,
	AmbientDeclaration,
	AmbientMember,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve all ambient/global augmentation information across the project.
 *
 * Scans every source file for `declare global`, `declare module`, and
 * `.d.ts` ambient declarations. Excludes node_modules.
 *
 * @param project       - ts-morph Project with all relevant source files added.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns AmbientInfo with global augmentations, module augmentations, and ambient declarations.
 */
export function resolveAmbients(
	project: Project,
	workspaceRoot: string,
): AmbientInfo {
	const globalAugmentations: GlobalAugmentation[] = [];
	const moduleAugmentations: ModuleAugmentation[] = [];
	const ambientDeclarations: AmbientDeclaration[] = [];

	for (const sourceFile of project.getSourceFiles()) {
		const filePath = sourceFile.getFilePath();
		if (filePath.includes('node_modules')) continue;

		const relativePath = toRelative(filePath, workspaceRoot);
		const isDts = filePath.endsWith('.d.ts');

		// Scan module declarations (namespace, declare global, declare module)
		for (const moduleDecl of sourceFile.getModules()) {
			processModuleDeclaration(moduleDecl, relativePath, globalAugmentations, moduleAugmentations);
		}

		// For .d.ts files, also collect top-level ambient declarations
		if (isDts) {
			collectAmbientDeclarations(sourceFile, relativePath, ambientDeclarations);
		}
	}

	// Sort for deterministic output
	globalAugmentations.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);
	moduleAugmentations.sort((a, b) =>
		a.moduleName.localeCompare(b.moduleName) || a.filePath.localeCompare(b.filePath) || a.line - b.line,
	);
	ambientDeclarations.sort((a, b) =>
		a.filePath.localeCompare(b.filePath) || a.line - b.line || a.name.localeCompare(b.name),
	);

	return { globalAugmentations, moduleAugmentations, ambientDeclarations };
}

// ---------------------------------------------------------------------------
// Module declaration processing
// ---------------------------------------------------------------------------

function processModuleDeclaration(
	moduleDecl: ModuleDeclaration,
	filePath: string,
	globalAugs: GlobalAugmentation[],
	moduleAugs: ModuleAugmentation[],
): void {
	const declKind = moduleDecl.getDeclarationKind();

	// `declare global { ... }`
	if (declKind === 'global') {
		const members = extractMembers(moduleDecl);
		globalAugs.push({
			filePath,
			line: moduleDecl.getStartLineNumber(),
			members,
		});
		return;
	}

	// `declare module 'xxx' { ... }` or `declare module "xxx" { ... }`
	// Module declarations with string literal names are module augmentations
	const nameNode = moduleDecl.getNameNode();
	if (nameNode.getKind() === SyntaxKind.StringLiteral) {
		const moduleName = moduleDecl.getName().slice(1, -1);
		const members = extractMembers(moduleDecl);
		moduleAugs.push({
			moduleName,
			filePath,
			line: moduleDecl.getStartLineNumber(),
			members,
		});
		return;
	}

	// Regular `namespace Foo { ... }` — not an augmentation, skip
}

// ---------------------------------------------------------------------------
// Ambient declaration collection (.d.ts files)
// ---------------------------------------------------------------------------

function collectAmbientDeclarations(
	sourceFile: SourceFile,
	filePath: string,
	declarations: AmbientDeclaration[],
): void {
	// Functions
	for (const fn of sourceFile.getFunctions()) {
		declarations.push({
			name: fn.getName() ?? '(anonymous)',
			kind: 'function',
			filePath,
			line: fn.getStartLineNumber(),
			signature: buildFunctionSignature(fn),
		});
	}

	// Variables
	for (const varStmt of sourceFile.getVariableStatements()) {
		for (const decl of varStmt.getDeclarations()) {
			declarations.push({
				name: decl.getName(),
				kind: 'variable',
				filePath,
				line: decl.getStartLineNumber(),
				signature: buildVariableSignature(decl),
			});
		}
	}

	// Interfaces
	for (const iface of sourceFile.getInterfaces()) {
		declarations.push({
			name: iface.getName(),
			kind: 'interface',
			filePath,
			line: iface.getStartLineNumber(),
		});
	}

	// Type aliases
	for (const typeAlias of sourceFile.getTypeAliases()) {
		declarations.push({
			name: typeAlias.getName(),
			kind: 'type',
			filePath,
			line: typeAlias.getStartLineNumber(),
			signature: `type ${typeAlias.getName()} = ${typeAlias.getTypeNode()?.getText() ?? 'unknown'}`,
		});
	}

	// Classes
	for (const cls of sourceFile.getClasses()) {
		declarations.push({
			name: cls.getName() ?? '(anonymous)',
			kind: 'class',
			filePath,
			line: cls.getStartLineNumber(),
		});
	}

	// Enums
	for (const enumDecl of sourceFile.getEnums()) {
		declarations.push({
			name: enumDecl.getName(),
			kind: 'enum',
			filePath,
			line: enumDecl.getStartLineNumber(),
		});
	}

	// Namespaces (non-global, non-module-augmentation)
	for (const ns of sourceFile.getModules()) {
		const name = ns.getName();
		if (ns.getDeclarationKind() === 'global' || ns.getNameNode().getKind() === SyntaxKind.StringLiteral) continue;
		declarations.push({
			name,
			kind: 'namespace',
			filePath,
			line: ns.getStartLineNumber(),
		});
	}
}

// ---------------------------------------------------------------------------
// Member extraction from module/namespace blocks
// ---------------------------------------------------------------------------

function extractMembers(moduleDecl: ModuleDeclaration): AmbientMember[] {
	const members: AmbientMember[] = [];
	const body = moduleDecl.getBody();
	if (!body) return members;

	// Functions
	for (const fn of moduleDecl.getFunctions()) {
		members.push({
			name: fn.getName() ?? '(anonymous)',
			kind: 'function',
			line: fn.getStartLineNumber(),
			signature: buildFunctionSignature(fn),
		});
	}

	// Variables
	for (const varStmt of moduleDecl.getVariableStatements()) {
		for (const decl of varStmt.getDeclarations()) {
			members.push({
				name: decl.getName(),
				kind: 'variable',
				line: decl.getStartLineNumber(),
				signature: buildVariableSignature(decl),
			});
		}
	}

	// Interfaces
	for (const iface of moduleDecl.getInterfaces()) {
		members.push({
			name: iface.getName(),
			kind: 'interface',
			line: iface.getStartLineNumber(),
		});
	}

	// Type aliases
	for (const typeAlias of moduleDecl.getTypeAliases()) {
		members.push({
			name: typeAlias.getName(),
			kind: 'type',
			line: typeAlias.getStartLineNumber(),
			signature: `type ${typeAlias.getName()} = ${typeAlias.getTypeNode()?.getText() ?? 'unknown'}`,
		});
	}

	// Classes
	for (const cls of moduleDecl.getClasses()) {
		members.push({
			name: cls.getName() ?? '(anonymous)',
			kind: 'class',
			line: cls.getStartLineNumber(),
		});
	}

	// Enums
	for (const enumDecl of moduleDecl.getEnums()) {
		members.push({
			name: enumDecl.getName(),
			kind: 'enum',
			line: enumDecl.getStartLineNumber(),
		});
	}

	// Nested namespaces
	for (const ns of moduleDecl.getModules()) {
		members.push({
			name: ns.getName(),
			kind: 'namespace',
			line: ns.getStartLineNumber(),
		});
	}

	return members.sort((a, b) => a.line - b.line);
}

// ---------------------------------------------------------------------------
// Signature helpers
// ---------------------------------------------------------------------------

function buildFunctionSignature(fn: Node & { getName?(): string | undefined; getParameters?(): Node[] }): string {
	// Safe access — use getText() and trim to one line for brevity
	const text = fn.getText();
	// Extract just the signature line (up to first { or end)
	const match = text.match(/^[^{]*/);
	return (match ? match[0] : text).trim();
}

function buildVariableSignature(decl: Node & { getName(): string }): string {
	const text = decl.getText();
	return text.trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toRelative(absolutePath: string, workspaceRoot: string): string {
	return path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
}
