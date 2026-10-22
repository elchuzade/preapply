import { describe, it, expect } from 'vitest';
import { copyAllText, countUnits, pillText, summarize, summaryLine } from './summary.ts';
import { makeAccelerator } from './fixtures.test-helpers.ts';

describe('summary', () => {
  const acc = makeAccelerator();
  it('counts questions by type', () => {
    expect(summarize(acc)).toEqual({ total: 3, required: 2, byType: { short_text: 1, video: 1, long_text: 1 } });
    expect(summaryLine(acc)).toBe('3 questions · 2 required · 1 video');
    expect(pillText(acc)).toBe('PreApply: 3 questions · 1 video · see before applying');
  });
  it('has a placeholder pill for unverified files', () => {
    const placeholder = makeAccelerator({ status: 'needs_verification', last_verified: null, steps: [] });
    expect(pillText(placeholder)).toBe('PreApply: questions not yet verified — help add them');
    expect(summaryLine(placeholder)).toBe('No questions listed yet');
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
  it('counts words and characters', () => {
    expect(countUnits('  one two\nthree ', 'words')).toBe(3);
    expect(countUnits('', 'words')).toBe(0);
    expect(countUnits('héllo', 'characters')).toBe(5);
  });
});
