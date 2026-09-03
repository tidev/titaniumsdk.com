import { putBlob } from '../lib/pool.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

/**
 * Pools the images that apidoc prose references.
 *
 * They sit beside the YAML — `Titanium/UI/Button.yml` refers to
 * `./button_android.png`, meaning `Titanium/UI/button_android.png` — so the
 * path a description writes has to keep resolving. It is recorded as the key of
 * the returned map rather than reproduced as a directory: the file itself goes
 * into the registry's content-addressed pool under its own hash.
 *
 * That indirection is the whole point. Every release ships the same 54
 * screenshots; storing them per version cost 178MB to hold 8.9MB of distinct
 * pictures, and all 178MB was traced into the serverless bundle for a route
 * that never opens them.
 *
 * Only images. The tree also holds 43 `.mdoc` changelog files that nothing in
 * the type descriptions points at.
 */

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

export type AssetResult = {
  /** Path as prose refers to it -> pooled filename. */
  images: Record<string, string>;
  /** Images whose bytes were not already in the pool. */
  stored: number;
};

export function poolImages(apidoc: string, pool: string): AssetResult {
  const images: Record<string, string> = {};
  let stored = 0;

  for (const file of walk(apidoc).sort()) {
    const rel = relative(apidoc, file).split(sep).join('/');
    const { entry, written } = putBlob(pool, readFileSync(file), extname(file).toLowerCase());
    images[rel] = entry;
    if (written) stored++;
  }

  return { images, stored };
}
