import { CONTENTS, type Contents } from '../src/lib/docs/pool.ts';
import { POOL_DIR, POOL_SCHEMA_VERSION, putBlob, poolSize, sweep } from './lib/pool.ts';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Rewrites the registry into its content-addressed form, and sweeps the pool.
 *
 * Idempotent: a version already carrying `contents.json` is read rather than
 * rebuilt, so this is safe to run at any time and is how orphaned blobs get
 * collected after a version is retired.
 *
 *   node scripts/pack-registry.ts            report what would change
 *   node scripts/pack-registry.ts --write    do it
 *
 * See `src/lib/docs/pool.ts` for the shape and the reasoning.
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const ROOTS = ['registry/sdk', 'registry/modules'];
const write = process.argv.includes('--write');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Directories holding a compiled version, wherever they sit.
 *
 * `registry/sdk/<version>` and `registry/modules/<id>/<version>` differ in
 * depth, so this looks for a marker rather than assuming a level. `_pool` is
 * skipped: it is the store, not a version.
 *
 * The marker is `docgen-manifest.json`, which only docgen writes. `index.json`
 * would be wrong and destructively so: `registry/modules/<id>/index.json` is
 * the module descriptor — id, repo, aliases — sitting one level above the
 * compiled versions, and matching on it packs sixteen module descriptors as if
 * they were API indexes and then deletes them.
 */
const MARKER = 'docgen-manifest.json';

function versionDirs(base: string, depth = 3): string[] {
  if (!existsSync(base) || depth < 0) return [];
  const found: string[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === POOL_DIR) continue;
    const dir = join(base, entry.name);
    if (existsSync(join(dir, MARKER)) || existsSync(join(dir, CONTENTS))) found.push(dir);
    else found.push(...versionDirs(dir, depth - 1));
  }
  return found;
}

let totalBefore = 0;
let totalAfter = 0;

for (const rel of ROOTS) {
  const base = join(root, rel);
  const pool = join(base, POOL_DIR);
  const dirs = versionDirs(base);
  if (!dirs.length) continue;

  const wanted = new Set<string>();
  /** Pooled entry -> its size, so a dry run can total what it would store. */
  const blobBytes = new Map<string, number>();
  let manifestBytes = 0;
  let packed = 0;
  let already = 0;
  let before = 0;

  for (const dir of dirs) {
    before += walk(dir).reduce((n, f) => n + statSync(f).size, 0);

    const existing = join(dir, CONTENTS);
    if (existsSync(existing)) {
      // Already packed. Read it only to keep its blobs off the sweep list.
      const contents = JSON.parse(readFileSync(existing, 'utf8')) as Contents;
      wanted.add(contents.index);
      for (const e of Object.values(contents.types)) wanted.add(e);
      for (const e of Object.values(contents.images)) wanted.add(e);
      already++;
      continue;
    }

    const types: Record<string, string> = {};
    const images: Record<string, string> = {};

    const typesDir = join(dir, 'types');
    for (const file of walk(typesDir)) {
      if (!file.endsWith('.json')) continue;
      const name = relative(typesDir, file).split(sep).join('/').slice(0, -5);
      const bytes = readFileSync(file);
      const { entry } = putBlob(pool, bytes, '.json', write);
      types[name] = entry;
      wanted.add(entry);
      blobBytes.set(entry, bytes.length);
    }

    const imagesDir = join(dir, 'images');
    for (const file of walk(imagesDir)) {
      const ext = extname(file).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      const within = relative(imagesDir, file).split(sep).join('/');
      const bytes = readFileSync(file);
      const { entry } = putBlob(pool, bytes, ext, write);
      images[within] = entry;
      wanted.add(entry);
      blobBytes.set(entry, bytes.length);
    }

    const indexBytes = readFileSync(join(dir, 'index.json'));
    const { entry: index } = putBlob(pool, indexBytes, '.json', write);
    wanted.add(index);
    blobBytes.set(index, indexBytes.length);

    const contents: Contents = {
      schemaVersion: POOL_SCHEMA_VERSION,
      index,
      types: Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b))),
      images: Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b))),
    };

    const body = `${JSON.stringify(contents, null, 2)}\n`;
    manifestBytes += Buffer.byteLength(body);
    if (write) {
      writeFileSync(join(dir, CONTENTS), body);
      rmSync(join(dir, 'index.json'));
      rmSync(typesDir, { recursive: true, force: true });
      rmSync(imagesDir, { recursive: true, force: true });
    }
    packed++;
  }

  const swept = write ? sweep(pool, wanted) : 0;
  // On a dry run the pool does not exist yet, so its size has to come from the
  // blobs that would go into it rather than from disk.
  const after = write
    ? poolSize(pool)
    : { files: wanted.size, bytes: [...blobBytes.values()].reduce((n, b) => n + b, 0) };
  // What stays in the version directories themselves: metadata, the docgen
  // manifest, and the new contents.json. On a dry run the packed sources are
  // still on disk, so they are excluded by name rather than by counting what
  // is left.
  const kept =
    after.bytes +
    dirs.reduce(
      (n, d) =>
        n +
        walk(d)
          .filter((f) => {
            const within = relative(d, f).split(sep);
            return within[0] !== 'types' && within[0] !== 'images' && within[0] !== 'index.json';
          })
          .reduce((m, f) => m + statSync(f).size, 0),
      dirs.length * 0
    ) +
    // contents.json, which a dry run has not written.
    (write ? 0 : manifestBytes);

  totalBefore += before;
  totalAfter += kept;

  const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
  console.log(
    `${rel}: ${dirs.length} version(s) — ${packed} packed, ${already} already` +
      `\n  pool ${after.files} blobs, ${mb(after.bytes)}` +
      (swept ? ` (${swept} orphan(s) swept)` : '') +
      // `before` counts the sources this run would replace, so on an already
      // packed tree it is not the size anything shrank from.
      (packed ? `\n  ${mb(before)} -> ${mb(kept)}` : `\n  ${mb(kept)} on disk`)
  );
}

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
console.log(
  (totalBefore > totalAfter
    ? `\ntotal ${mb(totalBefore)} -> ${mb(totalAfter)}`
    : `\ntotal ${mb(totalAfter)} on disk — nothing to pack`) +
    (write ? '' : '  (dry run — pass --write to apply)')
);
