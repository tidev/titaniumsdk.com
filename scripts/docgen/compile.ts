import { emit } from './emit.ts';
import { loadApiDocs, type LoadResult } from './load.ts';
import {
  describe,
  generatorHash,
  MANIFEST_VERSION,
  plan,
  readManifest,
  type Manifest,
  type Plan,
} from './manifest.ts';
import { resolveAll } from './resolve.ts';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * One apidoc tree in, one registry directory out.
 *
 * Shared by the developer CLI (index.ts) and the CI regen (regen.ts) so the two
 * cannot drift — what runs unattended against 17 repos is the same code path a
 * developer exercises locally.
 */

export class CompileError extends Error {}

export type CompileOptions = {
  /** Directory holding the apidoc YAML tree. */
  apidoc: string;
  outDir: string;
  /** Report what would be regenerated and write nothing. */
  planOnly?: boolean;
  /** Ignore known-broken-refs.json, to see what it is still hiding. */
  strict?: boolean;
  /**
   * Which source this tree came from, e.g. `tidev/ti.map`.
   *
   * Selects that repo's slice of the known-broken allowlist. Omitted, every
   * entry is allowed but none is reported stale — a compile that does not know
   * whose corpus it is holding cannot tell a fixed reference from an absent one.
   */
  sourceRepo?: string;
  log?: (message: string) => void;
};

export type CompileResult = {
  sourceFiles: number;
  types: number;
  parseProblems: LoadResult['problems'];
  plan: Plan;
  written: string[];
  unchanged: string[];
  removed: string[];
  inlined: number;
  /** Unresolved references that are on the allowlist, so not fatal. */
  knownBroken: number;
  /** Allowlist entries that no longer occur — upstream fixed them. */
  staleAllowlist: string[];
};

const refOf = (reason: string) => /<(.+)>/.exec(reason)?.[1] ?? reason;

function allowlist(strict: boolean, sourceRepo?: string): Record<string, string> {
  if (strict) return {};
  const file = new URL('./known-broken-refs.json', import.meta.url);
  const byRepo: Record<string, Record<string, string>> = JSON.parse(readFileSync(file, 'utf8'))
    .refs ?? {};
  if (sourceRepo) return byRepo[sourceRepo] ?? {};
  return Object.assign({}, ...Object.values(byRepo));
}

export function compile(options: CompileOptions): CompileResult {
  const { apidoc, outDir, planOnly = false, strict = false, sourceRepo } = options;
  const log = options.log ?? (() => {});

  if (!existsSync(apidoc)) throw new CompileError(`no such directory: ${apidoc}`);

  const { types, sources, problems } = loadApiDocs(apidoc);
  log(`${sources.length} source files, ${types.size} types`);

  if (problems.length) {
    // Surfaced, never swallowed. The old pipeline silently collided two distinct
    // `showParams` pseudo-types into one page; that is what quiet failure buys.
    log(`\n${problems.length} problem(s):`);
    for (const p of problems) log(`  ${p.path}\n    ${p.reason.split('\n')[0]}`);
  }

  const manifestPath = join(outDir, 'docgen-manifest.json');
  // Read even for --plan: reporting "first run" when a manifest exists would
  // make the dry run useless for seeing what an incremental build would touch.
  const previous = readManifest(manifestPath);
  const generator = generatorHash();
  const work = plan(previous, sources, types, generator);

  log(`\n${describe(work)}`);
  if (work.removedTypes.length) {
    log(`${work.removedTypes.length} type(s) no longer in source, outputs to remove`);
  }

  const empty: CompileResult = {
    sourceFiles: sources.length,
    types: types.size,
    parseProblems: problems,
    plan: work,
    written: [],
    unchanged: [],
    removed: [],
    inlined: 0,
    knownBroken: 0,
    staleAllowlist: [],
  };
  if (planOnly) return empty;

  const resolved = resolveAll(types);

  // Broken cross-references fail the compile rather than shipping a dead link.
  // The ones already in the source are listed in known-broken-refs.json so that
  // new breakage still fails; see that file for why each is there.
  const allowed = allowlist(strict, sourceRepo);
  const unexpected = resolved.problems.filter((p) => !(refOf(p.reason) in allowed));

  if (unexpected.length) {
    const distinct = [...new Set(unexpected.map((p) => refOf(p.reason)))];
    const lines = unexpected.slice(0, 25).map((p) => `  ${p.type}: ${p.reason}`);
    if (unexpected.length > 25) lines.push(`  ... and ${unexpected.length - 25} more`);
    throw new CompileError(
      `${unexpected.length} unresolved reference(s), ${distinct.length} distinct:\n` +
        `${lines.join('\n')}\n\n` +
        'Fix the source, or add the reference to scripts/docgen/known-broken-refs.json.'
    );
  }

  const hit = new Set(resolved.problems.map((p) => refOf(p.reason)));
  // Only meaningful when the compile knows whose corpus it holds; see above.
  const stale = sourceRepo ? Object.keys(allowed).filter((r) => !hit.has(r)) : [];
  if (stale.length) {
    // Upstream fixed something. Say so, so the allowlist shrinks instead of rotting.
    log(`\n${stale.length} entr(ies) in known-broken-refs.json no longer occur — remove them:`);
    for (const r of stale) log(`  ${r}`);
  }
  if (resolved.problems.length) {
    log(`\n${resolved.problems.length} known-broken reference(s) left unlinked`);
  }

  const out = emit(
    outDir,
    resolved,
    work.dirty,
    work.removedTypes,
    Object.fromEntries(Object.entries(previous?.types ?? {}).map(([k, v]) => [k, v.outputHash]))
  );

  log(
    `\n${out.written.length} file(s) written, ${out.unchanged.length} unchanged` +
      (out.removed.length ? `, ${out.removed.length} removed` : '')
  );
  if (resolved.inlined.size) {
    log(`${resolved.inlined.size} pseudo-type(s) inlined into their referent`);
  }

  const manifest: Manifest = {
    schemaVersion: MANIFEST_VERSION,
    generator,
    // Held steady when nothing changed, so an unchanged run leaves the tree
    // clean and the commit step has an empty diff rather than a timestamp.
    generatedAt:
      out.written.length || out.removed.length
        ? new Date().toISOString()
        : (previous?.generatedAt ?? new Date().toISOString()),
    sources: Object.fromEntries(sources.map((s) => [s.path, { hash: s.hash, types: s.types }])),
    types: Object.fromEntries(
      [...resolved.types.values()]
        .filter((t) => !resolved.inlined.has(t.name))
        .map((t) => [
          t.name,
          { source: t.source, extends: t.extends, outputHash: out.outputHashes[t.name] ?? '' },
        ])
    ),
  };

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  log(`manifest written to ${manifestPath}`);

  return {
    ...empty,
    written: out.written,
    unchanged: out.unchanged,
    removed: out.removed,
    inlined: resolved.inlined.size,
    knownBroken: resolved.problems.length,
    staleAllowlist: stale,
  };
}
