import { activeCategories, allTags, pageCount, publishedPosts } from './blog/posts.ts';
import { listedProfiles } from './directory/read.ts';
import { guide, indexableGuidePaths } from './docs/guides.ts';
import { lastUpdated } from './docs/last-updated.ts';
import { latestPerPlatform } from './docs/module-summary.ts';
import { listedModuleIds, moduleIndex } from './docs/modules.ts';
import { latestSdkVersion, sdkIndex, sdkToolchain } from './docs/registry.ts';
import { versionsWithNotes } from './docs/release-notes.ts';
import { canonicalPath, indexedVersions } from './docs/versions.ts';
import { branchList, MAIN_BRANCH } from './downloads/registry.ts';
import { listedApps } from './showcase/read.ts';
import { SITE_URL } from './site.ts';
import type { MetadataRoute } from 'next';

/**
 * Every canonical, indexable page on the site (TI-48).
 *
 * Two rules decide what is here, and between them they decide everything:
 *
 * 1. Canonical only. A page whose `alternates.canonical` points somewhere else
 *    is a copy, and listing a copy asks a search engine to rank a URL we have
 *    already told it not to. `canonicalPath` is what the reference pages
 *    themselves use, so the two cannot disagree.
 * 2. Indexable only. Anything carrying `noindex` is left out for the same
 *    reason: a sitemap entry and a `noindex` are contradictory instructions,
 *    and the crawler resolves the contradiction by trusting neither.
 *
 * That excludes drafts, unwritten guide paths, reference versions past the
 * cutoff, and `main`. It also excludes the markdown twins and `llms.txt`
 * (TI-57): those are for agents that fetch a known address, they are not pages
 * a person should land on from a search, and their content is duplicated from
 * the HTML that is listed here.
 *
 * ## What is deliberately not listed
 *
 * Pinned reference *type* pages, all 5,680 per version. The unversioned type
 * pages are the canonical copies and they are all here; a pinned one is a
 * distinct page but it is reached from its own version index, which is listed,
 * and enumerating a thousand on-demand renders spends crawl budget on copies of
 * pages already offered.
 *
 * Module version pages, all 339 of them. 292 carry no compiled reference, so
 * they are a manifest table and a download link that differ from the release
 * before them by a version number. They stay crawlable from the releases tab.
 *
 * Read from disk, like everything else in the build. No network (TI-25).
 *
 * Here rather than in `app/sitemap.ts` so the invariants can be tested: the
 * route is a thin wrapper, the way `app/registry/v1/route.ts` is over
 * `lib/registry-api/v1.ts`.
 */
export function sitemapEntries(): MetadataRoute.Sitemap {
  return [
    ...site(),
    ...docs(),
    ...reference(),
    ...modules(),
    ...downloads(),
    ...directory(),
    ...showcase(),
    ...blog(),
  ];
}

/** The pages that belong to no section. */
function site(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/contribute`, changeFrequency: 'monthly', priority: 0.5 },
    // TiDev's document, hosted here because this is where its readers are.
    // Yearly: it has not changed since it was written, and it is not meant to.
    { url: `${SITE_URL}/code-of-conduct`, changeFrequency: 'yearly', priority: 0.3 },
    // The human page. `/registry/` with the slash is the JSON API, which
    // robots.txt disallows; see DISALLOW in lib/seo.
    { url: `${SITE_URL}/registry`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}

/**
 * The developer directory and its listings (TI-58).
 *
 * The index is daily because what it holds turns over daily: the rota reorders
 * and expired entries leave, both at the nightly rebuild.
 *
 * `listedProfiles()` is the same set `generateStaticParams` builds pages from,
 * so the sitemap cannot name a URL that 404s. An expired listing leaves here at
 * the same rebuild it leaves the index, which is the whole reason expiry is
 * filtered at build rather than in the browser: a listing filtered out
 * client-side would still be in this file, and would stay indexed after it
 * stopped being shown.
 */
function directory(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/directory`, changeFrequency: 'daily', priority: 0.6 },
    // The submission page. Monthly and low, but listed: "how do I get listed as
    // a Titanium developer" is a real query, and this is the page that answers
    // it.
    { url: `${SITE_URL}/directory/submit`, changeFrequency: 'monthly', priority: 0.3 },
    ...listedProfiles().map((profile) => ({
      url: `${SITE_URL}/directory/${profile.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}

/**
 * The app showcase and its entries (TI-54).
 *
 * The index is daily because its order is: the rota reorders at the nightly
 * rebuild. Nothing expires here, so unlike the directory above, an entry leaves
 * this file only when somebody removes it.
 *
 * `listedApps()` is the same set `generateStaticParams` builds pages from, so
 * the sitemap cannot name a URL that 404s - which matters most while the worked
 * examples are showing, since they stop having pages the moment a real entry
 * merges.
 */
function showcase(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/showcase`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/showcase/submit`, changeFrequency: 'monthly', priority: 0.3 },
    ...listedApps().map((app) => ({
      url: `${SITE_URL}/showcase/${app.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}

/**
 * The guides, in IA order.
 *
 * `lastModified` comes from the commit that last touched the file, which is the
 * only date that cannot drift from the content. A section index has no file of
 * its own and therefore no date, which is honest: it changes when its children
 * do, and claiming today would be a lie a crawler would learn to ignore.
 *
 * ## The current major, and only the current major
 *
 * Guide URLs settled with TI-59: the current major is unversioned and is the
 * canonical spelling of every page it has, so it is listed. Archived majors are
 * not. A sitemap is a request to crawl, and asking for three near-identical
 * copies of the macOS setup page is asking to have the wrong one ranked; the
 * archived pages instead canonicalise to their equivalent in current, or go
 * `noindex, follow` where current has no equivalent. They stay reachable and
 * crawlable through the switcher and the banner, which is how a reader who
 * needs them gets there. See `archivedSeo` in `lib/docs/doc-versions.ts`.
 *
 * That falls out of `indexableGuidePaths()` reading the current content root
 * rather than being filtered for here, which is quiet enough to be undone by
 * accident: `sitemap.test.ts` holds it so a change that starts listing an
 * archived major fails there rather than in a crawler months later.
 */
function docs(): MetadataRoute.Sitemap {
  return indexableGuidePaths().map((path) => {
    const page = guide(path.split('/').slice(2));
    const modified = page && lastUpdated(page.sourcePath);
    return {
      url: `${SITE_URL}${path}`,
      ...(modified ? { lastModified: modified } : {}),
      changeFrequency: 'monthly' as const,
      priority: path === '/docs' ? 0.9 : 0.7,
    };
  });
}

/**
 * The API reference at its canonical addresses, plus the release notes.
 *
 * The unversioned tree is the whole of the latest release: one index and 284
 * type pages, which are the pages people actually search for by name. Pinned
 * versions contribute their index only, and only while they are indexed.
 */
function reference(): MetadataRoute.Sitemap {
  const latest = latestSdkVersion();
  const types = latest ? (sdkIndex(latest)?.types ?? []) : [];

  return [
    { url: `${SITE_URL}/docs/sdk`, changeFrequency: 'monthly', priority: 0.9 },
    ...types.map((type) => ({
      url: `${SITE_URL}/docs/sdk/${type.name}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    // `canonicalPath` collapses the latest version onto `/docs/sdk`, which is
    // already the first entry above, so it is filtered out rather than repeated.
    ...indexedVersions()
      .filter((version) => version !== latest)
      .map((version) => ({
        url: `${SITE_URL}${canonicalPath(version)}`,
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      })),
    // Every version with notes, not only the indexed ones: a release note is
    // written once and never revised, it is what an announcement links to, and
    // it is the one versioned page that has no newer equivalent to defer to.
    ...versionsWithNotes().map((version) => ({
      url: `${SITE_URL}/docs/sdk/${version}/release-notes`,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
    // Compatibility, only where the version is indexed (TI-94). The opposite
    // rule to the notes above, and for the opposite reason: a note is a
    // distinct document per release, while these twenty pages are the same
    // table with the numbers moved. Asking a crawler to rank between them is
    // asking it to pick which release's requirements to show someone who did
    // not name a release. The page itself is `noindex` outside this set, so
    // listing more here would contradict it.
    ...[latest, ...indexedVersions().filter((version) => version !== latest)]
      .filter((version): version is string => Boolean(version && sdkToolchain(version)))
      .map((version) => ({
        url: `${SITE_URL}/docs/sdk/${version}/compatibility`,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
  ];
}

/** The browse page and the four views of each module that has a page here. */
function modules(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/modules`, changeFrequency: 'weekly', priority: 0.8 },
    ...listedModuleIds().flatMap((moduleId) => {
      const index = moduleIndex(moduleId);
      if (!index) return [];

      // The newest release across platforms. A module's platforms are years
      // apart routinely, and the page changes when the later of them ships.
      //
      // `publishedAt` is optional in the registry schema, and `sort` puts
      // `undefined` last whatever the comparator says, so the dates are
      // filtered before they are compared: otherwise one platform missing a
      // date would drop `lastModified` from all four of this module's entries,
      // including the platform that has one.
      const published = latestPerPlatform(index)
        .map((entry) => entry.publishedAt)
        .filter((at) => !!at)
        .sort();
      const modified = published[published.length - 1];

      return ['', '/install', '/api', '/releases'].map((view) => ({
        url: `${SITE_URL}/modules/${moduleId}${view}`,
        ...(modified ? { lastModified: modified } : {}),
        changeFrequency: 'monthly' as const,
        priority: view === '' ? 0.7 : 0.5,
      }));
    }),
  ];
}

/**
 * The three download views, and one page per branch that still has builds.
 *
 * Daily on all of them. A CI build expires after 90 days and the release list
 * gains a row whenever anything ships, so these are the only pages on the site
 * whose content changes without anybody editing anything.
 */
function downloads(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/downloads`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/downloads/releases`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/downloads/builds`, changeFrequency: 'daily', priority: 0.4 },
    // `/downloads/builds` is the main branch already, so it is not repeated.
    ...branchList()
      .filter((branch) => branch.name !== MAIN_BRANCH)
      .map((branch) => ({
        url: `${SITE_URL}/downloads/builds/${branch.name}`,
        ...(branch.latest ? { lastModified: branch.latest } : {}),
        changeFrequency: 'daily' as const,
        priority: 0.2,
      })),
  ];
}

/** The posts, the pagination, and the category filters. Drafts are excluded. */
function blog(): MetadataRoute.Sitemap {
  const posts = publishedPosts();
  const newest = posts[0]?.date;

  return [
    {
      url: `${SITE_URL}/blog`,
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Page one is /blog, so pagination starts at two.
    ...Array.from({ length: Math.max(0, pageCount() - 1) }, (_, i) => ({
      url: `${SITE_URL}/blog/page/${i + 2}`,
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    })),
    ...activeCategories().map(({ category }) => ({
      url: `${SITE_URL}/blog/category/${category.toLowerCase()}`,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
    // Empty today: no imported post carries a tag, because the old blog had no
    // such field. Listed anyway, because a tag archive is prerendered, linked
    // from every post that carries the tag, and canonical to itself - the same
    // three things that put the categories above here. Leaving it to be noticed
    // later is how a section goes unlisted for a year.
    ...allTags().map(({ tag }) => ({
      url: `${SITE_URL}/blog/tag/${tag}`,
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
