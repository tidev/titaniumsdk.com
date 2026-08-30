import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
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

let copied = 0;
let unchanged = 0;
const wanted = new Set<string>();

for (const source of SOURCES) {
  for (const { from, rel } of imageDirs(source)) {
    // registry/sdk/main/images/... -> public/docs/sdk/main/images/...
    const target = join(PUBLIC, rel.replace(/^registry\//, ''), 'images');
    for (const file of walk(from)) {
      const to = join(target, relative(from, file));
      wanted.add(to);
      if (existsSync(to) && statSync(to).size === statSync(file).size) {
        unchanged++;
        continue;
      }
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(file, to);
      copied++;
    }
  }
}

// Anything left behind belongs to a version that no longer exists.
let removed = 0;
for (const file of walk(PUBLIC)) {
  if (wanted.has(file)) continue;
  rmSync(file);
  removed++;
}

console.log(
  `doc assets: ${copied} copied, ${unchanged} unchanged` + (removed ? `, ${removed} removed` : '')
);
