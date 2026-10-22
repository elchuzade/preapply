// Matching page hostnames and links against the index.
import type { IndexEntry } from './types.ts';

export function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
}

/** True when `hostname` is `domain` or one of its subdomains. */
export function hostMatchesDomain(hostname: string, domain: string): boolean {
  const h = normalizeHost(hostname);
  const d = normalizeHost(domain);
  return h === d || h.endsWith(`.${d}`);
}

/** The entry whose domain matches the hostname most specifically. */
export function findByHostname(entries: IndexEntry[], hostname: string): IndexEntry | undefined {
  let best: { entry: IndexEntry; length: number } | undefined;
  for (const entry of entries) {
    for (const domain of entry.domains) {
      if (hostMatchesDomain(hostname, domain) && (!best || domain.length > best.length)) best = { entry, length: domain.length };
    }
  }
  return best?.entry;
}

/**
 * The accelerator for a page: one whose apply_urls match the full URL wins (e.g. a program's
 * form hosted on a parent organisation's domain), otherwise the most specific domain match.
 */
export function findForUrl(entries: IndexEntry[], url: string): IndexEntry | undefined {
  let hostname: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    hostname = u.hostname;
  } catch {
    return undefined; // not a web page (chrome://, about:blank…)
  }
  return entries.find((e) => matchesApplyUrl(url, e.apply_urls)) ?? findByHostname(entries, hostname);
}

/** Glob where `*` matches anything (including `/`); everything else is literal. */
export function globToRegExp(glob: string): RegExp {
  const body = glob
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}$`, 'i');
}

function withoutWww(url: string): string {
  return url.replace(/^(https?:\/\/)www\./i, '$1');
}

export function matchesApplyUrl(url: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    const re = globToRegExp(withoutWww(p));
    return re.test(withoutWww(url));
  });
}

/** Chrome match patterns covering a domain and its subdomains. */
export function domainMatchPatterns(domain: string): string[] {
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}

/** Hosts named in apply_urls globs, e.g. a program's form hosted on a parent organisation's site. */
export function applyUrlHosts(patterns: string[]): string[] {
  return patterns.flatMap((p) => {
    const host = /^https?:\/\/([^/?#]+)/i.exec(p)?.[1]?.toLowerCase().replace(/^\*\./, '').replace(/^www\./, '');
    return host && !host.includes('*') ? [host] : [];
  });
}

/** Every domain the content script should run on for an accelerator: its own and its form's. */
export function siteDomains(entry: { domains: string[]; apply_urls?: string[] }): string[] {
  return [...new Set([...entry.domains, ...applyUrlHosts(entry.apply_urls ?? [])])];
}

/** Index domains that are not covered by the given (manifest) match patterns. */
export function uncoveredDomains(entries: IndexEntry[], coveredPatterns: string[]): string[] {
  const covered = new Set(coveredPatterns);
  const domains = new Set(entries.flatMap(siteDomains));
  return [...domains].filter((d) => !domainMatchPatterns(d).every((p) => covered.has(p))).sort();
}
