/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { z as zod } from 'zod';

import {
	lookupSymbol,
	PARSEABLE_EXTENSIONS,
	type LookupResult,
	type TsLsConfig,
} from '@packages/semantic-toolkit';
import { getClientWorkspace } from '../../config.js';
import { ToolCategory } from '../categories.js';
import { defineTool } from '../ToolDefinition.js';

// ── File Discovery ───────────────────────────────────────

/**
 * Recursively collect all files with supported extensions from a directory.
 */
function enumerateParseableFiles(dirPath: string): string[] {
	const results: string[] = [];

	function walk(dir: string): void {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				walk(fullPath);
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).slice(1).toLowerCase();
				if (PARSEABLE_EXTENSIONS.has(ext)) {
					results.push(fullPath);
				}
			}
		}
	}

	walk(dirPath);
	return results;
}

/**
 * Resolve the `file` param into an array of absolute file paths.
 * Supports single files and directories (glob deferred to Phase 9).
 */
function resolveFilePaths(fileParam: string, workspaceRoot: string): string[] {
	const resolved = path.isAbsolute(fileParam)
		? fileParam
		: path.resolve(workspaceRoot, fileParam);

	if (!existsSync(resolved)) {
		throw new Error(`File not found: ${fileParam}`);
	}

	const stat = statSync(resolved);

	if (stat.isFile()) {
		const ext = path.extname(resolved).slice(1).toLowerCase();
		if (!PARSEABLE_EXTENSIONS.has(ext)) {
			throw new Error(
				`Unsupported file extension: ${path.extname(resolved)}. ` +
				`Supported: ${[...PARSEABLE_EXTENSIONS].map(e => `.${e}`).join(', ')}`,
			);
		}
		return [resolved];
	}

	if (stat.isDirectory()) {
		const files = enumerateParseableFiles(resolved);
		if (files.length === 0) {
			throw new Error(`No supported source files found in: ${fileParam}`);
		}
		return files;
	}

	throw new Error(`Path is neither a file nor directory: ${fileParam}`);
}

// ── Tool Definition ──────────────────────────────────────

export const search = defineTool({
	annotations: {
		category: ToolCategory.CODEBASE_ANALYSIS,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
		readOnlyHint: true,
		title: 'Codebase Search'
	},
	description:
		'Search the codebase for symbols by name with full semantic context.\n\n' +
		'Returns a connection graph showing the symbol\'s role and relationships, ' +
		'plus smart structural snapshots of the source code.\n\n' +
		'The `query` param must use `symbol = Name` syntax for direct lookup:\n' +
		'- Simple: `symbol = validateToken`\n' +
		'- Nested: `symbol = TokenService > validateToken`\n' +
		'- With file path: `symbol = src/auth/tokenService.ts:TokenService`\n' +
		'- With kind filter: `symbol = Config, kind = interface`\n\n' +
		'The `kind` flag is only needed when multiple symbols share the same name ' +
		'(e.g., a class and an interface both named "Config"). If ambiguous, the tool ' +
		'response will list exact queries to disambiguate.\n\n' +
		'Natural language search is not available in this version.\n\n' +
		'**EXAMPLES:**\n' +
		'- `{ file: "src/auth", query: "symbol = validateToken" }`\n' +
		'- `{ file: "src/auth/tokenService.ts", query: "symbol = TokenService > validate" }`\n' +
		'- `{ file: "src/", query: "symbol = UserService", callDepth: 2 }`\n' +
		'- `{ file: "src/config.ts", query: "symbol = Config, kind = interface" }`',
	handler: async (request, response) => {
		const { file, query, callDepth, typeDepth, maxTokenBudget } = request.params;

		response.setSkipLedger();

		if (!query || query.trim() === '') {
			response.appendResponseLine(
				"error: Query is required. Use 'symbol = Name' for direct symbol lookup.",
			);
			return;
		}

		const rootDir = getClientWorkspace();

		let filePaths: string[];
		try {
			filePaths = resolveFilePaths(file, rootDir);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			response.appendResponseLine(`error: ${msg}`);
			return;
		}

		const tsLsConfig: Partial<TsLsConfig> = {};
		if (callDepth !== undefined) tsLsConfig.callDepth = callDepth;
		if (typeDepth !== undefined) tsLsConfig.typeDepth = typeDepth;

		let result: LookupResult;
		try {
			result = lookupSymbol(query, rootDir, filePaths, maxTokenBudget, tsLsConfig);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			const failedFile = filePaths.length === 1
				? path.relative(rootDir, filePaths[0])
				: `${filePaths.length} files`;
			response.appendResponseLine(`error: Failed to parse ${failedFile}: ${msg}`);
			return;
		}

		if (!result.isSymbolLookup) {
			response.appendResponseLine(
				"Natural language search is not yet available. Use 'symbol = Name' for direct symbol lookup.",
			);
			return;
		}

		if (!result.found) {
			response.appendResponseLine(result.output);
			return;
		}

		let output = result.output;

		const meta = [
			`# matches: ${result.matchCount}`,
			`# files: ${result.fileCount}`,
			`# tokens: ${result.tokenCount}`,
		];
		output += '\n\n' + meta.join('\n');

		response.appendResponseLine(output);
	},
	name: 'codebase_search',
	schema: {
		file: zod
			.string()
			.describe(
				'Workspace-relative path to the target file or directory. Required. ' +
				'When a single file, only that file is parsed. When a directory, all supported files are parsed recursively.',
			),
		query: zod
			.string()
			.describe(
				'Symbol lookup query. Use "symbol = Name" for direct lookup, ' +
				'"symbol = Parent > Child" for hierarchy, ' +
				'"symbol = Name, kind = interface" to disambiguate same-name symbols. ' +
				'Natural language search not yet available.',
			),
		callDepth: zod
			.number()
			.int()
			.optional()
			.default(1)
			.describe(
				'Max call depth for outgoing/incoming call resolution. 1 = immediate only (default). -1 = full transitive.',
			),
		typeDepth: zod
			.number()
			.int()
			.optional()
			.default(1)
			.describe(
				'Max nesting depth for advanced type structure extraction. 1 = top-level only (default).',
			),
		maxTokenBudget: zod
			.number()
			.int()
			.optional()
			.default(8000)
			.describe(
				'Maximum token budget for the combined output (connection graph + snapshots). Default: 8000.',
			),
	}
});
