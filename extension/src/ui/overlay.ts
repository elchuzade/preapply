// In-page UI: a collapsible pill (bottom-right) and a read-only side drawer, inside a
// closed shadow root so host-page CSS and scripts can't reach them.
import type { Accelerator } from '../lib/types.ts';
import { pillText, summarize } from '../lib/summary.ts';
import { freshness } from '../lib/freshness.ts';
import { renderPanel } from './panel.ts';
import { h } from './dom.ts';
import { PANEL_CSS } from './styles.ts';

const OVERLAY_CSS = `
:host { all: initial; }
.pa-pill-wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; display: flex; align-items: center; gap: 0;
  border-radius: 999px; box-shadow: 0 6px 24px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.12); border: 1px solid var(--pa-border); overflow: hidden; max-width: calc(100vw - 32px); }
.pa-pill { appearance: none; border: 0; background: var(--pa-bg); color: var(--pa-fg); padding: 9px 14px; cursor: pointer; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px; text-align: left; }
.pa-pill:hover { background: var(--pa-soft); }
.pa-dot { width: 22px; height: 22px; border-radius: 50%; background: var(--pa-accent); color: var(--pa-accent-fg); display: grid; place-items: center; font-size: 11px; font-weight: 800; flex: none; }
.pa-dot-stale { background: var(--pa-amber); }
.pa-collapse { appearance: none; border: 0; border-left: 1px solid var(--pa-border); background: var(--pa-bg); color: var(--pa-muted); padding: 9px 10px; cursor: pointer; font-size: 14px; line-height: 1; }
.pa-collapse:hover { background: var(--pa-soft); color: var(--pa-fg); }
.pa-collapsed .pa-pill-text, .pa-collapsed .pa-collapse { display: none; }
.pa-collapsed .pa-pill { padding: 7px; }
.pa-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); z-index: 2147483647; display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,.22); border-left: 1px solid var(--pa-border); }
.pa-drawer-bar { flex: none; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px;
  background: var(--pa-bg); border-bottom: 1px solid var(--pa-border); font-weight: 700; font-size: 13px; }
.pa-drawer-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
.pa-close { appearance: none; border: 0; background: none; font-size: 20px; line-height: 1; cursor: pointer; color: var(--pa-muted); padding: 2px 6px; border-radius: 6px; }
.pa-close:hover { background: var(--pa-soft); color: var(--pa-fg); }
`;

const COLLAPSE_KEY = 'ui:pillCollapsed';

export interface Overlay {
  showPill(acc: Accelerator): Promise<void>;
  openPanel(acc: Accelerator): Promise<void>;
}

export function createOverlay(opts: { pageUrl: string; sourcePath?: (id: string) => string | undefined }): Overlay {
  const host = h('div', { id: 'preapply-root' });
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.append(h('style', {}, PANEL_CSS + OVERLAY_CSS));
  const layer = h('div', { class: 'pa' });
  shadow.append(layer);
  document.documentElement.append(host);

  let drawer: HTMLElement | null = null;

  const close = () => {
    drawer?.remove();
    drawer = null;
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer) close();
  });

  const openPanel = async (acc: Accelerator) => {
    const panel = renderPanel(acc, { pageUrl: opts.pageUrl, sourcePath: opts.sourcePath?.(acc.id) });
    const next = h('aside', { class: 'pa-drawer pa', role: 'dialog', 'aria-label': `PreApply: ${acc.name}` },
      h('div', { class: 'pa-drawer-bar' }, h('span', {}, 'PreApply'),
        h('button', { class: 'pa-close', type: 'button', 'aria-label': 'Close', onclick: close }, '×')),
      h('div', { class: 'pa-drawer-body' }, panel));
    if (drawer) drawer.replaceWith(next);
    else layer.append(next);
    drawer = next;
  };

  const showPill = async (acc: Accelerator) => {
    const stored = await chrome.storage.local.get(COLLAPSE_KEY);
    let collapsed = stored[COLLAPSE_KEY] === true;
    const kind = freshness(acc).kind;
    const total = summarize(acc).total;
    const wrap = h('div', { class: 'pa-pill-wrap' });
    const render = () => {
      wrap.className = `pa-pill-wrap${collapsed ? ' pa-collapsed' : ''}`;
    };
    const pill = h('button', { class: 'pa-pill', type: 'button', title: pillText(acc), 'aria-label': pillText(acc) },
      h('span', { class: `pa-dot pa-dot-${kind}` }, total),
      h('span', { class: 'pa-pill-text' }, pillText(acc)));
    pill.addEventListener('click', () => {
      if (collapsed) {
        collapsed = false;
        void chrome.storage.local.set({ [COLLAPSE_KEY]: false });
        render();
      }
      void openPanel(acc);
    });
    const collapse = h('button', { class: 'pa-collapse', type: 'button', title: 'Minimise', 'aria-label': 'Minimise PreApply' }, '–');
    collapse.addEventListener('click', () => {
      collapsed = true;
      void chrome.storage.local.set({ [COLLAPSE_KEY]: true });
      render();
    });
    wrap.append(pill, collapse);
    render();
    layer.prepend(wrap);
  };

  return { showPill, openPanel };
}

/** Small marker placed after an apply link. Its own shadow root keeps it unstyled by the page. */
export function applyMarker(label: string, onClick: () => void): HTMLElement {
  const marker = h('span', { 'data-preapply-marker': '' });
  const shadow = marker.attachShadow({ mode: 'closed' });
  const style = h('style', {}, `
    :host { all: initial; display: inline-block; vertical-align: middle; margin-left: 6px; }
    button { all: initial; cursor: pointer; font: 700 10px/1 system-ui, sans-serif; letter-spacing: .02em; color: #09090b; background: #f97316;
      border-radius: 6px; padding: 3px 6px; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
    button:hover { background: #fb923c; }
    button:focus-visible { outline: 2px solid #f97316; outline-offset: 2px; }
  `);
  const btn = h('button', { type: 'button', title: label, 'aria-label': label }, 'PreApply');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  shadow.append(style, btn);
  return marker;
}
