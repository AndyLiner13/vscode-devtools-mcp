import { parseFile } from '../../packages/semantic-toolkit/src/parser/index.js';
import { chunkFile } from '../../packages/semantic-toolkit/src/chunker/index.js';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve('client-workspace/ast-parser-test.ts');
const workspaceRoot = path.resolve('.');
const parsed = parseFile(filePath, workspaceRoot);
const content = fs.readFileSync(filePath, 'utf-8');
const chunked = chunkFile(parsed, content);

// Find all chunks named 'Timestamped'
console.log('=== Timestamped chunks ===');
const matches = chunked.chunks.filter(c => c.name === 'Timestamped');
for (const m of matches) {
  console.log(JSON.stringify({ name: m.name, nodeKind: m.nodeKind, startLine: m.startLine, parentName: m.parentName }));
}

// Find all chunks named 'Circle'
console.log('\n=== Circle chunks ===');
const circleMatches = chunked.chunks.filter(c => c.name === 'Circle');
for (const m of circleMatches) {
  console.log(JSON.stringify({ name: m.name, nodeKind: m.nodeKind, startLine: m.startLine, parentName: m.parentName }));
}
