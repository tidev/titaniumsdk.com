import type { RawType, SourceFile } from './load.ts';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Incremental regeneration.
 *
 * A per-file hash is not sufficient on its own, because inheritance is resolved
 * into each type's output: editing `Titanium.UI.View` changes what every
 * descendant emits, and 237 of 417 types sit at depth 1 or 2. So the manifest
 * records the type graph as well as source hashes, and invalidation walks
 * descendants.
 */

export const MANIFEST_VERSION = 1;

export type Manifest = {
  schemaVersion: number;
  /** Hash of the generator's own source. Changing docgen invalidates everything. */
  generator: string;
  generatedAt: string;
  sources: Record<string, { hash: string; types: string[] }>;
  types: Record<string, { source: string; extends?: string; outputHash: string }>;
};

export type Plan = {
  reason: 'first-run' | 'generator-changed' | 'incremental';
  /** Types to regenerate. */
  dirty: string[];
  /** Types whose sources are untouched but which inherit from something dirty. */
  viaInheritance: string[];
  unchanged: string[];
  addedSources: string[];
  changedSources: string[];
  removedSources: string[];
  /** Outputs to delete: types that no longer exist in the source. */
  removedTypes: string[];
};

export const sha256 = (s: string) => `sha256:${createHash('sha256').update(s).digest('hex')}`;

/**
 * Hashes every file in scripts/docgen/, so editing the generator forces a full
 * rebuild. Without this, a change to how output is shaped would silently leave
 * every previously-generated file stale.
 */
export function generatorHash(): string {
  const dir = fileURLToPath(new URL('.', import.meta.url));
  const parts = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => `${f}:${sha256(readFileSync(join(dir, f), 'utf8'))}`);
  return sha256(parts.join('\n'));
}

export function readManifest(path: string): Manifest | null {
  if (!existsSync(path)) return null;
  try {
    const m = JSON.parse(readFileSync(path, 'utf8')) as Manifest;
    return m.schemaVersion === MANIFEST_VERSION ? m : null;
  } catch {
    return null;
  }
}

/** Every type that inherits, transitively, from any of `roots`. */
function descendantsOf(roots: Set<string>, types: Map<string, RawType>): Set<string> {
  const children = new Map<string, string[]>();
  for (const t of types.values()) {
    if (!t.extends) continue;
    const list = children.get(t.extends) ?? [];
    list.push(t.name);
    children.set(t.extends, list);
  }

  const out = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    for (const child of children.get(queue.pop()!) ?? []) {
      // Guards against a cycle in `extends`, which would otherwise hang here.
      if (out.has(child)) continue;
      out.add(child);
      queue.push(child);
    }
  }
  return out;
}

export function plan(
  previous: Manifest | null,
  sources: SourceFile[],
  types: Map<string, RawType>,
  generator: string
): Plan {
  const all = [...types.keys()];

  if (!previous) {
    return {
      reason: 'first-run',
      dirty: all,
      viaInheritance: [],
      unchanged: [],
      addedSources: sources.map((s) => s.path),
      changedSources: [],
      removedSources: [],
      removedTypes: [],
    };
  }
  if (previous.generator !== generator) {
    return {
      reason: 'generator-changed',
      dirty: all,
      viaInheritance: [],
      unchanged: [],
      addedSources: [],
      changedSources: [],
      removedSources: [],
      removedTypes: [],
    };
  }

  const added: string[] = [];
  const changed: string[] = [];
  for (const s of sources) {
    const before = previous.sources[s.path];
    if (!before) added.push(s.path);
    else if (before.hash !== s.hash) changed.push(s.path);
  }
  const current = new Set(sources.map((s) => s.path));
  const removedSources = Object.keys(previous.sources).filter((p) => !current.has(p));

  // Types declared by any source that appeared, changed, or vanished.
  const touched = new Set(
    [...added, ...changed].flatMap((p) => sources.find((s) => s.path === p)?.types ?? [])
  );
  for (const p of removedSources) {
    for (const t of previous.sources[p].types) touched.add(t);
  }

  const inherited = descendantsOf(touched, types);
  for (const t of touched) inherited.delete(t);

  const dirtySet = new Set([...touched, ...inherited].filter((t) => types.has(t)));
  const removedTypes = Object.keys(previous.types).filter((t) => !types.has(t));

  return {
    reason: 'incremental',
    dirty: [...dirtySet].sort(),
    viaInheritance: [...inherited].filter((t) => types.has(t)).sort(),
    unchanged: all.filter((t) => !dirtySet.has(t)).sort(),
    addedSources: added,
    changedSources: changed,
    removedSources,
    removedTypes,
  };
}

export function describe(p: Plan): string {
  if (p.reason === 'first-run') return `first run — generating all ${p.dirty.length} types`;
  if (p.reason === 'generator-changed') {
    return `generator changed — regenerating all ${p.dirty.length} types`;
  }
  const direct = p.dirty.length - p.viaInheritance.length;
  const src =
    [
      p.addedSources.length && `${p.addedSources.length} added`,
      p.changedSources.length && `${p.changedSources.length} changed`,
      p.removedSources.length && `${p.removedSources.length} removed`,
    ]
      .filter(Boolean)
      .join(', ') || 'no source changes';
  return (
    `${src} → ${p.dirty.length} type(s) to regenerate ` +
    `(${direct} directly, ${p.viaInheritance.length} via inheritance), ` +
    `${p.unchanged.length} untouched`
  );
}
