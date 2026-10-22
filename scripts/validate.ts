// npm run validate — schema-checks every accelerator file. Used by CI on pull requests.
import { loadAccelerators, formatProblem } from './lib.ts';

const { files, problems } = loadAccelerators();
const inCI = process.env.GITHUB_ACTIONS === 'true';

if (problems.length) {
  for (const p of problems) {
    console.error(`✖ ${formatProblem(p)}`);
    if (inCI) console.log(`::error file=${p.file}${p.line ? `,line=${p.line}` : ''}::${p.field ? `${p.field}: ` : ''}${p.message}`);
  }
  const fileCount = new Set(problems.map((p) => p.file)).size;
  console.error(`\n${problems.length} problem(s) in ${fileCount} file(s).`);
  process.exit(1);
}
console.log(`✔ ${files.length} accelerator file(s) are valid.`);
