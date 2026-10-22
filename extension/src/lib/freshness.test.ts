import { describe, it, expect } from 'vitest';
import { deadlineLabel, freshness } from './freshness.ts';

const now = new Date('2026-10-22T12:00:00Z');

describe('freshness', () => {
  it('is verified within 120 days', () => {
    expect(freshness({ last_verified: '2026-10-22' }, now)).toEqual({ kind: 'verified', label: 'Verified 22 Oct 2026' });
    expect(freshness({ last_verified: '2026-06-24', status: 'verified' }, now).kind).toBe('verified'); // 120 days
  });
  it('is stale after 120 days', () => {
    expect(freshness({ last_verified: '2026-06-23' }, now)).toEqual({
      kind: 'stale',
      label: 'May be outdated — last verified 23 Jun 2026',
    });
  });
  it('is unverified for placeholders', () => {
    expect(freshness({ last_verified: null, status: 'needs_verification' }, now).label).toBe(
      'Questions not yet verified — help add them',
    );
    expect(freshness({ last_verified: '2026-10-01', status: 'needs_verification' }, now).kind).toBe('unverified');
  });
});

describe('deadlineLabel', () => {
  it('counts days left', () => {
    expect(deadlineLabel('2026-11-30', now)).toBe('Deadline 30 Nov 2026 · 39 days left');
    expect(deadlineLabel('2026-10-01', now)).toBe('Deadline 1 Oct 2026 · passed');
    expect(deadlineLabel(undefined, now)).toBeUndefined();
  });
});
