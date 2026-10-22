import { describe, it, expect } from 'vitest';
import { applyUrlHosts, findByHostname, findForUrl, siteDomains, globToRegExp, hostMatchesDomain, matchesApplyUrl, uncoveredDomains, domainMatchPatterns } from './match.ts';
import { makeEntry } from './fixtures.test-helpers.ts';

describe('hostMatchesDomain', () => {
  it('matches the domain, www and subdomains', () => {
    expect(hostMatchesDomain('join-thebridge.com', 'join-thebridge.com')).toBe(true);
    expect(hostMatchesDomain('www.join-thebridge.com', 'join-thebridge.com')).toBe(true);
    expect(hostMatchesDomain('apply.ycombinator.com', 'ycombinator.com')).toBe(true);
    expect(hostMatchesDomain('WWW.Seedcamp.com.', 'seedcamp.com')).toBe(true);
  });
  it('does not match lookalikes', () => {
    expect(hostMatchesDomain('notycombinator.com', 'ycombinator.com')).toBe(false);
    expect(hostMatchesDomain('ycombinator.com.evil.io', 'ycombinator.com')).toBe(false);
  });
});

describe('findByHostname', () => {
  it('prefers the most specific domain', () => {
    const broad = makeEntry({ id: 'broad', domains: ['example.com'] });
    const narrow = makeEntry({ id: 'narrow', domains: ['program.example.com'] });
    expect(findByHostname([broad, narrow], 'program.example.com')?.id).toBe('narrow');
    expect(findByHostname([broad, narrow], 'www.example.com')?.id).toBe('broad');
    expect(findByHostname([broad, narrow], 'other.org')).toBeUndefined();
  });
});

describe('findForUrl', () => {
  const ef = makeEntry({ id: 'ef', domains: ['joinef.com'] });
  const bridge = makeEntry({ id: 'bridge', domains: ['join-thebridge.com'], apply_urls: ['https://apply.joinef.com/app/*thebridge*'] });
  it('prefers an apply_urls match over the domain match', () => {
    expect(findForUrl([ef, bridge], 'https://apply.joinef.com/app/san-francisco-thebridge-winter/')?.id).toBe('bridge');
    expect(findForUrl([ef, bridge], 'https://apply.joinef.com/app/london/')?.id).toBe('ef');
    expect(findForUrl([ef, bridge], 'https://www.join-thebridge.com/')?.id).toBe('bridge');
  });
  it('ignores non-web URLs', () => {
    expect(findForUrl([ef, bridge], 'chrome://newtab')).toBeUndefined();
    expect(findForUrl([ef, bridge], 'not a url')).toBeUndefined();
  });
});

describe('apply url globs', () => {
  it('treats * as wildcard and the rest literally', () => {
    const re = globToRegExp('https://www.join-thebridge.com/apply*');
    expect(re.test('https://www.join-thebridge.com/apply')).toBe(true);
    expect(re.test('https://www.join-thebridge.com/apply?ref=x')).toBe(true);
    expect(re.test('https://www.join-thebridge.com/about')).toBe(false);
    expect(globToRegExp('https://a.com/x.y').test('https://a.com/xzy')).toBe(false);
  });
  it('ignores a www. difference', () => {
    expect(matchesApplyUrl('https://join-thebridge.com/apply/now', ['https://www.join-thebridge.com/apply*'])).toBe(true);
    expect(matchesApplyUrl('https://www.apply.ycombinator.com/', ['https://apply.ycombinator.com/*'])).toBe(true);
    expect(matchesApplyUrl('https://example.com/', [])).toBe(false);
  });
});

describe('site domains', () => {
  it('adds the hosts of apply_urls', () => {
    expect(applyUrlHosts(['https://apply.joinef.com/app/*thebridge*', 'https://www.x.com/apply*', 'https://*.y.com/*', 'https://z*.com/'])).toEqual([
      'apply.joinef.com',
      'x.com',
      'y.com',
    ]);
    expect(siteDomains({ domains: ['join-thebridge.com'], apply_urls: ['https://www.join-thebridge.com/apply*', 'https://apply.joinef.com/app/*'] })).toEqual([
      'join-thebridge.com',
      'apply.joinef.com',
    ]);
  });
});

describe('uncoveredDomains', () => {
  it('lists domains missing from the manifest patterns', () => {
    const entries = [makeEntry({ domains: ['a.com'] }), makeEntry({ id: 'b', domains: ['b.com', 'a.com'], apply_urls: ['https://forms.c.com/b*'] })];
    expect(uncoveredDomains(entries, domainMatchPatterns('a.com'))).toEqual(['b.com', 'forms.c.com']);
    expect(uncoveredDomains(entries, ['*://a.com/*'])).toEqual(['a.com', 'b.com', 'forms.c.com']);
  });
});
