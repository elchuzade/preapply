// Shared styles. Scoped under .pa so they work in the shadow root and in extension pages.
export const PANEL_CSS = `
.pa {
  --pa-bg: #ffffff; --pa-fg: #18181b; --pa-muted: #63636e; --pa-border: #e4e4e7; --pa-soft: #f4f4f5;
  --pa-accent: #5b4cf5; --pa-accent-fg: #ffffff; --pa-accent-soft: #eeebff;
  --pa-green: #15803d; --pa-green-soft: #dcfce7; --pa-amber: #a16207; --pa-amber-soft: #fef3c7;
  --pa-red: #b91c1c; --pa-gray-soft: #ececf0;
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--pa-fg); background: var(--pa-bg); color-scheme: light;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  .pa {
    --pa-bg: #17171c; --pa-fg: #ececf1; --pa-muted: #a1a1ad; --pa-border: #2e2e37; --pa-soft: #22222a;
    --pa-accent: #8b80ff; --pa-accent-fg: #0f0f14; --pa-accent-soft: #2a2550;
    --pa-green: #4ade80; --pa-green-soft: #12301f; --pa-amber: #fbbf24; --pa-amber-soft: #3a2c0a;
    --pa-red: #f87171; --pa-gray-soft: #2a2a33;
    color-scheme: dark;
  }
}
.pa *, .pa *::before, .pa *::after { box-sizing: border-box; }
.pa [hidden] { display: none !important; }
.pa h2 { font-size: 18px; line-height: 1.25; margin: 0 0 4px; font-weight: 650; }
.pa h3 { font-size: 13px; margin: 0; font-weight: 650; text-transform: uppercase; letter-spacing: .04em; color: var(--pa-muted); }
.pa a { color: var(--pa-accent); text-decoration: none; }
.pa a:hover { text-decoration: underline; }
.pa p { margin: 0; }
.pa button, .pa select, .pa textarea, .pa input { font: inherit; color: inherit; }
.pa :focus-visible { outline: 2px solid var(--pa-accent); outline-offset: 2px; }

.pa-panel { display: flex; flex-direction: column; gap: 14px; padding: 16px; }
.pa-head h2 a { color: var(--pa-fg); }
.pa-meta { color: var(--pa-muted); font-size: 13px; margin-bottom: 6px; }
.pa-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 550; padding: 2px 8px; border-radius: 999px; background: var(--pa-gray-soft); color: var(--pa-muted); white-space: nowrap; }
.pa-fresh-verified { background: var(--pa-green-soft); color: var(--pa-green); }
.pa-fresh-stale { background: var(--pa-amber-soft); color: var(--pa-amber); }
.pa-fresh-unverified { background: var(--pa-gray-soft); color: var(--pa-muted); }
.pa-callout { border: 1px solid var(--pa-border); background: var(--pa-soft); border-radius: 10px; padding: 10px 12px; font-size: 13px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.pa-callout-warn { border-color: transparent; background: var(--pa-amber-soft); color: var(--pa-amber); }
.pa-summary { font-weight: 600; }
.pa-ready { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--pa-muted); }
.pa-bar { height: 6px; border-radius: 99px; background: var(--pa-gray-soft); overflow: hidden; }
.pa-bar > span { display: block; height: 100%; background: var(--pa-accent); border-radius: inherit; transition: width .2s; }
.pa-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.pa-btn { appearance: none; border: 1px solid var(--pa-border); background: var(--pa-bg); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 550; text-decoration: none !important; color: var(--pa-fg) !important; display: inline-flex; align-items: center; gap: 6px; }
.pa-btn:hover { background: var(--pa-soft); }
.pa-btn-primary { background: var(--pa-accent); border-color: var(--pa-accent); color: var(--pa-accent-fg) !important; }
.pa-btn-primary:hover { background: var(--pa-accent); filter: brightness(1.08); }
.pa-btn-small { padding: 3px 8px; font-size: 12px; }
.pa-link { appearance: none; border: 0; background: none; padding: 0; color: var(--pa-accent); cursor: pointer; font-size: 13px; }
.pa-link:hover { text-decoration: underline; }

.pa-step { display: flex; flex-direction: column; gap: 8px; }
.pa-step-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; border-top: 1px solid var(--pa-border); padding-top: 12px; }
.pa-step-intro { color: var(--pa-muted); font-size: 13px; }
.pa-qs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pa-q { border: 1px solid var(--pa-border); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.pa-q-top { display: flex; gap: 10px; align-items: flex-start; }
.pa-type { flex: none; width: 26px; height: 26px; border-radius: 7px; background: var(--pa-accent-soft); color: var(--pa-accent); display: grid; place-items: center; font-size: 13px; font-weight: 700; }
.pa-q-text { flex: 1; font-weight: 550; }
.pa-q-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 36px; }
.pa-req { background: var(--pa-accent-soft); color: var(--pa-accent); }
.pa-hint { color: var(--pa-muted); font-size: 13px; margin-left: 36px; }
.pa-drafted { background: var(--pa-green-soft); color: var(--pa-green); }
.pa-draft { margin-left: 36px; display: flex; flex-direction: column; gap: 6px; }
.pa-draft textarea, .pa-input { width: 100%; border: 1px solid var(--pa-border); border-radius: 8px; padding: 8px 10px; background: var(--pa-bg); resize: vertical; min-height: 38px; }
.pa-draft select { width: 100%; border: 1px solid var(--pa-border); border-radius: 8px; padding: 5px 8px; background: var(--pa-soft); font-size: 13px; }
.pa-draft-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; color: var(--pa-muted); }
.pa-over { color: var(--pa-red); font-weight: 600; }
.pa-foot { border-top: 1px solid var(--pa-border); padding-top: 10px; font-size: 12px; color: var(--pa-muted); display: flex; flex-wrap: wrap; gap: 4px 12px; }
.pa-empty { color: var(--pa-muted); font-size: 13px; }

.pa-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.pa-list button { appearance: none; width: 100%; text-align: left; border: 0; border-top: 1px solid var(--pa-border); background: none; padding: 10px 2px; cursor: pointer; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.pa-list button:hover { background: var(--pa-soft); }
.pa-list small { color: var(--pa-muted); display: block; font-size: 12px; }
`;

export const TYPE_ICONS: Record<string, string> = {
  short_text: 'Aa',
  long_text: '¶',
  url: '↗',
  video: '▶',
  file: '⎙',
  choice: '☰',
  references: '☏',
  other: '•',
};

export const TYPE_LABELS: Record<string, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  url: 'Link',
  video: 'Video',
  file: 'File upload',
  choice: 'Choice',
  references: 'References',
  other: 'Other',
};
