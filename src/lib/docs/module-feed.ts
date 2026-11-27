import type { ModuleIndex, Platform } from '../registry/index.ts';
import { PLATFORM_ORDER, type CommunityListing } from './module-summary.ts';

/**
 * What `/modules/feed.xml` lists, worked out apart from the route so it can be
 * tested without a registry on disk.
 *
 * The feed answers one question: which modules are new. That needs a date per
 * module for the day it arrived, and the two kinds get it from different
 * places. A curated module arrived with its first release. A community
 * repository has no releases this site knows of, and its creation date is the
 * wrong event - a repo from 2015 that gains the `titanium` topic today is new
 * to this list today - so it carries `listedAt`, the first time the daily
 * scrape saw it.
 */

export type ModuleFeedEntry = {
  title: string;
  /** Where the entry leads: a page here for a curated module, GitHub otherwise. */
  link: string;
  /** ISO timestamp of the day the module arrived. */
  date: string;
  description?: string;
  author?: string;
  platforms: Platform[];
};

/** Enough for a reader to catch up after a holiday, without shipping the whole list. */
export const MODULE_FEED_LIMIT = 50;

/** A curated module's first release, or nothing if no release carries a date. */
export function firstPublishedAt(index: ModuleIndex): string | undefined {
  return index.versions
    .map((v) => v.publishedAt)
    .filter((d) => d !== undefined)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}

export function moduleFeedEntries(
  curated: readonly ModuleIndex[],
  community: readonly CommunityListing[],
  siteUrl: string,
  limit = MODULE_FEED_LIMIT
): ModuleFeedEntry[] {
  const entries: ModuleFeedEntry[] = [
    ...curated.flatMap((index) => {
      const date = firstPublishedAt(index);
      // Undated means there is no telling when it arrived, and a feed reader
      // would show a made-up date as fact.
      if (!date) return [];
      return [
        {
          title: index.moduleId,
          link: `${siteUrl}/modules/${index.moduleId}`,
          date,
          description: index.description,
          author: 'TiDev',
          platforms: PLATFORM_ORDER.filter((p) => index.latest[p]),
        },
      ];
    }),
    ...community.map((m) => ({
      title: m.name,
      link: m.url,
      date: m.listedAt,
      description: m.description,
      author: m.owner,
      platforms: m.platforms,
    })),
  ];

  // Newest first. The name breaks ties so the file is byte-stable: a scrape
  // that finds five repos at once stamps all five with the same second.
  return entries
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.title.localeCompare(b.title))
    .slice(0, limit);
}
