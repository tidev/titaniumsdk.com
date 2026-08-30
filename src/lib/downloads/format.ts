import type { Asset } from '../registry/index.ts';

/** Display rules for build metadata. Kept out of the components so they can be tested. */

export const OS_LABELS: Record<string, string> = {
  linux: 'Linux',
  osx: 'macOS',
  win32: 'Windows',
};

/**
 * macOS first: it is the only host that can build for iOS, so it is what most
 * of this audience wants. The registry's own order is not usable — releases
 * list linux/osx/win32 and CI builds list linux/win32/osx, because each comes
 * from a different GitHub API in whatever order it answered.
 */
const OS_ORDER = ['osx', 'win32', 'linux'];

export function sortAssets(assets: readonly Asset[]): Asset[] {
  const rank = (os: string) => {
    const i = OS_ORDER.indexOf(os);
    // An OS nobody has seen yet sorts after the three we know, rather than first.
    return i === -1 ? OS_ORDER.length : i;
  };
  return [...assets].sort((a, b) => rank(a.os) - rank(b.os) || a.os.localeCompare(b.os));
}

const SIZE_UNITS = ['bytes', 'kB', 'MB', 'GB'];

/**
 * SI units, one decimal place. Every SDK zip is between 100 and 200 MB, so
 * three significant figures — what pretty-bytes gives you, and what the old
 * site therefore showed — rounds 109.5 MB to 110 MB and throws away the only
 * digit that distinguishes one download from another.
 */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  let value = bytes;
  let unit = 0;
  // 999.95 rather than 1000, because the promotion happens before the rounding:
  // 999,999 bytes is "1000.0 kB" on the naive threshold.
  while (value >= (unit === 0 ? 1000 : 999.95) && unit < SIZE_UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  if (unit === 0) {
    return `${value} ${value === 1 ? 'byte' : 'bytes'}`;
  }
  return `${value.toFixed(1)} ${SIZE_UNITS[unit]}`;
}

/**
 * Pinned to UTC. The registry stores instants, and an unpinned formatter would
 * render whatever timezone the build machine happened to be in — which makes
 * the same commit produce different HTML on a developer's laptop and in CI.
 */
const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export function formatDate(iso: string): string {
  const at = Date.parse(iso);
  // Better to show the raw string than "Invalid Date" if the generator changes.
  return Number.isFinite(at) ? DATE.format(at) : iso;
}

/**
 * What to paste into a terminal.
 *
 * CI builds need `--branch`, releases do not: the CLI looks up a plain build
 * name in the release channels and a branch build only under its branch.
 */
export function installCommand(name: string, branch?: string): string {
  return `ti sdk install ${branch ? `--branch ${branch} ` : ''}${name}`;
}
