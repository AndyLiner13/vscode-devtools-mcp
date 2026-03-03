/**
 * Phase 7 — Ignore system types.
 *
 * Per-tool scoped gitignore-compatible pattern matching
 * via the `ignore` npm package.
 */

/** Parsed configuration from a `.devtoolsignore` file. */
export interface IgnoreConfig {
	/** Global patterns applied to all tools. */
	globalPatterns: string[];

	/** Per-tool patterns keyed by tool name (e.g. "codebase_search"). */
	toolPatterns: Map<string, string[]>;
}
