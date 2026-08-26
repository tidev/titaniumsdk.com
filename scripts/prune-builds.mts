import {
  BUILDS_DIR,
  branchFile,
  prunedFile,
  type Build,
  type PrunedRun,
} from './lib/registry-paths.mts';
/**
 * Moves CI builds whose artifacts have expired out of the live lists.
 *
 * Runs on every deploy. The full regen only prunes when it is dispatched, so
 * a build can expire in between and the site keeps advertising a nightly.link
 * URL that 404s. This closes that gap and costs nothing: no API calls, just
 * `expires` compared against now.
 *
 * Safe to run repeatedly — it is a no-op when nothing has expired.
 *
 *   node scripts/prune-builds.mts [--check]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** --check reports what would move without writing. Useful in CI. */
const checkOnly = process.argv.includes('--check');
const root = fileURLToPath(new URL('..', import.meta.url));
const buildsDir = join(root, BUILDS_DIR);
const now = Date.now();

const readJson = <T,>(p: string, fallback: T): T =>
  existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback;

function writeJson(p: string, data: unknown) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

/** The run id is not stored on a build, but it is in its Actions URL. */
function runIdFrom(url: string): number | null {
  const m = url.match(/\/actions\/runs\/(\d+)/);
  return m ? Number(m[1]) : null;
}

const branches = readdirSync(buildsDir)
  .filter((f) => f.endsWith('.json') && f !== 'branches.json')
  .map((f) => f.replace(/\.json$/, ''));

let movedTotal = 0;
const counts = readJson<Record<string, number>>(join(buildsDir, 'branches.json'), {});

for (const branch of branches) {
  const buildsPath = join(root, branchFile(branch));
  const builds = readJson<Build[]>(buildsPath, []);
  if (!builds.length) continue;

  const live: Build[] = [];
  const expired: Build[] = [];
  for (const b of builds) {
    const at = b.expires ? Date.parse(b.expires) : NaN;
    // No expiry means it does not expire. Only move what has demonstrably passed.
    if (Number.isFinite(at) && at <= now) expired.push(b);
    else live.push(b);
  }
  if (!expired.length) continue;

  movedTotal += expired.length;
  console.log(`  ${branch}: ${expired.length} expired, ${live.length} remain`);

  if (checkOnly) continue;

  const prunedPath = join(root, prunedFile(branch));
  const pruned = readJson<PrunedRun[]>(prunedPath, []);
  const known = new Set(pruned.map((p) => p.id));

  for (const b of expired) {
    const id = runIdFrom(b.url);
    // Without an id the entry cannot be recognised on a later regen, so it
    // would be re-fetched forever. Drop it from the live list either way.
    if (id === null) {
      console.log(`    no run id in ${b.url} — dropped without a tombstone`);
      continue;
    }
    if (!known.has(id)) {
      pruned.push({ id, html_url: b.url });
      known.add(id);
    }
  }

  writeJson(buildsPath, live);
  writeJson(prunedPath, pruned);
  counts[branch] = live.length;
}

if (movedTotal && !checkOnly) {
  writeJson(join(buildsDir, 'branches.json'), counts);
}

console.log(
  movedTotal === 0
    ? 'Nothing expired.'
    : checkOnly
      ? `${movedTotal} build(s) would be pruned.`
      : `Pruned ${movedTotal} build(s).`
);
