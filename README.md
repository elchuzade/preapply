# PreApply

[![CI](https://github.com/elchuzade/preapply/actions/workflows/ci.yml/badge.svg)](https://github.com/elchuzade/preapply/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Data: CC0](https://img.shields.io/badge/data-CC0-lightgrey.svg)](data/LICENSE)

A Chrome extension that shows founders **every application question of a startup accelerator before they click "Apply"** and hand over their name, email and phone number.

Many programs (The Bridge Residency, for example) collect your contact details first and only show the real questions in a second step. PreApply puts them in front of you right away, so you can judge whether you have strong answers before you start.

- **On an accelerator's site** you get a small pill in the bottom-right corner, e.g. *PreApply: 17 questions · 1 video · see before applying*. Click it to see every question grouped by step, with required/optional, type, hints, word limits and how recently the data was verified.
- **Apply links** on the page get a small *PreApply* marker.
- **Draft and reuse answers.** In the toolbar popup (or the full-tab view) you can draft an answer to each question. Answers are saved in your browser. On the next accelerator, each question offers your saved answers, ranked by how similar the original question was. Copy one, adjust it, and paste it into the real form yourself.
- **Copy all questions** as plain text to draft somewhere else.

Question data is open, community-maintained and lives in this repo: one YAML file per accelerator. **PreApply is fully open source.** The code is MIT, the data is CC0, and contributions are welcome, especially question lists for accelerators that aren't covered yet. See [Contributing](#contributing-data).

## Install

1. Download `preapply-vX.Y.Z.zip` from the [latest release](https://github.com/elchuzade/preapply/releases/latest) and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the unzipped folder.

## Development

Requires Node 22.18 or newer.

```bash
git clone https://github.com/elchuzade/preapply.git
cd preapply
npm install
npm run build
```

Then in Chrome open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose `extension/dist`.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests (Vitest): fetch/cache, matching, freshness, summaries, answer ranking, validation |
| `npm run typecheck` | TypeScript strict-mode check |
| `npm run validate` | Validates every file in `data/accelerators` against `data/schema.json` |
| `npm run build:index` | Validates, then regenerates `data/index.json` |

## Configuration

The GitHub repo that hosts the data is set in one constant, `GITHUB_REPO` in [`extension/src/config.ts`](extension/src/config.ts) (`elchuzade/preapply`). Data is loaded from `https://cdn.jsdelivr.net/gh/elchuzade/preapply@main/data/`. A fork that publishes its own data only needs to change that constant.

To publish a release: bump `version` in `package.json`, then push a matching tag (`git tag v0.1.1 && git push --tags`). The release workflow builds the extension and attaches the zip.

## How data flows

```
data/accelerators/<country>/<id>.yaml ──CI──▶ data/index.json ──jsDelivr──▶ extension
```

- On install and every 24 hours (`chrome.alarms`) the extension fetches `index.json` and caches it in `chrome.storage.local`.
- An accelerator's YAML is fetched only when needed. It is cached together with its `last_verified` date and refetched only when the index shows a newer date.
- Offline, the extension shows cached data. If nothing is cached, it shows the data bundled at build time.
- Only data is fetched. No remote code is ever loaded or evaluated.

## Contributing data

See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security issues privately as described in [SECURITY.md](SECURITY.md). No Git needed: the extension's **Questions changed?** and **Not listed? Add it** buttons open prefilled GitHub issue forms.

Files marked `status: needs_verification` are placeholders. The extension shows "Questions not yet verified — help add them" for them. Please never guess questions.

## Privacy

- PreApply **never reads what you type into a website's forms** and never fills them in. The content script reads only the page URL and link addresses, which it uses to spot apply links.
- It sends no page data anywhere. Its only network requests go to the jsDelivr data URL, without cookies.
- Your drafted answers are stored only in `chrome.storage.local` in your browser. You can export or import them as JSON from the *Saved answers* page.
- Answers are drafted in PreApply's own extension pages (popup or tab), never in a text box injected into the accelerator's site, so the host page can't see your keystrokes. The in-page panel is read-only.
- The "Questions changed?" link includes the current page address with its query string and fragment removed. Nothing is sent until you submit the GitHub issue yourself.
- No accounts, analytics or tracking.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Cache the question data; keep your saved answers and the pill's minimised state. |
| `alarms` | Refresh the index once a day. |
| `activeTab` | When you click the toolbar icon, read the current tab's URL to find out whether it's a known accelerator. No access to page contents. |
| `scripting` | Register the content script on accelerator domains added to the index after you installed this version (only domains you approve, see below). |
| Content-script host access | Generated at build time from the domains in `/data` (e.g. `join-thebridge.com`, `ycombinator.com`). PreApply doesn't use `<all_urls>`. |
| `optional_host_permissions: *://*/*` | **Optional and never granted by default.** When the community adds an accelerator after your install, the popup offers *Enable*. That asks Chrome for access to just those specific domains. |

## Repo layout

```
extension/          Chrome extension (Manifest V3, TypeScript, Vite)
  build.ts          builds extension/dist and generates manifest.json from /data
  src/background.ts service worker: fetch/cache, lookups, badge
  src/content.ts    pill, panel, apply-link markers (shadow DOM)
  src/popup.ts      toolbar popup
  src/page.ts       full-tab drafting view and saved-answers library
  src/lib/          tested logic: data, match, freshness, summary, answers
data/
  accelerators/     one YAML per accelerator, by country
  schema.json       JSON Schema
  index.json        GENERATED by scripts/build-index.ts — don't edit
scripts/            validate.ts, build-index.ts (+ tests)
.github/            CI workflows, issue forms, CODEOWNERS
```

## License

Code: MIT ([LICENSE](LICENSE)). Question data: CC0 ([data/LICENSE](data/LICENSE)).
