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

export type PlatformLatest = {
  platform: Platform;
  version: string;
  publishedAt?: string;
  /**
   * The Titanium SDK that release requires, from its platform manifest.
   *
   * Per platform, and not normalised: ti.map is android `12.7.0` and ios
   * `10.0.0.GA` at once. Shown as written rather than tidied, because the
   * manifest is the source of truth and rewriting it here would be a guess.
   */
  minsdk?: string;
};

/** A module with a page on this site: versions, manifests, usually a reference. */
export type ModuleSummary = {
  source: 'registry';
  id: string;
  description?: string;
  curation: Curation;
  repo?: string;
  latest: PlatformLatest[];
  releases: number;
  /**
   * Distinct licences across the module's platform manifests.
   *
   * A list because it is declared per platform and the two can disagree —
   * usually they do not, and one entry is the normal case.
   */
  licenses: string[];
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

/** How the browse list is ordered. */
export type SortKey = 'default' | 'name' | 'updated';

/**
 * When a listing last moved.
 *
 * A registry module's newest release date; a community repository's last push.
 * Different events, but the same question — is anyone still working on this.
 */
export function listingUpdatedAt(listing: ModuleListing): string | undefined {
  if (listing.source === 'community') return listing.pushedAt;
  const dates = listing.latest.map((l) => l.publishedAt).filter((d) => d !== undefined);
  return dates.sort().at(-1);
}

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
export function orderListings(
  listings: readonly ModuleListing[],
  sort: SortKey = 'default'
): ModuleListing[] {
  if (sort === 'name') {
    return [...listings].sort((a, b) => a.id.localeCompare(b.id));
  }

  if (sort === 'updated') {
    // Undated last rather than first: an entry we know nothing about is not
    // evidence of recent work.
    return [...listings].sort((a, b) => {
      const x = listingUpdatedAt(a) ?? '';
      const y = listingUpdatedAt(b) ?? '';
      return y.localeCompare(x) || a.id.localeCompare(b.id);
    });
  }

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
 * The platforms a given version is the current release for.
 *
 * Usually one. A publisher who ships a single universal archive makes the same
 * version current on both, and the docs page has to say "Android and iOS 5.7.0"
 * rather than naming it twice.
 */
export function platformsAtVersion(index: ModuleIndex, version: string): Platform[] {
  return PLATFORM_ORDER.filter((p) => index.latest[p] === version);
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
