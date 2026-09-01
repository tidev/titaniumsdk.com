import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Vendors the IBM Plex woff2 files into `src/fonts/`.
 *
 * `next/font/google` downloads these during the build, which means a build
 * cannot run without reaching fonts.googleapis.com — verified by building
 * behind a dead proxy, where it fails outright with zero fonts emitted. TI-25
 * requires the build to touch nothing but the local filesystem, so the files
 * are fetched once, here, and committed.
 *
 * Run this again only to change weights or pick up an upstream revision:
 *
 *   node scripts/fetch-fonts.ts [--check]
 *
 * IBM Plex is SIL Open Font License 1.1; the licence sits beside the fonts.
 */

const OUT = join(import.meta.dirname, '../src/fonts');

/** Same UA Next sends, and for the same reason: it decides woff2 over ttf. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';

/** Only the latin subset, matching what the site asked `next/font/google` for. */
const SUBSET = 'latin';

const FAMILIES = [
  {
    file: 'ibm-plex-sans-latin.woff2',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100..700&display=swap',
  },
  {
    file: 'ibm-plex-mono-latin-400.woff2',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap',
  },
  {
    file: 'ibm-plex-mono-latin-500.woff2',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&display=swap',
  },
  {
    file: 'ibm-plex-mono-latin-600.woff2',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&display=swap',
  },
];

/**
 * Pulls the woff2 URL for `SUBSET` out of a Google Fonts stylesheet.
 *
 * The response is a run of @font-face blocks, each preceded by a comment
 * naming its subset. Matching on that comment is what separates latin from
 * the cyrillic and greek slices we do not ship.
 */
function subsetUrl(css: string, subset: string): string {
  const blocks = css.split('/*').slice(1);
  for (const block of blocks) {
    const name = block.slice(0, block.indexOf('*/')).trim();
    if (name !== subset) continue;
    const url = block.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (url) return url;
  }
  throw new Error(`no ${subset} @font-face in stylesheet`);
}

const checkOnly = process.argv.includes('--check');
const stale: string[] = [];

for (const { file, url } of FAMILIES) {
  const css = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => {
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    return r.text();
  });

  const res = await fetch(subsetUrl(css, SUBSET));
  if (!res.ok) throw new Error(`font file -> ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());

  const path = join(OUT, file);
  let current: Buffer | undefined;
  try {
    current = readFileSync(path);
  } catch {
    /* not vendored yet */
  }

  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  if (current?.equals(bytes)) {
    console.log(`  ok    ${file}  ${bytes.length} bytes  sha256:${digest}`);
    continue;
  }

  stale.push(file);
  if (!checkOnly) writeFileSync(path, bytes);
  console.log(
    `  ${checkOnly ? 'stale' : 'wrote'} ${file}  ${bytes.length} bytes  sha256:${digest}`
  );
}

if (checkOnly && stale.length) {
  console.error(`\n${stale.length} font file(s) differ from upstream — rerun without --check.`);
  process.exit(1);
}
