/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the vscode-devtools-mcp directory from this script's location so
// `npm run build` works regardless of the caller's process.cwd().
const scriptDir = dirname(fileURLToPath(import.meta.url));
const serverDir = dirname(scriptDir);

// Check for bundled version first (VSIX distribution), then dev version
const bundledEntry = new URL('../build/index.js', import.meta.url);
const devEntry = new URL('../build/src/index.js', import.meta.url);

let entryUrl;
if (existsSync(bundledEntry)) {
	// Bundled version from VSIX — all dependencies included
	entryUrl = bundledEntry;
} else if (existsSync(devEntry)) {
	// Dev version — transpiled but not bundled
	entryUrl = devEntry;
} else {
	// Build in dev mode if nothing exists
	execSync('npm run build', { cwd: serverDir, stdio: 'inherit' });
	entryUrl = devEntry;
}

await import(entryUrl.toString());
