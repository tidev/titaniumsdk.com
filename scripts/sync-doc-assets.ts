import { CONTENTS, type Contents, poolPath } from '../src/lib/docs/pool.ts';
import { POOL_DIR } from './lib/pool.ts';
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
 * a version stays self-describing: the immutability guard and the retention
 * rules operate on its manifest, and assets kept outside it would silently fall
 * outside both. The copy is a build step and the destination is gitignored, so
 * the images are committed exactly once.
 *
 * ## Written once per distinct image, not once per version
 *
 * Every version references the same screenshots. Measured across a 13-month
 * span — 12.8.0 against 13.4.1 — all 54 are byte-identical, so mirroring per
 * version would deploy the same 9MB once for each release compiled.
 *
 * The registry already stores them content-addressed in its pool, so this is
 * now a copy rather than a de-duplication: `contents.images` maps a version's
 * logical path onto a pooled filename that is itself the content hash, and the
 * public file keeps that name. One file per distinct image falls out of the
 * storage layer rather than being re-derived here.
 *
 * The manifest is what `src/lib/docs/assets.ts` reads to rewrite an image URL
 * at render time.
 *
 *   node scripts/sync-doc-assets.ts
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCES = ['registry/sdk', 'registry/modules'];
const PUBLIC = join(root, 'public/docs');
const POOL = join(PUBLIC, 'img');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every packed version directory under a registry root, at whatever depth. */
function versionDirs(base: string, depth = 3): string[] {
  if (!existsSync(base) || depth < 0) return [];
  const found: string[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === POOL_DIR) continue;
    const dir = join(base, entry.name);
    if (existsSync(join(dir, CONTENTS))) found.push(dir);
    else found.push(...versionDirs(dir, depth - 1));
  }
  return found;
}

/** Logical URL a page would ask for -> the pooled file that answers it. */
const manifest: Record<string, string> = {};
const wanted = new Set<string>();
let written = 0;
let reused = 0;
let logical = 0;

for (const source of SOURCES) {
  for (const dir of versionDirs(join(root, source))) {
    const contents = JSON.parse(readFileSync(join(dir, CONTENTS), 'utf8')) as Contents;
    // registry/sdk/main -> the URL prefix /docs/sdk/main/images
    const rel = relative(root, dir)
      .split(sep)
      .join('/')
      .replace(/^registry\//, '');
    const urlBase = `/docs/${rel}/images`;

    for (const [within, entry] of Object.entries(contents.images)) {
      manifest[`${urlBase}/${within}`] = `/docs/img/${entry}`;
      logical++;

      const to = join(POOL, entry);
      if (wanted.has(to)) {
        reused++;
        continue;
      }
      wanted.add(to);
      const from = poolPath(dir, entry);
      if (!from) continue;
      if (existsSync(to) && statSync(to).size === statSync(from).size) {
        reused++;
        continue;
      }
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
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

// Anything left behind belongs to a version that no longer exists, or to a
// layout this replaced.
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
