// Service worker: keeps the index fresh, answers lookups, sets the toolbar badge.
import bundledJson from './generated/bundled.json';
import { DATA_BASE_URL, REFRESH_MINUTES } from './config.ts';
import { getAccelerator, getIndex, refreshIndex, type DataDeps } from './lib/data.ts';
import { chromeStore } from './lib/chrome-store.ts';
import { domainMatchPatterns, findForUrl, uncoveredDomains } from './lib/match.ts';
import { freshness } from './lib/freshness.ts';
import type { ApplyTarget, CoverageResponse, LookupResponse, Match, Request } from './lib/messages.ts';
import type { BundledData } from './lib/types.ts';

const ALARM = 'preapply-refresh';
const DYNAMIC_SCRIPT_ID = 'preapply-dynamic';

const deps: DataDeps = {
  fetch: (url, init) => fetch(url, init),
  store: chromeStore,
  baseUrl: DATA_BASE_URL,
  bundled: bundledJson as BundledData,
};

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM))) chrome.alarms.create(ALARM, { periodInMinutes: REFRESH_MINUTES });
}

async function refreshAll() {
  const res = await refreshIndex(deps);
  await syncDynamicScripts();
  return res;
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureAlarm();
  void refreshAll();
});
chrome.runtime.onStartup.addListener(() => void ensureAlarm());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void refreshAll();
});
chrome.permissions.onAdded.addListener(() => void syncDynamicScripts());
chrome.permissions.onRemoved.addListener(() => void syncDynamicScripts());

/** Domains added to the index after this build aren't in the manifest; list those. */
async function coverage(): Promise<{ missing: string[]; granted: string[] }> {
  const { index } = await getIndex(deps);
  const manifestMatches = chrome.runtime.getManifest().content_scripts?.flatMap((c) => c.matches ?? []) ?? [];
  const uncovered = uncoveredDomains(index.accelerators, manifestMatches);
  const missing: string[] = [];
  const granted: string[] = [];
  for (const domain of uncovered) {
    const has = await chrome.permissions.contains({ origins: domainMatchPatterns(domain) });
    (has ? granted : missing).push(domain);
  }
  return { missing, granted };
}

/** Registers the content script on newly added domains the user has granted access to. */
async function syncDynamicScripts() {
  const { granted } = await coverage();
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
  if (granted.length) {
    await chrome.scripting.registerContentScripts([
      { id: DYNAMIC_SCRIPT_ID, matches: granted.flatMap(domainMatchPatterns), js: ['content.js'], runAt: 'document_idle' },
    ]);
  }
}

async function matchUrl(url: string): Promise<LookupResponse> {
  const { index } = await getIndex(deps);
  const applyTargets: ApplyTarget[] = index.accelerators
    .filter((e) => e.apply_urls.length)
    .map((e) => ({ id: e.id, name: e.name, patterns: e.apply_urls }));
  const entry = findForUrl(index.accelerators, url);
  if (!entry) return { match: null, applyTargets };
  const acc = await getAccelerator(entry.id, deps);
  const match: Match = { entry, accelerator: acc?.accelerator ?? null };
  return { match, applyTargets };
}

const BADGE_COLORS = { verified: '#15803d', stale: '#b45309', unverified: '#6b7280' } as const;

async function setBadge(tabId: number, match: Match | null) {
  if (!match) {
    await chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }
  const source = match.accelerator ?? match.entry;
  const kind = freshness(source).kind;
  const count = match.accelerator ? match.accelerator.steps.reduce((n, s) => n + s.questions.length, 0) : match.entry.question_count;
  await chrome.action.setBadgeText({ tabId, text: kind === 'unverified' && !count ? '?' : String(count) });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLORS[kind] });
  await chrome.action.setTitle({ tabId, title: `PreApply: ${match.entry.name}` });
}

async function handle(msg: Request, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (msg.type) {
    case 'lookup': {
      const res = await matchUrl(msg.href);
      if (sender.tab?.id !== undefined && sender.frameId === 0) await setBadge(sender.tab.id, res.match);
      return res;
    }
    case 'matchUrl':
      return matchUrl(msg.url);
    case 'getIndex':
      return getIndex(deps);
    case 'getAccelerator':
      return (await getAccelerator(msg.id, deps))?.accelerator ?? null;
    case 'refresh':
      return refreshAll();
    case 'openPanel': {
      const params = new URLSearchParams(msg.id ? { id: msg.id } : { view: msg.view ?? 'answers' });
      await chrome.tabs.create({ url: chrome.runtime.getURL(`panel.html?${params}`) });
      return null;
    }
    case 'getCoverage':
      return { missing: (await coverage()).missing } satisfies CoverageResponse;
    case 'syncScripts':
      await syncDynamicScripts();
      return null;
  }
}

chrome.runtime.onMessage.addListener((msg: Request, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse, (e) => sendResponse({ error: String(e) }));
  return true; // async response
});
