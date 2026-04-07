import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');
const bundle = process.argv.includes('--bundle');

/**
 * Post-process transpiled output to rewrite @packages/* import paths
 * to relative paths pointing to the transpiled package output.
 * Necessary because esbuild's onResolve only fires in bundle mode.
 */
function rewritePackageImports(buildDir) {
	const aliases = [
		{ alias: '@packages/log-consolidation', target: 'packages/log-consolidation/src/index.js' },
		{ alias: '@packages/tfidf', target: 'packages/tfidf/src/index.js' },
	];

	function processDir(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				processDir(fullPath);
			} else if (entry.name.endsWith('.js')) {
				let content = fs.readFileSync(fullPath, 'utf-8');
				let changed = false;
				for (const { alias, target } of aliases) {
					if (!content.includes(alias)) continue;
					const targetAbs = path.join(buildDir, target);
					let rel = path.relative(path.dirname(fullPath), targetAbs).replace(/\\/g, '/');
					if (!rel.startsWith('.')) rel = './' + rel;
					content = content.replaceAll(`"${alias}"`, `"${rel}"`);
					changed = true;
				}
				if (changed) fs.writeFileSync(fullPath, content);
			}
		}
	}

	processDir(path.join(buildDir, 'src'));
}

const packagesDir = path.resolve(__dirname, '..', 'packages');

function findTsFiles(dir) {
	const result = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			result.push(...findTsFiles(fullPath));
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
			result.push(fullPath);
		}
	}
	return result;
}

// Transpile the shared package files into build/packages/
const logConsolidationFiles = findTsFiles(path.join(packagesDir, 'log-consolidation', 'src'));
const tfidfFiles = findTsFiles(path.join(packagesDir, 'tfidf', 'src'));

const config = {
	entryPoints: findTsFiles('src'),
	outdir: 'build',
	outbase: '.',
	format: 'esm',
	platform: 'node',
	target: 'es2023',
	sourcemap: true
};

// Separate configs for each shared package (different outbase)
const logConsolidationConfig = {
	entryPoints: logConsolidationFiles,
	outdir: path.join('build', 'packages', 'log-consolidation'),
	outbase: path.join(packagesDir, 'log-consolidation'),
	format: 'esm',
	platform: 'node',
	target: 'es2023',
	sourcemap: true
};

const tfidfConfig = {
	entryPoints: tfidfFiles,
	outdir: path.join('build', 'packages', 'tfidf'),
	outbase: path.join(packagesDir, 'tfidf'),
	format: 'esm',
	platform: 'node',
	target: 'es2023',
	sourcemap: true
};

const packageConfigs = [logConsolidationConfig, tfidfConfig];

// Node.js built-in modules (both prefixed and unprefixed for compatibility)
const nodeBuiltins = [
	'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants',
	'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https',
	'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
	'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
	'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib'
];
const externals = [
	...nodeBuiltins,
	...nodeBuiltins.map(m => `node:${m}`)
];

// Bundle mode: create a single self-contained file for VSIX distribution
if (bundle) {
	const packagesDir = path.resolve(__dirname, '..', 'packages');
	
	// Clean build directory to ensure fresh bundle
	const buildDir = path.join(__dirname, 'build');
	if (fs.existsSync(buildDir)) {
		fs.rmSync(buildDir, { recursive: true, force: true });
	}
	fs.mkdirSync(buildDir, { recursive: true });
	
	// Clean build directory to ensure fresh bundle
	if (fs.existsSync('build')) {
		fs.rmSync('build', { force: true, recursive: true });
	}
	fs.mkdirSync('build', { recursive: true });
	
	await esbuild.build({
		entryPoints: ['src/main.ts'],
		outfile: 'build/index.js',
		bundle: true,
		format: 'esm',
		platform: 'node',
		target: 'es2023',
		sourcemap: true,
		// Don't bundle Node.js built-ins (both prefixed and unprefixed)
		external: externals,
		// Resolve @packages/* aliases
		alias: {
			'@packages/log-consolidation': path.join(packagesDir, 'log-consolidation', 'src', 'index.ts'),
			'@packages/tfidf': path.join(packagesDir, 'tfidf', 'src', 'index.ts'),
		},
		// Provide a real require() for CJS dependencies (e.g. debug)
		// that use require() for Node.js built-ins like tty, fs, etc.
		banner: {
			js: [
				'#!/usr/bin/env node',
				'import { createRequire as __bundleCreateRequire } from "node:module";',
				'const require = __bundleCreateRequire(import.meta.url);',
			].join('\n')
		}
	});
	console.log('[esbuild] bundled client-controller → build/index.js');
} else if (watch) {
	// Build once initially (with packages + rewrite), then watch src only
	await Promise.all([esbuild.build(config), ...packageConfigs.map((c) => esbuild.build(c))]);
	rewritePackageImports(path.resolve(__dirname, 'build'));
	console.log('[esbuild] initial build complete, rewriting package imports…');

	const ctx = await esbuild.context({
		...config,
		plugins: [
			{
				name: 'package-rewrite-on-rebuild',
				setup(build) {
					build.onEnd(() => {
						rewritePackageImports(path.resolve(__dirname, 'build'));
					});
				}
			}
		]
	});
	const pkgContexts = await Promise.all(packageConfigs.map((c) => esbuild.context(c)));
	await Promise.all([ctx.watch(), ...pkgContexts.map((c) => c.watch())]);
	console.log('[esbuild] watching for changes…');
} else {
	await Promise.all([esbuild.build(config), ...packageConfigs.map((c) => esbuild.build(c))]);
	rewritePackageImports(path.resolve(__dirname, 'build'));
	const pkgCount = packageConfigs.reduce((sum, c) => sum + c.entryPoints.length, 0);
	console.log(`[esbuild] transpiled ${config.entryPoints.length} + ${pkgCount} files → build/`);
}
