import type { Curation, ModuleIndex, Platform } from '../registry/index.ts';

/**
 * The module shapes derived from `index.json` alone.
 *
 * Nothing here touches the filesystem — same reason as `./tree.ts`. The browse
 * page filters in the browser, so its component and everything it imports end
 * up in the client bundle, and one `node:fs` import anywhere in that graph
 * fails the build rather than tree-shaking away.
 */

/** Display order everywhere a module's platforms are listed. */
export const PLATFORM_ORDER: Platform[] = ['android', 'ios'];

/**
 * Deliberately a different vocabulary from the reference's `iphone`/`ipad`/
 * `macos`: a module ships for a platform, while an API can be iPad-only. The
 * two are not reconciled, in either direction.
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS',
};

export type PlatformLatest = { platform: Platform; version: string; publishedAt?: string };

/** A module with a page on this site: versions, manifests, usually a reference. */
export type ModuleSummary = {
  source: 'registry';
  id: string;
  description?: string;
  curation: Curation;
  repo?: string;
  latest: PlatformLatest[];
  releases: number;
};

/**
 * A module that lives on GitHub and only there.
 *
 * A separate type rather than a `ModuleSummary` with empty fields, because the
 * two genuinely differ: this has no version list to show and no page to link
 * to, and code that forgets which kind it is holding should not compile. See
 * `scripts/generate-community-modules.ts` for what is and is not knowable here.
 */
export type CommunityListing = {
  source: 'community';
  /** `owner/name` — a community module has no manifest id to key on. */
  id: string;
  name: string;
  owner: string;
  description?: string;
  url: string;
  platforms: Platform[];
  stars: number;
  archived: boolean;
  pushedAt: string;
};

export type ModuleListing = ModuleSummary | CommunityListing;

/** The platforms a listing ships for, whichever kind it is. */
export function listingPlatforms(listing: ModuleListing): Platform[] {
  return listing.source === 'registry' ? listing.latest.map((l) => l.platform) : listing.platforms;
}

/**
 * Registry modules first, then community by popularity.
 *
 * Not one ranking across both: a curated module has a compiled reference and a
 * verified release history behind it, and burying it under a community repo
 * with more stars would be the wrong answer to "which of these should I use".
 */
export function orderListings(listings: readonly ModuleListing[]): ModuleListing[] {
  return [...listings].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'registry' ? -1 : 1;
    if (a.source === 'registry' && b.source === 'registry') return a.id.localeCompare(b.id);
    if (a.source === 'community' && b.source === 'community') {
      // Archived last whatever its star count: it is not a live option.
      if (a.archived !== b.archived) return a.archived ? 1 : -1;
      return b.stars - a.stars || a.id.localeCompare(b.id);
    }
    return 0;
  });
}

/**
 * The newest release per platform, in platform order.
 *
 * Never collapsed to one winner. ti.map's newest release is android 5.7.0 from
 * September 2025 and its highest version is iOS 7.3.1 from January 2024, and a
 * page that picks either one is wrong about the other.
 */
export function latestPerPlatform(index: ModuleIndex): PlatformLatest[] {
  const dates = new Map(index.versions.map((v) => [v.version, v.publishedAt]));
  return PLATFORM_ORDER.filter((p) => index.latest[p]).map((platform) => ({
    platform,
    version: index.latest[platform]!,
    publishedAt: dates.get(index.latest[platform]!),
  }));
}
