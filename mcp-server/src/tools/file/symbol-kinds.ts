/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared symbol kind sets for file_read and file_edit tools.
 * These must stay in sync to ensure consistent "visible scope" behavior
 * between reading and editing files.
 *
 * IMPORTANT: Any changes here affect both tools. When scoping to a symbol:
 * - file_read shows collapsed stubs for BODY_BEARING children with grandchildren
 * - file_edit excludes those same collapsed regions from string matching
 *
 * Keeping these definitions centralized prevents drift bugs where read and edit
 * have different notions of what content is "visible" at a given scope level.
 */

/**
 * Symbol kinds that represent body-bearing constructs.
 * In symbol-target mode, body-bearing children with grandchildren are collapsed
 * to stubs — content inside them is NOT visible at the parent scope level.
 *
 * Includes:
 * - Functions/methods with bodies
 * - Classes/interfaces/enums with members
 * - Namespaces/modules with nested declarations
 */
export const BODY_BEARING_KINDS: ReadonlySet<string> = new Set([
	'function',
	'method',
	'constructor',
	'getter',
	'setter',
	'class',
	'interface',
	'enum',
	'namespace',
	'module',
]);

/**
 * Kinds that are never collapsed — always shown as raw source code.
 * These represent structural groupings that don't have meaningful "bodies"
 * and should always be fully visible.
 */
export const RAW_CODE_KINDS: ReadonlySet<string> = new Set([
	'imports',
]);

/**
 * Control flow constructs are hidden entirely from the skeleton overview.
 * They add noise without helping navigation. These are internal AST details
 * that shouldn't be exposed as addressable symbols.
 */
export const CONTROL_FLOW_KINDS: ReadonlySet<string> = new Set([
	'if',
	'else',
	'for',
	'for-in',
	'for-of',
	'while',
	'do-while',
	'switch',
	'case',
	'default',
	'try',
	'try-catch',
	'catch',
	'finally',
]);

/**
 * Container kinds that are visible in skeleton but treated specially.
 * Single-line containers are shown as raw code; multi-line are collapsible.
 */
export const CONTAINER_KINDS: ReadonlySet<string> = new Set([
	'comment',
	'jsdoc',
	'tsdoc',
]);
