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

/** Index domains that are not covered by the given (manifest) match patterns. */
export function uncoveredDomains(entries: IndexEntry[], coveredPatterns: string[]): string[] {
  const covered = new Set(coveredPatterns);
  const domains = new Set(entries.flatMap((e) => e.domains));
  return [...domains].filter((d) => !domainMatchPatterns(d).every((p) => covered.has(p))).sort();
}
