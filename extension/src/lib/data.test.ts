import { describe, it, expect, vi } from 'vitest';
import { getAccelerator, getIndex, refreshIndex, type DataDeps, type KV } from './data.ts';
import type { BundledData } from './types.ts';
import { makeAccelerator, makeEntry, makeIndex } from './fixtures.test-helpers.ts';

function memoryStore(initial: Record<string, unknown> = {}): KV & { data: Map<string, unknown> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: async <T,>(k: string) => data.get(k) as T | undefined,
    set: async (k, v) => void data.set(k, structuredClone(v)),
  };
}

const BASE = 'https://cdn.example/data/';
const yaml = (id: string, lastVerified: string) =>
  `id: ${id}\nname: Demo Accelerator\ncountry: global\nwebsite: https://demo.example/\nmatch:\n  domains: [demo.example]\nlast_verified: ${lastVerified}\nsteps:\n  - title: S\n    questions:\n      - text: Q\n        type: other\n`;

function setup(opts: { routes?: Record<string, () => Response>; store?: Record<string, unknown>; bundled?: Partial<BundledData> } = {}) {
  const fetch = vi.fn(async (url: string) => {
    const route = opts.routes?.[url.replace(BASE, '')];
    if (!route) throw new TypeError('Failed to fetch');
    return route();
  });
  const store = memoryStore(opts.store);
  const bundled: BundledData = { index: makeIndex([makeEntry()]), accelerators: { demo: makeAccelerator() }, ...opts.bundled };
  const deps: DataDeps = { fetch, store, baseUrl: BASE, bundled, now: () => new Date('2026-10-22T00:00:00Z') };
  return { deps, fetch, store };
}

const json = (v: unknown) => () => new Response(JSON.stringify(v), { status: 200 });

describe('index', () => {
  it('falls back to the bundled index when nothing is stored', async () => {
    const { deps } = setup();
    expect((await getIndex(deps)).index.accelerators[0]!.id).toBe('demo');
  });

  it('fetches and stores index.json', async () => {
    const remote = makeIndex([makeEntry({ id: 'remote' })], '2026-10-20T00:00:00.000Z');
    const { deps, fetch, store } = setup({ routes: { 'index.json': json(remote) } });
    const res = await refreshIndex(deps);
    expect(res.ok).toBe(true);
    expect(res.index.accelerators[0]!.id).toBe('remote');
    expect(fetch).toHaveBeenCalledWith(`${BASE}index.json`, expect.objectContaining({ credentials: 'omit' }));
    expect(store.data.get('index')).toEqual({ index: remote, fetchedAt: '2026-10-22T00:00:00.000Z' });
  });

  it('keeps the cached index when offline or the response is bad', async () => {
    const cached = makeIndex([makeEntry({ id: 'cached' })], '2026-10-10T00:00:00.000Z');
    const offline = setup({ store: { index: { index: cached, fetchedAt: 'x' } } });
    const res = await refreshIndex(offline.deps);
    expect(res).toMatchObject({ ok: false, index: cached });

    const bad = setup({ routes: { 'index.json': json({ nope: true }) }, store: { index: { index: cached, fetchedAt: 'x' } } });
    expect((await refreshIndex(bad.deps)).index).toEqual(cached);

    const notFound = setup({ routes: { 'index.json': () => new Response('', { status: 404 }) } });
    expect((await refreshIndex(notFound.deps)).ok).toBe(false);
  });

  it('prefers a newer bundled index after an extension update', async () => {
    const old = makeIndex([makeEntry({ id: 'old' })], '2026-01-01T00:00:00.000Z');
    const { deps } = setup({ store: { index: { index: old, fetchedAt: 'x' } } });
    expect((await getIndex(deps)).index.accelerators[0]!.id).toBe('demo');
  });
});

describe('getAccelerator', () => {
  it('uses bundled data without fetching when it is current', async () => {
    const { deps, fetch } = setup();
    expect(await getAccelerator('demo', deps)).toMatchObject({ source: 'bundled' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refetches when the index shows a newer verification date, then serves from cache', async () => {
    const index = makeIndex([makeEntry({ last_verified: '2026-10-15' })], '2026-10-15T00:00:00.000Z');
    const { deps, fetch, store } = setup({
      store: { index: { index, fetchedAt: 'x' } },
      routes: { 'accelerators/global/demo.yaml': () => new Response(yaml('demo', '2026-10-15')) },
    });
    const first = await getAccelerator('demo', deps);
    expect(first).toMatchObject({ source: 'network', accelerator: { last_verified: '2026-10-15' } });
    expect(store.data.get('acc:demo')).toMatchObject({ last_verified: '2026-10-15' });

    const second = await getAccelerator('demo', deps);
    expect(second?.source).toBe('cache');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the cached copy when offline', async () => {
    const index = makeIndex([makeEntry({ last_verified: '2026-10-20' })], '2026-10-20T00:00:00.000Z');
    const cachedAcc = makeAccelerator({ last_verified: '2026-10-15', name: 'Cached' });
    const { deps } = setup({
      store: { index: { index, fetchedAt: 'x' }, 'acc:demo': { data: cachedAcc, last_verified: '2026-10-15', cachedAt: 'x' } },
    });
    expect(await getAccelerator('demo', deps)).toMatchObject({ source: 'cache', accelerator: { name: 'Cached' } });
  });

  it('rejects a YAML file for the wrong id', async () => {
    const index = makeIndex([makeEntry({ last_verified: '2026-10-20' })], '2026-10-20T00:00:00.000Z');
    const { deps } = setup({
      store: { index: { index, fetchedAt: 'x' } },
      routes: { 'accelerators/global/demo.yaml': () => new Response(yaml('other', '2026-10-20')) },
    });
    expect(await getAccelerator('demo', deps)).toMatchObject({ source: 'bundled' });
  });

  it('returns null for unknown ids with nothing local', async () => {
    const { deps } = setup();
    expect(await getAccelerator('missing', deps)).toBeNull();
  });
});
