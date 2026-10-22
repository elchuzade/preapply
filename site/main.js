// Install link: set STORE_URL to the Chrome Web Store listing once it's live.
const STORE_URL = '';
const RELEASES_URL = 'https://github.com/elchuzade/preapply/releases/latest';
const DATA_URL = 'https://cdn.jsdelivr.net/gh/elchuzade/preapply@main/data/index.json';

for (const a of document.querySelectorAll('[data-install]')) {
  a.href = STORE_URL || RELEASES_URL;
  if (!STORE_URL) a.querySelector('[data-label]')?.replaceChildren('Download for Chrome');
}

const list = document.getElementById('acc-list');
if (list) {
  fetch(DATA_URL, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((index) => {
      if (!index.accelerators.some((a) => a.question_count > 0)) return;
      const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      list.replaceChildren(
        ...index.accelerators
          .filter((a) => a.question_count > 0 && /^\d{4}-\d{2}-\d{2}$/.test(a.last_verified ?? ''))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((a) => {
            const el = document.createElement('div');
            el.className = 'acc';
            const left = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = a.name;
            const meta = document.createElement('small');
            meta.textContent = `${a.question_count} questions · ${a.required_count} required`;
            left.append(name, meta);
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = `Verified ${fmt(a.last_verified)}`;
            el.append(left, chip);
            return el;
          }),
      );
    })
    .catch(() => {
      /* keep the static fallback list */
    });
}
