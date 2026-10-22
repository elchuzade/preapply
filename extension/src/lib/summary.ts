// Counting and text formatting for an accelerator's questions.
import type { Accelerator, Question, QuestionType } from './types.ts';

export interface Summary {
  total: number;
  required: number;
  byType: Partial<Record<QuestionType, number>>;
}

export function allQuestions(acc: Accelerator): Question[] {
  return acc.steps.flatMap((s) => s.questions);
}

export function summarize(acc: Accelerator): Summary {
  const questions = allQuestions(acc);
  const byType: Summary['byType'] = {};
  for (const q of questions) byType[q.type] = (byType[q.type] ?? 0) + 1;
  return { total: questions.length, required: questions.filter((q) => q.required).length, byType };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The types worth calling out because they take real preparation. */
export function notableParts(s: Summary): string[] {
  const parts: string[] = [];
  if (s.byType.video) parts.push(plural(s.byType.video, 'video'));
  if (s.byType.file) parts.push(plural(s.byType.file, 'file upload'));
  if (s.byType.references) parts.push(plural(s.byType.references, 'reference request'));
  return parts;
}

export function summaryLine(acc: Accelerator): string {
  const s = summarize(acc);
  return [plural(s.total, 'question'), `${s.required} required`, ...notableParts(s)].join(' · ');
}

export function pillText(acc: Accelerator): string {
  const s = summarize(acc);
  return ['PreApply: ' + plural(s.total, 'question'), ...notableParts(s), 'see before applying'].join(' · ');
}

export function limitLabel(q: Pick<Question, 'limit' | 'limit_unit'>): string | undefined {
  if (!q.limit) return undefined;
  return `max ${q.limit} ${q.limit_unit ?? 'words'}`;
}

/** Plain-text version of every question, for drafting answers elsewhere. */
export function copyAllText(acc: Accelerator): string {
  const lines: string[] = [];
  const meta = [acc.cohort, acc.deadline && `deadline ${acc.deadline}`].filter(Boolean).join(', ');
  lines.push(meta ? `${acc.name} — ${meta}` : acc.name);
  lines.push(`Questions last verified ${acc.last_verified} (via PreApply)`);
  if (acc.notes) lines.push(`Note: ${acc.notes}`);
  acc.steps.forEach((step, i) => {
    lines.push('', `Step ${i + 1}: ${step.title}`);
    if (step.intro) lines.push(step.intro);
    step.questions.forEach((q, j) => {
      const tags = [q.required ? 'required' : 'optional', q.type.replace('_', ' '), limitLabel(q)].filter(Boolean);
      lines.push(`${j + 1}. ${q.text} [${tags.join(', ')}]`);
      if (q.hint) lines.push(`   ${q.hint}`);
    });
  });
  return `${lines.join('\n')}\n`;
}
