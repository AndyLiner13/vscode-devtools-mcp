import { execSync } from 'node:child_process';
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = import.meta.dirname;

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',
	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			for (const { location, text } of result.errors) {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}:`);
				}
			}
			console.log('[watch] build finished');
		});
	}
};

// Loader build: extension/extension.ts → dist/extension.js
// The loader starts the bridge and dynamically loads the runtime.
// The dynamic import(path.join(...)) pattern in extension.ts
// ensures esbuild leaves it as a runtime dependency.

const loaderConfig = {
	bundle: true,
	entryPoints: ['extension.ts'],
	format: 'cjs',
	minify: production,
	outfile: 'dist/extension.js',
	platform: 'node',
	sourcemap: !production,
	sourcesContent: false,
	// Packages that must load from node_modules at runtime:
	// - jsonc-parser: UMD entry has dynamic require('./impl/...') that esbuild can't resolve
	// - koffi: native FFI library with prebuilt .node binaries
	// - @lancedb/lancedb: native .node addon + apache-arrow peer dep (Phase 7 indexer)
	external: ['vscode', 'jsonc-parser', 'koffi', '@lancedb/lancedb', 'apache-arrow'],
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin]
};

// Runtime build: extension/runtime.ts → dist/runtime.js
// Contains the core GUI features (tree views, webview).
// If this fails to compile, the loader still works (Safe Mode).
const runtimeConfig = {
	bundle: true,
	entryPoints: ['services/runtime.ts'],
	format: 'cjs',
	minify: production,
	outfile: 'dist/runtime.js',
	platform: 'node',
	sourcemap: !production,
	sourcesContent: false,
	// Packages that must load from node_modules at runtime:
	// - jsonc-parser: UMD entry has dynamic require('./impl/...') that esbuild can't resolve
	// - koffi: native FFI library with prebuilt .node binaries
	// - @lancedb/lancedb: native .node addon + apache-arrow peer dep (Phase 7 indexer)
	external: ['vscode', 'jsonc-parser', 'koffi', '@lancedb/lancedb', 'apache-arrow'],
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin]
};

async function main() {
	// Clean dist folder before starting (ensures no stale files from previous builds)
	if (fs.existsSync('dist')) {
		fs.rmSync('dist', { force: true, recursive: true });
	}
	fs.mkdirSync('dist', { recursive: true });

	// Build client-controller for bundling in VSIX (production only)
	if (!watch) {
		console.log('[client-controller] Building bundled version...');
		try {
			execSync('npm run build:bundle', {
				cwd: path.join(__dirname, 'client-controller'),
				stdio: 'inherit'
			});
			console.log('[client-controller] Build complete');
		} catch (err) {
			console.error('[client-controller] Build failed:', err.message);
			process.exit(1);
		}
	}

	const loaderCtx = await esbuild.context(loaderConfig);
	const runtimeCtx = await esbuild.context(runtimeConfig);
	if (watch) {
		await loaderCtx.watch();
		await runtimeCtx.watch();
	} else {
		await loaderCtx.rebuild();
		await runtimeCtx.rebuild();
		await loaderCtx.dispose();
		await runtimeCtx.dispose();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
