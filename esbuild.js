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
			for (const { location, text } of result.errors) {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}:`);
				}
			}
			console.log('[watch] build finished');
		});
	},
};

/**
 * Resolve @packages/* path aliases to the shared packages directory.
 * @type {import('esbuild').Plugin}
 */
const packageAliasPlugin = {
	name: 'package-alias',
	setup(build) {
		build.onResolve({ filter: /^@packages\/log-consolidation$/ }, () => ({
			path: path.resolve(__dirname, 'packages/log-consolidation/src/index.ts'),
		}));
	},
};

// Loader build: extension/extension.ts → dist/extension.js
// The loader starts the bridge and dynamically loads the runtime.
// It must NOT statically bundle runtime.js — the dynamic require(path.join(...))
// pattern ensures esbuild leaves it as a runtime dependency.


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
	// - ts-morph: large dependency tree with dynamic requires (typescript compiler)
	// - koffi: native FFI library with prebuilt .node binaries
	external: ['vscode', 'jsonc-parser', 'ts-morph', 'koffi'],
	logLevel: 'silent',
	plugins: [packageAliasPlugin, esbuildProblemMatcherPlugin],
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
	// - ts-morph: large dependency tree with dynamic requires (typescript compiler)
	// - koffi: native FFI library with prebuilt .node binaries
	external: ['vscode', 'jsonc-parser', 'ts-morph', 'koffi'],
	logLevel: 'silent',
	plugins: [packageAliasPlugin, esbuildProblemMatcherPlugin],
};

// Worker build: extension/codebase-worker.ts → dist/codebase-worker.js
// Runs ts-morph and all codebase analysis on a background thread.
// Does NOT depend on the VS Code API — pure Node.js.
const workerConfig = {
	bundle: true,
	entryPoints: ['services/codebase/codebase-worker.ts'],
	external: ['jsonc-parser', 'ts-morph'],
	format: 'cjs',
	logLevel: 'silent',
	minify: production,
	outfile: 'dist/codebase-worker.js',
	platform: 'node',
	plugins: [packageAliasPlugin, esbuildProblemMatcherPlugin],
	sourcemap: !production,
	sourcesContent: false,
};

async function main() {
	// Clean dist folder before starting (ensures no stale files from previous builds)
	if (fs.existsSync('dist')) {
		fs.rmSync('dist', { force: true, recursive: true });
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
