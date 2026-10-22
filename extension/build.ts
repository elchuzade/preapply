// npm run build — builds the extension into extension/dist.
//   1. Bundles the current /data into src/generated/bundled.json (offline-first fallback).
//   2. Builds the background worker and content script as single classic scripts, and the
//      popup/panel pages as normal Vite pages.
//   3. Writes manifest.json, with content-script matches generated from the data's domains.
// Flags: --data-only (step 1 only, used by typecheck).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { build, type InlineConfig } from 'vite';
import { DATA_DIR, buildIndex, formatProblem, loadAccelerators } from '../scripts/lib.ts';
import { domainMatchPatterns, siteDomains } from './src/lib/match.ts';
import type { AcceleratorIndex, BundledData } from './src/lib/types.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, '..', 'package.json'), 'utf8'));

// 1. Bundled data
const { files, problems } = loadAccelerators();
if (problems.length) {
  for (const p of problems) console.error(`✖ ${formatProblem(p)}`);
  process.exit(1);
}
const indexPath = join(DATA_DIR, 'index.json');
const previous: AcceleratorIndex | undefined = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : undefined;
const bundled: BundledData = {
  index: buildIndex(files, previous),
  accelerators: Object.fromEntries(files.map((f) => [f.data.id, f.data])),
};
mkdirSync(join(root, 'src', 'generated'), { recursive: true });
writeFileSync(join(root, 'src', 'generated', 'bundled.json'), JSON.stringify(bundled));
console.log(`✔ Bundled ${files.length} accelerators`);
if (process.argv.includes('--data-only')) process.exit(0);

// 2. Vite builds
const base: InlineConfig = { configFile: false, root, logLevel: 'warn', build: { outDir, minify: false, target: 'chrome116' } };

for (const [name, entry] of [['background', 'src/background.ts'], ['content', 'src/content.ts']] as const) {
  await build({
    ...base,
    build: {
      ...base.build,
      emptyOutDir: name === 'background',
      lib: { entry: join(root, entry), formats: ['iife'], name: `preapply_${name}`, fileName: () => `${name}.js` },
    },
  });
}
await build({
  ...base,
  base: './',
  build: {
    ...base.build,
    emptyOutDir: false,
    rollupOptions: { input: { popup: join(root, 'popup.html'), panel: join(root, 'panel.html') } },
  },
});

// 3. Icons + manifest
mkdirSync(join(outDir, 'icons'), { recursive: true });
const icons: Record<string, string> = {};
for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(outDir, 'icons', `icon${size}.png`), makeIcon(size));
  icons[size] = `icons/icon${size}.png`;
}

const domains = [...new Set(files.flatMap((f) => siteDomains(f.data.match)))].sort();
const manifest = {
  manifest_version: 3,
  name: 'PreApply',
  version: pkg.version,
  description: pkg.description,
  homepage_url: pkg.homepage,
  minimum_chrome_version: '116',
  icons,
  action: { default_popup: 'popup.html', default_icon: icons, default_title: 'PreApply' },
  background: { service_worker: 'background.js' },
  permissions: ['storage', 'alarms', 'activeTab', 'scripting'],
  optional_host_permissions: ['*://*/*'],
  content_scripts: [{ matches: domains.flatMap(domainMatchPatterns), js: ['content.js'], run_at: 'document_idle' }],
};
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✔ Built extension/dist (content script on ${domains.length} domains)`);

/** PreApply icon: an orange (#f97316) rounded square with a dark check mark, as a PNG. */
function makeIcon(size: number): Buffer {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.22;
  const stroke = Math.max(1.4, size * 0.11) / 2;
  const pts: [number, number][] = [[0.27, 0.52], [0.43, 0.68], [0.74, 0.34]].map(([x, y]) => [x! * size, y! * size]);
  const segDist = (x: number, y: number, [ax, ay]: [number, number], [bx, by]: [number, number]) => {
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay));
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const qx = Math.max(Math.abs(cx - size / 2) - (size / 2 - r), 0);
      const qy = Math.max(Math.abs(cy - size / 2) - (size / 2 - r), 0);
      const bg = Math.max(0, Math.min(1, r - Math.hypot(qx, qy) + 0.5));
      const d = Math.min(segDist(cx, cy, pts[0]!, pts[1]!), segDist(cx, cy, pts[1]!, pts[2]!));
      const check = Math.max(0, Math.min(1, stroke - d + 0.5));
      const i = (y * size + x) * 4;
      px[i] = Math.round(0xf9 + (0x09 - 0xf9) * check);
      px[i + 1] = Math.round(0x73 + (0x09 - 0x73) * check);
      px[i + 2] = Math.round(0x16 + (0x0b - 0x16) * check);
      px[i + 3] = Math.round(255 * bg);
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
