import { loadApiDocs } from './load.mts';
import {
  describe,
  generatorHash,
  MANIFEST_VERSION,
  plan,
  readManifest,
  type Manifest,
} from './manifest.mts';
/**
 * Compiles Titanium apidoc YAML into the registry.
 *
 * Replaces titanium-docgen from tidev/docs-devkit. That produced one monolithic
 * api.json plus stub markdown pages rendered client-side by Vue; we emit one
 * JSON per type and render on the server. Of its eleven output formats we need
 * the equivalent of one.
 *
 *   node scripts/docgen/index.mts <apidoc-dir> --out <registry-dir> [--plan]
 *
 * --plan reports what would be regenerated and writes nothing.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const planOnly = argv.includes('--plan');

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
  console.error('usage: node scripts/docgen/index.mts <apidoc-dir> --out <dir> [--plan]');
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

// TI-13 fills this in: resolve inheritance, shape each type, write
// types/<Name>.json and index.json, then record output hashes here.
const manifest: Manifest = {
  schemaVersion: MANIFEST_VERSION,
  generator,
  generatedAt: new Date().toISOString(),
  sources: Object.fromEntries(sources.map((s) => [s.path, { hash: s.hash, types: s.types }])),
  types: Object.fromEntries(
    [...types.values()].map((t) => [
      t.name,
      { source: t.source, extends: t.extends, outputHash: '' },
    ])
  ),
};

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nmanifest written to ${manifestPath}`);
console.log('type emission lands in TI-13');
