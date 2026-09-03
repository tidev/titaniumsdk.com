import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writing side of the content-addressed registry store.
 *
 * The reading side, and why any of this exists, is in `src/lib/docs/pool.ts`.
 *
 * Sixteen hex characters of SHA-256. The registry holds on the order of a
 * thousand distinct blobs and would need about 2^32 before a collision became
 * likely, so this is many orders of magnitude clear of the corpus while keeping
 * a manifest readable by eye.
 */

export const POOL_DIR = '_pool';
export const POOL_SCHEMA_VERSION = 1;

export const digestOf = (bytes: Buffer | string): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 16);

/**
 * Files a blob under its own hash, and reports whether that cost a write.
 *
 * A blob already in the pool is left alone rather than rewritten: identical
 * bytes at an identical path would still move the mtime, and the commit step in
 * TI-18 decides what to publish by diffing the tree.
 */
export function putBlob(
  pool: string,
  bytes: Buffer | string,
  ext: string,
  write = true
): { entry: string; written: boolean } {
  const entry = `${digestOf(bytes)}${ext}`;
  const path = join(pool, entry);
  if (existsSync(path)) return { entry, written: false };
  // A dry run reports the same answer without leaving the pool behind. The
  // name is the hash, so nothing about it depends on having written the file.
  if (!write) return { entry, written: true };
  mkdirSync(pool, { recursive: true });
  writeFileSync(path, bytes);
  return { entry, written: true };
}

/**
 * Deletes pooled blobs that no manifest names any more.
 *
 * Retention removes a version by deleting its manifest, which orphans whatever
 * only that version used. Nothing else collects those, so this runs after any
 * operation that can drop a reference — and it takes the full wanted set rather
 * than a delta, because a blob shared by fifteen versions must survive fourteen
 * of them going away.
 */
export function sweep(pool: string, wanted: ReadonlySet<string>): number {
  if (!existsSync(pool)) return 0;
  let removed = 0;
  for (const entry of readdirSync(pool)) {
    if (wanted.has(entry)) continue;
    rmSync(join(pool, entry), { recursive: true });
    removed++;
  }
  return removed;
}

/** Total bytes held by the pool, for the size accounting these changes exist for. */
export function poolSize(pool: string): { files: number; bytes: number } {
  if (!existsSync(pool)) return { files: 0, bytes: 0 };
  const entries = readdirSync(pool);
  return {
    files: entries.length,
    bytes: entries.reduce((n, e) => n + statSync(join(pool, e)).size, 0),
  };
}
