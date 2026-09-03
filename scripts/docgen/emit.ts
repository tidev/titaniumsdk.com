import { putBlob } from '../lib/pool.ts';
import { sha256 } from './manifest.ts';
import type { ResolvedType, ResolveResult } from './resolve.ts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writes the compiled reference.
 *
 * Output has to be byte-stable: the change detection in TI-18 decides whether to
 * commit by diffing these files, so a reordered key would look like a content
 * change and trigger a pointless deploy. Every array is sorted upstream in
 * resolve.ts and keys are written in a fixed order here.
 *
 * Documents go into the shared content-addressed pool rather than into the
 * version directory — see `src/lib/docs/pool.ts`. Byte-stability is what makes
 * that work: an untouched type hashes to the blob twenty releases already
 * share, which is where 103MB of type files becomes 15MB.
 */

/**
 * The pooled filename for a document whose body hashed to `outputHash`.
 *
 * The manifest's hash and the pool's address are the same SHA-256 over the same
 * bytes, so one can be read off the other. That is a coupling, and it is
 * checked rather than assumed: the caller confirms the blob is really in the
 * pool and re-serialises when it is not, so a change to either hashing rule
 * costs a rebuild instead of producing a dangling reference.
 */
const poolEntry = (outputHash: string) => `${outputHash.replace(/^sha256:/, '').slice(0, 16)}.json`;

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
  /** Regenerated but byte-identical to a blob the pool already holds. */
  unchanged: string[];
  removed: string[];
  outputHashes: Record<string, string>;
  /** What `contents.json` should say this version carries. */
  contents: { index: string; types: Record<string, string> };
};

/**
 * @param dirty  types to regenerate; everything else keeps its recorded hash
 * @param removedTypes  types that vanished from the source
 */
export function emit(
  pool: string,
  result: ResolveResult,
  dirty: string[],
  removedTypes: string[],
  previousHashes: Record<string, string>
): EmitResult {
  const written: string[] = [];
  const unchanged: string[] = [];
  const outputHashes: Record<string, string> = {};
  const types: Record<string, string> = {};

  // Types folded into a referent get no file of their own.
  const emitted = [...result.types.values()].filter((t) => !result.inlined.has(t.name));
  const emittedNames = new Set(emitted.map((t) => t.name));
  const dirtySet = new Set(dirty);

  for (const t of emitted) {
    // A clean type can be carried over from the manifest without re-resolving
    // its document, but only while the blob it names is genuinely in the pool.
    const prior = previousHashes[t.name];
    if (!dirtySet.has(t.name) && prior && existsSync(join(pool, poolEntry(prior)))) {
      outputHashes[t.name] = prior;
      types[t.name] = poolEntry(prior);
      unchanged.push(t.name);
      continue;
    }

    const body = serialise(typeDocument(t));
    const hash = sha256(body);
    outputHashes[t.name] = hash;
    // Storing is a no-op when some other version already holds these bytes,
    // which is the ordinary case: the pool is why a point release costs
    // kilobytes rather than 15MB.
    const { entry, written: stored } = putBlob(pool, body, '.json');
    types[t.name] = entry;
    (stored ? written : unchanged).push(t.name);
  }

  // A type that vanished, became inlined, or was renamed simply stops being
  // named. Nothing is deleted here: the blob may still belong to another
  // version, so reclaiming it is the pool sweep's job, not this one's.
  const removed = removedTypes.filter((name) => !emittedNames.has(name));

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

  const { entry: indexEntry, written: indexStored } = putBlob(pool, serialise(index), '.json');
  if (indexStored) written.push('index.json');

  return {
    written,
    unchanged,
    removed,
    outputHashes,
    contents: {
      index: indexEntry,
      types: Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b))),
    },
  };
}
