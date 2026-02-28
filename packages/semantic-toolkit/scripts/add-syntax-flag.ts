import * as fs from 'fs';
import * as path from 'path';
const dir = './tests/phase1-parser/expectations';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.expected.json'));
for (const file of files) {
  const fp = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const isSyntaxErrors = file === 'syntax-errors.expected.json';
  data.stats.hasSyntaxErrors = isSyntaxErrors;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n');
  console.log(file + ' -> hasSyntaxErrors=' + isSyntaxErrors);
}
console.log('Updated ' + files.length + ' files');
