/**
 * Phase 4 — Smart Structural Snapshots.
 *
 * Main entry point for snapshot generation. Given target CodeChunks from
 * a single file, produces a dependency-aware snapshot showing only the
 * targets (fully expanded) and their same-file dependencies. Multiple
 * targets from the same file are merged into a single snapshot.
 *
 * Usage:
 *   const result = generateSnapshot(project, targets, workspaceRoot);
 */
import { Project } from 'ts-morph';

import type { CodeChunk } from '../chunker/types.js';
import type { SnapshotInput, SnapshotResult } from './types.js';
import { resolveIdentifiers } from './resolve.js';
import { renderSnapshot } from './render.js';

export type { SnapshotInput, SnapshotResult, ResolvedDependency, ResolutionResult, DependencyKind } from './types.js';
export { resolveIdentifiers } from './resolve.js';
export { renderSnapshot } from './render.js';

/**
 * Generate a smart structural snapshot for a set of target chunks from one file.
 *
 * This is the main API for Phase 4. It:
 * 1. Resolves all identifiers in target symbols to same-file declarations (recursive/transitive)
 * 2. Renders a clean source code snapshot with only referenced content
 *
 * @param project       - ts-morph Project with source files loaded.
 * @param targets       - CodeChunks to include (must all be from the same file).
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns Snapshot result with the rendered source code string.
 * @throws If targets are from different files or file is not in the project.
 */
export function generateSnapshot(
	project: Project,
	targets: CodeChunk[],
	workspaceRoot: string,
): SnapshotResult {
	if (targets.length === 0) {
		throw new Error('At least one target chunk is required');
	}

	// Validate all targets are from the same file
	const filePaths = new Set(targets.map(t => t.filePath));
	if (filePaths.size > 1) {
		throw new Error(
			`All targets must be from the same file. Got ${filePaths.size} different files: ${[...filePaths].join(', ')}`,
		);
	}

	const filePath = targets[0].filePath;
	const relativePath = targets[0].relativePath;

	// Get the source file content
	const sourceFile = project.getSourceFileOrThrow(filePath);
	const fileText = sourceFile.getFullText();
	const fileLines = fileText.split('\n');

	// Step 1: Resolve all same-file dependencies (recursive/transitive)
	const resolution = resolveIdentifiers(project, filePath, targets);

	// Step 2: Render the snapshot
	return renderSnapshot(resolution, targets, fileLines, relativePath);
}

/**
 * Generate snapshots for multiple groups of targets, one per file.
 *
 * Convenience function for Phase 9 (output formatting): given chunks from
 * multiple files, groups them by file and generates one snapshot per file.
 *
 * @param project       - ts-morph Project with source files loaded.
 * @param allTargets    - CodeChunks from potentially multiple files.
 * @param workspaceRoot - Workspace root for computing relative paths.
 * @returns Array of snapshot results, one per file, in score order.
 */
export function generateSnapshots(
	project: Project,
	allTargets: CodeChunk[],
	workspaceRoot: string,
): SnapshotResult[] {
	// Group targets by file
	const byFile = new Map<string, CodeChunk[]>();
	for (const target of allTargets) {
		const existing = byFile.get(target.filePath);
		if (existing) {
			existing.push(target);
		} else {
			byFile.set(target.filePath, [target]);
		}
	}

	// Generate one snapshot per file
	const results: SnapshotResult[] = [];
	for (const [, targets] of byFile) {
		results.push(generateSnapshot(project, targets, workspaceRoot));
	}

	return results;
}
