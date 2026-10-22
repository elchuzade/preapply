// Shared styles. Scoped under .pa so they work in the shadow root and in extension pages.
// Palette follows abbox: zinc neutrals, orange accent (#f97316), 6px radius. Dark mode uses
// abbox's values as-is; light mode is the same family inverted.
export const PANEL_CSS = `
.pa {
  --pa-bg: #ffffff; --pa-card: #ffffff; --pa-fg: #09090b; --pa-muted: #52525b; --pa-border: #e4e4e7; --pa-border-strong: #d4d4d8;
  --pa-soft: #f4f4f5; --pa-gray-soft: #f4f4f5;
  --pa-accent: #f97316; --pa-accent-hover: #fb923c; --pa-accent-fg: #09090b; --pa-accent-soft: #ffedd5; --pa-link: #c2410c;
  --pa-green: #15803d; --pa-green-soft: #f0fdf4; --pa-green-border: #bbf7d0;
  --pa-amber: #a16207; --pa-amber-soft: #fefce8; --pa-amber-border: #fde68a;
  --pa-red: #dc2626; --pa-tip-bg: #18181b; --pa-tip-fg: #fafafa; --pa-tip-border: #18181b;
  --pa-radius: 6px;
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--pa-fg); background: var(--pa-bg); color-scheme: light;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  .pa {
    --pa-bg: #09090b; --pa-card: #18181b; --pa-fg: #fafafa; --pa-muted: #a1a1aa; --pa-border: #27272a; --pa-border-strong: #3f3f46;
    --pa-soft: #27272a; --pa-gray-soft: #27272a;
    --pa-accent: #f97316; --pa-accent-hover: #fb923c; --pa-accent-fg: #09090b; --pa-accent-soft: #431407; --pa-link: #fb923c;
    --pa-green: #86efac; --pa-green-soft: #14281a; --pa-green-border: #166534;
    --pa-amber: #fcd34d; --pa-amber-soft: #2a2010; --pa-amber-border: #92400e;
    --pa-red: #fca5a5; --pa-tip-bg: #27272a; --pa-tip-fg: #fafafa; --pa-tip-border: #3f3f46;
    color-scheme: dark;
  }
}
.pa *, .pa *::before, .pa *::after { box-sizing: border-box; }
.pa [hidden] { display: none !important; }
.pa h2 { font-size: 18px; line-height: 1.25; margin: 0 0 4px; font-weight: 650; }
.pa h3 { font-size: 13px; margin: 0; font-weight: 650; text-transform: uppercase; letter-spacing: .04em; color: var(--pa-muted); }
.pa a { color: var(--pa-link); text-decoration: none; }
.pa a:hover { text-decoration: underline; }
.pa p { margin: 0; }
.pa button, .pa select, .pa textarea, .pa input { font: inherit; color: inherit; }
.pa :focus-visible { outline: 2px solid var(--pa-accent); outline-offset: 2px; }

.pa-panel { display: flex; flex-direction: column; gap: 14px; padding: 16px; }
.pa-head h2 a { color: var(--pa-fg); }
.pa-meta { color: var(--pa-muted); font-size: 13px; margin-bottom: 6px; }
.pa-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 550; padding: 2px 8px; border-radius: var(--pa-radius); border: 1px solid var(--pa-border); background: var(--pa-gray-soft); color: var(--pa-muted); white-space: nowrap; }
.pa-head .pa-chip { margin-top: 2px; }
.pa-fresh-verified { background: var(--pa-green-soft); color: var(--pa-green); border-color: var(--pa-green-border); }
.pa-fresh-stale { background: var(--pa-amber-soft); color: var(--pa-amber); border-color: var(--pa-amber-border); }
.pa-callout { border: 1px solid var(--pa-border); background: var(--pa-card); border-radius: var(--pa-radius); padding: 10px 12px; font-size: 13px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.pa-summary { font-weight: 600; }
.pa-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.pa-toolbar { position: sticky; top: 0; z-index: 2; margin: -6px -16px 0; padding: 6px 16px; background: var(--pa-bg);
  border-bottom: 1px solid var(--pa-border); display: flex; justify-content: flex-end; align-items: center; }
.pa-toolbar .pa-actions { gap: 6px; }
.pa-btn-icon { padding: 6px; }
.pa-btn-icon svg { display: block; }
/* Tooltips anchor to the sticky toolbar (a positioned box), so they always fit inside it. */
.pa-tip { display: inline-flex; }
.pa-tip::after { content: attr(data-tip); position: absolute; top: calc(100% + 6px); left: 16px; right: 16px; padding: 8px 10px; border-radius: var(--pa-radius);
  background: var(--pa-tip-bg); color: var(--pa-tip-fg); border: 1px solid var(--pa-tip-border); font-size: 12px; line-height: 1.45; font-weight: 450; white-space: normal;
  box-shadow: 0 6px 20px rgba(0,0,0,.2); opacity: 0; transform: translateY(-2px); transition: opacity .12s, transform .12s; pointer-events: none; z-index: 3; }
.pa-tip:hover::after, .pa-tip:focus-within::after { opacity: 1; transform: none; }
.pa-btn { appearance: none; border: 1px solid var(--pa-border); background: var(--pa-card); border-radius: var(--pa-radius); padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 550; text-decoration: none !important; color: var(--pa-fg) !important; display: inline-flex; align-items: center; gap: 6px; }
.pa-btn:hover { background: var(--pa-soft); border-color: var(--pa-border-strong); }
.pa-btn-primary { background: var(--pa-accent); border-color: var(--pa-accent); color: var(--pa-accent-fg) !important; }
.pa-btn-primary:hover { background: var(--pa-accent-hover); border-color: var(--pa-accent-hover); }
.pa-link { appearance: none; border: 0; background: none; padding: 0; color: var(--pa-link); cursor: pointer; font-size: 13px; }
.pa-link:hover { text-decoration: underline; }

.pa-step { display: flex; flex-direction: column; gap: 10px; }
.pa-step-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; border-top: 1px solid var(--pa-border); padding-top: 14px; }
.pa-step-count { font-size: 12px; color: var(--pa-muted); white-space: nowrap; }
.pa-step-intro { color: var(--pa-muted); font-size: 13px; }
.pa-qs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pa-q { border: 1px solid var(--pa-border); background: var(--pa-card); border-radius: var(--pa-radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.pa .pa-q-text { font-size: 15px; line-height: 1.5; font-weight: 550; }
.pa-star { color: var(--pa-red); font-weight: 700; }
.pa-legend { display: block; font-weight: 400; color: var(--pa-muted); font-size: 13px; margin-top: 2px; }
.pa-limit { color: var(--pa-muted); font-size: 12px; }
.pa .pa-hint { color: var(--pa-muted); font-size: 13.5px; line-height: 1.5; }
.pa-foot { border-top: 1px solid var(--pa-border); padding-top: 10px; font-size: 12px; color: var(--pa-muted); display: flex; flex-wrap: wrap; gap: 4px 12px; }
.pa-empty { color: var(--pa-muted); font-size: 13px; }

.pa-input { width: 100%; border: 1px solid var(--pa-border); border-radius: var(--pa-radius); padding: 7px 10px; background: var(--pa-card); }
.pa-input:focus { outline: none; border-color: var(--pa-accent); box-shadow: 0 0 0 3px var(--pa-accent-soft); }
.pa-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.pa-list button { appearance: none; width: 100%; text-align: left; border: 0; border-top: 1px solid var(--pa-border); background: none; padding: 10px 2px; cursor: pointer; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.pa-list button:hover { background: var(--pa-soft); }
.pa-list small { color: var(--pa-muted); display: block; font-size: 12px; }
`;

