import { MAIN, latestSdkVersion, sdkIndex, sdkTypeNames, sdkVersions } from './registry.ts';

/**
 * What the SDK version switcher needs to know (TI-27).
 *
 * The version lives in the path - `/docs/sdk/13.4.1/Titanium.UI.Window` - so
 * switching version is a navigation, not client state. That is what makes a
 * pinned version linkable, and it means every destination can be worked out on
 * the server, including whether it exists.
 *
 * Which matters: the reference spans 13.3.0 to 13.4.1, and types come and go
 * across a year of releases. Offering a reader a link to a page that will 404
 * is worse than telling them the type is not in that version, so each option
 * carries whether the page is actually there and the switcher says so.
 */

export type VersionOption = {
  version: string;
  href: string;
  /** False when the current page has no equivalent at this version. */
  present: boolean;
  /** The newest compiled release. `main` is never this. */
  latest: boolean;
  /** `main` - compiled from the development branch, not a release. */
  unreleased: boolean;
};

/**
 * The one canonical address for a version's index or type page (TI-79).
 *
 * The unversioned path is canonical for the latest release: it is what the
 * guides link, what `latest` resolves to, and the copy that sits inside the
 * documentation. Every other version is canonical to itself, `main` included -
 * those are real, distinct pages rather than aliases of this one.
 */
export function canonicalPath(version: string, type?: string): string {
  const base = version === latestSdkVersion() ? '/docs/sdk' : `/docs/sdk/${version}`;
  return type ? `${base}/${type}` : base;
}

/**
 * How many minor lines of the reference are offered to search engines (TI-48).
 *
 * Self-canonical is not the same as worth indexing. Twenty compiled versions of
 * 284 types is 5,680 pages apiece, and a patch release changes a handful of
 * them: `13.4.0` and `13.4.1` are the same document to a search engine, and
 * asking it to rank both is asking it to pick between near-identical copies of
 * the answer. Three lines back covers roughly a year of releases, which is as
 * far as anyone lands from a search rather than from a link they were given.
 *
 * The cutoff is in lines rather than in releases so a line with four patches
 * cannot push an older *minor* out of the index on its own.
 */
export const INDEXED_LINES = 3;

/**
 * The pinned versions search engines are asked to keep.
 *
 * The newest release of each of the most recent `INDEXED_LINES` minor lines.
 * `main` is never one: it is recompiled whenever the branch moves, so anything
 * indexed from it describes a tree that no longer exists.
 *
 * Takes the list so the rule can be tested without twenty directories on disk.
 * It must be sorted newest first, which is what `sdkVersions` returns.
 */
export function indexedVersions(versions: readonly string[] = sdkVersions()): string[] {
  const newestPerLine = new Map<string, string>();
  for (const version of versions) {
    if (version === MAIN) continue;
    const line = version.split('.').slice(0, 2).join('.');
    if (!newestPerLine.has(line)) newestPerLine.set(line, version);
  }
  return [...newestPerLine.values()].slice(0, INDEXED_LINES);
}

/**
 * Whether a version's pages should be indexed, rather than only served.
 *
 * The latest is always in, even when it is `main` - which it is until the first
 * release is compiled. Its pages canonicalise to the unversioned copy, and a
 * page that is `noindex` *and* canonical somewhere else asks a crawler for two
 * incompatible things.
 */
export const isIndexedVersion = (version: string): boolean =>
  version === latestSdkVersion() || indexedVersions().includes(version);

/**
 * Every compiled version, newest first, addressed for the page being read.
 *
 * @param type  the type on screen, if this is a type page rather than an index
 */
export function versionOptions(type?: string): VersionOption[] {
  const latest = latestSdkVersion();
  return sdkVersions().map((version) => {
    const present = !type || sdkTypeNames(version).has(type);
    return {
      version,
      // Somewhere that exists either way: a version that never had this type
      // sends the reader to that version's index rather than to a 404.
      // Canonical rather than raw, so picking "latest" lands on the unversioned
      // page rather than on a second copy of it.
      href: canonicalPath(version, present && type ? type : undefined),
      present,
      latest: version === latest,
      unreleased: version === MAIN,
    };
  });
}

/**
 * The newer release to point an older page at, or null when there is none.
 *
 * Null for the latest release itself, and for `main`: `main` is ahead of every
 * release, so telling someone reading it that 13.4.1 is newer would be wrong.
 */
export function newerVersion(
  current: string,
  type?: string
): { version: string; href: string } | null {
  const latest = latestSdkVersion();
  if (!latest || current === latest || current === MAIN) return null;
  const present = !type || sdkTypeNames(latest).has(type);
  return {
    version: latest,
    href: canonicalPath(latest, present && type ? type : undefined),
  };
}

/** True when the version has a compiled index - i.e. it is one we can switch to. */
export const isCompiled = (version: string): boolean => sdkIndex(version) !== null;
