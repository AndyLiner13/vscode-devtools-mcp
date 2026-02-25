/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';

import { z as zod } from 'zod';

export type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

import type { ToolCategory } from './categories.js';

/**
 * Maximum response size in characters to prevent overwhelming context windows.
 */
const /**
	 *
	 */
	CHARACTER_LIMIT = 25000;

export interface ToolDefinition<Schema extends zod.ZodRawShape = zod.ZodRawShape, OutputSchema extends zod.ZodType = zod.ZodType> {
	annotations: {
		title?: string;
		category: ToolCategory;
		/**
		 * If true, the tool does not modify its environment.
		 */
		readOnlyHint: boolean;
		/**
		 * If true, the tool may perform destructive updates.
		 * Default: true (conservative assumption).
		 */
		destructiveHint?: boolean;
		/**
		 * If true, repeated calls with same args have no additional effect.
		 */
		idempotentHint?: boolean;
		/**
		 * If true, the tool interacts with external entities.
		 * Default: true.
		 */
		openWorldHint?: boolean;
		conditions?: string[];
	};
	description: string;
	handler: (request: Request<Schema>, response: Response, extra: ToolExtra) => Promise<void>;
	name: string;
	outputSchema?: OutputSchema;
	schema: Schema;
	/**
	 * Maximum time in milliseconds for this tool to complete.
	 * If not specified, defaults to 30000 (30 seconds).
	 */
	timeoutMs?: number;
}

export interface Request<Schema extends zod.ZodRawShape> {
	params: zod.output<zod.ZodObject<Schema>>;
}

export interface ImageContentData {
	data: string;
	mimeType: string;
}

export interface Response {
	appendResponseLine: (value: string) => void;
	attachImage: (value: ImageContentData) => void;
	/**
	 * Call to skip appending the process ledger to this response.
	 * Use for JSON-format responses to avoid corrupting output.
	 */
	setSkipLedger: () => void;
}

export function defineTool<Schema extends zod.ZodRawShape>(definition: ToolDefinition<Schema>): ToolDefinition<Schema> {
	return definition;
}
