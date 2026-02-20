import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const watch = process.argv.includes('--watch');

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
