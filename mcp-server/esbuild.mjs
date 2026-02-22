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
  const pkgAlias = '@packages/log-consolidation';
  const pkgTarget = 'packages/log-consolidation/src/index.js';

  function processDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        processDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (!content.includes(pkgAlias)) continue;
        const targetAbs = path.join(buildDir, pkgTarget);
        let rel = path.relative(path.dirname(fullPath), targetAbs).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        fs.writeFileSync(fullPath, content.replaceAll(`"${pkgAlias}"`, `"${rel}"`));
      }
    }
  }

  processDir(path.join(buildDir, 'src'));
}

const packagesDir = path.resolve(__dirname, '..', 'packages');

function findTsFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
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
const packageFiles = findTsFiles(path.join(packagesDir, 'log-consolidation', 'src'));

const config = {
  entryPoints: findTsFiles('src'),
  outdir: 'build',
  outbase: '.',
  format: 'esm',
  platform: 'node',
  target: 'es2023',
  sourcemap: true,
};

// Separate config for the shared package (different outbase)
const packageConfig = {
  entryPoints: packageFiles,
  outdir: path.join('build', 'packages', 'log-consolidation'),
  outbase: path.join(packagesDir, 'log-consolidation'),
  format: 'esm',
  platform: 'node',
  target: 'es2023',
  sourcemap: true,
};

if (watch) {
  // Build once initially (with package + rewrite), then watch src only
  await Promise.all([
    esbuild.build(config),
    esbuild.build(packageConfig),
  ]);
  rewritePackageImports(path.resolve(__dirname, 'build'));
  console.log('[esbuild] initial build complete, rewriting package imports…');

  const ctx = await esbuild.context({
    ...config,
    plugins: [{
      name: 'package-rewrite-on-rebuild',
      setup(build) {
        build.onEnd(() => {
          rewritePackageImports(path.resolve(__dirname, 'build'));
        });
      },
    }],
  });
  const pkgCtx = await esbuild.context(packageConfig);
  await Promise.all([ctx.watch(), pkgCtx.watch()]);
  console.log('[esbuild] watching for changes…');
} else {
  await Promise.all([
    esbuild.build(config),
    esbuild.build(packageConfig),
  ]);
  rewritePackageImports(path.resolve(__dirname, 'build'));
  console.log(
    `[esbuild] transpiled ${config.entryPoints.length} + ${packageConfig.entryPoints.length} files → build/`,
  );
}
