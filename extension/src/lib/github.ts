import { GITHUB_REPO } from '../config.ts';

/** Origin + path only, so tokens in query strings or fragments never leave the browser. */
export function cleanPageUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '';
  }
}

function issueUrl(template: string, fields: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ template });
  for (const [k, v] of Object.entries(fields)) if (v) params.set(k, v);
  return `https://github.com/${GITHUB_REPO}/issues/new?${params}`;
}

export function questionsChangedUrl(acceleratorId: string, pageUrl?: string): string {
  return issueUrl('questions-changed.yml', {
    title: `[Changed] ${acceleratorId}`,
    accelerator_id: acceleratorId,
    page_url: pageUrl && cleanPageUrl(pageUrl),
  });
}

export function addAcceleratorUrl(pageUrl?: string): string {
  let website: string | undefined;
  try {
    website = pageUrl ? new URL(pageUrl).origin : undefined;
  } catch {
    website = undefined;
  }
  return issueUrl('add-accelerator.yml', { website: website?.startsWith('http') ? website : undefined });
}

export function sourceFileUrl(path: string): string {
  return `https://github.com/${GITHUB_REPO}/blob/main/data/${path}`;
}
