import { sources } from './docgen/sources.ts';
import { paginate } from './lib/github.ts';
import { MODULES_DIR } from './lib/registry-paths.ts';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Records SHA-256 for every module asset the registry points at (TI-65).
 *
 * GitHub only computes a digest for assets uploaded since the feature shipped
 * — the earliest here is 2025-09-10 — and does not backfill, which left 16 of
 * 399 asset rows with anything to verify against. This downloads the rest and
 * hashes them.
 *
 * ## Keyed by URL, because filenames are not identities
 *
 * 18 filenames occur twice in the release history, from versions that were
 * re-tagged (`v4.4.0-android` and `android-4.4.0`, say). Every one of those
 * pairs differs in content — `ti.nfc-android-4.0.0.zip` is 7808850 bytes under
 * one tag and 7846378 under the other. Keying on the filename would hand a
 * client the hash of an archive it is not downloading, which is worse than
 * having no hash at all. The download URL encodes repo, tag and asset, so it
 * is the identity used here.
 *
 * The set comes from the registry's own metadata rather than from the release
 * history, so what gets hashed is exactly what the registry serves — one of
 * the two re-tagged archives, never both.
 *
 * ## Why a sidecar rather than metadata.json
 *
 * `assets` is a key `generate-modules.ts` owns and rebuilds from the GitHub API
 * on every run. A checksum written into a version's metadata.json would survive
 * until the next regen, which would find no digest upstream and drop it. The
 * hashes live here and the generator merges them, preferring GitHub's digest.
 * That also leaves the immutable-release guard untouched: nothing published is
 * rewritten, and the backfill is one reviewable file.
 *
 * ## What these hashes are, and are not
 *
 * A hash computed by downloading from GitHub records what GitHub served on the
 * day it ran. It is not an independent attestation and cannot prove an archive
 * was untampered before that date. Neither can GitHub's own digest, which is
 * whatever was computed at upload — so this does not lower the bar already
 * accepted, and it makes verification possible for the whole archive rather
 * than the recent 4%. Each entry records which it is.
 *
 *   node scripts/backfill-checksums.ts [--limit N] [--dry-run]
 */

const SIDECAR = join(MODULES_DIR, 'checksums.json');

type Asset = { name: string; size: number; digest?: string | null; browser_download_url: string };
type Release = { tag_name: string; draft: boolean; assets: Asset[] };

type Entry = { filename: string; size: number; checksum: string; source: 'computed' | 'github' };
type Sidecar = { note: string; generatedAt: string; entries: Record<string, Entry> };

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const limit = Number(argv[argv.indexOf('--limit') + 1]) || Infinity;

/** Every asset URL the registry actually references. */
function referencedUrls(): Map<string, { filename: string; size: number }> {
  const out = new Map<string, { filename: string; size: number }>();
  for (const id of readdirSync(MODULES_DIR)) {
    const dir = join(MODULES_DIR, id);
    if (!statSync(dir).isDirectory()) continue;
    for (const version of readdirSync(dir)) {
      const meta = join(dir, version, 'metadata.json');
      if (!existsSync(meta)) continue;
      const parsed = JSON.parse(readFileSync(meta, 'utf8')) as {
        assets?: { url: string; filename: string; size?: number }[];
      };
      for (const a of parsed.assets ?? []) {
        out.set(a.url, { filename: a.filename, size: a.size ?? 0 });
      }
    }
  }
  return out;
}

/** url -> digest, for the assets GitHub recorded one for. Costs no downloads. */
async function githubDigests(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const src of sources()) {
    if (src.kind !== 'module') continue;
    for await (const page of paginate<Release>(`/repos/${src.repo}/releases`)) {
      for (const release of page) {
        if (release.draft) continue;
        for (const asset of release.assets) {
          if (asset.digest) out.set(asset.browser_download_url, asset.digest);
        }
      }
    }
  }
  return out;
}

async function sha256(url: string): Promise<{ digest: string; bytes: number }> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`${url} -> ${res.status}`);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of res.body) {
    hash.update(chunk);
    bytes += (chunk as Uint8Array).byteLength;
  }
  return { digest: `sha256:${hash.digest('hex')}`, bytes };
}

const prior: Sidecar = existsSync(SIDECAR)
  ? (JSON.parse(readFileSync(SIDECAR, 'utf8')) as Sidecar)
  : { note: '', generatedAt: '', entries: {} };

const wanted = referencedUrls();
const digests = await githubDigests();
console.log(
  `${wanted.size} assets referenced by the registry, ${digests.size} with a GitHub digest`
);

const entries: Record<string, Entry> = {};
let hashed = 0;
let reused = 0;
let fromGithub = 0;
let verified = 0;
const problems: string[] = [];

for (const [url, { filename, size }] of wanted) {
  const digest = digests.get(url);
  if (digest) {
    // Where a previous run computed our own, the overlap checks the method.
    const before = prior.entries[url];
    if (before?.source === 'computed' && before.checksum !== digest) {
      problems.push(`${filename}: computed ${before.checksum} but GitHub says ${digest}`);
    } else if (before?.source === 'computed') {
      verified++;
    }
    entries[url] = { filename, size, checksum: digest, source: 'github' };
    fromGithub++;
    continue;
  }

  const before = prior.entries[url];
  if (before && before.size === size && before.source === 'computed') {
    entries[url] = before;
    reused++;
    continue;
  }
  if (hashed >= limit) continue;
  if (dryRun) {
    console.log(`  would hash ${filename} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    hashed++;
    continue;
  }

  const result = await sha256(url);
  if (size && result.bytes !== size) {
    problems.push(`${filename}: downloaded ${result.bytes} bytes, metadata says ${size}`);
    continue;
  }
  entries[url] = { filename, size: result.bytes, checksum: result.digest, source: 'computed' };
  hashed++;
  if (hashed % 25 === 0) console.log(`  ${hashed} hashed...`);
}

console.log(`\n${fromGithub} from GitHub, ${hashed} hashed, ${reused} reused`);
if (verified) console.log(`${verified} previously computed hashes matched GitHub's digest`);
for (const p of problems) console.error(`  ! ${p}`);

if (!dryRun) {
  const sidecar: Sidecar = {
    note: 'SHA-256 for the module release assets the registry references, keyed by download URL. `github` is the digest GitHub recorded at upload; `computed` was calculated by downloading the asset. See scripts/backfill-checksums.ts.',
    generatedAt: new Date().toISOString(),
    entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(SIDECAR, `${JSON.stringify(sidecar, null, 2)}\n`);
  console.log(`wrote ${SIDECAR} (${Object.keys(entries).length} assets)`);
}

if (problems.length) process.exit(1);
