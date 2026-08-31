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

/** Ties the toggle to its label, and to the rows it folds away. */
const TOGGLE_ID = 'show-prereleases';

export default function ReleasesPage() {
  const all = allReleases();
  const prereleases = all.filter((r) => r.prerelease).length;
  // Asked for by name rather than taken off the top of the list, so a future
  // RC published above the newest GA cannot inherit the badge.
  const latest = latestRelease('ga')?.name;

  return (
    <div className="max-w-4xl py-8">
      <p className="text-text-muted">
        Release archives are hosted on GitHub and stay downloadable indefinitely. Install any of
        them with <code className="font-mono text-sm">ti sdk install</code>, or unpack the archive
        into your Titanium SDK directory.
      </p>

      {/* A checkbox rather than a client component: the rows are server
          rendered, and this way they stay reachable with JavaScript off — on a
          page whose whole purpose is handing out files, that matters more than
          the markup being pretty. The input has to be a sibling of everything
          it drives, which is why it sits out here on its own. */}
      <input id={TOGGLE_ID} type="checkbox" className="peer sr-only" />

      <label
        htmlFor={TOGGLE_ID}
        className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-text-muted transition-colors select-none hover:border-border-strong hover:text-link peer-checked:[&_[data-off]]:hidden peer-checked:[&_[data-on]]:inline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
      >
        <span data-off>Show</span>
        <span data-on className="hidden">
          Hide
        </span>
        <span className="font-mono text-xs text-text-subtle">{prereleases}</span>
        <span>release candidates and betas</span>
      </label>

      <div className="[&_[data-prerelease]]:hidden peer-checked:[&_[data-prerelease]]:block">
        <BuildList builds={all} latest={latest} />
      </div>
    </div>
  );
}
