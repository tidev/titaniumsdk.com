import type { ApiType, Member } from '../registry/index.ts';
import { anchorFor, memberAnchor, type ApiLinker } from './links.ts';
import { externalSdkVersion, moduleApiIndex, moduleApiType, moduleRelease } from './modules.ts';
import { latestSdkVersion, resolveVersion, sdkTypeNames } from './registry.ts';
import { viewOf, type TypeReader, type TypeView } from './type-view.ts';

/**
 * Assembles the reference a module page renders.
 *
 * A module puts its whole namespace on one page, so this is a list of type
 * views rather than a single one, and it can be built from more than one
 * release: `/modules/<id>` shows the union of the latest per platform, because
 * neither platform's latest is "the" latest.
 */

export type ReferenceSource = {
  version: string;
  publishedAt?: string;
};

export type ModuleReference = {
  /** The release directories this was built from, newest first. */
  sources: ReferenceSource[];
  types: TypeView[];
  /** Every type name on the page, for resolving a cross-reference to an anchor. */
  names: ReadonlySet<string>;
  /** The SDK version cross-repo references were compiled against and link to. */
  sdkVersion: string | null;
};

const GROUPS = ['properties', 'methods', 'events'] as const;

/**
 * Reads a type from the first source that has it.
 *
 * Sources are ordered newest first, so a type that changed between two releases
 * is read from the newer one, and `viewOf` resolves that type's ancestors out of
 * the same tree wherever it can.
 */
function readerAcross(id: string, versions: readonly string[]): TypeReader {
  return (name) => {
    for (const version of versions) {
      const type = moduleApiType(id, version, name);
      if (type) return type;
    }
    return null;
  };
}

/**
 * Merges one type's copies from two releases.
 *
 * Only members the newer copy is missing are added, and never merged field by
 * field: two releases describing the same member differently is a docgen
 * question, not something a renderer should silently average. In the current
 * registry this adds exactly two methods — ti.nfc's android 6.0.0 declares
 * `enableReader` and `disableReader`, which its iOS 4.1.1 release predates.
 */
function mergeTypes(newer: ApiType, older: ApiType): ApiType {
  const merged = { ...newer };
  for (const group of GROUPS) {
    const have = new Set(newer[group].map((m: Member) => m.name));
    const extra = older[group].filter((m: Member) => !have.has(m.name));
    if (extra.length) merged[group] = [...newer[group], ...extra];

    const inheritedHave = new Set(newer.inherited[group].map((r) => r.name));
    const inheritedExtra = older.inherited[group].filter((r) => !inheritedHave.has(r.name));
    if (inheritedExtra.length) {
      merged.inherited = {
        ...merged.inherited,
        [group]: [...merged.inherited[group], ...inheritedExtra],
      };
    }
  }
  return merged;
}

/**
 * Display order: the module itself, then the types in its namespace, then the
 * dictionaries that are not.
 *
 * Alphabetical alone would file `MapPointType` between `Modules.Map` and
 * `Modules.Map.Annotation`, which reads as though the module's own API were
 * interrupted by a value type.
 */
function ordered(types: ApiType[]): ApiType[] {
  const root = types.find((t) => t.kind === 'module')?.name;
  const rank = (t: ApiType) => {
    if (t.name === root) return 0;
    return root && t.name.startsWith(`${root}.`) ? 1 : 2;
  };
  return [...types].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/**
 * Builds the reference for one module across one or more compiled versions.
 *
 * `versions` is what the page decided to show — a single release on a pinned
 * page, the latest per platform on the module's own page.
 */
export function buildModuleReference(
  id: string,
  versions: readonly string[]
): ModuleReference | null {
  if (!versions.length) return null;

  // Newest first by publication date, not by version: ti.map's android 5.7.0
  // shipped in 2025 and its iOS 7.3.1 in 2024, so the lower version number is
  // the later state of the apidoc.
  const sources: ReferenceSource[] = versions
    .map((version) => ({ version, publishedAt: moduleRelease(id, version)?.publishedAt }))
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  const order = sources.map((s) => s.version);
  const read = readerAcross(id, order);

  const merged = new Map<string, ApiType>();
  for (const version of order) {
    for (const entry of moduleApiIndex(id, version)?.types ?? []) {
      const type = moduleApiType(id, version, entry.name);
      if (!type) continue;
      const seen = merged.get(entry.name);
      merged.set(entry.name, seen ? mergeTypes(seen, type) : type);
    }
  }
  if (!merged.size) return null;

  const types = ordered([...merged.values()]).map((type) => viewOf(read, type));
  const recorded = externalSdkVersion(id, order[0]);

  return {
    sources,
    types,
    names: new Set(merged.keys()),
    // The recorded SDK is what the references were checked against; it is only
    // usable if the site still compiles that version.
    sdkVersion: (recorded && resolveVersion(recorded)) || latestSdkVersion(),
  };
}

/**
 * Where a cross-reference in a module's prose points.
 *
 * This is the half of the cross-repo story the registry cannot settle. docgen
 * compiles one repo at a time, so `Modules.Map.View` and `Titanium.UI.View` sit
 * side by side in the same sentence as `api:` URIs with nothing to distinguish
 * them; which tree each belongs to is only knowable here, where both are in
 * front of us.
 *
 * A name that is neither — a pseudo-type docgen folded into its referent and
 * emitted no file for — resolves to null, and the caller renders the text
 * without a link rather than shipping a 404.
 */
export function moduleLinker(reference: ModuleReference): ApiLinker {
  const sdk = reference.sdkVersion;
  const sdkNames = sdk ? sdkTypeNames(sdk) : new Set<string>();

  return (type, member) => {
    if (reference.names.has(type)) {
      return `#${member ? memberAnchor(type, member) : type}`;
    }
    if (sdk && sdkNames.has(type)) {
      return `/docs/sdk/${sdk}/${type}${member ? `#${anchorFor(member)}` : ''}`;
    }
    return null;
  };
}
