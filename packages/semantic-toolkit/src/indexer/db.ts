/**
 * Phase 7 — LanceDB integration.
 *
 * Opens/creates a LanceDB database at `<workspaceRoot>/.devtools/storage/`
 * and manages two tables: `file_metadata` (per-file) + `code_chunks` (per-chunk).
 *
 * LanceDB uses DataFusion SQL which lowercases unquoted identifiers and
 * silently returns 0 rows for double-quoted camelCase names.
 * All DB column names MUST be snake_case. We map TS camelCase ↔ DB snake_case.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { connect, type Connection, type Table } from '@lancedb/lancedb';
import { Schema, Field, Utf8, Float64, Int32, Bool } from 'apache-arrow';
import type { FileMetadata, IndexedChunk } from './types.js';

const DB_DIR = '.devtools/storage';
const FILE_METADATA_TABLE = 'file_metadata';
const CODE_CHUNKS_TABLE = 'code_chunks';
const MAX_QUERY_LIMIT = 1_000_000;

// ── DB row types (snake_case columns) ──────────────────────────

interface DbFileMetadataRow {
	file_path: string;
	content_hash: string;
	last_modified: number;
}

interface DbChunkRow {
	file_path: string;
	symbol_path: string;
	start_line: number;
	end_line: number;
	chunk_content: string;
	stale: boolean;
}

// ── Mapping helpers ────────────────────────────────────────────

function toDbMetadataRow(meta: FileMetadata): DbFileMetadataRow {
	return {
		file_path: meta.filePath,
		content_hash: meta.contentHash,
		last_modified: meta.lastModified,
	};
}

function fromDbMetadataRow(row: DbFileMetadataRow): FileMetadata {
	return {
		filePath: row.file_path,
		contentHash: row.content_hash,
		lastModified: row.last_modified,
	};
}

function toDbChunkRow(chunk: IndexedChunk): DbChunkRow {
	return {
		file_path: chunk.filePath,
		symbol_path: chunk.symbolPath,
		start_line: chunk.startLine,
		end_line: chunk.endLine,
		chunk_content: chunk.chunkContent,
		stale: chunk.stale,
	};
}

function fromDbChunkRow(row: DbChunkRow): IndexedChunk {
	return {
		filePath: row.file_path,
		symbolPath: row.symbol_path,
		startLine: row.start_line,
		endLine: row.end_line,
		chunkContent: row.chunk_content,
		stale: row.stale,
	};
}

/** Handles to the opened LanceDB connection and tables. */
export interface DbHandle {
	connection: Connection;
	fileMetadataTable: Table;
	codeChunksTable: Table;
}

/**
 * Open (or create) the LanceDB database and both tables.
 * Table creation is idempotent — safe to call on every sync.
 */
export async function openDatabase(workspaceRoot: string): Promise<DbHandle> {
	const dbPath = path.join(workspaceRoot, DB_DIR);
	fs.mkdirSync(dbPath, { recursive: true });

	const connection = await connect(dbPath);
	const existingTables = await connection.tableNames();

	let fileMetadataTable: Table;
	if (existingTables.includes(FILE_METADATA_TABLE)) {
		fileMetadataTable = await connection.openTable(FILE_METADATA_TABLE);
	} else {
		fileMetadataTable = await connection.createEmptyTable(FILE_METADATA_TABLE, new Schema([
			new Field('file_path', new Utf8()),
			new Field('content_hash', new Utf8()),
			new Field('last_modified', new Float64()),
		]));
	}

	let codeChunksTable: Table;
	if (existingTables.includes(CODE_CHUNKS_TABLE)) {
		codeChunksTable = await connection.openTable(CODE_CHUNKS_TABLE);
	} else {
		codeChunksTable = await connection.createEmptyTable(CODE_CHUNKS_TABLE, new Schema([
			new Field('file_path', new Utf8()),
			new Field('symbol_path', new Utf8()),
			new Field('start_line', new Int32()),
			new Field('end_line', new Int32()),
			new Field('chunk_content', new Utf8()),
			new Field('stale', new Bool()),
		]));
	}

	return { connection, fileMetadataTable, codeChunksTable };
}

// ── Internal query helper ──────────────────────────────────

/** Collect all Arrow batches from a query into plain objects. */
async function collectRows<T>(query: ReturnType<Table['query']>): Promise<T[]> {
	const rows: T[] = [];
	for await (const batch of query) {
		const arr = batch.toArray();
		for (const row of arr) {
			rows.push(row as T);
		}
	}
	return rows;
}

// ── file_metadata helpers ──────────────────────────────────

/** Get metadata for a single file. Returns null if not found. */
export async function getFileMetadata(
	db: DbHandle,
	filePath: string,
): Promise<FileMetadata | null> {
	const escaped = filePath.replaceAll("'", "''");
	const rows = await collectRows<DbFileMetadataRow>(
		db.fileMetadataTable.query().where(`file_path = '${escaped}'`).limit(1),
	);
	return rows[0] ? fromDbMetadataRow(rows[0]) : null;
}

/** Get metadata for all indexed files. */
export async function getAllFileMetadata(db: DbHandle): Promise<FileMetadata[]> {
	const rows = await collectRows<DbFileMetadataRow>(
		db.fileMetadataTable.query().limit(MAX_QUERY_LIMIT),
	);
	return rows.map(fromDbMetadataRow);
}

/** Insert or update file metadata (delete + insert). */
export async function upsertFileMetadata(
	db: DbHandle,
	meta: FileMetadata,
): Promise<void> {
	const escaped = meta.filePath.replaceAll("'", "''");
	await db.fileMetadataTable.delete(`file_path = '${escaped}'`);
	await db.fileMetadataTable.add([toDbMetadataRow(meta)]);
}

/** Delete file metadata by filePath. */
export async function deleteFileMetadata(
	db: DbHandle,
	filePath: string,
): Promise<void> {
	const escaped = filePath.replaceAll("'", "''");
	await db.fileMetadataTable.delete(`file_path = '${escaped}'`);
}

// ── code_chunks helpers ────────────────────────────────────

/** Get all chunks for a specific file. */
export async function getChunksByFile(
	db: DbHandle,
	filePath: string,
): Promise<IndexedChunk[]> {
	const escaped = filePath.replaceAll("'", "''");
	const rows = await collectRows<DbChunkRow>(
		db.codeChunksTable.query().where(`file_path = '${escaped}'`).limit(MAX_QUERY_LIMIT),
	);
	return rows.map(fromDbChunkRow);
}

/** Delete all chunks for a specific file. */
export async function deleteChunksByFile(
	db: DbHandle,
	filePath: string,
): Promise<void> {
	const escaped = filePath.replaceAll("'", "''");
	await db.codeChunksTable.delete(`file_path = '${escaped}'`);
}

/** Insert new chunks (or replace existing by delete + insert). */
export async function upsertChunks(
	db: DbHandle,
	chunks: IndexedChunk[],
): Promise<void> {
	if (chunks.length === 0) return;
	await db.codeChunksTable.add(chunks.map(toDbChunkRow));
}

/** Delete specific chunks by filePath + symbolPath. */
export async function deleteChunks(
	db: DbHandle,
	filePath: string,
	symbolPaths: string[],
): Promise<void> {
	const escapedFile = filePath.replaceAll("'", "''");
	for (const sp of symbolPaths) {
		const escapedSp = sp.replaceAll("'", "''");
		await db.codeChunksTable.delete(
			`file_path = '${escapedFile}' AND symbol_path = '${escapedSp}'`,
		);
	}
}

/**
 * Update only position fields (start_line, end_line) for chunks that shifted
 * but whose content didn't change. Preserves stale flag (keeps existing vector).
 */
export async function updateChunkPositions(
	db: DbHandle,
	filePath: string,
	updates: Array<{ symbolPath: string; startLine: number; endLine: number }>,
): Promise<void> {
	const escapedFile = filePath.replaceAll("'", "''");
	for (const { symbolPath, startLine, endLine } of updates) {
		const escapedSp = symbolPath.replaceAll("'", "''");
		await db.codeChunksTable.update({
			where: `file_path = '${escapedFile}' AND symbol_path = '${escapedSp}'`,
			values: { start_line: startLine, end_line: endLine },
		});
	}
}

// ── Query helpers (used by lookup module) ──────────────────────

/** Get all indexed chunks for files whose path contains the given substring. */
export async function queryChunksByFileSubstring(
	db: DbHandle,
	substring: string,
): Promise<IndexedChunk[]> {
	const escaped = substring.replaceAll("'", "''");
	const rows = await collectRows<DbChunkRow>(
		db.codeChunksTable.query().where(`file_path LIKE '%${escaped}%'`).limit(MAX_QUERY_LIMIT),
	);
	return rows.map(fromDbChunkRow);
}

/** Get all indexed chunks in the entire database. */
export async function queryAllChunks(
	db: DbHandle,
): Promise<IndexedChunk[]> {
	const rows = await collectRows<DbChunkRow>(
		db.codeChunksTable.query().limit(MAX_QUERY_LIMIT),
	);
	return rows.map(fromDbChunkRow);
}

/** Close the database connection. Caller is responsible for calling this. */
export function closeDatabase(db: DbHandle): void {
	db.connection.close();
}
