import { emit } from './emit.ts';
import { loadApiDocs } from './load.ts';
import {
  describe,
  generatorHash,
  MANIFEST_VERSION,
  plan,
  readManifest,
  type Manifest,
} from './manifest.ts';
import { resolveAll } from './resolve.ts';
/**
 * Compiles Titanium apidoc YAML into the registry.
 *
 * Replaces titanium-docgen from tidev/docs-devkit. That produced one monolithic
 * api.json plus stub markdown pages rendered client-side by Vue; we emit one
 * JSON per type and render on the server. Of its eleven output formats we need
 * the equivalent of one.
 *
 *   node scripts/docgen/index.ts <apidoc-dir> --out <registry-dir> [--plan]
 *
 * --plan reports what would be regenerated and writes nothing.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const planOnly = argv.includes('--plan');
/** Compile as if known-broken-refs.json were empty, to see what it is still hiding. */
const strict = argv.includes('--strict');

let outDir: string | null = null;
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') {
    outDir = argv[++i] ? resolve(argv[i]) : null;
  } else if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
  }
}

const source = positional[0];
if (!source) {
  console.error('usage: node scripts/docgen/index.ts <apidoc-dir> --out <dir> [--plan]');
  process.exit(1);
}
if (!outDir && !planOnly) {
  console.error('--out is required unless --plan is given');
  process.exit(1);
}

const apidoc = resolve(source);
if (!existsSync(apidoc)) {
  console.error(`no such directory: ${apidoc}`);
  process.exit(1);
}

const { types, sources, problems } = loadApiDocs(apidoc);
console.log(`${sources.length} source files, ${types.size} types`);

if (problems.length) {
  // Surfaced, never swallowed. The old pipeline silently collided two distinct
  // `showParams` pseudo-types into one page; that is what quiet failure buys.
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) {
    console.log(`  ${p.path}\n    ${p.reason.split('\n')[0]}`);
  }
}

const manifestPath = outDir ? join(outDir, 'docgen-manifest.json') : '';
const previous = manifestPath ? readManifest(manifestPath) : null;
const generator = generatorHash();
const work = plan(previous, sources, types, generator);

console.log(`\n${describe(work)}`);
if (work.removedTypes.length) {
  console.log(`${work.removedTypes.length} type(s) no longer in source, outputs to remove`);
}

if (planOnly) {
  process.exit(problems.length ? 1 : 0);
}

const resolved = resolveAll(types);

// Broken cross-references fail the compile rather than shipping a dead link.
// The ones already in the source are listed in known-broken-refs.json so that
// new breakage still fails; see that file for why each is there.
const allowed: Record<string, string> = strict
  ? {}
  : (JSON.parse(readFileSync(new URL('./known-broken-refs.json', import.meta.url), 'utf8')).refs ??
    {});

const refOf = (reason: string) => /<(.+)>/.exec(reason)?.[1] ?? reason;
const unexpected = resolved.problems.filter((p) => !(refOf(p.reason) in allowed));

if (unexpected.length) {
  const distinct = [...new Set(unexpected.map((p) => refOf(p.reason)))];
  console.error(`\n${unexpected.length} unresolved reference(s), ${distinct.length} distinct:`);
  for (const p of unexpected.slice(0, 25)) console.error(`  ${p.type}: ${p.reason}`);
  if (unexpected.length > 25) console.error(`  ... and ${unexpected.length - 25} more`);
  console.error('\nFix the source, or add the reference to scripts/docgen/known-broken-refs.json.');
  process.exit(1);
}

const hit = new Set(resolved.problems.map((p) => refOf(p.reason)));
const stale = Object.keys(allowed).filter((r) => !hit.has(r));
if (stale.length) {
  // Upstream fixed something. Say so, so the allowlist shrinks instead of rotting.
  console.log(
    `\n${stale.length} entr(ies) in known-broken-refs.json no longer occur — remove them:`
  );
  for (const r of stale) console.log(`  ${r}`);
}
if (resolved.problems.length) {
  console.log(`\n${resolved.problems.length} known-broken reference(s) left unlinked`);
}

const out = emit(
  outDir!,
  resolved,
  work.dirty,
  work.removedTypes,
  Object.fromEntries(Object.entries(previous?.types ?? {}).map(([k, v]) => [k, v.outputHash]))
);

console.log(
  `\n${out.written.length} file(s) written, ${out.unchanged.length} unchanged` +
    (out.removed.length ? `, ${out.removed.length} removed` : '')
);
if (resolved.inlined.size) {
  console.log(`${resolved.inlined.size} pseudo-type(s) inlined into their referent`);
}

const manifest: Manifest = {
  schemaVersion: MANIFEST_VERSION,
  generator,
  // Held steady when nothing changed, so an unchanged run leaves the tree clean
  // and TI-18 does not commit a timestamp-only diff.
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
console.log(`manifest written to ${manifestPath}`);
