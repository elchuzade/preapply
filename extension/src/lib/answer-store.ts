// chrome.storage.local persistence for saved answers. One key per answer, so two open
// PreApply views never overwrite each other's edits.
import { ANSWER_PREFIX, type SavedAnswer } from './answers.ts';

export async function loadAnswers(): Promise<SavedAnswer[]> {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([k]) => k.startsWith(ANSWER_PREFIX))
    .map(([, v]) => v as SavedAnswer)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveAnswer(answer: SavedAnswer): Promise<void> {
  await chrome.storage.local.set({ [ANSWER_PREFIX + answer.key]: answer });
}

export async function deleteAnswer(key: string): Promise<void> {
  await chrome.storage.local.remove(ANSWER_PREFIX + key);
}

export function onAnswersChanged(callback: () => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.keys(changes).some((k) => k.startsWith(ANSWER_PREFIX))) callback();
  });
}

export function isSavedAnswer(v: unknown): v is SavedAnswer {
  const a = v as SavedAnswer;
  return !!a && ['key', 'acceleratorId', 'acceleratorName', 'question', 'text', 'updatedAt'].every(
    (k) => typeof (a as unknown as Record<string, unknown>)[k] === 'string',
  );
}
