/**
 * Migration script: Replace console.log/warn/error with centralized logger.
 *
 * Targets:
 *   - services/*.ts, extension.ts → import { log, warn, error } from './logger'
 *   - inspector/src/*.ts → remove console.log duplicates, replace .catch(console.error)
 *   - Skips: mcp-server/**, node_modules/**, build/**, *.md, *.json
 *
 * Also handles:
 *   - hostLog?.(...) → log(...)
 *   - hostLog = log ?? null → (removed, already done)
 *   - console.log('[host] ...') → log('[host] ...')
 *   - console.error('[host] ...') → error('[host] ...')
 *   - .catch(console.error) → .catch(() => [no-op])
 *
 * Run: node scripts/migrate-console-to-logger.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ── File Discovery ──

function walkDir(dir, results = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			// Skip dirs we don't want
			if (['node_modules', 'build', 'dist', '.git', 'archive', 'resources', 'client-workspace', 'packages'].includes(entry)) continue;
			// Skip mcp-server entirely — it has its own logging via process.stderr
			if (entry === 'mcp-server') continue;
			walkDir(full, results);
		} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
			results.push(full);
		}
	}
	return results;
}

// ── Replacement Logic ──

const LOGGER_MODULE = 'services/logger';

function getRelativeImportPath(filePath) {
	const fileDir = dirname(filePath);
	const loggerPath = join(ROOT, LOGGER_MODULE);
	let rel = relative(fileDir, loggerPath).replace(/\\/g, '/');
	if (!rel.startsWith('.')) rel = './' + rel;
	return rel;
}

function isInsideInspectorSrc(filePath) {
	const rel = relative(ROOT, filePath).replace(/\\/g, '/');
	return rel.startsWith('inspector/src') || rel.startsWith('inspector\\src');
}

function processFile(filePath) {
	const rel = relative(ROOT, filePath).replace(/\\/g, '/');
	let content = readFileSync(filePath, 'utf8');
	const original = content;

	// Skip files that are the logger itself
	if (rel === 'services/logger.ts') return null;

	// ── Inspector frontend files ──
	if (isInsideInspectorSrc(filePath)) {
		return processInspectorFile(filePath, content, original);
	}

	// ── Extension-side files ──
	return processExtensionFile(filePath, content, original);
}

function processInspectorFile(filePath, content, original) {
	// In json-interactivity.ts, remove the console.log line inside the log() function
	// since it already sends via RPC
	content = content.replace(
		/(\n\s*)console\.log\(`\[json-interactivity\] \$\{message\}`\);\n/,
		'\n'
	);

	// Replace .catch(console.error) with .catch(() => { /* error sent via RPC */ })
	content = content.replace(
		/\.catch\(console\.error\)/g,
		'.catch(() => { /* error sent via RPC */ })'
	);

	// Replace standalone console.error('...') in catch blocks with log-via-RPC
	// In main.ts: console.error('Failed to connect...') → use the existing log function
	content = content.replace(
		/console\.error\(([^)]+)\)/g,
		(match, args) => {
			// Check if there's a local log function available
			if (content.includes('function log(')) {
				return `log(${args})`;
			}
			// Otherwise just remove the console.error — these are in the webview
			// and can't reach VS Code APIs directly
			return `void(${args})`;
		}
	);

	if (content === original) return null;
	return content;
}

function processExtensionFile(filePath, content, original) {
	const rel = relative(ROOT, filePath).replace(/\\/g, '/');
	let needsLog = false;
	let needsWarn = false;
	let needsError = false;
	let needsInspectorLog = false;

	// Determine if this file is inspector-backend.ts (needs inspectorLog)
	const isInspectorBackend = rel === 'services/inspector-backend.ts';

	// ── Replace hostLog?.(...) with log(...) ──
	content = content.replace(/hostLog\?\.\(([^)]*)\)/g, (match, args) => {
		needsLog = true;
		return `log(${args})`;
	});

	// ── Replace console.log(...) with log(...) ──
	content = content.replace(/console\.log\(([^)]*(?:\([^)]*\))*[^)]*)\)/g, (match, args) => {
		needsLog = true;
		return `log(${args})`;
	});

	// ── Replace console.warn(...) with warn(...) ──
	content = content.replace(/console\.warn\(([^)]*(?:\([^)]*\))*[^)]*)\)/g, (match, args) => {
		needsWarn = true;
		return `warn(${args})`;
	});

	// ── Replace console.error(...) with error(...) ──
	content = content.replace(/console\.error\(([^)]*(?:\([^)]*\))*[^)]*)\)/g, (match, args) => {
		needsError = true;
		return `error(${args})`;
	});

	if (content === original) return null;

	// ── Add import if needed ──
	const importPath = getRelativeImportPath(filePath);
	const neededFns = [];
	if (needsError) neededFns.push('error');
	if (needsInspectorLog) neededFns.push('inspectorLog');
	if (needsLog) neededFns.push('log');
	if (needsWarn) neededFns.push('warn');

	if (neededFns.length > 0) {
		// Check if import already exists
		const importRegex = /import\s*\{[^}]*\}\s*from\s*['"]\.\/logger['"]/;
		const importRegex2 = /import\s*\{[^}]*\}\s*from\s*['"]\.\.\/logger['"]/;
		const importRegex3 = /import\s*\{[^}]*\}\s*from\s*['"]\.\/services\/logger['"]/;
		
		if (importRegex.test(content) || importRegex2.test(content) || importRegex3.test(content)) {
			// Import exists — update it to include all needed functions
			content = content.replace(
				/import\s*\{([^}]*)\}\s*from\s*(['"](?:\.\/|\.\.\/)?(?:services\/)?logger['"])/,
				(match, fns, path) => {
					const existing = fns.split(',').map(f => f.trim()).filter(Boolean);
					const merged = [...new Set([...existing, ...neededFns])].sort();
					return `import { ${merged.join(', ')} } from ${path}`;
				}
			);
		} else {
			// Need to add import — find the right place (after last import)
			const importStatement = `import { ${neededFns.join(', ')} } from '${importPath}';\n`;
			
			// Insert after the last import statement
			const lastImportMatch = content.match(/^import\s.+$/gm);
			if (lastImportMatch) {
				const lastImport = lastImportMatch[lastImportMatch.length - 1];
				const lastImportIdx = content.lastIndexOf(lastImport);
				const insertIdx = lastImportIdx + lastImport.length;
				content = content.slice(0, insertIdx) + '\n' + importStatement + content.slice(insertIdx);
			} else {
				// No imports — add at top
				content = importStatement + content;
			}
		}
	}

	return content;
}

// ── Main ──

const files = walkDir(ROOT);
let changedCount = 0;
let skippedCount = 0;

for (const filePath of files) {
	const rel = relative(ROOT, filePath).replace(/\\/g, '/');
	const result = processFile(filePath);
	
	if (result === null) {
		skippedCount++;
		continue;
	}

	changedCount++;
	if (DRY_RUN) {
		console.log(`[DRY RUN] Would modify: ${rel}`);
	} else {
		writeFileSync(filePath, result, 'utf8');
		console.log(`[MODIFIED] ${rel}`);
	}
}

console.log(`\nDone. ${changedCount} files modified, ${skippedCount} files unchanged.`);
if (DRY_RUN) {
	console.log('(Dry run — no files were actually changed)');
}
