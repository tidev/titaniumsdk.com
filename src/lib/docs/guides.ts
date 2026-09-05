import { BlockError, renderBlocks, unresolvedMarkers } from './blocks.ts';
import { withHeadingAnchors, type Heading } from './headings.ts';
import {
  findPage,
  isValidSlug,
  MAX_DEPTH,
  PLATFORM_IDS,
  reservedSegments,
  SECTIONS,
  type PlatformId,
} from './ia.ts';
import { renderMarkdown } from './markdown.ts';
import { DirectiveError, expandDirectives, referencedPartials } from './partials.ts';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * Guide pages, read from `content/docs/**\/*.md` (TI-32).
 *
 * ## Markdown, not MDX
 *
 * The ticket is titled "MDX content pipeline", and this is not MDX. That is
 * deliberate and worth stating plainly rather than discovering later.
 *
 * This repository already has a markdown pipeline — markdown-it, a
 * sanitize-html allowlist, Shiki, and post-render transforms for callouts and
 * heading anchors. It renders the API reference prose, module READMEs, release
 * notes and the blog. TI-53 considered MDX for the blog and rejected it in as
 * many words, to avoid ending up with two pipelines; adding it here would
 * create exactly the split that decision avoided, and would mean a guide and an
 * API page rendered the same callout through different code.
 *
 * Everything the ticket asks content authors to be able to do — callouts, tabs,
 * code groups, platform badges, version notices — is a block-level construct,
 * not arbitrary React. Those are `:::` directives, which is one small parser
 * against a whole second toolchain. If a page ever genuinely needs a component
 * with state, that is the moment to revisit this, and the decision should be
 * made then rather than assumed now.
 *
 * ## Layout on disk
 *
 * The path mirrors the URL, so a page's address is knowable from its filename:
 *
 *   content/docs/index.md                     -> /docs
 *   content/docs/setup/index.md               -> /docs/setup
 *   content/docs/setup/macos.md               -> /docs/setup/macos
 *   content/docs/build/ui/index.md            -> /docs/build/ui
 *   content/docs/build/ui/layout.md           -> /docs/build/ui/layout
 *   content/docs/_partials/install-cli.md     -> not a page
 *
 * Section and page structure lives in `ia.ts`, not in the directory listing. A
 * file with no entry there is an error rather than a page, because a guide that
 * exists but appears in no sidebar is invisible, and that failure is silent.
 */

const CONTENT = join(process.cwd(), 'content/docs');

/** Overridable so tests can run the real pipeline over a fixture tree. */
const partialsIn = (root: string) => join(root, '_partials');

const FrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().default(''),
    /**
     * What this page applies to. Drives `:::only` blocks and the platform
     * badge. Absent means universal, which is the common case.
     */
    platforms: z.array(z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]])).optional(),
    /**
     * The SDK version a page's content assumes, shown as a notice. Prose is
     * unversioned by URL (TI-59) and says so inline where it matters.
     */
    since: z.string().optional(),
    /**
     * Work in progress. The page still renders at its URL — that is what makes
     * it reviewable — but it is not linked from the sidebar or a section index,
     * it says so at the top, and it asks search engines not to index it.
     */
    draft: z.boolean().default(false),
  })
  // Unknown keys are a typo, not an extension point. A misspelled `platform`
  // would otherwise silently apply to every platform.
  .strict();

export type Guide = {
  /** URL path, e.g. `/docs/setup/macos`. */
  path: string;
  /** `/docs`-relative segments, e.g. `['setup', 'macos']`. Empty for `/docs`. */
  segments: string[];
  title: string;
  description: string;
  platforms?: readonly string[];
  since?: string;
  draft: boolean;
  html: string;
  toc: Heading[];
  /** Repo-relative source, for the edit link. */
  sourcePath: string;
};

export class GuideError extends Error {}

const readerFor =
  (root: string) =>
  (name: string): string | undefined => {
    const file = join(partialsIn(root), `${name}.md`);
    return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  };

/** Where a set of segments would be read from, index form first. */
function sourceFor(root: string, segments: string[]): string | undefined {
  const base = join(root, ...segments);
  const candidates = segments.length
    ? [`${base}.md`, join(base, 'index.md')]
    : [join(root, 'index.md')];
  return candidates.find((f) => existsSync(f) && statSync(f).isFile());
}

function parse(root: string, segments: string[], file: string, text: string): Guide {
  const path = ['/docs', ...segments].join('/');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) throw new GuideError(`${path}: no frontmatter`);

  const parsed = FrontmatterSchema.safeParse(parseYaml(m[1]));
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'frontmatter'}: ${i.message}`)
      .join('; ');
    throw new GuideError(`${path}: ${detail}`);
  }
  const front = parsed.data;

  let expanded: string;
  try {
    expanded = expandDirectives(text.slice(m[0].length), {
      platforms: front.platforms,
      readPartial: readerFor(root),
    });
  } catch (err) {
    if (err instanceof DirectiveError) throw new GuideError(`${path}: ${err.message}`);
    throw err;
  }

  // No `link` option: guide prose is written for people, not against the type
  // tree, so an `api:` URI would be a mistake rather than something to resolve.
  let rendered: string;
  try {
    rendered = renderBlocks(renderMarkdown(expanded, {}));
  } catch (err) {
    if (err instanceof BlockError) throw new GuideError(`${path}: ${err.message}`);
    throw err;
  }

  // A marker no transform consumed is a mistake that would otherwise ship as
  // literal `:::` in the prose — usually a missing blank line around it, which
  // makes markdown-it fold the marker into the paragraph below.
  const stray = unresolvedMarkers(rendered);
  if (stray.length) {
    throw new GuideError(
      `${path}: unrecognised or unclosed block marker: ${stray.join(', ')} ` +
        `(a marker needs a blank line above and below it)`
    );
  }

  const { html, toc } = withHeadingAnchors(rendered);

  return {
    path,
    segments,
    title: front.title,
    description: front.description,
    ...(front.platforms ? { platforms: front.platforms } : {}),
    ...(front.since ? { since: front.since } : {}),
    draft: front.draft,
    html,
    toc,
    sourcePath: file.slice(process.cwd().length + 1),
  };
}

const cache = new Map<string, Guide | null>();

/**
 * Caching is a production-only optimisation.
 *
 * A build renders every guide once and `writtenPaths` parses all of them again
 * for the sidebar, so the cache earns its place there. In `next dev` it is
 * actively wrong: markdown under `content/` is not in the module graph, so
 * editing a page does not invalidate this module, and a cached guide would be
 * served until the server was restarted. Anyone writing a page would be editing
 * a file the site refused to re-read.
 */
const CACHEABLE = process.env.NODE_ENV === 'production';

/**
 * One guide, or undefined when nothing is written yet.
 *
 * A missing page is not an error: the structure is defined up front in `ia.ts`
 * and filled in over the course of M3, so most of the tree has no file for a
 * while. The route renders a section index or a short "not written yet" state
 * rather than a 404, because the URL is real and will be filled.
 */
export function guide(segments: string[], root = CONTENT): Guide | undefined {
  // Only the real tree is cached. A fixture root is a test, and caching those
  // would leak one test's content into the next.
  const live = CACHEABLE && root === CONTENT;
  const key = segments.join('/');
  if (live) {
    const hit = cache.get(key);
    if (hit !== undefined) return hit ?? undefined;
  }

  const file = sourceFor(root, segments);
  if (!file) {
    if (live) cache.set(key, null);
    return undefined;
  }
  const parsed = parse(root, segments, file, readFileSync(file, 'utf8'));
  if (live) cache.set(key, parsed);
  return parsed;
}

/** Every content file on disk, as `/docs`-relative segment lists. */
export function contentFiles(root = CONTENT): string[][] {
  if (!existsSync(root)) return [];

  const walk = (dir: string, prefix: string[]): string[][] => {
    const out: string[][] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      // Partials are fragments, not pages.
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...walk(full, [...prefix, entry.name]));
      } else if (entry.name.endsWith('.md')) {
        out.push(entry.name === 'index.md' ? prefix : [...prefix, entry.name.slice(0, -3)]);
      }
    }
    return out;
  };

  return walk(root, []);
}

/**
 * Every `/docs` path that has content, for the sidebar.
 *
 * The nav shows the whole approved structure including pages nobody has written
 * yet, so it needs to know which of them to render as links. Derived from the
 * filesystem rather than from the IA, because that is exactly the difference it
 * is being asked about — and then filtered by frontmatter, because a draft is a
 * file that exists and a page that is not ready to be sent anyone.
 */
export function writtenPaths(root = CONTENT): Set<string> {
  const out = new Set<string>();
  for (const segments of contentFiles(root)) {
    let page: Guide | undefined;
    try {
      page = guide(segments, root);
    } catch {
      // A page that does not parse is reported by `validateGuides`, which fails
      // the build. Treating it as unwritten here keeps the nav renderable in
      // `next dev` while someone is midway through fixing it.
      continue;
    }
    // A draft is deliberately not linked. It renders for whoever has the URL.
    if (page && !page.draft) out.add(page.path);
  }
  return out;
}

export type Problem = { where: string; message: string };

/**
 * Everything that should fail a build, gathered rather than thrown one at a
 * time so an author fixing content sees the whole list in one run.
 *
 * Checks, in the order they can be decided:
 *
 *   - the IA itself is well-formed (slugs, depth, reserved segments)
 *   - every content file corresponds to a page in the IA
 *   - every page parses, and its directives resolve
 *   - every internal link points at a path the IA defines
 *
 * The link check is why this lives here rather than in a script: it needs the
 * rendered HTML, which needs the whole pipeline.
 */
export function validateGuides(root = CONTENT): Problem[] {
  const problems: Problem[] = [];
  const known = new Set<string>(['/docs']);

  for (const section of SECTIONS) {
    const at = `ia.ts: ${section.slug}`;
    if (!isValidSlug(section.slug)) {
      problems.push({ where: at, message: `not a valid slug` });
    }
    known.add(`/docs/${section.slug}`);

    for (const page of section.pages) {
      const path = `/docs/${section.slug}/${page.slug}`;
      if (!isValidSlug(page.slug)) problems.push({ where: path, message: 'not a valid slug' });
      // A page directly under /docs would shadow a section; one nested inside a
      // section cannot, so only the top level is checked against the list.
      known.add(path);

      for (const child of page.pages ?? []) {
        const childPath = `${path}/${child.slug}`;
        if (!isValidSlug(child.slug)) {
          problems.push({ where: childPath, message: 'not a valid slug' });
        }
        if (childPath.split('/').length - 2 > MAX_DEPTH) {
          problems.push({ where: childPath, message: `deeper than ${MAX_DEPTH} segments` });
        }
        known.add(childPath);
      }
    }
  }

  for (const reserved of reservedSegments()) {
    const claimed = SECTIONS.some((s) => s.pages.some((p) => p.slug === reserved));
    if (claimed) {
      problems.push({
        where: `ia.ts`,
        message: `a page claims the reserved segment "${reserved}"`,
      });
    }
  }

  for (const segments of contentFiles(root)) {
    const path = ['/docs', ...segments].join('/');

    if (segments.length && !findPage(segments)) {
      problems.push({
        where: path,
        message: 'file has no entry in ia.ts, so it would appear in no sidebar',
      });
      continue;
    }

    let page: Guide | undefined;
    try {
      page = guide(segments, root);
    } catch (err) {
      problems.push({ where: path, message: (err as Error).message });
      continue;
    }
    if (!page) continue;

    const read = readerFor(root);
    for (const name of referencedPartials(
      readFileSync(join(process.cwd(), page.sourcePath), 'utf8')
    )) {
      if (read(name) === undefined) {
        problems.push({ where: path, message: `no such partial: ${name}` });
      }
    }

    for (const href of internalLinks(page.html)) {
      const [target] = href.split('#');
      // Only guide paths are checked. `/docs/sdk/...` is the generated API
      // reference, which this module knows nothing about.
      if (!target.startsWith('/docs') || target.startsWith('/docs/sdk')) continue;
      if (!known.has(target.replace(/\/$/, ''))) {
        problems.push({ where: path, message: `link to a path the IA does not define: ${href}` });
      }
    }
  }

  return problems;
}

/** Every `href` in rendered HTML that stays on this site. */
export function internalLinks(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = m[1];
    if (href.startsWith('/')) out.push(href);
  }
  return out;
}
