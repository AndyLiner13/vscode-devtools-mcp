/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NativeDocumentSymbol } from '../../client-pipe.js';

/**
 * A detected intent from comparing DocumentSymbol snapshots before/after an edit.
 */
export interface DetectedIntent {
	details?: string;
	/** For renames: the new name from the DocumentSymbol provider. */
	newName?: string;
	symbol: string;
	type: 'add' | 'body_change' | 'delete' | 'rename';
}

/**
 * A rename or import propagation result.
 */
export interface PropagatedChange {
	filesAffected: string[];
	totalEdits: number;
	type: 'import_update' | 'rename';
}

/**
 * An auto-fix applied via Code Actions.
 */
export interface AutoFix {
	file: string;
	fix: string;
}

/**
 * A remaining error after all auto-fixes.
 */
export interface RemainingError {
	file: string;
	line: number;
	message: string;
	severity: 'error' | 'warning';
}

/**
 * Result of file_read.
 */
interface FileReadResult {
	content: string;
	file: string;
	range: { startLine: number; endLine: number };
	symbol?: {
		name: string;
		kind: string;
		children?: string[];
	};
	totalLines: number;
}

/**
 * Result of file_edit.
 */
export interface FileEditResult {
	autoFixed: AutoFix[];
	detectedIntents: DetectedIntent[];
	file: string;
	propagated: PropagatedChange[];
	remainingErrors: RemainingError[];
	success: boolean;
	summary: string;
	target?: string;
}

/**
 * A match in the symbol tree — the symbol and how to reach it.
 */
interface SymbolMatch {
	parent?: NativeDocumentSymbol;
	path: string[];
	symbol: NativeDocumentSymbol;
}
