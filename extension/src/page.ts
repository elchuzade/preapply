// Full-tab extension page (panel.html?id=<accelerator>): the same question panel, with room to read.
import { send, type IndexResponse } from './lib/messages.ts';
import type { Accelerator } from './lib/types.ts';
import { renderPanel } from './ui/panel.ts';
import { h } from './ui/dom.ts';
import { PANEL_CSS } from './ui/styles.ts';

document.head.append(h('style', {}, PANEL_CSS));
const app = document.getElementById('app')!;

async function main() {
  const id = new URLSearchParams(location.search).get('id') ?? '';
  const [acc, { index }] = await Promise.all([
    send<Accelerator | null>({ type: 'getAccelerator', id }),
    send<IndexResponse>({ type: 'getIndex' }),
  ]);
  if (!acc) {
    app.replaceChildren(h('div', { class: 'pa-panel' }, h('p', {}, `Unknown accelerator “${id}”.`)));
    return;
  }
  document.title = `${acc.name} — PreApply`;
  app.replaceChildren(renderPanel(acc, { sourcePath: index.accelerators.find((e) => e.id === id)?.path }));
}

void main();
