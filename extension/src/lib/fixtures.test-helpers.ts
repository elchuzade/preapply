import type { Accelerator, AcceleratorIndex, IndexEntry } from './types.ts';

export function makeAccelerator(over: Partial<Accelerator> = {}): Accelerator {
  return {
    id: 'demo',
    name: 'Demo Accelerator',
    country: 'global',
    website: 'https://demo.example/',
    match: { domains: ['demo.example'], apply_urls: ['https://demo.example/apply*'] },
    last_verified: '2026-10-01',
    steps: [
      { title: 'Signup', questions: [{ text: 'Email', type: 'short_text', required: true }] },
      {
        title: 'Application',
        intro: 'Tell us about you.',
        questions: [
          { text: 'Intro video', type: 'video', required: true, hint: 'One minute.' },
          { text: 'Why now?', type: 'long_text', limit: 100, limit_unit: 'words' },
        ],
      },
    ],
    ...over,
  };
}

export function makeEntry(over: Partial<IndexEntry> = {}): IndexEntry {
  return {
    id: 'demo',
    name: 'Demo Accelerator',
    country: 'global',
    path: 'accelerators/global/demo.yaml',
    status: 'verified',
    domains: ['demo.example'],
    apply_urls: [],
    last_verified: '2026-10-01',
    question_count: 3,
    required_count: 2,
    ...over,
  };
}

export function makeIndex(entries: IndexEntry[], generated_at = '2026-10-01T00:00:00.000Z'): AcceleratorIndex {
  return { generated_at, accelerators: entries };
}
