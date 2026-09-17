import { type Problem } from '../docs/guides.ts';
import { allPaths } from '../docs/ia.ts';
import { renderMarkdown } from '../docs/markdown.ts';
import { latestSdkVersion, sdkToolchain, sdkTypeNames, sdkVersions } from '../docs/registry.ts';
import { releaseNote } from '../docs/release-notes.ts';
import { activeCategories, allPosts, allTags, pageCount } from './posts.ts';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every internal link in a post body resolves (TI-67).
 *
 * The 50 posts were written for the old documentation wiki and arrived
 * pointing at it: 46 of the 47 distinct non-asset internal paths in their
 * bodies had no page here, 87 links in all, most of them per-version release
 * notes. `/contribute` was the only one that resolved. Fixing that once is not
 * enough on its own. The archive is content other people wrote, more posts
 * will be added by hand, and a dead link in prose is invisible until a reader
 * clicks it, so this is a check that fails the build rather than a pass someone
 * made over the corpus.
 *
 * `validateGuides` does the same job for `content/docs` and this deliberately
 * mirrors it, down to returning every problem rather than throwing on the
 * first. It is a second function rather than a branch inside that one because
 * the two answer to different structures: a guide is checked against `ia.ts`,
 * and a post can point at anything the site serves.
 *
 * ## What counts as resolving
 *
 * Static routes are read off `src/app`, so a route added or removed is
 * reflected without anyone updating a list here. The dynamic families are
 * resolved against the same data the routes generate their params from:
 * `allPosts()`, `ia.ts`, the compiled registry. Files are checked against
 * `public/`.
 *
 * An internal path that matches none of them is a problem, including one this
 * module simply does not know how to resolve. That direction is deliberate. A
 * link the check cannot verify is a link nobody has verified, and the cost of
 * being wrong is a 404 in published prose against a one-line addition here.
 */

const APP = join(process.cwd(), 'src/app');
const PUBLIC = join(process.cwd(), 'public');

/**
 * Routes with no dynamic segment, read from the App Router's own tree.
 *
 * Route groups contribute nothing to the URL, and a dynamic segment cannot be
 * enumerated from the filesystem, so both are handled by the callers below.
 */
function staticRoutes(dir = APP, prefix = ''): Set<string> {
  const out = new Set<string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // `[slug]` is dynamic; `_components` and `@modal` are not URL segments.
      if (/^[[_@]/.test(entry.name)) continue;
      const group = /^\(.*\)$/.test(entry.name);
      for (const route of staticRoutes(path, group ? prefix : `${prefix}/${entry.name}`)) {
        out.add(route);
      }
    } else if (/^(?:page|route)\.tsx?$/.test(entry.name)) {
      out.add(prefix || '/');
    }
  }
  return out;
}

let routes: Set<string> | undefined;
const knownRoutes = (): Set<string> => (routes ??= staticRoutes());

/**
 * Looks like a filename, for the wording of the failure only.
 *
 * Never for deciding where to look: `/docs/sdk/Titanium.UI.Window` ends in what
 * a naive test reads as a `.Window` extension, and checking `public/` for it
 * would have failed every API link the blog might one day carry.
 */
const looksLikeFile = (path: string) => /\.[a-z0-9]{2,5}$/i.test(path.split('/').pop() ?? '');

/**
 * Why this path does not resolve, or null when it does.
 *
 * Exported for the test, which drives it directly rather than through the 50
 * committed posts: a check that only ever sees content it passes on is a check
 * nobody has seen fail.
 */
export function unresolved(path: string): string | null {
  // A served file wins outright, before any route is considered. `public/` is
  // step 5 of routing and a static asset has no page to compare against.
  if (!path.split('/').includes('..')) {
    const file = join(PUBLIC, path);
    if (existsSync(file) && statSync(file).isFile()) return null;
  }

  const clean = path.length > 1 ? path.replace(/\/$/, '') : path;
  if (knownRoutes().has(clean)) return null;

  const segments = clean.split('/').slice(1);
  const why =
    segments[0] === 'blog'
      ? unresolvedBlog(segments.slice(1))
      : segments[0] === 'docs'
        ? unresolvedDocs(segments.slice(1))
        : 'not a route this site serves';

  if (!why) return null;
  // Added to the reason rather than replacing it: `/docs/build/deploy.html`
  // ends in something that reads as an extension but is an IA problem, and
  // saying only "no such file" sends the author to look in the wrong place.
  return looksLikeFile(clean) ? `${why}, and no such file under public/` : why;
}

function unresolvedBlog(rest: string[]): string | null {
  const [first, second] = rest;

  if (first === 'page') {
    const page = Number(second);
    return rest.length === 2 && page >= 1 && page <= pageCount() ? null : 'no such blog page';
  }
  if (first === 'category') {
    // The categories with posts in them, not the three the type allows: the
    // route sets `dynamicParams = false` and generates its params from the
    // same call, so an empty category is a 404 rather than an empty archive.
    const known = activeCategories().map(({ category }) => category.toLowerCase());
    return rest.length === 2 && known.includes(second) ? null : 'no such blog category';
  }
  if (first === 'tag') {
    const known = allTags().map((t) => t.tag);
    return rest.length === 2 && known.includes(second) ? null : 'no such blog tag';
  }

  if (rest.length !== 1) return 'not a route the blog serves';
  return allPosts().some((p) => p.slug === first) ? null : 'no post with this slug';
}

/**
 * `/docs/...`, which is two trees sharing a prefix.
 *
 * The guides are the approved IA in `ia.ts`. `/docs/sdk` is the compiled API
 * reference, addressed either unversioned (the latest release) or with a
 * version in the path, plus the release notes and compatibility page beside
 * each version.
 */
function unresolvedDocs(rest: string[]): string | null {
  if (rest[0] !== 'sdk') {
    return allPaths().includes(['/docs', ...rest].join('/'))
      ? null
      : 'a path the docs IA does not define';
  }

  const [, first, second] = rest;
  const versions = sdkVersions();
  const latest = latestSdkVersion();

  // Release notes first, and against their own version list. They are a static
  // segment beside `[type]` and go back to 8.0.0, while only the twenty
  // versions with a compiled reference are in `sdkVersions()` (TI-72).
  if (rest.length === 3 && second === 'release-notes') {
    return releaseNote(first) ? null : `SDK ${first} has no captured release note`;
  }

  // Compatibility, likewise a static segment beside `[type]` (TI-94). Against
  // the capture rather than against `sdkVersions()`: the route generates its
  // params from the versions that have a `toolchain.json`, so a compiled
  // version captured later is the one case where the two disagree.
  if (rest.length === 3 && second === 'compatibility') {
    return sdkToolchain(first) ? null : `SDK ${first} has no captured toolchain`;
  }

  // Unversioned: `/docs/sdk/<Type>` at the latest release.
  if (rest.length === 2) {
    if (versions.includes(first)) return null;
    if (latest && sdkTypeNames(latest).has(first)) return null;
    return 'no such SDK version or type';
  }

  if (rest.length === 3 && versions.includes(first)) {
    return sdkTypeNames(first).has(second) ? null : `no such type in SDK ${first}`;
  }

  return 'not a route the SDK reference serves';
}

/** Every `href` in rendered HTML, external ones included. */
function hrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
}

/** This site written out in full, which a link should not be. */
const SELF = /^https?:\/\/(?:www\.)?titaniumsdk\.com(?=\/|$)/;

/**
 * The old documentation wiki, in any form.
 *
 * Scanned against the markdown rather than the rendered HTML, because five of
 * these arrived as bare prose - "review our new user setup process by clicking
 * here: https://…" - which `linkify: false` renders as text rather than as an
 * anchor. A dead address a reader is invited to copy is still a dead address,
 * and the link check cannot see one.
 *
 * The host is anchored, and the bare-path form has to start a token. `/guide/`
 * on its own is somebody else's URL as often as it is ours - Android's docs
 * live under `developer.android.com/guide/` - and a check that cannot tell
 * them apart fails the build on a link there is no way to write.
 */
export const LEGACY_GUIDE = /https?:\/\/(?:www\.)?titaniumsdk\.com\/guide\/|(?:^|[\s(])\/guide\//;

/**
 * Every problem with the links in `content/blog`, gathered rather than thrown.
 *
 * Run over the rendered HTML rather than the markdown source, so what is
 * checked is what ships: a link inside a fenced block is not a link, and one
 * the sanitizer drops cannot 404.
 */
export function validatePosts(): Problem[] {
  const problems: Problem[] = [];

  for (const post of allPosts()) {
    const where = `content/blog/${post.slug}.md`;

    if (LEGACY_GUIDE.test(post.body)) {
      problems.push({
        where,
        message:
          'references the legacy /guide/ documentation wiki, which this site does not serve ' +
          '(see scripts/lib/legacy-blog-links.ts for where those addresses map to)',
      });
    }

    for (const href of hrefs(renderMarkdown(post.body, {}))) {
      if (SELF.test(href)) {
        problems.push({
          where,
          message:
            `absolute link to this site: ${href} ` +
            `(write the path, so it survives a preview deploy)`,
        });
        continue;
      }
      if (!href.startsWith('/')) continue;

      const [path] = href.split(/[#?]/);
      const why = unresolved(path);
      if (why) problems.push({ where, message: `${why}: ${href}` });
    }
  }

  return problems;
}
