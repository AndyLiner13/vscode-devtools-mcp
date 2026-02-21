const esbuild = require("esbuild");
const fs = require('node:fs');
const path = require('node:path');

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
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}:`);
				}
			});
			console.log('[watch] build finished');
		});
	},
};

// Loader build: extension/extension.ts → dist/extension.js
// The loader starts the bridge and dynamically loads the runtime.
// It must NOT statically bundle runtime.js — the dynamic require(path.join(...))
// pattern ensures esbuild leaves it as a runtime dependency.


const loaderConfig = {
	entryPoints: ['extension.ts'],
	bundle: true,
	format: 'cjs',
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	platform: 'node',
	outfile: 'dist/extension.js',
	// Packages that must load from node_modules at runtime:
	// - jsonc-parser: UMD entry has dynamic require('./impl/...') that esbuild can't resolve
	// - ts-morph: large dependency tree with dynamic requires (typescript compiler)
	external: ['vscode', 'jsonc-parser', 'ts-morph'],
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin],
};

// Runtime build: extension/runtime.ts → dist/runtime.js
// Contains the core GUI features (tree views, webview).
// If this fails to compile, the loader still works (Safe Mode).
const runtimeConfig = {
	entryPoints: ['services/runtime.ts'],
	bundle: true,
	format: 'cjs',
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	platform: 'node',
	outfile: 'dist/runtime.js',
	// Packages that must load from node_modules at runtime:
	// - jsonc-parser: UMD entry has dynamic require('./impl/...') that esbuild can't resolve
	// - ts-morph: large dependency tree with dynamic requires (typescript compiler)
	external: ['vscode', 'jsonc-parser', 'ts-morph'],
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin],
};

// Worker build: extension/codebase-worker.ts → dist/codebase-worker.js
// Runs ts-morph and all codebase analysis on a background thread.
// Does NOT depend on the VS Code API — pure Node.js.
const workerConfig = {
	entryPoints: ['services/codebase/codebase-worker.ts'],
	bundle: true,
	format: 'cjs',
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	platform: 'node',
	outfile: 'dist/codebase-worker.js',
	external: ['jsonc-parser', 'ts-morph'],
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin],
};

async function main() {
	// Clean dist folder before starting (ensures no stale files from previous builds)
	if (fs.existsSync('dist')) {
		fs.rmSync('dist', { recursive: true, force: true });
	}
	fs.mkdirSync('dist', { recursive: true });

	const loaderCtx = await esbuild.context(loaderConfig);
	const runtimeCtx = await esbuild.context(runtimeConfig);
	const workerCtx = await esbuild.context(workerConfig);
	if (watch) {
		await loaderCtx.watch();
		await runtimeCtx.watch();
		await workerCtx.watch();
	} else {
		await loaderCtx.rebuild();
		await runtimeCtx.rebuild();
		await workerCtx.rebuild();
		await loaderCtx.dispose();
		await runtimeCtx.dispose();
		await workerCtx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
