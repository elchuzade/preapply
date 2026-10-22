// Full-tab extension page: ?id=<accelerator> for drafting, ?view=answers for the answer library.
import { send, type IndexResponse } from './lib/messages.ts';
import type { Accelerator } from './lib/types.ts';
import { deleteAnswer, isSavedAnswer, loadAnswers, saveAnswer } from './lib/answer-store.ts';
import type { SavedAnswer } from './lib/answers.ts';
import { countUnits } from './lib/summary.ts';
import { renderPanel } from './ui/panel.ts';
import { actionButton, copyText, debounce, h } from './ui/dom.ts';
import { PANEL_CSS } from './ui/styles.ts';

document.head.append(h('style', {}, PANEL_CSS));
const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);

async function showAccelerator(id: string) {
  const [acc, answers, { index }] = await Promise.all([
    send<Accelerator | null>({ type: 'getAccelerator', id }),
    loadAnswers(),
    send<IndexResponse>({ type: 'getIndex' }),
  ]);
  if (!acc) {
    app.replaceChildren(h('div', { class: 'pa-panel' }, h('p', {}, `Unknown accelerator “${id}”.`)));
    return;
  }
  document.title = `${acc.name} — PreApply`;
  app.replaceChildren(
    h('nav', { class: 'pa-page-nav' }, h('a', { href: '?view=answers' }, 'Saved answers')),
    renderPanel(acc, {
      editable: true,
      answers,
      sourcePath: index.accelerators.find((e) => e.id === id)?.path,
      saveAnswer,
      deleteAnswer,
    }),
  );
}

async function showAnswers() {
  document.title = 'Saved answers — PreApply';
  const answers = await loadAnswers();
  const groups = new Map<string, SavedAnswer[]>();
  for (const a of answers) groups.set(a.acceleratorName, [...(groups.get(a.acceleratorName) ?? []), a]);

  const importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const importStatus = h('span', { class: 'pa-meta' });
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const list = (Array.isArray(parsed) ? parsed : []).filter(isSavedAnswer);
      for (const a of list) await saveAnswer(a);
      await showAnswers();
    } catch {
      importStatus.textContent = 'That file isn’t a PreApply answers export.';
    }
  });

  const exportAnswers = async () => {
    const blob = new Blob([JSON.stringify(answers, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `preapply-answers-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  app.replaceChildren(
    h('div', { class: 'pa-panel' },
      h('header', { class: 'pa-head' },
        h('h2', {}, 'Your saved answers'),
        h('p', { class: 'pa-meta' },
          'Stored only in this browser. PreApply never reads or fills in forms: copy an answer and paste it yourself. When you draft for another accelerator, similar saved answers are offered automatically.')),
      h('div', { class: 'pa-actions' },
        actionButton('Export JSON', exportAnswers, { done: 'Exported ✓' }),
        h('button', { class: 'pa-btn', type: 'button', onclick: () => importInput.click() }, 'Import JSON'),
        importInput, importStatus),
      !answers.length && h('p', { class: 'pa-empty' }, 'No saved answers yet. Open an accelerator from the toolbar popup and start drafting.'),
      ...[...groups].map(([name, list]) =>
        h('section', { class: 'pa-step' },
          h('div', { class: 'pa-step-head' },
            h('h3', {}, name),
            h('a', { href: `?id=${encodeURIComponent(list[0]!.acceleratorId)}` }, 'Open questions')),
          h('ol', { class: 'pa-qs' }, ...list.map(answerItem)))),
    ),
  );
}

function answerItem(a: SavedAnswer): HTMLLIElement {
  const textarea = h('textarea', { rows: 3, value: a.text, 'aria-label': `Answer: ${a.question}` });
  const meta = h('span');
  const updateMeta = () => (meta.textContent = `${countUnits(textarea.value)} words · updated ${new Date(a.updatedAt).toLocaleDateString()}`);
  updateMeta();
  const persist = debounce(() => {
    a = { ...a, text: textarea.value, updatedAt: new Date().toISOString() };
    void (textarea.value.trim() ? saveAnswer(a) : deleteAnswer(a.key));
    updateMeta();
  }, 400);
  textarea.addEventListener('input', persist);
  const li = h('li', { class: 'pa-q' },
    h('div', { class: 'pa-q-top' }, h('span', { class: 'pa-q-text' }, a.question)),
    h('div', { class: 'pa-draft', style: 'margin-left:0' },
      textarea,
      h('div', { class: 'pa-draft-row' }, meta,
        h('span', { class: 'pa-actions' },
          actionButton('Copy', () => copyText(textarea.value), { class: 'pa-btn pa-btn-small', done: 'Copied ✓' }),
          h('button', { class: 'pa-btn pa-btn-small', type: 'button', onclick: async () => { await deleteAnswer(a.key); li.remove(); } }, 'Delete')))));
  return li;
}

if (params.get('id')) void showAccelerator(params.get('id')!);
else void showAnswers();
