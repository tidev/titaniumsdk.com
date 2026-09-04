import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

/**
 * The content-addressed store behind every compiled version directory.
 *
 * ## Why
 *
 * Twenty compiled SDK releases held 6,843 files and 291MB, of which 32MB was
 * distinct — 89% of the registry was byte-identical copies. Images were the
 * worst of it: the same 54 screenshots stored twenty times, 178MB to say 8.9MB.
 * Types were next: 5,679 files, 522 distinct, because a mature API changes very
 * little between point releases and an untouched type emits identical bytes.
 *
 * That duplication is invisible in git, which content-addresses blobs itself and
 * stores the whole registry in 15MB. It is *not* invisible to Vercel: the docs
 * route traced 299MB into its serverless bundle, against a 250MB limit, and
 * every one of those megabytes was a file the request would never open.
 *
 * ## Shape
 *
 *   registry/sdk/_pool/<sha16>.json      one file per distinct document
 *   registry/sdk/13.4.1/contents.json    names the ones this version uses
 *
 * A version directory is therefore a manifest rather than a tree. It names its
 * blobs and nothing else — where the pool sits is found by looking upward for
 * `_pool`, since `registry/sdk/<version>/` and
 * `registry/modules/<id>/<version>/` sit at different depths and share these
 * readers. See `poolRoot`.
 *
 * Immutability survives the change, and arguably improves: a published version's
 * manifest is written once and frozen, and a pooled blob cannot change at all
 * without changing its own name. Retention deletes a manifest; the pool is then
 * swept for blobs nothing names — see `scripts/pack-registry.ts`.
 */

export const CONTENTS = 'contents.json';

/** The shared store's directory name, at or above every version directory. */
export const POOL = '_pool';

/**
 * A pooled filename: the content hash and an extension, nothing else.
 *
 * Enforced here as well as at `poolPath`, so `scripts/validate-registry.ts`
 * rejects a manifest that could reach outside the pool rather than waiting for
 * a reader to refuse it at render time.
 */
const Entry = z.string().regex(/^[0-9a-f]{8,64}\.[a-z0-9]+$/);

export const ContentsSchema = z.strictObject({
  schemaVersion: z.number().int().positive(),
  /** Pooled filename of this version's `index.json`. */
  index: Entry,
  /** Type name -> pooled filename. */
  types: z.record(z.string(), Entry),
  /** Path as apidoc prose refers to the image -> pooled filename. */
  images: z.record(z.string(), Entry),
});

export type Contents = z.infer<typeof ContentsSchema>;

const cache = new Map<string, Contents | null>();

export function contentsOf(dir: string): Contents | null {
  const cached = cache.get(dir);
  if (cached !== undefined) return cached;
  const path = join(dir, CONTENTS);
  const value = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Contents) : null;
  cache.set(dir, value);
  return value;
}

/** How far above a version directory the pool is allowed to be. */
const SEARCH_DEPTH = 3;

const poolRoots = new Map<string, string | null>();

/**
 * The pool a version directory draws from: the nearest `_pool` at or above it.
 *
 * The manifest used to carry this as a relative path, which was a fact about
 * where the file sits rather than about what it holds, and it could be wrong.
 * Looking cannot be: `registry/sdk/<version>` finds `registry/sdk/_pool` one
 * level up, `registry/modules/<id>/<version>` finds `registry/modules/_pool`
 * two up, and the developer CLI's scratch directory owns its pool outright.
 * Three probes covers all three, and the answer is cached per directory.
 */
export function poolRoot(dir: string): string | null {
  const cached = poolRoots.get(dir);
  if (cached !== undefined) return cached;

  let at = dir;
  for (let up = 0; up <= SEARCH_DEPTH; up++) {
    const candidate = join(at, POOL);
    if (existsSync(candidate)) {
      poolRoots.set(dir, candidate);
      return candidate;
    }
    const parent = dirname(at);
    if (parent === at) break;
    at = parent;
  }
  poolRoots.set(dir, null);
  return null;
}

/**
 * Absolute path of one pooled file.
 *
 * `entry` comes from a manifest this build wrote, never from a URL, but it is
 * still checked: a manifest is a file on disk and a name that escaped the pool
 * would read anything the process can. Names are `<hex>.<ext>` and nothing
 * else, so the result cannot leave the directory `poolRoot` found.
 */
export function poolPath(dir: string, entry: string): string | null {
  if (!/^[0-9a-f]{8,64}\.[a-z0-9]+$/.test(entry)) return null;
  const root = poolRoot(dir);
  return root && join(root, entry);
}

/**
 * Absolute path of a compiled version's `index.json` within the pool.
 *
 * Null when the directory holds no compiled version. docgen resolves one repo's
 * references into another's index, and both entry points need this, so the
 * lookup lives here rather than being open-coded against a filename that no
 * longer exists.
 */
export function indexPath(dir: string): string | null {
  const contents = contentsOf(dir);
  return contents ? poolPath(dir, contents.index) : null;
}
