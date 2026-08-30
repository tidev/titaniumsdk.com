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

export type ModuleSummary = {
  id: string;
  description?: string;
  curation: Curation;
  repo?: string;
  latest: PlatformLatest[];
  releases: number;
};

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
