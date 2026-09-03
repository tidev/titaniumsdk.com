import { CONTENTS, type Contents, indexPath } from '../../src/lib/docs/pool.ts';
import { POOL_DIR, POOL_SCHEMA_VERSION } from '../lib/pool.ts';
import { compile, CompileError } from './compile.ts';
import type { ExternalSource } from './external.ts';
import { sdkSource } from './sources.ts';
/**
 * Compiles Titanium apidoc YAML into the registry.
 *
 * Replaces titanium-docgen from tidev/docs-devkit. That produced one monolithic
 * api.json plus stub markdown pages rendered client-side by Vue; we emit one
 * JSON per type and render on the server. Of its eleven output formats we need
 * the equivalent of one.
 *
 *   node scripts/docgen/index.ts <apidoc-dir> --out <registry-dir> [--sdk <v>] [--plan] [--strict]
 *
 * --plan reports what would be regenerated and writes nothing.
 * --strict ignores known-broken-refs.json.
 * --sdk resolves references into Titanium.* against registry/sdk/<v>, which is
 *   what a module compile needs; without it they are left as literal text.
 *
 * CI uses regen.ts, which wraps this with source resolution and the immutable
 * version guard.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const planOnly = argv.includes('--plan');
const strict = argv.includes('--strict');

let outDir: string | null = null;
let sdkVersion: string | null = null;
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') {
    outDir = argv[++i] ? resolve(argv[i]) : null;
  } else if (argv[i] === '--sdk') {
    sdkVersion = argv[++i] ?? null;
  } else if (!argv[i].startsWith('--')) {
    positional.push(argv[i]);
  }
}

const source = positional[0];
if (!source) {
  console.error(
    'usage: node scripts/docgen/index.ts <apidoc-dir> --out <dir> [--sdk <v>] [--plan] [--strict]'
  );
  process.exit(1);
}
if (!outDir && !planOnly) {
  console.error('--out is required unless --plan is given');
  process.exit(1);
}

let external: ExternalSource | undefined;
if (sdkVersion) {
  const index = indexPath(
    fileURLToPath(new URL(`../../registry/sdk/${sdkVersion}`, import.meta.url))
  );
  if (!index || !existsSync(index)) {
    console.error(`nothing compiled at registry/sdk/${sdkVersion}`);
    process.exit(1);
  }
  external = { repo: sdkSource().repo, version: sdkVersion, index };
}

try {
  const result = compile({
    apidoc: resolve(source),
    // --plan writes nothing, so the directory is only a manifest lookup path.
    outDir: outDir ?? resolve(source),
    // Alongside the output, so the developer CLI never writes into the repo's
    // own pool when pointed at a scratch directory.
    pool: join(outDir ?? resolve(source), POOL_DIR),
    planOnly,
    strict,
    external,
    log: (m) => console.log(m),
  });
  // Without this the CLI leaves a pool of blobs and nothing that names them:
  // the compile succeeds and its output cannot be read back, by this repo's
  // own readers or by anything else. `regen.ts` writes one; this had been
  // overlooked when the registry became content-addressed in TI-25.
  //
  // Images are absent rather than empty-by-accident: the CLI compiles an
  // apidoc directory in isolation, and pooling its images is `regen.ts`'s job.
  if (!planOnly && result.contents) {
    const dir = outDir ?? resolve(source);
    const contents: Contents = {
      schemaVersion: POOL_SCHEMA_VERSION,
      pool: POOL_DIR,
      index: result.contents.index,
      types: result.contents.types,
      images: {},
    };
    writeFileSync(join(dir, CONTENTS), `${JSON.stringify(contents, null, 2)}\n`);
    console.log(`${CONTENTS} written to ${dir}`);
  }

  process.exit(planOnly && result.parseProblems.length ? 1 : 0);
} catch (err) {
  console.error(err instanceof CompileError ? `\n${err.message}` : err);
  process.exit(1);
}
