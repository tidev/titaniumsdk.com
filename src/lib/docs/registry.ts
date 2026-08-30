import {
  ApiIndexSchema,
  ApiTypeSchema,
  SdkVersionSchema,
  type ApiIndex,
  type ApiType,
  type SdkVersion,
} from '../registry/index.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the compiled reference off the local filesystem.
 *
 * No network at build time, deliberately: that is what makes rebuilds fast and
 * preview deploys reproducible. Everything here resolves against `registry/`
 * in the repo.
 *
 * A compiled version directory has the same shape wherever it sits — the SDK's
 * `registry/sdk/<version>/` and a module's `registry/modules/<id>/<version>/`
 * both hold `index.json`, `metadata.json`, and `types/`. The readers below take
 * that directory; the SDK wrappers at the bottom and `./modules.ts` are the two
 * things that know where to find one.
 */

export const REGISTRY = join(process.cwd(), 'registry');
const SDK_DIR = join(REGISTRY, 'sdk');

/** The mutable tree, compiled from a repository's default branch. */
export const MAIN = 'main';

/** Newest first. `main` sorts last: it is a moving target, not a release. */
export function compareVersions(a: string, b: string): number {
  if (a === MAIN) return 1;
  if (b === MAIN) return -1;
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const cache = new Map<string, unknown>();
function readJson<T>(path: string, parse: (v: unknown) => T): T | null {
  if (cache.has(path)) return cache.get(path) as T;
  if (!existsSync(path)) return null;
  const value = parse(JSON.parse(readFileSync(path, 'utf8')));
  cache.set(path, value);
  return value;
}

// ------------------------------------------------------- one version directory

/** True when the directory carries a compiled reference rather than only metadata. */
export const hasApiIndex = (dir: string): boolean => existsSync(join(dir, 'index.json'));

export function apiIndexAt(dir: string): ApiIndex | null {
  return readJson(join(dir, 'index.json'), (v) => ApiIndexSchema.parse(v));
}

export function apiTypeAt(dir: string, name: string): ApiType | null {
  // The name reaches this from a cross-reference or a URL segment, so it must
  // not be able to escape the types directory. Type names are dotted
  // identifiers and nothing else.
  if (!/^[A-Za-z_][\w.]*$/.test(name)) return null;
  return readJson(join(dir, 'types', `${name}.json`), (v) => ApiTypeSchema.parse(v));
}

/** What a compiled directory records about the checkout it was built from. */
export type CompiledSource = { repo?: string; ref?: string; commit?: string };

/**
 * A link to the source YAML on GitHub.
 *
 * Pinned to the commit when one was recorded, so it points at the file as it was
 * compiled rather than at whatever the branch holds now. Falls back to the ref,
 * and returns null when neither is known. Every source repository keeps its
 * apidoc at `apidoc/` — see scripts/docgen/sources.json — so the prefix is
 * fixed rather than carried per repo.
 */
export function blobUrl(source: CompiledSource | undefined, sourcePath: string): string | null {
  if (!source?.repo) return null;
  const at = source.commit ?? source.ref;
  if (!at) return null;
  return `https://github.com/${source.repo}/blob/${at}/apidoc/${sourcePath}`;
}

// ------------------------------------------------------------------------ SDK

/** Version directories that actually carry compiled docs. */
export function sdkVersions(): string[] {
  if (!existsSync(SDK_DIR)) return [];
  return readdirSync(SDK_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && hasApiIndex(join(SDK_DIR, e.name)))
    .map((e) => e.name)
    .sort(compareVersions);
}

/**
 * What `/docs/sdk/latest` points at.
 *
 * The newest released version that has been compiled, falling back to `main`
 * when none has yet — which is the case until a release is compiled.
 */
export function latestSdkVersion(): string | null {
  const all = sdkVersions();
  return all.find((v) => v !== MAIN) ?? all[0] ?? null;
}

export function resolveVersion(requested: string): string | null {
  const resolved = requested === 'latest' ? latestSdkVersion() : requested;
  return resolved && sdkVersions().includes(resolved) ? resolved : null;
}

export const sdkIndex = (version: string): ApiIndex | null => apiIndexAt(join(SDK_DIR, version));

/** What this version was compiled from: repo, ref, and commit. */
export function sdkMetadata(version: string): SdkVersion | null {
  return readJson(join(SDK_DIR, version, 'metadata.json'), (v) => SdkVersionSchema.parse(v));
}

export const sourceUrl = (version: string, sourcePath: string): string | null =>
  blobUrl(sdkMetadata(version)?.source as CompiledSource | undefined, sourcePath);

export const sdkType = (version: string, name: string): ApiType | null =>
  apiTypeAt(join(SDK_DIR, version), name);

/**
 * Every type name the SDK reference renders a page for, at one version.
 *
 * A module's cross-repo references are checked against this: docgen compiles one
 * repo at a time, so a module's `Titanium.UI.View` is only a name until someone
 * confirms the SDK still has a page for it.
 */
export function sdkTypeNames(version: string): ReadonlySet<string> {
  const cached = sdkNames.get(version);
  if (cached) return cached;
  const names = new Set((sdkIndex(version)?.types ?? []).map((t) => t.name));
  sdkNames.set(version, names);
  return names;
}

const sdkNames = new Map<string, Set<string>>();
