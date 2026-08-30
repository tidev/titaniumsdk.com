import {
  SCHEMA_VERSION,
  type ModuleIndex,
  type ModuleManifest,
  type ModuleVersion,
  type Platform,
} from '../src/lib/registry/index.ts';
import { sources } from './docgen/sources.ts';
import { file, get, paginate, rcompare } from './lib/github.ts';
import {
  AssetNameError,
  manifestPaths,
  parseAsset,
  parseManifest,
  toModuleManifest,
  type ParsedAsset,
} from './lib/modules.ts';
import { MODULES_DIR, moduleDir, moduleVersionDir } from './lib/registry-paths.ts';
/**
 * Rebuilds registry/modules/ from the GitHub release history of every module
 * in scripts/docgen/sources.json.
 *
 *   registry/modules/<moduleid>/index.json            the package: versions, latest, README
 *   registry/modules/<moduleid>/<version>/metadata.json  one release: manifests, assets
 *
 * Three things about this history make it awkward, and all three are why the
 * layout looks the way it does:
 *
 *   - Tags are not a key. 18 spellings are in use, four of them in ti.map
 *     alone (`3_2_3_GA`, `iOS-2.3.2`, `android-4.4.0`, `v7.3.1-ios`). Nothing
 *     here reads one; the version comes from the asset filename, which has been
 *     stable for eleven years, and the tag is carried as an opaque reference.
 *
 *   - A version is not a platform. 47 version strings shipped on both, sometimes
 *     from two separate releases weeks apart, so the version directory is the
 *     unit and platforms are a list inside it.
 *
 *   - "Latest" is per platform. ti.map's newest release is android 5.7.0 while
 *     its highest version is iOS 7.3.1, and neither is the latest ti.map.
 *
 * Released versions are immutable, so a rerun should be a no-op; only `main`
 * and the derived fields of index.json are rewritten. `hasApiDocs` is read off
 * the filesystem, which means a version compiled by docgen after this ran needs
 * one more run before its metadata says so.
 *
 * Reads GITHUB_TOKEN from the environment or from `.env` at the repo root.
 *
 *   node scripts/generate-modules.ts
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The one version directory that is rewritten. docgen owns what is inside it. */
const MUTABLE = 'main';

/** Everything here lives under tidev, so nothing in this tree is third-party. */
const CURATION = 'tidev';

const PLATFORMS: Platform[] = ['android', 'ios'];

type GhAsset = { name: string; size: number; browser_download_url: string };

type GhRelease = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  assets: GhAsset[];
};

type GhRepo = { description: string | null; default_branch: string };

/** One asset, resolved to exactly one platform. `universal` assets yield two. */
type Candidate = {
  version: string;
  platform: Platform;
  release: GhRelease;
  asset: GhAsset;
  /** True when this row and its sibling point at the same combined zip. */
  universal: boolean;
};

const root = fileURLToPath(new URL('..', import.meta.url));

const readJson = <T>(path: string): T | null =>
  existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : null;

/** Returns whether it wrote, so a run can report churn instead of a file count. */
function writeJson(path: string, data: unknown): boolean {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return true;
}

const published = (r: GhRelease) => (r.published_at ? Date.parse(r.published_at) : 0);

/**
 * Which of two assets describes a version+platform.
 *
 * All three rules exist because the corpus needs them. A dedicated
 * `-android-` zip wins over the `-titanium-` universal one that also carries
 * android, because it is the artifact that release actually published for the
 * platform. A real release wins over the prerelease that shipped the identical
 * file weeks earlier. Otherwise the later publication wins, which is what
 * settles a retag like ti.facebook's `android-4.0.2` -> `android-4.0.2v2`.
 */
function beats(a: Candidate, b: Candidate): boolean {
  if (a.universal !== b.universal) return !a.universal;
  if (a.release.prerelease !== b.release.prerelease) return !a.release.prerelease;
  return published(a.release) > published(b.release);
}

// ------------------------------------------------------------- collection

const failures: string[] = [];
const notes: string[] = [];

type Collected = {
  repo: string;
  name: string;
  moduleId: string;
  releases: GhRelease[];
  parsed: { release: GhRelease; asset: GhAsset; info: ParsedAsset }[];
};

async function collect(repo: string): Promise<Collected> {
  const releases: GhRelease[] = [];
  for await (const page of paginate<GhRelease>(`/repos/${repo}/releases`)) {
    releases.push(...page);
  }

  const parsed: Collected['parsed'] = [];
  for (const release of releases) {
    // A draft is not published: its assets are not downloadable without a
    // token, and every draft here duplicates a release that did ship.
    if (release.draft) {
      notes.push(`${repo} ${release.tag_name}: draft, skipped`);
      continue;
    }
    if (!release.assets.length) {
      notes.push(`${repo} ${release.tag_name}: no assets, nothing to publish`);
      continue;
    }
    for (const asset of release.assets) {
      try {
        parsed.push({ release, asset, info: parseAsset(asset.name) });
      } catch (err) {
        if (!(err instanceof AssetNameError)) throw err;
        failures.push(`${repo} ${release.tag_name}: ${err.message}`);
      }
    }
  }

  // The module id is the registry key, so a repo publishing under two of them
  // would silently split into two module directories. Stop instead.
  const ids = [...new Set(parsed.map((p) => p.info.moduleId))];
  if (ids.length !== 1) {
    throw new Error(`${repo} publishes under ${ids.length} module ids: ${ids.join(', ')}`);
  }

  return { repo, name: repo.split('/')[1], moduleId: ids[0], releases, parsed };
}

// -------------------------------------------------------------- manifests

/** Tags are immutable, so a manifest read once is good for the whole run. */
const manifests = new Map<string, Record<string, string> | null>();

async function manifestAt(
  repo: string,
  ref: string,
  platform: Platform
): Promise<Record<string, string> | null> {
  const key = `${repo}@${ref}#${platform}`;
  const cached = manifests.get(key);
  if (cached !== undefined) return cached;

  let fields: Record<string, string> | null = null;
  for (const path of manifestPaths(platform)) {
    const text = await file(repo, path, ref);
    if (text !== null) {
      fields = parseManifest(text);
      break;
    }
  }
  manifests.set(key, fields);
  return fields;
}

/**
 * Turns parsed assets into one candidate per platform.
 *
 * The universal `-titanium-` package is the only reason this is async: it
 * carries both platforms, and which ones a given release shipped is answered by
 * the manifests committed at its tag.
 */
async function candidatesFor(m: Collected): Promise<Candidate[]> {
  const out: Candidate[] = [];

  for (const { release, asset, info } of m.parsed) {
    if (info.target !== 'universal') {
      out.push({ version: info.version, platform: info.target, release, asset, universal: false });
      continue;
    }

    const shipped: Platform[] = [];
    for (const platform of PLATFORMS) {
      if (await manifestAt(m.repo, release.tag_name, platform)) shipped.push(platform);
    }
    if (!shipped.length) {
      failures.push(
        `${m.repo} ${release.tag_name}: ${asset.name} is a universal package but the tag has no manifest for either platform`
      );
      continue;
    }
    for (const platform of shipped) {
      out.push({ version: info.version, platform, release, asset, universal: true });
    }
  }

  return out;
}

// ------------------------------------------------------------------ build

async function manifestFor(m: Collected, c: Candidate): Promise<ModuleManifest | null> {
  const fields = await manifestAt(m.repo, c.release.tag_name, c.platform);
  if (!fields) {
    notes.push(`${m.repo} ${c.release.tag_name}: no ${c.platform} manifest at this tag`);
    return null;
  }

  // Three cross-checks, all reported rather than corrected: the manifest is
  // evidence about the release, and where it disagrees with the artifact that
  // shipped, the artifact is what a user installs.
  const where = `${m.repo} ${c.release.tag_name} ${c.platform}`;
  if (fields.moduleid && fields.moduleid !== m.moduleId) {
    notes.push(`${where}: manifest moduleid ${fields.moduleid} != ${m.moduleId}`);
  }
  if (fields.version && fields.version !== c.version) {
    notes.push(`${where}: manifest version ${fields.version} != asset ${c.version}`);
  }
  const declared = fields.platform === 'iphone' ? 'ios' : fields.platform;
  if (declared && declared !== c.platform) {
    notes.push(`${where}: manifest platform ${fields.platform}`);
  }

  return toModuleManifest(fields, c.platform, c.version);
}

/**
 * Every key this script decides. Anything else in an existing metadata.json is
 * someone else's — docgen adds a `source` block once it has compiled the
 * version's API reference — and is carried through untouched.
 */
const OWNED = new Set([
  'schemaVersion',
  'moduleId',
  'version',
  'mutable',
  'platforms',
  'publishedAt',
  'tag',
  'prerelease',
  'manifests',
  'assets',
  'hasApiDocs',
]);

/**
 * Writes one version directory.
 *
 * An owned key this run did not produce is dropped rather than merged over: a
 * version whose two platforms turned out to come from two tags has no single
 * `tag`, and inheriting the one a previous shape wrote would leave the file
 * claiming provenance for files that never came from there.
 */
function writeVersion(dir: string, version: ModuleVersion): boolean {
  const path = join(dir, 'metadata.json');
  const existing = readJson<Record<string, unknown>>(path) ?? {};
  const theirs = Object.entries(existing).filter(([key]) => !OWNED.has(key));
  return writeJson(path, { ...version, ...Object.fromEntries(theirs) });
}

async function buildVersions(m: Collected): Promise<ModuleVersion[]> {
  const chosen = new Map<string, Candidate>();
  for (const candidate of await candidatesFor(m)) {
    const key = `${candidate.version} ${candidate.platform}`;
    const held = chosen.get(key);
    if (!held || beats(candidate, held)) chosen.set(key, candidate);
  }

  const byVersion = new Map<string, Candidate[]>();
  for (const candidate of chosen.values()) {
    const list = byVersion.get(candidate.version) ?? [];
    list.push(candidate);
    byVersion.set(candidate.version, list);
  }

  const versions: ModuleVersion[] = [];
  for (const [version, group] of byVersion) {
    group.sort((a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform));

    const built: ModuleManifest[] = [];
    for (const candidate of group) {
      const manifest = await manifestFor(m, candidate);
      if (manifest) built.push(manifest);
    }

    // One tag only when both platforms came from the same release. When they
    // did not, every asset carries its own and inventing a winner would be a
    // lie about where half the files came from.
    const tags = [...new Set(group.map((c) => c.release.tag_name))];
    const dates = group.map((c) => c.release.published_at).filter((d) => d !== null);

    versions.push({
      schemaVersion: SCHEMA_VERSION,
      moduleId: m.moduleId,
      version,
      mutable: false,
      platforms: group.map((c) => c.platform),
      // When a version shipped on both platforms it usually did so from two
      // releases. The earliest is when the version first existed; each asset
      // carries the tag and date of its own.
      ...(dates.length ? { publishedAt: dates.sort()[0] } : {}),
      ...(tags.length === 1 ? { tag: tags[0] } : {}),
      // A version is only a prerelease if nothing about it ever shipped as final.
      ...(group.every((c) => c.release.prerelease) ? { prerelease: true } : {}),
      manifests: built,
      assets: group.map((c) => ({
        platform: c.platform,
        filename: c.asset.name,
        url: c.asset.browser_download_url,
        size: c.asset.size,
        tag: c.release.tag_name,
        ...(c.universal ? { universal: true } : {}),
      })),
      hasApiDocs: existsSync(join(root, moduleVersionDir(m.moduleId, version), 'index.json')),
    });
  }

  // Newest first, as the index promises. Same-day releases fall back to version
  // order so the result does not depend on which platform was tagged first.
  versions.sort(
    (a, b) =>
      Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '') ||
      rcompare(a.version, b.version)
  );
  return versions;
}

/**
 * Highest version per platform, ignoring prereleases unless that is all a
 * platform ever had.
 *
 * Highest rather than newest: ti.map still ships iOS 7.3.1 from 2024 as its
 * current iOS build, and an android release in 2025 did not supersede it.
 */
function latestPerPlatform(versions: ModuleVersion[]): Partial<Record<Platform, string>> {
  const latest: Partial<Record<Platform, string>> = {};
  for (const platform of PLATFORMS) {
    const on = versions.filter((v) => v.platforms.includes(platform));
    const stable = on.filter((v) => !v.prerelease);
    const pick = (stable.length ? stable : on).sort((a, b) => rcompare(a.version, b.version))[0];
    if (pick) latest[platform] = pick.version;
  }
  return latest;
}

/**
 * The `main` version directory, when docgen has compiled one.
 *
 * docgen refuses to create this file — platforms, manifests and assets are
 * release data a docs compile does not have — so it has to be seeded here or
 * the compiled tree sits beside nothing that describes it. Seeded from the
 * default branch, since that is what `main` was compiled from.
 */
async function writeMain(m: Collected, defaultBranch: string): Promise<boolean> {
  const dir = join(root, moduleVersionDir(m.moduleId, MUTABLE));
  if (!existsSync(join(dir, 'index.json'))) return false;

  const built: ModuleManifest[] = [];
  for (const platform of PLATFORMS) {
    const fields = await manifestAt(m.repo, defaultBranch, platform);
    if (fields) built.push(toModuleManifest(fields, platform, MUTABLE));
  }
  if (!built.length) {
    failures.push(`${m.repo} ${defaultBranch}: no manifest for either platform`);
    return false;
  }

  return writeVersion(dir, {
    schemaVersion: SCHEMA_VERSION,
    moduleId: m.moduleId,
    version: MUTABLE,
    mutable: true,
    platforms: built.map((b) => b.platform),
    manifests: built,
    // Nothing is published from a branch. The version exists because its docs do.
    assets: [],
    hasApiDocs: true,
  });
}

/**
 * Drops version directories no release accounts for any more.
 *
 * Only ever removes a directory holding nothing but metadata.json: a compiled
 * API reference is docgen's output and is reported instead, since deleting one
 * over a release-listing hiccup would cost a rebuild of the whole tree.
 */
function prune(moduleId: string, keep: Set<string>): string[] {
  const dir = join(root, moduleDir(moduleId));
  if (!existsSync(dir)) return [];
  const removed: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === MUTABLE || keep.has(name) || !statSync(full).isDirectory()) continue;
    if (existsSync(join(full, 'index.json'))) {
      notes.push(`${moduleId}@${name}: no release, but it has compiled docs — left in place`);
      continue;
    }
    rmSync(full, { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

// ------------------------------------------------------------------- main

const moduleSources = sources().filter((s) => s.kind === 'module');
console.log(`${moduleSources.length} modules\n`);

console.log('Releases...');
const collected: Collected[] = [];
for (const source of moduleSources) {
  const m = await collect(source.repo);
  collected.push(m);
  console.log(`  ${source.repo}: ${m.releases.length} releases, ${m.parsed.length} assets`);
}

/**
 * Nothing is written until every asset in every repo has parsed.
 *
 * An unrecognised filename means the packaging convention moved, and the right
 * answer is a person looking at it — not a registry that is silently missing
 * whichever releases happened to be affected.
 */
if (failures.length) {
  console.error(`\n${failures.length} asset(s) could not be parsed:`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('\nNothing written.');
  process.exit(1);
}

console.log('\nVersions...');
let written = 0;
let versionCount = 0;
let bothPlatforms = 0;
const pruned: string[] = [];

for (const m of collected) {
  const repo = await get<GhRepo>(`/repos/${m.repo}`);
  const versions = await buildVersions(m);
  const dir = join(root, moduleDir(m.moduleId));

  for (const version of versions) {
    if (writeVersion(join(root, moduleVersionDir(m.moduleId, version.version)), version)) written++;
    if (version.platforms.length > 1) bothPlatforms++;
  }
  versionCount += versions.length;

  if (await writeMain(m, repo.default_branch)) written++;

  const existing = readJson<ModuleIndex>(join(dir, 'index.json'));
  const readme = await file(m.repo, 'README.md', repo.default_branch);
  const newest = versions[0]?.manifests[0];

  const index: ModuleIndex = {
    schemaVersion: SCHEMA_VERSION,
    moduleId: m.moduleId,
    // Prose is left alone once it is there. A manifest `name` is a build id --
    // ti.facebook calls itself "Facebook" on android and "titanium-facebook" on
    // iOS in the same release -- so a human title, once written, outranks it.
    ...(existing?.name ? { name: existing.name } : {}),
    ...((existing?.description ?? repo.description ?? newest?.description)
      ? { description: existing?.description ?? repo.description ?? newest?.description }
      : {}),
    repo: `https://github.com/${m.repo}`,
    // The repository name is not the module id for 5 of 16, and it is what
    // inbound links and old documentation use.
    aliases: [m.name],
    curation: CURATION,
    latest: latestPerPlatform(versions),
    versions: versions.map((v) => ({
      version: v.version,
      platforms: v.platforms,
      ...(v.publishedAt ? { publishedAt: v.publishedAt } : {}),
      ...(v.prerelease ? { prerelease: true } : {}),
    })),
    // Module-level, not per version: it is the overview a module page opens
    // with, it is maintained on the default branch, and copying it into 386
    // version directories would be most of the registry by weight.
    ...(readme ? { readme } : {}),
  };
  if (writeJson(join(dir, 'index.json'), index)) written++;

  const removed = prune(m.moduleId, new Set(versions.map((v) => v.version)));
  pruned.push(...removed.map((v) => `${m.moduleId}@${v}`));

  const latest = Object.entries(index.latest)
    .map(([p, v]) => `${p} ${v}`)
    .join(', ');
  console.log(`  ${m.moduleId}: ${versions.length} versions, latest ${latest || 'none'}`);
}

const releases = collected.reduce((n, m) => n + m.releases.length, 0);
const assets = collected.reduce((n, m) => n + m.parsed.length, 0);

console.log(`\n${releases} releases, ${assets} assets parsed, 0 failed`);
console.log(`${versionCount} versions, ${bothPlatforms} shipping both platforms`);
console.log(`${written} file(s) written under ${MODULES_DIR}`);
if (pruned.length) console.log(`${pruned.length} pruned: ${pruned.join(', ')}`);

if (notes.length) {
  console.log(`\n${notes.length} thing(s) worth knowing:`);
  for (const n of notes) console.log(`  ${n}`);
}
