import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Mirrors the registry's doc images into `public/` so Next can serve them.
 *
 * They live with the compiled types rather than in `public/` directly, so that
 * a version directory stays self-contained: the immutability guard and the
 * retention rules operate on that directory, and assets kept outside it would
 * silently fall outside both. The copy is a build step and the destination is
 * gitignored, so the images are committed exactly once.
 *
 * ## Written once per distinct image, not once per version
 *
 * Every version carries its own copy of the same screenshots. Measured across
 * a 13-month span — 12.8.0 against 13.4.1 — all 54 images are byte-identical,
 * so mirroring per version would deploy the same 9MB once for each release
 * compiled. At nineteen releases that is ~170MB of the same pictures.
 *
 * So the destination is content-addressed: one file per distinct image, named
 * by its hash, plus a manifest mapping each version's logical URL onto it.
 * Identical images collapse to one file; an image that ever does change simply
 * gets a different hash, so this stays correct rather than merely smaller.
 *
 * The manifest is what `src/lib/docs/assets.ts` reads to rewrite an image URL
 * at render time.
 *
 *   node scripts/sync-doc-assets.ts
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCES = [join(root, 'registry/sdk'), join(root, 'registry/modules')];
const PUBLIC = join(root, 'public/docs');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every `images/` directory under a version, whatever nesting the tree uses. */
function imageDirs(base: string): { from: string; rel: string }[] {
  if (!existsSync(base)) return [];
  const found: { from: string; rel: string }[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = join(dir, entry.name);
      if (entry.name === 'images') {
        found.push({ from: full, rel: relative(root, dirname(full)).split(sep).join('/') });
        continue;
      }
      visit(full);
    }
  };
  visit(base);
  return found;
}

const POOL = join(PUBLIC, 'img');

/** Logical URL a page would ask for -> the pooled file that answers it. */
const manifest: Record<string, string> = {};
const wanted = new Set<string>();
let written = 0;
let reused = 0;
let logical = 0;

for (const source of SOURCES) {
  for (const { from, rel } of imageDirs(source)) {
    // registry/sdk/main/images/... -> the URL /docs/sdk/main/images/...
    const urlBase = `/docs/${rel.replace(/^registry\//, '')}/images`;
    for (const file of walk(from)) {
      const within = relative(from, file).split(sep).join('/');
      const bytes = readFileSync(file);
      // Short but far past collision risk for a few hundred images, and it
      // keeps the URLs readable.
      const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
      const ext = within.includes('.') ? within.slice(within.lastIndexOf('.')) : '';
      const pooled = join(POOL, `${digest}${ext}`);

      manifest[`${urlBase}/${within}`] = `/docs/img/${digest}${ext}`;
      logical++;

      if (wanted.has(pooled)) {
        reused++;
        continue;
      }
      wanted.add(pooled);
      if (existsSync(pooled) && statSync(pooled).size === bytes.length) {
        reused++;
        continue;
      }
      mkdirSync(dirname(pooled), { recursive: true });
      copyFileSync(file, pooled);
      written++;
    }
  }
}

const manifestPath = join(PUBLIC, 'assets.json');
wanted.add(manifestPath);
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 0)}\n`
);

// Anything left behind belongs to a version that no longer exists, or to the
// per-version layout this replaced.
let removed = 0;
for (const file of walk(PUBLIC)) {
  if (wanted.has(file)) continue;
  rmSync(file);
  removed++;
}

console.log(
  `doc assets: ${logical} references -> ${wanted.size - 1} distinct images ` +
    `(${written} written, ${reused} already pooled)` +
    (removed ? `, ${removed} removed` : '')
);
