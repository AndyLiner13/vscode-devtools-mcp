import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

/**
 * Post-process transpiled output to rewrite @packages/* import paths
 * to relative paths pointing to the transpiled package output.
 * Necessary because esbuild's onResolve only fires in bundle mode.
 */
function rewritePackageImports(buildDir) {
	const aliases = [
		{ alias: '@packages/log-consolidation', target: 'packages/log-consolidation/src/index.js' },
		{ alias: '@packages/semantic-toolkit', target: 'packages/semantic-toolkit/src/index.js' },
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
const semanticToolkitFiles = findTsFiles(path.join(packagesDir, 'semantic-toolkit', 'src'));
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

const semanticToolkitConfig = {
	entryPoints: semanticToolkitFiles,
	outdir: path.join('build', 'packages', 'semantic-toolkit'),
	outbase: path.join(packagesDir, 'semantic-toolkit'),
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

const packageConfigs = [logConsolidationConfig, semanticToolkitConfig, tfidfConfig];

if (watch) {
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
