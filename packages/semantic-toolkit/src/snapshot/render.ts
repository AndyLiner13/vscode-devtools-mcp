/**
 * Phase 4 — Snapshot assembly/renderer.
 *
 * Given a resolution result (target ranges + resolved dependencies), renders
 * a clean source code snapshot containing only the needed content in original
 * file order. Class wrappers are synthesized when targets are class members.
 */
import type { ResolutionResult, ResolvedDependency, SnapshotResult } from './types';
import type { CodeChunk } from '../chunker/types';

/**
 * Line range with its source text and classification.
 */
interface SnapshotSegment {
	startLine: number;
	endLine: number;
	sourceText: string;
	isTarget: boolean;
	isClassWrapper: boolean;
	indentLevel: number;
}

/**
 * Render a snapshot for a single file given resolved dependencies and targets.
 *
 * @param resolution   - Result from resolveIdentifiers.
 * @param targets      - Target CodeChunks being rendered.
 * @param fileLines    - Full file content split into lines.
 * @param relativePath - Workspace-relative path for the header comment.
 * @returns Rendered snapshot result.
 */
export function renderSnapshot(
	resolution: ResolutionResult,
	targets: CodeChunk[],
	fileLines: string[],
	relativePath: string,
): SnapshotResult {
	const { dependencies, targetRanges } = resolution;

	// Partition dependencies: imports, class wrapper(s), and other declarations
	const imports: ResolvedDependency[] = [];
	const classWrappers: ResolvedDependency[] = [];
	const declarations: ResolvedDependency[] = [];

	for (const dep of dependencies) {
		if (dep.kind === 'import' || dep.kind === 'type-import') {
			imports.push(dep);
		} else if (dep.kind === 'class-declaration') {
			classWrappers.push(dep);
		} else {
			declarations.push(dep);
		}
	}

	// Sort everything by original file order
	imports.sort((a, b) => a.startLine - b.startLine);
	declarations.sort((a, b) => a.startLine - b.startLine);

	// Determine if targets are class members (have a parent)
	const parentNames = new Set(
		targets.filter(t => t.parentName !== null).map(t => t.parentName!),
	);
	const isClassMember = parentNames.size > 0;

	// Build the snapshot lines
	const snapshotParts: string[] = [];

	// File header comment
	snapshotParts.push(`// ${relativePath}`);

	// Imports
	if (imports.length > 0) {
		snapshotParts.push('');
		for (const imp of imports) {
			snapshotParts.push(imp.sourceText);
		}
	}

	// Root-level declarations (constants, type aliases, etc.)
	// Only include declarations that are NOT inside a class wrapper
	const rootDeclarations = isClassMember
		? declarations.filter(d => !isInsideClassWrapper(d, classWrappers))
		: declarations;

	if (rootDeclarations.length > 0) {
		snapshotParts.push('');
		for (const decl of rootDeclarations) {
			snapshotParts.push(decl.sourceText);
		}
	}

	if (isClassMember) {
		// Render class wrapper(s) with targets and class-level deps inside
		for (const wrapper of classWrappers) {
			snapshotParts.push('');
			snapshotParts.push(
				renderClassWrapper(wrapper, targets, declarations, fileLines),
			);
		}
	} else {
		// Targets are root-level: render them directly
		const sortedTargets = [...targets].sort((a, b) => a.startLine - b.startLine);
		for (const target of sortedTargets) {
			snapshotParts.push('');
			snapshotParts.push(target.fullSource);
		}
	}

	const snapshot = snapshotParts.join('\n');

	return {
		snapshot,
		relativePath,
		targetCount: targets.length,
		dependencyCount: dependencies.length,
	};
}

/**
 * Render a class wrapper containing only the relevant members:
 * - Class declaration line (with extends/implements)
 * - Class-property dependencies
 * - Target method/member bodies
 * - Closing brace
 */
function renderClassWrapper(
	wrapper: ResolvedDependency,
	targets: CodeChunk[],
	declarations: ResolvedDependency[],
	fileLines: string[],
): string {
	// Extract the class declaration header (everything up to the opening brace)
	const classHeader = extractClassHeader(wrapper.sourceText);

	// Collect class members: properties (deps) + targets
	const classMembers: Array<{ startLine: number; text: string }> = [];

	// Class-property dependencies that are inside this class
	for (const decl of declarations) {
		if (
			decl.kind === 'class-property'
			&& decl.startLine >= wrapper.startLine
			&& decl.endLine <= wrapper.endLine
		) {
			classMembers.push({ startLine: decl.startLine, text: decl.sourceText });
		}
	}

	// Target method/member bodies
	for (const target of targets) {
		if (
			target.startLine >= wrapper.startLine
			&& target.endLine <= wrapper.endLine
		) {
			classMembers.push({ startLine: target.startLine, text: target.fullSource });
		}
	}

	// Sort by original file order
	classMembers.sort((a, b) => a.startLine - b.startLine);

	// Assemble the class
	const lines: string[] = [classHeader];

	for (const member of classMembers) {
		// Add a blank line between members for readability
		if (lines.length > 1) {
			lines.push('');
		}
		lines.push(ensureIndentation(member.text));
	}

	lines.push('}');

	return lines.join('\n');
}

/**
 * Extract the class/interface declaration header up to (and including) the opening brace.
 * E.g., "export class TokenService extends BaseValidator {"
 */
function extractClassHeader(fullClassSource: string): string {
	const braceIndex = fullClassSource.indexOf('{');
	if (braceIndex === -1) return fullClassSource;

	return fullClassSource.substring(0, braceIndex + 1);
}

/**
 * Ensure class member text has proper indentation (at least one level).
 * If the member text already has indentation, preserve it.
 * If not, add standard indentation.
 */
function ensureIndentation(text: string): string {
	const lines = text.split('\n');
	const firstLine = lines[0];

	// If already indented, keep as-is
	if (firstLine.startsWith('\t') || firstLine.startsWith('  ')) {
		return text;
	}

	// Add a tab for each line
	return lines.map(line => (line.trim() === '' ? '' : `  ${line}`)).join('\n');
}

/**
 * Check if a declaration is inside a class wrapper's line range.
 */
function isInsideClassWrapper(
	decl: ResolvedDependency,
	classWrappers: ResolvedDependency[],
): boolean {
	for (const wrapper of classWrappers) {
		if (decl.startLine >= wrapper.startLine && decl.endLine <= wrapper.endLine) {
			return true;
		}
	}
	return false;
}
