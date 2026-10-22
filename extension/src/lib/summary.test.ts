import { describe, it, expect } from 'vitest';
import { copyAllText, pillText, summarize, summaryLine } from './summary.ts';
import { makeAccelerator } from './fixtures.test-helpers.ts';

describe('summary', () => {
  const acc = makeAccelerator();
  it('counts questions by type', () => {
    expect(summarize(acc)).toEqual({ total: 3, required: 2, byType: { short_text: 1, video: 1, long_text: 1 } });
    expect(summaryLine(acc)).toBe('3 questions · 2 required · 1 video');
    expect(pillText(acc)).toBe('PreApply: 3 questions · 1 video · see before applying');
  });
  it('formats copy-all text', () => {
    expect(copyAllText(acc)).toBe(
      [
        'Demo Accelerator',
        'Questions last verified 2026-10-01 (via PreApply)',
        '',
        'Step 1: Signup',
        '1. Email [required, short text]',
        '',
        'Step 2: Application',
        'Tell us about you.',
        '1. Intro video [required, video]',
        '   One minute.',
        '2. Why now? [optional, long text, max 100 words]',
        '',
      ].join('\n'),
    );
  });
});
