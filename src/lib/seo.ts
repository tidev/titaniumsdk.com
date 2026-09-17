import { SITE_URL } from './site.ts';

/**
 * The metadata rules the whole site shares (TI-48).
 *
 * Titles and descriptions are not here. Only a page knows what it says, so each
 * route writes its own from the content in front of it. What lives here is
 * everything that has to be identical everywhere and would otherwise drift: the
 * robots verdict for a page that should not compete, the Open Graph fields every
 * card carries, the one prefix robots.txt keeps crawlers out of, and the two
 * structured-data shapes the site actually earns.
 */

/**
 * Kept out of the index, still crawled.
 *
 * `follow` is the half that matters. Every page given this verdict has a
 * canonical or a banner pointing at the copy that should rank, and a crawler
 * told not to follow the link never reaches it.
 *
 * Not the verdict a draft gets. A draft is `follow: false` as well, because its
 * links are written against pages that may not exist yet.
 */
export const NOINDEX = { index: false, follow: true } as const;

/**
 * The Open Graph fields that are true of every page.
 *
 * Spread, never inherited. Metadata merges shallowly, so a route that sets
 * `openGraph` at all replaces its parent's whole object: without this, adding
 * one field to one route would quietly drop `siteName` from that route's card.
 */
export const OPEN_GRAPH = {
  siteName: 'Titanium SDK',
  locale: 'en_US',
} as const;

/**
 * What robots.txt disallows, which is one prefix and deliberately not more.
 *
 * `/registry/` is the public JSON API (TI-55): several hundred generated
 * documents, one per module and per release, that answer nothing anybody typed
 * into a search box.
 *
 * The trailing slash is load-bearing. `/registry` with no slash is the page
 * documenting that API, it is in the sitemap, and a rule written without the
 * slash would take it out of search along with the JSON it describes.
 *
 * The omissions are the point. The markdown twins and `llms.txt` (TI-57) exist
 * to be fetched by the agents that go looking for them, so they stay allowed;
 * and `noindex` rather than `Disallow` is what keeps a page out of results
 * anyway, since a blocked URL can still be indexed from its inbound links and a
 * crawler that cannot fetch it never reads the `noindex` saying otherwise.
 */
export const DISALLOW = ['/registry/'];

/** Whether robots.txt keeps crawlers off a path. Prefix matching, as robots.txt does. */
export const blockedByRobots = (path: string): boolean =>
  DISALLOW.some((prefix) => path.startsWith(prefix));

/** One visible breadcrumb. The shape `components/docs/breadcrumbs` renders. */
type Step = { label: string; href?: string };

/**
 * The trail a page shows, as `BreadcrumbList`.
 *
 * Emitted by the breadcrumb component rather than by each route, because the
 * rule for this markup is that it describes the trail actually on the page.
 * Built from the array the list renders, the two cannot disagree.
 *
 * The final crumb is the current page and carries no `href`, which is what the
 * schema expects of a last item.
 *
 * Any *other* crumb without one is a category label rather than a page: a
 * section whose own index page is a crumb in its own right renders its title as
 * plain text, so "Docs / Getting Started / Environment Setup / macOS" is four
 * visible steps and three addresses. `item` is required on every position but
 * the last, and a list with one missing is thrown out whole rather than in
 * part, so the labels are dropped here instead of being given a URL that
 * already belongs to the crumb below them. What is left is still read off the
 * rendered array, so it cannot name a step the page does not show.
 */
export function breadcrumbList(crumbs: readonly Step[]): object {
  const steps = crumbs.filter((crumb, i) => !!crumb.href || i === crumbs.length - 1);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
    })),
  };
}

/** What `blogPosting` needs of a post. A subset of `lib/blog/posts`. */
type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  authors: string[];
  cover?: string;
};

/**
 * One post, as `BlogPosting`.
 *
 * The only thing on this site that is an article by any reading: dated,
 * bylined, written once. Guides, reference pages and module pages are
 * documentation compiled or maintained against software that moves, and marking
 * them up as articles would describe them as something they are not.
 *
 * No `dateModified`. Posts are not revised after publication, and the commit
 * date on an imported archive records when it was imported rather than when
 * anyone wrote anything.
 */
export function blogPosting(post: Article): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.description ? { description: post.description } : {}),
    datePublished: post.date,
    author: post.authors.map((name) => ({ '@type': 'Person', name })),
    publisher: { '@type': 'Organization', name: 'TiDev', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    ...(post.cover ? { image: `${SITE_URL}${post.cover}` } : {}),
  };
}

/** What `softwareApplication` needs of a showcase entry. A subset of `lib/showcase/app`. */
type ShowcaseEntry = {
  id: string;
  name: string;
  description: string;
  icon: string;
  screenshots?: readonly string[];
  platforms: readonly string[];
  appStore?: string;
  playStore?: string;
  website?: string;
};

/**
 * One showcase app, as `SoftwareApplication` (TI-54).
 *
 * The ticket asks that entries be individually indexable, and this is the half
 * of that a page cannot express in prose: what the thing is, which operating
 * systems it runs on, and where it can be got. The other half is the page
 * itself, which has its own URL and its own canonical.
 *
 * **No `offers` and no `aggregateRating`**, which are exactly the two fields
 * Google wants before it will draw a rich result for this type. We do not know
 * an app's price and have never rated one, and inventing either to earn a
 * bigger search listing would be marking up a claim nobody made. Valid,
 * machine-readable and modest is the right trade.
 *
 * `operatingSystem` is derived from the platform list rather than stored, so it
 * cannot disagree with the badges the page draws from the same field.
 */
export function softwareApplication(app: ShowcaseEntry): object {
  const os = [
    app.platforms.some((p) => p === 'iphone' || p === 'ipad') && 'iOS',
    app.platforms.some((p) => p.startsWith('android')) && 'Android',
  ].filter((name) => !!name);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    description: app.description,
    applicationCategory: 'MobileApplication',
    operatingSystem: os.join(', '),
    image: `${SITE_URL}${app.icon}`,
    ...(app.screenshots?.length
      ? { screenshot: app.screenshots.map((path) => `${SITE_URL}${path}`) }
      : {}),
    url: `${SITE_URL}/showcase/${app.id}`,
    ...(app.appStore || app.playStore
      ? { installUrl: [app.appStore, app.playStore].filter((url) => !!url) }
      : {}),
    ...(app.website ? { sameAs: app.website } : {}),
  };
}
