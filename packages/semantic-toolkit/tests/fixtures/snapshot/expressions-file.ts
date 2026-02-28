/**
 * Test fixture: snapshot/expressions-file.ts
 *
 * File containing root-level expressions, IIFEs, and assignments.
 * Target: a root-level expression (initializeApp). Verify just that
 * expression + its imports shown.
 */

import { createServer, Server } from 'http';
import { connectDatabase, Database } from './database';
import { loadConfig, AppConfig } from './config';
import { Logger } from './logger';

const PORT = 3000;
const HOST = '0.0.0.0';
const DB_URL = 'mongodb://localhost:27017';
const APP_NAME = 'test-app';

let server: Server;
let db: Database;
let config: AppConfig;

/** TARGET: initializeApp — uses createServer, connectDatabase, loadConfig, PORT */
export async function initializeApp(): Promise<void> {
	config = loadConfig();
	db = await connectDatabase(DB_URL);
	server = createServer((req, res) => {
		res.writeHead(200);
		res.end('OK');
	});
	server.listen(PORT);
}

export async function shutdownApp(): Promise<void> {
	server?.close();
	await db?.close();
}

export function getAppName(): string {
	return APP_NAME;
}

export function getHost(): string {
	return HOST;
}
