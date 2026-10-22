// Content script. Runs only on accelerator domains. It reads the page URL and link hrefs,
// never form contents, and sends nothing anywhere except to the extension's own worker.
import { matchesApplyUrl } from './lib/match.ts';
import { send, type ApplyTarget, type LookupResponse } from './lib/messages.ts';
import type { Accelerator } from './lib/types.ts';
import { applyMarker, createOverlay, type Overlay } from './ui/overlay.ts';

declare global {
  interface Window {
    __preapplyLoaded?: boolean;
  }
}

async function main() {
  if (window.__preapplyLoaded || window.top !== window) return;
  window.__preapplyLoaded = true;

  const res = await send<LookupResponse>({ type: 'lookup', href: location.href });
  if (!res || 'error' in res) return;

  let overlay: Overlay | null = null;
  const getOverlay = () =>
    (overlay ??= createOverlay({
      pageUrl: location.href,
      sourcePath: (id) => (res.match?.entry.id === id ? res.match.entry.path : undefined),
    }));

  const openById = async (id: string) => {
    const acc = res.match?.accelerator?.id === id ? res.match.accelerator : await send<Accelerator | null>({ type: 'getAccelerator', id });
    if (acc) await getOverlay().openPanel(acc);
  };

  if (res.match?.accelerator) await getOverlay().showPill(res.match.accelerator);

  if (res.applyTargets.length) {
    markApplyLinks(res.applyTargets, openById);
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        markApplyLinks(res.applyTargets, openById);
      }, 500);
    }).observe(document.body, { childList: true, subtree: true });
  }
}

const scanned = new WeakSet<HTMLAnchorElement>();

function markApplyLinks(targets: ApplyTarget[], open: (id: string) => void) {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (scanned.has(a)) continue;
    scanned.add(a);
    const target = targets.find((t) => matchesApplyUrl(a.href, t.patterns));
    if (!target) continue;
    a.after(applyMarker(`PreApply: see ${target.name}'s questions before applying`, () => open(target.id)));
  }
}

void main();
