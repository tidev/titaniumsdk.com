import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Classifies every legacy guide page so the M3 rewrite has a work list.
 *
 * Rules over judgement calls, so the result is reproducible and a reader can
 * disagree with a rule rather than with 336 individual verdicts. Every entry
 * carries the evidence that produced it.
 *
 *   node scripts/audit-legacy-guides.ts <titanium-docs-checkout>
 */

type Verdict = 'keep' | 'rewrite' | 'merge' | 'archive';

type Page = {
  path: string;
  bytes: number;
  verdict: Verdict;
  /** Wrong is more urgent than old: these instructions actively mislead. */
  wrong: boolean;
  reasons: string[];
  /** The consolidated page this one folds into. Absent for archived pages. */
  destination?: string;
};

const root = process.argv[2];
if (!root) {
  console.error('usage: node scripts/audit-legacy-guides.ts <titanium-docs-checkout>');
  process.exit(1);
}
const GUIDE = join(root, 'docs/guide');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Hosts verified dead: DNS failure, 404, or 403 on the asset bucket. */
const DEAD_HOSTS = [
  'docs.appcelerator.com',
  'developer.appcelerator.com',
  'assets.appcelerator.com',
  'wiki.appcelerator.org',
  'tools.android.com',
];

/** Instructions that are not merely dated but will not work if followed. */
const WRONG_CONTENT: [RegExp, string][] = [
  [/Android SDK Tools \(Obsolete\)/i, 'tells the reader to install a package Google removed'],
  [
    /\bStudio(?:'s)? (?:Preferences|Run Configurations)\b/i,
    'instructs via Appcelerator Studio, discontinued',
  ],
  [
    /\bappc (?:login|setup|new|run|ti)\b/i,
    'uses the appc CLI, which requires a dead login service',
  ],
  [/\(#undefined\)/, 'contains a link whose target was lost in the wiki export'],
];

const pages: Page[] = [];

for (const file of walk(GUIDE).sort()) {
  const rel = relative(GUIDE, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const reasons: string[] = [];
  let verdict: Verdict = 'keep';
  let wrong = false;

  // Release notes duplicate what GitHub releases already carry, and the 2,181
  // links they hold point at the JIRA archive, which is itself the record.
  if (/Release_Notes/.test(rel)) {
    verdict = 'archive';
    reasons.push('release notes — GitHub releases are the record');
  }

  // GitHub sunset Atom in December 2022; the successor is pulsar-titanium.
  if (/Atom_Package/.test(rel)) {
    verdict = 'archive';
    wrong = true;
    reasons.push('Atom was sunset in December 2022; successor is pulsar-titanium');
  }

  for (const [pattern, why] of WRONG_CONTENT) {
    if (pattern.test(text)) {
      wrong = true;
      if (verdict === 'keep') verdict = 'rewrite';
      reasons.push(why);
    }
  }

  const dead = DEAD_HOSTS.filter((h) => text.includes(h));
  if (dead.length) {
    wrong = true;
    if (verdict === 'keep') verdict = 'rewrite';
    reasons.push(`links to ${dead.join(', ')} — verified dead`);
  }

  // Naming a defunct company throughout is a rewrite, not a find-and-replace:
  // the surrounding workflow usually assumed its tooling.
  if (verdict === 'keep' && /appcelerator|axway/i.test(text)) {
    verdict = 'rewrite';
    reasons.push('written around Appcelerator/Axway tooling');
  }

  if (verdict === 'keep' && /windows phone|blackberry|mobileweb/i.test(text)) {
    verdict = 'rewrite';
    reasons.push('documents platforms the SDK dropped');
  }

  pages.push({ path: rel, bytes: statSync(file).size, verdict, wrong, reasons });
}

/**
 * Folds the survivors into destination pages.
 *
 * The wiki export fragmented topics: 38% of surviving pages are under 4 KB and
 * they sit in 62 directories. Counting sources says 244 pages survive; counting
 * destinations says far fewer, and the destination count is what the rewrite
 * actually costs. A directory is one page unless it is large enough to warrant
 * splitting, which is a judgement left to the rewrite.
 */
const destinationFor = (path: string) => {
  const dir = path.split('/').slice(0, -1).join('/');
  return dir || '(top level)';
};

for (const page of pages) {
  if (page.verdict === 'archive') continue;
  page.destination = destinationFor(page.path);
}

/**
 * The live URL a page is served at today, for the redirect map in TI-39.
 * VuePress serves `a/b/Page.md` as `/guide/a/b/Page.html`, and a `README.md`
 * as the directory itself.
 */
const legacyUrl = (path: string) =>
  path.endsWith('/README.md') || path === 'README.md'
    ? `/guide/${path.replace(/README\.md$/, '')}`
    : `/guide/${path.replace(/\.md$/, '.html')}`;

// A page sharing its destination with others is a merge, not a standalone keep.
const perDestination = new Map<string, Page[]>();
for (const page of pages) {
  if (!page.destination) continue;
  perDestination.set(page.destination, [...(perDestination.get(page.destination) ?? []), page]);
}
for (const [, group] of perDestination) {
  if (group.length < 2) continue;
  for (const page of group) {
    // Preserve `rewrite` — a merged page that is also wrong still needs writing.
    if (page.verdict === 'keep') page.verdict = 'merge';
  }
}

const by = (v: Verdict) => pages.filter((p) => p.verdict === v);
const wrong = pages.filter((p) => p.wrong);
const kb = (list: Page[]) => Math.round(list.reduce((n, p) => n + p.bytes, 0) / 1024);

const summary = {
  generatedFrom: 'tidev/titanium-docs docs/guide',
  pages: pages.length,
  verdicts: {
    keep: by('keep').length,
    rewrite: by('rewrite').length,
    merge: by('merge').length,
    archive: by('archive').length,
  },
  factuallyWrong: wrong.length,
  /** What the rewrite actually costs: pages to end up with, not pages to read. */
  destinationPages: perDestination.size,
  sizeKb: {
    keep: kb(by('keep')),
    rewrite: kb(by('rewrite')),
    archive: kb(by('archive')),
  },
};

const withUrls = pages.map((p) => ({ ...p, url: legacyUrl(p.path) }));

const out = fileURLToPath(new URL('../docs/legacy-guide-audit.json', import.meta.url));
writeFileSync(out, `${JSON.stringify({ summary, pages: withUrls }, null, 2)}\n`);

// A readable companion, generated from the same pass so the two cannot drift.
const destinations = [...perDestination.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .map(([dest, group]) => {
    const bytes = group.reduce((n, p) => n + p.bytes, 0);
    const anyWrong = group.some((p) => p.wrong);
    return `| ${dest} | ${group.length} | ${Math.round(bytes / 1024)} KB | ${anyWrong ? 'yes' : ''} |`;
  });

const md = `# Legacy guide audit

Generated by \`scripts/audit-legacy-guides.ts\` from \`tidev/titanium-docs\`. Do not edit by hand.

**${summary.pages} source pages become ${summary.destinationPages} pages.** ${summary.verdicts.archive} archive outright.

| Verdict | Pages | Size |
| -- | -- | -- |
| keep | ${summary.verdicts.keep} | ${summary.sizeKb.keep} KB |
| rewrite | ${summary.verdicts.rewrite} | ${summary.sizeKb.rewrite} KB |
| merge | ${summary.verdicts.merge} | — |
| archive | ${summary.verdicts.archive} | ${summary.sizeKb.archive} KB |

**${summary.factuallyWrong} pages are factually wrong**, not merely stale — they contain
instructions that fail if followed, or links to hosts that no longer resolve. Those are
more urgent than the merely dated.

## Destinations

Each row is one page in the new docs. The wiki export fragmented topics, so most
destinations gather several sources.

| Destination | Sources | Size | Contains wrong content |
| -- | -- | -- | -- |
${destinations.join('\n')}
`;

writeFileSync(fileURLToPath(new URL('../docs/legacy-guide-audit.md', import.meta.url)), md);

console.log(JSON.stringify(summary, null, 2));
console.log('\nwritten to docs/legacy-guide-audit.{json,md}');
