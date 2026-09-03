import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rewrites a doc image URL onto the file that actually holds it.
 *
 * `scripts/sync-doc-assets.ts` mirrors the registry's images into `public/` as
 * one file per *distinct* image rather than one per version, because every
 * compiled release carries its own byte-identical copy of the same 54
 * screenshots — measured unchanged across the 13 months from 12.8.0 to 13.4.1.
 * Without this, nineteen releases would deploy the same 9MB nineteen times.
 *
 * Pages still build the logical URL for their own version. This maps it onto
 * the pooled file at render time, which keeps the version in the page's mental
 * model and out of the asset store.
 *
 * A URL with no entry is returned unchanged: an image the sync has not seen is
 * a missing image either way, and rewriting it to nothing would turn a broken
 * picture into a silently absent one.
 */

const MANIFEST = join(process.cwd(), 'public/docs/assets.json');

let table: Record<string, string> | undefined;

function manifest(): Record<string, string> {
  if (table) return table;
  // Absent before the first sync — during `next dev` on a clean checkout, say.
  table = existsSync(MANIFEST)
    ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>)
    : {};
  return table;
}

export function assetUrl(url: string): string {
  return manifest()[url] ?? url;
}
