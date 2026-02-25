import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const __dirname = import.meta.dirname;
const distDir = path.join(__dirname, 'dist');
const production = process.argv.includes('--production');

// Ensure dist folder exists (non-destructive — never wipe the whole folder)
fs.mkdirSync(distDir, { recursive: true });

// Copy codicon font file for @vscode/codicons CSS (only if missing or stale)
const codiconFontSrc = path.resolve(__dirname, '..', 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf');
const codiconFontDst = path.join(distDir, 'codicon.ttf');
if (fs.existsSync(codiconFontSrc)) {
	const srcStat = fs.statSync(codiconFontSrc);
	const dstExists = fs.existsSync(codiconFontDst);
	if (!dstExists || fs.statSync(codiconFontDst).mtimeMs < srcStat.mtimeMs) {
		fs.copyFileSync(codiconFontSrc, codiconFontDst);
	}
}

// Main app bundle
const appConfig = {
	bundle: true,
	entryPoints: [path.join(__dirname, 'src', 'main.ts')],
	format: 'esm',
	metafile: true,
	minify: production,
	outdir: distDir,
	platform: 'browser',
	sourcemap: !production,
	target: 'es2022',
	loader: { '.ttf': 'file' },
	plugins: [tailwindPostcssPlugin(), monacoWorkerStubPlugin()]
};

// Monaco editor worker — bundled as a separate entry point
const editorWorkerConfig = {
	bundle: true,
	entryPoints: [resolveMonacoWorker('editor.worker')],
	format: 'iife',
	minify: production,
	outfile: path.join(distDir, 'editor.worker.js'),
	platform: 'browser',
	sourcemap: !production,
	target: 'es2022'
};

// Monaco JSON language worker — bundled as a separate entry point
const jsonWorkerConfig = {
	bundle: true,
	entryPoints: [resolveMonacoWorker('json.worker')],
	format: 'iife',
	minify: production,
	outfile: path.join(distDir, 'json.worker.js'),
	platform: 'browser',
	sourcemap: !production,
	target: 'es2022'
};

function resolveMonacoWorker(name) {
	// Try common Monaco editor worker paths
	const candidates = [
		path.resolve(__dirname, '..', 'node_modules', 'monaco-editor', 'esm', 'vs', 'editor', `${name}.js`),
		path.resolve(__dirname, 'node_modules', 'monaco-editor', 'esm', 'vs', 'editor', `${name}.js`)
	];
	if (name === 'json.worker') {
		candidates.unshift(
			path.resolve(__dirname, '..', 'node_modules', 'monaco-editor', 'esm', 'vs', 'language', 'json', `${name}.js`),
			path.resolve(__dirname, 'node_modules', 'monaco-editor', 'esm', 'vs', 'language', 'json', `${name}.js`)
		);
	}
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}
	throw new Error(`Could not resolve Monaco worker: ${name}`);
}

/**
 * Process CSS through PostCSS + Tailwind v4.
 * Intercepts .css files before esbuild resolves @import directives,
 * so Tailwind handles `@import 'tailwindcss'` and codicon imports.
 * Returns fully compiled CSS to esbuild.
 */
function tailwindPostcssPlugin() {
	const processor = postcss([tailwindcss()]);
	return {
		name: 'tailwind-postcss',
		setup(build) {
			build.onLoad({ filter: /\.css$/ }, async (args) => {
				const source = await fs.promises.readFile(args.path, 'utf8');
				const result = await processor.process(source, { from: args.path });
				return { contents: result.css, loader: 'css' };
			});
		}
	};
}

/**
 * Stub plugin that intercepts Vite-style ?worker imports and replaces
 * them with a module that creates a Worker from the pre-built worker file.
 * This bridges the gap until Phase 4 fully migrates monaco-setup.ts.
 */
function monacoWorkerStubPlugin() {
	return {
		name: 'monaco-worker-stub',
		setup(build) {
			// Match ?worker suffix imports
			build.onResolve({ filter: /\?worker$/ }, (args) => ({
				namespace: 'monaco-worker-stub',
				path: args.path
			}));

			build.onLoad({ filter: /.*/, namespace: 'monaco-worker-stub' }, (args) => {
				// Determine which worker file to reference
				let workerFile = 'editor.worker.js';
				if (args.path.includes('json.worker')) {
					workerFile = 'json.worker.js';
				}
				// Export a class that creates a Worker from the pre-built file.
				// The actual URL will be set at runtime by the WebView bridge.
				return {
					contents: `
						const WorkerConstructor = class extends Worker {
							constructor() {
								// __WORKER_BASE_URI__ is replaced at runtime with the WebView asset URI
								const baseUri = globalThis.__WORKER_BASE_URI__ || '';
								super(baseUri + '/${workerFile}');
							}
						};
						export default WorkerConstructor;
					`,
					loader: 'js'
				};
			});
		}
	};
}

async function main() {
	console.log('[inspector] building...');

	await Promise.all([
		esbuild.build(appConfig),
		esbuild.build(editorWorkerConfig),
		esbuild.build(jsonWorkerConfig)
	]);

	console.log('[inspector] build complete → inspector/dist/');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
