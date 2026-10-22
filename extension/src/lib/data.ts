// Fetch + cache layer. The only network requests the extension makes go through here,
// and they only ever go to the jsDelivr data URL. Everything degrades to cached or bundled data.
import { parse } from 'yaml';
import type { Accelerator, AcceleratorIndex, BundledData, IndexEntry } from './types.ts';

/** Minimal key-value store (chrome.storage.local in the extension, a Map in tests). */
export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export interface DataDeps {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  store: KV;
  baseUrl: string;
  bundled: BundledData;
  now?: () => Date;
}

export interface StoredIndex {
  index: AcceleratorIndex;
  fetchedAt: string;
}

export interface CachedAccelerator {
  data: Accelerator;
  last_verified: string | null;
  cachedAt: string;
}

export type Source = 'network' | 'cache' | 'bundled';

const INDEX_KEY = 'index';
const accKey = (id: string) => `acc:${id}`;

export function isIndex(value: unknown): value is AcceleratorIndex {
  const v = value as AcceleratorIndex;
  return !!v && typeof v.generated_at === 'string' && Array.isArray(v.accelerators) &&
    v.accelerators.every((a) => typeof a?.id === 'string' && Array.isArray(a.domains) && typeof a.path === 'string');
}

export function isAccelerator(value: unknown): value is Accelerator {
  const v = value as Accelerator;
  return !!v && typeof v.id === 'string' && typeof v.name === 'string' && Array.isArray(v.steps) &&
    !!v.match && Array.isArray(v.match.domains);
}

/** True when `candidate` was verified after `current`. A missing date counts as oldest. */
export function isNewerVerification(candidate: string | null | undefined, current: string | null | undefined): boolean {
  if (!candidate) return false;
  if (!current) return true;
  return candidate > current;
}

async function fetchOk(deps: DataDeps, path: string): Promise<Response> {
  const res = await deps.fetch(deps.baseUrl + path, { cache: 'no-cache', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res;
}

/** The best index we have locally: stored, unless the bundled copy (from an extension update) is newer. */
export async function getIndex(deps: DataDeps): Promise<{ index: AcceleratorIndex; fetchedAt?: string }> {
  const stored = await deps.store.get<StoredIndex>(INDEX_KEY);
  if (stored && isIndex(stored.index) && stored.index.generated_at >= deps.bundled.index.generated_at) {
    return { index: stored.index, fetchedAt: stored.fetchedAt };
  }
  return { index: deps.bundled.index };
}

/** Fetches index.json and stores it. On failure, keeps and returns what we already had. */
export async function refreshIndex(deps: DataDeps): Promise<{ ok: boolean; index: AcceleratorIndex; error?: string }> {
  try {
    const json: unknown = await (await fetchOk(deps, 'index.json')).json();
    if (!isIndex(json)) throw new Error('index.json has an unexpected shape');
    const fetchedAt = (deps.now?.() ?? new Date()).toISOString();
    await deps.store.set(INDEX_KEY, { index: json, fetchedAt } satisfies StoredIndex);
    return { ok: true, index: (await getIndex(deps)).index };
  } catch (e) {
    return { ok: false, index: (await getIndex(deps)).index, error: String(e) };
  }
}

/**
 * Returns an accelerator's full data. Uses the cache (or bundled copy) when it is at least
 * as recent as the index says; otherwise fetches the YAML. Falls back to local data offline.
 */
export async function getAccelerator(
  id: string,
  deps: DataDeps,
): Promise<{ accelerator: Accelerator; source: Source } | null> {
  const { index } = await getIndex(deps);
  const entry: IndexEntry | undefined = index.accelerators.find((a) => a.id === id);
  const cached = await deps.store.get<CachedAccelerator>(accKey(id));
  const bundled = deps.bundled.accelerators[id];

  // Pick the freshest local copy.
  let local: { accelerator: Accelerator; source: Source } | null = null;
  if (cached && isAccelerator(cached.data)) local = { accelerator: cached.data, source: 'cache' };
  if (bundled && (!local || isNewerVerification(bundled.last_verified, local.accelerator.last_verified))) {
    local = { accelerator: bundled, source: 'bundled' };
  }

  if (!entry) return local;
  if (local && !isNewerVerification(entry.last_verified, local.accelerator.last_verified)) return local;

  try {
    const text = await (await fetchOk(deps, entry.path)).text();
    const data: unknown = parse(text);
    if (!isAccelerator(data) || data.id !== id) throw new Error(`${entry.path} is not a valid accelerator file`);
    const cachedAt = (deps.now?.() ?? new Date()).toISOString();
    await deps.store.set(accKey(id), { data, last_verified: data.last_verified, cachedAt } satisfies CachedAccelerator);
    return { accelerator: data, source: 'network' };
  } catch {
    return local;
  }
}
