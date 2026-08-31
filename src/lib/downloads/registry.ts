import {
  BranchesSchema,
  BuildListSchema,
  isExpired,
  type Branches,
  type Build,
} from '../registry/index.ts';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the SDK release channels and CI builds off the local filesystem.
 *
 * Same contract as the docs reader: no network at build time, everything
 * resolves against `registry/` in the repo. The parsed files are cached, but
 * nothing time-dependent is — every caller re-derives what is still live from
 * its own clock. See `liveBuilds` for why that matters.
 */

const REGISTRY = join(process.cwd(), 'registry');
const RELEASES_DIR = join(REGISTRY, 'sdk');
const BUILDS_DIR = join(REGISTRY, 'builds');

/** The development branch. It is the CI builds landing page, so it is never hidden. */
export const MAIN_BRANCH = 'main';

/**
 * Branches worth publishing: `main` and the release lines.
 *
 * `branches.json` also carries names the SDK's CI produced in passing —
 * `backport-14489-13_3_X`, `android34_12_6_X` — which are work in progress on
 * somebody's fix, not something to offer as a download. They reach the file
 * because the generator merges into the counts it inherited and never drops a
 * key, so a name that once qualified stays forever.
 *
 * Filtering on read means a stale key cannot resurface a branch, whatever the
 * committed data says.
 */
const PUBLISHED_BRANCH = /^(main|\d+_\d+_(\d+|[Xx]))$/;

export const isPublishedBranch = (name: string): boolean => PUBLISHED_BRANCH.test(name);

/**
 * Newest first, matching what downloads-www lists. Release channels are
 * generated in version order and CI branches in run order, which agree with
 * publication date often enough to look right and not always.
 */
export const CHANNELS = ['ga', 'rc', 'beta'] as const;

export type Channel = (typeof CHANNELS)[number];

/**
 * GA first within a version: `13.0.0.RC1` is what `13.0.0.GA` superseded, so
 * listing the release above the candidates it replaced is the order a reader
 * needs. Across versions this rank never applies — 12.8.0.GA sorts below
 * 13.0.0.Beta1 because 13 is the newer line.
 */
const CHANNEL_RANK: Record<Channel, number> = { ga: 0, rc: 1, beta: 2 };

/** A release with the channel it came from, for a list that merges all three. */
export type Release = Build & { channel: Channel; prerelease: boolean };

export type BranchSummary = {
  name: string;
  /** Live builds only — the count in `branches.json` is as of the last sweep. */
  count: number;
  /** Date of the newest live build, for ordering. Null when the branch is empty. */
  latest: string | null;
};

const cache = new Map<string, unknown>();

function readJson<T>(path: string, parse: (value: unknown) => T): T | null {
  if (cache.has(path)) return cache.get(path) as T;
  if (!existsSync(path)) return null;
  const value = parse(JSON.parse(readFileSync(path, 'utf8')));
  cache.set(path, value);
  return value;
}

/** Newest first. A build with an unparseable date sorts last rather than throwing. */
export function byDateDesc(builds: readonly Build[]): Build[] {
  const at = (b: Build) => {
    const t = Date.parse(b.date);
    return Number.isFinite(t) ? t : -Infinity;
  };
  return [...builds].sort((a, b) => at(b) - at(a));
}

/**
 * The builds still worth advertising, judged against `now` rather than against
 * whatever the committed data claims.
 *
 * `scripts/prune-builds.ts` sweeps lapsed builds into tombstones before every
 * deploy, so this should be a no-op — but the registry is regenerated on
 * dispatch, not on a schedule, and a build can lapse between a regen and the
 * render that consumes it. Trusting the file would advertise a nightly.link
 * URL that 404s, which is the failure the sweep exists to prevent.
 */
export function liveBuilds(builds: readonly Build[], now = Date.now()): Build[] {
  return builds.filter((b) => !isExpired(b, now));
}

/**
 * main first, then the branches with the most recent activity.
 *
 * `branches.json` is written in the generator's own order, which is neither
 * chronological nor alphabetical — it appends whatever the last sweep saw.
 * Ordering here on the data means the rail reads the same way whatever the
 * generator does next.
 */
export function orderBranches(summaries: readonly BranchSummary[]): BranchSummary[] {
  return [...summaries].sort((a, b) => {
    // Before the main checks, so the comparator stays reflexive if it is ever
    // handed a list that is not the keys of branches.json.
    if (a.name === b.name) return 0;
    if (a.name === MAIN_BRANCH) return -1;
    if (b.name === MAIN_BRANCH) return 1;
    const at = (s: BranchSummary) => (s.latest ? Date.parse(s.latest) : 0);
    return at(b) - at(a) || a.name.localeCompare(b.name);
  });
}

/** One release channel, newest first. Releases never expire. */
export function releases(channel: Channel): Build[] {
  const list = readJson(join(RELEASES_DIR, `${channel}.json`), (v) => BuildListSchema.parse(v));
  return byDateDesc(list ?? []);
}

/** The version the install instructions name. */
export function latestRelease(channel: Channel = 'ga'): Build | null {
  return releases(channel)[0] ?? null;
}

/**
 * `13.4.1` from `13.4.1.RC2`, as four numbers to compare on.
 *
 * The registry carries a `version` field, but it is a string, so `13.10.0`
 * would sort under `13.9.0` — and it does not hold the candidate number, which
 * is what separates RC2 from RC1. A name that does not parse sorts last rather
 * than throwing: it is a generator bug, not a reason to blank the page.
 */
const RELEASE_NAME = /^(\d+)\.(\d+)\.(\d+)\.(?:GA|RC|Beta)(\d*)$/i;

function versionKey(name: string): [number, number, number, number] {
  const m = RELEASE_NAME.exec(name);
  if (!m) return [-1, -1, -1, -1];
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 0];
}

/** Newest version first, and within a version GA before its RCs and betas. */
export function orderReleases(list: readonly Release[]): Release[] {
  return [...list].sort((a, b) => {
    const x = versionKey(a.name);
    const y = versionKey(b.name);
    return (
      y[0] - x[0] ||
      y[1] - x[1] ||
      y[2] - x[2] ||
      CHANNEL_RANK[a.channel] - CHANNEL_RANK[b.channel] ||
      // RC2 above RC1, matching the version ordering above it.
      y[3] - x[3] ||
      a.name.localeCompare(b.name)
    );
  });
}

/** Every published release in one list, newest first. */
export function allReleases(): Release[] {
  return orderReleases(
    CHANNELS.flatMap((channel) =>
      releases(channel).map((build) => ({ ...build, channel, prerelease: channel !== 'ga' }))
    )
  );
}

function branchCounts(): Branches {
  return readJson(join(BUILDS_DIR, 'branches.json'), (v) => BranchesSchema.parse(v)) ?? {};
}

/**
 * A branch name is a URL segment, so it must not be able to escape the builds
 * directory. Branch names are the SDK's own — `main`, `13_4_X`,
 * `backport-14489-13_3_X`.
 *
 * `Object.hasOwn` rather than `in`: branches.json is parsed into an ordinary
 * object, so `in` answers true for `constructor` and `toString` and this would
 * hand a prototype key to readFileSync. The pattern rejects a name that is only
 * dots for the same reason — neither can reach outside the directory, since `/`
 * is excluded and the name is suffixed, but a lookup that lies about what the
 * registry contains is worth closing on its own.
 */
function knownBranch(branch: string): boolean {
  // The name shape check stays: it is what stops a URL segment escaping the
  // builds directory, and it is stricter than the publish filter, not implied
  // by it.
  return (
    /^[\w.-]+$/.test(branch) &&
    !/^\.+$/.test(branch) &&
    isPublishedBranch(branch) &&
    Object.hasOwn(branchCounts(), branch)
  );
}

/** Live CI builds for one branch, newest first. Null when the branch is unknown. */
export function branchBuilds(branch: string, now = Date.now()): Build[] | null {
  if (!knownBranch(branch)) return null;
  const list = readJson(join(BUILDS_DIR, `${branch}.json`), (v) => BuildListSchema.parse(v));
  return byDateDesc(liveBuilds(list ?? [], now));
}

/**
 * Branches worth linking to: the ones with something downloadable, plus main.
 *
 * Counts are recomputed from the build files rather than read from
 * `branches.json`, for the same reason `liveBuilds` exists — the committed
 * count is as of the last sweep, and a rail that promises 5 builds and shows 4
 * is worse than no rail.
 */
export function branchList(now = Date.now()): BranchSummary[] {
  const summaries: BranchSummary[] = [];
  for (const name of Object.keys(branchCounts())) {
    if (!isPublishedBranch(name)) continue;
    const builds = branchBuilds(name, now) ?? [];
    if (!builds.length && name !== MAIN_BRANCH) continue;
    summaries.push({ name, count: builds.length, latest: builds[0]?.date ?? null });
  }
  return orderBranches(summaries);
}

/**
 * Where a branch's builds live.
 *
 * main is served at `/downloads/builds` rather than `/downloads/builds/main`,
 * which is both the shape downloads-www uses and one canonical URL for the
 * branch nearly everybody wants.
 */
export function branchHref(branch: string): string {
  return branch === MAIN_BRANCH ? '/downloads/builds' : `/downloads/builds/${branch}`;
}
