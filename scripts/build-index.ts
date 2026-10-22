// npm run build:index — validates all accelerator files and writes data/index.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, buildIndex, formatProblem, loadAccelerators } from './lib.ts';
import type { AcceleratorIndex } from '../extension/src/lib/types.ts';

const { files, problems } = loadAccelerators();
if (problems.length) {
  for (const p of problems) console.error(`✖ ${formatProblem(p)}`);
  console.error('\nFix the problems above before building the index.');
  process.exit(1);
}

const outPath = join(DATA_DIR, 'index.json');
const previous: AcceleratorIndex | undefined = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : undefined;
const index = buildIndex(files, previous);
writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`✔ Wrote data/index.json (${index.accelerators.length} accelerators).`);
