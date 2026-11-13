import docVersions from './content/doc-versions.json';
import legacyApi from './src/lib/docs/legacy-api-redirects.json';
import legacyGuide from './src/lib/docs/legacy-guide-redirects.json';
import { MAIN, latestSdkVersion } from './src/lib/docs/registry.ts';
import { versionsWithNotes } from './src/lib/docs/release-notes.ts';
import { noindexHeaders } from './src/lib/site.ts';
import type { NextConfig } from 'next';

/**
 * `latest` is spelling, not an address.
 *
 * `/docs/sdk` is the reference at the newest release and is canonical (TI-79),
 * so `latest` folds into it rather than into a concrete version. That leaves
 * one set of unversioned URLs and one set of pinned ones, which is what keeps
 * them out of each other's way in search.
 *
 * `/docs/sdk` itself is no longer here: it used to redirect because it was a
 * bare prefix with no page, and now it is the page.
 *
 * Not permanent. The rule outlives any one release, but a client that cached a
 * 308 would keep following it after `latest` had moved on.
 */
function latestRedirects() {
  return [
    ...releaseNotesRedirects(),
    { source: '/docs/sdk/latest', destination: '/docs/sdk', permanent: false },
    { source: '/docs/sdk/latest/:path*', destination: '/docs/sdk/:path*', permanent: false },
  ];
}

/**
 * The two unpinned spellings of "the current release notes".
 *
 * Release notes are the one thing under `/docs/sdk` that has no unversioned
 * copy. A note is written about a specific release and never revised, so
 * `/docs/sdk/release-notes` cannot be a page the way `/docs/sdk/Titanium.UI.Window`
 * is - there is nothing for it to render that is not already at a version. The
 * fold above would therefore send `/docs/sdk/latest/release-notes` to
 * `/docs/sdk/release-notes`, which resolves as a type named `release-notes` and
 * 404s. These two rules come first so it lands on the newest note instead.
 *
 * The target is the newest version that *has* a note rather than the newest
 * release. They are the same version today, and they are not in the window
 * between a release shipping and its notes being captured - that is a
 * deliberate step, `scripts/capture-release-notes.ts`. Reading the notes on
 * disk means that window lands on the last real note rather than on a 404.
 *
 * Both spellings, because the unversioned one is what anybody gets by trimming
 * the version out of a URL, and the site's own rule is that unversioned means
 * latest. Temporary for the same reason as the fold: the destination moves with
 * every release.
 */
function releaseNotesRedirects() {
  const [newest] = versionsWithNotes();
  if (!newest) return [];

  const destination = `/docs/sdk/${newest}/release-notes`;
  return [
    { source: '/docs/sdk/latest/release-notes', destination, permanent: false },
    { source: '/docs/sdk/release-notes', destination, permanent: false },
  ];
}

/**
 * The guides' version prefixes, which the unversioned URLs are canonical for.
 *
 * Prose is versioned by SDK major (TI-59) and the current major carries no
 * prefix, so three spellings have to fold into it rather than render a second
 * copy of every page:
 *
 *   /docs/latest/...  the spelling people type. Never a built page, here or in
 *                     the reference.
 *   /docs/v14/...     the current major named explicitly. Real while v14 is
 *                     current only as a redirect; it becomes a set of built
 *                     pages the moment v15 ships and v14 is snapshotted.
 *   /docs/v11/...     a major that fell out of the retention window. Its pages
 *                     are gone, and the same page in current is the closest
 *                     true answer.
 *
 * All temporary. Every one of these rules moves when a major ships, and a
 * client that cached a 308 would keep following it afterwards.
 *
 * This is version housekeeping, not the legacy redirect map: TI-39 owns
 * `/guide/...`, which carries no version and targets current.
 */
function docsVersionRedirects() {
  const { current, dropped } = docVersions;
  const folds = ['latest', current, ...dropped];

  return folds.flatMap((prefix) => [
    { source: `/docs/${prefix}`, destination: '/docs', permanent: false },
    { source: `/docs/${prefix}/:path*`, destination: '/docs/:path*', permanent: false },
  ]);
}

/**
 * The legacy titanium-docs `/api/*` reference, which moved wholesale.
 *
 * NEVER PUT A ROUTE HANDLER UNDER `app/api/` IN THIS REPO. `/api` is not
 * reserved by the App Router — a `route.ts` there is perfectly legal — but Next
 * checks redirects before the filesystem, so the handler would never run and
 * the only symptom is a 308 into the docs. Nothing warns you. The public JSON
 * API lives at `/registry/v1/*` for exactly this reason.
 *
 * The map is generated from the old file tree and committed, never a
 * `/api/:path*` wildcard. Two reasons: a wildcard would claim the whole prefix
 * rather than the pages that actually existed, leaving no way to see what is
 * spoken for; and it could not route `/api/titanium/ui/view.html` to the SDK
 * reference while sending `/api/modules/ble.html` to a different tree.
 * Regenerate with `pnpm redirects <path-to-titanium-docs>`.
 */
function legacyApiRedirects() {
  const latest = latestSdkVersion();
  if (!latest) return [];

  /**
   * The committed map names `latest`, so it stays correct as releases ship and
   * never has to be regenerated for a version bump. Serving it verbatim would
   * chain through latestRedirects() for a second hop, so the prefix is
   * rewritten here instead.
   *
   * It resolves to the unversioned path rather than to a concrete version now
   * that one exists (TI-79), which is both the canonical destination and the
   * one that does not need rewriting again when a release ships.
   */
  const resolved = (destination: string) => destination.replace('/docs/sdk/latest', '/docs/sdk');

  return [
    /**
     * Permanent everywhere except into `main`. A 308 is cached by the client
     * indefinitely, which is safe when it points at a released version —
     * those directories are immutable, so a stale one still answers correctly.
     * `main` is the single mutable tree, and it is what `latest` resolves to
     * until a release is compiled, so these stay temporary until then.
     */
    ...legacyApi.sdk.map((rule) => ({
      source: rule.source,
      destination: resolved(rule.destination),
      permanent: latest !== MAIN,
    })),
    /**
     * Module reference pages do not exist yet, so these 404 until that ships.
     * Permanent regardless: `moduleid` is the registry's canonical key, so
     * `/modules/<moduleid>` is already the final address, and it resolves to
     * the latest version without naming one.
     */
    ...legacyApi.modules.map((rule) => ({ ...rule, permanent: true })),
  ];
}

/**
 * The legacy titanium-docs `/guide/*` wiki, which the M3 rewrite replaced (TI-39).
 *
 * The counterpart to `legacyApiRedirects`, and deliberately not built the same
 * way. The `/api` map is generated because docgen keeps moving its input; this
 * corpus is frozen and `tidev/titanium-docs` is being archived (TI-52), so the
 * map is hand-maintained and `legacy-guide-redirects.test.ts` is what catches a
 * destination that stops resolving.
 *
 * Unlike `/api` there is no shadowing hazard here: nothing in `app/` routes
 * `/guide`, so these claim a prefix the site does not otherwise serve.
 *
 * 35 release-note URLs are absent on purpose - the RC, Alloy and section-index
 * notes never earned a page and are not getting one, so they 404 rather than
 * landing somewhere that implies the content moved. The map carries them in
 * `notFound` so the decision is visible in the data rather than in a commit
 * message.
 *
 * The 71 URLs the old wiki served at a directory address cost two hops, not
 * one: Next answers the trailing slash with a 308 of its own before redirects
 * or middleware are consulted, and on 16.3.4 there is no way to opt out -
 * `skipTrailingSlashRedirect` is still in the config schema but nothing in the
 * server reads it. Sources are therefore stored bare. See the test.
 */
function legacyGuideRedirects() {
  /**
   * `( ) { } : * + ?` are path-to-regexp syntax, so a literal one in a source
   * has to be escaped.
   *
   * Five wiki filenames need it, and they fail in two different ways. The two
   * `C++` coding-standards pages fail the build loudly. The three Alloy
   * reference pages - `Build_Configuration_File_(alloy.jmk)` and friends - do
   * not: `(alloy.jmk)` parses cleanly as a capture group and the rule then
   * matches something nobody asked for. Escaping here rather than in the map
   * keeps that file holding the URLs the old site actually served, which is
   * what its test compares against the audit.
   */
  const escaped = (source: string) => source.replace(/[(){}:*+?]/g, String.raw`\$&`);

  return legacyGuide.rules.map((rule) => ({
    source: escaped(rule.source),
    destination: rule.destination,
    permanent: true,
  }));
}

/**
 * Short addresses for sections of a page.
 *
 * `/donate` is the address people type for a non-profit, and the one the
 * imported blog posts were written against. It was briefly a page of its own,
 * ported from the foundation's old site, but it showed the same two donation
 * routes `/contribute` opens with. One place to keep current beats two, so the
 * address stays and points at that section.
 *
 * Permanent: the page is not coming back, and the anchor is `/contribute`'s own
 * heading id, which nothing else moves.
 */
const shortcutRedirects = [
  { source: '/donate', destination: '/contribute#donate', permanent: true },
];

/**
 * The public registry API (TI-55).
 *
 * Open CORS because reads are the entire surface and the CLI is not the only
 * client. Cached hard because every one of these is a build artifact: the
 * content only changes when a deploy replaces it, so a stale copy is never
 * wrong for long and `stale-while-revalidate` means nobody waits on a miss.
 */
function registryApiHeaders() {
  return [
    {
      // Both the versioned API and the legacy files the CLI still reads. The
      // legacy paths are `/registry/*.json`, one segment deep, which is why
      // this matches the whole prefix rather than only `/v1`.
      source: '/registry/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        {
          key: 'Cache-Control',
          value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        },
      ],
    },
  ];
}

/**
 * Keeps `public/docs/README.md` off the site.
 *
 * That file explains which half of `public/docs` is generated and which half is
 * committed, and it is written for whoever opens the directory — not for
 * readers. `public/` has no ignore glob: Next serves everything under it from
 * the base URL, and there is no config option to exclude a path (checked
 * against `node_modules/next/dist/docs`, and against `config-shared.d.ts`).
 *
 * A dotfile is not the answer either. `.README.md` is unreachable today, but by
 * way of a 400 in dev and a 500 in production rather than a rule, it is
 * undocumented in both, and `public/` is served by the host's own static layer
 * in deployment rather than by this server.
 *
 * `beforeFiles` is documented to run at step 4 of routing and the public
 * directory at step 5, so this shadows the file deterministically. The
 * destination is a path the docs route does not define, and that route sets
 * `dynamicParams = false`, so it 404s.
 */
const hideInternalReadme = [{ source: '/docs/README.md', destination: '/docs/_internal-readme' }];

/**
 * `<path>.md` beside `<path>`, for the machine-readable corpus (TI-57).
 *
 * A `route.ts` may not share a segment with a `page.tsx`, and `/docs` is an
 * optional catch-all page, so nothing can be filed at `/docs/setup/macos.md`.
 * These map the suffix onto `app/md/[...path]`. `proxy.ts` refuses a request
 * that names `/md/...` directly, so each document keeps one address, and it is
 * also what sends a page's own address there for an `Accept: text/markdown`
 * request (TI-97).
 *
 * `beforeFiles` rather than `afterFiles`: the docs route declares
 * `dynamicParams = false`, and an `afterFiles` rewrite is consulted after
 * static files but before dynamic routes, which is fine in principle. The
 * earlier hook is used because it is where the README rule above already sits
 * and because it does not depend on that ordering staying true.
 *
 * Two rules rather than one pattern with an optional tail: `/docs.md` has no
 * separator to make optional, and a regex that tried to cover both would be
 * the kind of thing nobody can safely edit later.
 */
const markdownSuffix = [
  { source: '/:root(docs|modules).md', destination: '/md/:root' },
  { source: '/:root(docs|modules)/:path*.md', destination: '/md/:root/:path*' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [...registryApiHeaders(), ...noindexHeaders()],
  rewrites: async () => ({ beforeFiles: [...hideInternalReadme, ...markdownSuffix] }),
  redirects: async () => {
    const rules = [
      ...latestRedirects(),
      ...docsVersionRedirects(),
      ...legacyApiRedirects(),
      ...legacyGuideRedirects(),
      ...shortcutRedirects,
    ];

    // A surviving `latest` in a legacy destination is the two-hop chain the
    // substitution above exists to prevent, and it would only show up as slow
    // redirects in production. Fail the build instead.
    const chained = rules.filter(
      (rule) => rule.source.startsWith('/api') && rule.destination.startsWith('/docs/sdk/latest')
    );
    if (chained.length) {
      throw new Error(`${chained.length} legacy /api redirect(s) still point at /docs/sdk/latest`);
    }

    return rules;
  },
};

export default nextConfig;
