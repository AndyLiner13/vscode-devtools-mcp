/**
 * Test fixture: snapshot/root-constant.ts
 *
 * File with imports, 5 constants, and multiple functions. Target: formatOutput function
 * that uses 2 of the 5 constants. Verify only those 2 constants + relevant imports shown.
 */

import { createHash } from 'crypto';
import { resolve, basename } from 'path';
import { readFile } from 'fs/promises';
import type { Stats } from 'fs';
import { EventEmitter } from 'events';

const OUTPUT_FORMAT = 'json';
const MAX_LINE_LENGTH = 120;
const INDENT_SIZE = 2;
const DEFAULT_ENCODING = 'utf-8';
const HASH_ALGORITHM = 'sha256';

type FormatOptions = {
	pretty: boolean;
	maxLength: number;
};

interface OutputRecord {
	content: string;
	hash: string;
	timestamp: number;
}

function computeHash(content: string): string {
	return createHash(HASH_ALGORITHM).update(content).digest('hex');
}

function getIndent(level: number): string {
	return ' '.repeat(INDENT_SIZE * level);
}

function readSource(filePath: string): Promise<string> {
	return readFile(filePath, { encoding: DEFAULT_ENCODING });
}

/** Formats a data object to a string. */
export function formatOutput(data: Record<string, unknown>): string {
	if (OUTPUT_FORMAT === 'json') {
		const text = JSON.stringify(data, null, 2);
		const lines = text.split('\n');
		return lines
			.map(line => (line.length > MAX_LINE_LENGTH ? line.substring(0, MAX_LINE_LENGTH) + '...' : line))
			.join('\n');
	}
	return String(data);
}

export function createRecord(content: string): OutputRecord {
	return {
		content,
		hash: computeHash(content),
		timestamp: Date.now(),
	};
}

export function getBaseName(filePath: string): string {
	return basename(filePath);
}

export function resolveAbsolute(relativePath: string): string {
	return resolve(relativePath);
}

export async function processFile(filePath: string): Promise<OutputRecord> {
	const content = await readSource(filePath);
	const formatted = formatOutput(JSON.parse(content) as Record<string, unknown>);
	return createRecord(formatted);
}
