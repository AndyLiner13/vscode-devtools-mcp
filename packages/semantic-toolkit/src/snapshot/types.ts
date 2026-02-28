/**
 * Phase 4 — Smart Structural Snapshot types.
 *
 * Defines input/output interfaces for the snapshot module.
 * A snapshot is a dependency-aware, filtered view of a source file
 * showing only target symbols and their same-file dependencies.
 */

import type { CodeChunk } from '../chunker/types';

/** Input for snapshot generation: target chunks from a single file. */
export interface SnapshotInput {
	/** Target CodeChunks to include in the snapshot (all from the same file). */
	targets: CodeChunk[];

	/** Absolute path of the file these targets belong to. */
	filePath: string;

	/** Workspace-relative path (forward slashes) for the file header. */
	relativePath: string;
}

/**
 * A same-file declaration that a target symbol depends on.
 * Collected during identifier resolution.
 */
export interface ResolvedDependency {
	/** 1-indexed start line of the declaration in the source file. */
	startLine: number;

	/** 1-indexed end line of the declaration in the source file. */
	endLine: number;

	/** The kind of dependency (import, constant, property, type alias, etc.). */
	kind: DependencyKind;

	/** Original source text of the declaration. */
	sourceText: string;
}

/** Classification of same-file declarations pulled into a snapshot. */
export type DependencyKind =
	| 'import'
	| 'type-import'
	| 'constant'
	| 'variable'
	| 'type-alias'
	| 'interface'
	| 'enum'
	| 'class-property'
	| 'class-declaration'
	| 'function'
	| 'other';

/** Result of resolving all same-file dependencies for a set of target symbols. */
export interface ResolutionResult {
	/** All same-file declarations that target symbols depend on (deduplicated). */
	dependencies: ResolvedDependency[];

	/** Line ranges of the target symbols themselves. */
	targetRanges: Array<{ startLine: number; endLine: number }>;
}

/** The assembled snapshot string with metadata. */
export interface SnapshotResult {
	/** The rendered snapshot — valid TypeScript source code. */
	snapshot: string;

	/** Workspace-relative file path (used for the header comment). */
	relativePath: string;

	/** Number of target symbols in this snapshot. */
	targetCount: number;

	/** Number of same-file dependencies included. */
	dependencyCount: number;
}
