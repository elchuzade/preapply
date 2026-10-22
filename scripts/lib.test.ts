import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DATA_DIR, buildIndex, formatProblem, loadAccelerators, toFieldPath, validateDocument } from './lib.ts';

const valid = {
  id: 'demo',
  name: 'Demo',
  country: 'de',
  website: 'https://demo.example',
  match: { domains: ['demo.example'] },
  last_verified: '2026-10-01',
  steps: [{ title: 'One', questions: [{ text: 'Why?', type: 'long_text', required: true, limit: 100, limit_unit: 'words' }] }],
};

const messages = (doc: unknown, path = 'accelerators/de/demo.yaml') =>
  validateDocument(doc, path).map((p) => `${p.field}: ${p.message}`);

describe('validateDocument', () => {
  it('accepts a valid document', () => {
    expect(messages(valid)).toEqual([]);
  });

  it('reports field paths and readable messages', () => {
    const doc = structuredClone(valid) as any;
    doc.steps[0].questions[0].type = 'essay';
    doc.colour = 'blue';
    delete doc.name;
    expect(messages(doc)).toEqual(
      expect.arrayContaining([
        'steps[0].questions[0].type: must be one of: short_text, long_text, url, video, file, choice, references, other',
        'colour: unknown field (check spelling)',
        'name: missing required field',
      ]),
    );
  });

  it('checks id against file name and country against folder', () => {
    expect(messages(valid, 'accelerators/fr/other.yaml')).toEqual([
      'id: is "demo" but the file name says "other"',
      'country: is "de" but the file is in folder "fr"',
    ]);
  });

  it('allows null last_verified and no steps only for needs_verification', () => {
    const placeholder = { ...valid, last_verified: null, steps: [] };
    expect(messages(placeholder)).toEqual([
      'last_verified: must be an ISO date (YYYY-MM-DD); null is only allowed with status: needs_verification',
      'steps: needs at least one step unless status is needs_verification',
    ]);
    expect(messages({ ...placeholder, status: 'needs_verification' })).toEqual([]);
  });

  it('rejects impossible dates and limit_unit without limit', () => {
    const doc = structuredClone(valid) as any;
    doc.last_verified = '2026-02-30';
    delete doc.steps[0].questions[0].limit;
    expect(messages(doc)).toEqual([
      'steps[0].questions[0].limit_unit: limit_unit is set but limit is missing',
      'last_verified: "2026-02-30" is not a real calendar date',
    ]);
  });
});

describe('loadAccelerators', () => {
  it('loads the real repo data without problems', () => {
    const { files, problems } = loadAccelerators();
    expect(problems.map(formatProblem)).toEqual([]);
    const bridge = files.find((f) => f.data.id === 'the-bridge');
    expect(bridge?.path).toBe('accelerators/global/the-bridge.yaml');
    expect(bridge?.data.last_verified).toBe('2026-10-22'); // dates stay strings
  });

  it('reports YAML syntax errors and duplicate ids', () => {
    const dir = mkdtempSync(join(tmpdir(), 'preapply-'));
    copyFileSync(join(DATA_DIR, 'schema.json'), join(dir, 'schema.json'));
    mkdirSync(join(dir, 'accelerators', 'de'), { recursive: true });
    mkdirSync(join(dir, 'accelerators', 'fr'), { recursive: true });
    writeFileSync(join(dir, 'accelerators', 'de', 'broken.yaml'), 'id: broken\nname: [unclosed\n');
    const yaml = (country: string) =>
      `id: demo\nname: Demo\ncountry: ${country}\nwebsite: https://x.example\nmatch: {domains: [x.example]}\nlast_verified: 2026-01-01\nsteps: [{title: A, questions: [{text: Q, type: other}]}]\n`;
    writeFileSync(join(dir, 'accelerators', 'de', 'demo.yaml'), yaml('de'));
    writeFileSync(join(dir, 'accelerators', 'fr', 'demo.yaml'), yaml('fr'));
    const { files, problems } = loadAccelerators(dir);
    expect(files).toHaveLength(2);
    expect(problems.map(formatProblem)).toEqual([
      expect.stringMatching(/^data\/accelerators\/de\/broken\.yaml(:\d+)?: YAML syntax error/),
      'data/accelerators/fr/demo.yaml: id — duplicates the id in data/accelerators/de/demo.yaml',
    ]);
  });
});

describe('buildIndex', () => {
  const { files } = loadAccelerators();

  it('counts questions and defaults status', () => {
    const index = buildIndex(files, undefined, new Date('2026-10-22T00:00:00Z'));
    const bridge = index.accelerators.find((a) => a.id === 'the-bridge')!;
    expect(bridge).toMatchObject({ question_count: 17, required_count: 15, status: 'verified', domains: ['join-thebridge.com'] });
    expect(index.accelerators.find((a) => a.id === 'y-combinator')?.status).toBe('needs_verification');
  });

  it('keeps generated_at when content is unchanged', () => {
    const first = buildIndex(files, undefined, new Date('2026-01-01T00:00:00Z'));
    expect(buildIndex(files, first, new Date('2026-06-01T00:00:00Z')).generated_at).toBe(first.generated_at);
    const changed = buildIndex(files.slice(1), first, new Date('2026-06-01T00:00:00Z'));
    expect(changed.generated_at).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('toFieldPath', () => {
  it('converts JSON pointers', () => {
    expect(toFieldPath('/steps/1/questions/0/type')).toBe('steps[1].questions[0].type');
    expect(toFieldPath('')).toBe('');
  });
});
