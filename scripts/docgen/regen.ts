import { API_DOCS_DIR } from '../lib/registry-paths.ts';
import { compile, CompileError } from './compile.ts';
import { moduleIdFrom, resolveSource } from './sources.ts';
/**
 * Regenerates one repository's API docs into the registry.
 *
 * The CI entry point. Takes the repo name that arrived on the dispatch, refuses
 * anything not on the allowlist, works out where its output belongs, and
 * refuses to rewrite a version that has already been published.
 *
 *   node scripts/docgen/regen.ts --repo tidev/ti.map --checkout ./source [--version 7.3.1]
 *
 * `--version` defaults to `main`, the one mutable tree. Any other value is
 * written once and then frozen.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The only tree that may be rewritten. Everything else is a published release. */
const MUTABLE = 'main';

const argv = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

const repo = flag('repo');
const checkoutArg = flag('checkout');
const version = flag('version') || MUTABLE;
/** Re-publish a frozen version. Requires a human deciding to, never CI. */
const force = argv.includes('--force');

if (!repo || !checkoutArg) {
  console.error(
    'usage: node scripts/docgen/regen.ts --repo <owner/name> --checkout <dir> [--version <v>]'
  );
  process.exit(1);
}

const root = fileURLToPath(new URL('../..', import.meta.url));
const checkout = resolve(checkoutArg);

let source;
try {
  source = resolveSource(repo);
} catch (err) {
  console.error(`\n${(err as Error).message}`);
  process.exit(1);
}

const apidoc = join(checkout, source.apidoc);
if (!existsSync(apidoc)) {
  console.error(`\n${repo} has no ${source.apidoc}/ directory at ${checkout}`);
  process.exit(1);
}

/** Where this source's compiled docs live, relative to the repo root. */
let outRel: string;
if (source.kind === 'sdk') {
  outRel = join(API_DOCS_DIR, version);
} else {
  let moduleId: string;
  try {
    moduleId = moduleIdFrom(checkout);
  } catch (err) {
    console.error(`\n${(err as Error).message}`);
    process.exit(1);
  }
  // Alongside the version's metadata.json, which is where consumers already look.
  outRel = join('registry/modules', moduleId, 'v', version);
}
const outDir = join(root, outRel);

console.log(`${repo} (${source.kind}) @ ${version}`);
console.log(`  ${apidoc}\n  -> ${outRel}\n`);

/**
 * A published version is written once and never rewritten.
 *
 * This is the guard that keeps history growing with releases rather than with
 * CI runs. Rewriting also silently changes what someone already pinned to, so it
 * fails loudly instead of overwriting.
 */
if (version !== MUTABLE && !force) {
  const published = existsSync(join(outDir, 'index.json'));
  const metadata = join(
    root,
    'registry/modules',
    outRel.split('/')[2] ?? '',
    'v',
    version,
    'metadata.json'
  );
  const frozen =
    source.kind === 'module' &&
    existsSync(metadata) &&
    JSON.parse(readFileSync(metadata, 'utf8')).mutable === false;

  if (published || frozen) {
    console.error(
      `Refusing to rewrite ${version}: it is already published${frozen ? ' and marked immutable' : ''}.\n` +
        `Released versions are written once. Pass --force only if you have decided to\n` +
        `republish, and expect consumers pinned to ${version} to see different content.`
    );
    process.exit(1);
  }
}

try {
  const result = compile({ apidoc, outDir, sourceRepo: repo, log: (m) => console.log(m) });

  // The workflow reads these to decide whether to commit and what to say.
  const changed = result.written.length + result.removed.length;
  console.log(`\n::notice::${repo}@${version}: ${changed} file(s) changed`);
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `changed=${changed > 0}\npath=${outRel}\nsummary=${repo}@${version}: ` +
        `${result.written.length} written, ${result.unchanged.length} unchanged, ` +
        `${result.removed.length} removed\n`
    );
  }
} catch (err) {
  console.error(err instanceof CompileError ? `\n${err.message}` : err);
  process.exit(1);
}
