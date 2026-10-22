// Toolbar popup. On an accelerator page: the full panel with drafting. Elsewhere: browse
// all accelerators, "Not listed? Add it", saved answers and data status.
import { send, type CoverageResponse, type IndexResponse, type LookupResponse, type RefreshResponse } from './lib/messages.ts';
import type { Accelerator, IndexEntry } from './lib/types.ts';
import { deleteAnswer, loadAnswers, saveAnswer } from './lib/answer-store.ts';
import { freshness } from './lib/freshness.ts';
import { addAcceleratorUrl } from './lib/github.ts';
import { domainMatchPatterns } from './lib/match.ts';
import { renderPanel } from './ui/panel.ts';
import { h } from './ui/dom.ts';
import { PANEL_CSS } from './ui/styles.ts';

document.head.append(h('style', {}, PANEL_CSS));
const app = document.getElementById('app')!;

let tabUrl = '';
let entries: IndexEntry[] = [];

async function showAccelerator(acc: Accelerator, back: boolean) {
  const answers = await loadAnswers();
  const entry = entries.find((e) => e.id === acc.id);
  app.replaceChildren(
    renderPanel(acc, {
      editable: true,
      answers,
      pageUrl: tabUrl,
      sourcePath: entry?.path,
      onBack: back ? () => void showHome() : undefined,
      onOpenTab: () => void send({ type: 'openPanel', id: acc.id }).then(() => window.close()),
      saveAnswer,
      deleteAnswer,
    }),
  );
  window.scrollTo(0, 0);
}

async function showHome() {
  const [{ index, fetchedAt }, answers, coverage] = await Promise.all([
    send<IndexResponse>({ type: 'getIndex' }),
    loadAnswers(),
    send<CoverageResponse>({ type: 'getCoverage' }),
  ]);
  entries = index.accelerators;
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  const list = h('ul', { class: 'pa-list' });
  const renderList = (query: string) => {
    const q = query.trim().toLowerCase();
    const hits = sorted.filter((e) => !q || e.name.toLowerCase().includes(q) || e.country.includes(q) || e.domains.some((d) => d.includes(q)));
    list.replaceChildren(
      ...hits.map((e) => {
        const f = freshness(e);
        return h('li', {},
          h('button', { type: 'button', onclick: () => void open(e.id) },
            h('span', {}, e.name, h('small', {}, `${e.country === 'global' ? 'Global' : e.country.toUpperCase()} · ${e.question_count ? `${e.question_count} questions, ${e.required_count} required` : 'no questions yet'}`)),
            h('span', { class: `pa-chip pa-fresh-${f.kind}` }, f.kind === 'verified' ? 'Verified' : f.kind === 'stale' ? 'May be outdated' : 'Not verified')));
      }),
    );
    if (!hits.length) list.append(h('li', { class: 'pa-empty' }, 'No match.'));
  };
  const search = h('input', { class: 'pa-input', type: 'search', placeholder: `Search ${entries.length} accelerators…`, 'aria-label': 'Search accelerators' });
  search.addEventListener('input', () => renderList(search.value));
  renderList('');

  const status = h('span', {}, fetchedAt ? `Data updated ${new Date(fetchedAt).toLocaleString()}` : 'Using built-in data');
  const refresh = h('button', { class: 'pa-link', type: 'button' }, 'Refresh');
  refresh.addEventListener('click', async () => {
    status.textContent = 'Refreshing…';
    const res = await send<RefreshResponse>({ type: 'refresh' });
    status.textContent = res.ok ? 'Data updated just now' : 'Offline or unavailable — using saved data';
  });

  const isWeb = /^https?:/.test(tabUrl);
  app.replaceChildren(
    h('div', { class: 'pa-panel' },
      h('header', { class: 'pa-head' }, h('h2', {}, 'PreApply'),
        h('p', { class: 'pa-meta' }, isWeb ? 'No known accelerator on this page.' : 'See every application question before you apply.')),
      isWeb && h('div', { class: 'pa-callout' },
        h('p', {}, 'Is this an accelerator? Add its questions so the next founder can see them up front.'),
        h('a', { class: 'pa-btn pa-btn-primary', href: addAcceleratorUrl(tabUrl), target: '_blank', rel: 'noopener' }, 'Not listed? Add it')),
      coverage.missing.length > 0 && enableNotice(coverage.missing),
      search,
      list,
      h('footer', { class: 'pa-foot' },
        h('button', { class: 'pa-link', type: 'button', onclick: () => void send({ type: 'openPanel', view: 'answers' }).then(() => window.close()) },
          `Saved answers (${answers.length})`),
        status, refresh)),
  );
}

function enableNotice(domains: string[]) {
  const btn = h('button', { class: 'pa-btn pa-btn-small', type: 'button' }, 'Enable');
  btn.addEventListener('click', async () => {
    const granted = await chrome.permissions.request({ origins: domains.flatMap(domainMatchPatterns) });
    if (granted) {
      await send({ type: 'syncScripts' });
      await showHome();
    }
  });
  return h('div', { class: 'pa-callout' },
    h('p', {}, `${domains.length} accelerator site${domains.length === 1 ? ' was' : 's were'} added since this version was installed. Allow PreApply to show the pill there too?`),
    btn);
}

async function open(id: string) {
  const acc = await send<Accelerator | null>({ type: 'getAccelerator', id });
  if (acc) await showAccelerator(acc, true);
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabUrl = tab?.url ?? '';
  const [{ match }, { index }] = await Promise.all([
    send<LookupResponse>({ type: 'matchUrl', url: tabUrl }),
    send<IndexResponse>({ type: 'getIndex' }),
  ]);
  entries = index.accelerators;
  if (match?.accelerator) await showAccelerator(match.accelerator, true);
  else await showHome();
}

void main();
