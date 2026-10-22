// The founder's own answer library. Answers are typed into PreApply's UI (never read from
// a page), kept in chrome.storage.local, and offered again for similar questions elsewhere.

export interface SavedAnswer {
  key: string;
  acceleratorId: string;
  acceleratorName: string;
  question: string;
  text: string;
  updatedAt: string;
}

export interface Suggestion {
  answer: SavedAnswer;
  score: number;
}

export const ANSWER_PREFIX = 'answer:';

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answerKey(acceleratorId: string, question: string): string {
  return `${acceleratorId}::${normalizeQuestion(question)}`;
}

const STOPWORDS = new Set(
  'a an and are as at be been but by can did do does for from had has have how i if in into is it its me my of on or our so such than that the their them then there these they this to us was we were what when where which who whom why will with would you your yours ever most any should could please tell describe give'.split(' '),
);

function stem(word: string): string {
  return word.length > 4 ? word.replace(/(ings|ing|ies|ied|es|ed|s)$/, '') : word;
}

export function tokens(text: string): Set<string> {
  return new Set(
    normalizeQuestion(text)
      .split(' ')
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
      .map(stem),
  );
}

/** Jaccard similarity of the questions' content words, 0..1. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return normalizeQuestion(a) === normalizeQuestion(b) ? 1 : 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/**
 * Saved answers worth offering for `question`, best first. Excludes the question's own
 * answer and empty ones. Answers to unrelated questions are kept (score 0) at the end so
 * the founder can still pick anything they've written.
 */
export function rankSuggestions(question: string, answers: SavedAnswer[], excludeKey?: string): Suggestion[] {
  return answers
    .filter((a) => a.key !== excludeKey && a.text.trim())
    .map((answer) => ({ answer, score: similarity(question, answer.question) }))
    .sort((x, y) => y.score - x.score || y.answer.updatedAt.localeCompare(x.answer.updatedAt));
}

/** Threshold above which a saved answer is called "a likely match". */
export const GOOD_MATCH = 0.35;

export interface Readiness {
  required: number;
  requiredDrafted: number;
  total: number;
  drafted: number;
  /** Questions without a draft but with a likely match among saved answers. */
  reusable: number;
}

export function readiness(
  acceleratorId: string,
  questions: { text: string; required?: boolean }[],
  answers: SavedAnswer[],
): Readiness {
  const byKey = new Map(answers.map((a) => [a.key, a]));
  const r: Readiness = { required: 0, requiredDrafted: 0, total: questions.length, drafted: 0, reusable: 0 };
  for (const q of questions) {
    const key = answerKey(acceleratorId, q.text);
    const has = !!byKey.get(key)?.text.trim();
    if (q.required) r.required++;
    if (has) {
      r.drafted++;
      if (q.required) r.requiredDrafted++;
    } else if ((rankSuggestions(q.text, answers, key)[0]?.score ?? 0) >= GOOD_MATCH) {
      r.reusable++;
    }
  }
  return r;
}
