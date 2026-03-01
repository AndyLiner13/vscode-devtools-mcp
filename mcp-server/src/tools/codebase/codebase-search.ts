/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, statSync } from 'node:fs';
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

// ── File Resolution ──────────────────────────────────────

/**
 * Resolve the `file` param into an absolute file path.
 * Only single files are supported — directories are rejected (workspace-wide
 * search is deferred to Phase 9).
 */
function resolveFilePath(fileParam: string, workspaceRoot: string): string {
	const resolved = path.isAbsolute(fileParam)
		? fileParam
		: path.resolve(workspaceRoot, fileParam);

	if (!existsSync(resolved)) {
		throw new Error(`File not found: ${fileParam}`);
	}

	const stat = statSync(resolved);

	if (stat.isDirectory()) {
		throw new Error(
			`"${fileParam}" is a directory. The file parameter must be a specific file path, not a folder. ` +
			`Workspace-wide search is not available yet. Provide a single file, e.g. "${fileParam}/index.ts"`,
		);
	}

	if (!stat.isFile()) {
		throw new Error(`Path is not a file: ${fileParam}`);
	}

	const ext = path.extname(resolved).slice(1).toLowerCase();
	if (!PARSEABLE_EXTENSIONS.has(ext)) {
		throw new Error(
			`Unsupported file extension: ${path.extname(resolved)}. ` +
			`Supported: ${[...PARSEABLE_EXTENSIONS].map(e => `.${e}`).join(', ')}`,
		);
	}

	return resolved;
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
		'Search a single file for symbols by name with full semantic context.\n\n' +
		'Returns a connection graph showing the symbol\'s role and relationships, ' +
		'plus smart structural snapshots of the source code.\n\n' +
		'The `file` param must be a specific file path (not a folder).\n\n' +
		'The `query` param must use `symbol = Name` syntax for direct lookup:\n' +
		'- Simple: `symbol = validateToken`\n' +
		'- Nested: `symbol = TokenService > validateToken`\n' +
		'- With kind filter: `symbol = Config, kind = interface`\n\n' +
		'The `kind` flag is only needed when multiple symbols share the same name ' +
		'(e.g., a class and an interface both named "Config"). If ambiguous, the tool ' +
		'response will list exact queries to disambiguate.\n\n' +
		'Natural language search is not available in this version.\n\n' +
		'**EXAMPLES:**\n' +
		'- `{ file: "src/auth/tokenService.ts", query: "symbol = validateToken" }`\n' +
		'- `{ file: "src/auth/tokenService.ts", query: "symbol = TokenService > validate" }`\n' +
		'- `{ file: "src/config.ts", query: "symbol = Config, kind = interface" }`\n' +
		'- `{ file: "src/utils/helpers.ts", query: "symbol = debounce", callDepth: 2 }`',
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

		let filePath: string;
		try {
			filePath = resolveFilePath(file, rootDir);
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
			result = lookupSymbol(query, rootDir, [filePath], maxTokenBudget, tsLsConfig);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			response.appendResponseLine(`error: Failed to parse ${path.relative(rootDir, filePath)}: ${msg}`);
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

		response.appendResponseLine(result.output);

		const meta = [
			`# matches: ${result.matchCount}`,
			`# files: ${result.fileCount}`,
			`# tokens: ${result.tokenCount}`,
		].join('\n');
		response.appendResponseLine(meta);
	},
	name: 'codebase_search',
	schema: {
		file: zod
			.string()
			.describe(
				'Workspace-relative path to a specific source file. Required. ' +
				'Must be a file, not a directory. Example: "src/auth/tokenService.ts"',
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
