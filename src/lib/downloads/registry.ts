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
 * Newest first, matching what downloads-www lists. Release channels are
 * generated in version order and CI branches in run order, which agree with
 * publication date often enough to look right and not always.
 */
export const CHANNELS = ['ga', 'rc', 'beta'] as const;

export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  ga: 'General Availability',
  rc: 'Release Candidates',
  beta: 'Betas',
};

export const CHANNEL_BLURBS: Record<Channel, string> = {
  ga: 'Stable and supported. Use these unless you have a reason not to.',
  rc: 'Feature-complete builds published ahead of a GA. Fine for testing, not for the App Store.',
  beta: 'Early builds published during a release cycle.',
};

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
 * chronological nor alphabetical — 13_4_X currently sits after a backport
 * branch that predates it. Ordering here on the data means the rail reads the
 * same way whatever the generator does next.
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
  return /^[\w.-]+$/.test(branch) && !/^\.+$/.test(branch) && Object.hasOwn(branchCounts(), branch);
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
