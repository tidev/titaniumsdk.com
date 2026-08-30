import { sha256 } from './manifest.ts';
import type { ResolvedType, ResolveResult } from './resolve.ts';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writes the compiled reference.
 *
 * Output has to be byte-stable: the change detection in TI-18 decides whether to
 * commit by diffing these files, so a reordered key would look like a content
 * change and trigger a pointless deploy. Every array is sorted upstream in
 * resolve.ts and keys are written in a fixed order here.
 */

export const SCHEMA_VERSION = 1;

const MEMBER_GROUPS = ['properties', 'methods', 'events'] as const;

export type IndexEntry = {
  name: string;
  kind: ResolvedType['kind'];
  summary?: string;
  platforms?: ResolvedType['platforms'];
  since?: ResolvedType['since'];
  deprecated: boolean;
  extends?: string;
  counts: { properties: number; methods: number; events: number };
  /**
   * Every member name the page carries, declared and inherited.
   *
   * Here rather than only in the type file because this index is what another
   * repo's compile reads: counts cannot answer whether
   * `Titanium.UI.ANIMATION_CURVE_LINEAR` exists, so without the names a
   * cross-repo member reference could only be guessed at.
   */
  members: string[];
};

/** Drops undefined so the JSON stays free of null noise, and keeps key order fixed. */
function clean<T extends object>(o: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function typeDocument(t: ResolvedType) {
  return clean({
    schemaVersion: SCHEMA_VERSION,
    name: t.name,
    kind: t.kind,
    extends: t.extends,
    inheritanceChain: t.inheritanceChain.length ? t.inheritanceChain : undefined,
    platforms: t.platforms,
    since: t.since,
    deprecated: t.deprecated,
    summary: t.summary,
    description: t.description,
    examples: t.examples,
    properties: t.properties,
    methods: t.methods,
    events: t.events,
    inherited: t.inherited,
    references: t.references.length ? t.references : undefined,
    externalReferences: t.externalReferences,
    source: t.source,
  });
}

const serialise = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

export type EmitResult = {
  written: string[];
  /** Regenerated but byte-identical to what was on disk. */
  unchanged: string[];
  removed: string[];
  outputHashes: Record<string, string>;
};

/**
 * @param dirty  types to regenerate; everything else keeps its recorded hash
 * @param removedTypes  types that vanished from the source
 */
export function emit(
  outDir: string,
  result: ResolveResult,
  dirty: string[],
  removedTypes: string[],
  previousHashes: Record<string, string>
): EmitResult {
  const typesDir = join(outDir, 'types');
  mkdirSync(typesDir, { recursive: true });

  const written: string[] = [];
  const unchanged: string[] = [];
  const outputHashes: Record<string, string> = {};

  // Types folded into a referent get no file of their own.
  const emitted = [...result.types.values()].filter((t) => !result.inlined.has(t.name));
  const emittedNames = new Set(emitted.map((t) => t.name));
  const dirtySet = new Set(dirty);

  for (const t of emitted) {
    const file = join(typesDir, `${t.name}.json`);
    const needsWrite = dirtySet.has(t.name) || !existsSync(file);
    if (!needsWrite && previousHashes[t.name]) {
      outputHashes[t.name] = previousHashes[t.name];
      unchanged.push(t.name);
      continue;
    }

    const body = serialise(typeDocument(t));
    const hash = sha256(body);
    outputHashes[t.name] = hash;

    // Skip the write when the bytes match — keeps mtimes stable so the commit
    // step in TI-18 sees a genuinely empty diff rather than 419 touched files.
    if (existsSync(file) && readFileSync(file, 'utf8') === body) {
      unchanged.push(t.name);
      continue;
    }
    writeFileSync(file, body);
    written.push(t.name);
  }

  const removed: string[] = [];
  for (const name of removedTypes) {
    const file = join(typesDir, `${name}.json`);
    if (existsSync(file)) {
      rmSync(file);
      removed.push(name);
    }
  }
  // A type that became inlined, or was renamed, leaves an orphan behind.
  for (const entry of readdirSync(typesDir)) {
    if (!entry.endsWith('.json')) continue;
    const name = entry.slice(0, -5);
    if (emittedNames.has(name) || removed.includes(name)) continue;
    rmSync(join(typesDir, entry));
    removed.push(name);
  }

  const index = {
    schemaVersion: SCHEMA_VERSION,
    counts: {
      types: emitted.length,
      inlined: result.inlined.size,
      members: emitted.reduce(
        (n, t) => n + t.properties.length + t.methods.length + t.events.length,
        0
      ),
    },
    types: emitted
      .map((t): IndexEntry =>
        clean({
          name: t.name,
          kind: t.kind,
          summary: t.summary,
          platforms: t.platforms,
          since: t.since,
          deprecated: !!t.deprecated,
          extends: t.extends,
          // What a reader sees on the page: declared plus inherited.
          counts: {
            properties: t.properties.length + t.inherited.properties.length,
            methods: t.methods.length + t.inherited.methods.length,
            events: t.events.length + t.inherited.events.length,
          },
          // Flat and deduplicated, because that is what a member anchor is:
          // #backgroundColor names one thing on the page whichever group it
          // came from.
          members: [
            ...new Set(
              MEMBER_GROUPS.flatMap((g) => [
                ...t[g].map((m) => m.name),
                ...t.inherited[g].map((m) => m.name),
              ])
            ),
          ].sort(),
        })
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
    inlined: [...result.inlined].sort(),
  };

  const indexBody = serialise(index);
  const indexFile = join(outDir, 'index.json');
  if (!existsSync(indexFile) || readFileSync(indexFile, 'utf8') !== indexBody) {
    writeFileSync(indexFile, indexBody);
    written.push('index.json');
  }

  return { written, unchanged, removed, outputHashes };
}
