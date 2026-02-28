/**
 * Cross-platform path normalization utilities.
 *
 * Centralizes backslash-to-forward-slash conversion so no regex-based
 * `.replace(/\\\\/g, '/')` is scattered across individual resolvers.
 */
import * as path from 'node:path';

/**
 * Convert any path string to use POSIX forward-slash separators.
 */
export function toPosixPath(p: string): string {
	return p.replaceAll('\\', '/');
}

/**
 * Compute a workspace-relative path using POSIX separators.
 *
 * Equivalent to `path.relative(root, abs)` with forward slashes.
 */
export function toRelativePosixPath(workspaceRoot: string, absolutePath: string): string {
	return toPosixPath(path.relative(workspaceRoot, absolutePath));
}
