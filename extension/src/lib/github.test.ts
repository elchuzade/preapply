import { describe, it, expect } from 'vitest';
import { addAcceleratorUrl, cleanPageUrl, questionsChangedUrl } from './github.ts';
import { GITHUB_REPO } from '../config.ts';

describe('github links', () => {
  it('strips query strings and fragments', () => {
    expect(cleanPageUrl('https://a.com/apply?token=secret#x')).toBe('https://a.com/apply');
  });
  it('prefills the questions-changed form', () => {
    const url = new URL(questionsChangedUrl('the-bridge', 'https://www.join-thebridge.com/apply?email=me'));
    expect(url.pathname).toBe(`/${GITHUB_REPO}/issues/new`);
    expect(url.searchParams.get('template')).toBe('questions-changed.yml');
    expect(url.searchParams.get('accelerator_id')).toBe('the-bridge');
    expect(url.searchParams.get('page_url')).toBe('https://www.join-thebridge.com/apply');
  });
  it('prefills the website on add-accelerator, ignoring non-http pages', () => {
    expect(new URL(addAcceleratorUrl('https://new.vc/programs?x=1')).searchParams.get('website')).toBe('https://new.vc');
    expect(new URL(addAcceleratorUrl('chrome://newtab')).searchParams.get('website')).toBeNull();
  });
});
