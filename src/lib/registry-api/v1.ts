import { latestPerPlatform, PLATFORM_ORDER } from '../docs/module-summary.ts';
import {
  communityListings,
  moduleIds,
  moduleIndex,
  moduleRelease,
  latestReleases,
} from '../docs/modules.ts';
import type { ModuleIndex, ModuleVersion, Platform } from '../registry/index.ts';

/**
 * The public registry API's payloads (TI-55).
 *
 * A contract, not a view. The Titanium CLI ships independently of this site and
 * old copies stay in the wild for years, so every field here is one we are
 * willing to keep answering: the shapes deliberately do not mirror the internal
 * registry schema, which is free to change underneath.
 *
 * Built as plain values rather than written straight into a Response so the
 * rules below — above all which release a platform resolves to — can be tested
 * without going through the router.
 */

/** Bumped only for a breaking change, which also means a new path segment. */
export const API_VERSION = 1;

export type ListedModule =
  | {
      kind: 'registry';
      id: string;
      description?: string;
      source: string;
      repo?: string;
      /** Platforms with at least one published release. */
      platforms: Platform[];
      /** The current release per platform. Never one value — see `resolve`. */
      latest: Partial<Record<Platform, string>>;
      /** `minsdk` of each platform's current release, where its manifest says. */
      minsdk: Partial<Record<Platform, string>>;
      releases: number;
    }
  | {
      kind: 'community';
      /** `owner/name`: a community module has no manifest id to key on. */
      id: string;
      name: string;
      owner: string;
      description?: string;
      /** Its repository. There is nothing here to install — see the notes. */
      url: string;
      platforms: Platform[];
      stars: number;
      archived: boolean;
      pushedAt: string;
    };

/**
 * How a client turns "I target iOS" into a version, spelled out because getting
 * it wrong is silent: `ti.map` resolves to iOS 7.3.1, not the android 5.7.0 that
 * was published more recently and sorts higher by date.
 */
export const RESOLUTION_RULES = [
  'A module has a current release per platform, never one overall. Read `latest[platform]` for the platform you are building.',
  'Do not compare versions across platforms. ti.map is android 5.7.0 and ios 7.3.1 at once, and neither supersedes the other.',
  'A release may carry both platforms. When it does, the same version appears under each key.',
  '`minsdk` is the Titanium SDK a release requires, copied verbatim from that platform manifest. It is not normalised: expect both "12.7.0" and "10.0.0.GA", sometimes on the same module, so strip any suffix before comparing. Absent means the manifest did not declare one.',
  'Entries with `"kind": "community"` are repositories, not packages. They carry no version list and nothing to install.',
  '`kind` is whether this site has a page for a module; `source` is who stands behind it. They agree for every module today, but they are not the same question — a repository owned by TiDev that nothing here documents is `"kind": "community"` with no `source` at all.',
] as const;

function minsdkPerPlatform(index: ModuleIndex): Partial<Record<Platform, string>> {
  return Object.fromEntries(
    latestReleases(index)
      .filter((l) => l.minsdk)
      .map((l) => [l.platform, l.minsdk])
  );
}

/** Every module of either kind, registry first, then community by popularity. */
export function listModules(): ListedModule[] {
  const registry: ListedModule[] = moduleIds().flatMap((id) => {
    const index = moduleIndex(id);
    if (!index) return [];
    const latest = latestPerPlatform(index);
    return [
      {
        kind: 'registry' as const,
        id,
        ...(index.description ? { description: index.description } : {}),
        source: index.source,
        ...(index.repo ? { repo: index.repo } : {}),
        platforms: PLATFORM_ORDER.filter((p) => index.latest[p]),
        latest: Object.fromEntries(latest.map((l) => [l.platform, l.version])),
        minsdk: minsdkPerPlatform(index),
        releases: index.versions.length,
      },
    ];
  });

  const community: ListedModule[] = communityListings().map((m) => ({
    kind: 'community' as const,
    id: m.id,
    name: m.name,
    owner: m.owner,
    ...(m.description ? { description: m.description } : {}),
    url: m.url,
    platforms: m.platforms,
    stars: m.stars,
    archived: m.archived,
    pushedAt: m.pushedAt,
  }));

  // Registry modules by id, so the file is byte-stable between builds that
  // changed nothing. Community keeps the generator's order, which is by stars —
  // that is a ranking a search client would otherwise have to reconstruct.
  registry.sort((a, b) => a.id.localeCompare(b.id));
  return [...registry, ...community];
}

export type ModuleDetail = {
  kind: 'registry';
  id: string;
  description?: string;
  repo?: string;
  source: string;
  /** Other spellings that redirect to this id on the site. */
  aliases: string[];
  latest: Partial<Record<Platform, string>>;
  minsdk: Partial<Record<Platform, string>>;
  releases: {
    version: string;
    platforms: Platform[];
    publishedAt?: string;
    prerelease: boolean;
  }[];
};

export function moduleDetail(id: string): ModuleDetail | null {
  const index = moduleIndex(id);
  if (!index) return null;

  return {
    kind: 'registry',
    id: index.moduleId,
    ...(index.description ? { description: index.description } : {}),
    ...(index.repo ? { repo: index.repo } : {}),
    source: index.source,
    aliases: index.aliases,
    latest: Object.fromEntries(latestPerPlatform(index).map((l) => [l.platform, l.version])),
    minsdk: minsdkPerPlatform(index),
    releases: index.versions.map((v) => ({
      version: v.version,
      platforms: v.platforms,
      ...(v.publishedAt ? { publishedAt: v.publishedAt } : {}),
      // Written by scripts/generate-modules.ts from the GitHub release; the
      // schema leaves `versions` open, so it arrives untyped.
      prerelease: (v as { prerelease?: boolean }).prerelease === true,
    })),
  };
}

export type ReleaseDetail = {
  moduleId: string;
  version: string;
  platforms: Platform[];
  publishedAt?: string;
  /** Opaque. Four tag formats exist across ti.map alone — never pattern-match it. */
  tag?: string;
  /** True for the development branch, which is not a published release. */
  mutable: boolean;
  hasApiDocs: boolean;
  manifests: ModuleVersion['manifests'];
  assets: {
    platform: Platform;
    filename: string;
    url: string;
    size?: number;
    /**
     * `sha256:…` when GitHub recorded one. Absent for anything uploaded before
     * GitHub began digesting release assets, which is most of the archive — a
     * client must treat this as "cannot verify", not "verified".
     */
    checksum?: string;
  }[];
};

export function releaseDetail(id: string, version: string): ReleaseDetail | null {
  const release = moduleRelease(id, version);
  if (!release) return null;

  return {
    moduleId: release.moduleId,
    version: release.version,
    platforms: release.platforms,
    ...(release.publishedAt ? { publishedAt: release.publishedAt } : {}),
    ...(release.tag ? { tag: release.tag } : {}),
    mutable: release.mutable,
    hasApiDocs: release.hasApiDocs,
    manifests: release.manifests,
    assets: release.assets.map((a) => ({
      platform: a.platform,
      filename: a.filename,
      url: a.url,
      ...(a.size === undefined ? {} : { size: a.size }),
      ...(a.checksum ? { checksum: a.checksum } : {}),
    })),
  };
}

/** Every (module, version) pair the release endpoint answers for. */
export function releaseParams(): { moduleId: string; version: string }[] {
  return moduleIds().flatMap((moduleId) =>
    (moduleIndex(moduleId)?.versions ?? []).map((v) => ({ moduleId, version: v.version }))
  );
}
