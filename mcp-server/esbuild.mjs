import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

/**
 * Resolve @packages/* path aliases to the shared packages directory.
 * @type {import('esbuild').Plugin}
 */
const packageAliasPlugin = {
  name: 'package-alias',
  setup(build) {
    build.onResolve({ filter: /^@packages\/log-consolidation$/ }, () => ({
      path: path.resolve(__dirname, '..', 'packages/log-consolidation/src/index.ts'),
    }));
  },
};

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

const config = {
  entryPoints: findTsFiles('src'),
  outdir: 'build',
  outbase: '.',
  format: 'esm',
  platform: 'node',
  target: 'es2023',
  sourcemap: true,
  plugins: [packageAliasPlugin],
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[esbuild] watching for changes…');
} else {
  const result = await esbuild.build(config);
  console.log(
    `[esbuild] transpiled ${config.entryPoints.length} files → build/src/`,
  );
}
