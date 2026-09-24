import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * What may be published as a picture, and how a picture is matched to the entry
 * it belongs to.
 *
 * Shared by the developer directory (TI-58), where a picture is a listee's
 * photo or an agency's logo, and by the app showcase (TI-54), where it is an
 * app icon. Both take the same route to the site: a file committed beside the
 * JSON it belongs to, named after that entry's `id`, copied into `public/` at
 * build time by `scripts/sync-registry-images.ts`.
 *
 * ## Why not a URL in the entry
 *
 * A remote image could not work here and should not. The build refuses network
 * access outright - `scripts/assert-offline.ts` fails the process on any
 * outbound socket - so nothing remote can be fetched, measured or checked at
 * the point it matters.
 *
 * The stronger reason is the reader. An `<img>` pointed at a host of the
 * submitter's choosing sends every visitor's address, user agent and referer to
 * that host on every page view, and it can be swapped for a tracking pixel the
 * day after review. `docs/developer-directory.md` refuses to publish an email
 * address because the person who pays for it is the listee; here the person who
 * pays is the reader, who never asked to be here at all.
 *
 * A committed file also arrives as a diff, so it is reviewed like everything
 * else about a submission rather than being a URL nobody clicked.
 *
 * ## Why the filename rather than a field
 *
 * The file is named after the entry's `id`, and nothing in the JSON names it.
 * A field would be the same string written twice, and so a new way for an entry
 * to be wrong. Neither schema is touched by pictures.
 */

/**
 * What may be published, and what each one has to start with.
 *
 * Raster only. SVG is a document that can carry script and reference remote
 * resources, and it would be served from this site's own origin, so it is
 * refused rather than sanitised - there is no version of a picture that needs
 * to be a program.
 *
 * The magic bytes are checked because the extension is a claim about the file
 * and this is what makes it true. WebP is RIFF, which is a container: the
 * format is at byte 8, so it is matched separately below.
 */
const FORMATS = {
  '.png': [0x89, 0x50, 0x4e, 0x47],
  '.jpg': [0xff, 0xd8, 0xff],
  '.webp': [0x52, 0x49, 0x46, 0x46],
} as const;

export const IMAGE_EXTENSIONS = Object.keys(FORMATS) as (keyof typeof FORMATS)[];

/**
 * Spellings people reasonably reach for that this does not take, and what to do
 * instead. Named explicitly so the error can say so: "not a supported format"
 * sends someone hunting, and the answer for a `.jpeg` is to rename it.
 */
const REDIRECTED: Record<string, string> = {
  '.jpeg': 'rename it to .jpg',
  '.gif': 'save it as .png',
  '.svg':
    "export it to .png. SVG is not published: it can carry script, and it would be served from this site's own origin",
  '.avif': 'save it as .webp',
  '.bmp': 'save it as .png',
  '.tiff': 'save it as .png',
  '.ico': 'save it as .png',
};

/** What one registry's pictures are called and what they may weigh. */
export type ImagePolicy = {
  /** The per-file cap, in bytes. */
  maxBytes: number;
  /** What one entry is called, in errors: a "listing", an "app". */
  noun: string;
  /**
   * What to do about a file over the cap, in the submitter's terms. A function
   * where the answer depends on which file it is - the showcase's icons and
   * screenshots want different sizes.
   */
  advice: string | ((name: string) => string);
};

export const asKb = (bytes: number) => `${Math.ceil(bytes / 1024)}KB`;

/**
 * Does the file begin the way its extension claims?
 *
 * Reads the first twelve bytes rather than the file, because a picture that
 * fails this is not going to be read any further.
 */
function magicMatches(path: string, ext: keyof typeof FORMATS): boolean {
  const head = readFileSync(path).subarray(0, 12);
  const signature = FORMATS[ext];
  if (!signature.every((byte, i) => head[i] === byte)) return false;
  // RIFF is a container - AVI and WAV open identically. The format lives at
  // byte 8, so an unguarded RIFF check would accept a video renamed to .webp.
  if (ext === '.webp') return head.subarray(8, 12).toString('latin1') === 'WEBP';
  return true;
}

/** Why this file may not be published, or `null` if it may. */
export function imageProblem(path: string, name: string, policy: ImagePolicy): string | null {
  const ext = extname(name).toLowerCase();

  const instead = REDIRECTED[ext];
  if (instead) return `${name}: ${ext} is not published here. ${instead}`;

  if (!(ext in FORMATS)) {
    return `${name}: pictures must be ${IMAGE_EXTENSIONS.join(', ')}`;
  }

  const bytes = statSync(path).size;
  if (bytes > policy.maxBytes) {
    const advice = typeof policy.advice === 'string' ? policy.advice : policy.advice(name);
    return `${name}: ${asKb(bytes)} is over the ${asKb(policy.maxBytes)} limit. ${advice}`;
  }

  if (!magicMatches(path, ext as keyof typeof FORMATS)) {
    return `${name}: the contents are not ${ext}. Convert it rather than renaming it`;
  }

  return null;
}

/** Everything in a registry folder that is not an entry. */
const pictureNames = (dir: string): string[] =>
  readdirSync(dir)
    .filter((name) => !name.endsWith('.json') && !name.startsWith('.'))
    .sort();

/**
 * Every picture in a folder, sorted into the publishable and the not.
 *
 * One traversal, two callers with different needs: the build wants the map and
 * should stop at the first thing wrong, and `pnpm check:registry` wants to
 * print everything wrong at once so a submitter fixes their entry in one pass
 * rather than one round trip per mistake.
 *
 * @param ids the entries that exist, so an orphan can be named as one
 */
export function readImages(
  dir: string,
  ids: readonly string[],
  policy: ImagePolicy
): { pictures: Map<string, string>; problems: string[] } {
  const pictures = new Map<string, string>();
  const problems: string[] = [];
  if (!existsSync(dir)) return { pictures, problems };

  const known = new Set(ids);

  for (const name of pictureNames(dir)) {
    const problem = imageProblem(join(dir, name), name, policy);
    if (problem) {
      problems.push(problem);
      continue;
    }

    const id = name.slice(0, -extname(name).length);
    if (!known.has(id)) {
      problems.push(
        `${name}: no ${policy.noun} called "${id}". A picture is named after the ${policy.noun} it belongs to, and is deleted with it`
      );
      continue;
    }

    const already = pictures.get(id);
    if (already) {
      problems.push(`${name}: "${id}" already has ${already}. One picture per ${policy.noun}`);
      continue;
    }
    pictures.set(id, name);
  }

  return { pictures, problems };
}
