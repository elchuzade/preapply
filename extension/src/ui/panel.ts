// The accelerator panel: header, freshness, summary, and every question by step.
// Used in the in-page drawer (shadow DOM), the toolbar popup and the full-tab page.
import type { Accelerator, Question } from '../lib/types.ts';
import { deadlineLabel, freshness } from '../lib/freshness.ts';
import { copyAllText, limitLabel, summaryLine } from '../lib/summary.ts';
import { questionsChangedUrl, sourceFileUrl } from '../lib/github.ts';
import { ICONS, copyText, h, icon, withTooltip } from './dom.ts';

const TIPS = {
  copy: 'Copy all questions. Copy and paste them into your AI agent to help you draft answers, or save them for later if you’re not ready to answer yet.',
  openTab: 'Open these questions in a full browser tab, with more room to read them.',
  changed: 'Questions changed? If the form looks different or a question is missing, tell us on GitHub what changed. The form opens with this accelerator filled in, and the community updates the list for everyone.',
};

export interface PanelOptions {
  pageUrl?: string;
  sourcePath?: string;
  onBack?: () => void;
  /** Popup: open the same panel in a full tab. */
  onOpenTab?: () => void;
}

export function renderPanel(acc: Accelerator, opts: PanelOptions = {}): HTMLElement {
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

  // Sticky bar: the actions stay in reach while reading a long list.
  const copy = h('button', { class: 'pa-btn pa-btn-icon pa-btn-primary', type: 'button', 'aria-label': 'Copy all questions' }, icon(ICONS.copy));
  copy.addEventListener('click', async () => {
    if (!(await copyText(copyAllText(acc)))) return;
    copy.replaceChildren(icon(ICONS.check));
    copy.setAttribute('aria-label', 'Copied');
    setTimeout(() => {
      copy.replaceChildren(icon(ICONS.copy));
      copy.setAttribute('aria-label', 'Copy all questions');
    }, 1500);
  });
  const actions = h('div', { class: 'pa-actions' }, withTooltip(copy, TIPS.copy));
  if (opts.onOpenTab) {
    actions.append(withTooltip(
      h('button', { class: 'pa-btn pa-btn-icon', type: 'button', 'aria-label': 'Open in tab', onclick: opts.onOpenTab }, icon(ICONS.openTab)),
      TIPS.openTab));
  }
  actions.append(withTooltip(
    h('a', { class: 'pa-btn pa-btn-icon', href: questionsChangedUrl(acc.id, opts.pageUrl), target: '_blank', rel: 'noopener', 'aria-label': 'Questions changed?' },
      icon(ICONS.edit)),
    TIPS.changed));
  root.append(h('div', { class: 'pa-toolbar' }, actions));

  root.append(h('p', { class: 'pa-summary' }, summaryLine(acc), questions.some((q) => q.required) && h('span', { class: 'pa-legend' }, h('span', { class: 'pa-star' }, '*'), ' required')));

  acc.steps.forEach((step, i) => {
    root.append(
      h(
        'section',
        { class: 'pa-step' },
        h('div', { class: 'pa-step-head' },
          h('h3', {}, `Step ${i + 1} · ${step.title}`),
          h('span', { class: 'pa-step-count' }, `${step.questions.length} question${step.questions.length === 1 ? '' : 's'}`)),
        step.intro && h('p', { class: 'pa-step-intro' }, step.intro),
        h('ol', { class: 'pa-qs' }, ...step.questions.map(questionItem)),
      ),
    );
  });

  root.append(
    h(
      'footer',
      { class: 'pa-foot' },
      h('span', {}, 'Community-maintained question data'),
      opts.sourcePath && h('a', { href: sourceFileUrl(opts.sourcePath), target: '_blank', rel: 'noopener' }, 'Source file'),
    ),
  );
  return root;
}

function questionItem(q: Question): HTMLLIElement {
  const limit = limitLabel(q);
  return h(
    'li',
    { class: 'pa-q' },
    h('p', { class: 'pa-q-text' }, q.text, q.required && h('span', { class: 'pa-star', title: 'Required', 'aria-label': 'required' }, ' *')),
    q.hint && h('p', { class: 'pa-hint' }, q.hint),
    limit && h('p', { class: 'pa-limit' }, limit[0]!.toUpperCase() + limit.slice(1)),
  );
}
