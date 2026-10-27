import { readImages, type ImagePolicy } from '../registry-images.ts';

/**
 * The pictures beside a showcase entry (TI-54): its icon, and its screenshots.
 *
 * Committed files at `registry/showcase/<id>.<ext>` for the icon and
 * `registry/showcase/<id>-1.<ext>` to `<id>-5.<ext>` for the screenshots, next
 * to the app's own JSON, copied into `public/` at build time by
 * `scripts/sync-registry-images.ts`.
 *
 * What may be published, and why a picture is a committed file rather than a
 * URL, is in `../registry-images.ts` - the developer directory publishes its
 * pictures through the same rules. What is particular to the showcase is here:
 * an icon is required rather than optional, and an entry may carry a few
 * numbered screenshots as well.
 */

/**
 * The per-file cap, in bytes, for icons and screenshots alike.
 *
 * A deployment budget rather than a taste judgement, and the same figure the
 * directory uses. The 100MB limit is measured against the static output, which
 * the showcase shares with the whole compiled documentation set, so every
 * entry's pictures come out of headroom measured in single-digit megabytes. A
 * 256x256 WebP icon lands around 15KB, and a phone screenshot saved as WebP at
 * around 540px wide fits under the cap at a quality nobody will notice.
 */
export const ICON_MAX_BYTES = 100 * 1024;

/**
 * How many screenshots an entry may carry.
 *
 * Small on purpose, because of the budget above: at the cap, an entry with all
 * five is half a megabyte, and the showcase shares its headroom with everything
 * else on the site. See `docs/app-showcase.md` for the arithmetic. Five is also
 * what fits in one row on the app page.
 */
export const MAX_SCREENSHOTS = 5;

/** `<id>-<n>`, the name a screenshot's file has without its extension. */
const screenshotKey = (id: string, n: number) => `${id}-${n}`;

/** The keys under which an entry's screenshots are matched, in display order. */
const screenshotKeys = (id: string): string[] =>
  Array.from({ length: MAX_SCREENSHOTS }, (_, i) => screenshotKey(id, i + 1));

/** Something named like a screenshot: a base, a dash, and digits. */
const NUMBERED = /^(.+)-(\d+)$/;

const POLICY: ImagePolicy = {
  maxBytes: ICON_MAX_BYTES,
  noun: 'app',
  advice: (name) =>
    NUMBERED.test(name.replace(/\.[a-z]+$/, ''))
      ? 'Scale it to about 540px wide and save it as .webp'
      : 'Scale it to 256x256 and save it as .webp',
};

/**
 * Why a numbered file that belongs to no key was refused, if it looks like a
 * screenshot of an entry that exists.
 *
 * `acme-tools-6.webp` or `acme-tools-0.png` beside `acme-tools.json` is not a
 * mystery orphan, it is somebody numbering their screenshots wrong. Saying so
 * costs a few lines and saves the round trip where they rename the file and get
 * the same error back.
 */
function screenshotHint(problem: string, known: Set<string>): string | null {
  const orphan = /^(.+)\.[a-z]+: no app called/.exec(problem);
  const numbered = orphan && NUMBERED.exec(orphan[1]);
  if (!numbered || !known.has(numbered[1])) return null;
  return `${problem.split(':')[0]}: an app carries at most ${MAX_SCREENSHOTS} screenshots, named "${numbered[1]}-1" to "${numbered[1]}-${MAX_SCREENSHOTS}". See docs/app-showcase.md`;
}

export type ShowcaseImages = {
  /** App id to icon filename. Every app has one. */
  icons: Map<string, string>;
  /** App id to screenshot filenames in numbered order. Only apps that have any. */
  screenshots: Map<string, string[]>;
};

/**
 * Every picture in the folder, and everything wrong with the folder.
 *
 * Two callers with different needs: the build wants the maps and should stop at
 * the first thing wrong, and `pnpm check:registry` wants to print everything
 * wrong at once so a submitter fixes their entry in one pass rather than one
 * round trip per mistake.
 *
 * Screenshots go through the same reader as icons, under the keys `<id>-1` to
 * `<id>-5`, so they meet the same format and size rules and the same "one file
 * per key" rule - two files for `<id>-1` is refused the way two icons are.
 *
 * @param ids the apps that exist. Every one of them has to have an icon, so
 *   this is both what names an orphan and what makes a gap a failure.
 */
export function readIcons(
  dir: string,
  ids: readonly string[]
): ShowcaseImages & { problems: string[] } {
  const keys = [...ids, ...ids.flatMap(screenshotKeys)];
  const { pictures, problems } = readImages(dir, keys, POLICY);
  const known = new Set(ids);

  const explained = problems.map((problem) => screenshotHint(problem, known) ?? problem);

  const icons = new Map<string, string>();
  const screenshots = new Map<string, string[]>();

  // Reported after the file problems rather than mixed in with them: a missing
  // icon is usually the *consequence* of one of the lines above - a rejected
  // .svg leaves the entry with nothing - and reading them in that order is
  // what makes the pair legible.
  for (const id of ids) {
    const icon = pictures.get(id);
    if (icon) icons.set(id, icon);
    else {
      explained.push(
        `${id}.json: every app needs an icon. Commit one as "${id}.png", ".jpg" or ".webp" beside it`
      );
    }

    const shots = screenshotKeys(id)
      .map((key) => pictures.get(key))
      .filter((file): file is string => !!file);
    if (shots.length) screenshots.set(id, shots);
  }

  return { icons, screenshots, problems: explained };
}

/**
 * Every icon and screenshot, by app id.
 *
 * Throws rather than skipping. An entry whose picture cannot be published is a
 * mistake somebody made on purpose - they committed a file, or forgot to - and
 * carrying on would render a grid with a hole in it and nothing to explain why.
 */
export function imagesByApp(dir: string, ids: readonly string[]): ShowcaseImages {
  const { icons, screenshots, problems } = readIcons(dir, ids);
  if (problems.length) throw new Error(`registry/showcase/${problems[0]}`);
  return { icons, screenshots };
}

/** Every file the showcase publishes, for the sync step to copy. */
export function publishedFiles(dir: string, ids: readonly string[]): string[] {
  const { icons, screenshots } = imagesByApp(dir, ids);
  return [...icons.values(), ...[...screenshots.values()].flat()];
}

/** Where a picture is served from, once the sync step has copied it. */
export const iconUrl = (name: string): string => `/showcase/${name}`;
