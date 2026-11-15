import { fairOrder } from '../fair-order.ts';
import { ShowcaseAppSchema } from '../registry/showcase.ts';
import { liveApps, type App } from './app.ts';
import { iconUrl, imagesByApp } from './icon.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

/**
 * Reads `registry/showcase/` off the local filesystem (TI-54).
 *
 * The filesystem half, kept apart from `./app.ts` for the reason that file
 * explains: the grid filters in the browser, so nothing it imports may reach
 * `node:fs`. Everything here runs at build time only.
 *
 * No network, in keeping with `pnpm check:offline`. An entry is a committed
 * file; there is nothing to fetch.
 */

/**
 * Spelled out rather than imported from `../docs/registry.ts`, for the reason
 * `../directory/read.ts` gives: that module's `REGISTRY` is the same string,
 * but importing it pulls the whole pool reader in behind it and Turbopack then
 * traces the entire project through anything that touches it.
 */
const SHOWCASE_DIR = join(process.cwd(), 'registry', 'showcase');

/** This registry's permutation seed. Any constant does; this one is `TI-54` as digits. */
const SHOWCASE_SEED = 5400;

let all: App[] | null = null;

/**
 * Every entry on disk, with its icon.
 *
 * Parsed through the same schema CI validates with, so a file that would fail
 * `pnpm check:registry` throws here rather than rendering a half-built card,
 * and `imagesByApp` throws on an entry whose icon is missing or unpublishable.
 * The build failing is the correct outcome in both cases: a showcase exists to
 * be looked at, and a card with a hole where the icon goes says something worse
 * about the framework than no card at all.
 */
export function allApps(): App[] {
  if (all) return all;
  if (!existsSync(SHOWCASE_DIR)) return (all = []);

  const entries = readdirSync(SHOWCASE_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const parsed = ShowcaseAppSchema.parse(
        JSON.parse(readFileSync(join(SHOWCASE_DIR, name), 'utf8'))
      );
      if (parsed.id !== basename(name, '.json')) {
        throw new Error(
          `registry/showcase/${name}: id is "${parsed.id}"; it must match the filename`
        );
      }
      return parsed;
    });

  // A second pass, because a picture is matched to an entry by name and both
  // the orphan check and the missing-icon check need to know every id first.
  const { icons, screenshots } = imagesByApp(
    SHOWCASE_DIR,
    entries.map((app) => app.id)
  );

  all = entries.map((app) => ({
    ...app,
    icon: iconUrl(icons.get(app.id)!),
    screenshots: (screenshots.get(app.id) ?? []).map(iconUrl),
  }));
  return all;
}

/**
 * The day the site is being built, in UTC.
 *
 * Nothing here expires - see `../registry/showcase.ts` for why - so this feeds
 * the display rota and nothing else. UTC because the same commit is built by a
 * laptop and by a runner in a different zone, and they should stamp the same
 * day into the HTML.
 */
export const buildDate = (): Date => new Date();

/** What the site publishes today: real entries if any exist, worked examples otherwise. */
export const listedApps = (): App[] => liveApps(allApps());

/** The grid's order. Fair, deterministic, and turned by the daily rebuild. */
export const orderedApps = (on: Date = buildDate()): App[] =>
  fairOrder(listedApps(), on, SHOWCASE_SEED);

/** One entry, or nothing. Used by the app page, which does not trust its URL segment. */
export function appById(id: string): App | null {
  return listedApps().find((app) => app.id === id) ?? null;
}
