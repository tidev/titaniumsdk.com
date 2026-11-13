/**
 * Where a page's Markdown copy is, and when a request is asking for it (TI-97).
 *
 * TI-57 gave every documentation page a copy at its own address plus `.md`.
 * This adds the other two ways to reach one: the page's own address answers
 * with it for a request whose `Accept` header prefers `text/markdown`, and each
 * page names it in an `alternate` link. Three readers have to agree on which
 * addresses those are - `proxy.ts`, which negotiates, the page routes, which
 * write the link, and the `.md` route, which serves the file - so the rules
 * live here.
 *
 * Imported by the proxy, so it reads no file and imports nothing that does.
 * That is why `hasMarkdownCopy` is a shape test and not a lookup: whether a
 * given type or guide exists is the route's question, answered from disk.
 *
 * Ported from sigil's `website/src/lib/markdown-copy.ts` (SIG-267), which was
 * itself ported from TI-57. The negotiation is the same; the address rules are
 * this site's.
 */

import { SITE_URL, isIndexableHost } from './site.ts';

/** `v13`, the prefix of an archived guide major. Same spelling as `doc-versions.ts`. */
const MAJOR = /^v[1-9]\d*$/;

/** Pages under a version that are not types and have no copy. */
const NOT_TYPES = new Set(['compatibility', 'release-notes']);

/**
 * Whether a path is one that has a Markdown copy beside it, if it is a page.
 *
 * The shapes `markdownFor` in `docs/llms.ts` answers, and nothing it never
 * could:
 *
 *   /docs, /docs/<guide...>        a current-major guide or index
 *   /docs/sdk                      the API index at the latest release
 *   /docs/sdk/<version or type>    a pinned index, or a type at the latest
 *   /docs/sdk/<version>/<type>     a pinned type
 *   /modules, /modules/<id>        the module index and one module
 *
 * Left out because they are pages with no copy, and a client asking for one
 * should get the page rather than a 404: an archived major's guides
 * (`/docs/v13/...`), a version's compatibility table and release notes, and a
 * module's sub-pages. A path that matches and is not a page is a 404 in either
 * form, which is right. One that matches and is a page with no copy is a guide
 * the IA defines but nobody has written yet; it 404s to a client that prefers
 * Markdown, because there is no document to send.
 *
 * On a segment boundary, so `/docs-archive` is not one, and never a path that
 * already ends in `.md`: that is the `.md` address itself, which
 * `next.config.ts` rewrites.
 *
 * @param path - A pathname.
 * @returns Whether it has the shape of a page with a copy.
 */
export function hasMarkdownCopy(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean.endsWith('.md')) return false;

  const [root, ...rest] = clean.split('/').slice(1);

  if (root === 'modules') return rest.length <= 1;
  if (root !== 'docs') return false;

  if (rest[0] === 'sdk') {
    if (rest.length > 3) return false;
    return !(rest.length === 3 && NOT_TYPES.has(rest[2]));
  }

  return !MAJOR.test(rest[0] ?? '');
}

/**
 * A page's Markdown address: its own, plus `.md`.
 *
 * A trailing slash is the same page, so it is dropped rather than giving
 * `/docs/setup/.md`.
 *
 * @param path - The page's path, starting with `/`.
 * @returns The `.md` path.
 */
export function markdownHref(path: string): string {
  return `${path.replace(/\/+$/, '')}.md`;
}

/**
 * The `alternates.types` entry that names a page's copy in its head, as
 * `<link rel="alternate" type="text/markdown" href="….md">`.
 *
 * Absolute on the production origin, as the canonical beside it is. Each page
 * route calls this only once it knows the page has a copy, because a link in
 * the head is a promise that fetching it returns content - the same rule
 * `llms.txt` keeps.
 *
 * @param path - The page's path, starting with `/`.
 * @returns The entry, to spread into `alternates.types`.
 */
export function markdownAlternate(path: string): { 'text/markdown': string } {
  return { 'text/markdown': `${SITE_URL}${markdownHref(path)}` };
}

/** One media range of an `Accept` header. */
type Range = {
  /** `type/subtype`, lowercase. */
  readonly type: string;
  /** Its weight, 0 to 1. */
  readonly q: number;
  /** Where it was in the header, for a tie. */
  readonly at: number;
};

/** The media ranges of an `Accept` header, malformed weights read as 1. */
function ranges(accept: string): Range[] {
  return accept.split(',').map((part, at) => {
    const [type = '', ...params] = part.split(';').map((it) => it.trim());
    const weight = params.find((param) => /^q\s*=/i.test(param));
    const q = weight === undefined ? 1 : Number(weight.split('=')[1]);

    return {
      type: type.toLowerCase(),
      q: Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 1,
      at,
    };
  });
}

/**
 * Whether an `Accept` header prefers Markdown to HTML.
 *
 * **Markdown has to be named.** A browser sends a wildcard and a fetch library
 * sends nothing at all, and both get the page they always got; only a client
 * that says `text/markdown` is asking for it. Then it wins when it weighs more
 * than HTML does - HTML's weight being `text/html`'s if that is named, else the
 * weight of `text/*` or of the any-type wildcard - and a tie goes to whichever
 * the client named, or listed first where it named both. So
 * `text/markdown, text/html;q=0.9` and `text/markdown` beside a wildcard are
 * Markdown, `text/html, text/markdown` is HTML, and `text/markdown;q=0` is a
 * refusal of it. The test has the cases.
 *
 * Not a substring test, which is all a `has` rule in `next.config.ts` can do:
 * that answers Markdown to `text/html, text/markdown;q=0.1`, a client that said
 * it would rather have HTML.
 *
 * @param accept - The header, if there is one.
 * @returns Whether to answer with the Markdown copy.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;

  const all = ranges(accept);
  const markdown = all.find((range) => range.type === 'text/markdown');
  if (!markdown || markdown.q === 0) return false;

  const html = all.find((range) => range.type === 'text/html');
  if (html) {
    return markdown.q > html.q || (markdown.q === html.q && markdown.at < html.at);
  }

  const wildcard =
    all.find((range) => range.type === 'text/*') ?? all.find((range) => range.type === '*/*');
  return markdown.q >= (wildcard?.q ?? 0);
}

/**
 * The cache policy of every file in the corpus: ten minutes in a browser, an
 * hour at the edge, and a day of serving the last copy while a new one is
 * fetched. The files change only when a deploy replaces them, so a stale one is
 * never wrong for long and nobody waits on a miss.
 */
export const CORPUS_CACHE_CONTROL =
  'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400';

/** What `proxy.ts` does with a request. */
export type ProxyAnswer =
  /** Serve it as the route would. */
  | { readonly pass: true }
  /** Answer 404 with this text. */
  | { readonly notFound: string }
  /** Serve this path instead: a page's Markdown copy, for a client that asked for one. */
  | { readonly rewrite: string };

/**
 * What the proxy does with a request, as a function a test can call.
 *
 * Three rules, in order:
 *
 * - `/md/...` is the `.md` rewrite's destination, and is never an address: a
 *   request that names it is refused, so each document keeps one. The proxy
 *   runs before `next.config.ts`'s rewrites, so it only ever sees the path that
 *   was asked for - `/docs/setup/macos.md`, not where that was sent. TI-57 did
 *   this in the route by reading `request.url`; here it also covers the
 *   negotiated rewrite below, which the route cannot tell apart from a direct
 *   request.
 * - The sitemap is a 404 off the production host. It is a list of production
 *   addresses that says "these are this site's canonical pages", which a
 *   preview has no business claiming. `robots.txt` shares `isIndexableHost()`
 *   with this, so the two cannot disagree about which host that is.
 * - A page with a copy, asked for with an `Accept` that prefers Markdown, is
 *   its copy.
 *
 * **The corpus is served on every host, and that is deliberate.** `llms.txt`,
 * `llms-full.txt` and the `.md` copies are the same documents as the HTML pages
 * beside them, which every host serves, so withholding them off production hid
 * nothing a reader could not fetch one address over - and it made the feature
 * untestable on `localhost` and on a preview. A preview is still closed to
 * crawlers by `robots.txt` and by the `X-Robots-Tag` header, which cover these
 * addresses like any other.
 *
 * **The Markdown says `Vary: Accept` and the HTML cannot.** Next's app-page
 * runtime sets a page's `Vary` outright, over whatever the proxy or
 * `next.config.ts` set, so a page's own HTML never names `Accept`. The
 * direction that matters is still covered: the Markdown answer carries
 * `Vary: Accept` from its route, so no cache hands it to a browser, and the
 * worst a cache that kept the HTML can do is give an agent the page instead of
 * its copy, which the `.md` address and the `alternate` link are there for.
 *
 * @param request - What was asked for.
 * @param request.pathname - The path, as asked for.
 * @param request.host - The `Host` header.
 * @param request.accept - The `Accept` header.
 * @returns What to do.
 */
export function proxyAnswer({
  pathname,
  host,
  accept,
}: {
  pathname: string;
  host: string | null;
  accept: string | null;
}): ProxyAnswer {
  if (pathname === '/md' || pathname.startsWith('/md/')) {
    return { notFound: 'Not found.\n' };
  }

  if (pathname === '/sitemap.xml' && !isIndexableHost(host)) {
    return { notFound: `Not found. The sitemap is published on ${new URL(SITE_URL).host} only.\n` };
  }

  return hasMarkdownCopy(pathname) && prefersMarkdown(accept)
    ? { rewrite: `/md${pathname.replace(/\/+$/, '')}` }
    : { pass: true };
}
