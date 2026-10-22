import { describe, it, expect } from 'vitest';
import { answerKey, rankSuggestions, readiness, similarity, type SavedAnswer } from './answers.ts';

const saved = (acceleratorId: string, question: string, text: string, updatedAt = '2026-10-01T00:00:00Z'): SavedAnswer => ({
  key: answerKey(acceleratorId, question),
  acceleratorId,
  acceleratorName: acceleratorId,
  question,
  text,
  updatedAt,
});

describe('answers', () => {
  it('normalizes keys', () => {
    expect(answerKey('x', '  Where did you LEARN what you know? ')).toBe('x::where did you learn what you know');
  });

  it('scores related questions above unrelated ones', () => {
    const q = 'Who would be the 2 best references we should call?';
    expect(similarity(q, 'Please list two references we can call')).toBeGreaterThan(0.3);
    expect(similarity(q, 'What is your phone number?')).toBe(0);
    expect(similarity('Email', 'Email')).toBe(1);
  });

  it('ranks suggestions, excluding the question itself and empty answers', () => {
    const answers = [
      saved('a', 'What are you obsessed with?', 'Compilers'),
      saved('b', 'Email', 'me@example.com'),
      saved('c', 'Email address', ''),
      saved('d', 'Email', 'mine'),
    ];
    const ranked = rankSuggestions('Email', answers, answers[3]!.key);
    expect(ranked.map((s) => s.answer.acceleratorId)).toEqual(['b', 'a']);
    expect(ranked[0]!.score).toBe(1);
  });

  it('computes readiness', () => {
    const questions = [
      { text: 'Email', required: true },
      { text: 'Phone number', required: true },
      { text: 'Anything else?' },
    ];
    const answers = [saved('this', 'Email', 'me@x.io'), saved('other', 'Your phone number', '+49 1')];
    expect(readiness('this', questions, answers)).toEqual({ required: 2, requiredDrafted: 1, total: 3, drafted: 1, reusable: 1 });
  });
});
