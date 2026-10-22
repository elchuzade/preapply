# Contributing to PreApply

The most valuable contribution is **accurate question data**: the exact questions an accelerator asks, in order, including the ones hidden behind a "give us your email first" step.

Ground rule: **never invent or guess questions.** Only add what you have actually seen on the form.

## Without Git (recommended for most people)

Use the issue forms. A maintainer will turn your submission into a data file.

- **New accelerator:** [Add an accelerator](https://github.com/elchuzade/preapply/issues/new?template=add-accelerator.yml). Paste the questions one per line. Start required ones with `*`, put limits in brackets like `[100 words]`, and start a line with `##` to begin a new step.
- **Questions changed or missing:** [Questions changed](https://github.com/elchuzade/preapply/issues/new?template=questions-changed.yml). The extension's "Questions changed?" button opens this form with the accelerator id already filled in.

## With Git

1. Create `data/accelerators/<country>/<id>.yaml`.
   - `<country>` is a lowercase two-letter ISO code (`de`, `fr`, `uk`…) or `global`.
   - `<id>` is a kebab-case slug and must match the `id` field.
2. Follow the schema in [`data/schema.json`](data/schema.json). [`the-bridge.yaml`](data/accelerators/global/the-bridge.yaml) is a complete example.
3. Run the checks:
   ```bash
   npm install
   npm run validate
   ```
4. Open a pull request. CI validates your file. **Do not edit `data/index.json`**: it is regenerated automatically when changes land on `main`.

### Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Must match the file name. |
| `name` | yes | |
| `country` | yes | Must match the folder. |
| `website` | yes | |
| `status` | no | `verified` (default) or `needs_verification` for placeholders. |
| `match.domains` | yes | Bare domains (`example.com`). Subdomains match automatically. |
| `match.apply_urls` | no | Glob patterns (`*` = anything) for apply links. These get a PreApply marker. |
| `cohort`, `deadline` | no | `deadline` is an ISO date. |
| `last_verified` | yes | The ISO date you checked the form. `null` only with `status: needs_verification`. |
| `verified_by` | no | Your GitHub handle. |
| `notes` | no | Things like "contact details first, full form is emailed". |
| `steps[].title` / `intro` | title yes | One step per page or stage of the application. |
| `steps[].questions[]` | yes | `text`, `type`, plus optional `hint`, `required` (default `false`), `limit`, `limit_unit` (`words` or `characters`). |

Question `type` is one of: `short_text`, `long_text`, `url`, `video`, `file`, `choice`, `references`, `other`.

### Updating a placeholder

Files marked `status: needs_verification` have no verified questions yet. To complete one, add the steps and questions, set `last_verified` to today, change `status` to `verified`, and remove the TODO comments.

## Code contributions

```bash
npm install
npm test          # Vitest
npm run typecheck
npm run build     # builds the extension into extension/dist
```

Keep modules small, TypeScript strict, and dependencies minimal. Please open an issue before adding a dependency.

## Licenses

Code is MIT ([LICENSE](LICENSE)). Question data in `/data` is CC0 ([data/LICENSE](data/LICENSE)): by contributing data you dedicate it to the public domain.
