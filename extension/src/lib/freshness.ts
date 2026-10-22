import { FRESH_DAYS } from '../config.ts';
import type { Accelerator, IndexEntry } from './types.ts';

export type FreshnessKind = 'verified' | 'stale' | 'unverified';
export interface Freshness {
  kind: FreshnessKind;
  label: string;
}

const DAY_MS = 86_400_000;

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(`${iso}T00:00:00Z`)) / DAY_MS);
}

export function freshness(acc: Pick<Accelerator | IndexEntry, 'status' | 'last_verified'>, now = new Date()): Freshness {
  if (acc.status === 'needs_verification' || !acc.last_verified) {
    return { kind: 'unverified', label: 'Questions not yet verified — help add them' };
  }
  const date = formatDate(acc.last_verified);
  return daysSince(acc.last_verified, now) <= FRESH_DAYS
    ? { kind: 'verified', label: `Verified ${date}` }
    : { kind: 'stale', label: `May be outdated — last verified ${date}` };
}

/** "Deadline 30 Nov 2026 · 39 days left" style text, or undefined. */
export function deadlineLabel(deadline: string | undefined, now = new Date()): string | undefined {
  if (!deadline) return undefined;
  const left = -daysSince(deadline, now);
  const suffix = left < 0 ? 'passed' : left === 0 ? 'today' : `${left} day${left === 1 ? '' : 's'} left`;
  return `Deadline ${formatDate(deadline)} · ${suffix}`;
}
