import {
  branchBuilds,
  branchCounts,
  branchList,
  CHANNELS,
  releases,
  type Channel,
} from '../downloads/registry.ts';
import type { Build } from '../registry/index.ts';

/**
 * The SDK half of the public API (TI-64), and the compatibility surface the
 * shipped CLI still reads.
 *
 * `tidev/titanium-cli` hard-codes five URLs on downloads.titaniumsdk.com —
 * `registry/branches.json`, `registry/<branch>.json`, and `registry/{ga,rc,
 * beta}.json`. Those cannot be redirected to the endpoints below, for two
 * separate reasons: the CLI calls undici's `request` without `maxRedirections`
 * so it never follows a 3xx, and the legacy bodies are bare arrays and a bare
 * object where the versioned API returns an envelope. So the old paths are
 * served, not forwarded, and this module owns both shapes.
 */

// --------------------------------------------------------------- v1 shapes

export type SdkRelease = Build & { channel: Channel };

/** Every published release, newest version first, channel on each. */
export function apiReleases(): SdkRelease[] {
  return CHANNELS.flatMap((channel) => releases(channel).map((b) => ({ ...b, channel })));
}

export function apiBranches(): { name: string; builds: number; latest: string | null }[] {
  return branchList().map((b) => ({ name: b.name, builds: b.count, latest: b.latest }));
}

export function apiBranchBuilds(branch: string): Build[] | null {
  return branchBuilds(branch);
}

// ------------------------------------------------------- legacy shapes

/**
 * `registry/{ga,rc,beta}.json`: a bare array, newest first.
 *
 * Verified against the live responses rather than assumed — ga.json is 71
 * entries of `{name, version, date, url, assets:[{os,size,url}]}`, which is the
 * registry's own `Build` minus nothing. Returned as-is.
 */
export function legacyChannel(channel: Channel): Build[] {
  return releases(channel);
}

/**
 * `registry/branches.json`: a bare `{branch: buildCount}` object.
 *
 * Every key the committed map has, so the shape is unchanged — but the counts
 * are recomputed from the build files rather than served as committed. The
 * committed number is as of the last sweep, and CI artifacts expire 90 days
 * after their run, so the old file offers the CLI twelve branches of which nine
 * have nothing left to download. The CLI keeps whatever is non-zero here, so a
 * stale count sends someone to a branch that then turns out to be empty.
 *
 * Branches at zero stay in the map rather than being dropped: the CLI filters
 * them itself, and removing keys would change the shape rather than the data.
 */
export function legacyBranches(): Record<string, number> {
  return Object.fromEntries(
    Object.keys(branchCounts()).map((name) => [name, (branchBuilds(name) ?? []).length])
  );
}

/**
 * `registry/<branch>.json`: a bare array of that branch's live builds.
 *
 * An empty array for a branch nothing downloadable remains on, rather than a
 * 404. That is what the old file effectively was — it listed builds whose
 * artifacts had long expired, and the CLI filtered them out on arrival — so
 * answering `[]` is the same result without the dead URLs in between.
 */
export function legacyBranch(branch: string): Build[] {
  return branchBuilds(branch) ?? [];
}

/** Every legacy filename the compatibility surface answers for. */
export function legacyFiles(): string[] {
  return [
    'branches.json',
    ...CHANNELS.map((c) => `${c}.json`),
    ...Object.keys(branchCounts()).map((b) => `${b}.json`),
  ];
}
