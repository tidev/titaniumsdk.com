import { MODULES_DIR } from './registry-paths.ts';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The recorded SHA-256 for module assets, keyed by download URL.
 *
 * Written by `scripts/backfill-checksums.ts` and read by the generator, which
 * cannot keep these in metadata.json: `assets` is a key it owns and rebuilds
 * from the GitHub API each run, so anything upstream has no digest for would
 * be dropped on the next regen.
 */
const SIDECAR = join(MODULES_DIR, 'checksums.json');

type Entry = { filename: string; size: number; checksum: string; source: 'computed' | 'github' };

let cache: Map<string, string> | undefined;

export function checksums(): Map<string, string> {
  if (cache) return cache;
  cache = new Map();
  if (existsSync(SIDECAR)) {
    const parsed = JSON.parse(readFileSync(SIDECAR, 'utf8')) as { entries?: Record<string, Entry> };
    for (const [url, entry] of Object.entries(parsed.entries ?? {})) {
      cache.set(url, entry.checksum);
    }
  }
  return cache;
}
