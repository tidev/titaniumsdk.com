import type { AppPlatform, ShowcaseApp } from '../registry/showcase.ts';

/**
 * The showcase shapes that hold no filesystem and no zod.
 *
 * Same reason as `../directory/profile.ts`: the grid filters in the browser, so
 * this file and everything it imports end up in the client bundle. One
 * `node:fs` import anywhere in that graph fails the build, and pulling the
 * schema in would ship zod to every visitor for the sake of four labels.
 * `../registry/showcase.ts` is imported for types only, which erases.
 */

/**
 * An app, plus the one thing about it that is not in its JSON.
 *
 * `icon` is the public URL of the file committed beside the entry, filled in by
 * `./read.ts` from the filename rather than from a field - see `./icon.ts` for
 * why the schema does not carry one. Not optional, unlike the directory's
 * avatar: every app that shipped has an icon, a grid of app cards with a gap in
 * it looks broken rather than modest, and an entry missing one fails the build
 * with a message saying which file to add.
 *
 * `screenshots` are the public URLs of the numbered files beside the entry, in
 * their numbered order, and empty for an entry that committed none. Optional
 * where the icon is not: a page without screenshots is a shorter page, not a
 * broken one.
 */
export type App = ShowcaseApp & { icon: string; screenshots: string[] };

export const PLATFORM_LABELS: Record<AppPlatform, string> = {
  iphone: 'iPhone',
  ipad: 'iPad',
  'android-phone': 'Android phone',
  'android-tablet': 'Android tablet',
};

/**
 * Menu and badge order, derived from the label table rather than written twice.
 *
 * `Record<AppPlatform, string>` is already exhaustive, so a value added to the
 * schema without a label fails to compile, and this array then carries it
 * without anyone remembering to.
 */
export const PLATFORM_ORDER = Object.keys(PLATFORM_LABELS) as AppPlatform[];

/**
 * Everything that should be rendered, in the sitemap, and in search.
 *
 * One rule, where the directory needs two: nothing expires here, so this is
 * only the placeholder switch. If any real entry exists the worked examples are
 * dropped, which is how they remove themselves the day the first real app is
 * merged, without a follow-up pull request somebody has to remember.
 */
export function liveApps(apps: readonly App[]): App[] {
  const real = apps.filter((app) => !app.placeholder);
  return real.length ? real : [...apps];
}

/** Where an entry says a reader can go, in the order the page shows them. */
export function storeLinks(app: App): { key: string; label: string; url: string }[] {
  return [
    app.appStore && { key: 'appStore', label: 'App Store', url: app.appStore },
    app.playStore && { key: 'playStore', label: 'Google Play', url: app.playStore },
    app.website && { key: 'website', label: 'Developer Website', url: app.website },
  ].filter((link) => !!link);
}

// ---------------------------------------------------------------- filtering

export type PlatformFilter = AppPlatform | 'all';

export type Filters = {
  platform: PlatformFilter;
  /** Free text over name, subtitle, description and SDK version. */
  query: string;
};

/**
 * Applied in the browser, over the already-ordered list.
 *
 * Order is never recomputed here. Filtering hides cards; it does not get to
 * promote one, which is what a "most relevant" re-sort would quietly become.
 * See `../fair-order.ts` for why the order is decided on the server.
 */
export function matches(app: App, filters: Filters): boolean {
  if (filters.platform !== 'all' && !app.platforms.includes(filters.platform)) return false;

  const needle = filters.query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    app.name,
    app.subtitle,
    app.description,
    app.sdkVersion,
    ...app.platforms.map((p) => PLATFORM_LABELS[p]),
  ]
    .filter((part) => !!part)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}
