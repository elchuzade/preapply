// The accelerator panel: header, freshness, summary, readiness, and every question by step.
// Rendered read-only on host pages (shadow DOM) and editable in extension pages, where
// founders draft answers and reuse ones saved for other accelerators.
import type { Accelerator, Question } from '../lib/types.ts';
import { deadlineLabel, freshness } from '../lib/freshness.ts';
import { copyAllText, countUnits, limitLabel, summaryLine } from '../lib/summary.ts';
import { questionsChangedUrl, sourceFileUrl } from '../lib/github.ts';
import { GOOD_MATCH, answerKey, rankSuggestions, readiness, type SavedAnswer } from '../lib/answers.ts';
import { actionButton, copyText, debounce, h } from './dom.ts';
import { TYPE_ICONS, TYPE_LABELS } from './styles.ts';

export interface PanelOptions {
  /** Drafting is only offered in extension pages, never inside a host page. */
  editable: boolean;
  answers: SavedAnswer[];
  pageUrl?: string;
  sourcePath?: string;
  onBack?: () => void;
  /** Read-only mode: open the drafting view (an extension tab). */
  onDraft?: () => void;
  /** Popup: open the same panel in a full tab. */
  onOpenTab?: () => void;
  saveAnswer?: (a: SavedAnswer) => Promise<void>;
  deleteAnswer?: (key: string) => Promise<void>;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function renderPanel(acc: Accelerator, opts: PanelOptions): HTMLElement {
  const answers = new Map(opts.answers.map((a) => [a.key, a]));
  const questions = acc.steps.flatMap((s) => s.questions);
  const fresh = freshness(acc);
  const deadline = deadlineLabel(acc.deadline);

  const root = h('div', { class: 'pa-panel' });

  root.append(
    h(
      'header',
      { class: 'pa-head' },
      opts.onBack && h('button', { class: 'pa-link', type: 'button', onclick: opts.onBack }, '← All accelerators'),
      h('h2', {}, h('a', { href: acc.website, target: '_blank', rel: 'noopener noreferrer' }, acc.name)),
      (acc.cohort || deadline) && h('div', { class: 'pa-meta' }, [acc.cohort, deadline].filter(Boolean).join(' · ')),
      h('span', { class: `pa-chip pa-fresh-${fresh.kind}` }, fresh.label),
    ),
  );

  if (fresh.kind === 'unverified') {
    root.append(
      h(
        'div',
        { class: 'pa-callout' },
        h('p', {}, questions.length
          ? 'These questions are partial and haven’t been checked against the real form yet.'
          : 'Nobody has added this program’s questions yet. If you’ve seen the form, you can add them in a couple of minutes.'),
        h('a', { class: 'pa-btn pa-btn-primary', href: questionsChangedUrl(acc.id, opts.pageUrl), target: '_blank', rel: 'noopener' }, 'Help add them'),
      ),
    );
  }
  if (acc.notes) root.append(h('div', { class: 'pa-callout pa-callout-warn' }, acc.notes));

  root.append(h('p', { class: 'pa-summary' }, summaryLine(acc)));

  const readyEl = h('div', { class: 'pa-ready' });
  const updateReadiness = () => {
    readyEl.replaceChildren();
    if (!questions.length) return;
    const r = readiness(acc.id, questions, [...answers.values()]);
    const total = r.required || r.total;
    const done = r.required ? r.requiredDrafted : r.drafted;
    const parts = [`Your drafts: ${done} of ${total} ${r.required ? 'required ' : ''}answered`];
    if (r.reusable) parts.push(`${r.reusable} more can reuse a saved answer`);
    readyEl.append(
      h('span', {}, parts.join(' · ')),
      h('div', { class: 'pa-bar' }, h('span', { style: `width:${total ? Math.round((done / total) * 100) : 0}%` })),
    );
  };
  updateReadiness();
  root.append(readyEl);

  const actions = h('div', { class: 'pa-actions' });
  if (questions.length) {
    actions.append(actionButton('Copy all questions', () => copyText(copyAllText(acc)), { class: 'pa-btn pa-btn-primary', done: 'Copied ✓' }));
  }
  if (opts.onDraft && questions.length) actions.append(h('button', { class: 'pa-btn', type: 'button', onclick: opts.onDraft }, 'Draft answers ↗'));
  if (opts.onOpenTab) actions.append(h('button', { class: 'pa-btn', type: 'button', onclick: opts.onOpenTab }, 'Open in tab ↗'));
  actions.append(
    h('a', { class: 'pa-btn', href: questionsChangedUrl(acc.id, opts.pageUrl), target: '_blank', rel: 'noopener' }, 'Questions changed?'),
  );
  root.append(actions);

  acc.steps.forEach((step, i) => {
    root.append(
      h(
        'section',
        { class: 'pa-step' },
        h('div', { class: 'pa-step-head' },
          h('h3', {}, `Step ${i + 1} · ${step.title}`),
          h('span', { class: 'pa-chip' }, `${step.questions.length} question${step.questions.length === 1 ? '' : 's'}`)),
        step.intro && h('p', { class: 'pa-step-intro' }, step.intro),
        h('ol', { class: 'pa-qs' }, ...step.questions.map((q) => questionItem(acc, q, answers, opts, updateReadiness))),
      ),
    );
  });

  root.append(
    h(
      'footer',
      { class: 'pa-foot' },
      h('span', {}, 'Community-maintained question data'),
      opts.sourcePath && h('a', { href: sourceFileUrl(opts.sourcePath), target: '_blank', rel: 'noopener' }, 'Source file'),
      opts.editable && h('span', {}, 'Drafts are stored only in this browser.'),
    ),
  );
  return root;
}

function questionItem(
  acc: Accelerator,
  q: Question,
  answers: Map<string, SavedAnswer>,
  opts: PanelOptions,
  onChange: () => void,
): HTMLLIElement {
  const key = answerKey(acc.id, q.text);
  const limit = limitLabel(q);
  const statusChip = h('span', { class: 'pa-chip pa-drafted' });
  const updateStatus = () => {
    const has = !!answers.get(key)?.text.trim();
    const reusable = !has && (rankSuggestions(q.text, [...answers.values()], key)[0]?.score ?? 0) >= GOOD_MATCH;
    statusChip.hidden = !has && !reusable;
    statusChip.textContent = has ? '✓ Drafted' : 'Saved answer fits';
  };
  updateStatus();

  const li = h(
    'li',
    { class: 'pa-q' },
    h('div', { class: 'pa-q-top' },
      h('span', { class: 'pa-type', title: TYPE_LABELS[q.type], 'aria-label': TYPE_LABELS[q.type] }, TYPE_ICONS[q.type] ?? '•'),
      h('span', { class: 'pa-q-text' }, q.text)),
    h('div', { class: 'pa-q-tags' },
      h('span', { class: `pa-chip ${q.required ? 'pa-req' : ''}` }, q.required ? 'Required' : 'Optional'),
      h('span', { class: 'pa-chip' }, TYPE_LABELS[q.type]),
      limit && h('span', { class: 'pa-chip' }, limit),
      statusChip),
    q.hint && h('p', { class: 'pa-hint' }, q.hint),
  );

  if (opts.editable) li.append(draftArea(acc, q, key, answers, opts, () => (updateStatus(), onChange())));
  return li;
}

function draftArea(
  acc: Accelerator,
  q: Question,
  key: string,
  answers: Map<string, SavedAnswer>,
  opts: PanelOptions,
  onChange: () => void,
): HTMLElement {
  const wrap = h('div', { class: 'pa-draft' });
  const existing = answers.get(key);
  const unit = q.limit_unit ?? 'words';
  const textarea = h('textarea', {
    rows: q.type === 'long_text' || q.type === 'references' ? 4 : 1,
    placeholder: q.type === 'video' || q.type === 'url' ? 'Paste a link…' : 'Draft your answer…',
    value: existing?.text ?? '',
    'aria-label': `Answer: ${q.text}`,
  });
  const counter = h('span');
  const saved = h('span');
  const undo = h('button', { class: 'pa-link', type: 'button', hidden: true }, 'Undo');
  let undoText = '';

  const updateCounter = () => {
    const n = countUnits(textarea.value, unit);
    counter.textContent = q.limit ? `${n} / ${q.limit} ${unit}` : `${n} ${n === 1 ? 'word' : 'words'}`;
    counter.className = q.limit && n > q.limit ? 'pa-over' : '';
  };

  const persist = debounce(async () => {
    const text = textarea.value;
    if (text.trim()) {
      const answer: SavedAnswer = {
        key,
        acceleratorId: acc.id,
        acceleratorName: acc.name,
        question: q.text,
        text,
        updatedAt: new Date().toISOString(),
      };
      answers.set(key, answer);
      await opts.saveAnswer?.(answer);
    } else {
      answers.delete(key);
      await opts.deleteAnswer?.(key);
    }
    saved.textContent = 'Saved';
    setTimeout(() => (saved.textContent = ''), 1200);
    onChange();
  }, 400);

  textarea.addEventListener('input', () => {
    updateCounter();
    undo.hidden = true;
    persist();
  });

  const select = h('select', { 'aria-label': 'Reuse a saved answer' });
  const fillSelect = () => {
    const ranked = rankSuggestions(q.text, [...answers.values()], key).slice(0, 25);
    select.replaceChildren(h('option', { value: '' }, ranked.length ? `Reuse a saved answer (${ranked.length})…` : 'No saved answers yet'));
    select.hidden = !ranked.length;
    const good = ranked.filter((s) => s.score >= GOOD_MATCH);
    const rest = ranked.filter((s) => s.score < GOOD_MATCH);
    const option = (a: SavedAnswer) =>
      h('option', { value: a.key }, `${truncate(a.text.replace(/\s+/g, ' '), 60)} — ${a.acceleratorName}: “${truncate(a.question, 40)}”`);
    if (good.length) select.append(h('optgroup', { label: 'Likely matches' }, ...good.map((s) => option(s.answer))));
    if (rest.length) select.append(h('optgroup', { label: 'Other saved answers' }, ...rest.map((s) => option(s.answer))));
  };
  fillSelect();
  select.addEventListener('focus', fillSelect);
  select.addEventListener('change', () => {
    const chosen = answers.get(select.value);
    select.value = '';
    if (!chosen) return;
    undoText = textarea.value;
    textarea.value = chosen.text;
    undo.hidden = !undoText;
    updateCounter();
    persist();
  });
  undo.addEventListener('click', () => {
    textarea.value = undoText;
    undo.hidden = true;
    updateCounter();
    persist();
  });

  updateCounter();
  wrap.append(
    select,
    textarea,
    h('div', { class: 'pa-draft-row' },
      h('span', {}, counter, ' ', saved, ' ', undo),
      actionButton('Copy answer', () => copyText(textarea.value), { class: 'pa-btn pa-btn-small', done: 'Copied ✓' })),
  );
  return wrap;
}
