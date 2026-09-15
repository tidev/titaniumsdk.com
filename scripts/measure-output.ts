import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reports how big the built site is.
 *
 *   node scripts/measure-output.ts [--max=<MB>] [--top=<n>] [--json]
 *
 * Several tickets carry "check the deployment size against the 100MB cap" as a
 * standing constraint. Until this existed the figure only existed when someone
 * took it by hand, and everyone who took it by hand measured a different thing.
 * So: what this counts, and why.
 *
 * ## What counts
 *
 * `.next/server/app` holds the prerendered pages, but it also holds the server
 * bundles that render the dynamic ones and the `*.nft.json` trace manifests the
 * deploy reads and discards. Four extensions are content the site serves:
 * `.html`, `.rsc`, `.meta`, and `.body` (prerendered route handler responses,
 * which is what `/sitemap.xml` and every `/md/...` page is). Measuring the
 * directory whole adds about 45 MB of files nobody downloads.
 *
 * `.next` as a whole is wrong by a wider margin: 1.6 GB, most of it build
 * cache. Three separate attempts at this figure reached for it, and all three
 * read the cap as breached.
 *
 * ## Why not du
 *
 * `du` rounds every file up to a 4K block. Against `public/`, which is 5,000
 * small icons, that reports 32 MB for 12 MB of bytes. This sums apparent size,
 * which is what a byte cap would be measured on.
 *
 * ## Which number to compare
 *
 * `--max` compares the total, because `public/` and `.next/static` are served
 * too. The tickets quote the prerendered subtotal alone, so it is printed
 * exactly. Whether the 100MB cap is an output-size limit or a Vercel
 * function-bundle one was never confirmed; if it is the latter then neither
 * figure is the one that matters, and the line in those tickets wants
 * correcting rather than deriving a fifth time.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Extensions under `.next/server/app` that are content the site serves. */
const PRERENDERED = new Set(['.html', '.rsc', '.meta', '.body']);

const args = process.argv.slice(2);
const option = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const asJson = args.includes('--json');
const maxMb = Number(option('max') ?? NaN);
const top = Number(option('top') ?? 5);

type Entry = { path: string; bytes: number };

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

function measure(dir: string, keep: (path: string) => boolean = () => true): Entry[] {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [];
  const found: Entry[] = [];
  for (const path of files(full)) {
    if (keep(path)) found.push({ path: relative(full, path), bytes: statSync(path).size });
  }
  return found;
}

const groups = [
  {
    label: 'Prerendered output',
    where: '.next/server/app (html, rsc, meta, body)',
    entries: measure('.next/server/app', (p) => PRERENDERED.has(extname(p))),
  },
  { label: 'Client assets', where: '.next/static', entries: measure('.next/static') },
  { label: 'Public files', where: 'public', entries: measure('public') },
];

if (!groups[0].entries.length) {
  console.error('No build found at .next/server/app. Run `pnpm build` first.');
  process.exit(1);
}

const sum = (entries: Entry[]) => entries.reduce((n, e) => n + e.bytes, 0);
const mb = (bytes: number) => (bytes / 1024 ** 2).toFixed(1);
const totalBytes = groups.reduce((n, g) => n + sum(g.entries), 0);
const totalFiles = groups.reduce((n, g) => n + g.entries.length, 0);

const row = (label: string, bytes: number, count: number, where = '') =>
  `${label.padEnd(20)}${mb(bytes).padStart(7)} MB${count.toLocaleString().padStart(8)} files  ${where}`.trimEnd();

if (asJson) {
  console.log(
    JSON.stringify(
      {
        groups: groups.map((g) => ({
          label: g.label,
          where: g.where,
          bytes: sum(g.entries),
          files: g.entries.length,
        })),
        totalBytes,
        totalFiles,
      },
      null,
      2
    )
  );
} else {
  for (const g of groups) console.log(row(g.label, sum(g.entries), g.entries.length, g.where));
  console.log('-'.repeat(45));
  console.log(row('Total', totalBytes, totalFiles));
  console.log(`\nPrerendered subtotal: ${sum(groups[0].entries).toLocaleString()} bytes.`);

  if (top > 0) {
    console.log('\nLargest prerendered files:');
    const biggest = [...groups[0].entries].sort((a, b) => b.bytes - a.bytes).slice(0, top);
    for (const e of biggest) console.log(`  ${mb(e.bytes).padStart(6)} MB  ${e.path}`);
  }
}

if (Number.isFinite(maxMb)) {
  const cap = maxMb * 1024 ** 2;
  const over = totalBytes > cap;
  const line = over
    ? `Over the ${maxMb} MB cap by ${mb(totalBytes - cap)} MB.`
    : `Under the ${maxMb} MB cap by ${mb(cap - totalBytes)} MB.`;
  if (over) {
    console.error(`\n${line}`);
    process.exit(1);
  }
  console.log(`\n${line}`);
}
