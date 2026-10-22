// Tiny DOM builder. Text always goes in as text nodes, never as HTML, so community
// data can't inject markup.
export type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'value' || k === 'checked') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, ...children);
  return el;
}

export function append(el: Node & ParentNode, ...children: Child[]): void {
  for (const c of children) if (c != null && c !== false) el.append(typeof c === 'number' ? String(c) : c);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** A button that runs an async action and briefly shows a confirmation label. */
export function actionButton(label: string, action: () => Promise<boolean | void>, opts: { class?: string; done?: string } = {}) {
  const btn = h('button', { class: opts.class ?? 'pa-btn', type: 'button' }, label);
  btn.addEventListener('click', async () => {
    const ok = await action();
    if (ok === false) return;
    btn.textContent = opts.done ?? 'Done ✓';
    setTimeout(() => (btn.textContent = label), 1500);
  });
  return btn;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
