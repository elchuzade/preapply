# Chrome Web Store listing

Everything needed to publish PreApply. Copy each field into the
[developer dashboard](https://chrome.google.com/webstore/devconsole).

## Package

Upload `preapply-vX.Y.Z.zip` from the [latest GitHub release](https://github.com/elchuzade/preapply/releases/latest)
(built by the release workflow when a `v*` tag is pushed). Upload the zip as-is; don't unzip it.

## Store listing tab

**Name** (from the manifest): PreApply

**Summary** (max 132 characters; from the manifest description, edit there if needed):

> See every application question for startup accelerators before you apply and hand over your contact details.

**Description:**

```
See every application question before you apply.

Many startup accelerators ask for your name, email and phone number first, and only show the real application questions afterwards. By then you've already handed over your details, only to find out you don't have strong answers.

PreApply fixes that. When you visit a supported accelerator's website, a small pill shows how many questions are waiting. Click it to see the whole application up front:

• Every step and every question, in order
• Required questions marked
• Word and character limits, and the form's own hints
• When the questions were last verified

Copy all questions in one click and paste them into your AI agent or notes to draft your answers, or save them for later if you're not ready yet.

PRIVATE BY DESIGN
• Never reads what you type on websites, and never fills in forms
• No account, no analytics, no tracking, no ads
• Its only network request downloads the public list of questions

OPEN SOURCE AND COMMUNITY-MAINTAINED
The question lists are copied from real application forms by founders and are free to use (CC0). Spotted a change or a missing accelerator? Use the "Questions changed?" button, or add one at https://preapply.abbox.com.

Currently covers Antler, HPI Engine Founder Studio and The Bridge Residency, with more added by the community.

PreApply is independent and not affiliated with any accelerator it lists.
```

**Category:** Productivity → Workflow & Planning

**Language:** English

**Store icon** (128×128 PNG): `store/store-icon-128.png`

**Screenshots** (1280×800, PNG without alpha), in this order:
1. `store/screenshot-1.png`: the question panel
2. `store/screenshot-2.png`: the pill and panel on an accelerator's site
3. `store/screenshot-3.png`: copy questions to prepare answers

**Small promo tile** (440×280): `store/promo-small-440x280.png`

**Marquee promo tile** (1400×560, optional, only used if the store features PreApply): `store/promo-marquee-1400x560.png`

**Global promo video:** leave empty.

**Official URL:** optional. The dropdown only lists sites you've verified in
[Google Search Console](https://search.google.com/search-console) with the same Google account.
To use it, add `https://preapply.abbox.com` as a property there and verify it, then pick it here.

**Homepage URL:** `https://preapply.abbox.com`

**Support URL:** `https://preapply.abbox.com/support`

**Mature content:** No.

## Privacy practices tab

**Single purpose description:**

> PreApply shows the full list of application questions for startup accelerators when the user visits an accelerator's website, so founders can see every question before they apply.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `storage` | Caches the public list of accelerator questions so it works offline, and remembers whether the user minimised the on-page pill. |
| `alarms` | Refreshes the public question list once a day. |
| `activeTab` | When the user clicks the toolbar icon, reads the current tab's URL to check whether it's a known accelerator and show its questions. |
| `scripting` | Registers the content script on accelerator websites added to the list after installation, only for sites the user explicitly approves. |
| Host permissions (content scripts on accelerator domains) | Shows the question pill and panel on the websites of supported accelerators only (e.g. antler.co, join-thebridge.com). The script reads the page URL and link URLs to detect the accelerator and its apply links; it never reads form input. |
| Optional host permissions (`*://*/*`) | Never granted by default. Requested per domain, only when the user clicks "Enable" for accelerator websites added after installation. |

**Are you using remote code?** No. The extension only downloads data (a JSON index and YAML question files) from cdn.jsdelivr.net; all code is in the package.

**Data usage:** tick none of the data types. PreApply doesn't collect or transmit any user data.

Then tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://preapply.abbox.com/privacy`

## Distribution tab

- **Payments:** Free
- **Visibility:** Public
- **Regions:** All regions

## Test instructions (for reviewers)

> No login is needed. Visit https://www.join-thebridge.com or https://www.antler.co. A "PreApply" pill appears in the bottom-right corner; click it to see all application questions. Click the PreApply toolbar icon on any page to browse the accelerators.

## Before the first submission

1. **Website on Vercel:** import the GitHub repo `elchuzade/preapply` as a new project. Set **Root Directory** to `site`
   and **Framework Preset** to *Other*, with no build command (it's a static site; `site/vercel.json` turns on clean URLs).
   Add the domain `preapply.abbox.com` under Project → Settings → Domains.
2. **DNS in Cloudflare:** add the `CNAME` record Vercel shows for `preapply` (usually `cname.vercel-dns.com`),
   with **Proxy status: DNS only** (grey cloud) so Vercel can issue the HTTPS certificate.
3. Check that https://preapply.abbox.com, /privacy and /support load.
4. After the store approves PreApply, set `STORE_URL` in `site/main.js` to the listing URL so the site's buttons say "Add to Chrome" and link to the store.
