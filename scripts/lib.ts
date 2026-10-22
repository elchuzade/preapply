// Loading, validation and index building for data/accelerators/**.yaml.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import Ajv, { type ErrorObject } from 'ajv';
import type { Accelerator, AcceleratorIndex, IndexEntry } from '../extension/src/lib/types.ts';

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

export interface Problem {
  /** Path relative to the repo root, e.g. data/accelerators/global/x.yaml */
  file: string;
  /** Dotted field path, e.g. steps[1].questions[0].type. Empty for whole-file problems. */
  field: string;
  message: string;
  line?: number;
}

export interface LoadedFile {
  /** Path relative to data/, posix separators: accelerators/global/x.yaml */
  path: string;
  data: Accelerator;
}

export function formatProblem(p: Problem): string {
  const where = p.line ? `${p.file}:${p.line}` : p.file;
  return p.field ? `${where}: ${p.field} — ${p.message}` : `${where}: ${p.message}`;
}

let validator: ReturnType<Ajv['compile']> | undefined;
function getValidator(dataDir: string) {
  if (!validator) {
    const schema = JSON.parse(readFileSync(join(dataDir, 'schema.json'), 'utf8'));
    validator = new Ajv({ allErrors: true, strict: false }).compile(schema);
  }
  return validator;
}

/** "/steps/1/questions/0/type" → "steps[1].questions[0].type" */
export function toFieldPath(pointer: string): string {
  return pointer
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((acc, seg) => (/^\d+$/.test(seg) ? `${acc}[${seg}]` : acc ? `${acc}.${seg}` : seg), '');
}

function describeAjvError(e: ErrorObject): { field: string; message: string } | null {
  const field = toFieldPath(e.instancePath);
  const join_ = (f: string, k: string) => (f ? `${f}.${k}` : k);
  switch (e.keyword) {
    case 'required':
      return { field: join_(field, e.params.missingProperty), message: 'missing required field' };
    case 'additionalProperties':
      return { field: join_(field, e.params.additionalProperty), message: 'unknown field (check spelling)' };
    case 'enum':
      return { field, message: `must be one of: ${(e.params.allowedValues as string[]).join(', ')}` };
    case 'pattern':
      if (e.params.pattern.includes('\\d{4}')) return { field, message: 'must be an ISO date (YYYY-MM-DD)' };
      if (field.endsWith('id')) return { field, message: 'must be a kebab-case slug, e.g. my-accelerator' };
      if (field === 'country') return { field, message: "must be 'global' or a lowercase 2-letter country code" };
      if (field.startsWith('match.domains')) return { field, message: 'must be a bare domain like example.com (no https://, no path)' };
      return { field, message: 'must start with http:// or https://' };
    case 'type':
      if (field === 'last_verified') return { field, message: 'must be an ISO date (YYYY-MM-DD)' };
      return { field, message: `must be ${e.params.type}` };
    case 'minItems':
      if (field === 'steps') return { field, message: 'needs at least one step — accelerators without questions are not accepted' };
      if (field.endsWith('.questions')) return { field, message: 'needs at least one question' };
      return { field, message: `needs at least ${e.params.limit} item(s)` };
    case 'dependencies':
      return { field: join_(field, 'limit_unit'), message: 'limit_unit is set but limit is missing' };
    default:
      return { field, message: e.message ?? 'is invalid' };
  }
}

function isRealDate(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Validates one parsed document. `relPath` is relative to data/ (accelerators/<country>/<id>.yaml). */
export function validateDocument(doc: unknown, relPath: string, dataDir = DATA_DIR): Problem[] {
  const file = `data/${relPath}`;
  const validate = getValidator(dataDir);
  const problems: Problem[] = [];
  if (!validate(doc)) {
    const seen = new Set<string>();
    for (const e of validate.errors ?? []) {
      const d = describeAjvError(e);
      if (!d) continue;
      const key = `${d.field}|${d.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({ file, ...d });
    }
  }
  if (doc && typeof doc === 'object') {
    const acc = doc as Partial<Accelerator>;
    const expectedId = basename(relPath).replace(/\.yaml$/, '');
    const expectedCountry = basename(dirname(relPath));
    if (typeof acc.id === 'string' && acc.id !== expectedId)
      problems.push({ file, field: 'id', message: `is "${acc.id}" but the file name says "${expectedId}"` });
    if (typeof acc.country === 'string' && acc.country !== expectedCountry)
      problems.push({ file, field: 'country', message: `is "${acc.country}" but the file is in folder "${expectedCountry}"` });
    for (const key of ['last_verified', 'deadline'] as const) {
      const v = acc[key];
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isRealDate(v))
        problems.push({ file, field: key, message: `"${v}" is not a real calendar date` });
    }
  }
  return problems;
}

function listYamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listYamlFiles(full);
    return /\.ya?ml$/.test(name) ? [full] : [];
  });
}

export function loadAccelerators(dataDir = DATA_DIR): { files: LoadedFile[]; problems: Problem[] } {
  const files: LoadedFile[] = [];
  const problems: Problem[] = [];
  const root = join(dataDir, 'accelerators');
  for (const full of listYamlFiles(root).sort()) {
    const relPath = relative(dataDir, full).split(sep).join('/');
    const file = `data/${relPath}`;
    if (relPath.endsWith('.yml')) {
      problems.push({ file, field: '', message: 'use the .yaml extension, not .yml' });
      continue;
    }
    if (relPath.split('/').length !== 3) {
      problems.push({ file, field: '', message: 'must live directly in data/accelerators/<country>/' });
      continue;
    }
    const text = readFileSync(full, 'utf8');
    const parsed = parseDocument(text);
    if (parsed.errors.length) {
      for (const err of parsed.errors)
        problems.push({ file, field: '', message: `YAML syntax error: ${err.message.split('\n')[0]}`, line: err.linePos?.[0]?.line });
      continue;
    }
    const doc = parsed.toJS();
    const docProblems = validateDocument(doc, relPath, dataDir);
    problems.push(...docProblems);
    if (!docProblems.length) files.push({ path: relPath, data: doc as Accelerator });
  }

  const byId = new Map<string, string>();
  for (const f of files) {
    const other = byId.get(f.data.id);
    if (other) problems.push({ file: `data/${f.path}`, field: 'id', message: `duplicates the id in data/${other}` });
    else byId.set(f.data.id, f.path);
  }
  return { files, problems };
}

export function countQuestions(acc: Accelerator): { question_count: number; required_count: number } {
  const questions = acc.steps.flatMap((s) => s.questions);
  return { question_count: questions.length, required_count: questions.filter((q) => q.required).length };
}

export function toIndexEntry(f: LoadedFile): IndexEntry {
  const a = f.data;
  return {
    id: a.id,
    name: a.name,
    country: a.country,
    path: f.path,
    domains: a.match.domains,
    apply_urls: a.match.apply_urls ?? [],
    last_verified: a.last_verified,
    ...countQuestions(a),
  };
}

/**
 * Builds index.json. Keeps `previous.generated_at` when nothing changed,
 * so the CI job doesn't commit a new index on every push.
 */
export function buildIndex(files: LoadedFile[], previous?: AcceleratorIndex, now = new Date()): AcceleratorIndex {
  const accelerators = files.map(toIndexEntry).sort((a, b) => a.id.localeCompare(b.id));
  const unchanged = previous && JSON.stringify(previous.accelerators) === JSON.stringify(accelerators);
  return { generated_at: unchanged ? previous.generated_at : now.toISOString(), accelerators };
}
