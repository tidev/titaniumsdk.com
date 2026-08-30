import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';

/**
 * Copies the images that apidoc prose references.
 *
 * They sit beside the YAML — `Titanium/UI/Button.yml` refers to
 * `./button_android.png`, meaning `Titanium/UI/button_android.png` — so the
 * tree structure has to be preserved for those relative links to resolve.
 *
 * Only images. The tree also holds 43 `.mdoc` changelog files that nothing in
 * the type descriptions points at.
 */

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

/** Where a version's images live, relative to that version's output directory. */
export const IMAGES_DIR = 'images';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

export type AssetResult = { copied: number; removed: number; unchanged: number };

export function copyImages(apidoc: string, outDir: string): AssetResult {
  const target = join(outDir, IMAGES_DIR);
  const found = walk(apidoc).map((f) => relative(apidoc, f).split(sep).join('/'));
  const wanted = new Set(found);

  let copied = 0;
  let unchanged = 0;
  for (const rel of found) {
    const from = join(apidoc, rel);
    const to = join(target, rel);
    // Size and mtime are not reliable across a fresh CI checkout, so compare
    // size only and re-copy when it differs. Images here are immutable in
    // practice; this is about not rewriting 54 files every run.
    if (existsSync(to) && statSync(to).size === statSync(from).size) {
      unchanged++;
      continue;
    }
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    copied++;
  }

  let removed = 0;
  if (existsSync(target)) {
    for (const f of walk(target)) {
      const rel = relative(target, f).split(sep).join('/');
      if (wanted.has(rel)) continue;
      rmSync(f);
      removed++;
    }
  }

  return { copied, removed, unchanged };
}
