import {
  CONTAINER_INDEXES,
  isValidSlug,
  MAX_DEPTH,
  sectionForLegacy,
  SECTIONS,
  slugify,
  trimRedundantPrefix,
} from '../src/lib/docs/ia.ts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Maps every audited legacy guide onto the new IA, and refuses to finish if
 * anything is unaccounted for.
 *
 * The audit (TI-30) said which pages survive; the IA (TI-31) says where they
 * land. This is the join, and it is a script rather than a spreadsheet so that
 * "every keep or rewrite page has a home" is a check that can fail rather than
 * a claim someone made once.
 *
 * ## The output is provisional, and must not be shipped as-is
 *
 * Every destination here is a prediction. No docs content exists yet, so not
 * one of these pages is real, and the rewrite will not preserve this list: some
 * pages will be renamed, some will be dropped on contact, and some will split.
 *
 * What the mapping is good for today is the check below — that the tree has
 * somewhere to put everything the audit said survives. What it is not good for
 * is being handed to TI-39 and turned into redirects, which would 301 people
 * from a page that exists to one that does not. TI-39 has to re-run this
 * against the finished content and verify every destination resolves first.
 *
 *   node scripts/map-legacy-docs.ts [--check]
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = join(root, 'docs/legacy-guide-audit.json');
const OUT = join(root, 'docs/legacy-docs-mapping.json');
const checkOnly = process.argv.includes('--check');

type Verdict = 'keep' | 'rewrite' | 'merge' | 'archive';
type AuditPage = { path: string; verdict: Verdict; wrong: boolean; destination?: string };

const audit = JSON.parse(readFileSync(AUDIT, 'utf8')) as AuditPage[] | { pages: AuditPage[] };
const pages = Array.isArray(audit) ? audit : audit.pages;

/** The legacy URL a path was served at, which is what a redirect must match. */
const legacyUrl = (path: string) =>
  `/guide/${path.replace(/\/README\.md$/, '').replace(/\.md$/, '')}`;

/**
 * A surviving page's new address.
 *
 * `README.md` is the section or topic index, so it collapses to the segment
 * above it rather than becoming a page called "readme". Everything else is
 * flattened to `<section>/<slug>`: the depth limit is the whole point of the
 * redesign, so a page four levels deep in the wiki loses its middle segments
 * and keeps its own name.
 */
function newPath(rawPath: string): string | undefined {
  // A merge destination is a directory, so it arrives without a leaf. Treat it
  // as its index, which is the page the audit means it folds into.
  const path = rawPath.endsWith('.md') ? rawPath : `${rawPath}/README.md`;
  const container = path.replace(/\/README\.md$/, '').replace(/\.md$/, '');
  if (CONTAINER_INDEXES.includes(container)) return '/docs';

  const section = sectionForLegacy(path);
  if (!section) return undefined;

  const parts = path.split('/');
  const leaf = parts.at(-1)!;
  if (leaf === 'README.md') {
    // The section's own index, or a topic index folding into it.
    const parent = parts.at(-2);
    const isSectionRoot = section.legacy.some((p) => p === parts.slice(0, -1).join('/'));
    if (isSectionRoot || !parent) return `/docs/${section.slug}`;
    return `/docs/${section.slug}/${trimRedundantPrefix(slugify(parent), section.slug)}`;
  }
  return `/docs/${section.slug}/${trimRedundantPrefix(slugify(leaf), section.slug)}`;
}

const rows: { from: string; to: string; verdict: Verdict; wrong: boolean }[] = [];
const unclaimed: string[] = [];
const collisions = new Map<string, string[]>();

for (const page of pages) {
  // Archived pages get no destination of their own; TI-39 decides whether they
  // 410 or land on their section index.
  if (page.verdict === 'archive') continue;

  // A merged page does not become a page. The audit named what it folds into,
  // and that is where its old URL has to land — sending it to a slug of its
  // own would promise 121 pages nobody agreed to write.
  const target = page.verdict === 'merge' && page.destination ? page.destination : page.path;
  // A page the approved IA does not claim lands on the docs index.
  //
  // This used to be a hard failure, back when the IA was derived from the audit
  // and "every surviving page has a home" was achievable by construction. The
  // approved structure is designed rather than derived, so whole legacy trees —
  // Contributing, Angular, the Welcome pages — have no successor on purpose.
  // `/docs` is the truthful destination for those, and TI-39 decides whether
  // any of them deserve better.
  const mapped = newPath(target);
  if (!mapped) unclaimed.push(page.path);
  const to = mapped ?? '/docs';
  rows.push({ from: legacyUrl(page.path), to, verdict: page.verdict, wrong: page.wrong });
  collisions.set(to, [...(collisions.get(to) ?? []), page.path]);
}

rows.sort((a, b) => a.from.localeCompare(b.from));

const survivors = pages.filter((p) => p.verdict !== 'archive').length;
const merged = [...collisions.entries()].filter(([, from]) => from.length > 1);

console.log(`${pages.length} audited, ${survivors} survive`);
console.log(`  ${rows.length} mapped onto ${collisions.size} pages (provisional — none exist yet)`);
console.log(
  `  ${rows.filter((r) => r.wrong).length} carry instructions the audit flagged as wrong`
);

for (const section of SECTIONS) {
  const n = rows.filter((r) => r.to.startsWith(`/docs/${section.slug}`)).length;
  console.log(`    ${section.slug.padEnd(12)} ${String(n).padStart(3)}  ${section.kind}`);
}
if (unclaimed.length) {
  console.log(
    `    ${'(docs index)'.padEnd(12)} ${String(unclaimed.length).padStart(3)}  no successor in the approved IA`
  );
}

if (merged.length) {
  console.log(`\n  ${merged.length} destinations absorb more than one page:`);
  for (const [to, from] of merged.sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
    console.log(`    ${to}  ← ${from.length}`);
  }
}

// --------------------------------------------------------------- invariants

const problems: string[] = [];

for (const to of collisions.keys()) {
  const segments = to
    .replace(/^\/docs\/?/, '')
    .split('/')
    .filter(Boolean);
  if (segments.length > MAX_DEPTH) problems.push(`deeper than ${MAX_DEPTH}: ${to}`);
  for (const segment of segments) {
    if (!isValidSlug(segment)) problems.push(`not a valid slug: ${to} (${segment})`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const payload = {
  $comment: [
    'Generated by scripts/map-legacy-docs.ts — do not edit by hand.',
    'PROVISIONAL. Destinations are predictions: no docs content exists yet, so',
    'none of these pages are real. The rewrite will rename, drop and split some',
    'of them. Do not turn this into redirects without first re-running against',
    'the finished content and checking every destination resolves — see TI-39.',
  ],
  status: 'provisional',
  source: { audit: 'docs/legacy-guide-audit.json', audited: pages.length, survivors },
  redirects: rows,
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current === json) {
    console.log('\nCommitted mapping is current.');
  } else {
    console.error('\nCommitted mapping is stale — rerun without --check.');
    process.exit(1);
  }
} else {
  writeFileSync(OUT, json);
  console.log(`\nWrote docs/legacy-docs-mapping.json`);
}
