import { BuildList } from '@/components/downloads/build-list';
import { allReleases, latestRelease } from '@/lib/downloads/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * Every published release in one list, newest version first.
 *
 * downloads-www sorts the merged list by date, which is not the same order:
 * a patch on an old line ships after the newer line's first GA, so 12.8.0 lands
 * above 13.0.0. Sorting on the version puts a line and the candidates it
 * replaced together, which is how anyone reading this actually navigates it.
 *
 * Prereleases are folded away rather than dropped: they are twelve of the
 * eighty-three rows and almost nobody wants them, but the ones who do arrive
 * looking for a specific RC.
 */

export const metadata: Metadata = {
  title: 'SDK releases — Titanium SDK',
  description:
    'Every Titanium SDK release: GA, release candidates, and betas, with downloads for macOS, Windows, and Linux.',
  alternates: { canonical: `${SITE_URL}/downloads/releases` },
};

export default function ReleasesPage() {
  const all = allReleases();
  const prereleases = all.filter((r) => r.prerelease).length;
  // Asked for by name rather than taken off the top of the list, so a future
  // RC published above the newest GA cannot inherit the badge.
  const latest = latestRelease('ga')?.name;

  return (
    // `has-checked` rather than a sibling selector, so the checkbox can sit
    // where the design wants it instead of having to precede everything it
    // drives. It matches any checked box inside, which is exact while this is
    // the only one on the page — a second would need the selector narrowed to
    // it by id. A plain checkbox and not a client component: the rows are
    // server rendered, and this way they stay reachable with JavaScript off —
    // on a page whose whole purpose is handing out files, that matters more
    // than the markup being pretty.
    <div className="max-w-4xl py-8 [&_[data-prerelease]]:hidden has-checked:[&_[data-prerelease]]:block">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="max-w-2xl text-text-muted">
          Release archives are hosted on GitHub and stay downloadable indefinitely. Install any of
          them with <code className="font-mono text-sm">ti sdk install</code>, or unpack the archive
          into your Titanium SDK directory.
        </p>

        <label
          title={`Show the ${prereleases} release candidates and betas`}
          className="inline-flex h-8.5 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 text-sm text-text-muted transition-colors select-none hover:border-border-strong hover:text-text has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
        >
          <input
            id="show-prereleases"
            type="checkbox"
            className="size-3.5 accent-link outline-none"
          />
          Prereleases
        </label>
      </div>

      <BuildList builds={all} latest={latest} />
    </div>
  );
}
