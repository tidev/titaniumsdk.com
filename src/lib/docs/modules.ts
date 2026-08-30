import {
  ModuleIndexSchema,
  ModuleVersionSchema,
  type ApiIndex,
  type ApiType,
  type ModuleIndex,
  type ModuleVersion,
} from '../registry/index.ts';
import { latestPerPlatform, type ModuleSummary } from './module-summary.ts';
import {
  apiIndexAt,
  apiTypeAt,
  compareVersions,
  hasApiIndex,
  MAIN,
  REGISTRY,
  type CompiledSource,
} from './registry.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads `registry/modules/` off the local filesystem.
 *
 * Keyed on `moduleId` throughout, never on the repository name: they differ for
 * 5 of the 16 (`tidev/titanium-identity` publishes `ti.identity`), and the id is
 * what a developer writes in `tiapp.xml` and what the install directory is named.
 * The repo name reaches the site only as an alias that redirects.
 *
 * Nothing here trusts a URL segment. Ids and version strings are checked against
 * what is on disk rather than pattern-matched, so a traversal attempt resolves
 * to nothing instead of to a path.
 */

const MODULES_DIR = join(REGISTRY, 'modules');

const cache = new Map<string, unknown>();
function readJson<T>(path: string, parse: (v: unknown) => T): T | null {
  if (cache.has(path)) return cache.get(path) as T;
  if (!existsSync(path)) return null;
  const value = parse(JSON.parse(readFileSync(path, 'utf8')));
  cache.set(path, value);
  return value;
}

let ids: string[] | null = null;

/** Every module in the registry, sorted by id. */
export function moduleIds(): string[] {
  if (ids) return ids;
  if (!existsSync(MODULES_DIR)) return (ids = []);
  ids = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(MODULES_DIR, e.name, 'index.json')))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
  return ids;
}

export function moduleIndex(id: string): ModuleIndex | null {
  if (!moduleIds().includes(id)) return null;
  return readJson(join(MODULES_DIR, id, 'index.json'), (v) => ModuleIndexSchema.parse(v));
}

/**
 * The module's README, as committed to its repository.
 *
 * Narrowed here rather than read off the parsed index because `ModuleIndexSchema`
 * does not declare the field — it declares `readme` on a *version* instead, so
 * the one `generate-modules.ts` writes at package level arrives through the
 * schema's catchall as `unknown`. The data is real and every module has one;
 * the contract is what is behind, and widening it is a registry change rather
 * than a rendering one.
 */
export function moduleReadme(id: string): string | undefined {
  const readme = (moduleIndex(id) as { readme?: unknown } | null)?.readme;
  return typeof readme === 'string' && readme ? readme : undefined;
}

/**
 * The spellings that should redirect to a canonical id.
 *
 * `aliases` carries the id itself for most modules, so the identity entry is
 * dropped here — a page cannot redirect to itself. What is left is the five
 * repository names that differ from what the module publishes as.
 */
export function moduleAliases(): { alias: string; moduleId: string }[] {
  const out: { alias: string; moduleId: string }[] = [];
  const canonical = new Set(moduleIds());
  for (const id of moduleIds()) {
    for (const alias of moduleIndex(id)?.aliases ?? []) {
      if (alias !== id && !canonical.has(alias)) out.push({ alias, moduleId: id });
    }
  }
  return out;
}

/**
 * Every version directory a module has, newest first with `main` last.
 *
 * Read from disk rather than from `index.json.versions`, because the two do not
 * describe the same thing: `versions` lists releases, and `main` is a directory
 * that no release produced.
 */
export function moduleVersions(id: string): string[] {
  if (!moduleIds().includes(id)) return [];
  return readdirSync(join(MODULES_DIR, id), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(compareVersions);
}

const versionDir = (id: string, version: string): string | null =>
  moduleVersions(id).includes(version) ? join(MODULES_DIR, id, version) : null;

/** One release: platforms, manifests, assets, and where it was compiled from. */
export function moduleRelease(id: string, version: string): ModuleVersion | null {
  const dir = versionDir(id, version);
  if (!dir) return null;
  return readJson(join(dir, 'metadata.json'), (v) => ModuleVersionSchema.parse(v));
}

export function moduleHasDocs(id: string, version: string): boolean {
  const dir = versionDir(id, version);
  return !!dir && hasApiIndex(dir);
}

export function moduleApiIndex(id: string, version: string): ApiIndex | null {
  const dir = versionDir(id, version);
  return dir ? apiIndexAt(dir) : null;
}

export function moduleApiType(id: string, version: string, name: string): ApiType | null {
  const dir = versionDir(id, version);
  return dir ? apiTypeAt(dir, name) : null;
}

export const moduleSource = (id: string, version: string): CompiledSource | undefined =>
  moduleRelease(id, version)?.source as CompiledSource | undefined;

/**
 * The SDK tree this version's cross-repo references were resolved against.
 *
 * docgen records it because a module compiles alone: `Titanium.UI.View` is
 * unresolvable inside ti.map's own checkout, so the SDK it was checked against
 * is written down. Linking those references at that version rather than at
 * whatever the site's newest SDK happens to be is the difference between a
 * reference that was verified and one that was assumed.
 *
 * Read loosely on purpose — docgen owns this file and treats a corrupt one as a
 * reason to recompile, not as a contract breach.
 */
export function externalSdkVersion(id: string, version: string): string | null {
  const dir = versionDir(id, version);
  if (!dir) return null;
  const manifest = readJson(join(dir, 'docgen-manifest.json'), (v) => v as unknown);
  const external = (manifest as { external?: { version?: unknown } } | null)?.external;
  return typeof external?.version === 'string' ? external.version : null;
}

// ------------------------------------------------------------------- summaries

/** Everything the browse page shows, and nothing it does not. */
export function moduleSummaries(): ModuleSummary[] {
  return moduleIds().flatMap((id) => {
    const index = moduleIndex(id);
    if (!index) return [];
    return [
      {
        id,
        description: index.description,
        curation: index.curation,
        repo: index.repo,
        latest: latestPerPlatform(index),
        releases: index.versions.length,
      },
    ];
  });
}

/**
 * The versions whose compiled docs make up `/modules/<id>`.
 *
 * The latest per platform, which is normally one or two release directories.
 * Two modules — ti.coremotion and com.appcelerator.urlSession — have docs only
 * on a prerelease that `latest` deliberately skips, so nothing released would
 * be shown for them; those fall back to `main`, which every module has, and the
 * page says so rather than rendering an empty reference.
 */
export function referenceVersions(id: string, index: ModuleIndex): string[] {
  const released = [...new Set(Object.values(index.latest))]
    .filter((v) => moduleHasDocs(id, v))
    .sort(compareVersions);
  if (released.length) return released;
  return moduleHasDocs(id, MAIN) ? [MAIN] : [];
}
