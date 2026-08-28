import { get, paginate, rcompare } from './lib/github.ts';
import {
  BUILDS_DIR,
  PRUNED_DIR,
  RELEASES_DIR,
  branchFile,
  prunedFile,
  type Build,
  type PrunedRun,
} from './lib/registry-paths.ts';
/**
 * Regenerates the SDK release and CI build registry.
 *
 * Vendored from tidev/titanium-builds-regen-action, which downloads-www still
 * uses. Brought in-repo so we own the output layout — the action hardcodes
 * `<branch>.expired.json` and reads it back as its own cache, so renaming or
 * moving it was impossible from outside.
 *
 * Releases and builds are separate trees on purpose: releases are permanent
 * and documented, CI builds expire after 90 days and churn constantly.
 *
 *   registry/sdk/{ga,rc,beta}.json          releases
 *   registry/builds/branches.json           branch -> live build count
 *   registry/builds/<branch>.json           CI builds
 *   registry/builds/pruned/<branch>.pruned.json
 *
 *   GITHUB_TOKEN=... node scripts/generate-builds.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = 'tidev';
const REPO = 'titanium-sdk';

/**
 * These will never see another release, so re-listing their workflow runs is
 * pure API spend. Skipped once branches.json exists to seed them.
 */
const LEGACY = new Set([
  '0_8_X',
  '0_9_0',
  '1_4_1',
  '1_4_X',
  '1_5_X',
  '1_6_X',
  '1_7_X',
  '1_8_X',
  '2_0_X',
  '2_1_X',
  '3_0_X',
  '3_1_X',
  '3_2_X',
  '3_3_X',
  '3_4_1',
  '3_4_X',
  '3_5_X',
  '4_0_X',
  '4_1_X',
  '5_0_X',
  '5_1_1',
  '5_1_X',
  '5_2_X',
  '5_3_X',
  '5_4_X',
  '5_5_X',
  '6_0_X',
  '6_1_X',
  '6_2_1',
  '6_2_X',
  '6_3_X',
  '7_0_X',
  '7_1_X',
  '7_2_X',
  '7_3_X',
  '7_4_X',
  '7_5_X',
  '8_0_X',
  '8_1_X',
  '8_2_X',
  '8_3_X',
  '9_0_X',
  '9_1_X',
  '9_2_X',
  '9_3_X',
  '10_0_X',
  '10_1_X',
  '11_0_X',
  '11_1_X',
]);

const RELEASE_ASSET = /^mobilesdk-((\d+\.\d+\.\d+)\.(GA|RC|Beta)\d*)-(\w+)\.zip$/;
const BUILD_ARTIFACT = /^mobilesdk-((\d+\.\d+\.\d+)\.(v\d+))-(\w+)$/;
const BRANCH_NAME = /^(main|master|\d+_\d+_(\d+|[Xx]))$/;

const readJson = <T>(p: string, fallback: T): T =>
  existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback;

function writeJson(p: string, data: unknown) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

// ------------------------------------------------------------- releases

type GhAsset = { name: string; size: number; browser_download_url: string };
type GhRelease = { assets: GhAsset[]; published_at: string; html_url: string };

async function getReleases(): Promise<Record<string, Build[]>> {
  const out: Record<string, Build[]> = { ga: [], rc: [], beta: [] };

  for await (const page of paginate<GhRelease>(`/repos/${OWNER}/${REPO}/releases`)) {
    for (const release of page) {
      // One asset identifies the release; the rest are its per-OS downloads.
      const identifying = release.assets.find((a) => RELEASE_ASSET.test(a.name));
      if (!identifying) continue;

      const [, name, version, channel] = identifying.name.match(RELEASE_ASSET)!;
      out[channel.toLowerCase()].push({
        name,
        version,
        date: release.published_at,
        url: release.html_url,
        assets: release.assets
          .filter((a) => RELEASE_ASSET.test(a.name))
          .map((a) => ({
            os: a.name.match(RELEASE_ASSET)![4],
            size: a.size,
            url: a.browser_download_url,
          })),
      });
    }
  }

  for (const list of Object.values(out)) {
    list.sort((a, b) => rcompare(a.version, b.version));
  }
  return out;
}

// ------------------------------------------------------------- branches

async function getBranches(): Promise<string[]> {
  const names: string[] = [];
  for await (const page of paginate<{ name: string }>(`/repos/${OWNER}/${REPO}/branches`)) {
    for (const b of page) {
      if (BRANCH_NAME.test(b.name)) names.push(b.name);
    }
  }

  // Newest version branches first; main/master ahead of all of them.
  const parse = (s: string) => s.toUpperCase().match(/^(\d+)_(\d+)_(\d+|X)$/);
  return names.sort((a, b) => {
    const [am, bm] = [parse(a), parse(b)];
    if (!am && bm) return -1;
    if (am && !bm) return 1;
    if (!am || !bm) return a.localeCompare(b);
    for (let i = 1; i <= 2; i++) {
      const d = Number(bm[i]) - Number(am[i]);
      if (d !== 0) return d;
    }
    if (am[3] !== 'X' && bm[3] !== 'X') return Number(bm[3]) - Number(am[3]);
    return am[3] === 'X' ? -1 : bm[3] === 'X' ? 1 : 0;
  });
}

// --------------------------------------------------------- branch builds

type GhRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  html_url: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  run_attempt?: number;
};
type GhArtifact = { name: string; size_in_bytes: number; expires_at: string | null };

async function getBranchBuilds(
  branch: string,
  existingBuilds: Build[],
  existingPruned: PrunedRun[]
): Promise<{ builds: Build[]; pruned: PrunedRun[] }> {
  const builds: Build[] = [];
  const pruned: PrunedRun[] = [];
  const now = Date.now();

  const knownBuild = new Map(existingBuilds.map((b) => [b.url, b]));
  const knownPruned = new Set(existingPruned.map((p) => p.id));

  for await (const page of paginate<GhRun>(`/repos/${OWNER}/${REPO}/actions/runs`, {
    branch,
    status: 'success',
  })) {
    for (const run of page) {
      if (run.name !== 'Build' || run.status !== 'completed' || run.conclusion !== 'success') {
        continue;
      }

      // Already have it, or already know its artifacts are gone. Either way,
      // skip the artifact lookup — that is the expensive call.
      const cached = knownBuild.get(run.html_url);
      if (cached) {
        builds.push(cached);
        continue;
      }
      if (knownPruned.has(run.id)) {
        pruned.push({ id: run.id, html_url: run.html_url });
        continue;
      }

      const { artifacts } = await get<{ artifacts: GhArtifact[] }>(
        `/repos/${OWNER}/${REPO}/actions/runs/${run.id}/artifacts`
      );
      const matching = artifacts.filter((a) => BUILD_ARTIFACT.test(a.name));
      if (!matching.length) continue;

      const [, name, version] = matching[0].name.match(BUILD_ARTIFACT)!;
      // A run's artifacts share an expiry; take the earliest to be safe.
      const expiries = matching
        .map((a) => (a.expires_at ? Date.parse(a.expires_at) : NaN))
        .filter(Number.isFinite);
      const expires = expiries.length ? Math.min(...expiries) : null;

      if (expires !== null && expires > now) {
        builds.push({
          name,
          version,
          date: run.updated_at,
          expires: new Date(expires).toISOString(),
          url: run.html_url,
          assets: matching.map((a) => ({
            os: a.name.match(BUILD_ARTIFACT)![4],
            size: a.size_in_bytes,
            url: `https://nightly.link/${OWNER}/${REPO}/actions/runs/${run.id}/${a.name}.zip`,
          })),
        });
      } else {
        pruned.push({ id: run.id, html_url: run.html_url });
      }

      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { builds, pruned };
}

// ------------------------------------------------------------------ main

const root = fileURLToPath(new URL('..', import.meta.url));
const releasesDir = join(root, RELEASES_DIR);
const buildsDir = join(root, BUILDS_DIR);
const branchesPath = join(buildsDir, 'branches.json');

console.log('Releases...');
for (const [channel, releases] of Object.entries(await getReleases())) {
  console.log(`  ${releases.length} ${channel}`);
  writeJson(join(releasesDir, `${channel}.json`), releases);
}

console.log('\nBranches...');
const all = await getBranches();
const existingBranches = readJson<Record<string, number>>(branchesPath, {});
// Only skip legacy branches once we have a counts file to seed them from.
const skip = Object.keys(existingBranches).length ? LEGACY : new Set<string>();
const active = all.filter((b) => !skip.has(b));
console.log(`  ${all.length} branches, ${active.length} need refreshing`);

const counts: Record<string, number> = { ...existingBranches };

console.log('\nBranch builds...');
for (const branch of active) {
  const buildsPath = join(root, branchFile(branch));
  const prunedPath = join(root, prunedFile(branch));

  const { builds, pruned } = await getBranchBuilds(
    branch,
    readJson<Build[]>(buildsPath, []),
    readJson<PrunedRun[]>(prunedPath, [])
  );

  counts[branch] = builds.length;
  console.log(`  ${branch}: ${builds.length} live, ${pruned.length} pruned`);
  writeJson(buildsPath, builds);
  writeJson(prunedPath, pruned);
}

writeJson(branchesPath, counts);
console.log(`\nWrote ${Object.keys(counts).length} branches to ${BUILDS_DIR}`);
console.log(`Pruned runs live in ${PRUNED_DIR}`);
