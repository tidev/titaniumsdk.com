import { ApiIndexSchema, ApiTypeSchema, type ApiIndex, type ApiType } from '../registry/index.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the compiled reference off the local filesystem.
 *
 * No network at build time, deliberately: that is what makes rebuilds fast and
 * preview deploys reproducible. Everything here resolves against `registry/`
 * in the repo.
 */

const REGISTRY = join(process.cwd(), 'registry');
const SDK_DIR = join(REGISTRY, 'sdk');

/** The mutable tree, compiled from the SDK's default branch. */
export const MAIN = 'main';

/** Newest first. `main` sorts last: it is a moving target, not a release. */
function compareVersions(a: string, b: string): number {
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

/** Version directories that actually carry compiled docs. */
export function sdkVersions(): string[] {
  if (!existsSync(SDK_DIR)) return [];
  return readdirSync(SDK_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(SDK_DIR, e.name, 'index.json')))
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

const cache = new Map<string, unknown>();
function readJson<T>(path: string, parse: (v: unknown) => T): T | null {
  if (cache.has(path)) return cache.get(path) as T;
  if (!existsSync(path)) return null;
  const value = parse(JSON.parse(readFileSync(path, 'utf8')));
  cache.set(path, value);
  return value;
}

export function sdkIndex(version: string): ApiIndex | null {
  return readJson(join(SDK_DIR, version, 'index.json'), (v) => ApiIndexSchema.parse(v));
}

export function sdkType(version: string, name: string): ApiType | null {
  // The name comes from a URL segment, so it must not be able to escape the
  // types directory. Type names are dotted identifiers and nothing else.
  if (!/^[A-Za-z_][\w.]*$/.test(name)) return null;
  return readJson(join(SDK_DIR, version, 'types', `${name}.json`), (v) => ApiTypeSchema.parse(v));
}
