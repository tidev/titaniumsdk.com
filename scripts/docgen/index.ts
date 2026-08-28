import { compile, CompileError } from './compile.ts';
/**
 * Compiles Titanium apidoc YAML into the registry.
 *
 * Replaces titanium-docgen from tidev/docs-devkit. That produced one monolithic
 * api.json plus stub markdown pages rendered client-side by Vue; we emit one
 * JSON per type and render on the server. Of its eleven output formats we need
 * the equivalent of one.
 *
 *   node scripts/docgen/index.ts <apidoc-dir> --out <registry-dir> [--plan] [--strict]
 *
 * --plan reports what would be regenerated and writes nothing.
 * --strict ignores known-broken-refs.json.
 *
 * CI uses regen.ts, which wraps this with source resolution and the immutable
 * version guard.
 */
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const planOnly = argv.includes('--plan');
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
  console.error('usage: node scripts/docgen/index.ts <apidoc-dir> --out <dir> [--plan] [--strict]');
  process.exit(1);
}
if (!outDir && !planOnly) {
  console.error('--out is required unless --plan is given');
  process.exit(1);
}

try {
  const result = compile({
    apidoc: resolve(source),
    // --plan writes nothing, so the directory is only a manifest lookup path.
    outDir: outDir ?? resolve(source),
    planOnly,
    strict,
    log: (m) => console.log(m),
  });
  process.exit(planOnly && result.parseProblems.length ? 1 : 0);
} catch (err) {
  console.error(err instanceof CompileError ? `\n${err.message}` : err);
  process.exit(1);
}
