import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

/**
 * Moves the tidev.io blog into this repo (TI-53).
 *
 * Committed rather than run once and deleted, because the migration is the
 * provenance: it records where 50 posts came from, what was rewritten on the
 * way, and exactly which editorial calls were made. Re-runnable against a fresh
 * checkout if tidev-www gains posts before the cutover.
 *
 *   node scripts/import-tidev-blog.ts <tidev-www-checkout>
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/import-tidev-blog.ts <tidev-www-checkout>');
  process.exit(1);
}

const POSTS_OUT = join(root, 'content/blog');
const IMAGES_OUT = join(root, 'public/blog');

/**
 * The taxonomy, defined rather than inherited.
 *
 * The source has 49 "Release" and one "RC", which is not a taxonomy so much as
 * a field nobody revisited — two posts filed under Release are a Hacktoberfest
 * call for contributors and a WWDC testing notice. Those two move to Community
 * and the one-off RC folds into Releases; everything else is genuinely a
 * release announcement. Recorded here so the remapping is reviewable rather
 * than something that happened silently during an import.
 */
const CATEGORY = new Map([
  ['Release', 'Releases'],
  ['RC', 'Releases'],
]);

const RECATEGORISED = new Map([
  ['hacktoberfest2022', 'Community'],
  ['wwdc_2022_test_xcode14_ios16', 'Community'],
]);

/** Where the old site served images from, and where they live here. */
const IMAGE_PREFIX = '/blog';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const posts = walk(join(source, 'posts')).sort();
if (!posts.length) {
  console.error(`no posts under ${source}/posts`);
  process.exit(2);
}

/** Splits `---\n…\n---\n` off the front. */
function split(text: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) throw new Error('no frontmatter');
  return { data: parseYaml(m[1]) as Record<string, unknown>, body: text.slice(m[0].length).trim() };
}

const copied = new Set<string>();

/**
 * Rewrites an image reference and copies the file it names.
 *
 * The old site served from its own root, so posts point at `/images/…` and one
 * frontmatter field at `https://tidev.io/sdk11.png`. Both become `/blog/…`
 * here, which keeps the blog's assets in one place rather than claiming a
 * top-level `/images` namespace on a site that has other things to put there.
 */
function rewriteImage(ref: string): string {
  const path = ref.replace(/^https:\/\/tidev\.io/, '').replace(/^['"]|['"]$/g, '');
  if (!path.startsWith('/')) return ref;

  const from = join(source, 'public', path);
  if (!existsSync(from)) {
    console.warn(`  ! missing asset, left as-is: ${ref}`);
    return ref;
  }

  const to = join(IMAGES_OUT, path.replace(/^\/images\//, '/'));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied.add(path);
  return `${IMAGE_PREFIX}${path.replace(/^\/images\//, '/')}`;
}

mkdirSync(POSTS_OUT, { recursive: true });
mkdirSync(IMAGES_OUT, { recursive: true });

let written = 0;
const categories = new Map<string, number>();
const authors = new Map<string, number>();

for (const file of posts) {
  const slug = basename(file, '.md').replace(/_/g, '-');
  const { data, body } = split(readFileSync(file, 'utf8'));

  const rawCategory = String(data.category ?? '').trim();
  const category =
    RECATEGORISED.get(basename(file, '.md')) ?? CATEGORY.get(rawCategory) ?? rawCategory;

  const cover = data.image ? rewriteImage(String(data.image)) : undefined;
  // Both spellings. Four images in sdk_12_4_0_ga are `<img src>` rather than
  // markdown, and matching only the markdown form silently left them pointing
  // at a path this site does not serve.
  const rewritten = body
    .replace(
      /(!\[[^\]]*\]\()([^)]+)(\))/g,
      (_all, open: string, ref: string, close: string) => `${open}${rewriteImage(ref)}${close}`
    )
    .replace(
      /(<img[^>]*\ssrc=")([^"]+)(")/g,
      (_all, open: string, ref: string, close: string) => `${open}${rewriteImage(ref)}${close}`
    );

  // Built by hand rather than dumped from an object, so the key order is stable
  // and a regenerated file diffs cleanly against the committed one.
  const front = [
    '---',
    `title: ${JSON.stringify(String(data.title))}`,
    `description: ${JSON.stringify(String(data.teaser ?? ''))}`,
    `date: ${JSON.stringify(String(data.date))}`,
    `author: ${JSON.stringify(String(data.author))}`,
    `category: ${JSON.stringify(category)}`,
    ...(cover ? [`cover: ${JSON.stringify(cover)}`] : []),
    `source: ${JSON.stringify(`https://tidev.io/blog/${basename(file, '.md')}`)}`,
    '---',
  ].join('\n');

  writeFileSync(join(POSTS_OUT, `${slug}.md`), `${front}\n\n${rewritten}\n`);
  written++;
  categories.set(category, (categories.get(category) ?? 0) + 1);
  const a = String(data.author);
  authors.set(a, (authors.get(a) ?? 0) + 1);
}

console.log(`${written} posts -> content/blog`);
console.log(`${copied.size} images -> public/blog`);
console.log('  categories:');
for (const [c, n] of [...categories].sort((a, b) => b[1] - a[1]))
  console.log(`    ${String(n).padStart(3)}  ${c}`);
console.log('  authors:');
for (const [a, n] of [...authors].sort((x, y) => y[1] - x[1]))
  console.log(`    ${String(n).padStart(3)}  ${a}`);
