import { CONTENTS } from '../src/lib/docs/pool.ts';
import { ModuleIndexSchema, ModuleVersionSchema } from '../src/lib/registry/index.ts';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Compiles API docs for released module versions.
 *
 * Retention: everything published since 2023, and for a module whose newest
 * release predates that, its latest one — so every module has documentation for
 * at least one release rather than metadata alone. 31 of 323 versions today.
 *
 * The rest keep metadata and a README, which is honest: the bulk of the corpus
 * is 2015-2021 releases built against Titanium 5-9, documenting an SDK most
 * people can no longer run. Their `hasApiDocs` stays false rather than
 * promising a reference that is not there.
 *
 * Released versions are immutable, so this is a one-time cost per version that
 * never churns.
 *
 *   node scripts/backfill-module-docs.ts [--dry-run] [--since 2023]
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const MODULES = join(root, 'registry/modules');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const sinceYear = argv.includes('--since') ? argv[argv.indexOf('--since') + 1] : '2023';
const CUTOFF = `${sinceYear}-01-01`;

const read = <T>(path: string, parse: (v: unknown) => T): T =>
  parse(JSON.parse(readFileSync(path, 'utf8')));

type Target = { moduleId: string; repo: string; version: string; tag: string; reason: string };

function selectVersions(): Target[] {
  const out: Target[] = [];

  for (const moduleId of readdirSync(MODULES).sort()) {
    const dir = join(MODULES, moduleId);
    if (!existsSync(join(dir, 'index.json'))) continue;

    const index = read(join(dir, 'index.json'), (v) => ModuleIndexSchema.parse(v));
    const repo = index.repo?.replace('https://github.com/', '');
    if (!repo) continue;

    const dated = index.versions
      .filter((v) => v.publishedAt)
      .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));

    const recent = dated.filter((v) => v.publishedAt! >= CUTOFF);
    // A module whose newest release predates the cutoff still gets that one,
    // so no module is left with metadata and no reference at all.
    const chosen = recent.length ? recent : dated.slice(0, 1);
    const reason = recent.length ? `since ${sinceYear}` : 'latest, predates cutoff';

    for (const v of chosen) {
      const meta = read(join(dir, v.version, 'metadata.json'), (x) => ModuleVersionSchema.parse(x));
      // `tag` is only set when every asset came from one release; otherwise each
      // asset carries its own and any of them identifies the right commit.
      const tag = meta.tag ?? meta.assets.map((a) => (a as { tag?: string }).tag).find(Boolean);
      if (!tag) {
        console.log(`  skip ${moduleId}@${v.version} — no tag recorded`);
        continue;
      }
      out.push({ moduleId, repo, version: v.version, tag, reason });
    }
  }
  return out;
}

/** apidoc and the manifests, at one tag. Nothing else is read. */
function checkout(repo: string, tag: string, into: string): boolean {
  mkdirSync(into, { recursive: true });
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', into, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    git('init', '-q');
    git('remote', 'add', 'origin', `https://github.com/${repo}`);
    git('sparse-checkout', 'init', '--no-cone');
    writeFileSync(
      join(into, '.git/info/sparse-checkout'),
      'apidoc\nandroid/manifest\nios/manifest\niphone/manifest\nmanifest\n'
    );
    git('-c', 'protocol.version=2', 'fetch', '-q', '--depth=1', 'origin', `refs/tags/${tag}`);
    git('checkout', '-q', 'FETCH_HEAD');
    return existsSync(join(into, 'apidoc'));
  } catch {
    return false;
  }
}

const targets = selectVersions();
console.log(`${targets.length} version(s) selected\n`);

if (dryRun) {
  for (const t of targets) console.log(`  ${t.moduleId}@${t.version}  ${t.tag}  (${t.reason})`);
  process.exit(0);
}

const work = join(tmpdir(), 'ti-module-docs');
rmSync(work, { recursive: true, force: true });

let compiled = 0;
const noApidoc: string[] = [];
const failed: string[] = [];

for (const t of targets) {
  const outRel = `registry/modules/${t.moduleId}/${t.version}`;
  if (existsSync(join(root, outRel, CONTENTS))) {
    console.log(`  =    ${t.moduleId}@${t.version} already compiled`);
    continue;
  }

  const dir = join(work, `${t.moduleId}-${t.version}`);
  if (!checkout(t.repo, t.tag, dir)) {
    noApidoc.push(`${t.moduleId}@${t.version} (${t.tag})`);
    console.log(`  --   ${t.moduleId}@${t.version} no apidoc at ${t.tag}`);
    continue;
  }

  try {
    execFileSync(
      'node',
      [
        join(root, 'scripts/docgen/regen.ts'),
        '--repo',
        t.repo,
        '--checkout',
        dir,
        '--version',
        t.version,
        '--sdk',
        'main',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], cwd: root }
    );
    compiled++;
    console.log(`  +    ${t.moduleId}@${t.version}`);
  } catch (err) {
    failed.push(
      `${t.moduleId}@${t.version}: ${(err as { stderr?: Buffer }).stderr?.toString().trim().split('\n').pop()}`
    );
    console.log(`  FAIL ${t.moduleId}@${t.version}`);
  }
}

rmSync(work, { recursive: true, force: true });

console.log(`\n${compiled} compiled`);
// Listed rather than counted: a version silently missing its reference is the
// failure this whole retention rule is meant to make visible.
if (noApidoc.length)
  console.log(`${noApidoc.length} without apidoc at their tag:\n  ${noApidoc.join('\n  ')}`);
if (failed.length) console.log(`${failed.length} failed:\n  ${failed.join('\n  ')}`);
