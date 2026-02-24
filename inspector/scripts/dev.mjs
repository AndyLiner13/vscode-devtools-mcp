#!/usr/bin/env node

/**
 * Dev script that finds a random available port and starts Vite on it.
 * Uses get-port which automatically avoids ports in use and Windows reserved ranges.
 * Outputs INSPECTOR_PORT=<port> to stdout so the VS Code extension can parse it.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import getPort from 'get-port';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inspectorDir = dirname(__dirname);

async function main() {
	// Get any random available port - get-port handles all the safety checks
	const port = await getPort();

	// Output parseable port line for the VS Code extension to capture
	console.log(`INSPECTOR_PORT=${port}`);
	console.log(`Starting Vite on port ${port}...`);

	// Run vite from the inspector's local node_modules to avoid hoisting issues
	// Use shell: true on Windows so it can execute .cmd files
	const command = `npx vite --port ${port}`;
	const vite = spawn(command, [], {
		cwd: inspectorDir,
		stdio: 'inherit',
		shell: true
	});

	vite.on('error', (err) => {
		console.error('Failed to start Vite:', err);
		process.exit(1);
	});

	vite.on('close', (code) => {
		process.exit(code ?? 0);
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
