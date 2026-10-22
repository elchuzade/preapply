// Messages between the content script / popup / panel page and the background worker.
import type { Accelerator, AcceleratorIndex, IndexEntry } from './types.ts';

export type Request =
  | { type: 'lookup'; href: string } // content script; also sets the toolbar badge
  | { type: 'matchUrl'; url: string } // popup
  | { type: 'getIndex' }
  | { type: 'getAccelerator'; id: string }
  | { type: 'refresh' }
  | { type: 'openPanel'; id?: string; view?: 'answers' }
  | { type: 'getCoverage' }
  | { type: 'syncScripts' };

export interface ApplyTarget {
  id: string;
  name: string;
  patterns: string[];
}

export interface Match {
  entry: IndexEntry;
  accelerator: Accelerator | null;
}

export interface LookupResponse {
  match: Match | null;
  applyTargets: ApplyTarget[];
}

export interface IndexResponse {
  index: AcceleratorIndex;
  fetchedAt?: string;
}

export interface RefreshResponse extends IndexResponse {
  ok: boolean;
}

export interface CoverageResponse {
  /** Index domains this install can't watch yet (not in the manifest, permission not granted). */
  missing: string[];
}

export function send<T>(msg: Request): Promise<T> {
  return chrome.runtime.sendMessage(msg);
}
