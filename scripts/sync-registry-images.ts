import { avatarsByProfile } from '../src/lib/directory/avatar.ts';
import { publishedFiles } from '../src/lib/showcase/icon.ts';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Mirrors hand-submitted registry pictures into `public/` so Next can serve
 * them: developer directory avatars (TI-58) and app showcase icons and
 * screenshots (TI-54).
 *
 * They are committed beside the entry they belong to rather than dropped into
 * `public/` directly - see `src/lib/registry-images.ts` for why a picture is a
 * committed file at all.
 *
 * ## This step is the enforcement, not a convenience
 *
 * Everything under `public/` is served verbatim, by the host's own static layer
 * in deployment, with nothing between the file and the reader. A picture
 * committed straight into `public/` would therefore be published whatever it
 * was: any size, any format, belonging to no entry at all.
 *
 * Making the copy the only route in means the rules in `imageProblem` are not
 * merely checked somewhere, they are the thing that publishes. A file that
 * fails them has no path to the site.
 *
 * The destinations are gitignored and rebuilt from scratch, so a picture is
 * committed exactly once and a deleted entry cannot leave one behind.
 *
 *   node scripts/sync-registry-images.ts
 */

const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * The two registries people submit pictures to, and how each decides which
 * files may be published.
 *
 * `read` throws on the first thing wrong rather than returning it. That is the
 * build's contract with `pnpm check:registry`, which has already printed every
 * problem at once by the time anyone gets here.
 */
const REGISTRIES = [
  {
    name: 'directory',
    read: (dir: string, ids: string[]) => [...avatarsByProfile(dir, ids).values()],
    noun: 'listing picture',
  },
  { name: 'showcase', read: publishedFiles, noun: 'app picture' },
] as const;

/** The entries that exist in a registry, by id. Their pictures are named after them. */
function entryIds(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => basename(name, '.json'));
}

function sync({ name, read, noun }: (typeof REGISTRIES)[number]): void {
  const source = join(root, 'registry', name);
  const destination = join(root, 'public', name);

  // Everything is checked before anything is removed. `read` throws on the
  // first unpublishable file, and clearing the destination first would mean a
  // rejected picture took every good one down with it - leaving a build that
  // still references them and quietly serves none.
  const files = read(source, entryIds(source));

  // Rebuilt rather than updated. An entry removed in the same commit that added
  // it back under another name would otherwise leave its picture served at a
  // URL nothing links to.
  rmSync(destination, { recursive: true, force: true });

  if (!files.length) {
    console.log(`${name}: no ${noun}s to publish`);
    return;
  }

  mkdirSync(destination, { recursive: true });
  for (const file of files) {
    copyFileSync(join(source, file), join(destination, file));
  }

  console.log(`${name}: published ${files.length} ${noun}(s) to public/${name}/`);
}

for (const registry of REGISTRIES) sync(registry);
